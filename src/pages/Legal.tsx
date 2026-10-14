import { Link } from 'react-router-dom';
import { LANG_META, isRtl, useLang, useT, _t } from '../i18n';
import { paths } from '../lib/nav';
import { breadcrumbs, useSeo } from '../lib/seo';
import { cn } from '@/lib/utils';

/**
 * /privacy and /terms: the two legal pages the footer links to. The wording is
 * kept in these arrays so every sentence goes through t() like the rest of the
 * site. Facts come from what the site actually does (see src/lib/consent.ts,
 * the waiver and the backend notifications); update them when that changes.
 */

const UPDATED = '2026-10-06';

type Section = { h: string; p: string[] };

const PRIVACY: Section[] = [
  { h: _t('Who we are'), p: [
    _t('VALLÉ Advenature™ Park is operated by Mare Anguilles Farms Ltd, B102 Mare Anguilles, Chamouny, Mauritius (“we”). We are the data controller for the personal data collected through this website. Write to sales@vallepark.com or call +230 660 44 77 for anything about your data.'),
  ] },
  { h: _t('What we collect and why'), p: [
    _t('Booking: your name, phone number, e-mail, nationality, the size of your party, the date and arrival slot, and what you chose. We use it to hold your places, send your ticket and reminder, and welcome you at the gate.'),
    _t('Safety waiver: for ziplines, quad, buggy, luge and similar activities, each participant gives their name, date of birth, height, weight, address or hotel, phone, e-mail, nationality, ID or passport number, emergency contact, any medical notes, and signs on screen. We record the time, language, IP address and browser of the signature. This is required to run these activities safely and is kept as evidence of the agreement.'),
    _t('Chat: the messages and files you send through the chat bubble, and the name and e-mail you may give. They are read by the park team to answer you.'),
    _t('Group quotes and job applications: what you type into those forms, including a link to your CV. They go to the sales team and to the people who hire.'),
    _t('Your choices on this device: your rate (resident or visitor), the experiences in “My Day”, your language and currency, and your cookie choice are kept in your browser’s storage, not on our servers.'),
  ] },
  { h: _t('Cookies and analytics'), p: [
    _t('The site sets no advertising cookies and no third-party tracking. With “Accept all” we also measure page speed and record a short, masked replay when a page fails, through Sentry, to fix problems. Error reports without personal data are sent in every case so the site keeps working. You can change this any time under “Cookie settings” in the footer.'),
  ] },
  { h: _t('Who else sees your data'), p: [
    _t('Only the providers that make the site run, each bound to use your data for us alone: Railway (hosting in the European Union), Resend (e-mail delivery), 360dialog and Meta (WhatsApp messages, if you asked for them), and Sentry (error monitoring). Exchange rates come from the Bank of Mauritius without any personal data. We never sell your data.'),
  ] },
  { h: _t('Messages we send'), p: [
    _t('Your ticket, the evening-before reminder and a copy of your signed waiver are sent by e-mail and, when you gave a mobile number, by WhatsApp. We send marketing only if you ticked the box for it on the waiver; you can withdraw that at any time by writing to us.'),
  ] },
  { h: _t('How long we keep it'), p: [
    _t('Bookings and waivers are kept for seven years after your visit for safety, insurance and accounting; after that your name, contact details and signature are removed and only the amounts and dates stay in our books. Chat conversations, quote and table requests, job applications and visit photos are kept on record. Ask us and we will tell you what we hold about you, correct it, or delete it where the law allows.'),
  ] },
  { h: _t('Your rights'), p: [
    _t('Under the Data Protection Act 2017 of Mauritius you can ask to see the personal data we hold about you, have it corrected or deleted, and object to its use. Write to sales@vallepark.com; we answer within one month. You may also complain to the Data Protection Office of Mauritius.'),
  ] },
  { h: _t('Children'), p: [
    _t('Anyone under 18 takes part under the responsibility of a parent or guardian, who signs the waiver for them. We do not knowingly collect data from children in any other way.'),
  ] },
  { h: _t('Changes'), p: [
    _t('When this policy changes, the new version is published here with its date. This version is dated {date}.'),
  ] },
];

const TERMS: Section[] = [
  { h: _t('The park'), p: [
    _t('VALLÉ Advenature™ Park, Chamouny, Mauritius, is operated by Mare Anguilles Farms Ltd (“the park”, “we”). These terms apply to this website and to every booking made through it. By booking or visiting you accept them, together with the safety waiver that each participant signs before the activities that require one.'),
  ] },
  { h: _t('Bookings and prices'), p: [
    _t('Booking on the site is free: it reserves your places, nothing is charged online, and you pay at the gate in cash or by card. Prices are in Mauritian rupees; amounts shown in other currencies are indicative, at the Bank of Mauritius rate of the day. The resident rate requires a Mauritian ID or proof of residence at the gate; without it the visitor rate applies.'),
    _t('Children aged 6 to 11 pay the child rate; under 6 enter free. The Explorer Pass discount applies automatically when three or more different adventure experiences are booked for the same day. Promo and partner codes are applied as shown on the booking page and cannot be combined with another code.'),
    _t('Your reference and QR code are your ticket. Your booking holds places for the day and arrival slot you chose; we do our best to keep activity waiting times short, but activities run in order of arrival and may be subject to a queue at busy times.'),
  ] },
  { h: _t('Changes and cancellation'), p: [
    _t('There is no cancellation fee for a booking that has not been paid: tell us by phone, WhatsApp or e-mail and we release your places. To change the date, the slot or your party, contact us and we will update your ticket. Once activities have been paid for, the no-refund rule in the safety waiver applies.'),
    _t('Some activities depend on the weather. When rain or wind makes an activity unsafe, we pause it and you may wait, choose another activity, or move your visit to another day at no cost. Weather is not a ground for a refund of activities already paid.'),
  ] },
  { h: _t('Taking part'), p: [
    _t('Each activity has age, height and weight limits and health conditions, shown on its page and checked at the gate. Guides may refuse or stop anyone who does not meet them, appears unwell or under the influence of alcohol or drugs, or does not follow instructions. Participants must wear the safety equipment provided and keep to the marked trails and the guides’ instructions at all times.'),
    _t('Before ziplines, quad, buggy, luge and similar activities every participant, or a parent or guardian for a minor, signs the park’s safety waiver, online from the booking confirmation or at the gate. No signed waiver, no activity.'),
  ] },
  { h: _t('Your belongings and photos'), p: [
    _t('You are responsible for your belongings during the visit. Photographs and videos taken by our photographers are offered as the photo packages on the Packages page. We may use images of the park for promotion only with the consent given on the waiver.'),
  ] },
  { h: _t('This website'), p: [
    _t('The text, photographs, maps and design of this site belong to Mare Anguilles Farms Ltd or its licensors and may not be copied for commercial use. We try to keep the information current, but opening hours, prices and the activities offered can change; the price shown when you book is the one that applies. The site is provided as is and may be unavailable for maintenance.'),
  ] },
  { h: _t('Liability and law'), p: [
    _t('Adventure activities carry risks that cannot be removed entirely; the extent of the park’s responsibility and your own is set out in the safety waiver. Nothing in these terms limits a liability that cannot be limited under the laws of Mauritius. These terms are governed by the laws of Mauritius and its courts.'),
  ] },
  { h: _t('Contact'), p: [
    _t('Mare Anguilles Farms Ltd, B102 Mare Anguilles, Chamouny, Mauritius · sales@vallepark.com · +230 660 44 77. These terms are dated {date}.'),
  ] },
];

export default function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const t = useT();
  const lang = useLang();
  const privacy = kind === 'privacy';
  const title = privacy ? t('Privacy policy') : t('Terms of use');
  const eyebrow = privacy ? t('YOUR DATA AT VALLÉ') : t('BOOKING AND VISITING VALLÉ');
  const lead = privacy
    ? t('What we collect when you book, sign a waiver, chat or apply, why, who sees it, and how to ask us about it.')
    : t('How bookings, prices, changes and the activities work, in plain words. The safety waiver each participant signs completes these terms.');
  useSeo({
    title: `${title} · VALLÉ Advenature™ Park`,
    description: lead,
    canonicalPath: privacy ? '/privacy' : '/terms',
    jsonLd: [breadcrumbs([{ name: 'Home', path: '/' }, { name: title, path: privacy ? '/privacy' : '/terms' }])],
  });
  const sections = privacy ? PRIVACY : TERMS;
  const date = new Date(UPDATED + 'T00:00:00Z').toLocaleDateString(LANG_META[lang].locale, { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <main data-testid={`legal-${kind}`} className="mx-auto max-w-[860px] px-[clamp(16px,3.5vw,40px)] pt-[140px] pb-[70px]">
      <div className="font-mono text-[12px] font-bold tracking-[.16em] text-valle-violet">{eyebrow}</div>
      <h1 className={cn(
        'mx-0 mt-3.5 mb-0 -rotate-3 font-display text-[clamp(38px,6vw,76px)] font-black uppercase italic',
        lang === 'ar' || lang === 'hi' ? 'leading-[1.15]' : 'leading-[0.86]',
        isRtl() ? 'origin-bottom-right' : 'origin-bottom-left',
      )}>{title}</h1>
      <p className="mx-0 mt-[26px] mb-0 max-w-[60ch] text-[17px] leading-[1.6] text-valle-purple/75">{lead}</p>
      <div className="mt-3.5 font-mono text-[11px] tracking-[.1em] text-valle-purple/50">{t('LAST UPDATED')} · {date}</div>

      <nav aria-label={t('Sections')} className="mt-7 flex flex-wrap gap-2">
        {sections.map((s, i) => (
          <a key={s.h} href={`#s${i + 1}`} className="rounded-full border-[1.5px] border-solid border-valle-lilac bg-white px-3 py-[7px] font-mono text-[11px] font-semibold tracking-[.08em]" style={{ color: '#340057', textDecoration: 'none' }}>
            {String(i + 1).padStart(2, '0')} · {t(s.h)}
          </a>
        ))}
      </nav>

      {sections.map((s, i) => (
        <section key={s.h} id={`s${i + 1}`} className="mt-10 scroll-mt-24">
          <h2 className="m-0 font-display text-[clamp(22px,2.6vw,30px)] font-black text-valle-purple uppercase italic">
            <span className="me-2.5 text-valle-red">{String(i + 1).padStart(2, '0')}</span>{t(s.h)}
          </h2>
          {s.p.map((p) => (
            <p key={p} className="mx-0 mt-3 mb-0 text-[15.5px] leading-[1.7] text-valle-purple/80">{t(p, { date })}</p>
          ))}
        </section>
      ))}

      <div className="mt-12 flex flex-wrap items-center gap-3.5 rounded-[16px] bg-[#F7F3FF] px-[22px] py-[18px] text-[14.5px] leading-[1.6] text-valle-purple/80">
        <span className="flex-[1_1_260px]">{privacy ? t('Read also the terms of use and the safety waiver.') : t('Read also the privacy policy, and the safety waiver you sign before the activities.')}</span>
        <Link to={privacy ? paths.terms() : paths.privacy()} className="font-bold" style={{ color: '#7333FF' }}>{privacy ? t('Terms of use') : t('Privacy policy')} →</Link>
        <a href="/api/tickets/sample/waiver.pdf" target="_blank" rel="noopener" className="font-bold" style={{ color: '#7333FF' }}>{t('Safety waiver (PDF)')} →</a>
      </div>
    </main>
  );
}
