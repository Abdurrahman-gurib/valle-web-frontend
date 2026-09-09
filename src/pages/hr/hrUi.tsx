import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { color, motion, radius, shadow, statusColor } from '../../styles/theme';
import { useHover } from '../../hooks/useHover';
import { Stripes } from '../../components/Stripes';
import { display, mono } from '../staff/ui';

/**
 * Shared chrome for the careers back office.
 *
 * Deliberately thin: the reservations desk already owns the product's visual
 * language in `pages/staff/ui.tsx` (Btn, StatusChip, EmptyState, Spinner), and
 * this file only adds the pieces HR needs on top (form fields, a drawer shell,
 * a copy-to-clipboard control) using the tokens in `styles/theme.ts`.
 */

/** Below this the drawer goes full width and every two-column grid stacks. */
export const NARROW = 900;

export const labelStyle: CSSProperties = {
  ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '.13em', color: color.violet,
  textTransform: 'uppercase', display: 'block',
};

export const fieldStyle: CSSProperties = {
  width: '100%', border: '1.5px solid ' + color.border, background: color.tint,
  borderRadius: radius.md, padding: '11px 14px', fontFamily: 'inherit', fontSize: 14.5,
  outline: 'none', color: color.purple, transition: 'border-color ' + motion.fast,
};

/** Status chip for vacancies and applications, coloured from the shared token map. */
export function Pill({ value, title }: { value: string; title?: string }) {
  const skin = statusColor[value] || { bg: color.tint, fg: color.purple };
  return (
    <span
      title={title}
      style={{
        ...mono, fontSize: 9.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
        background: skin.bg, color: skin.fg, borderRadius: radius.pill, padding: '4px 9px',
        whiteSpace: 'nowrap', display: 'inline-block',
      }}
    >
      {value}
    </span>
  );
}

/** Quiet outline chip for facts that are not a status (employment, counts). */
export function MetaPill({ children }: { children: ReactNode }) {
  return (
    <span style={{
      ...mono, fontSize: 9.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
      border: '1.5px solid ' + color.border, color: 'rgba(52,0,87,.7)', borderRadius: radius.pill,
      padding: '3px 9px', whiteSpace: 'nowrap', display: 'inline-block',
    }}>
      {children}
    </span>
  );
}

export function FieldError({ id, text }: { id: string; text: string }) {
  return (
    <div id={id} role="alert" style={{ fontSize: 12.5, fontWeight: 600, color: color.pinkDark, marginTop: 5 }}>
      {text}
    </div>
  );
}

interface BaseFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
}

function Shell({ id, label, error, hint, children, counter }: {
  id: string; label: string; error?: string; hint?: string; children: ReactNode; counter?: string;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <label htmlFor={id} style={labelStyle}>{label}</label>
        <span style={{ flex: 1 }} />
        {counter && (
          <span style={{ ...mono, fontSize: 9.5, letterSpacing: '.1em', color: 'rgba(52,0,87,.45)' }}>{counter}</span>
        )}
      </div>
      <div style={{ marginTop: 6 }}>{children}</div>
      {hint && !error && (
        <div style={{ fontSize: 12, color: 'rgba(52,0,87,.55)', marginTop: 5, lineHeight: 1.4 }}>{hint}</div>
      )}
      {error && <FieldError id={id + '-error'} text={error} />}
    </div>
  );
}

export function TextField({
  id, label, value, onChange, error, hint, disabled, required, type = 'text', placeholder, maxLength, counter,
}: BaseFieldProps & { type?: string; placeholder?: string; maxLength?: number; counter?: string }) {
  const [f, setF] = useState(false);
  return (
    <Shell id={id} label={label} error={error} hint={hint} counter={counter}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? id + '-error' : undefined}
        style={{
          ...fieldStyle,
          borderColor: error ? color.pinkDark : f ? color.violet : color.border,
          opacity: disabled ? 0.6 : 1,
        }}
      />
    </Shell>
  );
}

export function TextArea({
  id, label, value, onChange, error, hint, disabled, rows = 4, placeholder, maxLength, counter,
}: BaseFieldProps & { rows?: number; placeholder?: string; maxLength?: number; counter?: string }) {
  const [f, setF] = useState(false);
  return (
    <Shell id={id} label={label} error={error} hint={hint} counter={counter}>
      <textarea
        id={id}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? id + '-error' : undefined}
        style={{
          ...fieldStyle, resize: 'vertical', lineHeight: 1.5, minHeight: 44,
          borderColor: error ? color.pinkDark : f ? color.violet : color.border,
          opacity: disabled ? 0.6 : 1,
        }}
      />
    </Shell>
  );
}

export function SelectField({
  id, label, value, onChange, error, hint, disabled, options,
}: BaseFieldProps & { options: readonly { value: string; label: string }[] }) {
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        style={{
          ...fieldStyle, cursor: disabled ? 'default' : 'pointer', appearance: 'auto',
          borderColor: error ? color.pinkDark : color.border,
        }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Shell>
  );
}

/** Bare filter <select>, no label block: used in the filter bars. */
export function FilterSelect({ value, onChange, ariaLabel, options, width }: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  options: readonly { value: string; label: string }[];
  width?: number | string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      style={{ ...fieldStyle, width: width ?? 'auto', cursor: 'pointer', appearance: 'auto' }}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/** Draft / Published segmented control, shaped like the site's rate switch. */
export function Segmented({ value, onChange, options, disabled }: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      style={{
        display: 'inline-flex', gap: 4, padding: 4, background: color.white,
        border: '1.5px solid ' + color.border, borderRadius: radius.pill,
      }}
    >
      {options.map((o) => (
        <SegBtn
          key={o.value}
          on={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          label={o.label}
        />
      ))}
    </div>
  );
}

function SegBtn({ on, onClick, label, disabled }: {
  on: boolean; onClick: () => void; label: string; disabled?: boolean;
}) {
  const [h, bind] = useHover();
  return (
    <button
      {...bind}
      type="button"
      role="radio"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className="press"
      style={{
        border: 0, cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 13,
        fontWeight: 700, padding: '8px 18px', borderRadius: radius.pill, whiteSpace: 'nowrap',
        background: on ? color.purple : (h && !disabled ? color.border : 'transparent'),
        color: on ? color.white : color.purple,
        opacity: disabled ? 0.6 : 1,
        transition: 'background ' + motion.fast + ', color ' + motion.fast,
      }}
    >
      {label}
    </button>
  );
}

/**
 * Copies a value to the clipboard so HR can answer from their own mail client.
 * `navigator.clipboard` is unavailable outside a secure context, so this falls
 * back to a throwaway textarea rather than silently doing nothing.
 */
export function CopyButton({ value, label = 'Copy email', copiedLabel = 'Copied' }: {
  value: string; label?: string; copiedLabel?: string;
}) {
  const [h, bind] = useHover();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1800);
    return () => clearTimeout(t);
  }, [done]);

  const copy = async () => {
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        ok = true;
      }
    } catch { ok = false; }
    if (!ok) {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      document.body.removeChild(ta);
    }
    if (ok) setDone(true);
  };

  return (
    <button
      {...bind}
      type="button"
      onClick={() => { void copy(); }}
      className="press"
      aria-live="polite"
      style={{
        border: '1.5px solid ' + (done ? color.greenDeep : color.border),
        background: done ? color.okFill : (h ? color.tint : 'transparent'),
        color: done ? color.greenDeep : color.purple,
        cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
        padding: '7px 14px', borderRadius: radius.pill, whiteSpace: 'nowrap',
        transition: 'background ' + motion.fast + ', border-color ' + motion.fast,
      }}
    >
      {done ? copiedLabel + ' ✓' : label}
    </button>
  );
}

/**
 * Right-hand drawer: purple header, stripe rule, scrolling body, sticky footer.
 * Full width below `NARROW` so the panes stack on a tablet.
 */
export function Drawer({ eyebrow, title, onClose, children, footer, width = 480, narrow }: {
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  narrow: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(31,0,51,.55)',
          backdropFilter: 'blur(3px)', animation: 'vfade .2s ease both',
        }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 96,
          width: narrow ? '100vw' : 'min(100vw,' + width + 'px)',
          background: color.white, display: 'flex', flexDirection: 'column',
          boxShadow: shadow.panel, animation: 'vfade .2s ease both',
        }}
      >
        <div style={{
          background: color.purple, color: color.white, padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...mono, fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', color: 'rgba(255,255,255,.6)' }}>
              {eyebrow}
            </div>
            <div style={{ ...display, fontSize: 24, lineHeight: 1.05, wordBreak: 'break-word' }}>{title}</div>
          </div>
          <span style={{ flex: 1 }} />
          <button
            onClick={onClose}
            aria-label="Close"
            className="press"
            type="button"
            style={{
              border: '1.5px solid rgba(255,255,255,.32)', background: 'transparent', color: color.white,
              width: 34, height: 34, borderRadius: radius.pill, cursor: 'pointer', fontSize: 16,
              lineHeight: 1, flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
        <Stripes height={6} />

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>{children}</div>

        {footer && (
          <div style={{
            borderTop: '1.5px solid ' + color.border, padding: 16, background: color.white,
            display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
          }}>
            {footer}
          </div>
        )}
      </aside>
    </>
  );
}

/** Read-only label + value pair inside a detail card. */
export function DetailLine({ tag, value, children }: {
  tag: string; value?: string; children?: ReactNode;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={labelStyle}>{tag}</div>
      <div style={{ fontSize: 14, marginTop: 3, wordBreak: 'break-word', lineHeight: 1.45 }}>
        {children !== undefined ? children : (value && value.trim() ? value : 'Not given')}
      </div>
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <div style={{ ...labelStyle, margin: '20px 0 8px' }}>{children}</div>;
}

/** Inline error / notice strip in the pink used by the login card. */
export function Notice({ tone = 'error', children }: { tone?: 'error' | 'ok'; children: ReactNode }) {
  const err = tone === 'error';
  return (
    <div
      role="alert"
      style={{
        background: err ? 'rgba(217,30,68,.1)' : color.okFill,
        border: '1.5px solid ' + (err ? 'rgba(217,30,68,.35)' : color.greenDeep),
        borderRadius: radius.md, padding: '10px 14px', fontSize: 13.5, fontWeight: 600,
        color: err ? color.pinkDark : color.greenDeep, animation: 'vfade .2s ease both',
      }}
    >
      {children}
    </div>
  );
}
