import { useEffect, useMemo, useState } from 'react';
import { mur } from '../../lib/format';
import {
  exportUrl, getExperienceSales, getNationalities, getSalesSummary,
  type ExperienceRow, type NationalityRow, type SalesSummary,
} from '../../lib/staffApi';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Btn, Spinner, card, inputStyle, mono } from './ui';
import {
  BarChart, BreakdownTable, ExportLink, Kpi, PAY_LABEL, Panel, RATE_LABEL, SLOT_LABEL, STATUS_LABEL,
  addDays, monthEnd, monthStart, prevMonth, td, tdNum, th, todayIsoPark,
} from './reportUi';

type Preset = 'today' | 'week' | 'month' | 'last-month' | 'quarter' | 'custom';

function presetRange(p: Preset, today: string): [string, string] {
  switch (p) {
    case 'today': return [today, today];
    case 'week': return [addDays(today, -6), today];
    case 'month': return [monthStart(today), today];
    case 'last-month': { const pm = prevMonth(today); return [pm, monthEnd(pm)]; }
    case 'quarter': return [addDays(today, -89), today];
    default: return [monthStart(today), today];
  }
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'today', label: 'Today' }, { key: 'week', label: '7 days' }, { key: 'month', label: 'This month' },
  { key: 'last-month', label: 'Last month' }, { key: 'quarter', label: '90 days' }, { key: 'custom', label: 'Custom' },
];

/**
 * Sales: what was sold for visits in a period, how it was paid, who came and
 * what they booked, with CSV exports of each table. Figures are by VISIT date
 * and exclude cancelled bookings.
 */
export default function ReportsPanel() {
  const isMobile = useIsMobile(900);
  const today = todayIsoPark();
  const [preset, setPreset] = useState<Preset>('month');
  const [custom, setCustom] = useState<[string, string]>([monthStart(today), today]);
  const [from, to] = preset === 'custom' ? custom : presetRange(preset, today);

  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [nats, setNats] = useState<NationalityRow[]>([]);
  const [exps, setExps] = useState<ExperienceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (to < from) return;
    let dead = false;
    setLoading(true);
    Promise.all([getSalesSummary(from, to), getNationalities(from, to), getExperienceSales(from, to)])
      .then(([s, n, e]) => { if (dead) return; setSummary(s); setNats(n); setExps(e); setErr(''); })
      .catch(() => { if (!dead) setErr('Could not load the reports.'); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [from, to]);

  const t = summary?.totals;
  const chart = useMemo(() => (summary?.daily ?? []).map((d) => ({ label: d.date.slice(5), value: d.revenue, sub: `${d.bookings} bookings · ${d.guests} guests` })), [summary]);

  return (
    <div data-testid="reports-panel">
      {/* ---- period ---- */}
      <div style={{ ...card, padding: 12, marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {PRESETS.map((p) => (
          <Btn key={p.key} variant={preset === p.key ? 'solid' : 'ghost'} onClick={() => setPreset(p.key)}>{p.label}</Btn>
        ))}
        {preset === 'custom' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: isMobile ? '1 1 100%' : '0 0 auto' }}>
            <input type="date" value={custom[0]} max={custom[1]} onChange={(e) => setCustom([e.target.value, custom[1]])} aria-label="From date" style={{ ...inputStyle, width: 'auto' }} />
            <span style={{ ...mono, fontSize: 9.5, color: '#7333FF' }}>TO</span>
            <input type="date" value={custom[1]} min={custom[0]} onChange={(e) => setCustom([custom[0], e.target.value])} aria-label="To date" style={{ ...inputStyle, width: 'auto' }} />
          </div>
        )}
        <span style={{ ...mono, fontSize: 10, letterSpacing: '.1em', color: 'rgba(52,0,87,.55)', marginLeft: 'auto' }}>VISITS {from} → {to}</span>
      </div>

      {err && <div style={{ ...card, padding: 14, marginBottom: 14, color: '#D91E44', fontWeight: 600 }}>{err}</div>}
      {loading && !summary && <div style={{ padding: 30, display: 'flex', justifyContent: 'center' }}><Spinner color="#7333FF" /></div>}

      {t && (
        <>
          <div style={{ display: 'grid', gap: 12, marginBottom: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', opacity: loading ? 0.6 : 1 }}>
            <Kpi tag="REVENUE" value={mur(t.revenue)} sub={`${mur(t.entryRevenue)} entry · ${mur(t.experienceRevenue)} experiences`} accent="#7333FF" />
            <Kpi tag="BOOKINGS" value={String(t.bookings)} sub={`${t.cancelled} cancelled`} />
            <Kpi tag="GUESTS" value={String(t.guests)} sub={`${t.adults} adults · ${t.kids} children`} />
            <Kpi tag="AVERAGE TICKET" value={mur(t.avgTicket)} sub="per booking" />
            <Kpi tag="PAID ONLINE" value={mur(t.onlineRevenue)} sub={`${mur(t.gateRevenue)} at the gate`} accent="#33FF74" />
            <Kpi tag="DISCOUNTS" value={mur(t.discounts)} sub="Explorer Pass and offers" accent="#FFFC33" />
          </div>

          <Panel title="REVENUE BY DAY" action={<ExportLink href={exportUrl('daily', from, to)} label="Daily CSV" />}>
            <BarChart points={chart} />
          </Panel>

          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
            <Panel title="BY PAYMENT"><BreakdownTable rows={summary!.byPayMode} label={(k) => PAY_LABEL[k] ?? k} total={t.revenue} /></Panel>
            <Panel title="BY RATE"><BreakdownTable rows={summary!.byRate} label={(k) => RATE_LABEL[k] ?? k} total={t.revenue} /></Panel>
            <Panel title="BY ARRIVAL SLOT"><BreakdownTable rows={summary!.bySlot} label={(k) => SLOT_LABEL[k] ?? k} total={t.revenue} /></Panel>
            <Panel title="BY STATUS"><BreakdownTable rows={summary!.byStatus} label={(k) => STATUS_LABEL[k] ?? k} total={t.revenue} /></Panel>
          </div>

          <Panel title="WHERE GUESTS COME FROM" action={<ExportLink href={exportUrl('nationalities', from, to)} label="Nationalities CSV" />}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                <thead><tr style={{ background: '#F7F3FF' }}><th style={th}>Nationality</th><th style={{ ...th, textAlign: 'right' }}>Bookings</th><th style={{ ...th, textAlign: 'right' }}>Guests</th><th style={{ ...th, textAlign: 'right' }}>Share</th><th style={{ ...th, textAlign: 'right' }}>Revenue</th><th style={th}></th></tr></thead>
                <tbody>
                  {nats.map((r) => (
                    <tr key={r.nationality}>
                      <td style={{ ...td, fontWeight: 600 }}>{r.nationality}</td>
                      <td style={tdNum}>{r.bookings}</td>
                      <td style={tdNum}>{r.guests}</td>
                      <td style={tdNum}>{r.share}%</td>
                      <td style={tdNum}>{mur(r.revenue)}</td>
                      <td style={{ ...td, width: '30%' }}><div style={{ height: 8, borderRadius: 999, background: '#EBE2FF' }}><div style={{ width: `${Math.min(100, r.share)}%`, height: '100%', borderRadius: 999, background: '#7333FF' }} /></div></td>
                    </tr>
                  ))}
                  {nats.length === 0 && <tr><td style={{ ...td, color: 'rgba(52,0,87,.5)' }} colSpan={6}>No bookings in this period.</td></tr>}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="WHAT SELLS" action={<ExportLink href={exportUrl('experiences', from, to)} label="Experiences CSV" />}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
                <thead><tr style={{ background: '#F7F3FF' }}><th style={th}>Experience</th><th style={th}>Option</th><th style={{ ...th, textAlign: 'right' }}>Bookings</th><th style={{ ...th, textAlign: 'right' }}>Adults</th><th style={{ ...th, textAlign: 'right' }}>Children</th><th style={{ ...th, textAlign: 'right' }}>Units</th><th style={{ ...th, textAlign: 'right' }}>Revenue</th></tr></thead>
                <tbody>
                  {exps.map((r, i) => (
                    <tr key={i}>
                      <td style={{ ...td, fontWeight: 600 }}>{r.experienceId}</td>
                      <td style={{ ...td, whiteSpace: 'normal' }}>{r.label}</td>
                      <td style={tdNum}>{r.bookings}</td>
                      <td style={tdNum}>{r.adults}</td>
                      <td style={tdNum}>{r.kids}</td>
                      <td style={tdNum}>{r.units}</td>
                      <td style={tdNum}>{mur(r.revenue)}</td>
                    </tr>
                  ))}
                  {exps.length === 0 && <tr><td style={{ ...td, color: 'rgba(52,0,87,.5)' }} colSpan={7}>No experiences sold in this period.</td></tr>}
                </tbody>
              </table>
            </div>
          </Panel>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <ExportLink href={exportUrl('bookings', from, to)} label="All bookings in this period (CSV)" />
            <span style={{ ...mono, fontSize: 9.5, letterSpacing: '.08em', color: 'rgba(52,0,87,.55)' }}>OPENS IN EXCEL / GOOGLE SHEETS · FIGURES BY VISIT DATE, CANCELLED EXCLUDED FROM REVENUE</span>
          </div>
        </>
      )}
    </div>
  );
}
