import {
  useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent,
} from 'react';
import type { ChatMessage, ConversationStatus, ConversationSummary } from '../../types';
import { StaffChat, type ChatStatus } from '../../lib/chatClient';
import { useStaffAuth } from '../../store/StaffAuth';
import { useHover } from '../../hooks/useHover';
import { useIsMobile } from '../../hooks/useIsMobile';
import { postStaffMessage } from '../../lib/staffApi';
import { Stripes } from '../../components/Stripes';
import { color, motion, radius } from '../../styles/theme';
import {
  Btn, EmptyState, Spinner, StatusDot, TypingDots, card, clockTime, display, inputStyle, mono,
  relTime, usePrefersReducedMotion,
} from './ui';

/** A thread row: server messages plus the optimistic ones still in flight. */
type Row = ChatMessage & { pending?: boolean; failed?: boolean };

type Filter = ConversationStatus;

const byRecent = (a: ConversationSummary, b: ConversationSummary) =>
  new Date(b.lastMessageAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.createdAt).getTime();

/** Replace the matching optimistic bubble instead of showing the message twice. */
function reconcile(prev: Row[], m: ChatMessage): Row[] {
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

function ConvRow({ conv, on, onClick }: { conv: ConversationSummary; on: boolean; onClick: () => void }) {
  const [h, bind] = useHover();
  const name = conv.visitorName || 'Visitor';
  return (
    <button
      {...bind}
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left', border: 0, cursor: 'pointer',
        fontFamily: 'inherit', color: '#340057', padding: '12px 14px',
        borderBottom: '1px solid #EBE2FF',
        background: on ? '#EBE2FF' : (h ? '#F7F3FF' : 'transparent'),
        borderLeft: on ? '3px solid #7333FF' : '3px solid transparent',
        transition: 'background .12s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </span>
        <span style={{ ...mono, fontSize: 9.5, letterSpacing: '.06em', color: 'rgba(52,0,87,.5)', flexShrink: 0 }}>
          {relTime(conv.lastMessageAt || conv.createdAt)}
        </span>
      </div>
      {conv.visitorEmail && (
        <div style={{ ...mono, fontSize: 10, color: 'rgba(52,0,87,.5)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {conv.visitorEmail}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
        <span style={{
          flex: 1, minWidth: 0, fontSize: 12.5, color: 'rgba(52,0,87,.65)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {conv.lastMessage || conv.subject || 'No messages yet'}
        </span>
        {conv.unreadStaff > 0 && (
          <span style={{
            ...mono, fontSize: 10, fontWeight: 700, background: '#FF3358', color: '#FFFFFF',
            borderRadius: 999, padding: '2px 7px', flexShrink: 0, minWidth: 20, textAlign: 'center',
          }}>
            {conv.unreadStaff}
          </span>
        )}
      </div>
    </button>
  );
}

/** One chat bubble. Bodies are rendered as text nodes, never as HTML. */
function Bubble({ m, reduced }: { m: Row; reduced: boolean }) {
  const mine = m.sender === 'staff';
  const enter = reduced ? 'vfade .2s ease both' : 'vrise .3s cubic-bezier(.2,.7,.2,1) both';

  if (m.sender === 'system') {
    return (
      <div style={{ ...mono, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(52,0,87,.45)', textAlign: 'center', margin: '10px 0', animation: enter }}>
        {m.body}
      </div>
    );
  }

  const skin: CSSProperties = mine
    ? {
      background: color.purple, color: color.white, borderBottomRightRadius: 6,
      boxShadow: '0 10px 22px -14px rgba(52,0,87,.85)',
    }
    : { background: color.white, color: color.purple, border: '1.5px solid ' + color.border, borderBottomLeftRadius: 6 };

  return (
    <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 9, animation: enter }}>
      <div style={{ maxWidth: 'min(74%,460px)', minWidth: 0, opacity: m.pending ? 0.65 : 1 }}>
        <div style={{ ...skin, borderRadius: 15, padding: '10px 13px', fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {m.body}
        </div>
        <div style={{
          ...mono, fontSize: 9, letterSpacing: '.08em', marginTop: 3,
          color: m.failed ? '#D91E44' : 'rgba(52,0,87,.45)', textAlign: mine ? 'right' : 'left',
        }}>
          {m.failed ? 'NOT SENT · RECONNECTING' : (mine ? ((m.staffName ? m.staffName + ' · ' : '') + (m.pending ? 'SENDING…' : clockTime(m.createdAt))) : clockTime(m.createdAt))}
        </div>
      </div>
    </div>
  );
}

function FilterTab({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  const [h, bind] = useHover();
  return (
    <button
      {...bind}
      onClick={onClick}
      style={{
        flex: 1, border: 0, cursor: 'pointer', fontFamily: 'inherit', ...mono, fontSize: 10,
        fontWeight: 700, letterSpacing: '.12em', padding: '8px 0', borderRadius: radius.pill,
        background: on ? color.purple : (h ? '#EBE2FF' : 'transparent'),
        color: on ? color.white : 'rgba(52,0,87,.7)',
        transition: 'background ' + motion.fast + ', color ' + motion.fast,
      }}
    >
      {children}
    </button>
  );
}

export default function ChatConsole({ active, onChanged }: {
  active: boolean;
  onChanged: (force?: boolean) => void;
}) {
  const auth = useStaffAuth();
  const stacked = useIsMobile(900);
  const reduced = usePrefersReducedMotion();

  const [convos, setConvos] = useState<ConversationSummary[]>([]);
  const [filter, setFilter] = useState<Filter>('open');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Row[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [status, setStatus] = useState<ChatStatus>('connecting');
  const [draft, setDraft] = useState('');
  const [peerTyping, setPeerTyping] = useState(false);

  const chatRef = useRef<StaffChat | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  // ---- socket lifecycle -----------------------------------------------------
  useEffect(() => {
    const chat = new StaffChat();
    chatRef.current = chat;

    const offs: Array<() => void> = [
      chat.on('status', (s) => setStatus(s)),

      chat.on('conversations', (list) => {
        setConvos(list.slice().sort(byRecent));
      }),

      chat.on('updated', (conv) => {
        setConvos((prev) => {
          const i = prev.findIndex((c) => c.id === conv.id);
          const next = i >= 0 ? prev.map((c) => (c.id === conv.id ? conv : c)) : [conv, ...prev];
          return next.sort(byRecent);
        });
        onChangedRef.current();
      }),

      chat.on('thread', ({ conversationId, messages }) => {
        if (activeIdRef.current !== conversationId) return;
        setMsgs(messages);
        setLoadingThread(false);
      }),

      chat.on('message', ({ conversationId, message }) => {
        const isOpen = activeIdRef.current === conversationId;
        if (isOpen) setMsgs((prev) => reconcile(prev, message));

        setConvos((prev) => {
          const i = prev.findIndex((c) => c.id === conversationId);
          // A brand-new visitor conversation we have never listed: ask for the list.
          if (i < 0) { void chatRef.current?.refresh(); return prev; }
          return prev.map((c) => (c.id === conversationId ? {
            ...c,
            lastMessage: message.body,
            lastMessageAt: message.createdAt,
            unreadStaff: isOpen || message.sender !== 'visitor' ? c.unreadStaff : c.unreadStaff + 1,
          } : c)).sort(byRecent);
        });
      }),

      chat.on('typing', ({ conversationId }) => {
        if (activeIdRef.current !== conversationId) return;
        setPeerTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setPeerTyping(false), 2600);
      }),
    ];

    chat.start();
    void chat.refresh();

    return () => {
      for (const off of offs) off();
      if (typingTimer.current) clearTimeout(typingTimer.current);
      chat.disconnect();
      chatRef.current = null;
    };
  }, []);

  // ---- auto-scroll to newest ------------------------------------------------
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !active) return;
    el.scrollTop = el.scrollHeight;
  }, [msgs, activeId, peerTyping, active]);

  const openConv = useCallback((id: string) => {
    activeIdRef.current = id;
    setActiveId(id);
    setMsgs([]);
    setLoadingThread(true);
    setPeerTyping(false);
    setDraft('');
    setConvos((prev) => prev.map((c) => (c.id === id ? { ...c, unreadStaff: 0 } : c)));
    chatRef.current?.open(id);
    onChangedRef.current();
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeId) return;

    const temp: Row = {
      id: 'tmp-' + Math.random().toString(36).slice(2),
      conversationId: activeId,
      sender: 'staff',
      staffName: auth.user?.name,
      body: text,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMsgs((prev) => [...prev, temp]);
    setDraft('');

    const sent = chatRef.current?.send(activeId, text) ?? false;
    if (!sent) {
      // Socket is down, so send over REST instead and a blip never blocks a reply.
      // The server still broadcasts it, so a connected visitor sees it at once.
      postStaffMessage(activeId, text)
        .then(({ message }) => {
          setMsgs((prev) =>
            prev.map((m) => (m.id === temp.id ? { ...message, pending: false } : m)),
          );
          onChangedRef.current();
        })
        .catch(() => {
          setMsgs((prev) =>
            prev.map((m) => (m.id === temp.id ? { ...m, pending: false, failed: true } : m)),
          );
        });
    }
  };

  const onDraft = (v: string) => {
    setDraft(v);
    const now = Date.now();
    if (activeId && v && now - lastTypingSent.current > 1500) {
      lastTypingSent.current = now;
      chatRef.current?.typing(activeId);
    }
  };

  const closeConv = () => {
    if (!activeId) return;
    chatRef.current?.close(activeId);
    setConvos((prev) => prev.map((c) => (c.id === activeId ? { ...c, status: 'closed' } : c)));
    onChangedRef.current();
  };

  const shown = convos.filter((c) => c.status === filter);
  const current = convos.find((c) => c.id === activeId) || null;
  const connected = status === 'connected';

  // Below 900px the panes stack: the list is a full-width screen, and picking a
  // conversation swaps it for the thread (with a back button).
  const showList = !stacked || !activeId;
  const showThread = !stacked || !!activeId;
  const paneHeight = stacked ? 'calc(100vh - 210px)' : 'clamp(440px,calc(100vh - 280px),760px)';

  return (
    <div style={{
      ...card, overflow: 'hidden', display: 'flex', height: paneHeight, minHeight: 380,
      flexDirection: stacked ? 'column' : 'row',
    }}>
      {/* ---------------------------------------------------- conversations ---- */}
      {showList && (
        <div style={{
          width: stacked ? '100%' : 320, flexShrink: 0, display: 'flex', flexDirection: 'column',
          borderRight: stacked ? 0 : '1.5px solid #EBE2FF', minWidth: 0,
        }}>
          <div style={{ padding: 12, borderBottom: '1.5px solid #EBE2FF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ ...display, fontSize: 19, flex: 1 }}>Conversations</span>
              <StatusDot connected={connected} />
            </div>
            <div style={{ display: 'flex', gap: 4, background: '#F7F3FF', borderRadius: 999, padding: 3 }}>
              <FilterTab on={filter === 'open'} onClick={() => setFilter('open')}>OPEN</FilterTab>
              <FilterTab on={filter === 'closed'} onClick={() => setFilter('closed')}>CLOSED</FilterTab>
            </div>
          </div>

          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {shown.length === 0 ? (
              <EmptyState
                title={filter === 'open' ? 'All clear' : 'Nothing closed'}
                note={filter === 'open'
                  ? 'No open conversations right now. New visitor messages appear here instantly.'
                  : 'Conversations you close will be filed here.'}
              />
            ) : (
              shown.map((c) => (
                <ConvRow key={c.id} conv={c} on={c.id === activeId} onClick={() => openConv(c.id)} />
              ))
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- thread ---- */}
      {showThread && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#F7F3FF' }}>
          {!activeId ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EmptyState title="Pick a conversation" note="Select a visitor on the left to read and reply to their thread." />
            </div>
          ) : (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
                background: color.white, flexShrink: 0,
              }}>
                {stacked && (
                  <button
                    onClick={() => { activeIdRef.current = null; setActiveId(null); }}
                    aria-label="Back to conversations"
                    className="press"
                    style={{
                      border: '1.5px solid #EBE2FF', background: 'transparent', color: '#340057',
                      width: 32, height: 32, borderRadius: 999, cursor: 'pointer', fontSize: 15, flexShrink: 0,
                    }}
                  >
                    ←
                  </button>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {current?.visitorName || 'Visitor'}
                  </div>
                  <div style={{ ...mono, fontSize: 10, letterSpacing: '.06em', color: 'rgba(52,0,87,.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {current?.visitorEmail || 'No email given'}
                  </div>
                </div>
                {current?.status === 'open' && (
                  <Btn variant="ghost" onClick={closeConv} style={{ fontSize: 12, padding: '7px 13px' }}>Close</Btn>
                )}
              </div>
              <Stripes height={4} style={{ flexShrink: 0 }} />

              <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 14, minHeight: 0 }}>
                {loadingThread ? (
                  <div style={{ padding: '30px 0', display: 'flex', justifyContent: 'center' }}>
                    <Spinner color="#7333FF" size={9} />
                  </div>
                ) : msgs.length === 0 ? (
                  <div style={{ ...mono, fontSize: 10.5, letterSpacing: '.1em', color: 'rgba(52,0,87,.45)', textAlign: 'center', paddingTop: 24 }}>
                    NO MESSAGES YET
                  </div>
                ) : (
                  msgs.map((m) => <Bubble key={m.id} m={m} reduced={reduced} />)
                )}

                {peerTyping && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 9,
                    background: color.white, border: '1.5px solid ' + color.border,
                    borderRadius: 15, borderBottomLeftRadius: 6, padding: '9px 13px',
                    animation: reduced ? 'vfade .2s ease both' : 'vrise .28s cubic-bezier(.2,.7,.2,1) both',
                  }}>
                    <TypingDots color={color.violet} size={6} />
                    <span style={{ ...mono, fontSize: 9.5, letterSpacing: '.12em', color: 'rgba(52,0,87,.6)' }}>
                      {(current?.visitorName || 'VISITOR').toUpperCase()} IS TYPING
                    </span>
                  </div>
                )}
              </div>

              <form
                onSubmit={submit}
                style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1.5px solid #EBE2FF', background: '#FFFFFF', flexShrink: 0 }}
              >
                <input
                  value={draft}
                  onChange={(e) => onDraft(e.target.value)}
                  maxLength={2000}
                  placeholder={connected ? 'Write a reply…' : 'Reconnecting, replies still send'}
                  aria-label="Reply"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <Btn type="submit" disabled={!draft.trim()}>Send</Btn>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
