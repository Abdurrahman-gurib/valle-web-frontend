import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { BookingRow, BookingStatus, PayMode, RateKey, SlotKey } from '../../types';
import {
  getBooking, isHttpError, listBookings, updateBooking,
  type BookingAuditEntry, type BookingDetailFull, type BookingPatch,
} from '../../lib/staffApi';
import { money, partyLabel } from '../../lib/format';
import { useHover } from '../../hooks/useHover';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Stripes } from '../../components/Stripes';
import { color, radius } from '../../styles/theme';
import {
  Btn, EmptyState, Field, RatePill, SectionLabel, Spinner, StatusChip, TotalTag,
  card, display, inputStyle, mono, shortDate, textareaStyle, usePrefersReducedMotion,
} from './ui';

const PAGE_SIZE = 20;

const COLS = ['Ref', 'Date', 'Slot', 'Guest', 'Party', 'Rate', 'Pay', 'Total', 'Status'];

const th: CSSProperties = {
  ...mono, fontSize: 9.5, fontWeight: 700, letterSpacing: '.13em', textTransform: 'uppercase',
  color: '#7333FF', textAlign: 'left', padding: '10px 12px', whiteSpace: 'nowrap',
};

const td: CSSProperties = {
  padding: '11px 12px', fontSize: 13.5, borderTop: '1px solid #EBE2FF', whiteSpace: 'nowrap',
};

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
      style={{ ...inputStyle, width: width ?? 'auto', cursor: 'pointer', appearance: 'auto' }}
    >
      {children}
    </select>
  );
}

function TableRow({ row, onOpen }: { row: BookingRow; onOpen: (ref: string) => void }) {
  const [h, bind] = useHover();
  return (
    <tr
      {...bind}
      onClick={() => onOpen(row.refCode)}
      style={{ cursor: 'pointer', background: h ? '#F7F3FF' : '#FFFFFF', transition: 'background .12s ease' }}
    >
      <td style={{ ...td, ...mono, fontWeight: 700, fontSize: 12.5 }}>{row.refCode}</td>
      <td style={td}>{shortDate(row.visitDate)}</td>
      <td style={td}>{slotLabel(row.slot)}</td>
      <td style={{ ...td, fontWeight: 600 }}>{row.guestName}</td>
      <td style={td}>{partyLabel(row.adults, row.kids)}</td>
      <td style={td}><RatePill rate={row.rate} size="sm" /></td>
      <td style={td}>{payLabel(row.payMode)}</td>
      <td style={{ ...td, ...display, fontSize: 17, letterSpacing: '-0.01em' }}>{money(row.total)}</td>
      <td style={td}><StatusChip status={row.status} /></td>
    </tr>
  );
}

function DetailLine({ tag, value }: { tag: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...mono, fontSize: 9.5, fontWeight: 700, letterSpacing: '.13em', color: '#7333FF' }}>{tag}</div>
      <div style={{ fontSize: 14, marginTop: 3, wordBreak: 'break-word' }}>{value || 'N/A'}</div>
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
    <div style={{ ...card, overflow: 'hidden' }}>
      {entries.map((e, i) => {
        const changes = Object.entries(e.changes || {});
        return (
          <div key={e.at + '-' + i} style={{ padding: '12px 14px', borderTop: i === 0 ? 0 : '1px solid ' + color.border }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: color.violet, textTransform: 'uppercase' }}>
                {e.action || 'update'}
              </span>
              <span style={{ ...mono, fontSize: 9.5, letterSpacing: '.06em', color: 'rgba(52,0,87,.5)' }}>
                {shortDate(e.at)}
              </span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: 'rgba(52,0,87,.7)', wordBreak: 'break-all' }}>{e.staffEmail}</span>
            </div>
            {changes.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'rgba(52,0,87,.55)', marginTop: 5 }}>No field detail recorded.</div>
            ) : (
              <ul style={{ margin: '7px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 4 }}>
                {changes.map(([k, c]) => (
                  <li key={k} style={{ fontSize: 12.5, lineHeight: 1.5, color: 'rgba(52,0,87,.8)' }}>
                    <span style={{ fontWeight: 700 }}>{FIELD_LABEL[k] || k}</span>
                    {': '}
                    <span style={{ opacity: 0.7 }}>{auditValue(k, c?.from)}</span>
                    {' → '}
                    <span style={{ fontWeight: 600 }}>{auditValue(k, c?.to)}</span>
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

  const startEdit = () => {
    if (!data) return;
    setForm(toDraft(data));
    setFieldErr({});
    setErr('');
    setSaved('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(null);
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

  const grid: CSSProperties = {
    display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
  };

  const audit = data?.audit ?? [];
  // Defensive: an API that has not shipped the richer payload could omit these.
  const lines = data?.lines ?? [];

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(31,0,51,.55)',
          backdropFilter: 'blur(3px)', animation: 'vfade .2s ease both',
        }}
      />
      <aside
        role="dialog"
        aria-label={'Booking ' + refCode}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 96, width: 'min(100vw,480px)',
          background: '#FFFFFF', display: 'flex', flexDirection: 'column',
          boxShadow: '-24px 0 60px -20px rgba(38,0,64,.5)',
          animation: reduced ? 'vfade .2s ease both' : 'vslidein .3s cubic-bezier(.2,.7,.2,1) both',
        }}
      >
        <div style={{ background: '#340057', color: '#FFFFFF', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...mono, fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', color: 'rgba(255,255,255,.6)' }}>
              {editing ? 'EDITING BOOKING' : 'BOOKING'}
            </div>
            <div style={{ ...display, fontSize: 26, lineHeight: 1.05 }}>{refCode}</div>
          </div>
          <span style={{ flex: 1 }} />
          {data && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ ...mono, fontSize: 9, fontWeight: 700, letterSpacing: '.14em', color: 'rgba(255,255,255,.55)' }}>
                TOTAL
              </div>
              <div style={{ ...display, fontSize: 24, lineHeight: 1.1, color: color.yellow }}>{money(data.total)}</div>
            </div>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="press"
            style={{
              border: '1.5px solid rgba(255,255,255,.32)', background: 'transparent', color: '#FFFFFF',
              width: 34, height: 34, borderRadius: 999, cursor: 'pointer', fontSize: 16, lineHeight: 1, flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
        <Stripes height={6} />

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {loading && (
            <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center' }}>
              <Spinner color="#7333FF" size={9} />
            </div>
          )}

          {!loading && err && !data && (
            <div style={{ fontSize: 14, color: '#D91E44', fontWeight: 600 }}>{err}</div>
          )}

          {data && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16, flexWrap: 'wrap' }}>
                <StatusChip status={data.status} />
                <RatePill rate={data.rate} />
                <span style={{ ...mono, fontSize: 10, letterSpacing: '.1em', color: 'rgba(52,0,87,.5)' }}>
                  BOOKED {shortDate(data.createdAt)}
                </span>
              </div>

              {editing && form ? (
                /* ------------------------------------------------------ edit -- */
                <div style={{ display: 'grid', gap: 14 }}>
                  <div style={grid}>
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

                  <div style={{ ...grid, gridTemplateColumns: 'repeat(auto-fit,minmax(118px,1fr))' }}>
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

                  <div style={{
                    ...mono, fontSize: 10, letterSpacing: '.06em', lineHeight: 1.5,
                    color: 'rgba(52,0,87,.6)', background: color.tint,
                    border: '1.5px solid ' + color.border, borderRadius: radius.md, padding: '9px 12px',
                  }}>
                    CHANGING THE PARTY OR THE RATE RE-PRICES THE BOOKING ON THE SERVER.
                  </div>

                  <Field id="bk-name" tag="GUEST NAME" hint={fieldErr.guestName}>
                    <input id="bk-name" value={form.guestName} onChange={(e) => set('guestName')(e.target.value)} style={inputStyle} />
                  </Field>

                  <div style={grid}>
                    <Field id="bk-phone" tag="PHONE" hint={fieldErr.phone}>
                      <input id="bk-phone" value={form.phone} onChange={(e) => set('phone')(e.target.value)} style={inputStyle} />
                    </Field>
                    <Field id="bk-email" tag="EMAIL" hint={fieldErr.email}>
                      <input id="bk-email" type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} style={inputStyle} />
                    </Field>
                  </div>

                  <div style={grid}>
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
                      </Select>
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
                <div style={{ ...card, background: '#F7F3FF', padding: 16, display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
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
                  <div style={{
                    ...card, background: '#FFFFE2', borderColor: 'rgba(138,122,0,.25)', padding: 14,
                    fontSize: 13.5, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {data.staffNote}
                  </div>
                </>
              )}

              <SectionLabel>LINE ITEMS</SectionLabel>
              <div style={{ ...card, overflow: 'hidden' }}>
                {lines.length === 0 && (
                  <div style={{ padding: 14, fontSize: 13.5, color: 'rgba(52,0,87,.6)' }}>Park entry only.</div>
                )}
                {lines.map((l, i) => (
                  <div
                    key={l.label + i}
                    style={{
                      display: 'flex', alignItems: 'baseline', gap: 12, padding: '11px 14px',
                      borderTop: i === 0 ? 0 : '1px solid #EBE2FF',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{l.label}</div>
                      <div style={{ ...mono, fontSize: 10, letterSpacing: '.08em', color: 'rgba(52,0,87,.55)', marginTop: 2 }}>
                        {[
                          l.adults ? l.adults + ' ADULT' + (l.adults > 1 ? 'S' : '') : '',
                          l.kids ? l.kids + ' CHILD' + (l.kids > 1 ? 'REN' : '') : '',
                          l.units ? l.units + ' UNIT' + (l.units > 1 ? 'S' : '') : '',
                        ].filter(Boolean).join(' · ') || 'N/A'}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>{money(l.amount)}</div>
                  </div>
                ))}
              </div>

              <div style={{ ...card, background: '#F7F3FF', padding: 16, marginTop: 14 }}>
                {[
                  ['Park entry', money(data.entryAmount)],
                  ['Subtotal', money(data.subtotal)],
                  ...(data.discount > 0 ? [['Explorer Pass discount', '− ' + money(data.discount)]] : []),
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13.5, marginBottom: 7 }}>
                    <span style={{ color: 'rgba(52,0,87,.7)' }}>{k}</span>
                    <span style={{ fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', borderTop: '1.5px solid #EBE2FF', paddingTop: 10, marginTop: 4 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color: '#7333FF' }}>TOTAL</span>
                    <RatePill rate={data.rate} size="sm" />
                  </span>
                  <TotalTag amount={money(data.total)} size={28} />
                </div>
              </div>

              {audit.length > 0 && (
                <>
                  <SectionLabel>AUDIT TRAIL</SectionLabel>
                  <AuditTrail entries={audit} />
                </>
              )}

              {saved && !err && (
                <div role="status" style={{
                  marginTop: 14, ...mono, fontSize: 10, letterSpacing: '.1em',
                  color: '#12B54A', textTransform: 'uppercase',
                }}>
                  {saved}
                </div>
              )}

              {err && (
                <div role="alert" style={{ marginTop: 14, fontSize: 13.5, fontWeight: 600, color: '#D91E44', lineHeight: 1.5 }}>
                  {err}
                </div>
              )}
            </>
          )}
        </div>

        {data && (
          <div style={{
            borderTop: '1.5px solid #EBE2FF', padding: 16, display: 'flex', gap: 10,
            background: '#FFFFFF', flexWrap: 'wrap',
          }}>
            {editing ? (
              <>
                <Btn variant="ghost" onClick={cancelEdit} disabled={saving} style={{ flex: 1 }}>Cancel</Btn>
                <Btn onClick={() => { void save(); }} disabled={saving} style={{ flex: 1.4 }}>
                  {saving ? <Spinner /> : 'Save changes'}
                </Btn>
              </>
            ) : (
              <>
                <Btn variant="dark" onClick={startEdit} disabled={busy !== null} style={{ flex: 1 }}>Edit</Btn>
                <Btn
                  onClick={() => { void quickStatus('arrived'); }}
                  disabled={busy !== null || data.status === 'arrived'}
                  style={{ flex: 1 }}
                >
                  {busy === 'arrived' ? <Spinner /> : 'Mark arrived'}
                </Btn>
                <Btn
                  variant="danger"
                  onClick={() => { void quickStatus('cancelled'); }}
                  disabled={busy !== null || data.status === 'cancelled'}
                  style={{ flex: 1 }}
                >
                  {busy === 'cancelled' ? <Spinner color="#D91E44" /> : 'Cancel'}
                </Btn>
              </>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

export default function BookingsPanel({ onChanged }: { onChanged: (force?: boolean) => void }) {
  const isMobile = useIsMobile(900);
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [status, setStatus] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [openRef, setOpenRef] = useState<string | null>(null);

  // Debounce the search box so every keystroke is not a query.
  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 320);
    return () => clearTimeout(t);
  }, [q]);

  // Any filter change restarts at page 1.
  useEffect(() => { setPage(1); }, [dq, status, from, to]);

  useEffect(() => {
    let dead = false;
    setLoading(true);
    listBookings({
      status: status === 'all' ? undefined : status,
      from: from || undefined,
      to: to || undefined,
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
  }, [status, from, to, dq, page]);

  const onPatched = useCallback((row: BookingRow) => {
    setRows((prev) => prev.map((r) => (r.refCode === row.refCode ? { ...r, ...row } : r)));
    onChanged(true);   // an edit moves the arrivals and revenue figures straight away
  }, [onChanged]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = dq !== '' || status !== 'all' || from !== '' || to !== '';

  /** Money on screen, so the page total is readable without opening every row. */
  const pageValue = useMemo(
    () => rows.reduce((sum, r) => sum + (r.status === 'cancelled' ? 0 : r.total), 0),
    [rows],
  );

  return (
    <div>
      {/* ---- filter bar ---- */}
      <div style={{ ...card, padding: 14, marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search ref, name, email or phone"
          aria-label="Search bookings"
          style={{ ...inputStyle, flex: '1 1 240px', width: 'auto', minWidth: 180 }}
        />
        <Select value={status} onChange={setStatus} width={isMobile ? '100%' : 160} ariaLabel="Filter by status">
          <option value="all">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="arrived">Arrived</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: isMobile ? '1 1 100%' : '0 0 auto' }}>
          <span style={{ ...mono, fontSize: 9.5, fontWeight: 700, letterSpacing: '.13em', color: '#7333FF' }}>FROM</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" style={{ ...inputStyle, width: 'auto', flex: 1 }} />
          <span style={{ ...mono, fontSize: 9.5, fontWeight: 700, letterSpacing: '.13em', color: '#7333FF' }}>TO</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" style={{ ...inputStyle, width: 'auto', flex: 1 }} />
        </div>
        {filtered && (
          <Btn
            variant="ghost"
            onClick={() => { setQ(''); setStatus('all'); setFrom(''); setTo(''); }}
          >
            Clear
          </Btn>
        )}
      </div>

      {/* ---- table ---- */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <thead>
              <tr style={{ background: '#F7F3FF' }}>
                {COLS.map((c) => <th key={c} style={th}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => <TableRow key={r.id} row={r} onOpen={setOpenRef} />)}
            </tbody>
          </table>
        </div>

        {loading && (
          <div style={{ padding: '34px 0', display: 'flex', justifyContent: 'center' }}>
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
          <div style={{
            borderTop: '1.5px solid #EBE2FF', background: '#F7F3FF', padding: '10px 14px',
            display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap',
          }}>
            <span style={{ ...mono, fontSize: 9.5, fontWeight: 700, letterSpacing: '.13em', color: '#7333FF' }}>
              VALUE ON THIS PAGE
            </span>
            <span style={{ flex: 1 }} />
            <span style={{ ...display, fontSize: 20, letterSpacing: '-0.01em' }}>{money(pageValue)}</span>
          </div>
        )}
      </div>

      {/* ---- pagination ---- */}
      {total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          <span style={{ ...mono, fontSize: 10.5, letterSpacing: '.1em', color: 'rgba(52,0,87,.6)' }}>
            PAGE {page} OF {pages} · {total} BOOKING{total === 1 ? '' : 'S'}
          </span>
          <span style={{ flex: 1 }} />
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
