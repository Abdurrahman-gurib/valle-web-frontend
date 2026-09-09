import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import type { BookingSummary, RateKey, Sel, SelEntry } from '../types';
import { useCatalog } from './CatalogContext';
import { computeBooking, priceFor } from './booking';

interface AppState {
  // rate
  rate: RateKey | null;
  rateTag: string;              // 'RR' | 'NR'
  rateWord: string;             // 'Resident' | 'Visitor'
  rateGateOpen: boolean;
  rateGateDismissable: boolean;
  setRate: (r: RateKey) => void;
  openRateGate: () => void;
  closeRateGate: () => void;

  // selection ("My Day")
  sel: Sel;
  selCount: number;
  hasSel: boolean;
  toggleSel: (id: string) => void;
  bumpSel: (id: string, key: 'a' | 'k' | 'u', d: number) => void;
  clearSel: () => void;
  isSelected: (id: string) => boolean;

  // party & visit
  adults: number;
  kids: number;
  setAdults: (n: number) => void;
  setKids: (n: number) => void;
  dateIdx: number;
  setDateIdx: (i: number) => void;
  customDate: string;
  setCustomDate: (iso: string) => void;
  slot: number;                  // 0 morning, 1 afternoon
  setSlot: (i: number) => void;

  // contact + payment (app-level in the original, so they survive leaving /booking)
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  nat: string;
  setNat: (v: string) => void;
  payMode: 'gate' | 'online';
  setPayMode: (m: 'gate' | 'online') => void;

  // My Day drawer
  dayOpen: boolean;
  openDay: () => void;
  closeDay: () => void;

  // pricing
  booking: BookingSummary;
  activityPrice: (id: string) => number;
}

const Ctx = createContext<AppState | null>(null);

function readRate(): RateKey | null {
  try {
    const saved = localStorage.getItem('valle_rate');
    if (saved === 'rr' || saved === 'nr') return saved;
  } catch { /* private mode */ }
  return null;
}

/** Reads the saved cart, dropping anything that would price as NaN or count as a phantom line. */
function readSel(): Sel {
  try {
    const raw = localStorage.getItem('valle_sel');
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Sel = {};
    for (const [id, val] of Object.entries(parsed as Record<string, unknown>)) {
      if (!val || typeof val !== 'object' || Array.isArray(val)) continue;
      const src = val as Record<string, unknown>;
      const entry: SelEntry = {};
      let qty = 0;
      for (const k of ['a', 'k', 'u'] as const) {
        const n = src[k];
        if (typeof n !== 'number' || !Number.isFinite(n)) continue;
        const q = Math.max(0, Math.min(12, Math.floor(n)));
        entry[k] = q;
        qty += q;
      }
      if (qty > 0) out[id] = entry;
    }
    return out;
  } catch { /* corrupted or private mode */ }
  return {};
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const catalog = useCatalog();
  const [rate, setRateState] = useState<RateKey | null>(readRate);
  const [rateGate, setRateGate] = useState(false);
  const [sel, setSel] = useState<Sel>(readSel);
  const [adults, setAdults] = useState(2);
  const [kids, setKids] = useState(0);
  const [dateIdx, setDateIdx] = useState(1);
  const [customDate, setCustomDate] = useState('');
  const [slot, setSlot] = useState(0);
  const [dayOpen, setDayOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nat, setNat] = useState('');
  const [payMode, setPayMode] = useState<'gate' | 'online'>('gate');

  useEffect(() => {
    try { localStorage.setItem('valle_sel', JSON.stringify(sel)); } catch { /* ignore */ }
  }, [sel]);

  // Drop saved ids the live catalog no longer has, so the header badge can never
  // count a line the drawer and the cart cannot show. Same object when nothing is stale.
  useEffect(() => {
    setSel((s) => {
      const ids = Object.keys(s);
      const live = ids.filter((id) => catalog.ACTS.some((a) => a.id === id));
      if (live.length === ids.length) return s;
      const next: Sel = {};
      for (const id of live) next[id] = s[id];
      return next;
    });
  }, [catalog]);

  const setRate = useCallback((r: RateKey) => {
    try { localStorage.setItem('valle_rate', r); } catch { /* ignore */ }
    setRateState(r);
    setRateGate(false);
  }, []);

  const toggleSel = useCallback((id: string) => {
    setSel((s) => {
      const next = { ...s };
      if (next[id]) {
        delete next[id];
      } else {
        const act = catalog.ACTS.find((x) => x.id === id);
        next[id] = act && act.mode === 'flat' ? { u: 1 } : { a: Math.max(1, adults), k: kids };
      }
      return next;
    });
  }, [catalog, adults, kids]);

  const bumpSel = useCallback((id: string, key: 'a' | 'k' | 'u', d: number) => {
    setSel((s) => {
      const cur = s[id];
      if (!cur) return s;
      const entry = { ...cur, [key]: Math.max(0, Math.min(12, (cur[key] || 0) + d)) };
      const next = { ...s };
      if ((entry.a || 0) + (entry.k || 0) + (entry.u || 0) <= 0) delete next[id];
      else next[id] = entry;
      return next;
    });
  }, []);

  const clearSel = useCallback(() => setSel({}), []);

  const booking = useMemo(
    () => computeBooking(catalog, sel, adults, kids, rate),
    [catalog, sel, adults, kids, rate],
  );

  const value = useMemo<AppState>(() => ({
    rate,
    rateTag: rate === 'nr' ? 'NR' : 'RR',
    rateWord: rate === 'nr' ? 'Visitor' : 'Resident',
    rateGateOpen: !rate || rateGate,
    rateGateDismissable: !!rate,
    setRate,
    openRateGate: () => setRateGate(true),
    closeRateGate: () => setRateGate(false),

    sel,
    selCount: Object.keys(sel).length,
    hasSel: Object.keys(sel).length > 0,
    toggleSel,
    bumpSel,
    clearSel,
    isSelected: (id: string) => !!sel[id],

    adults,
    kids,
    setAdults: (n: number) => setAdults(Math.max(1, Math.min(12, n))),
    setKids: (n: number) => setKids(Math.max(0, Math.min(12, n))),
    dateIdx,
    setDateIdx,
    customDate,
    setCustomDate,
    slot,
    setSlot,

    name,
    setName,
    phone,
    setPhone,
    email,
    setEmail,
    nat,
    setNat,
    payMode,
    setPayMode,

    dayOpen,
    openDay: () => setDayOpen(true),
    closeDay: () => setDayOpen(false),

    booking,
    activityPrice: (id: string) => {
      const act = catalog.ACTS.find((a) => a.id === id);
      return act ? priceFor(catalog, act, rate) : 0;
    },
  }), [rate, rateGate, sel, adults, kids, dateIdx, customDate, slot, dayOpen, name, phone, email, nat, payMode, booking, catalog, setRate, toggleSel, bumpSel, clearSel]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppStoreProvider');
  return v;
}
