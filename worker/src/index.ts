import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';

import oppsRoute       from './routes/opps';
import dynamicsRoute   from './routes/dynamics';
import sharepointRoute from './routes/sharepoint';
import usersRoute      from './routes/users';

const app = new Hono<{ Bindings: Env }>();

// CORS — allow the React dev server in local dev; production serves from same origin
app.use('/api/*', cors({
  origin: (origin) => origin ?? '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Authorization', 'Content-Type'],
}));

// ── API Routes ────────────────────────────────────────────────────────────────
app.route('/api/opps',        oppsRoute);
app.route('/api/crm',         dynamicsRoute);
app.route('/api/sharepoint',  sharepointRoute);
app.route('/api/users',       usersRoute);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (c) => c.json({ ok: true, ts: Date.now() }));

// Static assets (React app) are handled automatically by Cloudflare Workers Assets.
// Any path not matching /api/* falls through to the asset router → index.html (SPA).

export default app;
