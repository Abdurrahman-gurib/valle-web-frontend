import { useEffect, useMemo, useState } from 'react';
import { mur } from '../../lib/format';
import {
  exportUrl, getExperienceSales, getNationalities, getSalesSummary,
  type ExperienceRow, type NationalityRow, type SalesSummary,
} from '../../lib/staffApi';
import { useIsMobile } from '../../hooks/useIsMobile';
import { cn } from '../../lib/utils';
import { Btn, Spinner } from './ui';
import {
  BarChart, BreakdownTable, ExportLink, Kpi, PAY_LABEL, Panel, RATE_LABEL, SLOT_LABEL, STATUS_LABEL,
  addDays, monthEnd, monthStart, prevMonth, todayIsoPark,
} from './reportUi';

const CARD = 'bg-white border-[1.5px] border-valle-lilac rounded-[18px]';
const DATE_INPUT = 'w-auto border-[1.5px] border-valle-lilac bg-[#F7F3FF] rounded-[12px] px-[14px] py-[11px] [font-family:inherit] text-[14.5px] outline-none text-valle-purple';
const TH = 'font-mono text-[9.5px] font-bold tracking-[.13em] uppercase text-valle-violet text-left px-[12px] py-[10px] whitespace-nowrap';
const TD = 'px-[12px] py-[10px] text-[13.5px] border-t border-valle-lilac whitespace-nowrap';
const TDNUM = cn(TD, 'font-mono text-right text-[12.5px]');

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
      <div className={cn(CARD, 'p-[12px] mb-[14px] flex flex-wrap gap-[8px] items-center')}>
        {PRESETS.map((p) => (
          <Btn key={p.key} variant={preset === p.key ? 'solid' : 'ghost'} onClick={() => setPreset(p.key)}>{p.label}</Btn>
        ))}
        {preset === 'custom' && (
          <div className={cn('flex gap-[8px] items-center', isMobile ? 'flex-[1_1_100%]' : 'flex-none')}>
            <input type="date" value={custom[0]} max={custom[1]} onChange={(e) => setCustom([e.target.value, custom[1]])} aria-label="From date" className={DATE_INPUT} />
            <span className="font-mono text-[9.5px] text-valle-violet">TO</span>
            <input type="date" value={custom[1]} min={custom[0]} onChange={(e) => setCustom([custom[0], e.target.value])} aria-label="To date" className={DATE_INPUT} />
          </div>
        )}
        <span className="font-mono text-[10px] tracking-[.1em] text-[rgba(52,0,87,.7)] ml-auto">VISITS {from} → {to}</span>
      </div>

      {err && <div className={cn(CARD, 'p-[14px] mb-[14px] text-[#D91E44] font-semibold')}>{err}</div>}
      {loading && !summary && <div className="p-[30px] flex justify-center"><Spinner color="#7333FF" /></div>}

      {t && (
        <>
          <div className={cn('grid gap-[12px] mb-[14px] grid-cols-[repeat(auto-fit,minmax(150px,1fr))]', loading ? 'opacity-[.6]' : 'opacity-100')}>
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

          <div className={cn('grid gap-[14px]', isMobile ? 'grid-cols-[1fr]' : 'grid-cols-[1fr_1fr]')}>
            <Panel title="BY PAYMENT"><BreakdownTable rows={summary!.byPayMode} label={(k) => PAY_LABEL[k] ?? k} total={t.revenue} /></Panel>
            <Panel title="BY RATE"><BreakdownTable rows={summary!.byRate} label={(k) => RATE_LABEL[k] ?? k} total={t.revenue} /></Panel>
            <Panel title="BY ARRIVAL SLOT"><BreakdownTable rows={summary!.bySlot} label={(k) => SLOT_LABEL[k] ?? k} total={t.revenue} /></Panel>
            <Panel title="BY STATUS"><BreakdownTable rows={summary!.byStatus} label={(k) => STATUS_LABEL[k] ?? k} total={t.revenue} /></Panel>
          </div>

          <Panel title="WHERE GUESTS COME FROM" action={<ExportLink href={exportUrl('nationalities', from, to)} label="Nationalities CSV" />}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[520px]">
                <thead><tr className="bg-[#F7F3FF]"><th className={TH}>Nationality</th><th className={cn(TH, 'text-right')}>Bookings</th><th className={cn(TH, 'text-right')}>Guests</th><th className={cn(TH, 'text-right')}>Share</th><th className={cn(TH, 'text-right')}>Revenue</th><th className={TH}></th></tr></thead>
                <tbody>
                  {nats.map((r) => (
                    <tr key={r.nationality}>
                      <td className={cn(TD, 'font-semibold')}>{r.nationality}</td>
                      <td className={TDNUM}>{r.bookings}</td>
                      <td className={TDNUM}>{r.guests}</td>
                      <td className={TDNUM}>{r.share}%</td>
                      <td className={TDNUM}>{mur(r.revenue)}</td>
                      <td className={cn(TD, 'w-[30%]')}><div className="h-[8px] rounded-[999px] bg-valle-lilac"><div className="h-full rounded-[999px] bg-valle-violet" style={{ width: `${Math.min(100, r.share)}%` }} /></div></td>
                    </tr>
                  ))}
                  {nats.length === 0 && <tr><td className={cn(TD, 'text-[rgba(52,0,87,.5)]')} colSpan={6}>No bookings in this period.</td></tr>}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="WHAT SELLS" action={<ExportLink href={exportUrl('experiences', from, to)} label="Experiences CSV" />}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[620px]">
                <thead><tr className="bg-[#F7F3FF]"><th className={TH}>Experience</th><th className={TH}>Option</th><th className={cn(TH, 'text-right')}>Bookings</th><th className={cn(TH, 'text-right')}>Adults</th><th className={cn(TH, 'text-right')}>Children</th><th className={cn(TH, 'text-right')}>Units</th><th className={cn(TH, 'text-right')}>Revenue</th></tr></thead>
                <tbody>
                  {exps.map((r, i) => (
                    <tr key={i}>
                      <td className={cn(TD, 'font-semibold')}>{r.experienceId}</td>
                      <td className={cn(TD, 'whitespace-normal')}>{r.label}</td>
                      <td className={TDNUM}>{r.bookings}</td>
                      <td className={TDNUM}>{r.adults}</td>
                      <td className={TDNUM}>{r.kids}</td>
                      <td className={TDNUM}>{r.units}</td>
                      <td className={TDNUM}>{mur(r.revenue)}</td>
                    </tr>
                  ))}
                  {exps.length === 0 && <tr><td className={cn(TD, 'text-[rgba(52,0,87,.5)]')} colSpan={7}>No experiences sold in this period.</td></tr>}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="flex gap-[10px] flex-wrap items-center">
            <ExportLink href={exportUrl('bookings', from, to)} label="All bookings in this period (CSV)" />
            <span className="font-mono text-[9.5px] tracking-[.08em] text-[rgba(52,0,87,.7)]">OPENS IN EXCEL / GOOGLE SHEETS · FIGURES BY VISIT DATE, CANCELLED EXCLUDED FROM REVENUE</span>
          </div>
        </>
      )}
    </div>
  );
}
