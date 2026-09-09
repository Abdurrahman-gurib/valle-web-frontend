import { useCallback, useEffect, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import { useHover } from '../hooks/useHover';
import { useIsMobile } from '../hooks/useIsMobile';
import { Img } from '../components/Img';
import { Stripes } from '../components/Stripes';
import { listVacancies } from '../lib/careersApi';
import { fullDateFromIso } from '../lib/format';
import type { EmploymentType, VacancyCard } from '../types';
import { color, display, font, mono, motion, radius, shadow } from '../styles/theme';

/** Where a speculative application goes when nothing is open (or nothing fits). */
export const CAREERS_EMAIL = 'sales@vallepark.com';

const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  'full-time': 'FULL TIME',
  'part-time': 'PART TIME',
  seasonal: 'SEASONAL',
  internship: 'INTERNSHIP',
};

const EMPLOYMENT_COLOR: Record<EmploymentType, { bg: string; fg: string }> = {
  'full-time': { bg: color.green, fg: color.purple },
  'part-time': { bg: color.yellow, fg: color.purple },
  seasonal: { bg: color.violet, fg: color.white },
  internship: { bg: color.pink, fg: color.white },
};

function employmentPill(employment: EmploymentType): CSSProperties {
  const c = EMPLOYMENT_COLOR[employment] || { bg: color.tint, fg: color.purple };
  return {
    ...mono, background: c.bg, color: c.fg, borderRadius: radius.pill,
    padding: '6px 11px', whiteSpace: 'nowrap', lineHeight: 1,
  };
}

/** "Closes Thu 30 Sep 2026", or an evergreen line when the role has no end date. */
function closesLabel(closesOn: string | null): string {
  if (!closesOn) return 'OPEN UNTIL FILLED';
  const full = fullDateFromIso(closesOn.slice(0, 10));
  return full ? 'CLOSES ' + full.toUpperCase() : 'OPEN UNTIL FILLED';
}

const eyebrow: CSSProperties = { ...mono, color: color.yellow };

function RoleCard({ v, onOpen }: { v: VacancyCard; onOpen: () => void }) {
  const [h, bind] = useHover();
  const keyOpen = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); }
  };
  return (
    <div
      {...bind}
      onClick={onOpen}
      onKeyDown={keyOpen}
      role="link"
      tabIndex={0}
      aria-label={'Open role: ' + v.title}
      style={{
        cursor: 'pointer', background: color.white, borderRadius: radius.lg, padding: '20px 22px 18px',
        display: 'flex', flexDirection: 'column', gap: 10, outlineOffset: 3,
        boxShadow: h ? shadow.lifted : `0 0 0 1.5px ${color.border}`,
        transform: h ? 'translateY(-6px)' : 'none',
        transition: `transform ${motion.base}, box-shadow ${motion.base}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
        <span style={{ ...mono, color: color.violet }}>{(v.department || 'VALLÉ PARK').toUpperCase()}</span>
        <span style={employmentPill(v.employment)}>{EMPLOYMENT_LABEL[v.employment] || 'ROLE'}</span>
      </div>

      <div style={{ ...display, fontSize: 'clamp(21px,2.2vw,26px)', color: color.purple }}>{v.title}</div>

      <div style={{ ...mono, fontWeight: 400, color: 'rgba(52,0,87,.6)', letterSpacing: '.08em' }}>
        {(v.location || 'CHAMOUNY, MAURITIUS').toUpperCase()}
      </div>

      {v.summary && (
        <div style={{ fontSize: 14, lineHeight: 1.55, color: 'rgba(52,0,87,.72)', flex: 1 }}>{v.summary}</div>
      )}

      <div style={{
        marginTop: 4, paddingTop: 12, borderTop: '1px dashed #D9C9F0',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between',
      }}>
        <span style={{ ...mono, fontWeight: 400, color: 'rgba(52,0,87,.55)', letterSpacing: '.08em' }}>
          {v.salaryRange ? v.salaryRange : closesLabel(v.closesOn)}
        </span>
        <span style={{ ...mono, color: h ? color.pink : color.purple }}>VIEW ROLE →</span>
      </div>
    </div>
  );
}

/** Placeholder cards so the grid does not jump when the roles land. */
function SkeletonCard({ delay }: { delay: number }) {
  const bar = (w: string, hgt: number, mt: number): CSSProperties => ({
    width: w, height: hgt, marginTop: mt, borderRadius: radius.sm, background: color.tint,
  });
  return (
    <div
      aria-hidden
      style={{
        background: color.white, borderRadius: radius.lg, padding: '20px 22px 22px',
        boxShadow: `0 0 0 1.5px ${color.border}`, animation: `vfade .5s ease both`, animationDelay: delay + 'ms',
      }}
    >
      <div style={bar('38%', 12, 0)} />
      <div style={bar('80%', 26, 14)} />
      <div style={bar('52%', 12, 12)} />
      <div style={bar('100%', 12, 16)} />
      <div style={bar('70%', 12, 8)} />
    </div>
  );
}

function PinkLink({ label, href }: { label: string; href: string }) {
  const [h, bind] = useHover();
  return (
    <a
      {...bind}
      href={href}
      className="press"
      style={{
        border: 0, background: h ? color.pinkDark : color.pink, cursor: 'pointer', fontFamily: font.body,
        fontSize: 15, fontWeight: 700, color: color.white, padding: '14px 26px', borderRadius: radius.pill,
        boxShadow: shadow.pink, textDecoration: 'none', display: 'inline-block', whiteSpace: 'nowrap',
        transform: h ? 'translateY(-1px)' : 'none', transition: `transform ${motion.fast}, background ${motion.fast}`,
      }}
    >
      {label}
    </a>
  );
}

export default function VacanciesPage() {
  const ref = useReveal<HTMLElement>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [items, setItems] = useState<VacancyCard[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(() => {
    let live = true;
    setState('loading');
    listVacancies()
      .then((res) => {
        if (!live) return;
        setItems(res.items);
        setState('ready');
      })
      .catch(() => { if (live) setState('error'); });
    return () => { live = false; };
  }, []);

  useEffect(load, [load]);

  const openRole = (slug: string) => navigate('/vacancies/' + encodeURIComponent(slug));

  const countLabel = state === 'ready'
    ? (items.length === 0 ? 'NO ROLES OPEN RIGHT NOW' : items.length + (items.length === 1 ? ' ROLE OPEN' : ' ROLES OPEN'))
    : 'LOADING ROLES…';

  return (
    <main ref={ref} style={{ maxWidth: 1320, margin: '0 auto', padding: '104px clamp(16px,3.5vw,40px) 0' }}>
      {/* ---- hero ---- */}
      <section
        data-reveal
        style={{ background: color.purple, borderRadius: radius.xl, overflow: 'hidden', boxShadow: shadow.card }}
      >
        <Stripes height={10} />
        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.1fr .9fr',
          gap: isMobile ? 0 : 'clamp(20px,3vw,44px)', alignItems: 'stretch',
        }}>
          <div style={{ padding: 'clamp(24px,3.4vw,44px)' }}>
            <div style={eyebrow}>WE ARE HIRING · CHAMOUNY, MAURITIUS</div>
            <h1 style={{
              ...display, fontSize: 'clamp(40px,6.2vw,86px)', color: color.white, margin: '14px 0 0',
              transform: 'rotate(-4deg)', transformOrigin: 'left bottom',
            }}>
              Work in<br />the valley
            </h1>
            <p style={{
              fontSize: 'clamp(15px,1.3vw,17px)', lineHeight: 1.6, color: 'rgba(255,255,255,.78)',
              margin: '24px 0 0', maxWidth: 520,
            }}>
              Guides, riders, cooks, gardeners, hosts: every day at Vallé Advenature™ Park is run by
              people who love this valley. If you want an office with ziplines over it, start here.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 26 }}>
              {['21 EXPERIENCES', 'OPEN DAILY · 09:00–17:30', 'ONE TEAM'].map((t) => (
                <span key={t} style={{
                  ...mono, fontWeight: 400, letterSpacing: '.12em', color: 'rgba(255,255,255,.85)',
                  background: 'rgba(255,255,255,.1)', borderRadius: radius.sm, padding: '9px 12px',
                }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ position: 'relative', minHeight: isMobile ? 220 : 340 }}>
            <Img
              src="/images/expedition-guide-guests.webp"
              alt="A Vallé guide walking guests through the valley"
              priority
              surface="dark"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: isMobile
                ? 'linear-gradient(to top, rgba(38,0,64,.55), rgba(38,0,64,0) 55%)'
                : 'linear-gradient(to right, rgba(52,0,87,.85), rgba(52,0,87,0) 60%)',
            }} />
          </div>
        </div>
      </section>

      {/* ---- open roles ---- */}
      <section id="roles" style={{ marginTop: 'clamp(36px,4.5vw,60px)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ ...mono, color: color.pink }}>OPEN ROLES</div>
            <h2 style={{
              ...display, fontSize: 'clamp(30px,4vw,54px)', color: color.purple, margin: '10px 0 0',
              transform: 'rotate(-2deg)', transformOrigin: 'left bottom',
            }}>
              Come and join us
            </h2>
          </div>
          <span style={{ ...mono, fontWeight: 400, letterSpacing: '.14em', color: 'rgba(52,0,87,.55)' }}>{countLabel}</span>
        </div>

        <Stripes height={8} style={{ borderRadius: radius.pill, margin: '18px 0 26px' }} />

        {state === 'loading' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 16 }}>
            {[0, 1, 2].map((i) => <SkeletonCard key={i} delay={i * 90} />)}
          </div>
        )}

        {state === 'error' && (
          <div style={{
            background: color.errFill, border: `1.5px solid ${color.border}`, borderRadius: radius.lg,
            padding: 'clamp(22px,3vw,32px)', textAlign: 'center',
          }}>
            <div style={{ ...display, fontSize: 26, color: color.purple }}>We could not load the roles</div>
            <p style={{ fontSize: 15, color: 'rgba(52,0,87,.7)', margin: '8px 0 0', lineHeight: 1.55 }}>
              Something went wrong between here and the park. Try again, or write to us directly.
            </p>
            <button
              onClick={load}
              className="press"
              style={{
                marginTop: 18, border: `2px solid ${color.purple}`, background: 'transparent', cursor: 'pointer',
                fontFamily: font.body, fontSize: 14, fontWeight: 700, color: color.purple,
                padding: '12px 24px', borderRadius: radius.pill,
              }}
            >
              Try again
            </button>
          </div>
        )}

        {state === 'ready' && items.length > 0 && (
          <div
            data-reveal-kids
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 16,
              // With only one or two roles open, cap the track so the cards read as a
              // deliberate group instead of drifting in a four-column void.
              maxWidth: items.length < 4 ? items.length * 430 : undefined,
            }}
          >
            {items.map((v) => (
              <RoleCard key={v.slug} v={v} onOpen={() => openRole(v.slug)} />
            ))}
          </div>
        )}

        {state === 'ready' && items.length === 0 && (
          <div style={{
            background: color.tint, border: `1.5px solid ${color.border}`, borderRadius: radius.xl,
            padding: 'clamp(28px,4vw,48px)', textAlign: 'center',
          }}>
            <div style={{ ...mono, color: color.violet }}>NOTHING OPEN TODAY</div>
            <div style={{
              ...display, fontSize: 'clamp(26px,3.4vw,40px)', color: color.purple, margin: '12px 0 0',
              transform: 'rotate(-2deg)',
            }}>
              Every role is filled, for now
            </div>
            <p style={{
              fontSize: 15.5, lineHeight: 1.6, color: 'rgba(52,0,87,.72)', margin: '18px auto 0', maxWidth: 520,
            }}>
              The valley grows all year, so this page changes often. Send us a speculative application
              with your CV and the work you would love to do, and we will keep it on file for the next opening.
            </p>
            <div style={{ marginTop: 22 }}>
              <PinkLink label={'Write to ' + CAREERS_EMAIL} href={'mailto:' + CAREERS_EMAIL + '?subject=Speculative%20application'} />
            </div>
          </div>
        )}
      </section>

      {/* ---- speculative application ---- */}
      <section
        data-reveal
        style={{
          margin: 'clamp(48px,6vw,80px) 0 0', background: color.deep, borderRadius: radius.xl,
          overflow: 'hidden', boxShadow: shadow.card,
        }}
      >
        <Stripes height={8} />
        <div style={{
          padding: 'clamp(24px,3vw,36px)', display: 'flex', alignItems: 'center',
          gap: 'clamp(16px,2.5vw,32px)', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={eyebrow}>OPEN APPLICATION</div>
            <div style={{ ...display, fontSize: 'clamp(24px,2.8vw,34px)', color: color.white, marginTop: 8 }}>
              None of these fit you?
            </div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'rgba(255,255,255,.75)', margin: '8px 0 0', maxWidth: 560 }}>
              Tell us what you do best. We read every message, and we come back to good people
              when the right role opens up.
            </p>
          </div>
          <PinkLink label="Send an open application" href={'mailto:' + CAREERS_EMAIL + '?subject=Speculative%20application'} />
        </div>
      </section>

      <div style={{ height: 'clamp(48px,6vw,80px)' }} />
    </main>
  );
}
