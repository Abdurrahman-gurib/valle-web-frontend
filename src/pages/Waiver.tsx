import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useSeo } from '../lib/seo';
import { paths } from '../lib/nav';
import { fullDateFromIso } from '../lib/format';
import { fetchWaivers, signWaiver, type WaiverActivity, type WaiverView } from '../lib/api';
import { Stripes } from '../components/Stripes';
import { SignaturePad, type SignaturePadHandle } from '../components/SignaturePad';
import { localizePath, tr, useLang, useT, _t } from '../i18n';

const MONO = "'Chivo Mono',monospace";
const BARLOW = "'Barlow',sans-serif";

/**
 * The waiver the guest reads and signs. Keys are the English text; the
 * backend records the terms version and the language it was read in.
 */
const WAIVER_TERMS = [
  _t('I am taking part voluntarily in activities at VALLÉ Advenature™ Park, which may include ziplines, the bicycle zipline, the Nepalese bridge, quad bikes, buggies, the luge kart and walks on uneven ground to the waterfalls.'),
  _t('I understand that these activities carry inherent risks, including falls, collisions, equipment failure, sudden changes in weather, insects and uneven ground, and that they can lead to injury.'),
  _t('I will follow every instruction from the guides, wear the safety equipment provided, respect the age, height and weight limits of each activity, and stop when a guide asks me to.'),
  _t('I confirm that I have no medical condition that makes these activities unsafe for me, such as a heart, back or neck condition, epilepsy, recent surgery or pregnancy, or that I have declared it on this form and will tell the guide.'),
  _t('I will not take part under the influence of alcohol or drugs.'),
  _t('To the extent permitted by the law of Mauritius, I release VALLÉ Advenature™ Park, its staff and partners from claims for injury, loss or damage arising from these risks, except where caused by their negligence or wilful misconduct.'),
  _t('I agree that the park may give or arrange first aid and medical treatment if needed.'),
  _t('A parent or guardian who signs for a participant under 18 accepts these terms on their behalf and confirms that they will supervise them during the visit.'),
  _t('The park keeps this waiver and the details on it with the booking, uses them for safety at the gate and on the activities, and never uses them for marketing.'),
];

const DECLARATIONS = [
  ['risks', _t('I have read the waiver above and accept the risks.')],
  ['health', _t('The participant is fit and healthy enough to take part, or has declared any condition below.')],
  ['sober', _t('The participant will not take part under the influence of alcohol or drugs.')],
  ['rules', _t("The participant will follow the guides' instructions and the safety rules.")],
  ['data', _t('I agree that the park may keep this waiver and these details for safety purposes.')],
] as const;
type DeclKey = (typeof DECLARATIONS)[number][0];

const ageOn = (birth: string, on: string): number | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return null;
  const [by, bm, bd] = birth.split('-').map(Number);
  const [y, m, d] = on.split('-').map(Number);
  let a = y - by;
  if (m < bm || (m === bm && d < bd)) a--;
  return a;
};

/** Plain-language warnings for the participant being entered (the gate checks the same limits). */
function limitWarnings(acts: WaiverActivity[], age: number | null, heightCm: number, weightKg: number): string[] {
  const out: string[] = [];
  for (const a of acts) {
    const name = tr(a.name);
    if (age !== null && a.minAge !== undefined && age < a.minAge) out.push(tr('{activity}: minimum age {n}.', { activity: name, n: a.minAge }));
    if (age !== null && a.driveMinAge !== undefined && age < a.driveMinAge) out.push(tr('{activity}: drivers must be {n} or older; younger guests ride as passengers.', { activity: name, n: a.driveMinAge }));
    if (weightKg && a.maxWeightKg !== undefined && weightKg > a.maxWeightKg) out.push(tr('{activity}: maximum weight {n} kg.', { activity: name, n: a.maxWeightKg }));
    if (weightKg && a.minWeightKg !== undefined && weightKg < a.minWeightKg) out.push(tr('{activity}: minimum weight {n} kg.', { activity: name, n: a.minWeightKg }));
    if (heightCm && a.minHeightCm !== undefined && heightCm < a.minHeightCm) out.push(tr('{activity}: minimum height {n} cm.', { activity: name, n: a.minHeightCm }));
    if (heightCm && a.maxHeightCm !== undefined && heightCm > a.maxHeightCm) out.push(tr('{activity}: maximum height {n} cm.', { activity: name, n: a.maxHeightCm }));
  }
  return out;
}

const blankDecl = (): Record<DeclKey, boolean> => ({ risks: false, health: false, sober: false, rules: false, data: false });

export default function WaiverPage() {
  const t = useT();
  const lang = useLang();
  const { ref = '' } = useParams();
  const [params] = useSearchParams();
  const token = params.get('t') || '';
  useSeo({ title: t('Safety waiver {ref} · VALLÉ Advenature™ Park', { ref: ref.toUpperCase() }), description: t('Sign your VALLÉ safety waiver before you arrive.'), noindex: true });

  const [view, setView] = useState<WaiverView | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [name, setName] = useState('');
  const [birth, setBirth] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [guardian, setGuardian] = useState('');
  const [emName, setEmName] = useState('');
  const [emPhone, setEmPhone] = useState('');
  const [medical, setMedical] = useState('');
  const [decl, setDecl] = useState(blankDecl);
  const [photo, setPhoto] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');
  const [correcting, setCorrecting] = useState(false);
  const pad = useRef<SignaturePadHandle>(null);
  const formTop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let dead = false;
    fetchWaivers(ref, token)
      .then((v) => { if (!dead) setView(v); })
      .catch((e: Error & { status?: number }) => {
        if (dead) return;
        setLoadErr(e.status === 403 ? tr('This waiver link is not valid. Open the link from your confirmation e-mail or WhatsApp.') : e.status === 404 ? tr('We could not find this booking.') : tr('Could not load the waiver right now. Please try again.'));
      });
    return () => { dead = true; };
  }, [ref, token]);

  const age = view ? ageOn(birth, view.visitDate) : null;
  const minor = age !== null && age < 18;
  const warnings = view ? limitWarnings(view.activities, age, Number(height) || 0, Number(weight) || 0) : [];
  const allSigned = !!view && view.signed.length >= view.required;
  const showForm = !!view && view.open && (!allSigned || correcting);

  const submit = async () => {
    if (!view) return;
    setErr('');
    const h = Number(height), w = Number(weight);
    const problems: string[] = [];
    if (!name.trim()) problems.push(t('the participant’s full name'));
    if (age === null || age < 0 || age > 110) problems.push(t('a valid date of birth'));
    if (!(h >= 50 && h <= 230)) problems.push(t('height in cm'));
    if (!(w >= 10 && w <= 250)) problems.push(t('weight in kg'));
    if (minor && !guardian.trim()) problems.push(t('the parent or guardian’s name'));
    if (!emName.trim() || !/^[+0-9 ()-]{6,24}$/.test(emPhone.trim())) problems.push(t('an emergency contact and phone number'));
    if (!DECLARATIONS.every(([k]) => decl[k])) problems.push(t('all five statements ticked'));
    const signature = pad.current?.toPng() || '';
    if (!signature) problems.push(t('a signature'));
    if (problems.length) { setErr(t('Please add: {list}.', { list: problems.join(', ') })); return; }
    if (signature.length > 90000) { setErr(t('The signature is too detailed. Clear it and sign once more.')); return; }
    setBusy(true);
    try {
      const next = await signWaiver(ref, token, {
        participantName: name.trim(), birthDate: birth, heightCm: Math.round(h), weightKg: Math.round(w),
        guardianName: minor ? guardian.trim() : undefined, emergencyName: emName.trim(), emergencyPhone: emPhone.trim(),
        medicalNotes: medical.trim() || undefined, declarations: decl, photoConsent: photo, signature, lang,
      });
      setView(next);
      setDone(t('Thank you. The waiver for {name} is signed.', { name: name.trim() }));
      // next participant: keep the emergency contact and the guardian, clear the rest
      setName(''); setBirth(''); setHeight(''); setWeight(''); setMedical(''); setDecl(blankDecl()); setPhoto(false); setCorrecting(false);
      pad.current?.clear();
      formTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      setErr((e as Error).message || t('Could not save the waiver. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const ticketHref = localizePath(`/ticket/${encodeURIComponent(ref)}?t=${encodeURIComponent(token)}`, lang);

  return (
    <main style={{ maxWidth: 620, margin: '0 auto', padding: '110px clamp(16px,3.5vw,40px) 60px', fontFamily: "'Work Sans',sans-serif", color: '#340057' }}>
      {loadErr && (
        <div style={{ background: '#FFE2E7', border: '1.5px solid #FF3358', borderRadius: 16, padding: '16px 20px', fontWeight: 600 }}>
          {loadErr} <Link to={paths.booking()} style={{ color: '#7333FF' }}>{t('Book a day')}</Link>
        </div>
      )}
      {!view && !loadErr && <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.12em', color: 'rgba(52,0,87,.6)' }}>{t('LOADING…')}</div>}

      {view && (
        <>
          <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: '#7333FF' }}>{t('SAFETY WAIVER · {ref}', { ref: view.refCode })}</div>
          <h1 style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(34px,7vw,52px)', lineHeight: 0.95, margin: '8px 0 10px', textTransform: 'uppercase' }}>
            {t('Sign before you arrive')}
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.55, margin: 0, color: 'rgba(52,0,87,.8)' }}>
            {t('One waiver per participant, about two minutes each. Signed waivers go straight to the gate, so your party walks past the paperwork queue.')}
          </p>

          <section data-testid="waiver-progress" style={{ marginTop: 20, background: '#FFFFFF', borderRadius: 18, boxShadow: '0 0 0 1.5px #EBE2FF', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{view.guestName}</div>
                <div style={{ fontSize: 13, color: 'rgba(52,0,87,.65)', marginTop: 2 }}>
                  {fullDateFromIso(view.visitDate) || view.visitDate} · {view.slot === 'morning' ? t('Morning · 09:00–12:00') : t('Afternoon · 12:00–15:30')}
                </div>
              </div>
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 14, background: allSigned ? '#33FF74' : '#FFFC33', borderRadius: 999, padding: '7px 14px' }}>
                {t('{n} of {total} signed', { n: Math.min(view.signed.length, view.required), total: view.required })}
              </div>
            </div>
            <div style={{ height: 6, background: '#F1EAFF' }}>
              <div style={{ height: 6, width: `${Math.min(100, (view.signed.length / Math.max(1, view.required)) * 100)}%`, background: '#33FF74', transition: 'width .4s ease' }} />
            </div>
            {view.signed.length > 0 && (
              <ul style={{ listStyle: 'none', margin: 0, padding: '10px 20px 14px' }}>
                {view.signed.map((s) => (
                  <li key={s.participantName} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, padding: '4px 0' }}>
                    <span aria-hidden style={{ color: '#1E9E4A', fontWeight: 900 }}>✓</span>
                    <span style={{ fontWeight: 600 }}>{s.participantName}</span>
                    {s.isMinor && <span style={{ fontFamily: MONO, fontSize: 10, color: '#7333FF' }}>{t('UNDER 18 · SIGNED BY GUARDIAN')}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {done && <div role="status" style={{ marginTop: 16, background: '#E6FFEE', border: '1.5px solid #33FF74', borderRadius: 14, padding: '12px 16px', fontWeight: 600 }}>{done}</div>}

          {!view.open && (
            <div style={{ marginTop: 18, background: '#F7F3FF', borderRadius: 14, padding: '14px 18px', fontWeight: 600 }}>
              {t('This booking can no longer take waivers. Staff at the gate will help you.')}
            </div>
          )}

          {view.open && allSigned && !correcting && (
            <div style={{ marginTop: 18, background: '#E6FFEE', borderRadius: 16, padding: '18px 20px' }}>
              <div style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: 24, textTransform: 'uppercase' }}>{t('Everyone is signed. See you at the gate!')}</div>
              <p style={{ margin: '6px 0 12px', fontSize: 14, lineHeight: 1.5 }}>{t('Show your ticket QR code on arrival and head straight to your first activity.')}</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a href={ticketHref} style={pill('#340057', '#FFFFFF')}>{t('Open my ticket')}</a>
                <button type="button" onClick={() => { setCorrecting(true); setDone(''); }} style={pill('#FFFFFF', '#340057', true)}>{t('Correct a waiver')}</button>
              </div>
            </div>
          )}

          {showForm && (
            <div ref={formTop} style={{ scrollMarginTop: 90 }}>
              {correcting && <p style={{ margin: '18px 0 0', fontSize: 13.5, color: '#7333FF', fontWeight: 600 }}>{t('To correct a waiver, sign again with exactly the same full name; the new one replaces it.')}</p>}

              <Section n="1" title={t('The waiver')}>
                <div data-testid="waiver-terms" style={{ maxHeight: 260, overflowY: 'auto', background: '#F7F3FF', borderRadius: 14, padding: '14px 18px', fontSize: 13.5, lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>{t('Release of liability, assumption of risk and safety agreement')}</div>
                  <ol style={{ margin: 0, paddingInlineStart: 20 }}>
                    {WAIVER_TERMS.map((p) => <li key={p} style={{ marginBottom: 8 }}>{t(p)}</li>)}
                  </ol>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(52,0,87,.55)', marginTop: 6 }}>{view.termsVersion}</div>
                </div>
              </Section>

              <Section n="2" title={t('Participant')}>
                <Field label={t('Full name of the participant')}><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" style={input} data-testid="w-name" /></Field>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
                  <Field label={t('Date of birth')}><input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} max={view.visitDate} style={input} data-testid="w-birth" /></Field>
                  <Field label={t('Height (cm)')}><input inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value.replace(/[^0-9]/g, ''))} placeholder="170" style={input} data-testid="w-height" /></Field>
                  <Field label={t('Weight (kg)')}><input inputMode="numeric" value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^0-9]/g, ''))} placeholder="70" style={input} data-testid="w-weight" /></Field>
                </div>
                {age !== null && age >= 0 && <div style={{ fontSize: 13, color: 'rgba(52,0,87,.7)', marginTop: -4 }}>{t('Age on the day of the visit: {n}', { n: age })}</div>}
                {warnings.length > 0 && (
                  <div data-testid="w-warnings" style={{ background: '#FFF4D6', border: '1.5px solid #FFD24D', borderRadius: 12, padding: '10px 14px', fontSize: 13.5, lineHeight: 1.5, marginTop: 10 }}>
                    <div style={{ fontWeight: 800 }}>{t('Heads-up for this participant')}</div>
                    <ul style={{ margin: '4px 0 0', paddingInlineStart: 18 }}>{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
                    <div style={{ marginTop: 4 }}>{t('You can still sign; the guide will confirm on the day.')}</div>
                  </div>
                )}
                {minor && (
                  <Field label={t('Parent or guardian signing for this participant')}><input value={guardian} onChange={(e) => setGuardian(e.target.value)} style={input} data-testid="w-guardian" /></Field>
                )}
                <Field label={t('Medical conditions, allergies or injuries the guides should know about (optional)')}>
                  <textarea value={medical} onChange={(e) => setMedical(e.target.value)} rows={2} maxLength={500} style={{ ...input, resize: 'vertical' }} />
                </Field>
              </Section>

              <Section n="3" title={t('Emergency contact')}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
                  <Field label={t('Name')}><input value={emName} onChange={(e) => setEmName(e.target.value)} style={input} data-testid="w-em-name" /></Field>
                  <Field label={t('Phone number')}><input type="tel" dir="ltr" value={emPhone} onChange={(e) => setEmPhone(e.target.value)} placeholder="+230 5xxx xxxx" style={input} data-testid="w-em-phone" /></Field>
                </div>
              </Section>

              <Section n="4" title={t('Declarations')}>
                {DECLARATIONS.map(([k, label]) => (
                  <Check key={k} checked={decl[k]} onChange={(v) => setDecl((d) => ({ ...d, [k]: v }))} testId={'w-decl-' + k}>{t(label)}</Check>
                ))}
                <Check checked={photo} onChange={setPhoto}>{t('Optional: the park may share photos of the participant on its social media.')}</Check>
              </Section>

              <Section n="5" title={minor ? t('Signature of the parent or guardian') : t('Signature of the participant')}>
                <SignaturePad ref={pad} label={t('Sign here with your finger')} clearLabel={t('Clear signature')} onChange={setHasInk} />
              </Section>

              {err && <div role="alert" style={{ marginTop: 14, background: '#FFE2E7', border: '1.5px solid #FF3358', borderRadius: 12, padding: '10px 14px', fontWeight: 600, fontSize: 14 }}>{err}</div>}
              <button type="button" onClick={submit} disabled={busy} data-testid="w-submit" style={{ ...pill(hasInk ? '#FF3358' : '#FF8FA3', '#FFFFFF'), width: '100%', marginTop: 18, padding: '15px 20px', fontSize: 16, opacity: busy ? 0.7 : 1 }}>
                {busy ? t('Saving…') : t('Sign the waiver')}
              </button>
            </div>
          )}

          <p style={{ marginTop: 24, fontSize: 12.5, color: 'rgba(52,0,87,.6)', lineHeight: 1.55 }}>
            {t('Questions about the waiver? Call +230 660 44 77 or write to {email}.', { email: 'sales@vallepark.com' })}
          </p>
        </>
      )}
      <Stripes style={{ marginTop: 30, borderRadius: 6 }} />
    </main>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 26 }}>
      <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: '#7333FF', marginBottom: 10 }}>{n} · {title.toUpperCase()}</div>
      <div style={{ display: 'grid', gap: 12 }}>{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Check({ checked, onChange, children, testId }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; testId?: string }) {
  return (
    <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, lineHeight: 1.45, cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} data-testid={testId} style={{ width: 20, height: 20, marginTop: 1, accentColor: '#7333FF', flexShrink: 0 }} />
      <span>{children}</span>
    </label>
  );
}

const input: CSSProperties = {
  width: '100%', boxSizing: 'border-box', border: '1.5px solid #EBE2FF', background: '#F7F3FF', borderRadius: 12,
  padding: '12px 14px', fontFamily: 'inherit', fontSize: 16, outline: 'none', color: '#340057',
};

const pill = (bg: string, fg: string, outline = false): CSSProperties => ({
  background: bg, color: fg, border: outline ? '1.5px solid #340057' : 0, borderRadius: 999, padding: '11px 20px', fontWeight: 700, fontSize: 14,
  textDecoration: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-block',
});
