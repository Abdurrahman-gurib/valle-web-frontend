import { Link } from 'react-router-dom';
import { Clapperboard, Images, Printer, Ticket, Users } from 'lucide-react';
import { Fwd } from '@/components/ui/arrows';
import { Img } from '../../components/Img';
import { useCatalog } from '../../store/CatalogContext';
import { useApp } from '../../store/AppStore';
import { paths, useGoto } from '../../lib/nav';
import { money } from '../../lib/format';
import { _t, useT } from '../../i18n';
import type { CineItem } from '../../types';
import { photoTierLabel } from '../../lib/photoTier';
import { ClassHero } from './ClassHero';
import { ProductCard } from './PackageCard';
import { GoodToKnow } from './GoodToKnow';
import { SupportPanel } from './SupportPanel';
import { Eyebrow, H2, SectionHeader, cover, rupees, scrollToId, useProductBooking, useValidityItem } from './shared';

/**
 * The photo & video class page (/packages/photo-video): the park photographer's
 * tiers (PHOTO, per rate), the cinematic experience (CINE) and the Waterfall
 * Swing ('swing' activity, options from PL.swing) with stills from a real shoot.
 */

/** Guests as the photographer catches them on each kind of activity. */
const TIER_PHOTOS = [
  { src: '/images/map/bridge-smile.webp', alt: _t('A guest smiling for the camera on the Nepalese Bridge'), position: 'center 30%' },
  { src: '/images/luge-joy.webp', alt: _t('A guest laughing on the luge, caught close up'), position: 'center 30%' },
  { src: '/images/map/quad-duo-laugh.webp', alt: _t('Two guests in helmets taking a selfie on their quad ride'), position: 'center 35%' },
  { src: '/images/shoot/waterfalls-05.webp', alt: _t('A guest posing on a rock in front of a waterfall'), position: '55% 45%' },
];
const GALLERY = ['cine-02', 'cine-03', 'cine-04', 'cine-06'];

export default function PhotoVideoPage() {
  const t = useT();
  const validity = useValidityItem();
  const catalog = useCatalog();
  const app = useApp();
  const goto = useGoto();
  const rk = app.rate ?? 'rr';
  const tiers = catalog.PHOTO[rk].tiers;
  const addons = catalog.PHOTO[rk].addons;
  const swingRows = catalog.PL.swing ?? [];
  const swing = catalog.ACTS.find((a) => a.id === 'swing');
  // the swing options are sold as the 'swing' experience below, not twice
  const cine = catalog.CINE.filter((c) => !swingRows.some((r) => r.n === c.n));
  const from = tiers.length ? tiers.reduce((a, b) => (rupees(b.single) < rupees(a.single) ? b : a)).single : undefined;
  const bookSwing = (n: string) => { if (!app.isSelected('swing', n)) app.toggleSel('swing', n); goto.booking(); };
  const jumps: [string, string][] = [['photo', t('Photo packages')], ['cine', t('Cinematic experience')], ['swing', swing?.name ?? t('The Waterfall Swing')]];

  return (
    <div data-testid="photo-page">
      <ClassHero
        id="photo-title"
        title={t('Photo & video')}
        chip={t('PARK PHOTOGRAPHER · CINEMATIC FILM')}
        promise={t('Keep the day: the park photographer at your activities, a cinematic film of your visit or the Waterfall Swing shoot. Edited photos and film of your day, delivered on your ticket page.')}
        from={from ? money(rupees(from)) : undefined}
        fromNote={t('single · VAT inclusive')}
        currency
        photo={{ src: '/images/shoot/cine-01.webp', alt: t('A guest in a red dress on the swing beside the waterfall'), width: 1600, height: 899, position: '68% 40%' }}
        onBook={() => scrollToId('photo')}
        bookTestId="photo-hero-book"
      />
      <nav aria-label={t('Package families')} className="pk-jump">
        {jumps.map(([id, label], i) => <a key={id} href={'#' + id} onClick={(e) => { e.preventDefault(); scrollToId(id); }}><span aria-hidden>0{i + 1}</span>{label}</a>)}
      </nav>

      {/* 01 PHOTO PACKAGES */}
      <section id="photo" aria-labelledby="photo-packages-title" className="sr-section">
        <SectionHeader id="photo-packages-title" eyebrow={t('01 · 1 JULY 2026 TO 30 JUNE 2027')} title={t('Photo packages')} intro={t('Choose how many activities the park photographer follows. Every photo captured is yours, with one print included.')} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 22 }}>
          <div className="pk-rate" role="group" aria-label={t('Rate')}>
            <button type="button" aria-pressed={rk === 'rr'} onClick={() => app.setRate('rr')}>{t('Resident')}</button>
            <button type="button" aria-pressed={rk === 'nr'} onClick={() => app.setRate('nr')}>{t('Visitor')}</button>
          </div>
          <Eyebrow>{rk === 'rr' ? t('RESIDENT PRICES') : t('VISITOR PRICES')}</Eyebrow>
        </div>
        <div className="sr-cards-4">
          {tiers.map((ph, i) => {
            const p = TIER_PHOTOS[i % TIER_PHOTOS.length];
            return (
              <ProductCard key={ph.key ?? ph.name} compact testId="photo-tier" productKey={ph.key} name={photoTierLabel(ph.act)} titleId={`photo-tier-${i}`}
                photo={{ src: p.src, alt: t(p.alt), position: p.position }} tag={t('PARK PHOTOGRAPHER')} tagColor={ph.color} title={photoTierLabel(ph.act)}
                items={[{ text: t('All captured photos'), english: 'All captured photos' }, { text: t('1 print included'), english: '1 print included' }]}
                fallbackSingle={ph.single} fallbackDbl={ph.dbl} bookTestId="photo-book" bookLabel={t('Book this photo pack')} />
            );
          })}
        </div>
        <div className="pk-panel">
          <Eyebrow>{t('PHOTO ADD-ONS')}</Eyebrow>
          <ul className="pk-addons">
            {addons.map((a) => <li key={a.t}><span>{a.t}</span><b dir="ltr">{a.p}</b></li>)}
          </ul>
        </div>
      </section>

      {/* 02 CINEMATIC EXPERIENCE */}
      <div id="cine">
        <SupportPanel id="cine-title" testId="cine-panel" photo={{ src: '/images/shoot/cine-07.webp', alt: t('A guest smiling by the river, filmed during a cinematic shoot'), width: 1600, height: 899, position: '45% 35%' }}>
          <Eyebrow>{t('02 · SAME PRICE FOR EVERYONE')}</Eyebrow>
          <h2 id="cine-title" style={H2}>{t('Cinematic experience')}</h2>
          <p className="sr-lunch-intro">{t('A dedicated shooter follows your day: the koi pond, the swing over the valley, the ziplines. You get an edited cinematic reel and the stills, delivered on your ticket page.')}</p>
          <ul className="pk-rows" style={{ width: '100%', marginTop: 20 }}>
            {cine.map((c) => <CineRow key={c.key ?? c.n} item={c} />)}
          </ul>
          <a href="https://api.whatsapp.com/send/?phone=23052928841" target="_blank" rel="noopener" className="sr-link">{t('Book a shooter for my day →')}</a>
        </SupportPanel>
      </div>

      {/* 03 THE WATERFALL SWING */}
      <div id="swing">
        <SupportPanel id="swing-title" testId="swing-panel" reverse photo={{ src: '/images/shoot/cine-05.webp', alt: t('A guest in a flowing red dress on the Waterfall Swing'), width: 1600, height: 899, position: '75% 40%' }}>
          <Eyebrow>{t('03 · BY THE FALLS')}</Eyebrow>
          <h2 id="swing-title" style={H2}>{swing?.name ?? t('The Waterfall Swing')}</h2>
          {swing && <p className="sr-lunch-intro">{swing.blurb}</p>}
          <ul className="pk-rows" style={{ width: '100%', marginTop: 20 }}>
            {swingRows.map((r) => {
              const on = app.isSelected('swing', r.n);
              return (
                <li key={r.n} data-testid="swing-row">
                  <span>{t(r.n)}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <b dir="ltr">{money(rk === 'nr' ? r.nr : r.rr)}</b>
                    <button type="button" data-testid="swing-book" className="vbtn vbtn-secondary vbtn-sm" aria-pressed={on} onClick={() => bookSwing(r.n)} aria-label={t('Book {name}', { name: t(r.n) })}>{on ? t('In my day') : t('Book')}</button>
                  </span>
                </li>
              );
            })}
          </ul>
          <Link to={paths.detail('swing')} className="sr-link">{t('See the Waterfall Swing')} <Fwd /></Link>
        </SupportPanel>
        <div data-testid="cine-gallery" className="pk-gallery">
          {GALLERY.map((g) => (
            <div key={g}><Img src={`/images/shoot/${g}.webp`} sizes="(max-width: 900px) 50vw, 25vw" alt={t('Cinematic shoot at Vallé: the swing by the waterfall')} width={1600} height={899} style={cover('65% 35%')} /></div>
          ))}
        </div>
      </div>

      <GoodToKnow
        id="photo-know-title"
        fine={t('ALL PRICES VAT INCLUSIVE · PHOTOS ARE NON REFUNDABLE · T&C APPLY')}
        items={[
          { icon: Ticket, title: t('How you get them'), text: t('Edited photos and film of your day are delivered on your ticket page.') },
          { icon: Users, title: t('Single or double'), text: t('The single price is for one guest; the double price is for two guests booked together.') },
          { icon: Printer, title: t('Prints'), text: t('One print is included with every photo package; extra prints are in the add-ons.') },
          validity,
        ]}
      />
    </div>
  );
}

/** One cinematic item with its own Book button (product:<key> in My Day). */
function CineRow({ item }: { item: CineItem }) {
  const t = useT();
  const b = useProductBooking(item.key);
  return (
    <li data-testid="cine-row">
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>{/koi/i.test(item.n) ? <Images aria-hidden style={{ width: 18, height: 18, color: '#7333FF', flexShrink: 0 }} /> : <Clapperboard aria-hidden style={{ width: 18, height: 18, color: '#7333FF', flexShrink: 0 }} />}{t(item.n)}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        <b dir="ltr">{money(item.p)}</b>
        {item.key && <button type="button" data-testid="cine-book" className="vbtn vbtn-secondary vbtn-sm" aria-pressed={b.inDay} onClick={b.book} aria-label={t('Book {name}', { name: t(item.n) })}>{b.inDay ? t('In my day') : t('Book')}</button>}
      </span>
    </li>
  );
}
