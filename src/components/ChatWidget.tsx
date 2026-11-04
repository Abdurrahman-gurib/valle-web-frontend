import { Fwd } from '@/components/ui/arrows';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Stripes } from './Stripes';
import { ComposerTools } from './chatParts';
import { Bubble, Launcher, Lockup, TypingDots, displayText, fadeIn, fieldLabel, inputCls, riseIn } from './chat/parts';
import { introDone, usePrefersReducedMotion, useVisitorChat } from './chat/useVisitorChat';
import { useT } from '../i18n';
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

/** Panel geometry, kept in one place because the launcher shares the offsets. */
const PANEL_W = 360;

/** Pages whose forms fill a phone screen down to the bottom edge: no launcher there on phones. */
const FORM_PAGE = /^(\/(fr|de|it|ar|ru|es|hi))?\/(booking|waiver)(\/|$)/;
/** Form controls the launcher must never sit on while the guest is using them. */
const FIELD = 'input, textarea, select, canvas, [contenteditable="true"]';

/**
 * True while a form control outside the chat has focus (or, for a canvas, is
 * being drawn on): the phone keyboard or the guest's finger is there, so the
 * floating launcher steps aside.
 */
function useFieldActive(): boolean {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const isField = (t: EventTarget | null) => t instanceof Element && t.matches(FIELD) && !t.closest('[data-chat-panel]');
    const onIn = (e: FocusEvent) => setActive(isField(e.target));
    const onOut = (e: FocusEvent) => { if (!isField(e.relatedTarget)) setActive(false); };
    const onDown = (e: PointerEvent) => { if (e.target instanceof HTMLCanvasElement) setActive(true); };
    const onUp = (e: PointerEvent) => { if (e.target instanceof HTMLCanvasElement && !isField(document.activeElement)) setTimeout(() => setActive(false), 1200); };
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerup', onUp);
    };
  }, []);
  return active;
}

export function ChatWidget() {
  const isMobile = useIsMobile();
  const reduced = usePrefersReducedMotion();
  const { pathname } = useLocation();
  const fieldActive = useFieldActive();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [intro, setIntro] = useState(() => !introDone());
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const t = useT();
  const chat = useVisitorChat(open);
  const { msgs, status, draft, staffTyping, fileErr } = chat;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  // ---- auto-scroll to newest ------------------------------------------------
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !open || intro) return;
    el.scrollTop = el.scrollHeight;
  }, [msgs, open, intro, staffTyping]);

  const { clearUnread } = chat;
  const openPanel = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setClosing(false);
    setOpen(true);
    clearUnread();
  }, [clearUnread]);

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
    setIntro(false);
    chat.begin(name, email);
  };

  // Escape closes; focus goes to the message box (or the first field of the intro) and back to
  // the launcher on close. On a phone the panel covers the page, so it is modal there.
  const trap = useFocusTrap(open, {
    onEscape: closePanel,
    modal: isMobile,
    initialFocus: (): HTMLElement | null => document.querySelector<HTMLElement>('[data-chat-panel] [data-chat-input], [data-chat-panel] #vw-name'),
    fallbackFocus: () => document.querySelector<HTMLElement>('[data-chat-launcher]'),
  });

  // On phones the mobile action bar is fixed at bottom:12 (about 66px tall), so the launcher sits
  // above it; an open cookie notice publishes its height and the launcher rises above that too.
  const bottom = isMobile ? 92 : 24;
  const right = isMobile ? 12 : 24;
  const launcherBottom = `max(${bottom}px, calc(var(--valle-cookie-h, 0px) + 8px))`;
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
    // never over a form: not on the booking and waiver pages on phones, and nowhere while a field is in use
    if ((isMobile && FORM_PAGE.test(pathname)) || fieldActive) return null;
    return <Launcher onClick={openPanel} unread={chat.unread} bottom={launcherBottom} right={right} reduced={reduced} />;
  }

  const panelAnim = reduced
    ? 'vfade .2s ease both'
    : (closing
      ? 'vpopout .17s cubic-bezier(.4,0,.9,.4) both'
      : 'vpop .42s cubic-bezier(.16,1.06,.3,1.12) both');

  return (
    <div
      ref={trap}
      data-chat-panel=""
      role="dialog"
      aria-modal={isMobile ? 'true' : undefined}
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
          className="press relative border-[1.5px] border-solid border-[rgba(255,255,255,.32)] bg-[rgba(255,255,255,.06)] text-white w-[40px] h-[40px] rounded-[999px] cursor-pointer text-[16px] leading-none shrink-0 flex items-center justify-center [transition:background_.18s_cubic-bezier(.2,.7,.2,1)]"
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
              type="button"
              className="vbtn vbtn-secondary vbtn-sm flex-1 px-0"
            >
              {t('Skip')}
            </button>
            <button
              onClick={beginChat}
              type="button"
              className="vbtn vbtn-primary vbtn-sm flex-[1.4] px-0"
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
            {msgs.map((m) => <Bubble key={m.id} m={m} reduced={reduced} visitorKey={chat.visitorKey()} />)}

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
            onSubmit={chat.submit}
            className="flex gap-[8px] p-[11px] border-t-[1.5px] border-solid border-valle-lilac bg-white shrink-0 relative items-center"
          >
            <ComposerTools onFile={chat.sendFile} onEmoji={(e) => chat.setDraft((d) => d + e)} />
            <input
              value={draft}
              onChange={(e) => chat.onDraft(e.target.value)}
              maxLength={2000}
              placeholder={t('Type a message…')}
              aria-label={t('Message')}
              data-chat-input=""
              className={cn(inputCls, 'flex-1 min-w-0')}
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="vbtn vbtn-primary vbtn-sm shrink-0 px-[18px]"
            >
              {t('Send')}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
