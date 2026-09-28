import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { BookingDetail, PayMode, RateKey, SlotKey } from '../../types';
import { useCatalog } from '../../store/CatalogContext';
import { computeBooking } from '../../store/booking';
import { selKey } from '../../lib/sel';
import { NATC, mur } from '../../lib/format';
import { createStaffBooking, type BookingChannel } from '../../lib/staffApi';
import { Btn, Field, SectionLabel, Spinner, inputStyle, mono, textareaStyle } from './ui';
import { todayIsoPark } from './reportUi';

const CHANNELS: { key: BookingChannel; label: string }[] = [
  { key: 'phone', label: 'Phone' }, { key: 'desk', label: 'Front desk' }, { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'email', label: 'E-mail' }, { key: 'agency', label: 'Agency / hotel' }, { key: 'other', label: 'Other' },
];

interface Line { id: string; variant?: string; adults: number; kids: number; units: number }

const sel: CSSProperties = { ...inputStyle, cursor: 'pointer', appearance: 'auto' };

/**
 * A booking taken by an operator (phone, desk, WhatsApp...). Priced live with
 * the same computeBooking the website uses, then sent to POST /api/staff/bookings,
 * which re-prices server-side and stamps who took it.
 */
export default function NewBookingDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: (b: BookingDetail) => void }) {
  const catalog = useCatalog();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nat, setNat] = useState('');
  const [visitDate, setVisitDate] = useState(todayIsoPark());
  const [slot, setSlot] = useState<SlotKey>('morning');
  const [adults, setAdults] = useState(2);
  const [kids, setKids] = useState(0);
  const [rate, setRate] = useState<RateKey>('rr');
  const [payMode, setPayMode] = useState<PayMode>('gate');
  const [channel, setChannel] = useState<BookingChannel>('phone');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [pickAct, setPickAct] = useState('');
  const [pickVar, setPickVar] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const bookable = catalog.ACTS.filter((a) => a.mode === 'pp' || a.mode === 'flat');
  const act = bookable.find((a) => a.id === pickAct);
  const options = act ? (catalog.PL[act.id] || []) : [];

  const addLine = () => {
    if (!act) return;
    if (options.length > 0 && !pickVar) return;
    const variant = options.length > 0 ? pickVar : undefined;
    if (lines.some((l) => l.id === act.id && l.variant === variant)) return;
    setLines((ls) => [...ls, act.mode === 'flat' ? { id: act.id, variant, adults: 0, kids: 0, units: 1 } : { id: act.id, variant, adults, kids, units: 0 }]);
    setPickVar('');
  };
  const bump = (i: number, f: 'adults' | 'kids' | 'units', d: number) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [f]: Math.max(0, Math.min(12, l[f] + d)) } : l)).filter((l) => l.adults + l.kids + l.units > 0));

  const summary = useMemo(() => {
    const s: Record<string, { a?: number; k?: number; u?: number }> = {};
    for (const l of lines) s[selKey(l.id, l.variant)] = { a: l.adults, k: l.kids, u: l.units };
    return computeBooking(catalog, s, adults, kids, rate);
  }, [catalog, lines, adults, kids, rate]);

  const submit = async () => {
    if (saving) return;
    if (!name.trim() || (!phone.trim() && !email.trim())) { setErr('A guest name and a phone number or e-mail are needed.'); return; }
    setErr('');
    setSaving(true);
    try {
      const b = await createStaffBooking({
        visitDate, slot, adults, kids, rate, payMode, channel,
        items: lines.map((l) => ({ id: l.id, variant: l.variant, adults: l.adults || undefined, kids: l.kids || undefined, units: l.units || undefined })),
        name: name.trim(), phone: phone.trim() || undefined, email: email.trim() || undefined, nationality: nat || undefined,
        note: note.trim() || undefined,
      });
      onCreated(b);
    } catch (e) {
      setErr((e as Error).message || 'Could not create the booking.');
      setSaving(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(38,0,64,.45)', backdropFilter: 'blur(4px)' }} />
      <aside role="dialog" aria-label="New booking" data-testid="new-booking" style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 81, width: 'min(560px,100%)', background: '#FFFFFF', color: '#340057',
        boxShadow: '-24px 0 60px -30px rgba(31,0,51,.6)', display: 'flex', flexDirection: 'column', animation: 'vfade .2s ease both',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1.5px solid #EBE2FF', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div>
            <div style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color: '#7333FF' }}>NEW BOOKING</div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Take a booking for a guest</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ marginLeft: 'auto', border: '1.5px solid #EBE2FF', background: '#FFFFFF', width: 34, height: 34, borderRadius: 999, cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
            <Field id="nb-channel" tag="CAME IN BY">
              <select id="nb-channel" value={channel} onChange={(e) => setChannel(e.target.value as BookingChannel)} style={sel}>
                {CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </Field>
            <Field id="nb-rate" tag="RATE">
              <select id="nb-rate" value={rate} onChange={(e) => setRate(e.target.value as RateKey)} style={sel}>
                <option value="rr">Resident (RR)</option><option value="nr">Visitor (NR)</option>
              </select>
            </Field>
          </div>

          <SectionLabel>GUEST</SectionLabel>
          <div style={{ display: 'grid', gap: 10 }}>
            <Field id="nb-name" tag="FULL NAME"><input id="nb-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name" style={inputStyle} /></Field>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
              <Field id="nb-phone" tag="PHONE"><input id="nb-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+230 …" style={inputStyle} /></Field>
              <Field id="nb-email" tag="E-MAIL"><input id="nb-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="guest@example.com" style={inputStyle} /></Field>
            </div>
            <Field id="nb-nat" tag="NATIONALITY">
              <select id="nb-nat" value={nat} onChange={(e) => { setNat(e.target.value); const c = NATC[e.target.value]; if (c && !phone.trim()) setPhone(c + ' '); }} style={sel}>
                <option value="">Not given</option>
                {Object.keys(NATC).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
          </div>

          <SectionLabel>VISIT</SectionLabel>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
            <Field id="nb-date" tag="DATE"><input id="nb-date" type="date" value={visitDate} min={todayIsoPark()} onChange={(e) => setVisitDate(e.target.value)} style={inputStyle} /></Field>
            <Field id="nb-slot" tag="ARRIVAL">
              <select id="nb-slot" value={slot} onChange={(e) => setSlot(e.target.value as SlotKey)} style={sel}>
                <option value="morning">Morning · 09:00–12:00</option><option value="afternoon">Afternoon · 12:00–15:30</option>
              </select>
            </Field>
            <Field id="nb-adults" tag="ADULTS (12+)"><input id="nb-adults" type="number" min={1} max={12} value={adults} onChange={(e) => setAdults(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} style={inputStyle} /></Field>
            <Field id="nb-kids" tag="CHILDREN (6–11)"><input id="nb-kids" type="number" min={0} max={12} value={kids} onChange={(e) => setKids(Math.max(0, Math.min(12, Number(e.target.value) || 0)))} style={inputStyle} /></Field>
          </div>

          <SectionLabel>EXPERIENCES</SectionLabel>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select aria-label="Experience" value={pickAct} onChange={(e) => { setPickAct(e.target.value); setPickVar(''); }} style={{ ...sel, flex: '1 1 180px' }}>
              <option value="">Add an experience…</option>
              {bookable.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {options.length > 0 && (
              <select aria-label="Option" value={pickVar} onChange={(e) => setPickVar(e.target.value)} style={{ ...sel, flex: '1 1 200px' }}>
                <option value="">Option…</option>
                {options.map((o) => <option key={o.n} value={o.n}>{o.n} · {mur(o[rate])}</option>)}
              </select>
            )}
            <Btn onClick={addLine} disabled={!act || (options.length > 0 && !pickVar)}>Add</Btn>
          </div>
          {lines.length > 0 && (
            <div style={{ display: 'grid', gap: 8 }}>
              {lines.map((l, i) => {
                const a = catalog.ACTS.find((x) => x.id === l.id);
                const flat = a?.mode === 'flat';
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1.5px solid #EBE2FF', borderRadius: 12, padding: '8px 12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{a?.name}</div>
                      {l.variant && <div style={{ ...mono, fontSize: 10, color: 'rgba(52,0,87,.6)' }}>{l.variant}</div>}
                    </div>
                    {flat ? (
                      <Counter label={a?.flatLabel || 'units'} value={l.units} onChange={(d) => bump(i, 'units', d)} />
                    ) : (
                      <>
                        <Counter label="adults" value={l.adults} onChange={(d) => bump(i, 'adults', d)} />
                        <Counter label="kids" value={l.kids} onChange={(d) => bump(i, 'kids', d)} />
                      </>
                    )}
                    <button onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label="Remove" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#D91E44', fontSize: 16 }}>×</button>
                  </div>
                );
              })}
            </div>
          )}

          <SectionLabel>PAYMENT & NOTE</SectionLabel>
          <div style={{ display: 'grid', gap: 10 }}>
            <Field id="nb-pay" tag="PAYMENT">
              <select id="nb-pay" value={payMode} onChange={(e) => setPayMode(e.target.value as PayMode)} style={sel}>
                <option value="gate">Pays on arrival</option><option value="online">Paid online / by transfer</option>
              </select>
            </Field>
            <Field id="nb-note" tag="INTERNAL NOTE" hint="Deposit taken, special requests, agency reference…">
              <textarea id="nb-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} style={textareaStyle} />
            </Field>
          </div>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1.5px solid #EBE2FF', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ ...mono, fontSize: 9.5, letterSpacing: '.12em', color: '#7333FF' }}>TOTAL{summary.hasDiscount ? ' · EXPLORER PASS -15%' : ''}</div>
            <div style={{ fontWeight: 900, fontSize: 24, fontFamily: "'Barlow',sans-serif", fontStyle: 'italic' }} data-testid="new-booking-total">{mur(summary.total)}</div>
          </div>
          {err && <div role="alert" style={{ color: '#D91E44', fontWeight: 600, fontSize: 13, flex: '1 1 100%' }}>{err}</div>}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn onClick={() => { void submit(); }} disabled={saving}>{saving ? <Spinner size={6} /> : 'Confirm booking'}</Btn>
          </div>
        </div>
      </aside>
    </>
  );
}

function Counter({ label, value, onChange }: { label: string; value: number; onChange: (d: number) => void }) {
  const b: CSSProperties = { border: '1.5px solid #EBE2FF', background: '#FFFFFF', width: 26, height: 26, borderRadius: 999, cursor: 'pointer', fontWeight: 700 };
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ ...mono, fontSize: 9.5, letterSpacing: '.1em', color: 'rgba(52,0,87,.6)' }}>{label.toUpperCase()}</span>
      <button onClick={() => onChange(-1)} aria-label={`Fewer ${label}`} style={b}>−</button>
      <span style={{ ...mono, fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{value}</span>
      <button onClick={() => onChange(1)} aria-label={`More ${label}`} style={b}>+</button>
    </div>
  );
}
