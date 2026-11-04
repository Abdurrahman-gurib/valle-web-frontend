import { useEffect, useId, useState, type CSSProperties, type RefObject } from 'react';
import { BtnLabel } from '../../components/ui/valle';
import { createQuote } from '../../lib/api';
import { errorMessage, httpStatus } from '../../lib/errors';
import { todayIso } from '../../lib/format';
import { useT } from '../../i18n';
import type { QuoteRequest } from '../../types';
import { BLACK_ITALIC, MONO, PHONE, TEL } from './shared';

/** Small red text on white: the darker brand red (at least 4.5:1), with its value until the token lands. */
const RED_INK = 'var(--valle-red-ink, #C8102E)';

type Field = 'name' | 'company' | 'email' | 'phone' | 'groupSize' | 'preferredDate' | 'programme' | 'message';
type Errors = Partial<Record<Field, string>>;

/** The event a "Request a quote" button sends with the programme or package it belongs to. */
const QUOTE_PROGRAMME_EVENT = 'valle:quote-programme';
/** Prefills the quote form's "Programme" field (call it before scrolling to the form). */
export function requestQuoteFor(programme: string) {
  window.dispatchEvent(new CustomEvent<string>(QUOTE_PROGRAMME_EVENT, { detail: programme }));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s().-]{6,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** The API's field names, longest first so "preferredDate" is not read as another field. */
const API_FIELDS: Field[] = ['preferredDate', 'groupSize', 'programme', 'company', 'message', 'email', 'phone', 'name'];

/** One labelled field: a visible label, the input, and its own error under it. */
function QField({ id, testId, label, value, onChange, placeholder, type = 'text', min, autoComplete, inputMode, required, error, wide }: {
  id: string; testId: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; min?: string;
  autoComplete?: string; inputMode?: 'text' | 'email' | 'tel' | 'numeric'; required?: boolean; error?: string; wide?: boolean;
}) {
  const [f, setF] = useState(false);
  const errId = id + '-err';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, ...(wide ? { gridColumn: '1 / -1' } : null) }}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 700, color: '#340057' }}>
        {label}{required && <span aria-hidden style={{ color: RED_INK }}> *</span>}
      </label>
      <input
        id={id}
        name={testId}
        data-testid={'quote-' + testId}
        type={type}
        min={min}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
        style={{
          border: error ? `1.5px solid ${RED_INK}` : f ? '1.5px solid #7333FF' : '1.5px solid #EBE2FF', background: '#F7F3FF', borderRadius: 12,
          padding: type === 'date' ? '12px 16px' : '13px 16px', fontFamily: 'inherit', fontSize: 15, outline: 'none', color: '#340057', width: '100%', boxSizing: 'border-box',
        }}
      />
      {error && <div id={errId} data-testid={'quote-error-' + testId} style={{ fontSize: 13, fontWeight: 600, color: RED_INK }}>{error}</div>}
    </div>
  );
}

const alertBox: CSSProperties = { marginTop: 10, background: '#FFE2E7', borderRadius: 10, padding: '11px 14px', fontSize: 13.5, fontWeight: 600, color: '#8A0F2B' };
const EMPTY: Record<Field, string> = { name: '', company: '', email: '', phone: '', groupSize: '', preferredDate: '', programme: '', message: '' };

/** The quote request at the foot of every packages page (#quote); the corporate page words it for teams. */
export function QuoteForm({ anchorRef, corporate }: { anchorRef: RefObject<HTMLDivElement>; corporate: boolean }) {
  const t = useT();
  const uid = useId().replace(/:/g, '');
  const fid = (f: Field) => `q${uid}-${f}`;
  const [v, setV] = useState<Record<Field, string>>(EMPTY);
  const [errs, setErrs] = useState<Errors>({});
  const [qSent, setQSent] = useState(false);
  const [qBusy, setQBusy] = useState(false);
  const [qFail, setQFail] = useState('');

  // a card's "Request a quote" names its programme: prefill the field
  useEffect(() => {
    const on = (e: Event) => {
      const p = (e as CustomEvent<string>).detail;
      if (typeof p === 'string') { setV((x) => ({ ...x, programme: p })); setQSent(false); }
    };
    window.addEventListener(QUOTE_PROGRAMME_EVENT, on);
    return () => window.removeEventListener(QUOTE_PROGRAMME_EVENT, on);
  }, []);

  const set = (f: Field) => (val: string) => {
    setV((x) => ({ ...x, [f]: val }));
    if (errs[f]) setErrs((x) => ({ ...x, [f]: undefined }));
  };

  /** The translated message for a field (the API's own wording picks between the two date cases). */
  const fieldMsg = (f: Field, server = ''): string => {
    switch (f) {
      case 'name': return t('Please add your name.');
      case 'email': return t('Please add a valid email address.');
      case 'phone': return t('Please check the phone number.');
      case 'preferredDate': return /later|past/i.test(server) ? t('Please pick today or a later date.') : t('Please pick a real date.');
      default: return t('Please check this field.');
    }
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!v.name.trim()) e.name = fieldMsg('name');
    if (!EMAIL_RE.test(v.email.trim())) e.email = fieldMsg('email');
    if (v.phone.trim() && !PHONE_RE.test(v.phone.trim())) e.phone = fieldMsg('phone');
    if (v.preferredDate) {
      if (!DATE_RE.test(v.preferredDate) || Number.isNaN(Date.parse(v.preferredDate))) e.preferredDate = fieldMsg('preferredDate');
      else if (v.preferredDate < todayIso()) e.preferredDate = fieldMsg('preferredDate', 'later');
    }
    return e;
  };

  const focusFirst = (e: Errors) => {
    const first = (Object.keys(e) as Field[]).find((k) => e[k]);
    if (first) document.getElementById(fid(first))?.focus();
  };

  const quoteSubmit = async () => {
    if (qBusy) return;
    const e = validate();
    setErrs(e);
    setQFail('');
    if (Object.values(e).some(Boolean)) { focusFirst(e); return; }
    setQBusy(true);
    try {
      const body: QuoteRequest & { programme?: string } = {
        name: v.name.trim(),
        company: v.company.trim() || undefined,
        email: v.email.trim(),
        phone: v.phone.trim() || undefined,
        groupSize: v.groupSize.trim() || undefined,
        preferredDate: v.preferredDate || undefined,
        programme: v.programme.trim() || undefined,
        message: v.message.trim() || undefined,
      };
      await createQuote(body);
      setQSent(true);
    } catch (err) {
      const status = httpStatus(err);
      if (status === 400) {
        // the API names the fields it refused ("preferredDate must be ..."): show each next to its own field
        const se: Errors = {};
        for (const part of errorMessage(err).split(/,\s*/)) {
          const f = API_FIELDS.find((k) => part.startsWith(k + ' ') || part.startsWith('property ' + k + ' '));
          if (f && !se[f]) se[f] = fieldMsg(f, part);
        }
        if (Object.keys(se).length) { setErrs(se); focusFirst(se); return; }
      }
      // "Request sent" only when the desk really has it: a failed send shows why and keeps the form.
      setQFail(status === 429
        ? t('Too many requests from this connection. Please try again in a few minutes, or write to sales@vallepark.com.')
        : t('We could not send your request. Please try again, or write to sales@vallepark.com.'));
    } finally {
      setQBusy(false);
    }
  };
  const qReplyTo = v.email.trim() || v.phone.trim() || t('your inbox');
  const hasErrors = Object.values(errs).some(Boolean);

  return (
    <div id="quote" ref={anchorRef} style={{ marginTop: 'clamp(36px,5vw,56px)', background: '#FFFFFF', borderRadius: 20, overflow: 'hidden', boxShadow: '0 0 0 1.5px #EBE2FF' }}>
      <div style={{ height: 8, background: 'repeating-linear-gradient(-45deg,#33FF74 0 12px,#340057 12px 24px)' }} />
      {!qSent && (
        <form noValidate aria-labelledby={`q${uid}-title`} onSubmit={(e) => { e.preventDefault(); void quoteSubmit(); }} style={{ padding: '26px clamp(20px,3vw,34px) 30px' }}>
          <h2 id={`q${uid}-title`} style={{ ...BLACK_ITALIC, margin: 0, fontSize: 'clamp(24px,3vw,34px)', lineHeight: 1.05, textTransform: 'uppercase', transform: 'rotate(-2deg)', transformOrigin: 'left bottom', color: '#340057' }}>{corporate ? t('Ready to strengthen your team?') : t('Plan it with us')}</h2>
          <div style={{ fontSize: 14.5, color: 'rgba(52,0,87,.7)', marginTop: 8 }}>{corporate ? t('Tell us about your group and we will send a tailored quote.') : t('Tell us your date and party; the team sends a tailored quote within one working day.')}</div>
          <div style={{ fontSize: 13, color: 'rgba(52,0,87,.75)', marginTop: 6 }}>{t('Fields marked * are required.')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginTop: 18 }}>
            <QField id={fid('name')} testId="name" label={t('Name')} placeholder={t('Name *')} value={v.name} onChange={set('name')} autoComplete="name" required error={errs.name} />
            <QField id={fid('company')} testId="company" label={t('Company')} placeholder={t('Company')} value={v.company} onChange={set('company')} autoComplete="organization" error={errs.company} />
            <QField id={fid('email')} testId="email" label={t('Email')} placeholder={t('Email *')} type="email" inputMode="email" value={v.email} onChange={set('email')} autoComplete="email" required error={errs.email} />
            <QField id={fid('phone')} testId="phone" label={t('Phone')} placeholder={t('Phone')} type="tel" inputMode="tel" value={v.phone} onChange={set('phone')} autoComplete="tel" error={errs.phone} />
            <QField id={fid('groupSize')} testId="group-size" label={t('Group size')} placeholder={t('Group size (e.g. 40)')} value={v.groupSize} onChange={set('groupSize')} error={errs.groupSize} />
            <QField id={fid('preferredDate')} testId="date" label={t('Preferred date')} type="date" min={todayIso()} value={v.preferredDate} onChange={set('preferredDate')} error={errs.preferredDate} />
            <QField id={fid('programme')} testId="programme" label={t('Programme or package')} placeholder={t('e.g. Programme 1')} value={v.programme} onChange={set('programme')} error={errs.programme} wide />
            <QField id={fid('message')} testId="message" label={t('Message')} placeholder={t('Anything else? Objectives, timing, dietary needs…')} value={v.message} onChange={set('message')} error={errs.message} wide />
          </div>
          {hasErrors && <div role="alert" data-testid="quote-invalid" style={alertBox}>{t('Please check the fields marked above.')}</div>}
          {qFail && <div role="alert" data-testid="quote-error" style={alertBox}>{qFail}</div>}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <button type="submit" className="vbtn vbtn-primary" disabled={qBusy} aria-busy={qBusy || undefined} style={qBusy ? { cursor: 'wait' } : undefined}><BtnLabel>{qBusy ? t('Sending…') : t('Request a quote →')}</BtnLabel></button>
            <span style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(52,0,87,.75)' }}>{corporate ? t('*HRDC REFUND CONDITIONS APPLY · REPLY WITHIN 1 WORKING DAY') : t('REPLY WITHIN 1 WORKING DAY')}</span>
          </div>
        </form>
      )}
      {qSent && (
        <div role="status" style={{ padding: '34px clamp(20px,3vw,34px) 38px', textAlign: 'center' }}>
          <div aria-hidden style={{ width: 62, height: 62, borderRadius: 999, background: '#33FF74', color: '#340057', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, margin: '0 auto' }}>✓</div>
          <div style={{ ...BLACK_ITALIC, fontSize: 28, textTransform: 'uppercase', marginTop: 14 }}>{t('Request sent')}</div>
          <div style={{ fontSize: 15, color: 'rgba(52,0,87,.72)', marginTop: 8, lineHeight: 1.6 }}>{t('Thanks {name}, the events team will reply to {to} within one working day with a tailored quote.', { name: v.name, to: qReplyTo })}</div>
          <button type="button" className="vbtn vbtn-secondary" onClick={() => { setV(EMPTY); setErrs({}); setQSent(false); }} style={{ marginTop: 18 }}>{t('Send another request')}</button>
        </div>
      )}
    </div>
  );
}

const contactPill: CSSProperties = { border: '1.5px solid #EBE2FF', borderRadius: 999, padding: '9px 16px', fontSize: 13.5, fontWeight: 700 };

/** WhatsApp, e-mail and phone pills under the quote form. */
export function HostContacts() {
  const t = useT();
  return (
    <div style={{ marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, letterSpacing: '.12em', color: 'rgba(52,0,87,.75)' }}>{t('TALK TO A PARK HOST:')}</span>
      <a href="https://api.whatsapp.com/send/?phone=23052928841" target="_blank" rel="noopener" style={contactPill}>{t('Chat')} · +230 5292 8841</a>
      <a href="mailto:sales@vallepark.com" style={contactPill}>{t('Email')} · sales@vallepark.com</a>
      <a href={TEL} style={contactPill}>{t('Call')} · {PHONE}</a>
    </div>
  );
}
