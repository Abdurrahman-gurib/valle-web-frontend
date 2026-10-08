import { useEffect, useState } from 'react';
import { getLiveOps, setLiveOps, type LiveOpsView } from '../../lib/staffApi';
import { Btn, Spinner, inputStyle, mono } from './ui';
import { Panel } from './reportUi';

/**
 * The desk's live board: wait at each activity start, where to meet, a note.
 * Guests read it on their ticket on the day ("Now / Next", meeting point).
 */
export default function LiveOpsPanel() {
  const [view, setView] = useState<LiveOpsView | null>(null);
  const [draft, setDraft] = useState<Record<string, { waitMin: string; meetingPoint: string; note: string }>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');
  const [err, setErr] = useState('');
  const load = (v: LiveOpsView) => { setView(v); setDraft(Object.fromEntries(Object.entries(v.activities).map(([id, a]) => [id, { waitMin: a.waitMin === null ? '' : String(a.waitMin), meetingPoint: a.meetingPoint, note: a.note }]))); };
  useEffect(() => { getLiveOps().then(load).catch(() => setErr('Could not load the live board.')); }, []);

  const save = async () => {
    setBusy(true); setErr(''); setSaved('');
    try {
      const activities = Object.fromEntries(Object.entries(draft).map(([id, d]) => [id, { waitMin: d.waitMin.trim() === '' ? null : Number(d.waitMin), meetingPoint: d.meetingPoint, note: d.note }]));
      load(await setLiveOps(activities));
      setSaved('Published · tickets update within a minute.');
    } catch (e) { setErr((e as Error).message || 'Could not save.'); } finally { setBusy(false); }
  };
  const clearWaits = () => setDraft((d) => Object.fromEntries(Object.entries(d).map(([id, x]) => [id, { ...x, waitMin: '' }])));

  return (
    <div data-testid="live-ops-panel" style={{ marginTop: 14 }}>
      <Panel title="LIVE BOARD · WAITS AND MEETING POINTS ON THE GUEST'S TICKET" action={view?.updatedAt ? <span style={{ ...mono, fontSize: 10, color: 'rgba(52,0,87,.55)' }}>last set {new Date(view.updatedAt).toLocaleString('en-GB', { timeZone: 'Indian/Mauritius' })}{view.updatedBy ? ' by ' + view.updatedBy : ''}</span> : undefined}>
        <div style={{ padding: 14, display: 'grid', gap: 10 }}>
          {err && <div role="alert" style={{ color: '#D91E44', fontSize: 13.5 }}>{err}</div>}
          {saved && <div role="status" data-testid="live-ops-saved" style={{ color: '#1E9E4A', fontSize: 13.5, fontWeight: 600 }}>{saved}</div>}
          {!view && !err && <Spinner />}
          {view && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) 90px minmax(200px, 2fr) minmax(160px, 1.5fr)', gap: 8, alignItems: 'center', ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: '#7333FF' }}>
                <span>ACTIVITY</span><span>WAIT MIN</span><span>MEETING POINT</span><span>NOTE FOR GUESTS</span>
              </div>
              {Object.entries(view.activities).map(([id, a]) => (
                <div key={id} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) 90px minmax(200px, 2fr) minmax(160px, 1.5fr)', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5 }}>{a.name}{a.paused && <span style={{ ...mono, fontSize: 9, background: '#FF3358', color: '#FFFFFF', padding: '2px 6px', borderRadius: 999, marginInlineStart: 6 }}>PAUSED</span>}</span>
                  <input inputMode="numeric" value={draft[id]?.waitMin ?? ''} placeholder="–" onChange={(e) => setDraft((d) => ({ ...d, [id]: { ...d[id], waitMin: e.target.value.replace(/\D/g, '').slice(0, 3) } }))} style={{ ...inputStyle, padding: '7px 10px' }} data-testid={`wait-${id}`} aria-label={`Wait at ${a.name} in minutes`} />
                  <input value={draft[id]?.meetingPoint ?? ''} maxLength={160} onChange={(e) => setDraft((d) => ({ ...d, [id]: { ...d[id], meetingPoint: e.target.value } }))} style={{ ...inputStyle, padding: '7px 10px' }} aria-label={`Meeting point for ${a.name}`} />
                  <input value={draft[id]?.note ?? ''} maxLength={160} placeholder="e.g. briefing every 20 min" onChange={(e) => setDraft((d) => ({ ...d, [id]: { ...d[id], note: e.target.value } }))} style={{ ...inputStyle, padding: '7px 10px' }} aria-label={`Note for ${a.name}`} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
                <Btn variant="dark" onClick={() => { void save(); }} disabled={busy}>{busy ? <Spinner color="#FFFFFF" /> : 'Publish live board'}</Btn>
                <Btn variant="ghost" onClick={clearWaits} disabled={busy}>Clear all waits</Btn>
                <span style={{ fontSize: 12.5, color: 'rgba(52,0,87,.6)' }}>Leave the wait blank when nobody is timing it; 0–5 reads as "no queue". Paused comes from the park status above.</span>
              </div>
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
