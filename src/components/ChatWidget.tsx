import {
  useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent,
} from 'react';
import type { ChatMessage } from '../types';
import { VisitorChat, getVisitorKey, type ChatStatus } from '../lib/chatClient';
import { useHover } from '../hooks/useHover';
import { useIsMobile } from '../hooks/useIsMobile';
import { Stripes } from './Stripes';
import { color, display, font, motion, radius, shadow } from '../styles/theme';

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

type Row = ChatMessage & { pending?: boolean; failed?: boolean };

const monoText: CSSProperties = { fontFamily: font.mono };
const displayText: CSSProperties = { ...display };

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
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', lineHeight: 1, userSelect: 'none',
      transform: 'rotate(-4deg)', flexShrink: 0, transformOrigin: 'left center',
    }}>
      <span style={{ ...displayText, fontSize: 25, color: color.white }}>VALLÉ</span>
      <span style={{
        ...monoText, fontSize: 8.5, fontWeight: 700, letterSpacing: '.24em',
        color: color.green, marginTop: 3,
      }}>
        LIVE CHAT
      </span>
    </div>
  );
}

/**
 * Pink circle with a shallow idle float.
 *
 * The float runs on an inner layer, never on the <button> itself, for two
 * reasons: an animation's transform outranks the inline hover transform, and a
 * button whose own box never stops moving is a moving click target (assistive
 * tech, automation and shaky hands all suffer). So the hit area is a fixed
 * 58x58 and only the painted circle bobs, by at most 5px.
 */
function Launcher({ onClick, unread, bottom, right, reduced }: {
  onClick: () => void; unread: number; bottom: number; right: number; reduced: boolean;
}) {
  const [h, bind] = useHover();
  return (
    <button
      {...bind}
      onClick={onClick}
      aria-label={unread > 0 ? 'Open chat, ' + unread + ' new message' + (unread === 1 ? '' : 's') : 'Open chat'}
      className="press"
      style={{
        position: 'fixed', bottom, right, zIndex: 85,
        width: 58, height: 58, padding: 0, border: 0, background: 'transparent',
        color: color.white, cursor: 'pointer',
        transform: h && !reduced ? 'scale(1.06)' : 'none',
        transition: 'transform ' + motion.spring,
      }}
    >
      <span
        style={{
          position: 'absolute', inset: 0, borderRadius: radius.pill,
          background: h ? color.pinkDark : color.pink,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: h
            ? '0 22px 46px -10px rgba(217,30,68,.72)'
            : '0 18px 40px -10px rgba(217,30,68,.6)',
          animation: reduced ? undefined : 'vfloat 4.2s ease-in-out infinite',
          transition: 'background ' + motion.fast + ', box-shadow ' + motion.fast,
        }}
      >
        {/* Soft ring that widens on hover, so the pink reads as a live control. */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', inset: -4, borderRadius: radius.pill, pointerEvents: 'none',
            border: '1.5px solid rgba(255,51,88,.45)',
            opacity: h && !reduced ? 1 : 0,
            transform: h && !reduced ? 'scale(1)' : 'scale(.86)',
            transition: 'opacity ' + motion.base + ', transform ' + motion.spring,
          }}
        />
        <ChatGlyph />
        {unread > 0 && (
          <span
            style={{
              position: 'absolute', top: -3, right: -3, minWidth: 21, height: 21, borderRadius: radius.pill,
              background: color.yellow, color: color.purple, border: '2px solid ' + color.white,
              ...monoText, fontSize: 10, fontWeight: 700, lineHeight: '17px', padding: '0 4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px -2px rgba(52,0,87,.45)',
              animation: reduced ? undefined : 'vpop .4s cubic-bezier(.16,1.06,.3,1.12) both',
            }}
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
    <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 4.5, height: 12 }} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6, height: 6, borderRadius: radius.pill, background: color.violet, display: 'block',
            opacity: reduced ? 0.55 : undefined,
            animation: reduced ? undefined : 'vdot 1.05s ease-in-out infinite',
            animationDelay: reduced ? undefined : i * 0.15 + 's',
          }}
        />
      ))}
    </span>
  );
}

/** Bodies render as text nodes: visitor and staff input is never treated as HTML. */
function Bubble({ m, reduced }: { m: Row; reduced: boolean }) {
  const mine = m.sender === 'visitor';
  const enter = reduced ? 'vfade .2s ease both' : 'vrise .32s cubic-bezier(.2,.7,.2,1) both';

  if (m.sender === 'system') {
    return (
      <div style={{
        ...monoText, fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase',
        color: 'rgba(52,0,87,.45)', textAlign: 'center', margin: '10px 0', animation: enter,
      }}>
        {m.body}
      </div>
    );
  }

  const skin: CSSProperties = mine
    ? {
      background: color.purple, color: color.white, borderBottomRightRadius: 6,
      boxShadow: '0 10px 22px -14px rgba(52,0,87,.85)',
    }
    : {
      background: color.tint, color: color.purple, border: '1.5px solid ' + color.border,
      borderBottomLeftRadius: 6,
    };

  return (
    <div style={{
      display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 9,
      animation: enter,
    }}>
      <div style={{ maxWidth: '82%', minWidth: 0, opacity: m.pending ? 0.7 : 1 }}>
        {!mine && m.staffName && (
          <div style={{
            ...monoText, fontSize: 9, fontWeight: 700, letterSpacing: '.14em',
            color: color.violet, marginBottom: 4, paddingLeft: 2,
          }}>
            {m.staffName.toUpperCase()}
          </div>
        )}
        <div style={{
          ...skin, borderRadius: 15, padding: '10px 13px', fontSize: 14, lineHeight: 1.45,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {m.body}
        </div>
        {m.failed && (
          <div style={{
            ...monoText, fontSize: 9, letterSpacing: '.08em', color: color.pinkDark,
            marginTop: 4, textAlign: 'right',
          }}>
            NOT SENT · CHECK YOUR CONNECTION
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

  const bottom = isMobile ? 92 : 24;
  const right = isMobile ? 12 : 24;
  const connected = status === 'connected';
  // "Reconnecting" is only honest once a connection has existed. On the intro
  // step a first-time visitor has not opened a socket yet, so the first state
  // reads as connecting rather than implying something dropped.
  const statusLabel = connected
    ? 'WE USUALLY REPLY IN MINUTES'
    : status === 'connecting'
      ? 'CONNECTING…'
      : 'RECONNECTING…';

  if (!open) {
    return <Launcher onClick={openPanel} unread={unread} bottom={bottom} right={right} reduced={reduced} />;
  }

  const inputStyle: CSSProperties = {
    width: '100%', border: '1.5px solid ' + color.border, background: color.tint,
    borderRadius: radius.md, padding: '11px 13px', fontFamily: 'inherit', fontSize: 14,
    outline: 'none', color: color.purple,
    transition: 'border-color ' + motion.fast + ', box-shadow ' + motion.fast,
  };

  const panelAnim = reduced
    ? 'vfade .2s ease both'
    : (closing
      ? 'vpopout .17s cubic-bezier(.4,0,.9,.4) both'
      : 'vpop .42s cubic-bezier(.16,1.06,.3,1.12) both');

  return (
    <div
      role="dialog"
      aria-label="Chat with VALLÉ"
      style={{
        position: 'fixed', zIndex: 86, bottom, right,
        left: isMobile ? 12 : 'auto', width: isMobile ? 'auto' : PANEL_W,
        maxHeight: isMobile ? 'calc(100vh - 170px)' : 'min(540px,calc(100vh - 120px))',
        height: isMobile ? 'calc(100vh - 170px)' : 520,
        background: color.tint, borderRadius: 20, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: shadow.panel,
        transformOrigin: 'bottom right',
        animation: panelAnim,
        fontFamily: font.body, color: color.purple,
      }}
    >
      {/* ------------------------------------------------------------ header -- */}
      <div style={{
        position: 'relative', background: color.purple, color: color.white,
        padding: '14px 15px 13px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        overflow: 'hidden',
      }}>
        {/* Soft violet wash behind the lockup, purely decorative. */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', top: -46, right: -30, width: 150, height: 150, borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(115,51,255,.55) 0%,rgba(115,51,255,0) 70%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ minWidth: 0, flex: 1, position: 'relative' }}>
          <Lockup />
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 9 }}>
            <span
              style={{
                width: 7, height: 7, borderRadius: radius.pill, flexShrink: 0, display: 'block',
                background: connected ? color.green : '#FFB020',
                animation: connected && !reduced ? 'vhalo 2.2s ease-out infinite' : undefined,
              }}
            />
            <span style={{ ...monoText, fontSize: 9.5, letterSpacing: '.12em', color: 'rgba(255,255,255,.72)' }}>
              {statusLabel}
            </span>
          </div>
        </div>
        <button
          onClick={closePanel}
          aria-label="Close chat"
          className="press"
          style={{
            position: 'relative',
            border: '1.5px solid rgba(255,255,255,.32)', background: 'rgba(255,255,255,.06)', color: color.white,
            width: 31, height: 31, borderRadius: radius.pill, cursor: 'pointer', fontSize: 16, lineHeight: 1,
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background ' + motion.fast,
          }}
        >
          ×
        </button>
      </div>
      <Stripes height={5} style={{ flexShrink: 0 }} />

      {intro ? (
        /* ------------------------------------------------ first-run identity -- */
        <div
          className="no-scrollbar"
          style={{
            flex: 1, overflowY: 'auto', padding: 18, background: color.white,
            animation: reduced ? 'vfade .2s ease both' : 'vrise .34s cubic-bezier(.2,.7,.2,1) both',
          }}
        >
          <div style={{ ...displayText, fontSize: 30, lineHeight: 1 }}>Hi there</div>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'rgba(52,0,87,.68)', margin: '10px 0 18px' }}>
            Ask us anything about activities, packages or planning your day. Leave your details
            if you would like us to follow up; both are optional.
          </p>

          <label htmlFor="vw-name" style={{ ...monoText, fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', color: color.violet }}>
            NAME
          </label>
          <div style={{ marginTop: 5, marginBottom: 12 }}>
            <input id="vw-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={inputStyle} />
          </div>

          <label htmlFor="vw-email" style={{ ...monoText, fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', color: color.violet }}>
            EMAIL
          </label>
          <div style={{ marginTop: 5, marginBottom: 18 }}>
            <input id="vw-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: 9 }}>
            <button
              onClick={() => { setName(''); setEmail(''); beginChat(); }}
              className="press"
              style={{
                flex: 1, border: '1.5px solid ' + color.border, background: 'transparent', color: color.purple,
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                padding: '11px 0', borderRadius: radius.pill,
                transition: 'background ' + motion.fast,
              }}
            >
              Skip
            </button>
            <button
              onClick={beginChat}
              className="press"
              style={{
                flex: 1.4, border: 0, background: color.pink, color: color.white, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 14, fontWeight: 700, padding: '11px 0',
                borderRadius: radius.pill, boxShadow: shadow.pink,
              }}
            >
              Start chat →
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* -------------------------------------------------------- messages -- */}
          <div
            ref={scrollRef}
            className="no-scrollbar"
            style={{ flex: 1, overflowY: 'auto', padding: 14, minHeight: 0, background: color.white }}
          >
            {msgs.length === 0 && (
              <div style={{
                ...monoText, fontSize: 10, letterSpacing: '.12em', color: 'rgba(52,0,87,.45)',
                textAlign: 'center', paddingTop: 18,
                animation: reduced ? 'vfade .2s ease both' : 'vrise .34s cubic-bezier(.2,.7,.2,1) both',
              }}>
                SAY HELLO · WE ARE LISTENING
              </div>
            )}
            {msgs.map((m) => <Bubble key={m.id} m={m} reduced={reduced} />)}

            {staffTyping && (
              <div
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 9,
                  background: color.tint, border: '1.5px solid ' + color.border,
                  borderRadius: 15, borderBottomLeftRadius: 6, padding: '9px 13px',
                  animation: reduced ? 'vfade .2s ease both' : 'vrise .28s cubic-bezier(.2,.7,.2,1) both',
                }}
              >
                <TypingDots reduced={reduced} />
                <span style={{ ...monoText, fontSize: 9, letterSpacing: '.12em', color: 'rgba(52,0,87,.6)' }}>
                  VALLÉ IS TYPING
                </span>
              </div>
            )}
          </div>

          {!connected && (
            <div style={{
              ...monoText, fontSize: 9.5, letterSpacing: '.1em', color: '#8A6A00',
              background: 'rgba(255,176,32,.16)', padding: '7px 14px', flexShrink: 0,
            }}>
              {status === 'connecting' ? 'CONNECTING…' : 'RECONNECTING…'} YOUR MESSAGES WILL STILL GO THROUGH
            </div>
          )}

          {/* -------------------------------------------------------- composer -- */}
          <form
            onSubmit={submit}
            style={{
              display: 'flex', gap: 8, padding: 11, borderTop: '1.5px solid ' + color.border,
              background: color.white, flexShrink: 0,
            }}
          >
            <input
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              maxLength={2000}
              placeholder="Type a message…"
              aria-label="Message"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="press"
              style={{
                border: 0, background: color.pink, color: color.white, borderRadius: radius.pill,
                cursor: draft.trim() ? 'pointer' : 'default', opacity: draft.trim() ? 1 : 0.45,
                fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, padding: '0 18px', flexShrink: 0,
                boxShadow: draft.trim() ? shadow.pink : 'none',
                transition: 'opacity ' + motion.fast + ', box-shadow ' + motion.fast,
              }}
            >
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
}
