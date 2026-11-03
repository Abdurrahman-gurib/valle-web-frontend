import { breadcrumbs, useSeo } from '../../lib/seo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { BookingRequest } from '../../types';
import { productValidOn } from '../../types';
import { useApp } from '../../store/AppStore';
import { useCatalog } from '../../store/CatalogContext';
import { QuadMap, ZiplineMap } from '../home/ActivityMaps';
import { CurrencyPicker } from '../../components/CurrencyPicker';
import { BtnLabel, ValleButton } from '@/components/ui/valle';
import { useGoto } from '../../lib/nav';
import { useCardModel } from '../../lib/card';
import { createBooking, newAttemptKey } from '../../lib/api';
import { errorMessage, httpStatus } from '../../lib/errors';
import { money, mur, partyLabel, dateOpts, todayIso, fullDateFromIso, shortDateFromIso, NATC } from '../../lib/format';
import { useReveal } from '../../hooks/useReveal';
import { useT } from '../../i18n';
import { BARLOW, ErrorNote, Field, inputStyle, MONO, NATIONALITIES, PayCard, StepLabel } from './bookingUi';
import { BookCard, CartStep } from './CartStep';
import { isOut, WhenStep } from './WhenStep';
import { Receipt, type ConfirmedBooking } from './Receipt';
import { useAvailability, useCoupon, useHold, useOnlinePayment, useSavedDraft, useSlotFallback } from './bookingHooks';

/** /booking: the five steps (1 pick, 2 your day, 3 when, 4 details, 5 pay), then the receipt. */
export default function BookingPage() {
  const t = useT();
  const ONLINE_PAYMENT = useOnlinePayment();
  const [redirecting, setRedirecting] = useState(false);
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
    rate, adults, kids, dateIdx, customDate, slot, setSlot, booking, clearSel,
    name, setName, phone, setPhone, email, setEmail, nat, setNat, payMode, setPayMode,
  } = app;

  const draft = useSavedDraft();
  // flow state (transient; unlike the contact fields it never outlives the page)
  const [formErr, setFormErr] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [done, setDone] = useState<ConfirmedBooking | null>(null);
  const confirmed = done !== null;
  const coupon = useCoupon();
  const [submitting, setSubmitting] = useState(false);
  const [natFocus, setNatFocus] = useState(false);

  // Every booking entry point returned to the form in the original
  // (_nav('booking', { confirmed: false }) + scrollTo(0,0)).
  useEffect(() => {
    setDone(null);
    window.scrollTo(0, 0);
  }, [location.key]);

  const dOpts = useMemo(() => dateOpts(14), []);
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
  const sumLine = (cartActs.length === 0 ? t('Park entry only') : (cartActs.length > 1 ? t('{n} experiences + entry', { n: cartActs.length }) : t('{n} experience + entry', { n: cartActs.length })))
    + ' · ' + mur(booking.total) + (app.currency !== 'MUR' ? ' (' + money(booking.total) + ')' : '');
  const payModeNote = payMode === 'online' ? t('E-RECEIPT BY EMAIL & SMS, INSTANTLY') : t('FREE · NO CANCELLATION FEE');
  // Without a gateway the only honest option is the gate; the whole step is hidden.
  const payOnline = ONLINE_PAYMENT && payMode === 'online';
  const confirmLabel = payMode === 'online' ? t('Pay {amount} now →', { amount: mur(booking.total) }) : t('Confirm and pay on arrival →');

  const dateSummary = (customDate && fullDateFromIso(customDate)) || (dOpts[dateIdx]?.full ?? '');
  const slotName = slot === 0 ? t('Morning arrival') : t('Afternoon arrival');

  /** Any edit of the contact details clears the error notices. */
  const editContact = (set: (v: string) => void) => (v: string) => { set(v); setFormErr(false); setApiErr(''); };
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

  const holdKey = JSON.stringify([selectedIso, slotKey, adults, kids, cartActs.map((l) => [l.act.id, l.qty.a, l.qty.k, l.qty.u, times[l.key] || ''])]);
  const wantsHold = name.trim().length >= 2 && !selectedSlotFull && activityFull.length === 0 && needsTime.length === 0;
  const [hold, setHold] = useHold(wantsHold, confirmed, holdKey, () => ({ visitDate: selectedIso, slot: slotKey, adults, kids, items: cartActs.map((l) => ({ id: l.act.id, adults: l.qty.a, kids: l.qty.k, units: l.qty.u, time: times[l.key] || undefined })) }));
  // Dated products (the expo deals) can only be booked for a visit inside their window; the server refuses the rest.
  const outOfDate = cartActs.find((l) => l.product && !productValidOn(l.product, selectedIso));
  const dealDateMsg = outOfDate?.product
    ? t('{name} is valid for visits from {from} to {to}. Pick a date inside those dates.', { name: outOfDate.act.name, from: shortDateFromIso(outOfDate.product.validFrom || selectedIso), to: shortDateFromIso(outOfDate.product.validTo || selectedIso) })
    : '';
  const wrongRate = cartActs.find((l) => l.product?.rateOnly && l.product.rateOnly !== (rate ?? 'rr'));

  /** Why the booking cannot be sent as it stands, or '' when it can. */
  const blocker = (): string => {
    if (dealDateMsg) return dealDateMsg;
    if (wrongRate) {
      return wrongRate.product?.rateOnly === 'rr'
        ? t('{name} is for residents only: choose the resident rate or remove it from your day.', { name: wrongRate.act.name })
        : t('{name} is for visitors only: choose the non-resident rate or remove it from your day.', { name: wrongRate.act.name });
    }
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

  const confirmNow = async () => {
    if (submitting) return;
    const blocked = blocker();
    if (blocked) { setApiErr(blocked); return; }
    const ok = name.trim() && (email.trim() || phone.trim());
    if (!ok) { setFormErr(true); return; }
    setFormErr(false);
    setApiErr('');
    setSubmitting(true);
    const req: BookingRequest = {
      visitDate: selectedIso,
      slot: slotKey,
      adults,
      kids,
      rate: rate ?? 'rr',
      items: cartActs.map((l) => ({ id: l.act.id, variant: l.variant, adults: l.qty.a, kids: l.qty.k, units: l.qty.u, time: times[l.key] || undefined })),
      name: name.trim(),
      phone: phone.trim() || undefined,
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
      if (status === 409 && !codeUsed) void refreshAvail(req.visitDate);
      if (codeUsed) coupon.clear();
      setApiErr(codeUsed
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
    setDone(result);
    window.scrollTo(0, 0);
  };

  const startOver = () => {
    setDone(null);
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
                <StepLabel>{t('1 · TAP TO ADD EXPERIENCES')}</StepLabel>
                <div style={{ background: booking.hasDiscount ? '#E2FFEB' : '#FFFFE2', borderRadius: '14px', padding: '13px 18px', fontSize: '13.5px', color: '#340057', fontWeight: 600, marginTop: '12px' }}>{passHint}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(146px,1fr))', gap: '10px', marginTop: '14px' }}>
                  {bookCards.map((m) => <BookCard key={m.id} m={m} />)}
                </div>
              </div>

              {/* 2 · YOUR DAY (cart) */}
              <CartStep
                times={times}
                setTime={(key, tm) => setTimes((x) => ({ ...x, [key]: tm }))}
                hasSessions={(id) => !!sessionsOf(id)}
                timesFor={timesFor}
              />

              {/* the route maps of what is in the cart, so the day can be pictured while booking */}
              {cartActs.some((l) => l.act.id === 'quad' || l.act.id === 'buggy') && <div data-testid="booking-route-map" style={{ marginTop: '24px' }}><QuadMap /></div>}
              {cartActs.some((l) => l.act.id === 'zipline') && <div data-testid="booking-route-map" style={{ marginTop: '24px' }}><ZiplineMap /></div>}

              {/* 3 · WHEN */}
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

            <div>
              {/* 4 · DETAILS */}
              <div style={{ marginTop: '34px' }}>
                <StepLabel>{t('4 · YOUR DETAILS · FOR YOUR CONFIRMATION & E-RECEIPT')}</StepLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '10px', marginTop: '12px' }}>
                  <Field value={name} onChange={editContact(setName)} placeholder={t('Full name')} />
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
                  <Field value={phone} onChange={editContact(setPhone)} placeholder={t('Contact number (SMS / WhatsApp)')} />
                  <Field value={email} onChange={editContact(setEmail)} placeholder={t('Email')} />
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '10px' }}>
                  <input
                    value={coupon.coupon}
                    onChange={(e) => coupon.edit(e.target.value)}
                    onBlur={() => { void coupon.tryCoupon(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void coupon.tryCoupon(); } }}
                    placeholder={t('Promo or partner code (optional)')}
                    data-testid="coupon-input"
                    dir="ltr"
                    style={{ ...inputStyle, flex: '1 1 220px', fontFamily: MONO, textTransform: 'uppercase', borderColor: coupon.offer ? '#33FF74' : '#EBE2FF' }}
                  />
                  <button type="button" onClick={() => { void coupon.tryCoupon(); }} className="vbtn vbtn-secondary">{t('Apply')}</button>
                  {coupon.couponMsg && <span data-testid="coupon-msg" style={{ fontSize: '13px', fontWeight: 600, color: coupon.offer ? '#1E9E4A' : '#D91E44', flex: '1 1 100%' }}>{coupon.couponMsg}{coupon.offer?.note ? ' · ' + coupon.offer.note : ''}</span>}
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
                  {draft.draftState === 'error' && <span style={{ color: '#D91E44', fontWeight: 600 }}>{t('We could not save it. Please try again.')}</span>}
                </>}
          </div>
          {formErr && <ErrorNote>{t("Add your name and an email or contact number, that's where your confirmation & receipt go.")}</ErrorNote>}
          {apiErr && <ErrorNote>{apiErr}</ErrorNote>}
          <div style={{
            position: 'sticky', bottom: '14px', marginTop: '20px', background: '#340057', borderRadius: '18px',
            padding: '16px 22px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
            boxShadow: '0 18px 40px -12px rgba(38,0,64,.5)',
          }}>
            <div style={{ flex: 1, minWidth: '170px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '15.5px' }}>{sumLine}</div>
                <CurrencyPicker fg="#FFFFFF" compact />
              </div>
              <div style={{ fontFamily: MONO, fontSize: '9.5px', letterSpacing: '.08em', color: 'rgba(255,255,255,.65)', marginTop: '3px' }}>{payModeNote}</div>
            </div>
            {redirecting
              ? <div data-testid="checkout-redirect" style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '14.5px', padding: '14px 4px' }}>{t('Taking you to the secure payment page…')}</div>
              : <ValleButton variant="onDark" size="lg" onClick={confirmNow}><BtnLabel>{confirmLabel}</BtnLabel></ValleButton>}
          </div>
        </>
      )}

      {/* SUCCESS */}
      {done && (
        <Receipt
          done={done}
          payOnline={payOnline}
          dateSummary={dateSummary}
          slotName={slotName}
          partySummary={partyLabel(adults, kids)}
          onStartOver={startOver}
        />
      )}
    </main>
  );
}
