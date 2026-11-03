import type { ReactNode } from 'react';
import { CalendarDays, Footprints, IdCard, Users } from 'lucide-react';
import { Img } from '../../components/Img';
import { useCatalog, useRawCatalog } from '../../store/CatalogContext';
import { useApp } from '../../store/AppStore';
import { money } from '../../lib/format';
import { _t, useT } from '../../i18n';
import type { PackModalData } from '../../components/PackageModal';
import type { PackItem, PackTier } from '../../types';
import { ClassHero, type HeroPhoto } from './ClassHero';
import { BookActions, ProductCard } from './PackageCard';
import { GoodToKnow } from './GoodToKnow';
import { DISPLAY, Eyebrow, PRICE, SectionHeader, cardItems, inclusionIcon, rupees, scrollToId, splitDuration, useProductBooking } from './shared';

/**
 * The exclusive class page (/packages/exclusive), after the official NR
 * sheets: Light & Standard, the Bronze-to-Platinum tiers, VIP Ultimate and
 * Diamond as premium features, then the quad + zipline combos. Every name,
 * inclusion and price comes from the catalog (PACKS, COMBO, PRODUCTS).
 */

/** Photos that show what each package is about; the catalog image stays the fallback. */
const PHOTOS: Record<string, { src: string; alt: string; position: string }> = {
  'pkg:ls:0': { src: '/images/day/quad-01.webp', alt: _t('Two guests riding a quad on a forest track'), position: 'center 45%' },
  'pkg:ls:1': { src: '/images/ziplineadventures.avif', alt: _t('Two guests flying a zipline over the forest'), position: 'center 40%' },
  'pkg:ex:0': { src: '/images/zipline-waterfall.webp', alt: _t('A guest flying the Waterfall Zipline past the falls'), position: '45% 40%' },
  'pkg:ex:1': { src: '/images/map/zip-signature-valley.webp', alt: _t('A guest flying The Signature zipline across the valley'), position: '45% 40%' },
  'pkg:ex:2': { src: '/images/map/zip-coloured-earth-flight.webp', alt: _t('A guest on the Sky Pulse Tour above the Coloured Earth'), position: 'center 35%' },
  'pkg:ex:3': { src: '/images/map/zip-ridge-arms.webp', alt: _t('A guest flying arms out from the ridge, the valley below'), position: 'center 45%' },
  'combo:0': { src: '/images/quad-river.webp', alt: _t('A guest driving a quad through a river crossing'), position: 'center 40%' },
  'combo:1': { src: '/images/map/zip-valley-kick.webp', alt: _t('A guest kicking her feet up on the Sky Pulse Tour'), position: '60% 40%' },
};
/** Purple text on the light accents, white on the dark ones. */
const fgOn = (c: string) => (['#7333FF', '#340057'].includes(c.toUpperCase()) ? '#FFFFFF' : '#340057');

const photoOf = (key: string | undefined, fallback: string, name: string, t: ReturnType<typeof useT>) => {
  const p = key ? PHOTOS[key] : undefined;
  return p ? { src: p.src, alt: t(p.alt), position: p.position } : { src: fallback, alt: t('{name} package', { name }), position: 'center' };
};

export default function ExclusivePage({ onDetails }: { onDetails: (p: PackModalData) => void }) {
  const t = useT();
  const catalog = useCatalog();
  const raw = useRawCatalog();
  const { rate } = useApp();
  const rk = rate ?? 'rr';
  const { ls, ex, diamond = [], vip, addons } = catalog.PACKS;
  const combos = catalog.COMBO;

  const fromN = Math.min(...[...ls, ...ex].map((p) => rupees(p.single)).filter(Boolean), ...combos.map((c) => c[rk][0]));
  const details = (pk: PackTier, photo: { src: string }) => () => onDetails({ ...pk, img: photo.src, productKey: pk.key });
  const vipProduct = (catalog.PRODUCTS ?? []).find((p) => p.key === 'vip');
  const cineAddon = addons.find((a, i) => /cinematic/i.test(raw.PACKS.addons[i]?.t ?? a.t));

  const jumps: [string, string][] = [['ls', t('Light & Standard')], ['ex', t('Exclusive tiers')], ['vip', t('VIP Ultimate')], ['diamond', t('Diamond')], ['combo', t('Combo packages')]];

  return (
    <div data-testid="exclusive-page">
      <ClassHero
        id="exclusive-title"
        title={t('Exclusive packages')}
        chip={t('FULL ADVENTURE DAYS · SINGLE OR DOUBLE')}
        promise={t('Quad, ziplines, the Nepalese Bridge and more in one price: from a first full day in the valley to the private VIP and Diamond escapes.')}
        from={Number.isFinite(fromN) ? money(fromN) : undefined}
        currency
        photo={{ src: '/images/packages/exclusive/exclusive-quad-couple.webp', alt: t('Two guests laughing on a quad in the forest at VALLÉ'), width: 1800, height: 1200, position: '55% 35%' }}
        onBook={() => scrollToId('ls')}
        bookTestId="exclusive-hero-book"
      />
      <nav aria-label={t('Package families')} className="pk-jump">
        {jumps.map(([id, label], i) => <a key={id} href={'#' + id} onClick={(e) => { e.preventDefault(); scrollToId(id); }}><span aria-hidden>0{i + 1}</span>{label}</a>)}
      </nav>

      {/* 01 LIGHT & STANDARD */}
      <section id="ls" aria-labelledby="ls-title" className="sr-section">
        <SectionHeader id="ls-title" eyebrow={t('01 · START HERE')} title={t('Light & Standard')} intro={t('A first full day in the valley: an hour on the quad, a seven-line zipline tour, the Nepalese Bridge and lunch. Standard flies the Sky Pulse Tour, with The Signature.')} />
        <div className="sr-cards">
          {ls.map((pk, i) => {
            const photo = photoOf(pk.key, pk.img, pk.name, t);
            return (
              <ProductCard key={pk.key ?? pk.name} testId="pack-card" productKey={pk.key} name={pk.name} titleId={`ls-pkg-${i}`} photo={photo}
                tag={pk.badge ?? pk.name} tagColor={pk.color} tagFg={pk.fg ?? fgOn(pk.color)} title={pk.name} subtitle={pk.note}
                items={cardItems(pk.items, raw.PACKS.ls[i]?.items)} fallbackSingle={pk.single} fallbackDbl={pk.dbl} onDetails={details(pk, photo)} />
            );
          })}
        </div>
      </section>

      {/* 02 EXCLUSIVE TIERS */}
      <section id="ex" aria-labelledby="ex-title" className="sr-section">
        <SectionHeader id="ex-title" eyebrow={t('02 · BRONZE TO PLATINUM')} title={t('Exclusive tiers')} intro={t('The same backbone in every tier: quad, The Peak, the Nepalese Bridge, the luge and a GoPro for the day. Each step up flies a longer zipline, up to the 5.5 km Advenature Flight.')} />
        <div className="sr-cards">
          {ex.map((pk, i) => {
            const photo = photoOf(pk.key, pk.img, pk.name, t);
            return (
              <ProductCard key={pk.key ?? pk.name} testId="pack-card" productKey={pk.key} name={pk.name} titleId={`ex-pkg-${i}`} photo={photo}
                tag={pk.name} tagColor={pk.color} tagFg={fgOn(pk.color)} title={pk.hero ?? pk.name}
                items={cardItems(pk.items, raw.PACKS.ex[i]?.items)} fallbackSingle={pk.single} fallbackDbl={pk.dbl} onDetails={details(pk, photo)} />
            );
          })}
        </div>
        {addons.length > 0 && (
          <div className="pk-panel" data-testid="ex-addons">
            <Eyebrow>{t('ADD TO ANY PACKAGE')}</Eyebrow>
            <ul className="pk-addons">
              {addons.map((a) => <li key={a.t}><span>{a.t}</span><b dir="ltr">{a.p}</b></li>)}
            </ul>
          </div>
        )}
      </section>

      {/* 03 VIP ULTIMATE */}
      <section id="vip" aria-labelledby="vip-feature-title" className="sr-section">
        <FeaturePackage
          eyebrow={t('03 · ALL INCLUSIVE')}
          testId="vip-feature"
          productKey={vipProduct?.key}
          name={t('VIP Ultimate')}
          title={<>{t('VIP Ultimate')}<br /><span style={{ color: '#FFFC33' }}>{t('All Inclusive')}</span></>}
          titleId="vip-feature-title"
          chip={t('SOUVENIR GIFT OFFERED')}
          lead={t('A private guide, transfer and butler for the whole day, the Advenature Flight, the Exclusive Quad and lunch, with snacks and drinks in every outlet.')}
          items={vip}
          english={raw.PACKS.vip}
          photo={{ src: '/images/packages/exclusive/vip-bridge-couple.webp', alt: t('A couple crossing the Nepalese Bridge in harnesses, the forest below'), width: 923, height: 1384, position: 'center 40%' }}
          note={cineAddon ? <>{t('ADD-ON')}: {cineAddon.t} · <span dir="ltr">{cineAddon.p}</span></> : undefined}
          onDetails={vipProduct ? () => onDetails({ name: vipProduct.name, badge: t('ALL INCLUSIVE'), color: '#33FF74', fg: '#340057', img: '/images/packages/exclusive/vip-bridge-couple.webp', hero: vipProduct.note, productKey: vipProduct.key, items: vip, note: cineAddon ? `${cineAddon.t} · ${cineAddon.p}` : undefined, single: money(vipProduct.rr), dbl: vipProduct.dblRr != null ? money(vipProduct.dblRr) : '' }) : undefined}
        />
      </section>

      {/* 04 DIAMOND */}
      <section id="diamond" aria-labelledby="diamond-feature-0" className="sr-section">
        {diamond.map((pk, i) => (
          <FeaturePackage
            eyebrow={t('04 · THE ULTIMATE DAY · NR')}
            key={pk.key ?? pk.name}
            testId="diamond-feature"
            productKey={pk.key}
            name={pk.name}
            title={<>{pk.name}<br /><span style={{ color: '#33FF74' }}>{t('Package')}</span></>}
            titleId={`diamond-feature-${i}`}
            chip={pk.badge ?? t('SOUVENIR GIFT OFFERED')}
            lead={t('Everything in the VIP day, plus a stone-cooking lunch at Le Chamouzé, a three-hour hunting expedition and a cinematic film of your whole visit.')}
            items={pk.items}
            english={raw.PACKS.diamond?.[i]?.items}
            photo={{ src: '/images/packages/exclusive/diamond-zipline-flight.webp', alt: t('A guest flying superman-style on a zipline over the green valley'), width: 1650, height: 1080, position: 'center 35%' }}
            mosaic={[
              { src: '/images/packages/exclusive/diamond-lunch-waterfall.webp', alt: t('Lunch for two on the Le Chamouzé terrace facing the waterfall'), width: 1528, height: 1032, position: 'center 40%' },
              { src: '/images/expedition-raptor-ocean.webp', alt: t('The expedition truck on a track above the ocean'), width: 1800, height: 1200, position: 'center 55%' },
              { src: '/images/luge-duo-curve.webp', alt: t('Two guests racing luge karts through a bend'), width: 1800, height: 1200, position: 'center 40%' },
            ]}
            note={pk.note}
            blockedText={t('The Diamond package is sold at the visitor rate. You are browsing at the resident rate.')}
            fallbackSingle={pk.single}
            fallbackDbl={pk.dbl}
            onDetails={() => onDetails({ ...pk, img: '/images/packages/exclusive/diamond-zipline-flight.webp', productKey: pk.key })}
          />
        ))}
      </section>

      {/* 05 COMBOS */}
      <section id="combo" aria-labelledby="combo-title" className="sr-section">
        <SectionHeader id="combo-title" eyebrow={t('05 · QUAD + ZIPLINE, ONE PRICE')} title={t('Combo packages')} intro={t('An hour on the quad track and a seven-line zipline tour, booked together at one price for one or two.')} />
        <div className="sr-cards">
          {combos.map((c, i) => {
            const photo = photoOf(c.key, '/images/quad-river.webp', c.name, t);
            return (
              <ProductCard key={c.key ?? c.name} testId="combo-card" productKey={c.key} name={c.name} titleId={`combo-pkg-${i}`} photo={photo}
                tag={c.name} tagColor={c.color} tagFg={fgOn(c.color)} title={c.name} bookLabel={t('Book this combo')}
                items={cardItems(c.items, raw.COMBO[i]?.items)} fallbackSingle={money(c[rk][0])} fallbackDbl={money(c[rk][1])} />
            );
          })}
        </div>
      </section>

      <GoodToKnow
        id="exclusive-know-title"
        items={[
          { icon: Users, title: t('Single or double'), text: t('The single price is for one guest; the double price is for two guests booked together.') },
          { icon: IdCard, title: t('Driving the quad'), text: t('A driving licence is required to drive the quad. Passengers are welcome.') },
          { icon: Footprints, title: t('What to wear'), text: t('Closed shoes for the ziplines, and clothes that can take some mud. Ziplines are weather dependent.') },
          { icon: CalendarDays, title: t('Validity'), text: t('1 July 2026 to 30 June 2027') },
        ]}
      />
    </div>
  );
}

/** The premium treatment of VIP Ultimate and Diamond: big photo (and a mosaic), all inclusions in two columns, the prices and the actions. */
function FeaturePackage({ eyebrow, testId, productKey, name, title, titleId, chip, lead, items, english, photo, mosaic, note, blockedText, fallbackSingle, fallbackDbl, onDetails }: {
  eyebrow: string; testId: string; productKey?: string; name: string; title: ReactNode; titleId: string; chip: string; lead?: string;
  items: PackItem[]; english?: PackItem[]; photo: HeroPhoto; mosaic?: HeroPhoto[]; note?: ReactNode; blockedText?: string;
  fallbackSingle?: string; fallbackDbl?: string; onDetails?: () => void;
}) {
  const t = useT();
  const b = useProductBooking(productKey);
  const single = b.single ?? fallbackSingle;
  const dbl = b.product ? b.dbl : fallbackDbl;
  return (
    <article className="pk-feature" data-testid={testId} data-key={productKey} aria-labelledby={titleId}>
      <div className="pk-feature-left">
        <div className="pk-feature-photo">
          <Img src={photo.src} alt={photo.alt} surface="dark" width={photo.width} height={photo.height} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: photo.position }} />
        </div>
        {mosaic && (
          <div className="pk-feature-mosaic">
            {mosaic.map((m) => (
              <div key={m.src}><Img src={m.src} alt={m.alt} surface="dark" width={m.width} height={m.height} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: m.position }} /></div>
            ))}
          </div>
        )}
      </div>
      <div className="pk-feature-body">
        <Eyebrow color="#33FF74">{eyebrow}</Eyebrow>
        <h2 id={titleId} style={{ ...DISPLAY, margin: '14px 0 0', fontSize: 'clamp(40px,4.6vw,64px)', lineHeight: 0.88, color: '#FFFFFF' }}>{title}</h2>
        {lead && <p className="sr-promise" style={{ marginTop: 16 }}>{lead}</p>}
        <span className="sr-age" style={{ background: '#FFFC33', color: '#340057', marginTop: 16 }}>{chip}</span>
        <Eyebrow color="#33FF74" className="sr-card-label">{t('WHAT IS INCLUDED')}</Eyebrow>
        <ol className="sr-incl pk-feature-incl">
          {items.map((it, i) => {
            const Icon = inclusionIcon(english?.[i]?.t ?? it.t);
            const [text, hint] = splitDuration(it.t);
            return (
              <li key={it.t}>
                <span aria-hidden className="sr-incl-n">{i + 1}</span>
                <Icon aria-hidden className="sr-incl-icon" strokeWidth={1.9} />
                <span className="sr-incl-text">{text}</span>
                {hint && <span className="sr-chip">{hint}</span>}
              </li>
            );
          })}
        </ol>
        {single && (
          <div className="pk-price-band">
            <div>
              <Eyebrow color="rgba(255,255,255,.75)">{dbl ? t('SINGLE') : t('PER PERSON')}</Eyebrow>
              <div data-testid={testId + '-single'} dir="ltr" style={{ ...PRICE, fontSize: 'clamp(36px,3.6vw,48px)', lineHeight: 1, color: '#FFFC33', marginTop: 4, unicodeBidi: 'isolate' }}>{single}</div>
            </div>
            {dbl && (
              <div>
                <Eyebrow color="rgba(255,255,255,.75)">{t('DOUBLE · 2 PEOPLE')}</Eyebrow>
                <div data-testid={testId + '-double'} dir="ltr" style={{ ...PRICE, fontSize: 'clamp(36px,3.6vw,48px)', lineHeight: 1, color: '#FFFFFF', marginTop: 4, unicodeBidi: 'isolate' }}>{dbl}</div>
              </div>
            )}
            <div className="sr-from-note">{t('VAT inclusive')}{b.product?.rateOnly === 'nr' && <> · {t('VISITOR RATE · NR')}</>}</div>
          </div>
        )}
        {note && <p className="pk-sub" style={{ color: 'rgba(255,255,255,.8)', fontFamily: "'Chivo Mono',monospace", fontSize: 11.5, letterSpacing: '.06em', marginTop: 14 }}>{note}</p>}
        <div style={{ width: '100%', marginTop: 4 }}>
          <BookActions productKey={productKey} name={name} onDetails={onDetails} bookTestId={testId + '-book'} blockedText={blockedText} />
        </div>
      </div>
    </article>
  );
}
