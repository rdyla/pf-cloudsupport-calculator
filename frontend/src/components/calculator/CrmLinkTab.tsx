/**
 * CrmLinkTab — Search Dynamics 365 accounts/opportunities and link them to this opp.
 */
import { useState } from 'react';
import { useApiToken } from '../../auth/useApiToken';
import { crmApi, oppsApi } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import type { Opportunity, CrmAccount, CrmOpportunity } from '../../types';

interface Props { opp: Opportunity; }

export default function CrmLinkTab({ opp }: Props) {
  const { getToken } = useApiToken();
  useAppStore();

  const [accountSearch, setAccountSearch] = useState('');
  const [accounts, setAccounts]           = useState<CrmAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<CrmAccount | null>(null);
  const [crmOpps, setCrmOpps]             = useState<CrmOpportunity[]>([]);
  const [selectedOpp, setSelectedOpp]     = useState<CrmOpportunity | null>(null);
  const [searching, setSearching]         = useState(false);
  const [linking, setLinking]             = useState(false);
  const [toast, setToast]                 = useState<string | null>(null);

  const isLinked = !!(opp.crmAccountId);

  async function searchAccounts() {
    if (!accountSearch.trim()) return;
    setSearching(true);
    try {
      const token = await getToken();
      const results = await crmApi.searchAccounts(token, accountSearch);
      setAccounts(results);
      setSelectedAccount(null);
      setCrmOpps([]);
      setSelectedOpp(null);
    } catch (e: any) {
      showToast(e.message);
    } finally {
      setSearching(false);
    }
  }

  async function selectAccount(account: CrmAccount) {
    setSelectedAccount(account);
    setSelectedOpp(null);
    try {
      const token = await getToken();
      const opps = await crmApi.accountOpportunities(token, account.id);
      setCrmOpps(opps);
    } catch (e: any) {
      showToast(e.message);
    }
  }

  async function linkToCrm() {
    setLinking(true);
    try {
      const token = await getToken();
      await oppsApi.update(token, opp.id, {
        crmAccountId: selectedAccount?.id ?? undefined,
        crmOppId: selectedOpp?.id ?? undefined,
      });
      // Refresh
      const all = await oppsApi.list(token);
      useAppStore.getState().setOpps(all);
      showToast('Linked to CRM');
    } catch (e: any) {
      showToast(e.message);
    } finally {
      setLinking(false);
    }
  }

  async function unlink() {
    if (!confirm('Remove the CRM link from this opportunity?')) return;
    try {
      const token = await getToken();
      await oppsApi.update(token, opp.id, { crmAccountId: '', crmOppId: '' });
      const all = await oppsApi.list(token);
      useAppStore.getState().setOpps(all);
      showToast('CRM link removed');
    } catch (e: any) {
      showToast(e.message);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={sectionTitle}>CRM Link</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          Search your Dynamics 365 accounts, select an account and optionally a linked opportunity,
          then save the link. The relationship will be stored with this calculator record.
        </p>
      </div>

      {/* Current link status */}
      {isLinked && (
        <div style={{
          ...cardStyle, marginBottom: 20,
          borderColor: 'rgba(232,184,75,0.3)',
          background: 'rgba(232,184,75,0.06)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, marginBottom: 4 }}>Currently Linked</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>Account ID: {opp.crmAccountId}</div>
              {opp.crmOppId && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Opportunity ID: {opp.crmOppId}</div>}
            </div>
            <button onClick={unlink} style={dangerBtnStyle}>Unlink</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Search Accounts</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input
            value={accountSearch}
            onChange={e => setAccountSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchAccounts()}
            placeholder="Search account name…"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={searchAccounts} disabled={searching} style={primaryBtnStyle}>
            {searching ? '…' : 'Search'}
          </button>
        </div>

        {/* Account results */}
        {accounts.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Results ({accounts.length})
            </div>
            {accounts.map(a => (
              <div
                key={a.id}
                onClick={() => selectAccount(a)}
                style={{
                  padding: '10px 12px', borderRadius: 6, cursor: 'pointer', marginBottom: 4,
                  border: `1px solid ${selectedAccount?.id === a.id ? 'var(--teal-dim)' : 'var(--border-mid)'}`,
                  background: selectedAccount?.id === a.id ? 'rgba(0,184,160,0.10)' : 'var(--surface)',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{a.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {[a.city, a.state].filter(Boolean).join(', ')}{a.phone ? ` · ${a.phone}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Linked CRM opportunities */}
      {selectedAccount && crmOpps.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <div style={sectionTitle}>Opportunities in {selectedAccount.name}</div>
          <div style={{ marginTop: 12 }}>
            {crmOpps.map(co => (
              <div
                key={co.id}
                onClick={() => setSelectedOpp(prev => prev?.id === co.id ? null : co)}
                style={{
                  padding: '10px 12px', borderRadius: 6, cursor: 'pointer', marginBottom: 4,
                  border: `1px solid ${selectedOpp?.id === co.id ? 'var(--teal-dim)' : 'var(--border-mid)'}`,
                  background: selectedOpp?.id === co.id ? 'rgba(0,184,160,0.10)' : 'var(--surface)',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{co.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {co.statusCode}{co.estimatedCloseDate ? ` · Close: ${co.estimatedCloseDate.slice(0, 10)}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedAccount && (
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={linkToCrm} disabled={linking} style={primaryBtnStyle}>
            {linking ? 'Saving…' : `Link to ${selectedAccount.name}${selectedOpp ? ' / ' + selectedOpp.name : ''}`}
          </button>
          {!selectedOpp && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              No opportunity selected — account link only
            </span>
          )}
        </div>
      )}

      {toast && (
        <div style={{
          marginTop: 14, padding: '8px 12px', borderRadius: 6, fontSize: 13,
          background: 'rgba(63,184,122,0.12)', border: '1px solid rgba(63,184,122,0.3)',
          color: 'var(--green)',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border-mid)', borderRadius: 10, padding: '20px 22px',
};
const sectionTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)',
};
const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-mid)', borderRadius: 6,
  padding: '8px 10px', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13,
};
const primaryBtnStyle: React.CSSProperties = {
  padding: '9px 16px', background: 'var(--teal)', border: 'none', borderRadius: 6,
  color: 'var(--navy)', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const dangerBtnStyle: React.CSSProperties = {
  padding: '7px 12px', background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.3)',
  borderRadius: 6, color: 'var(--red)', fontSize: 12, cursor: 'pointer',
};
