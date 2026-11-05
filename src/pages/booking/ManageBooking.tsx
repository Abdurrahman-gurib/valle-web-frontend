import { useMemo, useState } from 'react';
import { useT } from '../../i18n';
import { cancelBooking, changeBooking, type TicketView } from '../../lib/api';
import { mur, todayIso } from '../../lib/format';
import { selKey } from '../../lib/sel';
import { lineCaps } from '../../lib/ages';
import { useCatalog } from '../../store/CatalogContext';
import { computeBooking, emptyLines, fitSelToParty, lineEligibility, linesOverParty, newLineCounts, priceFor, type Party } from '../../store/booking';
import { PRODUCT_PREFIX, type RateKey, type Sel } from '../../types';
import { cn } from '@/lib/utils';
import { errorMessage, httpStatus } from '../../lib/errors';
import { productDisplayName } from '../../lib/photoTier';

/**
 * "Manage my booking" on the ticket page: date, arrival slot, party and
 * experiences (packages included) can be changed, or the booking cancelled,
 * straight from the link in the confirmation. Prices follow the booking's own
 * rate, as on the booking page, and the new total shows before saving. The
 * server re-prices, checks capacity and writes the trail under "guest"; the
 * desk gets an e-mail.
 */

const input = 'rounded-[12px] border-[1.5px] border-valle-lilac bg-[#F7F3FF] px-[14px] py-2.5 text-[14px] text-valle-purple outline-none [font-family:inherit]';
/** Pill button base; add the colours (and `PILL_OUTLINE` or `border-0`) per use. */
const PILL = 'vbtn vbtn-sm';
const PILL_OUTLINE = 'vbtn-secondary';
const fieldLabel = 'grid gap-1 font-mono text-[10px] tracking-[.1em] text-valle-purple/60';

/** One editable line: an experience (id = experience id) or a package / product (id = "product:<key>"). */
type Line = { id: string; name: string; variant: string; mode: 'pp' | 'flat'; adults: number; kids: number; units: number; time?: string };

function Counter({ label, value, onChange, min, max = 12, testId }: { label: string; value: number; onChange: (n: number) => void; min: number; max?: number; testId: string }) {
  const b = 'h-[30px] w-[30px] shrink-0 cursor-pointer rounded-full border-[1.5px] border-[#D9C9F0] bg-white font-extrabold text-valle-purple [font-family:inherit] disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap" data-testid={testId}>
      <span className="font-mono text-[10px] tracking-[.1em] text-valle-purple/60">{label}</span>
      <button type="button" aria-label={`${label} −`} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className={b}>−</button>
      <span className="min-w-4 text-center font-mono font-bold" aria-live="polite">{value}</span>
      <button type="button" aria-label={`${label} +`} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className={b}>+</button>
    </div>
  );
}

const keyOf = (l: Pick<Line, 'id' | 'variant'>) => selKey(l.id, l.variant || undefined);

export function ManageBooking({ tk, token, onChanged }: { tk: TicketView; token: string; onChanged: (v: TicketView) => void }) {
  const t = useT();
  const catalog = useCatalog();
  const rate: RateKey = tk.rate === 'nr' ? 'nr' : 'rr';
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(tk.visitDate);
  const [slot, setSlot] = useState<'morning' | 'afternoon'>(tk.slot);
  const [adults, setAdultsState] = useState(tk.adults);
  const [kids, setKidsState] = useState(tk.kids);
  const [infants, setInfantsState] = useState(tk.infants ?? 0);
  const acts = useMemo(() => catalog.ACTS.filter((a) => a.mode === 'pp' || a.mode === 'flat'), [catalog]);
  const byId = useMemo(() => new Map(acts.map((a) => [a.id, a])), [acts]);
  const linesOf = (v: TicketView): Line[] => v.lines.flatMap((l): Line[] => {
    if (l.productKey) {
      const p = (catalog.PRODUCTS ?? []).find((x) => x.key === l.productKey);
      const name = p ? productDisplayName(p) : l.label.split(' · ')[0];
      const flat = p ? p.mode === 'flat' : (l.units ?? 0) > 0;
      return [{ id: PRODUCT_PREFIX + l.productKey, name, variant: '', mode: flat ? 'flat' : 'pp', adults: l.adults ?? 0, kids: l.kids ?? 0, units: l.units ?? 0 }];
    }
    if (!l.experienceId || !byId.has(l.experienceId)) return [];
    const a = byId.get(l.experienceId)!;
    return [{ id: a.id, name: a.name, variant: l.variant ?? '', mode: a.mode as 'pp' | 'flat', adults: l.adults ?? 0, kids: l.kids ?? 0, units: l.units ?? 0, time: l.time ?? undefined }];
  });
  const [lines, setLines] = useState<Line[]>(() => linesOf(tk));
  /** Opening the editor always starts from what the ticket says now (it may have been changed and saved). */
  const openEditor = () => { setDate(tk.visitDate); setSlot(tk.slot); setAdultsState(tk.adults); setKidsState(tk.kids); setInfantsState(tk.infants ?? 0); setLines(linesOf(tk)); setConfirmCancel(false); setOpen(true); };
  const [addId, setAddId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  const party: Party = { adults, kids, infants };
  const toSel = (ls: Line[]): Sel => Object.fromEntries(ls.map((l) => [keyOf(l), l.mode === 'flat' ? { u: l.units } : { a: l.adults, k: l.kids }]));
  /** The booking as it would be priced now, with the booking page's own rules and the booking's rate. */
  const preview = useMemo(() => computeBooking(catalog, toSel(lines), adults, kids, rate, infants),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalog, lines, adults, kids, infants, rate]);

  const canChange = (tk.status === 'confirmed' || tk.status === 'postponed') && tk.visitDate >= todayIso();
  // once cancelled (or checked in) only the outcome of the last action stays visible
  if (!canChange) {
    return done ? <div role="status" data-testid="manage-done" data-print-hide="" className="mt-5 rounded-[14px] border-[1.5px] border-valle-lilac bg-[#F7F3FF] px-4 py-[14px] text-start text-[13.5px] font-bold text-[#1E9E4A]">{done}</div> : null;
  }

  /** The party changes: the lines follow it, as in the cart (see fitSelToParty). */
  const changeParty = (next: Party) => {
    const fitted = fitSelToParty(catalog, toSel(lines), party, next);
    setLines((ls) => ls.map((l) => { const e = fitted[keyOf(l)]; return e && l.mode === 'pp' ? { ...l, adults: e.a ?? 0, kids: e.k ?? 0 } : l; }));
    setAdultsState(next.adults); setKidsState(next.kids); setInfantsState(next.infants);
  };

  const addLine = () => {
    const a = byId.get(addId);
    if (!a || lines.some((l) => l.id === a.id && l.variant === '')) return;
    const c = newLineCounts(catalog, a.id, party);
    setLines((ls) => [...ls, { id: a.id, name: a.name, variant: '', mode: a.mode as 'pp' | 'flat', adults: a.mode === 'pp' ? c.a : 0, kids: a.mode === 'pp' ? c.k : 0, units: a.mode === 'flat' ? 1 : 0 }]);
    setAddId('');
  };
  const save = async () => {
    setErr(''); setDone('');
    const over = linesOverParty(preview.selLines, party);
    if (over.length > 0) { setErr(t('{names}: more people than in your party. Lower the counts or change the party.', { names: over.join(', ') })); return; }
    const nobody = emptyLines(preview.selLines);
    if (nobody.length > 0) { setErr(t('Nobody in your party is counted on {names}. Add people to it or remove it.', { names: nobody.join(', ') })); return; }
    setBusy(true);
    try {
      const body: Parameters<typeof changeBooking>[2] = {};
      if (date !== tk.visitDate) body.visitDate = date;
      if (slot !== tk.slot) body.slot = slot;
      if (adults !== tk.adults) body.adults = adults;
      if (kids !== tk.kids) body.kids = kids;
      if (infants !== (tk.infants ?? 0)) body.infants = infants;
      const items = lines.map((l) => ({ id: l.id, variant: l.variant || undefined, adults: l.mode === 'pp' ? l.adults : undefined, kids: l.mode === 'pp' ? l.kids : undefined, units: l.mode === 'flat' ? l.units : undefined, time: l.time }));
      const before = JSON.stringify(tk.lines.filter((l) => l.experienceId || l.productKey).map((l) => [l.productKey ? PRODUCT_PREFIX + l.productKey : l.experienceId, l.variant ?? '', l.adults ?? 0, l.kids ?? 0, l.units ?? 0]).sort());
      const after = JSON.stringify(lines.map((l) => [l.id, l.variant, l.mode === 'pp' ? l.adults : 0, l.mode === 'pp' ? l.kids : 0, l.mode === 'flat' ? l.units : 0]).sort());
      if (before !== after) body.items = items;
      if (Object.keys(body).length === 0) { setErr(t('Nothing has changed yet.')); return; }
      const v = await changeBooking(tk.refCode, token, body);
      onChanged(v);
      setDone(t('Saved. Your updated ticket is on its way by e-mail; the desk has been told.'));
      setOpen(false);
    } catch (e) {
      const status = httpStatus(e);
      const msg = errorMessage(e);
      const over = status === 400 ? /^(.+) cannot count more people than the party$/.exec(msg) : null;
      const young = status === 400 ? /^(.+) is for ages (\d+)\+ only$/.exec(msg) : null;
      setErr(over
        ? t('{names}: more people than in your party. Lower the counts or change the party.', { names: over[1] })
        : young
        ? t('{name} is for ages {age}+ only: children 6–11 cannot ride. Lower the child count or remove it.', { name: young[1], age: young[2] })
        : status ? errorMessage(e, t('We could not save the change. Please try again.')) : t('We could not reach the booking desk. Check your connection and try again.'));
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
      setErr(errorMessage(e, t('We could not cancel the booking. Please call us.')));
    } finally { setBusy(false); setConfirmCancel(false); }
  };

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const changed = preview.total !== tk.total + (tk.adjustmentAmount ?? 0);

  return (
    <div data-testid="manage-booking" data-print-hide="" className="mt-5 rounded-[14px] border-[1.5px] border-valle-lilac bg-[#F7F3FF] px-4 py-[14px] text-start">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <div className="text-[15px] font-extrabold">{t('Manage my booking')}</div>
          <div className="mt-0.5 text-[13px] text-valle-purple/65">{t('Change the date, the arrival time, your party or your activities, or cancel. Free, up to the day of your visit.')}</div>
        </div>
        <button type="button" onClick={() => { setErr(''); setDone(''); if (open) setOpen(false); else openEditor(); }} className={cn(PILL, open ? PILL_OUTLINE : 'vbtn-primary')} data-testid="manage-toggle">{open ? t('Close') : t('Change or cancel')}</button>
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
          <div className="flex flex-wrap gap-x-[18px] gap-y-2.5">
            <Counter label={t('ADULTS')} value={adults} onChange={(n) => changeParty({ ...party, adults: n })} min={1} testId="manage-adults" />
            <Counter label={t('CHILD 6–11')} value={kids} onChange={(n) => changeParty({ ...party, kids: n })} min={0} testId="manage-kids" />
            <Counter label={t('UNDER 6 (FREE)')} value={infants} onChange={(n) => changeParty({ ...party, infants: n })} min={0} testId="manage-infants" />
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-[.1em] text-valle-purple/60">{t('ACTIVITIES')}</div>
            {lines.length === 0 && <div className="mt-1.5 text-[13px] text-valle-purple/60">{t('Park entry only. Add an activity below.')}</div>}
            {lines.map((l, i) => {
              const el = lineEligibility(catalog, l.id);
              const caps = lineCaps(el, party);
              return (
                <div key={l.id + '|' + l.variant} className="mt-2 grid gap-2 rounded-[12px] bg-white px-3 py-2" data-testid="manage-line">
                  <span className="text-[14px] font-bold">{l.name}{l.variant ? <span className="font-normal text-valle-purple/60"> · {t(l.variant)}</span> : null}{l.time ? <span className="font-mono font-bold text-valle-violet"> · {l.time}</span> : null}</span>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    {l.mode === 'pp'
                      ? <>
                          {(el.adults || l.adults > 0) && <Counter label={t('ADULTS')} value={l.adults} max={Math.max(l.adults, caps.a)} onChange={(n) => setLine(i, { adults: n })} min={0} testId={`line-adults-${l.id}`} />}
                          {(el.kids || el.infants || l.kids > 0) && <Counter label={el.infants ? t('CHILD UNDER 12') : t('CHILD 6–11')} value={l.kids} max={Math.max(l.kids, caps.k)} onChange={(n) => setLine(i, { kids: n })} min={0} testId={`line-kids-${l.id}`} />}
                        </>
                      : <Counter label={t('UNITS')} value={l.units} onChange={(n) => setLine(i, { units: n })} min={1} testId={`line-units-${l.id}`} />}
                    <button type="button" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label={t('Remove {name}', { name: l.name })} className={cn(PILL, PILL_OUTLINE, 'ms-auto')}>{t('Remove')}</button>
                  </div>
                </div>
              );
            })}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <select value={addId} onChange={(e) => setAddId(e.target.value)} className={cn(input, 'flex-[1_1_220px]')} aria-label={t('Add an activity')} data-testid="manage-add-select">
                <option value="">{t('Add an activity…')}</option>
                {acts.filter((a) => !lines.some((l) => l.id === a.id && l.variant === '')).map((a) => <option key={a.id} value={a.id}>{a.name} · {t('from')} {mur(priceFor(catalog, a, rate))}</option>)}
              </select>
              <button type="button" onClick={addLine} disabled={!addId} className={cn(PILL, PILL_OUTLINE)} data-testid="manage-add">{t('Add')}</button>
            </div>
          </div>
          <div data-testid="manage-total" className="flex flex-wrap items-baseline justify-between gap-2 rounded-[12px] bg-white px-3 py-2.5 text-[14px]">
            <span className="font-bold">{changed ? t('New total') : t('Total')}</span>
            <span className="font-mono font-extrabold">
              {changed && <span className="me-2 font-semibold text-valle-purple/50 line-through">{mur(tk.total + (tk.adjustmentAmount ?? 0))}</span>}
              {mur(preview.total)}
            </span>
            {(tk.adjustmentAmount ?? 0) > 0 && <span className="basis-full text-[12.5px] text-valle-purple/65">{t('Before your code; the desk applies it again when you save.')}</span>}
          </div>
          {err && <div role="alert" data-testid="manage-error" className="rounded-[12px] border-[1.5px] border-valle-red bg-[#FFE2E7] px-[14px] py-2.5 text-[13.5px] font-semibold text-valle-purple">{err}</div>}
          <div className="flex flex-wrap items-center gap-2.5">
            <button type="button" onClick={() => { void save(); }} disabled={busy} className={cn(PILL, 'vbtn-primary')} data-testid="manage-save">{busy ? t('Saving…') : t('Save changes')}</button>
            {!confirmCancel
              ? <button type="button" onClick={() => setConfirmCancel(true)} disabled={busy} className={cn(PILL, 'border-[#B8163A] bg-white text-[#B8163A] hover:bg-[#FFF0F3]')} data-testid="manage-cancel">{t('Cancel my booking')}</button>
              : <span className="inline-flex flex-wrap items-center gap-2 text-[13.5px] font-semibold">
                  {t('Cancel booking {ref}? Your places are released.', { ref: tk.refCode })}
                  <button type="button" onClick={() => { void cancel(); }} disabled={busy} className={cn(PILL, 'border-[#B8163A] bg-white text-[#B8163A] hover:bg-[#FFF0F3]')} data-testid="manage-cancel-confirm">{t('Yes, cancel')}</button>
                  <button type="button" onClick={() => setConfirmCancel(false)} className={cn(PILL, 'vbtn-primary')}>{t('Keep it')}</button>
                </span>}
          </div>
          {(tk.paidAmount ?? 0) > 0 && <div className="text-[12.5px] text-valle-purple/65">{t('If your change lowers the total, the difference is refunded by the desk; if it raises it, you pay the balance at the gate or online.')}</div>}
        </div>
      )}
    </div>
  );
}
