import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Stripes } from '../components/Stripes';
import { isRtl, useT } from '../i18n';
import { createBooking, fetchAvailability, newAttemptKey, type AvailabilityDay } from '../lib/api';
import { money, mur, todayIso } from '../lib/format';
import { paths } from '../lib/nav';
import { breadcrumbs, useSeo } from '../lib/seo';
import { useApp } from '../store/AppStore';
import { useCatalog } from '../store/CatalogContext';
import { productAmount, type Activity, type BookingRequest, type BookingResponse, type Product } from '../types';

/**
 * /groups: schools, companies and clubs book online with per-head pricing,
 * a participant list (typed or pasted from a spreadsheet), a deposit, and
 * one waiver pack the teacher / leader signs for everyone. Replaces the
 * quote-only form for anything that is really a booking.
 */

const MONO = "'Chivo Mono',monospace";
const BARLOW = "'Barlow',sans-serif";
const input: CSSProperties = { border: '1.5px solid #EBE2FF', background: '#F7F3FF', borderRadius: 12, padding: '12px 14px', fontFamily: 'inherit', fontSize: 15, color: '#340057', outline: 'none', width: '100%', boxSizing: 'border-box' };
const label: CSSProperties = { display: 'grid', gap: 5, fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', color: 'rgba(52,0,87,.6)' };
const stepLabel: CSSProperties = { fontFamily: MONO, fontSize: 12, fontWeight: 600, letterSpacing: '.16em', color: '#7333FF', marginTop: 34 };

type Kind = 'school' | 'company' | 'club' | 'other';
type Participant = { name: string; age?: number };

/** "Name, 12" per line, or a CSV with a name column; ages are optional. */
export function parseParticipants(text: string): Participant[] {
  const out: Participant[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const cells = line.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ''));
    if (/^(name|nom|participant)s?$/i.test(cells[0] ?? '')) continue; // header row
    const name = cells[0];
    if (!name) continue;
    const age = cells.slice(1).map((c) => Number(c)).find((n) => Number.isInteger(n) && n >= 0 && n <= 110);
    out.push(age !== undefined ? { name: name.slice(0, 120), age } : { name: name.slice(0, 120) });
    if (out.length >= 400) break;
  }
  return out;
}

export default function GroupsPage() {
  const t = useT();
  const app = useApp();
  const catalog = useCatalog();
  useSeo({
    title: t('Groups & schools · VALLÉ Advenature™ Park'),
    description: t('Book a school outing, company day or club visit online: per-head prices, your participant list, a deposit, and one waiver pack for the leader to sign.'),
    canonicalPath: '/groups',
    jsonLd: [breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Groups & schools', path: '/groups' }])],
  });

  const [kind, setKind] = useState<Kind>('school');
  const [org, setOrg] = useState('');
  const [leader, setLeader] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState<'morning' | 'afternoon'>('morning');
  const [adults, setAdults] = useState(2);
  const [kids, setKids] = useState(30);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [list, setList] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<(BookingResponse & { total: number }) | null>(null);
  const [avail, setAvail] = useState<AvailabilityDay | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const attemptKey = useRef(newAttemptKey());

  const rate = app.rate ?? 'rr';
  const students = useMemo(() => (catalog.PRODUCTS ?? []).filter((p) => p.family === 'student'), [catalog]);
  const activities = useMemo(() => catalog.ACTS.filter((a) => a.mode === 'pp' && (a.cat === 'adventure' || a.cat === 'nature')), [catalog]);
  const school = kind === 'school';
  const headcount = adults + kids;
  const participants = useMemo(() => parseParticipants(list), [list]);

  useEffect(() => {
    if (!date) { setAvail(null); return; }
    let dead = false;
    fetchAvailability(date, 1).then((d) => { if (!dead) setAvail(d[0] ?? null); }).catch(() => { /* picker works without it */ });
    return () => { dead = true; };
  }, [date]);

  // what the party pays, per head and in all
  const lines = useMemo(() => {
    const out: { id: string; name: string; perHead: string; amount: number }[] = [];
    for (const [id, on] of Object.entries(picked)) {
      if (!on) continue;
      if (id.startsWith('product:')) {
        const p = students.find((x) => 'product:' + x.key === id) as Product | undefined;
        if (!p) continue;
        out.push({ id, name: p.name, perHead: mur(rate === 'nr' ? p.nr : p.rr), amount: productAmount(p, rate, adults, kids, 0) });
      } else {
        const a = activities.find((x) => x.id === id) as Activity | undefined;
        if (!a) continue;
        const rp = catalog.RATEP[a.id];
        const price = rp ? (rate === 'nr' ? rp[1] : rp[0]) : a.price;
        out.push({ id, name: a.name, perHead: mur(price), amount: price * adults + Math.round(price * 0.5) * kids });
      }
    }
    return out;
  }, [picked, students, activities, catalog, rate, adults, kids]);
  const entryA = (catalog.PL.admission?.[0] ? (rate === 'nr' ? catalog.PL.admission[0].nr : catalog.PL.admission[0].rr) : 550);
  const entryK = (catalog.PL.admission?.[1] ? (rate === 'nr' ? catalog.PL.admission[1].nr : catalog.PL.admission[1].rr) : 325);
  // the student rows include the entrance fee; experiences do not
  const entry = school && lines.some((l) => l.id.startsWith('product:')) ? 0 : entryA * adults + entryK * kids;
  const total = entry + lines.reduce((s, l) => s + l.amount, 0);
  const depositPct = 30;
  const deposit = Math.round(total * depositPct / 100);

  const onFile = async (f: File | null) => {
    if (!f) return;
    const text = await f.text();
    setList((cur) => (cur.trim() ? cur.trimEnd() + '\n' : '') + text);
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = async () => {
    setErr('');
    if (!org.trim() || !leader.trim()) { setErr(t('Add the organisation and the leader’s name.')); return; }
    if (!email.trim() && !phone.trim()) { setErr(t('Add an e-mail or a phone number for the confirmation.')); return; }
    if (!date) { setErr(t('Pick the date of the visit.')); return; }
    if (headcount < 10) { setErr(t('A group booking is for 10 people or more. For fewer, book a day the usual way.')); return; }
    if (participants.length > headcount) { setErr(t('The list has more names than the headcount ({n}). Adjust one or the other.', { n: headcount })); return; }
    setBusy(true);
    const req: BookingRequest = {
      visitDate: date, slot, adults, kids, rate,
      items: lines.map((l) => ({ id: l.id, adults, kids })),
      name: leader.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined,
      payMode: 'gate',
      idempotencyKey: attemptKey.current,
      group: { kind, organisation: org.trim(), leaderName: leader.trim(), participants },
    };
    try {
      const res = await createBooking(req);
      setDone({ ...res, total: res.total });
      window.scrollTo(0, 0);
    } catch (e) {
      const status = (e as { status?: number }).status;
      setErr(status ? ((e as Error).message || t('We could not confirm your booking. Please try again.')) : t('We could not reach the booking desk. Check your connection and try again.'));
    } finally { setBusy(false); }
  };

  const slotLevel = avail ? (slot === 'morning' ? avail.morning.level : avail.afternoon.level) : undefined;

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '104px clamp(16px,3.5vw,40px) 60px' }}>
      {!done && (
        <>
          <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, letterSpacing: '.16em', color: '#7333FF' }}>{t('SCHOOLS · COMPANIES · CLUBS')}</div>
          <h1 style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(38px,5.8vw,74px)', lineHeight: 0.86, margin: '10px 0 0', textTransform: 'uppercase', transform: 'rotate(-3deg)', transformOrigin: isRtl() ? 'right bottom' : 'left bottom' }}>
            {t('Bring the')}<br /><span style={{ color: '#7333FF' }}>{t('whole group.')}</span>
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(52,0,87,.75)', maxWidth: '60ch', margin: '22px 0 0' }}>
            {t('Ten people or more book here: per-head prices, your participant list, a {pct}% deposit, and one safety waiver pack the leader signs for everyone. Team-building programmes with facilitators still start with a quote.', { pct: depositPct })}
            {' '}<Link to={paths.team()} style={{ color: '#7333FF', fontWeight: 600 }}>{t('Team building →')}</Link>
          </p>

          <div style={stepLabel}>{t('1 · WHO IS COMING')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginTop: 12 }}>
            <label style={label}>{t('TYPE OF GROUP')}
              <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} style={input} data-testid="group-kind">
                <option value="school">{t('School')}</option>
                <option value="company">{t('Company')}</option>
                <option value="club">{t('Club or association')}</option>
                <option value="other">{t('Other')}</option>
              </select>
            </label>
            <label style={label}>{t('ORGANISATION')}<input value={org} onChange={(e) => setOrg(e.target.value)} placeholder={t('School, company or club name')} style={input} data-testid="group-org" /></label>
            <label style={label}>{t('LEADER / TEACHER IN CHARGE')}<input value={leader} onChange={(e) => setLeader(e.target.value)} placeholder={t('Full name')} style={input} data-testid="group-leader" /></label>
            <label style={label}>{t('E-MAIL')}<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" style={input} data-testid="group-email" /></label>
            <label style={label}>{t('PHONE (SMS / WHATSAPP)')}<input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" style={input} /></label>
          </div>

          <div style={stepLabel}>{t('2 · WHEN AND HOW MANY')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginTop: 12 }}>
            <label style={label}>{t('DATE')}<input type="date" value={date} min={todayIso()} onChange={(e) => setDate(e.target.value)} style={input} data-testid="group-date" /></label>
            <label style={label}>{t('ARRIVAL')}
              <select value={slot} onChange={(e) => setSlot(e.target.value as 'morning' | 'afternoon')} style={input}>
                <option value="morning">{t('Morning · 09:00–12:00')}</option>
                <option value="afternoon">{t('Afternoon · 12:00–15:30')}</option>
              </select>
            </label>
            <label style={label}>{school ? t('ADULTS (TEACHERS, PARENTS)') : t('ADULTS')}<input type="number" min={0} max={400} value={adults} onChange={(e) => setAdults(Math.max(0, Math.min(400, Math.floor(Number(e.target.value) || 0))))} style={input} data-testid="group-adults" /></label>
            <label style={label}>{school ? t('STUDENTS / CHILDREN 6–11') : t('CHILDREN 6–11')}<input type="number" min={0} max={400} value={kids} onChange={(e) => setKids(Math.max(0, Math.min(400, Math.floor(Number(e.target.value) || 0))))} style={input} data-testid="group-kids" /></label>
          </div>
          {slotLevel && (slotLevel === 'full' || slotLevel === 'closed') && (
            <div role="alert" style={{ marginTop: 10, background: '#FFE2E7', border: '1.5px solid #FF3358', borderRadius: 12, padding: '10px 14px', fontSize: 13.5, fontWeight: 600 }}>
              {slotLevel === 'closed' ? t('The park is closed for that arrival slot. Pick another day.') : t('That arrival slot is fully booked on this date. Pick the other slot or another day.')}
            </div>
          )}
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(52,0,87,.55)', marginTop: 8 }}>{t('HEADCOUNT {n} · GROUPS ARE 10 OR MORE · SECONDARY STUDENTS OVER 11 COUNT AS ADULTS AT THE STUDENT RATE', { n: headcount })}</div>

          <div style={stepLabel}>{school ? t('3 · STUDENT PRICELIST · PER STUDENT, ENTRANCE INCLUDED') : t('3 · EXPERIENCES · PER PERSON')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 10, marginTop: 12 }} data-testid="group-items">
            {(school ? students.map((p) => ({ id: 'product:' + p.key, name: p.name, price: rate === 'nr' ? p.nr : p.rr })) : activities.map((a) => ({ id: a.id, name: a.name, price: catalog.RATEP[a.id] ? (rate === 'nr' ? catalog.RATEP[a.id][1] : catalog.RATEP[a.id][0]) : a.price }))).map((it) => (
              <label key={it.id} style={{ display: 'flex', gap: 10, alignItems: 'center', background: picked[it.id] ? '#F0E8FF' : '#FFFFFF', border: '1.5px solid ' + (picked[it.id] ? '#7333FF' : '#EBE2FF'), borderRadius: 14, padding: '12px 14px', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!picked[it.id]} onChange={(e) => setPicked((p) => ({ ...p, [it.id]: e.target.checked }))} />
                <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{it.name}</span>
                <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 12.5 }}>{mur(it.price)} {t('/ HEAD')}</span>
              </label>
            ))}
            {school && students.length === 0 && <div style={{ fontSize: 13.5, color: 'rgba(52,0,87,.6)' }}>{t('The student pricelist is loading…')}</div>}
          </div>

          <div style={stepLabel}>{t('4 · PARTICIPANT LIST · OPTIONAL NOW, NEEDED FOR THE WAIVER PACK')}</div>
          <p style={{ fontSize: 13.5, color: 'rgba(52,0,87,.7)', margin: '8px 0 0' }}>{t('One per line, “Name, age”. You can paste from a spreadsheet or upload a CSV; the leader can also complete it later from the ticket.')}</p>
          <textarea value={list} onChange={(e) => setList(e.target.value)} rows={6} placeholder={'Ariane Léger, 12\nKabir Ramdhun, 11'} style={{ ...input, marginTop: 10, fontFamily: MONO, fontSize: 13 }} data-testid="group-list" />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" onChange={(e) => { void onFile(e.target.files?.[0] ?? null); }} aria-label={t('Upload a CSV')} style={{ fontSize: 13 }} />
            <span style={{ fontFamily: MONO, fontSize: 10.5, color: participants.length > headcount ? '#D91E44' : 'rgba(52,0,87,.55)' }} data-testid="group-list-count">{t('{n} NAMES', { n: participants.length })}</span>
          </div>

          <div style={stepLabel}>{t('5 · YOUR QUOTE')}</div>
          <div style={{ background: '#FFFFFF', borderRadius: 18, boxShadow: '0 0 0 1.5px #EBE2FF', marginTop: 12, padding: '16px 20px' }} data-testid="group-summary">
            {entry > 0 && <Row label={t('Park entry · {party}', { party: `${adults} + ${kids}` })} amount={mur(entry)} />}
            {lines.map((l) => <Row key={l.id} label={`${l.name} · ${l.perHead} ${t('/ HEAD')} × ${headcount}`} amount={mur(l.amount)} />)}
            {lines.length === 0 && <div style={{ fontSize: 13.5, color: 'rgba(52,0,87,.6)' }}>{school ? t('Tick the student rows your visit includes.') : t('Tick the experiences the group will do; park entry is included for everyone.')}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 8, borderTop: '1px dashed #D9C9F0', fontWeight: 800, fontSize: 18 }}>
              <span>{t('Total')}</span><span style={{ fontFamily: MONO }} data-testid="group-total">{mur(total)}{app.currency !== 'MUR' ? ' (' + money(total) + ')' : ''}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: '#D91E44', marginTop: 6 }}>
              <span>{t('Deposit to confirm ({pct}%)', { pct: depositPct })}</span><span style={{ fontFamily: MONO }} data-testid="group-deposit">{mur(deposit)}</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(52,0,87,.65)', marginTop: 8, lineHeight: 1.5 }}>{t('Pay the deposit by bank transfer or at the desk within 7 days (details in the confirmation); the balance is settled on the day. Changes to the headcount are free until the day before.')}</div>
          </div>

          {err && <div role="alert" data-testid="group-error" style={{ marginTop: 14, background: '#FFE2E7', border: '1.5px solid #FF3358', borderRadius: 12, padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 18, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => { void submit(); }} disabled={busy} data-testid="group-submit" style={{ border: 0, background: busy ? '#B98AA7' : '#FF3358', color: '#FFFFFF', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, padding: '15px 30px', borderRadius: 999, cursor: busy ? 'wait' : 'pointer' }}>
              {busy ? t('Booking…') : t('Book the group →')}
            </button>
            <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(52,0,87,.55)' }}>{t('FREE TO BOOK · DEPOSIT WITHIN 7 DAYS · ONE WAIVER PACK FOR THE LEADER')}</span>
          </div>
        </>
      )}

      {done && (
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }} data-testid="group-confirmed">
          <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '.16em', color: '#1E9E4A', fontWeight: 700 }}>{t('GROUP BOOKED · BOOKING REFERENCE')}</div>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 34, color: '#FF3358', marginTop: 8 }}>{done.refCode}</div>
          <Stripes />
          <p style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(52,0,87,.8)', marginTop: 18 }}>
            {t('{org}: {n} people on {date}. Total {total}; deposit {deposit} to confirm, by transfer or at the desk within 7 days. The leader signs the waiver pack from the ticket link, which also carries the participant list.', { org: org, n: headcount, date, total: mur(done.total), deposit: mur(done.depositAmount ?? deposit) })}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
            {done.ticketUrl && <a href={done.ticketUrl} style={{ background: '#340057', color: '#FFFFFF', borderRadius: 999, padding: '13px 22px', fontWeight: 700, textDecoration: 'none' }} data-testid="group-ticket">{t('Open the ticket')}</a>}
            {done.ticketUrl && <a href={done.ticketUrl.replace('/ticket/', '/waiver/')} style={{ background: '#FFFFFF', color: '#340057', border: '1.5px solid #340057', borderRadius: 999, padding: '13px 22px', fontWeight: 700, textDecoration: 'none' }}>{t('Sign the waiver pack')}</a>}
          </div>
        </div>
      )}
    </main>
  );
}

function Row({ label: l, amount }: { label: string; amount: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', fontSize: 14 }}>
      <span style={{ color: 'rgba(52,0,87,.75)' }}>{l}</span><span style={{ fontFamily: MONO, fontWeight: 600 }}>{amount}</span>
    </div>
  );
}
