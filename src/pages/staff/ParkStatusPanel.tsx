import { useEffect, useState } from 'react';
import { getParkStatus, setParkStatus, type StaffParkStatus } from '../../lib/staffApi';
import { useCatalog } from '../../store/CatalogContext';
import { cn } from '../../lib/utils';
import { Btn, Spinner } from './ui';
import { Panel } from './reportUi';

const LABEL = 'font-mono text-[10px] font-bold tracking-[.14em] text-valle-violet';
const INPUT = 'w-full border-[1.5px] border-valle-lilac bg-[#F7F3FF] rounded-[12px] px-[14px] py-[11px] [font-family:inherit] text-[14.5px] outline-none text-valle-purple';

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
    <button type="button" onClick={() => { setState(s); if (s === 'open') setPaused({}); }} data-testid={`park-state-${s}`} className={cn('border-[1.5px] text-valle-purple rounded-[999px] px-[16px] py-[9px] font-bold text-[13px] cursor-pointer [font-family:inherit]', state === s ? 'border-valle-purple' : 'border-valle-lilac')} style={{ background: state === s ? color : '#FFFFFF' }}>{label}</button>
  );

  return (
    <div data-testid="park-status-panel">
      <Panel title="PARK STATUS TODAY · WHAT GUESTS SEE ON THE SITE, THE TICKET AND TONIGHT'S REMINDER" action={status?.updatedAt ? <span className="font-mono text-[10px] text-[rgba(52,0,87,.7)]">last set {new Date(status.updatedAt).toLocaleString('en-GB', { timeZone: 'Indian/Mauritius' })}{status.updatedBy ? ' by ' + status.updatedBy : ''}</span> : undefined}>
        <div className="p-[14px] grid gap-[12px]">
          {err && <div role="alert" className="text-[#D91E44] text-[13.5px]">{err}</div>}
          {saved && <div role="status" data-testid="park-status-saved" className="text-[#1E9E4A] text-[13.5px] font-semibold">{saved}</div>}
          {!status && !err && <Spinner />}
          {status && (
            <>
              <div className="flex gap-[8px] flex-wrap">
                {stateBtn('open', 'Open', '#E2FFEB')}{stateBtn('partial', 'Partly open · some activities paused', '#FFFFE2')}{stateBtn('closed', 'Closed today', '#FFE2E7')}
              </div>
              {state !== 'closed' && (
                <div>
                  <div className={LABEL}>PAUSED RIGHT NOW (WIND, RAIN, MAINTENANCE)</div>
                  <div className="flex gap-[6px] flex-wrap mt-[8px]">
                    {activities.map((a) => (
                      <label key={a.id} className={cn('inline-flex gap-[6px] items-center border-[1.5px] rounded-[999px] px-[12px] py-[6px] text-[13px] cursor-pointer', paused[a.id] ? 'border-valle-red bg-[#FFE2E7]' : 'border-valle-lilac bg-white')}>
                        <input type="checkbox" checked={!!paused[a.id]} onChange={(e) => { const pz = { ...paused, [a.id]: e.target.checked }; setPaused(pz); if (e.target.checked && state === 'open') setState('partial'); }} data-testid={`pause-${a.id}`} />{a.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <label className="grid gap-[5px]">
                <span className={LABEL}>LINE FOR GUESTS (OPTIONAL)</span>
                <input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={240} placeholder="e.g. Ziplines paused until the wind drops, back around 14:00." className={INPUT} data-testid="park-message" />
              </label>
              <div className="flex gap-[10px] items-center flex-wrap">
                <Btn variant="dark" onClick={() => { void save(); }} disabled={busy}>{busy ? <Spinner color="#FFFFFF" /> : 'Publish status'}</Btn>
                <Btn variant="ghost" onClick={() => { void save({ state: 'open', message: '', paused: {} }); }} disabled={busy}>Back to open, clear notice</Btn>
                <span className="text-[12.5px] text-[rgba(52,0,87,.6)]">Takes effect on the site within a minute. Weather postponements are still done per booking in the drawer.</span>
              </div>
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
