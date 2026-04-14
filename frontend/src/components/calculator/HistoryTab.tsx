import { fmt } from '../../lib/calcSupport';
import type { Opportunity } from '../../types';

interface Props { opp: Opportunity; }

export default function HistoryTab({ opp }: Props) {

  const versions = [...opp.versions].reverse(); // newest first

  if (versions.length === 0) {
    return <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No saved versions yet.</div>;
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 16 }}>
        Version History ({versions.length})
      </div>
      {versions.map(v => (
        <div key={v.id} style={{
          background: 'var(--surface)', border: '1px solid var(--border-mid)', borderRadius: 10,
          padding: '16px 20px', marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                Version {v.versionNum}{v.label ? ` — ${v.label}` : ''}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {new Date(v.savedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                {' · '}{v.createdBy}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gold)', fontFamily: 'IBM Plex Mono, monospace' }}>
                {fmt(v.calc.annual)}/yr
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                TCV {fmt(v.calc.tcv)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <Chip label={v.data.oppType} />
            <Chip label={`${v.data.term}yr`} />
            {v.data.msoEnabled && <Chip label="MSO" color="gold" />}
            {(v.calc.ucaasOverridden || v.calc.ccaasOverridden || v.calc.implOverridden) && (
              <Chip label="Overrides" color="gold" />
            )}
            {v.sharepointUrl && (
              <a href={v.sharepointUrl} target="_blank" rel="noreferrer"
                style={{ fontSize: 11, color: 'var(--teal)', textDecoration: 'none', padding: '2px 6px', border: '1px solid var(--teal-dim)', borderRadius: 4 }}>
                SharePoint ↗
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Chip({ label, color = 'default' }: { label: string; color?: 'default' | 'gold' }) {
  return (
    <span style={{
      fontSize: 11, padding: '2px 7px', borderRadius: 4,
      background: 'var(--surface-mid)',
      color: color === 'gold' ? 'var(--gold)' : 'var(--text-muted)',
      border: `1px solid ${color === 'gold' ? 'rgba(232,184,75,0.3)' : 'var(--border-mid)'}`,
    }}>
      {label}
    </span>
  );
}
