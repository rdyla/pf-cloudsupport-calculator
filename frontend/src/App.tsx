import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import LoginPage from './pages/LoginPage';
import AppShell from './pages/AppShell';

export default function App() {
  const isAuthenticated = useIsAuthenticated();
  const { inProgress } = useMsal();

  // MSAL is still initializing (handling redirect callback, etc.)
  if (inProgress !== InteractionStatus.None) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', color: 'var(--text-muted)',
      }}>
        Signing in…
      </div>
    );
  }

  return isAuthenticated ? <AppShell /> : <LoginPage />;
}
