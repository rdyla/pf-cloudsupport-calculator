import { useState } from 'react';
import { useApiToken } from '../auth/useApiToken';
import { oppsApi } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { useIsMobile } from '../hooks/useWindowWidth';
import { fmt } from '../lib/calcSupport';

interface Props {
  onOpenSidebar: () => void;
}

export default function DashboardView({ onOpenSidebar }: Props) {
  const { getToken } = useApiToken();
  const { opps, currentUser, setCurrentOppId, setOpps, setActiveTab } = useAppStore();
  const isMobile = useIsMobile();
  const [creating, setCreating] = useState(false);

  // Time-based greeting
  const hour = new Date().getHours();
  const tod = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = currentUser?.name.split(' ')[0] ?? '';

  // Stats
  const myOpps     = opps.filter(o => o.createdBy === currentUser?.email);
  const myPipeline = myOpps.reduce((sum, o) => {
    const l = o.versions[o.versions.length - 1];
    return sum + (l?.calc.annual ?? 0);
  }, 0);
  const totalPipeline = opps.reduce((sum, o) => {
    const l = o.versions[o.versions.length - 1];
    return sum + (l?.calc.annual ?? 0);
  }, 0);

  // Recent opps — all opps sorted by latest savedAt, top 6
  const recent = [...opps]
    .sort((a, b) => {
      const aT = a.versions[a.versions.length - 1]?.savedAt ?? a.createdAt;
      const bT = b.versions[b.versions.length - 1]?.savedAt ?? b.createdAt;
      return bT.localeCompare(aT);
    })
    .slice(0, 6);

  async function handleNewOpp() {
    const name = prompt('Opportunity name:')?.trim();
    if (!name) return;
    setCreating(true);
    try {
      const token = await getToken();
      const { id } = await oppsApi.create(token, name);
      const all = await oppsApi.list(token);
      setOpps(all);
      setCurrentOppId(id);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreating(false);
    }
  }

  function handleOpenTeamView() {
    const first = opps[0];
    if (first) {
      setActiveTab('team');
      setCurrentOppId(first.id);
    }
  }

  const roleMap: Record<string, string> = {
    admin:   'Full access — calculator, agreements, price overrides, and user management.',
    manager: 'Full calculator access including price overrides and discounting.',
    user:    'Calculator and agreement access. Price overrides are managed by managers or admins.',
  };
  const role = currentUser?.role ?? 'user';

  const roleBadgeColor: Record<string, string> = {
    admin:   'var(--gold)',
    manager: 'var(--teal)',
    user:    'var(--text-secondary)',
  };
  const roleBadgeBg: Record<string, string> = {
    admin:   'rgba(232,184,75,0.15)',
    manager: 'rgba(0,184,160,0.12)',
    user:    'rgba(255,255,255,0.07)',
  };

  const pad = isMobile ? 20 : 40;

  return (
    <div style={{ overflowY: 'auto', flex: 1, height: isMobile ? 'auto' : '100%' }}>
      {/* Hamburger on mobile */}
      {isMobile && (
        <button
          onClick={onOpenSidebar}
          style={{
            position: 'fixed', top: 14, left: 14, zIndex: 100,
            background: 'var(--navy-mid)', border: '1px solid var(--border-mid)',
            borderRadius: 6, color: 'var(--text-primary)', fontSize: 20,
            padding: '4px 10px', cursor: 'pointer', lineHeight: 1,
          }}
        >☰</button>
      )}

      <div style={{ padding: `36px ${pad}px`, maxWidth: 1000, width: '100%', paddingTop: isMobile ? 60 : 36 }}>

        {/* Greeting */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: isMobile ? 22 : 28, color: 'var(--text-primary)', marginBottom: 6 }}>
            {tod}, {firstName}.
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Here's a summary of your CloudSupport pipeline.
          </div>
        </div>

        {/* Stat cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: 14,
          marginBottom: 32,
        }}>
          <StatCard label="My Opportunities" value={String(myOpps.length)} />
          <StatCard label="My Pipeline" value={fmt(myPipeline)} sub="annual" />
          <StatCard label="Total Company Opps" value={String(opps.length)} />
          <StatCard label="Total Pipeline" value={fmt(totalPipeline)} sub="annual" />
        </div>

        {/* Two-column body */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 300px',
          gap: 20,
          alignItems: 'start',
        }}>

          {/* Recent Opportunities */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>
              Recent Opportunities
            </div>

            {recent.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No opportunities yet. Create your first one below.
              </div>
            ) : (
              recent.map(o => {
                const latest    = o.versions[o.versions.length - 1];
                const type      = latest?.data.oppType ?? null;
                const price     = latest ? fmt(latest.calc.annual) + '/yr' : '—';
                const savedDate = latest
                  ? new Date(latest.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '';
                const byMe = o.createdBy === currentUser?.email;

                return (
                  <RecentRow
                    key={o.id}
                    name={o.name || 'Unnamed'}
                    byName={byMe ? null : (o.creatorName ?? o.createdBy)}
                    type={type}
                    date={savedDate}
                    price={price}
                    isMobile={isMobile}
                    onClick={() => setCurrentOppId(o.id)}
                  />
                );
              })
            )}

            <button
              onClick={handleNewOpp}
              disabled={creating}
              style={{
                marginTop: 16, display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', background: 'var(--teal)', border: 'none',
                borderRadius: 8, color: 'var(--navy)',
                fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {creating ? 'Creating…' : 'New Opportunity'}
            </button>
          </div>

          {/* Quick Actions + Role info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 2 }}>
              Quick Actions
            </div>

            <ActionButton onClick={handleNewOpp} disabled={creating}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              New Opportunity
            </ActionButton>

            <ActionButton onClick={handleOpenTeamView} disabled={opps.length === 0}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="5.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="10.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M1 13c0-2.21 2.015-4 4.5-4s4.5 1.79 4.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M11 9.2c2.2.4 4 2.1 4 3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Team View
            </ActionButton>

            {/* Role info card */}
            <div style={{
              marginTop: 4, padding: '14px 16px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-mid)', borderRadius: 10,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                Your Access Level
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
                background: roleBadgeBg[role], color: roleBadgeColor[role],
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {role}
              </span>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 8 }}>
                {roleMap[role]}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-mid)',
      borderRadius: 12, padding: '18px 20px',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 26, color: 'var(--text-primary)', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function RecentRow({ name, byName, type, date, price, isMobile, onClick }: {
  name: string; byName: string | null; type: string | null;
  date: string; price: string; isMobile: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 9,
        background: hovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${hovered ? 'var(--border-mid)' : 'var(--border)'}`,
        marginBottom: 8, cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {name}
        {byName && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>
            by {byName}
          </span>
        )}
      </div>
      {type && !isMobile && (
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'var(--teal)',
          background: 'var(--teal-pale2)', border: '1px solid var(--teal-dim)',
          borderRadius: 4, padding: '1px 7px', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {type}
        </div>
      )}
      {date && !isMobile && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{date}</div>
      )}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0, whiteSpace: 'nowrap' }}>
        {price}
      </div>
      <button
        onClick={e => { e.stopPropagation(); onClick(); }}
        style={{
          padding: '4px 11px', border: '1px solid var(--border-mid)', borderRadius: 5,
          background: 'transparent', color: 'var(--text-secondary)',
          fontSize: 11, cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif',
          fontWeight: 500, flexShrink: 0,
        }}
      >
        Open
      </button>
    </div>
  );
}

function ActionButton({ onClick, disabled, children }: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '12px 16px',
        background: hovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
        border: '1px solid var(--border-mid)',
        borderRadius: 9,
        color: (hovered && !disabled) ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, fontWeight: 500,
        cursor: disabled ? 'default' : 'pointer', textAlign: 'left',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  );
}
