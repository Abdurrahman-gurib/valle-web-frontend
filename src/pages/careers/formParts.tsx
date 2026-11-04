import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { useT } from '../../i18n';
import { MONO } from './shared';

const labelCls = cn(MONO, 'text-[rgba(52,0,87,.7)] block mb-[7px]');

function fieldCls(invalid: boolean): string {
  return cn(
    'w-full border-[1.5px] border-solid rounded-[12px] py-3 px-[15px] font-sans text-[15px] text-valle-purple outline-none [transition:border-color_.18s_cubic-bezier(.2,.7,.2,1),background_.18s_cubic-bezier(.2,.7,.2,1)]',
    invalid ? 'border-[#D6173F] bg-[#FFE2E7]' : 'border-valle-lilac focus:border-valle-violet bg-white',
  );
}

function ErrorNote({ id, text }: { id: string; text: string }) {
  const t = useT();
  return (
    <div id={id} role="alert" className="font-mono text-[10.5px] font-normal text-[#D6173F] mt-[6px] tracking-[.06em]">
      {t(text)}
    </div>
  );
}

/** What every field gets from useApplication().field(key). */
interface BoundField {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  error?: string;
  placeholder?: string;
}

interface FieldProps extends BoundField {
  hint?: string;
  type?: 'text' | 'email' | 'tel' | 'url';
  inputMode?: 'text' | 'email' | 'tel' | 'numeric' | 'url';
  autoComplete?: string;
  maxLength?: number;
  required?: boolean;
}

export function TextField(p: FieldProps) {
  const t = useT();
  const invalid = Boolean(p.error);
  return (
    <div>
      <label htmlFor={p.id} className={labelCls}>
        {p.label.toUpperCase()}
        {!p.required && <span className="opacity-55"> · {t('OPTIONAL')}</span>}
      </label>
      <input
        id={p.id}
        name={p.id}
        type={p.type || 'text'}
        inputMode={p.inputMode}
        autoComplete={p.autoComplete}
        maxLength={p.maxLength}
        value={p.value}
        placeholder={p.placeholder}
        aria-invalid={invalid || undefined}
        aria-required={p.required || undefined}
        aria-describedby={invalid ? p.id + '-err' : p.hint ? p.id + '-hint' : undefined}
        onChange={(e) => p.onChange(e.target.value)}
        onBlur={p.onBlur}
        className={fieldCls(invalid)}
      />
      {invalid
        ? <ErrorNote id={p.id + '-err'} text={p.error || ''} />
        : p.hint
          ? <div id={p.id + '-hint'} className="text-[12.5px] text-[rgba(52,0,87,.7)] mt-[6px]">{p.hint}</div>
          : null}
    </div>
  );
}

export function TextArea(p: BoundField & { max: number }) {
  const t = useT();
  const invalid = Boolean(p.error);
  const left = p.max - p.value.length;
  return (
    <div>
      <label htmlFor={p.id} className={labelCls}>
        {p.label.toUpperCase()}<span className="opacity-55"> · {t('OPTIONAL')}</span>
      </label>
      <textarea
        id={p.id}
        name={p.id}
        rows={5}
        value={p.value}
        placeholder={p.placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? p.id + '-err' : p.id + '-count'}
        onChange={(e) => p.onChange(e.target.value)}
        onBlur={p.onBlur}
        className={cn(fieldCls(invalid), 'resize-y leading-[1.55] min-h-[120px]')}
      />
      {invalid
        ? <ErrorNote id={p.id + '-err'} text={p.error || ''} />
        : (
          <div id={p.id + '-count'} className="font-mono text-[10.5px] font-normal tracking-[.14em] text-[rgba(52,0,87,.5)] mt-[6px] text-right">
            {t('{n} CHARACTERS LEFT', { n: left })}
          </div>
        )}
    </div>
  );
}

export function Pill({ children, style }: { children: ReactNode; style: { background: string; color: string } }) {
  return (
    <span className={cn(MONO, 'rounded-[999px] py-[7px] px-3 leading-none')} style={style}>
      {children}
    </span>
  );
}

export function SubmitButton({ busy, disabled }: { busy: boolean; disabled: boolean }) {
  const t = useT();
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      aria-busy={busy || undefined}
      className="vbtn vbtn-primary vbtn-block text-[16px]"
    >
      {busy && (
        <span aria-hidden className="w-[9px] h-[9px] rounded-[999px] bg-white inline-block [animation:vbeat_.9s_ease-in-out_infinite]" />
      )}
      {busy ? t('Sending…') : t('Send my application')}
    </button>
  );
}

export function GhostButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="press border-2 border-solid border-valle-purple bg-transparent hover:bg-valle-purple cursor-pointer font-sans text-[14px] font-bold text-valle-purple hover:text-white py-3 px-6 rounded-[999px] [transition:background_.18s_cubic-bezier(.2,.7,.2,1),color_.18s_cubic-bezier(.2,.7,.2,1)]"
    >
      {label}
    </button>
  );
}
