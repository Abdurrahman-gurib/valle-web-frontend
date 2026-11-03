import { useCallback, useEffect, useState } from 'react';
import type { BookingRow, BookingStatus } from '../../../types';
import { getBooking, isHttpError, updateBooking, type BookingDetailFull, type BookingUpdated } from '../../../lib/staffApi';
import { mur as money } from '../../../lib/format';
import { errorMessage } from '../../../lib/errors';
import { cn } from '../../../lib/utils';
import { Stripes } from '../../../components/Stripes';
import { PhotosSection } from '../PhotosSection';
import type { EditableLine } from '../LineEditor';
import { RatePill, SectionLabel, Spinner, StatusChip, dateTimeSec, usePrefersReducedMotion } from '../ui';
import { AuditTrail } from './AuditTrail';
import { BookingEditForm, type SetDraft } from './BookingEditForm';
import { BookingFacts, BookingMoney } from './BookingSummary';
import { ContactActions } from './ContactActions';
import { DrawerActions, type RunAction } from './DrawerActions';
import { buildPatch, toDraft, validate, type Draft } from './draft';
import { cardCls } from './shared';

/**
 * Slide-in booking detail. Reading mode shows the money, the line breakdown and
 * the audit trail; Edit mode puts every editable field over
 * `PATCH /api/staff/bookings/:refCode` and re-reads the totals the server sends
 * back, so no price is ever computed in the browser.
 */
export function BookingDrawer({ refCode, onClose, onPatched }: {
  refCode: string;
  onClose: () => void;
  onPatched: (row: BookingRow) => void;
}) {
  const reduced = usePrefersReducedMotion();
  const [data, setData] = useState<BookingDetailFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState<BookingStatus | null>(null);
  // experience lines while editing (a top-up on the day adds to them); null = untouched
  const [editLines, setEditLines] = useState<EditableLine[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Draft | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');

  useEffect(() => {
    let dead = false;
    setLoading(true);
    setErr('');
    getBooking(refCode)
      .then((d) => { if (!dead) setData(d); })
      .catch(() => { if (!dead) setErr('Could not load this booking.'); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [refCode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /** Merge a PATCH response over the loaded detail without dropping the audit. */
  const applyUpdate = useCallback((updated: BookingUpdated & { audit?: BookingDetailFull['audit'] }) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...updated,
        lines: Array.isArray(updated.lines) ? updated.lines : prev.lines,
        audit: Array.isArray(updated.audit) ? updated.audit : prev.audit,
      };
    });
    onPatched(updated);
  }, [onPatched]);

  /** The audit trail is not part of the PATCH contract, so re-read it quietly. */
  const refreshAudit = useCallback(() => {
    getBooking(refCode)
      .then((d) => setData((prev) => (prev ? { ...prev, ...d } : d)))
      .catch(() => { /* the drawer already shows the server's own numbers */ });
  }, [refCode]);

  const quickStatus = async (status: BookingStatus) => {
    if (busy || saving) return;
    setBusy(status);
    setErr('');
    setSaved('');
    try {
      const updated = await updateBooking(refCode, { status });
      applyUpdate(updated);
      refreshAudit();
    } catch {
      setErr('Could not update the status. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const run: RunAction = async (busyAs, call, done, fail, onDone) => {
    setBusy(busyAs); setErr('');
    try {
      const updated = await call();
      applyUpdate(updated); refreshAudit(); onDone();
      setSaved(done);
    } catch (e) { setErr(errorMessage(e, fail)); } finally { setBusy(null); }
  };

  const startEdit = () => {
    if (!data) return;
    setEditLines(null);
    setForm(toDraft(data));
    setFieldErr({});
    setErr('');
    setSaved('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(null);
    setEditLines(null);
    setFieldErr({});
    setErr('');
  };

  const save = async () => {
    if (!data || !form || saving) return;
    const problems = validate(form);
    setFieldErr(problems);
    if (Object.keys(problems).length > 0) {
      setErr('Fix the highlighted fields, then save again.');
      return;
    }
    const patch = buildPatch(data, form);
    if (editLines) patch.items = editLines.map((l) => ({ id: l.id, variant: l.variant, adults: l.adults || undefined, kids: l.kids || undefined, units: l.units || undefined }));
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      setForm(null);
      setSaved('Nothing changed.');
      return;
    }

    setSaving(true);
    setErr('');
    try {
      const updated = await updateBooking(refCode, patch);
      applyUpdate(updated);
      refreshAudit();
      setEditing(false);
      setForm(null);
      setEditLines(null);
      setSaved('Saved. The totals below come from the server.');
    } catch (e) {
      // The edit endpoint may not be live yet, and a rejected DTO comes back the
      // same way: keep the operator in the form with their typing intact.
      if (isHttpError(e) && e.status === 404) {
        setErr('This booking could not be found, or editing is not available on this server yet.');
      } else if (isHttpError(e) && e.status >= 400 && e.status < 500) {
        setErr(e.message || 'The server rejected these changes.');
      } else {
        setErr('Could not save these changes. Check your connection and try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const set: SetDraft = (k) => (v) => setForm((p) => (p ? { ...p, [k]: v } : p));

  const audit = data?.audit ?? [];

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[95] bg-[rgba(31,0,51,.55)] backdrop-blur-[3px] [animation:vfade_.2s_ease_both]"
      />
      <aside
        role="dialog"
        aria-label={'Booking ' + refCode}
        className={cn(
          'fixed top-1/2 left-1/2 z-[96] flex max-h-[min(100vh_-_24px,920px)] w-[min(100vw_-_24px,620px)] flex-col overflow-hidden rounded-[22px] bg-white',
          '[transform:translate(-50%,-50%)] shadow-[0_40px_90px_-30px_rgba(38,0,64,.6)]',
          reduced ? '[animation:vfade_.2s_ease_both]' : '[animation:vcenterpop_.25s_cubic-bezier(.2,.7,.2,1)_both]',
        )}
      >
        <div className="flex items-center gap-3 bg-valle-purple px-5 py-4 text-white">
          <div className="min-w-0">
            <div className="font-mono text-[9.5px] font-bold tracking-[.14em] text-white/60">
              {editing ? 'EDITING BOOKING' : 'BOOKING'}
            </div>
            <div className="font-display text-[26px] leading-[1.05] font-black uppercase italic">{refCode}</div>
          </div>
          <span className="flex-1" />
          {data && (
            <div className="shrink-0 text-right">
              <div className="font-mono text-[9px] font-bold tracking-[.14em] text-white/55">
                TOTAL
              </div>
              <div className="font-display text-[24px] leading-[1.1] font-black uppercase italic text-valle-yellow">{money(data.total)}</div>
            </div>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="press h-[34px] w-[34px] shrink-0 cursor-pointer rounded-full border-[1.5px] border-solid border-white/32 bg-transparent text-[16px] leading-none text-white"
          >
            ×
          </button>
        </div>
        <Stripes height={6} />

        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex justify-center px-0 py-10">
              <Spinner color="#7333FF" size={9} />
            </div>
          )}

          {!loading && err && !data && (
            <div className="text-[14px] font-semibold text-[#D91E44]">{err}</div>
          )}

          {data && (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-[9px]">
                <StatusChip status={data.status} />
                <RatePill rate={data.rate} />
                <span className="font-mono text-[10px] tracking-[.1em] text-valle-purple/50" data-testid="drawer-booked-at">
                  BOOKED {dateTimeSec(data.createdAt).toUpperCase()}
                </span>
              </div>
              {!editing && <ContactActions data={data} />}

              {editing && form
                ? <BookingEditForm data={data} form={form} set={set} fieldErr={fieldErr} editLines={editLines} onLinesChange={setEditLines} />
                : <BookingFacts data={data} />}

              {!editing && data.staffNote && (
                <>
                  <SectionLabel>INTERNAL NOTE</SectionLabel>
                  <div className={cn(cardCls, 'border-[rgba(138,122,0,.25)] bg-[#FFFFE2] p-3.5 text-[13.5px] leading-[1.55] whitespace-pre-wrap [word-break:break-word]')}>
                    {data.staffNote}
                  </div>
                </>
              )}

              <BookingMoney data={data} />

              {data.status !== 'cancelled' && <PhotosSection refCode={refCode} />}

              {audit.length > 0 && (
                <>
                  <SectionLabel>AUDIT TRAIL</SectionLabel>
                  <AuditTrail entries={audit} />
                </>
              )}

              {saved && !err && (
                <div role="status" className="mt-3.5 font-mono text-[10px] uppercase tracking-[.1em] text-[#12B54A]">
                  {saved}
                </div>
              )}

              {err && (
                <div role="alert" className="mt-3.5 text-[13.5px] leading-[1.5] font-semibold text-[#D91E44]">
                  {err}
                </div>
              )}
            </>
          )}
        </div>

        {data && (
          <div className="flex flex-wrap gap-2.5 border-t-[1.5px] border-solid border-valle-lilac bg-white p-4">
            <DrawerActions
              data={data}
              busy={busy}
              editing={editing}
              saving={saving}
              onEdit={startEdit}
              onCancelEdit={cancelEdit}
              onSave={() => { void save(); }}
              onStatus={quickStatus}
              onError={setErr}
              run={run}
            />
          </div>
        )}
      </aside>
    </>
  );
}
