import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  VACANCY_STATUSES, deleteVacancy, employmentLabel, errorText, listVacancies, updateVacancy,
  type HrVacancy, type VacancyStatus,
} from '../../lib/hrApi';
import { color } from '../../styles/theme';
import { Btn, EmptyState, Spinner, shortDate } from '../staff/ui';
import { cn } from '@/lib/utils';
import { FilterSelect, MetaPill, Notice, Pill } from './hrUi';
import VacancyForm from './VacancyForm';

/**
 * Vacancies tab: every role including drafts, with its application count, plus
 * the create / edit / close / delete actions.
 *
 * A role with applications is never deleted (the API answers 409): closing it
 * keeps the applicant history intact, which is the whole point of the audit.
 */

const thCls =
  'font-mono text-[9.5px] font-bold tracking-[.13em] uppercase text-valle-violet text-left py-[10px] px-[12px] whitespace-nowrap';

const tdCls = 'py-[11px] px-[12px] text-[13.5px] border-t border-solid border-valle-lilac whitespace-nowrap';

const cardCls = 'bg-white border-[1.5px] border-solid border-valle-lilac rounded-[18px]';

const FILTERS = [{ value: 'all', label: 'All statuses' }, ...VACANCY_STATUSES.map((s) => ({ value: s.value as string, label: s.label }))];

/** Compact action button, sized for a table cell. */
function MiniBtn({ children, onClick, tone = 'ghost', disabled, title }: {
  children: ReactNode;
  onClick: () => void;
  tone?: 'ghost' | 'dark' | 'danger';
  disabled?: boolean;
  title?: string;
}) {
  const skin: Record<string, string> = {
    ghost: cn('border-[1.5px] border-solid border-valle-lilac bg-transparent text-valle-purple', !disabled && 'hover:bg-[#F7F3FF]'),
    dark: cn('border-0 bg-valle-purple text-white', !disabled && 'hover:bg-valle-deep'),
    danger: cn(
      'border-[1.5px] border-solid border-[#D91E44] bg-transparent text-[#D91E44]',
      !disabled && 'hover:bg-[#D91E44] hover:text-white',
    ),
  };
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        'press-sm [font-family:inherit] text-[12px] font-bold py-[6px] px-[12px] rounded-[999px] whitespace-nowrap',
        disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer opacity-100',
        skin[tone],
      )}
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
    <div className="flex gap-[6px] flex-wrap">
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
  return (
    <tr
      onClick={onEdit}
      className="cursor-pointer bg-white hover:bg-[#F7F3FF] transition-[background] duration-[.12s] ease-[ease]"
    >
      <td className={cn(tdCls, 'whitespace-normal min-w-[220px]')}>
        <div className="font-bold">{v.title}</div>
        <div className="font-mono text-[10px] tracking-[.08em] text-[rgba(52,0,87,.5)] mt-[2px]">
          /{v.slug}
        </div>
      </td>
      <td className={tdCls}>{v.department || 'Not set'}</td>
      <td className={tdCls}>{employmentLabel(v.employment)}</td>
      <td className={tdCls}><Pill value={v.status} /></td>
      <td className={cn(tdCls, 'font-bold')}>{v.applicationCount}</td>
      <td className={tdCls}>{v.closesOn ? shortDate(v.closesOn) : 'Open'}</td>
      <td className={tdCls}>{shortDate(v.updatedAt)}</td>
      <td className={tdCls} onClick={(e) => e.stopPropagation()}>
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
    <div className={cn(cardCls, 'p-[14px]')}>
      <div className="flex items-start gap-[10px]">
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[15.5px] leading-[1.25]">{v.title}</div>
          <div className="font-mono text-[10px] tracking-[.08em] text-[rgba(52,0,87,.5)] mt-[3px]">
            /{v.slug}
          </div>
        </div>
        <Pill value={v.status} />
      </div>
      <div className="flex gap-[6px] flex-wrap mt-[10px]">
        {v.department && <MetaPill>{v.department}</MetaPill>}
        <MetaPill>{employmentLabel(v.employment)}</MetaPill>
        <MetaPill>{v.applicationCount} applicant{v.applicationCount === 1 ? '' : 's'}</MetaPill>
        <MetaPill>{v.closesOn ? 'Closes ' + shortDate(v.closesOn) : 'No closing date'}</MetaPill>
      </div>
      <div className="mt-[12px]">
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
      <div className={cn(cardCls, 'p-[14px] mb-[14px] flex flex-wrap gap-[10px] items-center')}>
        <div className="font-display italic font-black uppercase text-[20px] mr-[4px]">Open roles</div>
        <FilterSelect
          value={status}
          onChange={setStatus}
          ariaLabel="Filter vacancies by status"
          options={FILTERS}
          width={narrow ? '100%' : 170}
        />
        <span className="flex-1" />
        <Btn onClick={() => { setEditing(null); setCreating(true); }} style={narrow ? { width: '100%' } : undefined}>
          Post a new job
        </Btn>
      </div>

      {notice && <div className="mb-[12px]"><Notice tone="ok">{notice}</Notice></div>}
      {err && <div className="mb-[12px]"><Notice>{err}</Notice></div>}

      {/* ---- list ---- */}
      {items.length === 0 ? null : narrow ? (
        <div className="grid gap-[10px]">
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
        <div className={cn(cardCls, 'overflow-hidden')}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-[#F7F3FF]">
                  {['Role', 'Department', 'Employment', 'Status', 'Applicants', 'Closes', 'Updated', ''].map((c, i) => (
                    <th key={c || 'actions' + i} className={thCls}>{c}</th>
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
        <div className="py-[34px] px-0 flex justify-center">
          <Spinner color={color.violet} size={9} />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className={cardCls}>
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
