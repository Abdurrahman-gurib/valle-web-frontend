import type { BookingRow } from '../../../types';
import { mur as money } from '../../../lib/format';
import { partyText } from './partyLines';
import { cn } from '../../../lib/utils';
import { RatePill, StatusChip, clockTimeSec, shortDate } from '../ui';
import { payLabel, slotLabel } from './shared';

const COLS = ['Ref', 'Booked at', 'Date', 'Slot', 'Guest', 'Party', 'Rate', 'Pay', 'Total', 'Status'];
const th = 'whitespace-nowrap px-3 py-2.5 text-left font-mono text-[9.5px] font-bold uppercase tracking-[.13em] text-valle-violet';
const td = 'whitespace-nowrap border-t border-solid border-valle-lilac px-3 py-[11px] text-[13.5px]';

function TableRow({ row, onOpen }: { row: BookingRow; onOpen: (ref: string) => void }) {
  return (
    <tr
      onClick={() => onOpen(row.refCode)}
      className="cursor-pointer bg-white transition-[background] duration-[120ms] ease-[ease] hover:bg-[#F7F3FF]"
    >
      <td className={cn(td, 'font-mono text-[12.5px] font-bold')}>{row.refCode}</td>
      <td className={td} data-testid="booked-at">
        <div className="text-[12.5px]">{shortDate(row.createdAt)}</div>
        <div className="font-mono text-[11px] font-bold text-valle-violet">{clockTimeSec(row.createdAt)}</div>
      </td>
      <td className={td}>{shortDate(row.visitDate)}</td>
      <td className={td}>{slotLabel(row.slot)}</td>
      <td className={cn(td, 'font-semibold')}>{row.guestName}</td>
      <td className={td}>{partyText(row.adults, row.kids, row.infants ?? 0)}</td>
      <td className={td}><RatePill rate={row.rate} size="sm" /></td>
      <td className={td}>{payLabel(row.payMode)}</td>
      <td className={cn(td, 'font-display text-[17px] font-black uppercase italic tracking-[-0.01em]')}>{money(row.total)}</td>
      <td className={td}><StatusChip status={row.status} /></td>
    </tr>
  );
}

/** The bookings list; a row click opens its drawer. */
export function BookingsTable({ rows, onOpen }: { rows: BookingRow[]; onOpen: (ref: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse">
        <thead>
          <tr className="bg-[#F7F3FF]">
            {COLS.map((c) => <th key={c} className={th}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => <TableRow key={r.id} row={r} onOpen={onOpen} />)}
        </tbody>
      </table>
    </div>
  );
}
