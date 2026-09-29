import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { ChatAttachmentMeta } from '../types';
import { useT } from '../i18n';

/**
 * Pieces shared by the visitor widget and the staff console: links in text,
 * attachment rendering (photo, GIF, voice note, document), the emoji grid and
 * the composer tools (attach a file, record a voice note, pick an emoji).
 * Everything renders text as text: bodies are never treated as HTML.
 */

const MONO = "'Chivo Mono',monospace";

/** Files the composer accepts; the API enforces the same list and an 8 MB cap. */
export const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/heic,audio/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
export const MAX_BYTES = 8 * 1024 * 1024;

export const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😎', '🤩', '🥳', '😏', '😌',
  '😢', '😭', '😤', '😡', '🤔', '🤗', '🙄', '😴', '🤒', '🤯', '👍', '👎', '👋', '🙏', '👏', '💪', '🤝', '✌️', '🤞', '👌',
  '❤️', '💜', '💚', '💛', '🔥', '⭐', '✨', '🎉', '🎈', '🎁', '☀️', '🌧️', '🌈', '🌴', '🏞️', '🌊', '🐢', '🦜', '🦎', '🐒',
  '🚵', '🧗', '🪂', '🎢', '🏍️', '🚙', '🛶', '⛰️', '📍', '📅', '⏰', '💰', '💳', '🎟️', '📸', '🍽️', '☕', '🍹', '✅', '❌',
];

const URL_RE = /((?:https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?)\]'"])/gi;

/** Text with clickable links. Returned as nodes, so the body stays text, not HTML. */
export function linkify(text: string, linkColor = 'inherit'): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(URL_RE)) {
    const start = m.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const raw = m[0];
    const href = raw.startsWith('www.') ? 'https://' + raw : raw;
    out.push(
      <a key={i++} href={href} target="_blank" rel="noopener noreferrer nofollow" style={{ color: linkColor, textDecoration: 'underline', wordBreak: 'break-all' }}>
        {raw}
      </a>,
    );
    last = start + raw.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function fmtSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

/** Where an attachment's bytes live: staff and visitors use different, separately-guarded routes. */
export function attachmentUrl(a: ChatAttachmentMeta, who: { staff: true } | { staff?: false; visitorKey: string }): string {
  const base = import.meta.env.VITE_API_URL || '/api';
  return who.staff
    ? `${base}/staff/chat/attachments/${encodeURIComponent(a.id)}`
    : `${base}/chat/attachments/${encodeURIComponent(a.id)}?visitorKey=${encodeURIComponent(who.visitorKey)}`;
}

export function kindOf(file: File): ChatAttachmentMeta['kind'] {
  const t = (file.type || '').toLowerCase();
  if (t === 'image/gif') return 'gif';
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('audio/')) return 'audio';
  return 'file';
}

const FILE_ICON: Record<string, string> = { pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', ppt: '📽️', pptx: '📽️', txt: '📃', csv: '📊' };

/** One attachment inside a bubble. `url` is where to fetch it (or a local object URL while sending). */
export function AttachmentView({ a, url, mine }: { a: ChatAttachmentMeta; url: string; mine: boolean }) {
  const t = useT();
  if (a.kind === 'image' || a.kind === 'gif') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', maxWidth: 260 }} title={a.name}>
        <img src={url} alt={a.name} loading="lazy" style={{ display: 'block', maxWidth: '100%', maxHeight: 260, borderRadius: 10, background: 'rgba(0,0,0,.06)' }} />
        {a.kind === 'gif' && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', opacity: 0.7 }}>GIF</span>}
      </a>
    );
  }
  if (a.kind === 'audio') {
    return (
      <div style={{ display: 'grid', gap: 4 }}>
        <audio controls preload="metadata" src={url} style={{ width: 240, maxWidth: '100%', height: 36, filter: mine ? 'invert(1) hue-rotate(180deg)' : 'none' }} />
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', opacity: 0.7 }}>{t('VOICE NOTE')} · {fmtSize(a.size)}</span>
      </div>
    );
  }
  const ext = (a.name.split('.').pop() || '').toLowerCase();
  return (
    <a
      href={url}
      download={a.name}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit',
        border: '1.5px solid ' + (mine ? 'rgba(255,255,255,.35)' : '#EBE2FF'), borderRadius: 12, padding: '8px 12px', maxWidth: 280,
      }}
    >
      <span style={{ fontSize: 22 }}>{FILE_ICON[ext] || '📎'}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
        <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.08em', opacity: 0.75 }}>{ext.toUpperCase() || t('FILE')} · {fmtSize(a.size)} · {t('DOWNLOAD')}</span>
      </span>
    </a>
  );
}

export function EmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const t = useT();
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [onClose]);
  return (
    <div
      ref={box}
      role="dialog"
      aria-label={t('Emoji')}
      data-testid="emoji-picker"
      style={{
        position: 'absolute', bottom: 'calc(100% + 8px)', left: 8, zIndex: 5, width: 'min(300px, calc(100vw - 40px))',
        background: '#FFFFFF', color: '#340057', borderRadius: 14, boxShadow: '0 20px 50px -18px rgba(31,0,51,.6), 0 0 0 1.5px #EBE2FF',
        padding: 8, display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 2, maxHeight: 200, overflowY: 'auto',
      }}
    >
      {EMOJIS.map((e) => (
        <button key={e} type="button" onClick={() => onPick(e)} aria-label={t('Insert {emoji}', { emoji: e })} style={{ border: 0, background: 'transparent', fontSize: 20, lineHeight: 1.3, cursor: 'pointer', borderRadius: 6, padding: 2 }}>
          {e}
        </button>
      ))}
    </div>
  );
}

const toolBtn = (active?: boolean): CSSProperties => ({
  border: '1.5px solid ' + (active ? '#FF3358' : '#EBE2FF'), background: active ? '#FFE2E7' : '#FFFFFF', color: '#340057',
  width: 36, height: 36, borderRadius: 999, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 16, flexShrink: 0, padding: 0,
});

/**
 * Attach / voice note / emoji, as one strip. `onFile` receives the chosen or
 * recorded file; `onEmoji` the picked emoji. Recording uses MediaRecorder and
 * degrades to a plain "not supported" title on browsers without it.
 */
export function ComposerTools({ onFile, onEmoji, disabled }: { onFile: (f: File) => void; onEmoji: (e: string) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const t = useT();
  const [emoji, setEmoji] = useState(false);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [secs, setSecs] = useState(0);
  const chunks = useRef<Blob[]>([]);
  const canRecord = typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => {
    if (!rec) return;
    const timer = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [rec]);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) onFile(f);
  };

  const toggleRecord = async () => {
    if (rec) { rec.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      r.ondataavailable = (ev) => { if (ev.data.size) chunks.current.push(ev.data); };
      r.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const type = (r.mimeType || 'audio/webm').split(';')[0];
        const blob = new Blob(chunks.current, { type });
        setRec(null);
        setSecs(0);
        if (blob.size > 0) onFile(new File([blob], 'voice-note.' + (type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'), { type }));
      };
      r.start(250);
      setRec(r);
      setSecs(0);
    } catch {
      /* permission refused: nothing to send */
    }
  };

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', position: 'relative', flexShrink: 0 }}>
      <input ref={input} type="file" accept={ACCEPT} onChange={pick} hidden data-testid="chat-file-input" />
      <button type="button" onClick={() => input.current?.click()} disabled={disabled} aria-label={t('Attach a photo, GIF or document')} title={t('Attach a photo, GIF or document')} style={toolBtn()}>📎</button>
      <button
        type="button"
        onClick={() => { void toggleRecord(); }}
        disabled={disabled || !canRecord}
        aria-label={rec ? t('Stop recording and send') : t('Record a voice note')}
        title={canRecord ? (rec ? t('Stop and send') : t('Record a voice note')) : t('Voice notes are not supported in this browser')}
        style={{ ...toolBtn(!!rec), width: rec ? 'auto' : 36, padding: rec ? '0 10px' : 0, gap: 6 }}
      >
        {rec ? <><span style={{ width: 8, height: 8, borderRadius: 999, background: '#FF3358', animation: 'vfade 1s ease-in-out infinite alternate' }} /><span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700 }}>{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</span></> : '🎤'}
      </button>
      <button type="button" onClick={() => setEmoji((v) => !v)} disabled={disabled} aria-label={t('Insert an emoji')} title={t('Emoji')} style={toolBtn(emoji)}>😊</button>
      {emoji && <EmojiPicker onPick={(e) => { onEmoji(e); setEmoji(false); }} onClose={() => setEmoji(false)} />}
    </div>
  );
}
