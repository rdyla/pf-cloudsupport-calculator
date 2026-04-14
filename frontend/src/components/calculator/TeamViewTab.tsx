import { useAppStore } from '../../store/useAppStore';
import { fmt } from '../../lib/calcSupport';

export default function TeamViewTab() {
  const { opps, setCurrentOppId, currentUser } = useAppStore();

  // Group by creator
  const groups: Record<string, { name: string; email: string; opps: typeof opps }> = {};
  opps.forEach(opp => {
    const key = opp.createdBy;
    if (!groups[key]) groups[key] = { name: opp.creatorName ?? opp.createdBy, email: opp.createdBy, opps: [] };
    groups[key].opps.push(opp);
  });

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 16 }}>
        Team View — All Opportunities
      </div>
      {Object.values(groups).map(g => {
        const totalAnnual = g.opps.reduce((sum, o) => {
          const latest = o.versions[o.versions.length - 1];
          return sum + (latest?.calc.annual ?? 0);
        }, 0);
        const isMe = g.email === currentUser?.email;
        const initials = g.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

        return (
          <div key={g.email} style={{ marginBottom: 20 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--surface)', border: '1px solid var(--border-mid)',
              borderRadius: 8, padding: '12px 16px',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: isMe ? 'rgba(0,184,160,0.2)' : 'var(--surface-mid)',
                color: isMe ? 'var(--teal)' : 'var(--text-secondary)',
                fontWeight: 700, fontSize: 13, flexShrink: 0,
              }}>
                {initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {g.name} {isMe && <span style={{ fontSize: 11, color: 'var(--teal)' }}>(you)</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{g.email}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gold)', fontFamily: 'IBM Plex Mono, monospace' }}>
                  {fmt(totalAnnual)}/yr
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{g.opps.length} opp{g.opps.length !== 1 ? 's' : ''}</div>
              </div>
            </div>

            {g.opps.map(opp => {
              const latest = opp.versions[opp.versions.length - 1];
              return (
                <div
                  key={opp.id}
                  onClick={() => setCurrentOppId(opp.id)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '9px 16px 9px 64px', cursor: 'pointer',
                    borderLeft: '1px solid var(--border)',
                    borderRight: '1px solid var(--border)',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--navy-mid)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{opp.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                      {latest?.data.oppType ?? 'Draft'} · v{opp.versions.length}
                      {opp.crmAccountId ? ' · CRM Linked' : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: latest ? 'var(--text-secondary)' : 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {latest ? fmt(latest.calc.annual) + '/yr' : 'Draft'}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
