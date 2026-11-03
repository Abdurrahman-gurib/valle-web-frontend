import { receiptPdfUrl, type BookingDetailFull } from '../../../lib/staffApi';
import { mur as money, partyLabel } from '../../../lib/format';
import { cn } from '../../../lib/utils';
import { RatePill, SectionLabel, TotalTag, shortDate } from '../ui';
import { adjustmentLabel } from './draft';
import { cardCls, payLabel, rateLabel, slotLabel, tagCls } from './shared';

function DetailLine({ tag, value }: { tag: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className={tagCls}>{tag}</div>
      <div className="mt-[3px] text-[14px] [word-break:break-word]">{value || 'N/A'}</div>
    </div>
  );
}

/** Reading mode: who, when and how they pay. */
export function BookingFacts({ data }: { data: BookingDetailFull }) {
  return (
    <div className={cn(cardCls, 'grid grid-cols-[1fr_1fr] gap-3.5 bg-[#F7F3FF] p-4')}>
      <DetailLine tag="GUEST" value={data.guestName} />
      <DetailLine tag="PARTY" value={partyLabel(data.adults, data.kids)} />
      <DetailLine tag="EMAIL" value={data.email || ''} />
      <DetailLine tag="PHONE" value={data.phone || ''} />
      <DetailLine tag="NATIONALITY" value={data.nationality || ''} />
      <DetailLine tag="RATE" value={rateLabel(data.rate)} />
      <DetailLine tag="VISIT" value={shortDate(data.visitDate)} />
      <DetailLine tag="SLOT" value={slotLabel(data.slot)} />
      <DetailLine tag="PAYMENT" value={payLabel(data.payMode)} />
      <DetailLine tag="CURRENCY" value={data.currency} />
    </div>
  );
}

/** "2 ADULTS · 1 CHILD" for one line item. */
const lineParty = (l: { adults?: number; kids?: number; units?: number }) => [
  l.adults ? l.adults + ' ADULT' + (l.adults > 1 ? 'S' : '') : '',
  l.kids ? l.kids + ' CHILD' + (l.kids > 1 ? 'REN' : '') : '',
  l.units ? l.units + ' UNIT' + (l.units > 1 ? 'S' : '') : '',
].filter(Boolean).join(' · ') || 'N/A';

/** Line items, the totals the server computed, what is paid and what is left to collect. */
export function BookingMoney({ data }: { data: BookingDetailFull }) {
  // Defensive: an API that has not shipped the richer payload could omit these.
  const lines = data.lines ?? [];
  const balance = data.balance ?? data.total;
  const participants = data.participants ?? [];
  return (
    <>
      <SectionLabel>LINE ITEMS</SectionLabel>
      <div className={cn(cardCls, 'overflow-hidden')}>
        {lines.length === 0 && (
          <div className="p-3.5 text-[13.5px] text-valle-purple/60">Park entry only.</div>
        )}
        {lines.map((l, i) => (
          <div
            key={l.label + i}
            className={cn('flex items-baseline gap-3 px-3.5 py-[11px]', i !== 0 && 'border-t border-solid border-valle-lilac')}
          >
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold">{l.label}</div>
              <div className="mt-0.5 font-mono text-[10px] tracking-[.08em] text-valle-purple/70">{lineParty(l)}</div>
            </div>
            <div className="text-[14px] font-bold whitespace-nowrap">{money(l.amount)}</div>
          </div>
        ))}
      </div>

      <div className={cn(cardCls, 'mt-3.5 bg-[#F7F3FF] p-4')}>
        {[
          ['Park entry', money(data.entryAmount)],
          ['Subtotal', money(data.subtotal)],
          ...(data.discount > 0 ? [['Explorer Pass discount', '− ' + money(data.discount)]] : []),
          ...((data.adjustmentAmount ?? 0) > 0 ? [[adjustmentLabel(data), '− ' + money(data.adjustmentAmount ?? 0)]] : []),
        ].map(([k, v]) => (
          <div key={k} className="mb-[7px] flex justify-between gap-3 text-[13.5px]">
            <span className="text-valle-purple/70">{k}</span>
            <span className="font-semibold">{v}</span>
          </div>
        ))}
        <div className="mt-1 flex items-baseline justify-between gap-3 border-t-[1.5px] border-solid border-valle-lilac pt-2.5">
          <span className="inline-flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold tracking-[.14em] text-valle-violet">TOTAL</span>
            <RatePill rate={data.rate} size="sm" />
          </span>
          <TotalTag amount={money(data.total)} size={28} />
        </div>
        <div data-testid="money-paid" className="mt-2.5 flex justify-between gap-3 pt-2.5 text-[13.5px]" style={{ borderTop: '1px dashed #D9CCF2' }}>
          <span className="text-valle-purple/70">Paid{data.paymentMethod ? ' · ' + data.paymentMethod : ''}{data.receiptNo ? ' · receipt ' + data.receiptNo : ''}</span>
          <span className="font-semibold">{money(data.paidAmount ?? 0)}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-3 text-[14px]">
          <span className="font-extrabold" style={{ color: balance > 0 ? '#D91E44' : '#1E9E4A' }}>{balance > 0 ? 'Balance to collect' : 'Fully paid'}</span>
          <span className="inline-flex items-center gap-2.5">
            <span className="font-mono font-extrabold">{money(balance)}</span>
            <a href={receiptPdfUrl(data.refCode)} target="_blank" rel="noopener noreferrer" className="rounded-full border-[1.5px] border-solid border-valle-purple px-2.5 py-[5px] text-[11.5px] font-bold" style={{ color: '#340057', textDecoration: 'none' }}>Receipt PDF</a>
          </span>
        </div>
        {data.groupKind && (
          <div data-testid="group-block" className="mt-2.5 rounded-[10px] border-[1.5px] border-solid border-[#D9C9F0] bg-[#F0E8FF] px-3 py-2 text-[13px]">
            <strong>Group · {data.groupKind}</strong> · {data.organisation} · leader {data.leaderName} · {data.adults + data.kids} people · {participants.length} names listed{(data.depositAmount ?? 0) > 0 ? ` · deposit ${money(data.depositAmount ?? 0)}${(data.paidAmount ?? 0) >= (data.depositAmount ?? 0) ? ' received' : ' due'}` : ''}
            {participants.length > 0 && <details className="mt-1"><summary className="cursor-pointer">Participant list</summary><div className="mt-1 font-mono text-[12px] whitespace-pre-wrap">{participants.map((p) => p.name + (p.age != null ? ` (${p.age})` : '')).join('\n')}</div></details>}
          </div>
        )}
        {data.status === 'postponed' && (
          <div className="mt-2.5 rounded-[10px] border-[1.5px] border-solid border-[#FFD24D] bg-[#FFF4D6] px-3 py-2 text-[13px]">
            Postponed{data.postponedFrom ? ' from ' + shortDate(data.postponedFrom) : ''}. No refund; the payment stays on this booking. Use <strong>Edit</strong> to set the new date and status Confirmed.
          </div>
        )}
      </div>
    </>
  );
}
