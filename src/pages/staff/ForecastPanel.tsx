import { useEffect, useMemo, useState } from 'react';
import { mur } from '../../lib/format';
import { getForecast, type ForecastDay } from '../../lib/staffApi';
import { Btn, Spinner, card, mono } from './ui';
import { Kpi, Panel, td, tdNum, th } from './reportUi';

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
      <div style={{ ...card, padding: 12, marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {[14, 30, 60, 90].map((n) => <Btn key={n} variant={days === n ? 'solid' : 'ghost'} onClick={() => setDays(n)}>{n} days</Btn>)}
        <span style={{ ...mono, fontSize: 10, letterSpacing: '.1em', color: 'rgba(52,0,87,.55)', marginLeft: 'auto' }}>BOOKED SO FAR VS THE USUAL LEVEL FOR THAT WEEKDAY</span>
      </div>
      {err && <div style={{ ...card, padding: 14, marginBottom: 14, color: '#D91E44', fontWeight: 600 }}>{err}</div>}
      {loading && rows.length === 0 && <div style={{ padding: 30, display: 'flex', justifyContent: 'center' }}><Spinner color="#7333FF" /></div>}
      {rows.length > 0 && (
        <>
          <div style={{ display: 'grid', gap: 12, marginBottom: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', opacity: loading ? 0.6 : 1 }}>
            <Kpi tag="GUESTS BOOKED" value={String(sum.guests)} sub={`next ${days} days · usual ${sum.typical}`} accent="#7333FF" />
            <Kpi tag="REVENUE BOOKED" value={mur(sum.revenue)} sub={`${sum.bookings} bookings`} accent="#33FF74" />
            <Kpi tag="BUSIEST DAY" value={busiest ? `${busiest.dow} ${busiest.date.slice(5)}` : '—'} sub={busiest ? `${busiest.guests} guests booked` : ''} accent="#FF3358" />
            <Kpi tag="PACE" value={sum.typical ? Math.round((sum.guests / sum.typical) * 100) + '%' : '—'} sub="of the usual level" accent="#FFFC33" />
          </div>
          <Panel title="DAY BY DAY">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                <thead><tr style={{ background: '#F7F3FF' }}>
                  <th style={th}>Date</th><th style={{ ...th, textAlign: 'right' }}>Bookings</th><th style={{ ...th, textAlign: 'right' }}>Morning</th><th style={{ ...th, textAlign: 'right' }}>Afternoon</th><th style={{ ...th, textAlign: 'right' }}>Guests</th><th style={{ ...th, textAlign: 'right' }}>Usual</th><th style={th}>Pace</th><th style={{ ...th, textAlign: 'right' }}>Revenue</th>
                </tr></thead>
                <tbody>
                  {rows.map((r) => {
                    const weekend = r.dow === 'Sat' || r.dow === 'Sun';
                    return (
                      <tr key={r.date} style={{ background: weekend ? '#FBF9FF' : undefined }}>
                        <td style={{ ...td, fontWeight: 600 }}>{r.dow} {r.date.slice(5)}</td>
                        <td style={tdNum}>{r.bookings}</td>
                        <td style={tdNum}>{r.morningGuests}</td>
                        <td style={tdNum}>{r.afternoonGuests}</td>
                        <td style={{ ...tdNum, fontWeight: 700 }}>{r.guests}</td>
                        <td style={tdNum}>{r.typicalGuests}</td>
                        <td style={{ ...td, minWidth: 180 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 8, borderRadius: 999, background: '#EBE2FF', position: 'relative' }}>
                              <div style={{ width: `${(r.typicalGuests / maxGuests) * 100}%`, height: '100%', borderRadius: 999, background: '#D9CCF2', position: 'absolute' }} />
                              <div style={{ width: `${(r.guests / maxGuests) * 100}%`, height: '100%', borderRadius: 999, background: paceColor(r.pace), position: 'absolute' }} />
                            </div>
                            <span style={{ ...mono, fontSize: 9.5, letterSpacing: '.06em', color: 'rgba(52,0,87,.6)', width: 82 }}>{paceWord(r.pace).toUpperCase()}</span>
                          </div>
                        </td>
                        <td style={tdNum}>{mur(r.revenue)}</td>
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
