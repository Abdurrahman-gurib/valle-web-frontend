import { Bar, BarChart as RBarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { mur } from '../../lib/format';
import { cn } from '../../lib/utils';
import { cardCls, displayCls, mono, monoCls } from './ui';

/** Shared bits for the Reports, Reconciliation and Forecast tabs. */

export const th: CSSProperties = {
  ...mono, fontSize: 9.5, fontWeight: 700, letterSpacing: '.13em', textTransform: 'uppercase',
  color: '#7333FF', textAlign: 'left', padding: '10px 12px', whiteSpace: 'nowrap',
};
export const td: CSSProperties = { padding: '10px 12px', fontSize: 13.5, borderTop: '1px solid #EBE2FF', whiteSpace: 'nowrap' };
export const tdNum: CSSProperties = { ...td, ...mono, textAlign: 'right', fontSize: 12.5 };

/* Class-name twins of th / td / tdNum, for Tailwind markup. */
export const thCls = 'font-mono text-[9.5px] font-bold tracking-[.13em] uppercase text-valle-violet text-left px-[12px] py-[10px] whitespace-nowrap';
export const tdCls = 'px-[12px] py-[10px] text-[13.5px] border-t border-t-valle-lilac whitespace-nowrap';
export const tdNumCls = cn(tdCls, 'font-mono text-right text-[12.5px]');

export const todayIsoPark = (): string => new Date().toLocaleDateString('en-CA', { timeZone: 'Indian/Mauritius' });
export const addDays = (iso: string, n: number): string => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const monthStart = (iso: string) => iso.slice(0, 8) + '01';
export const monthEnd = (iso: string) => {
  const y = Number(iso.slice(0, 4)); const m = Number(iso.slice(5, 7));
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};
export const prevMonth = (iso: string) => {
  const y = Number(iso.slice(0, 4)); const m = Number(iso.slice(5, 7));
  const d = new Date(Date.UTC(y, m - 2, 1));
  return d.toISOString().slice(0, 10);
};

export function Kpi({ tag, value, sub, accent }: { tag: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className={cn(cardCls, 'px-[16px] py-[14px]')} style={{ borderLeft: accent ? '4px solid ' + accent : undefined }}>
      <div className={cn(monoCls, 'text-[9.5px] font-bold tracking-[.14em] text-valle-violet')}>{tag}</div>
      <div className={cn(displayCls, 'mt-[4px] text-[26px] tracking-[-0.01em]')}>{value}</div>
      {sub && <div className="mt-[2px] text-[12px] text-[rgba(52,0,87,.6)]">{sub}</div>}
    </div>
  );
}

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className={cn(cardCls, 'mb-[14px] overflow-hidden')}>
      <div className="flex flex-wrap items-center justify-between gap-[10px] border-b border-b-valle-lilac px-[14px] py-[12px]">
        <div className={cn(monoCls, 'text-[10.5px] font-bold tracking-[.14em] text-valle-purple')}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Same-origin CSV link styled as a button. */
export function ExportLink({ href, label = 'Export CSV' }: { href: string; label?: string }) {
  const [h, setH] = useState(false);
  return (
    <a
      href={href}
      download
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      data-testid="export-csv"
      className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-[999px] border-[1.5px] border-valle-purple bg-transparent px-[14px] py-[8px] text-[12.5px] font-bold hover:bg-valle-purple"
      style={{ color: h ? '#FFFFFF' : '#340057', textDecoration: 'none' }}
    >
      ⭳ {label}
    </a>
  );
}

/** Plain SVG bars: one per day, revenue as height, hover title with the figures. */
type Point = { label: string; value: number; sub?: string };
function ChartTip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  const p = active ? payload?.[0]?.payload : undefined;
  if (!p) return null;
  return (
    <div className="rounded-[10px] bg-valle-purple px-[11px] py-[8px] text-[12.5px] text-white shadow-[0_12px_28px_-12px_rgba(38,0,64,.6)]">
      <div className={cn(monoCls, 'text-[10px] tracking-[.1em] opacity-70')}>{p.label}</div>
      <div className="mt-[2px] font-bold">{mur(p.value)}</div>
      {p.sub && <div className="mt-[2px] opacity-75">{p.sub}</div>}
    </div>
  );
}

/** Daily revenue bars (Recharts): responsive, with a tooltip per day and a rupee axis. */
export function BarChart({ points, height = 170 }: { points: Point[]; height?: number }) {
  return (
    <div className="px-[10px] pt-[12px] pb-[6px]" role="img" aria-label="Daily revenue" data-testid="revenue-chart">
      <ResponsiveContainer width="100%" height={height}>
        <RBarChart data={points} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#EBE2FF" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} tick={{ fontSize: 10, fill: 'rgba(52,0,87,.7)', fontFamily: "'Chivo Mono',monospace" }} />
          <YAxis width={58} tickLine={false} axisLine={false} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} tick={{ fontSize: 10, fill: 'rgba(52,0,87,.7)', fontFamily: "'Chivo Mono',monospace" }} />
          <Tooltip cursor={{ fill: 'rgba(115,51,255,.08)' }} content={<ChartTip />} />
          <Bar dataKey="value" fill="#7333FF" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BreakdownTable({ rows, label, total }: { rows: { key: string; bookings: number; guests: number; revenue: number }[]; label: (k: string) => string; total: number }) {
  return (
    <table className="w-full border-collapse">
      <thead><tr className="bg-[#F7F3FF]"><th className={thCls}>Group</th><th className={cn(thCls, 'text-right')}>Bookings</th><th className={cn(thCls, 'text-right')}>Guests</th><th className={cn(thCls, 'text-right')}>Revenue</th><th className={cn(thCls, 'text-right')}>Share</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}>
            <td className={tdCls}>{label(r.key)}</td>
            <td className={tdNumCls}>{r.bookings}</td>
            <td className={tdNumCls}>{r.guests}</td>
            <td className={tdNumCls}>{mur(r.revenue)}</td>
            <td className={tdNumCls}>{total ? Math.round((r.revenue / total) * 100) : 0}%</td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td className={cn(tdCls, 'text-[rgba(52,0,87,.5)]')} colSpan={5}>Nothing in this period.</td></tr>}
      </tbody>
    </table>
  );
}

export const STATUS_LABEL: Record<string, string> = { confirmed: 'Confirmed', arrived: 'Arrived', cancelled: 'Cancelled' };
export const PAY_LABEL: Record<string, string> = { gate: 'Pay at gate', online: 'Paid online' };
export const RATE_LABEL: Record<string, string> = { rr: 'Resident (RR)', nr: 'Visitor (NR)' };
export const SLOT_LABEL: Record<string, string> = { morning: 'Morning', afternoon: 'Afternoon' };
