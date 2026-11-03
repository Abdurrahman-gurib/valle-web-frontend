import { useState, type CSSProperties, type RefObject } from 'react';
import { BtnLabel } from '../../components/ui/valle';
import { createQuote } from '../../lib/api';
import { httpStatus } from '../../lib/errors';
import { todayIso } from '../../lib/format';
import { useT } from '../../i18n';
import { BLACK_ITALIC, MONO } from './shared';

function QInput({ value, onChange, placeholder, type, min, title, style }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; min?: string; title?: string; style?: CSSProperties;
}) {
  const [f, setF] = useState(false);
  return (
    <input
      type={type}
      min={min}
      title={title}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setF(true)}
      onBlur={() => setF(false)}
      style={{
        border: f ? '1.5px solid #7333FF' : '1.5px solid #EBE2FF', background: '#F7F3FF', borderRadius: 12,
        padding: '13px 16px', fontFamily: 'inherit', fontSize: 15, outline: 'none', color: '#340057',
        ...style,
      }}
    />
  );
}

const alertBox: CSSProperties = { marginTop: 10, background: '#FFE2E7', borderRadius: 10, padding: '11px 14px', fontSize: 13.5, fontWeight: 600, color: '#D91E44' };

/** The quote request at the foot of every packages page (#quote); the corporate page words it for teams. */
export function QuoteForm({ anchorRef, corporate }: { anchorRef: RefObject<HTMLDivElement>; corporate: boolean }) {
  const t = useT();
  const [qName, setQName] = useState('');
  const [qCompany, setQCompany] = useState('');
  const [qEmail, setQEmail] = useState('');
  const [qPhone, setQPhone] = useState('');
  const [qSize, setQSize] = useState('');
  const [qDate, setQDate] = useState('');
  const [qMsg, setQMsg] = useState('');
  const [qErr, setQErr] = useState(false);
  const [qSent, setQSent] = useState(false);
  const [qBusy, setQBusy] = useState(false);
  const [qFail, setQFail] = useState('');

  const quoteSubmit = async () => {
    if (qBusy) return;
    if (!qName.trim() || !qEmail.trim()) { setQErr(true); return; }
    setQErr(false);
    setQFail('');
    setQBusy(true);
    try {
      await createQuote({
        name: qName.trim(),
        company: qCompany.trim() || undefined,
        email: qEmail.trim(),
        phone: qPhone.trim() || undefined,
        groupSize: qSize.trim() || undefined,
        preferredDate: qDate || undefined,
        message: qMsg.trim() || undefined,
      });
      setQSent(true);
    } catch (e) {
      // "Request sent" only when the desk really has it: a failed send shows why and keeps the form.
      setQFail(httpStatus(e) === 429
        ? t('Too many requests from this connection. Please try again in a few minutes, or write to sales@vallepark.com.')
        : t('We could not send your request. Please try again, or write to sales@vallepark.com.'));
    } finally {
      setQBusy(false);
    }
  };
  const qReplyTo = qEmail.trim() || qPhone.trim() || t('your inbox');

  return (
    <div id="quote" ref={anchorRef} style={{ marginTop: 'clamp(36px,5vw,56px)', background: '#FFFFFF', borderRadius: 20, overflow: 'hidden', boxShadow: '0 0 0 1.5px #EBE2FF' }}>
      <div style={{ height: 8, background: 'repeating-linear-gradient(-45deg,#33FF74 0 12px,#340057 12px 24px)' }} />
      {!qSent && (
        <div style={{ padding: '26px clamp(20px,3vw,34px) 30px' }}>
          <div style={{ ...BLACK_ITALIC, fontSize: 'clamp(24px,3vw,34px)', textTransform: 'uppercase', transform: 'rotate(-2deg)', transformOrigin: 'left bottom' }}>{corporate ? t('Ready to strengthen your team?') : t('Plan it with us')}</div>
          <div style={{ fontSize: 14.5, color: 'rgba(52,0,87,.7)', marginTop: 8 }}>{corporate ? t('Tell us about your group and we will send a tailored quote.') : t('Tell us your date and party; the team sends a tailored quote within one working day.')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, marginTop: 18 }}>
            <QInput value={qName} onChange={(v) => { setQName(v); setQErr(false); }} placeholder={t('Name *')} />
            <QInput value={qCompany} onChange={setQCompany} placeholder={t('Company')} />
            <QInput value={qEmail} onChange={(v) => { setQEmail(v); setQErr(false); }} placeholder={t('Email *')} />
            <QInput value={qPhone} onChange={setQPhone} placeholder={t('Phone')} />
            <QInput value={qSize} onChange={setQSize} placeholder={t('Group size (e.g. 40)')} />
            <QInput type="date" min={todayIso()} value={qDate} onChange={setQDate} title={t('Preferred date')} style={{ padding: '12px 16px' }} />
          </div>
          <QInput value={qMsg} onChange={setQMsg} placeholder={t('Anything else? Objectives, timing, dietary needs…')} style={{ width: '100%', marginTop: 10 }} />
          {qErr && <div role="alert" style={alertBox}>{t('Please add your name and an email so we can reply.')}</div>}
          {qFail && <div role="alert" data-testid="quote-error" style={alertBox}>{qFail}</div>}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <button type="button" className="vbtn vbtn-primary" onClick={() => { void quoteSubmit(); }} disabled={qBusy} aria-busy={qBusy || undefined} style={qBusy ? { cursor: 'wait' } : undefined}><BtnLabel>{qBusy ? t('Sending…') : t('Request a quote →')}</BtnLabel></button>
            <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(52,0,87,.7)' }}>{t('*HRDC REFUND CONDITIONS APPLY · REPLY WITHIN 1 WORKING DAY')}</span>
          </div>
        </div>
      )}
      {qSent && (
        <div style={{ padding: '34px clamp(20px,3vw,34px) 38px', textAlign: 'center' }}>
          <div style={{ width: 62, height: 62, borderRadius: 999, background: '#33FF74', color: '#340057', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, margin: '0 auto' }}>✓</div>
          <div style={{ ...BLACK_ITALIC, fontSize: 28, textTransform: 'uppercase', marginTop: 14 }}>{t('Request sent')}</div>
          <div style={{ fontSize: 15, color: 'rgba(52,0,87,.72)', marginTop: 8, lineHeight: 1.6 }}>{t('Thanks {name}, the events team will reply to {to} within one working day with a tailored quote.', { name: qName, to: qReplyTo })}</div>
          <button type="button" className="vbtn vbtn-secondary" onClick={() => setQSent(false)} style={{ marginTop: 18 }}>{t('Send another request')}</button>
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
      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: 'rgba(52,0,87,.7)' }}>{t('TALK TO A PARK HOST:')}</span>
      <a href="https://api.whatsapp.com/send/?phone=23052928841" target="_blank" rel="noopener" style={contactPill}>{t('Chat')} · +230 5292 8841</a>
      <a href="mailto:sales@vallepark.com" style={contactPill}>{t('Email')} · sales@vallepark.com</a>
      <a href="tel:+2306604477" style={contactPill}>{t('Call')} · +230 660 4477</a>
    </div>
  );
}
