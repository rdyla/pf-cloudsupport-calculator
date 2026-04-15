import { useState, useEffect } from 'react';
import { useApiToken } from '../auth/useApiToken';
import { usersApi } from '../api/client';
import { useAppStore } from '../store/useAppStore';

interface UserRow {
  email: string;
  name: string;
  role: string;
  created_at: string;
}

interface Props {
  onClose: () => void;
}

const ROLES = ['user', 'superuser', 'admin'] as const;

export default function UsersModal({ onClose }: Props) {
  const { getToken } = useApiToken();
  const { currentUser } = useAppStore();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // email being updated
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const data = await usersApi.list(token);
        setUsers(data as UserRow[]);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleRoleChange(email: string, newRole: string) {
    setSaving(email);
    try {
      const token = await getToken();
      await usersApi.updateRole(token, email, newRole);
      setUsers(prev => prev.map(u => u.email === email ? { ...u, role: newRole } : u));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  }

  const roleBadgeColor: Record<string, string> = {
    admin:     'var(--gold)',
    superuser: 'var(--teal)',
    user:      'var(--text-muted)',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(600px, 95vw)', maxHeight: '80vh',
        background: 'var(--surface)', border: '1px solid var(--border-mid)',
        borderRadius: 12, zIndex: 201, display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)' }}>
            Manage Users
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 6px' }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '16px 24px', flex: 1 }}>
          {error && (
            <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, fontSize: 12, color: 'var(--red)', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>Loading…</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {(['Name', 'Email', 'Role'] as const).map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isMe = u.email === currentUser?.email;
                  return (
                    <tr key={u.email} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 8px', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {u.name}
                        {isMe && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>you</span>}
                      </td>
                      <td style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontSize: 12 }}>
                        {u.email}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        {isMe ? (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8, color: roleBadgeColor[u.role] ?? 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {u.role}
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            disabled={saving === u.email}
                            onChange={e => handleRoleChange(u.email, e.target.value)}
                            style={{
                              background: 'var(--surface-mid)', border: '1px solid var(--border-mid)',
                              borderRadius: 5, color: roleBadgeColor[u.role] ?? 'var(--text-primary)',
                              fontSize: 12, fontWeight: 600, padding: '4px 8px', cursor: 'pointer',
                              fontFamily: 'IBM Plex Sans, sans-serif',
                              opacity: saving === u.email ? 0.5 : 1,
                            }}
                          >
                            {ROLES.map(r => (
                              <option key={r} value={r} style={{ color: '#0f172a', background: '#ffffff' }}>
                                {r}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
