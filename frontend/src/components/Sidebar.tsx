import { useState } from 'react';
import { useApiToken } from '../auth/useApiToken';
import { oppsApi } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { fmt } from '../lib/calcSupport';

interface Props {
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

export default function Sidebar({ onLogout, isOpen = true, onClose, isMobile = false }: Props) {
  const { getToken } = useApiToken();
  const { opps, removeOpp, currentOppId, setCurrentOppId, currentUser } = useAppStore();
  const [creating, setCreating] = useState(false);

  async function handleNewOpp() {
    const name = prompt('Opportunity name:')?.trim();
    if (!name) return;
    setCreating(true);
    try {
      const token = await getToken();
      const { id } = await oppsApi.create(token, name);
      // Reload the full opp list to get the new entry
      const all = await oppsApi.list(token);
      useAppStore.getState().setOpps(all);
      setCurrentOppId(id);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('Delete this opportunity and all its versions?')) return;
    try {
      const token = await getToken();
      await oppsApi.delete(token, id);
      removeOpp(id);
      if (currentOppId === id) setCurrentOppId(null);
    } catch (e: any) {
      alert(e.message);
    }
  }

  // On mobile, hide entirely when closed (renders as fixed overlay when open)
  if (isMobile && !isOpen) return null;

  const mobileStyle: React.CSSProperties = isMobile ? {
    position: 'fixed', top: 0, left: 0, height: '100%', zIndex: 200,
    boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
  } : {};

  return (
    <aside style={{
      width: 280, minWidth: 280, background: 'var(--navy-mid)',
      borderRight: '1px solid var(--border)', display: 'flex',
      flexDirection: 'column', overflow: 'hidden',
      ...mobileStyle,
    }}>
      {/* Logo + close button on mobile */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src="/packetfusionlogo_white.png" alt="Packet Fusion" style={{ width: '100%', maxWidth: 180, display: 'block' }} />
        {isMobile && (
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', fontSize: 22, padding: '0 4px', lineHeight: 1, flexShrink: 0,
            }}
            aria-label="Close sidebar"
          >×</button>
        )}
      </div>

      {/* New opportunity */}
      <div style={{ padding: '14px 16px 6px' }}>
        <button
          onClick={handleNewOpp}
          disabled={creating}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 12px', background: 'rgba(0,184,160,0.15)',
            border: '1px solid var(--teal-dim)', borderRadius: 6,
            color: 'var(--teal)', fontFamily: 'IBM Plex Sans, sans-serif',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          New Opportunity
        </button>
      </div>

      {/* Opp list */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '0 10px 16px' }}>
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--text-muted)',
          padding: '12px 6px 6px',
        }}>
          Opportunities
        </div>
        {opps.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 6px' }}>
            No opportunities yet.
          </div>
        )}
        {opps.map(opp => {
          const latest = opp.versions[opp.versions.length - 1];
          const isActive = opp.id === currentOppId;
          return (
            <div
              key={opp.id}
              onClick={() => { setCurrentOppId(opp.id); if (isMobile) onClose?.(); }}
              style={{
                padding: '10px 10px 9px', borderRadius: 6, cursor: 'pointer',
                border: `1px solid ${isActive ? 'var(--teal-dim)' : 'transparent'}`,
                background: isActive ? 'rgba(0,184,160,0.15)' : 'transparent',
                marginBottom: 3,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                  fontSize: 13, fontWeight: 500,
                  color: isActive ? 'var(--teal)' : 'var(--text-primary)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
                }}>
                  {opp.name}
                </div>
                <button
                  onClick={(e) => handleDelete(e, opp.id)}
                  style={{
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', fontSize: 13, padding: '1px 3px', borderRadius: 3, flexShrink: 0,
                  }}
                  title="Delete"
                >×</button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
                <span style={{
                  fontSize: 10, color: 'var(--text-muted)', background: 'var(--surface)',
                  borderRadius: 3, padding: '1px 5px',
                }}>
                  {latest?.data.oppType ?? 'New'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  v{opp.versions.length}
                </span>
              </div>
              {latest && (
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', marginTop: 2, fontFamily: 'IBM Plex Mono, monospace' }}>
                  {fmt(latest.calc.annual)}/yr
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* User footer */}
      {currentUser && (
        <div style={{
          borderTop: '1px solid var(--border)', padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{currentUser.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{currentUser.role}</div>
          </div>
          <button
            onClick={onLogout}
            style={{
              background: 'none', border: '1px solid var(--border-mid)', borderRadius: 5,
              color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, padding: '4px 8px',
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
