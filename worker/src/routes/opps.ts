import { Hono } from 'hono';
import { requireAuth } from '../auth';
import type { Env, OppFormData, OppCalcResult } from '../types';

const opps = new Hono<{ Bindings: Env }>();
opps.use('*', requireAuth);

// ── List all opportunities (the user can see) ─────────────────────────────────
opps.get('/', async (c) => {
  const user = c.get('user') as { email: string; role: string };

  // All roles see all opportunities
  const rows = await c.env.DB.prepare(`
      SELECT o.*, u.name as creator_name
      FROM opportunities o
      JOIN users u ON u.email = o.created_by
      ORDER BY o.updated_at DESC
    `).all();

  // For each opp, fetch its versions
  const oppList = await Promise.all(
    (rows.results as any[]).map(async (row) => {
      const versions = await c.env.DB.prepare(`
        SELECT * FROM opp_versions WHERE opp_id = ? ORDER BY version_num ASC
      `).bind(row.id).all();

      return {
        id: row.id,
        name: row.name,
        createdBy: row.created_by,
        creatorName: row.creator_name,
        crmAccountId: row.crm_account_id,
        crmOppId: row.crm_opp_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        versions: (versions.results as any[]).map(v => ({
          id: v.id,
          oppId: v.opp_id,
          versionNum: v.version_num,
          label: v.label,
          data: JSON.parse(v.data),
          calc: JSON.parse(v.calc),
          createdBy: v.created_by,
          sharepointUrl: v.sharepoint_url,
          savedAt: v.saved_at,
        })),
        activeVersionIdx: 0,
      };
    })
  );

  return c.json({ ok: true, data: oppList });
});

// ── Create a new opportunity ──────────────────────────────────────────────────
opps.post('/', async (c) => {
  const user = c.get('user') as { email: string };
  const { name, crmAccountId, crmOppId } = await c.req.json<{
    name: string;
    crmAccountId?: string;
    crmOppId?: string;
  }>();

  if (!name?.trim()) return c.json({ ok: false, error: 'Name is required' }, 400);

  const id = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO opportunities (id, name, created_by, crm_account_id, crm_opp_id)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, name.trim(), user.email, crmAccountId ?? null, crmOppId ?? null).run();

  return c.json({ ok: true, data: { id, name: name.trim() } }, 201);
});

// ── Update opportunity metadata (name, CRM links) ─────────────────────────────
opps.patch('/:id', async (c) => {
  const user = c.get('user') as { email: string; role: string };
  const oppId = c.req.param('id');
  const body = await c.req.json<{ name?: string; crmAccountId?: string; crmOppId?: string }>();

  const opp = await c.env.DB.prepare(
    'SELECT * FROM opportunities WHERE id = ?'
  ).bind(oppId).first<{ created_by: string }>();

  if (!opp) return c.json({ ok: false, error: 'Not found' }, 404);
  if (opp.created_by !== user.email && user.role === 'user') {
    return c.json({ ok: false, error: 'Forbidden' }, 403);
  }

  const fields: string[] = [];
  const values: any[] = [];

  if (body.name)         { fields.push('name = ?');           values.push(body.name.trim()); }
  if (body.crmAccountId !== undefined) { fields.push('crm_account_id = ?'); values.push(body.crmAccountId); }
  if (body.crmOppId !== undefined)     { fields.push('crm_opp_id = ?');     values.push(body.crmOppId); }
  fields.push('updated_at = datetime(\'now\')');

  if (fields.length === 1) return c.json({ ok: true, data: null }); // nothing to update

  values.push(oppId);
  await c.env.DB.prepare(
    `UPDATE opportunities SET ${fields.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  return c.json({ ok: true, data: null });
});

// ── Delete an opportunity ─────────────────────────────────────────────────────
opps.delete('/:id', async (c) => {
  const user = c.get('user') as { email: string; role: string };
  const oppId = c.req.param('id');

  const opp = await c.env.DB.prepare(
    'SELECT created_by FROM opportunities WHERE id = ?'
  ).bind(oppId).first<{ created_by: string }>();

  if (!opp) return c.json({ ok: false, error: 'Not found' }, 404);
  if (opp.created_by !== user.email && user.role === 'user') {
    return c.json({ ok: false, error: 'Forbidden' }, 403);
  }

  await c.env.DB.prepare('DELETE FROM opportunities WHERE id = ?').bind(oppId).run();
  return c.json({ ok: true, data: null });
});

// ── Save a new version ────────────────────────────────────────────────────────
opps.post('/:id/versions', async (c) => {
  const user = c.get('user') as { email: string; role: string };
  const oppId = c.req.param('id');
  const { data, calc, label } = await c.req.json<{
    data: OppFormData;
    calc: OppCalcResult;
    label?: string;
  }>();

  const opp = await c.env.DB.prepare('SELECT id, created_by FROM opportunities WHERE id = ?')
    .bind(oppId).first<{ id: string; created_by: string }>();
  if (!opp) return c.json({ ok: false, error: 'Opportunity not found' }, 404);
  if (opp.created_by !== user.email && user.role === 'user') {
    return c.json({ ok: false, error: 'Forbidden' }, 403);
  }

  // Get next version number
  const maxRow = await c.env.DB.prepare(
    'SELECT COALESCE(MAX(version_num), 0) as mx FROM opp_versions WHERE opp_id = ?'
  ).bind(oppId).first<{ mx: number }>();
  const nextVersion = (maxRow?.mx ?? 0) + 1;

  const versionId = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO opp_versions (id, opp_id, version_num, label, data, calc, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    versionId, oppId, nextVersion, label ?? null,
    JSON.stringify(data), JSON.stringify(calc), user.email
  ).run();

  // Touch the parent opportunity's updated_at
  await c.env.DB.prepare(
    "UPDATE opportunities SET updated_at = datetime('now') WHERE id = ?"
  ).bind(oppId).run();

  return c.json({ ok: true, data: { id: versionId, versionNum: nextVersion } }, 201);
});

export default opps;
