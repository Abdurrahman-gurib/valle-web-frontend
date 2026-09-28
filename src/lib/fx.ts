/**
 * Display currencies. Prices are set and paid in Mauritian rupees; a visitor
 * can view them converted at the Bank of Mauritius indicative rate served by
 * /api/fx (see Backend/src/fx). Until that answers (and during the prerender)
 * the bundled snapshot below applies, so the picker always works.
 */
export interface FxRate {
  mur: number;
  name: string;
  symbol: string;
  decimals: number;
  source: 'bom' | 'peg' | 'fallback';
}
export interface FxTable {
  base: 'MUR';
  asOf: string;
  fetchedAt: string | null;
  provider: string;
  rates: Record<string, FxRate>;
}

export const CURRENCY_STORAGE_KEY = 'valle_currency';

/** Bank of Mauritius consolidated indicative T.T. buying rates, 28-09-2026; AED/SAR via the USD peg. */
export const FX_FALLBACK: FxTable = {
  base: 'MUR',
  asOf: '2026-09-28',
  fetchedAt: null,
  provider: 'Bank of Mauritius, indicative T.T. buying rates',
  rates: {
    MUR: { mur: 1, name: 'Mauritian rupee', symbol: 'Rs', decimals: 0, source: 'fallback' },
    EUR: { mur: 53.2771, name: 'Euro', symbol: '€', decimals: 2, source: 'fallback' },
    USD: { mur: 46.7878, name: 'US dollar', symbol: 'US$', decimals: 2, source: 'fallback' },
    GBP: { mur: 61.9709, name: 'British pound', symbol: '£', decimals: 2, source: 'fallback' },
    AED: { mur: 12.739946, name: 'UAE dirham', symbol: 'AED', decimals: 2, source: 'peg' },
    SAR: { mur: 12.476747, name: 'Saudi riyal', symbol: 'SAR', decimals: 2, source: 'peg' },
    INR: { mur: 0.4957, name: 'Indian rupee', symbol: '₹', decimals: 0, source: 'fallback' },
    ZAR: { mur: 2.8938, name: 'South African rand', symbol: 'R', decimals: 2, source: 'fallback' },
    CHF: { mur: 56.3995, name: 'Swiss franc', symbol: 'CHF', decimals: 2, source: 'fallback' },
    AUD: { mur: 33.4599, name: 'Australian dollar', symbol: 'A$', decimals: 2, source: 'fallback' },
    CAD: { mur: 33.3183, name: 'Canadian dollar', symbol: 'C$', decimals: 2, source: 'fallback' },
    CNY: { mur: 7.0136, name: 'Chinese yuan', symbol: '¥', decimals: 2, source: 'fallback' },
    JPY: { mur: 0.296612, name: 'Japanese yen', symbol: '¥', decimals: 0, source: 'fallback' },
    SGD: { mur: 36.8455, name: 'Singapore dollar', symbol: 'S$', decimals: 2, source: 'fallback' },
    NZD: { mur: 26.7428, name: 'New Zealand dollar', symbol: 'NZ$', decimals: 2, source: 'fallback' },
  },
};

/** Picker order: rupee first, then the currencies most guests arrive with. */
export const CURRENCY_ORDER = ['MUR', 'EUR', 'USD', 'GBP', 'AED', 'SAR', 'INR', 'ZAR', 'CHF', 'AUD', 'CAD', 'CNY', 'JPY', 'SGD', 'NZD'];

export const isCurrency = (code: unknown, table: FxTable = FX_FALLBACK): code is string =>
  typeof code === 'string' && code in table.rates;

/** Rupees -> the currency, at the indicative rate. */
export function convert(mur: number, code: string, table: FxTable): number {
  const rate = table.rates[code]?.mur;
  if (!rate || code === 'MUR') return mur;
  return mur / rate;
}

/**
 * Money for display. Rupees keep the site's "Rs 4,700" style; anything else is
 * an approximation, marked "≈" so nobody reads it as the amount charged.
 */
export function formatMoney(mur: number, code: string, table: FxTable): string {
  if (code === 'MUR' || !table.rates[code]) return 'Rs ' + mur.toLocaleString('en-US');
  const r = table.rates[code];
  const v = convert(mur, code, table);
  // Cents matter on a €88 ticket, not on a ₹9,482 or US$2,565 package.
  const digits = v < 1000 ? r.decimals : 0;
  return '≈ ' + r.symbol + ' ' + v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function readStoredCurrency(): string {
  try {
    const c = localStorage.getItem(CURRENCY_STORAGE_KEY);
    return isCurrency(c) ? c : 'MUR';
  } catch {
    return 'MUR';
  }
}
