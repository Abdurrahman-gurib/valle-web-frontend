import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  APPLICATION_STATUSES, applicationsExportUrl, errorText, listApplications, listVacancies, safeCvHref, updateApplication,
  type ApplicationStatus, type HrApplication, type HrVacancy,
} from '../../lib/hrApi';
import { color } from '../../styles/theme';
import { Btn, EmptyState, Spinner, relTime, shortDate } from '../staff/ui';
import { cn } from '@/lib/utils';
import { ExportLink } from '../staff/reportUi';
import {
  CopyButton, DetailLine, Drawer, FilterSelect, MetaPill, Notice, Pill, SectionTitle, TextArea,
  fieldCls,
} from './hrUi';

/**
 * Applicants tab: filter by role and status, search by name or email, then work
 * one application at a time in the drawer.
 *
 * Everything shown here (contact details, cover letter, the internal note) is
 * HR-only data and is rendered as text: an application is untrusted input.
 */

const PAGE_SIZE = 20;

const thCls =
  'font-mono text-[9.5px] font-bold tracking-[.13em] uppercase text-valle-violet text-left py-[10px] px-[12px] whitespace-nowrap';

const tdCls = 'py-[11px] px-[12px] text-[13.5px] border-t border-solid border-valle-lilac whitespace-nowrap';

const cardCls = 'bg-white border-[1.5px] border-solid border-valle-lilac rounded-[18px]';

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  ...APPLICATION_STATUSES.map((s) => ({ value: s.value as string, label: s.label })),
];

const yearsLabel = (y: number | null): string =>
  y === null || y === undefined ? 'Not given' : y === 0 ? 'No experience yet' : y + ' year' + (y === 1 ? '' : 's');

function Row({ a, roleName, onOpen }: { a: HrApplication; roleName: string; onOpen: () => void }) {
  return (
    <tr
      onClick={onOpen}
      className="cursor-pointer bg-white hover:bg-[#F7F3FF] transition-[background] duration-[.12s] ease-[ease]"
    >
      <td className={cn(tdCls, 'whitespace-normal min-w-[220px]')}>
        <div className="font-bold">{a.fullName}</div>
        <div className="font-mono text-[10.5px] tracking-[.04em] text-[rgba(52,0,87,.6)] mt-[2px] break-all">
          {a.email}
        </div>
      </td>
      <td className={cn(tdCls, 'whitespace-normal min-w-[160px]')}>{roleName}</td>
      <td className={tdCls}>{yearsLabel(a.yearsExperience)}</td>
      <td className={tdCls}><Pill value={a.status} /></td>
      <td className={tdCls}>
        <span title={shortDate(a.createdAt)}>{relTime(a.createdAt)}</span>
      </td>
    </tr>
  );
}

function ApplicantCard({ a, roleName, onOpen }: { a: HrApplication; roleName: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        cardCls,
        'p-[14px] w-full text-left cursor-pointer [font-family:inherit] text-valle-purple block bg-white hover:bg-[#F7F3FF]',
      )}
    >
      <div className="flex items-start gap-[10px]">
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[15.5px]">{a.fullName}</div>
          <div className="font-mono text-[10.5px] text-[rgba(52,0,87,.6)] mt-[3px] break-all">
            {a.email}
          </div>
        </div>
        <Pill value={a.status} />
      </div>
      <div className="flex gap-[6px] flex-wrap mt-[10px]">
        <MetaPill>{roleName}</MetaPill>
        <MetaPill>{yearsLabel(a.yearsExperience)}</MetaPill>
        <MetaPill>{relTime(a.createdAt)}</MetaPill>
      </div>
    </button>
  );
}

/** One application, with the two things HR changes: status and the internal note. */
function ApplicantDrawer({ app, roleName, narrow, onClose, onSaved }: {
  app: HrApplication;
  roleName: string;
  narrow: boolean;
  onClose: () => void;
  onSaved: (a: HrApplication) => void;
}) {
  const [status, setStatus] = useState<ApplicationStatus>(app.status);
  const [note, setNote] = useState(app.hrNote || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const dirty = status !== app.status || note !== (app.hrNote || '');
  const cv = safeCvHref(app.cvUrl);
  const letterLines = app.coverLetter ? app.coverLetter.split('\n') : [];

  const close = () => {
    if (busy) return;
    if (dirty && !window.confirm('Close without saving? The status and note changes will be lost.')) return;
    onClose();
  };

  const save = async () => {
    if (busy || !dirty) return;
    setBusy(true);
    setErr('');
    setOk('');
    try {
      const saved = await updateApplication(app.id, { status, hrNote: note });
      onSaved(saved);
      setOk('Saved.');
    } catch (e) {
      setErr(errorText(e, 'Could not save this application. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const gridCls = cn(
    cardCls, 'bg-[#F7F3FF] p-[16px] grid gap-[14px]',
    narrow ? 'grid-cols-[1fr]' : 'grid-cols-[1fr_1fr]',
  );

  return (
    <Drawer
      eyebrow="APPLICATION"
      title={app.fullName}
      onClose={close}
      narrow={narrow}
      width={520}
      footer={
        <>
          <Btn variant="ghost" onClick={close} disabled={busy}>Close</Btn>
          <span className="flex-1" />
          <Btn onClick={() => { void save(); }} disabled={busy || !dirty}>
            {busy ? <Spinner /> : 'Save changes'}
          </Btn>
        </>
      }
    >
      <div className="flex items-center gap-[10px] mb-[16px] flex-wrap">
        <Pill value={app.status} />
        <span className="font-mono text-[10px] tracking-[.1em] text-[rgba(52,0,87,.5)]">
          APPLIED {shortDate(app.createdAt)}
        </span>
      </div>

      <div className={gridCls}>
        <DetailLine tag="APPLYING FOR" value={roleName} />
        <DetailLine tag="EXPERIENCE" value={yearsLabel(app.yearsExperience)} />
        <DetailLine tag="EMAIL" value={app.email} />
        <DetailLine tag="PHONE" value={app.phone} />
        <DetailLine tag="CV LINK">
          {cv ? (
            <a
              href={cv}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="font-semibold break-all"
              style={{ color: color.violet }}
            >
              Open CV
            </a>
          ) : (app.cvUrl ? 'Link was not a usable web address' : 'Not given')}
        </DetailLine>
        <DetailLine tag="LAST UPDATED" value={shortDate(app.updatedAt)} />
      </div>

      <div className="flex gap-[8px] flex-wrap mt-[12px]">
        <CopyButton value={app.email} label="Copy email" />
        {app.phone ? <CopyButton value={app.phone} label="Copy phone" /> : null}
        <a
          href={'mailto:' + encodeURIComponent(app.email) + '?subject=' + encodeURIComponent('Your application to VALLÉ: ' + roleName)}
          className="border-[1.5px] border-solid border-valle-lilac rounded-[999px] py-[7px] px-[14px] text-[12.5px] font-bold whitespace-nowrap"
          style={{ color: color.purple, textDecoration: 'none' }}
        >
          Write a reply
        </a>
      </div>

      <SectionTitle>Cover letter</SectionTitle>
      <div className={cn(cardCls, 'p-[16px] text-[14px] leading-[1.6]')}>
        {letterLines.length === 0 && (
          <span className="text-[rgba(52,0,87,.7)]">No cover letter was sent.</span>
        )}
        {letterLines.map((line, i) => (
          <p key={i} className={cn(i === 0 ? 'm-0' : 'mt-[10px] mx-0 mb-0', '[word-break:break-word]')}>{line}</p>
        ))}
      </div>

      <SectionTitle>Move this application</SectionTitle>
      <select
        id={'app-status-' + app.id}
        value={status}
        onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
        disabled={busy}
        aria-label="Application status"
        className={cn(fieldCls, 'cursor-pointer appearance-auto')}
      >
        {APPLICATION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      <div className="mt-[14px]">
        <TextArea
          id={'app-note-' + app.id}
          label="Internal note"
          value={note}
          onChange={setNote}
          disabled={busy}
          rows={4}
          maxLength={4000}
          hint="Only the hiring team sees this. It is never sent to the applicant."
          placeholder="Interview notes, next step, who is following up."
        />
      </div>

      {(err || ok) && (
        <div className="mt-[14px]">
          <Notice tone={err ? 'error' : 'ok'}>{err || ok}</Notice>
        </div>
      )}
    </Drawer>
  );
}

export default function ApplicantsPanel({ narrow, onChanged }: {
  narrow: boolean;
  onChanged: (force?: boolean) => void;
}) {
  const [vacancies, setVacancies] = useState<HrVacancy[]>([]);
  const [rows, setRows] = useState<HrApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [vacancyId, setVacancyId] = useState('all');
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  // The vacancy list doubles as the filter's options and as the id -> title map
  // for rows, so a role name is shown even if the API does not denormalise it.
  useEffect(() => {
    listVacancies('all')
      .then((res) => setVacancies(res.items || []))
      .catch(() => { /* the filter simply stays at "All roles" */ });
  }, []);

  const titleById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const v of vacancies) map[v.id] = v.title;
    return map;
  }, [vacancies]);

  const roleName = useCallback(
    (a: HrApplication) => a.vacancyTitle || titleById[a.vacancyId] || 'Role removed',
    [titleById],
  );

  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 320);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => { setPage(1); }, [dq, status, vacancyId]);

  const load = useCallback(() => {
    setLoading(true);
    return listApplications({
      vacancyId: vacancyId === 'all' ? undefined : vacancyId,
      status: status === 'all' ? undefined : status,
      q: dq || undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        setRows(res.items || []);
        setTotal(res.total || 0);
        setErr('');
      })
      .catch((e: unknown) => setErr(errorText(e, 'Could not load the applications.')))
      .finally(() => setLoading(false));
  }, [vacancyId, status, dq, page]);

  useEffect(() => { void load(); }, [load]);

  const onSaved = useCallback((saved: HrApplication) => {
    setRows((prev) => prev.map((r) => (r.id === saved.id ? { ...r, ...saved } : r)));
    onChanged(true);
  }, [onChanged]);

  const vacancyOptions = useMemo(
    () => [
      { value: 'all', label: 'All roles' },
      ...vacancies.map((v) => ({ value: v.id, label: v.title + (v.status === 'published' ? '' : ' (' + v.status + ')') })),
    ],
    [vacancies],
  );

  const open = rows.find((r) => r.id === openId) || null;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = dq !== '' || status !== 'all' || vacancyId !== 'all';

  const clear = () => { setQ(''); setStatus('all'); setVacancyId('all'); };

  return (
    <div>
      {/* ---- filter bar: stacks on a tablet ---- */}
      <div className={cn(cardCls, 'p-[14px] mb-[14px] flex flex-wrap gap-[10px] items-center')}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a name or email"
          aria-label="Search applicants"
          className={cn(fieldCls, 'flex-[1_1_220px] w-auto min-w-[170px]')}
        />
        <FilterSelect
          value={vacancyId}
          onChange={setVacancyId}
          ariaLabel="Filter applicants by role"
          options={vacancyOptions}
          width={narrow ? '100%' : 230}
        />
        <FilterSelect
          value={status}
          onChange={setStatus}
          ariaLabel="Filter applicants by status"
          options={STATUS_FILTERS}
          width={narrow ? '100%' : 170}
        />
        {filtered && <Btn variant="ghost" onClick={clear} style={narrow ? { width: '100%' } : undefined}>Clear</Btn>}
        <div className={narrow ? 'ml-0 w-full' : 'ml-auto w-auto'}>
          <ExportLink href={applicationsExportUrl({ vacancyId: vacancyId === 'all' ? undefined : vacancyId, status: status === 'all' ? undefined : status, q: dq || undefined })} label="Export applicants CSV" />
        </div>
      </div>

      {err && <div className="mb-[12px]"><Notice>{err}</Notice></div>}

      {rows.length === 0 ? null : narrow ? (
        <div className="grid gap-[10px]">
          {rows.map((a) => (
            <ApplicantCard key={a.id} a={a} roleName={roleName(a)} onOpen={() => setOpenId(a.id)} />
          ))}
        </div>
      ) : (
        <div className={cn(cardCls, 'overflow-hidden')}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-[#F7F3FF]">
                  {['Applicant', 'Role', 'Experience', 'Status', 'Applied'].map((c) => (
                    <th key={c} className={thCls}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <Row key={a.id} a={a} roleName={roleName(a)} onOpen={() => setOpenId(a.id)} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && (
        <div className="py-[34px] px-0 flex justify-center">
          <Spinner color={color.violet} size={9} />
        </div>
      )}

      {!loading && !err && rows.length === 0 && (
        <div className={cardCls}>
          {filtered
            ? <EmptyState title="No matches" note="Nobody fits these filters. Widen the role or the status, or clear the search." />
            : <EmptyState title="No applications yet" note="Applications sent from a published vacancy page land here straight away." />}
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center gap-[12px] mt-[14px] flex-wrap">
          <span className="font-mono text-[10.5px] tracking-[.1em] text-[rgba(52,0,87,.6)]">
            PAGE {page} OF {pages} · {total} APPLICATION{total === 1 ? '' : 'S'}
          </span>
          <span className="flex-1" />
          <Btn variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
            ← Previous
          </Btn>
          <Btn variant="ghost" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages || loading}>
            Next →
          </Btn>
        </div>
      )}

      {open && (
        <ApplicantDrawer
          key={open.id}
          app={open}
          roleName={roleName(open)}
          narrow={narrow}
          onClose={() => setOpenId(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
