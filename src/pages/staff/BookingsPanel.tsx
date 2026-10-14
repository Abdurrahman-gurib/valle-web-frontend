import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { BookingRow, BookingStatus, PayMode, RateKey, SlotKey } from '../../types';
import {
  exportUrl, getBooking, getGateView, isHttpError, listBookings, postponeBooking, receiptPdfUrl, recordPayment, refundPayment, resendTicket, resendWaiver, updateBooking,
  type PaymentMethod,
  type BookingAuditEntry, type BookingDetailFull, type BookingPatch, type BookingSort,
} from '../../lib/staffApi';
import { NATC } from '../../lib/format';
import NewBookingDrawer from './NewBookingDrawer';
import { PhotosSection } from './PhotosSection';
import { LineEditor, type EditableLine } from './LineEditor';
import { ExportLink } from './reportUi';
import { mur as money, partyLabel } from '../../lib/format';
import { cn } from '../../lib/utils';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Stripes } from '../../components/Stripes';
import {
  Btn, EmptyState, Field, RatePill, SectionLabel, Spinner, StatusChip, TotalTag,
  clockTimeSec, dateTimeSec, inputStyle, shortDate, textareaStyle, usePrefersReducedMotion,
} from './ui';

const PAGE_SIZE = 20;

const COLS = ['Ref', 'Booked at', 'Date', 'Slot', 'Guest', 'Party', 'Rate', 'Pay', 'Total', 'Status'];

const th = 'whitespace-nowrap px-3 py-2.5 text-left font-mono text-[9.5px] font-bold uppercase tracking-[.13em] text-valle-violet';

const td = 'whitespace-nowrap border-t border-solid border-valle-lilac px-3 py-[11px] text-[13.5px]';

/** The shared card surface (ui.tsx `card`) as classes, so a fill can override it. */
const cardCls = 'rounded-[18px] border-[1.5px] border-solid border-valle-lilac bg-white';
/** The shared field look (ui.tsx `inputStyle`) as classes, so a width can override it. */
const inputCls = 'w-full rounded-[12px] border-[1.5px] border-solid border-valle-lilac bg-[#F7F3FF] px-3.5 py-[11px] [font-family:inherit] text-[14.5px] text-valle-purple outline-none';
const tagCls = 'font-mono text-[9.5px] font-bold tracking-[.13em] text-valle-violet';

const slotLabel = (s: string) => (s === 'morning' ? 'Morning' : s === 'afternoon' ? 'Afternoon' : s);
const rateLabel = (r: string) => (r === 'rr' ? 'Resident (RR)' : 'Visitor (NR)');
const payLabel = (p: string) => (p === 'gate' ? 'At gate' : 'Online');

/** Field names as an operator reads them, used by the form and the audit trail. */
const FIELD_LABEL: Record<string, string> = {
  visitDate: 'Visit date', slot: 'Slot', adults: 'Adults', kids: 'Children', rate: 'Rate',
  guestName: 'Guest', phone: 'Phone', email: 'Email', nationality: 'Nationality',
  payMode: 'Payment', status: 'Status', staffNote: 'Internal note',
  entryAmount: 'Park entry', subtotal: 'Subtotal', discount: 'Discount', total: 'Total',
  currency: 'Currency', lines: 'Line items',
};

/** Filter <select> styled like the booking form's fields. */
function Select({ value, onChange, children, width, id, ariaLabel }: {
  value: string; onChange: (v: string) => void; children: ReactNode;
  width?: number | string; id?: string; ariaLabel?: string;
}) {
  return (
    <select
      id={id}
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="cursor-pointer appearance-auto"
      style={{ ...inputStyle, width: width ?? 'auto' }}
    >
      {children}
    </select>
  );
}

function TableRow({ row, onOpen }: { row: BookingRow; onOpen: (ref: string) => void }) {
  return (
    <tr
      onClick={() => onOpen(row.refCode)}
      className="cursor-pointer bg-white transition-[background] duration-[120ms] ease-[ease] hover:bg-[#F7F3FF]"
    >
      <td className={cn(td, 'font-mono text-[12.5px] font-bold')}>{row.refCode}</td>
      <td className={td} data-testid="booked-at">
        <div className="text-[12.5px]">{shortDate(row.createdAt)}</div>
        <div className="font-mono text-[11px] font-bold text-valle-violet">{clockTimeSec(row.createdAt)}</div>
      </td>
      <td className={td}>{shortDate(row.visitDate)}</td>
      <td className={td}>{slotLabel(row.slot)}</td>
      <td className={cn(td, 'font-semibold')}>{row.guestName}</td>
      <td className={td}>{partyLabel(row.adults, row.kids)}</td>
      <td className={td}><RatePill rate={row.rate} size="sm" /></td>
      <td className={td}>{payLabel(row.payMode)}</td>
      <td className={cn(td, 'font-display text-[17px] font-black uppercase italic tracking-[-0.01em]')}>{money(row.total)}</td>
      <td className={td}><StatusChip status={row.status} /></td>
    </tr>
  );
}

/** Phone number as a wa.me target: digits only, no leading zeros or plus. */
const waDigits = (phone: string | null | undefined): string => (phone || '').replace(/\D/g, '').replace(/^0+/, '');

/** A confirmation the desk can paste into WhatsApp, an e-mail or an SMS. */
function confirmationText(d: BookingDetailFull): string {
  const lines = (d.lines || []).map((l) => `• ${l.label}: ${money(l.amount)}`).join('\n');
  return [
    `VALLÉ Advenature™ Park · booking ${d.refCode}`,
    `Guest: ${d.guestName} · ${partyLabel(d.adults, d.kids)} · ${rateLabel(d.rate)}`,
    `Visit: ${shortDate(d.visitDate)}, ${slotLabel(d.slot).toLowerCase()} arrival (${d.slot === 'morning' ? '09:00–12:00' : '12:00–15:30'})`,
    lines,
    `Total: ${money(d.total)} · ${(d.balance ?? d.total) > 0 ? `${money(d.balance ?? d.total)} to pay on arrival` : 'paid'}`,
    d.ticketUrl ? `Your ticket with QR code: ${d.ticketUrl}` : '',
    'Show it at the gate. B102, Mare Anguilles, Chamouny · +230 660 44 77',
  ].filter(Boolean).join('\n');
}

/** WhatsApp / call / e-mail the guest, or copy the confirmation to paste anywhere. */
function ContactActions({ data }: { data: BookingDetailFull }) {
  const [copied, setCopied] = useState(false);
  const [resent, setResent] = useState('');
  const [waiverSent, setWaiverSent] = useState('');
  const [waivers, setWaivers] = useState<{ signed: number; required: number; url: string } | null>(null);
  useEffect(() => {
    let dead = false;
    getGateView(data.refCode)
      .then((g) => { if (!dead) setWaivers({ signed: g.signedCount, required: g.required, url: g.waiverUrl }); })
      .catch(() => { /* older API: no waivers */ });
    return () => { dead = true; };
  }, [data.refCode]);
  const resend = async () => {
    setResent('…');
    try {
      const r = await resendTicket(data.refCode);
      setResent(r.email || r.whatsapp ? `Sent${r.email ? ' by e-mail' : ''}${r.whatsapp ? ' and WhatsApp' : ''} ✓` : 'Nothing sent: no e-mail / mail is off');
    } catch {
      setResent('Could not send');
    }
    setTimeout(() => setResent(''), 4000);
  };
  const sendWaiver = async () => {
    setWaiverSent('…');
    try {
      const r = await resendWaiver(data.refCode);
      setWaiverSent(r.email || r.whatsapp ? `Sent${r.email ? ' by e-mail' : ''}${r.whatsapp ? ' and WhatsApp' : ''} ✓` : 'Nothing sent: no e-mail / mail is off');
    } catch {
      setWaiverSent('Could not send');
    }
    setTimeout(() => setWaiverSent(''), 4000);
  };
  const wa = waDigits(data.phone);
  const text = confirmationText(data);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ }
  };
  const a = 'cursor-pointer whitespace-nowrap rounded-full border-[1.5px] border-solid border-valle-purple bg-white px-3 py-[7px] [font-family:inherit] text-[12px] font-bold';
  const btn = cn(a, 'text-valle-purple no-underline');
  // global a{color} rules beat utilities, so link colour stays inline
  const link: CSSProperties = { color: '#340057', textDecoration: 'none' };
  return (
    <div className="mb-4 flex flex-wrap gap-1.5" data-testid="contact-actions">
      {wa && <a href={`https://wa.me/${wa}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className={a} style={link}>WhatsApp</a>}
      {data.phone && <a href={`tel:${data.phone.replace(/\s+/g, '')}`} className={a} style={link}>Call</a>}
      {data.email && <a href={`mailto:${data.email}?subject=${encodeURIComponent('Your VALLÉ booking ' + data.refCode)}&body=${encodeURIComponent(text)}`} className={a} style={link}>E-mail</a>}
      <button type="button" onClick={() => { void copy(); }} className={cn(btn, copied && 'bg-[#E2FFEB]')}>{copied ? 'Copied ✓' : 'Copy confirmation'}</button>
      {data.ticketUrl && <a href={data.ticketUrl} target="_blank" rel="noopener noreferrer" className={a} style={link}>Ticket</a>}
      <button type="button" onClick={() => { void resend(); }} disabled={resent === '…'} data-testid="resend-ticket" className={cn(btn, resent && resent !== '…' && 'bg-[#E2FFEB]')}>{resent || 'Resend ticket'}</button>
      {waivers && (
        <a href={waivers.url} target="_blank" rel="noopener noreferrer" data-testid="drawer-waivers" title="Waiver form for this booking (send it to the guest)" className={a} style={{ ...link, borderColor: waivers.signed >= waivers.required ? '#1E9E4A' : '#D91E44', color: waivers.signed >= waivers.required ? '#1E9E4A' : '#D91E44' }}>
          Waivers {Math.min(waivers.signed, waivers.required)}/{waivers.required}
        </a>
      )}
      {waivers && waivers.signed < waivers.required && data.status !== 'cancelled' && (
        <button type="button" onClick={() => { void sendWaiver(); }} disabled={waiverSent === '…'} data-testid="resend-waiver" title="E-mail (and WhatsApp when possible) the link to sign the waivers" className={cn(btn, waiverSent && waiverSent !== '…' && 'bg-[#E2FFEB]')}>
          {waiverSent || 'Resend waiver form'}
        </button>
      )}
      {data.ticketSentAt && <span className="self-center font-mono text-[9.5px] tracking-[.08em] text-valle-purple/50">TICKET SENT {dateTimeSec(data.ticketSentAt).toUpperCase()}</span>}
    </div>
  );
}

function linesToEditable(d: BookingDetailFull): EditableLine[] {
  // experience lines only: park entry (no experience id) is regenerated by the server from the party
  return (d.lines ?? [])
    .filter((l) => !!l.experienceId || !!l.productKey)
    .map((l) => ({ id: l.experienceId ?? ('product:' + l.productKey), variant: l.variant || undefined, adults: l.adults, kids: l.kids, units: l.units }));
}
function adjustmentLabel(d: BookingDetailFull): string {
  const k = d.adjustmentKind;
  const base = k === 'foc' ? 'FOC pass' : k === 'entry_free' ? 'Free park entry' : k === 'percent' ? `Discount ${d.adjustmentValue}%` : 'Discount';
  return base + (d.couponCode ? ` · code ${d.couponCode}` : '') + (d.adjustmentNote ? ` · ${d.adjustmentNote}` : '');
}

function DetailLine({ tag, value }: { tag: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className={tagCls}>{tag}</div>
      <div className="mt-[3px] text-[14px] [word-break:break-word]">{value || 'N/A'}</div>
    </div>
  );
}

// ------------------------------------------------------------------ editing --

/** Every editable field, held as strings so the inputs stay controlled. */
interface Draft {
  visitDate: string;
  slot: string;
  adults: string;
  kids: string;
  rate: string;
  guestName: string;
  phone: string;
  email: string;
  nationality: string;
  payMode: string;
  status: string;
  staffNote: string;
  adjustmentKind: string;
  adjustmentValue: string;
  adjustmentNote: string;
  couponCode: string;
}

function toDraft(d: BookingDetailFull): Draft {
  return {
    visitDate: (d.visitDate || '').slice(0, 10),
    slot: d.slot,
    adults: String(d.adults),
    kids: String(d.kids),
    rate: d.rate,
    guestName: d.guestName || '',
    phone: d.phone || '',
    email: d.email || '',
    nationality: d.nationality || '',
    payMode: d.payMode,
    status: d.status,
    staffNote: d.staffNote || '',
    adjustmentKind: d.adjustmentKind || 'none',
    adjustmentValue: String(d.adjustmentValue ?? 0),
    adjustmentNote: d.adjustmentNote || '',
    couponCode: d.couponCode || '',
  };
}

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T12:00:00').getTime());

/** Mirrors the server DTO closely enough to catch mistakes before the round trip. */
function validate(f: Draft): Record<string, string> {
  const e: Record<string, string> = {};
  if (!isDate(f.visitDate)) e.visitDate = 'Pick a valid date';
  const a = Number(f.adults);
  const k = Number(f.kids);
  if (!Number.isInteger(a) || a < 1 || a > 12) e.adults = '1 to 12';
  if (!Number.isInteger(k) || k < 0 || k > 12) e.kids = '0 to 12';
  const name = f.guestName.trim();
  if (name.length < 2 || name.length > 120) e.guestName = '2 to 120 characters';
  if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Not a valid email';
  if (f.phone.trim().length > 40) e.phone = 'Too long';
  if (f.nationality.trim().length > 80) e.nationality = 'Too long';
  if (f.staffNote.length > 2000) e.staffNote = 'Too long';
  return e;
}

/** Only the fields that actually moved: the server logs one audit row per change. */
function buildPatch(d: BookingDetailFull, f: Draft): BookingPatch {
  const base = toDraft(d);
  const p: BookingPatch = {};
  if (f.visitDate !== base.visitDate) p.visitDate = f.visitDate;
  if (f.slot !== base.slot) p.slot = f.slot as SlotKey;
  if (f.adults !== base.adults) p.adults = Number(f.adults);
  if (f.kids !== base.kids) p.kids = Number(f.kids);
  if (f.rate !== base.rate) p.rate = f.rate as RateKey;
  if (f.guestName.trim() !== base.guestName) p.guestName = f.guestName.trim();
  if (f.phone.trim() !== base.phone) p.phone = f.phone.trim();
  if (f.email.trim() !== base.email) p.email = f.email.trim();
  if (f.nationality.trim() !== base.nationality) p.nationality = f.nationality.trim();
  if (f.payMode !== base.payMode) p.payMode = f.payMode as PayMode;
  if (f.status !== base.status) p.status = f.status as BookingStatus;
  if (f.staffNote !== base.staffNote) p.staffNote = f.staffNote;
  if (f.couponCode.trim().toUpperCase() !== base.couponCode) p.couponCode = f.couponCode.trim().toUpperCase();
  else if (f.adjustmentKind !== base.adjustmentKind || f.adjustmentValue !== base.adjustmentValue || f.adjustmentNote.trim() !== base.adjustmentNote) {
    p.adjustmentKind = f.adjustmentKind as BookingPatch['adjustmentKind'];
    p.adjustmentValue = Number(f.adjustmentValue) || 0;
    p.adjustmentNote = f.adjustmentNote.trim();
  }
  return p;
}

/** Audit values arrive as raw JSON scalars; render them the way the form reads. */
function auditValue(field: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return 'empty';
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (typeof v === 'number') {
    return ['entryAmount', 'subtotal', 'discount', 'total'].includes(field) ? money(v) : String(v);
  }
  if (typeof v === 'string') {
    if (field === 'rate') return rateLabel(v);
    if (field === 'slot') return slotLabel(v);
    if (field === 'payMode') return payLabel(v);
    if (field === 'visitDate') return shortDate(v);
    return v;
  }
  return 'updated';
}

function AuditTrail({ entries }: { entries: BookingAuditEntry[] }) {
  return (
    <div className={cn(cardCls, 'overflow-hidden')}>
      {entries.map((e, i) => {
        const changes = Object.entries(e.changes || {});
        return (
          <div key={e.at + '-' + i} className={cn('px-3.5 py-3', i !== 0 && 'border-t border-solid border-valle-lilac')}>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[.1em] text-valle-violet">
                {e.action || 'update'}
              </span>
              <span className="font-mono text-[9.5px] tracking-[.06em] text-valle-purple/50">
                {shortDate(e.at)}
              </span>
              <span className="flex-1" />
              <span className="text-[12px] break-all text-valle-purple/70">{e.staffEmail}</span>
            </div>
            {changes.length === 0 ? (
              <div className="mt-[5px] text-[12.5px] text-valle-purple/70">No field detail recorded.</div>
            ) : (
              <ul className="mt-[7px] mr-0 mb-0 ml-0 grid list-none gap-1 p-0">
                {changes.map(([k, c]) => (
                  <li key={k} className="text-[12.5px] leading-[1.5] text-valle-purple/80">
                    <span className="font-bold">{FIELD_LABEL[k] || k}</span>
                    {': '}
                    <span className="opacity-70">{auditValue(k, c?.from)}</span>
                    {' → '}
                    <span className="font-semibold">{auditValue(k, c?.to)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Slide-in booking detail. Reading mode shows the money, the line breakdown and
 * the audit trail; Edit mode puts every editable field over
 * `PATCH /api/staff/bookings/:refCode` and re-reads the totals the server sends
 * back, so no price is ever computed in the browser.
 */
function Drawer({ refCode, onClose, onPatched }: {
  refCode: string;
  onClose: () => void;
  onPatched: (row: BookingRow) => void;
}) {
  const reduced = usePrefersReducedMotion();
  const [data, setData] = useState<BookingDetailFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState<BookingStatus | null>(null);
  // 'Cancel booking' asks once before releasing the reservation
  const [confirmCancel, setConfirmCancel] = useState(false);
  // experience lines while editing (a top-up on the day adds to them); null = untouched
  const [editLines, setEditLines] = useState<EditableLine[] | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payReceipt, setPayReceipt] = useState('');
  const [postponeOpen, setPostponeOpen] = useState(false);
  const [postponeReason, setPostponeReason] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Draft | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');

  useEffect(() => {
    let dead = false;
    setLoading(true);
    setErr('');
    getBooking(refCode)
      .then((d) => { if (!dead) setData(d); })
      .catch(() => { if (!dead) setErr('Could not load this booking.'); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [refCode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /** Merge a PATCH response over the loaded detail without dropping the audit. */
  const applyUpdate = useCallback((updated: BookingRow & {
    lines?: BookingDetailFull['lines']; staffNote?: string | null; audit?: BookingAuditEntry[];
  }) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...updated,
        lines: Array.isArray(updated.lines) ? updated.lines : prev.lines,
        audit: Array.isArray(updated.audit) ? updated.audit : prev.audit,
      };
    });
    onPatched(updated);
  }, [onPatched]);

  /** The audit trail is not part of the PATCH contract, so re-read it quietly. */
  const refreshAudit = useCallback(() => {
    getBooking(refCode)
      .then((d) => setData((prev) => (prev ? { ...prev, ...d } : d)))
      .catch(() => { /* the drawer already shows the server's own numbers */ });
  }, [refCode]);

  const quickStatus = async (status: BookingStatus) => {
    if (busy || saving) return;
    setBusy(status);
    setErr('');
    setSaved('');
    try {
      const updated = await updateBooking(refCode, { status });
      applyUpdate(updated);
      refreshAudit();
    } catch {
      setErr('Could not update the status. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const takePayment = async () => {
    if (!data) return;
    const amount = Math.round(Number(payAmount));
    if (!(amount > 0)) { setErr('Enter the amount taken.'); return; }
    setBusy('arrived'); setErr('');
    try {
      const updated = await recordPayment(refCode, { amount, method: payMethod, receiptNo: payReceipt.trim() || undefined });
      applyUpdate(updated); refreshAudit(); setPayOpen(false); setPayAmount(''); setPayReceipt('');
      setSaved(`Payment of ${money(amount)} recorded.`);
    } catch (e) { setErr((e as Error).message || 'Could not record the payment.'); } finally { setBusy(null); }
  };
  const refund = async () => {
    if (!data) return;
    const amount = Math.round(Number(refundAmount));
    if (!(amount > 0)) { setErr('Enter the amount to refund.'); return; }
    setBusy('arrived'); setErr('');
    try {
      const updated = await refundPayment(refCode, { amount, reason: refundReason.trim() || undefined });
      applyUpdate(updated); refreshAudit(); setRefundOpen(false); setRefundAmount(''); setRefundReason('');
      setSaved(`Refund of ${money(amount)} sent through the payment provider.`);
    } catch (e) { setErr((e as Error).message || 'Could not refund.'); } finally { setBusy(null); }
  };
  const postpone = async () => {
    if (!data) return;
    setBusy('postponed'); setErr('');
    try {
      const updated = await postponeBooking(refCode, postponeReason.trim());
      applyUpdate(updated); refreshAudit(); setPostponeOpen(false); setPostponeReason('');
      setSaved('Postponed. The payment stays on the booking; pick the new date with Edit when the guest calls.');
    } catch (e) { setErr((e as Error).message || 'Could not postpone.'); } finally { setBusy(null); }
  };

  const startEdit = () => {
    if (!data) return;
    setEditLines(null);
    setForm(toDraft(data));
    setFieldErr({});
    setErr('');
    setSaved('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(null);
    setEditLines(null);
    setFieldErr({});
    setErr('');
  };

  const save = async () => {
    if (!data || !form || saving) return;
    const problems = validate(form);
    setFieldErr(problems);
    if (Object.keys(problems).length > 0) {
      setErr('Fix the highlighted fields, then save again.');
      return;
    }
    const patch = buildPatch(data, form);
    if (editLines) patch.items = editLines.map((l) => ({ id: l.id, variant: l.variant, adults: l.adults || undefined, kids: l.kids || undefined, units: l.units || undefined }));
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      setForm(null);
      setSaved('Nothing changed.');
      return;
    }

    setSaving(true);
    setErr('');
    try {
      const updated = await updateBooking(refCode, patch);
      applyUpdate(updated);
      refreshAudit();
      setEditing(false);
      setForm(null);
      setEditLines(null);
      setSaved('Saved. The totals below come from the server.');
    } catch (e) {
      // The edit endpoint may not be live yet, and a rejected DTO comes back the
      // same way: keep the operator in the form with their typing intact.
      if (isHttpError(e) && e.status === 404) {
        setErr('This booking could not be found, or editing is not available on this server yet.');
      } else if (isHttpError(e) && e.status >= 400 && e.status < 500) {
        setErr(e.message || 'The server rejected these changes.');
      } else {
        setErr('Could not save these changes. Check your connection and try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const set = (k: keyof Draft) => (v: string) => setForm((p) => (p ? { ...p, [k]: v } : p));

  const grid = 'grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3';

  const audit = data?.audit ?? [];
  // Defensive: an API that has not shipped the richer payload could omit these.
  const lines = data?.lines ?? [];

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[95] bg-[rgba(31,0,51,.55)] backdrop-blur-[3px] [animation:vfade_.2s_ease_both]"
      />
      <aside
        role="dialog"
        aria-label={'Booking ' + refCode}
        className={cn(
          'fixed top-1/2 left-1/2 z-[96] flex max-h-[min(100vh_-_24px,920px)] w-[min(100vw_-_24px,620px)] flex-col overflow-hidden rounded-[22px] bg-white',
          '[transform:translate(-50%,-50%)] shadow-[0_40px_90px_-30px_rgba(38,0,64,.6)]',
          reduced ? '[animation:vfade_.2s_ease_both]' : '[animation:vcenterpop_.25s_cubic-bezier(.2,.7,.2,1)_both]',
        )}
      >
        <div className="flex items-center gap-3 bg-valle-purple px-5 py-4 text-white">
          <div className="min-w-0">
            <div className="font-mono text-[9.5px] font-bold tracking-[.14em] text-white/60">
              {editing ? 'EDITING BOOKING' : 'BOOKING'}
            </div>
            <div className="font-display text-[26px] leading-[1.05] font-black uppercase italic">{refCode}</div>
          </div>
          <span className="flex-1" />
          {data && (
            <div className="shrink-0 text-right">
              <div className="font-mono text-[9px] font-bold tracking-[.14em] text-white/55">
                TOTAL
              </div>
              <div className="font-display text-[24px] leading-[1.1] font-black uppercase italic text-valle-yellow">{money(data.total)}</div>
            </div>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="press h-[34px] w-[34px] shrink-0 cursor-pointer rounded-full border-[1.5px] border-solid border-white/32 bg-transparent text-[16px] leading-none text-white"
          >
            ×
          </button>
        </div>
        <Stripes height={6} />

        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex justify-center px-0 py-10">
              <Spinner color="#7333FF" size={9} />
            </div>
          )}

          {!loading && err && !data && (
            <div className="text-[14px] font-semibold text-[#D91E44]">{err}</div>
          )}

          {data && (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-[9px]">
                <StatusChip status={data.status} />
                <RatePill rate={data.rate} />
                <span className="font-mono text-[10px] tracking-[.1em] text-valle-purple/50" data-testid="drawer-booked-at">
                  BOOKED {dateTimeSec(data.createdAt).toUpperCase()}
                </span>
              </div>
              {!editing && <ContactActions data={data} />}

              {editing && form ? (
                /* ------------------------------------------------------ edit -- */
                <div className="grid gap-3.5">
                  <div className={grid}>
                    <Field id="bk-date" tag="VISIT DATE" hint={fieldErr.visitDate}>
                      <input
                        id="bk-date" type="date" value={form.visitDate}
                        onChange={(e) => set('visitDate')(e.target.value)}
                        style={inputStyle}
                      />
                    </Field>
                    <Field id="bk-slot" tag="SLOT">
                      <Select id="bk-slot" value={form.slot} onChange={set('slot')} width="100%">
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                      </Select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-[repeat(auto-fit,minmax(118px,1fr))] gap-3">
                    <Field id="bk-adults" tag="ADULTS" hint={fieldErr.adults}>
                      <input
                        id="bk-adults" type="number" min={1} max={12} value={form.adults}
                        onChange={(e) => set('adults')(e.target.value)}
                        style={inputStyle}
                      />
                    </Field>
                    <Field id="bk-kids" tag="CHILDREN" hint={fieldErr.kids}>
                      <input
                        id="bk-kids" type="number" min={0} max={12} value={form.kids}
                        onChange={(e) => set('kids')(e.target.value)}
                        style={inputStyle}
                      />
                    </Field>
                    <Field id="bk-rate" tag="RATE">
                      <Select id="bk-rate" value={form.rate} onChange={set('rate')} width="100%">
                        <option value="rr">RR · Resident</option>
                        <option value="nr">NR · Visitor</option>
                      </Select>
                    </Field>
                  </div>

                  <div className="rounded-[12px] border-[1.5px] border-solid border-valle-lilac bg-[#F7F3FF] px-3 py-[9px] font-mono text-[10px] leading-[1.5] tracking-[.06em] text-valle-purple/60">
                    CHANGING THE PARTY OR THE RATE RE-PRICES THE BOOKING ON THE SERVER.
                  </div>

                  <Field id="bk-name" tag="GUEST NAME" hint={fieldErr.guestName}>
                    <input id="bk-name" value={form.guestName} onChange={(e) => set('guestName')(e.target.value)} style={inputStyle} />
                  </Field>

                  <div className={grid}>
                    <Field id="bk-phone" tag="PHONE" hint={fieldErr.phone}>
                      <input id="bk-phone" value={form.phone} onChange={(e) => set('phone')(e.target.value)} style={inputStyle} />
                    </Field>
                    <Field id="bk-email" tag="EMAIL" hint={fieldErr.email}>
                      <input id="bk-email" type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} style={inputStyle} />
                    </Field>
                  </div>

                  <div className={grid}>
                    <Field id="bk-nat" tag="NATIONALITY" hint={fieldErr.nationality}>
                      <input id="bk-nat" value={form.nationality} onChange={(e) => set('nationality')(e.target.value)} style={inputStyle} />
                    </Field>
                    <Field id="bk-pay" tag="PAYMENT">
                      <Select id="bk-pay" value={form.payMode} onChange={set('payMode')} width="100%">
                        <option value="gate">At gate</option>
                        <option value="online">Online</option>
                      </Select>
                    </Field>
                    <Field id="bk-status" tag="STATUS">
                      <Select id="bk-status" value={form.status} onChange={set('status')} width="100%">
                        <option value="confirmed">Confirmed</option>
                        <option value="arrived">Arrived</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="postponed">Postponed (weather)</option>
                      </Select>
                    </Field>
                  </div>

                  <SectionLabel>EXPERIENCES · ADD A TOP-UP OR REMOVE</SectionLabel>
                  <LineEditor
                    lines={editLines ?? linesToEditable(data)}
                    onChange={setEditLines}
                    adults={Number(form.adults) || 1}
                    kids={Number(form.kids) || 0}
                    rate={(form.rate as RateKey) || 'rr'}
                  />

                  <SectionLabel>FOC PASS · DISCOUNT · CODE</SectionLabel>
                  <div className={grid}>
                    <Field id="bk-adj" tag="ADJUSTMENT">
                      <Select id="bk-adj" value={form.adjustmentKind} onChange={(v) => { set('adjustmentKind')(v); set('couponCode')(''); }} width="100%">
                        <option value="none">None</option>
                        <option value="percent">Percentage off</option>
                        <option value="amount">Rupees off</option>
                        <option value="entry_free">Free park entry</option>
                        <option value="foc">FOC: everything free</option>
                      </Select>
                    </Field>
                    {(form.adjustmentKind === 'percent' || form.adjustmentKind === 'amount') && (
                      <Field id="bk-adjv" tag={form.adjustmentKind === 'percent' ? 'PERCENT' : 'RUPEES'}>
                        <input id="bk-adjv" type="number" min={0} value={form.adjustmentValue} onChange={(e) => set('adjustmentValue')(e.target.value)} style={inputStyle} data-testid="adj-value" />
                      </Field>
                    )}
                    <Field id="bk-adjn" tag="REASON / PASS NUMBER" hint="Shown on the receipt">
                      <input id="bk-adjn" value={form.adjustmentNote} onChange={(e) => set('adjustmentNote')(e.target.value)} placeholder="FOC pass #12 · hotel partner" style={inputStyle} data-testid="adj-note" />
                    </Field>
                    <Field id="bk-coupon" tag="OR A CODE" hint="A code replaces the manual adjustment">
                      <input id="bk-coupon" value={form.couponCode} onChange={(e) => set('couponCode')(e.target.value.toUpperCase())} placeholder="HOTEL10" className={cn(inputCls, 'font-mono uppercase')} data-testid="adj-coupon" />
                    </Field>
                  </div>

                  <Field id="bk-note" tag="INTERNAL NOTE" hint={fieldErr.staffNote}>
                    <textarea
                      id="bk-note"
                      value={form.staffNote}
                      maxLength={2000}
                      onChange={(e) => set('staffNote')(e.target.value)}
                      placeholder="Visible to the team only, never to the guest."
                      style={textareaStyle}
                    />
                  </Field>
                </div>
              ) : (
                /* ------------------------------------------------------ read -- */
                <div className={cn(cardCls, 'grid grid-cols-[1fr_1fr] gap-3.5 bg-[#F7F3FF] p-4')}>
                  <DetailLine tag="GUEST" value={data.guestName} />
                  <DetailLine tag="PARTY" value={partyLabel(data.adults, data.kids)} />
                  <DetailLine tag="EMAIL" value={data.email || ''} />
                  <DetailLine tag="PHONE" value={data.phone || ''} />
                  <DetailLine tag="NATIONALITY" value={data.nationality || ''} />
                  <DetailLine tag="RATE" value={rateLabel(data.rate)} />
                  <DetailLine tag="VISIT" value={shortDate(data.visitDate)} />
                  <DetailLine tag="SLOT" value={slotLabel(data.slot)} />
                  <DetailLine tag="PAYMENT" value={payLabel(data.payMode)} />
                  <DetailLine tag="CURRENCY" value={data.currency} />
                </div>
              )}

              {!editing && data.staffNote && (
                <>
                  <SectionLabel>INTERNAL NOTE</SectionLabel>
                  <div className={cn(cardCls, 'border-[rgba(138,122,0,.25)] bg-[#FFFFE2] p-3.5 text-[13.5px] leading-[1.55] whitespace-pre-wrap [word-break:break-word]')}>
                    {data.staffNote}
                  </div>
                </>
              )}

              <SectionLabel>LINE ITEMS</SectionLabel>
              <div className={cn(cardCls, 'overflow-hidden')}>
                {lines.length === 0 && (
                  <div className="p-3.5 text-[13.5px] text-valle-purple/60">Park entry only.</div>
                )}
                {lines.map((l, i) => (
                  <div
                    key={l.label + i}
                    className={cn('flex items-baseline gap-3 px-3.5 py-[11px]', i !== 0 && 'border-t border-solid border-valle-lilac')}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold">{l.label}</div>
                      <div className="mt-0.5 font-mono text-[10px] tracking-[.08em] text-valle-purple/70">
                        {[
                          l.adults ? l.adults + ' ADULT' + (l.adults > 1 ? 'S' : '') : '',
                          l.kids ? l.kids + ' CHILD' + (l.kids > 1 ? 'REN' : '') : '',
                          l.units ? l.units + ' UNIT' + (l.units > 1 ? 'S' : '') : '',
                        ].filter(Boolean).join(' · ') || 'N/A'}
                      </div>
                    </div>
                    <div className="text-[14px] font-bold whitespace-nowrap">{money(l.amount)}</div>
                  </div>
                ))}
              </div>

              <div className={cn(cardCls, 'mt-3.5 bg-[#F7F3FF] p-4')}>
                {[
                  ['Park entry', money(data.entryAmount)],
                  ['Subtotal', money(data.subtotal)],
                  ...(data.discount > 0 ? [['Explorer Pass discount', '− ' + money(data.discount)]] : []),
                  ...((data.adjustmentAmount ?? 0) > 0 ? [[adjustmentLabel(data), '− ' + money(data.adjustmentAmount ?? 0)]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="mb-[7px] flex justify-between gap-3 text-[13.5px]">
                    <span className="text-valle-purple/70">{k}</span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
                <div className="mt-1 flex items-baseline justify-between gap-3 border-t-[1.5px] border-solid border-valle-lilac pt-2.5">
                  <span className="inline-flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold tracking-[.14em] text-valle-violet">TOTAL</span>
                    <RatePill rate={data.rate} size="sm" />
                  </span>
                  <TotalTag amount={money(data.total)} size={28} />
                </div>
                <div data-testid="money-paid" className="mt-2.5 flex justify-between gap-3 pt-2.5 text-[13.5px]" style={{ borderTop: '1px dashed #D9CCF2' }}>
                  <span className="text-valle-purple/70">Paid{data.paymentMethod ? ' · ' + data.paymentMethod : ''}{data.receiptNo ? ' · receipt ' + data.receiptNo : ''}</span>
                  <span className="font-semibold">{money(data.paidAmount ?? 0)}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-3 text-[14px]">
                  <span className="font-extrabold" style={{ color: (data.balance ?? data.total) > 0 ? '#D91E44' : '#1E9E4A' }}>{(data.balance ?? data.total) > 0 ? 'Balance to collect' : 'Fully paid'}</span>
                  <span className="inline-flex items-center gap-2.5">
                    <span className="font-mono font-extrabold">{money(data.balance ?? data.total)}</span>
                    <a href={receiptPdfUrl(data.refCode)} target="_blank" rel="noopener noreferrer" className="rounded-full border-[1.5px] border-solid border-valle-purple px-2.5 py-[5px] text-[11.5px] font-bold" style={{ color: '#340057', textDecoration: 'none' }}>Receipt PDF</a>
                  </span>
                </div>
                {data.groupKind && (
                  <div data-testid="group-block" className="mt-2.5 rounded-[10px] border-[1.5px] border-solid border-[#D9C9F0] bg-[#F0E8FF] px-3 py-2 text-[13px]">
                    <strong>Group · {data.groupKind}</strong> · {data.organisation} · leader {data.leaderName} · {data.adults + data.kids} people · {(data.participants ?? []).length} names listed{(data.depositAmount ?? 0) > 0 ? ` · deposit ${money(data.depositAmount ?? 0)}${(data.paidAmount ?? 0) >= (data.depositAmount ?? 0) ? ' received' : ' due'}` : ''}
                    {(data.participants ?? []).length > 0 && <details className="mt-1"><summary className="cursor-pointer">Participant list</summary><div className="mt-1 font-mono text-[12px] whitespace-pre-wrap">{(data.participants ?? []).map((p) => p.name + (p.age != null ? ` (${p.age})` : '')).join('\n')}</div></details>}
                  </div>
                )}
                {data.status === 'postponed' && (
                  <div className="mt-2.5 rounded-[10px] border-[1.5px] border-solid border-[#FFD24D] bg-[#FFF4D6] px-3 py-2 text-[13px]">
                    Postponed{data.postponedFrom ? ' from ' + shortDate(data.postponedFrom) : ''}. No refund; the payment stays on this booking. Use <strong>Edit</strong> to set the new date and status Confirmed.
                  </div>
                )}
              </div>

              {data.status !== 'cancelled' && <PhotosSection refCode={refCode} />}

              {audit.length > 0 && (
                <>
                  <SectionLabel>AUDIT TRAIL</SectionLabel>
                  <AuditTrail entries={audit} />
                </>
              )}

              {saved && !err && (
                <div role="status" className="mt-3.5 font-mono text-[10px] uppercase tracking-[.1em] text-[#12B54A]">
                  {saved}
                </div>
              )}

              {err && (
                <div role="alert" className="mt-3.5 text-[13.5px] leading-[1.5] font-semibold text-[#D91E44]">
                  {err}
                </div>
              )}
            </>
          )}
        </div>

        {data && (
          <div className="flex flex-wrap gap-2.5 border-t-[1.5px] border-solid border-valle-lilac bg-white p-4">
            {editing ? (
              <>
                <Btn variant="ghost" onClick={cancelEdit} disabled={saving} style={{ flex: 1 }}>Cancel</Btn>
                <Btn onClick={() => { void save(); }} disabled={saving} style={{ flex: 1.4 }}>
                  {saving ? <Spinner /> : 'Save changes'}
                </Btn>
              </>
            ) : (
              <>
                {payOpen && (
                  <div data-testid="pay-form" className="flex basis-full flex-wrap items-end gap-2 rounded-[14px] border-[1.5px] border-solid border-valle-lilac bg-[#F7F3FF] px-3 py-2.5">
                    <Field id="pay-amt" tag="AMOUNT TAKEN (RS)"><input id="pay-amt" type="number" min={1} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className={cn(inputCls, 'w-[130px]')} data-testid="pay-amount" /></Field>
                    <Field id="pay-how" tag="HOW">
                      <select id="pay-how" value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)} className={cn(inputCls, 'w-[130px] cursor-pointer appearance-auto')}>
                        <option value="cash">Cash</option><option value="card">Card</option><option value="juice">Juice</option><option value="online">Online</option><option value="other">Other</option>
                      </select>
                    </Field>
                    <Field id="pay-rc" tag="TILL RECEIPT NO."><input id="pay-rc" value={payReceipt} onChange={(e) => setPayReceipt(e.target.value)} placeholder="optional" className={cn(inputCls, 'w-[140px]')} /></Field>
                    <Btn onClick={() => { void takePayment(); }} disabled={busy !== null} data-testid="pay-confirm">Record</Btn>
                    <Btn variant="ghost" onClick={() => setPayOpen(false)}>Close</Btn>
                  </div>
                )}
                {postponeOpen && (
                  <div data-testid="postpone-form" className="flex basis-full flex-wrap items-center gap-2 rounded-[14px] border-[1.5px] border-solid border-[#FFD24D] bg-[#FFF4D6] px-3 py-2.5">
                    <span className="flex-[1_1_100%] text-[13px] font-semibold">Weather day: the visit is postponed, nothing is refunded, the guest picks a new date later (Edit → date + status Confirmed).</span>
                    <input value={postponeReason} onChange={(e) => setPostponeReason(e.target.value)} placeholder="Reason, e.g. heavy rain, park closed 11:00" style={inputStyle} className="flex-[1_1_220px]" data-testid="postpone-reason" />
                    <Btn variant="dark" onClick={() => { void postpone(); }} disabled={busy !== null} data-testid="postpone-confirm">Postpone</Btn>
                    <Btn variant="ghost" onClick={() => setPostponeOpen(false)}>Close</Btn>
                  </div>
                )}
                <Btn variant="dark" onClick={startEdit} disabled={busy !== null} style={{ flex: 1 }}>Edit</Btn>
                {(data.balance ?? data.total) > 0 && data.status !== 'cancelled' && (
                  <Btn variant="ghost" onClick={() => { setPayOpen((v) => !v); setPayAmount(String(data.balance ?? data.total)); }} disabled={busy !== null} style={{ flex: 1 }} data-testid="pay-open">Record payment</Btn>
                )}
                {data.paymentMethod === 'online' && (data.paidAmount ?? 0) > 0 && (
                  <Btn variant="ghost" onClick={() => { setRefundOpen((v) => !v); setRefundAmount(String(data.paidAmount ?? 0)); }} disabled={busy !== null} style={{ flex: 1 }} data-testid="refund-open">Refund online payment</Btn>
                )}
                {refundOpen && (
                  <div data-testid="refund-form" className="flex basis-full flex-wrap items-center gap-2.5 rounded-[14px] border-[1.5px] border-solid border-valle-red bg-[#FFF1F3] px-3.5 py-2.5">
                    <span className="flex-[1_1_100%] text-[13.5px] font-bold">Send money back through the payment provider. Up to {money(data.paidAmount ?? 0)} on this booking.</span>
                    <input value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} inputMode="numeric" placeholder="Amount (Rs)" aria-label="Refund amount" className={cn(inputCls, 'w-[130px]')} data-testid="refund-amount" />
                    <input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="Reason (shown in the trail)" aria-label="Refund reason" style={inputStyle} className="flex-[1_1_200px]" data-testid="refund-reason" />
                    <Btn variant="danger" onClick={() => { void refund(); }} disabled={busy !== null} data-testid="refund-submit">{busy === 'arrived' ? <Spinner color="#D91E44" /> : 'Refund'}</Btn>
                    <Btn variant="ghost" onClick={() => setRefundOpen(false)}>Close</Btn>
                  </div>
                )}
                {data.status !== 'cancelled' && data.status !== 'postponed' && (
                  <Btn variant="ghost" onClick={() => setPostponeOpen((v) => !v)} disabled={busy !== null} style={{ flex: 1 }} data-testid="postpone-open">Postpone (weather)</Btn>
                )}
                <Btn
                  onClick={() => { void quickStatus('arrived'); }}
                  disabled={busy !== null || data.status === 'arrived'}
                  style={{ flex: 1 }}
                >
                  {busy === 'arrived' ? <Spinner /> : 'Mark arrived'}
                </Btn>
                {confirmCancel ? (
                  <div data-testid="cancel-confirm" className="flex basis-full flex-wrap items-center gap-2.5 rounded-[14px] border-[1.5px] border-solid border-valle-red bg-[#FFF1F3] px-3.5 py-2.5">
                    <span className="flex-[1_1_200px] text-[13.5px] font-bold">Cancel booking {data.refCode}? The guest keeps their e-mail but the reservation is released.</span>
                    <Btn variant="danger" onClick={() => { setConfirmCancel(false); void quickStatus('cancelled'); }} disabled={busy !== null}>
                      {busy === 'cancelled' ? <Spinner color="#D91E44" /> : 'Yes, cancel booking'}
                    </Btn>
                    <Btn variant="ghost" onClick={() => setConfirmCancel(false)}>Keep it</Btn>
                  </div>
                ) : (
                  <Btn
                    variant="danger"
                    onClick={() => setConfirmCancel(true)}
                    disabled={busy !== null || data.status === 'cancelled'}
                    style={{ flex: 1 }}
                  >
                    {busy === 'cancelled' ? <Spinner color="#D91E44" /> : 'Cancel booking'}
                  </Btn>
                )}
              </>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

export default function BookingsPanel({ onChanged, openRef: jumpRef, onOpened }: { onChanged: (force?: boolean) => void; openRef?: string | null; onOpened?: () => void }) {
  const isMobile = useIsMobile(900);
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [status, setStatus] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [slot, setSlot] = useState('all');
  const [payMode, setPayMode] = useState('all');
  const [rate, setRate] = useState('all');
  const [nationality, setNationality] = useState('all');
  const [sort, setSort] = useState<BookingSort>('newest');
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [openRef, setOpenRef] = useState<string | null>(null);
  // the gate tab asked for a booking: open it here
  useEffect(() => { if (jumpRef) { setOpenRef(jumpRef); onOpened?.(); } }, [jumpRef, onOpened]);

  // Debounce the search box so every keystroke is not a query.
  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 320);
    return () => clearTimeout(t);
  }, [q]);

  // Any filter change restarts at page 1.
  useEffect(() => { setPage(1); }, [dq, status, from, to, slot, payMode, rate, nationality, sort]);

  useEffect(() => {
    let dead = false;
    setLoading(true);
    listBookings({
      status: status === 'all' ? undefined : status,
      from: from || undefined,
      to: to || undefined,
      slot: slot === 'all' ? undefined : slot,
      payMode: payMode === 'all' ? undefined : payMode,
      rate: rate === 'all' ? undefined : rate,
      nationality: nationality === 'all' ? undefined : nationality,
      sort,
      q: dq || undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        if (dead) return;
        setRows(res.items || []);
        setTotal(res.total || 0);
        setErr('');
      })
      .catch(() => { if (!dead) setErr('Could not load bookings.'); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [status, from, to, slot, payMode, rate, nationality, sort, dq, page]);

  const onPatched = useCallback((row: BookingRow) => {
    setRows((prev) => prev.map((r) => (r.refCode === row.refCode ? { ...r, ...row } : r)));
    onChanged(true);   // an edit moves the arrivals and revenue figures straight away
  }, [onChanged]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = dq !== '' || status !== 'all' || from !== '' || to !== '' || slot !== 'all' || payMode !== 'all' || rate !== 'all' || nationality !== 'all';

  // A booking made on the website while this tab is open: straight into the list.
  const [fresh, setFresh] = useState<BookingRow | null>(null);
  useEffect(() => {
    const h = (e: Event) => {
      const b = (e as CustomEvent<BookingRow>).detail;
      if (!b?.refCode) return;
      setFresh(b);
      if (page === 1 && !filtered) {
        setRows((prev) => (prev.some((r) => r.id === b.id) ? prev : [b, ...prev]));
        setTotal((t) => t + 1);
      }
    };
    window.addEventListener('valle:booking-new', h);
    return () => window.removeEventListener('valle:booking-new', h);
  }, [page, filtered]);

  /** Money on screen, so the page total is readable without opening every row. */
  const pageValue = useMemo(
    () => rows.reduce((sum, r) => sum + (r.status === 'cancelled' ? 0 : r.total), 0),
    [rows],
  );

  return (
    <div>
      {fresh && (
        <div
          role="status"
          data-testid="fresh-booking"
          className={cn(cardCls, 'mb-3.5 flex flex-wrap items-center gap-3 border-valle-green bg-[#E2FFEB] px-4 py-3')}
        >
          <span className="font-bold">New booking just came in: {fresh.refCode} · {fresh.guestName} · {fresh.visitDate} {fresh.slot}</span>
          <button onClick={() => { setOpenRef(fresh.refCode); setFresh(null); }} className="cursor-pointer rounded-full border-0 bg-valle-purple px-3.5 py-2 [font-family:inherit] text-[13px] font-bold text-white">Open</button>
          <button onClick={() => setFresh(null)} aria-label="Dismiss" className="ml-auto cursor-pointer border-0 bg-transparent text-[16px] text-valle-purple">×</button>
        </div>
      )}
      {/* ---- filter bar ---- */}
      <div className={cn(cardCls, 'mb-3.5 flex flex-wrap items-center gap-2.5 p-3.5')}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search ref, name, email or phone"
          aria-label="Search bookings"
          className={cn(inputCls, 'w-auto min-w-[180px] flex-[1_1_240px]')}
        />
        <Select value={status} onChange={setStatus} width={isMobile ? '100%' : 160} ariaLabel="Filter by status">
          <option value="all">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="arrived">Arrived</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <div className={cn('flex items-center gap-2', isMobile ? 'flex-[1_1_100%]' : 'flex-[0_0_auto]')}>
          <span className={tagCls}>FROM</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" className={cn(inputCls, 'w-auto flex-1')} />
          <span className={tagCls}>TO</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" className={cn(inputCls, 'w-auto flex-1')} />
        </div>
        <Select value={slot} onChange={setSlot} width={isMobile ? '100%' : 130} ariaLabel="Filter by slot">
          <option value="all">Any slot</option>
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
        </Select>
        <Select value={payMode} onChange={setPayMode} width={isMobile ? '100%' : 130} ariaLabel="Filter by payment">
          <option value="all">Any payment</option>
          <option value="gate">At gate</option>
          <option value="online">Online</option>
        </Select>
        <Select value={rate} onChange={setRate} width={isMobile ? '100%' : 130} ariaLabel="Filter by rate">
          <option value="all">Any rate</option>
          <option value="rr">Resident</option>
          <option value="nr">Visitor</option>
        </Select>
        <Select value={nationality} onChange={setNationality} width={isMobile ? '100%' : 170} ariaLabel="Filter by nationality">
          <option value="all">Any nationality</option>
          {Object.keys(NATC).map((n) => <option key={n} value={n}>{n}</option>)}
        </Select>
        <Select value={sort} onChange={(v) => setSort(v as BookingSort)} width={isMobile ? '100%' : 170} ariaLabel="Sort">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="visit_asc">Visit date, soonest</option>
          <option value="visit_desc">Visit date, latest</option>
          <option value="total_desc">Highest total</option>
          <option value="total_asc">Lowest total</option>
          <option value="guest">Guest A to Z</option>
        </Select>
        {filtered && (
          <Btn
            variant="ghost"
            onClick={() => { setQ(''); setStatus('all'); setFrom(''); setTo(''); setSlot('all'); setPayMode('all'); setRate('all'); setNationality('all'); }}
          >
            Clear
          </Btn>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <ExportLink href={exportUrl('bookings', from || undefined, to || undefined)} label={from || to ? 'Export range' : 'Export month'} />
          <Btn onClick={() => setCreating(true)}>+ New booking</Btn>
        </div>
      </div>
      {creating && (
        <NewBookingDrawer
          onClose={() => setCreating(false)}
          onCreated={(b) => {
            setCreating(false);
            setRows((prev) => (prev.some((r) => r.id === b.id) ? prev : [b, ...prev]));
            setTotal((t) => t + 1);
            onChanged(true);
            setOpenRef(b.refCode);
          }}
        />
      )}

      {/* ---- table ---- */}
      <div className={cn(cardCls, 'overflow-hidden')}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr className="bg-[#F7F3FF]">
                {COLS.map((c) => <th key={c} className={th}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => <TableRow key={r.id} row={r} onOpen={setOpenRef} />)}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="flex justify-center px-0 py-[34px]">
            <Spinner color="#7333FF" size={9} />
          </div>
        )}

        {!loading && err && (
          <EmptyState title="Something went wrong" note={err} />
        )}

        {!loading && !err && rows.length === 0 && (
          filtered
            ? <EmptyState title="No matches" note="No bookings fit these filters. Try a wider date range or clear the search." />
            : <EmptyState title="No bookings yet" note="New reservations from the website land here the moment they are confirmed." />
        )}

        {!loading && !err && rows.length > 0 && (
          <div className="flex flex-wrap items-baseline gap-2.5 border-t-[1.5px] border-solid border-valle-lilac bg-[#F7F3FF] px-3.5 py-2.5">
            <span className={tagCls}>
              VALUE ON THIS PAGE
            </span>
            <span className="flex-1" />
            <span className="font-display text-[20px] font-black uppercase italic tracking-[-0.01em]">{money(pageValue)}</span>
          </div>
        )}
      </div>

      {/* ---- pagination ---- */}
      {total > 0 && (
        <div className="mt-3.5 flex flex-wrap items-center gap-3">
          <span className="font-mono text-[10.5px] tracking-[.1em] text-valle-purple/60">
            PAGE {page} OF {pages} · {total} BOOKING{total === 1 ? '' : 'S'}
          </span>
          <span className="flex-1" />
          <Btn variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
            ← Previous
          </Btn>
          <Btn variant="ghost" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages || loading}>
            Next →
          </Btn>
        </div>
      )}

      {openRef && (
        <Drawer refCode={openRef} onClose={() => setOpenRef(null)} onPatched={onPatched} />
      )}
    </div>
  );
}
