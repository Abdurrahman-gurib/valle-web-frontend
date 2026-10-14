import { useParams } from 'react-router-dom';
import NotFoundPage from './NotFound';
import { abs, breadcrumbs, useSeo } from '../lib/seo';
import { paths } from '../lib/nav';
import { useCatalog } from '../store/CatalogContext';
import { useGoto } from '../lib/nav';
import { useReveal } from '../hooks/useReveal';
import { StripesSm } from '../components/Stripes';
import { Img } from '../components/Img';
import { isRtl, useLang, useT } from '../i18n';
import { CarouselArrows, CarouselTrack, carouselKeys, useCarousel } from '@/components/ui/carousel';
import { TableReservation } from '../components/TableReservation';

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] tracking-[.14em] opacity-60">{label}</div>
      <div className="mt-1 font-sans text-[15px] font-semibold">{value}</div>
    </div>
  );
}

const H2 = 'm-0 origin-bottom-left -rotate-2 font-display text-[clamp(26px,3.4vw,42px)] font-black tracking-[-0.01em] uppercase italic';
const HEAD = 'flex flex-wrap items-baseline justify-between gap-4 border-0 border-b-2 border-solid border-valle-purple pb-3.5';

export default function RestaurantPage() {
  const t = useT();
  const lang = useLang();
  const gal = useCarousel();
  const ref = useReveal<HTMLElement>();
  const goto = useGoto();
  const { RESTOS } = useCatalog();
  const { id } = useParams<{ id: string }>();

  const valid = id === 'chamouze' || id === 'citronelle';
  const r = valid ? RESTOS[id as string] : undefined;
  useSeo(r ? {
    title: t('{name} · {badge} · VALLÉ Advenature™ Park', { name: r.name, badge: r.badge.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) }),
    description: r.tag + ' ' + r.cuisine + '. ' + r.hours + '.',
    canonicalPath: paths.resto(id as string),
    image: r.img,
    jsonLd: [
      breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Dine', path: '/#dine' }, { name: r.name, path: paths.resto(id as string) }]),
      { '@context': 'https://schema.org', '@type': 'Restaurant', name: r.name, image: abs(r.img), url: abs(paths.resto(id as string)), servesCuisine: r.cuisine, priceRange: r.price, description: r.about, telephone: '+230 660 44 77', address: { '@type': 'PostalAddress', streetAddress: 'B102, Mare Anguilles', addressLocality: 'Chamouny', addressCountry: 'MU' }, hasMenu: abs(r.menuPdf), openingHours: r.hours },
    ],
  } : { title: t('Restaurant not found · VALLÉ Advenature™ Park'), description: t('That restaurant is not in the valley.'), noindex: true });
  if (!r) return <NotFoundPage what={t('that restaurant')} />;

  const otherId = id === 'chamouze' ? 'citronelle' : 'chamouze';
  const other = RESTOS[otherId];
  const rGallery = (r.gallery || []).map((src) => ({ src, alt: r.name }));
  const rMenuGroups = r.menuGroups || [];
  const rMenuPdf = r.menuPdf || '';

  return (
    <main ref={ref} className="mx-auto max-w-[1180px] px-[clamp(16px,3.5vw,40px)] pt-[104px] pb-0">
      <a
        href={paths.dine()}
        onClick={(e) => { e.preventDefault(); goto.dine(); }}
        className="inline-block cursor-pointer px-0 py-2 font-[inherit] text-[14px] font-bold text-valle-violet! hover:text-valle-red!"
        style={{ textDecoration: 'none' }}
      >{t('← All dining')}</a>

      {/* Hero header */}
      <div className="relative mt-3 h-[min(52vh,480px)] min-h-[300px] overflow-hidden rounded-[24px] bg-valle-lilac">
        <Img src={r.img} alt={r.name} priority style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(31,0,51,.82),rgba(31,0,51,0)_55%)]" />
        <div className="absolute right-[clamp(18px,3vw,36px)] bottom-[clamp(18px,3vw,30px)] left-[clamp(18px,3vw,36px)] text-white">
          <span className="inline-block -rotate-4 rounded-full bg-valle-yellow px-[13px] py-[7px] font-mono text-[10.5px] font-bold tracking-[.1em] text-valle-purple">{r.badge}</span>
          <div className="mt-4 origin-bottom-left -rotate-4">
            <h1 className="m-0 font-display text-[clamp(36px,5.6vw,76px)] leading-[0.82] font-black tracking-[-0.01em] uppercase italic">{r.name}</h1>
          </div>
          <div className="mt-3.5 text-[clamp(14px,1.6vw,17px)] opacity-92">{r.tag}</div>
        </div>
      </div>

      {/* About + facts */}
      <div className="mt-[clamp(24px,4vw,40px)] grid [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))] items-start gap-[clamp(24px,4vw,48px)]">
        <div>
          <p className="m-0 text-[clamp(16px,1.8vw,18.5px)] leading-[1.65] text-valle-purple/82">{r.about}</p>
          <div className="mt-[18px] rounded-[14px] bg-[#FFFFE2] px-[18px] py-3.5 text-[14px] font-semibold text-valle-purple">{r.detail}</div>
        </div>
        <div className="overflow-hidden rounded-[20px] bg-valle-purple px-0 pt-0 pb-[26px] text-white">
          <StripesSm />
          <div className="px-[26px] pt-[22px] pb-0">
            <div className="grid grid-cols-[1fr_1fr] gap-4 font-mono">
              <Fact label={t('CUISINE')} value={r.cuisine} />
              <Fact label={t('HOURS')} value={r.hours} />
              <Fact label={t('PRICES')} value={r.price} />
              <Fact label={t('SETTING')} value={r.setting} />
            </div>
            <div className="mx-0 my-5 h-px bg-white/20" />
            <TableReservation restaurantId={id as string} restaurantName={r.name} menuGroups={rMenuGroups} />
            <a
              href="tel:+2306604477"
              className="mt-2.5 block rounded-full border-[1.5px] border-solid border-white/50 px-0 py-[13px] text-center text-[14px] font-bold"
              style={{ color: '#FFFFFF' }}
            >{t('Call')} +230 660 44 77</a>
            <div className="mt-3 text-center font-mono text-[10px] opacity-60">{t('WALK-INS WELCOME · GROUPS SHOULD RESERVE')}</div>
          </div>
        </div>
      </div>

      {/* Gallery */}
      <div className="mt-[clamp(40px,6vw,64px)]">
        <div className={HEAD}>
          <h2 className={H2}>{t('Inside the restaurant')}</h2>
          <CarouselArrows prev={gal.prev} next={gal.next} canPrev={gal.canPrev} canNext={gal.canNext} labels={{ prev: t('Previous'), next: t('Next') }} />
        </div>
        <div id="vgal" className="pt-[18px] pb-[14px]">
          <CarouselTrack viewportRef={gal.viewportRef} label={t('Inside the restaurant')} gap="gap-3" onKeyDown={carouselKeys(gal.prev, gal.next, isRtl(lang))}>
            {rGallery.map((g) => (
              <div key={g.src} className="shrink-0 grow-0 basis-[clamp(255px,36vw,375px)]">
                <Img eager src={g.src} alt={g.alt} style={{ height: 'clamp(170px,24vw,250px)', width: '100%', borderRadius: 14, objectFit: 'cover', display: 'block' }} />
              </div>
            ))}
          </CarouselTrack>
        </div>
      </div>

      {/* Menu & prices */}
      <div className="mt-[clamp(32px,5vw,52px)]">
        <div className={HEAD + ' mb-[18px]'}>
          <h2 className={H2}>{t('Menu & prices')}</h2>
          {rMenuPdf !== '' && (
            <a href={rMenuPdf} target="_blank" className="font-mono text-[12px] font-semibold tracking-[.12em]">{t('FULL MENU (PDF) ↗')}</a>
          )}
        </div>
        <div className="grid [grid-template-columns:repeat(auto-fit,minmax(295px,1fr))] items-start gap-3.5">
          {rMenuGroups.map((mg) => (
            <div key={mg.title} className="rounded-[18px] bg-white px-[22px] pt-[18px] pb-5 shadow-[0_0_0_1.5px_#EBE2FF]">
              <div className="font-mono text-[11px] font-bold tracking-[.14em] text-valle-violet">{mg.title}</div>
              {mg.items.map((mi) => (
                <div key={mi.n} className="flex items-baseline justify-between gap-3 px-0 py-[9px]" style={{ borderBottom: '1px dashed #EBE2FF' }}>
                  <div className="min-w-0">
                    <div className="text-[14.5px] font-semibold">{mi.n}</div>
                    <div className="text-[12px] leading-[1.45] text-valle-purple/60">{mi.note}</div>
                  </div>
                  <div className="font-mono text-[13px] font-bold whitespace-nowrap text-valle-purple">{mi.p}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-3.5 font-mono text-[11px] text-valle-purple/55">{t('PRICES IN MAURITIAN RUPEES, VAT INCLUSIVE · MENUS EVOLVE WITH THE SEASON')}</div>
      </div>

      {/* Also in the valley */}
      <div className="mt-[clamp(40px,6vw,64px)]">
        <div className={HEAD + ' mb-[18px]'}>
          <h2 className={H2}>{t('Also in the valley')}</h2>
        </div>
        <a
          href={paths.resto(otherId)}
          onClick={(e) => { e.preventDefault(); goto.resto(otherId); }}
          className="flex cursor-pointer flex-wrap overflow-hidden rounded-[20px] bg-white shadow-[0_0_0_1.5px_#EBE2FF] transition-[transform,box-shadow] duration-[.25s] ease-[ease] hover:shadow-[0_18px_36px_-16px_rgba(52,0,87,.4)] hover:[transform:translateY(-4px)]"
          style={{ color: 'inherit', textDecoration: 'none' }}
        >
          <div className="min-h-[200px] min-w-[260px] flex-1 bg-valle-lilac">
            <Img src={other.img} alt={other.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div className="flex min-w-[260px] flex-[1.6] flex-col justify-center px-7 py-6">
            <div className="font-display text-[26px] font-extrabold uppercase italic">{other.name}</div>
            <div className="mt-1.5 text-[14.5px] leading-[1.5] text-valle-purple/70">{other.tag}</div>
            <div className="mt-3 text-[13.5px] font-bold text-valle-violet">{t('Visit →')}</div>
          </div>
        </a>
      </div>
    </main>
  );
}
