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
export function BarChart({ points, height = 150 }: { points: { label: string; value: number; sub?: string }[]; height?: number }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const n = points.length || 1;
  const w = 100 / n;
  return (
    <div style={{ padding: '12px 14px 6px' }}>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }} role="img" aria-label="Daily revenue">
        {points.map((p, i) => {
          const h = (p.value / max) * (height - 18);
          return (
            <g key={p.label}>
              <rect x={i * w + w * 0.15} y={height - 14 - h} width={w * 0.7} height={h} rx={0.6} fill={p.value ? '#7333FF' : '#EBE2FF'}>
                <title>{p.label}: {mur(p.value)}{p.sub ? ' · ' + p.sub : ''}</title>
              </rect>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...mono, fontSize: 9, letterSpacing: '.08em', color: 'rgba(52,0,87,.55)', marginTop: 4 }}>
        <span>{points[0]?.label ?? ''}</span>
        <span>{points[Math.floor(n / 2)]?.label ?? ''}</span>
        <span>{points[n - 1]?.label ?? ''}</span>
      </div>
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
