/**
 * client.ts — Typed fetch wrapper for the Worker API.
 * All methods require a bearer token from useApiToken().getToken().
 */

const BASE = import.meta.env.DEV
  ? 'http://localhost:8787'   // wrangler dev
  : '';                        // same origin in production

async function request<T>(
  token: string,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json() as { ok: boolean; data?: T; error?: string };
  if (!json.ok) throw new Error(json.error ?? `API error ${res.status}`);
  return json.data as T;
}

// ── Opportunities ─────────────────────────────────────────────────────────────
import type {
  Opportunity, OppFormData, OppCalcResult,
  CrmAccount, CrmOpportunity,
} from '../types';

export const oppsApi = {
  list: (token: string) =>
    request<Opportunity[]>(token, 'GET', '/api/opps'),

  create: (token: string, name: string, crmAccountId?: string, crmOppId?: string) =>
    request<{ id: string; name: string }>(token, 'POST', '/api/opps', { name, crmAccountId, crmOppId }),

  update: (token: string, id: string, patch: { name?: string; crmAccountId?: string; crmOppId?: string }) =>
    request<null>(token, 'PATCH', `/api/opps/${id}`, patch),

  delete: (token: string, id: string) =>
    request<null>(token, 'DELETE', `/api/opps/${id}`),

  saveVersion: (token: string, oppId: string, data: OppFormData, calc: OppCalcResult, label?: string) =>
    request<{ id: string; versionNum: number }>(token, 'POST', `/api/opps/${oppId}/versions`, { data, calc, label }),
};

// ── CRM ───────────────────────────────────────────────────────────────────────
export const crmApi = {
  searchAccounts: (token: string, search: string) =>
    request<CrmAccount[]>(token, 'GET', `/api/crm/accounts?search=${encodeURIComponent(search)}`),

  accountOpportunities: (token: string, accountId: string) =>
    request<CrmOpportunity[]>(token, 'GET', `/api/crm/accounts/${accountId}/opportunities`),

  searchOpportunities: (token: string, search: string) =>
    request<CrmOpportunity[]>(token, 'GET', `/api/crm/opportunities?search=${encodeURIComponent(search)}`),
};

// ── SharePoint ────────────────────────────────────────────────────────────────
import type { SPLocation, SPFile } from '../types';

export const sharepointApi = {
  // Get the SharePoint folders linked to a Dynamics CRM record (account or opportunity)
  locations: (token: string, recordId: string) =>
    request<SPLocation[]>(token, 'GET', `/api/sharepoint/locations?recordId=${encodeURIComponent(recordId)}`),

  // List files in a SharePoint folder by its absolute URL
  files: (token: string, folderUrl: string) =>
    request<SPFile[]>(token, 'GET', `/api/sharepoint/files?url=${encodeURIComponent(folderUrl)}`),

  // Upload a file via multipart form (real File object, not base64)
  upload: async (token: string, folderUrl: string, file: File, versionId?: string) => {
    const form = new FormData();
    form.append('file', file);
    const qs = versionId ? `?url=${encodeURIComponent(folderUrl)}&versionId=${versionId}` : `?url=${encodeURIComponent(folderUrl)}`;
    const res = await fetch(`${BASE}/api/sharepoint/upload${qs}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const json = await res.json() as { ok: boolean; data?: SPFile; error?: string };
    if (!json.ok) throw new Error(json.error ?? `Upload failed ${res.status}`);
    return json.data as SPFile;
  },

  // Delete a file by its SharePoint webUrl
  deleteFile: (token: string, webUrl: string) =>
    request<null>(token, 'DELETE', `/api/sharepoint/file?webUrl=${encodeURIComponent(webUrl)}`),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  me: (token: string) =>
    request<{ email: string; name: string; role: string }>(token, 'GET', '/api/users/me'),

  list: (token: string) =>
    request<{ email: string; name: string; role: string; created_at: string }[]>(token, 'GET', '/api/users'),

  updateRole: (token: string, email: string, role: string) =>
    request<null>(token, 'PATCH', `/api/users/${encodeURIComponent(email)}`, { role }),

  remove: (token: string, email: string) =>
    request<null>(token, 'DELETE', `/api/users/${encodeURIComponent(email)}`),
};
