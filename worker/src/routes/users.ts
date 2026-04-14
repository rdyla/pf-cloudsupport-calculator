/**
 * users.ts — User management (admin only).
 *
 * GET  /api/users          List all users
 * GET  /api/users/me       Current user profile
 * PATCH /api/users/:email  Update role (admin only)
 * DELETE /api/users/:email Remove a user (admin only, cannot remove self)
 */

import { Hono } from 'hono';
import { requireAuth, requireRole } from '../auth';
import type { Env } from '../types';

const users = new Hono<{ Bindings: Env }>();
users.use('*', requireAuth);

// ── Current user ──────────────────────────────────────────────────────────────
users.get('/me', async (c) => {
  const user = c.get('user');
  return c.json({ ok: true, data: user });
});

// ── List all users (admin/manager) ────────────────────────────────────────────
users.get('/', requireRole('admin', 'manager'), async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT email, name, role, created_at FROM users ORDER BY name'
  ).all();
  return c.json({ ok: true, data: rows.results });
});

// ── Update a user's role (admin only) ────────────────────────────────────────
users.patch('/:email', requireRole('admin'), async (c) => {
  const targetEmail = c.req.param('email');
  const me = c.get('user') as { email: string };
  const { role } = await c.req.json<{ role: string }>();

  if (!['admin', 'manager', 'user'].includes(role)) {
    return c.json({ ok: false, error: 'Invalid role' }, 400);
  }
  if (targetEmail === me.email) {
    return c.json({ ok: false, error: 'Cannot change your own role' }, 400);
  }

  const result = await c.env.DB.prepare(
    'UPDATE users SET role = ? WHERE email = ?'
  ).bind(role, targetEmail).run();

  if (result.meta.changes === 0) return c.json({ ok: false, error: 'User not found' }, 404);
  return c.json({ ok: true, data: null });
});

// ── Remove a user (admin only) ────────────────────────────────────────────────
users.delete('/:email', requireRole('admin'), async (c) => {
  const targetEmail = c.req.param('email');
  const me = c.get('user') as { email: string };

  if (targetEmail === me.email) {
    return c.json({ ok: false, error: 'Cannot remove yourself' }, 400);
  }

  await c.env.DB.prepare('DELETE FROM users WHERE email = ?').bind(targetEmail).run();
  return c.json({ ok: true, data: null });
});

export default users;
