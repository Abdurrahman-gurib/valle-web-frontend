import { exportUrl, type BookingSort } from '../../../lib/staffApi';
import { NATC } from '../../../lib/format';
import { cn } from '../../../lib/utils';
import { ExportLink, addDays, todayIsoPark } from '../reportUi';
import { Btn } from '../ui';
import { Select, cardCls, inputCls, tagCls } from './shared';

/** The list filters ('all' / '' = no filter) and the sort order. */
export interface BookingFilterValues {
  status: string;
  from: string;
  to: string;
  slot: string;
  payMode: string;
  rate: string;
  nationality: string;
  sort: BookingSort;
}

/** Every filter off; Clear restores these and keeps the sort. */
export const NO_FILTERS: Omit<BookingFilterValues, 'sort'> = {
  status: 'all', from: '', to: '', slot: 'all', payMode: 'all', rate: 'all', nationality: 'all',
};

export const isFiltered = (f: BookingFilterValues, q: string) =>
  q !== '' || (Object.keys(NO_FILTERS) as (keyof typeof NO_FILTERS)[]).some((k) => f[k] !== NO_FILTERS[k]);

/** Every status the API knows, in the order the floor uses them. */
export const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'arrived', label: 'Arrived' },
  { value: 'postponed', label: 'Postponed (weather)' },
  { value: 'cancelled', label: 'Cancelled' },
];

const SORTS: BookingSort[] = ['newest', 'oldest', 'visit_asc', 'visit_desc', 'total_desc', 'total_asc', 'guest'];

/** "  VAL   2857 26 " → "VAL 2857 26": what the search sends (the API matches each word). */
export const normaliseSearch = (q: string): string => q.trim().replace(/\s+/g, ' ');

/** The filters as the URL holds them (`?status=postponed&from=2026-11-04`); absent = no filter. */
export function filtersFromParams(p: URLSearchParams): BookingFilterValues {
  const get = (k: keyof typeof NO_FILTERS) => p.get(k) ?? NO_FILTERS[k];
  const sort = p.get('sort') as BookingSort | null;
  return {
    status: get('status'), from: get('from'), to: get('to'), slot: get('slot'), payMode: get('payMode'),
    rate: get('rate'), nationality: get('nationality'), sort: sort && SORTS.includes(sort) ? sort : 'newest',
  };
}

/** A filter change as URL params: a value equal to "no filter" removes its key. */
export function filtersToParams(patch: Partial<BookingFilterValues>): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(patch)) {
    const none = k === 'sort' ? 'newest' : NO_FILTERS[k as keyof typeof NO_FILTERS];
    out[k] = v === undefined || v === none ? null : String(v);
  }
  return out;
}

/** Quick visit-date chips: one day, from and to. */
function dayChips(): { label: string; day: string }[] {
  const today = todayIsoPark();
  return [{ label: 'Today', day: today }, { label: 'Tomorrow', day: addDays(today, 1) }];
}

/** Search, filters, export and "+ New booking" above the table. */
export function BookingFilters({ q, onQ, f, onChange, filtered, onClear, onCreate, isMobile }: {
  q: string;
  onQ: (q: string) => void;
  f: BookingFilterValues;
  onChange: (patch: Partial<BookingFilterValues>) => void;
  filtered: boolean;
  onClear: () => void;
  onCreate: () => void;
  isMobile: boolean;
}) {
  // a number is a minimum width (see Select), so "Any payment" is never cut at 1366 px
  const w = (desktop: number) => (isMobile ? '100%' : desktop);
  return (
    <div className={cn(cardCls, 'mb-3.5 flex flex-wrap items-center gap-2.5 p-3.5')}>
      <div className="flex flex-[1_1_100%] flex-wrap items-center gap-2" role="group" aria-label="Visit date shortcuts">
        <span className={tagCls}>VISIT</span>
        {dayChips().map((c) => {
          const on = f.from === c.day && f.to === c.day;
          return (
            <button
              key={c.label}
              type="button"
              aria-pressed={on}
              data-testid={'chip-' + c.label.toLowerCase()}
              onClick={() => onChange(on ? { from: '', to: '' } : { from: c.day, to: c.day })}
              className={cn(
                'cursor-pointer rounded-full border-[1.5px] border-solid border-valle-purple px-3.5 py-[6px] [font-family:inherit] text-[13px] font-bold',
                on ? 'bg-valle-purple text-white' : 'bg-white text-valle-purple hover:bg-[#F4EEFF]',
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>
      <input
        type="search"
        value={q}
        onChange={(e) => onQ(e.target.value)}
        placeholder="Search ref (2857), name, email or phone"
        aria-label="Search bookings"
        className={cn(inputCls, 'w-auto min-w-[180px] flex-[1_1_240px]')}
      />
      <Select value={f.status} onChange={(status) => onChange({ status })} width={w(160)} ariaLabel="Filter by status">
        <option value="all">All statuses</option>
        {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </Select>
      <div className={cn('flex items-center gap-2', isMobile ? 'flex-[1_1_100%]' : 'flex-[0_0_auto]')}>
        <span className={tagCls}>FROM</span>
        <input type="date" value={f.from} onChange={(e) => onChange({ from: e.target.value })} aria-label="From date" className={cn(inputCls, 'w-auto flex-1')} />
        <span className={tagCls}>TO</span>
        <input type="date" value={f.to} onChange={(e) => onChange({ to: e.target.value })} aria-label="To date" className={cn(inputCls, 'w-auto flex-1')} />
      </div>
      <Select value={f.slot} onChange={(slot) => onChange({ slot })} width={w(130)} ariaLabel="Filter by slot">
        <option value="all">Any slot</option>
        <option value="morning">Morning</option>
        <option value="afternoon">Afternoon</option>
      </Select>
      <Select value={f.payMode} onChange={(payMode) => onChange({ payMode })} width={w(130)} ariaLabel="Filter by payment">
        <option value="all">Any payment</option>
        <option value="gate">At gate</option>
        <option value="online">Online</option>
      </Select>
      <Select value={f.rate} onChange={(rate) => onChange({ rate })} width={w(130)} ariaLabel="Filter by rate">
        <option value="all">Any rate</option>
        <option value="rr">Resident</option>
        <option value="nr">Visitor</option>
      </Select>
      <Select value={f.nationality} onChange={(nationality) => onChange({ nationality })} width={w(170)} ariaLabel="Filter by nationality">
        <option value="all">Any nationality</option>
        {Object.keys(NATC).map((n) => <option key={n} value={n}>{n}</option>)}
      </Select>
      <Select value={f.sort} onChange={(sort) => onChange({ sort })} width={w(170)} ariaLabel="Sort">
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="visit_asc">Visit date, soonest</option>
        <option value="visit_desc">Visit date, latest</option>
        <option value="total_desc">Highest total</option>
        <option value="total_asc">Lowest total</option>
        <option value="guest">Guest A to Z</option>
      </Select>
      {filtered && (
        <Btn variant="ghost" onClick={onClear}>
          Clear
        </Btn>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <ExportLink href={exportUrl('bookings', f.from || undefined, f.to || undefined)} label={f.from || f.to ? 'Export range' : 'Export month'} />
        <Btn onClick={onCreate}>+ New booking</Btn>
      </div>
    </div>
  );
}
