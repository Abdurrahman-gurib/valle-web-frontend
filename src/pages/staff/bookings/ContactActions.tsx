import { useEffect, useState, type CSSProperties } from 'react';
import { getGateView, resendTicket, resendWaiver, type BookingDetailFull } from '../../../lib/staffApi';
import { mur as money, partyLabel } from '../../../lib/format';
import { cn } from '../../../lib/utils';
import { dateTimeSec, shortDate } from '../ui';
import { rateLabel, slotLabel } from './shared';

/** Phone number as a wa.me target: digits only, no leading zeros or plus. */
const waDigits = (phone: string | null | undefined): string => (phone || '').replace(/\D/g, '').replace(/^0+/, '');

/** A confirmation the desk can paste into WhatsApp, an e-mail or an SMS. */
function confirmationText(d: BookingDetailFull): string {
  const lines = (d.lines || []).map((l) => `• ${l.label}: ${money(l.amount)}`).join('\n');
  return [
    `VALLÉ Advenature™ Park · booking ${d.refCode}`,
    `Guest: ${d.guestName} · ${partyLabel(d.adults, d.kids)} · ${rateLabel(d.rate)}`,
    `Visit: ${shortDate(d.visitDate)}, ${slotLabel(d.slot).toLowerCase()} arrival (${d.slot === 'morning' ? '09:00–12:00' : '12:00–15:30'})`,
    lines,
    `Total: ${money(d.total)} · ${(d.balance ?? d.total) > 0 ? `${money(d.balance ?? d.total)} to pay on arrival` : 'paid'}`,
    d.ticketUrl ? `Your ticket with QR code: ${d.ticketUrl}` : '',
    'Show it at the gate. B102, Mare Anguilles, Chamouny · +230 660 44 77',
  ].filter(Boolean).join('\n');
}

/**
 * A resend button's note: '…' while sending, then what went out (or why not)
 * for four seconds.
 */
function useSendNote(send: () => Promise<{ email?: boolean; whatsapp?: boolean }>) {
  const [note, setNote] = useState('');
  const run = async () => {
    setNote('…');
    try {
      const r = await send();
      setNote(r.email || r.whatsapp ? `Sent${r.email ? ' by e-mail' : ''}${r.whatsapp ? ' and WhatsApp' : ''} ✓` : 'Nothing sent: no e-mail / mail is off');
    } catch {
      setNote('Could not send');
    }
    setTimeout(() => setNote(''), 4000);
  };
  return [note, run] as const;
}

/** WhatsApp / call / e-mail the guest, or copy the confirmation to paste anywhere. */
export function ContactActions({ data }: { data: BookingDetailFull }) {
  const [copied, setCopied] = useState(false);
  const [resent, resend] = useSendNote(() => resendTicket(data.refCode));
  const [waiverSent, sendWaiver] = useSendNote(() => resendWaiver(data.refCode));
  const [waivers, setWaivers] = useState<{ signed: number; required: number; url: string } | null>(null);
  useEffect(() => {
    let dead = false;
    getGateView(data.refCode)
      .then((g) => { if (!dead) setWaivers({ signed: g.signedCount, required: g.required, url: g.waiverUrl }); })
      .catch(() => { /* older API: no waivers */ });
    return () => { dead = true; };
  }, [data.refCode]);
  const wa = waDigits(data.phone);
  const text = confirmationText(data);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ }
  };
  const a = 'cursor-pointer whitespace-nowrap rounded-full border-[1.5px] border-solid border-valle-purple bg-white px-3 py-[7px] [font-family:inherit] text-[12px] font-bold';
  const btn = cn(a, 'text-valle-purple no-underline');
  // global a{color} rules beat utilities, so link colour stays inline
  const link: CSSProperties = { color: '#340057', textDecoration: 'none' };
  const waiversDone = waivers ? (waivers.signed >= waivers.required ? '#1E9E4A' : '#D91E44') : undefined;
  return (
    <div className="mb-4 flex flex-wrap gap-1.5" data-testid="contact-actions">
      {wa && <a href={`https://wa.me/${wa}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className={a} style={link}>WhatsApp</a>}
      {data.phone && <a href={`tel:${data.phone.replace(/\s+/g, '')}`} className={a} style={link}>Call</a>}
      {data.email && <a href={`mailto:${data.email}?subject=${encodeURIComponent('Your VALLÉ booking ' + data.refCode)}&body=${encodeURIComponent(text)}`} className={a} style={link}>E-mail</a>}
      <button type="button" onClick={() => { void copy(); }} className={cn(btn, copied && 'bg-[#E2FFEB]')}>{copied ? 'Copied ✓' : 'Copy confirmation'}</button>
      {data.ticketUrl && <a href={data.ticketUrl} target="_blank" rel="noopener noreferrer" className={a} style={link}>Ticket</a>}
      <button type="button" onClick={() => { void resend(); }} disabled={resent === '…'} data-testid="resend-ticket" className={cn(btn, resent && resent !== '…' && 'bg-[#E2FFEB]')}>{resent || 'Resend ticket'}</button>
      {waivers && (
        <a href={waivers.url} target="_blank" rel="noopener noreferrer" data-testid="drawer-waivers" title="Waiver form for this booking (send it to the guest)" className={a} style={{ ...link, borderColor: waiversDone, color: waiversDone }}>
          Waivers {Math.min(waivers.signed, waivers.required)}/{waivers.required}
        </a>
      )}
      {waivers && waivers.signed < waivers.required && data.status !== 'cancelled' && (
        <button type="button" onClick={() => { void sendWaiver(); }} disabled={waiverSent === '…'} data-testid="resend-waiver" title="E-mail (and WhatsApp when possible) the link to sign the waivers" className={cn(btn, waiverSent && waiverSent !== '…' && 'bg-[#E2FFEB]')}>
          {waiverSent || 'Resend waiver form'}
        </button>
      )}
      {data.ticketSentAt && <span className="self-center font-mono text-[9.5px] tracking-[.08em] text-valle-purple/50">TICKET SENT {dateTimeSec(data.ticketSentAt).toUpperCase()}</span>}
    </div>
  );
}
