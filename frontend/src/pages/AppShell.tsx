/**
 * AppShell — top-level layout after login.
 * Loads opportunities, renders sidebar + main content area.
 */
import { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useApiToken } from '../auth/useApiToken';
import { oppsApi, usersApi } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import Sidebar from '../components/Sidebar';
import OppWorkspace from '../components/OppWorkspace';

export default function AppShell() {
  const { instance, accounts } = useMsal();
  const { getToken } = useApiToken();
  const { setCurrentUser, setOpps, currentOppId } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar onLogout={handleLogout} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {currentOppId
          ? <OppWorkspace />
          : <NoOppState />
        }
      </main>
    </div>
  );
}

function NoOppState() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)',
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
      <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
        No opportunity selected
      </div>
      <div style={{ fontSize: 13 }}>
        Select an opportunity from the sidebar or create a new one.
      </div>
    </div>
  );
}
