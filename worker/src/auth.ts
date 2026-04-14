/**
 * auth.ts — Validates Azure AD access tokens on each API request.
 *
 * Flow:
 *  1. Frontend (MSAL) logs in → gets an access token scoped to our Worker API
 *  2. Frontend sends: Authorization: Bearer <token>
 *  3. Worker fetches Azure JWKS, verifies signature + claims
 *  4. Upserts the user in D1, attaches user to context
 */

import type { Context, Next } from 'hono';
import type { Env } from './types';

interface JwtHeader { alg: string; kid: string; }
interface AzureJwtPayload {
  oid: string;                 // Azure AD object ID (stable user identifier)
  email?: string;
  upn?: string;                // user principal name (fallback email)
  preferred_username?: string; // v2 tokens
  unique_name?: string;        // v1 tokens
  name?: string;
  roles?: string[];            // app roles from the Azure App Registration
  aud: string;
  iss: string;
  exp: number;
}

// Cache the JWKS in KV for 1 hour to avoid hammering Microsoft's endpoint
async function getJwks(env: Env): Promise<Record<string, CryptoKey>> {
  const cacheKey = 'azure_jwks';
  const cached = await env.SESSION_KV.get(cacheKey);
  let jwks: { keys: any[] };

  if (cached) {
    jwks = JSON.parse(cached);
  } else {
    const url = `https://login.microsoftonline.com/${env.AZURE_TENANT_ID}/discovery/v2.0/keys`;
    const res = await fetch(url);
    jwks = await res.json() as { keys: any[] };
    await env.SESSION_KV.put(cacheKey, JSON.stringify(jwks), { expirationTtl: 3600 });
  }

  const keyMap: Record<string, CryptoKey> = {};
  await Promise.all(
    jwks.keys.map(async (k) => {
      if (k.use === 'sig' && k.kty === 'RSA') {
        const cryptoKey = await crypto.subtle.importKey(
          'jwk', k,
          { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
          false, ['verify']
        );
        keyMap[k.kid] = cryptoKey;
      }
    })
  );
  return keyMap;
}

function base64urlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(s.length + (4 - s.length % 4) % 4, '=');
  const bin = atob(padded);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function verifyJwt(token: string, env: Env): Promise<AzureJwtPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');

  const header: JwtHeader = JSON.parse(new TextDecoder().decode(base64urlDecode(parts[0])));
  const payload: AzureJwtPayload = JSON.parse(new TextDecoder().decode(base64urlDecode(parts[1])));

  // Validate claims
  if (payload.exp * 1000 < Date.now()) throw new Error('Token expired');

  // Azure issues tokens with aud = the Application ID URI (api://<clientId>)
  // or just the bare client ID depending on token version — accept both.
  const validAudiences = [env.AZURE_CLIENT_ID, `api://${env.AZURE_CLIENT_ID}`];
  if (!validAudiences.includes(payload.aud)) throw new Error('Token audience mismatch');

  // Accept both v1 (sts.windows.net) and v2 (login.microsoftonline.com) issuers.
  // v1 is issued when requestedAccessTokenVersion is null/1 in the app manifest.
  const validIssuers = [
    `https://login.microsoftonline.com/${env.AZURE_TENANT_ID}/v2.0`,
    `https://sts.windows.net/${env.AZURE_TENANT_ID}/`,
  ];
  if (!validIssuers.includes(payload.iss)) throw new Error('Token issuer mismatch');

  // Verify signature
  const keys = await getJwks(env);
  const key = keys[header.kid];
  if (!key) throw new Error(`Unknown signing key: ${header.kid}`);

  const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature = base64urlDecode(parts[2]);

  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, signingInput);
  if (!valid) throw new Error('Token signature invalid');

  return payload;
}

// Hono middleware — attaches verified user to c.var
export async function requireAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return c.json({ ok: false, error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const payload = await verifyJwt(token, c.env);
    const email = (payload.email ?? payload.upn ?? payload.preferred_username ?? payload.unique_name ?? '').toLowerCase();
    if (!email) return c.json({ ok: false, error: 'Token missing email/upn claim' }, 401);

    // Upsert user in D1 on every login (keeps name/role fresh)
    // Role: if the user has an 'admin' or 'manager' app role assigned in Azure, use that; default 'user'
    const azureRole = payload.roles?.find(r => ['admin', 'manager'].includes(r)) ?? 'user';

    await c.env.DB.prepare(`
      INSERT INTO users (email, name, azure_oid, role)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        name      = excluded.name,
        azure_oid = excluded.azure_oid
    `).bind(email, payload.name ?? email, payload.oid, azureRole).run();

    // Fetch the full user row (respects manually-set roles in DB)
    const user = await c.env.DB.prepare(
      'SELECT email, name, role FROM users WHERE email = ?'
    ).bind(email).first<{ email: string; name: string; role: string }>();

    c.set('user', user);
    await next();
  } catch (err: any) {
    return c.json({ ok: false, error: err.message ?? 'Auth failed' }, 401);
  }
}

export function requireRole(...roles: string[]) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const user = c.get('user') as { role: string } | undefined;
    if (!user || !roles.includes(user.role)) {
      return c.json({ ok: false, error: 'Forbidden' }, 403);
    }
    await next();
  };
}
