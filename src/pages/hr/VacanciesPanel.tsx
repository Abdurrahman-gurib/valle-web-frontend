import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import {
  VACANCY_STATUSES, deleteVacancy, employmentLabel, errorText, listVacancies, updateVacancy,
  type HrVacancy, type VacancyStatus,
} from '../../lib/hrApi';
import { color, radius } from '../../styles/theme';
import { useHover } from '../../hooks/useHover';
import { Btn, EmptyState, Spinner, display, mono, shortDate } from '../staff/ui';
import { FilterSelect, MetaPill, Notice, Pill } from './hrUi';
import VacancyForm from './VacancyForm';

/**
 * Vacancies tab: every role including drafts, with its application count, plus
 * the create / edit / close / delete actions.
 *
 * A role with applications is never deleted (the API answers 409): closing it
 * keeps the applicant history intact, which is the whole point of the audit.
 */

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

const FILTERS = [{ value: 'all', label: 'All statuses' }, ...VACANCY_STATUSES.map((s) => ({ value: s.value as string, label: s.label }))];

/** Compact action button, sized for a table cell. */
function MiniBtn({ children, onClick, tone = 'ghost', disabled, title }: {
  children: ReactNode;
  onClick: () => void;
  tone?: 'ghost' | 'dark' | 'danger';
  disabled?: boolean;
  title?: string;
}) {
  const [h, bind] = useHover();
  const on = h && !disabled;
  const skin: Record<string, CSSProperties> = {
    ghost: { border: '1.5px solid ' + color.border, background: on ? color.tint : 'transparent', color: color.purple },
    dark: { border: 0, background: on ? color.deep : color.purple, color: color.white },
    danger: { border: '1.5px solid ' + color.pinkDark, background: on ? color.pinkDark : 'transparent', color: on ? color.white : color.pinkDark },
  };
  return (
    <button
      {...bind}
      type="button"
      title={title}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="press-sm"
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 12,
        fontWeight: 700, padding: '6px 12px', borderRadius: radius.pill, whiteSpace: 'nowrap',
        opacity: disabled ? 0.45 : 1, ...skin[tone],
      }}
    >
      {children}
    </button>
  );
}

function Actions({ v, busy, onEdit, onStatus, onDelete }: {
  v: HrVacancy;
  busy: boolean;
  onEdit: () => void;
  onStatus: (s: VacancyStatus) => void;
  onDelete: () => void;
}) {
  const hasApplicants = v.applicationCount > 0;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <MiniBtn tone="dark" onClick={onEdit} disabled={busy}>Edit</MiniBtn>
      {v.status === 'draft' && (
        <MiniBtn onClick={() => onStatus('published')} disabled={busy}>Publish</MiniBtn>
      )}
      {v.status === 'published' && (
        <MiniBtn onClick={() => onStatus('closed')} disabled={busy}>Close</MiniBtn>
      )}
      {v.status === 'closed' && (
        <MiniBtn onClick={() => onStatus('published')} disabled={busy}>Reopen</MiniBtn>
      )}
      <MiniBtn
        tone="danger"
        onClick={onDelete}
        disabled={busy || hasApplicants}
        title={hasApplicants ? 'This role has applications. Close it instead of deleting it.' : 'Delete this role'}
      >
        Delete
      </MiniBtn>
    </div>
  );
}

function Row({ v, busy, onEdit, onStatus, onDelete }: {
  v: HrVacancy;
  busy: boolean;
  onEdit: () => void;
  onStatus: (s: VacancyStatus) => void;
  onDelete: () => void;
}) {
  const [h, bind] = useHover();
  return (
    <tr
      {...bind}
      onClick={onEdit}
      style={{ cursor: 'pointer', background: h ? color.tint : color.white, transition: 'background .12s ease' }}
    >
      <td style={{ ...td, whiteSpace: 'normal', minWidth: 220 }}>
        <div style={{ fontWeight: 700 }}>{v.title}</div>
        <div style={{ ...mono, fontSize: 10, letterSpacing: '.08em', color: 'rgba(52,0,87,.5)', marginTop: 2 }}>
          /{v.slug}
        </div>
      </td>
      <td style={td}>{v.department || 'Not set'}</td>
      <td style={td}>{employmentLabel(v.employment)}</td>
      <td style={td}><Pill value={v.status} /></td>
      <td style={{ ...td, fontWeight: 700 }}>{v.applicationCount}</td>
      <td style={td}>{v.closesOn ? shortDate(v.closesOn) : 'Open'}</td>
      <td style={td}>{shortDate(v.updatedAt)}</td>
      <td style={td} onClick={(e) => e.stopPropagation()}>
        <Actions v={v} busy={busy} onEdit={onEdit} onStatus={onStatus} onDelete={onDelete} />
      </td>
    </tr>
  );
}

/** Tablet / phone rendering: the table becomes a stack of cards. */
function VacancyCard({ v, busy, onEdit, onStatus, onDelete }: {
  v: HrVacancy;
  busy: boolean;
  onEdit: () => void;
  onStatus: (s: VacancyStatus) => void;
  onDelete: () => void;
}) {
  return (
    <div style={{ ...cardStyle, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15.5, lineHeight: 1.25 }}>{v.title}</div>
          <div style={{ ...mono, fontSize: 10, letterSpacing: '.08em', color: 'rgba(52,0,87,.5)', marginTop: 3 }}>
            /{v.slug}
          </div>
        </div>
        <Pill value={v.status} />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        {v.department && <MetaPill>{v.department}</MetaPill>}
        <MetaPill>{employmentLabel(v.employment)}</MetaPill>
        <MetaPill>{v.applicationCount} applicant{v.applicationCount === 1 ? '' : 's'}</MetaPill>
        <MetaPill>{v.closesOn ? 'Closes ' + shortDate(v.closesOn) : 'No closing date'}</MetaPill>
      </div>
      <div style={{ marginTop: 12 }}>
        <Actions v={v} busy={busy} onEdit={onEdit} onStatus={onStatus} onDelete={onDelete} />
      </div>
    </div>
  );
}

export default function VacanciesPanel({ narrow, onChanged }: {
  narrow: boolean;
  onChanged: (force?: boolean) => void;
}) {
  const [items, setItems] = useState<HrVacancy[]>([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<HrVacancy | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    return listVacancies(status === 'all' ? 'all' : (status as VacancyStatus))
      .then((res) => { setItems(res.items || []); setErr(''); })
      .catch((e: unknown) => setErr(errorText(e, 'Could not load the vacancies.')))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  const setVacancyStatus = async (v: HrVacancy, next: VacancyStatus) => {
    setBusyId(v.id);
    setNotice('');
    setErr('');
    try {
      const saved = await updateVacancy(v.id, { status: next });
      setItems((prev) => prev.map((x) => (x.id === v.id ? { ...x, ...saved } : x)));
      setNotice(
        next === 'published' ? '"' + saved.title + '" is live on the vacancies page.'
          : next === 'closed' ? '"' + saved.title + '" is closed to new applications.'
            : '"' + saved.title + '" is back to draft.',
      );
      onChanged(true);
      if (status !== 'all' && status !== next) void load();
    } catch (e) {
      setErr(errorText(e, 'Could not change the status of this role.'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (v: HrVacancy) => {
    if (!window.confirm('Delete "' + v.title + '" for good? Closing it keeps it out of the public list without losing anything.')) return;
    setBusyId(v.id);
    setNotice('');
    setErr('');
    try {
      await deleteVacancy(v.id);
      setItems((prev) => prev.filter((x) => x.id !== v.id));
      setNotice('"' + v.title + '" was deleted.');
      onChanged(true);
    } catch (e) {
      setErr(errorText(e, 'Could not delete this role.'));
    } finally {
      setBusyId(null);
    }
  };

  const onSaved = (saved: HrVacancy, created: boolean) => {
    setCreating(false);
    setEditing(null);
    setNotice(created ? '"' + saved.title + '" was created.' : '"' + saved.title + '" was updated.');
    setErr('');
    onChanged(true);
    void load();
  };

  const filtered = status !== 'all';

  return (
    <div>
      {/* ---- toolbar ---- */}
      <div style={{
        ...cardStyle, padding: 14, marginBottom: 14, display: 'flex', flexWrap: 'wrap',
        gap: 10, alignItems: 'center',
      }}>
        <div style={{ ...display, fontSize: 20, marginRight: 4 }}>Open roles</div>
        <FilterSelect
          value={status}
          onChange={setStatus}
          ariaLabel="Filter vacancies by status"
          options={FILTERS}
          width={narrow ? '100%' : 170}
        />
        <span style={{ flex: 1 }} />
        <Btn onClick={() => { setEditing(null); setCreating(true); }} style={narrow ? { width: '100%' } : undefined}>
          Post a new job
        </Btn>
      </div>

      {notice && <div style={{ marginBottom: 12 }}><Notice tone="ok">{notice}</Notice></div>}
      {err && <div style={{ marginBottom: 12 }}><Notice>{err}</Notice></div>}

      {/* ---- list ---- */}
      {items.length === 0 ? null : narrow ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((v) => (
            <VacancyCard
              key={v.id}
              v={v}
              busy={busyId === v.id}
              onEdit={() => { setCreating(false); setEditing(v); }}
              onStatus={(s) => { void setVacancyStatus(v, s); }}
              onDelete={() => { void remove(v); }}
            />
          ))}
        </div>
      ) : (
        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ background: color.tint }}>
                  {['Role', 'Department', 'Employment', 'Status', 'Applicants', 'Closes', 'Updated', ''].map((c, i) => (
                    <th key={c || 'actions' + i} style={th}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((v) => (
                  <Row
                    key={v.id}
                    v={v}
                    busy={busyId === v.id}
                    onEdit={() => { setCreating(false); setEditing(v); }}
                    onStatus={(s) => { void setVacancyStatus(v, s); }}
                    onDelete={() => { void remove(v); }}
                  />
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

      {!loading && items.length === 0 && (
        <div style={cardStyle}>
          {filtered
            ? <EmptyState title="Nothing here" note="No roles carry that status. Switch the filter to see the rest." />
            : <EmptyState title="No roles yet" note="Post the first job and it will show up on the public vacancies page the moment you publish it." />}
        </div>
      )}

      {(creating || editing) && (
        <VacancyForm
          key={editing ? editing.id : 'new'}
          vacancy={editing}
          narrow={narrow}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
