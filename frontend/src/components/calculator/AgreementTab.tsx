/**
 * AgreementTab — renders the support agreement preview and handles SharePoint upload.
 *
 * SharePoint flow:
 *  1. If the opp has a linked CRM account or opportunity, fetch its SharePoint
 *     document locations from Dynamics (the same folders visible in CRM's "Documents" tab).
 *  2. User picks a folder (or we default to the first one).
 *  3. Upload the agreement HTML as a file to that folder via Graph API.
 */
import { useState, useEffect, useRef } from 'react';
import { useApiToken } from '../../auth/useApiToken';
import { sharepointApi, oppsApi } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { calcSupport } from '../../lib/calcSupport';
import { buildProposalHtml, buildSignatureHtml, buildMsoHtml } from '../../lib/buildAgreementHtml';
import type { Opportunity, SPLocation } from '../../types';

interface Props { opp: Opportunity; }

type Mode = 'proposal' | 'signature' | 'mso';

export default function AgreementTab({ opp }: Props) {
  const { getToken }  = useApiToken();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mode, setMode] = useState<Mode>('proposal');

  // SharePoint state
  const [spLocations, setSpLocations]       = useState<SPLocation[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<SPLocation | null>(null);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [spError, setSpError]               = useState<string | null>(null);
  const [uploading, setUploading]           = useState(false);
  const [toast, setToast]                   = useState<string | null>(null);

  const latest = opp.versions[opp.versions.length - 1];

  // Load SharePoint locations — try opp ID first, fall back to account ID if empty
  const crmRecordId = opp.crmOppId ?? opp.crmAccountId;
  useEffect(() => {
    if (!crmRecordId) return;
    setLoadingLocations(true);

    async function loadLocations() {
      const token = await getToken();

      // Try the primary record (opp if linked, otherwise account)
      let locs = await sharepointApi.locations(token, crmRecordId!);

      // If the opp had no SP locations, fall back to the account
      if (locs.length === 0 && opp.crmOppId && opp.crmAccountId) {
        locs = await sharepointApi.locations(token, opp.crmAccountId);
      }

      setSpLocations(locs);
      if (locs.length > 0) setSelectedFolder(locs[0]);
    }

    loadLocations()
      .catch(err => { setSpError(err.message); showToast(`Could not load SP locations: ${err.message}`); })
      .finally(() => setLoadingLocations(false));
  }, [crmRecordId]);

  if (!latest) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        Save a version from the Calculator tab first to preview the agreement.
      </div>
    );
  }

  const d    = latest.data;
  const calc = calcSupport(d);
  const html = mode === 'signature'
    ? buildSignatureHtml(opp.name, d, calc, latest.versionNum)
    : mode === 'mso'
    ? buildMsoHtml(opp.name, d, calc, latest.versionNum)
    : buildProposalHtml(opp.name, d, calc, latest.versionNum);

  async function handleSaveToSharePoint() {
    if (!selectedFolder) {
      showToast('Select a SharePoint folder first — link this opp to a CRM account via the CRM Link tab.');
      return;
    }
    setUploading(true);
    try {
      const token    = await getToken();
      const filename = `${opp.name.replace(/[^a-z0-9]/gi, '_')}_v${latest.versionNum}_${mode}.html`;

      // Build a real File object from the HTML string
      const blob = new Blob([html], { type: 'text/html' });
      const file = new File([blob], filename, { type: 'text/html' });

      await sharepointApi.upload(token, selectedFolder.absoluteUrl, file, latest.id);

      // Refresh so HistoryTab picks up the new sharepointUrl
      const all = await oppsApi.list(token);
      useAppStore.getState().setOpps(all);

      showToast(`Saved to ${selectedFolder.name} in SharePoint`);
    } catch (e: any) {
      showToast(e.message);
    } finally {
      setUploading(false);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  }

  return (
    <div>
      {/* CRM Debug Panel */}
      <details style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-muted)' }}>
        <summary style={{ cursor: 'pointer', userSelect: 'none' }}>CRM / SharePoint debug</summary>
        <pre style={{
          marginTop: 8, padding: '10px 12px', background: 'var(--surface)',
          border: '1px solid var(--border-mid)', borderRadius: 6,
          fontSize: 11, lineHeight: 1.7, overflowX: 'auto',
          color: 'var(--text-secondary)',
        }}>{JSON.stringify({
          opp_id: opp.id,
          crmAccountId: opp.crmAccountId,
          crmOppId: opp.crmOppId,
          crmRecordId: crmRecordId,
          spLocationsCount: spLocations.length,
          spLocations: spLocations,
          spError,
          loadingLocations,
          selectedFolder,
        }, null, 2)}</pre>
      </details>

      {/* Mode selector + actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {(['proposal', 'signature', 'mso'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: '7px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
              border: `1px solid ${mode === m ? 'var(--teal)' : 'var(--border-mid)'}`,
              background: mode === m ? 'rgba(0,184,160,0.15)' : 'var(--surface)',
              color: mode === m ? 'var(--teal)' : 'var(--text-secondary)', fontWeight: 500,
            }}
          >
            {m === 'proposal' ? 'Proposal' : m === 'signature' ? 'Signature Page' : 'MSO Addendum'}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* SharePoint folder picker */}
        {crmRecordId && (
          loadingLocations ? (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading SP folders…</span>
          ) : spLocations.length > 0 ? (
            <select
              value={selectedFolder?.id ?? ''}
              onChange={e => setSelectedFolder(spLocations.find(l => l.id === e.target.value) ?? null)}
              style={{
                background: 'var(--surface-mid)', border: '1px solid var(--border-mid)',
                borderRadius: 6, color: 'var(--text-primary)', fontSize: 13,
                padding: '7px 10px', cursor: 'pointer',
              }}
            >
              {spLocations.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No SP folders found for this CRM record</span>
          )
        )}

        {!crmRecordId && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Link to CRM to enable SharePoint upload
          </span>
        )}

        <button onClick={() => iframeRef.current?.contentWindow?.print()} style={secondaryBtnStyle}>Print / PDF</button>

        <button
          onClick={handleSaveToSharePoint}
          disabled={uploading || !selectedFolder}
          style={{ ...primaryBtnStyle, opacity: !selectedFolder ? 0.5 : 1 }}
        >
          {uploading ? 'Uploading…' : 'Save to SharePoint'}
        </button>
      </div>

      {latest.sharepointUrl && (
        <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--teal)' }}>
          Last saved:{' '}
          <a href={latest.sharepointUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--teal)' }}>
            Open in SharePoint ↗
          </a>
        </div>
      )}

      {toast && (
        <div style={{
          marginBottom: 12, padding: '8px 12px', borderRadius: 6, fontSize: 13,
          background: 'rgba(63,184,122,0.12)', border: '1px solid rgba(63,184,122,0.3)',
          color: 'var(--green)',
        }}>
          {toast}
        </div>
      )}

      {/* Preview iframe */}
      <div style={{ border: '1px solid var(--border-mid)', borderRadius: 8, overflow: 'hidden', height: '70vh' }}>
        <iframe
          ref={iframeRef}
          srcDoc={html}
          style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
          title="Agreement Preview"
        />
      </div>
    </div>
  );
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 14px', background: 'var(--teal)', border: 'none', borderRadius: 6,
  color: 'var(--navy)', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const secondaryBtnStyle: React.CSSProperties = {
  padding: '8px 14px', background: 'var(--surface-mid)', border: '1px solid var(--border-mid)', borderRadius: 6,
  color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, cursor: 'pointer',
};
