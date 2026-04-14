// Mirror of worker/src/types.ts — keep in sync
// (In a future monorepo setup these could be shared via a workspace package)

export interface OppFormData {
  oppType: 'UCaaS Only' | 'CCaaS Only' | 'UCaaS + CCaaS';
  ucaasUsers: number;
  ccaasLicensing: number;
  implSow: number;
  term: number;
  contractStart: string;    // ISO date string e.g. "2025-06-01"
  contractEnd: string;      // ISO date string
  afterHoursRate: number;   // $/hr
  advancedTaskRate: number; // $/hr
  msoEnabled: boolean;
  msoFee: number;
  ovrUcaas: number | null;
  ovrCcaas: number | null;
  ovrImpl:  number | null;
  ovrMso:   number | null;
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
  ucaasOverridden: boolean;
  ccaasOverridden: boolean;
  implOverridden:  boolean;
  msoOverridden:   boolean;
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
  creatorName?: string;
  crmAccountId: string | null;
  crmOppId: string | null;
  createdAt: string;
  updatedAt: string;
  versions: OppVersion[];
  activeVersionIdx: number;
}

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

// ── SharePoint ────────────────────────────────────────────────────────────────

export interface SPLocation {
  id: string;
  name: string;
  absoluteUrl: string;
}

export interface SPFile {
  id: string;
  name: string;
  size: number | null;
  lastModified: string | null;
  webUrl: string;
  downloadUrl: string | null;
  isFolder: boolean;
  mimeType: string | null;
}

export interface CurrentUser {
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
}
