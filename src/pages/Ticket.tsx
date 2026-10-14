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
import { DayForecast, useParkStatus } from '../components/WeatherCard';
import { TicketDay } from '../components/TicketDay';
import { TicketPhotos } from '../components/TicketPhotos';
import { cn } from '@/lib/utils';

/** Arrival slot words for the share text (the API sends 'morning' / 'afternoon'). */
const SLOT_WORDS: Record<string, string> = { morning: _t('morning'), afternoon: _t('afternoon') };


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
    <main className="mx-auto max-w-[560px] px-[clamp(16px,3.5vw,40px)] pt-[110px] pb-[60px] font-sans text-valle-purple">
      {err && (
        <div className="rounded-[16px] border-[1.5px] border-valle-red bg-[#FFE2E7] px-5 py-4 font-semibold">
          {err} <Link to={paths.booking()} style={{ color: '#7333FF' }}>{t('Book a day')}</Link>
        </div>
      )}
      {!tk && !err && <div className="font-mono text-[11px] tracking-[.12em] text-valle-purple/60">{t('LOADING YOUR TICKET…')}</div>}
      {tk && (
        <article data-testid="ticket" className="overflow-hidden rounded-[22px] bg-white shadow-[0_30px_70px_-30px_rgba(31,0,51,.5),0_0_0_1.5px_#EBE2FF]">
          <div className="bg-valle-purple px-6 py-5 text-white">
            <div className="font-mono text-[10px] tracking-[.16em] opacity-70">{t('VALLÉ ADVENATURE™ PARK · YOUR TICKET')}</div>
            <div className="mt-1 font-display text-[30px] font-black uppercase italic">{tk.guestName}</div>
          </div>
          <Stripes />
          <div className="p-6 text-center">
            <img src={tk.qrUrl} alt={t('Ticket QR code {ref}', { ref: tk.refCode })} width={240} height={240} data-testid="ticket-qr" className="inline-block h-[240px] w-[240px] rounded-[14px] border-[1.5px] border-valle-lilac bg-white p-2" />
            <div className="mt-3 font-mono text-[28px] font-bold tracking-[.06em] text-valle-red">{tk.refCode}</div>
            {tk.status === 'cancelled' && <div className="mt-2 font-mono text-[11px] font-bold tracking-[.12em] text-[#D91E44]">{t('THIS BOOKING WAS CANCELLED')}</div>}
            {tk.status === 'arrived' && <div className="mt-2 font-mono text-[11px] font-bold tracking-[.12em] text-[#1E9E4A]">{t('CHECKED IN · ENJOY THE VALLEY')}</div>}
            <div className="mt-[22px] grid grid-cols-2 gap-3 text-left">
              <Fact tag={t('VISIT')} value={fullDateFromIso(tk.visitDate) || tk.visitDate} />
              <Fact tag={t('ARRIVAL')} value={tk.slot === 'morning' ? t('Morning · 09:00–12:00') : t('Afternoon · 12:00–15:30')} />
              <Fact tag={t('PARTY')} value={partyLabel(tk.adults, tk.kids)} />
              <Fact tag={t('RATE')} value={tk.rate === 'nr' ? t('Visitor') : t('Resident (bring an ID)')} />
            </div>
            <DayForecast date={tk.visitDate} style={{ marginTop: 12, justifyContent: 'center' }} />
            <TicketParkNotice />
            {tk.status === 'postponed' && <div className="mt-2 font-mono text-[11px] font-bold tracking-[.12em] text-[#8A6A00]">{t('POSTPONED · CALL US TO PICK YOUR NEW DATE')}</div>}
            {tk.group && (
                <div data-testid="ticket-group" className="mt-4 rounded-[14px] border-[1.5px] border-valle-lilac bg-[#F7F3FF] px-4 py-3 text-start text-[13.5px] leading-[1.55]">
                  <div className="font-mono text-[10px] font-bold tracking-[.14em] text-valle-violet">{t('GROUP BOOKING · {kind}', { kind: tk.group.kind.toUpperCase() })}</div>
                  <div className="mt-1 text-[15px] font-extrabold">{tk.group.organisation}</div>
                  <div>{t('Leader: {name} · {n} people · {listed} names listed', { name: tk.group.leaderName, n: tk.adults + tk.kids, listed: tk.group.participants.length })}</div>
                  {tk.group.depositAmount > (tk.paidAmount ?? 0) && <div className="mt-1 font-bold text-[#D91E44]">{t('Deposit to confirm: {amount} (bank transfer or at the desk, within 7 days)', { amount: mur(tk.group.depositAmount - (tk.paidAmount ?? 0)) })}</div>}
                </div>
            )}
            {tk.waiversRequired !== undefined && tk.waiversRequired > 0 && tk.status !== 'cancelled' && (
              <WaiverBlock group={!!tk.group} signed={tk.waiversSigned ?? 0} required={tk.waiversRequired} href={localizePath(`/waiver/${encodeURIComponent(tk.refCode)}?t=${encodeURIComponent(token)}`, lang)} />
            )}
            <div className="my-[18px] h-px bg-valle-lilac" />
            {tk.status !== 'cancelled' && <TicketDay tk={tk} />}
            {tk.status !== 'cancelled' && <TicketPhotos tk={tk} token={token} onChanged={(v) => setT(v)} />}
            {tk.lines.some((l) => l.time) && (
              <div data-testid="itinerary" className="mx-0 mt-[14px] mb-2.5 rounded-[14px] border-[1.5px] border-[#FFE94D] bg-[#FFFDE0] px-4 py-3 text-start">
                <div className="font-mono text-[10px] font-bold tracking-[.14em] text-[#8A6A00]">{t('YOUR DAY · BE AT EACH START 15 MINUTES EARLY')}</div>
                {tk.lines.filter((l) => l.time).sort((a, b) => (a.time as string).localeCompare(b.time as string)).map((l, i) => (
                  <div key={i} className="mt-1.5 flex items-baseline gap-3 text-[14px]">
                    <span className="min-w-12 font-mono font-extrabold text-valle-purple">{l.time}</span>
                    <span className="font-semibold">{l.label.replace(/ · \d{2}:\d{2}$/, '')}</span>
                  </div>
                ))}
              </div>
            )}
            {tk.lines.map((l, i) => (
              <div key={i} className="flex justify-between gap-3 py-[5px] text-left text-[13.5px]">
                <span className="text-valle-purple/72">{l.label}</span>
                <span className="font-mono font-semibold whitespace-nowrap">{mur(l.amount)}</span>
              </div>
            ))}
            {(tk.adjustmentAmount ?? 0) > 0 && (
              <div className="flex justify-between gap-3 py-[5px] text-left text-[13.5px] font-semibold text-[#1E9E4A]">
                <span>{tk.couponCode ? t('Code {code}', { code: tk.couponCode }) : t('Discount')}{tk.adjustmentNote ? ' · ' + tk.adjustmentNote : ''}</span>
                <span className="font-mono whitespace-nowrap">− {mur(tk.adjustmentAmount ?? 0)}</span>
              </div>
            )}
            <div className="mt-1.5 flex justify-between pt-2.5 text-[16px] font-extrabold" style={{ borderTop: '1px dashed #D9C9F0' }}>
              <span>{t('Total')}</span>
              <span className="font-mono">{mur(tk.total)}</span>
            </div>
            {paymentId && (
              <div data-testid="payment-outcome" data-status={payWait ? 'pending' : pay?.status ?? 'unknown'} role="status" className={cn(
                'mt-[14px] rounded-[14px] border-[1.5px] px-[14px] py-3 text-start text-[14px] font-bold',
                payWait ? 'border-[#D9C9F0] bg-[#F7F3FF] text-valle-purple' : pay?.status === 'paid' ? 'border-valle-green bg-[#E6FFEE] text-[#1E9E4A]' : 'border-valle-red bg-[#FFE2E7] text-[#D91E44]',
              )}>
                {payWait
                  ? t('Confirming your payment…')
                  : pay?.status === 'paid'
                  ? t('Payment received · {amount}. Your ticket is on its way by e-mail.', { amount: mur(pay.amount) })
                  : t('Your payment did not go through. Nothing was charged: try again, or pay at the gate.')}
              </div>
            )}
            {tk.balance !== undefined && (
              <div data-testid="ticket-balance" className={cn('mt-1.5 flex justify-between gap-3 text-[14px] font-bold', tk.balance > 0 ? 'text-[#D91E44]' : 'text-[#1E9E4A]')}>
                <span>{tk.balance > 0 ? t('To pay on arrival') : t('Paid')}</span>
                <span className="font-mono">{mur(tk.balance > 0 ? tk.balance : (tk.paidAmount ?? tk.total))}</span>
              </div>
            )}
            {canPayOnline && (tk.balance ?? 0) > 0 && tk.status !== 'cancelled' && !payWait && (
              <div data-print-hide="" className="mt-[14px]">
                <button onClick={() => { void payNow(); }} disabled={paying === 'busy'} data-testid="ticket-pay-online" className="inline-block cursor-pointer rounded-full border-0 bg-valle-green px-5 py-3 [font-size:inherit] leading-[inherit] font-bold text-valle-purple no-underline [font-family:inherit]">
                  {paying === 'busy' ? t('Opening secure payment…') : t('Pay {amount} online now', { amount: mur(tk.balance ?? 0) })}
                </button>
                {paying === 'error' && <div className="mt-1.5 text-[13px] text-[#D91E44]">{t('Online payment is not available right now. You can pay at the gate.')}</div>}
              </div>
            )}
            <div className="mt-[22px] flex flex-wrap justify-center gap-2.5" data-print-hide="">
              <a href={share} target="_blank" rel="noopener noreferrer" className={cn(BTN, 'bg-[#25D366]')} style={{ color: '#FFFFFF', textDecoration: 'none' }}>{t('Add to WhatsApp')}</a>
              <button onClick={() => window.print()} className={cn(BTN, BTN_OUTLINE, 'bg-white text-valle-purple')}>{t('Save / print')}</button>
              {tk.receiptUrl && <a href={tk.receiptUrl} target="_blank" rel="noopener noreferrer" className={cn(BTN, BTN_OUTLINE, 'bg-white')} style={{ color: '#340057', textDecoration: 'none' }}>{t('Receipt (PDF)')}</a>}
            </div>
            <ManageBooking tk={tk} token={token} onChanged={(v) => setT(v)} />
            <InstallCard style={{ marginTop: 18 }} />
            <p className="mt-[18px] text-left text-[12.5px] leading-[1.55] text-valle-purple/65">
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
function WaiverBlock({ signed, required, href, group }: { signed: number; required: number; href: string; group?: boolean }) {
  const t = useT();
  const all = signed >= required;
  return (
    <div data-testid="ticket-waivers" data-print-hide="" className={cn('mt-5 rounded-[14px] border-[1.5px] px-4 py-[14px] text-start', all ? 'border-valle-green bg-[#E6FFEE]' : 'border-[#FFE94D] bg-[#FFFDE0]')}>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="text-[15px] font-extrabold">{all ? t('Waivers signed') : group ? t('Leader: sign the waiver pack for the group') : t('Skip the queue: sign your waivers')}</div>
        <div className="font-mono text-[13px] font-bold">{t('{n} of {total} signed', { n: Math.min(signed, required), total: required })}</div>
      </div>
      {!all && <p className="mx-0 mt-1.5 mb-2.5 text-[13.5px] leading-[1.5]">{group ? t('One waiver pack for the whole group: the teacher or leader signs it once, with the participant list, and the gate is done with paperwork.') : t('Ziplines, quads and buggies need a signed safety waiver for every participant. Sign on your phone now and walk past the paperwork at the gate.')}</p>}
      <a href={href} className={cn('inline-block cursor-pointer rounded-full px-4 py-[9px] text-[13px] font-bold no-underline [font-family:inherit]', all ? 'mt-2 border-[1.5px] border-valle-purple bg-white' : 'mt-0 bg-valle-purple')} style={{ color: all ? '#340057' : '#FFFFFF', textDecoration: 'none' }}>{all ? t('View waivers') : t('Sign the waivers')}</a>
    </div>
  );
}

/** The desk's park status of the moment, only when it is not an ordinary open day. */
function TicketParkNotice() {
  const t = useT();
  const status = useParkStatus();
  if (!status || (status.state === 'open' && !status.message)) return null;
  return (
    <div data-testid="ticket-park-status" data-state={status.state} className={cn('mt-3 rounded-[12px] border-[1.5px] px-[14px] py-2.5 text-[13.5px] leading-[1.5]', status.state === 'closed' ? 'border-valle-red bg-[#FFE2E7]' : 'border-[#E6E000] bg-[#FFFFE2]')}>
      <strong className="font-mono text-[10.5px] tracking-[.14em]">{status.state === 'closed' ? t('PARK CLOSED TODAY') : status.state === 'partial' ? t('PARTLY OPEN TODAY') : t('PARK NOTICE')}</strong>
      {status.pausedNames.length > 0 && <div>{t('Paused right now: {names}', { names: status.pausedNames.join(', ') })}</div>}
      {status.message && <div>{status.message}</div>}
    </div>
  );
}

function Fact({ tag, value }: { tag: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9.5px] font-bold tracking-[.13em] text-valle-violet">{tag}</div>
      <div className="mt-[3px] text-[14px] font-semibold">{value}</div>
    </div>
  );
}

/** Pill button / link base; colours are added per use (links keep their colour inline: the global `a` rule beats utilities). */
const BTN = 'inline-block cursor-pointer rounded-full px-5 py-3 text-[14px] font-bold no-underline [font-family:inherit]';
const BTN_OUTLINE = 'border-[1.5px] border-valle-purple';
