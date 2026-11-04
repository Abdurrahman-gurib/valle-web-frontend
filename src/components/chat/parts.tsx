import { color } from '../../styles/theme';
import { AttachmentView, attachmentUrl, linkify } from '../chatParts';
import { useT } from '../../i18n';
import { cn } from '@/lib/utils';
import type { Row } from './useVisitorChat';

/** The visitor chat's building blocks: launcher, panel lockup, bubbles and the typing dots. */

/* Class equivalents of the theme tokens (styles/theme.ts): tint #F7F3FF,
   pinkDark #D6173F, motion.fast/base/spring easings, shadow.pink/panel. */
export const displayText = 'font-display italic font-black tracking-[-0.01em] leading-[0.9] uppercase';
export const fadeIn = 'animate-[vfade_.2s_ease_both]';
export const riseIn = 'animate-[vrise_.34s_cubic-bezier(.2,.7,.2,1)_both]';
export const fieldLabel = 'font-mono text-[10px] font-bold tracking-[.14em] text-valle-violet';
export const inputCls = 'w-full border-[1.5px] border-solid border-valle-lilac bg-[#F7F3FF] rounded-[12px] py-[11px] px-[13px] [font-family:inherit] text-[14px] outline-none text-valle-purple [transition:border-color_.18s_cubic-bezier(.2,.7,.2,1),box-shadow_.18s_cubic-bezier(.2,.7,.2,1)]';

function ChatGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9.2L5 19.4V16h-.5A1.5 1.5 0 0 1 4 14.5v-9Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** The tilted VALLÉ lockup from the site header, sized for the panel bar. */
export function Lockup() {
  const t = useT();
  return (
    <div className="flex flex-col leading-none select-none [transform:rotate(-4deg)] shrink-0 origin-left">
      <span className={cn(displayText, 'text-[25px] text-white')}>VALLÉ</span>
      <span className="font-mono text-[10px] font-bold tracking-[.24em] text-valle-green mt-[3px]">
        {t('LIVE CHAT')}
      </span>
    </div>
  );
}

/**
 * Pink circle with a shallow idle float.
 *
 * The float runs on an inner layer, never on the <button> itself, for two
 * reasons: an animation's transform outranks the hover transform, and a
 * button whose own box never stops moving is a moving click target (assistive
 * tech, automation and shaky hands all suffer). So the hit area is a fixed
 * 58x58 and only the painted circle bobs, by at most 5px.
 */
export function Launcher({ onClick, unread, bottom, right, reduced }: {
  onClick: () => void; unread: number; bottom: number | string; right: number; reduced: boolean;
}) {
  const t = useT();
  return (
    <button
      onClick={onClick}
      data-chat-launcher=""
      aria-label={unread > 0 ? (unread === 1 ? t('Open chat, {n} new message', { n: unread }) : t('Open chat, {n} new messages', { n: unread })) : t('Open chat')}
      className={cn(
        'press group fixed z-[85] w-[58px] h-[58px] p-0 border-0 bg-transparent text-white cursor-pointer',
        '[transition:transform_.42s_cubic-bezier(.16,1.06,.3,1.12)]',
        !reduced && 'hover:[transform:scale(1.06)]',
      )}
      style={{ bottom, right }}
    >
      <span
        className={cn(
          'absolute inset-0 rounded-[999px] bg-valle-purple group-hover:bg-[#4A0F75] flex items-center justify-center',
          'shadow-[0_10px_26px_-8px_rgba(23,0,40,.45)] group-hover:shadow-[0_14px_30px_-8px_rgba(23,0,40,.5)]',
          '[transition:background_.18s_cubic-bezier(.2,.7,.2,1),box-shadow_.18s_cubic-bezier(.2,.7,.2,1)]',
        )}
      >
        {/* Soft ring that widens on hover, so the launcher reads as a live control. */}
        <span
          aria-hidden="true"
          className={cn(
            'absolute -inset-[4px] rounded-[999px] pointer-events-none border-[1.5px] border-solid border-[rgba(115,51,255,.45)]',
            'opacity-0 [transform:scale(.86)] [transition:opacity_.28s_cubic-bezier(.2,.7,.2,1),transform_.42s_cubic-bezier(.16,1.06,.3,1.12)]',
            !reduced && 'group-hover:opacity-100 group-hover:[transform:scale(1)]',
          )}
        />
        <ChatGlyph />
        {unread > 0 && (
          <span
            className={cn(
              'absolute -top-[3px] -right-[3px] min-w-[21px] h-[21px] rounded-[999px] bg-valle-yellow text-valle-purple border-2 border-solid border-white',
              'font-mono text-[10px] font-bold leading-[17px] py-0 px-[4px] flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(52,0,87,.45)]',
              !reduced && 'animate-[vpop_.4s_cubic-bezier(.16,1.06,.3,1.12)_both]',
            )}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </span>
    </button>
  );
}

/** Three dots with a staggered bounce, shown while staff is typing. */
export function TypingDots({ reduced }: { reduced: boolean }) {
  return (
    <span className="inline-flex items-end gap-[4.5px] h-[12px]" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            'block w-[6px] h-[6px] rounded-[999px] bg-valle-violet',
            reduced ? 'opacity-[.55]' : 'animate-[vdot_1.05s_ease-in-out_infinite]',
          )}
          style={reduced ? undefined : { animationDelay: i * 0.15 + 's' }}
        />
      ))}
    </span>
  );
}

/** Bodies render as text nodes: visitor and staff input is never treated as HTML. */
export function Bubble({ m, reduced, visitorKey }: { m: Row; reduced: boolean; visitorKey: string }) {
  const mine = m.sender === 'visitor';
  const t = useT();
  const enter = reduced ? fadeIn : 'animate-[vrise_.32s_cubic-bezier(.2,.7,.2,1)_both]';

  if (m.sender === 'system') {
    return (
      <div className={cn('font-mono text-[10px] tracking-[.1em] uppercase text-[rgba(52,0,87,.45)] text-center my-[10px] mx-0', enter)}>
        {m.body}
      </div>
    );
  }

  return (
    <div className={cn('flex mb-[9px]', mine ? 'justify-end' : 'justify-start', enter)}>
      <div className={cn('max-w-[82%] min-w-0', m.pending ? 'opacity-70' : 'opacity-100')}>
        {!mine && m.staffName && (
          <div className="font-mono text-[10px] font-bold tracking-[.14em] text-valle-violet mb-[4px] pl-[2px]">
            {m.staffName.toUpperCase()}
          </div>
        )}
        <div className={cn(
          'rounded-[15px] py-[10px] px-[13px] text-[14px] leading-[1.45] whitespace-pre-wrap [word-break:break-word] grid gap-[8px]',
          mine
            ? 'bg-valle-purple text-white rounded-br-[6px] shadow-[0_10px_22px_-14px_rgba(52,0,87,.85)]'
            : 'bg-[#F7F3FF] text-valle-purple border-[1.5px] border-solid border-valle-lilac rounded-bl-[6px]',
        )}>
          {m.attachments?.map((a) => (
            <AttachmentView key={a.id} a={a} mine={mine} url={m.localUrl || attachmentUrl(a, { visitorKey })} />
          ))}
          {m.body && <div>{linkify(m.body, mine ? '#FFFC33' : color.violet)}</div>}
        </div>
        {m.failed && (
          <div className="font-mono text-[10px] tracking-[.08em] text-[#D6173F] mt-[4px] text-right">
            {t('NOT SENT · CHECK YOUR CONNECTION')}
          </div>
        )}
      </div>
    </div>
  );
}
