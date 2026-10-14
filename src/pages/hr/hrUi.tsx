import { useEffect, useState, type ReactNode } from 'react';
import { color, statusColor } from '../../styles/theme';
import { Stripes } from '../../components/Stripes';
import { cn } from '@/lib/utils';

/**
 * Shared chrome for the careers back office.
 *
 * Deliberately thin: the reservations desk already owns the product's visual
 * language in `pages/staff/ui.tsx` (Btn, StatusChip, EmptyState, Spinner), and
 * this file only adds the pieces HR needs on top (form fields, a drawer shell,
 * a copy-to-clipboard control) using the brand tokens.
 */

/** Below this the drawer goes full width and every two-column grid stacks. */
export const NARROW = 900;

/** Mono uppercase field label. */
export const labelCls =
  'block font-mono text-[10px] font-bold tracking-[.13em] text-valle-violet uppercase';

/** Lilac-tinted input / select / textarea skin. */
export const fieldCls =
  'w-full border-[1.5px] border-solid border-valle-lilac bg-[#F7F3FF] rounded-[12px] py-[11px] px-[14px] ' +
  '[font-family:inherit] text-[14.5px] outline-none text-valle-purple ' +
  'transition-[border-color] duration-[180ms] ease-[cubic-bezier(.2,.7,.2,1)]';

const fieldBorder = (error?: string, focused?: boolean) =>
  error ? 'border-[#D91E44]' : focused ? 'border-valle-violet' : 'border-valle-lilac';

/** Status chip for vacancies and applications, coloured from the shared token map. */
export function Pill({ value, title }: { value: string; title?: string }) {
  const skin = statusColor[value] || { bg: color.tint, fg: color.purple };
  return (
    <span
      title={title}
      className="inline-block font-mono text-[9.5px] font-bold tracking-[.1em] uppercase rounded-[999px] py-[4px] px-[9px] whitespace-nowrap"
      style={{ background: skin.bg, color: skin.fg }}
    >
      {value}
    </span>
  );
}

/** Quiet outline chip for facts that are not a status (employment, counts). */
export function MetaPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block font-mono text-[9.5px] font-bold tracking-[.1em] uppercase border-[1.5px] border-solid border-valle-lilac text-[rgba(52,0,87,.7)] rounded-[999px] py-[3px] px-[9px] whitespace-nowrap">
      {children}
    </span>
  );
}

export function FieldError({ id, text }: { id: string; text: string }) {
  return (
    <div id={id} role="alert" className="text-[12.5px] font-semibold text-[#D91E44] mt-[5px]">
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
    <div className="min-w-0">
      <div className="flex items-baseline gap-[8px]">
        <label htmlFor={id} className={labelCls}>{label}</label>
        <span className="flex-1" />
        {counter && (
          <span className="font-mono text-[9.5px] tracking-[.1em] text-[rgba(52,0,87,.45)]">{counter}</span>
        )}
      </div>
      <div className="mt-[6px]">{children}</div>
      {hint && !error && (
        <div className="text-[12px] text-[rgba(52,0,87,.7)] mt-[5px] leading-[1.4]">{hint}</div>
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
        className={cn(fieldCls, fieldBorder(error, f), disabled ? 'opacity-60' : 'opacity-100')}
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
        className={cn(
          fieldCls, 'resize-y leading-[1.5] min-h-[44px]', fieldBorder(error, f),
          disabled ? 'opacity-60' : 'opacity-100',
        )}
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
        className={cn(fieldCls, 'appearance-auto', disabled ? 'cursor-default' : 'cursor-pointer', fieldBorder(error))}
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
      className={cn(fieldCls, 'cursor-pointer appearance-auto')}
      style={{ width: width ?? 'auto' }}
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
      className="inline-flex gap-[4px] p-[4px] bg-white border-[1.5px] border-solid border-valle-lilac rounded-[999px]"
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
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'press border-0 [font-family:inherit] text-[13px] font-bold py-[8px] px-[18px] rounded-[999px] whitespace-nowrap',
        'transition-[background,color] duration-[180ms] ease-[cubic-bezier(.2,.7,.2,1)]',
        disabled ? 'cursor-default opacity-60' : 'cursor-pointer opacity-100',
        on ? 'bg-valle-purple text-white' : cn('bg-transparent text-valle-purple', !disabled && 'hover:bg-valle-lilac'),
      )}
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
      type="button"
      onClick={() => { void copy(); }}
      className={cn(
        'press border-[1.5px] border-solid cursor-pointer [font-family:inherit] text-[12.5px] font-bold py-[7px] px-[14px] rounded-[999px] whitespace-nowrap',
        'transition-[background,border-color] duration-[180ms] ease-[cubic-bezier(.2,.7,.2,1)]',
        done
          ? 'border-[#12B54A] bg-[#E2FFEB] text-[#12B54A]'
          : 'border-valle-lilac bg-transparent hover:bg-[#F7F3FF] text-valle-purple',
      )}
      aria-live="polite"
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
        className="fixed inset-0 z-[95] bg-[rgba(31,0,51,.55)] backdrop-blur-[3px] animate-[vfade_.2s_ease_both]"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed top-0 right-0 bottom-0 z-[96] bg-white flex flex-col shadow-[0_40px_90px_-20px_rgba(0,0,0,.6)] animate-[vfade_.2s_ease_both]"
        style={{ width: narrow ? '100vw' : 'min(100vw,' + width + 'px)' }}
      >
        <div className="bg-valle-purple text-white py-[16px] px-[20px] flex items-center gap-[12px]">
          <div className="min-w-0">
            <div className="font-mono text-[9.5px] font-bold tracking-[.14em] text-[rgba(255,255,255,.6)]">
              {eyebrow}
            </div>
            <div className="font-display italic font-black uppercase text-[24px] leading-[1.05] [word-break:break-word]">{title}</div>
          </div>
          <span className="flex-1" />
          <button
            onClick={onClose}
            aria-label="Close"
            className="press border-[1.5px] border-solid border-[rgba(255,255,255,.32)] bg-transparent text-white w-[34px] h-[34px] rounded-[999px] cursor-pointer text-[16px] leading-none shrink-0"
            type="button"
          >
            ×
          </button>
        </div>
        <Stripes height={6} />

        <div className="flex-1 overflow-y-auto p-[20px]">{children}</div>

        {footer && (
          <div className="border-t-[1.5px] border-solid border-valle-lilac p-[16px] bg-white flex gap-[10px] flex-wrap items-center">
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
    <div className="min-w-0">
      <div className={labelCls}>{tag}</div>
      <div className="text-[14px] mt-[3px] [word-break:break-word] leading-[1.45]">
        {children !== undefined ? children : (value && value.trim() ? value : 'Not given')}
      </div>
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <div className={cn(labelCls, 'mt-[20px] mx-0 mb-[8px]')}>{children}</div>;
}

/** Inline error / notice strip in the pink used by the login card. */
export function Notice({ tone = 'error', children }: { tone?: 'error' | 'ok'; children: ReactNode }) {
  const err = tone === 'error';
  return (
    <div
      role="alert"
      className={cn(
        'border-[1.5px] border-solid rounded-[12px] py-[10px] px-[14px] text-[13.5px] font-semibold animate-[vfade_.2s_ease_both]',
        err
          ? 'bg-[rgba(217,30,68,.1)] border-[rgba(217,30,68,.35)] text-[#D91E44]'
          : 'bg-[#E2FFEB] border-[#12B54A] text-[#12B54A]',
      )}
    >
      {children}
    </div>
  );
}
