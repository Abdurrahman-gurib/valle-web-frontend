import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  checkCoupon, createHold, fetchAvailability, fetchPaymentConfig, readDraft, releaseHold, saveDraft,
  type AvailabilityDay, type HoldRequest,
} from '../../lib/api';
import { useApp } from '../../store/AppStore';
import { useT } from '../../i18n';
import { isOut } from './WhenStep';

/**
 * "Pay online now" is offered only when the API has a payment provider configured
 * (GET /api/payments/config); VITE_ONLINE_PAYMENT=1 forces it on for a build.
 */
const FORCE_ONLINE_PAYMENT = import.meta.env.VITE_ONLINE_PAYMENT === '1';

export function useOnlinePayment(): boolean {
  const [online, setOnline] = useState(FORCE_ONLINE_PAYMENT);
  useEffect(() => {
    let dead = false;
    void fetchPaymentConfig().then((c) => { if (!dead && c.enabled) setOnline(true); });
    return () => { dead = true; };
  }, []);
  return online;
}

export type DraftState = 'idle' | 'ask' | 'busy' | 'sent' | 'error';

/**
 * "Save and continue later": the page state goes to the API and a link comes back by e-mail;
 * ?draft=<id> on this page restores it.
 */
export function useSavedDraft() {
  const t = useT();
  const app = useApp();
  const location = useLocation();
  const [draftEmail, setDraftEmail] = useState('');
  const [draftState, setDraftState] = useState<DraftState>('idle');
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
    const { sel, adults, kids, customDate, dateIdx, slot, name, phone, email, nat } = app;
    const to = (draftEmail || email).trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) { setDraftState('ask'); return; }
    setDraftState('busy');
    try {
      await saveDraft(to, { sel, adults, kids, customDate, dateIdx, slot, name, phone, email: email || to, nat });
      setDraftState('sent');
    } catch { setDraftState('error'); }
  };
  return { draftEmail, setDraftEmail, draftState, draftLoaded, saveForLater };
}

export interface CouponOffer { code: string; kind: string; value: number; note: string }

/** Promo / partner code: checked live, applied by the server when the booking is made. */
export function useCoupon() {
  const t = useT();
  const [coupon, setCoupon] = useState('');
  const [offer, setOffer] = useState<CouponOffer | null>(null);
  const [couponMsg, setCouponMsg] = useState('');
  const clear = () => { setOffer(null); setCouponMsg(''); };
  const tryCoupon = async () => {
    const code = coupon.trim();
    if (!code) { clear(); return; }
    try {
      const o = await checkCoupon(code);
      setOffer(o);
      setCouponMsg(o.kind === 'percent' ? t('Code applied: {n}% off', { n: o.value }) : o.kind === 'amount' ? t('Code applied: Rs {n} off', { n: o.value }) : o.kind === 'entry_free' ? t('Code applied: park entry free') : t('Code applied: free of charge'));
    } catch {
      setOffer(null);
      setCouponMsg(t('This code is not valid or has expired.'));
    }
  };
  /** Typing a new code drops the one checked before. */
  const edit = (v: string) => { setCoupon(v.toUpperCase()); clear(); };
  return { coupon, edit, offer, couponMsg, tryCoupon, clear };
}

/** How busy each day already is, keyed by ISO date. Missing = unknown (API away): no dots. */
export function useAvailability(todayIso: string, customDate: string) {
  const [avail, setAvail] = useState<Record<string, AvailabilityDay>>({});
  const merge = (days: AvailabilityDay[]) => setAvail((prev) => {
    const next = { ...prev };
    for (const d of days) next[d.date] = d;
    return next;
  });
  useEffect(() => {
    let dead = false;
    fetchAvailability(todayIso, 14).then((d) => { if (!dead) merge(d); }).catch(() => { /* picker works without it */ });
    return () => { dead = true; };
  }, [todayIso]);
  useEffect(() => {
    if (!customDate || avail[customDate]) return;
    let dead = false;
    fetchAvailability(customDate, 1).then((d) => { if (!dead) merge(d); }).catch(() => { /* ignore */ });
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customDate]);
  const refresh = (iso: string) => fetchAvailability(iso, 1).then(merge).catch(() => { /* ignore */ });
  return { avail, refresh };
}

/** Moves the guest to the other arrival slot when theirs is full or closed and the other is not. */
export function useSlotFallback(load: AvailabilityDay | undefined, slot: number, setSlot: (s: number) => void) {
  useEffect(() => {
    if (!load) return;
    const cur = slot === 0 ? load.morning.level : load.afternoon.level;
    const other = slot === 0 ? load.afternoon.level : load.morning.level;
    if (isOut(cur) && !isOut(other)) setSlot(slot === 0 ? 1 : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);
}

/**
 * Holds the places while the guest types their details, so the last spots are not lost mid-form.
 * `key` changes whenever the party, date, slot or cart does; the hold is renewed then.
 * `paused` (the booking is confirmed) is read, not watched: it never triggers a new hold.
 */
export function useHold(wanted: boolean, paused: boolean, key: string, request: () => Omit<HoldRequest, 'holdId'>) {
  const [hold, setHold] = useState<{ id: string; until: string } | null>(null);
  useEffect(() => {
    if (!wanted || paused) return;
    let dead = false;
    const timer = setTimeout(() => {
      void createHold({ ...request(), holdId: hold?.id }).then((h) => {
        if (dead) { void releaseHold(h.holdId); return; }
        setHold({ id: h.holdId, until: new Date(h.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      }).catch(() => { if (!dead) setHold(null); });
    }, 700);
    return () => { dead = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, key]);
  useEffect(() => () => { if (hold) void releaseHold(hold.id); }, [hold]);
  return [hold, setHold] as const;
}
