import { useState, type CSSProperties } from 'react';
import { useT } from '../i18n';
import { reserveTable } from '../lib/api';
import { todayIso } from '../lib/format';
import { useApp } from '../store/AppStore';
import type { MenuGroup } from '../types';

/**
 * A table at one of the park's restaurants: date, time, party, an optional
 * pre-order from the menu, and who to confirm to. The desk confirms it from
 * the back office; the guest gets an acknowledgement at once.
 */

const MONO = "'Chivo Mono',monospace";
const input: CSSProperties = { border: '1.5px solid #EBE2FF', background: '#F7F3FF', borderRadius: 12, padding: '11px 14px', fontFamily: 'inherit', fontSize: 14.5, color: '#340057', outline: 'none', width: '100%', boxSizing: 'border-box' };
const label: CSSProperties = { display: 'grid', gap: 5, fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', color: 'rgba(52,0,87,.6)' };
/** Lunch service: 11:30 to 15:30, every half hour. */
const TIMES = ['11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'];

export function TableReservation({ restaurantId, restaurantName, menuGroups }: { restaurantId: string; restaurantName: string; menuGroups: MenuGroup[] }) {
  const t = useT();
  const app = useApp();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(app.customDate || '');
  const [time, setTime] = useState('12:30');
  const [party, setParty] = useState(Math.max(1, app.adults + app.kids));
  const [name, setName] = useState(app.name);
  const [email, setEmail] = useState(app.email);
  const [phone, setPhone] = useState(app.phone);
  const [notes, setNotes] = useState('');
  const [pre, setPre] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  const preorder = Object.entries(pre).filter(([, q]) => q > 0).map(([item, qty]) => ({ item, qty }));
  const submit = async () => {
    setErr('');
    if (!name.trim()) { setErr(t('Add your name.')); return; }
    if (!email.trim() && !phone.trim()) { setErr(t('Add an e-mail or a phone number so we can confirm.')); return; }
    if (!date) { setErr(t('Pick the date.')); return; }
    setBusy(true);
    try {
      await reserveTable(restaurantId, { name: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined, visitDate: date, visitTime: time, party, preorder, notes: notes.trim() || undefined });
      setDone(true);
    } catch (e) {
      const status = (e as { status?: number }).status;
      setErr(status === 429 ? t('Too many requests from this connection. Please try again in a few minutes, or call us.') : status ? ((e as Error).message || t('We could not send your request. Please try again.')) : t('We could not reach the restaurant desk. Check your connection and try again.'));
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div data-testid="table-done" style={{ background: '#E6FFEE', border: '1.5px solid #33FF74', borderRadius: 16, padding: '16px 18px', color: '#340057' }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>{t('Table requested')}</div>
        <div style={{ fontSize: 14, lineHeight: 1.55, marginTop: 4 }}>{t('{name}, a table of {n} at {restaurant} on {date} at {time}. The team confirms it shortly by e-mail or phone.', { name: name.trim(), n: party, restaurant: restaurantName, date, time })}</div>
      </div>
    );
  }

  return (
    <div data-testid="table-reservation">
      {!open && (
        <button type="button" onClick={() => setOpen(true)} data-testid="table-open" style={{ display: 'block', width: '100%', textAlign: 'center', background: '#FF3358', color: '#FFFFFF', fontSize: 15, fontWeight: 700, padding: '15px 0', borderRadius: 999, border: 0, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 20px rgba(255,51,88,.35)' }}>
          {t('Reserve a table →')}
        </button>
      )}
      {open && (
        <div style={{ background: '#FFFFFF', color: '#340057', borderRadius: 16, padding: '16px 18px', display: 'grid', gap: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{t('Reserve a table at {restaurant}', { restaurant: restaurantName })}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10 }}>
            <label style={label}>{t('DATE')}<input type="date" value={date} min={todayIso()} onChange={(e) => setDate(e.target.value)} style={input} data-testid="table-date" /></label>
            <label style={label}>{t('TIME')}<select value={time} onChange={(e) => setTime(e.target.value)} style={input} data-testid="table-time">{TIMES.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
            <label style={label}>{t('PEOPLE')}<input type="number" min={1} max={60} value={party} onChange={(e) => setParty(Math.max(1, Math.min(60, Math.floor(Number(e.target.value) || 1))))} style={input} data-testid="table-party" /></label>
          </div>
          {menuGroups.length > 0 && (
            <details data-testid="table-preorder">
              <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>{t('Pre-order from the menu (optional)')}{preorder.length ? ` · ${preorder.reduce((s, l) => s + l.qty, 0)}` : ''}</summary>
              <div style={{ marginTop: 8, display: 'grid', gap: 6, maxHeight: 260, overflowY: 'auto', paddingInlineEnd: 4 }}>
                {menuGroups.map((g) => (
                  <div key={g.title}>
                    <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', color: '#7333FF', margin: '6px 0 4px' }}>{g.title}</div>
                    {g.items.map((it) => (
                      <div key={it.n} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, padding: '3px 0' }}>
                        <span style={{ flex: 1 }}>{it.n}<span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(52,0,87,.55)' }}> · {it.p}</span></span>
                        <button type="button" aria-label={`${it.n} −`} onClick={() => setPre((p) => ({ ...p, [it.n]: Math.max(0, (p[it.n] || 0) - 1) }))} style={{ width: 26, height: 26, borderRadius: 999, border: '1.5px solid #D9C9F0', background: '#FFFFFF', cursor: 'pointer', fontFamily: 'inherit' }}>−</button>
                        <span style={{ fontFamily: MONO, minWidth: 14, textAlign: 'center' }}>{pre[it.n] || 0}</span>
                        <button type="button" aria-label={`${it.n} +`} onClick={() => setPre((p) => ({ ...p, [it.n]: Math.min(60, (p[it.n] || 0) + 1) }))} style={{ width: 26, height: 26, borderRadius: 999, border: '1.5px solid #D9C9F0', background: '#FFFFFF', cursor: 'pointer', fontFamily: 'inherit' }}>+</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
            <label style={label}>{t('NAME')}<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" style={input} data-testid="table-name" /></label>
            <label style={label}>{t('E-MAIL')}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" style={input} data-testid="table-email" /></label>
            <label style={label}>{t('PHONE')}<input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" style={input} /></label>
          </div>
          <label style={label}>{t('ANYTHING ELSE')}<input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('Allergies, a birthday, a high chair…')} style={input} /></label>
          {err && <div role="alert" data-testid="table-error" style={{ background: '#FFE2E7', border: '1.5px solid #FF3358', borderRadius: 12, padding: '10px 14px', fontSize: 13.5, fontWeight: 600 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => { void submit(); }} disabled={busy} data-testid="table-submit" style={{ border: 0, background: busy ? '#B98AA7' : '#FF3358', color: '#FFFFFF', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, padding: '13px 24px', borderRadius: 999, cursor: busy ? 'wait' : 'pointer' }}>{busy ? t('Sending…') : t('Request the table →')}</button>
            <button type="button" onClick={() => setOpen(false)} style={{ border: '1.5px solid #340057', background: 'transparent', color: '#340057', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, padding: '11px 18px', borderRadius: 999, cursor: 'pointer' }}>{t('Close')}</button>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(52,0,87,.55)' }}>{t('OPEN DAILY 11:30 – 16:30 · CONFIRMED BY THE TEAM, USUALLY WITHIN THE HOUR')}</div>
        </div>
      )}
    </div>
  );
}
