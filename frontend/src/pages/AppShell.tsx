/**
 * AppShell — top-level layout after login.
 * Loads opportunities, renders sidebar + main content area.
 */
import { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useApiToken } from '../auth/useApiToken';
import { oppsApi, usersApi } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { useIsMobile } from '../hooks/useWindowWidth';
import Sidebar from '../components/Sidebar';
import OppWorkspace from '../components/OppWorkspace';
import DashboardView from '../components/DashboardView';

export default function AppShell() {
  const { instance, accounts } = useMsal();
  const { getToken } = useApiToken();
  const { setCurrentUser, setOpps, currentOppId } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    async function init() {
      try {
        const token = await getToken();
        const [user, opps] = await Promise.all([
          usersApi.me(token),
          oppsApi.list(token),
        ]);
        setCurrentUser({ email: user.email, name: user.name, role: user.role as any });
        setOpps(opps);
      } catch (e: any) {
        setError(e.message ?? 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [accounts[0]?.localAccountId]);

  function handleLogout() {
    instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--red)', flexDirection: 'column', gap: 12 }}>
        <div>{error}</div>
        <button onClick={handleLogout} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          Sign out and try again
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: isMobile ? 'auto' : '100vh', minHeight: isMobile ? '100dvh' : undefined, overflow: isMobile ? 'visible' : 'hidden' }}>
      {/* Backdrop for mobile sidebar */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            zIndex: 150,
          }}
        />
      )}
      <Sidebar
        onLogout={handleLogout}
        isOpen={isMobile ? sidebarOpen : true}
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
      />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: isMobile ? 'visible' : 'hidden', minWidth: 0 }}>
        {currentOppId
          ? <OppWorkspace onOpenSidebar={() => setSidebarOpen(true)} />
          : <DashboardView onOpenSidebar={() => setSidebarOpen(true)} />
        }
      </main>
    </div>
  );
}

