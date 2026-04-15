import { useState, useEffect } from 'react';
import { useApiToken } from '../../auth/useApiToken';
import { oppsApi } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { calcSupport, fmt, DEFAULT_FORM_DATA } from '../../lib/calcSupport';
import { MSO_TIERS, getMsoTier } from '../../lib/msoTiers';
import { useIsMobile } from '../../hooks/useWindowWidth';
import type { MsoTierKey } from '../../lib/msoTiers';
import type { OppFormData, Opportunity } from '../../types';

interface Props {
  opp: Opportunity;
  onTabChange: (tab: string) => void;
}

export default function CalculatorTab({ opp, onTabChange }: Props) {
  const { getToken } = useApiToken();
  const { currentUser } = useAppStore();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const latest = opp.versions[opp.versions.length - 1];
  const [form, setForm] = useState<OppFormData>(latest?.data ?? DEFAULT_FORM_DATA);

  // Re-sync when opp changes (e.g. switching between opps)
  useEffect(() => {
    setForm(latest?.data ?? DEFAULT_FORM_DATA);
  }, [opp.id]);

  // Auto-compute contract end date from start + term
  useEffect(() => {
    if (!form.contractStart) return;
    const start = new Date(form.contractStart + 'T12:00:00');
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + (Number(form.term) || 1));
    end.setDate(end.getDate() - 1);
    const computed = end.toISOString().split('T')[0];
    if (computed !== form.contractEnd) {
      setForm(prev => ({ ...prev, contractEnd: computed }));
    }
  }, [form.contractStart, form.term]);

  const calc = calcSupport(form);
  const selectedTier = getMsoTier(form.msoTier || '');

  function set<K extends keyof OppFormData>(key: K, value: OppFormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function setOverride(key: 'ovrUcaas' | 'ovrCcaas' | 'ovrImpl' | 'ovrMso', val: string) {
    set(key, val === '' ? null : Number(val));
  }

  function applyTier(key: string) {
    const tier = getMsoTier(key);
    setForm(prev => ({ ...prev, msoTier: key, msoFee: tier ? tier.fee : 0 }));
  }

  function addCustomLine() {
    setForm(prev => ({ ...prev, customLines: [...prev.customLines, { label: '', price: 0 }] }));
  }

  function updateCustomLine(idx: number, field: 'label' | 'price', value: string) {
    setForm(prev => {
      const lines = [...prev.customLines];
      lines[idx] = { ...lines[idx], [field]: field === 'price' ? Number(value) : value };
      return { ...prev, customLines: lines };
    });
  }

  function removeCustomLine(idx: number) {
    setForm(prev => ({ ...prev, customLines: prev.customLines.filter((_, i) => i !== idx) }));
  }

  async function handleSave(label?: string) {
    setSaving(true);
    try {
      const token = await getToken();
      await oppsApi.saveVersion(token, opp.id, form, calc, label);
      const all = await oppsApi.list(token);
      useAppStore.getState().setOpps(all);
      showToast('Version saved');
    } catch (e: any) {
      showToast(e.message);
    } finally {
      setSaving(false);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const canDiscount = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const isMobile = useIsMobile();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 380px', gap: 24, alignItems: 'start' }}>
      {/* Left: Inputs */}
      <div>
        {/* Opportunity Type */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Opportunity Type</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {(['UCaaS Only', 'CCaaS Only', 'UCaaS + CCaaS'] as const).map(t => (
              <button
                key={t}
                onClick={() => set('oppType', t)}
                style={{
                  padding: '7px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                  border: `1px solid ${form.oppType === t ? 'var(--teal)' : 'var(--border-mid)'}`,
                  background: form.oppType === t ? 'rgba(0,184,160,0.15)' : 'var(--surface)',
                  color: form.oppType === t ? 'var(--teal)' : 'var(--text-secondary)',
                  fontWeight: 500,
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs */}
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <div style={cardTitleStyle}>Inputs</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginTop: 12 }}>
            {form.oppType !== 'CCaaS Only' && (
              <div>
                <InputField label="UCaaS Users" value={form.ucaasUsers}
                  onChange={v => set('ucaasUsers', Number(v))} />
                <div style={hintStyle}>$1.00/user/month · billed annually · $2,500/yr minimum</div>
              </div>
            )}
            {form.oppType !== 'UCaaS Only' && (
              <div>
                <InputField label="CCaaS Annual Licensing ($)" value={form.ccaasLicensing}
                  onChange={v => set('ccaasLicensing', Number(v))} />
                <div style={hintStyle}>Support: 30% of annual licensing · Excludes usage, consumption, DIDs &amp; telco</div>
              </div>
            )}
            {form.oppType !== 'UCaaS Only' && (
              <div>
                <InputField label="Impl. SOW ($)" value={form.implSow}
                  onChange={v => set('implSow', Number(v))} />
                <div style={hintStyle}>Support: 30% of SOW value</div>
              </div>
            )}
            <InputField label="Term (years)" value={form.term} min={1} max={10}
              onChange={v => set('term', Number(v))} />
            <DateField label="Contract Start" value={form.contractStart}
              onChange={v => set('contractStart', v)} />
            <DateField label="Contract End (auto)" value={form.contractEnd}
              onChange={v => set('contractEnd', v)} />
          </div>

        </div>

        {/* MSO */}
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="mso" checked={form.msoEnabled}
              onChange={e => {
                const checked = e.target.checked;
                setForm(prev => ({
                  ...prev,
                  msoEnabled: checked,
                  ...(checked ? {} : { msoTier: '', msoFee: 0 }),
                }));
              }}
              style={{ width: 16, height: 16, cursor: 'pointer' }} />
            <label htmlFor="mso" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
              Include CloudSupport⁺ MSO
            </label>
          </div>

          {form.msoEnabled && (
            <div style={{ marginTop: 14 }}>
              {/* Tier selector */}
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Engagement Tier
                </label>
                <select
                  value={form.msoTier}
                  onChange={e => applyTier(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="" style={{ color: '#0f172a', background: '#ffffff' }}>— Select a tier —</option>
                  {(Object.entries(MSO_TIERS) as [MsoTierKey, typeof MSO_TIERS[MsoTierKey]][]).map(([key, t]) => (
                    <option key={key} value={key} style={{ color: '#0f172a', background: '#ffffff' }}>
                      {t.label} — {t.engineer} · ~${(t.fee / 1000).toFixed(0)}k/yr
                    </option>
                  ))}
                  <option value="custom" style={{ color: '#0f172a', background: '#ffffff' }}>Custom — Enter fee manually</option>
                </select>
              </div>

              {/* Tier description card */}
              {selectedTier && form.msoTier !== 'custom' && (
                <div style={{ marginBottom: 10, padding: '10px 14px', background: 'rgba(0,184,160,0.05)', border: '1px solid rgba(0,184,160,0.18)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)' }}>{selectedTier.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selectedTier.engineer}</span>
                  </div>
                  <div style={{ marginBottom: 2 }}><strong>Allocation:</strong> {selectedTier.allocation}</div>
                  <div style={{ marginBottom: 2 }}><strong>Best for:</strong> {selectedTier.scope}</div>
                  <div style={{ marginBottom: 2 }}><strong>SLA:</strong> {selectedTier.sla}</div>
                  <div><strong>Includes:</strong> {selectedTier.includes}</div>
                </div>
              )}

              {/* Annual fee */}
              <InputField
                label={`Annual MSO Fee ($)${selectedTier ? ' \u2014 auto-filled' : ''}`}
                value={form.msoFee || ''}
                onChange={v => set('msoFee', Number(v))}
                placeholder="Enter annual fee"
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                All tiers include: Named CSM · 24/7 P1–P3 SLA · MACD · Monthly Reporting · QBR · Vendor Coordination
              </div>
            </div>
          )}
        </div>

        {/* Overrides (admin/manager only) */}
        {canDiscount && (
          <div style={{ ...cardStyle, marginTop: 16 }}>
            <div style={cardTitleStyle}>Overrides <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(managers only)</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginTop: 12 }}>
              {form.oppType !== 'CCaaS Only' && (
                <InputField label="UCaaS Support Override ($)" value={form.ovrUcaas ?? ''}
                  onChange={v => setOverride('ovrUcaas', v)} placeholder={fmt(calc.ucaasCalc)} />
              )}
              {form.oppType !== 'UCaaS Only' && (
                <InputField label="CCaaS Support Override ($)" value={form.ovrCcaas ?? ''}
                  onChange={v => setOverride('ovrCcaas', v)} placeholder={fmt(calc.ccaasCalc)} />
              )}
              {form.oppType !== 'UCaaS Only' && (
                <InputField label="Impl. Support Override ($)" value={form.ovrImpl ?? ''}
                  onChange={v => setOverride('ovrImpl', v)} placeholder={fmt(calc.implCalc)} />
              )}
              {form.msoEnabled && (
                <InputField label="MSO Override ($)" value={form.ovrMso ?? ''}
                  onChange={v => setOverride('ovrMso', v)} placeholder={fmt(calc.msoCalc)} />
              )}
            </div>
          </div>
        )}

        {/* Custom lines */}
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={cardTitleStyle}>Custom Line Items</div>
            <button onClick={addCustomLine} style={smallBtnStyle}>+ Add</button>
          </div>
          {form.customLines.map((line, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <input
                value={line.label}
                onChange={e => updateCustomLine(idx, 'label', e.target.value)}
                placeholder="Description"
                style={{ ...inputStyle, flex: 2 }}
              />
              <input
                type="number"
                value={line.price}
                onChange={e => updateCustomLine(idx, 'price', e.target.value)}
                placeholder="Annual $"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={() => removeCustomLine(idx)}
                style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16 }}>
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Labor Rates */}
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <div style={cardTitleStyle}>Labor Rate Adjustors</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginTop: 12 }}>
            <InputField label="After-Hours Rate ($/hr)" value={form.afterHoursRate}
              onChange={v => set('afterHoursRate', Number(v))} />
            <InputField label="Advanced Task Rate ($/hr)" value={form.advancedTaskRate}
              onChange={v => set('advancedTaskRate', Number(v))} />
          </div>
        </div>

        {/* Notes */}
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <div style={cardTitleStyle}>Notes</div>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={3}
            style={{ ...inputStyle, width: '100%', resize: 'vertical', marginTop: 8, height: 80 }}
            placeholder="Internal notes for this version…"
          />
        </div>
      </div>

      {/* Right: Summary */}
      <div style={{ position: isMobile ? 'static' : 'sticky', top: 0 }}>
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Support Summary</div>
          <div style={{ marginTop: 16 }}>
            <SummaryRow label="UCaaS Support" value={calc.ucaasSup} overridden={calc.ucaasOverridden}
              show={form.oppType !== 'CCaaS Only'} minNote={calc.minApplied ? '(min applied)' : undefined} />
            <SummaryRow label="CCaaS Support" value={calc.ccaasSup} overridden={calc.ccaasOverridden}
              show={form.oppType !== 'UCaaS Only'} />
            <SummaryRow label="Impl. Support" value={calc.implSup} overridden={calc.implOverridden}
              show={form.oppType !== 'UCaaS Only'} />
            <SummaryRow label="MSO" value={calc.msoSup} overridden={calc.msoOverridden} show={form.msoEnabled} />
            {form.customLines.map((l, i) => (
              <SummaryRow key={i} label={l.label || `Custom ${i + 1}`} value={l.price} />
            ))}
            <div style={{ borderTop: '1px solid var(--border-mid)', marginTop: 12, paddingTop: 12 }}>
              <SummaryRow label="Annual Total" value={calc.annual} bold />
              <SummaryRow label={`TCV (${form.term}yr)`} value={calc.tcv} bold gold />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            onClick={() => handleSave()}
            disabled={saving}
            style={{ ...primaryBtnStyle, flex: 1 }}
          >
            {saving ? 'Saving…' : 'Save Version'}
          </button>
          <button
            onClick={() => onTabChange('agreement')}
            style={{ ...secondaryBtnStyle, flex: 1 }}
          >
            Preview →
          </button>
        </div>

        {toast && (
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 6, fontSize: 13,
            background: 'rgba(63,184,122,0.15)', border: '1px solid rgba(63,184,122,0.3)',
            color: 'var(--green)',
          }}>
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InputField({ label, value, onChange, placeholder, min, max, style: extraStyle }: {
  label: string; value: string | number;
  onChange: (v: string) => void;
  placeholder?: string; min?: number; max?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ marginBottom: 4, ...extraStyle }}>
      {label && <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</label>}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

function DateField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: 4 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</label>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...inputStyle, colorScheme: 'dark' }}
      />
    </div>
  );
}

function SummaryRow({ label, value, overridden, show = true, bold, gold, minNote }: {
  label: string; value: number; overridden?: boolean;
  show?: boolean; bold?: boolean; gold?: boolean; minNote?: string;
}) {
  if (!show) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'baseline' }}>
      <div style={{ fontSize: 13, color: bold ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: bold ? 600 : 400 }}>
        {label}
        {overridden && <span style={{ fontSize: 10, color: 'var(--gold)', marginLeft: 4 }}>overridden</span>}
        {minNote && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>{minNote}</span>}
      </div>
      <div style={{
        fontSize: bold ? 16 : 14, fontWeight: bold ? 700 : 500,
        color: gold ? 'var(--gold)' : bold ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontFamily: 'IBM Plex Mono, monospace',
      }}>
        {fmt(value)}
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border-mid)',
  borderRadius: 10, padding: '22px 24px',
};
const cardTitleStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: 'var(--teal)',
};
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--border-mid)', borderRadius: 6,
  padding: '8px 10px', color: 'var(--text-primary)',
  fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, outline: 'none',
};
const primaryBtnStyle: React.CSSProperties = {
  padding: '9px 16px', background: 'var(--teal)', border: 'none',
  borderRadius: 6, color: 'var(--navy)', fontFamily: 'IBM Plex Sans, sans-serif',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const secondaryBtnStyle: React.CSSProperties = {
  padding: '9px 16px', background: 'var(--surface-mid)',
  border: '1px solid var(--border-mid)', borderRadius: 6,
  color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans, sans-serif',
  fontSize: 13, fontWeight: 500, cursor: 'pointer',
};
const hintStyle = {
  fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.4,
} as const;
const smallBtnStyle: React.CSSProperties = {
  padding: '4px 10px', background: 'var(--surface-mid)',
  border: '1px solid var(--border-mid)', borderRadius: 5,
  color: 'var(--teal)', fontSize: 12, cursor: 'pointer',
};
