import { Link } from 'react-router-dom';
import { CupSoda, Footprints, IceCreamCone, Leaf, Salad, UserCheck, Users, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { Fwd } from '@/components/ui/arrows';
import { useCatalog, useRawCatalog } from '../../store/CatalogContext';
import { paths } from '../../lib/nav';
import { _t, useT } from '../../i18n';
import type { PackTier } from '../../types';
import { ClassHero } from './ClassHero';
import { BookActions, PackageCard } from './PackageCard';
import { GoodToKnow } from './GoodToKnow';
import { SupportPanel } from './SupportPanel';
import { Eyebrow, H2, QuoteLink, SectionHeader, cardItems, rupees, scrollToId, useValidityItem, type PagePhoto } from './shared';

/**
 * The senior citizen class page (/packages/senior), after the official
 * 2026–2027 sheet: a purple field with the yellow logo block, the two
 * packages in detail, the lunch menu and the practical notes. Names, prices
 * and inclusions come from the catalog (PACKS.senior); booking reuses the
 * product path of the other package cards (product:<key> in My Day).
 */

/** Photos that show what each package is; the catalog image stays the fallback. */
const PHOTOS: Record<string, PagePhoto> = {
  'pkg:senior:0': { src: '/images/valle-giant-tortoise-park-mauritius.avif', alt: _t('A senior couple walking past a giant tortoise in the park'), position: '30% 45%' },
  'pkg:senior:1': { src: '/images/expedition-convoy-meadow.webp', alt: _t('Guests seated in a VALLÉ jeep on a meadow track'), position: '55% 55%' },
};
/** Per-package accent, as on the sheet's price tags. */
const ACCENTS = ['#33FF74', '#FFFC33'];

const MENU: { course: string; icon: LucideIcon; dishes: string[] }[] = [
  { course: 'MAINS', icon: UtensilsCrossed, dishes: ['Rice', 'Fish curry', 'Chicken blanquette with vegetables'] },
  { course: 'ON THE SIDE', icon: Salad, dishes: ['Salad'] },
  { course: 'DESSERT', icon: IceCreamCone, dishes: ['Ice cream'] },
  { course: 'DRINKS', icon: CupSoda, dishes: ['Water', 'Soft drinks'] },
];

export default function SeniorPage({ onQuote, onDetails }: { onQuote: () => void; onDetails: (pk: PackTier) => void }) {
  const t = useT();
  const catalog = useCatalog();
  const raw = useRawCatalog();
  const validity = useValidityItem();
  const packs = catalog.PACKS.senior ?? [];
  const from = packs.length ? packs.reduce((a, b) => (rupees(b.single) < rupees(a.single) ? b : a)) : undefined;
  // the sheet's own labels for the menu, translated
  const menuT: Record<string, string> = {
    MAINS: t('MAINS'), 'ON THE SIDE': t('ON THE SIDE'), DESSERT: t('DESSERT'), DRINKS: t('DRINKS'),
    Rice: t('Rice'), 'Fish curry': t('Fish curry'), 'Chicken blanquette with vegetables': t('Chicken blanquette with vegetables'),
    Salad: t('Salad'), 'Ice cream': t('Ice cream'), Water: t('Water'), 'Soft drinks': t('Soft drinks'),
  };

  return (
    <div data-testid="senior-page">
      <ClassHero
        id="senior-title"
        title={t('Senior citizen')}
        chip={t('AGES 55 AND ABOVE')}
        promise={t('An unhurried day in the valley: see the park on foot or by jeep, sit down to lunch and end with a tea break.')}
        from={from?.single}
        photo={{ src: '/images/senior/senior-guests-trail.webp', alt: t('A smiling senior guest on a forest trail at VALLÉ, her group walking behind her'), width: 1620, height: 1096, position: '28% 30%' }}
        onBook={() => scrollToId('senior')}
        bookTestId="senior-hero-book"
      />

      {/* THE TWO PACKAGES */}
      <section id="senior" aria-labelledby="senior-packages-title" className="sr-section">
        <SectionHeader id="senior-packages-title" eyebrow={t('TWO PACKAGES · ONE PRICE PER PERSON')} title={t('Choose your package')} />
        <div className="sr-cards">
          {packs.map((pk, i) => {
            const key = pk.key ?? '';
            const photo = PHOTOS[key];
            return (
              <PackageCard
                key={key || pk.name}
                testId="senior-package"
                dataKey={key}
                titleId={`senior-pkg-${i}`}
                photo={photo ? { src: photo.src, alt: t(photo.alt), position: photo.position } : { src: pk.img, alt: t('{name} package', { name: pk.name }) }}
                tag={pk.name}
                tagColor={ACCENTS[i % ACCENTS.length]}
                title={pk.hero}
                items={cardItems(pk.items, raw.PACKS.senior?.[i]?.items)}
                single={pk.single}
                priceTestId="senior-price"
                rateChip={catalog.PRODUCTS?.find((p) => p.key === key)?.rateOnly === 'rr' ? t('RESIDENT RATE · ID REQUIRED') : undefined}
                actions={<BookActions productKey={key} name={pk.name} bookTestId="senior-book" blockedText={t('The senior packages are sold at the resident rate. You are browsing at the visitor rate.')} onDetails={() => onDetails(photo ? { ...pk, img: photo.src } : pk)} />}
              />
            );
          })}
        </div>
      </section>

      {/* LUNCH MENU */}
      <SupportPanel id="senior-lunch-title" photo={{ src: '/images/le-chamouze-restaurant-entrance.avif', alt: t('The entrance of Le Chamouzé restaurant at VALLÉ'), width: 2000, height: 1333, position: 'center 60%' }}>
        <Eyebrow>{t('INCLUDED IN BOTH PACKAGES')}</Eyebrow>
        <h2 id="senior-lunch-title" style={H2}>{t('Lunch menu')}</h2>
        <p className="sr-lunch-intro">{t('Both packages include a full lunch and a tea break.')}</p>
        <dl className="sr-menu">
          {MENU.map(({ course, icon: Icon, dishes }) => (
            <div key={course} className="sr-menu-row">
              <dt><Icon aria-hidden strokeWidth={1.9} />{menuT[course]}</dt>
              <dd>{dishes.map((d) => menuT[d]).join(' · ')}</dd>
            </div>
          ))}
        </dl>
        <div className="sr-veg"><Leaf aria-hidden strokeWidth={2.2} />{t('Vegetarian options available')}</div>
        <Link to={paths.resto('chamouze')} className="sr-link">{t('Discover Le Chamouzé')} <Fwd /></Link>
      </SupportPanel>

      <GoodToKnow
        id="senior-know-title"
        items={[
          { icon: UserCheck, title: t('Who it is for'), text: t('Guests aged 55 and above. Companions aged 12 and over pay the same package price.') },
          { icon: Footprints, title: t('What to bring'), text: t('Comfortable walking shoes and sun protection. The jeep visit is seated.') },
          { icon: Users, title: t('Coming as a group?'), text: t('Clubs and associations get a tailored quote within one working day.'), action: <QuoteLink onClick={onQuote} label={t('Request a group quote')} /> },
          validity,
        ]}
      />
    </div>
  );
}
