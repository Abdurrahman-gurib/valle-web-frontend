import type { BookingAuditEntry } from '../../../lib/staffApi';
import { cn } from '../../../lib/utils';
import { shortDate } from '../ui';
import { auditValue } from './draft';
import { FIELD_LABEL, cardCls } from './shared';

/** Who changed what on a booking, one block per save. */
export function AuditTrail({ entries }: { entries: BookingAuditEntry[] }) {
  return (
    <div className={cn(cardCls, 'overflow-hidden')}>
      {entries.map((e, i) => {
        const changes = Object.entries(e.changes || {});
        return (
          <div key={e.at + '-' + i} className={cn('px-3.5 py-3', i !== 0 && 'border-t border-solid border-valle-lilac')}>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[.1em] text-valle-violet">
                {e.action || 'update'}
              </span>
              <span className="font-mono text-[9.5px] tracking-[.06em] text-valle-purple/50">
                {shortDate(e.at)}
              </span>
              <span className="flex-1" />
              <span className="text-[12px] break-all text-valle-purple/70">{e.staffEmail}</span>
            </div>
            {changes.length === 0 ? (
              <div className="mt-[5px] text-[12.5px] text-valle-purple/70">No field detail recorded.</div>
            ) : (
              <ul className="mt-[7px] mr-0 mb-0 ml-0 grid list-none gap-1 p-0">
                {changes.map(([k, c]) => (
                  <li key={k} className="text-[12.5px] leading-[1.5] text-valle-purple/80">
                    <span className="font-bold">{FIELD_LABEL[k] || k}</span>
                    {': '}
                    <span className="opacity-70">{auditValue(k, c?.from)}</span>
                    {' → '}
                    <span className="font-semibold">{auditValue(k, c?.to)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
