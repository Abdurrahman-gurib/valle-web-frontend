import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useSeo } from '../lib/seo';
import { paths } from '../lib/nav';
import { mur, partyLabel, fullDateFromIso } from '../lib/format';
import { fetchPaymentConfig, fetchPaymentStatus, fetchTicket, startCheckout, type PaymentStatus, type TicketView } from '../lib/api';
import { Stripes } from '../components/Stripes';
import { localizePath, tr, useLang, useT, _t } from '../i18n';
import { InstallCard } from '../components/InstallApp';
import { ManageBooking } from './ManageBooking';

/** Arrival slot words for the share text (the API sends 'morning' / 'afternoon'). */
const SLOT_WORDS: Record<string, string> = { morning: _t('morning'), afternoon: _t('afternoon') };

const MONO = "'Chivo Mono',monospace";
const BARLOW = "'Barlow',sans-serif";

/**
 * The guest's ticket: what the QR code and the e-mailed link open. Needs the
 * token in the URL, so it is never indexed and cannot be browsed by reference.
 */
export default function TicketPage() {
  const t = useT();
  const lang = useLang();
  const { ref = '' } = useParams();
  const [params] = useSearchParams();
  const token = params.get('t') || '';
  useSeo({ title: t('Ticket {ref} · VALLÉ Advenature™ Park', { ref: ref.toUpperCase() }), description: t('Your VALLÉ ticket.'), noindex: true });
  const [tk, setT] = useState<TicketView | null>(null);
  const [err, setErr] = useState('');
  // ?payment=<id>: back from the hosted checkout; poll until the provider's webhook has settled it
  const paymentId = params.get('payment') || '';
  const [pay, setPay] = useState<PaymentStatus | null>(null);
  const [payWait, setPayWait] = useState(!!paymentId);
  const [reload, setReload] = useState(0);
  const [canPayOnline, setCanPayOnline] = useState(false);
  const [paying, setPaying] = useState('');
  useEffect(() => {
    let dead = false;
    void fetchPaymentConfig().then((c) => { if (!dead) setCanPayOnline(c.enabled); });
    return () => { dead = true; };
  }, []);
  useEffect(() => {
    if (!paymentId || !token) return;
    let dead = false;
    let tries = 0;
    const tick = async () => {
      if (dead) return;
      try {
        const s = await fetchPaymentStatus(paymentId, token);
        if (dead) return;
        if (s.status !== 'pending' || tries >= 20) { setPay(s); setPayWait(false); setReload((n) => n + 1); return; }
      } catch { if (tries >= 20) { setPayWait(false); return; } }
      tries++;
      setTimeout(() => { void tick(); }, 1500);
    };
    void tick();
    return () => { dead = true; };
  }, [paymentId, token]);
  const payNow = async () => {
    if (!tk) return;
    setPaying('busy');
    try {
      const { checkoutUrl } = await startCheckout(tk.refCode, token);
      window.location.assign(checkoutUrl);
    } catch { setPaying('error'); }
  };

  useEffect(() => {
    let dead = false;
    fetchTicket(ref, token)
      .then((v) => { if (!dead) setT(v); })
      .catch((e: Error & { status?: number }) => { if (!dead) setErr(e.status === 403 ? tr('This ticket link is not valid. Open the link from your confirmation e-mail or WhatsApp.') : e.status === 404 ? tr('We could not find this booking.') : tr('Could not load the ticket right now. Please try again.')); });
    return () => { dead = true; };
  }, [ref, token, reload]);

  const share = tk ? `https://wa.me/?text=${encodeURIComponent(t('My VALLÉ Advenature™ Park ticket {ref} · {date} · {slot} arrival', { ref: tk.refCode, date: fullDateFromIso(tk.visitDate) || tk.visitDate, slot: t(SLOT_WORDS[tk.slot] ?? tk.slot) }) + '\n' + tk.ticketUrl)}` : '';

  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '110px clamp(16px,3.5vw,40px) 60px', fontFamily: "'Work Sans',sans-serif", color: '#340057' }}>
      {err && (
        <div style={{ background: '#FFE2E7', border: '1.5px solid #FF3358', borderRadius: 16, padding: '16px 20px', fontWeight: 600 }}>
          {err} <Link to={paths.booking()} style={{ color: '#7333FF' }}>{t('Book a day')}</Link>
        </div>
      )}
      {!tk && !err && <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.12em', color: 'rgba(52,0,87,.6)' }}>{t('LOADING YOUR TICKET…')}</div>}
      {tk && (
        <article data-testid="ticket" style={{ background: '#FFFFFF', borderRadius: 22, overflow: 'hidden', boxShadow: '0 30px 70px -30px rgba(31,0,51,.5), 0 0 0 1.5px #EBE2FF' }}>
          <div style={{ background: '#340057', color: '#FFFFFF', padding: '20px 24px' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', opacity: 0.7 }}>{t('VALLÉ ADVENATURE™ PARK · YOUR TICKET')}</div>
            <div style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: 30, marginTop: 4, textTransform: 'uppercase' }}>{tk.guestName}</div>
          </div>
          <Stripes />
          <div style={{ padding: 24, textAlign: 'center' }}>
            <img src={tk.qrUrl} alt={t('Ticket QR code {ref}', { ref: tk.refCode })} width={240} height={240} data-testid="ticket-qr" style={{ display: 'inline-block', border: '1.5px solid #EBE2FF', borderRadius: 14, padding: 8, background: '#FFFFFF', width: 240, height: 240 }} />
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 28, letterSpacing: '.06em', color: '#FF3358', marginTop: 12 }}>{tk.refCode}</div>
            {tk.status === 'cancelled' && <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 11, letterSpacing: '.12em', color: '#D91E44', fontWeight: 700 }}>{t('THIS BOOKING WAS CANCELLED')}</div>}
            {tk.status === 'arrived' && <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 11, letterSpacing: '.12em', color: '#1E9E4A', fontWeight: 700 }}>{t('CHECKED IN · ENJOY THE VALLEY')}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, textAlign: 'left', marginTop: 22 }}>
              <Fact tag={t('VISIT')} value={fullDateFromIso(tk.visitDate) || tk.visitDate} />
              <Fact tag={t('ARRIVAL')} value={tk.slot === 'morning' ? t('Morning · 09:00–12:00') : t('Afternoon · 12:00–15:30')} />
              <Fact tag={t('PARTY')} value={partyLabel(tk.adults, tk.kids)} />
              <Fact tag={t('RATE')} value={tk.rate === 'nr' ? t('Visitor') : t('Resident (bring an ID)')} />
            </div>
            {tk.status === 'postponed' && <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 11, letterSpacing: '.12em', color: '#8A6A00', fontWeight: 700 }}>{t('POSTPONED · CALL US TO PICK YOUR NEW DATE')}</div>}
            {tk.waiversRequired !== undefined && tk.waiversRequired > 0 && tk.status !== 'cancelled' && (
              <WaiverBlock signed={tk.waiversSigned ?? 0} required={tk.waiversRequired} href={localizePath(`/waiver/${encodeURIComponent(tk.refCode)}?t=${encodeURIComponent(token)}`, lang)} />
            )}
            <div style={{ height: 1, background: '#EBE2FF', margin: '18px 0' }} />
            {tk.lines.map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', fontSize: 13.5, textAlign: 'left' }}>
                <span style={{ color: 'rgba(52,0,87,.72)' }}>{l.label}</span>
                <span style={{ fontFamily: MONO, fontWeight: 600, whiteSpace: 'nowrap' }}>{mur(l.amount)}</span>
              </div>
            ))}
            {(tk.adjustmentAmount ?? 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', fontSize: 13.5, textAlign: 'left', color: '#1E9E4A', fontWeight: 600 }}>
                <span>{tk.couponCode ? t('Code {code}', { code: tk.couponCode }) : t('Discount')}{tk.adjustmentNote ? ' · ' + tk.adjustmentNote : ''}</span>
                <span style={{ fontFamily: MONO, whiteSpace: 'nowrap' }}>− {mur(tk.adjustmentAmount ?? 0)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 6, borderTop: '1px dashed #D9C9F0', fontWeight: 800, fontSize: 16 }}>
              <span>{t('Total')}</span>
              <span style={{ fontFamily: MONO }}>{mur(tk.total)}</span>
            </div>
            {paymentId && (
              <div data-testid="payment-outcome" data-status={payWait ? 'pending' : pay?.status ?? 'unknown'} role="status" style={{
                marginTop: 14, borderRadius: 14, padding: '12px 14px', fontSize: 14, fontWeight: 700, textAlign: 'start',
                background: payWait ? '#F7F3FF' : pay?.status === 'paid' ? '#E6FFEE' : '#FFE2E7',
                border: `1.5px solid ${payWait ? '#D9C9F0' : pay?.status === 'paid' ? '#33FF74' : '#FF3358'}`,
                color: payWait ? '#340057' : pay?.status === 'paid' ? '#1E9E4A' : '#D91E44',
              }}>
                {payWait
                  ? t('Confirming your payment…')
                  : pay?.status === 'paid'
                  ? t('Payment received · {amount}. Your ticket is on its way by e-mail.', { amount: mur(pay.amount) })
                  : t('Your payment did not go through. Nothing was charged: try again, or pay at the gate.')}
              </div>
            )}
            {tk.balance !== undefined && (
              <div data-testid="ticket-balance" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 6, fontSize: 14, fontWeight: 700, color: tk.balance > 0 ? '#D91E44' : '#1E9E4A' }}>
                <span>{tk.balance > 0 ? t('To pay on arrival') : t('Paid')}</span>
                <span style={{ fontFamily: MONO }}>{mur(tk.balance > 0 ? tk.balance : (tk.paidAmount ?? tk.total))}</span>
              </div>
            )}
            {canPayOnline && (tk.balance ?? 0) > 0 && tk.status !== 'cancelled' && !payWait && (
              <div data-print-hide="" style={{ marginTop: 14 }}>
                <button onClick={() => { void payNow(); }} disabled={paying === 'busy'} data-testid="ticket-pay-online" style={{ ...btn('#33FF74', '#340057'), border: 0, cursor: 'pointer', font: 'inherit', fontWeight: 700 }}>
                  {paying === 'busy' ? t('Opening secure payment…') : t('Pay {amount} online now', { amount: mur(tk.balance ?? 0) })}
                </button>
                {paying === 'error' && <div style={{ color: '#D91E44', fontSize: 13, marginTop: 6 }}>{t('Online payment is not available right now. You can pay at the gate.')}</div>}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 22 }} data-print-hide="">
              <a href={share} target="_blank" rel="noopener noreferrer" style={btn('#25D366', '#FFFFFF')}>{t('Add to WhatsApp')}</a>
              <button onClick={() => window.print()} style={btn('#FFFFFF', '#340057', true)}>{t('Save / print')}</button>
              {tk.receiptUrl && <a href={tk.receiptUrl} target="_blank" rel="noopener noreferrer" style={btn('#FFFFFF', '#340057', true)}>{t('Receipt (PDF)')}</a>}
            </div>
            <ManageBooking tk={tk} token={token} onChanged={(v) => setT(v)} />
            <InstallCard style={{ marginTop: 18 }} />
            <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'rgba(52,0,87,.65)', marginTop: 18, textAlign: 'left' }}>
              {t('Show this QR code at the gate. B102, Mare Anguilles, Chamouny ·')} <a href="https://maps.google.com/?q=Vall%C3%A9+Advenature+Park+Chamouny" style={{ color: '#7333FF' }}>{t('directions')}</a>.{' '}
              {t('Bring closed shoes, sunscreen and water. Free cancellation: call')} <a href="tel:+2306604477" style={{ color: '#7333FF' }}>+230 660 44 77</a> {t('or write to {email}.', { email: 'sales@vallepark.com' })}
            </p>
          </div>
        </article>
      )}
    </main>
  );
}

/** Waiver progress on the ticket, with the way to the form while anyone still has to sign. */
function WaiverBlock({ signed, required, href }: { signed: number; required: number; href: string }) {
  const t = useT();
  const all = signed >= required;
  return (
    <div data-testid="ticket-waivers" data-print-hide="" style={{ marginTop: 20, textAlign: 'start', background: all ? '#E6FFEE' : '#FFFDE0', border: `1.5px solid ${all ? '#33FF74' : '#FFE94D'}`, borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>{all ? t('Waivers signed') : t('Skip the queue: sign your waivers')}</div>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 13 }}>{t('{n} of {total} signed', { n: Math.min(signed, required), total: required })}</div>
      </div>
      {!all && <p style={{ margin: '6px 0 10px', fontSize: 13.5, lineHeight: 1.5 }}>{t('Ziplines, quads and buggies need a signed safety waiver for every participant. Sign on your phone now and walk past the paperwork at the gate.')}</p>}
      <a href={href} style={{ ...btn(all ? '#FFFFFF' : '#340057', all ? '#340057' : '#FFFFFF', all), padding: '9px 16px', fontSize: 13, marginTop: all ? 8 : 0 }}>{all ? t('View waivers') : t('Sign the waivers')}</a>
    </div>
  );
}

function Fact({ tag, value }: { tag: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '.13em', color: '#7333FF' }}>{tag}</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 3 }}>{value}</div>
    </div>
  );
}

const btn = (bg: string, fg: string, outline = false) => ({
  background: bg, color: fg, border: outline ? '1.5px solid #340057' : 0, borderRadius: 999, padding: '12px 20px', fontWeight: 700, fontSize: 14,
  textDecoration: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-block',
});
