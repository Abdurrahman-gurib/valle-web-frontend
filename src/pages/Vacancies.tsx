import { useCatalog } from '../store/CatalogContext';
import { breadcrumbs, useSeo } from '../lib/seo';
import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import { cn } from '../lib/utils';
import { useIsMobile } from '../hooks/useIsMobile';
import { Img } from '../components/Img';
import { Stripes } from '../components/Stripes';
import { listVacancies } from '../lib/careersApi';
import { fullDateFromIso } from '../lib/format';
import type { EmploymentType, VacancyCard } from '../types';
import { color } from '../styles/theme';
import { paths } from '../lib/nav';
import { tr, useT, _t } from '../i18n';

/** Where a speculative application goes when nothing is open (or nothing fits). */
export const CAREERS_EMAIL = 'sales@vallepark.com';

const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  'full-time': _t('FULL TIME'),
  'part-time': _t('PART TIME'),
  seasonal: _t('SEASONAL'),
  internship: _t('INTERNSHIP'),
};

const EMPLOYMENT_COLOR: Record<EmploymentType, { bg: string; fg: string }> = {
  'full-time': { bg: color.green, fg: color.purple },
  'part-time': { bg: color.yellow, fg: color.purple },
  seasonal: { bg: color.violet, fg: color.white },
  internship: { bg: color.pink, fg: color.white },
};

function employmentPillColors(employment: EmploymentType) {
  const c = EMPLOYMENT_COLOR[employment] || { bg: color.tint, fg: color.purple };
  return { background: c.bg, color: c.fg };
}

/** Mono label: Chivo Mono 10.5px bold, letter-spaced. */
const MONO = 'font-mono text-[10.5px] font-bold tracking-[.14em]';
/** Display heading: Barlow italic 900, uppercase, tight. */
const DISPLAY = 'font-display italic font-black tracking-[-0.01em] leading-[0.9] uppercase';

/** "Closes Thu 30 Sep 2026", or an evergreen line when the role has no end date. */
function closesLabel(closesOn: string | null): string {
  if (!closesOn) return tr('OPEN UNTIL FILLED');
  const full = fullDateFromIso(closesOn.slice(0, 10));
  return full ? tr('CLOSES {date}', { date: full.toUpperCase() }) : tr('OPEN UNTIL FILLED');
}

const eyebrow = cn(MONO, 'text-valle-yellow');

function RoleCard({ v, onOpen }: { v: VacancyCard; onOpen: () => void }) {
  const t = useT();
  const keyOpen = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); }
  };
  return (
    <div
      onClick={onOpen}
      onKeyDown={keyOpen}
      role="link"
      tabIndex={0}
      aria-label={t('Open role: {title}', { title: v.title })}
      className="group cursor-pointer bg-white rounded-[18px] pt-5 px-[22px] pb-[18px] flex flex-col gap-[10px] outline-offset-[3px] shadow-[0_0_0_1.5px_#EBE2FF] hover:shadow-[0_26px_50px_-18px_rgba(52,0,87,.45)] hover:[transform:translateY(-6px)] [transition:transform_.28s_cubic-bezier(.2,.7,.2,1),box-shadow_.28s_cubic-bezier(.2,.7,.2,1)]"
    >
      <div className="flex items-center gap-[10px] justify-between">
        <span className={cn(MONO, 'text-valle-violet')}>{(v.department || t('VALLÉ PARK')).toUpperCase()}</span>
        <span className={cn(MONO, 'rounded-[999px] py-[6px] px-[11px] whitespace-nowrap leading-none')} style={employmentPillColors(v.employment)}>{EMPLOYMENT_LABEL[v.employment] ? t(EMPLOYMENT_LABEL[v.employment]) : t('ROLE')}</span>
      </div>

      <div className={cn(DISPLAY, 'text-[clamp(21px,2.2vw,26px)] text-valle-purple')}>{v.title}</div>

      <div className="font-mono text-[10.5px] font-normal tracking-[.08em] text-[rgba(52,0,87,.6)]">
        {(v.location || t('CHAMOUNY, MAURITIUS')).toUpperCase()}
      </div>

      {v.summary && (
        <div className="text-[14px] leading-[1.55] text-[rgba(52,0,87,.72)] flex-1">{v.summary}</div>
      )}

      <div className="mt-1 pt-3 flex items-center gap-3 flex-wrap justify-between" style={{ borderTop: '1px dashed #D9C9F0' }}>
        <span className="font-mono text-[10.5px] font-normal tracking-[.08em] text-[rgba(52,0,87,.55)]">
          {v.salaryRange ? v.salaryRange : closesLabel(v.closesOn)}
        </span>
        <span className={cn(MONO, 'text-valle-purple group-hover:text-valle-red')}>{t('VIEW ROLE →')}</span>
      </div>
    </div>
  );
}

/** Placeholder cards so the grid does not jump when the roles land. */
function SkeletonCard({ delay }: { delay: number }) {
  const bar = (w: string, hgt: number, mt: number) => ({ width: w, height: hgt, marginTop: mt });
  const barCls = 'rounded-[8px] bg-[#F7F3FF]';
  return (
    <div
      aria-hidden
      className="bg-white rounded-[18px] pt-5 px-[22px] pb-[22px] shadow-[0_0_0_1.5px_#EBE2FF] [animation:vfade_.5s_ease_both]"
      style={{ animationDelay: delay + 'ms' }}
    >
      <div className={barCls} style={bar('38%', 12, 0)} />
      <div className={barCls} style={bar('80%', 26, 14)} />
      <div className={barCls} style={bar('52%', 12, 12)} />
      <div className={barCls} style={bar('100%', 12, 16)} />
      <div className={barCls} style={bar('70%', 12, 8)} />
    </div>
  );
}

function PinkLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      className="press border-0 bg-valle-red hover:bg-[#D91E44] cursor-pointer font-sans text-[15px] font-bold py-[14px] px-[26px] rounded-[999px] shadow-[0_10px_28px_-6px_rgba(255,51,88,.5)] inline-block whitespace-nowrap hover:[transform:translateY(-1px)] [transition:transform_.18s_cubic-bezier(.2,.7,.2,1),background_.18s_cubic-bezier(.2,.7,.2,1)]"
      style={{ color: '#FFFFFF', textDecoration: 'none' }}
    >
      {label}
    </a>
  );
}

export default function VacanciesPage() {
  const t = useT();
  const catalog = useCatalog();
  useSeo({ title: t('Careers · Work in the valley · VALLÉ Advenature™ Park'), description: t('Open roles at Vallé Advenature Park in Chamouny, Mauritius: guides, hospitality, mechanics and more. Apply online.'), canonicalPath: '/vacancies', jsonLd: [breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Careers', path: '/vacancies' }])] });
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

  const openRole = (slug: string) => navigate(paths.vacancy(encodeURIComponent(slug)));

  const countLabel = state === 'ready'
    ? (items.length === 0 ? t('NO ROLES OPEN RIGHT NOW') : (items.length === 1 ? t('{n} ROLE OPEN', { n: items.length }) : t('{n} ROLES OPEN', { n: items.length })))
    : t('LOADING ROLES…');

  return (
    <main ref={ref} className="max-w-[1320px] mx-auto pt-[104px] px-[clamp(16px,3.5vw,40px)] pb-0">
      {/* ---- hero ---- */}
      <section
        data-reveal
        className="bg-valle-purple rounded-[24px] overflow-hidden shadow-[0_18px_40px_-22px_rgba(52,0,87,.45)]"
      >
        <Stripes height={10} />
        <div className={cn('grid items-stretch', isMobile ? 'grid-cols-[1fr] gap-0' : 'grid-cols-[1.1fr_.9fr] gap-[clamp(20px,3vw,44px)]')}>
          <div className="p-[clamp(24px,3.4vw,44px)]">
            <div className={eyebrow}>{t('WE ARE HIRING · CHAMOUNY, MAURITIUS')}</div>
            <h1 className={cn(DISPLAY, 'text-[clamp(40px,6.2vw,86px)] text-white mt-[14px] mb-0 mx-0 [transform:rotate(-4deg)] origin-bottom-left')}>
              {t('Work in')}<br />{t('the valley')}
            </h1>
            <p className="text-[clamp(15px,1.3vw,17px)] leading-[1.6] text-[rgba(255,255,255,.78)] mt-6 mb-0 mx-0 max-w-[520px]">
              {t('Guides, riders, cooks, gardeners, hosts: every day at Vallé Advenature™ Park is run by people who love this valley. If you want an office with ziplines over it, start here.')}
            </p>
            <div className="flex gap-2 flex-wrap mt-[26px]">
              {[t('{n} EXPERIENCES', { n: catalog.ACTS.length }), t('OPEN DAILY · 09:00–17:30'), t('ONE TEAM')].map((chip) => (
                <span key={chip} className="font-mono text-[10.5px] font-normal tracking-[.12em] text-[rgba(255,255,255,.85)] bg-[rgba(255,255,255,.1)] rounded-[8px] py-[9px] px-3">{chip}</span>
              ))}
            </div>
          </div>
          <div className={cn('relative', isMobile ? 'min-h-[220px]' : 'min-h-[340px]')}>
            <Img
              src="/images/expedition-guide-guests.webp"
              alt={t('A Vallé guide walking guests through the valley')}
              priority
              surface="dark"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div className={cn('absolute inset-0', isMobile
              ? 'bg-[linear-gradient(to_top,rgba(38,0,64,.55),rgba(38,0,64,0)_55%)]'
              : 'bg-[linear-gradient(to_right,rgba(52,0,87,.85),rgba(52,0,87,0)_60%)]')} />
          </div>
        </div>
      </section>

      {/* ---- open roles ---- */}
      <section id="roles" className="mt-[clamp(36px,4.5vw,60px)]">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className={cn(MONO, 'text-valle-red')}>{t('OPEN ROLES')}</div>
            <h2 className={cn(DISPLAY, 'text-[clamp(30px,4vw,54px)] text-valle-purple mt-[10px] mb-0 mx-0 [transform:rotate(-2deg)] origin-bottom-left')}>
              {t('Come and join us')}
            </h2>
          </div>
          <span className="font-mono text-[10.5px] font-normal tracking-[.14em] text-[rgba(52,0,87,.55)]">{countLabel}</span>
        </div>

        <Stripes height={8} style={{ borderRadius: 999, margin: '18px 0 26px' }} />

        {state === 'loading' && (
          <div className="grid [grid-template-columns:repeat(auto-fill,minmax(290px,1fr))] gap-4">
            {[0, 1, 2].map((i) => <SkeletonCard key={i} delay={i * 90} />)}
          </div>
        )}

        {state === 'error' && (
          <div className="bg-[#FFE2E7] border-[1.5px] border-solid border-valle-lilac rounded-[18px] p-[clamp(22px,3vw,32px)] text-center">
            <div className={cn(DISPLAY, 'text-[26px] text-valle-purple')}>{t('We could not load the roles')}</div>
            <p className="text-[15px] text-[rgba(52,0,87,.7)] mt-2 mb-0 mx-0 leading-[1.55]">
              {t('Something went wrong between here and the park. Try again, or write to us directly.')}
            </p>
            <button
              onClick={load}
              className="press mt-[18px] border-2 border-solid border-valle-purple bg-transparent cursor-pointer font-sans text-[14px] font-bold text-valle-purple py-3 px-6 rounded-[999px]"
            >
              {t('Try again')}
            </button>
          </div>
        )}

        {state === 'ready' && items.length > 0 && (
          <div
            data-reveal-kids
            className="grid [grid-template-columns:repeat(auto-fill,minmax(290px,1fr))] gap-4"
            // With only one or two roles open, cap the track so the cards read as a
            // deliberate group instead of drifting in a four-column void.
            style={{ maxWidth: items.length < 4 ? items.length * 430 : undefined }}
          >
            {items.map((v) => (
              <RoleCard key={v.slug} v={v} onOpen={() => openRole(v.slug)} />
            ))}
          </div>
        )}

        {state === 'ready' && items.length === 0 && (
          <div className="bg-[#F7F3FF] border-[1.5px] border-solid border-valle-lilac rounded-[24px] p-[clamp(28px,4vw,48px)] text-center">
            <div className={cn(MONO, 'text-valle-violet')}>{t('NOTHING OPEN TODAY')}</div>
            <div className={cn(DISPLAY, 'text-[clamp(26px,3.4vw,40px)] text-valle-purple mt-3 mb-0 mx-0 [transform:rotate(-2deg)]')}>
              {t('Every role is filled, for now')}
            </div>
            <p className="text-[15.5px] leading-[1.6] text-[rgba(52,0,87,.72)] mt-[18px] mx-auto mb-0 max-w-[520px]">
              {t('The valley grows all year, so this page changes often. Send us a speculative application with your CV and the work you would love to do, and we will keep it on file for the next opening.')}
            </p>
            <div className="mt-[22px]">
              <PinkLink label={t('Write to {email}', { email: CAREERS_EMAIL })} href={'mailto:' + CAREERS_EMAIL + '?subject=Speculative%20application'} />
            </div>
          </div>
        )}
      </section>

      {/* ---- speculative application ---- */}
      <section
        data-reveal
        className="mt-[clamp(48px,6vw,80px)] mx-0 mb-0 bg-valle-deep rounded-[24px] overflow-hidden shadow-[0_18px_40px_-22px_rgba(52,0,87,.45)]"
      >
        <Stripes height={8} />
        <div className="p-[clamp(24px,3vw,36px)] flex items-center gap-[clamp(16px,2.5vw,32px)] flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <div className={eyebrow}>{t('OPEN APPLICATION')}</div>
            <div className={cn(DISPLAY, 'text-[clamp(24px,2.8vw,34px)] text-white mt-2')}>
              {t('None of these fit you?')}
            </div>
            <p className="text-[14.5px] leading-[1.6] text-[rgba(255,255,255,.75)] mt-2 mb-0 mx-0 max-w-[560px]">
              {t('Tell us what you do best. We read every message, and we come back to good people when the right role opens up.')}
            </p>
          </div>
          <PinkLink label={t('Send an open application')} href={'mailto:' + CAREERS_EMAIL + '?subject=Speculative%20application'} />
        </div>
      </section>

      <div className="h-[clamp(48px,6vw,80px)]" />
    </main>
  );
}
