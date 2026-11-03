import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { applyToVacancy, isHttpError } from '../../lib/careersApi';
import type { ApplicationRequest, VacancyDetail } from '../../types';
import { useT, _t } from '../../i18n';
import { CAREERS_EMAIL } from './shared';

export interface FormState {
  fullName: string;
  email: string;
  phone: string;
  cvUrl: string;
  years: string;
  coverLetter: string;
}

export type FieldKey = keyof FormState;
type Errors = Partial<Record<FieldKey, string>>;

const EMPTY_FORM: FormState = { fullName: '', email: '', phone: '', cvUrl: '', years: '', coverLetter: '' };

export const COVER_MAX = 4000;

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

/** The application form: fields, validation shown once a field is left (or on submit), and sending. */
export function useApplication(vacancy: VacancyDetail | null) {
  const t = useT();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [sent, setSent] = useState(false);
  const [doneRef, setDoneRef] = useState('');

  const errors = useMemo(() => validate(form), [form]);
  const errorFor = useCallback(
    (k: FieldKey): string | undefined => ((tried || touched[k]) ? errors[k] : undefined),
    [errors, touched, tried],
  );
  const hasErrors = Object.keys(errors).length > 0;

  /** The props one form field needs: value, change, blur and its error. */
  const field = (k: FieldKey) => ({
    value: form[k],
    onChange: (v: string) => {
      setForm((f) => ({ ...f, [k]: v }));
      if (apiErr) setApiErr('');
    },
    onBlur: () => setTouched((x) => ({ ...x, [k]: true })),
    error: errorFor(k),
  });

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || !vacancy) return;
    setTried(true);
    setApiErr('');
    if (hasErrors) {
      document.getElementById(Object.keys(errors)[0])?.focus();
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

  return { field, onSubmit, tried, hasErrors, busy, apiErr, sent, doneRef };
}

export type Application = ReturnType<typeof useApplication>;
