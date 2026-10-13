import { Bar, BarChart as RBarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { mur } from '../../lib/format';
import { card, display, mono } from './ui';

/** Shared bits for the Reports, Reconciliation and Forecast tabs. */

export const th: CSSProperties = {
  ...mono, fontSize: 9.5, fontWeight: 700, letterSpacing: '.13em', textTransform: 'uppercase',
  color: '#7333FF', textAlign: 'left', padding: '10px 12px', whiteSpace: 'nowrap',
};
export const td: CSSProperties = { padding: '10px 12px', fontSize: 13.5, borderTop: '1px solid #EBE2FF', whiteSpace: 'nowrap' };
export const tdNum: CSSProperties = { ...td, ...mono, textAlign: 'right', fontSize: 12.5 };

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
    <div style={{ ...card, padding: '14px 16px', borderLeft: accent ? '4px solid ' + accent : undefined }}>
      <div style={{ ...mono, fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', color: '#7333FF' }}>{tag}</div>
      <div style={{ ...display, fontSize: 26, letterSpacing: '-0.01em', marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'rgba(52,0,87,.6)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ ...card, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 14px', borderBottom: '1px solid #EBE2FF', flexWrap: 'wrap' }}>
        <div style={{ ...mono, fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em', color: '#340057' }}>{title}</div>
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
      style={{
        border: '1.5px solid #340057', background: h ? '#340057' : 'transparent', color: h ? '#FFFFFF' : '#340057',
        borderRadius: 999, padding: '8px 14px', fontSize: 12.5, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}
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
    <div style={{ background: '#340057', color: '#FFFFFF', borderRadius: 10, padding: '8px 11px', fontSize: 12.5, boxShadow: '0 12px 28px -12px rgba(38,0,64,.6)' }}>
      <div style={{ ...mono, fontSize: 10, letterSpacing: '.1em', opacity: 0.7 }}>{p.label}</div>
      <div style={{ fontWeight: 700, marginTop: 2 }}>{mur(p.value)}</div>
      {p.sub && <div style={{ opacity: 0.75, marginTop: 2 }}>{p.sub}</div>}
    </div>
  );
}

/** Daily revenue bars (Recharts): responsive, with a tooltip per day and a rupee axis. */
export function BarChart({ points, height = 170 }: { points: Point[]; height?: number }) {
  return (
    <div style={{ padding: '12px 10px 6px' }} role="img" aria-label="Daily revenue" data-testid="revenue-chart">
      <ResponsiveContainer width="100%" height={height}>
        <RBarChart data={points} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#EBE2FF" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} tick={{ fontSize: 10, fill: 'rgba(52,0,87,.55)', fontFamily: "'Chivo Mono',monospace" }} />
          <YAxis width={58} tickLine={false} axisLine={false} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} tick={{ fontSize: 10, fill: 'rgba(52,0,87,.55)', fontFamily: "'Chivo Mono',monospace" }} />
          <Tooltip cursor={{ fill: 'rgba(115,51,255,.08)' }} content={<ChartTip />} />
          <Bar dataKey="value" fill="#7333FF" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BreakdownTable({ rows, label, total }: { rows: { key: string; bookings: number; guests: number; revenue: number }[]; label: (k: string) => string; total: number }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr style={{ background: '#F7F3FF' }}><th style={th}>Group</th><th style={{ ...th, textAlign: 'right' }}>Bookings</th><th style={{ ...th, textAlign: 'right' }}>Guests</th><th style={{ ...th, textAlign: 'right' }}>Revenue</th><th style={{ ...th, textAlign: 'right' }}>Share</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}>
            <td style={td}>{label(r.key)}</td>
            <td style={tdNum}>{r.bookings}</td>
            <td style={tdNum}>{r.guests}</td>
            <td style={tdNum}>{mur(r.revenue)}</td>
            <td style={tdNum}>{total ? Math.round((r.revenue / total) * 100) : 0}%</td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td style={{ ...td, color: 'rgba(52,0,87,.5)' }} colSpan={5}>Nothing in this period.</td></tr>}
      </tbody>
    </table>
  );
}

export const STATUS_LABEL: Record<string, string> = { confirmed: 'Confirmed', arrived: 'Arrived', cancelled: 'Cancelled' };
export const PAY_LABEL: Record<string, string> = { gate: 'Pay at gate', online: 'Paid online' };
export const RATE_LABEL: Record<string, string> = { rr: 'Resident (RR)', nr: 'Visitor (NR)' };
export const SLOT_LABEL: Record<string, string> = { morning: 'Morning', afternoon: 'Afternoon' };
