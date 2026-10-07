import { useEffect, useState } from 'react';
import { getParkStatus, setParkStatus, type StaffParkStatus } from '../../lib/staffApi';
import { useCatalog } from '../../store/CatalogContext';
import { Btn, Spinner, inputStyle, mono } from './ui';
import { Panel } from './reportUi';

/**
 * Today's park status, set by the desk: open, partly open (some activities
 * paused for wind, rain, maintenance) or closed, with a line for guests. The
 * site banner, the ticket, the activity pages and the evening reminder read it.
 */
export default function ParkStatusPanel() {
  const catalog = useCatalog();
  const [status, setStatus] = useState<StaffParkStatus | null>(null);
  const [state, setState] = useState<'open' | 'partial' | 'closed'>('open');
  const [message, setMessage] = useState('');
  const [paused, setPaused] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    getParkStatus().then((s) => { setStatus(s); setState(s.state); setMessage(s.message); setPaused(Object.fromEntries(s.pausedActivities.map((id) => [id, true]))); }).catch(() => setErr('Could not load the park status.'));
  }, []);

  const save = async (next?: Partial<{ state: 'open' | 'partial' | 'closed'; message: string; paused: Record<string, boolean> }>) => {
    setBusy(true); setErr(''); setSaved('');
    const st = next?.state ?? state, msg = next?.message ?? message, pz = next?.paused ?? paused;
    try {
      const s = await setParkStatus({ state: st, message: msg, pausedActivities: Object.entries(pz).filter(([, on]) => on).map(([id]) => id) });
      setStatus(s); setState(s.state); setMessage(s.message); setPaused(Object.fromEntries(s.pausedActivities.map((id) => [id, true])));
      setSaved(`Saved · guests now see "${s.state === 'open' ? 'open' : s.state === 'partial' ? 'partly open' : 'closed'}"${s.pausedNames.length ? ' · paused ' + s.pausedNames.join(', ') : ''}.`);
    } catch (e) { setErr((e as Error).message || 'Could not save.'); } finally { setBusy(false); }
  };
  const activities = catalog.ACTS.filter((a) => a.mode === 'pp' || a.mode === 'flat');
  const stateBtn = (s: 'open' | 'partial' | 'closed', label: string, color: string) => (
    <button type="button" onClick={() => { setState(s); if (s === 'open') setPaused({}); }} data-testid={`park-state-${s}`} style={{ border: '1.5px solid ' + (state === s ? '#340057' : '#EBE2FF'), background: state === s ? color : '#FFFFFF', color: '#340057', borderRadius: 999, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
  );

  return (
    <div data-testid="park-status-panel">
      <Panel title="PARK STATUS TODAY · WHAT GUESTS SEE ON THE SITE, THE TICKET AND TONIGHT'S REMINDER" action={status?.updatedAt ? <span style={{ ...mono, fontSize: 10, color: 'rgba(52,0,87,.55)' }}>last set {new Date(status.updatedAt).toLocaleString('en-GB', { timeZone: 'Indian/Mauritius' })}{status.updatedBy ? ' by ' + status.updatedBy : ''}</span> : undefined}>
        <div style={{ padding: 14, display: 'grid', gap: 12 }}>
          {err && <div role="alert" style={{ color: '#D91E44', fontSize: 13.5 }}>{err}</div>}
          {saved && <div role="status" data-testid="park-status-saved" style={{ color: '#1E9E4A', fontSize: 13.5, fontWeight: 600 }}>{saved}</div>}
          {!status && !err && <Spinner />}
          {status && (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {stateBtn('open', 'Open', '#E2FFEB')}{stateBtn('partial', 'Partly open · some activities paused', '#FFFFE2')}{stateBtn('closed', 'Closed today', '#FFE2E7')}
              </div>
              {state !== 'closed' && (
                <div>
                  <div style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color: '#7333FF' }}>PAUSED RIGHT NOW (WIND, RAIN, MAINTENANCE)</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    {activities.map((a) => (
                      <label key={a.id} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', border: '1.5px solid ' + (paused[a.id] ? '#FF3358' : '#EBE2FF'), background: paused[a.id] ? '#FFE2E7' : '#FFFFFF', borderRadius: 999, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}>
                        <input type="checkbox" checked={!!paused[a.id]} onChange={(e) => { const pz = { ...paused, [a.id]: e.target.checked }; setPaused(pz); if (e.target.checked && state === 'open') setState('partial'); }} data-testid={`pause-${a.id}`} />{a.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color: '#7333FF' }}>LINE FOR GUESTS (OPTIONAL)</span>
                <input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={240} placeholder="e.g. Ziplines paused until the wind drops, back around 14:00." style={inputStyle} data-testid="park-message" />
              </label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <Btn variant="dark" onClick={() => { void save(); }} disabled={busy}>{busy ? <Spinner color="#FFFFFF" /> : 'Publish status'}</Btn>
                <Btn variant="ghost" onClick={() => { void save({ state: 'open', message: '', paused: {} }); }} disabled={busy}>Back to open, clear notice</Btn>
                <span style={{ fontSize: 12.5, color: 'rgba(52,0,87,.6)' }}>Takes effect on the site within a minute. Weather postponements are still done per booking in the drawer.</span>
              </div>
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
