import { useMemo, useState } from 'react';
import { useT } from '../i18n';
import { cancelBooking, changeBooking, type TicketView } from '../lib/api';
import { mur, todayIso } from '../lib/format';
import { useCatalog } from '../store/CatalogContext';
import { cn } from '@/lib/utils';

/**
 * "Manage my booking" on the ticket page: date, arrival slot, party and
 * experiences can be changed, or the booking cancelled, straight from the
 * link in the confirmation. The server re-prices, checks capacity and writes
 * the trail under "guest"; the desk gets an e-mail.
 */

const input = 'rounded-[12px] border-[1.5px] border-valle-lilac bg-[#F7F3FF] px-[14px] py-2.5 text-[14px] text-valle-purple outline-none [font-family:inherit]';
/** Pill button base; add the colours (and `PILL_OUTLINE` or `border-0`) per use. */
const PILL = 'cursor-pointer rounded-full px-[18px] py-2.5 text-[13.5px] font-bold [font-family:inherit]';
const PILL_OUTLINE = 'border-[1.5px] border-valle-purple';
const fieldLabel = 'grid gap-1 font-mono text-[10px] tracking-[.1em] text-valle-purple/60';

type Line = { id: string; name: string; variant: string; mode: 'pp' | 'flat'; adults: number; kids: number; units: number; time?: string };

function Counter({ label, value, onChange, min, testId }: { label: string; value: number; onChange: (n: number) => void; min: number; testId: string }) {
  const b = 'h-[30px] w-[30px] cursor-pointer rounded-full border-[1.5px] border-[#D9C9F0] bg-white font-extrabold text-valle-purple [font-family:inherit]';
  return (
    <div className="inline-flex items-center gap-2" data-testid={testId}>
      <span className="font-mono text-[10px] tracking-[.1em] text-valle-purple/60">{label}</span>
      <button type="button" aria-label={`${label} −`} onClick={() => onChange(Math.max(min, value - 1))} className={b}>−</button>
      <span className="min-w-4 text-center font-mono font-bold">{value}</span>
      <button type="button" aria-label={`${label} +`} onClick={() => onChange(Math.min(12, value + 1))} className={b}>+</button>
    </div>
  );
}

export function ManageBooking({ tk, token, onChanged }: { tk: TicketView; token: string; onChanged: (v: TicketView) => void }) {
  const t = useT();
  const catalog = useCatalog();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(tk.visitDate);
  const [slot, setSlot] = useState<'morning' | 'afternoon'>(tk.slot);
  const [adults, setAdults] = useState(tk.adults);
  const [kids, setKids] = useState(tk.kids);
  const acts = useMemo(() => catalog.ACTS.filter((a) => a.mode === 'pp' || a.mode === 'flat'), [catalog]);
  const byId = useMemo(() => new Map(acts.map((a) => [a.id, a])), [acts]);
  const linesOf = (v: TicketView): Line[] => v.lines
    .filter((l) => l.experienceId && byId.has(l.experienceId))
    .map((l) => { const a = byId.get(l.experienceId as string)!; return { id: a.id, name: a.name, variant: l.variant ?? '', mode: a.mode as 'pp' | 'flat', adults: l.adults ?? 0, kids: l.kids ?? 0, units: l.units ?? 0, time: l.time ?? undefined }; });
  const [lines, setLines] = useState<Line[]>(() => linesOf(tk));
  /** Opening the editor always starts from what the ticket says now (it may have been changed and saved). */
  const openEditor = () => { setDate(tk.visitDate); setSlot(tk.slot); setAdults(tk.adults); setKids(tk.kids); setLines(linesOf(tk)); setConfirmCancel(false); setOpen(true); };
  const [addId, setAddId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  const canChange = (tk.status === 'confirmed' || tk.status === 'postponed') && tk.visitDate >= todayIso();
  // once cancelled (or checked in) only the outcome of the last action stays visible
  if (!canChange) {
    return done ? <div role="status" data-testid="manage-done" data-print-hide="" className="mt-5 rounded-[14px] border-[1.5px] border-valle-lilac bg-[#F7F3FF] px-4 py-[14px] text-start text-[13.5px] font-bold text-[#1E9E4A]">{done}</div> : null;
  }

  const addLine = () => {
    const a = byId.get(addId);
    if (!a || lines.some((l) => l.id === a.id && l.variant === '')) return;
    setLines((ls) => [...ls, { id: a.id, name: a.name, variant: '', mode: a.mode as 'pp' | 'flat', adults: a.mode === 'pp' ? adults : 0, kids: a.mode === 'pp' ? kids : 0, units: a.mode === 'flat' ? 1 : 0 }]);
    setAddId('');
  };
  const save = async () => {
    setBusy(true); setErr(''); setDone('');
    try {
      const body: Parameters<typeof changeBooking>[2] = {};
      if (date !== tk.visitDate) body.visitDate = date;
      if (slot !== tk.slot) body.slot = slot;
      if (adults !== tk.adults) body.adults = adults;
      if (kids !== tk.kids) body.kids = kids;
      // product lines (packages, combos, VIP, photo, cinematic) are kept as they are
      const kept = tk.lines.filter((l) => l.productKey).map((l) => ({ id: 'product:' + l.productKey, adults: l.adults, kids: l.kids, units: l.units }));
      const items = [...lines.map((l) => ({ id: l.id, variant: l.variant || undefined, adults: l.mode === 'pp' ? l.adults : undefined, kids: l.mode === 'pp' ? l.kids : undefined, units: l.mode === 'flat' ? l.units : undefined, time: l.time })), ...kept];
      const before = JSON.stringify(tk.lines.filter((l) => l.experienceId).map((l) => [l.experienceId, l.variant, l.adults, l.kids, l.units]));
      const after = JSON.stringify(lines.map((l) => [l.id, l.variant, l.mode === 'pp' ? l.adults : 0, l.mode === 'pp' ? l.kids : 0, l.mode === 'flat' ? l.units : 0]));
      if (before !== after) body.items = items;
      if (Object.keys(body).length === 0) { setErr(t('Nothing has changed yet.')); return; }
      const v = await changeBooking(tk.refCode, token, body);
      onChanged(v);
      setDone(t('Saved. Your updated ticket is on its way by e-mail; the desk has been told.'));
      setOpen(false);
    } catch (e) {
      const status = (e as { status?: number }).status;
      setErr(status ? ((e as Error).message || t('We could not save the change. Please try again.')) : t('We could not reach the booking desk. Check your connection and try again.'));
    } finally { setBusy(false); }
  };
  const cancel = async () => {
    setBusy(true); setErr(''); setDone('');
    try {
      const v = await cancelBooking(tk.refCode, token);
      onChanged(v);
      setDone(t('Your booking is cancelled. Nothing more to do; we hope to see you another day.'));
      setOpen(false);
    } catch (e) {
      setErr((e as Error).message || t('We could not cancel the booking. Please call us.'));
    } finally { setBusy(false); setConfirmCancel(false); }
  };

  return (
    <div data-testid="manage-booking" data-print-hide="" className="mt-5 rounded-[14px] border-[1.5px] border-valle-lilac bg-[#F7F3FF] px-4 py-[14px] text-start">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <div className="text-[15px] font-extrabold">{t('Manage my booking')}</div>
          <div className="mt-0.5 text-[13px] text-valle-purple/65">{t('Change the date, the arrival time, your party or your experiences, or cancel. Free, up to the day of your visit.')}</div>
        </div>
        <button type="button" onClick={() => { setErr(''); setDone(''); if (open) setOpen(false); else openEditor(); }} className={cn(PILL, open ? cn(PILL_OUTLINE, 'bg-white text-valle-purple') : 'border-0 bg-valle-purple text-white')} data-testid="manage-toggle">{open ? t('Close') : t('Change or cancel')}</button>
      </div>
      {done && <div role="status" data-testid="manage-done" className="mt-2.5 text-[13.5px] font-bold text-[#1E9E4A]">{done}</div>}
      {open && (
        <div className="mt-[14px] grid gap-[14px]">
          <div className="flex flex-wrap items-center gap-2.5">
            <label className={fieldLabel}>
              {t('DATE')}
              <input type="date" value={date} min={todayIso()} onChange={(e) => setDate(e.target.value)} className={input} data-testid="manage-date" />
            </label>
            <label className={fieldLabel}>
              {t('ARRIVAL')}
              <select value={slot} onChange={(e) => setSlot(e.target.value as 'morning' | 'afternoon')} className={input} data-testid="manage-slot">
                <option value="morning">{t('Morning · 09:00–12:00')}</option>
                <option value="afternoon">{t('Afternoon · 12:00–15:30')}</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-[18px]">
            <Counter label={t('ADULTS')} value={adults} onChange={setAdults} min={1} testId="manage-adults" />
            <Counter label={t('CHILD 6–11')} value={kids} onChange={setKids} min={0} testId="manage-kids" />
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-[.1em] text-valle-purple/60">{t('EXPERIENCES')}</div>
            {lines.length === 0 && <div className="mt-1.5 text-[13px] text-valle-purple/60">{t('Park entry only. Add an experience below.')}</div>}
            {lines.map((l, i) => (
              <div key={l.id + '|' + l.variant} className="mt-2 flex flex-wrap items-center gap-2.5 rounded-[12px] bg-white px-3 py-2" data-testid="manage-line">
                <span className="flex-[1_1_160px] text-[14px] font-bold">{l.name}{l.variant ? <span className="font-normal text-valle-purple/60"> · {l.variant}</span> : null}{l.time ? <span className="font-mono font-bold text-valle-violet"> · {l.time}</span> : null}</span>
                {l.mode === 'pp'
                  ? <><Counter label={t('ADULTS')} value={l.adults} onChange={(n) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, adults: n } : x)))} min={0} testId={`line-adults-${l.id}`} /><Counter label={t('CHILD 6–11')} value={l.kids} onChange={(n) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, kids: n } : x)))} min={0} testId={`line-kids-${l.id}`} /></>
                  : <Counter label={t('UNITS')} value={l.units} onChange={(n) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, units: n } : x)))} min={1} testId={`line-units-${l.id}`} />}
                <button type="button" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label={t('Remove {name}', { name: l.name })} className="cursor-pointer rounded-full border-0 bg-[#FFE2E7] px-3 py-[7px] text-[12.5px] font-bold text-[#D91E44] [font-family:inherit]">{t('Remove')}</button>
              </div>
            ))}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <select value={addId} onChange={(e) => setAddId(e.target.value)} className={cn(input, 'flex-[1_1_220px]')} aria-label={t('Add an experience')} data-testid="manage-add-select">
                <option value="">{t('Add an experience…')}</option>
                {acts.filter((a) => !lines.some((l) => l.id === a.id && l.variant === '')).map((a) => <option key={a.id} value={a.id}>{a.name} · {t('from')} {mur(a.price)}</option>)}
              </select>
              <button type="button" onClick={addLine} disabled={!addId} className={cn(PILL, PILL_OUTLINE, 'bg-white text-valle-purple', addId ? 'opacity-100' : 'opacity-50')} data-testid="manage-add">{t('Add')}</button>
            </div>
          </div>
          {err && <div role="alert" data-testid="manage-error" className="rounded-[12px] border-[1.5px] border-valle-red bg-[#FFE2E7] px-[14px] py-2.5 text-[13.5px] font-semibold text-valle-purple">{err}</div>}
          <div className="flex flex-wrap items-center gap-2.5">
            <button type="button" onClick={() => { void save(); }} disabled={busy} className={cn(PILL, 'border-0 bg-valle-red text-white')} data-testid="manage-save">{busy ? t('Saving…') : t('Save changes')}</button>
            {!confirmCancel
              ? <button type="button" onClick={() => setConfirmCancel(true)} disabled={busy} className={cn(PILL, PILL_OUTLINE, 'bg-white text-[#D91E44]')} data-testid="manage-cancel">{t('Cancel my booking')}</button>
              : <span className="inline-flex flex-wrap items-center gap-2 text-[13.5px] font-semibold">
                  {t('Cancel booking {ref}? Your places are released.', { ref: tk.refCode })}
                  <button type="button" onClick={() => { void cancel(); }} disabled={busy} className={cn(PILL, 'border-0 bg-[#D91E44] text-white')} data-testid="manage-cancel-confirm">{t('Yes, cancel')}</button>
                  <button type="button" onClick={() => setConfirmCancel(false)} className={cn(PILL, PILL_OUTLINE, 'bg-white text-valle-purple')}>{t('Keep it')}</button>
                </span>}
          </div>
          {(tk.paidAmount ?? 0) > 0 && <div className="text-[12.5px] text-valle-purple/65">{t('If your change lowers the total, the difference is refunded by the desk; if it raises it, you pay the balance at the gate or online.')}</div>}
        </div>
      )}
    </div>
  );
}
