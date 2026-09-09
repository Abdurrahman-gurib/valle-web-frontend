import { useMemo, useState, type FormEvent } from 'react';
import {
  EMPLOYMENT_TYPES, createVacancy, errorText, requirementLines, toDateInput, updateVacancy,
  type EmploymentType, type HrVacancy, type VacancyInput, type VacancyStatus,
} from '../../lib/hrApi';
import { color, radius } from '../../styles/theme';
import { Btn, Spinner, mono } from '../staff/ui';
import {
  Drawer, Notice, SectionTitle, Segmented, SelectField, TextArea, TextField, labelStyle,
} from './hrUi';

/**
 * Post a new job / edit an existing one.
 *
 * Everything in the contract's vacancy body is here, the draft vs published
 * choice is explicit, and nothing leaves the browser until the form validates:
 * a published role with no summary would render an empty public card.
 */

const MAX = {
  title: 120,
  department: 120,
  location: 160,
  summary: 280,
  salaryRange: 120,
  description: 6000,
  requirements: 4000,
  benefits: 2000,
} as const;

type FormState = {
  title: string;
  department: string;
  location: string;
  employment: EmploymentType;
  summary: string;
  description: string;
  requirements: string;
  benefits: string;
  salaryRange: string;
  status: VacancyStatus;
  closesOn: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

const DEFAULT_LOCATION = 'Chamouny, Mauritius';

function initial(v: HrVacancy | null): FormState {
  return {
    title: v ? v.title : '',
    department: v ? v.department : '',
    location: v ? v.location : DEFAULT_LOCATION,
    employment: v ? v.employment : 'full-time',
    summary: v ? v.summary : '',
    description: v ? v.description : '',
    requirements: v ? v.requirements : '',
    benefits: v ? v.benefits : '',
    salaryRange: v ? v.salaryRange : '',
    status: v ? v.status : 'draft',
    closesOn: v ? toDateInput(v.closesOn) : '',
  };
}

/** Field-level checks that mirror the API DTO, so a bad body never leaves here. */
function validate(f: FormState): Errors {
  const e: Errors = {};
  const title = f.title.trim();
  if (title.length < 3) e.title = 'Give the role a title of at least 3 characters.';
  else if (title.length > MAX.title) e.title = 'Keep the title under ' + MAX.title + ' characters.';

  if (f.department.trim().length > MAX.department) e.department = 'Too long for a department name.';
  if (f.location.trim().length > MAX.location) e.location = 'Too long for a location.';
  if (f.summary.length > MAX.summary) e.summary = 'The listing summary is limited to ' + MAX.summary + ' characters.';
  if (f.salaryRange.trim().length > MAX.salaryRange) e.salaryRange = 'Too long for a salary range.';

  if (f.closesOn) {
    const d = new Date(f.closesOn + 'T12:00:00');
    if (isNaN(d.getTime())) e.closesOn = 'That is not a real date.';
  }

  // A published role is a public page: it needs something to show.
  if (f.status === 'published') {
    if (!f.summary.trim()) e.summary = 'A published role needs a one-line summary for the listing card.';
    if (!f.description.trim()) e.description = 'A published role needs a description.';
  }
  return e;
}

function toInput(f: FormState): VacancyInput {
  return {
    title: f.title.trim(),
    department: f.department.trim(),
    location: f.location.trim(),
    employment: f.employment,
    summary: f.summary.trim(),
    description: f.description.trim(),
    requirements: f.requirements.trim(),
    benefits: f.benefits.trim(),
    salaryRange: f.salaryRange.trim(),
    status: f.status,
    closesOn: f.closesOn ? f.closesOn : null,
  };
}

export default function VacancyForm({ vacancy, onClose, onSaved, narrow }: {
  vacancy: HrVacancy | null;
  onClose: () => void;
  onSaved: (v: HrVacancy, created: boolean) => void;
  narrow: boolean;
}) {
  const base = useMemo(() => initial(vacancy), [vacancy]);
  const [f, setF] = useState<FormState>(base);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setF((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const dirty = useMemo(
    () => (Object.keys(base) as (keyof FormState)[]).some((k) => base[k] !== f[k]),
    [base, f],
  );

  const close = () => {
    if (busy) return;
    if (dirty && !window.confirm('Close without saving? Your changes to this role will be lost.')) return;
    onClose();
  };

  const submit = async (ev?: FormEvent) => {
    if (ev) ev.preventDefault();
    if (busy) return;
    const found = validate(f);
    setErrors(found);
    const first = (Object.keys(found) as (keyof FormState)[]).find((k) => found[k]);
    if (first) {
      const el = document.getElementById('vac-' + first);
      if (el) el.focus();
      return;
    }
    setServerError('');
    setBusy(true);
    try {
      const body = toInput(f);
      const saved = vacancy
        ? await updateVacancy(vacancy.id, body)
        : await createVacancy(body);
      onSaved(saved, !vacancy);
    } catch (err) {
      setServerError(errorText(err, 'Could not save this role. Try again.'));
      setBusy(false);
    }
  };

  const reqCount = requirementLines(f.requirements).length;
  const cols = narrow ? '1fr' : '1fr 1fr';

  return (
    <Drawer
      eyebrow={vacancy ? 'EDIT ROLE' : 'NEW ROLE'}
      title={vacancy ? vacancy.title : 'Post a new job'}
      onClose={close}
      narrow={narrow}
      width={620}
      footer={
        <>
          <Btn variant="ghost" onClick={close} disabled={busy}>Cancel</Btn>
          <span style={{ flex: 1 }} />
          <Btn onClick={() => { void submit(); }} disabled={busy}>
            {busy ? <Spinner /> : (vacancy ? 'Save changes' : 'Create role')}
          </Btn>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        {vacancy && (
          <div style={{
            ...mono, fontSize: 10, letterSpacing: '.1em', color: 'rgba(52,0,87,.55)',
            background: color.tint, border: '1.5px solid ' + color.border, borderRadius: radius.md,
            padding: '8px 12px', marginBottom: 16, wordBreak: 'break-all',
          }}>
            /VACANCIES/{vacancy.slug.toUpperCase()} · {vacancy.applicationCount} APPLICATION{vacancy.applicationCount === 1 ? '' : 'S'}
          </div>
        )}

        <div style={{ marginBottom: 18 }}>
          <span style={labelStyle}>Visibility</span>
          <div style={{ marginTop: 7 }}>
            <Segmented
              value={f.status === 'closed' ? 'closed' : f.status}
              onChange={(v) => set('status', v as VacancyStatus)}
              disabled={busy}
              options={
                f.status === 'closed'
                  ? [
                    { value: 'draft', label: 'Draft' },
                    { value: 'published', label: 'Published' },
                    { value: 'closed', label: 'Closed' },
                  ]
                  : [
                    { value: 'draft', label: 'Draft' },
                    { value: 'published', label: 'Published' },
                  ]
              }
            />
          </div>
          <div style={{ fontSize: 12, color: 'rgba(52,0,87,.55)', marginTop: 7, lineHeight: 1.4 }}>
            {f.status === 'published'
              ? 'Published roles appear on the public vacancies page and accept applications.'
              : f.status === 'closed'
                ? 'Closed roles are off the public page. Their applications stay in the applicants tab.'
                : 'Drafts stay internal. Nothing is public until you publish.'}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <TextField
            id="vac-title"
            label="Job title"
            value={f.title}
            onChange={(v) => set('title', v)}
            error={errors.title}
            disabled={busy}
            required
            maxLength={MAX.title}
            placeholder="Zipline guide"
            hint={vacancy ? undefined : 'The web address is generated from the title.'}
          />

          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: cols }}>
            <TextField
              id="vac-department"
              label="Department"
              value={f.department}
              onChange={(v) => set('department', v)}
              error={errors.department}
              disabled={busy}
              maxLength={MAX.department}
              placeholder="Adventure"
            />
            <SelectField
              id="vac-employment"
              label="Employment"
              value={f.employment}
              onChange={(v) => set('employment', v as EmploymentType)}
              disabled={busy}
              options={EMPLOYMENT_TYPES}
            />
          </div>

          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: cols }}>
            <TextField
              id="vac-location"
              label="Location"
              value={f.location}
              onChange={(v) => set('location', v)}
              error={errors.location}
              disabled={busy}
              maxLength={MAX.location}
              placeholder={DEFAULT_LOCATION}
            />
            <TextField
              id="vac-salaryRange"
              label="Salary range"
              value={f.salaryRange}
              onChange={(v) => set('salaryRange', v)}
              error={errors.salaryRange}
              disabled={busy}
              maxLength={MAX.salaryRange}
              placeholder="Rs 22,000 to Rs 28,000"
              hint="Shown on the public card. Leave blank to keep it private."
            />
          </div>

          <TextField
            id="vac-closesOn"
            label="Closing date"
            type="date"
            value={f.closesOn}
            onChange={(v) => set('closesOn', v)}
            error={errors.closesOn}
            disabled={busy}
            hint="Optional. Applications stay open until you close the role."
          />

          <SectionTitle>The advert</SectionTitle>

          <TextArea
            id="vac-summary"
            label="Listing summary"
            value={f.summary}
            onChange={(v) => set('summary', v)}
            error={errors.summary}
            disabled={busy}
            rows={2}
            maxLength={MAX.summary}
            counter={f.summary.length + ' / ' + MAX.summary}
            placeholder="One line that sells the role on the vacancies page."
          />

          <TextArea
            id="vac-description"
            label="Description"
            value={f.description}
            onChange={(v) => set('description', v)}
            error={errors.description}
            disabled={busy}
            rows={6}
            maxLength={MAX.description}
            placeholder="What the day looks like, who the team is, what success means."
          />

          <TextArea
            id="vac-requirements"
            label="Requirements"
            value={f.requirements}
            onChange={(v) => set('requirements', v)}
            error={errors.requirements}
            disabled={busy}
            rows={5}
            maxLength={MAX.requirements}
            counter={reqCount + ' line' + (reqCount === 1 ? '' : 's')}
            hint="One per line. Each line becomes a bullet on the public page."
            placeholder={'Comfortable at height\nConversational English and French\nFirst aid certificate is a plus'}
          />

          <TextArea
            id="vac-benefits"
            label="Benefits"
            value={f.benefits}
            onChange={(v) => set('benefits', v)}
            error={errors.benefits}
            disabled={busy}
            rows={3}
            maxLength={MAX.benefits}
            placeholder="Meals on shift, park access for family, training."
          />
        </div>

        {serverError && (
          <div style={{ marginTop: 16 }}>
            <Notice>{serverError}</Notice>
          </div>
        )}

        {/* Lets Enter submit the form while the visible action lives in the footer. */}
        <button type="submit" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
      </form>
    </Drawer>
  );
}
