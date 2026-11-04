import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Stripes } from '../components/Stripes';
import { cn } from '../lib/utils';
import { BtnLabel } from '@/components/ui/valle';
import { isRtl, useLang, useT } from '../i18n';
import { createBooking, fetchAvailability, newAttemptKey, type AvailabilityDay } from '../lib/api';
import { fullDateFromIso, money, mur, partyLabel, todayIso } from '../lib/format';
import { paths } from '../lib/nav';
import { breadcrumbs, useSeo } from '../lib/seo';
import { useApp } from '../store/AppStore';
import { useCatalog } from '../store/CatalogContext';
import { entryPrices } from '../store/booking';
import { productAmount, type BookingRequest, type BookingResponse, type Product } from '../types';
import { errorMessage, httpStatus } from '../lib/errors';
import { localTicketHref } from './booking/Receipt';

/**
 * /groups: schools, companies and clubs book online with per-head pricing,
 * a participant list (typed or pasted from a spreadsheet), a deposit, and
 * one waiver pack the teacher / leader signs for everyone. Replaces the
 * quote-only form for anything that is really a booking.
 *
 * Schools count their pupils by age (under 6, 6–11, 12+) and their teachers.
 * Every student row has its own quantity (pupils doing it); the student
 * entrance fee is added once per pupil aged 6 and over; teachers pay the
 * normal adult entry. The server prices exactly these lines.
 */

const input = 'border-[1.5px] border-solid border-valle-lilac bg-[#F7F3FF] rounded-[12px] px-[14px] py-3 [font-family:inherit] text-[15px] text-valle-purple outline-none w-full box-border';
const label = 'grid gap-[5px] font-mono text-[10px] tracking-[.12em] text-[rgba(52,0,87,.75)]';
/** The red star after a required field's label (the field itself carries `required`). */
const Req = () => <span aria-hidden className="text-valle-red-ink"> *</span>;
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

/** Pupils of a school party, by age band. */
export interface Pupils { under6: number; kids: number; teens: number }

/** The student price list's entrance row ("Entrance fee · visit of the park"). */
export const isEntranceRow = (p: Pick<Product, 'name'>) => /^entrance fee/i.test(p.name);
/** the Kids Park top-up card is priced per card, not per head */
export const isCardRow = (name: string) => /top-up card/i.test(name);
/** Rows made for the under-12s: the 4–11 lunch and the Kids Park rides. */
const forUnder12 = (p: Pick<Product, 'name'>) => /4 to 11|kids park/i.test(p.name);
/** The 12+ lunch. */
const forTeens = (p: Pick<Product, 'name'>) => /12 yrs and over|12 years and over/i.test(p.name);

/** How many pupils a student row starts with: lunch 4–11 and Kids Park the under-12s, the 12+ lunch the teens, anything else every pupil aged 6+. */
export function defaultRowQty(p: Pick<Product, 'name'>, pupils: Pupils): number {
  if (forUnder12(p)) return pupils.under6 + pupils.kids;
  if (forTeens(p)) return pupils.teens;
  return pupils.kids + pupils.teens;
}

/**
 * A row's pupils as the booking's adults / children: the under-12 rows fill
 * the children first, the others the 12+ pupils first (who book as adults).
 */
export function splitRowQty(p: Pick<Product, 'name'>, qty: number, pupils: Pupils): { adults: number; kids: number } {
  const young = pupils.under6 + pupils.kids;
  if (forUnder12(p)) { const kids = Math.min(qty, young); return { adults: Math.max(0, qty - kids), kids }; }
  const adults = Math.min(qty, pupils.teens);
  return { adults, kids: Math.max(0, qty - adults) };
}

export default function GroupsPage() {
  const t = useT();
  const lang = useLang();
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
  /** teachers / accompanying adults (school) or adults (other groups) */
  const [adults, setAdults] = useState(2);
  /** children 6–11 / pupils 6–11 */
  const [kids, setKids] = useState(30);
  /** pupils 12+ (schools only; they book as adults at the student rate) */
  const [teens, setTeens] = useState(0);
  /** under 6 / pre-primary pupils: free entry */
  const [under6, setUnder6] = useState(0);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  /** per student row: how many pupils do it (unset = the row's default) */
  const [qty, setQty] = useState<Record<string, number>>({});
  const [list, setList] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [tried, setTried] = useState(false);
  const [done, setDone] = useState<(BookingResponse & { total: number }) | null>(null);
  const [avail, setAvail] = useState<AvailabilityDay | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const attemptKey = useRef(newAttemptKey());

  const rate = app.rate ?? 'rr';
  const school = kind === 'school';
  const allStudents = useMemo(() => (catalog.PRODUCTS ?? []).filter((p) => p.family === 'student'), [catalog]);
  const entranceRow = allStudents.find(isEntranceRow);
  const students = allStudents.filter((p) => !isEntranceRow(p));
  const activities = useMemo(() => catalog.ACTS.filter((a) => a.mode === 'pp' && (a.cat === 'adventure' || a.cat === 'nature')), [catalog]);
  const pupils: Pupils = { under6: school ? under6 : 0, kids: school ? kids : 0, teens: school ? teens : 0 };
  const pupilCount = pupils.under6 + pupils.kids + pupils.teens;
  // the party the server sees: 12+ pupils book as adults, under-6s as infants (free)
  const partyAdults = adults + (school ? teens : 0);
  const headcount = partyAdults + kids + under6;
  const participants = useMemo(() => parseParticipants(list), [list]);

  useEffect(() => {
    if (!date) { setAvail(null); return; }
    let dead = false;
    fetchAvailability(date, 1).then((d) => { if (!dead) setAvail(d[0] ?? null); }).catch(() => { /* picker works without it */ });
    return () => { dead = true; };
  }, [date]);

  const ep = entryPrices(catalog, rate);
  const rowQty = (p: Product) => Math.max(0, Math.min(pupilCount, qty['product:' + p.key] ?? defaultRowQty(p, pupils)));

  // what the party pays: every line the server will price, with its own quantity
  type QuoteLine = { id: string; name: string; perHead: string; qty: number; amount: number; adults: number; kids: number };
  const lines: QuoteLine[] = [];
  if (school) {
    const entranceQty = pupils.kids + pupils.teens;
    if (entranceRow && entranceQty > 0) {
      lines.push({ id: 'product:' + entranceRow.key, name: entranceRow.name, perHead: mur(rate === 'nr' ? entranceRow.nr : entranceRow.rr), qty: entranceQty, amount: productAmount(entranceRow, rate, pupils.teens, pupils.kids, 0), adults: pupils.teens, kids: pupils.kids });
    }
    for (const p of students) {
      const id = 'product:' + p.key;
      if (!picked[id]) continue;
      const q = rowQty(p);
      if (q <= 0) continue;
      const split = splitRowQty(p, q, pupils);
      lines.push({ id, name: p.name, perHead: mur(rate === 'nr' ? p.nr : p.rr), qty: q, amount: productAmount(p, rate, split.adults, split.kids, 0), ...split });
    }
  } else {
    for (const a of activities) {
      if (!picked[a.id]) continue;
      const rp = catalog.RATEP[a.id];
      const price = rp ? (rate === 'nr' ? rp[1] : rp[0]) : a.price;
      lines.push({ id: a.id, name: a.name, perHead: mur(price), qty: adults + kids, amount: price * adults + Math.round(price * 0.5) * kids, adults, kids });
    }
  }
  // Park entry: teachers and accompanying adults (school), everyone 6+ (other groups); under-6s are free.
  // (without the student entrance row in the catalog, pupils pay the ordinary entry, as the server charges it)
  const entry = school && entranceRow ? ep.adult * adults : ep.adult * partyAdults + ep.child * kids;
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
    setTried(true);
    if (!org.trim() || !leader.trim()) { setErr(t('Add the organisation and the leader’s name.')); return; }
    if (!email.trim() && !phone.trim()) { setErr(t('Add an e-mail or a phone number for the confirmation.')); return; }
    if (!date) { setErr(t('Pick the date of the visit.')); return; }
    if (school && adults < 1) { setErr(t('Add at least one teacher or accompanying adult.')); return; }
    if (headcount < 10) { setErr(t('A group booking is for 10 people or more. For fewer, book a day the usual way.')); return; }
    if (participants.length > headcount) { setErr(t('The list has more names than the headcount ({n}). Adjust one or the other.', { n: headcount })); return; }
    setBusy(true);
    const req: BookingRequest = {
      visitDate: date, slot, adults: Math.max(1, partyAdults), kids, infants: under6, rate, lang,
      items: lines.map((l) => ({ id: l.id, adults: l.adults, kids: l.kids })),
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
      const status = httpStatus(e);
      setErr(status ? errorMessage(e, t('We could not confirm your booking. Please try again.')) : t('We could not reach the booking desk. Check your connection and try again.'));
    } finally { setBusy(false); }
  };

  const slotLevel = avail ? (slot === 'morning' ? avail.morning.level : avail.afternoon.level) : undefined;
  const num = (v: string) => Math.max(0, Math.min(400, Math.floor(Number(v) || 0)));
  const ticketHref = done?.ticketUrl ? localTicketHref(done.ticketUrl) : '';

  return (
    <main className="max-w-[1180px] mx-auto pt-[104px] px-[clamp(16px,3.5vw,40px)] pb-[60px]">
      {!done && (
        <>
          <div className="font-mono text-[12px] font-semibold tracking-[.16em] text-valle-violet">{t('SCHOOLS · COMPANIES · CLUBS')}</div>
          {/* the -4° tilt lifts the right end of a wide heading by ~7% of its width: room so it never touches the label (inline, as .v-h1 resets margin outside the Tailwind layers) */}
          <h1 className="v-h1" style={{ marginTop: 'clamp(44px, 7vw, 96px)' }}>
            {t('Bring the')}<br /><span className="text-valle-violet">{t('whole group.')}</span>
          </h1>
          <p className="text-[16px] leading-[1.6] text-[rgba(52,0,87,.75)] max-w-[60ch] mt-[22px] mb-0 mx-0">
            {t('Ten people or more book here: per-head prices, your participant list, a {pct}% deposit, and one safety waiver pack the leader signs for everyone. Team-building programmes with facilitators still start with a quote.', { pct: depositPct })}
            {' '}<Link to={paths.team()} className="font-semibold whitespace-nowrap" style={{ color: '#5B21B6' }}>{t('Team building →')}</Link>
          </p>

          <div className={stepLabel}>{t('1 · WHO IS COMING')}</div>
          <p className="mt-2 mb-0 text-[13px] text-[rgba(52,0,87,.75)]">{t('Fields marked * are required.')}</p>
          <div className="grid [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] gap-3 mt-3">
            <label className={label}>{t('TYPE OF GROUP')}
              <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={input} data-testid="group-kind">
                <option value="school">{t('School')}</option>
                <option value="company">{t('Company')}</option>
                <option value="club">{t('Club or association')}</option>
                <option value="other">{t('Other')}</option>
              </select>
            </label>
            <label className={label}><span>{t('ORGANISATION')}<Req /></span><input required aria-invalid={tried && !org.trim() ? true : undefined} value={org} onChange={(e) => setOrg(e.target.value)} placeholder={t('School, company or club name')} autoComplete="organization" className={input} data-testid="group-org" /></label>
            <label className={label}><span>{t('LEADER / TEACHER IN CHARGE')}<Req /></span><input required aria-invalid={tried && !leader.trim() ? true : undefined} value={leader} onChange={(e) => setLeader(e.target.value)} placeholder={t('Full name')} autoComplete="name" className={input} data-testid="group-leader" /></label>
            <label className={label}>{t('E-MAIL')}<input aria-invalid={tried && !email.trim() && !phone.trim() ? true : undefined} value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" dir="ltr" className={input} data-testid="group-email" /></label>
            <label className={label}>{t('PHONE (SMS / WHATSAPP)')}<input aria-invalid={tried && !email.trim() && !phone.trim() ? true : undefined} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" className={input} /></label>
          </div>

          <div className={stepLabel}>{t('2 · WHEN AND HOW MANY')}</div>
          <div className="grid [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))] gap-3 mt-3">
            <label className={label}><span>{t('DATE')}<Req /></span><input required aria-invalid={tried && !date ? true : undefined} type="date" value={date} min={todayIso()} onChange={(e) => setDate(e.target.value)} className={input} data-testid="group-date" /></label>
            <label className={label}>{t('ARRIVAL')}
              <select value={slot} onChange={(e) => setSlot(e.target.value as 'morning' | 'afternoon')} className={input}>
                <option value="morning">{t('Morning · 09:00–12:00')}</option>
                <option value="afternoon">{t('Afternoon · 12:00–15:30')}</option>
              </select>
            </label>
          </div>
          <div className="grid [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))] gap-3 mt-3">
            {school && <label className={label}>{t('PUPILS UNDER 6 (PRE-PRIMARY)')}<input type="number" min={0} max={400} value={under6} onChange={(e) => setUnder6(num(e.target.value))} className={input} data-testid="group-under6" /></label>}
            <label className={label}>{school ? t('PUPILS 6–11') : t('CHILDREN 6–11')}<input type="number" min={0} max={400} value={kids} onChange={(e) => setKids(num(e.target.value))} className={input} data-testid="group-kids" /></label>
            {school && <label className={label}>{t('PUPILS 12 AND OVER')}<input type="number" min={0} max={400} value={teens} onChange={(e) => setTeens(num(e.target.value))} className={input} data-testid="group-teens" /></label>}
            <label className={label}>{school ? t('TEACHERS AND ACCOMPANYING ADULTS') : t('ADULTS')}<input type="number" min={school ? 1 : 0} max={400} value={adults} onChange={(e) => setAdults(num(e.target.value))} className={input} data-testid="group-adults" /></label>
            {!school && <label className={label}>{t('UNDER 6 (FREE)')}<input type="number" min={0} max={400} value={under6} onChange={(e) => setUnder6(num(e.target.value))} className={input} data-testid="group-under6" /></label>}
          </div>
          {slotLevel && (slotLevel === 'full' || slotLevel === 'closed') && (
            <div role="alert" className="mt-[10px] bg-[#FFE2E7] border-[1.5px] border-solid border-valle-red rounded-[12px] py-[10px] px-[14px] text-[13.5px] font-semibold">
              {slotLevel === 'closed' ? t('The park is closed for that arrival slot. Pick another day.') : t('That arrival slot is fully booked on this date. Pick the other slot or another day.')}
            </div>
          )}
          <div className="font-mono text-[10.5px] text-[rgba(52,0,87,.7)] mt-2">{t('HEADCOUNT {n} · GROUPS ARE 10 OR MORE', { n: headcount })}</div>

          <div className={stepLabel}>{school ? t('3 · STUDENT PRICELIST · PER PUPIL') : t('3 · EXPERIENCES · PER PERSON')}</div>
          {school && (
            <p className="text-[13.5px] leading-[1.55] text-[rgba(52,0,87,.75)] mt-2 mb-0 mx-0 max-w-[70ch]" data-testid="group-entry-note">
              {t('The student entrance fee ({price} per pupil) is added once for every pupil aged 6 and over; pre-primary pupils enter free. Teachers and accompanying adults pay the normal adult entry ({adult}). Tick what the pupils do and set how many do each.', { price: mur(entranceRow ? (rate === 'nr' ? entranceRow.nr : entranceRow.rr) : 0), adult: mur(ep.adult) })}
            </p>
          )}
          <div className="grid [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))] gap-[10px] mt-3" data-testid="group-items">
            {(school ? students.map((p) => ({ id: 'product:' + p.key, name: p.name, price: rate === 'nr' ? p.nr : p.rr, p })) : activities.map((a) => ({ id: a.id, name: a.name, price: catalog.RATEP[a.id] ? (rate === 'nr' ? catalog.RATEP[a.id][1] : catalog.RATEP[a.id][0]) : a.price, p: undefined as Product | undefined }))).map((it) => (
              <div key={it.id} className={cn('flex flex-wrap gap-x-[10px] gap-y-2 items-center border-[1.5px] border-solid rounded-[14px] py-3 px-[14px]', picked[it.id] ? 'bg-[#F0E8FF] border-valle-violet' : 'bg-white border-valle-lilac')}>
                <label className="flex flex-1 basis-[180px] items-center gap-[10px] cursor-pointer">
                  <input type="checkbox" checked={!!picked[it.id]} onChange={(e) => setPicked((p) => ({ ...p, [it.id]: e.target.checked }))} />
                  <span className="flex-1 font-semibold text-[14px]">{it.name}</span>
                  <span className="font-mono font-bold text-[12.5px] whitespace-nowrap">{mur(it.price)} {isCardRow(it.name) ? t('per card') : t('/ HEAD')}</span>
                </label>
                {school && it.p && picked[it.id] && (
                  <label className="flex items-center gap-2 font-mono text-[10px] tracking-[.1em] text-[rgba(52,0,87,.65)]">
                    {t('PUPILS')}
                    <input type="number" min={0} max={pupilCount} value={rowQty(it.p)} onChange={(e) => setQty((q) => ({ ...q, [it.id]: num(e.target.value) }))} className={cn(input, 'w-[88px] py-2')} data-testid={`group-qty-${it.id}`} aria-label={t('Pupils doing {name}', { name: it.name })} />
                  </label>
                )}
              </div>
            ))}
            {school && students.length === 0 && <div className="text-[13.5px] text-[rgba(52,0,87,.6)]">{t('The student pricelist is loading…')}</div>}
          </div>

          <div className={stepLabel}>{t('4 · PARTICIPANT LIST · OPTIONAL NOW, NEEDED FOR THE WAIVER PACK')}</div>
          <p className="text-[13.5px] text-[rgba(52,0,87,.7)] mt-2 mb-0 mx-0">{t('One per line, “Name, age”. You can paste from a spreadsheet or upload a CSV; the leader can also complete it later from the ticket.')}</p>
          <textarea value={list} onChange={(e) => setList(e.target.value)} rows={6} placeholder={'Ariane Léger, 12\nKabir Ramdhun, 11'} className={cn(input, 'mt-[10px] font-mono text-[13px]')} data-testid="group-list" />
          <div className="flex gap-[10px] items-center mt-2 flex-wrap">
            <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" onChange={(e) => { void onFile(e.target.files?.[0] ?? null); }} aria-label={t('Upload a CSV')} className="text-[13px]" />
            <span className={cn('font-mono text-[10.5px]', participants.length > headcount ? 'text-[#D6173F]' : 'text-[rgba(52,0,87,.7)]')} data-testid="group-list-count">{t('{n} NAMES', { n: participants.length })}</span>
          </div>

          <div className={stepLabel}>{t('5 · YOUR QUOTE')}</div>
          <div className="bg-white rounded-[18px] shadow-[0_0_0_1.5px_#EBE2FF] mt-3 py-4 px-5" data-testid="group-summary">
            {entry > 0 && <Row label={t('Park entry · {party}', { party: school && entranceRow ? partyLabel(adults, 0) : partyLabel(partyAdults, kids) })} amount={mur(entry)} />}
            {under6 > 0 && <Row label={t('Park entry · {party}', { party: partyLabel(0, 0, under6) }) + ' · ' + t('free')} amount={mur(0)} />}
            {lines.map((l) => <Row key={l.id} label={`${l.name} · ${l.perHead} ${isCardRow(l.name) ? t('per card') : t('/ HEAD')} × ${l.qty}`} amount={mur(l.amount)} />)}
            {lines.length === 0 && <div className="text-[13.5px] text-[rgba(52,0,87,.6)]">{school ? t('Tick the student rows your visit includes.') : t('Tick the experiences the group will do; park entry is included for everyone.')}</div>}
            <div className="flex justify-between pt-[10px] mt-2 font-extrabold text-[18px]" style={{ borderTop: '1px dashed #D9C9F0' }}>
              <span>{t('Total')}</span><span className="font-mono" data-testid="group-total">{mur(total)}{app.currency !== 'MUR' ? ' (' + money(total) + ')' : ''}</span>
            </div>
            <div className="flex justify-between text-[14px] font-bold text-valle-purple mt-[6px]">
              <span>{t('Deposit to confirm ({pct}%)', { pct: depositPct })}</span><span className="font-mono" data-testid="group-deposit">{mur(deposit)}</span>
            </div>
            <div className="text-[12.5px] text-[rgba(52,0,87,.65)] mt-2 leading-[1.5]">{t('Pay the deposit by bank transfer or at the desk within 7 days (details in the confirmation); the balance is settled on the day. Changes to the headcount are free until the day before.')}</div>
          </div>

          {err && <div role="alert" data-testid="group-error" className="mt-[14px] bg-[#FFE2E7] border-[1.5px] border-solid border-valle-red rounded-[12px] py-3 px-4 text-[14px] font-semibold">{err}</div>}
          <div className="flex gap-3 items-center mt-[18px] flex-wrap">
            <button type="button" onClick={() => { void submit(); }} disabled={busy} data-testid="group-submit" className={cn('vbtn vbtn-primary', busy && 'cursor-wait')}>
              <BtnLabel>{busy ? t('Booking…') : t('Book the group →')}</BtnLabel>
            </button>
            <span className="font-mono text-[10.5px] text-[rgba(52,0,87,.7)]">{t('FREE TO BOOK · DEPOSIT WITHIN 7 DAYS · ONE WAIVER PACK FOR THE LEADER')}</span>
          </div>
        </>
      )}

      {done && (
        <div className="max-w-[640px] mx-auto text-center" data-testid="group-confirmed">
          <div className="font-mono text-[12px] tracking-[.16em] text-[#1E9E4A] font-bold">{t('GROUP BOOKED · BOOKING REFERENCE')}</div>
          <div className="font-mono font-bold text-[34px] text-valle-purple mt-2 whitespace-nowrap" dir="ltr">{done.refCode}</div>
          <Stripes />
          <p className="text-[16px] leading-[1.6] text-[rgba(52,0,87,.8)] mt-[18px]">
            {t('{org}: {n} people on {date}. Total {total}; deposit {deposit} to confirm, by transfer or at the desk within 7 days. The leader signs the waiver pack from the ticket link, which also carries the participant list.', { org: org, n: headcount, date: fullDateFromIso(date) || date, total: mur(done.total), deposit: mur(done.depositAmount ?? deposit) })}
          </p>
          <p data-testid="group-payment-details" className="whitespace-pre-line text-[14.5px] leading-[1.6] text-valle-purple mt-2">
            {done.bankDetails?.trim() ? done.bankDetails : t('Our team sends you the payment details within one working day.')}
          </p>
          <div className="flex gap-[10px] justify-center flex-wrap mt-5">
            {ticketHref && <a href={ticketHref} className="vbtn vbtn-primary" data-testid="group-ticket">{t('Open the ticket')}</a>}
            {ticketHref && done.ticketUrl && <a href={localTicketHref(done.ticketUrl, 'waiver')} className="vbtn vbtn-secondary">{t('Sign the waiver pack')}</a>}
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
