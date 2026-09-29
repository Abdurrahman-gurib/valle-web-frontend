import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useSeo } from '../lib/seo';
import { paths } from '../lib/nav';
import { mur, partyLabel, fullDateFromIso } from '../lib/format';
import { fetchTicket, type TicketView } from '../lib/api';
import { Stripes } from '../components/Stripes';

const MONO = "'Chivo Mono',monospace";
const BARLOW = "'Barlow',sans-serif";

/**
 * The guest's ticket: what the QR code and the e-mailed link open. Needs the
 * token in the URL, so it is never indexed and cannot be browsed by reference.
 */
export default function TicketPage() {
  const { ref = '' } = useParams();
  const [params] = useSearchParams();
  const token = params.get('t') || '';
  useSeo({ title: `Ticket ${ref.toUpperCase()} · VALLÉ Advenature™ Park`, description: 'Your VALLÉ ticket.', noindex: true });
  const [t, setT] = useState<TicketView | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let dead = false;
    fetchTicket(ref, token)
      .then((v) => { if (!dead) setT(v); })
      .catch((e: Error & { status?: number }) => { if (!dead) setErr(e.status === 403 ? 'This ticket link is not valid. Open the link from your confirmation e-mail or WhatsApp.' : e.status === 404 ? 'We could not find this booking.' : 'Could not load the ticket right now. Please try again.'); });
    return () => { dead = true; };
  }, [ref, token]);

  const share = t ? `https://wa.me/?text=${encodeURIComponent(`My VALLÉ Advenature™ Park ticket ${t.refCode} · ${fullDateFromIso(t.visitDate) || t.visitDate} · ${t.slot} arrival\n${t.ticketUrl}`)}` : '';

  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '110px clamp(16px,3.5vw,40px) 60px', fontFamily: "'Work Sans',sans-serif", color: '#340057' }}>
      {err && (
        <div style={{ background: '#FFE2E7', border: '1.5px solid #FF3358', borderRadius: 16, padding: '16px 20px', fontWeight: 600 }}>
          {err} <Link to={paths.booking()} style={{ color: '#7333FF' }}>Book a day</Link>
        </div>
      )}
      {!t && !err && <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.12em', color: 'rgba(52,0,87,.6)' }}>LOADING YOUR TICKET…</div>}
      {t && (
        <article data-testid="ticket" style={{ background: '#FFFFFF', borderRadius: 22, overflow: 'hidden', boxShadow: '0 30px 70px -30px rgba(31,0,51,.5), 0 0 0 1.5px #EBE2FF' }}>
          <div style={{ background: '#340057', color: '#FFFFFF', padding: '20px 24px' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', opacity: 0.7 }}>VALLÉ ADVENATURE™ PARK · YOUR TICKET</div>
            <div style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: 30, marginTop: 4, textTransform: 'uppercase' }}>{t.guestName}</div>
          </div>
          <Stripes />
          <div style={{ padding: 24, textAlign: 'center' }}>
            <img src={t.qrUrl} alt={`Ticket QR code ${t.refCode}`} width={240} height={240} data-testid="ticket-qr" style={{ display: 'inline-block', border: '1.5px solid #EBE2FF', borderRadius: 14, padding: 8, background: '#FFFFFF', width: 240, height: 240 }} />
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 28, letterSpacing: '.06em', color: '#FF3358', marginTop: 12 }}>{t.refCode}</div>
            {t.status === 'cancelled' && <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 11, letterSpacing: '.12em', color: '#D91E44', fontWeight: 700 }}>THIS BOOKING WAS CANCELLED</div>}
            {t.status === 'arrived' && <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 11, letterSpacing: '.12em', color: '#1E9E4A', fontWeight: 700 }}>CHECKED IN · ENJOY THE VALLEY</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, textAlign: 'left', marginTop: 22 }}>
              <Fact tag="VISIT" value={fullDateFromIso(t.visitDate) || t.visitDate} />
              <Fact tag="ARRIVAL" value={t.slot === 'morning' ? 'Morning · 09:00–12:00' : 'Afternoon · 12:00–15:30'} />
              <Fact tag="PARTY" value={partyLabel(t.adults, t.kids)} />
              <Fact tag="RATE" value={t.rate === 'nr' ? 'Visitor' : 'Resident (bring an ID)'} />
            </div>
            <div style={{ height: 1, background: '#EBE2FF', margin: '18px 0' }} />
            {t.lines.map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', fontSize: 13.5, textAlign: 'left' }}>
                <span style={{ color: 'rgba(52,0,87,.72)' }}>{l.label}</span>
                <span style={{ fontFamily: MONO, fontWeight: 600, whiteSpace: 'nowrap' }}>{mur(l.amount)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 6, borderTop: '1px dashed #D9C9F0', fontWeight: 800, fontSize: 16 }}>
              <span>{t.payMode === 'online' ? 'Paid online' : 'To pay on arrival'}</span>
              <span style={{ fontFamily: MONO }}>{mur(t.total)}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 22 }} data-print-hide="">
              <a href={share} target="_blank" rel="noopener noreferrer" style={btn('#25D366', '#FFFFFF')}>Add to WhatsApp</a>
              <button onClick={() => window.print()} style={btn('#FFFFFF', '#340057', true)}>Save / print</button>
            </div>
            <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'rgba(52,0,87,.65)', marginTop: 18, textAlign: 'left' }}>
              Show this QR code at the gate. B102, Mare Anguilles, Chamouny · <a href="https://maps.google.com/?q=Vall%C3%A9+Advenature+Park+Chamouny" style={{ color: '#7333FF' }}>directions</a>.
              Bring closed shoes, sunscreen and water. Free cancellation: call <a href="tel:+2306604477" style={{ color: '#7333FF' }}>+230 660 44 77</a> or write to sales@vallepark.com.
            </p>
          </div>
        </article>
      )}
    </main>
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
