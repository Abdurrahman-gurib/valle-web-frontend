import { Map as MapIcon } from 'lucide-react';
import { breadcrumbs, useSeo } from '../../lib/seo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import type { BookingRequest } from '../../types';
import { productValidOn } from '../../types';
import { useApp } from '../../store/AppStore';
import { emptyLines, linesOverParty } from '../../store/booking';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useCatalog } from '../../store/CatalogContext';
import { QuadMap, ZiplineMap } from '../home/ActivityMaps';
import { CurrencyPicker } from '../../components/CurrencyPicker';
import { BtnLabel, ValleButton } from '@/components/ui/valle';
import { useGoto } from '../../lib/nav';
import { useCardModel } from '../../lib/card';
import { createBooking, newAttemptKey } from '../../lib/api';
import { errorMessage, httpStatus } from '../../lib/errors';
import { money, mur, dateOpts, todayIso, shortDateFromIso, NATC } from '../../lib/format';
import { useReveal } from '../../hooks/useReveal';
import { useLang, useT } from '../../i18n';
import { BARLOW, ErrorNote, Field, inputStyle, MONO, NATIONALITIES, PayCard, StepLabel } from './bookingUi';
import { BookCard, CartStep } from './CartStep';
import { DayExtras, PackagesLine } from './Upsells';
import { ExplorerPassNote } from '../../components/ExplorerPassNote';
import { isOut, WhenStep } from './WhenStep';
import { forgetReceipt, readReceipt, Receipt, saveReceipt, type ConfirmedBooking, type ReceiptSnapshot } from './Receipt';
import { useAvailability, useCoupon, useHold, useOnlinePayment, useSavedDraft, useSlotFallback } from './bookingHooks';
import { track } from '../../lib/analytics';

/** /booking: the five steps (1 pick, 2 your day, 3 when, 4 details, 5 pay), then the receipt. */
export default function BookingPage() {
  const t = useT();
  const ONLINE_PAYMENT = useOnlinePayment();
  const [redirecting, setRedirecting] = useState(false);
  // One key per attempt: kept across retries of the same submit, renewed once a booking is written.
  const attemptKey = useRef(newAttemptKey());
  useSeo({ title: t('Book your day · VALLÉ Advenature™ Park'), description: ONLINE_PAYMENT ? t('Build your day at Vallé: pick ziplines, quad tracks, buggies and more, choose a date and pay online or at the gate. Free to book, no cancellation fee.') : t('Build your day at Vallé: pick ziplines, quad tracks, buggies and more, choose a date and pay at the gate. Free to book, no cancellation fee.'), canonicalPath: '/booking', jsonLd: [breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Book your day', path: '/booking' }])] });
  useEffect(() => { track('Booking viewed'); }, []);
  const ref = useReveal<HTMLElement>();
  const catalog = useCatalog();
  const app = useApp();
  const goto = useGoto();
  const card = useCardModel();
  const location = useLocation();
  const {
    rate, adults, kids, infants, dateIdx, customDate, slot, setSlot, booking, clearDraft,
    name, setName, phone, setPhone, email, setEmail, nat, setNat, payMode, setPayMode,
  } = app;
  const lang = useLang();
  const isMobile = useIsMobile(760);
  const [params, setParams] = useSearchParams();
  const doneRef = params.get('done') || '';

  const draft = useSavedDraft();
  // flow state (transient; unlike the contact fields it never outlives the page)
  const [formErr, setFormErr] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [fieldErr, setFieldErr] = useState<{ name?: string; phone?: string; email?: string }>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const errRef = useRef<HTMLDivElement>(null);
  // The receipt of the booking just made survives a reload (?done=<ref> + sessionStorage).
  const [done, setDone] = useState<ReceiptSnapshot | null>(() => (doneRef ? readReceipt(doneRef) : null));
  const confirmed = done !== null;
  const coupon = useCoupon();
  const [submitting, setSubmitting] = useState(false);
  const [natFocus, setNatFocus] = useState(false);

  // Every booking entry point returned to the form in the original
  // (_nav('booking', { confirmed: false }) + scrollTo(0,0)).
  useEffect(() => {
    setDone(doneRef ? readReceipt(doneRef) : null);
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);
  // A refused booking: the notice next to the Confirm bar takes the focus, so it is read out and seen.
  useEffect(() => { if (apiErr) errRef.current?.focus(); }, [apiErr]);

  // re-worded when the language changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dOpts = useMemo(() => dateOpts(14), [lang]);
  const tIso = todayIso();
  const { avail, refresh: refreshAvail } = useAvailability(tIso, customDate);
  const selectedIso = customDate || (dOpts[dateIdx] ?? dOpts[0]).iso;
  const selectedLoad = avail[selectedIso];
  useSlotFallback(selectedLoad, slot, setSlot);

  const bookCards = catalog.ACTS.filter((a) => a.mode === 'pp' || a.mode === 'flat').map(card);
  const cartActs = booking.selLines;
  const passHint = booking.hasDiscount
    ? t('✓ Explorer Pass applied · 15% off your adventures.')
    : t('Tip: pick any 3 adventures and the Explorer Pass takes 15% off them automatically.');
  // the promo code the guest checked comes off the total shown, as the server will take it off
  const couponCut = coupon.cut(booking.total, booking.entry);
  const payable = booking.total - couponCut;
  const sumLine = (cartActs.length === 0 ? t('Park entry only') : (cartActs.length > 1 ? t('{n} activities + entry', { n: cartActs.length }) : t('{n} activity + entry', { n: cartActs.length })))
    + ' · ' + mur(payable) + (app.currency !== 'MUR' ? ' (' + money(payable) + ')' : '');
  const payModeNote = payMode === 'online' ? t('E-RECEIPT BY EMAIL & SMS, INSTANTLY') : t('FREE · NO CANCELLATION FEE');
  // Without a gateway the only honest option is the gate; the whole step is hidden.
  const payOnline = ONLINE_PAYMENT && payMode === 'online';
  const confirmLabel = payMode === 'online' ? t('Pay {amount} now →', { amount: mur(payable) }) : t('Confirm and pay on arrival →');

  /** Any edit of the contact details clears the error notices. */
  const editContact = (set: (v: string) => void, field?: 'name' | 'phone' | 'email') => (v: string) => {
    set(v); setFormErr(false); setApiErr('');
    if (field) setFieldErr((f) => (f[field] ? { ...f, [field]: undefined } : f));
  };
  /** A phone box holding only the country code the nationality filled in counts as empty. */
  const phoneValue = /^\+\d{1,4}$/.test(phone.trim()) ? '' : phone.trim();
  /** The contact details, checked as the server will (translated, next to each field). */
  const contactErrors = (): { name?: string; phone?: string; email?: string } => {
    const out: { name?: string; phone?: string; email?: string } = {};
    if (name.trim().length < 2) out.name = t('Enter your full name.');
    const em = email.trim();
    if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) out.email = t('Enter a valid e-mail address, like name@example.com.');
    const digits = phoneValue.replace(/\D/g, '');
    if (phoneValue && (!/^\+?[\d\s().-]+$/.test(phoneValue) || digits.length < 7 || digits.length > 15)) out.phone = t('Enter a valid phone number with its country code, like +230 5292 8841.');
    if (!em && !phoneValue) out.email = t('Add an e-mail or a phone number: your confirmation goes there.');
    return out;
  };
  const focusFirst = (errs: { name?: string; phone?: string; email?: string }) => {
    const el = errs.name ? nameRef.current : errs.phone ? phoneRef.current : errs.email ? emailRef.current : null;
    el?.focus();
  };
  const setNatAndPrefill = (v: string) => {
    editContact(setNat)(v);
    const code = NATC[v];
    if (code && (!phone.trim() || /^\+\d{1,4}$/.test(phone.trim()))) setPhone(code + ' ');
  };

  const slotKey = slot === 0 ? 'morning' : 'afternoon';
  const selectedSlotLevel = selectedLoad?.[slotKey].level;
  const selectedSlotFull = isOut(selectedSlotLevel);
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
  const activityFullMsg = activityFull.length > 0
    ? t('{names}: fully booked for the {slot} on this date. Pick the other slot, another day, or remove it from your day.', { names: activityFull.join(', '), slot: slot === 0 ? t('morning') : t('afternoon') })
    : '';

  const holdKey = JSON.stringify([selectedIso, slotKey, adults, kids, infants, cartActs.map((l) => [l.act.id, l.qty.a, l.qty.k, l.qty.u, times[l.key] || ''])]);
  const wantsHold = name.trim().length >= 2 && !selectedSlotFull && activityFull.length === 0 && needsTime.length === 0;
  const [hold, setHold] = useHold(wantsHold, confirmed, holdKey, () => ({ visitDate: selectedIso, slot: slotKey, adults, kids, infants, items: cartActs.map((l) => ({ id: l.act.id, adults: l.qty.a, kids: l.qty.k, units: l.qty.u, time: times[l.key] || undefined })) }));
  // Dated products (the expo deals) can only be booked for a visit inside their window; the server refuses the rest.
  const outOfDate = cartActs.find((l) => l.product && !productValidOn(l.product, selectedIso));
  const dealDateMsg = outOfDate?.product
    ? t('{name} is valid for visits from {from} to {to}. Pick a date inside those dates.', { name: outOfDate.act.name, from: shortDateFromIso(outOfDate.product.validFrom || selectedIso), to: shortDateFromIso(outOfDate.product.validTo || selectedIso) })
    : '';
  const wrongRate = cartActs.find((l) => l.product?.rateOnly && l.product.rateOnly !== (rate ?? 'rr'));
  const overParty = linesOverParty(cartActs, { adults, kids, infants });
  const nobodyOn = emptyLines(cartActs);

  /** Why the booking cannot be sent as it stands, or '' when it can. */
  const blocker = (): string => {
    if (dealDateMsg) return dealDateMsg;
    if (wrongRate) {
      return wrongRate.product?.rateOnly === 'rr'
        ? t('{name} is for residents only: choose the resident rate or remove it from your day.', { name: wrongRate.act.name })
        : t('{name} is for visitors only: choose the non-resident rate or remove it from your day.', { name: wrongRate.act.name });
    }
    if (overParty.length > 0) return t('{names}: more people than in your party. Lower the counts or change the party.', { names: overParty.join(', ') });
    if (nobodyOn.length > 0) return t('Nobody in your party is counted on {names}. Add people to it or remove it.', { names: nobodyOn.join(', ') });
    if (needsTime.length > 0) return t('Pick a start time for {names}.', { names: needsTime.join(', ') });
    if (selectedSlotFull || activityFull.length > 0) {
      return selectedSlotLevel === 'closed'
        ? t('The park is closed for that arrival slot. Pick another day.')
        : activityFull.length > 0
        ? activityFullMsg
        : t('That arrival slot is fully booked on this date. Pick the other slot or another day.');
    }
    return '';
  };

  /**
   * The sticky bar's button follows the booking: a date problem first ("Next: pick a date"),
   * then missing contact details ("Next: your details"), then the confirmation itself.
   * A tap on a "Next" label scrolls to that step instead of sending.
   */
  const dateBlocked = !!dealDateMsg || selectedSlotFull || activityFull.length > 0 || needsTime.length > 0;
  const detailsMissing = name.trim().length < 2 || (!email.trim() && !phoneValue);
  const nextStep: 'when' | 'details' | 'confirm' = dateBlocked ? 'when' : detailsMissing ? 'details' : 'confirm';
  const goStep = (id: string, focus?: HTMLElement | null) => {
    const el = document.getElementById(id);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (focus) setTimeout(() => focus.focus({ preventScroll: true }), reduce ? 0 : 400);
    else (el?.querySelector<HTMLElement>('button[aria-pressed="false"], button, input'))?.focus({ preventScroll: true });
  };
  const onSticky = () => {
    if (nextStep === 'when') { goStep('step-when'); return; }
    if (nextStep === 'details') { goStep('step-details', name.trim().length < 2 ? nameRef.current : email.trim() ? phoneRef.current : emailRef.current); return; }
    void confirmNow();
  };
  const stickyLabel = nextStep === 'when' ? t('Next: pick a date ↓') : nextStep === 'details' ? t('Next: your details ↓') : confirmLabel;

  const confirmNow = async () => {
    if (submitting) return;
    const blocked = blocker();
    if (blocked) { setApiErr(blocked); return; }
    const errs = contactErrors();
    setFieldErr(errs);
    if (errs.name || errs.phone || errs.email) { setFormErr(true); focusFirst(errs); return; }
    setFormErr(false);
    setApiErr('');
    setSubmitting(true);
    const req: BookingRequest = {
      visitDate: selectedIso,
      slot: slotKey,
      adults,
      kids,
      infants,
      rate: rate ?? 'rr',
      lang,
      items: cartActs.map((l) => ({ id: l.act.id, variant: l.variant, adults: l.qty.a, kids: l.qty.k, units: l.qty.u, time: times[l.key] || undefined })),
      name: name.trim(),
      phone: phoneValue || undefined,
      email: email.trim() || undefined,
      nationality: nat || undefined,
      payMode: ONLINE_PAYMENT ? payMode : 'gate',
      couponCode: coupon.offer ? coupon.offer.code : undefined,
      holdId: hold?.id,
      idempotencyKey: attemptKey.current,
    };
    let result: ConfirmedBooking;
    try {
      const res = await createBooking(req);
      track('Booking confirmed', { rate: req.rate, item_count: req.items.length, has_package: cartActs.some((l) => !!l.product) ? 'yes' : 'no' });
      if (res.checkoutUrl) {
        // The provider's hosted page takes over; the ticket page reads the outcome when the guest comes back.
        setRedirecting(true);
        window.location.assign(res.checkoutUrl);
        return;
      }
      result = {
        refCode: res.refCode,
        ticketUrl: res.ticketUrl,
        qrUrl: res.qrUrl,
        applied: res.adjustment ? { amount: res.adjustment, note: res.adjustmentNote || '', code: res.couponCode || '' } : null,
        total: typeof res.total === 'number' ? res.total : null,
      };
    } catch (e) {
      // Whether the server refused or never answered, the desk has no record of this
      // booking, so no reference is shown: a guest turning up with a phantom VAL code
      // is worse than a retry.
      const status = httpStatus(e);
      // 409 is either the slot (filled up while the guest was typing: refresh the picker)
      // or a limited promo code whose last use just went to someone else.
      const msg = errorMessage(e);
      const codeUsed = status === 409 && /code/i.test(msg);
      // the server's 400s, in the guest's language and next to the field they concern
      if (status === 400 && /email must be an email/i.test(msg)) {
        const errs = { email: t('Enter a valid e-mail address, like name@example.com.') };
        setFieldErr(errs); setFormErr(true); focusFirst(errs); setSubmitting(false); return;
      }
      const over = status === 400 ? /^(.+) cannot count more people than the party$/.exec(msg) : null;
      const young = status === 400 ? /^(.+) is for ages (\d+)\+ only$/.exec(msg) : null;
      if (status === 409 && !codeUsed) void refreshAvail(req.visitDate);
      if (codeUsed) coupon.clear();
      setApiErr(over
        ? t('{names}: more people than in your party. Lower the counts or change the party.', { names: over[1] })
        : young
        ? t('{name} is for ages {age}+ only: children 6–11 cannot ride. Lower the child count or remove it.', { name: young[1], age: young[2] })
        : codeUsed
        ? t('This code has just been fully used. Remove it or try another.')
        : status === 409
        ? (/^That arrival slot is fully booked/.test(msg) ? t('That arrival slot is fully booked on this date. Pick the other slot or another day.') : msg)
        : status
        ? errorMessage(e, t('We could not confirm your booking. Please try again.'))
        : t('We could not reach the booking desk. Check your connection and try again, or WhatsApp us on {phone}.', { phone: '+230 5292 8841' }));
      setSubmitting(false);
      return;
    }
    attemptKey.current = newAttemptKey();
    setHold(null);
    setSubmitting(false);
    // What the receipt shows is kept; the cart, the party and the details start afresh,
    // so going back and pressing Confirm again cannot book the same day twice.
    const snap: ReceiptSnapshot = {
      ...result,
      visitDate: selectedIso, slot, adults, kids, infants,
      lines: booking.hasDiscount ? [...booking.lines, { label: t('Explorer Pass · 15% off your adventures'), amt: '− ' + money(booking.discount) }] : booking.lines,
      pageTotal: payable,
      name: name.trim(), nat, email: email.trim(), phone: phoneValue, payOnline,
    };
    saveReceipt(snap);
    setDone(snap);
    clearDraft();
    coupon.clear();
    setParams({ done: snap.refCode }, { replace: true });
    window.scrollTo(0, 0);
  };

  const startOver = () => {
    forgetReceipt();
    setDone(null);
    setFormErr(false);
    setApiErr('');
    setFieldErr({});
    clearDraft();
    goto.home();
  };

  return (
    <main ref={ref} style={{ maxWidth: '1180px', margin: '0 auto', padding: '104px clamp(16px,3.5vw,40px) 0' }}>
      {!done && (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <h1 style={{
              fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(38px,5.8vw,74px)',
              lineHeight: 0.82, letterSpacing: '-0.01em', margin: 0, textTransform: 'uppercase',
              transform: 'rotate(-4deg)', transformOrigin: 'left bottom',
            }}>{t('Build your day')}</h1>
            <span style={{ fontFamily: MONO, fontSize: '12px', fontWeight: 600, letterSpacing: '.16em', color: 'rgba(52,0,87,.7)' }}>{t('BOOKING MADE SIMPLE')}</span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: '12px', color: 'rgba(52,0,87,.6)', marginTop: '12px' }}>{ONLINE_PAYMENT ? t('FREE TO BOOK · PAY ONLINE OR AT THE GATE · E-RECEIPT BY EMAIL & SMS') : t('FREE TO BOOK · PAY AT THE GATE · E-RECEIPT BY EMAIL & SMS')}</div>

          {/* One column, top to bottom: the five steps read as a flow (1 pick, 2 your day, 3 when, 4 details, 5 pay). */}
          <div>
            <div>
              {/* 1 · PICK EXPERIENCES */}
              <div style={{ marginTop: '30px' }}>
                <StepLabel>{t('1 · TAP TO ADD ACTIVITIES')}</StepLabel>
                <div style={{ marginTop: '12px' }}>{booking.hasDiscount || booking.advCount === 2 ? <ExplorerPassNote /> : <div style={{ background: '#FFFFE2', borderRadius: '14px', padding: '13px 18px', fontSize: '13.5px', color: '#340057', fontWeight: 600 }}>{passHint}</div>}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(146px,1fr))', gap: '10px', marginTop: '14px' }}>
                  {bookCards.map((m) => <BookCard key={m.id} m={m} />)}
                </div>
                <div style={{ marginTop: 12 }}><PackagesLine /></div>
              </div>

              {/* 2 · YOUR DAY (cart) */}
              <CartStep
                times={times}
                setTime={(key, tm) => setTimes((x) => ({ ...x, [key]: tm }))}
                hasSessions={(id) => !!sessionsOf(id)}
                timesFor={timesFor}
              />
              <DayExtras />

              {/* the route maps of what is in the cart, so the day can be pictured while booking */}
              {(() => {
                const quad = cartActs.some((l) => l.act.id === 'quad' || l.act.id === 'buggy');
                const zip = cartActs.some((l) => l.act.id === 'zipline');
                if (!quad && !zip) return null;
                const maps = <>
                  {quad && <div data-testid="booking-route-map" style={{ marginTop: '24px' }}><QuadMap /></div>}
                  {zip && <div data-testid="booking-route-map" style={{ marginTop: '24px' }}><ZiplineMap /></div>}
                </>;
                // The maps and their photos would push step 3 far down: they open on demand, on every screen.
                return (
                  <details data-testid="route-disclosure" className="route-disclosure" style={{ marginTop: '18px', background: '#F7F3FF', borderRadius: '14px', padding: '12px 16px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '15px', minHeight: '28px', display: 'flex', alignItems: 'center', gap: 8, color: '#340057' }}>
                      <MapIcon aria-hidden size={18} strokeWidth={2.2} />{t('See the route map')}
                    </summary>
                    {maps}
                  </details>
                );
              })()}

              {/* 3 · WHEN */}
              <div id="step-when" style={{ scrollMarginTop: 96 }}>
              <WhenStep
                dOpts={dOpts}
                todayIso={tIso}
                avail={avail}
                selectedLoad={selectedLoad}
                dealDateMsg={dealDateMsg}
                activityFullMsg={activityFullMsg}
                holdUntil={hold && !selectedSlotFull && activityFull.length === 0 ? hold.until : undefined}
              />
              </div>
            </div>

            <div>
              {/* 4 · DETAILS */}
              <div id="step-details" style={{ marginTop: '34px', scrollMarginTop: 96 }}>
                <StepLabel>{t('4 · YOUR DETAILS · FOR YOUR CONFIRMATION & E-RECEIPT')}</StepLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '10px', marginTop: '12px' }}>
                  <Field ref={nameRef} id="bk-name" autoComplete="name" value={name} onChange={editContact(setName, 'name')} placeholder={t('Full name')} error={fieldErr.name} />
                  <div style={{ position: 'relative' }}>
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
                      {NATIONALITIES.map((n) => <option key={n} value={n}>{t(n)}</option>)}
                    </select>
                    <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '11px', color: 'rgba(52,0,87,.7)' }}>▾</span>
                  </div>
                  <Field ref={phoneRef} id="bk-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={editContact(setPhone, 'phone')} placeholder={t('Contact number (SMS / WhatsApp)')} error={fieldErr.phone} />
                  <Field ref={emailRef} id="bk-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={editContact(setEmail, 'email')} placeholder={t('Email')} error={fieldErr.email} />
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '10px' }}>
                  <input
                    value={coupon.coupon}
                    onChange={(e) => coupon.edit(e.target.value)}
                    onBlur={() => { void coupon.tryCoupon(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void coupon.tryCoupon(); } }}
                    placeholder={t('Promo code (optional)')}
                    aria-label={t('Promo or partner code (optional)')}
                    data-testid="coupon-input"
                    dir="ltr"
                    autoComplete="off"
                    className="placeholder:font-sans placeholder:normal-case placeholder:text-[14px]"
                    style={{ ...inputStyle, flex: '1 1 180px', minWidth: 0, fontFamily: MONO, textTransform: 'uppercase', borderColor: coupon.offer ? '#33FF74' : '#EBE2FF' }}
                  />
                  <button type="button" onClick={() => { void coupon.tryCoupon(); }} className="vbtn vbtn-secondary">{t('Apply')}</button>
                  {coupon.couponMsg && <span data-testid="coupon-msg" style={{ fontSize: '13px', fontWeight: 600, color: coupon.offer ? '#1E9E4A' : '#D6173F', flex: '1 1 100%' }}>{coupon.couponMsg}{coupon.offer?.note ? ' · ' + coupon.offer.note : ''}</span>}
                </div>
              </div>

              {/* 5 · PAYMENT: shown when the API has a payment provider (or VITE_ONLINE_PAYMENT=1) */}
              {ONLINE_PAYMENT && <div style={{ marginTop: '34px' }}>
                <StepLabel>{t('5 · HOW WOULD YOU LIKE TO PAY?')}</StepLabel>
                <div role="radiogroup" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '10px', marginTop: '12px' }}>
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
              </div>}
            </div>
          </div>

          {draft.draftLoaded && <div role="status" data-testid="draft-loaded" style={{ marginTop: '18px', background: '#E6FFEE', border: '1.5px solid #33FF74', borderRadius: '14px', padding: '12px 18px', fontSize: '14px', fontWeight: 600, color: '#340057' }}>{draft.draftLoaded}</div>}
          <div data-testid="save-for-later" style={{ marginTop: '18px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', fontSize: '13.5px', color: 'rgba(52,0,87,.75)' }}>
            {draft.draftState === 'sent'
              ? <span data-testid="draft-sent" style={{ color: '#1E9E4A', fontWeight: 700 }}>{t('Saved. A link to come back to this day is in your inbox (valid 14 days). Nothing is reserved yet.')}</span>
              : <>
                  <span>{t('Not finishing now?')}</span>
                  {draft.draftState === 'ask' && <input value={draft.draftEmail} onChange={(e) => draft.setDraftEmail(e.target.value)} type="email" placeholder={t('Your e-mail')} aria-label={t('Your e-mail')} data-testid="draft-email" style={{ ...inputStyle, flex: '1 1 200px', padding: '9px 12px' }} />}
                  <button type="button" onClick={() => { void draft.saveForLater(); }} disabled={draft.draftState === 'busy'} data-testid="draft-save" className="vbtn vbtn-secondary vbtn-sm" style={{ whiteSpace: 'normal' }}>
                    {draft.draftState === 'busy' ? t('Saving…') : t('E-mail me a link to come back to this day')}
                  </button>
                  {draft.draftState === 'error' && <span style={{ color: '#D6173F', fontWeight: 600 }}>{t('We could not save it. Please try again.')}</span>}
                </>}
          </div>
          {/* The notices ride with the sticky Confirm bar, so they are seen where the button was pressed. */}
          <div data-testid="confirm-bar" style={{ position: 'sticky', bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))', marginTop: '20px', zIndex: 5 }}>
            {formErr && !apiErr && <ErrorNote style={{ marginTop: 0, marginBottom: '10px' }}>{t("Add your name and an email or contact number, that's where your confirmation & receipt go.")}</ErrorNote>}
            {apiErr && <ErrorNote ref={errRef} style={{ marginTop: 0, marginBottom: '10px', maxHeight: '32vh', overflowY: 'auto' }}>{apiErr}</ErrorNote>}
            <div style={{
              background: '#340057', borderRadius: '18px',
              padding: isMobile ? '12px 14px' : '16px 22px', display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px', flexWrap: 'wrap',
              boxShadow: '0 18px 40px -12px rgba(38,0,64,.5)',
            }}>
              <div style={{ flex: 1, minWidth: '170px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div data-testid="sticky-total" aria-live="polite" aria-atomic="true" style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '15.5px' }}>{sumLine}</div>
                  <CurrencyPicker fg="#FFFFFF" compact />
                </div>
                {couponCut > 0 && coupon.offer && (
                  <div data-testid="sticky-discount" style={{ color: '#33FF74', fontWeight: 700, fontSize: '12.5px', marginTop: '3px' }}>
                    {t('Code {code}', { code: coupon.offer.code })} · − {mur(couponCut)}
                  </div>
                )}
                <div style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '.08em', color: 'rgba(255,255,255,.65)', marginTop: '3px' }}>{payModeNote}</div>
              </div>
              {redirecting
                ? <div data-testid="checkout-redirect" style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '14.5px', padding: '14px 4px' }}>{t('Taking you to the secure payment page…')}</div>
                : <ValleButton variant="onDark" size={isMobile ? 'md' : 'lg'} onClick={onSticky} aria-busy={submitting} data-testid="sticky-action" data-step={nextStep}>{nextStep === 'confirm' ? <BtnLabel>{stickyLabel}</BtnLabel> : stickyLabel}</ValleButton>}
            </div>
          </div>
        </>
      )}

      {/* SUCCESS */}
      {done && (
        <Receipt done={done} onStartOver={startOver} />
      )}
    </main>
  );
}
