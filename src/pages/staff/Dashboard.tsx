import { useSeo } from '../../lib/seo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { StaffStats } from '../../types';
import { useStaffAuth } from '../../store/StaffAuth';
import { getStats } from '../../lib/staffApi';
import { canAccessHr, canAccessReservations, roleLabel } from '../../lib/hrApi';
import { mur as money } from '../../lib/format';
import { useIsMobile } from '../../hooks/useIsMobile';
import { cn } from '../../lib/utils';
import { Stripes } from '../../components/Stripes';
import { Spinner, cardCls, displayCls, monoCls } from './ui';
import BookingsPanel from './BookingsPanel';
import ChatConsole from './ChatConsole';
import GatePanel from './GatePanel';
import ParkStatusPanel from './ParkStatusPanel';
import LiveOpsPanel from './LiveOpsPanel';
import CouponsPanel from './CouponsPanel';
import ReportsPanel from './ReportsPanel';
import BackupsPanel from './BackupsPanel';
import CalendarPanel from './CalendarPanel';
import ReconciliationPanel from './ReconciliationPanel';
import ForecastPanel from './ForecastPanel';
import QuotesPanel from './QuotesPanel';
import TeamPanel from './TeamPanel';
import SecurityPanel from './SecurityPanel';
import { isOwnBooking, onLive } from './liveEvents';
import { useUrlState } from './urlState';

type Tab = 'bookings' | 'gate' | 'offers' | 'reports' | 'reconciliation' | 'forecast' | 'quotes' | 'chat' | 'calendar' | 'team' | 'security';
const TABS: Tab[] = ['bookings', 'gate', 'offers', 'reports', 'reconciliation', 'forecast', 'quotes', 'chat', 'calendar', 'team', 'security'];
/** Minimum gap between two refreshes of the stats strip; a burst still ends in one trailing refresh. */
const STATS_GAP_MS = 10_000;

/** Segmented pill, the same shape as the public site's rate switch. */
function TabBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'press cursor-pointer whitespace-nowrap rounded-[999px] border-0 px-[20px] py-[9px] [font-family:inherit] text-[13.5px] font-bold',
        '[transition:background_.15s_ease,color_.15s_ease]',
        on ? 'bg-valle-purple text-white' : 'bg-transparent text-valle-purple hover:bg-valle-lilac',
      )}
    >
      {children}
    </button>
  );
}

/** One figure of the strip. Values wrap rather than truncate (a tablet is ~820 px wide). */
function StatCard({ tag, value, title, testId }: { tag: string; value: string; title?: string; testId?: string }) {
  return (
    <div className={cn(cardCls, 'min-w-0 px-[16px] py-[13px]')} title={title} data-testid={testId}>
      <div className={cn(monoCls, 'text-[9.5px] font-bold tracking-[.14em] text-valle-violet')}>
        {tag}{title ? <span aria-hidden="true" className="ms-[5px] opacity-60">ⓘ</span> : null}
      </div>
      <div className={cn(displayCls, 'mt-[4px] text-[length:clamp(20px,2.6vw,27px)] leading-[1.1] [overflow-wrap:anywhere]')}>
        {value}
      </div>
      {title && <span className="sr-only">{title}</span>}
    </div>
  );
}

function SignOutBtn({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={cn(
        'press whitespace-nowrap rounded-[999px] border-[1.5px] border-[rgba(255,255,255,.32)] bg-transparent px-[15px] py-[7px] [font-family:inherit] text-[12.5px] font-bold text-white hover:bg-[rgba(255,255,255,.14)]',
        busy ? 'cursor-default opacity-60' : 'cursor-pointer',
      )}
    >
      Sign out
    </button>
  );
}

export default function StaffDashboard() {
  useSeo({ title: 'Reservations · VALLÉ staff', description: 'Vallé back office.', noindex: true });
  const auth = useStaffAuth();
  const navigate = useNavigate();
  const narrow = useIsMobile(700);
  // the tab lives in the URL (?tab=gate), so a refresh mid-edit stays where it was
  const [params, setParams] = useUrlState();
  const urlTab = params.get('tab') as Tab | null;
  const tab: Tab = urlTab && TABS.includes(urlTab) ? urlTab : 'bookings';
  const setTab = useCallback((t: Tab) => setParams({ tab: t === 'bookings' ? null : t }), [setParams]);
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  // Route guard: no cookie (or it lapsed mid-session) sends the operator back.
  useEffect(() => {
    if (!auth.loading && !auth.user) navigate('/staff/login', { replace: true });
  }, [auth.loading, auth.user, navigate]);

  // Chat fires `conversation:updated` on every message, so the strip is throttled
  // rather than refetched per event. A throttled call is not dropped: it runs once
  // the gap is over, so a visitor's first message always reaches "Chats to answer".
  const lastStats = useRef(0);
  const trailing = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reloadStats = useCallback((force = false) => {
    const fetchNow = () => {
      if (trailing.current) { clearTimeout(trailing.current); trailing.current = null; }
      lastStats.current = Date.now();
      getStats().then(setStats).catch(() => { /* the strip just keeps its last figures */ });
    };
    const wait = STATS_GAP_MS - (Date.now() - lastStats.current);
    if (force || wait <= 0) { fetchNow(); return; }
    if (!trailing.current) trailing.current = setTimeout(fetchNow, wait);
  }, []);
  useEffect(() => () => { if (trailing.current) clearTimeout(trailing.current); }, []);

  useEffect(() => {
    if (auth.user) reloadStats(true);
  }, [auth.user, reloadStats]);

  // A booking made on the website: refresh the figures and say so, whichever tab is open.
  const [toast, setToast] = useState('');
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const offBooking = onLive('valle:booking-new', (b) => {
      if (!b?.refCode) return;
      reloadStats(true);
      // the operator's own booking from the New-booking drawer is not news to them
      if (isOwnBooking(b)) return;
      setToast(`New booking ${b.refCode} · ${b.guestName} · ${b.visitDate} ${b.slot}`);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setToast(''), 9000);
    });
    // A quote request from the packages page: same toast, so it is not missed until someone opens Quotes.
    const offQuote = onLive('valle:quote-new', (d) => {
      if (!d?.id) return;
      setToast(`New quote request · ${d.name}${d.company ? ' · ' + d.company : ''}${d.groupSize ? ' · ' + d.groupSize + ' people' : ''}${d.preferredDate ? ' · ' + d.preferredDate : ''} · see Quotes`);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setToast(''), 12000);
    });
    return () => { offBooking(); offQuote(); if (timer) clearTimeout(timer); };
  }, [reloadStats]);

  const signOut = async () => {
    setSigningOut(true);
    await auth.logout();
    navigate('/staff/login', { replace: true });
  };

  if (auth.loading || !auth.user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-valle-purple font-sans">
        <Spinner size={9} />
      </main>
    );
  }

  const barSide = 'px-[clamp(14px,3vw,28px)] py-0';

  return (
    <main className="min-h-screen bg-[#F7F3FF] font-sans text-valle-purple">
      {/* ---- slim top bar ---- */}
      <div className="sticky top-0 z-40" data-print-hide="">
        <div className={cn(barSide, 'flex h-[60px] items-center gap-[14px] bg-valle-purple text-white')}>
          <span className={cn(displayCls, 'inline-block shrink-0 text-[25px] leading-none tracking-[-0.01em] [transform:rotate(-4deg)]')}>
            VALLÉ
          </span>
          {!narrow && (
            <>
              <span className="h-[22px] w-[1px] shrink-0 bg-[rgba(255,255,255,.25)]" />
              <span className={cn(monoCls, 'text-[10px] font-bold tracking-[.18em] text-[rgba(255,255,255,.72)]')}>
                SALES &amp; RESERVATIONS
              </span>
            </>
          )}
          <span className="flex-1" />
          {!narrow && (
            <span className={cn(monoCls, 'whitespace-nowrap text-[11px] font-semibold tracking-[.06em] text-[rgba(255,255,255,.75)]')}>
              {auth.user.name}
            </span>
          )}
          {/* Managers hold both roles, so give them a way across. */}
          {canAccessHr(auth.user.role) && (
            <Link
              to="/hr"
              className={cn(monoCls, 'whitespace-nowrap rounded-[999px] border-[1.5px] border-[rgba(255,255,255,.32)] px-[14px] py-[7px] text-[11px] font-bold tracking-[.1em]')}
              style={{ color: 'rgba(255,255,255,.85)', textDecoration: 'none' }}
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
        <>
        <div className={cn(cardCls, 'mx-auto mt-[6vh] mb-0 max-w-[560px] overflow-hidden [animation:vfadeup_.35s_ease_both]')}>
          <Stripes />
          <div className="p-[clamp(22px,4vw,32px)]">
            <span className={cn(monoCls, 'text-[10px] font-bold tracking-[.14em] text-valle-violet')}>
              RESTRICTED AREA
            </span>
            <h1 className={cn(displayCls, 'mx-0 mt-[10px] mb-0 text-[length:clamp(24px,4vw,32px)] leading-[0.95]')}>
              You do not have access to reservations
            </h1>
            <p className="mx-0 mt-[14px] mb-0 text-[14.5px] leading-[1.55] text-[rgba(52,0,87,.7)]">
              You are signed in as {auth.user.name} ({roleLabel(auth.user.role)}). Guest bookings and
              visitor chats are limited to the reservations and manager accounts.
            </p>
            <div className="mt-[20px] flex flex-wrap gap-[10px]">
              <Link
                to="/hr"
                className="press inline-flex items-center rounded-[999px] bg-valle-purple px-[20px] py-[11px] text-[13.5px] font-bold"
                style={{ color: '#FFFFFF', textDecoration: 'none' }}
              >
                Go to careers →
              </Link>
              <button
                type="button"
                onClick={() => { void signOut(); }}
                disabled={signingOut}
                className={cn(
                  'press rounded-[999px] border-[1.5px] border-valle-purple bg-transparent px-[20px] py-[11px] text-[13.5px] font-bold text-valle-purple',
                  signingOut ? 'cursor-default' : 'cursor-pointer',
                )}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-[14px] mb-[40px] max-w-[560px] px-[14px] py-0"><SecurityPanel /></div>
        </>
      ) : (
      <div className="mx-auto my-0 max-w-[1440px] px-[clamp(14px,3vw,28px)] pt-[clamp(16px,3vw,26px)] pb-[40px]">
        {/* ---- stat strip ---- */}
        <div data-print-hide="" className="mb-[18px] grid grid-cols-[repeat(auto-fit,minmax(165px,1fr))] gap-[12px]">
          <StatCard tag="BOOKINGS TODAY" value={stats ? String(stats.bookingsToday) : '…'} title="Bookings made today (any visit date)" />
          <StatCard tag="ARRIVALS TODAY" value={stats ? `${stats.arrivalsToday} · ${stats.guestsToday ?? 0} guests` : '…'} title="Bookings and guests due on site today, cancellations excluded" />
          <StatCard tag="REVENUE TODAY" value={stats ? money(stats.revenueToday ?? 0) : '…'} title="Value of today's visits (by visit date), cancellations excluded" />
          <StatCard testId="stat-chats" tag="CHATS TO ANSWER" value={stats ? `${stats.unansweredChats ?? 0} of ${stats.openChats} open` : '…'} title="Open visitor chats waiting for a reply, of the open chats a visitor has written in" />
          <StatCard testId="stat-booked-month" tag="BOOKED THIS MONTH" value={stats ? money(stats.revenueMonth) : '…'} title="Value of bookings made this calendar month, whatever the visit date, cancellations excluded. Sales & reports count by visit date (Visits this month)." />
        </div>

        {/* ---- tabs ---- */}
        <div data-print-hide="" className="mb-[14px] inline-flex flex-wrap gap-[4px] rounded-[24px] border-[1.5px] border-valle-lilac bg-white p-[4px]">
          <TabBtn on={tab === 'bookings'} onClick={() => setTab('bookings')}>Bookings</TabBtn>
          <TabBtn on={tab === 'gate'} onClick={() => setTab('gate')}>Gate & waivers</TabBtn>
          <TabBtn on={tab === 'offers'} onClick={() => setTab('offers')}>Offers & codes</TabBtn>
          <TabBtn on={tab === 'reports'} onClick={() => setTab('reports')}>Sales & reports</TabBtn>
          <TabBtn on={tab === 'reconciliation'} onClick={() => setTab('reconciliation')}>Reconciliation</TabBtn>
          <TabBtn on={tab === 'forecast'} onClick={() => setTab('forecast')}>Forecast</TabBtn>
          <TabBtn on={tab === 'quotes'} onClick={() => setTab('quotes')}>Quotes</TabBtn>
          <TabBtn on={tab === 'chat'} onClick={() => setTab('chat')}>Chat</TabBtn>
          {String(auth.user.role) === 'manager' && <TabBtn on={tab === 'calendar'} onClick={() => setTab('calendar')}>Calendar</TabBtn>}
          {String(auth.user.role) === 'manager' && <TabBtn on={tab === 'team'} onClick={() => setTab('team')}>Team</TabBtn>}
          <TabBtn on={tab === 'security'} onClick={() => setTab('security')}>Security</TabBtn>
        </div>

        {toast && (
          // top right, under the bar and below every drawer (z 80+): never over a drawer's footer buttons
          <div role="status" data-testid="booking-toast" className="fixed top-[76px] right-[16px] z-[70] max-w-[min(420px,calc(100vw_-_32px))] rounded-[14px] bg-valle-purple px-[16px] py-[12px] text-[14px] font-bold text-white shadow-[0_18px_40px_-12px_rgba(38,0,64,.6)]">
            <span className="mr-[8px] text-valle-green">●</span>{toast}
          </div>
        )}

        {/* Both panels stay mounted so the chat socket survives a tab switch. */}
        <div className={tab === 'bookings' ? 'block' : 'hidden'}>
          <BookingsPanel onChanged={reloadStats} />
        </div>
        {/* the gate's job comes first (scan / look up); the park-status and live-board editors fold away */}
        {tab === 'gate' && <GatePanel onChanged={reloadStats} onOpenBooking={(ref) => setParams({ tab: null, open: ref })} />}
        {tab === 'gate' && (
          <details data-testid="gate-editors" className={cn(cardCls, 'mt-[14px] px-[16px] py-[12px]')}>
            <summary className={cn(monoCls, 'cursor-pointer text-[10.5px] font-bold tracking-[.14em] text-valle-purple')}>PARK STATUS &amp; LIVE BOARD (EDIT)</summary>
            <div className="mt-[12px] grid gap-[14px]">
              <ParkStatusPanel />
              <LiveOpsPanel />
            </div>
          </details>
        )}
        {tab === 'offers' && <CouponsPanel />}
        {tab === 'reports' && <ReportsPanel />}
        {/* managers only; the API enforces it (the StaffRole type predates the manager role) */}
        {tab === 'reports' && String(auth.user.role) === 'manager' && <BackupsPanel />}
        {tab === 'reconciliation' && <ReconciliationPanel onChanged={reloadStats} />}
        {tab === 'forecast' && <ForecastPanel />}
        {tab === 'quotes' && <QuotesPanel />}
        {tab === 'calendar' && String(auth.user.role) === 'manager' && <CalendarPanel />}
        {tab === 'team' && String(auth.user.role) === 'manager' && <TeamPanel currentUserId={auth.user.id} />}
        {tab === 'security' && <SecurityPanel />}
        <div className={tab === 'chat' ? 'block' : 'hidden'}>
          <ChatConsole active={tab === 'chat'} onChanged={reloadStats} />
        </div>
      </div>
      )}
    </main>
  );
}
