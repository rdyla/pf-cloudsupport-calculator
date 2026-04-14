import { useMsal } from '@azure/msal-react';
import { apiScopes } from '../auth/msalConfig';

export default function LoginPage() {
  const { instance } = useMsal();

  function handleLogin() {
    instance.loginRedirect({ scopes: apiScopes });
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--navy)', flexDirection: 'column', gap: 24,
    }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, color: 'var(--teal)' }}>
          PacketFusion
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>
          CloudSupport Calculator
        </div>
      </div>

      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border-mid)',
        borderRadius: 12, padding: '32px 40px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 20, minWidth: 320,
      }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center' }}>
          Sign in with your PacketFusion Microsoft account to continue.
        </p>
        <button
          onClick={handleLogin}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 20px', borderRadius: 6, border: '1px solid var(--border-mid)',
            background: 'var(--surface-mid)', color: 'var(--text-primary)',
            fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 14, fontWeight: 500,
            cursor: 'pointer', width: '100%', justifyContent: 'center',
          }}
        >
          {/* Microsoft logo SVG */}
          <svg width="18" height="18" viewBox="0 0 21 21">
            <rect x="1"  y="1"  width="9" height="9" fill="#f25022"/>
            <rect x="11" y="1"  width="9" height="9" fill="#7fba00"/>
            <rect x="1"  y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
          Sign in with Microsoft
        </button>
      </div>
    </div>
  );
}
