import { useSeo } from '../../lib/seo';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStaffAuth } from '../../store/StaffAuth';
import { canAccessHr, canAccessReservations, getHrStats, roleLabel, type HrStats } from '../../lib/hrApi';
import { color } from '../../styles/theme';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Stripes } from '../../components/Stripes';
import { Spinner } from '../staff/ui';
import { cn } from '@/lib/utils';
import { NARROW } from './hrUi';
import VacanciesPanel from './VacanciesPanel';
import ApplicantsPanel from './ApplicantsPanel';

/**
 * Careers back office at `/hr`.
 *
 * Same shell as the reservations desk (purple bar, stripe rule, stat strip,
 * pill tabs) so the two areas read as one product. Roles `hr` and `manager`
 * get in; anyone else signed in sees a plain refusal with a way back, never a
 * redirect that bounces between the two dashboards.
 */

type Tab = 'vacancies' | 'applicants';

const cardCls = 'bg-white border-[1.5px] border-solid border-valle-lilac rounded-[18px]';

function TabBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'press border-0 cursor-pointer [font-family:inherit] text-[13.5px] font-bold py-[9px] px-[20px] rounded-[999px] whitespace-nowrap',
        'transition-[background,color] duration-[.15s] ease-[ease]',
        on ? 'bg-valle-purple text-white' : 'bg-transparent hover:bg-valle-lilac text-valle-purple',
      )}
    >
      {children}
    </button>
  );
}

function StatCard({ tag, value }: { tag: string; value: string }) {
  return (
    <div className={cn(cardCls, 'py-[13px] px-[16px] min-w-0')}>
      <div className="font-mono text-[9.5px] font-bold tracking-[.14em] text-valle-violet">{tag}</div>
      <div className="font-display italic font-black uppercase text-[clamp(22px,3vw,28px)] leading-[1.1] mt-[4px] whitespace-nowrap overflow-hidden text-ellipsis">
        {value}
      </div>
    </div>
  );
}

/** Outlined pill in the top bar: sign out, and the manager's hop to /staff. */
function BarBtn({ children, onClick, to, disabled }: {
  children: string; onClick?: () => void; to?: string; disabled?: boolean;
}) {
  const skin = cn(
    'press border-[1.5px] border-solid border-[rgba(255,255,255,.32)] bg-transparent [font-family:inherit]',
    'text-[12.5px] font-bold py-[7px] px-[15px] rounded-[999px] whitespace-nowrap inline-flex items-center',
    disabled ? 'cursor-default opacity-60' : 'cursor-pointer opacity-100 hover:bg-[rgba(255,255,255,.14)]',
  );
  // Link colour stays inline: the global unlayered `a { color }` rule beats utilities.
  const linkInline = { color: color.white, textDecoration: 'none' };
  if (to) return <Link to={to} className={skin} style={linkInline}>{children}</Link>;
  return <button type="button" onClick={onClick} disabled={disabled} className={cn(skin, 'text-white no-underline')}>{children}</button>;
}

function Shell({ children, right, subtitle, narrow }: {
  children: ReactNode; right: ReactNode; subtitle: string; narrow: boolean;
}) {
  return (
    <main className="min-h-screen bg-[#F7F3FF] text-valle-purple font-sans">
      <div className="sticky top-0 z-40">
        <div className="px-[clamp(14px,3vw,28px)] py-0 bg-valle-purple text-white h-[60px] flex items-center gap-[14px]">
          <span className="font-display italic font-black uppercase text-[25px] tracking-[-0.01em] leading-none -rotate-4 inline-block shrink-0">
            VALLÉ
          </span>
          {!narrow && (
            <>
              <span className="w-px h-[22px] bg-[rgba(255,255,255,.25)] shrink-0" />
              <span className="font-mono text-[10px] font-bold tracking-[.18em] text-[rgba(255,255,255,.72)]">
                {subtitle}
              </span>
            </>
          )}
          <span className="flex-1" />
          {right}
        </div>
        <Stripes height={6} />
      </div>
      <div className="pt-[clamp(16px,3vw,26px)] px-[clamp(14px,3vw,28px)] pb-[40px] max-w-[1440px] my-0 mx-auto">
        {children}
      </div>
    </main>
  );
}

export default function HrDashboard() {
  useSeo({ title: 'Careers admin · VALLÉ staff', description: 'Vallé back office.', noindex: true });
  const auth = useStaffAuth();
  const navigate = useNavigate();
  const narrow = useIsMobile(NARROW);
  const barNarrow = useIsMobile(700);
  const [tab, setTab] = useState<Tab>('vacancies');
  const [stats, setStats] = useState<HrStats | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!auth.loading && !auth.user) navigate('/staff/login', { replace: true });
  }, [auth.loading, auth.user, navigate]);

  const lastStats = useRef(0);
  const reloadStats = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastStats.current < 10_000) return;
    lastStats.current = now;
    getHrStats().then(setStats).catch(() => { /* the strip keeps its last figures */ });
  }, []);

  const allowed = canAccessHr(auth.user ? auth.user.role : null);

  useEffect(() => {
    if (auth.user && allowed) reloadStats(true);
  }, [auth.user, allowed, reloadStats]);

  const signOut = async () => {
    setSigningOut(true);
    await auth.logout();
    navigate('/staff/login', { replace: true });
  };

  if (auth.loading || !auth.user) {
    return (
      <main className="min-h-screen bg-valle-purple flex items-center justify-center font-sans">
        <Spinner size={9} />
      </main>
    );
  }

  const barRight = (
    <>
      {!barNarrow && (
        <span className="font-mono text-[11px] font-semibold tracking-[.06em] text-[rgba(255,255,255,.75)] whitespace-nowrap">
          {auth.user.name} · {roleLabel(auth.user.role)}
        </span>
      )}
      {canAccessReservations(auth.user.role) && <BarBtn to="/staff">Reservations</BarBtn>}
      <BarBtn onClick={() => { void signOut(); }} disabled={signingOut}>Sign out</BarBtn>
    </>
  );

  // ---- role gate: a clear refusal, with a way out ----
  if (!allowed) {
    return (
      <Shell right={barRight} subtitle="CAREERS & PEOPLE" narrow={barNarrow}>
        <div className={cn(cardCls, 'max-w-[560px] mt-[6vh] mx-auto mb-0 overflow-hidden animate-[vfadeup_.35s_ease_both]')}>
          <Stripes />
          <div className="p-[clamp(22px,4vw,32px)]">
            <span className="font-mono text-[10px] font-bold tracking-[.14em] text-valle-violet">
              RESTRICTED AREA
            </span>
            <h1 className="font-display italic font-black uppercase text-[clamp(24px,4vw,32px)] leading-[0.95] mt-[10px] mx-0 mb-0">
              You do not have access to the careers back office
            </h1>
            <p className="text-[14.5px] leading-[1.55] text-[rgba(52,0,87,.7)] mt-[14px] mx-0 mb-0">
              You are signed in as {auth.user.name} ({roleLabel(auth.user.role)}). Hiring is limited to
              the people and manager accounts. Ask a manager if you need it opened up.
            </p>
            <div className="flex gap-[10px] flex-wrap mt-[20px]">
              <Link
                to="/staff"
                className="press bg-valle-red rounded-[999px] py-[11px] px-[20px] text-[13.5px] font-bold inline-flex items-center"
                style={{ color: color.white, textDecoration: 'none' }}
              >
                Back to reservations →
              </Link>
              <button
                type="button"
                onClick={() => { void signOut(); }}
                disabled={signingOut}
                className={cn(
                  'press border-[1.5px] border-solid border-valle-lilac bg-transparent text-valle-purple rounded-[999px]',
                  'py-[11px] px-[20px] text-[13.5px] font-bold [font-family:inherit]',
                  signingOut ? 'cursor-default' : 'cursor-pointer',
                )}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell right={barRight} subtitle="CAREERS & PEOPLE" narrow={barNarrow}>
      {/* ---- stat strip ---- */}
      <div className="grid gap-[12px] mb-[18px] grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
        <StatCard tag="OPEN ROLES" value={stats ? String(stats.openVacancies) : '…'} />
        <StatCard tag="DRAFTS" value={stats ? String(stats.draftVacancies) : '…'} />
        <StatCard tag="NEW APPLICATIONS" value={stats ? String(stats.newApplications) : '…'} />
        <StatCard tag="APPLIED THIS WEEK" value={stats ? String(stats.applicationsThisWeek) : '…'} />
      </div>

      {/* ---- tabs ---- */}
      <div className="inline-flex gap-[4px] p-[4px] mb-[14px] bg-white border-[1.5px] border-solid border-valle-lilac rounded-[999px]">
        <TabBtn on={tab === 'vacancies'} onClick={() => setTab('vacancies')}>Vacancies</TabBtn>
        <TabBtn on={tab === 'applicants'} onClick={() => setTab('applicants')}>Applicants</TabBtn>
      </div>

      {/* Both stay mounted so filters and the search box survive a tab switch. */}
      <div className={tab === 'vacancies' ? 'block' : 'hidden'}>
        <VacanciesPanel narrow={narrow} onChanged={reloadStats} />
      </div>
      <div className={tab === 'applicants' ? 'block' : 'hidden'}>
        <ApplicantsPanel narrow={narrow} onChanged={reloadStats} />
      </div>
    </Shell>
  );
}
