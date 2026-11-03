import { useApp } from '../../store/AppStore';
import { money, mur } from '../../lib/format';
import { BtnLabel } from '@/components/ui/valle';
import { InstallCard } from '../../components/InstallApp';
import { localizePath, useT } from '../../i18n';
import { BARLOW, MONO } from './bookingUi';

/** The waiver form sits next to the ticket: same reference, same token, in the page's language. */
function waiverHref(ticketUrl: string): string {
  try {
    const u = new URL(ticketUrl, window.location.origin);
    return localizePath(u.pathname.replace('/ticket/', '/waiver/') + u.search);
  } catch {
    return ticketUrl.replace('/ticket/', '/waiver/');
  }
}

export interface ConfirmedBooking {
  refCode: string;
  ticketUrl?: string;
  qrUrl?: string;
  /** Total the server charged; null when it did not say (the page's own total is shown). */
  total: number | null;
  /** The promo / partner code the server applied. */
  applied: { amount: number; note: string; code: string } | null;
}

/** The confirmation shown once the booking is written: reference, QR, lines and total. */
export function Receipt({ done, payOnline, dateSummary, slotName, partySummary, onStartOver }: {
  done: ConfirmedBooking;
  payOnline: boolean;
  dateSummary: string;
  slotName: string;
  partySummary: string;
  onStartOver: () => void;
}) {
  const t = useT();
  const { name, nat, email, phone, booking, currency } = useApp();
  const { refCode, ticketUrl, qrUrl, applied } = done;
  const guestLine = (name.trim() || t('Guest')) + (nat ? ' · ' + t(nat) : '');
  // Nothing is charged on the site today, so the stamp never claims a payment.
  const payStamp = payOnline ? t('PAYMENT PENDING') : t('PAY ON ARRIVAL');
  const payStampBg = payOnline ? '#E2FFEB' : '#FFFC33';
  const totalRowLabel = payOnline ? t('Total due') : t('Total on arrival');
  const receiptHint = payOnline
    ? t('Your online payment is being confirmed. Show this QR at the gate.')
    : t('Show this reference at the gate and pay there, cash or card.');
  const contactBits: string[] = [];
  if (email.trim()) contactBits.push(email.trim());
  if (phone.trim()) contactBits.push('SMS ' + phone.trim());
  const sentLine = t('CONFIRMATION & E-RECEIPT SENT TO {contact}', { contact: (contactBits.join(' · ') || t('YOUR CONTACT DETAILS')).toUpperCase() });
  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ width: '74px', height: '74px', borderRadius: '999px', background: '#33FF74', color: '#340057', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 800, margin: '10px auto 0' }}>✓</div>
      <div style={{ transform: 'rotate(-4deg)', marginTop: '22px' }}>
        <h1 style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(36px,5.2vw,62px)', lineHeight: 0.85, letterSpacing: '-0.01em', margin: 0, textTransform: 'uppercase' }}>
          {t('See you in')}<br />{t('the valley.')}
        </h1>
      </div>
      <div style={{ fontSize: '15.5px', color: 'rgba(52,0,87,.72)', marginTop: '14px', lineHeight: 1.6 }}>
        {dateSummary} · {slotName} · {partySummary}<br />{receiptHint}
      </div>
      <div style={{ fontFamily: MONO, fontSize: '11.5px', fontWeight: 600, color: '#7333FF', marginTop: '10px' }}>{sentLine}</div>
      <div style={{ margin: '24px auto 0', background: '#FFFFFF', borderRadius: '20px', padding: '0 24px 24px', maxWidth: '420px', boxShadow: '0 0 0 1.5px #EBE2FF', overflow: 'hidden' }}>
        <div style={{ height: '8px', background: 'repeating-linear-gradient(-45deg,#33FF74 0 12px,#340057 12px 24px)', margin: '0 -24px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginTop: '18px' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: MONO, fontSize: '10.5px', fontWeight: 600, letterSpacing: '.16em', color: 'rgba(52,0,87,.7)' }}>{t('BOOKING REFERENCE')}</div>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: '28px', letterSpacing: '.04em', marginTop: '6px', color: '#340057' }}>{refCode}</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(52,0,87,.75)', marginTop: '6px' }}>{guestLine}</div>
          </div>
          <span style={{ background: payStampBg, color: '#340057', fontFamily: MONO, fontSize: '10.5px', fontWeight: 700, borderRadius: '999px', padding: '8px 13px', transform: 'rotate(-4deg)', whiteSpace: 'nowrap', flexShrink: 0 }}>{payStamp}</span>
        </div>
        {qrUrl ? (
          <a href={ticketUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', margin: '18px auto 0', width: 170 }}>
            <img src={qrUrl} alt={t('Ticket QR code {ref}', { ref: refCode })} width={170} height={170} data-testid="receipt-qr" style={{ display: 'block', width: 170, height: 170, borderRadius: 14, border: '1.5px solid #EBE2FF', padding: 6, background: '#FFFFFF' }} />
            <span style={{ display: 'block', fontFamily: MONO, fontSize: '10px', letterSpacing: '.1em', color: '#7333FF', marginTop: 6 }}>{t('SHOW THIS AT THE GATE')}</span>
          </a>
        ) : (
          <div style={{ margin: '18px auto 0', width: '130px', height: '130px', borderRadius: '14px', background: 'repeating-linear-gradient(45deg,#340057 0 8px,#FFFFFF 8px 16px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ background: '#FFFFFF', fontFamily: MONO, fontSize: '10px', padding: '4px 7px', borderRadius: '6px', color: '#340057' }}>{t('QR AT GATE')}</span>
          </div>
        )}
        {ticketUrl && (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '14px' }}>
            <a href={ticketUrl} target="_blank" rel="noopener noreferrer" className="vbtn vbtn-secondary vbtn-sm">{t('Open my ticket')}</a>
            <a href={waiverHref(ticketUrl)} target="_blank" rel="noopener noreferrer" data-testid="receipt-waiver" className="vbtn vbtn-primary vbtn-sm">{t('Sign the waivers')}</a>
            <a href={`https://wa.me/?text=${encodeURIComponent(t('My VALLÉ Advenature™ Park ticket {ref} · {date} · {slot}', { ref: refCode, date: dateSummary, slot: slotName }) + '\n' + ticketUrl)}`} target="_blank" rel="noopener noreferrer" className="vbtn vbtn-secondary vbtn-sm">{t('Send to my WhatsApp')}</a>
          </div>
        )}
        <InstallCard style={{ marginTop: 16 }} />
        <div style={{ height: '1px', background: '#EBE2FF', margin: '18px 0' }} />
        {booking.lines.map((ln, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '5px 0', fontSize: '13.5px', textAlign: 'left' }}>
            <span style={{ color: 'rgba(52,0,87,.72)' }}>{ln.label}</span>
            <span style={{ fontFamily: MONO, fontWeight: 600, whiteSpace: 'nowrap' }}>{ln.amt}</span>
          </div>
        ))}
        {applied && (
          <div data-testid="receipt-adjustment" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '5px 0', fontSize: '13.5px', textAlign: 'left', color: '#1E9E4A', fontWeight: 600 }}>
            <span>{t('Code {code}', { code: applied.code })}{applied.note ? ' · ' + applied.note : ''}</span>
            <span style={{ fontFamily: MONO, whiteSpace: 'nowrap' }}>− {mur(applied.amount)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', marginTop: '6px', borderTop: '1px dashed #D9C9F0', fontWeight: 800, fontSize: '16px' }}>
          <span>{totalRowLabel}</span>
          <span style={{ fontFamily: MONO }}>{mur(done.total ?? booking.total)}</span>
        </div>
        {currency !== 'MUR' && (
          <div style={{ textAlign: 'right', fontFamily: MONO, fontSize: '11px', color: 'rgba(52,0,87,.6)', marginTop: '4px' }}>{money(booking.total)} · {t('indicative')}</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '22px', flexWrap: 'wrap' }}>
        <a
          href="https://api.whatsapp.com/send/?phone=23052928841"
          target="_blank"
          rel="noopener"
          className="vbtn vbtn-secondary"
        >{t('Questions? WhatsApp us')}</a>
        <button
          type="button"
          onClick={onStartOver}
          className="vbtn vbtn-primary"
        ><BtnLabel>{t('Back to the park →')}</BtnLabel></button>
      </div>
    </div>
  );
}
