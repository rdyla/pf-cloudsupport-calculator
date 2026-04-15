import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import UsersModal from './UsersModal';

interface Props {
  onLogout: () => void;
  onOpenSidebar: () => void;
  isMobile: boolean;
}

export default function TopNav({ onLogout, onOpenSidebar, isMobile }: Props) {
  const { currentUser, setCurrentOppId } = useAppStore();
  const [accountOpen, setAccountOpen] = useState(false);
  const [showUsers, setShowUsers]     = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    if (accountOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [accountOpen]);

  const initials = currentUser
    ? currentUser.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const roleBadge: Record<string, { color: string; bg: string }> = {
    admin:     { color: 'var(--gold)',           bg: 'rgba(232,184,75,0.15)' },
    superuser: { color: 'var(--teal)',           bg: 'rgba(0,184,160,0.12)' },
    user:      { color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.07)' },
  };
  const badge = roleBadge[currentUser?.role ?? 'user'];

  return (
    <>
      <header style={{
        height: 52, flexShrink: 0,
        background: 'var(--navy-mid)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 12, zIndex: 100,
      }}>
        {/* Left — hamburger (mobile) + home */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          {isMobile && (
            <button
              onClick={onOpenSidebar}
              aria-label="Open sidebar"
              style={iconBtnStyle}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <line x1="2" y1="4.5" x2="16" y2="4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                <line x1="2" y1="9"   x2="16" y2="9"   stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                <line x1="2" y1="13.5" x2="16" y2="13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          )}

          {/* Logo */}
          <img src="/packetfusionlogo_white.png" alt="Packet Fusion" style={{ height: 33, display: 'block' }} />

          {!isMobile && (
            <div style={{ width: 1, height: 20, background: 'var(--border-mid)', flexShrink: 0 }} />
          )}

          {/* Home button */}
          <button
            onClick={() => setCurrentOppId(null)}
            title="Go to dashboard"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: '1px solid var(--border-mid)',
              borderRadius: 6, cursor: 'pointer', padding: '5px 10px',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 6.5L8 2l6 4.5V14a1 1 0 01-1 1H3a1 1 0 01-1-1V6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M6 15v-5h4v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {!isMobile && <span style={{ fontSize: 12, fontWeight: 500 }}>Home</span>}
          </button>
        </div>

        {/* Right — admin + account chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* Manage Users — admin only */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setShowUsers(true)}
              title="Manage Users"
              style={{
                ...iconBtnStyle,
                gap: 6, padding: '5px 10px',
                fontSize: 12, fontWeight: 500,
                color: 'var(--text-secondary)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M1 13c0-2.76 2.24-4 5-4s5 1.24 5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <line x1="12" y1="7" x2="15" y2="7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <line x1="13.5" y1="5.5" x2="13.5" y2="8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              {!isMobile && 'Users'}
            </button>
          )}

          {/* Account chip */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setAccountOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: accountOpen ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-mid)',
                borderRadius: 20, padding: '4px 10px 4px 4px',
                cursor: 'pointer', color: 'var(--text-primary)',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--teal)', color: 'var(--navy)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.03em', flexShrink: 0,
              }}>
                {initials}
              </div>
              {!isMobile && (
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser?.name}
                </span>
              )}
              {/* Chevron */}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, color: 'var(--text-muted)', transform: accountOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {accountOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                width: 240, background: '#1a2d45',
                border: '1px solid var(--border-mid)', borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                overflow: 'hidden', zIndex: 300,
              }}>
                {/* Profile section */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: 'var(--teal)', color: 'var(--navy)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, flexShrink: 0,
                    }}>
                      {initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {currentUser?.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {currentUser?.email}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
                    background: badge.bg, color: badge.color,
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                  }}>
                    {currentUser?.role}
                  </span>
                </div>

                {/* Sign out */}
                <button
                  onClick={() => { setAccountOpen(false); onLogout(); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 16px', background: 'none', border: 'none',
                    color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
                    fontFamily: 'IBM Plex Sans, sans-serif', textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <path d="M6 3H3a1 1 0 00-1 1v8a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M10 5l3 3-3 3M13 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showUsers && <UsersModal onClose={() => setShowUsers(false)} />}
    </>
  );
}

const iconBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center',
  background: 'none', border: 'none',
  color: 'var(--text-muted)', cursor: 'pointer',
  borderRadius: 6, padding: '5px 6px',
};
