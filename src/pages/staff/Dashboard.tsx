import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { StaffStats } from '../../types';
import { useStaffAuth } from '../../store/StaffAuth';
import { getStats } from '../../lib/staffApi';
import { canAccessHr, canAccessReservations, roleLabel } from '../../lib/hrApi';
import { money } from '../../lib/format';
import { useHover } from '../../hooks/useHover';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Stripes } from '../../components/Stripes';
import { Spinner, card, display, mono } from './ui';
import BookingsPanel from './BookingsPanel';
import ChatConsole from './ChatConsole';

type Tab = 'bookings' | 'chat';

/** Segmented pill, the same shape as the public site's rate switch. */
function TabBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  const [h, bind] = useHover();
  return (
    <button
      {...bind}
      onClick={onClick}
      className="press"
      style={{
        border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
        padding: '9px 20px', borderRadius: 999, whiteSpace: 'nowrap',
        background: on ? '#340057' : (h ? '#EBE2FF' : 'transparent'),
        color: on ? '#FFFFFF' : '#340057',
        transition: 'background .15s ease, color .15s ease',
      }}
    >
      {children}
    </button>
  );
}

function StatCard({ tag, value }: { tag: string; value: string }) {
  return (
    <div style={{ ...card, padding: '13px 16px', minWidth: 0 }}>
      <div style={{ ...mono, fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', color: '#7333FF' }}>{tag}</div>
      <div style={{ ...display, fontSize: 'clamp(22px,3vw,28px)', lineHeight: 1.1, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {value}
      </div>
    </div>
  );
}

function SignOutBtn({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  const [h, bind] = useHover();
  return (
    <button
      {...bind}
      onClick={onClick}
      disabled={busy}
      className="press"
      style={{
        border: '1.5px solid rgba(255,255,255,.32)', background: h ? 'rgba(255,255,255,.14)' : 'transparent',
        color: '#FFFFFF', cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 12.5,
        fontWeight: 700, padding: '7px 15px', borderRadius: 999, whiteSpace: 'nowrap', opacity: busy ? 0.6 : 1,
      }}
    >
      Sign out
    </button>
  );
}

export default function StaffDashboard() {
  const auth = useStaffAuth();
  const navigate = useNavigate();
  const narrow = useIsMobile(700);
  const [tab, setTab] = useState<Tab>('bookings');
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  // Route guard: no cookie (or it lapsed mid-session) sends the operator back.
  useEffect(() => {
    if (!auth.loading && !auth.user) navigate('/staff/login', { replace: true });
  }, [auth.loading, auth.user, navigate]);

  // Chat fires `conversation:updated` on every message, so the strip is throttled
  // rather than refetched per event.
  const lastStats = useRef(0);
  const reloadStats = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastStats.current < 10_000) return;
    lastStats.current = now;
    getStats().then(setStats).catch(() => { /* the strip just keeps its last figures */ });
  }, []);

  useEffect(() => {
    if (auth.user) reloadStats(true);
  }, [auth.user, reloadStats]);

  const signOut = async () => {
    setSigningOut(true);
    await auth.logout();
    navigate('/staff/login', { replace: true });
  };

  if (auth.loading || !auth.user) {
    return (
      <main style={{
        minHeight: '100vh', background: '#340057', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: "'Work Sans',sans-serif",
      }}>
        <Spinner size={9} />
      </main>
    );
  }

  const barSide: CSSProperties = { padding: '0 clamp(14px,3vw,28px)' };

  return (
    <main style={{
      minHeight: '100vh', background: '#F7F3FF', color: '#340057',
      fontFamily: "'Work Sans',sans-serif",
    }}>
      {/* ---- slim top bar ---- */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{
          ...barSide, background: '#340057', color: '#FFFFFF', height: 60,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{
            ...display, fontSize: 25, letterSpacing: '-0.01em', lineHeight: 1,
            transform: 'rotate(-4deg)', display: 'inline-block', flexShrink: 0,
          }}>
            VALLÉ
          </span>
          {!narrow && (
            <>
              <span style={{ width: 1, height: 22, background: 'rgba(255,255,255,.25)', flexShrink: 0 }} />
              <span style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '.18em', color: 'rgba(255,255,255,.72)' }}>
                SALES &amp; RESERVATIONS
              </span>
            </>
          )}
          <span style={{ flex: 1 }} />
          {!narrow && (
            <span style={{ ...mono, fontSize: 11, fontWeight: 600, letterSpacing: '.06em', color: 'rgba(255,255,255,.75)', whiteSpace: 'nowrap' }}>
              {auth.user.name}
            </span>
          )}
          {/* Managers hold both roles, so give them a way across. */}
          {canAccessHr(auth.user.role) && (
            <Link
              to="/hr"
              style={{
                ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '.1em',
                color: 'rgba(255,255,255,.85)', textDecoration: 'none', whiteSpace: 'nowrap',
                border: '1.5px solid rgba(255,255,255,.32)', borderRadius: 999, padding: '7px 14px',
              }}
            >
              CAREERS
            </Link>
          )}
          <SignOutBtn onClick={() => { void signOut(); }} busy={signingOut} />
        </div>
        <Stripes height={6} />
      </div>

      {/* Role gate. A careers-only account reaching this URL gets a plain
          explanation rather than a dashboard full of failed requests: the API
          already refuses it with 403, this makes the refusal legible. */}
      {!canAccessReservations(auth.user.role) ? (
        <div style={{
          ...card, maxWidth: 560, margin: '6vh auto 0', overflow: 'hidden',
          animation: 'vfadeup .35s ease both',
        }}>
          <Stripes />
          <div style={{ padding: 'clamp(22px,4vw,32px)' }}>
            <span style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color: '#7333FF' }}>
              RESTRICTED AREA
            </span>
            <h1 style={{ ...display, fontSize: 'clamp(24px,4vw,32px)', lineHeight: 0.95, margin: '10px 0 0' }}>
              You do not have access to reservations
            </h1>
            <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'rgba(52,0,87,.7)', margin: '14px 0 0' }}>
              You are signed in as {auth.user.name} ({roleLabel(auth.user.role)}). Guest bookings and
              visitor chats are limited to the reservations and manager accounts.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
              <Link
                to="/hr"
                className="press"
                style={{
                  background: '#FF3358', color: '#FFFFFF', borderRadius: 999,
                  padding: '11px 20px', fontSize: 13.5, fontWeight: 700, textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center',
                }}
              >
                Go to careers →
              </Link>
              <button
                type="button"
                onClick={() => { void signOut(); }}
                disabled={signingOut}
                className="press"
                style={{
                  border: '1.5px solid #340057', background: 'transparent', color: '#340057',
                  borderRadius: 999, padding: '11px 20px', fontSize: 13.5, fontWeight: 700,
                  cursor: signingOut ? 'default' : 'pointer',
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      ) : (
      <div style={{ padding: 'clamp(16px,3vw,26px) clamp(14px,3vw,28px) 40px', maxWidth: 1440, margin: '0 auto' }}>
        {/* ---- stat strip ---- */}
        <div style={{
          display: 'grid', gap: 12, marginBottom: 18,
          gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
        }}>
          <StatCard tag="BOOKINGS TODAY" value={stats ? String(stats.bookingsToday) : '…'} />
          <StatCard tag="ARRIVALS TODAY" value={stats ? String(stats.arrivalsToday) : '…'} />
          <StatCard tag="OPEN CHATS" value={stats ? String(stats.openChats) : '…'} />
          <StatCard tag="REVENUE THIS MONTH" value={stats ? money(stats.revenueMonth) : '…'} />
        </div>

        {/* ---- tabs ---- */}
        <div style={{
          display: 'inline-flex', gap: 4, padding: 4, marginBottom: 14,
          background: '#FFFFFF', border: '1.5px solid #EBE2FF', borderRadius: 999,
        }}>
          <TabBtn on={tab === 'bookings'} onClick={() => setTab('bookings')}>Bookings</TabBtn>
          <TabBtn on={tab === 'chat'} onClick={() => setTab('chat')}>Chat</TabBtn>
        </div>

        {/* Both panels stay mounted so the chat socket survives a tab switch. */}
        <div style={{ display: tab === 'bookings' ? 'block' : 'none' }}>
          <BookingsPanel onChanged={reloadStats} />
        </div>
        <div style={{ display: tab === 'chat' ? 'block' : 'none' }}>
          <ChatConsole active={tab === 'chat'} onChanged={reloadStats} />
        </div>
      </div>
      )}
    </main>
  );
}
