import type { ReactNode } from 'react';
import { inputStyle } from '../ui';

/** The shared card surface (ui.tsx `card`) as classes, so a fill can override it. */
export const cardCls = 'rounded-[18px] border-[1.5px] border-solid border-valle-lilac bg-white';
/** The shared field look (ui.tsx `inputStyle`) as classes, so a width can override it. */
export const inputCls = 'w-full rounded-[12px] border-[1.5px] border-solid border-valle-lilac bg-[#F7F3FF] px-3.5 py-[11px] [font-family:inherit] text-[14.5px] text-valle-purple outline-none';
export const tagCls = 'font-mono text-[9.5px] font-bold tracking-[.13em] text-valle-violet';

export const slotLabel = (s: string) => (s === 'morning' ? 'Morning' : s === 'afternoon' ? 'Afternoon' : s);
export const rateLabel = (r: string) => (r === 'rr' ? 'Resident (RR)' : 'Visitor (NR)');
export const payLabel = (p: string) => (p === 'gate' ? 'At gate' : 'Online');

/** Field names as an operator reads them, used by the form and the audit trail. */
export const FIELD_LABEL: Record<string, string> = {
  visitDate: 'Visit date', slot: 'Slot', adults: 'Adults', kids: 'Children', rate: 'Rate',
  guestName: 'Guest', phone: 'Phone', email: 'Email', nationality: 'Nationality',
  payMode: 'Payment', status: 'Status', staffNote: 'Internal note',
  entryAmount: 'Park entry', subtotal: 'Subtotal', discount: 'Discount', total: 'Total',
  currency: 'Currency', lines: 'Line items',
};

/** Filter <select> styled like the booking form's fields; `T` is the union its options spell. */
export function Select<T extends string>({ value, onChange, children, width, id, ariaLabel }: {
  value: T; onChange: (v: T) => void; children: ReactNode;
  width?: number | string; id?: string; ariaLabel?: string;
}) {
  return (
    <select
      id={id}
      aria-label={ariaLabel}
      value={value}
      // the options are the caller's own T values
      onChange={(e) => onChange(e.target.value as T)}
      className="cursor-pointer appearance-auto"
      style={{ ...inputStyle, width: width ?? 'auto' }}
    >
      {children}
    </select>
  );
}
