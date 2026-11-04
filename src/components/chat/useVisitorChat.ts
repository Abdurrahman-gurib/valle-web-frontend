import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ChatMessage } from '../../types';
import { VisitorChat, getVisitorKey, type ChatStatus } from '../../lib/chatClient';
import { errorMessage } from '../../lib/errors';
import { MAX_BYTES, kindOf } from '../chatParts';
import { useT } from '../../i18n';

const INTRO_KEY = 'valle_chat_intro';

/** A message as the visitor sees it: optimistic bubbles are pending until the server echoes them. */
export type Row = ChatMessage & { pending?: boolean; failed?: boolean; localUrl?: string };

export function introDone(): boolean {
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

/** The visitor's bubble before the server has it. */
function optimistic(chat: VisitorChat, body: string, extra: Partial<Row> = {}): Row {
  return {
    id: 'tmp-' + Math.random().toString(36).slice(2),
    conversationId: chat.id || '',
    sender: 'visitor',
    body,
    createdAt: new Date().toISOString(),
    pending: true,
    ...extra,
  };
}

/** Live `prefers-reduced-motion` reading; drives every animation in the chat widget. */
export { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

/**
 * The visitor's side of the live chat: the socket, the message list (with
 * optimistic bubbles), staff typing, the unread count while the panel is
 * closed, and the composer actions.
 */
export function useVisitorChat(open: boolean) {
  const t = useT();
  const [msgs, setMsgs] = useState<Row[]>([]);
  const [status, setStatus] = useState<ChatStatus>('connecting');
  const [draft, setDraft] = useState('');
  const [unread, setUnread] = useState(0);
  const [staffTyping, setStaffTyping] = useState(false);
  const [fileErr, setFileErr] = useState('');

  const chatRef = useRef<VisitorChat | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      chat.disconnect();
      chatRef.current = null;
    };
  }, []);

  /** Ends the intro step and opens the conversation, with the optional name and e-mail. */
  const begin = (name: string, email: string) => {
    markIntroDone();
    chatRef.current?.start(getVisitorKey(), name.trim() || undefined, email.trim() || undefined);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    const chat = chatRef.current;
    if (!text || !chat) return;

    const temp = optimistic(chat, text);
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
    const temp = optimistic(chat, caption, {
      localUrl,
      attachments: [{ id: 'tmp', kind: kindOf(file), name: file.name, mime: file.type, size: file.size }],
    });
    setMsgs((prev) => [...prev, temp]);
    setDraft('');
    chat.sendFile(file, caption)
      .then((m) => setMsgs((prev) => prev.map((x) => (x.id === temp.id ? { ...m, localUrl } : x))))
      .catch((e: unknown) => {
        setFileErr(errorMessage(e, t('Could not send the file.')));
        setMsgs((prev) => prev.map((x) => (x.id === temp.id ? { ...x, pending: false, failed: true } : x)));
      });
  };

  return {
    msgs, status, draft, setDraft, onDraft, submit, sendFile, fileErr, staffTyping, unread,
    clearUnread: () => setUnread(0),
    begin,
    visitorKey: () => chatRef.current?.visitorKey || getVisitorKey(),
  };
}
