import { Link } from 'react-router-dom';
import { Baby, Backpack, FileSignature, GraduationCap, Leaf, School, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { Fwd } from '@/components/ui/arrows';
import { BtnLabel } from '@/components/ui/valle';
import { Img } from '../../components/Img';
import { useCatalog } from '../../store/CatalogContext';
import { paths } from '../../lib/nav';
import { money } from '../../lib/format';
import { _t, useT } from '../../i18n';
import { ValleIcon, iconForInclusion } from '@/components/ui/ValleIcon';
import type { PriceRow } from '../../types';
import { ClassHero, CallButton } from './ClassHero';
import { GoodToKnow } from './GoodToKnow';
import { SupportPanel } from './SupportPanel';
import { DISPLAY, Eyebrow, H2, MENU_DT, PRICE, SectionHeader, cover, useValidityItem } from './shared';
import { requestQuoteFor } from './QuoteForm';
import { chipInk } from '@/styles/theme';

/**
 * The student class page (/packages/student), after the official 2026
 * student sheet: the student price list grouped by activity (Kids Park lines
 * and top-up card included), the school lunch menu, who it applies to and the
 * online school booking (/groups). Every line and price comes from PL.student.
 */

type GroupKey = 'visit' | 'luge' | 'zip' | 'kids' | 'lunch';
/** Which card a student price line belongs to, read from the English line. */
const groupOf = (n: string): GroupKey =>
  /^Kids Park/i.test(n) ? 'kids' : /^Lunch/i.test(n) ? 'lunch' : /Luge/i.test(n) ? 'luge' : /Zipline|Plunge|Tour|Signature/i.test(n) ? 'zip' : 'visit';

const GROUPS: { key: Exclude<GroupKey, 'lunch'>; title: string; color: string; photo: { src: string; alt: string; position: string } }[] = [
  // the park has no school-group photo yet: the bridge itself, rather than a family day out
  { key: 'visit', title: _t('Park visit & bridge'), color: '#33FF74', photo: { src: '/images/bridge-span.webp', alt: _t('The Nepalese Bridge stretching across the forested valley'), position: 'center 50%' } },
  { key: 'luge', title: _t('Mountain Luge Kart'), color: '#FFFC33', photo: { src: '/images/luge-new-3.webp', alt: _t('A child and an adult riding a luge kart down the track'), position: 'center 55%' } },
  { key: 'zip', title: _t('Ziplines'), color: '#FF3358', photo: { src: '/images/zipline-tandem.webp', alt: _t('A child and a guide flying a zipline together'), position: 'center 35%' } },
  { key: 'kids', title: _t('Kids Park'), color: '#A6CE39', photo: { src: '/images/miniquad.avif', alt: _t('A child driving a mini quad at Vallé Kids Park'), position: 'center 45%' } },
];

/** "Mountain Luge Kart · 1 ride" -> ["Mountain Luge Kart", "1 ride"] */
const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const parts = (s: string) => { const i = s.indexOf(' · '); return i < 0 ? [s, ''] : [s.slice(0, i), s.slice(i + 3)]; };

export default function StudentPage({ onQuote }: { onQuote: () => void }) {
  const t = useT();
  const catalog = useCatalog();
  const validity = useValidityItem();
  const rows: PriceRow[] = catalog.PL.student ?? [];
  const byGroup = (g: GroupKey) => rows.filter((r) => groupOf(r.n) === g);
  const entrance = byGroup('visit')[0];
  const lunch = byGroup('lunch');

  return (
    <div data-testid="student-page">
      <ClassHero
        id="student-title"
        title={t('Student package')}
        chip={t('PRE-PRIMARY · PRIMARY · SECONDARY')}
        promise={t('Every great explorer starts small: school outings with the park visit, ziplines, the luge, the Kids Park and lunch, all at the student rate.')}
        from={entrance ? money(entrance.rr) : undefined}
        fromNote={t('per student · park visit · VAT inclusive')}
        currency
        photo={{ src: '/images/packages/student/student-zipline-kid.webp', alt: t('A young student cheering on a zipline in a blue helmet'), width: 961, height: 469, position: '42% 30%' }}
        actions={<>
          <Link to={paths.groups()} data-testid="student-hero-book" className="vbtn vbtn-on-dark">{t('Book a school visit')} <Fwd /></Link>
          <CallButton />
        </>}
      />

      {/* THE STUDENT PRICE LIST */}
      <section id="student" aria-labelledby="student-prices-title" className="sr-section">
        <SectionHeader id="student-prices-title" eyebrow={t('STUDENT PRICELIST · PER STUDENT')} title={t('The student price list')} intro={t('Pick the activities your class will do; every line is a price per student. The Kids Park rides are paid on the top-up card.')} />
        <div className="sr-cards">
          {GROUPS.map((g, gi) => {
            const list = byGroup(g.key);
            if (!list.length) return null;
            // when every line starts the same ("Kids Park · …"), show only what differs
            const shown = list.map((r) => parts(t(r.n)));
            const common = shown.every(([a]) => a === shown[0][0]) && shown.every(([, b]) => b);
            return (
              <article key={g.key} className="sr-card" data-testid="student-group" data-group={g.key} aria-labelledby={`student-group-${gi}`}>
                <div className="sr-card-photo">
                  <Img src={g.photo.src} alt={t(g.photo.alt)} sizes="(max-width: 640px) 100vw, 50vw" style={cover(g.photo.position)} />
                  <span className="sr-card-tag" style={{ background: chipInk(g.color), color: chipInk(g.color) !== g.color ? '#FFFFFF' : undefined, textTransform: 'none' }}>{t('From {price}', { price: money(Math.min(...list.filter((r) => !/top-up/i.test(r.n)).map((r) => r.rr))) })}</span>
                </div>
                <div className="sr-card-body">
                  <h3 id={`student-group-${gi}`} style={{ ...DISPLAY, margin: 0, fontSize: 'clamp(28px,2.8vw,36px)', lineHeight: 0.95, color: '#340057' }}>{t(g.title)}</h3>
                  <ul className="pk-rows">
                    {list.map((r, i) => {
                      const [main, hint] = shown[i];
                      const label = upperFirst(common ? hint : main);
                      // the top-up card is bought once per card, not per student
                      const sub = /top-up/i.test(r.n) ? t('PER CARD') : common ? '' : hint;
                      return (
                        <li key={r.n} data-testid="student-row">
                          <span className="pk-row-label">{(() => { const icon = iconForInclusion(r.n); return icon ? <ValleIcon name={icon} size={18} className="pk-row-icon" /> : null; })()}<span>{label}{sub && <span className="pk-row-hint">{sub.toUpperCase()}</span>}</span></span>
                          <b dir="ltr">{money(r.rr)}</b>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="sr-card-foot" style={{ paddingTop: 18 }}>
                    <div className="sr-price-note" style={{ alignItems: 'flex-start', textAlign: 'start' }}>{g.key === 'kids' ? t('Per ride, on the Kids Park top-up card · VAT inclusive') : t('Per student · VAT inclusive')}</div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* LUNCH MENU */}
      {lunch.length > 0 && (
        <SupportPanel id="student-lunch-title" testId="student-lunch" aside={(
          <div className="pk-tags">
            {lunch.map((r) => (
              <div key={r.n} className="pk-tag">
                <span data-testid="student-lunch-price" dir="ltr" style={{ ...PRICE, unicodeBidi: 'isolate' }}>{money(r.rr)}</span>
                <Eyebrow color="#340057">{(parts(t(r.n))[1] || t(r.n)).toUpperCase()}</Eyebrow>
              </div>
            ))}
            <Eyebrow color="#33FF74">{t('PER STUDENT · VAT INCLUSIVE')}</Eyebrow>
          </div>
        )}>
          <Eyebrow>{t('ADD LUNCH TO THE DAY')}</Eyebrow>
          <h2 id="student-lunch-title" style={H2}>{t('Lunch menu')}</h2>
          <p className="sr-lunch-intro">{t('Two menus, each with a soft drink: one with chicken, one vegetarian.')}</p>
          <dl className="sr-menu">
            <div className="sr-menu-row">
              <dt style={MENU_DT}><UtensilsCrossed aria-hidden strokeWidth={1.9} />{t('NON-VEG')}</dt>
              <dd>{t('Chicken fried rice + soft drink, or crispy chicken, fries and cheese pizza + soft drink')}</dd>
            </div>
            <div className="sr-menu-row">
              <dt style={MENU_DT}><Leaf aria-hidden strokeWidth={1.9} />{t('VEG')}</dt>
              <dd>{t('Veg fried rice + soft drink, or fries and cheese pizza + soft drink')}</dd>
            </div>
          </dl>
        </SupportPanel>
      )}

      {/* WHO IT APPLIES TO */}
      <section aria-labelledby="student-who-title" className="sr-section">
        <SectionHeader id="student-who-title" eyebrow={t('WHO IT APPLIES TO')} title={t('For every school level')} intro={t('The student price list applies to pre-primary, primary and secondary students.')} />
        <ul className="sr-know">
          {([[Baby, t('Pre-primary'), t('The youngest explorers, with their teachers.')], [Backpack, t('Primary'), t('Primary school classes and their teachers.')], [GraduationCap, t('Secondary'), t('Secondary students over 11 count as adults at the student rate.')]] as [LucideIcon, string, string][]).map(([Icon, title, text]) => (
            <li key={title}><Icon aria-hidden strokeWidth={1.9} /><h3>{title}</h3><p>{text}</p></li>
          ))}
        </ul>
      </section>

      {/* BOOK ONLINE */}
      <SupportPanel id="student-book-title" reverse photo={{ src: '/images/playground-new-2.webp', alt: t('Children running into the playground at VALLÉ'), width: 1400, height: 933, position: 'center 50%' }}>
        <Eyebrow>{t('SCHOOLS BOOK ONLINE')}</Eyebrow>
        <h2 id="student-book-title" style={H2}>{t('Book a school visit online')}</h2>
        <ol className="pk-steps">
          <li><span aria-hidden>1</span><div><b>{t('Who is coming')}</b>{t('The school, the teacher in charge and the number of students and adults.')}</div></li>
          <li><span aria-hidden>2</span><div><b>{t('Date and student rows')}</b>{t('Pick the day and arrival time, then tick the student rows your visit includes.')}</div></li>
          <li><span aria-hidden>3</span><div><b>{t('Participants and waivers')}</b>{t('Add the list now or later from the ticket; the leader signs one waiver pack for the group.')}</div></li>
        </ol>
        <div className="sr-hero-actions" style={{ marginTop: 24 }}>
          <Link to={paths.groups()} data-testid="book-school" className="vbtn vbtn-primary"><BtnLabel>{t('Book a school visit online →')}</BtnLabel></Link>
          <button type="button" className="vbtn vbtn-secondary" onClick={() => { requestQuoteFor(t('Student package')); onQuote(); }}>{t('Request a quote')}</button>
        </div>
      </SupportPanel>

      <GoodToKnow
        id="student-know-title"
        items={[
          { icon: 'team-stars', title: t('Group size'), text: t('A group booking is for 10 people or more. For fewer, book a day the usual way.') },
          { icon: School, title: t('Deposit'), text: t('Free to book; the deposit is paid within 7 days and the balance on the day.') },
          { icon: FileSignature, title: t('Waivers'), text: t('One waiver pack for the leader to sign, from the group’s ticket.') },
          validity,
        ]}
      />
    </div>
  );
}
