import type { OppFormData, OppCalcResult } from '../types';

export function calcSupport(d: OppFormData): OppCalcResult {
  const type      = d.oppType;
  const users     = Number(d.ucaasUsers)    || 0;
  const ccaasLic  = Number(d.ccaasLicensing) || 0;
  const implSow   = Number(d.implSow)        || 0;
  const term      = Number(d.term)           || 1;
  const msoEnabled = d.msoEnabled === true;
  const msoFeeRaw  = Number(d.msoFee)        || 0;

  // Base calculated values
  let ucaasCalc = 0;
  let minApplied = false;
  if (type !== 'CCaaS Only') {
    ucaasCalc = users * 1 * 12;
    if (ucaasCalc < 2500 && users > 0) { ucaasCalc = 2500; minApplied = true; }
  }
  const ccaasCalc = type !== 'UCaaS Only' ? ccaasLic * 0.30 : 0;
  const implCalc  = implSow * 0.30;
  const msoCalc   = msoEnabled ? msoFeeRaw : 0;

  // Apply overrides if set
  const ucaasSup = d.ovrUcaas != null ? d.ovrUcaas : ucaasCalc;
  const ccaasSup = d.ovrCcaas != null ? d.ovrCcaas : ccaasCalc;
  const implSup  = d.ovrImpl  != null ? d.ovrImpl  : implCalc;
  const msoSup   = d.ovrMso   != null ? d.ovrMso   : msoCalc;

  const customTotal = (d.customLines ?? []).reduce((sum, l) => sum + (Number(l.price) || 0), 0);

  const annual = ucaasSup + ccaasSup + implSup + (msoEnabled ? msoSup : 0) + customTotal;
  const tcv    = annual * term;

  return {
    ucaasSup, ccaasSup, implSup, msoSup, customTotal, annual, tcv,
    ucaasCalc, ccaasCalc, implCalc, msoCalc,
    ucaasOverridden: d.ovrUcaas != null,
    ccaasOverridden: d.ovrCcaas != null,
    implOverridden:  d.ovrImpl  != null,
    msoOverridden:   d.ovrMso   != null,
    msoEnabled,
    minApplied,
  };
}

export function fmt(n: number): string {
  if (!n) return '$0';
  return '$' + Math.round(n).toLocaleString('en-US');
}

export function fmtFull(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const DEFAULT_FORM_DATA: OppFormData = {
  oppType: 'UCaaS Only',
  ucaasUsers: 0,
  ccaasLicensing: 0,
  implSow: 0,
  term: 1,
  contractStart: '',
  contractEnd: '',
  afterHoursRate: 165,
  advancedTaskRate: 145,
  msoEnabled: false,
  msoFee: 0,
  ovrUcaas: null,
  ovrCcaas: null,
  ovrImpl:  null,
  ovrMso:   null,
  customLines: [],
  notes: '',
};
