import {
  useCallback, useEffect, useRef, useState, type FormEvent,
} from 'react';
import type { ConversationStatus, ConversationSummary } from '../../types';
import { StaffChat, type ChatStatus } from '../../lib/chatClient';
import { useStaffAuth } from '../../store/StaffAuth';
import { cn } from '../../lib/utils';
import { useIsMobile } from '../../hooks/useIsMobile';
import { listConversations, postStaffMessage, uploadStaffAttachment } from '../../lib/staffApi';
import { Stripes } from '../../components/Stripes';
import { color } from '../../styles/theme';
import {
  Btn, EmptyState, Spinner, StatusDot, TypingDots, inputStyle, usePrefersReducedMotion,
} from './ui';
import { ComposerTools, MAX_BYTES, kindOf } from '../../components/chatParts';
import { emitLive } from './liveEvents';
import { Bubble, ConvRow, FilterTab, QUICK_REPLIES, byRecent, reconcile, type Row } from './chatConsoleParts';

type Filter = ConversationStatus;

export default function ChatConsole({ active, onChanged }: {
  active: boolean;
  onChanged: (force?: boolean) => void;
}) {
  const auth = useStaffAuth();
  const stacked = useIsMobile(900);
  const reduced = usePrefersReducedMotion();

  const [convos, setConvos] = useState<ConversationSummary[]>([]);
  const [filter, setFilter] = useState<Filter>('open');
  const [search, setSearch] = useState('');
  const [found, setFound] = useState<ConversationSummary[] | null>(null);
  const [quick, setQuick] = useState(false);
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

      // New bookings arrive on the same staff socket; the bookings panel and the
      // stats strip listen for this on window, so neither needs its own socket.
      chat.on('booking', (b) => emitLive('valle:booking-new', b)),
      chat.on('quote', (q) => emitLive('valle:quote-new', q)),

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
        // a visitor wrote: "Chats to answer" in the header follows (throttled, never dropped)
        if (message.sender === 'visitor') onChangedRef.current();

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
    void sent;
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

  const [fileErr, setFileErr] = useState('');
  /** Files always travel over REST; the server fans them out to the visitor's socket. */
  const sendFile = (file: File) => {
    if (!activeId) return;
    if (file.size > MAX_BYTES) { setFileErr('That file is over 8 MB.'); return; }
    setFileErr('');
    const caption = draft.trim();
    const localUrl = URL.createObjectURL(file);
    const temp: Row = {
      id: 'tmp-' + Math.random().toString(36).slice(2),
      conversationId: activeId,
      sender: 'staff',
      staffName: auth.user?.name,
      body: caption,
      createdAt: new Date().toISOString(),
      pending: true,
      localUrl,
      attachments: [{ id: 'tmp', kind: kindOf(file), name: file.name, mime: file.type, size: file.size }],
    };
    setMsgs((prev) => [...prev, temp]);
    setDraft('');
    uploadStaffAttachment(activeId, file, caption)
      .then(({ message }) => {
        setMsgs((prev) => prev.map((m) => (m.id === temp.id ? { ...message, localUrl } : m)));
        onChangedRef.current();
      })
      .catch((e: Error) => {
        setFileErr(e.message || 'Could not send the file.');
        setMsgs((prev) => prev.map((m) => (m.id === temp.id ? { ...m, pending: false, failed: true } : m)));
      });
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

  // Search asks the server (it looks inside message bodies too) and shows that
  // list instead of the live one until the box is cleared.
  useEffect(() => {
    const term = search.trim();
    if (!term) { setFound(null); return; }
    let dead = false;
    const t = setTimeout(() => {
      listConversations(undefined, term)
        .then((r) => { if (!dead) setFound(r.items || []); })
        .catch(() => { if (!dead) setFound([]); });
    }, 280);
    return () => { dead = true; clearTimeout(t); };
  }, [search]);

  const shown = (found ?? convos).filter((c) => c.status === filter);
  const current = convos.find((c) => c.id === activeId) || null;
  const connected = status === 'connected';

  // Below 900px the panes stack: the list is a full-width screen, and picking a
  // conversation swaps it for the thread (with a back button).
  const showList = !stacked || !activeId;
  const showThread = !stacked || !!activeId;
  const paneHeight = stacked ? 'calc(100vh - 210px)' : 'clamp(440px,calc(100vh - 280px),760px)';

  return (
    <div
      className={cn('bg-white border-[1.5px] border-solid border-valle-lilac rounded-[18px] overflow-hidden flex min-h-[380px]', stacked ? 'flex-col' : 'flex-row')}
      style={{ height: paneHeight }}
    >
      {/* ---------------------------------------------------- conversations ---- */}
      {showList && (
        <div className={cn(
          'shrink-0 flex flex-col min-w-0',
          stacked ? 'w-full border-r-0' : 'w-[320px] border-r-[1.5px] border-solid border-r-valle-lilac',
        )}>
          <div className="p-[12px] border-b-[1.5px] border-solid border-b-valle-lilac">
            <div className="flex items-center gap-[8px] mb-[10px]">
              <span className="font-display italic font-black uppercase text-[19px] flex-1">Conversations</span>
              <StatusDot connected={connected} />
            </div>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, e-mail or message…"
              aria-label="Search conversations"
              style={{ ...inputStyle, marginBottom: 8 }}
            />
            <div className="flex gap-[4px] bg-[#F7F3FF] rounded-[999px] p-[3px]">
              <FilterTab on={filter === 'open'} onClick={() => setFilter('open')}>OPEN</FilterTab>
              <FilterTab on={filter === 'closed'} onClick={() => setFilter('closed')}>CLOSED</FilterTab>
            </div>
          </div>

          <div className="no-scrollbar flex-1 overflow-y-auto min-h-0">
            {shown.length === 0 ? (
              <EmptyState
                title={found ? 'No match' : filter === 'open' ? 'All clear' : 'Nothing closed'}
                note={found
                  ? 'Nothing in this tab matches your search. Try the other tab or another word.'
                  : filter === 'open'
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
        <div className="flex-1 flex flex-col min-w-0 bg-[#F7F3FF]">
          {!activeId ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState title="Pick a conversation" note="Select a visitor on the left to read and reply to their thread." />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-[10px] py-[11px] px-[14px] bg-white shrink-0">
                {stacked && (
                  <button
                    onClick={() => { activeIdRef.current = null; setActiveId(null); }}
                    aria-label="Back to conversations"
                    className="press border-[1.5px] border-solid border-valle-lilac bg-transparent text-valle-purple w-[32px] h-[32px] rounded-[999px] cursor-pointer text-[15px] shrink-0"
                  >
                    ←
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                    {current?.visitorName || 'Visitor'}
                  </div>
                  <div className="font-mono text-[10px] tracking-[.06em] text-[rgba(52,0,87,.7)] overflow-hidden text-ellipsis whitespace-nowrap">
                    {current?.visitorEmail || 'No email given'}
                  </div>
                </div>
                {current?.status === 'open' && (
                  <Btn variant="ghost" onClick={closeConv} style={{ fontSize: 12, padding: '7px 13px' }}>Close</Btn>
                )}
              </div>
              <Stripes height={4} style={{ flexShrink: 0 }} />

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-[14px] min-h-0">
                {loadingThread ? (
                  <div className="py-[30px] px-0 flex justify-center">
                    <Spinner color="#7333FF" size={9} />
                  </div>
                ) : msgs.length === 0 ? (
                  <div className="font-mono text-[10.5px] tracking-[.1em] text-[rgba(52,0,87,.45)] text-center pt-[24px]">
                    NO MESSAGES YET
                  </div>
                ) : (
                  msgs.map((m) => <Bubble key={m.id} m={m} reduced={reduced} />)
                )}

                {peerTyping && (
                  <div
                    className="inline-flex items-center gap-[9px] bg-white border-[1.5px] border-solid border-valle-lilac rounded-[15px] rounded-bl-[6px] py-[9px] px-[13px]"
                    style={{ animation: reduced ? 'vfade .2s ease both' : 'vrise .28s cubic-bezier(.2,.7,.2,1) both' }}
                  >
                    <TypingDots color={color.violet} size={6} />
                    <span className="font-mono text-[9.5px] tracking-[.12em] text-[rgba(52,0,87,.6)]">
                      {(current?.visitorName || 'VISITOR').toUpperCase()} IS TYPING
                    </span>
                  </div>
                )}
              </div>

              {fileErr && (
                <div role="alert" className="font-mono text-[9.5px] tracking-[.08em] text-[#D6173F] bg-[#FFE2E7] py-[7px] px-[14px] shrink-0">
                  {fileErr.toUpperCase()}
                </div>
              )}
              <form
                onSubmit={submit}
                className="flex gap-[8px] p-[12px] border-t-[1.5px] border-solid border-t-valle-lilac bg-white shrink-0 relative items-center"
              >
                <ComposerTools onFile={sendFile} onEmoji={(e) => setDraft((d) => d + e)} />
                <div className="relative shrink-0">
                  <button type="button" onClick={() => setQuick((v) => !v)} aria-label="Quick replies" title="Quick replies" className={cn('border-[1.5px] border-solid text-valle-purple w-[36px] h-[36px] rounded-[999px] cursor-pointer text-[15px]', quick ? 'border-valle-red bg-[#FFE2E7]' : 'border-valle-lilac bg-white')}>⚡</button>
                  {quick && (
                    <div role="menu" data-testid="quick-replies" className="absolute bottom-[calc(100%+8px)] left-0 z-[5] w-[min(360px,calc(100vw-40px))] bg-white rounded-[14px] shadow-[0_20px_50px_-18px_rgba(31,0,51,.6),0_0_0_1.5px_#EBE2FF] p-[6px] max-h-[260px] overflow-y-auto">
                      {QUICK_REPLIES.map((r) => (
                        <button key={r.label} type="button" role="menuitem" onClick={() => { setDraft((d) => (d ? d + ' ' : '') + r.text); setQuick(false); }} className="block w-full text-left border-0 bg-transparent cursor-pointer rounded-[8px] py-[8px] px-[10px] font-[inherit] text-valle-purple">
                          <div className="font-bold text-[12.5px]">{r.label}</div>
                          <div className="text-[12px] text-[rgba(52,0,87,.65)] whitespace-nowrap overflow-hidden text-ellipsis">{r.text}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
