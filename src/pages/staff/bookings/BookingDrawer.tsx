import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BookingRow, BookingStatus } from '../../../types';
import { getBooking, isHttpError, updateBooking, type BookingDetailFull, type BookingPatch, type BookingUpdated } from '../../../lib/staffApi';
import { mur as money } from '../../../lib/format';
import { errorMessage } from '../../../lib/errors';
import { cn } from '../../../lib/utils';
import { Stripes } from '../../../components/Stripes';
import { PhotosSection } from '../PhotosSection';
import type { EditableLine } from '../LineEditor';
import { Btn, RatePill, SectionLabel, Spinner, StatusChip, dateTimeSec, usePrefersReducedMotion } from '../ui';
import { AuditTrail } from './AuditTrail';
import { BookingEditForm, type SetDraft } from './BookingEditForm';
import { BookingFacts, BookingMoney } from './BookingSummary';
import { ContactActions } from './ContactActions';
import { DrawerActions, type ArrivalBlock, type RunAction } from './DrawerActions';
import { buildPatch, linesToEditable, toDraft, validate, type Draft } from './draft';
import { fitLinesToParty, lineChanges, MAX_ADULTS, MAX_KIDS, type Party } from './partyLines';
import { cardCls } from './shared';

/** What a 409 from the API means for the drawer. */
export function conflictKind(e: unknown): 'stale' | 'waivers' | null {
  if (!isHttpError(e) || e.status !== 409) return null;
  const code = e.body?.code;
  if (code === 'WAIVERS_MISSING') return 'waivers';
  if (code === 'STALE_BOOKING' || /changed by someone else/i.test(e.message)) return 'stale';
  return null;
}

/**
 * Slide-in booking detail. Reading mode shows the money, the line breakdown and
 * the audit trail; Edit mode puts every editable field over
 * `PATCH /api/staff/bookings/:refCode` and re-reads the totals the server sends
 * back, so no price is ever computed in the browser. Every PATCH carries the
 * `updatedAt` on screen: a save over someone else's change comes back 409 and
 * the drawer offers a reload instead of overwriting it.
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
  // the party editLines were last edited for, so a later party change fits them again
  const [linesParty, setLinesParty] = useState<Party | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Draft | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  // someone else saved this booking since it was loaded
  const [stale, setStale] = useState(false);
  // "Mark arrived" refused by the waiver rule: what is missing
  const [arrivalBlock, setArrivalBlock] = useState<ArrivalBlock | null>(null);
  // Esc / backdrop / × with unsaved edits asks first
  const [confirmClose, setConfirmClose] = useState(false);

  const load = useCallback(() => {
    let dead = false;
    setLoading(true);
    setErr('');
    getBooking(refCode)
      .then((d) => { if (!dead) setData(d); })
      .catch(() => { if (!dead) setErr('Could not load this booking.'); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [refCode]);
  useEffect(load, [load]);

  const partyOf = (f: Draft | null, d: BookingDetailFull): Party => ({
    adults: Math.max(1, Math.min(MAX_ADULTS, Number(f?.adults ?? d.adults) || 1)),
    kids: Math.max(0, Math.min(MAX_KIDS, Number(f?.kids ?? d.kids) || 0)),
  });

  /** The lines a save would send: the edited ones, fitted to the party on screen. */
  const shownLines = useMemo<EditableLine[] | null>(() => {
    if (!data || !form) return null;
    const base = editLines ?? linesToEditable(data);
    const from = editLines && linesParty ? linesParty : { adults: data.adults, kids: data.kids };
    return fitLinesToParty(base, from, partyOf(form, data));
  }, [data, form, editLines, linesParty]);

  const partyMoved = !!data && !!form && (Number(form.adults) !== data.adults || Number(form.kids) !== data.kids);
  const lineDiff = useMemo(() => (data && shownLines ? lineChanges(linesToEditable(data), shownLines) : []), [data, shownLines]);

  const dirty = editing && !!data && !!form && (Object.keys(buildPatch(data, form)).length > 0 || editLines !== null);

  const requestClose = useCallback(() => {
    if (dirty) setConfirmClose(true);
    else onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);

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

  /** Every PATCH says which version it was made from. */
  const patchFrom = (patch: BookingPatch): BookingPatch => (data?.updatedAt ? { ...patch, expectedUpdatedAt: data.updatedAt } : patch);

  const quickStatus = async (status: BookingStatus, extra?: { override?: boolean; reason?: string }) => {
    if (busy || saving) return;
    setBusy(status);
    setErr('');
    setSaved('');
    try {
      const updated = await updateBooking(refCode, patchFrom({ status, ...extra }));
      applyUpdate(updated);
      refreshAudit();
      setArrivalBlock(null);
    } catch (e) {
      const kind = conflictKind(e);
      if (kind === 'waivers' && isHttpError(e)) {
        const b = e.body ?? {};
        setArrivalBlock({ missing: Number(b.missing) || 0, required: Number(b.required) || 0, stops: Number(b.stops) || 0, message: e.message });
      } else if (kind === 'stale') {
        setStale(true);
      } else {
        setErr(errorMessage(e, 'Could not update the status. Try again.'));
      }
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
    setLinesParty(null);
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
    setLinesParty(null);
    setFieldErr({});
    setErr('');
    setConfirmClose(false);
  };

  /** Someone else saved: read the booking again (any edit in progress is dropped). */
  const reload = () => {
    cancelEdit();
    setStale(false);
    setArrivalBlock(null);
    load();
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
    // a party change re-fits the lines: send exactly what the form shows
    if ((editLines || (partyMoved && lineDiff.length > 0)) && shownLines) {
      patch.items = shownLines.map((l) => ({ id: l.id, variant: l.variant, adults: l.adults || undefined, kids: l.kids || undefined, units: l.units || undefined }));
    }
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      setForm(null);
      setSaved('Nothing changed.');
      return;
    }

    setSaving(true);
    setErr('');
    try {
      const updated = await updateBooking(refCode, patchFrom(patch));
      applyUpdate(updated);
      refreshAudit();
      setEditing(false);
      setForm(null);
      setEditLines(null);
      setLinesParty(null);
      setSaved('Saved. The totals below come from the server.');
    } catch (e) {
      // The edit endpoint may not be live yet, and a rejected DTO comes back the
      // same way: keep the operator in the form with their typing intact.
      const kind = conflictKind(e);
      if (kind === 'stale') {
        setStale(true);
      } else if (kind === 'waivers' && isHttpError(e)) {
        setErr(`${e.message}. Use "Mark arrived" (with a reason) or the Gate tab to check them in.`);
      } else if (isHttpError(e) && e.status === 404) {
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
        onClick={requestClose}
        data-testid="drawer-backdrop"
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
            onClick={requestClose}
            aria-label="Close"
            className="press h-[34px] w-[34px] shrink-0 cursor-pointer rounded-full border-[1.5px] border-solid border-white/32 bg-transparent text-[16px] leading-none text-white"
          >
            ×
          </button>
        </div>
        <Stripes height={6} />

        <div className="flex-1 overflow-y-auto p-5">
          {loading && !data && (
            <div className="flex justify-center px-0 py-10">
              <Spinner color="#7333FF" size={9} />
            </div>
          )}

          {!loading && err && !data && (
            <div className="text-[14px] font-semibold text-[#D6173F]">{err}</div>
          )}

          {stale && (
            <div role="alert" data-testid="stale-booking" className="mb-4 flex flex-wrap items-center gap-2.5 rounded-[14px] border-[1.5px] border-solid border-[#FFD24D] bg-[#FFF4D6] px-3.5 py-2.5">
              <span className="flex-[1_1_220px] text-[13.5px] font-bold">This booking was changed by someone else — reload to see their change{editing ? ' (your unsaved edits will be dropped)' : ''}.</span>
              <Btn onClick={reload} data-testid="stale-reload">Reload</Btn>
            </div>
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
                ? (
                  <BookingEditForm
                    data={data} form={form} set={set} fieldErr={fieldErr}
                    lines={shownLines ?? linesToEditable(data)}
                    onLinesChange={(ls) => { setEditLines(ls); setLinesParty(partyOf(form, data)); }}
                    lineDiff={partyMoved ? lineDiff : []}
                  />
                )
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
                <div role="alert" className="mt-3.5 text-[13.5px] leading-[1.5] font-semibold text-[#D6173F]">
                  {err}
                </div>
              )}
            </>
          )}
        </div>

        {data && (
          <div className="flex flex-wrap gap-2.5 border-t-[1.5px] border-solid border-valle-lilac bg-white p-4">
            {confirmClose ? (
              <div role="alertdialog" aria-label="Unsaved changes" data-testid="discard-confirm" className="flex basis-full flex-wrap items-center gap-2.5 rounded-[14px] border-[1.5px] border-solid border-[#FFD24D] bg-[#FFF4D6] px-3.5 py-2.5">
                <span className="flex-[1_1_200px] text-[13.5px] font-bold">You have unsaved changes. Close and discard them?</span>
                <Btn onClick={() => setConfirmClose(false)} data-testid="discard-keep">Keep editing</Btn>
                <Btn variant="danger" onClick={() => { setConfirmClose(false); onClose(); }} data-testid="discard-yes">Discard changes</Btn>
              </div>
            ) : (
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
                arrivalBlock={arrivalBlock}
                onDismissArrivalBlock={() => setArrivalBlock(null)}
              />
            )}
          </div>
        )}
      </aside>
    </>
  );
}
