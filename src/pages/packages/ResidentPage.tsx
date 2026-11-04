import { IdCard, Shuffle, Users } from 'lucide-react';
import { useCatalog, useRawCatalog } from '../../store/CatalogContext';
import { money } from '../../lib/format';
import { _t, useT } from '../../i18n';
import type { PackModalData } from '../../components/PackageModal';
import { ClassHero } from './ClassHero';
import { ProductCard } from './PackageCard';
import { GoodToKnow } from './GoodToKnow';
import { KidsParkLink } from './KidsParkSection';
import { QuoteLink, GroupLink, SectionHeader, cardItems, fgOn, photoFor, rupees, scrollToId, useValidityItem, type PagePhoto } from './shared';
import { requestQuoteFor } from './QuoteForm';

/**
 * The resident class page (/packages/resident), after the official 2026
 * resident sheet: the four per-person packages at the resident rate, then the
 * Kids Park pricelist in the park's own look. Catalog data: PACKS.resident, PL.kids.
 */

const PHOTOS: Record<string, PagePhoto> = {
  'pkg:resident:0': { src: '/images/luge-family.webp', alt: _t('A father and his son laughing on a luge kart'), position: 'center 18%' },
  'pkg:resident:1': { src: '/images/zipline-waterfall.webp', alt: _t('A guest flying the Waterfall Zipline past the falls'), position: '45% 40%' },
  'pkg:resident:2': { src: '/images/zipline-superman.webp', alt: _t('A guest flying The Signature zipline superman-style'), position: 'center 35%' },
  'pkg:resident:3': { src: '/images/zipline-duo.webp', alt: _t('Two guests flying a zipline over the forest'), position: 'center 40%' },
};

export default function ResidentPage({ onQuote, onDetails }: { onQuote: () => void; onDetails: (p: PackModalData) => void }) {
  const t = useT();
  const catalog = useCatalog();
  const raw = useRawCatalog();
  const validity = useValidityItem();
  const packs = catalog.PACKS.resident ?? [];
  const from = packs.length ? packs.reduce((a, b) => (rupees(b.single) < rupees(a.single) ? b : a)) : undefined;

  return (
    <div data-testid="resident-page">
      <ClassHero
        id="resident-title"
        title={t('Resident packages')}
        chip={t('MAURITIAN ID OR PERMIT')}
        promise={t('Three or four of the park’s classics in one visit at the resident rate: the luge, the bridges and the ziplines, one price per person.')}
        from={from ? money(rupees(from.single)) : undefined}
        currency
        photo={{ src: '/images/bridge-laugh.webp', alt: t('A couple laughing as they cross the Nepalese Bridge in harnesses'), width: 1500, height: 1000, position: '55% 35%' }}
        onBook={() => scrollToId('resident')}
        bookTestId="resident-hero-book"
      />

      <section id="resident" aria-labelledby="resident-packages-title" className="sr-section">
        <SectionHeader id="resident-packages-title" eyebrow={t('FOUR PACKAGES · ONE PRICE PER PERSON')} title={t('Choose your package')} intro={t('Every package is per person at the resident rate. Where a package says OR, you choose one of the two on the day.')} />
        <div className="sr-cards">
          {packs.map((pk, i) => {
            const photo = photoFor(PHOTOS, pk.key, pk.img, pk.name, t);
            return (
              <ProductCard key={pk.key ?? pk.name} testId="resident-package" productKey={pk.key} name={pk.name} titleId={`resident-pkg-${i}`} photo={photo}
                tag={pk.name} tagColor={pk.color} tagFg={fgOn(pk.color)} title={pk.hero ?? pk.name}
                items={cardItems(pk.items, raw.PACKS.resident?.[i]?.items)} fallbackSingle={pk.single} priceTestId="resident-price"
                blockedText={t('The resident packages are sold at the resident rate. You are browsing at the visitor rate.')}
                onDetails={() => onDetails({ ...pk, img: photo.src, productKey: pk.key })} />
            );
          })}
        </div>
      </section>

      <KidsParkLink />

      <GoodToKnow
        id="resident-know-title"
        items={[
          { icon: IdCard, title: t('Who qualifies'), text: t('Resident rates apply upon presentation of a valid Mauritian National ID card, Residence Permit, Occupation Permit, Permanent Residence Permit, or valid work/dependent permit confirming residency in Mauritius.') },
          { icon: Shuffle, title: t('Your choice on the day'), text: t('Where a package offers the Nepalese Bridge OR the Bicycle Zipline, pick the one you prefer at the park.') },
          { icon: Users, title: t('Coming as a group?'), text: t('Ten people or more book online as a group with per-head prices; clubs and associations can also ask for a tailored quote.'), action: <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 'auto' }}><GroupLink label={t('Book as a group')} /><QuoteLink onClick={() => { requestQuoteFor(t('Resident package')); onQuote(); }} label={t('Request a group quote')} /></div> },
          validity,
        ]}
      />
    </div>
  );
}
