import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { _t } from '../../i18n';

/** Small building blocks of the booking page: type styles, steppers, inputs and pay cards. */

export const MONO = "'Chivo Mono',monospace";
export const BARLOW = "'Barlow',sans-serif";

/** Nationality values (NATC keys) are stored and sent in English; translated only for display. */
export const NATIONALITIES = [_t('Mauritius'), _t('France'), _t('Réunion'), _t('United Kingdom'), _t('Germany'), _t('Italy'), _t('India'), _t('China'), _t('South Africa'), _t('UAE'), _t('Australia'), _t('USA'), _t('Other')];

export const inputStyle: CSSProperties = {
  width: '100%', border: '1.5px solid #EBE2FF', background: '#F7F3FF', borderRadius: '12px',
  padding: '13px 16px', fontFamily: 'inherit', fontSize: '15px', outline: 'none', color: '#340057',
};

/** "1 · TAP TO ADD EXPERIENCES" and the other numbered step titles. */
export function StepLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontFamily: MONO, fontSize: '11.5px', fontWeight: 600, letterSpacing: '.14em', color: 'rgba(52,0,87,.7)' }}>{children}</div>;
}

/** The red-bordered notice next to the Confirm bar (missing details, a refused booking): announced, and focusable. */
export const ErrorNote = forwardRef<HTMLDivElement, { children: ReactNode; style?: CSSProperties } & Pick<HTMLAttributes<HTMLDivElement>, 'id'>>(
  function ErrorNote({ children, style, id }, ref) {
    return (
      <div ref={ref} id={id} role="alert" tabIndex={-1} data-testid="booking-error" style={{ marginTop: '18px', background: '#FFE2E7', border: '1.5px solid #FF3358', borderRadius: '14px', padding: '13px 18px', fontSize: '14px', color: '#340057', fontWeight: 600, outlineColor: '#7333FF', ...style }}>
        {children}
      </div>
    );
  },
);

/* Stepper +/− button with hover background (style-hover="background:#EBE2FF") */
function StepBtn({ onClick, bg, label, children }: { onClick: () => void; bg: string; label: string; children: ReactNode }) {
  return (
    <motion.button type="button" onClick={onClick} aria-label={label} whileTap={{ scale: 0.88 }}
      className="inline-flex size-10 sm:size-[26px] cursor-pointer items-center justify-center rounded-[7px] border-0 text-valle-purple transition-colors hover:!bg-valle-lilac focus-visible:outline-2 focus-visible:outline-valle-violet"
      style={{ background: bg }}>
      {children}
    </motion.button>
  );
}

/* ADULTS / CHILD 6-11 / UNITS stepper group */
export function Stepper({ tag, val, inc, dec, boxBg, btnBg }: {
  tag: string; val: number; inc: () => void; dec: () => void; boxBg: string; btnBg: string;
}) {
  return (
    <div className="flex items-center gap-[5px] rounded-[10px] px-[7px] py-1" style={{ background: boxBg }}>
      <span style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '.05em', color: 'rgba(52,0,87,.7)' }}>{tag}</span>
      <StepBtn onClick={dec} bg={btnBg} label={'− ' + tag}><Minus size={14} strokeWidth={3} aria-hidden /></StepBtn>
      <span className="min-w-4 text-center text-sm font-bold" aria-live="polite">{val}</span>
      <StepBtn onClick={inc} bg={btnBg} label={'+ ' + tag}><Plus size={14} strokeWidth={3} aria-hidden /></StepBtn>
    </div>
  );
}

/* 4 · DETAILS: text input with focus border (style-focus="border-color:#7333FF") and its own error line */
export const Field = forwardRef<HTMLInputElement, {
  value: string; onChange: (v: string) => void; placeholder: string; id: string;
  type?: 'text' | 'email' | 'tel'; inputMode?: 'text' | 'email' | 'tel'; autoComplete?: string; error?: string;
}>(function Field({ value, onChange, placeholder, id, type = 'text', inputMode, autoComplete, error }, ref) {
  const errId = id + '-error';
  return (
    <div>
      <input
        ref={ref}
        id={id}
        name={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        dir={type === 'text' ? undefined : 'ltr'}
        className="transition-colors focus:!border-valle-violet focus:outline-none"
        style={{ ...inputStyle, ...(error ? { borderColor: '#D6173F' } : null) }}
      />
      {error && <div id={errId} role="alert" style={{ fontSize: '12.5px', fontWeight: 600, color: '#B8163A', marginTop: '5px' }}>{error}</div>}
    </div>
  );
});

/* 5 · PAYMENT: pay mode card */
export function PayCard({ on, bgOn, title, note, onClick }: { on: boolean; bgOn: string; title: string; note: string; onClick: () => void }) {
  return (
    <motion.div
      role="radio"
      aria-checked={on}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      whileHover={{ y: -2 }}
      className={cn('cursor-pointer rounded-2xl border-2 px-[18px] py-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-valle-violet', on ? 'border-valle-purple' : 'border-valle-lilac bg-white')}
      style={on ? { background: bgOn } : undefined}
    >
      <div className="flex items-center gap-2.5">
        <span className="inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 border-valle-purple">
          <span className={cn('size-[9px] rounded-full', on ? 'bg-valle-purple' : 'bg-transparent')} />
        </span>
        <span className="font-display text-lg font-extrabold uppercase italic">{title}</span>
      </div>
      <div className="mt-2 text-[13px] leading-normal text-valle-purple/70">{note}</div>
    </motion.div>
  );
}
