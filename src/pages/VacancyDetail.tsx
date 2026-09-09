import {
  useCallback, useEffect, useMemo, useState,
  type CSSProperties, type FormEvent, type ReactNode,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import { useHover } from '../hooks/useHover';
import { useIsMobile } from '../hooks/useIsMobile';
import { Img } from '../components/Img';
import { Stripes } from '../components/Stripes';
import { applyToVacancy, getVacancy, isHttpError } from '../lib/careersApi';
import { fullDateFromIso } from '../lib/format';
import type { ApplicationRequest, EmploymentType, VacancyDetail } from '../types';
import { color, display, font, mono, motion, radius, shadow } from '../styles/theme';

const CAREERS_EMAIL = 'sales@vallepark.com';

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
  if (!name) e.fullName = 'Please tell us your name.';
  else if (name.length < 2) e.fullName = 'That looks a little short.';
  else if (name.length > 120) e.fullName = 'Please keep this under 120 characters.';

  const email = f.email.trim();
  if (!email) e.email = 'We need an email address to reply to.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) e.email = 'That email address does not look right.';

  if (f.phone.trim().length > 40) e.phone = 'Please keep this under 40 characters.';

  const cv = f.cvUrl.trim();
  if (cv) {
    if (cv.length > 500) e.cvUrl = 'That link is too long (500 characters max).';
    else if (!/^https?:\/\/\S+$/i.test(cv)) e.cvUrl = 'Use a full link starting with http:// or https://';
  }

  const years = f.years.trim();
  if (years) {
    if (!/^\d{1,3}$/.test(years)) e.years = 'Whole numbers only, please.';
    else if (Number(years) > 60) e.years = 'Please enter 60 or fewer.';
  }

  if (f.coverLetter.length > COVER_MAX) e.coverLetter = 'Please keep this under 4000 characters.';

  return e;
}

// ---------------------------------------------------------------- small parts

const labelStyle: CSSProperties = { ...mono, color: 'rgba(52,0,87,.7)', display: 'block', marginBottom: 7 };

function fieldStyle(invalid: boolean, focused: boolean): CSSProperties {
  return {
    width: '100%',
    border: `1.5px solid ${invalid ? color.pinkDark : focused ? color.violet : color.border}`,
    background: invalid ? color.errFill : color.white,
    borderRadius: radius.md,
    padding: '12px 15px',
    fontFamily: font.body,
    fontSize: 15,
    color: color.purple,
    outline: 'none',
    transition: `border-color ${motion.fast}, background ${motion.fast}`,
  };
}

function ErrorNote({ id, text }: { id: string; text: string }) {
  return (
    <div id={id} role="alert" style={{ ...mono, fontWeight: 400, color: color.pinkDark, marginTop: 6, letterSpacing: '.06em' }}>
      {text}
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
  const [focused, setFocused] = useState(false);
  const invalid = Boolean(p.error);
  return (
    <div>
      <label htmlFor={p.id} style={labelStyle}>
        {p.label.toUpperCase()}
        {!p.required && <span style={{ opacity: 0.55 }}> · OPTIONAL</span>}
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
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); p.onBlur(); }}
        style={fieldStyle(invalid, focused)}
      />
      {invalid
        ? <ErrorNote id={p.id + '-err'} text={p.error || ''} />
        : p.hint
          ? <div id={p.id + '-hint'} style={{ fontSize: 12.5, color: 'rgba(52,0,87,.55)', marginTop: 6 }}>{p.hint}</div>
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
  const [focused, setFocused] = useState(false);
  const invalid = Boolean(p.error);
  const left = p.max - p.value.length;
  return (
    <div>
      <label htmlFor={p.id} style={labelStyle}>
        {p.label.toUpperCase()}<span style={{ opacity: 0.55 }}> · OPTIONAL</span>
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
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); p.onBlur(); }}
        style={{ ...fieldStyle(invalid, focused), resize: 'vertical', lineHeight: 1.55, minHeight: 120 }}
      />
      {invalid
        ? <ErrorNote id={p.id + '-err'} text={p.error || ''} />
        : (
          <div id={p.id + '-count'} style={{ ...mono, fontWeight: 400, color: 'rgba(52,0,87,.5)', marginTop: 6, textAlign: 'right' }}>
            {left} CHARACTERS LEFT
          </div>
        )}
    </div>
  );
}

function Pill({ children, bg, fg }: { children: ReactNode; bg: string; fg: string }) {
  return (
    <span style={{ ...mono, background: bg, color: fg, borderRadius: radius.pill, padding: '7px 12px', lineHeight: 1 }}>
      {children}
    </span>
  );
}

function SubmitButton({ busy, disabled, onClick }: { busy: boolean; disabled: boolean; onClick?: () => void }) {
  const [h, bind] = useHover();
  const off = busy || disabled;
  return (
    <button
      {...bind}
      type="submit"
      onClick={onClick}
      disabled={off}
      aria-busy={busy || undefined}
      className={off ? undefined : 'press'}
      style={{
        width: '100%', border: 0, cursor: off ? 'not-allowed' : 'pointer',
        background: off ? '#C9B3E8' : h ? color.pinkDark : color.pink,
        fontFamily: font.display, fontStyle: 'italic', fontWeight: 900, fontSize: 17,
        letterSpacing: '.03em', textTransform: 'uppercase', color: color.white,
        padding: '15px 0', borderRadius: radius.pill,
        boxShadow: off ? 'none' : shadow.pink,
        transform: !off && h ? 'translateY(-1px)' : 'none',
        transition: `transform ${motion.fast}, background ${motion.fast}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}
    >
      {busy && (
        <span aria-hidden style={{
          width: 9, height: 9, borderRadius: 999, background: color.white,
          display: 'inline-block', animation: 'vbeat .9s ease-in-out infinite',
        }} />
      )}
      {busy ? 'Sending…' : 'Send my application'}
    </button>
  );
}

function GhostButton({ label, onClick }: { label: string; onClick: () => void }) {
  const [h, bind] = useHover();
  return (
    <button
      {...bind}
      onClick={onClick}
      className="press"
      style={{
        border: `2px solid ${color.purple}`, background: h ? color.purple : 'transparent', cursor: 'pointer',
        fontFamily: font.body, fontSize: 14, fontWeight: 700, color: h ? color.white : color.purple,
        padding: '12px 24px', borderRadius: radius.pill, transition: `background ${motion.fast}, color ${motion.fast}`,
      }}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------- page

export default function VacancyDetailPage() {
  const ref = useReveal<HTMLElement>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { slug = '' } = useParams<{ slug: string }>();

  const [vacancy, setVacancy] = useState<VacancyDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');

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
          setApiErr('You have sent several applications already. Please try again in about ten minutes.');
        } else if (err.status === 404 || err.status === 409 || err.status === 410) {
          setApiErr('This role has just closed. Please look at the other open roles, or write to us directly.');
        } else {
          setApiErr(err.message || 'We could not send your application. Please try again.');
        }
      } else {
        setApiErr('We could not reach the park. Check your connection and try again, or email ' + CAREERS_EMAIL + '.');
      }
    } finally {
      setBusy(false);
    }
  };

  // ---- states that replace the whole page ----

  const shell = (children: ReactNode) => (
    <main ref={ref} style={{ maxWidth: 1320, margin: '0 auto', padding: '104px clamp(16px,3.5vw,40px) 0' }}>
      {children}
      <div style={{ height: 'clamp(48px,6vw,80px)' }} />
    </main>
  );

  if (state === 'loading') {
    return shell(
      <div style={{ padding: 'clamp(40px,8vw,120px) 0', textAlign: 'center' }}>
        <div style={{ ...mono, color: color.violet }}>LOADING THE ROLE…</div>
        <div style={{
          margin: '22px auto 0', width: 'min(520px,100%)', height: 10, borderRadius: radius.pill,
          background: color.tint, overflow: 'hidden',
        }}>
          <div style={{ width: '40%', height: '100%', background: color.violet, animation: 'vfade 1s ease-in-out infinite alternate' }} />
        </div>
      </div>,
    );
  }

  if (state === 'missing' || state === 'error') {
    const missing = state === 'missing';
    return shell(
      <div style={{
        background: missing ? color.tint : color.errFill, border: `1.5px solid ${color.border}`,
        borderRadius: radius.xl, padding: 'clamp(28px,4vw,56px)', textAlign: 'center',
      }}>
        <div style={{ ...mono, color: color.violet }}>{missing ? 'ROLE CLOSED' : 'SOMETHING WENT WRONG'}</div>
        <h1 style={{ ...display, fontSize: 'clamp(28px,4vw,48px)', color: color.purple, margin: '12px 0 0', transform: 'rotate(-2deg)' }}>
          {missing ? 'This role is no longer open' : 'We could not load this role'}
        </h1>
        <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'rgba(52,0,87,.72)', margin: '16px auto 0', maxWidth: 520 }}>
          {missing
            ? 'It may have been filled or taken down. Have a look at what is open today, or send us an open application.'
            : 'Please try again in a moment. If it keeps happening, write to us at ' + CAREERS_EMAIL + '.'}
        </p>
        <div style={{ marginTop: 22, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <GhostButton label="← All open roles" onClick={() => navigate('/vacancies')} />
        </div>
      </div>,
    );
  }

  if (!vacancy) return shell(null);

  // ---- the role ----

  const emp = EMPLOYMENT_COLOR[vacancy.employment] || { bg: color.tint, fg: color.purple };
  const empLabel = EMPLOYMENT_LABEL[vacancy.employment] || 'ROLE';
  const closes = vacancy.closesOn ? fullDateFromIso(vacancy.closesOn.slice(0, 10)) : '';
  const reqs = lines(vacancy.requirements);
  const perks = lines(vacancy.benefits);
  const about = paragraphs(vacancy.description);
  const hasErrors = Object.keys(errors).length > 0;

  const sectionTitle: CSSProperties = {
    ...display, fontSize: 'clamp(22px,2.6vw,30px)', color: color.purple, margin: 0,
  };

  return (
    <main ref={ref} style={{ maxWidth: 1320, margin: '0 auto', padding: '104px clamp(16px,3.5vw,40px) 0' }}>
      <button
        onClick={() => navigate('/vacancies')}
        style={{
          border: 0, background: 'transparent', cursor: 'pointer', padding: 0,
          ...mono, color: color.violet, marginBottom: 18,
        }}
      >
        ← ALL OPEN ROLES
      </button>

      {/* ---- role header ---- */}
      <header data-reveal>
        <div style={{ ...mono, color: color.pink }}>{(vacancy.department || 'VALLÉ PARK').toUpperCase()}</div>
        <h1 style={{
          ...display, fontSize: 'clamp(38px,6vw,82px)', color: color.purple, margin: '12px 0 0',
          transform: 'rotate(-3deg)', transformOrigin: 'left bottom', maxWidth: 900,
        }}>
          {vacancy.title}
        </h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 22 }}>
          <Pill bg={emp.bg} fg={emp.fg}>{empLabel}</Pill>
          <Pill bg={color.tint} fg={color.purple}>{(vacancy.location || 'CHAMOUNY, MAURITIUS').toUpperCase()}</Pill>
          {vacancy.salaryRange && <Pill bg={color.purple} fg={color.yellow}>{vacancy.salaryRange.toUpperCase()}</Pill>}
          <Pill bg={color.tint} fg={color.purple}>{closes ? 'CLOSES ' + closes.toUpperCase() : 'OPEN UNTIL FILLED'}</Pill>
        </div>
        {isMobile && !sent && (
          <button
            onClick={() => {
              const el = document.getElementById('apply');
              if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 84), behavior: 'smooth' });
            }}
            className="press"
            style={{
              marginTop: 18, width: '100%', border: 0, background: color.pink, cursor: 'pointer',
              fontFamily: font.display, fontStyle: 'italic', fontWeight: 900, fontSize: 16,
              letterSpacing: '.03em', textTransform: 'uppercase', color: color.white,
              padding: '14px 0', borderRadius: radius.pill, boxShadow: shadow.pink,
            }}
          >
            Apply for this role ↓
          </button>
        )}
        <Stripes height={8} style={{ borderRadius: radius.pill, margin: '26px 0 0' }} />
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1.3fr) minmax(340px,.7fr)',
        gap: 'clamp(24px,3.5vw,56px)',
        alignItems: 'start',
        marginTop: 'clamp(28px,3.5vw,44px)',
      }}>
        {/* ---- left: the role ---- */}
        <div>
          {vacancy.summary && (
            <p data-reveal style={{
              fontSize: 'clamp(17px,1.6vw,21px)', lineHeight: 1.55, color: color.purple, fontWeight: 500,
              margin: 0, borderLeft: `4px solid ${color.green}`, paddingLeft: 18,
            }}>
              {vacancy.summary}
            </p>
          )}

          {about.length > 0 && (
            <section data-reveal style={{ marginTop: 'clamp(28px,3vw,40px)' }}>
              <h2 style={sectionTitle}>About the role</h2>
              {about.map((p, i) => (
                <p key={i} style={{ fontSize: 15.5, lineHeight: 1.7, color: 'rgba(52,0,87,.78)', margin: '14px 0 0' }}>{p}</p>
              ))}
            </section>
          )}

          {reqs.length > 0 && (
            <section data-reveal style={{ marginTop: 'clamp(28px,3vw,40px)' }}>
              <h2 style={sectionTitle}>What we are looking for</h2>
              <ul style={{ listStyle: 'none', margin: '16px 0 0', padding: 0, display: 'grid', gap: 10 }}>
                {reqs.map((r, i) => (
                  <li key={i} style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start', background: color.tint,
                    border: `1.5px solid ${color.border}`, borderRadius: radius.md, padding: '13px 16px',
                  }}>
                    <span aria-hidden style={{ ...mono, color: color.violet, marginTop: 3 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: 15, lineHeight: 1.55, color: 'rgba(52,0,87,.82)' }}>{r}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {perks.length > 0 && (
            <section data-reveal style={{ marginTop: 'clamp(28px,3vw,40px)' }}>
              <h2 style={sectionTitle}>What you get</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
                {perks.map((b, i) => (
                  <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8, background: color.white,
                    boxShadow: `0 0 0 1.5px ${color.border}`, borderRadius: radius.pill, padding: '10px 15px',
                    fontSize: 14, color: color.purple,
                  }}>
                    <span aria-hidden style={{ color: color.greenDeep, fontWeight: 700 }}>✓</span>
                    {b}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section data-reveal style={{ marginTop: 'clamp(28px,3.5vw,44px)' }}>
            <h2 style={sectionTitle}>Where you would work</h2>
            <div style={{
              position: 'relative', marginTop: 16, borderRadius: radius.xl, overflow: 'hidden',
              minHeight: isMobile ? 200 : 260, background: color.purple, boxShadow: shadow.card,
            }}>
              <Img
                src="/images/trail-reception.webp"
                alt="The reception trail at Vallé Advenature Park"
                surface="dark"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(38,0,64,.88), rgba(38,0,64,0) 62%)' }} />
              <div style={{ position: 'absolute', left: 20, right: 20, bottom: 18, color: color.white }}>
                <div style={{ ...mono, color: color.yellow }}>CHAMOUNY, SOUTH MAURITIUS</div>
                <div style={{ ...display, fontSize: 'clamp(20px,2.4vw,28px)', marginTop: 6 }}>
                  200 hectares of valley, open daily
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ---- right: apply ---- */}
        <aside
          id="apply"
          style={{ position: isMobile ? 'static' : 'sticky', top: 92, marginTop: isMobile ? 8 : 0 }}
        >
          <div style={{
            background: color.white, borderRadius: radius.xl, overflow: 'hidden',
            boxShadow: `0 0 0 1.5px ${color.border}, ${shadow.card}`,
          }}>
            <div style={{ background: color.purple, padding: '18px 22px' }}>
              <div style={{ ...mono, color: color.yellow }}>{sent ? 'APPLICATION SENT' : 'APPLY NOW'}</div>
              <div style={{ ...display, fontSize: 24, color: color.white, marginTop: 6 }}>
                {sent ? 'Thank you' : 'Tell us about you'}
              </div>
            </div>
            <Stripes height={8} />

            {sent ? (
              <div style={{ padding: 'clamp(20px,2.4vw,26px)', animation: 'vfadeup .4s ease both' }}>
                <div style={{
                  background: color.okFill, border: `1.5px solid ${color.green}`, borderRadius: radius.lg,
                  padding: '18px 20px',
                }}>
                  <div style={{ ...display, fontSize: 22, color: color.purple }}>Application received</div>
                  <div style={{ ...mono, fontWeight: 400, color: 'rgba(52,0,87,.65)', marginTop: 8 }}>
                    {doneRef ? 'REFERENCE ' + doneRef + ' · ' : ''}{vacancy.title.toUpperCase()}
                  </div>
                </div>
                <div style={{ ...mono, color: color.violet, marginTop: 20 }}>WHAT HAPPENS NEXT</div>
                <ol style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 12 }}>
                  {[
                    'Our HR team reads every application, usually within five working days.',
                    'If your profile fits the role, we email you to arrange a chat, on site or by phone.',
                    'Keep an eye on your spam folder: our reply comes from a vallepark.com address.',
                  ].map((t, i) => (
                    <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span aria-hidden style={{
                        ...mono, background: color.tint, color: color.violet, borderRadius: radius.pill,
                        width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>{i + 1}</span>
                      <span style={{ fontSize: 14.5, lineHeight: 1.55, color: 'rgba(52,0,87,.78)' }}>{t}</span>
                    </li>
                  ))}
                </ol>
                <div style={{ marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <GhostButton label="Browse other roles" onClick={() => navigate('/vacancies')} />
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate style={{ padding: 'clamp(20px,2.4vw,26px)', display: 'grid', gap: 16 }}>
                <TextField
                  id="fullName" label="Full name" required autoComplete="name" maxLength={120}
                  placeholder="Jean-Marc Lafleur"
                  value={form.fullName} onChange={set('fullName')} onBlur={blur('fullName')} error={errorFor('fullName')}
                />
                <TextField
                  id="email" label="Email" required type="email" inputMode="email" autoComplete="email" maxLength={180}
                  placeholder="you@example.com"
                  value={form.email} onChange={set('email')} onBlur={blur('email')} error={errorFor('email')}
                />
                <TextField
                  id="phone" label="Phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={40}
                  placeholder="+230 5xxx xxxx"
                  value={form.phone} onChange={set('phone')} onBlur={blur('phone')} error={errorFor('phone')}
                />
                <TextField
                  id="cvUrl" label="Link to your CV" type="url" inputMode="url" maxLength={500}
                  placeholder="https://drive.google.com/..."
                  hint="A public link (Drive, Dropbox, LinkedIn). We do not accept file uploads."
                  value={form.cvUrl} onChange={set('cvUrl')} onBlur={blur('cvUrl')} error={errorFor('cvUrl')}
                />
                <TextField
                  id="years" label="Years of experience" inputMode="numeric" maxLength={3}
                  placeholder="3"
                  value={form.years} onChange={set('years')} onBlur={blur('years')} error={errorFor('years')}
                />
                <TextArea
                  id="coverLetter" label="Why you" max={COVER_MAX}
                  placeholder="Tell us what you would bring to the valley."
                  value={form.coverLetter} onChange={set('coverLetter')} onBlur={blur('coverLetter')} error={errorFor('coverLetter')}
                />

                {apiErr && (
                  <div role="alert" style={{
                    background: color.errFill, border: `1.5px solid ${color.pinkDark}`, borderRadius: radius.md,
                    padding: '13px 16px', fontSize: 14, lineHeight: 1.5, color: color.purple,
                  }}>
                    {apiErr}
                  </div>
                )}

                {tried && hasErrors && !apiErr && (
                  <div role="alert" style={{
                    background: color.warnFill, border: `1.5px solid ${color.border}`, borderRadius: radius.md,
                    padding: '13px 16px', fontSize: 14, lineHeight: 1.5, color: color.purple,
                  }}>
                    Please check the highlighted fields before sending.
                  </div>
                )}

                <SubmitButton busy={busy} disabled={tried && hasErrors} />

                <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'rgba(52,0,87,.55)' }}>
                  We use your details only to consider you for this role. Prefer email? Write to{' '}
                  <a href={'mailto:' + CAREERS_EMAIL} style={{ color: color.violet }}>{CAREERS_EMAIL}</a>.
                </div>
              </form>
            )}
          </div>
        </aside>
      </div>

      <div style={{ height: 'clamp(48px,6vw,80px)' }} />
    </main>
  );
}
