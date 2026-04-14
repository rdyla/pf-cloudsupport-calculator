-- CloudSupport Calculator — D1 Schema
-- Run: wrangler d1 execute cloudsupport-calculator --remote --file=worker/src/db/schema.sql

CREATE TABLE IF NOT EXISTS users (
  email       TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'user',  -- 'admin' | 'manager' | 'user'
  azure_oid   TEXT UNIQUE,                   -- Azure AD object ID (set on first SSO login)
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS opportunities (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  created_by     TEXT NOT NULL REFERENCES users(email),
  crm_account_id TEXT,           -- Dynamics 365 Account ID
  crm_opp_id     TEXT,           -- Dynamics 365 Opportunity ID
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS opp_versions (
  id             TEXT PRIMARY KEY,
  opp_id         TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  version_num    INTEGER NOT NULL,
  label          TEXT,
  data           TEXT NOT NULL,  -- JSON: form inputs (oppType, ucaasUsers, etc.)
  calc           TEXT NOT NULL,  -- JSON: calculated results
  created_by     TEXT NOT NULL REFERENCES users(email),
  sharepoint_url TEXT,           -- URL to saved doc in SharePoint (if uploaded)
  saved_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(opp_id, version_num)
);

CREATE INDEX IF NOT EXISTS idx_opp_versions_opp_id ON opp_versions(opp_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_by ON opportunities(created_by);
CREATE INDEX IF NOT EXISTS idx_opportunities_crm_account ON opportunities(crm_account_id);
