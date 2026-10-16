import { Fwd } from '@/components/ui/arrows';
import {
  useCallback, useEffect, useRef, useState, type FormEvent,
} from 'react';
import type { ChatMessage } from '../types';
import { VisitorChat, getVisitorKey, type ChatStatus } from '../lib/chatClient';
import { useIsMobile } from '../hooks/useIsMobile';
import { Stripes } from './Stripes';
import { color } from '../styles/theme';
import { AttachmentView, ComposerTools, MAX_BYTES, attachmentUrl, kindOf, linkify } from './chatParts';
import { useT, fwd } from '../i18n';
import { cn } from '@/lib/utils';

/**
 * Public floating chat launcher (visitors only, never rendered on /staff*).
 *
 * Placement note: the site's mobile action bar is fixed at bottom:12 and stands
 * about 66px tall, so on mobile the widget is lifted to bottom:92 to clear it.
 * The idle float on the launcher is deliberately shallow (5px, upward at its
 * peak) so that clearance is never eaten by the animation.
 *
 * Motion: every entrance here is decorative. Under `prefers-reduced-motion` the
 * spring, the float, the bubble rise and the typing bounce all collapse to a
 * plain fade or to nothing, and no element depends on an animation to be shown.
 */

const INTRO_KEY = 'valle_chat_intro';

/** Panel geometry, kept in one place because the launcher shares the offsets. */
const PANEL_W = 360;

type Row = ChatMessage & { pending?: boolean; failed?: boolean; localUrl?: string };

/* Class equivalents of the theme tokens (styles/theme.ts): tint #F7F3FF,
   pinkDark #D91E44, motion.fast/base/spring easings, shadow.pink/panel. */
const displayText = 'font-display italic font-black tracking-[-0.01em] leading-[0.9] uppercase';
const fadeIn = 'animate-[vfade_.2s_ease_both]';
const riseIn = 'animate-[vrise_.34s_cubic-bezier(.2,.7,.2,1)_both]';
const fieldLabel = 'font-mono text-[9.5px] font-bold tracking-[.14em] text-valle-violet';
const inputCls = 'w-full border-[1.5px] border-solid border-valle-lilac bg-[#F7F3FF] rounded-[12px] py-[11px] px-[13px] [font-family:inherit] text-[14px] outline-none text-valle-purple [transition:border-color_.18s_cubic-bezier(.2,.7,.2,1),box-shadow_.18s_cubic-bezier(.2,.7,.2,1)]';

/** Once the launcher has appeared it stays for the rest of the visit. */
let launcherRevealed = false;
const LAUNCHER_DELAY_MS = 20000;

/**
 * Fewer pop-ups on arrival: the launcher waits until the guest has been on the
 * site for 20 s or has scrolled past the first screen. Returning chat users
 * (intro done) and guests with an unread reply see it at once.
 */
function useLauncherReveal(force: boolean): boolean {
  const [shown, setShown] = useState(() => launcherRevealed || force);
  useEffect(() => {
    if (shown) { launcherRevealed = true; return; }
    if (force) { setShown(true); return; }
    const reveal = () => setShown(true);
    const timer = window.setTimeout(reveal, LAUNCHER_DELAY_MS);
    const onScroll = () => { if (window.scrollY > window.innerHeight) reveal(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.clearTimeout(timer); window.removeEventListener('scroll', onScroll); };
  }, [shown, force]);
  return shown;
}

function introDone(): boolean {
  try { return localStorage.getItem(INTRO_KEY) === '1'; } catch { return false; }
}
function markIntroDone(): void {
  try { localStorage.setItem(INTRO_KEY, '1'); } catch { /* private mode */ }
}

/** Replace the matching optimistic bubble rather than showing it twice. */
function reconcile(prev: Row[], m: ChatMessage): Row[] {
  if (prev.some((x) => x.id === m.id)) return prev;
  if (m.sender === 'visitor') {
    const i = prev.findIndex((x) => x.pending && x.body === m.body);
    if (i >= 0) {
      const next = prev.slice();
      next[i] = m;
      return next;
    }
  }
  return [...prev, m];
}

/** Live `prefers-reduced-motion` reading; drives every animation in this file. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

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
function Lockup() {
  const t = useT();
  return (
    <div className="flex flex-col leading-none select-none [transform:rotate(-4deg)] shrink-0 origin-left">
      <span className={cn(displayText, 'text-[25px] text-white')}>VALLÉ</span>
      <span className="font-mono text-[8.5px] font-bold tracking-[.24em] text-valle-green mt-[3px]">
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
function Launcher({ onClick, unread, bottom, right, reduced }: {
  onClick: () => void; unread: number; bottom: number; right: number; reduced: boolean;
}) {
  const t = useT();
  return (
    <button
      onClick={onClick}
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
          'absolute inset-0 rounded-[999px] bg-valle-red group-hover:bg-[#D91E44] flex items-center justify-center',
          'shadow-[0_18px_40px_-10px_rgba(217,30,68,.6)] group-hover:shadow-[0_22px_46px_-10px_rgba(217,30,68,.72)]',
          '[transition:background_.18s_cubic-bezier(.2,.7,.2,1),box-shadow_.18s_cubic-bezier(.2,.7,.2,1)]',
          !reduced && 'animate-[vfloat_4.2s_ease-in-out_infinite]',
        )}
      >
        {/* Soft ring that widens on hover, so the pink reads as a live control. */}
        <span
          aria-hidden="true"
          className={cn(
            'absolute -inset-[4px] rounded-[999px] pointer-events-none border-[1.5px] border-solid border-[rgba(255,51,88,.45)]',
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
function TypingDots({ reduced }: { reduced: boolean }) {
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
function Bubble({ m, reduced, visitorKey }: { m: Row; reduced: boolean; visitorKey: string }) {
  const mine = m.sender === 'visitor';
  const t = useT();
  const enter = reduced ? fadeIn : 'animate-[vrise_.32s_cubic-bezier(.2,.7,.2,1)_both]';

  if (m.sender === 'system') {
    return (
      <div className={cn('font-mono text-[9.5px] tracking-[.1em] uppercase text-[rgba(52,0,87,.45)] text-center my-[10px] mx-0', enter)}>
        {m.body}
      </div>
    );
  }

  return (
    <div className={cn('flex mb-[9px]', mine ? 'justify-end' : 'justify-start', enter)}>
      <div className={cn('max-w-[82%] min-w-0', m.pending ? 'opacity-70' : 'opacity-100')}>
        {!mine && m.staffName && (
          <div className="font-mono text-[9px] font-bold tracking-[.14em] text-valle-violet mb-[4px] pl-[2px]">
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
          <div className="font-mono text-[9px] tracking-[.08em] text-[#D91E44] mt-[4px] text-right">
            {t('NOT SENT · CHECK YOUR CONNECTION')}
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatWidget() {
  const isMobile = useIsMobile();
  const reduced = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [intro, setIntro] = useState(() => !introDone());
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [msgs, setMsgs] = useState<Row[]>([]);
  const [status, setStatus] = useState<ChatStatus>('connecting');
  const [draft, setDraft] = useState('');
  const [unread, setUnread] = useState(0);
  const [staffTyping, setStaffTyping] = useState(false);
  const [fileErr, setFileErr] = useState('');
  const t = useT();
  const launcherShown = useLauncherReveal(!intro || unread > 0);

  const chatRef = useRef<VisitorChat | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);

  // ---- socket lifecycle -----------------------------------------------------
  useEffect(() => {
    const chat = new VisitorChat();
    chatRef.current = chat;

    const offs: Array<() => void> = [
      chat.on('status', (s) => setStatus(s)),
      chat.on('ready', ({ messages }) => setMsgs(messages)),
      chat.on('message', (m) => {
        setMsgs((prev) => reconcile(prev, m));
        if (m.sender !== 'visitor' && !openRef.current) setUnread((n) => n + 1);
      }),
      chat.on('typing', () => {
        setStaffTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setStaffTyping(false), 2600);
      }),
    ];

    // Returning visitors reconnect straight away so the unread dot is accurate;
    // first-timers only open a conversation once they finish the intro step.
    if (introDone()) chat.start(getVisitorKey());

    return () => {
      for (const off of offs) off();
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
      chat.disconnect();
      chatRef.current = null;
    };
  }, []);

  // ---- auto-scroll to newest ------------------------------------------------
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !open || intro) return;
    el.scrollTop = el.scrollHeight;
  }, [msgs, open, intro, staffTyping]);

  const openPanel = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setClosing(false);
    setOpen(true);
    setUnread(0);
  }, []);

  /**
   * Play the exit spring before unmounting. With reduced motion the panel is
   * dropped immediately: there is nothing worth waiting for.
   */
  const closePanel = useCallback(() => {
    if (reduced) { setOpen(false); return; }
    setClosing(true);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      setClosing(false);
      setOpen(false);
    }, 170);
  }, [reduced]);

  const beginChat = () => {
    markIntroDone();
    setIntro(false);
    chatRef.current?.start(getVisitorKey(), name.trim() || undefined, email.trim() || undefined);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    const chat = chatRef.current;
    if (!text || !chat) return;

    const temp: Row = {
      id: 'tmp-' + Math.random().toString(36).slice(2),
      conversationId: chat.id || '',
      sender: 'visitor',
      body: text,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMsgs((prev) => [...prev, temp]);
    setDraft('');

    chat.send(text).catch(() => {
      setMsgs((prev) => prev.map((m) => (m.id === temp.id ? { ...m, pending: false, failed: true } : m)));
    });
  };

  const onDraft = (v: string) => {
    setDraft(v);
    const now = Date.now();
    if (v && now - lastTypingSent.current > 1500) {
      lastTypingSent.current = now;
      chatRef.current?.typing();
    }
  };

  /** A photo, GIF, voice note or document: optimistic bubble first, then the upload. */
  const sendFile = (file: File) => {
    const chat = chatRef.current;
    if (!chat) return;
    if (file.size > MAX_BYTES) { setFileErr(t('That file is over 8 MB. Try a smaller one.')); return; }
    setFileErr('');
    const caption = draft.trim();
    const localUrl = URL.createObjectURL(file);
    const temp: Row = {
      id: 'tmp-' + Math.random().toString(36).slice(2),
      conversationId: chat.id || '',
      sender: 'visitor',
      body: caption,
      createdAt: new Date().toISOString(),
      pending: true,
      localUrl,
      attachments: [{ id: 'tmp', kind: kindOf(file), name: file.name, mime: file.type, size: file.size }],
    };
    setMsgs((prev) => [...prev, temp]);
    setDraft('');
    chat.sendFile(file, caption)
      .then((m) => setMsgs((prev) => prev.map((x) => (x.id === temp.id ? { ...m, localUrl } : x))))
      .catch((e: Error) => {
        setFileErr(e.message || t('Could not send the file.'));
        setMsgs((prev) => prev.map((x) => (x.id === temp.id ? { ...x, pending: false, failed: true } : x)));
      });
  };

  const bottom = isMobile ? 92 : 24;
  const right = isMobile ? 12 : 24;
  const connected = status === 'connected';
  // "Reconnecting" is only honest once a connection has existed. On the intro
  // step a first-time visitor has not opened a socket yet, so the first state
  // reads as connecting rather than implying something dropped.
  const statusLabel = connected
    ? t('WE USUALLY REPLY IN MINUTES')
    : status === 'connecting'
      ? t('CONNECTING…')
      : t('RECONNECTING…');

  if (!open) {
    if (!launcherShown) return null;
    return <Launcher onClick={openPanel} unread={unread} bottom={bottom} right={right} reduced={reduced} />;
  }

  const panelAnim = reduced
    ? 'vfade .2s ease both'
    : (closing
      ? 'vpopout .17s cubic-bezier(.4,0,.9,.4) both'
      : 'vpop .42s cubic-bezier(.16,1.06,.3,1.12) both');

  return (
    <div
      role="dialog"
      aria-label={t('Chat with VALLÉ')}
      className={cn(
        'fixed z-[86] bg-[#F7F3FF] rounded-[20px] overflow-hidden flex flex-col shadow-[0_40px_90px_-20px_rgba(0,0,0,.6)] origin-bottom-right font-sans text-valle-purple',
        isMobile ? 'left-[12px] w-auto max-h-[calc(100vh-170px)] h-[calc(100vh-170px)]' : 'left-auto max-h-[min(540px,calc(100vh-120px))] h-[520px]',
      )}
      // position and the open/close spring depend on viewport and state
      style={{ bottom, right, width: isMobile ? 'auto' : PANEL_W, animation: panelAnim }}
    >
      {/* ------------------------------------------------------------ header -- */}
      <div className="relative bg-valle-purple text-white pt-[14px] px-[15px] pb-[13px] flex items-center gap-[12px] shrink-0 overflow-hidden">
        {/* Soft violet wash behind the lockup, purely decorative. */}
        <span
          aria-hidden="true"
          className="absolute -top-[46px] -right-[30px] w-[150px] h-[150px] rounded-[50%] bg-[radial-gradient(circle,rgba(115,51,255,.55)_0%,rgba(115,51,255,0)_70%)] pointer-events-none"
        />
        <div className="min-w-0 flex-1 relative">
          <Lockup />
          <div className="flex items-center gap-[7px] mt-[9px]">
            <span
              className={cn(
                'block w-[7px] h-[7px] rounded-[999px] shrink-0',
                connected ? 'bg-valle-green' : 'bg-[#FFB020]',
                connected && !reduced && 'animate-[vhalo_2.2s_ease-out_infinite]',
              )}
            />
            <span className="font-mono text-[9.5px] tracking-[.12em] text-[rgba(255,255,255,.72)]">
              {statusLabel}
            </span>
          </div>
        </div>
        <button
          onClick={closePanel}
          aria-label={t('Close chat')}
          className="press relative border-[1.5px] border-solid border-[rgba(255,255,255,.32)] bg-[rgba(255,255,255,.06)] text-white w-[31px] h-[31px] rounded-[999px] cursor-pointer text-[16px] leading-none shrink-0 flex items-center justify-center [transition:background_.18s_cubic-bezier(.2,.7,.2,1)]"
        >
          ×
        </button>
      </div>
      <Stripes height={5} style={{ flexShrink: 0 }} />

      {intro ? (
        /* ------------------------------------------------ first-run identity -- */
        <div className={cn('no-scrollbar flex-1 overflow-y-auto p-[18px] bg-white', reduced ? fadeIn : riseIn)}>
          <div className={cn(displayText, 'text-[30px] leading-none')}>{t('Hi there')}</div>
          <p className="text-[13.5px] leading-[1.55] text-[rgba(52,0,87,.68)] mt-[10px] mx-0 mb-[18px]">
            {t('Ask us anything about activities, packages or planning your day. Leave your details if you would like us to follow up; both are optional.')}
          </p>

          <label htmlFor="vw-name" className={fieldLabel}>
            {t('NAME')}
          </label>
          <div className="mt-[5px] mb-[12px]">
            <input id="vw-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Your name')} className={inputCls} />
          </div>

          <label htmlFor="vw-email" className={fieldLabel}>
            {t('EMAIL')}
          </label>
          <div className="mt-[5px] mb-[18px]">
            <input id="vw-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} />
          </div>

          <div className="flex gap-[9px]">
            <button
              onClick={() => { setName(''); setEmail(''); beginChat(); }}
              className="press flex-1 border-[1.5px] border-solid border-valle-lilac bg-transparent text-valle-purple cursor-pointer [font-family:inherit] text-[14px] font-bold py-[11px] px-0 rounded-[999px] [transition:background_.18s_cubic-bezier(.2,.7,.2,1)]"
            >
              {t('Skip')}
            </button>
            <button
              onClick={beginChat}
              className="press flex-[1.4] border-0 bg-valle-red text-white cursor-pointer [font-family:inherit] text-[14px] font-bold py-[11px] px-0 rounded-[999px] shadow-[0_10px_28px_-6px_rgba(255,51,88,.5)]"
            >
              {t('Start chat')} <Fwd />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* -------------------------------------------------------- messages -- */}
          <div
            ref={scrollRef}
            className="no-scrollbar flex-1 overflow-y-auto p-[14px] min-h-0 bg-white"
          >
            {msgs.length === 0 && (
              <div className={cn('font-mono text-[10px] tracking-[.12em] text-[rgba(52,0,87,.45)] text-center pt-[18px]', reduced ? fadeIn : riseIn)}>
                {t('SAY HELLO · WE ARE LISTENING')}
              </div>
            )}
            {msgs.map((m) => <Bubble key={m.id} m={m} reduced={reduced} visitorKey={chatRef.current?.visitorKey || getVisitorKey()} />)}

            {staffTyping && (
              <div
                className={cn(
                  'inline-flex items-center gap-[9px] bg-[#F7F3FF] border-[1.5px] border-solid border-valle-lilac rounded-[15px] rounded-bl-[6px] py-[9px] px-[13px]',
                  reduced ? fadeIn : 'animate-[vrise_.28s_cubic-bezier(.2,.7,.2,1)_both]',
                )}
              >
                <TypingDots reduced={reduced} />
                <span className="font-mono text-[9px] tracking-[.12em] text-[rgba(52,0,87,.6)]">
                  {t('VALLÉ IS TYPING')}
                </span>
              </div>
            )}
          </div>

          {!connected && (
            <div className="font-mono text-[9.5px] tracking-[.1em] text-[#8A6A00] bg-[rgba(255,176,32,.16)] py-[7px] px-[14px] shrink-0">
              {status === 'connecting' ? t('CONNECTING…') : t('RECONNECTING…')} {t('YOUR MESSAGES WILL STILL GO THROUGH')}
            </div>
          )}

          {/* -------------------------------------------------------- composer -- */}
          {fileErr && (
            <div role="alert" className="font-mono text-[9.5px] tracking-[.08em] text-[#D91E44] bg-[#FFE2E7] py-[7px] px-[14px] shrink-0">
              {fileErr.toUpperCase()}
            </div>
          )}
          <form
            onSubmit={submit}
            className="flex gap-[8px] p-[11px] border-t-[1.5px] border-solid border-valle-lilac bg-white shrink-0 relative items-center"
          >
            <ComposerTools onFile={sendFile} onEmoji={(e) => setDraft((d) => d + e)} />
            <input
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              maxLength={2000}
              placeholder={t('Type a message…')}
              aria-label={t('Message')}
              className={cn(inputCls, 'flex-1 min-w-0')}
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className={cn(
                'press border-0 bg-valle-red text-white rounded-[999px] [font-family:inherit] text-[13.5px] font-bold py-0 px-[18px] shrink-0',
                '[transition:opacity_.18s_cubic-bezier(.2,.7,.2,1),box-shadow_.18s_cubic-bezier(.2,.7,.2,1)]',
                draft.trim() ? 'cursor-pointer opacity-100 shadow-[0_10px_28px_-6px_rgba(255,51,88,.5)]' : 'cursor-default opacity-45 shadow-none',
              )}
            >
              {t('Send')}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
