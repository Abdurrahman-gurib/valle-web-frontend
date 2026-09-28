import { useCallback, useEffect, useState } from 'react';
import type { BookingStatus } from '../../types';
import { mur, partyLabel } from '../../lib/format';
import { exportUrl, getReconciliation, updateBooking, type Reconciliation } from '../../lib/staffApi';
import { Btn, Spinner, StatusChip, card, inputStyle, mono } from './ui';
import { ExportLink, Kpi, PAY_LABEL, Panel, SLOT_LABEL, addDays, td, tdNum, th, todayIsoPark } from './reportUi';

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
      <div style={{ ...card, padding: 12, marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Btn variant="ghost" onClick={() => setDate(addDays(date, -1))}>‹</Btn>
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Reconciliation date" style={{ ...inputStyle, width: 'auto' }} />
        <Btn variant="ghost" onClick={() => setDate(addDays(date, 1))}>›</Btn>
        <Btn variant="ghost" onClick={() => setDate(todayIsoPark())}>Today</Btn>
        <div style={{ marginLeft: 'auto' }}><ExportLink href={exportUrl('bookings', date, date)} label="Day's bookings CSV" /></div>
      </div>

      {err && <div style={{ ...card, padding: 14, marginBottom: 14, color: '#D91E44', fontWeight: 600 }}>{err}</div>}
      {loading && !data && <div style={{ padding: 30, display: 'flex', justifyContent: 'center' }}><Spinner color="#7333FF" /></div>}

      {t && (
        <>
          <div style={{ display: 'grid', gap: 12, marginBottom: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', opacity: loading ? 0.6 : 1 }}>
            <Kpi tag="EXPECTED AT GATE" value={mur(t.gateExpected)} sub="pay-on-arrival bookings" accent="#7333FF" />
            <Kpi tag="COLLECTED AT GATE" value={mur(t.gateCollected)} sub="marked arrived" accent="#33FF74" />
            <Kpi tag="STILL TO COLLECT" value={mur(t.gateOutstanding)} sub={past ? 'no-shows if never arrived' : 'not yet arrived'} accent="#FFFC33" />
            <Kpi tag="PAID ONLINE" value={mur(t.onlinePaid)} sub="already settled" />
            <Kpi tag="GUESTS" value={`${t.guestsArrived} / ${t.guestsExpected}`} sub="arrived / expected" />
            <Kpi tag="CANCELLED" value={String(t.cancelled)} sub={mur(t.cancelledAmount) + ' not collected'} />
            {past && <Kpi tag="NO-SHOWS" value={String(t.noShows)} sub={mur(t.noShowAmount) + ' lost'} accent="#FF3358" />}
          </div>

          <Panel title={`BOOKINGS FOR ${date}`}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                <thead><tr style={{ background: '#F7F3FF' }}>
                  <th style={th}>Ref</th><th style={th}>Slot</th><th style={th}>Guest</th><th style={th}>Party</th><th style={th}>Nationality</th><th style={th}>Payment</th><th style={{ ...th, textAlign: 'right' }}>Total</th><th style={th}>Status</th><th style={th}></th>
                </tr></thead>
                <tbody>
                  {data!.rows.map((r) => (
                    <tr key={r.refCode} style={{ opacity: r.status === 'cancelled' ? 0.55 : 1 }}>
                      <td style={{ ...td, ...mono, fontWeight: 700, fontSize: 12.5 }}>{r.refCode}</td>
                      <td style={td}>{SLOT_LABEL[r.slot] ?? r.slot}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{r.guestName}<div style={{ ...mono, fontSize: 10, color: 'rgba(52,0,87,.55)' }}>{r.phone || r.email}</div></td>
                      <td style={td}>{partyLabel(r.adults, r.kids)}</td>
                      <td style={td}>{r.nationality || '—'}</td>
                      <td style={td}>{PAY_LABEL[r.payMode] ?? r.payMode}</td>
                      <td style={tdNum}>{mur(r.total)}</td>
                      <td style={td}><StatusChip status={r.status} /></td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          {r.status !== 'arrived' && r.status !== 'cancelled' && <Btn onClick={() => { void setStatus(r.refCode, 'arrived'); }} disabled={busy === r.refCode}>Arrived</Btn>}
                          {r.status === 'confirmed' && <Btn variant="ghost" onClick={() => { void setStatus(r.refCode, 'cancelled'); }} disabled={busy === r.refCode}>Cancel</Btn>}
                          {r.status !== 'confirmed' && <Btn variant="ghost" onClick={() => { void setStatus(r.refCode, 'confirmed'); }} disabled={busy === r.refCode}>Undo</Btn>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data!.rows.length === 0 && <tr><td style={{ ...td, color: 'rgba(52,0,87,.5)' }} colSpan={9}>No bookings for this day.</td></tr>}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
