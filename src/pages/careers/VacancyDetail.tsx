import { abs, breadcrumbs, useSeo } from '../../lib/seo';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReveal } from '../../hooks/useReveal';
import { cn } from '../../lib/utils';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Img } from '../../components/Img';
import { Stripes } from '../../components/Stripes';
import { getVacancy, isHttpError } from '../../lib/careersApi';
import type { VacancyDetail } from '../../types';
import { color } from '../../styles/theme';
import { paths } from '../../lib/nav';
import { useT } from '../../i18n';
import { CAREERS_EMAIL, DISPLAY, EMPLOYMENT_LABEL, MONO, PAGE, closesLabel, employmentStyle } from './shared';
import { GhostButton, Pill } from './formParts';
import { useApplication } from './useApplication';
import { ApplyPanel } from './ApplyPanel';

/** Splits a textarea-authored field into clean bullet lines. */
function lines(s: string): string[] {
  return s
    .split('\n')
    .map((t) => t.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}

/** Splits prose into paragraphs, tolerating single or double newlines. */
function paragraphs(s: string): string[] {
  return s.split(/\n\s*\n|\n/).map((t) => t.trim()).filter(Boolean);
}

// ---------------------------------------------------------------- page

export default function VacancyDetailPage() {
  const t = useT();
  const ref = useReveal<HTMLElement>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { slug = '' } = useParams<{ slug: string }>();

  const [vacancy, setVacancy] = useState<VacancyDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  useSeo(vacancy ? {
    title: t('{title} · Careers at VALLÉ Advenature™ Park', { title: vacancy.title }),
    description: vacancy.summary || t('{title}, {employment} in {location}. Apply online.', { title: vacancy.title, employment: vacancy.employment, location: vacancy.location }),
    canonicalPath: `/vacancies/${slug}`,
    jsonLd: [
      breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Careers', path: '/vacancies' }, { name: vacancy.title, path: `/vacancies/${slug}` }]),
      {
        '@context': 'https://schema.org', '@type': 'JobPosting', title: vacancy.title, description: vacancy.description || vacancy.summary,
        ...(vacancy.postedOn ? { datePosted: vacancy.postedOn } : {}), ...(vacancy.closesOn ? { validThrough: vacancy.closesOn } : {}),
        employmentType: { 'full-time': 'FULL_TIME', 'part-time': 'PART_TIME', seasonal: 'TEMPORARY', internship: 'INTERN' }[vacancy.employment] || 'FULL_TIME',
        hiringOrganization: { '@type': 'Organization', name: 'VALLÉ Advenature™ Park', sameAs: abs('/') },
        jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', streetAddress: 'B102, Mare Anguilles', addressLocality: 'Chamouny', addressCountry: 'MU' } },
        directApply: true,
      },
    ],
  } : { title: state === 'missing' ? t('Role closed · VALLÉ Advenature™ Park') : t('Careers · VALLÉ Advenature™ Park'), description: t('Open roles at Vallé Advenature Park.'), noindex: state !== 'loading' });

  const app = useApplication(vacancy);

  useEffect(() => {
    let live = true;
    setState('loading');
    setVacancy(null);
    getVacancy(slug)
      .then((v) => { if (live) { setVacancy(v); setState('ready'); } })
      .catch((e: unknown) => {
        if (!live) return;
        setState(isHttpError(e) && e.status === 404 ? 'missing' : 'error');
      });
    return () => { live = false; };
  }, [slug]);

  // ---- states that replace the whole page ----

  const shell = (children: ReactNode) => (
    <main ref={ref} className={PAGE}>
      {children}
      <div className="h-[clamp(48px,6vw,80px)]" />
    </main>
  );

  if (state === 'loading') {
    return shell(
      <div className="py-[clamp(40px,8vw,120px)] px-0 text-center">
        <div className={cn(MONO, 'text-valle-violet')}>{t('LOADING THE ROLE…')}</div>
        <div className="mt-[22px] mx-auto mb-0 w-[min(520px,100%)] h-[10px] rounded-[999px] bg-[#F7F3FF] overflow-hidden">
          <div className="w-[40%] h-full bg-valle-violet [animation:vfade_1s_ease-in-out_infinite_alternate]" />
        </div>
      </div>,
    );
  }

  if (state === 'missing' || state === 'error') {
    const missing = state === 'missing';
    return shell(
      <div className={cn('border-[1.5px] border-solid border-valle-lilac rounded-[24px] p-[clamp(28px,4vw,56px)] text-center', missing ? 'bg-[#F7F3FF]' : 'bg-[#FFE2E7]')}>
        <div className={cn(MONO, 'text-valle-violet')}>{missing ? t('ROLE CLOSED') : t('SOMETHING WENT WRONG')}</div>
        <h1 className={cn(DISPLAY, 'text-[clamp(28px,4vw,48px)] text-valle-purple mt-3 mb-0 mx-0 [transform:rotate(-2deg)]')}>
          {missing ? t('This role is no longer open') : t('We could not load this role')}
        </h1>
        <p className="text-[15.5px] leading-[1.6] text-[rgba(52,0,87,.72)] mt-4 mx-auto mb-0 max-w-[520px]">
          {missing
            ? t('It may have been filled or taken down. Have a look at what is open today, or send us an open application.')
            : t('Please try again in a moment. If it keeps happening, write to us at {email}.', { email: CAREERS_EMAIL })}
        </p>
        <div className="mt-[22px] flex gap-3 justify-center flex-wrap">
          <GhostButton label={t('← All open roles')} onClick={() => navigate(paths.vacancies())} />
        </div>
      </div>,
    );
  }

  if (!vacancy) return shell(null);

  // ---- the role ----

  const empLabel = EMPLOYMENT_LABEL[vacancy.employment] ? t(EMPLOYMENT_LABEL[vacancy.employment]) : t('ROLE');
  const reqs = lines(vacancy.requirements);
  const perks = lines(vacancy.benefits);
  const about = paragraphs(vacancy.description);

  const sectionTitle = cn(DISPLAY, 'text-[clamp(22px,2.6vw,30px)] text-valle-purple m-0');

  return (
    <main ref={ref} className={PAGE}>
      <button
        onClick={() => navigate(paths.vacancies())}
        className={cn('border-0 bg-transparent cursor-pointer p-0', MONO, 'text-valle-violet mb-[18px]')}
      >
        {t('← ALL OPEN ROLES')}
      </button>

      {/* ---- role header ---- */}
      <header data-reveal>
        <div className={cn(MONO, 'text-valle-red')}>{(vacancy.department || t('VALLÉ PARK')).toUpperCase()}</div>
        <h1 className={cn(DISPLAY, 'text-[clamp(38px,6vw,82px)] text-valle-purple mt-3 mb-0 mx-0 [transform:rotate(-3deg)] origin-bottom-left max-w-[900px]')}>
          {vacancy.title}
        </h1>
        <div className="flex gap-2 flex-wrap mt-[22px]">
          <Pill style={employmentStyle(vacancy.employment)}>{empLabel}</Pill>
          <Pill style={{ background: color.tint, color: color.purple }}>{(vacancy.location || t('CHAMOUNY, MAURITIUS')).toUpperCase()}</Pill>
          {vacancy.salaryRange && <Pill style={{ background: color.purple, color: color.yellow }}>{vacancy.salaryRange.toUpperCase()}</Pill>}
          <Pill style={{ background: color.tint, color: color.purple }}>{closesLabel(vacancy.closesOn)}</Pill>
        </div>
        {isMobile && !app.sent && (
          <button
            onClick={() => {
              const el = document.getElementById('apply');
              if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 84), behavior: 'smooth' });
            }}
            className="vbtn vbtn-primary vbtn-block mt-[18px]"
          >
            {t('Apply for this role ↓')}
          </button>
        )}
        <Stripes height={8} style={{ borderRadius: 999, margin: '26px 0 0' }} />
      </header>

      <div className={cn('grid gap-[clamp(24px,3.5vw,56px)] items-start mt-[clamp(28px,3.5vw,44px)]', isMobile ? 'grid-cols-[1fr]' : 'grid-cols-[minmax(0,1.3fr)_minmax(340px,.7fr)]')}>
        {/* ---- left: the role ---- */}
        <div>
          {vacancy.summary && (
            <p data-reveal className="text-[clamp(17px,1.6vw,21px)] leading-[1.55] text-valle-purple font-medium m-0 border-l-4 border-solid border-valle-green pl-[18px]">
              {vacancy.summary}
            </p>
          )}

          {about.length > 0 && (
            <section data-reveal className="mt-[clamp(28px,3vw,40px)]">
              <h2 className={sectionTitle}>{t('About the role')}</h2>
              {about.map((p, i) => (
                <p key={i} className="text-[15.5px] leading-[1.7] text-[rgba(52,0,87,.78)] mt-[14px] mb-0 mx-0">{p}</p>
              ))}
            </section>
          )}

          {reqs.length > 0 && (
            <section data-reveal className="mt-[clamp(28px,3vw,40px)]">
              <h2 className={sectionTitle}>{t('What we are looking for')}</h2>
              <ul className="list-none mt-4 mb-0 mx-0 p-0 grid gap-[10px]">
                {reqs.map((r, i) => (
                  <li key={i} className="flex gap-3 items-start bg-[#F7F3FF] border-[1.5px] border-solid border-valle-lilac rounded-[12px] py-[13px] px-4">
                    <span aria-hidden className={cn(MONO, 'text-valle-violet mt-[3px]')}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[15px] leading-[1.55] text-[rgba(52,0,87,.82)]">{r}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {perks.length > 0 && (
            <section data-reveal className="mt-[clamp(28px,3vw,40px)]">
              <h2 className={sectionTitle}>{t('What you get')}</h2>
              <div className="flex flex-wrap gap-[10px] mt-4">
                {perks.map((b, i) => (
                  <span key={i} className="inline-flex items-center gap-2 bg-white shadow-[0_0_0_1.5px_#EBE2FF] rounded-[999px] py-[10px] px-[15px] text-[14px] text-valle-purple">
                    <span aria-hidden className="text-[#12B54A] font-bold">✓</span>
                    {b}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section data-reveal className="mt-[clamp(28px,3.5vw,44px)]">
            <h2 className={sectionTitle}>{t('Where you would work')}</h2>
            <div className={cn('relative mt-4 rounded-[24px] overflow-hidden bg-valle-purple shadow-[0_18px_40px_-22px_rgba(52,0,87,.45)]', isMobile ? 'min-h-[200px]' : 'min-h-[260px]')}>
              <Img
                src="/images/trail-reception.webp"
                alt={t('The reception trail at Vallé Advenature Park')}
                surface="dark"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(38,0,64,.88),rgba(38,0,64,0)_62%)]" />
              <div className="absolute left-5 right-5 bottom-[18px] text-white">
                <div className={cn(MONO, 'text-valle-yellow')}>{t('CHAMOUNY, SOUTH MAURITIUS')}</div>
                <div className={cn(DISPLAY, 'text-[clamp(20px,2.4vw,28px)] mt-[6px]')}>
                  {t('200 hectares of valley, open daily')}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ---- right: apply ---- */}
        <ApplyPanel vacancy={vacancy} app={app} isMobile={isMobile} />
      </div>

      <div className="h-[clamp(48px,6vw,80px)]" />
    </main>
  );
}
