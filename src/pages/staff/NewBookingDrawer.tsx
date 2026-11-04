import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { BookingDetail, PayMode, RateKey, SlotKey } from '../../types';
import { useCatalog } from '../../store/CatalogContext';
import { computeBooking } from '../../store/booking';
import { selKey } from '../../lib/sel';
import { NATC, mur } from '../../lib/format';
import { createStaffBooking, type BookingChannel, type PaymentMethod } from '../../lib/staffApi';
import { Btn, Field, SectionLabel, Spinner, inputStyle, textareaStyle } from './ui';
import { todayIsoPark } from './reportUi';
import { errorMessage } from '../../lib/errors';
import { expectOwnBooking, markOwnBooking } from './liveEvents';
import { fitLinesToParty, MAX_ADULTS, MAX_KIDS, type Party } from './bookings/partyLines';
import { partyLimitHint } from './bookings/BookingEditForm';

const CHANNELS: { key: BookingChannel; label: string }[] = [
  { key: 'desk', label: 'Desk walk-in' }, { key: 'phone', label: 'Phone' }, { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'email', label: 'E-mail' }, { key: 'agency', label: 'Agency / hotel' }, { key: 'other', label: 'Other' },
];

/** The channel this device used last: the front desk keeps "Desk walk-in", the phone desk "Phone". */
const CHANNEL_KEY = 'valle.staff.channel';
function lastChannel(): BookingChannel {
  try {
    const v = window.localStorage.getItem(CHANNEL_KEY) as BookingChannel | null;
    return v && CHANNELS.some((c) => c.key === v) ? v : 'desk';
  } catch { return 'desk'; }
}

/** How the party inputs read: the typed text, and the party it means (within the limits). */
const toParty = (a: string, k: string): Party => ({
  adults: Math.max(1, Math.min(MAX_ADULTS, Math.round(Number(a)) || 1)),
  kids: Math.max(0, Math.min(MAX_KIDS, Math.round(Number(k)) || 0)),
});

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
  // typed as text, so 15 shows a limit message instead of silently becoming 12
  const [adultsText, setAdultsText] = useState('2');
  const [kidsText, setKidsText] = useState('0');
  const { adults, kids } = toParty(adultsText, kidsText);
  const [rate, setRate] = useState<RateKey>('rr');
  const [payMode, setPayMode] = useState<PayMode>('gate');
  const [channel, setChannelState] = useState<BookingChannel>(lastChannel);
  const setChannel = (c: BookingChannel) => { setChannelState(c); try { window.localStorage.setItem(CHANNEL_KEY, c); } catch { /* private mode */ } };
  const [note, setNote] = useState('');
  const [coupon, setCoupon] = useState('');
  // money taken at the desk in the same step (a cash walk-in)
  const [payNow, setPayNow] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payAmount, setPayAmount] = useState('');
  const [payReceipt, setPayReceipt] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [pickAct, setPickAct] = useState('');
  const [pickVar, setPickVar] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // anything typed that closing would throw away
  const dirty = !!(name.trim() || phone.trim() || email.trim() || note.trim() || coupon.trim() || lines.length > 0 || payNow);
  const requestClose = useCallback(() => {
    if (dirty && !saving) setConfirmClose(true);
    else onClose();
  }, [dirty, saving, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);

  /** A party change fits the lines already added (never more on a line than in the party). */
  const changeParty = (a: string, k: string) => {
    const next = toParty(a, k);
    setLines((ls) => fitLinesToParty(ls, { adults, kids }, next));
    setAdultsText(a);
    setKidsText(k);
  };
  const adultsHint = partyLimitHint(adultsText, MAX_ADULTS, 'adults');
  const kidsHint = partyLimitHint(kidsText, MAX_KIDS, 'children');
  const overLimit = !!adultsHint || !!kidsHint;

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
  const cap = (f: 'adults' | 'kids' | 'units') => (f === 'adults' ? adults : f === 'kids' ? kids : 12);
  const bump = (i: number, f: 'adults' | 'kids' | 'units', d: number) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [f]: Math.max(0, Math.min(cap(f), l[f] + d)) } : l)).filter((l) => l.adults + l.kids + l.units > 0));

  const summary = useMemo(() => {
    const s: Record<string, { a?: number; k?: number; u?: number }> = {};
    for (const l of lines) s[selKey(l.id, l.variant)] = { a: l.adults, k: l.kids, u: l.units };
    return computeBooking(catalog, s, adults, kids, rate);
  }, [catalog, lines, adults, kids, rate]);

  const submit = async () => {
    if (saving) return;
    if (!name.trim() || (!phone.trim() && !email.trim())) { setErr('A guest name and a phone number or e-mail are needed.'); return; }
    if (overLimit) { setErr('More than 12 adults or 12 children is a group booking: use the group form, or split the party.'); return; }
    const amount = payAmount.trim() ? Math.round(Number(payAmount)) : undefined;
    if (payNow && amount !== undefined && !(amount > 0)) { setErr('Enter the amount taken, or leave it empty for the full total.'); return; }
    setErr('');
    setSaving(true);
    // the socket announces this booking too; it is not "news" for this operator
    expectOwnBooking(name.trim(), visitDate);
    try {
      const b = await createStaffBooking({
        visitDate, slot, adults, kids, rate, payMode, channel,
        items: lines.map((l) => ({ id: l.id, variant: l.variant, adults: l.adults || undefined, kids: l.kids || undefined, units: l.units || undefined })),
        name: name.trim(), phone: phone.trim() || undefined, email: email.trim() || undefined, nationality: nat || undefined,
        note: note.trim() || undefined,
        couponCode: coupon.trim().toUpperCase() || undefined,
        payment: payNow ? { method: payMethod, amount, receiptNo: payReceipt.trim() || undefined } : undefined,
      });
      markOwnBooking(b.refCode);
      onCreated(b);
    } catch (e) {
      setErr(errorMessage(e, 'Could not create the booking.'));
      setSaving(false);
    }
  };

  return (
    <>
      <div onClick={requestClose} data-testid="new-booking-backdrop" className="fixed inset-0 z-[80] bg-valle-deep/45 backdrop-blur-[4px]" />
      <aside role="dialog" aria-label="New booking" data-testid="new-booking" className="fixed top-0 right-0 bottom-0 z-[81] flex w-[min(560px,100%)] flex-col bg-white text-valle-purple shadow-[-24px_0_60px_-30px_rgba(31,0,51,.6)] [animation:vfade_.2s_ease_both]">
        <div className="flex items-center gap-2.5 border-b-[1.5px] border-solid border-valle-lilac px-5 py-4">
          <div>
            <div className="font-mono text-[10px] font-bold tracking-[.14em] text-valle-violet">NEW BOOKING</div>
            <div className="text-[18px] font-extrabold">Take a booking for a guest</div>
          </div>
          <button onClick={requestClose} aria-label="Close" className="ml-auto h-[34px] w-[34px] cursor-pointer rounded-full border-[1.5px] border-solid border-valle-lilac bg-white text-[16px]">×</button>
        </div>

        <div className="grid flex-1 gap-4 overflow-y-auto p-5">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="How the booking came in">
            {CHANNELS.slice(0, 2).map((c) => (
              <button
                key={c.key}
                type="button"
                aria-pressed={channel === c.key}
                data-testid={'nb-channel-' + c.key}
                onClick={() => setChannel(c.key)}
                className={'cursor-pointer rounded-full border-[1.5px] border-solid border-valle-purple px-4 py-2 [font-family:inherit] text-[13.5px] font-bold ' + (channel === c.key ? 'bg-valle-purple text-white' : 'bg-white text-valle-purple hover:bg-[#F4EEFF]')}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_1fr] gap-2.5">
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
          <div className="grid gap-2.5">
            <Field id="nb-name" tag="FULL NAME"><input id="nb-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name" style={inputStyle} /></Field>
            <div className="grid grid-cols-[1fr_1fr] gap-2.5">
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
          <div className="grid grid-cols-[1fr_1fr] gap-2.5">
            <Field id="nb-date" tag="DATE"><input id="nb-date" type="date" value={visitDate} min={todayIsoPark()} onChange={(e) => setVisitDate(e.target.value)} style={inputStyle} /></Field>
            <Field id="nb-slot" tag="ARRIVAL">
              <select id="nb-slot" value={slot} onChange={(e) => setSlot(e.target.value as SlotKey)} style={sel}>
                <option value="morning">Morning · 09:00–12:00</option><option value="afternoon">Afternoon · 12:00–15:30</option>
              </select>
            </Field>
            <Field id="nb-adults" tag={`ADULTS (12+ YRS) · MAX ${MAX_ADULTS}`} hint={adultsHint}><input id="nb-adults" type="number" min={1} max={MAX_ADULTS} value={adultsText} onChange={(e) => changeParty(e.target.value, kidsText)} aria-invalid={!!adultsHint} style={inputStyle} /></Field>
            <Field id="nb-kids" tag={`CHILDREN (6–11) · MAX ${MAX_KIDS}`} hint={kidsHint}><input id="nb-kids" type="number" min={0} max={MAX_KIDS} value={kidsText} onChange={(e) => changeParty(adultsText, e.target.value)} aria-invalid={!!kidsHint} style={inputStyle} /></Field>
          </div>

          <SectionLabel>EXPERIENCES</SectionLabel>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Experience" value={pickAct} onChange={(e) => { setPickAct(e.target.value); setPickVar(''); }} style={sel} className="flex-[1_1_180px]">
              <option value="">Add an experience…</option>
              {bookable.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {options.length > 0 && (
              <select aria-label="Option" value={pickVar} onChange={(e) => setPickVar(e.target.value)} style={sel} className="flex-[1_1_200px]">
                <option value="">Option…</option>
                {options.map((o) => <option key={o.n} value={o.n}>{o.n} · {mur(o[rate])}</option>)}
              </select>
            )}
            <Btn onClick={addLine} disabled={!act || (options.length > 0 && !pickVar)}>Add</Btn>
          </div>
          {lines.length > 0 && (
            <div className="grid gap-2">
              {lines.map((l, i) => {
                const a = catalog.ACTS.find((x) => x.id === l.id);
                const flat = a?.mode === 'flat';
                return (
                  <div key={i} className="flex flex-wrap items-center gap-2.5 rounded-[12px] border-[1.5px] border-solid border-valle-lilac px-3 py-2">
                    <div className="min-w-0 flex-[1_1_160px]">
                      <div className="text-[13.5px] font-bold">{a?.name}</div>
                      {l.variant && <div className="font-mono text-[10px] text-valle-purple/60">{l.variant}</div>}
                    </div>
                    {flat ? (
                      <Counter label={a?.flatLabel || 'units'} value={l.units} onChange={(d) => bump(i, 'units', d)} />
                    ) : (
                      <>
                        <Counter label="adults" value={l.adults} onChange={(d) => bump(i, 'adults', d)} />
                        <Counter label="kids" value={l.kids} onChange={(d) => bump(i, 'kids', d)} />
                      </>
                    )}
                    <button onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label="Remove" className="cursor-pointer border-0 bg-transparent text-[16px] text-[#D6173F]">×</button>
                  </div>
                );
              })}
            </div>
          )}

          <SectionLabel>PAYMENT, CODE & NOTE</SectionLabel>
          <div className="grid gap-2.5">
            <div className="grid grid-cols-[1fr_1fr] gap-2.5">
              <Field id="nb-pay" tag="PAYMENT">
                <select id="nb-pay" value={payMode} onChange={(e) => { setPayMode(e.target.value as PayMode); if (e.target.value === 'online') setPayNow(false); }} style={sel}>
                  <option value="gate">Pays at the park</option><option value="online">Paid online / by transfer</option>
                </select>
              </Field>
              <Field id="nb-coupon" tag="OFFER CODE" hint={coupon.trim() ? 'Applied by the server on confirm; the total below is before the code' : undefined}>
                <input id="nb-coupon" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="HOTEL10" maxLength={24} className="font-mono uppercase" style={inputStyle} data-testid="nb-coupon" />
              </Field>
            </div>
            {payMode === 'gate' && (
              <label className="flex cursor-pointer items-center gap-2 text-[14px] font-semibold">
                <input type="checkbox" checked={payNow} onChange={(e) => setPayNow(e.target.checked)} data-testid="nb-pay-now" className="h-[18px] w-[18px] accent-valle-purple" />
                Take the payment now (walk-in paying at the desk)
              </label>
            )}
            {payNow && payMode === 'gate' && (
              <div data-testid="nb-pay-form" className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2.5 rounded-[14px] border-[1.5px] border-solid border-valle-lilac bg-[#F7F3FF] p-3">
                <Field id="nb-pay-how" tag="HOW">
                  <select id="nb-pay-how" value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)} style={sel}>
                    <option value="cash">Cash</option><option value="card">Card</option><option value="juice">Juice</option><option value="other">Other</option>
                  </select>
                </Field>
                <Field id="nb-pay-amt" tag="AMOUNT (RS)">
                  <input id="nb-pay-amt" type="number" min={1} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder={'Full total'} style={inputStyle} data-testid="nb-pay-amount" />
                </Field>
                <Field id="nb-pay-rc" tag="TILL RECEIPT NO.">
                  <input id="nb-pay-rc" value={payReceipt} onChange={(e) => setPayReceipt(e.target.value)} placeholder="optional" style={inputStyle} />
                </Field>
                <div className="col-span-full font-mono text-[10px] tracking-[.06em] text-valle-purple/60">EMPTY AMOUNT = THE FULL TOTAL THE SERVER PRICES (CODE INCLUDED)</div>
              </div>
            )}
            <Field id="nb-note" tag="INTERNAL NOTE" hint="Deposit taken, special requests, agency reference…">
              <textarea id="nb-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} style={textareaStyle} />
            </Field>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t-[1.5px] border-solid border-valle-lilac px-5 py-3.5">
          <div>
            <div className="font-mono text-[9.5px] tracking-[.12em] text-valle-violet">TOTAL{summary.hasDiscount ? ' · EXPLORER PASS -15%' : ''}</div>
            <div className="font-display text-[24px] font-black italic" data-testid="new-booking-total">{mur(summary.total)}</div>
          </div>
          {err && <div role="alert" className="flex-[1_1_100%] text-[13px] font-semibold text-[#D6173F]">{err}</div>}
          {confirmClose ? (
            <div role="alertdialog" aria-label="Unsaved booking" data-testid="nb-discard-confirm" className="flex flex-[1_1_100%] flex-wrap items-center gap-2 rounded-[14px] border-[1.5px] border-solid border-[#FFD24D] bg-[#FFF4D6] px-3 py-2.5">
              <span className="flex-[1_1_200px] text-[13.5px] font-bold">Discard this booking? What you typed will be lost.</span>
              <Btn onClick={() => setConfirmClose(false)} data-testid="nb-discard-keep">Keep editing</Btn>
              <Btn variant="danger" onClick={onClose} data-testid="nb-discard-yes">Discard</Btn>
            </div>
          ) : (
            <div className="ml-auto flex gap-2">
              <Btn variant="ghost" onClick={requestClose}>Cancel</Btn>
              <Btn onClick={() => { void submit(); }} disabled={saving || overLimit}>{saving ? <Spinner size={6} /> : payNow ? 'Confirm & record payment' : 'Confirm booking'}</Btn>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

const counterBtn = 'h-[26px] w-[26px] cursor-pointer rounded-full border-[1.5px] border-solid border-valle-lilac bg-white font-bold';

function Counter({ label, value, onChange }: { label: string; value: number; onChange: (d: number) => void }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="font-mono text-[9.5px] tracking-[.1em] text-valle-purple/60">{label.toUpperCase()}</span>
      <button onClick={() => onChange(-1)} aria-label={`Fewer ${label}`} className={counterBtn}>−</button>
      <span className="min-w-4 text-center font-mono font-bold">{value}</span>
      <button onClick={() => onChange(1)} aria-label={`More ${label}`} className={counterBtn}>+</button>
    </div>
  );
}
