import { breadcrumbs, useSeo } from '../lib/seo';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { BookingRequest, SelLine } from '../types';
import { useApp } from '../store/AppStore';
import { useCatalog } from '../store/CatalogContext';
import { useGoto } from '../lib/nav';
import { useCardModel, type CardModel } from '../lib/card';
import { createBooking } from '../lib/api';
import { money, mur, partyLabel, dateOpts, todayIso, fullDateFromIso, NATC, type DateOpt } from '../lib/format';
import { checkCoupon, fetchAvailability, type AvailabilityDay, type BusyLevel } from '../lib/api';
import { entryPrices } from '../store/booking';
import { useHover } from '../hooks/useHover';
import { useReveal } from '../hooks/useReveal';
import { localizePath, tr, useT, _t } from '../i18n';
import { InstallCard } from '../components/InstallApp';

/** The waiver form sits next to the ticket: same reference, same token, in the page's language. */
function waiverHref(ticketUrl: string): string {
  try {
    const u = new URL(ticketUrl, window.location.origin);
    return localizePath(u.pathname.replace('/ticket/', '/waiver/') + u.search);
  } catch {
    return ticketUrl.replace('/ticket/', '/waiver/');
  }
}

const MONO = "'Chivo Mono',monospace";
const BARLOW = "'Barlow',sans-serif";

// Nationality values (NATC keys) are stored and sent in English; listed here so the extractor sees them.
const NATIONALITY_KEYS = [_t('Mauritius'), _t('Réunion / France'), _t('United Kingdom'), _t('Germany'), _t('Italy'), _t('India'), _t('China'), _t('South Africa'), _t('UAE'), _t('Australia'), _t('USA')];
void NATIONALITY_KEYS;

const stepLabel: CSSProperties = {
  fontFamily: MONO, fontSize: '11.5px', fontWeight: 600, letterSpacing: '.14em', color: 'rgba(52,0,87,.55)',
};

const stepperTag: CSSProperties = {
  fontFamily: MONO, fontSize: '8.5px', letterSpacing: '.05em', color: 'rgba(52,0,87,.55)',
};

const inputStyle: CSSProperties = {
  width: '100%', border: '1.5px solid #EBE2FF', background: '#F7F3FF', borderRadius: '12px',
  padding: '13px 16px', fontFamily: 'inherit', fontSize: '15px', outline: 'none', color: '#340057',
};

/* Stepper +/− button with hover background (style-hover="background:#EBE2FF") */
function StepBtn({ onClick, bg, children }: { onClick: () => void; bg: string; children: ReactNode }) {
  const [h, bind] = useHover();
  return (
    <button
      onClick={onClick}
      {...bind}
      style={{
        border: 0, background: h ? '#EBE2FF' : bg, borderRadius: '7px', width: '26px', height: '26px',
        cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#340057', lineHeight: 1,
      }}
    >
      {children}
    </button>
  );
}

/* ADULTS / CHILD 6–11 / UNITS stepper group */
function Stepper({ tag, val, inc, dec, boxBg, btnBg }: {
  tag: string; val: number; inc: () => void; dec: () => void; boxBg: string; btnBg: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: boxBg, borderRadius: '10px', padding: '4px 7px' }}>
      <span style={stepperTag}>{tag}</span>
      <StepBtn onClick={dec} bg={btnBg}>−</StepBtn>
      <span style={{ fontSize: '14px', fontWeight: 700, minWidth: '16px', textAlign: 'center' }}>{val}</span>
      <StepBtn onClick={inc} bg={btnBg}>+</StepBtn>
    </div>
  );
}

/* 1 · TAP TO ADD EXPERIENCES: pick card */
function BookCard({ m }: { m: CardModel }) {
  const [h, bind] = useHover();
  const on = m.selOn;
  return (
    <div
      onClick={m.add}
      {...bind}
      style={{
        cursor: 'pointer',
        background: on ? 'rgba(115,51,255,.08)' : '#FFFFFF',
        border: '1.5px solid ' + (on ? '#7333FF' : '#EBE2FF'),
        borderRadius: '14px', overflow: 'hidden', transition: 'all .15s',
        ...(h ? { transform: 'translateY(-3px)' } : undefined),
      }}
    >
      <div style={{ position: 'relative', height: '86px', background: '#EBE2FF' }}>
        <img src={m.img} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <span style={{
          position: 'absolute', top: '8px', right: '8px',
          background: on ? '#33FF74' : 'rgba(52,0,87,.5)', color: on ? '#340057' : '#FFFFFF',
          border: '1.5px solid #FFFFFF', width: '24px', height: '24px', borderRadius: '999px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800,
        }}>{on ? '✓' : '+'}</span>
      </div>
      <div style={{ padding: '9px 11px 11px' }}>
        <div style={{ fontWeight: 700, fontSize: '12.5px', lineHeight: 1.25 }}>{m.name}</div>
        <div style={{ marginTop: '4px', fontFamily: MONO, fontSize: '9px', fontWeight: 700, color: 'rgba(52,0,87,.6)' }}>{m.priceLabel}</div>
      </div>
    </div>
  );
}

/* 2 · YOUR DAY: one cart line */
function CartLine({ line }: { line: SelLine }) {
  const t = useT();
  const app = useApp();
  const goto = useGoto();
  const [hx, bindX] = useHover();
  const a = line.act;
  const c = line.qty;
  const price = line.price;
  const isFlat = a.mode === 'flat';
  const amt = isFlat ? price * (c.u || 0) : price * (c.a || 0) + Math.round(price * 0.5) * (c.k || 0);
  const each = isFlat
    ? money(price) + ' ' + tr(a.flatLabel || '').toUpperCase()
    : t('{adult} /ADULT · {child} /CHILD', { adult: money(price), child: money(Math.round(price * 0.5)) });
  const key = a.flatLabel ? a.flatLabel.replace('/', '').trim().toLowerCase() : '';
  const unitName = key === 'buggy' ? t('BUGGIES') : key === 'group' ? t('GROUPS') : t('UNITS');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 18px', flexWrap: 'wrap', borderTop: '1px dashed #EBE2FF' }}>
      <div
        onClick={() => goto.detail(a.id)}
        style={{ width: '52px', height: '52px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, cursor: 'pointer', background: '#EBE2FF' }}
      >
        <img src={a.img} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ flex: 1, minWidth: '130px' }}>
        <div style={{ fontWeight: 700, fontSize: '14.5px' }}>{a.name}</div>
        {line.variant && <div style={{ fontSize: '11.5px', color: '#7333FF', fontWeight: 600, marginTop: '2px' }}>{t(line.variant)}</div>}
        <div style={{ fontFamily: MONO, fontSize: '10px', color: 'rgba(52,0,87,.6)', marginTop: '3px' }}>{each}</div>
      </div>
      {!isFlat && (
        <>
          <Stepper tag={t('ADULTS')} val={c.a || 0} inc={() => app.bumpSel(line.key, 'a', 1)} dec={() => app.bumpSel(line.key, 'a', -1)} boxBg="#F7F3FF" btnBg="#FFFFFF" />
          <Stepper tag={t('CHILD 6–11')} val={c.k || 0} inc={() => app.bumpSel(line.key, 'k', 1)} dec={() => app.bumpSel(line.key, 'k', -1)} boxBg="#F7F3FF" btnBg="#FFFFFF" />
        </>
      )}
      {isFlat && (
        <Stepper tag={unitName} val={c.u || 0} inc={() => app.bumpSel(line.key, 'u', 1)} dec={() => app.bumpSel(line.key, 'u', -1)} boxBg="#F7F3FF" btnBg="#FFFFFF" />
      )}
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: '13px', minWidth: '84px', textAlign: 'right' }}>{money(amt)}</div>
      <button
        onClick={() => app.toggleSel(a.id, line.variant)}
        title={t('Remove')}
        {...bindX}
        style={{
          border: '1.5px solid ' + (hx ? '#FF3358' : '#EBE2FF'), background: 'transparent',
          color: hx ? '#FF3358' : 'rgba(52,0,87,.55)', width: '28px', height: '28px', borderRadius: '999px',
          cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0,
        }}
      >×</button>
    </div>
  );
}

/* 3 · WHEN: how busy a slot already is (from /api/bookings/availability) */
const LEVEL_COLOR: Record<BusyLevel, string> = { quiet: '#33FF74', busy: '#FFFC33', 'very-busy': '#FF9F33', full: '#FF3358' };
const LEVEL_LABEL: Record<BusyLevel, string> = { quiet: _t('QUIET'), busy: _t('BUSY'), 'very-busy': _t('VERY BUSY'), full: _t('FULLY BOOKED') };
const LEVEL_WORD: Record<BusyLevel, string> = { quiet: _t('quiet'), busy: _t('busy'), 'very-busy': _t('very busy'), full: _t('fully booked') };

function LoadDots({ load, on }: { load?: AvailabilityDay; on: boolean }) {
  const t = useT();
  if (!load) return <div style={{ height: '6px', marginTop: '5px' }} />;
  const dot = (l: BusyLevel): CSSProperties => ({
    width: '7px', height: '7px', borderRadius: '999px', background: LEVEL_COLOR[l], display: 'inline-block',
    boxShadow: on ? '0 0 0 1.5px rgba(255,255,255,.7)' : '0 0 0 1px rgba(52,0,87,.15)',
  });
  return (
    <div
      data-testid="load-dots"
      title={t('Morning: {morning} · Afternoon: {afternoon}', { morning: t(LEVEL_WORD[load.morning.level]), afternoon: t(LEVEL_WORD[load.afternoon.level]) })}
      style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '5px', height: '6px', alignItems: 'center' }}
    >
      <span style={dot(load.morning.level)} />
      <span style={dot(load.afternoon.level)} />
    </div>
  );
}

/* 3 · WHEN: date chip */
function DateChip({ o, on, onClick, load }: { o: DateOpt; on: boolean; onClick: () => void; load?: AvailabilityDay }) {
  const [h, bind] = useHover();
  return (
    <button
      onClick={onClick}
      {...bind}
      style={{
        border: '1.5px solid ' + (on ? '#7333FF' : '#EBE2FF'),
        background: on ? '#7333FF' : '#FFFFFF',
        color: on ? '#FFFFFF' : '#340057',
        cursor: 'pointer', fontFamily: 'inherit', padding: '12px 6px', borderRadius: '14px',
        textAlign: 'center', transition: 'all .15s',
        ...(h ? { transform: 'translateY(-1px)' } : undefined),
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: '9.5px', fontWeight: 600, letterSpacing: '.08em', opacity: 0.7 }}>{o.dow}</div>
      <div style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: '22px', marginTop: '2px' }}>{o.dd}</div>
      <div style={{ fontFamily: MONO, fontSize: '9.5px', fontWeight: 600, opacity: 0.7 }}>{o.mm}</div>
      <LoadDots load={load} on={on} />
    </button>
  );
}

/* 3 · WHEN: slot chip */
function SlotChip({ label, sub, on, onClick, level }: { label: string; sub: string; on: boolean; onClick: () => void; level?: BusyLevel }) {
  const t = useT();
  const [h, bind] = useHover();
  return (
    <button
      onClick={onClick}
      {...bind}
      style={{
        border: '1.5px solid ' + (on ? '#7333FF' : '#EBE2FF'),
        background: on ? '#7333FF' : '#FFFFFF',
        color: on ? '#FFFFFF' : '#340057',
        cursor: 'pointer', fontFamily: 'inherit', padding: '13px 20px', borderRadius: '14px',
        textAlign: 'left', transition: 'all .15s',
        ...(h ? { transform: 'translateY(-1px)' } : undefined),
      }}
    >
      <div style={{ fontWeight: 700, fontSize: '15px' }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: '10.5px', opacity: 0.7, marginTop: '2px' }}>{sub}</div>
      {level && (
        <div data-testid="slot-level" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: MONO, fontSize: '9.5px', fontWeight: 700, letterSpacing: '.08em', marginTop: '7px', color: on ? '#FFFFFF' : '#340057' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '999px', background: LEVEL_COLOR[level], display: 'inline-block' }} />
          {t(LEVEL_LABEL[level])}
        </div>
      )}
    </button>
  );
}

/* 4 · DETAILS: text input with focus border (style-focus="border-color:#7333FF") */
function Field({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [f, setF] = useState(false);
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setF(true)}
      onBlur={() => setF(false)}
      placeholder={placeholder}
      style={{ ...inputStyle, ...(f ? { borderColor: '#7333FF' } : undefined) }}
    />
  );
}

/* 5 · PAYMENT: pay mode card */
function PayCard({ on, bgOn, title, note, onClick }: { on: boolean; bgOn: string; title: string; note: string; onClick: () => void }) {
  const [h, bind] = useHover();
  return (
    <div
      onClick={onClick}
      {...bind}
      style={{
        cursor: 'pointer',
        border: '2px solid ' + (on ? '#340057' : '#EBE2FF'),
        background: on ? bgOn : '#FFFFFF',
        borderRadius: '16px', padding: '16px 18px', transition: 'all .15s',
        ...(h ? { transform: 'translateY(-2px)' } : undefined),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ width: '18px', height: '18px', borderRadius: '999px', border: '2px solid #340057', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '999px', background: on ? '#340057' : 'transparent' }} />
        </span>
        <span style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 800, fontSize: '18px', textTransform: 'uppercase' }}>{title}</span>
      </div>
      <div style={{ fontSize: '13px', color: 'rgba(52,0,87,.7)', marginTop: '8px', lineHeight: 1.5 }}>{note}</div>
    </div>
  );
}

/* Confirm button in the sticky summary bar */
function ConfirmBtn({ label, onClick }: { label: string; onClick: () => void }) {
  const [h, bind] = useHover();
  return (
    <button
      onClick={onClick}
      {...bind}
      style={{
        border: 0, background: h ? '#D91E44' : '#FF3358', cursor: 'pointer', fontFamily: 'inherit',
        fontSize: '14.5px', fontWeight: 700, color: '#FFFFFF', padding: '14px 26px', borderRadius: '999px',
        boxShadow: '0 8px 20px rgba(255,51,88,.4)',
        ...(h ? { transform: 'translateY(-1px)' } : undefined),
      }}
    >
      {label}
    </button>
  );
}

export default function BookingPage() {
  const t = useT();
  useSeo({ title: t('Book your day · VALLÉ Advenature™ Park'), description: t('Build your day at Vallé: pick ziplines, quad tracks, buggies and more, choose a date and pay online or at the gate. Free to book, no cancellation fee.'), canonicalPath: '/booking', jsonLd: [breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Book your day', path: '/booking' }])] });
  const ref = useReveal<HTMLElement>();
  const catalog = useCatalog();
  const app = useApp();
  const goto = useGoto();
  const card = useCardModel();
  const location = useLocation();
  const {
    rate, sel, adults, kids, setAdults, setKids,
    dateIdx, setDateIdx, customDate, setCustomDate, slot, setSlot, booking, clearSel,
    name, setName, phone, setPhone, email, setEmail, nat, setNat, payMode, setPayMode,
  } = app;

  // flow state (transient; unlike the contact fields it never outlives the page)
  const [formErr, setFormErr] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [refCode, setRefCode] = useState('');
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [ticket, setTicket] = useState<{ ticketUrl?: string; qrUrl?: string }>({});
  // promo / partner code: checked live, applied by the server when the booking is made
  const [coupon, setCoupon] = useState('');
  const [offer, setOffer] = useState<{ code: string; kind: string; value: number; note: string } | null>(null);
  const [couponMsg, setCouponMsg] = useState('');
  const [applied, setApplied] = useState<{ amount: number; note: string; code: string } | null>(null);
  const tryCoupon = async () => {
    const code = coupon.trim();
    if (!code) { setOffer(null); setCouponMsg(''); return; }
    try {
      const o = await checkCoupon(code);
      setOffer(o);
      setCouponMsg(o.kind === 'percent' ? t('Code applied: {n}% off', { n: o.value }) : o.kind === 'amount' ? t('Code applied: Rs {n} off', { n: o.value }) : o.kind === 'entry_free' ? t('Code applied: park entry free') : t('Code applied: free of charge'));
    } catch {
      setOffer(null);
      setCouponMsg(t('This code is not valid or has expired.'));
    }
  };
  const [submitting, setSubmitting] = useState(false);
  const [natFocus, setNatFocus] = useState(false);
  const [backHov, backBind] = useHover();

  // Every booking entry point returned to the form in the original
  // (_nav('booking', { confirmed: false }) + scrollTo(0,0)).
  useEffect(() => {
    setConfirmed(false);
    window.scrollTo(0, 0);
  }, [location.key]);

  const dOpts = useMemo(() => dateOpts(14), []);
  const tIso = todayIso();

  // How busy each day already is, keyed by ISO date. Missing = unknown (API away): no dots.
  const [avail, setAvail] = useState<Record<string, AvailabilityDay>>({});
  const mergeAvail = (days: AvailabilityDay[]) => setAvail((prev) => {
    const next = { ...prev };
    for (const d of days) next[d.date] = d;
    return next;
  });
  useEffect(() => {
    let dead = false;
    fetchAvailability(tIso, 14).then((d) => { if (!dead) mergeAvail(d); }).catch(() => { /* picker works without it */ });
    return () => { dead = true; };
  }, [tIso]);
  useEffect(() => {
    if (!customDate || avail[customDate]) return;
    let dead = false;
    fetchAvailability(customDate, 1).then((d) => { if (!dead) mergeAvail(d); }).catch(() => { /* ignore */ });
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customDate]);
  const selectedIso = customDate || (dOpts[dateIdx] ? dOpts[dateIdx].iso : dOpts[0].iso);
  const selectedLoad = avail[selectedIso];

  const bookCards = catalog.ACTS.filter((a) => a.mode === 'pp' || a.mode === 'flat').map(card);
  const cartActs = booking.selLines;
  const cartCountLabel = cartActs.length === 0
    ? t('PARK ENTRY')
    : (cartActs.length > 1 ? t('{n} EXPERIENCES + ENTRY', { n: cartActs.length }) : t('{n} EXPERIENCE + ENTRY', { n: cartActs.length }));
  const ep = entryPrices(catalog, rate);
  const entryNote = t('{adult} /ADULT (12+) · {child} /CHILD (6 TO 11) · UNDER 6 FREE', { adult: money(ep.adult), child: money(ep.child) });
  const entryAmt = money(ep.adult * adults + ep.child * kids);
  const passHint = booking.hasDiscount
    ? t('✓ Explorer Pass applied · 15% off your adventures.')
    : t('Tip: pick any 3 adventures and the Explorer Pass takes 15% off them automatically.');
  const passHintBg = booking.hasDiscount ? '#E2FFEB' : '#FFFFE2';
  const inForeign = app.currency !== 'MUR';
  const sumLine = (cartActs.length === 0 ? t('Park entry only') : (cartActs.length > 1 ? t('{n} experiences + entry', { n: cartActs.length }) : t('{n} experience + entry', { n: cartActs.length })))
    + ' · ' + mur(booking.total) + (inForeign ? ' (' + money(booking.total) + ')' : '');
  const payModeNote = payMode === 'online' ? t('E-RECEIPT BY EMAIL & SMS, INSTANTLY') : t('FREE · NO CANCELLATION FEE');
  const confirmLabel = payMode === 'online' ? t('Pay {amount} now →', { amount: mur(booking.total) }) : t('Confirm and pay on arrival →');

  let dateSummary = dOpts[dateIdx] ? dOpts[dateIdx].full : '';
  if (customDate) {
    const f = fullDateFromIso(customDate);
    if (f) dateSummary = f;
  }
  const slotName = slot === 0 ? t('Morning arrival') : t('Afternoon arrival');
  const partySummary = partyLabel(adults, kids);

  const setNatAndPrefill = (v: string) => {
    setNat(v);
    setFormErr(false);
    setApiErr('');
    const code = NATC[v];
    if (code && (!phone.trim() || /^\+\d{1,4}$/.test(phone.trim()))) setPhone(code + ' ');
  };

  const confirmNow = async () => {
    if (submitting) return;
    const ok = name.trim() && (email.trim() || phone.trim());
    if (!ok) { setFormErr(true); return; }
    setFormErr(false);
    setApiErr('');
    setSubmitting(true);
    const req: BookingRequest = {
      visitDate: customDate || (dOpts[dateIdx] ? dOpts[dateIdx].iso : dOpts[0].iso),
      slot: slot === 0 ? 'morning' : 'afternoon',
      adults,
      kids,
      rate: rate ?? 'rr',
      items: booking.selLines.map((l) => ({ id: l.act.id, variant: l.variant, adults: l.qty.a, kids: l.qty.k, units: l.qty.u })),
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      nationality: nat || undefined,
      payMode,
      couponCode: offer ? offer.code : undefined,
    };
    let code: string;
    try {
      const res = await createBooking(req);
      code = res.refCode;
      setTicket({ ticketUrl: res.ticketUrl, qrUrl: res.qrUrl });
      setApplied(res.adjustment ? { amount: res.adjustment, note: res.adjustmentNote || '', code: res.couponCode || '' } : null);
      setServerTotal(typeof res.total === 'number' ? res.total : null);
    } catch (e) {
      // Whether the server refused or never answered, the desk has no record of this
      // booking, so no reference is shown: a guest turning up with a phantom VAL code
      // is worse than a retry.
      const status = (e as { status?: number }).status;
      setApiErr(status
        ? ((e as Error).message || t('We could not confirm your booking. Please try again.'))
        : t('We could not reach the booking desk. Check your connection and try again, or WhatsApp us on {phone}.', { phone: '+230 5292 8841' }));
      setSubmitting(false);
      return;
    }
    setRefCode(code);
    setSubmitting(false);
    setConfirmed(true);
    window.scrollTo(0, 0);
  };

  const startOver = () => {
    setConfirmed(false);
    setFormErr(false);
    setApiErr('');
    setName('');
    setPhone('');
    setEmail('');
    setNat('');
    setPayMode('gate');
    clearSel();
    goto.home();
  };

  // confirmation bits
  const guestLine = (name.trim() || t('Guest')) + (nat ? ' · ' + t(nat) : '');
  const payStamp = payMode === 'online' ? t('PAID ✓') : t('PAY ON ARRIVAL');
  const payStampBg = payMode === 'online' ? '#33FF74' : '#FFFC33';
  const totalRowLabel = payMode === 'online' ? t('Total paid') : t('Total on arrival');
  const receiptHint = payMode === 'online'
    ? t('All paid. Just show this QR at the gate.')
    : t('Show this reference at the gate and pay there, cash or card.');
  const contactBits: string[] = [];
  if (email.trim()) contactBits.push(email.trim());
  if (phone.trim()) contactBits.push('SMS ' + phone.trim());
  const sentLine = t('CONFIRMATION & E-RECEIPT SENT TO {contact}', { contact: (contactBits.join(' · ') || t('YOUR CONTACT DETAILS')).toUpperCase() });

  return (
    <main ref={ref} style={{ maxWidth: '1180px', margin: '0 auto', padding: '104px clamp(16px,3.5vw,40px) 0' }}>
      {!confirmed && (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <h1 style={{
              fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(38px,5.8vw,74px)',
              lineHeight: 0.82, letterSpacing: '-0.01em', margin: 0, textTransform: 'uppercase',
              transform: 'rotate(-4deg)', transformOrigin: 'left bottom',
            }}>{t('Build your day')}</h1>
            <span style={{ fontFamily: MONO, fontSize: '12px', fontWeight: 600, letterSpacing: '.16em', color: 'rgba(52,0,87,.55)' }}>{t('BOOKING MADE SIMPLE')}</span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: '12px', color: 'rgba(52,0,87,.6)', marginTop: '12px' }}>{t('FREE TO BOOK · PAY ONLINE OR AT THE GATE · E-RECEIPT BY EMAIL & SMS')}</div>

          <div style={{ display: 'flex', gap: 'clamp(18px,2.5vw,28px)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1.7, minWidth: 'min(100%,380px)' }}>
              {/* 1 · PICK EXPERIENCES */}
              <div style={{ marginTop: '30px' }}>
                <div style={stepLabel}>{t('1 · TAP TO ADD EXPERIENCES')}</div>
                <div style={{ background: passHintBg, borderRadius: '14px', padding: '13px 18px', fontSize: '13.5px', color: '#340057', fontWeight: 600, marginTop: '12px' }}>{passHint}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(146px,1fr))', gap: '10px', marginTop: '14px' }}>
                  {bookCards.map((m) => <BookCard key={m.id} m={m} />)}
                </div>
              </div>

              {/* 2 · YOUR DAY (cart) */}
              <div style={{ marginTop: '34px' }}>
                <div style={stepLabel}>{t('2 · YOUR DAY')} · {cartCountLabel}</div>
                <div style={{ background: '#FFFFFF', borderRadius: '18px', boxShadow: '0 0 0 1.5px #EBE2FF', marginTop: '12px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', flexWrap: 'wrap', background: '#F7F3FF' }}>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14.5px' }}>{t('Park entry')}</div>
                      <div style={{ fontFamily: MONO, fontSize: '10px', color: 'rgba(52,0,87,.6)', marginTop: '3px' }}>{entryNote} · {t('ALL NATURE TRAILS INCLUDED')}</div>
                    </div>
                    <Stepper tag={t('ADULTS')} val={adults} inc={() => setAdults(adults + 1)} dec={() => setAdults(adults - 1)} boxBg="#FFFFFF" btnBg="#F7F3FF" />
                    <Stepper tag={t('CHILD 6–11')} val={kids} inc={() => setKids(kids + 1)} dec={() => setKids(kids - 1)} boxBg="#FFFFFF" btnBg="#F7F3FF" />
                    <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: '13px', minWidth: '84px', textAlign: 'right' }}>{entryAmt}</div>
                  </div>
                  {cartActs.map((l) => <CartLine key={l.key} line={l} />)}
                  {cartActs.length === 0 && (
                    <div style={{ padding: '15px 18px', borderTop: '1px dashed #EBE2FF', fontSize: '13.5px', color: 'rgba(52,0,87,.55)' }}>
                      {t('No experiences yet. Tap the cards above to add them. All nature trails are already covered by your entry.')}
                    </div>
                  )}
                </div>
              </div>

              {/* 3 · WHEN */}
              <div style={{ marginTop: '34px' }}>
                <div style={stepLabel}>{t('3 · WHEN ARE YOU COMING?')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(86px,1fr))', gap: '8px', marginTop: '12px' }}>
                  {dOpts.map((o) => (
                    <DateChip
                      key={o.i}
                      o={o}
                      on={!customDate && dateIdx === o.i}
                      onClick={() => { setDateIdx(o.i); setCustomDate(''); }}
                      load={avail[o.iso]}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: MONO, fontSize: '10px', fontWeight: 600, letterSpacing: '.08em', color: 'rgba(52,0,87,.55)' }}>{t('ANOTHER MONTH? PICK ANY DATE →')}</span>
                  <input
                    type="date"
                    value={customDate}
                    min={tIso}
                    onChange={(e) => setCustomDate(e.target.value)}
                    style={{
                      border: '1.5px solid ' + (customDate ? '#7333FF' : '#EBE2FF'),
                      background: customDate ? '#7333FF' : '#FFFFFF',
                      color: customDate ? '#FFFFFF' : '#340057',
                      borderRadius: '14px', padding: '10px 14px', fontFamily: 'inherit', fontSize: '14px',
                      fontWeight: 600, cursor: 'pointer', outline: 'none',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                  <SlotChip label={t('Morning')} sub={t('ARRIVE 09:00–12:00')} on={slot === 0} onClick={() => setSlot(0)} level={selectedLoad?.morning.level} />
                  <SlotChip label={t('Afternoon')} sub={t('ARRIVE 12:00–15:30')} on={slot === 1} onClick={() => setSlot(1)} level={selectedLoad?.afternoon.level} />
                </div>
                {Object.keys(avail).length > 0 && (
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px', fontFamily: MONO, fontSize: '9.5px', letterSpacing: '.06em', color: 'rgba(52,0,87,.6)' }}>
                    <span>{t('DOTS = MORNING · AFTERNOON, FROM BOOKINGS SO FAR:')}</span>
                    {(['quiet', 'busy', 'very-busy', 'full'] as BusyLevel[]).map((l) => (
                      <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '999px', background: LEVEL_COLOR[l], display: 'inline-block' }} />{t(LEVEL_LABEL[l])}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 'min(100%,300px)', position: 'sticky', top: '84px' }}>
              {/* 4 · DETAILS */}
              <div style={{ marginTop: '30px' }}>
                <div style={stepLabel}>{t('4 · YOUR DETAILS · FOR YOUR CONFIRMATION & E-RECEIPT')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '10px', marginTop: '12px' }}>
                  <Field value={name} onChange={(v) => { setName(v); setFormErr(false); setApiErr(''); }} placeholder={t('Full name')} />
                  <div style={{ position: 'relative' }}>
                    <select
                      value={nat}
                      onChange={(e) => setNatAndPrefill(e.target.value)}
                      onFocus={() => setNatFocus(true)}
                      onBlur={() => setNatFocus(false)}
                      style={{
                        width: '100%', appearance: 'none', WebkitAppearance: 'none',
                        border: '1.5px solid ' + (natFocus ? '#7333FF' : '#EBE2FF'), background: '#F7F3FF',
                        borderRadius: '12px', padding: '13px 34px 13px 16px', fontFamily: 'inherit',
                        fontSize: '15px', color: '#340057', cursor: 'pointer', outline: 'none',
                      }}
                    >
                      <option value="">{t('Nationality')}</option>
                      <option value="Mauritius">{t('Mauritius')}</option>
                      <option value="Réunion / France">{t('Réunion / France')}</option>
                      <option value="United Kingdom">{t('United Kingdom')}</option>
                      <option value="Germany">{t('Germany')}</option>
                      <option value="Italy">{t('Italy')}</option>
                      <option value="India">{t('India')}</option>
                      <option value="China">{t('China')}</option>
                      <option value="South Africa">{t('South Africa')}</option>
                      <option value="UAE">{t('UAE')}</option>
                      <option value="Australia">{t('Australia')}</option>
                      <option value="USA">{t('USA')}</option>
                      <option value="Other">{t('Other')}</option>
                    </select>
                    <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '11px', color: 'rgba(52,0,87,.55)' }}>▾</span>
                  </div>
                  <Field value={phone} onChange={(v) => { setPhone(v); setFormErr(false); setApiErr(''); }} placeholder={t('Contact number (SMS / WhatsApp)')} />
                  <Field value={email} onChange={(v) => { setEmail(v); setFormErr(false); setApiErr(''); }} placeholder={t('Email')} />
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '10px' }}>
                  <input
                    value={coupon}
                    onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setOffer(null); setCouponMsg(''); }}
                    onBlur={() => { void tryCoupon(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void tryCoupon(); } }}
                    placeholder={t('Promo or partner code (optional)')}
                    data-testid="coupon-input"
                    dir="ltr"
                    style={{ ...inputStyle, flex: '1 1 220px', fontFamily: MONO, textTransform: 'uppercase', borderColor: offer ? '#33FF74' : '#EBE2FF' }}
                  />
                  <button type="button" onClick={() => { void tryCoupon(); }} style={{ border: '1.5px solid #340057', background: '#FFFFFF', color: '#340057', borderRadius: '999px', padding: '11px 16px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>{t('Apply')}</button>
                  {couponMsg && <span data-testid="coupon-msg" style={{ fontSize: '13px', fontWeight: 600, color: offer ? '#1E9E4A' : '#D91E44', flex: '1 1 100%' }}>{couponMsg}{offer?.note ? ' · ' + offer.note : ''}</span>}
                </div>
              </div>

              {/* 5 · PAYMENT */}
              <div style={{ marginTop: '34px' }}>
                <div style={stepLabel}>{t('5 · HOW WOULD YOU LIKE TO PAY?')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '10px', marginTop: '12px' }}>
                  <PayCard
                    on={payMode === 'gate'}
                    bgOn="#FFFFE2"
                    title={t('Pay on arrival')}
                    note={t('Free to book · no cancellation fee · cash or card at the gate.')}
                    onClick={() => setPayMode('gate')}
                  />
                  <PayCard
                    on={payMode === 'online'}
                    bgOn="#E2FFEB"
                    title={t('Pay online now')}
                    note={t('Visa, Mastercard or Juice · skip the till, straight to the fun.')}
                    onClick={() => setPayMode('online')}
                  />
                </div>
              </div>
            </div>
          </div>

          {formErr && (
            <div style={{ marginTop: '18px', background: '#FFE2E7', border: '1.5px solid #FF3358', borderRadius: '14px', padding: '13px 18px', fontSize: '14px', color: '#340057', fontWeight: 600 }}>
              {t("Add your name and an email or contact number, that's where your confirmation & receipt go.")}
            </div>
          )}
          {apiErr && (
            <div style={{ marginTop: '18px', background: '#FFE2E7', border: '1.5px solid #FF3358', borderRadius: '14px', padding: '13px 18px', fontSize: '14px', color: '#340057', fontWeight: 600 }}>
              {apiErr}
            </div>
          )}
          <div style={{
            position: 'sticky', bottom: '14px', marginTop: '20px', background: '#340057', borderRadius: '18px',
            padding: '16px 22px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
            boxShadow: '0 18px 40px -12px rgba(38,0,64,.5)',
          }}>
            <div style={{ flex: 1, minWidth: '170px' }}>
              <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '15.5px' }}>{sumLine}</div>
              <div style={{ fontFamily: MONO, fontSize: '9.5px', letterSpacing: '.08em', color: 'rgba(255,255,255,.65)', marginTop: '3px' }}>{payModeNote}</div>
            </div>
            <ConfirmBtn label={confirmLabel} onClick={confirmNow} />
          </div>
        </>
      )}

      {/* SUCCESS */}
      {confirmed && (
        <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ width: '74px', height: '74px', borderRadius: '999px', background: '#33FF74', color: '#340057', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 800, margin: '10px auto 0' }}>✓</div>
          <div style={{ transform: 'rotate(-4deg)', marginTop: '22px' }}>
            <h1 style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(36px,5.2vw,62px)', lineHeight: 0.85, letterSpacing: '-0.01em', margin: 0, textTransform: 'uppercase' }}>
              {t('See you in')}<br />{t('the valley.')}
            </h1>
          </div>
          <div style={{ fontSize: '15.5px', color: 'rgba(52,0,87,.72)', marginTop: '14px', lineHeight: 1.6 }}>
            {dateSummary} · {slotName} · {partySummary}<br />{receiptHint}
          </div>
          <div style={{ fontFamily: MONO, fontSize: '11.5px', fontWeight: 600, color: '#7333FF', marginTop: '10px' }}>{sentLine}</div>
          <div style={{ margin: '24px auto 0', background: '#FFFFFF', borderRadius: '20px', padding: '0 24px 24px', maxWidth: '420px', boxShadow: '0 0 0 1.5px #EBE2FF', overflow: 'hidden' }}>
            <div style={{ height: '8px', background: 'repeating-linear-gradient(-45deg,#33FF74 0 12px,#340057 12px 24px)', margin: '0 -24px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginTop: '18px' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontFamily: MONO, fontSize: '10.5px', fontWeight: 600, letterSpacing: '.16em', color: 'rgba(52,0,87,.55)' }}>{t('BOOKING REFERENCE')}</div>
                <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: '28px', letterSpacing: '.04em', marginTop: '6px', color: '#FF3358' }}>{refCode}</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(52,0,87,.75)', marginTop: '6px' }}>{guestLine}</div>
              </div>
              <span style={{ background: payStampBg, color: '#340057', fontFamily: MONO, fontSize: '10.5px', fontWeight: 700, borderRadius: '999px', padding: '8px 13px', transform: 'rotate(-4deg)', whiteSpace: 'nowrap', flexShrink: 0 }}>{payStamp}</span>
            </div>
            {ticket.qrUrl ? (
              <a href={ticket.ticketUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', margin: '18px auto 0', width: 170 }}>
                <img src={ticket.qrUrl} alt={t('Ticket QR code {ref}', { ref: refCode })} width={170} height={170} data-testid="receipt-qr" style={{ display: 'block', width: 170, height: 170, borderRadius: 14, border: '1.5px solid #EBE2FF', padding: 6, background: '#FFFFFF' }} />
                <span style={{ display: 'block', fontFamily: MONO, fontSize: '10px', letterSpacing: '.1em', color: '#7333FF', marginTop: 6 }}>{t('SHOW THIS AT THE GATE')}</span>
              </a>
            ) : (
              <div style={{ margin: '18px auto 0', width: '130px', height: '130px', borderRadius: '14px', background: 'repeating-linear-gradient(45deg,#340057 0 8px,#FFFFFF 8px 16px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ background: '#FFFFFF', fontFamily: MONO, fontSize: '10px', padding: '4px 7px', borderRadius: '6px', color: '#340057' }}>{t('QR AT GATE')}</span>
              </div>
            )}
            {ticket.ticketUrl && (
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '14px' }}>
                <a href={ticket.ticketUrl} target="_blank" rel="noopener noreferrer" style={{ border: '1.5px solid #340057', color: '#340057', borderRadius: '999px', padding: '9px 16px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>{t('Open my ticket')}</a>
                <a href={waiverHref(ticket.ticketUrl)} target="_blank" rel="noopener noreferrer" data-testid="receipt-waiver" style={{ background: '#340057', color: '#FFFFFF', borderRadius: '999px', padding: '9px 16px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>{t('Sign the waivers')}</a>
                <a href={`https://wa.me/?text=${encodeURIComponent(t('My VALLÉ Advenature™ Park ticket {ref} · {date} · {slot}', { ref: refCode, date: dateSummary, slot: slotName }) + '\n' + ticket.ticketUrl)}`} target="_blank" rel="noopener noreferrer" style={{ background: '#25D366', color: '#FFFFFF', borderRadius: '999px', padding: '9px 16px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>{t('Send to my WhatsApp')}</a>
              </div>
            )}
            <InstallCard style={{ marginTop: 16 }} />
            <div style={{ height: '1px', background: '#EBE2FF', margin: '18px 0' }} />
            {booking.lines.map((ln, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '5px 0', fontSize: '13.5px', textAlign: 'left' }}>
                <span style={{ color: 'rgba(52,0,87,.72)' }}>{ln.label}</span>
                <span style={{ fontFamily: MONO, fontWeight: 600, whiteSpace: 'nowrap' }}>{ln.amt}</span>
              </div>
            ))}
            {applied && (
              <div data-testid="receipt-adjustment" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '5px 0', fontSize: '13.5px', textAlign: 'left', color: '#1E9E4A', fontWeight: 600 }}>
                <span>{t('Code {code}', { code: applied.code })}{applied.note ? ' · ' + applied.note : ''}</span>
                <span style={{ fontFamily: MONO, whiteSpace: 'nowrap' }}>− {mur(applied.amount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', marginTop: '6px', borderTop: '1px dashed #D9C9F0', fontWeight: 800, fontSize: '16px' }}>
              <span>{totalRowLabel}</span>
              <span style={{ fontFamily: MONO }}>{mur(serverTotal ?? booking.total)}</span>
            </div>
            {inForeign && (
              <div style={{ textAlign: 'right', fontFamily: MONO, fontSize: '11px', color: 'rgba(52,0,87,.6)', marginTop: '4px' }}>{money(booking.total)} · {t('indicative')}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '22px', flexWrap: 'wrap' }}>
            <a
              href="https://api.whatsapp.com/send/?phone=23052928841"
              target="_blank"
              rel="noopener"
              style={{ border: '2px solid #340057', color: '#340057', fontSize: '14px', fontWeight: 700, padding: '13px 24px', borderRadius: '999px', display: 'inline-block' }}
            >{t('Questions? WhatsApp us')}</a>
            <button
              onClick={startOver}
              {...backBind}
              style={{ border: 0, background: backHov ? '#7333FF' : '#340057', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700, color: '#FFFFFF', padding: '14px 26px', borderRadius: '999px' }}
            >{t('Back to the park →')}</button>
          </div>
        </div>
      )}
    </main>
  );
}
