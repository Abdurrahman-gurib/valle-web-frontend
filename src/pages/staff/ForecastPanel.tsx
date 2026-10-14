import { useEffect, useMemo, useState } from 'react';
import { mur } from '../../lib/format';
import { getForecast, type ForecastDay } from '../../lib/staffApi';
import { cn } from '../../lib/utils';
import { Btn, Spinner } from './ui';
import { Kpi, Panel } from './reportUi';

const CARD = 'bg-white border-[1.5px] border-valle-lilac rounded-[18px]';
const TH = 'font-mono text-[9.5px] font-bold tracking-[.13em] uppercase text-valle-violet text-left px-[12px] py-[10px] whitespace-nowrap';
const TD = 'px-[12px] py-[10px] text-[13.5px] border-t border-valle-lilac whitespace-nowrap';
const TDNUM = cn(TD, 'font-mono text-right text-[12.5px]');

const paceColor = (p: number | null) => (p === null ? '#EBE2FF' : p >= 1.2 ? '#FF3358' : p >= 0.8 ? '#33FF74' : '#FFFC33');
const paceWord = (p: number | null) => (p === null ? 'no history' : p >= 1.2 ? 'above usual' : p >= 0.8 ? 'on track' : 'below usual');

/**
 * What the next weeks look like from the bookings already taken, against the
 * typical level for each weekday (average of the previous 8 weeks). Pace tells
 * the desk where to push promotions and where to add staff.
 */
export default function ForecastPanel() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let dead = false;
    setLoading(true);
    getForecast(days)
      .then((r) => { if (!dead) { setRows(r); setErr(''); } })
      .catch(() => { if (!dead) setErr('Could not load the forecast.'); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [days]);

  const sum = useMemo(() => rows.reduce((s, r) => ({ guests: s.guests + r.guests, revenue: s.revenue + r.revenue, bookings: s.bookings + r.bookings, typical: s.typical + r.typicalGuests }), { guests: 0, revenue: 0, bookings: 0, typical: 0 }), [rows]);
  const busiest = useMemo(() => rows.slice().sort((a, b) => b.guests - a.guests)[0], [rows]);
  const maxGuests = Math.max(1, ...rows.map((r) => Math.max(r.guests, r.typicalGuests)));

  return (
    <div data-testid="forecast-panel">
      <div className={cn(CARD, 'p-[12px] mb-[14px] flex flex-wrap gap-[8px] items-center')}>
        {[14, 30, 60, 90].map((n) => <Btn key={n} variant={days === n ? 'solid' : 'ghost'} onClick={() => setDays(n)}>{n} days</Btn>)}
        <span className="font-mono text-[10px] tracking-[.1em] text-[rgba(52,0,87,.7)] ml-auto">BOOKED SO FAR VS THE USUAL LEVEL FOR THAT WEEKDAY</span>
      </div>
      {err && <div className={cn(CARD, 'p-[14px] mb-[14px] text-[#D91E44] font-semibold')}>{err}</div>}
      {loading && rows.length === 0 && <div className="p-[30px] flex justify-center"><Spinner color="#7333FF" /></div>}
      {rows.length > 0 && (
        <>
          <div className={cn('grid gap-[12px] mb-[14px] grid-cols-[repeat(auto-fit,minmax(150px,1fr))]', loading ? 'opacity-[.6]' : 'opacity-100')}>
            <Kpi tag="GUESTS BOOKED" value={String(sum.guests)} sub={`next ${days} days · usual ${sum.typical}`} accent="#7333FF" />
            <Kpi tag="REVENUE BOOKED" value={mur(sum.revenue)} sub={`${sum.bookings} bookings`} accent="#33FF74" />
            <Kpi tag="BUSIEST DAY" value={busiest ? `${busiest.dow} ${busiest.date.slice(5)}` : '—'} sub={busiest ? `${busiest.guests} guests booked` : ''} accent="#FF3358" />
            <Kpi tag="PACE" value={sum.typical ? Math.round((sum.guests / sum.typical) * 100) + '%' : '—'} sub="of the usual level" accent="#FFFC33" />
          </div>
          <Panel title="DAY BY DAY">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[720px]">
                <thead><tr className="bg-[#F7F3FF]">
                  <th className={TH}>Date</th><th className={cn(TH, 'text-right')}>Bookings</th><th className={cn(TH, 'text-right')}>Morning</th><th className={cn(TH, 'text-right')}>Afternoon</th><th className={cn(TH, 'text-right')}>Guests</th><th className={cn(TH, 'text-right')}>Usual</th><th className={TH}>Pace</th><th className={cn(TH, 'text-right')}>Revenue</th>
                </tr></thead>
                <tbody>
                  {rows.map((r) => {
                    const weekend = r.dow === 'Sat' || r.dow === 'Sun';
                    return (
                      <tr key={r.date} className={weekend ? 'bg-[#FBF9FF]' : undefined}>
                        <td className={cn(TD, 'font-semibold')}>{r.dow} {r.date.slice(5)}</td>
                        <td className={TDNUM}>{r.bookings}</td>
                        <td className={TDNUM}>{r.morningGuests}</td>
                        <td className={TDNUM}>{r.afternoonGuests}</td>
                        <td className={cn(TDNUM, 'font-bold')}>{r.guests}</td>
                        <td className={TDNUM}>{r.typicalGuests}</td>
                        <td className={cn(TD, 'min-w-[180px]')}>
                          <div className="flex items-center gap-[8px]">
                            <div className="flex-1 h-[8px] rounded-[999px] bg-valle-lilac relative">
                              <div className="h-full rounded-[999px] bg-[#D9CCF2] absolute" style={{ width: `${(r.typicalGuests / maxGuests) * 100}%` }} />
                              <div className="h-full rounded-[999px] absolute" style={{ width: `${(r.guests / maxGuests) * 100}%`, background: paceColor(r.pace) }} />
                            </div>
                            <span className="font-mono text-[9.5px] tracking-[.06em] text-[rgba(52,0,87,.6)] w-[82px]">{paceWord(r.pace).toUpperCase()}</span>
                          </div>
                        </td>
                        <td className={TDNUM}>{mur(r.revenue)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
