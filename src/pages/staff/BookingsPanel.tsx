import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BookingRow } from '../../types';
import { listBookings } from '../../lib/staffApi';
import { mur as money } from '../../lib/format';
import { cn } from '../../lib/utils';
import { useIsMobile } from '../../hooks/useIsMobile';
import NewBookingDrawer from './NewBookingDrawer';
import { Btn, EmptyState, Spinner } from './ui';
import { onLive } from './liveEvents';
import { BookingDrawer } from './bookings/BookingDrawer';
import { BookingFilters, NO_FILTERS, isFiltered, type BookingFilterValues } from './bookings/BookingFilters';
import { BookingsTable } from './bookings/BookingsTable';
import { cardCls, tagCls } from './bookings/shared';

const PAGE_SIZE = 20;

/** The Bookings tab: filters, the paged list, and the drawer of the booking opened. */
export default function BookingsPanel({ onChanged, openRef: jumpRef, onOpened }: { onChanged: (force?: boolean) => void; openRef?: string | null; onOpened?: () => void }) {
  const isMobile = useIsMobile(900);
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [f, setF] = useState<BookingFilterValues>({ ...NO_FILTERS, sort: 'newest' });
  const { status, from, to, slot, payMode, rate, nationality, sort } = f;
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [openRef, setOpenRef] = useState<string | null>(null);
  // the gate tab asked for a booking: open it here
  useEffect(() => { if (jumpRef) { setOpenRef(jumpRef); onOpened?.(); } }, [jumpRef, onOpened]);

  // Debounce the search box so every keystroke is not a query.
  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 320);
    return () => clearTimeout(t);
  }, [q]);

  // Any filter change restarts at page 1.
  useEffect(() => { setPage(1); }, [dq, status, from, to, slot, payMode, rate, nationality, sort]);

  useEffect(() => {
    let dead = false;
    setLoading(true);
    const any = (v: string) => (v === 'all' ? undefined : v);
    listBookings({
      status: any(status),
      from: from || undefined,
      to: to || undefined,
      slot: any(slot),
      payMode: any(payMode),
      rate: any(rate),
      nationality: any(nationality),
      sort,
      q: dq || undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        if (dead) return;
        setRows(res.items || []);
        setTotal(res.total || 0);
        setErr('');
      })
      .catch(() => { if (!dead) setErr('Could not load bookings.'); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [status, from, to, slot, payMode, rate, nationality, sort, dq, page]);

  const onPatched = useCallback((row: BookingRow) => {
    setRows((prev) => prev.map((r) => (r.refCode === row.refCode ? { ...r, ...row } : r)));
    onChanged(true);   // an edit moves the arrivals and revenue figures straight away
  }, [onChanged]);

  /** A new booking at the top of the list (unless it is already there). */
  const prepend = (b: BookingRow) => {
    setRows((prev) => (prev.some((r) => r.id === b.id) ? prev : [b, ...prev]));
    setTotal((t) => t + 1);
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = isFiltered(f, dq);

  // A booking made on the website while this tab is open: straight into the list.
  const [fresh, setFresh] = useState<BookingRow | null>(null);
  useEffect(() => {
    return onLive('valle:booking-new', (b) => {
      if (!b?.refCode) return;
      setFresh(b);
      if (page === 1 && !filtered) prepend(b);
    });
  }, [page, filtered]);

  /** Money on screen, so the page total is readable without opening every row. */
  const pageValue = useMemo(
    () => rows.reduce((sum, r) => sum + (r.status === 'cancelled' ? 0 : r.total), 0),
    [rows],
  );

  return (
    <div>
      {fresh && (
        <div
          role="status"
          data-testid="fresh-booking"
          className={cn(cardCls, 'mb-3.5 flex flex-wrap items-center gap-3 border-valle-green bg-[#E2FFEB] px-4 py-3')}
        >
          <span className="font-bold">New booking just came in: {fresh.refCode} · {fresh.guestName} · {fresh.visitDate} {fresh.slot}</span>
          <button onClick={() => { setOpenRef(fresh.refCode); setFresh(null); }} className="cursor-pointer rounded-full border-0 bg-valle-purple px-3.5 py-2 [font-family:inherit] text-[13px] font-bold text-white">Open</button>
          <button onClick={() => setFresh(null)} aria-label="Dismiss" className="ml-auto cursor-pointer border-0 bg-transparent text-[16px] text-valle-purple">×</button>
        </div>
      )}
      <BookingFilters
        q={q}
        onQ={setQ}
        f={f}
        onChange={(patch) => setF((prev) => ({ ...prev, ...patch }))}
        filtered={filtered}
        onClear={() => { setQ(''); setF((prev) => ({ ...prev, ...NO_FILTERS })); }}
        onCreate={() => setCreating(true)}
        isMobile={isMobile}
      />
      {creating && (
        <NewBookingDrawer
          onClose={() => setCreating(false)}
          onCreated={(b) => {
            setCreating(false);
            prepend(b);
            onChanged(true);
            setOpenRef(b.refCode);
          }}
        />
      )}

      {/* ---- table ---- */}
      <div className={cn(cardCls, 'overflow-hidden')}>
        <BookingsTable rows={rows} onOpen={setOpenRef} />

        {loading && (
          <div className="flex justify-center px-0 py-[34px]">
            <Spinner color="#7333FF" size={9} />
          </div>
        )}

        {!loading && err && (
          <EmptyState title="Something went wrong" note={err} />
        )}

        {!loading && !err && rows.length === 0 && (
          filtered
            ? <EmptyState title="No matches" note="No bookings fit these filters. Try a wider date range or clear the search." />
            : <EmptyState title="No bookings yet" note="New reservations from the website land here the moment they are confirmed." />
        )}

        {!loading && !err && rows.length > 0 && (
          <div className="flex flex-wrap items-baseline gap-2.5 border-t-[1.5px] border-solid border-valle-lilac bg-[#F7F3FF] px-3.5 py-2.5">
            <span className={tagCls}>
              VALUE ON THIS PAGE
            </span>
            <span className="flex-1" />
            <span className="font-display text-[20px] font-black uppercase italic tracking-[-0.01em]">{money(pageValue)}</span>
          </div>
        )}
      </div>

      {/* ---- pagination ---- */}
      {total > 0 && (
        <div className="mt-3.5 flex flex-wrap items-center gap-3">
          <span className="font-mono text-[10.5px] tracking-[.1em] text-valle-purple/60">
            PAGE {page} OF {pages} · {total} BOOKING{total === 1 ? '' : 'S'}
          </span>
          <span className="flex-1" />
          <Btn variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
            ← Previous
          </Btn>
          <Btn variant="ghost" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages || loading}>
            Next →
          </Btn>
        </div>
      )}

      {openRef && (
        <BookingDrawer refCode={openRef} onClose={() => setOpenRef(null)} onPatched={onPatched} />
      )}
    </div>
  );
}
