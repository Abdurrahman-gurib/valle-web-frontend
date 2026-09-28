import { describe, expect, it } from 'vitest';
import { FX_FALLBACK, convert, formatMoney, isCurrency } from './fx';
import { money, mur, setDisplayCurrency } from './format';

describe('fx', () => {
  it('converts rupees at the indicative rate and leaves MUR alone', () => {
    expect(convert(4700, 'MUR', FX_FALLBACK)).toBe(4700);
    expect(convert(46.7878, 'USD', FX_FALLBACK)).toBeCloseTo(1, 6);
    expect(convert(1000, 'EUR', FX_FALLBACK)).toBeCloseTo(18.77, 2);
  });

  it('formats rupees exactly and other currencies as approximations', () => {
    expect(formatMoney(4700, 'MUR', FX_FALLBACK)).toBe('Rs 4,700');
    expect(formatMoney(4700, 'EUR', FX_FALLBACK)).toBe('≈ € 88.22');
    expect(formatMoney(4700, 'AED', FX_FALLBACK)).toBe('≈ AED 368.92');
    expect(formatMoney(4700, 'INR', FX_FALLBACK)).toBe('≈ ₹ 9,482');
    // large amounts drop the cents
    expect(formatMoney(120000, 'USD', FX_FALLBACK)).toBe('≈ US$ 2,565');
    // unknown code: rupees
    expect(formatMoney(100, 'XXX', FX_FALLBACK)).toBe('Rs 100');
  });

  it('knows which codes are currencies', () => {
    expect(isCurrency('SAR')).toBe(true);
    expect(isCurrency('xxx')).toBe(false);
    expect(isCurrency(null)).toBe(false);
  });

  it('money() follows the display currency, mur() never does', () => {
    setDisplayCurrency('USD', FX_FALLBACK);
    expect(money(4700)).toBe('≈ US$ 100.45');
    expect(mur(4700)).toBe('Rs 4,700');
    setDisplayCurrency('MUR', FX_FALLBACK);
    expect(money(4700)).toBe('Rs 4,700');
  });
});
