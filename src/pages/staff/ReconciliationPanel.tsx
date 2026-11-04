import { Fragment, useCallback, useEffect, useState } from 'react';
import type { BookingStatus } from '../../types';
import { mur } from '../../lib/format';
import { exportUrl, getReconciliation, isHttpError, updateBooking, type LedgerMethod, type Reconciliation } from '../../lib/staffApi';
import { errorMessage } from '../../lib/errors';
import { cn } from '../../lib/utils';
import { Btn, Spinner, StatusChip, clockTimeSec } from './ui';
import { ExportLink, Kpi, METHOD_LABEL, PAY_LABEL, Panel, SLOT_LABEL, addDays, todayIsoPark } from './reportUi';
import { partyText } from './bookings/partyLines';

const CARD = 'bg-white border-[1.5px] border-valle-lilac rounded-[18px]';
const DATE_INPUT = 'w-auto border-[1.5px] border-valle-lilac bg-[#F7F3FF] rounded-[12px] px-[14px] py-[11px] [font-family:inherit] text-[14.5px] outline-none text-valle-purple';
const INPUT = 'border-[1.5px] border-valle-lilac bg-white rounded-[12px] px-[12px] py-[9px] [font-family:inherit] text-[14px] outline-none text-valle-purple';
const TH = 'font-mono text-[9.5px] font-bold tracking-[.13em] uppercase text-valle-violet text-left px-[12px] py-[10px] whitespace-nowrap';
const TD = 'px-[12px] py-[10px] text-[13.5px] border-t border-valle-lilac whitespace-nowrap';
const TDNUM = cn(TD, 'font-mono text-right text-[12.5px]');

/** The till's columns, in the order the cashier counts them. */
const METHODS: LedgerMethod[] = ['cash', 'card', 'juice', 'transfer', 'online', 'other'];

/** A row action waiting for the operator: a cancellation (reason) or an arrival the waiver rule stopped. */
type Pending =
  | { ref: string; kind: 'cancel' }
  | { ref: string; kind: 'arrive'; message: string };

/**
 * End-of-day cash position for one date. "Money recorded" is what was actually
 * taken that day, per method, from the payments written to each booking's
 * trail (a booking paid part cash, part card shows both), so the till can be
 * balanced against it. The rest is the day sheet of visits: expected at the
 * gate, still to collect, online, cancellations and no-shows. Statuses can be
 * corrected here: "Arrived" follows the gate's waiver rule, "Cancel" asks for
 * a reason.
 */
export default function ReconciliationPanel({ onChanged }: { onChanged: (force?: boolean) => void }) {
  const [date, setDate] = useState(todayIsoPark());
  const [data, setData] = useState<Reconciliation | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const [reason, setReason] = useState('');

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

  const setStatus = async (refCode: string, status: BookingStatus, extra?: { override?: boolean; reason?: string }) => {
    setBusy(refCode);
    setErr('');
    try {
      await updateBooking(refCode, { status, ...extra });
      setPending(null);
      setReason('');
      load();
      onChanged(true);
    } catch (e) {
      if (isHttpError(e) && e.status === 409 && e.body?.code === 'WAIVERS_MISSING') {
        // the gate's rule: missing waivers need an explicit override with a reason
        setPending({ ref: refCode, kind: 'arrive', message: e.message });
        setReason('');
      } else {
        setErr(errorMessage(e, `Could not update ${refCode}.`));
      }
    } finally {
      setBusy(null);
    }
  };

  const t = data?.totals;
  const collected = data?.collected;
  const past = date < todayIsoPark();
  const shownMethods = collected ? METHODS.filter((m) => m === 'cash' || m === 'card' || collected[m] !== 0) : [];

  return (
    <div data-testid="reconciliation-panel">
      <div data-print-hide="" className={cn(CARD, 'p-[12px] mb-[14px] flex flex-wrap gap-[8px] items-center')}>
        <Btn variant="ghost" onClick={() => setDate(addDays(date, -1))} title="Previous day">‹</Btn>
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Reconciliation date" className={DATE_INPUT} />
        <Btn variant="ghost" onClick={() => setDate(addDays(date, 1))} title="Next day">›</Btn>
        <Btn variant="ghost" onClick={() => setDate(todayIsoPark())}>Today</Btn>
        <div className="ml-auto flex gap-[8px] flex-wrap">
          <Btn variant="ghost" onClick={() => window.print()}>Print arrivals sheet</Btn>
          <ExportLink href={exportUrl('bookings', date, date)} label="Day's bookings CSV" />
        </div>
      </div>

      {err && <div role="alert" className={cn(CARD, 'p-[14px] mb-[14px] text-[#D6173F] font-semibold')}>{err}</div>}
      {loading && !data && <div className="p-[30px] flex justify-center"><Spinner color="#7333FF" /></div>}

      {t && (
        <>
          {collected && (
            <Panel title={`MONEY RECORDED ON ${date} · WHAT THE TILL BALANCES AGAINST`}>
              <div data-testid="recon-collected" className="grid gap-[12px] p-[14px] grid-cols-[repeat(auto-fit,minmax(130px,1fr))]">
                {shownMethods.map((m) => (
                  <div key={m} data-testid={'recon-' + m}>
                    <div className="font-mono text-[9.5px] font-bold tracking-[.13em] text-valle-violet">{METHOD_LABEL[m].toUpperCase()}</div>
                    <div className="font-display text-[22px] font-black italic">{mur(collected[m])}</div>
                  </div>
                ))}
                <div data-testid="recon-total" className="border-s-[3px] border-valle-purple ps-[12px]">
                  <div className="font-mono text-[9.5px] font-bold tracking-[.13em] text-valle-violet">TOTAL RECORDED</div>
                  <div className="font-display text-[22px] font-black italic">{mur(collected.total)}</div>
                </div>
              </div>
              <div className="px-[14px] pb-[12px] text-[12px] text-[rgba(52,0,87,.7)]">
                Every payment and refund taken on this day (any visit date), from the booking trail; refunds count negative.
                Days before payments were itemised per method may be approximate.
              </div>
              {(data?.payments?.length ?? 0) > 0 && (
                <details className="border-t border-valle-lilac px-[14px] py-[10px]">
                  <summary className="cursor-pointer font-mono text-[10.5px] font-bold tracking-[.12em]">{data!.payments!.length} PAYMENTS</summary>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[620px] mt-[8px]">
                      <thead><tr className="bg-[#F7F3FF]"><th className={TH}>Time</th><th className={TH}>Ref</th><th className={TH}>Guest</th><th className={TH}>Method</th><th className={cn(TH, 'text-right')}>Amount</th><th className={TH}>Receipt</th><th className={TH}>By</th></tr></thead>
                      <tbody>
                        {data!.payments!.map((p, i) => (
                          <tr key={i}>
                            <td className={cn(TD, 'font-mono text-[12px]')}>{clockTimeSec(p.at)}</td>
                            <td className={cn(TD, 'font-mono text-[12px] font-bold')}>{p.refCode}</td>
                            <td className={TD}>{p.guestName}</td>
                            <td className={TD}>{METHOD_LABEL[p.method] ?? p.method}</td>
                            <td className={TDNUM}>{mur(p.amount)}</td>
                            <td className={TD}>{p.receiptNo || '—'}</td>
                            <td className={cn(TD, 'text-[12px]')}>{p.by}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </Panel>
          )}

          <div className={cn('grid gap-[12px] mb-[14px] grid-cols-[repeat(auto-fit,minmax(160px,1fr))]', loading ? 'opacity-[.6]' : 'opacity-100')}>
            <Kpi tag="EXPECTED AT GATE" value={mur(t.gateExpected)} sub="pay-at-park visits of the day" accent="#7333FF" />
            {collected && (
              <Kpi
                testId="recon-gate-collected"
                tag="COLLECTED AT GATE"
                value={mur(collected.cash + collected.card + collected.juice + collected.other)}
                sub="cash, card, Juice and other recorded today"
                accent="#33FF74"
                title="Money the desk actually recorded today (payments in the booking trail), not the value of arrived bookings"
              />
            )}
            <Kpi tag="STILL TO COLLECT" value={mur(t.gateOutstanding)} sub={past ? 'no-shows if never arrived' : 'not yet arrived'} accent="#FFFC33" />
            <Kpi tag="BOOKED AS ONLINE" value={mur(t.onlinePaid)} sub="online bookings of the day" />
            <Kpi tag="GUESTS" value={`${t.guestsArrived} / ${t.guestsExpected}`} sub="arrived / expected" />
            <Kpi tag="CANCELLED" value={String(t.cancelled)} sub={mur(t.cancelledAmount) + ' not collected'} />
            {past && <Kpi tag="NO-SHOWS" value={String(t.noShows)} sub={mur(t.noShowAmount) + ' lost'} accent="#A3122F" />}
          </div>

          <Panel title={`BOOKINGS FOR ${date}`}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[960px]">
                <thead><tr className="bg-[#F7F3FF]">
                  <th className={TH}>Ref</th><th className={TH}>Slot</th><th className={TH}>Guest</th><th className={TH}>Party</th><th className={TH}>Nationality</th><th className={TH}>Payment</th><th className={cn(TH, 'text-right')}>Total</th><th className={TH}>Paid today</th><th className={TH}>Status</th><th className={TH}></th><th className={TH}></th>
                </tr></thead>
                <tbody>
                  {data!.rows.map((r) => (
                    <Fragment key={r.refCode}>
                      <tr className={r.status === 'cancelled' ? 'opacity-[.55]' : 'opacity-100'}>
                        <td className={cn(TD, 'font-mono font-bold text-[12.5px]')}>{r.refCode}</td>
                        <td className={TD}>{SLOT_LABEL[r.slot] ?? r.slot}</td>
                        <td className={cn(TD, 'font-semibold')}>{r.guestName}<div className="font-mono text-[10px] text-[rgba(52,0,87,.7)]">{r.phone || r.email}</div></td>
                        <td className={TD}>{partyText(r.adults, r.kids)}</td>
                        <td className={TD}>{r.nationality || '—'}</td>
                        <td className={TD}>{PAY_LABEL[r.payMode] ?? r.payMode}</td>
                        <td className={TDNUM}>{mur(r.total)}</td>
                        <td className={cn(TD, 'text-[12.5px]')} data-testid="recon-paid-today">
                          {(r.paidToday ?? []).length === 0 ? '—' : (r.paidToday ?? []).map((p) => `${METHOD_LABEL[p.method] ?? p.method} ${mur(p.amount)}`).join(' + ')}
                          {(r.refundDue ?? 0) > 0 && <div className="font-mono text-[10.5px] font-bold text-[#8A6A00]">REFUND DUE {mur(r.refundDue ?? 0)}</div>}
                        </td>
                        <td className={TD}><StatusChip status={r.status} /></td>
                        <td className={cn(TD, 'text-right')}>
                          <div className="inline-flex gap-[6px]">
                            {r.status !== 'arrived' && r.status !== 'cancelled' && <Btn onClick={() => { void setStatus(r.refCode, 'arrived'); }} disabled={busy === r.refCode}>Arrived</Btn>}
                            {r.status !== 'confirmed' && <Btn variant="ghost" onClick={() => { void setStatus(r.refCode, 'confirmed'); }} disabled={busy === r.refCode}>Undo</Btn>}
                          </div>
                        </td>
                        {/* kept apart from Arrived, and asks first */}
                        <td className={cn(TD, 'text-right ps-[28px]')}>
                          {r.status === 'confirmed' && (
                            <Btn variant="danger" onClick={() => { setPending({ ref: r.refCode, kind: 'cancel' }); setReason(''); }} disabled={busy === r.refCode} data-testid="recon-cancel">Cancel…</Btn>
                          )}
                        </td>
                      </tr>
                      {pending?.ref === r.refCode && (
                        <tr>
                          <td colSpan={11} className="px-[12px] pb-[12px]">
                            <div role="alert" data-testid={'recon-' + pending.kind + '-form'} className="flex flex-wrap items-center gap-[8px] rounded-[14px] border-[1.5px] border-[#FFD24D] bg-[#FFF4D6] px-[12px] py-[10px]">
                              <span className="flex-[1_1_100%] text-[13.5px] font-bold">
                                {pending.kind === 'cancel'
                                  ? `Cancel ${r.refCode} (${r.guestName})? The reservation is released. Give the reason for the trail.`
                                  : `${pending.message}. Check in anyway? Give the reason for the trail (e.g. paper waivers at the desk).`}
                              </span>
                              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" aria-label="Reason (required)" className={cn(INPUT, 'flex-[1_1_240px]')} data-testid="recon-reason" />
                              <Btn
                                variant="danger"
                                disabled={busy === r.refCode || reason.trim().length < 3}
                                onClick={() => { void setStatus(r.refCode, pending.kind === 'cancel' ? 'cancelled' : 'arrived', pending.kind === 'cancel' ? { reason: reason.trim() } : { override: true, reason: reason.trim() }); }}
                              >
                                {pending.kind === 'cancel' ? 'Yes, cancel booking' : 'Mark arrived anyway'}
                              </Btn>
                              <Btn variant="ghost" onClick={() => setPending(null)}>Keep it</Btn>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {data!.rows.length === 0 && <tr><td className={cn(TD, 'text-[rgba(52,0,87,.5)]')} colSpan={11}>No bookings for this day.</td></tr>}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
