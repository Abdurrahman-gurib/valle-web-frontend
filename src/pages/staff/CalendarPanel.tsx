import { useEffect, useState } from 'react';
import { getCalendar, saveCalendar, type CalendarClosure, type CalendarView } from '../../lib/staffApi';
import { cn } from '../../lib/utils';
import { Btn, Spinner } from './ui';
import { Panel, todayIsoPark } from './reportUi';

/**
 * Calendar & capacity (managers): what one arrival slot can take, park wide
 * and per experience, and the days or slots the park is closed, under
 * maintenance or reserved for a private event. The website's date picker
 * shows it and every booking (website or desk) is checked against it.
 */

const KIND_LABEL: Record<CalendarClosure['kind'], string> = { closed: 'Closed', maintenance: 'Maintenance', private: 'Private event' };
const SLOT_LABEL: Record<CalendarClosure['slot'], string> = { all: 'Whole day', morning: 'Morning only', afternoon: 'Afternoon only' };
const LABEL = 'font-mono text-[10px] font-bold tracking-[.14em] text-valle-violet';
const INPUT_CORE = 'border-[1.5px] border-valle-lilac bg-[#F7F3FF] rounded-[12px] [font-family:inherit] text-[14.5px] outline-none text-valle-purple';
const INPUT = INPUT_CORE + ' w-full px-[14px] py-[11px]';
const SEL = INPUT_CORE + ' w-full px-[12px] py-[9px]';
const SMALL = INPUT_CORE + ' px-[10px] py-[7px]';
const TH = 'font-mono text-[9.5px] font-bold tracking-[.13em] uppercase text-valle-violet text-left px-[12px] py-[10px] whitespace-nowrap';
const TD = 'px-[12px] py-[10px] text-[13.5px] border-t border-valle-lilac whitespace-nowrap';

export default function CalendarPanel() {
  const [data, setData] = useState<CalendarView | null>(null);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);
  const [slotCapacity, setSlotCapacity] = useState('');
  const [closures, setClosures] = useState<CalendarClosure[]>([]);
  const [capacity, setCapacity] = useState<Record<string, { morning: string; afternoon: string }>>({});
  const [sessions, setSessions] = useState<Record<string, { times: string; capacity: string; durationMin: string }>>({});
  const [draft, setDraft] = useState<CalendarClosure>({ from: todayIsoPark(), to: todayIsoPark(), slot: 'all', kind: 'closed', reason: '' });

  const load = () => getCalendar().then((d) => {
    setData(d);
    setSlotCapacity(String(d.slotCapacity));
    setClosures(d.closures);
    const cap: Record<string, { morning: string; afternoon: string }> = {};
    for (const e of d.experiences) {
      const c = d.activityCapacity[e.id];
      cap[e.id] = { morning: c?.morning == null ? '' : String(c.morning), afternoon: c?.afternoon == null ? '' : String(c.afternoon) };
    }
    setCapacity(cap);
    const ses: Record<string, { times: string; capacity: string; durationMin: string }> = {};
    for (const e of d.experiences) {
      const p = d.sessions?.[e.id];
      ses[e.id] = { times: p ? p.times.join(', ') : '', capacity: p && p.capacity != null ? String(p.capacity) : '', durationMin: p ? String(p.durationMin) : '' };
    }
    setSessions(ses);
  });
  useEffect(() => { load().catch(() => setErr('Could not load the calendar.')); }, []);

  const addClosure = () => {
    if (!draft.from) return;
    const to = draft.to && draft.to >= draft.from ? draft.to : draft.from;
    setClosures((list) => [...list, { ...draft, to, reason: draft.reason.trim() }].sort((a, b) => a.from.localeCompare(b.from)));
    setDraft({ ...draft, reason: '' });
  };
  const save = async () => {
    setBusy(true); setErr(''); setSaved('');
    try {
      const activityCapacity: Record<string, { morning: number | null; afternoon: number | null }> = {};
      for (const [id, v] of Object.entries(capacity)) {
        const n = (s: string) => (s.trim() === '' ? null : Math.max(0, Math.floor(Number(s))));
        const m = n(v.morning), a = n(v.afternoon);
        if ((m !== null && !Number.isNaN(m)) || (a !== null && !Number.isNaN(a))) activityCapacity[id] = { morning: Number.isNaN(m) ? null : m, afternoon: Number.isNaN(a) ? null : a };
      }
      const sessionPlans: Record<string, { times: string[]; capacity: number | null; durationMin: number }> = {};
      for (const [id, v] of Object.entries(sessions)) {
        const times = v.times.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean).map((x) => (/^\d:\d{2}$/.test(x) ? '0' + x : x));
        const bad = times.find((x) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(x));
        if (bad) throw new Error(`"${bad}" is not a time (use HH:MM, e.g. 09:30).`);
        if (times.length === 0) continue;
        const c = v.capacity.trim() === '' ? null : Math.max(0, Math.floor(Number(v.capacity)));
        const dm = Math.floor(Number(v.durationMin));
        sessionPlans[id] = { times: [...new Set(times)].sort(), capacity: c === null || Number.isNaN(c) ? null : c, durationMin: dm > 0 ? dm : 60 };
      }
      const cap = Math.floor(Number(slotCapacity));
      const d = await saveCalendar({ slotCapacity: cap > 0 ? cap : undefined, closures, activityCapacity, sessions: sessionPlans });
      setData(d);
      setSaved('Saved. New bookings are checked against this from now on.');
    } catch (e) { setErr((e as Error).message || 'Could not save.'); } finally { setBusy(false); }
  };

  const today = todayIsoPark();
  return (
    <div data-testid="calendar-panel">
      <Panel title="CALENDAR & CAPACITY · WHAT EACH ARRIVAL SLOT CAN TAKE, AND WHEN THE PARK IS CLOSED" action={<Btn variant="dark" onClick={() => { void save(); }} disabled={busy || !data}>{busy ? <Spinner color="#FFFFFF" /> : 'Save calendar'}</Btn>}>
        <div className="p-[14px] grid gap-[18px]">
          {err && <div role="alert" className="text-[#D91E44] text-[13.5px]">{err}</div>}
          {saved && <div role="status" data-testid="calendar-saved" className="text-[#1E9E4A] text-[13.5px] font-semibold">{saved}</div>}
          {!data && !err && <Spinner />}
          {data && (
            <>
              <section>
                <div className={LABEL}>GUESTS PER ARRIVAL SLOT · PARK WIDE</div>
                <div className="flex gap-[10px] items-center mt-[8px] flex-wrap">
                  <input value={slotCapacity} onChange={(e) => setSlotCapacity(e.target.value)} inputMode="numeric" aria-label="Guests per arrival slot" data-testid="slot-capacity" className={INPUT_CORE + ' w-[110px] px-[14px] py-[11px]'} />
                  <span className="text-[13px] text-[rgba(52,0,87,.65)]">
                    guests in the morning and again in the afternoon. The website shows quiet / busy / very busy / fully booked from this number and refuses a booking that would pass it.
                    {data.slotCapacitySource === 'default' && ' Not set yet: the server default applies.'}
                  </span>
                </div>
              </section>

              <section>
                <div className={LABEL}>PER EXPERIENCE · LEAVE EMPTY FOR NO LIMIT</div>
                <div className="text-[13px] text-[rgba(52,0,87,.65)] mt-[4px]">Guests per slot for activities priced per person (a zipline's throughput); vehicles per slot for buggies and the like, priced per unit.</div>
                <div className="overflow-x-auto mt-[8px]">
                  <table className="border-collapse min-w-[520px]" data-testid="activity-capacity">
                    <thead><tr><th className={TH}>Experience</th><th className={TH}>Counts</th><th className={TH}>Morning</th><th className={TH}>Afternoon</th></tr></thead>
                    <tbody>
                      {data.experiences.map((e) => (
                        <tr key={e.id}>
                          <td className={TD}>{e.name}</td>
                          <td className={cn(TD, 'text-[rgba(52,0,87,.6)]')}>{e.priceMode === 'flat' ? 'vehicles / units' : 'guests'}</td>
                          {(['morning', 'afternoon'] as const).map((slot) => (
                            <td key={slot} className={TD}>
                              <input
                                value={capacity[e.id]?.[slot] ?? ''}
                                onChange={(ev) => setCapacity((c) => ({ ...c, [e.id]: { ...(c[e.id] ?? { morning: '', afternoon: '' }), [slot]: ev.target.value } }))}
                                inputMode="numeric" placeholder="no limit" aria-label={`${e.name} ${slot} capacity`} data-testid={`cap-${e.id}-${slot}`}
                                className={SMALL + ' w-[96px]'}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <div className={LABEL}>TIMED SESSIONS · START TIMES PER DAY</div>
                <div className="text-[13px] text-[rgba(52,0,87,.65)] mt-[4px]">An experience with start times runs in sessions: the guest picks a time when booking, each session has its own capacity, and the ticket shows the day's itinerary. Afternoon arrivals can only take sessions from 12:00. Leave empty for a free-flow experience.</div>
                <div className="overflow-x-auto mt-[8px]">
                  <table className="border-collapse min-w-[640px]" data-testid="activity-sessions">
                    <thead><tr><th className={TH}>Experience</th><th className={TH}>Start times (HH:MM, comma separated)</th><th className={TH}>Per session</th><th className={TH}>Minutes</th></tr></thead>
                    <tbody>
                      {data.experiences.map((e) => (
                        <tr key={e.id}>
                          <td className={TD}>{e.name}</td>
                          <td className={TD}><input value={sessions[e.id]?.times ?? ''} onChange={(ev) => setSessions((s) => ({ ...s, [e.id]: { ...(s[e.id] ?? { times: '', capacity: '', durationMin: '' }), times: ev.target.value } }))} placeholder="e.g. 09:30, 10:30, 14:00" aria-label={`${e.name} session times`} data-testid={`ses-${e.id}-times`} className={SMALL + ' w-[260px]'} /></td>
                          <td className={TD}><input value={sessions[e.id]?.capacity ?? ''} onChange={(ev) => setSessions((s) => ({ ...s, [e.id]: { ...(s[e.id] ?? { times: '', capacity: '', durationMin: '' }), capacity: ev.target.value } }))} inputMode="numeric" placeholder="no limit" aria-label={`${e.name} per session`} data-testid={`ses-${e.id}-cap`} className={SMALL + ' w-[90px]'} /></td>
                          <td className={TD}><input value={sessions[e.id]?.durationMin ?? ''} onChange={(ev) => setSessions((s) => ({ ...s, [e.id]: { ...(s[e.id] ?? { times: '', capacity: '', durationMin: '' }), durationMin: ev.target.value } }))} inputMode="numeric" placeholder="60" aria-label={`${e.name} minutes`} className={SMALL + ' w-[70px]'} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <div className={LABEL}>CLOSED DAYS · MAINTENANCE · PRIVATE EVENTS</div>
                <div className="flex gap-[8px] items-center mt-[8px] flex-wrap" data-testid="closure-form">
                  <input type="date" value={draft.from} min={today} onChange={(e) => setDraft({ ...draft, from: e.target.value, to: draft.to < e.target.value ? e.target.value : draft.to })} aria-label="From" data-testid="closure-from" className={SEL} />
                  <span className="text-[13px]">to</span>
                  <input type="date" value={draft.to} min={draft.from} onChange={(e) => setDraft({ ...draft, to: e.target.value })} aria-label="To" data-testid="closure-to" className={SEL} />
                  <select value={draft.slot} onChange={(e) => setDraft({ ...draft, slot: e.target.value as CalendarClosure['slot'] })} aria-label="Slot" data-testid="closure-slot" className={SEL}>
                    {(Object.keys(SLOT_LABEL) as CalendarClosure['slot'][]).map((k) => <option key={k} value={k}>{SLOT_LABEL[k]}</option>)}
                  </select>
                  <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as CalendarClosure['kind'] })} aria-label="Kind" data-testid="closure-kind" className={SEL}>
                    {(Object.keys(KIND_LABEL) as CalendarClosure['kind'][]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                  </select>
                  <input value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} placeholder="Reason shown to guests (optional)" aria-label="Reason" data-testid="closure-reason" className={INPUT + ' flex-[1_1_200px]'} />
                  <Btn variant="ghost" onClick={addClosure}>Add closure</Btn>
                </div>
                {closures.length === 0 && <div className="text-[13px] text-[rgba(52,0,87,.6)] mt-[10px]">No closures. The park is open every day.</div>}
                {closures.length > 0 && (
                  <div className="overflow-x-auto mt-[8px]">
                    <table className="border-collapse min-w-[560px]" data-testid="closure-list">
                      <thead><tr><th className={TH}>From</th><th className={TH}>To</th><th className={TH}>Slot</th><th className={TH}>Kind</th><th className={TH}>Reason</th><th className={TH}></th></tr></thead>
                      <tbody>
                        {closures.map((c, i) => (
                          <tr key={i} className={c.to < today ? 'opacity-[.5]' : 'opacity-100'}>
                            <td className={cn(TD, 'font-mono text-[12.5px]')}>{c.from}</td>
                            <td className={cn(TD, 'font-mono text-[12.5px]')}>{c.to}</td>
                            <td className={TD}>{SLOT_LABEL[c.slot]}</td>
                            <td className={TD}>{KIND_LABEL[c.kind]}</td>
                            <td className={TD}>{c.reason || <span className="text-[rgba(52,0,87,.45)]">—</span>}</td>
                            <td className={TD}><Btn variant="ghost" onClick={() => setClosures((list) => list.filter((_, j) => j !== i))}>Remove</Btn></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
