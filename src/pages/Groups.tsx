import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Stripes } from '../components/Stripes';
import { cn } from '../lib/utils';
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

const input = 'border-[1.5px] border-solid border-valle-lilac bg-[#F7F3FF] rounded-[12px] px-[14px] py-3 [font-family:inherit] text-[15px] text-valle-purple outline-none w-full box-border';
const label = 'grid gap-[5px] font-mono text-[10px] tracking-[.12em] text-[rgba(52,0,87,.6)]';
const stepLabel = 'font-mono text-[12px] font-semibold tracking-[.16em] text-valle-violet mt-[34px]';

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
    <main className="max-w-[1180px] mx-auto pt-[104px] px-[clamp(16px,3.5vw,40px)] pb-[60px]">
      {!done && (
        <>
          <div className="font-mono text-[12px] font-semibold tracking-[.16em] text-valle-violet">{t('SCHOOLS · COMPANIES · CLUBS')}</div>
          <h1 className="font-display italic font-black text-[clamp(38px,5.8vw,74px)] leading-[0.86] mt-[10px] mb-0 mx-0 uppercase -rotate-3" style={{ transformOrigin: isRtl() ? 'right bottom' : 'left bottom' }}>
            {t('Bring the')}<br /><span className="text-valle-violet">{t('whole group.')}</span>
          </h1>
          <p className="text-[16px] leading-[1.6] text-[rgba(52,0,87,.75)] max-w-[60ch] mt-[22px] mb-0 mx-0">
            {t('Ten people or more book here: per-head prices, your participant list, a {pct}% deposit, and one safety waiver pack the leader signs for everyone. Team-building programmes with facilitators still start with a quote.', { pct: depositPct })}
            {' '}<Link to={paths.team()} className="font-semibold" style={{ color: '#7333FF' }}>{t('Team building →')}</Link>
          </p>

          <div className={stepLabel}>{t('1 · WHO IS COMING')}</div>
          <div className="grid [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] gap-3 mt-3">
            <label className={label}>{t('TYPE OF GROUP')}
              <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={input} data-testid="group-kind">
                <option value="school">{t('School')}</option>
                <option value="company">{t('Company')}</option>
                <option value="club">{t('Club or association')}</option>
                <option value="other">{t('Other')}</option>
              </select>
            </label>
            <label className={label}>{t('ORGANISATION')}<input value={org} onChange={(e) => setOrg(e.target.value)} placeholder={t('School, company or club name')} className={input} data-testid="group-org" /></label>
            <label className={label}>{t('LEADER / TEACHER IN CHARGE')}<input value={leader} onChange={(e) => setLeader(e.target.value)} placeholder={t('Full name')} className={input} data-testid="group-leader" /></label>
            <label className={label}>{t('E-MAIL')}<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" className={input} data-testid="group-email" /></label>
            <label className={label}>{t('PHONE (SMS / WHATSAPP)')}<input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" className={input} /></label>
          </div>

          <div className={stepLabel}>{t('2 · WHEN AND HOW MANY')}</div>
          <div className="grid [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))] gap-3 mt-3">
            <label className={label}>{t('DATE')}<input type="date" value={date} min={todayIso()} onChange={(e) => setDate(e.target.value)} className={input} data-testid="group-date" /></label>
            <label className={label}>{t('ARRIVAL')}
              <select value={slot} onChange={(e) => setSlot(e.target.value as 'morning' | 'afternoon')} className={input}>
                <option value="morning">{t('Morning · 09:00–12:00')}</option>
                <option value="afternoon">{t('Afternoon · 12:00–15:30')}</option>
              </select>
            </label>
            <label className={label}>{school ? t('ADULTS (TEACHERS, PARENTS)') : t('ADULTS')}<input type="number" min={0} max={400} value={adults} onChange={(e) => setAdults(Math.max(0, Math.min(400, Math.floor(Number(e.target.value) || 0))))} className={input} data-testid="group-adults" /></label>
            <label className={label}>{school ? t('STUDENTS / CHILDREN 6–11') : t('CHILDREN 6–11')}<input type="number" min={0} max={400} value={kids} onChange={(e) => setKids(Math.max(0, Math.min(400, Math.floor(Number(e.target.value) || 0))))} className={input} data-testid="group-kids" /></label>
          </div>
          {slotLevel && (slotLevel === 'full' || slotLevel === 'closed') && (
            <div role="alert" className="mt-[10px] bg-[#FFE2E7] border-[1.5px] border-solid border-valle-red rounded-[12px] py-[10px] px-[14px] text-[13.5px] font-semibold">
              {slotLevel === 'closed' ? t('The park is closed for that arrival slot. Pick another day.') : t('That arrival slot is fully booked on this date. Pick the other slot or another day.')}
            </div>
          )}
          <div className="font-mono text-[10.5px] text-[rgba(52,0,87,.55)] mt-2">{t('HEADCOUNT {n} · GROUPS ARE 10 OR MORE · SECONDARY STUDENTS OVER 11 COUNT AS ADULTS AT THE STUDENT RATE', { n: headcount })}</div>

          <div className={stepLabel}>{school ? t('3 · STUDENT PRICELIST · PER STUDENT, ENTRANCE INCLUDED') : t('3 · EXPERIENCES · PER PERSON')}</div>
          <div className="grid [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))] gap-[10px] mt-3" data-testid="group-items">
            {(school ? students.map((p) => ({ id: 'product:' + p.key, name: p.name, price: rate === 'nr' ? p.nr : p.rr })) : activities.map((a) => ({ id: a.id, name: a.name, price: catalog.RATEP[a.id] ? (rate === 'nr' ? catalog.RATEP[a.id][1] : catalog.RATEP[a.id][0]) : a.price }))).map((it) => (
              <label key={it.id} className={cn('flex gap-[10px] items-center border-[1.5px] border-solid rounded-[14px] py-3 px-[14px] cursor-pointer', picked[it.id] ? 'bg-[#F0E8FF] border-valle-violet' : 'bg-white border-valle-lilac')}>
                <input type="checkbox" checked={!!picked[it.id]} onChange={(e) => setPicked((p) => ({ ...p, [it.id]: e.target.checked }))} />
                <span className="flex-1 font-semibold text-[14px]">{it.name}</span>
                <span className="font-mono font-bold text-[12.5px]">{mur(it.price)} {t('/ HEAD')}</span>
              </label>
            ))}
            {school && students.length === 0 && <div className="text-[13.5px] text-[rgba(52,0,87,.6)]">{t('The student pricelist is loading…')}</div>}
          </div>

          <div className={stepLabel}>{t('4 · PARTICIPANT LIST · OPTIONAL NOW, NEEDED FOR THE WAIVER PACK')}</div>
          <p className="text-[13.5px] text-[rgba(52,0,87,.7)] mt-2 mb-0 mx-0">{t('One per line, “Name, age”. You can paste from a spreadsheet or upload a CSV; the leader can also complete it later from the ticket.')}</p>
          <textarea value={list} onChange={(e) => setList(e.target.value)} rows={6} placeholder={'Ariane Léger, 12\nKabir Ramdhun, 11'} className={cn(input, 'mt-[10px] font-mono text-[13px]')} data-testid="group-list" />
          <div className="flex gap-[10px] items-center mt-2 flex-wrap">
            <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" onChange={(e) => { void onFile(e.target.files?.[0] ?? null); }} aria-label={t('Upload a CSV')} className="text-[13px]" />
            <span className={cn('font-mono text-[10.5px]', participants.length > headcount ? 'text-[#D91E44]' : 'text-[rgba(52,0,87,.55)]')} data-testid="group-list-count">{t('{n} NAMES', { n: participants.length })}</span>
          </div>

          <div className={stepLabel}>{t('5 · YOUR QUOTE')}</div>
          <div className="bg-white rounded-[18px] shadow-[0_0_0_1.5px_#EBE2FF] mt-3 py-4 px-5" data-testid="group-summary">
            {entry > 0 && <Row label={t('Park entry · {party}', { party: `${adults} + ${kids}` })} amount={mur(entry)} />}
            {lines.map((l) => <Row key={l.id} label={`${l.name} · ${l.perHead} ${t('/ HEAD')} × ${headcount}`} amount={mur(l.amount)} />)}
            {lines.length === 0 && <div className="text-[13.5px] text-[rgba(52,0,87,.6)]">{school ? t('Tick the student rows your visit includes.') : t('Tick the experiences the group will do; park entry is included for everyone.')}</div>}
            <div className="flex justify-between pt-[10px] mt-2 font-extrabold text-[18px]" style={{ borderTop: '1px dashed #D9C9F0' }}>
              <span>{t('Total')}</span><span className="font-mono" data-testid="group-total">{mur(total)}{app.currency !== 'MUR' ? ' (' + money(total) + ')' : ''}</span>
            </div>
            <div className="flex justify-between text-[14px] font-bold text-[#D91E44] mt-[6px]">
              <span>{t('Deposit to confirm ({pct}%)', { pct: depositPct })}</span><span className="font-mono" data-testid="group-deposit">{mur(deposit)}</span>
            </div>
            <div className="text-[12.5px] text-[rgba(52,0,87,.65)] mt-2 leading-[1.5]">{t('Pay the deposit by bank transfer or at the desk within 7 days (details in the confirmation); the balance is settled on the day. Changes to the headcount are free until the day before.')}</div>
          </div>

          {err && <div role="alert" data-testid="group-error" className="mt-[14px] bg-[#FFE2E7] border-[1.5px] border-solid border-valle-red rounded-[12px] py-3 px-4 text-[14px] font-semibold">{err}</div>}
          <div className="flex gap-3 items-center mt-[18px] flex-wrap">
            <button type="button" onClick={() => { void submit(); }} disabled={busy} data-testid="group-submit" className={cn('border-0 text-white [font-family:inherit] text-[15px] font-bold py-[15px] px-[30px] rounded-[999px]', busy ? 'bg-[#B98AA7] cursor-wait' : 'bg-valle-red cursor-pointer')}>
              {busy ? t('Booking…') : t('Book the group →')}
            </button>
            <span className="font-mono text-[10.5px] text-[rgba(52,0,87,.55)]">{t('FREE TO BOOK · DEPOSIT WITHIN 7 DAYS · ONE WAIVER PACK FOR THE LEADER')}</span>
          </div>
        </>
      )}

      {done && (
        <div className="max-w-[640px] mx-auto text-center" data-testid="group-confirmed">
          <div className="font-mono text-[12px] tracking-[.16em] text-[#1E9E4A] font-bold">{t('GROUP BOOKED · BOOKING REFERENCE')}</div>
          <div className="font-mono font-bold text-[34px] text-valle-red mt-2">{done.refCode}</div>
          <Stripes />
          <p className="text-[16px] leading-[1.6] text-[rgba(52,0,87,.8)] mt-[18px]">
            {t('{org}: {n} people on {date}. Total {total}; deposit {deposit} to confirm, by transfer or at the desk within 7 days. The leader signs the waiver pack from the ticket link, which also carries the participant list.', { org: org, n: headcount, date, total: mur(done.total), deposit: mur(done.depositAmount ?? deposit) })}
          </p>
          <div className="flex gap-[10px] justify-center flex-wrap mt-5">
            {done.ticketUrl && <a href={done.ticketUrl} className="bg-valle-purple rounded-[999px] py-[13px] px-[22px] font-bold" style={{ color: '#FFFFFF', textDecoration: 'none' }} data-testid="group-ticket">{t('Open the ticket')}</a>}
            {done.ticketUrl && <a href={done.ticketUrl.replace('/ticket/', '/waiver/')} className="bg-white border-[1.5px] border-solid border-valle-purple rounded-[999px] py-[13px] px-[22px] font-bold" style={{ color: '#340057', textDecoration: 'none' }}>{t('Sign the waiver pack')}</a>}
          </div>
        </div>
      )}
    </main>
  );
}

function Row({ label: l, amount }: { label: string; amount: string }) {
  return (
    <div className="flex justify-between gap-3 py-[5px] px-0 text-[14px]">
      <span className="text-[rgba(52,0,87,.75)]">{l}</span><span className="font-mono font-semibold">{amount}</span>
    </div>
  );
}
