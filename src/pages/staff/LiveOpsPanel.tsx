import { useEffect, useState } from 'react';
import { getLiveOps, setLiveOps, type LiveOpsView } from '../../lib/staffApi';
import { Btn, Spinner } from './ui';
import { Panel } from './reportUi';

const INPUT = 'w-full border-[1.5px] border-valle-lilac bg-[#F7F3FF] rounded-[12px] px-[10px] py-[7px] [font-family:inherit] text-[14.5px] outline-none text-valle-purple';

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
    <div data-testid="live-ops-panel" className="mt-[14px]">
      <Panel title="LIVE BOARD · WAITS AND MEETING POINTS ON THE GUEST'S TICKET" action={view?.updatedAt ? <span className="font-mono text-[10px] text-[rgba(52,0,87,.7)]">last set {new Date(view.updatedAt).toLocaleString('en-GB', { timeZone: 'Indian/Mauritius' })}{view.updatedBy ? ' by ' + view.updatedBy : ''}</span> : undefined}>
        <div className="p-[14px] grid gap-[10px]">
          {err && <div role="alert" className="text-[#D91E44] text-[13.5px]">{err}</div>}
          {saved && <div role="status" data-testid="live-ops-saved" className="text-[#1E9E4A] text-[13.5px] font-semibold">{saved}</div>}
          {!view && !err && <Spinner />}
          {view && (
            <>
              <div className="grid grid-cols-[minmax(140px,1fr)_90px_minmax(200px,2fr)_minmax(160px,1.5fr)] gap-[8px] items-center font-mono text-[10px] font-bold tracking-[.12em] text-valle-violet">
                <span>ACTIVITY</span><span>WAIT MIN</span><span>MEETING POINT</span><span>NOTE FOR GUESTS</span>
              </div>
              {Object.entries(view.activities).map(([id, a]) => (
                <div key={id} className="grid grid-cols-[minmax(140px,1fr)_90px_minmax(200px,2fr)_minmax(160px,1.5fr)] gap-[8px] items-center">
                  <span className="font-bold text-[13.5px]">{a.name}{a.paused && <span className="font-mono text-[9px] bg-valle-red text-white px-[6px] py-[2px] rounded-[999px] ms-[6px]">PAUSED</span>}</span>
                  <input inputMode="numeric" value={draft[id]?.waitMin ?? ''} placeholder="–" onChange={(e) => setDraft((d) => ({ ...d, [id]: { ...d[id], waitMin: e.target.value.replace(/\D/g, '').slice(0, 3) } }))} className={INPUT} data-testid={`wait-${id}`} aria-label={`Wait at ${a.name} in minutes`} />
                  <input value={draft[id]?.meetingPoint ?? ''} maxLength={160} onChange={(e) => setDraft((d) => ({ ...d, [id]: { ...d[id], meetingPoint: e.target.value } }))} className={INPUT} aria-label={`Meeting point for ${a.name}`} />
                  <input value={draft[id]?.note ?? ''} maxLength={160} placeholder="e.g. briefing every 20 min" onChange={(e) => setDraft((d) => ({ ...d, [id]: { ...d[id], note: e.target.value } }))} className={INPUT} aria-label={`Note for ${a.name}`} />
                </div>
              ))}
              <div className="flex gap-[10px] items-center flex-wrap mt-[4px]">
                <Btn variant="dark" onClick={() => { void save(); }} disabled={busy}>{busy ? <Spinner color="#FFFFFF" /> : 'Publish live board'}</Btn>
                <Btn variant="ghost" onClick={clearWaits} disabled={busy}>Clear all waits</Btn>
                <span className="text-[12.5px] text-[rgba(52,0,87,.6)]">Leave the wait blank when nobody is timing it; 0–5 reads as "no queue". Paused comes from the park status above.</span>
              </div>
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
