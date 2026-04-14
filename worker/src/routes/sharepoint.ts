/**
 * sharepoint.ts — SharePoint document routes via Microsoft Graph + Dynamics CRM.
 *
 * Uses the CRM's own sharepointdocumentlocations to resolve the correct folder
 * for each linked account/opportunity — the same folders visible in CRM's
 * "Documents" tab. No hard-coded SharePoint paths needed.
 *
 * Routes:
 *   GET  /api/sharepoint/locations?recordId=xxx   → SP folders for a CRM record
 *   GET  /api/sharepoint/files?url=xxx            → list files in a folder
 *   POST /api/sharepoint/upload?url=xxx           → upload file (multipart/form-data)
 *   DELETE /api/sharepoint/file?webUrl=xxx        → delete a file
 *   POST /api/sharepoint/clear-token-cache        → bust cached tokens (debug)
 */

import { Hono } from 'hono';
import { requireAuth } from '../auth';
import type { Env } from '../types';
import {
  getSharePointLocations,
  listSharePointFiles,
  uploadToSharePoint,
  deleteSharePointFile,
} from '../services/graphService';

const sharepoint = new Hono<{ Bindings: Env }>();
sharepoint.use('*', requireAuth);

// ── Locations for a CRM record ────────────────────────────────────────────────
sharepoint.get('/locations', async (c) => {
  const recordId = c.req.query('recordId');
  if (!recordId) return c.json({ ok: false, error: 'recordId required' }, 400);

  try {
    const locations = await getSharePointLocations(c.env, recordId);
    return c.json({ ok: true, data: locations });
  } catch (err: any) {
    console.error('SharePoint locations error:', err.message);
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// ── List files in a folder ────────────────────────────────────────────────────
sharepoint.get('/files', async (c) => {
  const url = c.req.query('url');
  if (!url) return c.json({ ok: false, error: 'url required' }, 400);

  try {
    const files = await listSharePointFiles(c.env, url);
    return c.json({ ok: true, data: files });
  } catch (err: any) {
    console.error('SharePoint files error:', err.message);
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// ── Upload a file ─────────────────────────────────────────────────────────────
// Accepts multipart/form-data with a "file" field.
// Optionally links the uploaded file back to an opp_version row via versionId query param.
sharepoint.post('/upload', async (c) => {
  const folderUrl = c.req.query('url');
  if (!folderUrl) return c.json({ ok: false, error: 'url required' }, 400);

  try {
    const formData = await c.req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) return c.json({ ok: false, error: 'file field required' }, 400);

    const content = await file.arrayBuffer();
    const uploaded = await uploadToSharePoint(
      c.env,
      folderUrl,
      file.name,
      content,
      file.type || 'application/octet-stream'
    );

    // Optionally store the SharePoint URL on a version row
    const versionId = c.req.query('versionId');
    if (versionId && uploaded.webUrl) {
      await c.env.DB.prepare(
        'UPDATE opp_versions SET sharepoint_url = ? WHERE id = ?'
      ).bind(uploaded.webUrl, versionId).run();
    }

    return c.json({ ok: true, data: uploaded });
  } catch (err: any) {
    console.error('SharePoint upload error:', err.message);
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// ── Delete a file ─────────────────────────────────────────────────────────────
sharepoint.delete('/file', async (c) => {
  const webUrl = c.req.query('webUrl');
  if (!webUrl) return c.json({ ok: false, error: 'webUrl required' }, 400);

  try {
    await deleteSharePointFile(c.env, webUrl);
    return c.json({ ok: true, data: null });
  } catch (err: any) {
    console.error('SharePoint delete error:', err.message);
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// ── Clear token cache ─────────────────────────────────────────────────────────
sharepoint.post('/clear-token-cache', async (c) => {
  await Promise.all([
    c.env.SESSION_KV.delete('graph:token'),
    c.env.SESSION_KV.delete('dynamics_token'),
  ]);
  return c.json({ ok: true, data: { message: 'Token cache cleared' } });
});

// ── Debug: test token acquisition ─────────────────────────────────────────────
sharepoint.get('/debug-token', async (c) => {
  const results: Record<string, string> = {
    AZURE_TENANT_ID: c.env.AZURE_TENANT_ID ? 'set' : 'MISSING',
    AZURE_CLIENT_ID: c.env.AZURE_CLIENT_ID ? 'set' : 'MISSING',
    AZURE_CLIENT_SECRET: c.env.AZURE_CLIENT_SECRET ? 'set' : 'MISSING',
    DYNAMICS_URL: c.env.DYNAMICS_URL || 'MISSING',
  };

  try {
    const { getDynamicsToken } = await import('../services/graphService');
    await getDynamicsToken(c.env);
    results.dynamics_token = 'OK';
  } catch (err: any) {
    results.dynamics_token = `FAILED: ${err.message}`;
  }

  try {
    const { getGraphToken } = await import('../services/graphService');
    await getGraphToken(c.env);
    results.graph_token = 'OK';
  } catch (err: any) {
    results.graph_token = `FAILED: ${err.message}`;
  }

  return c.json({ ok: true, data: results });
});

export default sharepoint;
