import { useMemo, useState, type CSSProperties } from 'react';
import { useT } from '../i18n';
import { cancelBooking, changeBooking, type TicketView } from '../lib/api';
import { mur, todayIso } from '../lib/format';
import { useCatalog } from '../store/CatalogContext';

/**
 * "Manage my booking" on the ticket page: date, arrival slot, party and
 * experiences can be changed, or the booking cancelled, straight from the
 * link in the confirmation. The server re-prices, checks capacity and writes
 * the trail under "guest"; the desk gets an e-mail.
 */

const MONO = "'Chivo Mono',monospace";
const input: CSSProperties = { border: '1.5px solid #EBE2FF', background: '#F7F3FF', borderRadius: 12, padding: '10px 14px', fontFamily: 'inherit', fontSize: 14, color: '#340057', outline: 'none' };
const pill = (bg: string, fg: string, outline = false): CSSProperties => ({ background: bg, color: fg, border: outline ? '1.5px solid #340057' : 0, borderRadius: 999, padding: '10px 18px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' });

type Line = { id: string; name: string; variant: string; mode: 'pp' | 'flat'; adults: number; kids: number; units: number; time?: string };

function Counter({ label, value, onChange, min, testId }: { label: string; value: number; onChange: (n: number) => void; min: number; testId: string }) {
  const b: CSSProperties = { width: 30, height: 30, borderRadius: 999, border: '1.5px solid #D9C9F0', background: '#FFFFFF', color: '#340057', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' };
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }} data-testid={testId}>
      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: 'rgba(52,0,87,.6)' }}>{label}</span>
      <button type="button" aria-label={`${label} −`} onClick={() => onChange(Math.max(min, value - 1))} style={b}>−</button>
      <span style={{ fontFamily: MONO, fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{value}</span>
      <button type="button" aria-label={`${label} +`} onClick={() => onChange(Math.min(12, value + 1))} style={b}>+</button>
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
    return done ? <div role="status" data-testid="manage-done" data-print-hide="" style={{ marginTop: 20, textAlign: 'start', background: '#F7F3FF', border: '1.5px solid #EBE2FF', borderRadius: 14, padding: '14px 16px', color: '#1E9E4A', fontWeight: 700, fontSize: 13.5 }}>{done}</div> : null;
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
    <div data-testid="manage-booking" data-print-hide="" style={{ marginTop: 20, textAlign: 'start', background: '#F7F3FF', border: '1.5px solid #EBE2FF', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{t('Manage my booking')}</div>
          <div style={{ fontSize: 13, color: 'rgba(52,0,87,.65)', marginTop: 2 }}>{t('Change the date, the arrival time, your party or your experiences, or cancel. Free, up to the day of your visit.')}</div>
        </div>
        <button type="button" onClick={() => { setErr(''); setDone(''); if (open) setOpen(false); else openEditor(); }} style={pill(open ? '#FFFFFF' : '#340057', open ? '#340057' : '#FFFFFF', open)} data-testid="manage-toggle">{open ? t('Close') : t('Change or cancel')}</button>
      </div>
      {done && <div role="status" data-testid="manage-done" style={{ marginTop: 10, color: '#1E9E4A', fontWeight: 700, fontSize: 13.5 }}>{done}</div>}
      {open && (
        <div style={{ marginTop: 14, display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'grid', gap: 4, fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: 'rgba(52,0,87,.6)' }}>
              {t('DATE')}
              <input type="date" value={date} min={todayIso()} onChange={(e) => setDate(e.target.value)} style={input} data-testid="manage-date" />
            </label>
            <label style={{ display: 'grid', gap: 4, fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: 'rgba(52,0,87,.6)' }}>
              {t('ARRIVAL')}
              <select value={slot} onChange={(e) => setSlot(e.target.value as 'morning' | 'afternoon')} style={input} data-testid="manage-slot">
                <option value="morning">{t('Morning · 09:00–12:00')}</option>
                <option value="afternoon">{t('Afternoon · 12:00–15:30')}</option>
              </select>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <Counter label={t('ADULTS')} value={adults} onChange={setAdults} min={1} testId="manage-adults" />
            <Counter label={t('CHILD 6–11')} value={kids} onChange={setKids} min={0} testId="manage-kids" />
          </div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: 'rgba(52,0,87,.6)' }}>{t('EXPERIENCES')}</div>
            {lines.length === 0 && <div style={{ fontSize: 13, color: 'rgba(52,0,87,.6)', marginTop: 6 }}>{t('Park entry only. Add an experience below.')}</div>}
            {lines.map((l, i) => (
              <div key={l.id + '|' + l.variant} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 8, background: '#FFFFFF', borderRadius: 12, padding: '8px 12px' }} data-testid="manage-line">
                <span style={{ flex: '1 1 160px', fontWeight: 700, fontSize: 14 }}>{l.name}{l.variant ? <span style={{ fontWeight: 400, color: 'rgba(52,0,87,.6)' }}> · {l.variant}</span> : null}{l.time ? <span style={{ fontFamily: MONO, fontWeight: 700, color: '#7333FF' }}> · {l.time}</span> : null}</span>
                {l.mode === 'pp'
                  ? <><Counter label={t('ADULTS')} value={l.adults} onChange={(n) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, adults: n } : x)))} min={0} testId={`line-adults-${l.id}`} /><Counter label={t('CHILD 6–11')} value={l.kids} onChange={(n) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, kids: n } : x)))} min={0} testId={`line-kids-${l.id}`} /></>
                  : <Counter label={t('UNITS')} value={l.units} onChange={(n) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, units: n } : x)))} min={1} testId={`line-units-${l.id}`} />}
                <button type="button" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label={t('Remove {name}', { name: l.name })} style={{ ...pill('#FFE2E7', '#D91E44'), padding: '7px 12px', fontSize: 12.5 }}>{t('Remove')}</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={addId} onChange={(e) => setAddId(e.target.value)} style={{ ...input, flex: '1 1 220px' }} aria-label={t('Add an experience')} data-testid="manage-add-select">
                <option value="">{t('Add an experience…')}</option>
                {acts.filter((a) => !lines.some((l) => l.id === a.id && l.variant === '')).map((a) => <option key={a.id} value={a.id}>{a.name} · {t('from')} {mur(a.price)}</option>)}
              </select>
              <button type="button" onClick={addLine} disabled={!addId} style={{ ...pill('#FFFFFF', '#340057', true), opacity: addId ? 1 : 0.5 }} data-testid="manage-add">{t('Add')}</button>
            </div>
          </div>
          {err && <div role="alert" data-testid="manage-error" style={{ background: '#FFE2E7', border: '1.5px solid #FF3358', borderRadius: 12, padding: '10px 14px', fontSize: 13.5, fontWeight: 600, color: '#340057' }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" onClick={() => { void save(); }} disabled={busy} style={pill('#FF3358', '#FFFFFF')} data-testid="manage-save">{busy ? t('Saving…') : t('Save changes')}</button>
            {!confirmCancel
              ? <button type="button" onClick={() => setConfirmCancel(true)} disabled={busy} style={pill('#FFFFFF', '#D91E44', true)} data-testid="manage-cancel">{t('Cancel my booking')}</button>
              : <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 13.5, fontWeight: 600 }}>
                  {t('Cancel booking {ref}? Your places are released.', { ref: tk.refCode })}
                  <button type="button" onClick={() => { void cancel(); }} disabled={busy} style={pill('#D91E44', '#FFFFFF')} data-testid="manage-cancel-confirm">{t('Yes, cancel')}</button>
                  <button type="button" onClick={() => setConfirmCancel(false)} style={pill('#FFFFFF', '#340057', true)}>{t('Keep it')}</button>
                </span>}
          </div>
          {(tk.paidAmount ?? 0) > 0 && <div style={{ fontSize: 12.5, color: 'rgba(52,0,87,.65)' }}>{t('If your change lowers the total, the difference is refunded by the desk; if it raises it, you pay the balance at the gate or online.')}</div>}
        </div>
      )}
    </div>
  );
}
