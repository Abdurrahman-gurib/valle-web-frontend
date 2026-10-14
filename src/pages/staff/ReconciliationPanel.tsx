import { useCallback, useEffect, useState } from 'react';
import type { BookingStatus } from '../../types';
import { mur, partyLabel } from '../../lib/format';
import { exportUrl, getReconciliation, updateBooking, type Reconciliation } from '../../lib/staffApi';
import { cn } from '../../lib/utils';
import { Btn, Spinner, StatusChip } from './ui';
import { ExportLink, Kpi, PAY_LABEL, Panel, SLOT_LABEL, addDays, todayIsoPark } from './reportUi';

const CARD = 'bg-white border-[1.5px] border-valle-lilac rounded-[18px]';
const DATE_INPUT = 'w-auto border-[1.5px] border-valle-lilac bg-[#F7F3FF] rounded-[12px] px-[14px] py-[11px] [font-family:inherit] text-[14.5px] outline-none text-valle-purple';
const TH = 'font-mono text-[9.5px] font-bold tracking-[.13em] uppercase text-valle-violet text-left px-[12px] py-[10px] whitespace-nowrap';
const TD = 'px-[12px] py-[10px] text-[13.5px] border-t border-valle-lilac whitespace-nowrap';
const TDNUM = cn(TD, 'font-mono text-right text-[12.5px]');

/**
 * End-of-day cash position for one visit date: what should come in at the
 * gate, what has (arrived), what is still expected, what was paid online,
 * cancellations and no-shows. Statuses can be corrected from here.
 */
export default function ReconciliationPanel({ onChanged }: { onChanged: (force?: boolean) => void }) {
  const [date, setDate] = useState(todayIsoPark());
  const [data, setData] = useState<Reconciliation | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    let dead = false;
    setLoading(true);
    getReconciliation(date)
      .then((d) => { if (!dead) { setData(d); setErr(''); } })
      .catch(() => { if (!dead) setErr('Could not load this day.'); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [date]);
  useEffect(load, [load]);

  const setStatus = async (refCode: string, status: BookingStatus) => {
    setBusy(refCode);
    try {
      await updateBooking(refCode, { status });
      load();
      onChanged(true);
    } catch {
      setErr(`Could not update ${refCode}.`);
    } finally {
      setBusy(null);
    }
  };

  const t = data?.totals;
  const past = date < todayIsoPark();

  return (
    <div data-testid="reconciliation-panel">
      <div data-print-hide="" className={cn(CARD, 'p-[12px] mb-[14px] flex flex-wrap gap-[8px] items-center')}>
        <Btn variant="ghost" onClick={() => setDate(addDays(date, -1))}>‹</Btn>
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Reconciliation date" className={DATE_INPUT} />
        <Btn variant="ghost" onClick={() => setDate(addDays(date, 1))}>›</Btn>
        <Btn variant="ghost" onClick={() => setDate(todayIsoPark())}>Today</Btn>
        <div className="ml-auto flex gap-[8px] flex-wrap">
          <Btn variant="ghost" onClick={() => window.print()}>Print arrivals sheet</Btn>
          <ExportLink href={exportUrl('bookings', date, date)} label="Day's bookings CSV" />
        </div>
      </div>

      {err && <div className={cn(CARD, 'p-[14px] mb-[14px] text-[#D91E44] font-semibold')}>{err}</div>}
      {loading && !data && <div className="p-[30px] flex justify-center"><Spinner color="#7333FF" /></div>}

      {t && (
        <>
          <div className={cn('grid gap-[12px] mb-[14px] grid-cols-[repeat(auto-fit,minmax(150px,1fr))]', loading ? 'opacity-[.6]' : 'opacity-100')}>
            <Kpi tag="EXPECTED AT GATE" value={mur(t.gateExpected)} sub="pay-on-arrival bookings" accent="#7333FF" />
            <Kpi tag="COLLECTED AT GATE" value={mur(t.gateCollected)} sub="marked arrived" accent="#33FF74" />
            <Kpi tag="STILL TO COLLECT" value={mur(t.gateOutstanding)} sub={past ? 'no-shows if never arrived' : 'not yet arrived'} accent="#FFFC33" />
            <Kpi tag="PAID ONLINE" value={mur(t.onlinePaid)} sub="already settled" />
            <Kpi tag="GUESTS" value={`${t.guestsArrived} / ${t.guestsExpected}`} sub="arrived / expected" />
            <Kpi tag="CANCELLED" value={String(t.cancelled)} sub={mur(t.cancelledAmount) + ' not collected'} />
            {past && <Kpi tag="NO-SHOWS" value={String(t.noShows)} sub={mur(t.noShowAmount) + ' lost'} accent="#FF3358" />}
          </div>

          <Panel title={`BOOKINGS FOR ${date}`}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[820px]">
                <thead><tr className="bg-[#F7F3FF]">
                  <th className={TH}>Ref</th><th className={TH}>Slot</th><th className={TH}>Guest</th><th className={TH}>Party</th><th className={TH}>Nationality</th><th className={TH}>Payment</th><th className={cn(TH, 'text-right')}>Total</th><th className={TH}>Status</th><th className={TH}></th>
                </tr></thead>
                <tbody>
                  {data!.rows.map((r) => (
                    <tr key={r.refCode} className={r.status === 'cancelled' ? 'opacity-[.55]' : 'opacity-100'}>
                      <td className={cn(TD, 'font-mono font-bold text-[12.5px]')}>{r.refCode}</td>
                      <td className={TD}>{SLOT_LABEL[r.slot] ?? r.slot}</td>
                      <td className={cn(TD, 'font-semibold')}>{r.guestName}<div className="font-mono text-[10px] text-[rgba(52,0,87,.7)]">{r.phone || r.email}</div></td>
                      <td className={TD}>{partyLabel(r.adults, r.kids)}</td>
                      <td className={TD}>{r.nationality || '—'}</td>
                      <td className={TD}>{PAY_LABEL[r.payMode] ?? r.payMode}</td>
                      <td className={TDNUM}>{mur(r.total)}</td>
                      <td className={TD}><StatusChip status={r.status} /></td>
                      <td className={cn(TD, 'text-right')}>
                        <div className="inline-flex gap-[6px]">
                          {r.status !== 'arrived' && r.status !== 'cancelled' && <Btn onClick={() => { void setStatus(r.refCode, 'arrived'); }} disabled={busy === r.refCode}>Arrived</Btn>}
                          {r.status === 'confirmed' && <Btn variant="ghost" onClick={() => { void setStatus(r.refCode, 'cancelled'); }} disabled={busy === r.refCode}>Cancel</Btn>}
                          {r.status !== 'confirmed' && <Btn variant="ghost" onClick={() => { void setStatus(r.refCode, 'confirmed'); }} disabled={busy === r.refCode}>Undo</Btn>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data!.rows.length === 0 && <tr><td className={cn(TD, 'text-[rgba(52,0,87,.5)]')} colSpan={9}>No bookings for this day.</td></tr>}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
