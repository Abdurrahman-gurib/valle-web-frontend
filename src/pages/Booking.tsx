import { breadcrumbs, useSeo } from '../lib/seo';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { BookingRequest, SelLine } from '../types';
import { useApp } from '../store/AppStore';
import { CurrencyPicker } from '../components/CurrencyPicker';
import { motion } from 'motion/react';
import { CalendarDays, Check, ChevronDown, Minus, Plus, Sparkles } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ValleButton } from '@/components/ui/valle';
import { cn } from '@/lib/utils';
import { useCatalog } from '../store/CatalogContext';
import { useGoto } from '../lib/nav';
import { useCardModel, type CardModel } from '../lib/card';
import { createBooking } from '../lib/api';
import { productAmount } from '../types';
import { money, mur, partyLabel, dateOpts, todayIso, fullDateFromIso, NATC, type DateOpt } from '../lib/format';
import { checkCoupon, createHold, fetchAvailability, fetchPaymentConfig, newAttemptKey, readDraft, releaseHold, saveDraft, type AvailabilityDay, type BusyLevel } from '../lib/api';
import { entryPrices } from '../store/booking';
import { useHover } from '../hooks/useHover';
import { useReveal } from '../hooks/useReveal';
import { back, fwd, localizePath, tr, useT, _t } from '../i18n';
import { track } from '../lib/funnel';
import { bestValue, comboSwap, extras, FAMILY_TITLE } from './booking/offers';
import { PRODUCT_PREFIX } from '../types';
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

/**
 * "Pay online now" is offered only when the API has a payment provider configured
 * (GET /api/payments/config); VITE_ONLINE_PAYMENT=1 forces it on for a build.
 */
const FORCE_ONLINE_PAYMENT = import.meta.env.VITE_ONLINE_PAYMENT === '1';

const MONO = "'Chivo Mono',monospace";
const BARLOW = "'Barlow',sans-serif";

// Nationality values (NATC keys) are stored and sent in English; listed here so the extractor sees them.
const NATIONALITIES = [_t('Mauritius'), _t('Réunion / France'), _t('United Kingdom'), _t('Germany'), _t('Italy'), _t('India'), _t('China'), _t('South Africa'), _t('UAE'), _t('Australia'), _t('USA'), _t('Other')];

const stepLabel: CSSProperties = {
  fontFamily: MONO, fontSize: '11.5px', fontWeight: 600, letterSpacing: '.14em', color: 'rgba(52,0,87,.7)',
};

const stepperTag: CSSProperties = {
  fontFamily: MONO, fontSize: '8.5px', letterSpacing: '.05em', color: 'rgba(52,0,87,.7)',
};

const inputStyle: CSSProperties = {
  width: '100%', border: '1.5px solid #EBE2FF', background: '#F7F3FF', borderRadius: '12px',
  padding: '13px 16px', fontFamily: 'inherit', fontSize: '15px', outline: 'none', color: '#340057',
};

/* Stepper +/− button with hover background (style-hover="background:#EBE2FF") */
function StepBtn({ onClick, bg, label, children }: { onClick: () => void; bg: string; label: string; children: ReactNode }) {
  return (
    <motion.button type="button" onClick={onClick} aria-label={label} whileTap={{ scale: 0.88 }}
      className="inline-flex size-[26px] cursor-pointer items-center justify-center rounded-[7px] border-0 text-valle-purple transition-colors hover:!bg-valle-lilac focus-visible:outline-2 focus-visible:outline-valle-violet"
      style={{ background: bg }}>
      {children}
    </motion.button>
  );
}

/* ADULTS / CHILD 6-11 / UNITS stepper group */
function Stepper({ tag, val, inc, dec, boxBg, btnBg }: {
  tag: string; val: number; inc: () => void; dec: () => void; boxBg: string; btnBg: string;
}) {
  return (
    <div className="flex items-center gap-[5px] rounded-[10px] px-[7px] py-1" style={{ background: boxBg }}>
      <span style={stepperTag}>{tag}</span>
      <StepBtn onClick={dec} bg={btnBg} label={'− ' + tag}><Minus size={14} strokeWidth={3} aria-hidden /></StepBtn>
      <span className="min-w-4 text-center text-sm font-bold" aria-live="polite">{val}</span>
      <StepBtn onClick={inc} bg={btnBg} label={'+ ' + tag}><Plus size={14} strokeWidth={3} aria-hidden /></StepBtn>
    </div>
  );
}

/* 1 · TAP TO ADD EXPERIENCES: pick card */
function BookCard({ m }: { m: CardModel }) {
  const on = m.selOn;
  return (
    <motion.div
      onClick={m.add}
      role="button"
      tabIndex={0}
      aria-pressed={on}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); m.add(); } }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className={cn('cursor-pointer overflow-hidden rounded-[14px] border-[1.5px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-valle-violet', on ? 'border-valle-violet bg-valle-violet/[.08]' : 'border-valle-lilac bg-white')}
    >
      <div className="relative h-[86px] bg-valle-lilac">
        <img src={m.img} alt={m.name} className="block size-full object-cover" />
        <span className={cn('absolute top-2 right-2 flex size-6 items-center justify-center rounded-full border-[1.5px] border-white', on ? 'bg-valle-green text-valle-purple' : 'bg-valle-purple/50 text-white')}>
          {on ? <Check size={13} strokeWidth={3} aria-hidden /> : <Plus size={13} strokeWidth={3} aria-hidden />}
        </span>
      </div>
      <div className="px-[11px] pt-[9px] pb-[11px]">
        <div className="text-[12.5px] leading-tight font-bold">{m.name}</div>
        <div className="mt-1 font-mono text-[9px] font-bold text-valle-purple/60">{m.priceLabel}</div>
      </div>
    </motion.div>
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
  const p = line.product;
  const amt = p
    ? productAmount(p, app.rate, c.a || 0, c.k || 0, c.u || 0)
    : isFlat ? price * (c.u || 0) : price * (c.a || 0) + Math.round(price * 0.5) * (c.k || 0);
  const dbl = p ? (app.rate === 'nr' ? p.dblNr : p.dblRr) : null;
  const each = p
    ? p.mode === 'flat'
      ? money(price) + ' / ' + t('FILM')
      : p.mode === 'pair' && dbl != null
      ? t('{single} /PERSON · {double} /2 PERSONS', { single: money(price), double: money(dbl) })
      : t('{price} /PERSON', { price: money(price) })
    : isFlat
    ? money(price) + ' ' + tr(a.flatLabel || '').toUpperCase()
    : t('{adult} /ADULT · {child} /CHILD', { adult: money(price), child: money(Math.round(price * 0.5)) });
  const key = a.flatLabel ? a.flatLabel.replace('/', '').trim().toLowerCase() : '';
  const unitName = key === 'buggy' ? t('BUGGIES') : key === 'group' ? t('GROUPS') : t('UNITS');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 18px', flexWrap: 'wrap', borderTop: '1px dashed #EBE2FF' }}>
      <div
        onClick={() => (p ? goto.packages() : goto.detail(a.id))}
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
          color: hx ? '#FF3358' : 'rgba(52,0,87,.7)', width: '28px', height: '28px', borderRadius: '999px',
          cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0,
        }}
      >×</button>
    </div>
  );
}

/* 3 · WHEN: how busy a slot already is (from /api/bookings/availability) */
const LEVEL_COLOR: Record<BusyLevel, string> = { quiet: '#33FF74', busy: '#FFFC33', 'very-busy': '#FF9F33', full: '#FF3358', closed: '#9A8FB0' };
const LEVEL_LABEL: Record<BusyLevel, string> = { quiet: _t('QUIET'), busy: _t('BUSY'), 'very-busy': _t('VERY BUSY'), full: _t('FULLY BOOKED'), closed: _t('CLOSED') };
const CLOSURE_LABEL: Record<'closed' | 'maintenance' | 'private', string> = { closed: _t('CLOSED'), maintenance: _t('MAINTENANCE'), private: _t('PRIVATE EVENT') };
const LEVEL_WORD: Record<BusyLevel, string> = { quiet: _t('quiet'), busy: _t('busy'), 'very-busy': _t('very busy'), full: _t('fully booked'), closed: _t('closed') };

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
  const out = (l: BusyLevel) => l === 'full' || l === 'closed';
  const full = !!load && out(load.morning.level) && out(load.afternoon.level);
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      data-full={full || undefined}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96 }}
      className={cn('cursor-pointer rounded-[14px] border-[1.5px] px-1.5 py-3 text-center font-sans transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-valle-violet', on ? 'border-valle-violet bg-valle-violet text-white' : 'border-valle-lilac bg-white text-valle-purple hover:border-valle-violet/50', full && 'opacity-45')}
    >
      <div className="font-mono text-[9.5px] font-semibold tracking-[.08em] opacity-70">{o.dow}</div>
      <div className="mt-0.5 font-display text-[22px] font-black italic">{o.dd}</div>
      <div className="font-mono text-[9.5px] font-semibold opacity-70">{o.mm}</div>
      <LoadDots load={load} on={on} />
    </motion.button>
  );
}

/* 3 · WHEN: slot chip */
function SlotChip({ label, sub, on, onClick, level, closure }: { label: string; sub: string; on: boolean; onClick: () => void; level?: BusyLevel; closure?: { kind: 'closed' | 'maintenance' | 'private'; reason: string } }) {
  const t = useT();
  const full = level === 'full' || level === 'closed';
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      disabled={full}
      data-testid={level === 'closed' ? 'slot-closed' : full ? 'slot-full' : undefined}
      whileHover={full ? undefined : { y: -1 }}
      whileTap={full ? undefined : { scale: 0.97 }}
      className={cn('rounded-[14px] border-[1.5px] px-5 py-[13px] text-start font-sans transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-valle-violet',
        on ? 'border-valle-violet bg-valle-violet text-white' : full ? 'cursor-not-allowed border-valle-lilac bg-[#F7F3FF] text-valle-purple opacity-60' : 'cursor-pointer border-valle-lilac bg-white text-valle-purple hover:border-valle-violet/50')}
    >
      <div className="text-[15px] font-bold">{label}</div>
      <div className="mt-0.5 font-mono text-[10.5px] opacity-70">{sub}</div>
      {level && (
        <div data-testid="slot-level" className={cn('mt-[7px] inline-flex items-center gap-[5px] font-mono text-[9.5px] font-bold tracking-[.08em]', on ? 'text-white' : 'text-valle-purple')}>
          <span className="inline-block size-[7px] rounded-full" style={{ background: LEVEL_COLOR[level] }} />
          {closure ? t(CLOSURE_LABEL[closure.kind]) + (closure.reason ? ' · ' + closure.reason : '') : t(LEVEL_LABEL[level])}
        </div>
      )}
    </motion.button>
  );
}

/* 4 · DETAILS: text input with focus border (style-focus="border-color:#7333FF") */
function Field({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="transition-colors focus:!border-valle-violet focus:outline-none"
      style={inputStyle}
    />
  );
}

/* 5 · PAYMENT: pay mode card */
function PayCard({ on, bgOn, title, note, onClick }: { on: boolean; bgOn: string; title: string; note: string; onClick: () => void }) {
  return (
    <motion.div
      role="radio"
      aria-checked={on}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      whileHover={{ y: -2 }}
      className={cn('cursor-pointer rounded-2xl border-2 px-[18px] py-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-valle-violet', on ? 'border-valle-purple' : 'border-valle-lilac bg-white')}
      style={on ? { background: bgOn } : undefined}
    >
      <div className="flex items-center gap-2.5">
        <span className="inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 border-valle-purple">
          <span className={cn('size-[9px] rounded-full', on ? 'bg-valle-purple' : 'bg-transparent')} />
        </span>
        <span className="font-display text-lg font-extrabold uppercase italic">{title}</span>
      </div>
      <div className="mt-2 text-[13px] leading-normal text-valle-purple/70">{note}</div>
    </motion.div>
  );
}

/**
 * One booking step. The open step shows its content; a closed step shows its title and
 * what was chosen, and opens on tap. On phones only the open step is on screen.
 */
function StepCard({ n, step, title, summary, onOpen, children }: { n: number; step: number; title: string; summary: string; onOpen: () => void; children: ReactNode }) {
  const t = useT();
  const open = n === step;
  return (
    <section
      data-testid={'step-' + n}
      aria-labelledby={'step-h-' + n}
      className={cn(!open && 'max-sm:hidden')}
      style={{ marginTop: '14px', background: '#FFFFFF', borderRadius: '18px', boxShadow: open ? '0 0 0 2px #7333FF' : '0 0 0 1.5px #EBE2FF', padding: open ? 'clamp(14px,2.4vw,22px)' : '12px 18px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span aria-hidden style={{ flexShrink: 0, width: '26px', height: '26px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: '12px', fontWeight: 700, background: open ? '#7333FF' : n < step ? '#33FF74' : '#EBE2FF', color: open ? '#FFFFFF' : '#340057' }}>{n < step ? '✓' : n}</span>
        <h2 id={'step-h-' + n} style={{ margin: 0, flex: 1, minWidth: 0, fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: open ? '22px' : '17px', textTransform: 'uppercase', lineHeight: 1.05 }}>
          {title}
          {!open && <span style={{ display: 'block', fontFamily: 'inherit', fontStyle: 'normal', fontWeight: 500, fontSize: '13px', textTransform: 'none', color: 'rgba(52,0,87,.7)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</span>}
        </h2>
        {!open && (
          <button type="button" onClick={onOpen} aria-label={t('Change') + ' · ' + title}
            className="cursor-pointer rounded-full border-[1.5px] border-valle-lilac bg-white px-3.5 py-1.5 font-sans text-[12.5px] font-bold text-valle-purple hover:border-valle-violet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-valle-violet">{t('Change')}</button>
        )}
      </div>
      {open && <div style={{ marginTop: '16px' }}>{children}</div>}
    </section>
  );
}

/* Confirm button in the sticky summary bar */
function ConfirmBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return <ValleButton variant="primary" size="lg" onClick={onClick} className="px-[26px] py-3.5 text-[14.5px]">{label}</ValleButton>;
}

export default function BookingPage() {
  const t = useT();
  const [ONLINE_PAYMENT, setOnlinePayment] = useState(FORCE_ONLINE_PAYMENT);
  useEffect(() => {
    let dead = false;
    void fetchPaymentConfig().then((c) => { if (!dead && c.enabled) setOnlinePayment(true); });
    return () => { dead = true; };
  }, []);
  const [redirecting, setRedirecting] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  // One key per attempt: kept across retries of the same submit, renewed once a booking is written.
  const attemptKey = useRef(newAttemptKey());
  useSeo({ title: t('Book your day · VALLÉ Advenature™ Park'), description: ONLINE_PAYMENT ? t('Build your day at Vallé: pick ziplines, quad tracks, buggies and more, choose a date and pay online or at the gate. Free to book, no cancellation fee.') : t('Build your day at Vallé: pick ziplines, quad tracks, buggies and more, choose a date and pay at the gate. Free to book, no cancellation fee.'), canonicalPath: '/booking', jsonLd: [breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Book your day', path: '/booking' }])] });
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

  // "Save and continue later": the page state goes to the API and a link comes back by e-mail;
  // ?draft=<id> on this page restores it.
  const [draftEmail, setDraftEmail] = useState('');
  const [draftState, setDraftState] = useState<'idle' | 'ask' | 'busy' | 'sent' | 'error'>('idle');
  const [draftLoaded, setDraftLoaded] = useState('');
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('draft');
    if (!id) return;
    let dead = false;
    readDraft(id)
      .then((d) => { if (dead) return; app.loadDraft(d); setDraftLoaded(t('Welcome back: your saved day is restored. Nothing is reserved until you confirm.')); })
      .catch(() => { if (!dead) setDraftLoaded(t('This saved booking has expired (links last 14 days). Build your day again below.')); });
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);
  const saveForLater = async () => {
    const to = (draftEmail || email).trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) { setDraftState('ask'); return; }
    setDraftState('busy');
    try {
      await saveDraft(to, { sel, adults, kids, customDate, dateIdx, slot, name, phone, email: email || to, nat });
      setDraftState('sent');
    } catch { setDraftState('error'); }
  };
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
  // The four steps: 1 choose, 2 date & time, 3 details, 4 pay. Only the current one is open.
  const [step, setStep] = useState(1);
  const [rateErr, setRateErr] = useState(false);
  const stepTop = useRef<HTMLDivElement>(null);
  const goStep = (n: number) => {
    setStep(n);
    setRateErr(false);
    requestAnimationFrame(() => {
      const el = stepTop.current;
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
  };
  useEffect(() => { track('view_booking'); }, []);
  const [natFocus, setNatFocus] = useState(false);
  const [backHov, backBind] = useHover();

  // Every booking entry point returned to the form in the original
  // (_nav('booking', { confirmed: false }) + scrollTo(0,0)).
  useEffect(() => {
    setConfirmed(false);
    setStep(1);
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
  useEffect(() => {
    if (!selectedLoad) return;
    const cur = slot === 0 ? selectedLoad.morning.level : selectedLoad.afternoon.level;
    const other = slot === 0 ? selectedLoad.afternoon.level : selectedLoad.morning.level;
    const out = (l: BusyLevel) => l === 'full' || l === 'closed';
    if (out(cur) && !out(other)) setSlot(slot === 0 ? 1 : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLoad]);

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
  // Without a gateway the only honest option is the gate; the whole step is hidden.
  const payOnline = ONLINE_PAYMENT && payMode === 'online';
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

  const selectedSlotLevel = selectedLoad ? (slot === 0 ? selectedLoad.morning.level : selectedLoad.afternoon.level) : undefined;
  const selectedSlotFull = selectedSlotLevel === 'full' || selectedSlotLevel === 'closed';
  const slotKey = slot === 0 ? 'morning' : 'afternoon';
  // Timed sessions: the start time chosen per cart line (key = activity|variant); cleared when the date changes.
  const [times, setTimes] = useState<Record<string, string>>({});
  useEffect(() => { setTimes({}); }, [selectedIso]);
  const sessionsOf = (id: string) => selectedLoad?.sessions?.[id];
  /** Session times a guest arriving in the chosen slot can take (afternoon arrivals from 12:00). */
  const timesFor = (id: string) => Object.entries(sessionsOf(id)?.times ?? {}).filter(([tm]) => slotKey === 'morning' || tm >= '12:00');
  /** Cart lines that run in sessions but have no (valid, open) time yet. */
  const needsTime = cartActs.filter((l) => sessionsOf(l.act.id) && !timesFor(l.act.id).some(([tm, lv]) => tm === times[l.key] && lv !== 'full')).map((l) => l.act.name);
  /** Experiences in the cart that have no room left in the chosen slot (from the picker's per-activity levels). */
  const activityFull = cartActs.filter((l) => selectedLoad?.activities?.[l.act.id]?.[slotKey] === 'full').map((l) => l.act.name);

  // Hold the places while the guest types their details, so the last spots are not lost mid-form.
  const [hold, setHold] = useState<{ id: string; until: string } | null>(null);
  const holdKey = JSON.stringify([selectedIso, slotKey, adults, kids, booking.selLines.map((l) => [l.act.id, l.qty.a, l.qty.k, l.qty.u, times[l.key] || ''])]);
  const wantsHold = name.trim().length >= 2 && !selectedSlotFull && activityFull.length === 0 && needsTime.length === 0;
  useEffect(() => {
    if (!wantsHold || confirmed) return;
    let dead = false;
    const timer = setTimeout(() => {
      void createHold({
        visitDate: selectedIso, slot: slotKey, adults, kids,
        items: booking.selLines.map((l) => ({ id: l.act.id, adults: l.qty.a, kids: l.qty.k, units: l.qty.u, time: times[l.key] || undefined })),
        holdId: hold?.id,
      }).then((h) => {
        if (dead) { void releaseHold(h.holdId); return; }
        setHold({ id: h.holdId, until: new Date(h.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      }).catch(() => { if (!dead) setHold(null); });
    }, 700);
    return () => { dead = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsHold, holdKey]);
  useEffect(() => () => { if (hold) void releaseHold(hold.id); }, [hold]);
  const refreshAvail = (iso: string) => fetchAvailability(iso, 1).then(mergeAvail).catch(() => { /* ignore */ });

  const confirmNow = async () => {
    if (submitting) return;
    if (needsTime.length > 0) {
      setApiErr(t('Pick a start time for {names}.', { names: needsTime.join(', ') }));
      setStep(2);
      return;
    }
    if (selectedSlotFull || activityFull.length > 0) {
      setApiErr(selectedSlotLevel === 'closed'
        ? t('The park is closed for that arrival slot. Pick another day.')
        : activityFull.length > 0
        ? t('{names}: fully booked for the {slot} on this date. Pick the other slot, another day, or remove it from your day.', { names: activityFull.join(', '), slot: slot === 0 ? t('morning') : t('afternoon') })
        : t('That arrival slot is fully booked on this date. Pick the other slot or another day.'));
      setStep(2);
      return;
    }
    const ok = name.trim() && (email.trim() || phone.trim());
    if (!ok) { setFormErr(true); setStep(3); return; }
    setFormErr(false);
    setApiErr('');
    setSubmitting(true);
    track('submit');
    const req: BookingRequest = {
      visitDate: customDate || (dOpts[dateIdx] ? dOpts[dateIdx].iso : dOpts[0].iso),
      slot: slot === 0 ? 'morning' : 'afternoon',
      adults,
      kids,
      rate,
      items: booking.selLines.map((l) => ({ id: l.act.id, variant: l.variant, adults: l.qty.a, kids: l.qty.k, units: l.qty.u, time: times[l.key] || undefined })),
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      nationality: nat || undefined,
      payMode: ONLINE_PAYMENT ? payMode : 'gate',
      couponCode: offer ? offer.code : undefined,
      holdId: hold?.id,
      idempotencyKey: attemptKey.current,
    };
    let code: string;
    try {
      const res = await createBooking(req);
      if (res.checkoutUrl) {
        // The provider's hosted page takes over; the ticket page reads the outcome when the guest comes back.
        setRedirecting(true);
        window.location.assign(res.checkoutUrl);
        return;
      }
      code = res.refCode;
      setTicket({ ticketUrl: res.ticketUrl, qrUrl: res.qrUrl });
      setApplied(res.adjustment ? { amount: res.adjustment, note: res.adjustmentNote || '', code: res.couponCode || '' } : null);
      setServerTotal(typeof res.total === 'number' ? res.total : null);
    } catch (e) {
      // Whether the server refused or never answered, the desk has no record of this
      // booking, so no reference is shown: a guest turning up with a phantom VAL code
      // is worse than a retry.
      const status = (e as { status?: number }).status;
      // 409 is either the slot (filled up while the guest was typing: refresh the picker)
      // or a limited promo code whose last use just went to someone else.
      const msg = (e as Error).message || '';
      const codeUsed = status === 409 && /code/i.test(msg);
      if (status === 409 && !codeUsed) { void refreshAvail(req.visitDate); setStep(2); }
      if (codeUsed) { setOffer(null); setCouponMsg(''); }
      setApiErr(codeUsed
        ? t('This code has just been fully used. Remove it or try another.')
        : status === 409
        ? (/^That arrival slot is fully booked/.test(msg) ? t('That arrival slot is fully booked on this date. Pick the other slot or another day.') : msg)
        : status
        ? ((e as Error).message || t('We could not confirm your booking. Please try again.'))
        : t('We could not reach the booking desk. Check your connection and try again, or WhatsApp us on {phone}.', { phone: '+230 5292 8841' }));
      setSubmitting(false);
      return;
    }
    setRefCode(code);
    track('booked');
    attemptKey.current = newAttemptKey();
    setHold(null);
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

  // step machinery
  const stepNames = [t('Choose'), t('Date & time'), t('Your details'), t('Pay')];
  const chooseSummary = (cartActs.length === 0 ? t('Park entry only') : cartActs.map((l) => l.act.name).join(', ')) + ' · ' + partySummary + ' · ' + (rate === 'rr' ? t('Resident') : t('Visitor'));
  const packs = useMemo(() => bestValue(catalog, rate), [catalog, rate]);
  const swap = useMemo(() => comboSwap(catalog, sel, adults, kids, rate), [catalog, sel, adults, kids, rate]);
  const extraList = useMemo(() => extras(catalog, sel, adults, kids, rate), [catalog, sel, adults, kids, rate]);
  useEffect(() => { if (swap) track('suggestion_shown', swap.product.key); }, [swap]);
  const [moreOpen, setMoreOpen] = useState(() => !!nat);
  const next = () => {
    setApiErr('');
    if (step === 1) {
      if (!app.rateChosen) { setRateErr(true); return; }
      track('pick_items');
      goStep(2);
      return;
    }
    if (step === 2) {
      if (needsTime.length > 0) { setApiErr(t('Pick a start time for {names}.', { names: needsTime.join(', ') })); return; }
      if (selectedSlotFull || activityFull.length > 0) {
        setApiErr(selectedSlotLevel === 'closed'
          ? t('The park is closed for that arrival slot. Pick another day.')
          : activityFull.length > 0
          ? t('{names}: fully booked for the {slot} on this date. Pick the other slot, another day, or remove it from your day.', { names: activityFull.join(', '), slot: slot === 0 ? t('morning') : t('afternoon') })
          : t('That arrival slot is fully booked on this date. Pick the other slot or another day.'));
        return;
      }
      track('pick_date');
      goStep(3);
      return;
    }
    if (step === 3) {
      if (!(name.trim() && (email.trim() || phone.trim()))) { setFormErr(true); return; }
      track('details');
      goStep(4);
      return;
    }
    void confirmNow();
  };

  // confirmation bits
  const guestLine = (name.trim() || t('Guest')) + (nat ? ' · ' + t(nat) : '');
  // Nothing is charged on the site today, so the stamp never claims a payment.
  const payStamp = payOnline ? t('PAYMENT PENDING') : t('PAY ON ARRIVAL');
  const payStampBg = payOnline ? '#E2FFEB' : '#FFFC33';
  const totalRowLabel = payOnline ? t('Total due') : t('Total on arrival');
  const receiptHint = payOnline
    ? t('Your online payment is being confirmed. Show this QR at the gate.')
    : t('Show this reference at the gate and pay there, cash or card.');
  const contactBits: string[] = [];
  if (email.trim()) contactBits.push(email.trim());
  if (phone.trim()) contactBits.push('SMS ' + phone.trim());
  const sentLine = t('CONFIRMATION & E-RECEIPT SENT TO {contact}', { contact: (contactBits.join(' · ') || t('YOUR CONTACT DETAILS')).toUpperCase() });

  return (
    <main ref={ref} style={{ maxWidth: '1180px', margin: '0 auto', padding: '104px clamp(16px,3.5vw,40px) 0' }}>
      {!confirmed && (
        <>
          <h1 style={{
            fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(34px,5vw,60px)',
            lineHeight: 0.82, letterSpacing: '-0.01em', margin: 0, textTransform: 'uppercase',
            transform: 'rotate(-4deg)', transformOrigin: 'left bottom',
          }}>{t('Build your day')}</h1>

          {/* progress: four steps, each one a way back to it */}
          <nav aria-label={t('Booking steps')} style={{ marginTop: '26px', scrollMarginTop: '90px' }} ref={stepTop}>
            <div aria-hidden style={{ height: '6px', borderRadius: '999px', background: '#EBE2FF', overflow: 'hidden' }}>
              <div data-testid="booking-progress" style={{ height: '100%', width: (step / 4) * 100 + '%', background: '#7333FF', borderRadius: '999px', transition: 'width .3s ease' }} />
            </div>
            <ol style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '6px' }}>
              {stepNames.map((label, i) => (
                <li key={label}>
                  <button
                    type="button"
                    data-testid={'step-tab-' + (i + 1)}
                    aria-current={step === i + 1 ? 'step' : undefined}
                    onClick={() => goStep(i + 1)}
                    className="w-full cursor-pointer rounded-lg border-0 bg-transparent px-1 py-1 text-start focus-visible:outline-2 focus-visible:outline-valle-violet"
                    style={{ fontFamily: MONO, fontSize: '10.5px', fontWeight: 700, letterSpacing: '.06em', color: step === i + 1 ? '#7333FF' : step > i + 1 ? '#340057' : 'rgba(52,0,87,.6)' }}
                  >
                    {step > i + 1 ? '✓ ' : (i + 1) + ' · '}{label.toUpperCase()}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          {draftLoaded && <div role="status" data-testid="draft-loaded" style={{ marginTop: '14px', background: '#E6FFEE', border: '1.5px solid #33FF74', borderRadius: '14px', padding: '12px 18px', fontSize: '14px', fontWeight: 600, color: '#340057' }}>{draftLoaded}</div>}

          {/* 1 · CHOOSE */}
          <StepCard n={1} step={step} title={stepNames[0]} summary={chooseSummary} onOpen={() => goStep(1)}>
            <div role="radiogroup" aria-label={t('Your rate')} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={stepLabel}>{t('YOUR RATE')}</span>
              {(['nr', 'rr'] as const).map((r) => {
                const on = app.rateChosen && rate === r;
                return (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    data-testid={'rate-' + r}
                    onClick={() => { app.setRate(r); setRateErr(false); }}
                    className="cursor-pointer rounded-full border-[1.5px] px-4 py-2 font-sans text-[13.5px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-valle-violet"
                    style={{ borderColor: on ? '#7333FF' : '#EBE2FF', background: on ? '#7333FF' : '#FFFFFF', color: on ? '#FFFFFF' : '#340057' }}
                  >{r === 'nr' ? t('I am visiting') : t('I live in Mauritius')}</button>
                );
              })}
            </div>
            {rateErr && <div role="alert" style={{ marginTop: '8px', fontSize: '13px', fontWeight: 600, color: '#D91E44' }}>{t('Choose your rate to see your prices.')}</div>}

            {/* party: park entry */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', flexWrap: 'wrap', background: '#F7F3FF', borderRadius: '14px', marginTop: '14px' }}>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <div style={{ fontWeight: 700, fontSize: '14.5px' }}>{t('Park entry')}</div>
                <div style={{ fontFamily: MONO, fontSize: '10px', color: 'rgba(52,0,87,.6)', marginTop: '3px' }}>{entryNote}</div>
              </div>
              <Stepper tag={t('ADULTS')} val={adults} inc={() => setAdults(adults + 1)} dec={() => setAdults(adults - 1)} boxBg="#FFFFFF" btnBg="#F7F3FF" />
              <Stepper tag={t('CHILD 6–11')} val={kids} inc={() => setKids(kids + 1)} dec={() => setKids(kids - 1)} boxBg="#FFFFFF" btnBg="#F7F3FF" />
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: '13px', minWidth: '84px', textAlign: 'end' }}>{entryAmt}</div>
            </div>
            <a href={localizePath('/groups')} style={{ display: 'inline-block', marginTop: '8px', fontSize: '12.5px', fontWeight: 600, color: '#7333FF' }}>{t('13 or more? Book as a group')} {fwd()}</a>

            {/* best value: one package per family */}
            {packs.length > 0 && (
              <div style={{ marginTop: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={stepLabel}>{t('BEST VALUE · PACKAGES')}</span>
                  <a href={localizePath('/packages')} style={{ fontSize: '12.5px', fontWeight: 700, color: '#7333FF' }}>{t('See all packages')} {fwd()}</a>
                </div>
                <div data-testid="best-value" style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '10px 2px 6px', scrollSnapType: 'x mandatory' }}>
                  {packs.map(({ product: p, family, popular }) => {
                    const inDay = !!sel[PRODUCT_PREFIX + p.key];
                    const each = rate === 'rr' ? p.rr : p.nr;
                    const party = productAmount(p, rate, Math.max(1, adults), kids, 1);
                    return (
                      <div key={p.key} data-testid={'pack-' + p.key} style={{ flex: '0 0 210px', scrollSnapAlign: 'start', borderRadius: '14px', overflow: 'hidden', border: '1.5px solid ' + (inDay ? '#7333FF' : '#EBE2FF'), background: inDay ? 'rgba(115,51,255,.06)' : '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ position: 'relative', height: '84px', background: '#EBE2FF' }}>
                          {p.image && <img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                          {popular && <span style={{ position: 'absolute', top: '8px', insetInlineStart: '8px', background: '#FFFC33', color: '#340057', fontFamily: MONO, fontSize: '9px', fontWeight: 700, letterSpacing: '.08em', borderRadius: '999px', padding: '4px 8px' }}>{t('MOST POPULAR')}</span>}
                        </div>
                        <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                          <div style={{ fontFamily: MONO, fontSize: '9.5px', fontWeight: 700, letterSpacing: '.08em', color: 'rgba(52,0,87,.6)' }}>{t(FAMILY_TITLE[family]).toUpperCase()}</div>
                          <div style={{ fontWeight: 800, fontSize: '15px' }}>{p.name}</div>
                          <div style={{ fontFamily: MONO, fontSize: '10.5px', color: 'rgba(52,0,87,.7)' }}>{p.mode === 'flat' ? money(each) : t('{price} /PERSON', { price: money(each) })}</div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#340057' }}>{t('{amount} for your party', { amount: money(party) })}</div>
                          <button
                            type="button"
                            aria-pressed={inDay}
                            aria-label={(inDay ? t('In my day') : t('Add')) + ' · ' + p.name}
                            onClick={() => { app.toggleSel(PRODUCT_PREFIX + p.key); if (!inDay) track('package_click', p.key); }}
                            className="mt-auto cursor-pointer rounded-full border-[1.5px] border-valle-purple px-3 py-[7px] font-sans text-[12.5px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-valle-violet"
                            style={{ marginTop: '8px', background: inDay ? '#340057' : '#FFFFFF', color: inDay ? '#FFFC33' : '#340057' }}
                          >{inDay ? '✓ ' + t('In my day') : t('Add')}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* activities one by one */}
            <div style={{ marginTop: '20px' }}>
              <span style={stepLabel}>{t('OR PICK ACTIVITIES ONE BY ONE')}</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: '10px', marginTop: '10px' }}>
                {bookCards.map((m) => <BookCard key={m.id} m={m} />)}
              </div>
            </div>

            {swap && (
              <div data-testid="combo-swap" role="status" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: '#E2FFEB', border: '1.5px solid #33FF74', borderRadius: '14px', padding: '12px 16px' }}>
                <Sparkles size={18} aria-hidden />
                <span style={{ flex: '1 1 200px', fontSize: '14px', fontWeight: 700 }}>{t('Switch to {name} and save {amount}', { name: swap.product.name, amount: mur(swap.save) })}</span>
                <button type="button" onClick={() => { app.swapSel(swap.remove, PRODUCT_PREFIX + swap.product.key, swap.entry); track('suggestion_taken', swap.product.key); }}
                  className="cursor-pointer rounded-full border-0 bg-valle-purple px-4 py-2 font-sans text-[13px] font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-valle-violet">{t('Switch')}</button>
              </div>
            )}
            {booking.advCount >= 2 && <div style={{ background: passHintBg, borderRadius: '14px', padding: '11px 16px', fontSize: '13px', color: '#340057', fontWeight: 600, marginTop: '12px' }}>{passHint}</div>}

            {cartActs.length > 0 && (
              <div style={{ marginTop: '18px' }}>
                <span style={stepLabel}>{t('YOUR DAY')} · {cartCountLabel}</span>
                <div style={{ background: '#FFFFFF', borderRadius: '16px', boxShadow: '0 0 0 1.5px #EBE2FF', marginTop: '10px', overflow: 'hidden' }}>
                  {cartActs.map((l) => <CartLine key={l.key} line={l} />)}
                </div>
              </div>
            )}
          </StepCard>

          {/* 2 · DATE & TIME */}
          <StepCard n={2} step={step} title={stepNames[1]} summary={dateSummary + ' · ' + slotName} onOpen={() => goStep(2)}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(78px,1fr))', gap: '8px' }}>
              {dOpts.map((o) => (
                <DateChip key={o.i} o={o} on={!customDate && dateIdx === o.i} onClick={() => { setDateIdx(o.i); setCustomDate(''); }} load={avail[o.iso]} />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: MONO, fontSize: '10px', fontWeight: 600, letterSpacing: '.08em', color: 'rgba(52,0,87,.7)' }}>{t('ANOTHER MONTH? PICK ANY DATE →')}</span>
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    data-testid="date-picker"
                    className={cn('inline-flex cursor-pointer items-center gap-2 rounded-[14px] border-[1.5px] px-3.5 py-2.5 font-sans text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-valle-violet', customDate ? 'border-valle-violet bg-valle-violet text-white' : 'border-valle-lilac bg-white text-valle-purple hover:border-valle-violet/50')}
                  >
                    <CalendarDays size={16} strokeWidth={2.4} aria-hidden />
                    {customDate ? (fullDateFromIso(customDate) || customDate) : t('Pick a date')}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto rounded-2xl border-valle-lilac bg-white p-2 text-valle-purple shadow-[0_24px_48px_-20px_rgba(52,0,87,.45)]">
                  <Calendar
                    mode="single"
                    selected={customDate ? new Date(customDate + 'T12:00:00') : undefined}
                    onSelect={(d) => {
                      if (!d) return;
                      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      setCustomDate(iso); setCalOpen(false);
                    }}
                    disabled={{ before: new Date(tIso + 'T00:00:00') }}
                    defaultMonth={customDate ? new Date(customDate + 'T12:00:00') : new Date(tIso + 'T12:00:00')}
                    className="[--cell-size:2.4rem] [&_.rdp-day_button[aria-selected=true]]:!bg-valle-violet [&_.rdp-day_button[aria-selected=true]]:!text-white"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
              <SlotChip label={t('Morning')} sub={t('ARRIVE 09:00–12:00')} on={slot === 0} onClick={() => setSlot(0)} level={selectedLoad?.morning.level} closure={selectedLoad?.morning.closure} />
              <SlotChip label={t('Afternoon')} sub={t('ARRIVE 12:00–15:30')} on={slot === 1} onClick={() => setSlot(1)} level={selectedLoad?.afternoon.level} closure={selectedLoad?.afternoon.closure} />
            </div>
            {cartActs.filter((l) => sessionsOf(l.act.id)).map((l) => (
              <div key={l.key} data-testid={`session-picker-${l.act.id}`} style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontFamily: MONO, fontSize: '9.5px', fontWeight: 700, letterSpacing: '.1em', color: times[l.key] ? 'rgba(52,0,87,.6)' : '#D91E44' }}>{l.act.name.toUpperCase()} · {t('START TIME')}</span>
                {timesFor(l.act.id).map(([tm, lv]) => (
                  <button
                    key={tm}
                    type="button"
                    disabled={lv === 'full'}
                    aria-pressed={times[l.key] === tm}
                    onClick={() => { setTimes((x) => ({ ...x, [l.key]: tm })); setApiErr(''); }}
                    style={{
                      border: '1.5px solid ' + (times[l.key] === tm ? '#7333FF' : '#EBE2FF'), background: times[l.key] === tm ? '#7333FF' : lv === 'full' ? '#F7F3FF' : '#FFFFFF',
                      color: times[l.key] === tm ? '#FFFFFF' : '#340057', opacity: lv === 'full' ? 0.5 : 1, cursor: lv === 'full' ? 'not-allowed' : 'pointer',
                      fontFamily: MONO, fontWeight: 700, fontSize: '12px', padding: '6px 10px', borderRadius: '999px',
                    }}
                  >{tm}{lv === 'full' ? ' · ' + t('FULL') : lv === 'busy' ? ' · ' + t('FEW LEFT') : ''}</button>
                ))}
                {timesFor(l.act.id).length === 0 && <span style={{ fontSize: '12.5px', color: '#D91E44', fontWeight: 600 }}>{t('No session for an afternoon arrival: choose the morning.')}</span>}
              </div>
            ))}
            {activityFull.length > 0 && (
              <div role="alert" data-testid="activity-full" style={{ marginTop: '10px', background: '#FFE2E7', border: '1.5px solid #FF3358', borderRadius: '12px', padding: '10px 14px', fontSize: '13.5px', fontWeight: 600, color: '#340057' }}>
                {t('{names}: fully booked for the {slot} on this date. Pick the other slot, another day, or remove it from your day.', { names: activityFull.join(', '), slot: slot === 0 ? t('morning') : t('afternoon') })}
              </div>
            )}
            {Object.keys(avail).length > 0 && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px', fontFamily: MONO, fontSize: '9.5px', letterSpacing: '.06em', color: 'rgba(52,0,87,.6)' }}>
                <span>{t('DOTS = MORNING · AFTERNOON, FROM BOOKINGS SO FAR:')}</span>
                {(['quiet', 'busy', 'very-busy', 'full', 'closed'] as BusyLevel[]).map((l) => (
                  <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '999px', background: LEVEL_COLOR[l], display: 'inline-block' }} />{t(LEVEL_LABEL[l])}
                  </span>
                ))}
              </div>
            )}
          </StepCard>

          {/* 3 · YOUR DETAILS */}
          <StepCard n={3} step={step} title={stepNames[2]} summary={name.trim() ? [name.trim(), email.trim() || phone.trim()].filter(Boolean).join(' · ') : t('Not filled in yet')} onOpen={() => goStep(3)}>
            <div style={{ fontSize: '13px', color: 'rgba(52,0,87,.7)', marginBottom: '10px' }}>{t('Your ticket goes to your e-mail or WhatsApp: one of the two is enough.')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '10px' }}>
              <Field value={name} onChange={(v) => { setName(v); setFormErr(false); setApiErr(''); }} placeholder={t('Full name')} />
              <Field value={email} onChange={(v) => { setEmail(v); setFormErr(false); setApiErr(''); }} placeholder={t('Email')} />
              <Field value={phone} onChange={(v) => { setPhone(v); setFormErr(false); setApiErr(''); }} placeholder={t('Contact number (SMS / WhatsApp)')} />
            </div>
            <button type="button" aria-expanded={moreOpen} aria-controls="booking-more" data-testid="more-options" onClick={() => setMoreOpen((o) => !o)}
              className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full border-0 bg-transparent px-1 py-1 font-sans text-[13px] font-bold text-valle-violet focus-visible:outline-2 focus-visible:outline-valle-violet">
              <ChevronDown size={16} aria-hidden style={{ transform: moreOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />{t('More options')}
            </button>
            {moreOpen && (
              <div id="booking-more" style={{ marginTop: '8px', display: 'grid', gap: '10px' }}>
                <div style={{ position: 'relative', maxWidth: '360px' }}>
                  <select aria-label={t('Nationality')}
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
                    {NATIONALITIES.map((v) => <option key={v} value={v}>{t(v)}</option>)}
                  </select>
                  <span style={{ position: 'absolute', insetInlineEnd: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '11px', color: 'rgba(52,0,87,.7)' }}>▾</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    value={coupon}
                    onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setOffer(null); setCouponMsg(''); }}
                    onBlur={() => { void tryCoupon(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void tryCoupon(); } }}
                    placeholder={t('Promo or partner code (optional)')}
                    aria-label={t('Promo or partner code (optional)')}
                    data-testid="coupon-input"
                    dir="ltr"
                    style={{ ...inputStyle, flex: '1 1 220px', fontFamily: MONO, textTransform: 'uppercase', borderColor: offer ? '#33FF74' : '#EBE2FF' }}
                  />
                  <button type="button" onClick={() => { void tryCoupon(); }} style={{ border: '1.5px solid #340057', background: '#FFFFFF', color: '#340057', borderRadius: '999px', padding: '11px 16px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>{t('Apply')}</button>
                  {couponMsg && <span data-testid="coupon-msg" style={{ fontSize: '13px', fontWeight: 600, color: offer ? '#1E9E4A' : '#D91E44', flex: '1 1 100%' }}>{couponMsg}{offer?.note ? ' · ' + offer.note : ''}</span>}
                </div>
              </div>
            )}
            <div data-testid="save-for-later" style={{ marginTop: '16px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', fontSize: '13.5px', color: 'rgba(52,0,87,.75)' }}>
              {draftState === 'sent'
                ? <span data-testid="draft-sent" style={{ color: '#1E9E4A', fontWeight: 700 }}>{t('Saved. A link to come back to this day is in your inbox (valid 14 days). Nothing is reserved yet.')}</span>
                : <>
                    <span>{t('Not finishing now?')}</span>
                    {draftState === 'ask' && <input value={draftEmail} onChange={(e) => setDraftEmail(e.target.value)} type="email" placeholder={t('Your e-mail')} aria-label={t('Your e-mail')} data-testid="draft-email" style={{ ...inputStyle, flex: '1 1 200px', padding: '9px 12px' }} />}
                    <button type="button" onClick={() => { void saveForLater(); }} disabled={draftState === 'busy'} data-testid="draft-save" style={{ border: '1.5px solid #340057', background: '#FFFFFF', color: '#340057', borderRadius: '999px', padding: '8px 14px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {draftState === 'busy' ? t('Saving…') : t('E-mail me a link to come back to this day')}
                    </button>
                    {draftState === 'error' && <span style={{ color: '#D91E44', fontWeight: 600 }}>{t('We could not save it. Please try again.')}</span>}
                  </>}
            </div>
          </StepCard>

          {/* 4 · PAY */}
          <StepCard n={4} step={step} title={stepNames[3]} summary={payOnline ? t('Pay online now') : t('Pay on arrival')} onOpen={() => goStep(4)}>
            {extraList.length > 0 && (
              <div data-testid="add-to-day">
                <span style={stepLabel}>{t('ADD TO YOUR DAY')}</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {extraList.map((x) => (
                    <button key={x.key} type="button" data-testid={'extra-' + x.kind}
                      onClick={() => { app.toggleSel(x.id, x.variant); track('addon_add', x.kind); }}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-valle-lilac bg-white px-3.5 py-2 text-start font-sans text-[13px] text-valle-purple transition-colors hover:border-valle-violet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-valle-violet">
                      <Plus size={14} strokeWidth={3} aria-hidden />
                      <span style={{ fontWeight: 700 }}>{x.kind === 'photo' ? t('Photo package · {name}', { name: x.name }) : x.name}</span>
                      <span style={{ fontFamily: MONO, fontSize: '11px', fontWeight: 700, color: '#7333FF' }}>+{money(x.amount)}</span>
                    </button>
                  ))}
                  <a href={localizePath('/dine/chamouze')} data-testid="extra-lunch" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1.5px solid #EBE2FF', borderRadius: '999px', padding: '8px 14px', fontSize: '13px', fontWeight: 700, color: '#340057', textDecoration: 'none' }}>{t('Lunch at Chamouze')} {fwd()}</a>
                </div>
              </div>
            )}
            {ONLINE_PAYMENT && (
              <div style={{ marginTop: extraList.length ? '20px' : 0 }}>
                <div style={stepLabel}>{t('HOW WOULD YOU LIKE TO PAY?')}</div>
                <div role="radiogroup" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '10px', marginTop: '10px' }}>
                  <PayCard on={payMode === 'gate'} bgOn="#FFFFE2" title={t('Pay on arrival')} note={t('Free to book · no cancellation fee · cash or card at the gate.')} onClick={() => setPayMode('gate')} />
                  <PayCard on={payMode === 'online'} bgOn="#E2FFEB" title={t('Pay online now')} note={t('Visa, Mastercard or Juice · skip the till, straight to the fun.')} onClick={() => setPayMode('online')} />
                </div>
              </div>
            )}
            <div style={{ marginTop: '18px', background: '#F7F3FF', borderRadius: '14px', padding: '12px 16px' }}>
              {booking.lines.map((ln, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '3px 0', fontSize: '13px' }}>
                  <span style={{ color: 'rgba(52,0,87,.75)' }}>{ln.label}</span>
                  <span style={{ fontFamily: MONO, fontWeight: 600, whiteSpace: 'nowrap' }}>{ln.amt}</span>
                </div>
              ))}
              <div style={{ fontSize: '12.5px', color: 'rgba(52,0,87,.7)', marginTop: '6px' }}>{dateSummary} · {slotName} · {partySummary}</div>
            </div>
          </StepCard>

          {hold && !selectedSlotFull && activityFull.length === 0 && (
            <div data-testid="hold-note" style={{ marginTop: '12px', fontFamily: MONO, fontSize: '10px', letterSpacing: '.08em', color: '#1E9E4A', fontWeight: 700 }}>
              {t('YOUR PLACES ARE HELD UNTIL {time}', { time: hold.until })}
            </div>
          )}
          {formErr && (
            <div role="alert" style={{ marginTop: '14px', background: '#FFE2E7', border: '1.5px solid #FF3358', borderRadius: '14px', padding: '13px 18px', fontSize: '14px', color: '#340057', fontWeight: 600 }}>
              {t("Add your name and an email or contact number, that's where your confirmation & receipt go.")}
            </div>
          )}
          {apiErr && (
            <div role="alert" style={{ marginTop: '14px', background: '#FFE2E7', border: '1.5px solid #FF3358', borderRadius: '14px', padding: '13px 18px', fontSize: '14px', color: '#340057', fontWeight: 600 }}>
              {apiErr}
            </div>
          )}
          {/* sticky summary: running total and the one next action */}
          <div data-testid="booking-bar" className="max-sm:!bottom-[calc(84px+env(safe-area-inset-bottom,0px))]" style={{
            position: 'sticky', bottom: 'calc(10px + env(safe-area-inset-bottom, 0px))', marginTop: '18px', background: '#340057', borderRadius: '18px',
            padding: '14px 18px', boxShadow: '0 18px 40px -12px rgba(38,0,64,.5)', zIndex: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '160px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '15px' }}>{sumLine}</div>
                  <CurrencyPicker fg="#FFFFFF" compact />
                </div>
                <div style={{ fontFamily: MONO, fontSize: '9.5px', letterSpacing: '.08em', color: 'rgba(255,255,255,.7)', marginTop: '3px' }}>{step === 4 ? payModeNote : t('STEP {n} OF 4', { n: step })}</div>
              </div>
              {step > 1 && !redirecting && (
                <button type="button" onClick={() => goStep(step - 1)} data-testid="step-back"
                  className="cursor-pointer rounded-full border-[1.5px] border-white/50 bg-transparent px-4 py-3 font-sans text-[13.5px] font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">{back()} {t('Back')}</button>
              )}
              {redirecting
                ? <div data-testid="checkout-redirect" style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '14.5px', padding: '14px 4px' }}>{t('Taking you to the secure payment page…')}</div>
                : <ConfirmBtn label={step < 4 ? t('Continue') + ' ' + fwd() : confirmLabel} onClick={next} />}
            </div>
            {step === 4 && (
              <div data-testid="trust-line" style={{ marginTop: '8px', fontFamily: MONO, fontSize: '9.5px', letterSpacing: '.08em', color: 'rgba(255,255,255,.75)' }}>
                {[t('FREE CANCELLATION'), ONLINE_PAYMENT ? t('PAY AT THE GATE OR ONLINE') : t('PAY AT THE GATE'), t('TICKET BY E-MAIL & WHATSAPP')].join(' · ')}
              </div>
            )}
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
                <div style={{ fontFamily: MONO, fontSize: '10.5px', fontWeight: 600, letterSpacing: '.16em', color: 'rgba(52,0,87,.7)' }}>{t('BOOKING REFERENCE')}</div>
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
