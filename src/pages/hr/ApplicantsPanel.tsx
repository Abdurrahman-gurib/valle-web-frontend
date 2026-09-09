import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  APPLICATION_STATUSES, errorText, listApplications, listVacancies, safeCvHref, updateApplication,
  type ApplicationStatus, type HrApplication, type HrVacancy,
} from '../../lib/hrApi';
import { color, radius } from '../../styles/theme';
import { useHover } from '../../hooks/useHover';
import { Btn, EmptyState, Spinner, mono, relTime, shortDate } from '../staff/ui';
import {
  CopyButton, DetailLine, Drawer, FilterSelect, MetaPill, Notice, Pill, SectionTitle, TextArea,
  fieldStyle,
} from './hrUi';

/**
 * Applicants tab: filter by role and status, search by name or email, then work
 * one application at a time in the drawer.
 *
 * Everything shown here (contact details, cover letter, the internal note) is
 * HR-only data and is rendered as text: an application is untrusted input.
 */

const PAGE_SIZE = 20;

const th: CSSProperties = {
  ...mono, fontSize: 9.5, fontWeight: 700, letterSpacing: '.13em', textTransform: 'uppercase',
  color: color.violet, textAlign: 'left', padding: '10px 12px', whiteSpace: 'nowrap',
};

const td: CSSProperties = {
  padding: '11px 12px', fontSize: 13.5, borderTop: '1px solid ' + color.border, whiteSpace: 'nowrap',
};

const cardStyle: CSSProperties = {
  background: color.white, border: '1.5px solid ' + color.border, borderRadius: radius.lg,
};

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  ...APPLICATION_STATUSES.map((s) => ({ value: s.value as string, label: s.label })),
];

const yearsLabel = (y: number | null): string =>
  y === null || y === undefined ? 'Not given' : y === 0 ? 'No experience yet' : y + ' year' + (y === 1 ? '' : 's');

function Row({ a, roleName, onOpen }: { a: HrApplication; roleName: string; onOpen: () => void }) {
  const [h, bind] = useHover();
  return (
    <tr
      {...bind}
      onClick={onOpen}
      style={{ cursor: 'pointer', background: h ? color.tint : color.white, transition: 'background .12s ease' }}
    >
      <td style={{ ...td, whiteSpace: 'normal', minWidth: 220 }}>
        <div style={{ fontWeight: 700 }}>{a.fullName}</div>
        <div style={{ ...mono, fontSize: 10.5, letterSpacing: '.04em', color: 'rgba(52,0,87,.6)', marginTop: 2, wordBreak: 'break-all' }}>
          {a.email}
        </div>
      </td>
      <td style={{ ...td, whiteSpace: 'normal', minWidth: 160 }}>{roleName}</td>
      <td style={td}>{yearsLabel(a.yearsExperience)}</td>
      <td style={td}><Pill value={a.status} /></td>
      <td style={td}>
        <span title={shortDate(a.createdAt)}>{relTime(a.createdAt)}</span>
      </td>
    </tr>
  );
}

function ApplicantCard({ a, roleName, onOpen }: { a: HrApplication; roleName: string; onOpen: () => void }) {
  const [h, bind] = useHover();
  return (
    <button
      {...bind}
      type="button"
      onClick={onOpen}
      style={{
        ...cardStyle, padding: 14, width: '100%', textAlign: 'left', cursor: 'pointer',
        fontFamily: 'inherit', color: color.purple, display: 'block',
        background: h ? color.tint : color.white,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15.5 }}>{a.fullName}</div>
          <div style={{ ...mono, fontSize: 10.5, color: 'rgba(52,0,87,.6)', marginTop: 3, wordBreak: 'break-all' }}>
            {a.email}
          </div>
        </div>
        <Pill value={a.status} />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
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

  const grid: CSSProperties = {
    ...cardStyle, background: color.tint, padding: 16, display: 'grid', gap: 14,
    gridTemplateColumns: narrow ? '1fr' : '1fr 1fr',
  };

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
          <span style={{ flex: 1 }} />
          <Btn onClick={() => { void save(); }} disabled={busy || !dirty}>
            {busy ? <Spinner /> : 'Save changes'}
          </Btn>
        </>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <Pill value={app.status} />
        <span style={{ ...mono, fontSize: 10, letterSpacing: '.1em', color: 'rgba(52,0,87,.5)' }}>
          APPLIED {shortDate(app.createdAt)}
        </span>
      </div>

      <div style={grid}>
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
              style={{ color: color.violet, fontWeight: 600, wordBreak: 'break-all' }}
            >
              Open CV
            </a>
          ) : (app.cvUrl ? 'Link was not a usable web address' : 'Not given')}
        </DetailLine>
        <DetailLine tag="LAST UPDATED" value={shortDate(app.updatedAt)} />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <CopyButton value={app.email} label="Copy email" />
        {app.phone ? <CopyButton value={app.phone} label="Copy phone" /> : null}
        <a
          href={'mailto:' + encodeURIComponent(app.email) + '?subject=' + encodeURIComponent('Your application to VALLÉ: ' + roleName)}
          style={{
            border: '1.5px solid ' + color.border, borderRadius: radius.pill, padding: '7px 14px',
            fontSize: 12.5, fontWeight: 700, color: color.purple, textDecoration: 'none', whiteSpace: 'nowrap',
          }}
        >
          Write a reply
        </a>
      </div>

      <SectionTitle>Cover letter</SectionTitle>
      <div style={{ ...cardStyle, padding: 16, fontSize: 14, lineHeight: 1.6 }}>
        {letterLines.length === 0 && (
          <span style={{ color: 'rgba(52,0,87,.55)' }}>No cover letter was sent.</span>
        )}
        {letterLines.map((line, i) => (
          <p key={i} style={{ margin: i === 0 ? 0 : '10px 0 0', wordBreak: 'break-word' }}>{line}</p>
        ))}
      </div>

      <SectionTitle>Move this application</SectionTitle>
      <select
        id={'app-status-' + app.id}
        value={status}
        onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
        disabled={busy}
        aria-label="Application status"
        style={{ ...fieldStyle, cursor: 'pointer', appearance: 'auto' }}
      >
        {APPLICATION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      <div style={{ marginTop: 14 }}>
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
        <div style={{ marginTop: 14 }}>
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
      <div style={{
        ...cardStyle, padding: 14, marginBottom: 14, display: 'flex', flexWrap: 'wrap',
        gap: 10, alignItems: 'center',
      }}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a name or email"
          aria-label="Search applicants"
          style={{ ...fieldStyle, flex: '1 1 220px', width: 'auto', minWidth: 170 }}
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
      </div>

      {err && <div style={{ marginBottom: 12 }}><Notice>{err}</Notice></div>}

      {rows.length === 0 ? null : narrow ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map((a) => (
            <ApplicantCard key={a.id} a={a} roleName={roleName(a)} onOpen={() => setOpenId(a.id)} />
          ))}
        </div>
      ) : (
        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead>
                <tr style={{ background: color.tint }}>
                  {['Applicant', 'Role', 'Experience', 'Status', 'Applied'].map((c) => (
                    <th key={c} style={th}>{c}</th>
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
        <div style={{ padding: '34px 0', display: 'flex', justifyContent: 'center' }}>
          <Spinner color={color.violet} size={9} />
        </div>
      )}

      {!loading && !err && rows.length === 0 && (
        <div style={cardStyle}>
          {filtered
            ? <EmptyState title="No matches" note="Nobody fits these filters. Widen the role or the status, or clear the search." />
            : <EmptyState title="No applications yet" note="Applications sent from a published vacancy page land here straight away." />}
        </div>
      )}

      {total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          <span style={{ ...mono, fontSize: 10.5, letterSpacing: '.1em', color: 'rgba(52,0,87,.6)' }}>
            PAGE {page} OF {pages} · {total} APPLICATION{total === 1 ? '' : 'S'}
          </span>
          <span style={{ flex: 1 }} />
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
