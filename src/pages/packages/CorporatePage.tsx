import { BadgeCheck, CloudRain, HandCoins, MessageSquareQuote, Users, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { Fwd } from '@/components/ui/arrows';
import { useCatalog, useRawCatalog } from '../../store/CatalogContext';
import { _t, useT } from '../../i18n';
import { ClassHero, CallButton } from './ClassHero';
import { PackageCard } from './PackageCard';
import { GoodToKnow } from './GoodToKnow';
import { SupportPanel } from './SupportPanel';
import { requestQuoteFor } from './QuoteForm';
import { Eyebrow, H2, MENU_DT, QuoteLink, SectionHeader, cardItems, splitDuration } from './shared';

/**
 * The corporate class page (/packages/corporate), after the team-building
 * magazine ad: "Need a stronger team? Start at VALLÉ." as the campaign hero,
 * the programmes from the catalog (TEAM), why teams come, the HRDC note and
 * the quote form below (rendered by Packages.tsx).
 */

/** Photos that show each programme's activities with adults; the catalog image stays the fallback. */
const PHOTOS: { src: string; alt: string; position: string }[] = [
  { src: '/images/luge-race.webp', alt: _t('Two colleagues racing luge karts side by side'), position: 'center 45%' },
  { src: '/images/day/nepalese-04.webp', alt: _t('Two guests cheering, arms out, on the Nepalese Bridge'), position: 'center 35%' },
  { src: '/images/day/zipline-03.webp', alt: _t('Guests flying a zipline together, a guide beside them'), position: 'center 35%' },
];
const ACCENTS = ['#33FF74', '#FFFC33', '#FF3358'];

export default function CorporatePage({ onQuote }: { onQuote: () => void }) {
  const t = useT();
  const catalog = useCatalog();
  const raw = useRawCatalog();
  const team = catalog.TEAM;
  // what sets each programme apart: the inclusions not shared by every programme
  const everywhere = (english: string) => raw.TEAM.every((p) => p.items.some((it) => it.t === english));
  const [before, after = ''] = t('Start at {brand}.').split('{brand}');
  const why: [LucideIcon, string][] = [
    [HandCoins, t('HRDC REFUNDABLE*')], [Users, t('10 TO 300+ PEOPLE')], [BadgeCheck, t('CERTIFIED FACILITATORS')],
    [CloudRain, t('INDOOR BACKUP IF IT RAINS')], [UtensilsCrossed, t('TAILORED MENUS & LOGISTICS')],
  ];

  return (
    <div data-testid="corporate-page">
      <ClassHero
        id="team-hero-title"
        testId="team-hero"
        title={<>{t('Need a stronger team?')}<br />{before}<span style={{ color: '#FFFC33' }}>VALLÉ</span>{after}</>}
        chip={t('TEAM BUILDING EXPERIENCES')}
        promise={t('Trust, laughter and a bit of adrenaline, facilitated by certified trainers. Programs scale from 10 to 300+ people, and HRDC refunds can apply.')}
        photo={{ src: '/images/team-building-goggles.webp', alt: t('Colleagues in goggles cheering during a team challenge at Vallé'), width: 781, height: 977, position: 'center 30%' }}
        actions={<>
          <button type="button" data-testid="team-hero-quote" className="sr-btn sr-btn-primary sr-btn-lg" onClick={() => { requestQuoteFor(t('Corporate package')); onQuote(); }}>{t('Request a quote')} <Fwd /></button>
          <CallButton testId="team-phone" />
        </>}
      />

      <section id="team" aria-labelledby="team-programmes-title" className="sr-section">
        <SectionHeader id="team-programmes-title" eyebrow={t('TEAM BUILDING PROGRAMMES · PRICE ON QUOTE')} title={t('Choose your programme')} intro={t('Every programme starts with two to three hours of fun games and ends around a wellness lunch. Pick the activities that suit your team.')} />
        <div className="sr-cards-3">
          {team.map((tp, i) => {
            const english = raw.TEAM[i]?.items ?? tp.items;
            const highlights = tp.items.filter((_, j) => !everywhere(english[j]?.t ?? '')).map((it) => splitDuration(it.t)[0]);
            const photo = PHOTOS[i];
            return (
              <PackageCard
                key={i}
                testId="team-card"
                compact
                titleId={`team-pkg-${i}`}
                photo={photo ? { src: photo.src, alt: t(photo.alt), position: photo.position } : { src: tp.img, alt: t('Team building day at Vallé Advenature™ Park') }}
                tag={t('Programme {n}', { n: i + 1 })}
                tagColor={ACCENTS[i % ACCENTS.length]}
                title={highlights.join(' + ') || t('Programme {n}', { n: i + 1 })}
                label={t('YOU WILL GET')}
                items={cardItems(tp.items, english)}
                actions={(
                  <div className="sr-actions sr-actions-one" style={{ marginTop: 0 }}>
                    <p className="sr-price-note" style={{ alignItems: 'flex-start', textAlign: 'start', margin: '0 0 6px', paddingTop: 18, borderTop: '1.5px dashed #D9C9F0' }}>{t('Price per person on quote · HRDC refundable*')}</p>
                    <button type="button" data-testid="team-card-quote" className="sr-btn sr-btn-primary" aria-label={t('Request a quote for {name}', { name: t('Programme {n}', { n: i + 1 }) })} onClick={() => { requestQuoteFor([t('Programme {n}', { n: i + 1 }), ...highlights].join(' · ')); onQuote(); }}>{t('Request a quote')} <Fwd /></button>
                  </div>
                )}
              />
            );
          })}
        </div>
      </section>

      <SupportPanel id="team-why-title" photo={{ src: '/images/shoot/luge-03.webp', alt: t('A group of friends racing down the luge track together'), width: 1600, height: 899, position: 'center 50%' }}>
        <Eyebrow>{t('WHY TEAMS COME TO VALLÉ')}</Eyebrow>
        <h2 id="team-why-title" style={H2}>{t('Built around your team')}</h2>
        <dl className="sr-menu">
          {why.map(([Icon, label]) => (
            <div key={label} className="sr-menu-row" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
              <dt style={MENU_DT}><Icon aria-hidden strokeWidth={1.9} />{label}</dt>
            </div>
          ))}
        </dl>
        <p className="sr-lunch-intro" style={{ fontSize: 14.5 }}>{t('*HRDC refund conditions apply. The events team confirms what applies to your programme with the quote.')}</p>
        <QuoteLink onClick={onQuote} label={t('Request a quote')} />
      </SupportPanel>

      <GoodToKnow
        id="team-know-title"
        items={[
          { icon: Users, title: t('Group size'), text: t('Programmes scale from 10 to more than 300 people.') },
          { icon: CloudRain, title: t('If it rains'), text: t('An indoor backup is ready, so the day goes ahead.') },
          { icon: MessageSquareQuote, title: t('Your quote'), text: t('Tell us about your group and we will send a tailored quote.'), action: <QuoteLink onClick={onQuote} label={t('Request a quote')} /> },
          { icon: UtensilsCrossed, title: t('Lunch and logistics'), text: t('A wellness lunch and water are included; menus and logistics are tailored to your group.') },
        ]}
      />
    </div>
  );
}
