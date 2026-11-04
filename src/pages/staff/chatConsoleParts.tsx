import type { ChatMessage, ConversationSummary } from '../../types';
import { cn } from '../../lib/utils';
import { color } from '../../styles/theme';
import { AttachmentView, attachmentUrl, linkify } from '../../components/chatParts';
import { clockTime, relTime } from './ui';

/* The chat console's leaf pieces: quick replies, thread reconciliation, the conversation row, bubbles and filter tabs. */
/** Answers the desk types many times a day; one click drops them into the reply box. */
export const QUICK_REPLIES: { label: string; text: string }[] = [
  { label: 'Opening hours', text: 'We are open every day from 09:00 to 17:30, last entry 15:30. Morning arrivals 09:00–12:00, afternoon arrivals 12:00–15:30.' },
  { label: 'How to book', text: 'You can book on vallepark.com/booking: pick your experiences, choose a date and arrival slot, and pay on arrival or online. Booking is free with no cancellation fee.' },
  { label: 'Prices', text: 'Park entry is Rs 550 (12+) and Rs 325 (6 to 11) at the visitor rate, under 6 free; residents pay less with an ID. Every experience is priced on its own page and the Explorer Pass takes 15% off any 3 adventures.' },
  { label: 'Directions', text: 'We are at B102, Mare Anguilles, Chamouny, in the south of Mauritius. Search "Vallé Advenature Park" on Google Maps or Waze. Free parking at the gate.' },
  { label: 'What to bring', text: 'Closed shoes, light clothes you can move in, sunscreen, a hat and water. Lockers are available at reception. Zipline and quad have age, height and weight limits listed on each page.' },
  { label: 'Rain', text: 'The park stays open in light rain and the trails are all the more beautiful for it. Ziplines and quads pause only during storms, and we reschedule at no cost.' },
  { label: 'Groups & team building', text: 'For groups of 10 or more and team-building days, send us the date, group size and what you have in mind on the Packages page, and we will come back with a quote within a day.' },
  { label: 'Contact', text: 'Call or WhatsApp us on +230 660 4477, or write to sales@vallepark.com.' },
];

/** A thread row: server messages plus the optimistic ones still in flight. */
export type Row = ChatMessage & { pending?: boolean; failed?: boolean; localUrl?: string };


export const byRecent = (a: ConversationSummary, b: ConversationSummary) =>
  new Date(b.lastMessageAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.createdAt).getTime();

/** Replace the matching optimistic bubble instead of showing the message twice. */
export function reconcile(prev: Row[], m: ChatMessage): Row[] {
  if (prev.some((x) => x.id === m.id)) return prev;
  if (m.sender === 'staff') {
    const i = prev.findIndex((x) => x.pending && x.body === m.body);
    if (i >= 0) {
      const next = prev.slice();
      next[i] = m;
      return next;
    }
  }
  return [...prev, m];
}

export function ConvRow({ conv, on, onClick }: { conv: ConversationSummary; on: boolean; onClick: () => void }) {
  const name = conv.visitorName || 'Visitor';
  return (
    <button
      onClick={onClick}
      className={cn(
        'block w-full text-left border-0 cursor-pointer font-[inherit] text-valle-purple py-[12px] px-[14px]',
        'border-b border-solid border-b-valle-lilac border-l-[3px] transition-[background] duration-[.12s] ease-[ease]',
        on ? 'bg-valle-lilac border-l-valle-violet' : 'bg-transparent hover:bg-[#F7F3FF] border-l-transparent',
      )}
    >
      <div className="flex items-baseline gap-[8px]">
        <span className="text-[14px] font-bold flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
          {name}
        </span>
        <span className="font-mono text-[9.5px] tracking-[.06em] text-[rgba(52,0,87,.5)] shrink-0">
          {relTime(conv.lastMessageAt || conv.createdAt)}
        </span>
      </div>
      {conv.visitorEmail && (
        <div className="font-mono text-[10px] text-[rgba(52,0,87,.5)] mt-[2px] overflow-hidden text-ellipsis whitespace-nowrap">
          {conv.visitorEmail}
        </div>
      )}
      <div className="flex items-center gap-[8px] mt-[5px]">
        <span className="flex-1 min-w-0 text-[12.5px] text-[rgba(52,0,87,.65)] overflow-hidden text-ellipsis whitespace-nowrap">
          {conv.lastMessage || conv.subject || 'No messages yet'}
        </span>
        {conv.unreadStaff > 0 && (
          <span className="font-mono text-[10px] font-bold bg-valle-red text-white rounded-[999px] py-[2px] px-[7px] shrink-0 min-w-[20px] text-center">
            {conv.unreadStaff}
          </span>
        )}
      </div>
    </button>
  );
}

/** One chat bubble. Bodies are rendered as text nodes, never as HTML. */
export function Bubble({ m, reduced }: { m: Row; reduced: boolean }) {
  const mine = m.sender === 'staff';
  const enter = reduced ? 'vfade .2s ease both' : 'vrise .3s cubic-bezier(.2,.7,.2,1) both';

  if (m.sender === 'system') {
    return (
      <div className="font-mono text-[10px] tracking-[.1em] uppercase text-[rgba(52,0,87,.45)] text-center my-[10px] mx-0" style={{ animation: enter }}>
        {m.body}
      </div>
    );
  }

  return (
    <div className={cn('flex mb-[9px]', mine ? 'justify-end' : 'justify-start')} style={{ animation: enter }}>
      <div className={cn('max-w-[min(74%,460px)] min-w-0', m.pending ? 'opacity-[0.65]' : 'opacity-100')}>
        <div
          className={cn(
            'rounded-[15px] py-[10px] px-[13px] text-[14px] leading-[1.45] whitespace-pre-wrap grid gap-[8px]',
            mine
              ? 'bg-valle-purple text-white rounded-br-[6px] shadow-[0_10px_22px_-14px_rgba(52,0,87,.85)]'
              : 'bg-white text-valle-purple border-[1.5px] border-solid border-valle-lilac rounded-bl-[6px]',
          )}
          style={{ wordBreak: 'break-word' }}
        >
          {m.attachments?.map((a) => (
            <AttachmentView key={a.id} a={a} mine={mine} url={m.localUrl || attachmentUrl(a, { staff: true })} />
          ))}
          {m.body && <div>{linkify(m.body, mine ? '#FFFC33' : color.violet)}</div>}
        </div>
        <div className={cn(
          'font-mono text-[9px] tracking-[.08em] mt-[3px]',
          m.failed ? 'text-[#D6173F]' : 'text-[rgba(52,0,87,.45)]', mine ? 'text-right' : 'text-left',
        )}>
          {m.failed ? 'NOT SENT · RECONNECTING' : (mine ? ((m.staffName ? m.staffName + ' · ' : '') + (m.pending ? 'SENDING…' : clockTime(m.createdAt))) : clockTime(m.createdAt))}
        </div>
      </div>
    </div>
  );
}

export function FilterTab({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 border-0 cursor-pointer font-mono text-[10px] font-bold tracking-[.12em] py-[8px] px-0 rounded-[999px]',
        'transition-[background,color] duration-[.18s] ease-[cubic-bezier(.2,.7,.2,1)]',
        on ? 'bg-valle-purple text-white' : 'bg-transparent hover:bg-valle-lilac text-[rgba(52,0,87,.7)]',
      )}
    >
      {children}
    </button>
  );
}
