/**
 * dynamics.ts — Proxy routes for Dynamics 365 CRM.
 *
 * The Worker fetches a client-credentials token (app → Dynamics, not on behalf of the user)
 * so the frontend never holds the client secret.
 *
 * Endpoints:
 *   GET /api/crm/accounts?search=acme          Search accounts by name
 *   GET /api/crm/accounts/:id/opportunities    Opportunities linked to an account
 *   GET /api/crm/opportunities?search=deal     Search opportunities by name
 */

import { Hono } from 'hono';
import { requireAuth } from '../auth';
import { getDynamicsToken } from '../services/graphService';
import type { Env, CrmAccount, CrmOpportunity } from '../types';

const dynamics = new Hono<{ Bindings: Env }>();
dynamics.use('*', requireAuth);

// ── Helper: call the Dynamics Web API ────────────────────────────────────────
async function crmFetch<T>(env: Env, path: string): Promise<T> {
  const token = await getDynamicsToken(env);
  const res = await fetch(`${env.DYNAMICS_URL}/api/data/v9.2/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Dynamics API error ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

// ── Search accounts ───────────────────────────────────────────────────────────
dynamics.get('/accounts', async (c) => {
  const search = (c.req.query('search') ?? '').trim();
  const filter = search
    ? `$filter=contains(name,'${encodeURIComponent(search)}')`
    : '';

  try {
    const data = await crmFetch<{ value: any[] }>(
      c.env,
      `accounts?$select=accountid,name,telephone1,address1_city,address1_stateorprovince${filter ? '&' + filter : ''}&$top=50`
    );

    const accounts: CrmAccount[] = data.value.map(a => ({
      id:    a.accountid,
      name:  a.name,
      phone: a.telephone1 ?? null,
      city:  a.address1_city ?? null,
      state: a.address1_stateorprovince ?? null,
    }));

    return c.json({ ok: true, data: accounts });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 502);
  }
});

// ── Opportunities for a specific account ─────────────────────────────────────
dynamics.get('/accounts/:accountId/opportunities', async (c) => {
  const accountId = c.req.param('accountId');

  try {
    const data = await crmFetch<{ value: any[] }>(
      c.env,
      `opportunities?$select=opportunityid,name,_accountid_value,estimatedclosedate,statuscode` +
      `&$filter=_accountid_value eq ${accountId}&$top=100&$expand=customerid_account($select=name)`
    );

    const items: CrmOpportunity[] = data.value.map(o => ({
      id:                 o.opportunityid,
      name:               o.name,
      accountId:          o._accountid_value,
      accountName:        o['customerid_account@OData.Community.Display.V1.FormattedValue'] ?? '',
      estimatedCloseDate: o.estimatedclosedate ?? null,
      statusCode:         o['statuscode@OData.Community.Display.V1.FormattedValue'] ?? '',
    }));

    return c.json({ ok: true, data: items });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 502);
  }
});

// ── Search opportunities (name contains) ─────────────────────────────────────
dynamics.get('/opportunities', async (c) => {
  const search = (c.req.query('search') ?? '').trim();
  const filter = search
    ? `&$filter=contains(name,'${encodeURIComponent(search)}')`
    : '';

  try {
    const data = await crmFetch<{ value: any[] }>(
      c.env,
      `opportunities?$select=opportunityid,name,_accountid_value,estimatedclosedate,statuscode${filter}&$top=50`
    );

    const items: CrmOpportunity[] = data.value.map(o => ({
      id:                 o.opportunityid,
      name:               o.name,
      accountId:          o._accountid_value,
      accountName:        '',
      estimatedCloseDate: o.estimatedclosedate ?? null,
      statusCode:         o['statuscode@OData.Community.Display.V1.FormattedValue'] ?? '',
    }));

    return c.json({ ok: true, data: items });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 502);
  }
});

export default dynamics;
