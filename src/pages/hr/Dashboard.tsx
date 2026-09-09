import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStaffAuth } from '../../store/StaffAuth';
import { canAccessHr, canAccessReservations, getHrStats, roleLabel, type HrStats } from '../../lib/hrApi';
import { color, radius } from '../../styles/theme';
import { useHover } from '../../hooks/useHover';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Stripes } from '../../components/Stripes';
import { Spinner, display, mono } from '../staff/ui';
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

const cardStyle: CSSProperties = {
  background: color.white, border: '1.5px solid ' + color.border, borderRadius: radius.lg,
};

function TabBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  const [h, bind] = useHover();
  return (
    <button
      {...bind}
      type="button"
      onClick={onClick}
      className="press"
      style={{
        border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
        padding: '9px 20px', borderRadius: radius.pill, whiteSpace: 'nowrap',
        background: on ? color.purple : (h ? color.border : 'transparent'),
        color: on ? color.white : color.purple,
        transition: 'background .15s ease, color .15s ease',
      }}
    >
      {children}
    </button>
  );
}

function StatCard({ tag, value }: { tag: string; value: string }) {
  return (
    <div style={{ ...cardStyle, padding: '13px 16px', minWidth: 0 }}>
      <div style={{ ...mono, fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', color: color.violet }}>{tag}</div>
      <div style={{
        ...display, fontSize: 'clamp(22px,3vw,28px)', lineHeight: 1.1, marginTop: 4,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {value}
      </div>
    </div>
  );
}

/** Outlined pill in the top bar: sign out, and the manager's hop to /staff. */
function BarBtn({ children, onClick, to, disabled }: {
  children: string; onClick?: () => void; to?: string; disabled?: boolean;
}) {
  const [h, bind] = useHover();
  const skin: CSSProperties = {
    border: '1.5px solid rgba(255,255,255,.32)',
    background: h && !disabled ? 'rgba(255,255,255,.14)' : 'transparent',
    color: color.white, cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
    fontSize: 12.5, fontWeight: 700, padding: '7px 15px', borderRadius: radius.pill,
    whiteSpace: 'nowrap', opacity: disabled ? 0.6 : 1, textDecoration: 'none',
    display: 'inline-flex', alignItems: 'center',
  };
  if (to) return <Link {...bind} to={to} className="press" style={skin}>{children}</Link>;
  return <button {...bind} type="button" onClick={onClick} disabled={disabled} className="press" style={skin}>{children}</button>;
}

function Shell({ children, right, subtitle, narrow }: {
  children: ReactNode; right: ReactNode; subtitle: string; narrow: boolean;
}) {
  return (
    <main style={{
      minHeight: '100vh', background: color.tint, color: color.purple,
      fontFamily: "'Work Sans',sans-serif",
    }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{
          padding: '0 clamp(14px,3vw,28px)', background: color.purple, color: color.white, height: 60,
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
                {subtitle}
              </span>
            </>
          )}
          <span style={{ flex: 1 }} />
          {right}
        </div>
        <Stripes height={6} />
      </div>
      <div style={{ padding: 'clamp(16px,3vw,26px) clamp(14px,3vw,28px) 40px', maxWidth: 1440, margin: '0 auto' }}>
        {children}
      </div>
    </main>
  );
}

export default function HrDashboard() {
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
      <main style={{
        minHeight: '100vh', background: color.purple, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: "'Work Sans',sans-serif",
      }}>
        <Spinner size={9} />
      </main>
    );
  }

  const barRight = (
    <>
      {!barNarrow && (
        <span style={{
          ...mono, fontSize: 11, fontWeight: 600, letterSpacing: '.06em',
          color: 'rgba(255,255,255,.75)', whiteSpace: 'nowrap',
        }}>
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
        <div style={{
          ...cardStyle, maxWidth: 560, margin: '6vh auto 0', overflow: 'hidden',
          animation: 'vfadeup .35s ease both',
        }}>
          <Stripes />
          <div style={{ padding: 'clamp(22px,4vw,32px)' }}>
            <span style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color: color.violet }}>
              RESTRICTED AREA
            </span>
            <h1 style={{ ...display, fontSize: 'clamp(24px,4vw,32px)', lineHeight: 0.95, margin: '10px 0 0' }}>
              You do not have access to the careers back office
            </h1>
            <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'rgba(52,0,87,.7)', margin: '14px 0 0' }}>
              You are signed in as {auth.user.name} ({roleLabel(auth.user.role)}). Hiring is limited to
              the people and manager accounts. Ask a manager if you need it opened up.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
              <Link
                to="/staff"
                className="press"
                style={{
                  background: color.pink, color: color.white, borderRadius: radius.pill,
                  padding: '11px 20px', fontSize: 13.5, fontWeight: 700, textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center',
                }}
              >
                Back to reservations →
              </Link>
              <button
                type="button"
                onClick={() => { void signOut(); }}
                disabled={signingOut}
                className="press"
                style={{
                  border: '1.5px solid ' + color.border, background: 'transparent', color: color.purple,
                  borderRadius: radius.pill, padding: '11px 20px', fontSize: 13.5, fontWeight: 700,
                  cursor: signingOut ? 'default' : 'pointer', fontFamily: 'inherit',
                }}
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
      <div style={{
        display: 'grid', gap: 12, marginBottom: 18,
        gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
      }}>
        <StatCard tag="OPEN ROLES" value={stats ? String(stats.openVacancies) : '…'} />
        <StatCard tag="DRAFTS" value={stats ? String(stats.draftVacancies) : '…'} />
        <StatCard tag="NEW APPLICATIONS" value={stats ? String(stats.newApplications) : '…'} />
        <StatCard tag="APPLIED THIS WEEK" value={stats ? String(stats.applicationsThisWeek) : '…'} />
      </div>

      {/* ---- tabs ---- */}
      <div style={{
        display: 'inline-flex', gap: 4, padding: 4, marginBottom: 14,
        background: color.white, border: '1.5px solid ' + color.border, borderRadius: radius.pill,
      }}>
        <TabBtn on={tab === 'vacancies'} onClick={() => setTab('vacancies')}>Vacancies</TabBtn>
        <TabBtn on={tab === 'applicants'} onClick={() => setTab('applicants')}>Applicants</TabBtn>
      </div>

      {/* Both stay mounted so filters and the search box survive a tab switch. */}
      <div style={{ display: tab === 'vacancies' ? 'block' : 'none' }}>
        <VacanciesPanel narrow={narrow} onChanged={reloadStats} />
      </div>
      <div style={{ display: tab === 'applicants' ? 'block' : 'none' }}>
        <ApplicantsPanel narrow={narrow} onChanged={reloadStats} />
      </div>
    </Shell>
  );
}
