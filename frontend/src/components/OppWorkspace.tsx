import { useState } from 'react';
import { useApiToken } from '../auth/useApiToken';
import { oppsApi } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import CalculatorTab from './calculator/CalculatorTab';
import AgreementTab from './calculator/AgreementTab';
import HistoryTab from './calculator/HistoryTab';
import TeamViewTab from './calculator/TeamViewTab';
import CrmLinkTab from './calculator/CrmLinkTab';

const TABS = [
  { id: 'calculator', label: 'Calculator' },
  { id: 'agreement',  label: 'Agreement Preview' },
  { id: 'history',    label: 'Version History' },
  { id: 'crm',        label: 'CRM Link' },
  { id: 'team',       label: 'Team View' },
];

export default function OppWorkspace() {
  const { opps, currentOppId } = useAppStore();
  const opp = opps.find(o => o.id === currentOppId);
  const [tab, setTab] = useState('calculator');
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const { getToken } = useApiToken();

  async function saveName() {
    const trimmed = nameValue.trim();
    setEditingName(false);
    if (!trimmed || !opp || trimmed === opp.name) return;
    try {
      const token = await getToken();
      await oppsApi.update(token, opp.id, { name: trimmed });
      const all = await oppsApi.list(token);
      useAppStore.getState().setOpps(all);
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (!opp) return null;

  const latest = opp.versions[opp.versions.length - 1];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '0 28px',
        height: 56, borderBottom: '1px solid var(--border)', gap: 16, flexShrink: 0,
      }}>
        {editingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={saveName}
            onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
            style={{
              flex: 1, fontFamily: 'DM Serif Display, serif', fontSize: 20,
              color: 'var(--text-primary)', background: 'transparent',
              border: 'none', borderBottom: '1px solid var(--teal)',
              outline: 'none', padding: '2px 0', minWidth: 0,
            }}
          />
        ) : (
          <div
            onClick={() => { setNameValue(opp.name); setEditingName(true); }}
            title="Click to rename"
            style={{
              fontFamily: 'DM Serif Display, serif', fontSize: 20,
              color: 'var(--text-primary)', flex: 1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              cursor: 'text',
            }}
          >
            {opp.name}
          </div>
        )}
        {latest && (
          <div style={{
            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
            background: 'rgba(0,184,160,0.15)', color: 'var(--teal)',
            border: '1px solid var(--teal-dim)', fontFamily: 'IBM Plex Mono, monospace',
          }}>
            {latest.calc.annual.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}/yr
          </div>
        )}
        {opp.crmAccountId && (
          <div style={{
            fontSize: 11, padding: '3px 8px', borderRadius: 4,
            background: 'rgba(232,184,75,0.1)', color: 'var(--gold)',
            border: '1px solid rgba(232,184,75,0.3)',
          }}>
            CRM Linked
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 2, padding: '0 28px',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        {TABS.map(t => (
          <div
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              color: tab === t.id ? 'var(--teal)' : 'var(--text-muted)',
              borderBottom: `2px solid ${tab === t.id ? 'var(--teal)' : 'transparent'}`,
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </div>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        {tab === 'calculator' && <CalculatorTab opp={opp} onTabChange={setTab} />}
        {tab === 'agreement'  && <AgreementTab  opp={opp} />}
        {tab === 'history'    && <HistoryTab    opp={opp} />}
        {tab === 'crm'        && <CrmLinkTab    opp={opp} />}
        {tab === 'team'       && <TeamViewTab />}
      </div>
    </div>
  );
}
