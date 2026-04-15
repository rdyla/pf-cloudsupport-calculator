export interface Env {
  DB: D1Database;
  SESSION_KV: KVNamespace;
  AZURE_TENANT_ID: string;
  AZURE_CLIENT_ID: string;
  AZURE_CLIENT_SECRET: string;
  DYNAMICS_URL: string;
}

// ── Opportunity data shapes ──────────────────────────────────────────────────

export interface OppFormData {
  oppType: 'UCaaS Only' | 'CCaaS Only' | 'UCaaS + CCaaS' | 'Advanced Applications';
  ucaasUsers: number;
  ccaasLicensing: number;
  implSow: number;
  term: number;
  contractStart: string;
  contractEnd: string;
  afterHoursRate: number;
  advancedTaskRate: number;
  msoEnabled: boolean;
  msoTier: string;   // MsoTierKey | 'custom' | ''
  msoFee: number;
  ovrUcaas:  number | null;
  ovrCcaas:  number | null;
  ovrImpl:   number | null;
  ovrMso:    number | null;
  ovrAdvApp: number | null;
  customLines: { label: string; price: number }[];
  notes: string;
}

export interface OppCalcResult {
  ucaasSup: number;
  ccaasSup: number;
  implSup:  number;
  msoSup:   number;
  customTotal: number;
  annual: number;
  tcv: number;
  ucaasCalc: number;
  ccaasCalc: number;
  implCalc:  number;
  msoCalc:   number;
  advAppCalc:       number;
  advAppSup:        number;
  advAppOverridden: boolean;
  ucaasOverridden:  boolean;
  ccaasOverridden:  boolean;
  implOverridden:   boolean;
  msoOverridden:    boolean;
  msoEnabled: boolean;
  minApplied: boolean;
}

export interface OppVersion {
  id: string;
  oppId: string;
  versionNum: number;
  label: string | null;
  data: OppFormData;
  calc: OppCalcResult;
  createdBy: string;
  sharepointUrl: string | null;
  savedAt: string;
}

export interface Opportunity {
  id: string;
  name: string;
  createdBy: string;
  crmAccountId: string | null;
  crmOppId: string | null;
  createdAt: string;
  updatedAt: string;
  versions: OppVersion[];
  activeVersionIdx: number;
}

// ── Dynamics CRM ─────────────────────────────────────────────────────────────

export interface CrmAccount {
  id: string;
  name: string;
  phone: string | null;
  city:  string | null;
  state: string | null;
}

export interface CrmOpportunity {
  id: string;
  name: string;
  accountId: string;
  accountName: string;
  estimatedCloseDate: string | null;
  statusCode: string;
}

// ── API response envelope ─────────────────────────────────────────────────────

export interface ApiOk<T> { ok: true; data: T }
export interface ApiErr   { ok: false; error: string }
export type ApiResponse<T> = ApiOk<T> | ApiErr;
