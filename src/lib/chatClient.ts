import { io, type Socket } from 'socket.io-client';
import type { ChatMessage, ConversationSummary } from '../types';
import {
  fetchVisitorMessages, listConversationMessages, listConversations,
  openVisitorSession, postVisitorMessage,
} from './staffApi';

/**
 * Thin socket.io wrapper for the `/chat` namespace (see CONTRACT-v2 "Live chat").
 *
 * Both clients degrade the same way: when the socket cannot be established the
 * transport switches to REST polling every 5s so the conversation keeps moving,
 * and switches back the moment socket.io reconnects.
 */

const POLL_MS = 5000;
// Slow safety poll kept running even on a healthy socket, so a silently dropped
// room subscription can never strand a visitor without replies.
const SAFETY_POLL_MS = 15000;

/** green = connected, amber = anything else. */
export type ChatStatus = 'connecting' | 'connected' | 'reconnecting';

/**
 * socket.io ignores the Vite `/api` proxy (its path is `/socket.io`), so in dev
 * we talk to the API host directly: same site, so the session cookie rides along.
 * In production the site and the API share an origin behind nginx.
 */
function chatUrl(): string {
  const base = import.meta.env.VITE_API_URL || '/api';
  if (/^https?:\/\//i.test(base)) {
    try { return new URL(base).origin + '/chat'; } catch { /* fall through */ }
  }
  if (import.meta.env.DEV) return 'http://localhost:3001/chat';
  return '/chat';
}

function newSocket(): Socket {
  return io(chatUrl(), {
    path: '/socket.io',
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5000,
    timeout: 6000,
  });
}

type Listener<T> = (payload: T) => void;

class Emitter<E> {
  private handlers: { [K in keyof E]?: Set<Listener<E[K]>> } = {};

  /** Subscribe; returns the unsubscribe function (call it from useEffect cleanup). */
  on<K extends keyof E>(event: K, fn: Listener<E[K]>): () => void {
    const existing = this.handlers[event];
    const target: Set<Listener<E[K]>> = existing ?? new Set<Listener<E[K]>>();
    this.handlers[event] = target;
    target.add(fn);
    return () => { target.delete(fn); };
  }

  protected fire<K extends keyof E>(event: K, payload: E[K]): void {
    const set = this.handlers[event];
    if (!set) return;
    for (const fn of Array.from(set)) fn(payload);
  }

  protected dropHandlers(): void {
    this.handlers = {};
  }
}

// ---------------------------------------------------------------- visitor ----

export interface VisitorChatEvents {
  /** The conversation is open and its history has loaded. */
  ready: { conversationId: string; messages: ChatMessage[] };
  /** A message nobody has seen yet (from either side). */
  message: ChatMessage;
  /** Staff is typing. */
  typing: void;
  status: ChatStatus;
  error: string;
}

export class VisitorChat extends Emitter<VisitorChatEvents> {
  private socket: Socket | null = null;
  private poll: ReturnType<typeof setInterval> | null = null;
  private pollMs = 0;
  private seen = new Set<string>();
  private key = '';
  private name?: string;
  private email?: string;
  private conversationId: string | null = null;
  private started = false;
  private closed = false;
  status: ChatStatus = 'connecting';

  get id(): string | null { return this.conversationId; }

  /** Idempotent: calling it again with new identity details is a no-op. */
  start(visitorKey: string, name?: string, email?: string): void {
    if (this.started) return;
    this.started = true;
    this.key = visitorKey;
    this.name = name;
    this.email = email;

    const socket = newSocket();
    this.socket = socket;

    socket.on('connect', () => {
      this.setStatus('connected');
      // Deliberately keep polling until `visitor:ready` lands. A connected socket
      // is not yet a subscribed one: the server only joins us to the conversation
      // room when it handles `visitor:hello`. Stopping here would leave a window
      // (and, if the hello is ever dropped, a permanent hole) where the socket
      // looks healthy but no replies arrive and nothing falls back.
      this.startPolling(POLL_MS);
      socket.emit('visitor:hello', { visitorKey: this.key, name: this.name, email: this.email });
    });
    socket.on('disconnect', () => { this.setStatus('reconnecting'); this.startPolling(POLL_MS); });
    socket.on('connect_error', () => { this.setStatus('reconnecting'); this.startPolling(POLL_MS); });

    socket.on('visitor:ready', (p: { conversationId: string; messages: ChatMessage[] }) => {
      this.conversationId = p.conversationId;
      const messages = p.messages || [];
      for (const m of messages) this.seen.add(m.id);
      this.fire('ready', { conversationId: p.conversationId, messages });
      // Subscribed now, so drop to a slow safety poll rather than none at all.
      // Messages are de-duplicated by id, so this can never double-post.
      this.startPolling(SAFETY_POLL_MS);
    });
    socket.on('message:new', (p: { conversationId: string; message: ChatMessage }) => {
      this.ingest(p.message);
    });
    socket.on('peer:typing', () => this.fire('typing', undefined));
    socket.on('error', (p: { message?: string }) => this.fire('error', p?.message || 'Chat error'));
  }

  /** Optimistic send: returns the persisted message, or throws when it could not be delivered. */
  async send(body: string): Promise<void> {
    const text = body.trim();
    if (!text) return;
    if (this.socket?.connected && this.conversationId) {
      this.socket.emit('visitor:message', { conversationId: this.conversationId, body: text });
      return;
    }
    const id = await this.ensureSession();
    const res = await postVisitorMessage(id, this.key, text);
    this.ingest(res.message);
  }

  typing(): void {
    if (this.socket?.connected && this.conversationId) {
      this.socket.emit('visitor:typing', { conversationId: this.conversationId });
    }
  }

  disconnect(): void {
    this.closed = true;
    this.stopPolling();
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.dropHandlers();
  }

  private setStatus(s: ChatStatus): void {
    if (this.status === s) return;
    this.status = s;
    this.fire('status', s);
  }

  private ingest(m: ChatMessage | undefined): void {
    if (!m || this.seen.has(m.id)) return;
    this.seen.add(m.id);
    this.fire('message', m);
  }

  /** Opens (or reuses) the conversation over REST when the socket is unavailable. */
  private async ensureSession(): Promise<string> {
    if (this.conversationId) return this.conversationId;
    const res = await openVisitorSession(this.key, this.name, this.email);
    this.conversationId = res.conversationId;
    const messages = res.messages || [];
    for (const m of messages) this.seen.add(m.id);
    this.fire('ready', { conversationId: res.conversationId, messages });
    return res.conversationId;
  }

  /** Restarts the poll at `intervalMs`; a no-op when that cadence is already running. */
  private startPolling(intervalMs: number): void {
    if (this.closed) return;
    if (this.poll && this.pollMs === intervalMs) return;
    this.stopPolling();
    this.pollMs = intervalMs;
    const tick = async () => {
      if (this.closed) return;
      try {
        const id = await this.ensureSession();
        const res = await fetchVisitorMessages(id, this.key);
        for (const m of res.messages || []) this.ingest(m);
      } catch { /* keep polling, the socket may still come back */ }
    };
    void tick();
    this.poll = setInterval(() => { void tick(); }, intervalMs);
  }

  private stopPolling(): void {
    if (!this.poll) return;
    clearInterval(this.poll);
    this.poll = null;
  }
}

// ------------------------------------------------------------------ staff ----

export interface StaffChatEvents {
  /** Full conversation list (initial load and every poll refresh). */
  conversations: ConversationSummary[];
  /** One conversation changed (new message, closed, unread reset). */
  updated: ConversationSummary;
  /** The requested thread's history. */
  thread: { conversationId: string; messages: ChatMessage[] };
  message: { conversationId: string; message: ChatMessage };
  typing: { conversationId: string };
  status: ChatStatus;
  error: string;
}

export class StaffChat extends Emitter<StaffChatEvents> {
  private socket: Socket | null = null;
  private poll: ReturnType<typeof setInterval> | null = null;
  private pollMs = 0;
  private seen = new Set<string>();
  private openId: string | null = null;
  private started = false;
  private closed = false;
  status: ChatStatus = 'connecting';

  /** The composer is only enabled on a live socket; there is no staff REST send. */
  get canSend(): boolean { return !!this.socket?.connected; }

  start(): void {
    if (this.started) return;
    this.started = true;

    const socket = newSocket();
    this.socket = socket;

    socket.on('connect', () => {
      this.setStatus('connected');
      // Same reasoning as the visitor client: connected is not yet subscribed,
      // so keep polling until `staff:ready` confirms the server joined us.
      this.startPolling(POLL_MS);
      socket.emit('staff:hello');
      if (this.openId) socket.emit('staff:open', { conversationId: this.openId });
    });
    socket.on('disconnect', () => { this.setStatus('reconnecting'); this.startPolling(POLL_MS); });
    socket.on('connect_error', () => { this.setStatus('reconnecting'); this.startPolling(POLL_MS); });

    socket.on('staff:ready', (p: { conversations: ConversationSummary[] }) => {
      this.fire('conversations', p?.conversations || []);
      // Subscribed: fall back to a slow safety poll so a silently lost room
      // membership cannot leave the console showing a stale queue.
      this.startPolling(SAFETY_POLL_MS);
    });
    socket.on('staff:thread', (p: { conversationId: string; messages: ChatMessage[] }) => {
      for (const m of p.messages || []) this.seen.add(m.id);
      this.fire('thread', { conversationId: p.conversationId, messages: p.messages || [] });
    });
    socket.on('message:new', (p: { conversationId: string; message: ChatMessage }) => {
      if (!p?.message || this.seen.has(p.message.id)) return;
      this.seen.add(p.message.id);
      this.fire('message', p);
    });
    socket.on('conversation:updated', (p: { conversation: ConversationSummary }) => {
      if (p?.conversation) this.fire('updated', p.conversation);
    });
    socket.on('peer:typing', (p: { conversationId: string }) => {
      if (p?.conversationId) this.fire('typing', p);
    });
    socket.on('error', (p: { message?: string }) => this.fire('error', p?.message || 'Chat error'));
  }

  open(conversationId: string): void {
    this.openId = conversationId;
    if (this.socket?.connected) {
      this.socket.emit('staff:open', { conversationId });
      return;
    }
    void this.pullThread(conversationId);
  }

  send(conversationId: string, body: string): boolean {
    const text = body.trim();
    if (!text) return false;
    if (!this.socket?.connected) return false;
    this.socket.emit('staff:message', { conversationId, body: text });
    return true;
  }

  close(conversationId: string): void {
    this.socket?.emit('staff:close', { conversationId });
  }

  typing(conversationId: string): void {
    if (this.socket?.connected) this.socket.emit('staff:typing', { conversationId });
  }

  /** Pull the list once over REST, used for first paint before the socket settles. */
  async refresh(): Promise<void> {
    try {
      const res = await listConversations();
      this.fire('conversations', res.items || []);
    } catch { /* the socket handshake may still deliver the list */ }
  }

  disconnect(): void {
    this.closed = true;
    this.stopPolling();
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.dropHandlers();
  }

  private setStatus(s: ChatStatus): void {
    if (this.status === s) return;
    this.status = s;
    this.fire('status', s);
  }

  private async pullThread(conversationId: string): Promise<void> {
    try {
      const res = await listConversationMessages(conversationId);
      for (const m of res.messages || []) this.seen.add(m.id);
      this.fire('thread', { conversationId, messages: res.messages || [] });
    } catch { /* leave the pane on its last known state */ }
  }

  /** Restarts the poll at `intervalMs`; a no-op when that cadence is already running. */
  private startPolling(intervalMs: number): void {
    if (this.closed) return;
    if (this.poll && this.pollMs === intervalMs) return;
    this.stopPolling();
    this.pollMs = intervalMs;
    const tick = async () => {
      if (this.closed) return;
      try {
        const res = await listConversations();
        this.fire('conversations', res.items || []);
      } catch { /* keep polling */ }
      if (!this.openId || this.closed) return;
      try {
        const res = await listConversationMessages(this.openId);
        for (const m of res.messages || []) {
          if (this.seen.has(m.id)) continue;
          this.seen.add(m.id);
          this.fire('message', { conversationId: m.conversationId, message: m });
        }
      } catch { /* keep polling */ }
    };
    void tick();
    this.poll = setInterval(() => { void tick(); }, intervalMs);
  }

  private stopPolling(): void {
    if (!this.poll) return;
    clearInterval(this.poll);
    this.poll = null;
  }
}

// ------------------------------------------------------------- visitor key ---

const VISITOR_KEY = 'valle_chat_key';

/** Stable per-browser identity for anonymous visitors; matches /^[a-z0-9-]{8,64}$/. */
export function getVisitorKey(): string {
  let key = '';
  try { key = localStorage.getItem(VISITOR_KEY) || ''; } catch { /* private mode */ }
  if (/^[a-z0-9-]{8,64}$/.test(key)) return key;
  key = crypto.randomUUID();
  try { localStorage.setItem(VISITOR_KEY, key); } catch { /* private mode */ }
  return key;
}
