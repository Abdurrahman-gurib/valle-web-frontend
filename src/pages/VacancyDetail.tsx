import { abs, breadcrumbs, useSeo } from '../lib/seo';
import {
  useCallback, useEffect, useMemo, useState,
  type FormEvent, type ReactNode,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import { cn } from '../lib/utils';
import { useIsMobile } from '../hooks/useIsMobile';
import { Img } from '../components/Img';
import { Stripes } from '../components/Stripes';
import { applyToVacancy, getVacancy, isHttpError } from '../lib/careersApi';
import { fullDateFromIso } from '../lib/format';
import type { ApplicationRequest, EmploymentType, VacancyDetail } from '../types';
import { color } from '../styles/theme';
import { paths } from '../lib/nav';
import { useT, _t } from '../i18n';

const CAREERS_EMAIL = 'sales@vallepark.com';

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

// ---------------------------------------------------------------- form model

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  cvUrl: string;
  years: string;
  coverLetter: string;
}

type FieldKey = keyof FormState;
type Errors = Partial<Record<FieldKey, string>>;

const EMPTY_FORM: FormState = { fullName: '', email: '', phone: '', cvUrl: '', years: '', coverLetter: '' };

const COVER_MAX = 4000;

/**
 * Mirrors the server DTO (fullName 2..120, IsEmail, phone <=40, http(s) cvUrl <=500,
 * coverLetter <=4000, yearsExperience 0..60) so the visitor is told what is wrong
 * before the round trip. The server stays the authority.
 */
function validate(f: FormState): Errors {
  const e: Errors = {};

  const name = f.fullName.trim();
  if (!name) e.fullName = _t('Please tell us your name.');
  else if (name.length < 2) e.fullName = _t('That looks a little short.');
  else if (name.length > 120) e.fullName = _t('Please keep this under 120 characters.');

  const email = f.email.trim();
  if (!email) e.email = _t('We need an email address to reply to.');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) e.email = _t('That email address does not look right.');

  if (f.phone.trim().length > 40) e.phone = _t('Please keep this under 40 characters.');

  const cv = f.cvUrl.trim();
  if (cv) {
    if (cv.length > 500) e.cvUrl = _t('That link is too long (500 characters max).');
    else if (!/^https?:\/\/\S+$/i.test(cv)) e.cvUrl = _t('Use a full link starting with http:// or https://');
  }

  const years = f.years.trim();
  if (years) {
    if (!/^\d{1,3}$/.test(years)) e.years = _t('Whole numbers only, please.');
    else if (Number(years) > 60) e.years = _t('Please enter 60 or fewer.');
  }

  if (f.coverLetter.length > COVER_MAX) e.coverLetter = _t('Please keep this under 4000 characters.');

  return e;
}

// ---------------------------------------------------------------- small parts

/** Mono label: Chivo Mono 10.5px bold, letter-spaced. */
const MONO = 'font-mono text-[10.5px] font-bold tracking-[.14em]';
/** Display heading: Barlow italic 900, uppercase, tight. */
const DISPLAY = 'font-display italic font-black tracking-[-0.01em] leading-[0.9] uppercase';

const labelCls = cn(MONO, 'text-[rgba(52,0,87,.7)] block mb-[7px]');

function fieldCls(invalid: boolean): string {
  return cn(
    'w-full border-[1.5px] border-solid rounded-[12px] py-3 px-[15px] font-sans text-[15px] text-valle-purple outline-none [transition:border-color_.18s_cubic-bezier(.2,.7,.2,1),background_.18s_cubic-bezier(.2,.7,.2,1)]',
    invalid ? 'border-[#D91E44] bg-[#FFE2E7]' : 'border-valle-lilac focus:border-valle-violet bg-white',
  );
}

function ErrorNote({ id, text }: { id: string; text: string }) {
  const t = useT();
  return (
    <div id={id} role="alert" className="font-mono text-[10.5px] font-normal text-[#D91E44] mt-[6px] tracking-[.06em]">
      {t(text)}
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  error?: string;
  placeholder?: string;
  hint?: string;
  type?: 'text' | 'email' | 'tel' | 'url';
  inputMode?: 'text' | 'email' | 'tel' | 'numeric' | 'url';
  autoComplete?: string;
  maxLength?: number;
  required?: boolean;
}

function TextField(p: FieldProps) {
  const t = useT();
  const invalid = Boolean(p.error);
  return (
    <div>
      <label htmlFor={p.id} className={labelCls}>
        {p.label.toUpperCase()}
        {!p.required && <span className="opacity-55"> · {t('OPTIONAL')}</span>}
      </label>
      <input
        id={p.id}
        name={p.id}
        type={p.type || 'text'}
        inputMode={p.inputMode}
        autoComplete={p.autoComplete}
        maxLength={p.maxLength}
        value={p.value}
        placeholder={p.placeholder}
        aria-invalid={invalid || undefined}
        aria-required={p.required || undefined}
        aria-describedby={invalid ? p.id + '-err' : p.hint ? p.id + '-hint' : undefined}
        onChange={(e) => p.onChange(e.target.value)}
        onBlur={() => { p.onBlur(); }}
        className={fieldCls(invalid)}
      />
      {invalid
        ? <ErrorNote id={p.id + '-err'} text={p.error || ''} />
        : p.hint
          ? <div id={p.id + '-hint'} className="text-[12.5px] text-[rgba(52,0,87,.7)] mt-[6px]">{p.hint}</div>
          : null}
    </div>
  );
}

interface AreaProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  error?: string;
  placeholder?: string;
  max: number;
}

function TextArea(p: AreaProps) {
  const t = useT();
  const invalid = Boolean(p.error);
  const left = p.max - p.value.length;
  return (
    <div>
      <label htmlFor={p.id} className={labelCls}>
        {p.label.toUpperCase()}<span className="opacity-55"> · {t('OPTIONAL')}</span>
      </label>
      <textarea
        id={p.id}
        name={p.id}
        rows={5}
        value={p.value}
        placeholder={p.placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? p.id + '-err' : p.id + '-count'}
        onChange={(e) => p.onChange(e.target.value)}
        onBlur={() => { p.onBlur(); }}
        className={cn(fieldCls(invalid), 'resize-y leading-[1.55] min-h-[120px]')}
      />
      {invalid
        ? <ErrorNote id={p.id + '-err'} text={p.error || ''} />
        : (
          <div id={p.id + '-count'} className="font-mono text-[10.5px] font-normal tracking-[.14em] text-[rgba(52,0,87,.5)] mt-[6px] text-right">
            {t('{n} CHARACTERS LEFT', { n: left })}
          </div>
        )}
    </div>
  );
}

function Pill({ children, bg, fg }: { children: ReactNode; bg: string; fg: string }) {
  return (
    <span className={cn(MONO, 'rounded-[999px] py-[7px] px-3 leading-none')} style={{ background: bg, color: fg }}>
      {children}
    </span>
  );
}

function SubmitButton({ busy, disabled, onClick }: { busy: boolean; disabled: boolean; onClick?: () => void }) {
  const t = useT();
  const off = busy || disabled;
  return (
    <button
      type="submit"
      onClick={onClick}
      disabled={off}
      aria-busy={busy || undefined}
      className={cn(
        'w-full border-0 font-display italic font-black text-[17px] tracking-[.03em] uppercase text-white py-[15px] px-0 rounded-[999px] flex items-center justify-center gap-[10px] [transition:transform_.18s_cubic-bezier(.2,.7,.2,1),background_.18s_cubic-bezier(.2,.7,.2,1)]',
        off
          ? 'cursor-not-allowed bg-[#C9B3E8] shadow-none'
          : 'press cursor-pointer bg-valle-red hover:bg-[#D91E44] shadow-[0_10px_28px_-6px_rgba(255,51,88,.5)] hover:[transform:translateY(-1px)]',
      )}
    >
      {busy && (
        <span aria-hidden className="w-[9px] h-[9px] rounded-[999px] bg-white inline-block [animation:vbeat_.9s_ease-in-out_infinite]" />
      )}
      {busy ? t('Sending…') : t('Send my application')}
    </button>
  );
}

function GhostButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="press border-2 border-solid border-valle-purple bg-transparent hover:bg-valle-purple cursor-pointer font-sans text-[14px] font-bold text-valle-purple hover:text-white py-3 px-6 rounded-[999px] [transition:background_.18s_cubic-bezier(.2,.7,.2,1),color_.18s_cubic-bezier(.2,.7,.2,1)]"
    >
      {label}
    </button>
  );
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

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [sent, setSent] = useState(false);
  const [doneRef, setDoneRef] = useState('');

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

  const errors = useMemo(() => validate(form), [form]);
  const errorFor = useCallback(
    (k: FieldKey): string | undefined => ((tried || touched[k]) ? errors[k] : undefined),
    [errors, touched, tried],
  );

  const set = (k: FieldKey) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (apiErr) setApiErr('');
  };
  const blur = (k: FieldKey) => () => setTouched((t) => ({ ...t, [k]: true }));

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || !vacancy) return;
    setTried(true);
    setApiErr('');
    if (Object.keys(errors).length > 0) {
      const first = (Object.keys(errors) as FieldKey[])[0];
      document.getElementById(first)?.focus();
      return;
    }
    const body: ApplicationRequest = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      cvUrl: form.cvUrl.trim() || undefined,
      coverLetter: form.coverLetter.trim() || undefined,
      yearsExperience: form.years.trim() ? Number(form.years.trim()) : undefined,
    };
    setBusy(true);
    try {
      const res = await applyToVacancy(vacancy.slug, body);
      setDoneRef(typeof res.id === 'string' ? res.id.replace(/-/g, '').slice(0, 8).toUpperCase() : '');
      setSent(true);
      setForm(EMPTY_FORM);
      setTouched({});
      setTried(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      if (isHttpError(err)) {
        if (err.status === 429) {
          setApiErr(t('You have sent several applications already. Please try again in about ten minutes.'));
        } else if (err.status === 404 || err.status === 409 || err.status === 410) {
          setApiErr(t('This role has just closed. Please look at the other open roles, or write to us directly.'));
        } else {
          setApiErr(err.message || t('We could not send your application. Please try again.'));
        }
      } else {
        setApiErr(t('We could not reach the park. Check your connection and try again, or email {email}.', { email: CAREERS_EMAIL }));
      }
    } finally {
      setBusy(false);
    }
  };

  // ---- states that replace the whole page ----

  const shell = (children: ReactNode) => (
    <main ref={ref} className="max-w-[1320px] mx-auto pt-[104px] px-[clamp(16px,3.5vw,40px)] pb-0">
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

  const emp = EMPLOYMENT_COLOR[vacancy.employment] || { bg: color.tint, fg: color.purple };
  const empLabel = EMPLOYMENT_LABEL[vacancy.employment] ? t(EMPLOYMENT_LABEL[vacancy.employment]) : t('ROLE');
  const closes = vacancy.closesOn ? fullDateFromIso(vacancy.closesOn.slice(0, 10)) : '';
  const reqs = lines(vacancy.requirements);
  const perks = lines(vacancy.benefits);
  const about = paragraphs(vacancy.description);
  const hasErrors = Object.keys(errors).length > 0;

  const sectionTitle = cn(DISPLAY, 'text-[clamp(22px,2.6vw,30px)] text-valle-purple m-0');

  return (
    <main ref={ref} className="max-w-[1320px] mx-auto pt-[104px] px-[clamp(16px,3.5vw,40px)] pb-0">
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
          <Pill bg={emp.bg} fg={emp.fg}>{empLabel}</Pill>
          <Pill bg={color.tint} fg={color.purple}>{(vacancy.location || t('CHAMOUNY, MAURITIUS')).toUpperCase()}</Pill>
          {vacancy.salaryRange && <Pill bg={color.purple} fg={color.yellow}>{vacancy.salaryRange.toUpperCase()}</Pill>}
          <Pill bg={color.tint} fg={color.purple}>{closes ? t('CLOSES {date}', { date: closes.toUpperCase() }) : t('OPEN UNTIL FILLED')}</Pill>
        </div>
        {isMobile && !sent && (
          <button
            onClick={() => {
              const el = document.getElementById('apply');
              if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 84), behavior: 'smooth' });
            }}
            className="press mt-[18px] w-full border-0 bg-valle-red cursor-pointer font-display italic font-black text-[16px] tracking-[.03em] uppercase text-white py-[14px] px-0 rounded-[999px] shadow-[0_10px_28px_-6px_rgba(255,51,88,.5)]"
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
        <aside
          id="apply"
          className={cn('top-[92px]', isMobile ? 'static mt-2' : 'sticky mt-0')}
        >
          <div className="bg-white rounded-[24px] overflow-hidden shadow-[0_0_0_1.5px_#EBE2FF,0_18px_40px_-22px_rgba(52,0,87,.45)]">
            <div className="bg-valle-purple py-[18px] px-[22px]">
              <div className={cn(MONO, 'text-valle-yellow')}>{sent ? t('APPLICATION SENT') : t('APPLY NOW')}</div>
              <div className={cn(DISPLAY, 'text-[24px] text-white mt-[6px]')}>
                {sent ? t('Thank you') : t('Tell us about you')}
              </div>
            </div>
            <Stripes height={8} />

            {sent ? (
              <div className="p-[clamp(20px,2.4vw,26px)] [animation:vfadeup_.4s_ease_both]">
                <div className="bg-[#E2FFEB] border-[1.5px] border-solid border-valle-green rounded-[18px] py-[18px] px-5">
                  <div className={cn(DISPLAY, 'text-[22px] text-valle-purple')}>{t('Application received')}</div>
                  <div className="font-mono text-[10.5px] font-normal tracking-[.14em] text-[rgba(52,0,87,.65)] mt-2">
                    {doneRef ? t('REFERENCE {ref}', { ref: doneRef }) + ' · ' : ''}{vacancy.title.toUpperCase()}
                  </div>
                </div>
                <div className={cn(MONO, 'text-valle-violet mt-5')}>{t('WHAT HAPPENS NEXT')}</div>
                <ol className="mt-3 mb-0 mx-0 p-0 list-none grid gap-3">
                  {[
                    t('Our HR team reads every application, usually within five working days.'),
                    t('If your profile fits the role, we email you to arrange a chat, on site or by phone.'),
                    t('Keep an eye on your spam folder: our reply comes from a vallepark.com address.'),
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3 items-start">
                      <span aria-hidden className={cn(MONO, 'bg-[#F7F3FF] text-valle-violet rounded-[999px] w-[26px] h-[26px] inline-flex items-center justify-center shrink-0')}>{i + 1}</span>
                      <span className="text-[14.5px] leading-[1.55] text-[rgba(52,0,87,.78)]">{step}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-[22px] flex gap-[10px] flex-wrap">
                  <GhostButton label={t('Browse other roles')} onClick={() => navigate(paths.vacancies())} />
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="p-[clamp(20px,2.4vw,26px)] grid gap-4">
                <TextField
                  id="fullName" label={t('Full name')} required autoComplete="name" maxLength={120}
                  placeholder="Jean-Marc Lafleur"
                  value={form.fullName} onChange={set('fullName')} onBlur={blur('fullName')} error={errorFor('fullName')}
                />
                <TextField
                  id="email" label={t('Email')} required type="email" inputMode="email" autoComplete="email" maxLength={180}
                  placeholder="you@example.com"
                  value={form.email} onChange={set('email')} onBlur={blur('email')} error={errorFor('email')}
                />
                <TextField
                  id="phone" label={t('Phone')} type="tel" inputMode="tel" autoComplete="tel" maxLength={40}
                  placeholder="+230 5xxx xxxx"
                  value={form.phone} onChange={set('phone')} onBlur={blur('phone')} error={errorFor('phone')}
                />
                <TextField
                  id="cvUrl" label={t('Link to your CV')} type="url" inputMode="url" maxLength={500}
                  placeholder="https://drive.google.com/..."
                  hint={t('A public link (Drive, Dropbox, LinkedIn). We do not accept file uploads.')}
                  value={form.cvUrl} onChange={set('cvUrl')} onBlur={blur('cvUrl')} error={errorFor('cvUrl')}
                />
                <TextField
                  id="years" label={t('Years of experience')} inputMode="numeric" maxLength={3}
                  placeholder="3"
                  value={form.years} onChange={set('years')} onBlur={blur('years')} error={errorFor('years')}
                />
                <TextArea
                  id="coverLetter" label={t('Why you')} max={COVER_MAX}
                  placeholder={t('Tell us what you would bring to the valley.')}
                  value={form.coverLetter} onChange={set('coverLetter')} onBlur={blur('coverLetter')} error={errorFor('coverLetter')}
                />

                {apiErr && (
                  <div role="alert" className="bg-[#FFE2E7] border-[1.5px] border-solid border-[#D91E44] rounded-[12px] py-[13px] px-4 text-[14px] leading-[1.5] text-valle-purple">
                    {apiErr}
                  </div>
                )}

                {tried && hasErrors && !apiErr && (
                  <div role="alert" className="bg-[#FFFFE2] border-[1.5px] border-solid border-valle-lilac rounded-[12px] py-[13px] px-4 text-[14px] leading-[1.5] text-valle-purple">
                    {t('Please check the highlighted fields before sending.')}
                  </div>
                )}

                <SubmitButton busy={busy} disabled={tried && hasErrors} />

                <div className="text-[12.5px] leading-[1.55] text-[rgba(52,0,87,.7)]">
                  {t('We use your details only to consider you for this role. Prefer email? Write to')}{' '}
                  <a href={'mailto:' + CAREERS_EMAIL} style={{ color: color.violet }}>{CAREERS_EMAIL}</a>.
                </div>
              </form>
            )}
          </div>
        </aside>
      </div>

      <div className="h-[clamp(48px,6vw,80px)]" />
    </main>
  );
}
