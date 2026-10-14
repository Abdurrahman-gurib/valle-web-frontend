import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '../lib/utils';
import { Img } from '../components/Img';
import { Stripes } from '../components/Stripes';
import { useIsMobile } from '../hooks/useIsMobile';
import { useReveal } from '../hooks/useReveal';
import { fwd, isRtl, useT, _t } from '../i18n';
import { paths } from '../lib/nav';
import { breadcrumbs, useSeo } from '../lib/seo';
import { color } from '../styles/theme';

/**
 * /story: the full history of the valley, told in chapters with the family's
 * 1998 negatives next to today's photographs. The home page keeps a short
 * teaser (StorySection) that links here.
 */

const V = '/images/story/';

type Frame = { src: string; alt: string; caption: string; year?: string; tall?: boolean };

const CHAPTERS = [
  { id: 'land', n: '01', nav: _t('The land') },
  { id: 'colours', n: '02', nav: _t('The colours') },
  { id: 'trails', n: '03', nav: _t('First trails') },
  { id: 'gates', n: '04', nav: _t('1998, the gates open') },
  { id: 'air', n: '05', nav: _t('Into the air') },
  { id: 'guardians', n: '06', nav: _t('Guardians') },
  { id: 'today', n: '07', nav: _t('Vallé today') },
];

/** Rotated display headings pivot on the corner the text starts from. */
const pivot = () => (isRtl() ? 'right bottom' : 'left bottom');
/** Mono label: Chivo Mono 10.5px bold, letter-spaced. */
const MONO = 'font-mono text-[10.5px] font-bold tracking-[.14em]';
/** Display heading: Barlow italic 900, uppercase, tight. */
const DISPLAY = 'font-display italic font-black tracking-[-0.01em] leading-[0.9] uppercase';
const eyebrow = 'font-mono text-[10.5px] font-bold tracking-[.16em]';
const body = 'text-[clamp(15px,1.25vw,17px)] leading-[1.7] text-[rgba(52,0,87,.78)] mt-[18px] mb-0 mx-0';
const CARD_SHADOW = 'shadow-[0_18px_40px_-22px_rgba(52,0,87,.45)]';
const IMG_FILL: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' };

/** A vintage print: white border, slight tilt, mono caption and a year tag. */
function Polaroid({ f, tilt, big }: { f: Frame; tilt: number; big?: boolean }) {
  const t = useT();
  return (
    <figure
      className="m-0 bg-[#FFFDF7] pt-[10px] px-[10px] pb-3 rounded-[6px] shadow-[0_14px_34px_-18px_rgba(52,0,87,.7)] hover:shadow-[0_26px_50px_-18px_rgba(52,0,87,.45)] [transform:rotate(var(--tilt))_translateY(0px)] hover:[transform:rotate(0deg)_translateY(-6px)] [transition:transform_.28s_cubic-bezier(.2,.7,.2,1),box-shadow_.28s_cubic-bezier(.2,.7,.2,1)] w-full box-border"
      style={{ '--tilt': `${tilt}deg` } as CSSProperties}
    >
      <div className={cn('relative overflow-hidden bg-[#E9DFCB]', f.tall ? 'aspect-[3/4]' : 'aspect-[4/3]')}>
        <Img
          src={f.src}
          alt={f.alt}
          sizes={big ? '(max-width: 1080px) 92vw, 640px' : '(max-width: 1080px) 46vw, 320px'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'sepia(.14) contrast(1.03) saturate(.95)' }}
        />
        {f.year && (
          <span className="absolute top-[10px] start-[10px] font-mono text-[10px] font-bold tracking-[.14em] bg-valle-yellow text-valle-purple py-[5px] px-2 rounded-[8px]">{f.year}</span>
        )}
      </div>
      <figcaption className="font-mono font-normal text-[11px] tracking-[.08em] text-[rgba(52,0,87,.7)] mt-[10px] leading-[1.4]">
        {f.caption}
        {f.year && <span className="text-[rgba(52,0,87,.4)]"> · {t('FAMILY ARCHIVE')}</span>}
      </figcaption>
    </figure>
  );
}

/** Two to four prints scattered on a tinted mat. */
function Prints({ frames, flip }: { frames: Frame[]; flip?: boolean }) {
  const isMobile = useIsMobile();
  const tilts = [-3, 2.5, -1.5, 3];
  const cols = frames.length === 1 ? 'grid-cols-[1fr]' : 'grid-cols-[1fr_1fr]';
  return (
    <div data-reveal-kids="1" className={cn(
      'grid items-start rounded-[24px]', cols,
      isMobile ? 'gap-[14px] p-[14px]' : 'gap-[22px] p-[clamp(18px,2.4vw,34px)]',
      flip ? 'bg-[#FFF6E8]' : 'bg-[#F7F3FF]',
    )}>
      {frames.map((f, i) => (
        <div key={f.src} className={i % 2 === 1 && !isMobile ? 'mt-[34px]' : 'mt-0'}>
          <Polaroid f={f} tilt={tilts[i % tilts.length]} big={frames.length === 1} />
        </div>
      ))}
    </div>
  );
}

/** One chapter: numbered eyebrow, rotated display heading, copy, and its prints. */
function Chapter({ id, n, kicker, title, children, frames, flip, extra }: {
  id: string; n: string; kicker: string; title: ReactNode; children: ReactNode; frames: Frame[]; flip?: boolean; extra?: ReactNode;
}) {
  const isMobile = useIsMobile();
  const text = (
    <div data-reveal="1" className="self-center">
      <span className={cn(eyebrow, 'text-[rgba(52,0,87,.7)]')}>{n} · {kicker}</span>
      <h2 className={cn(DISPLAY, 'text-[clamp(32px,4.2vw,56px)] text-valle-purple mt-[14px] mb-0 mx-0 [transform:rotate(-3deg)]')} style={{ transformOrigin: pivot() }}>
        {title}
      </h2>
      {children}
    </div>
  );
  return (
    <section id={id} className="scroll-mt-[120px] mt-[clamp(56px,8vw,110px)]">
      <div className={cn('grid items-center', isMobile ? 'grid-cols-[1fr] gap-[26px]' : 'grid-cols-[1fr_1.15fr] gap-[clamp(28px,4vw,64px)]')}>
        {flip && !isMobile ? <Prints frames={frames} flip /> : null}
        {text}
        {flip && !isMobile ? null : <Prints frames={frames} flip={flip} />}
      </div>
      {extra}
    </section>
  );
}

/** Drag the handle: the 1998 bare earth on one side, today's trails on the other. */
function ThenNow() {
  const t = useT();
  const [pos, setPos] = useState(52);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromX = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.max(4, Math.min(96, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <div data-reveal="1" className="mt-[clamp(28px,4vw,48px)]">
      <div className="flex justify-between items-baseline gap-3 flex-wrap">
        <span className={cn(eyebrow, 'text-valle-red')}>{t('THEN AND NOW · DRAG THE HANDLE')}</span>
        <span className="font-mono text-[10.5px] font-normal tracking-[.14em] text-[rgba(52,0,87,.7)]">{t('SAME HILL, 1998 AND TODAY')}</span>
      </div>
      <div
        ref={box}
        onPointerDown={(e) => { dragging.current = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); setFromX(e.clientX); }}
        onPointerMove={(e) => { if (dragging.current) setFromX(e.clientX); }}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
        className={cn('relative mt-[14px] rounded-[24px] overflow-hidden aspect-video bg-valle-lilac cursor-ew-resize touch-pan-y select-none', CARD_SHADOW)}
      >
        <Img src="/images/23colouredearth.avif" alt={t('The 23 Coloured Earth today, with its trails and viewpoints')} style={IMG_FILL} />
        <Img src={V + '1998-coloured-earth-hill.webp'} alt={t('The same slope in 1998, bare earth before any trail')} style={{ ...IMG_FILL, filter: 'sepia(.14) contrast(1.03)', clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
        <div className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_0_1px_rgba(52,0,87,.25)]" style={{ left: `calc(${pos}% - 2px)` }} />
        <div
          role="slider"
          aria-label={t('Compare 1998 with today')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setPos((p) => Math.max(4, p - 4));
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setPos((p) => Math.min(96, p + 4));
          }}
          className="absolute top-1/2 w-[52px] h-[52px] -mt-[26px] rounded-[50%] bg-valle-red text-white grid place-items-center shadow-[0_10px_28px_-6px_rgba(255,51,88,.5)] font-mono font-bold tracking-[.14em] text-[14px] outline-offset-[3px]"
          style={{ left: `calc(${pos}% - 26px)` }}
        >⇔</div>
        <span className={cn('absolute top-[14px] left-[14px] bg-valle-yellow text-valle-purple py-[6px] px-[9px] rounded-[8px]', MONO)}>1998</span>
        <span className={cn('absolute top-[14px] right-[14px] bg-valle-green text-valle-purple py-[6px] px-[9px] rounded-[8px]', MONO)}>{t('TODAY')}</span>
      </div>
    </div>
  );
}

function UniqueCard({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="bg-white rounded-[18px] pt-[22px] px-[22px] pb-5 shadow-[0_0_0_1.5px_#EBE2FF] hover:shadow-[0_26px_50px_-18px_rgba(52,0,87,.45)] hover:[transform:translateY(-6px)] [transition:transform_.28s_cubic-bezier(.2,.7,.2,1),box-shadow_.28s_cubic-bezier(.2,.7,.2,1)] flex flex-col gap-[10px]">
      <span className={cn(DISPLAY, 'text-[30px] text-valle-red')}>{n}</span>
      <div className={cn(DISPLAY, 'text-[clamp(20px,2vw,24px)] text-valle-purple')}>{title}</div>
      <p className="text-[14px] leading-[1.6] text-[rgba(52,0,87,.72)] m-0">{text}</p>
    </div>
  );
}

function Pill({ label, href, primary }: { label: string; href: string; primary?: boolean }) {
  return (
    <a href={href} className={cn(
      'press inline-block font-sans font-bold text-[15px] py-[14px] px-[26px] rounded-[999px] hover:[transform:translateY(-1px)] [transition:transform_.18s_cubic-bezier(.2,.7,.2,1),background_.18s_cubic-bezier(.2,.7,.2,1)]',
      primary ? 'bg-[#D91E44] hover:bg-[#B8163A] shadow-[0_10px_28px_-6px_rgba(255,51,88,.5)]' : 'bg-[rgba(255,255,255,.12)] shadow-[inset_0_0_0_1.5px_rgba(255,255,255,.4)]',
    )} style={{ color: '#FFFFFF', textDecoration: 'none' }}>{label}</a>
  );
}

export default function StoryPage() {
  const t = useT();
  const isMobile = useIsMobile();
  const ref = useReveal<HTMLElement>();
  const [active, setActive] = useState('land');

  useSeo({
    title: t('Our story · From a tea field to the sky · VALLÉ Advenature™ Park'),
    description: t('How a family tea plantation in Chamouny became La Vallée des Couleurs in 1998 and then Vallé Advenature Park: the 23 Coloured Earth, three waterfalls, hand-cut trails, ziplines and the people who keep the valley.'),
    canonicalPath: '/story',
    image: '/images/story/1998-tea-field-ploughing.webp',
    jsonLd: [breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Our story', path: '/story' }])],
  });

  // highlight the chapter in view in the sticky rail
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => { if (en.isIntersecting) setActive((en.target as HTMLElement).id); });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
    CHAPTERS.forEach((c) => { const el = document.getElementById(c.id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  const arrow = fwd();

  return (
    <main ref={ref} className="max-w-[1320px] mx-auto pt-[104px] px-[clamp(16px,3.5vw,40px)] pb-0">
      {/* ---- hero ---- */}
      <section data-reveal="1" className={cn('relative bg-valle-deep rounded-[24px] overflow-hidden', CARD_SHADOW, isMobile ? 'min-h-[520px]' : 'min-h-[600px]')}>
        <Img src={V + '1998-tea-field-ploughing.webp'} alt={t('Tractors ploughing the old tea rows in the valley, 1998')} priority surface="dark" sizes="100vw"
          style={{ ...IMG_FILL, filter: 'sepia(.2) contrast(1.05)', opacity: 0.9 }} />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(38,0,64,.96)_18%,rgba(38,0,64,.35)_60%,rgba(38,0,64,.15))]" />
        <Stripes height={10} style={{ position: 'relative' }} />
        <div className={cn('relative p-[clamp(24px,3.4vw,48px)] flex flex-col justify-end box-border', isMobile ? 'min-h-[500px]' : 'min-h-[580px]')}>
          <span className={cn(eyebrow, 'text-valle-yellow')}>{t('OUR STORY · CHAMOUNY, MAURITIUS · SINCE 1998')}</span>
          <h1 className={cn(DISPLAY, 'text-[clamp(42px,7vw,104px)] text-white mt-[14px] mb-0 mx-0 [transform:rotate(-4deg)] max-w-[900px]')} style={{ transformOrigin: pivot() }}>
            {t('From a tea field')}<br /><span className="text-valle-green">{t('to the sky.')}</span>
          </h1>
          <p className="text-[clamp(15px,1.3vw,18px)] leading-[1.6] text-[rgba(255,255,255,.82)] mt-[22px] mb-0 mx-0 max-w-[620px]">
            {t('A family plantation, a valley that turned out to be painted in twenty-three colours, trails cut by hand, and a father who decided that people should be able to fly over all of it. This is how the valley became Vallé.')}
          </p>
          <div className="flex gap-2 flex-wrap mt-[26px]">
            {[t('1998 · FIRST ROLL OF FILM'), t('23 COLOURS OF EARTH'), t('3 WATERFALLS'), t('5.5 KM OF ZIPLINES')].map((chip) => (
              <span key={chip} className="font-mono text-[10.5px] font-normal tracking-[.12em] text-[rgba(255,255,255,.88)] bg-[rgba(255,255,255,.12)] rounded-[8px] py-[9px] px-3">{chip}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ---- chapter rail ---- */}
      <nav aria-label={t('Chapters')} className={cn('sticky z-[5] mt-[18px] bg-[rgba(255,255,255,.92)] backdrop-blur-[8px] rounded-[999px] shadow-[0_0_0_1.5px_#EBE2FF] p-[6px] overflow-x-auto [scrollbar-width:none]', isMobile ? 'top-16' : 'top-[84px]')}>
        <div className="flex gap-1 min-w-max">
          {CHAPTERS.map((c) => {
            const on = active === c.id;
            return (
              <a key={c.id} href={'#' + c.id} onClick={(e) => { e.preventDefault(); document.getElementById(c.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                className={cn(MONO, 'whitespace-nowrap py-[10px] px-[14px] rounded-[999px] [transition:background_.18s_cubic-bezier(.2,.7,.2,1),color_.18s_cubic-bezier(.2,.7,.2,1)]', on ? 'bg-valle-purple' : 'bg-transparent')}
                style={{ color: on ? '#FFFFFF' : '#340057', textDecoration: 'none' }}>
                <span className={on ? 'text-valle-yellow' : 'text-valle-red'}>{c.n}</span> {t(c.nav).toUpperCase()}
              </a>
            );
          })}
        </div>
      </nav>

      {/* ---- 01 the land ---- */}
      <Chapter id="land" n="01" kicker={t('THE LAND')} title={<>{t('A tea field')}<br /><span className="text-valle-violet">{t('with a secret.')}</span></>}
        frames={[
          { src: V + '1998-tea-field-tractors-s.webp', alt: t('Two tractors turning the soil of the old tea plantation'), caption: t('The tea rows come out'), year: '1998' },
          { src: V + '1998-forest-scouting-group-s.webp', alt: t('The family and friends resting in the forest on an early scouting walk'), caption: t('The first scouting walks through the forest'), year: '1998' },
          { src: V + '1998-walking-the-ridges-s.webp', alt: t('A small group walking the open ridges above the valley'), caption: t('Walking the ridges to find the way down'), year: '1998' },
          { src: V + '1998-team-on-the-hill-s.webp', alt: t('A group photo on the hill with the south coast behind'), caption: t('The team that walked every trail first'), year: '1998' },
        ]}>
        <p className={body}>{t('Mare Anguilles, Chamouny, in the green south of Mauritius. For generations this valley was a tea plantation: rows of bushes on the slopes, a river at the bottom, the Savanne mountains at its back and the ocean on the horizon.')}</p>
        <p className={body}>{t('Decades ago a young father stepped onto his family\'s land and saw more than tea. He walked it for months, through forest nobody had crossed in years, down to a river that had to be forded on foot, and he began to notice that where the bushes were cleared, the ground showed its true self.')}</p>
      </Chapter>

      {/* ---- 02 the colours ---- */}
      <Chapter id="colours" n="02" kicker={t('THE COLOURS')} flip title={<>{t('Twenty-three shades')}<br /><span className="text-valle-red">{t('of the island\'s fire.')}</span></>}
        frames={[
          { src: V + '1998-coloured-earth-raw-s.webp', alt: t('The bare coloured earth below the forested hill in 1998'), caption: t('Bare earth below the hill, before a single trail'), year: '1998' },
          { src: V + '1998-coloured-earth-visitors-s.webp', alt: t('The first visitors standing on the coloured earth'), caption: t('The first visitors step onto the colours'), year: '1998' },
        ]}
        extra={<ThenNow />}>
        <p className={body}>{t('Under the roots lay volcanic earth in twenty-three colours: deep reds, golden yellows, purples, blues and greens, laid down by ash and minerals millions of years ago. Nothing is painted and nothing is added; every shower of rain simply reveals a little more.')}</p>
        <p className={body}>{t('The family chose to protect the slope rather than plant over it, and the discovery gave the place its first name: La Vallée des Couleurs, the valley of colours.')}</p>
      </Chapter>

      {/* ---- 03 first trails ---- */}
      <Chapter id="trails" n="03" kicker={t('THE FIRST TRAILS')} title={<>{t('Cut by hand,')}<br /><span className="text-valle-violet">{t('one pick at a time.')}</span></>}
        frames={[
          { src: V + '1998-workers-with-picks-s.webp', alt: t('Two workers with picks cutting a path across the coloured earth'), caption: t('Picks on the coloured earth: the first path'), year: '1998' },
          { src: V + '1998-digging-the-lake-s.webp', alt: t('A backhoe digging the lake below the hill'), caption: t('Digging the lake under the hill'), year: '1998' },
          { src: V + '1998-pickup-river-crossing-s.webp', alt: t('A pickup truck crossing the river ford into the valley'), caption: t('Fording the river, the only way in'), year: '1998' },
          { src: V + '1998-vacoas-waterfall-s.webp', alt: t('Vacoas waterfall seen through the branches in 1998'), caption: t('Vacoas waterfall, reached for the first time'), year: '1998' },
          { src: V + '1998-chamouze-waterfall-s.webp', alt: t('Chamouzé waterfall dropping into its pool'), caption: t('Chamouzé, before the restaurant beside it'), year: '1998', tall: true },
          { src: V + '1998-terraces-and-cascade-s.webp', alt: t('Newly planted terraces and a cascade on the hillside'), caption: t('Terraces planted on the slope, a cascade built down the middle'), year: '1998' },
        ]}>
        <p className={body}>{t('There was no road into the valley, only a river to ford. The first trails were cut with picks and shovels. Then a backhoe shaped the paths around the earth, so the colours could be seen without being walked on, and dug the lake below the hill.')}</p>
        <p className={body}>{t('A natural path led to a waterfall, so the founder built the first quad trail around it. Three waterfalls, Vacoas, Chamouzé and Cheveux d\'Ange, were opened up one after the other so that anyone could reach them.')}</p>
      </Chapter>

      {/* ---- 04 the gates ---- */}
      <Chapter id="gates" n="04" kicker={t('OPENING DAY')} flip title={<>{t('1998. The valley')}<br /><span className="text-valle-red">{t('says bonjour.')}</span></>}
        frames={[
          { src: V + '1998-river-ford-gate-s.webp', alt: t('A 4x4 full of visitors splashing through the river ford at the park gate'), caption: t('The gate was a river ford, and everyone loved the splash'), year: '1998' },
          { src: V + '1998-palisade-entrance-s.webp', alt: t('Visitors walking through the wooden palisade entrance'), caption: t('The palisade entrance on an opening weekend'), year: '1998' },
          { src: V + '1998-school-trail-s.webp', alt: t('A long line of schoolchildren walking down the trail'), caption: t('Whole classes came down the trail in a single line'), year: '1998' },
          { src: V + '1998-building-the-kiosk-s.webp', alt: t('Workers thatching the first kiosk beside the reception'), caption: t('Thatching the first kiosk with the valley\'s own timber'), year: '1998' },
          { src: V + '1998-shell-museum-s.webp', alt: t('The small museum with shelves of shells and volcanic rock'), caption: t('The shell and rock museum'), year: '1998' },
          { src: V + '1998-sega-musicians-s.webp', alt: t('A sega band with an accordion and ravanne drum playing at the gate'), caption: t('A sega band at the gate, buses in the background'), year: '1998' },
        ]}>
        <p className={body}>{t('The negatives in the family archive carry the stamp of August 1998. A palisade gate, kiosks thatched with timber from the valley, a small museum of shells and volcanic rock, a hand-painted map, and a car park that filled on the first weekends.')}</p>
        <p className={body}>{t('School buses came from every corner of the island; teachers remember entire classes walking the trail down to the colours in a single line. A sega band played at the gate. The valley had become a place people came to.')}</p>
      </Chapter>

      {/* ---- 05 into the air ---- */}
      <Chapter id="air" n="05" kicker={t('INTO THE AIR')} title={<>{t('Then the valley')}<br /><span className="text-valle-violet">{t('learned to fly.')}</span></>}
        frames={[
          { src: '/images/zipline-waterfall.webp', alt: t('A guest ziplining past a waterfall'), caption: t('The Waterfall Zipline, 300 m over Chamouzé') },
          { src: '/images/bicycle-sky.webp', alt: t('Two guests riding the bicycle zipline against the sky'), caption: t('The bicycle zipline, 18 m above the lake') },
          { src: '/images/bridge-span.webp', alt: t('The Nepalese bridge strung across the forest'), caption: t('The Nepalese bridge, 80 to 100 m above the ground') },
          { src: '/images/luge-race.webp', alt: t('Two luge karts racing down the mountain track'), caption: t('The mountain luge kart') },
        ]}>
        <p className={body}>{t('From the ridges the ocean is always in view, and that is where the idea came from: people should be able to fly over this. The ziplines came line by line, until a 1.5 km Signature line crossed the estate, one of the longest in the Indian Ocean.')}</p>
        <p className={body}>{t('Quads and buggies took on the river crossings, a Nepalese bridge was strung above the canopy, a bicycle zipline rode out over the lake, and a luge kart found its curves on the mountain. Today the Advenature Flight links eleven ziplines, 5.5 km in all, into one journey across the whole park.')}</p>
      </Chapter>

      {/* ---- 06 guardians ---- */}
      <Chapter id="guardians" n="06" kicker={t('GUARDIANS')} flip title={<>{t('Built by nature,')}<br /><span className="text-valle-red">{t('kept by people.')}</span></>}
        frames={[
          { src: V + '1998-cyclone-palms-s.webp', alt: t('Palms bent flat by a cyclone over the park buildings'), caption: t('After the cyclone: the thatch went back up'), year: '1998' },
          { src: V + '1998-ebony-tree-s.webp', alt: t('A tall old ebony tree standing over the trail'), caption: t('An ebony that was already old in 1998'), year: '1998', tall: true },
          { src: '/images/valle-giant-tortoise-park-mauritius.avif', alt: t('A giant tortoise on the grass at Vallé'), caption: t('The giant tortoises, free to roam') },
          { src: '/images/endemictrees.avif', alt: t('Endemic trees along a shaded trail'), caption: t('Over 50 endemic species along the trails') },
        ]}>
        <p className={body}>{t('Cyclones have flattened the palms and the kiosks more than once. Each time the trails were cleared, the thatch went back up and the planting carried on. Over fifty species of endemic trees stand on the estate today, black ebony and bois de natte among them, many of them older than the park.')}</p>
        <p className={body}>{t('Java deer graze the grasslands, giant tortoises take their time on the lawns and a rare albino deer lives in the green zone. Nothing here was built against the land; everything was placed around it.')}</p>
      </Chapter>

      {/* ---- 07 today ---- */}
      <Chapter id="today" n="07" kicker={t('TODAY')} title={<>{t('Formerly La Vallée des Couleurs.')}<br /><span className="text-valle-violet">{t('Forever Vallé.')}</span></>}
        frames={[
          { src: '/images/home-overview.avif', alt: t('Aerial view of the 23 Coloured Earth and its trails today'), caption: t('The colours today, trails and viewpoints around them') },
          { src: '/images/chamouze-restaurant.webp', alt: t('Guests dining at Le Chamouzé beside the waterfall'), caption: t('Le Chamouzé, lunch beside the waterfall') },
          { src: '/images/peak-tower.webp', alt: t('The viewpoint tower above the south coast'), caption: t('The Peak and its view to the coast') },
          { src: '/images/quad-river.webp', alt: t('Quads crossing the river on the Adventure Track'), caption: t('The river crossings, now on four wheels') },
        ]}>
        <p className={body}>{t('The name changed to Vallé Advenature Park; the purpose never did. Advenature is the balance the valley has always had: high-pulse moments on the lines and low-pulse ones at the foot of a waterfall.')}</p>
        <p className={body}>{t('There are four places to eat, among them Le Chamouzé beside its waterfall and Kazmaël on the hill with its 360° view, a kids park, a rock garden and twenty-one experiences. Travellers voted the park a TripAdvisor Best of the Best in 2022 and 2023, a Travellers\' Choice in 2024, and it won a Sustainable Tourism Mauritius Award in 2023.')}</p>
      </Chapter>

      {/* ---- founder ---- */}
      <section data-reveal="1" className={cn('mt-[clamp(56px,8vw,110px)] bg-valle-red rounded-[24px] overflow-hidden', CARD_SHADOW)}>
        <div className={cn('grid items-stretch', isMobile ? 'grid-cols-[1fr]' : 'grid-cols-[1.1fr_.9fr]')}>
          <div className="p-[clamp(28px,4vw,56px)]">
            <span className={cn(eyebrow, 'text-valle-yellow')}>{t('A MESSAGE FROM OUR FOUNDER')}</span>
            <blockquote className={cn(DISPLAY, 'text-[clamp(30px,4vw,54px)] text-white mt-4 mb-0 mx-0 [transform:rotate(-3deg)]')} style={{ transformOrigin: pivot() }}>
              {t('"Never say adventure is impossible. Make it unforgettable!"')}
            </blockquote>
            <p className="text-[clamp(15px,1.25vw,17px)] leading-[1.7] text-[rgba(255,255,255,.9)] mt-6 mb-0 mx-0 max-w-[560px]">
              {t('"When I first set foot on this land, it wasn\'t just about the tea plantation it once was. The 23 shades of soil beneath my feet felt like an artist\'s palette, waiting to create something extraordinary. This land had a heartbeat, and we were here to listen. Whether you are soaring through the treetops or standing still in the quiet embrace of nature, know this: you are part of our story. A story still being written, with every step you take."')}
            </p>
            <div className={cn('mt-[22px]', MONO, 'text-white')}>{t('ASIFF POLIN · FOUNDER & CEO, VALLÉ ADVENATURE™ PARK')}</div>
          </div>
          <div className={cn('relative', isMobile ? 'min-h-[260px]' : 'min-h-[380px]')}>
            <Img src={V + '1998-first-track-on-the-earth.webp'} alt={t('The first track winding across the coloured earth, 1998')} surface="dark" sizes="(max-width: 1080px) 100vw, 600px"
              style={{ ...IMG_FILL, filter: 'sepia(.2) contrast(1.05)' }} />
            <div className={cn('absolute inset-0', isMobile ? 'bg-[linear-gradient(to_bottom,rgba(255,51,88,.5),rgba(255,51,88,0)_50%)]' : 'bg-[linear-gradient(to_right,rgba(255,51,88,.85),rgba(255,51,88,0)_55%)]')} />
          </div>
        </div>
      </section>

      {/* ---- what makes it unlike anywhere ---- */}
      <section className="mt-[clamp(56px,8vw,110px)]">
        <div data-reveal="1">
          <span className={cn(eyebrow, 'text-valle-red')}>{t('WHY THERE IS ONLY ONE VALLÉ')}</span>
          <h2 className={cn(DISPLAY, 'text-[clamp(32px,4.2vw,56px)] text-valle-purple mt-3 mb-0 mx-0 [transform:rotate(-3deg)]')} style={{ transformOrigin: pivot() }}>
            {t('Seven things')} <span className="text-valle-violet">{t('you will not find anywhere else.')}</span>
          </h2>
        </div>
        <div data-reveal-kids="1" className="grid [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))] gap-4 mt-[clamp(24px,3vw,40px)]">
          <UniqueCard n="01" title={t('The 23 Coloured Earth')} text={t('A volcanic slope in twenty-three natural colours, protected since the tea came out. The park was built around it, never on it.')} />
          <UniqueCard n="02" title={t('Three waterfalls, one valley')} text={t('Vacoas, Chamouzé and Cheveux d\'Ange, each reached on foot, by quad, by 4x4 or, over Chamouzé, by zipline.')} />
          <UniqueCard n="03" title={t('The 1.5 km Signature line')} text={t('One of the longest ziplines in the Indian Ocean, flown superman-style over forest, river and lake with the south coast ahead.')} />
          <UniqueCard n="04" title={t('A bicycle in the sky')} text={t('Unique in Mauritius: pedal a bicycle along a cable 18 metres above the lake, waterfall and mountains in view.')} />
          <UniqueCard n="05" title={t('A forest older than the park')} text={t('Over fifty endemic tree species, black ebony and bois de natte among them, with Java deer, giant tortoises and an albino deer living between them.')} />
          <UniqueCard n="06" title={t('Lunch beside a waterfall')} text={t('Le Chamouzé sits at the foot of its own waterfall; Kazmaël on the hill turns a juice break into a 360° view.')} />
          <UniqueCard n="07" title={t('One flight across everything')} text={t('The Advenature Flight strings eleven ziplines, 5.5 km in all, into a single journey from the colours to the lake.')} />
        </div>
      </section>

      {/* ---- numbers ---- */}
      <section data-reveal="1" className={cn('mt-[clamp(48px,6vw,80px)] bg-valle-purple rounded-[24px] p-[clamp(24px,3.4vw,44px)]', CARD_SHADOW)}>
        <div className="grid [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))] gap-[clamp(18px,3vw,36px)]">
          {[
            { n: '1998', l: t('THE GATES OPEN'), c: color.yellow },
            { n: '23', l: t('COLOURS OF EARTH'), c: color.pink },
            { n: '3', l: t('WATERFALLS'), c: color.green },
            { n: '11', l: t('ZIPLINES · 5.5 KM'), c: color.violet },
            { n: '50+', l: t('ENDEMIC TREE SPECIES'), c: color.yellow },
            { n: '21', l: t('EXPERIENCES'), c: color.green },
          ].map((s) => (
            <div key={s.l}>
              <div className={cn(DISPLAY, 'text-[clamp(36px,4.6vw,56px)]')} style={{ color: s.c }}>{s.n}</div>
              <div className={cn(MONO, 'text-[rgba(255,255,255,.75)] mt-[6px] pt-2')} style={{ borderTop: `3px solid ${s.c}` }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- cta ---- */}
      <section data-reveal="1" className={cn('mt-[clamp(40px,6vw,80px)] mx-0 mb-[clamp(56px,8vw,110px)] relative rounded-[24px] overflow-hidden min-h-[360px]', CARD_SHADOW)}>
        <Img src={V + '1998-school-trail.webp'} alt={t('A line of schoolchildren walking down the trail to the coloured earth, 1998')} surface="dark" sizes="100vw"
          style={{ ...IMG_FILL, filter: 'sepia(.2) contrast(1.05)' }} />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(38,0,64,.95)_20%,rgba(38,0,64,.4))]" />
        <div className="relative p-[clamp(28px,4vw,56px)] text-center flex flex-col items-center justify-end min-h-[360px] box-border">
          <span className={cn(eyebrow, 'text-valle-yellow')}>{t('THE NEXT CHAPTER IS YOURS')}</span>
          <h2 className={cn(DISPLAY, 'text-[clamp(32px,4.6vw,60px)] text-white mt-3 mb-0 mx-0 [transform:rotate(-3deg)]')}>
            {t('Walk the story yourself.')}
          </h2>
          <p className="text-[16px] leading-[1.6] text-[rgba(255,255,255,.82)] mt-4 mb-0 mx-0 max-w-[560px]">
            {t('The Discovery Track follows the first trails to the three waterfalls and the colours. The Advenature Flight sees all of it from the air.')}
          </p>
          <div className="flex gap-[10px] flex-wrap justify-center mt-[26px]">
            <Pill primary label={t('Book your day') + ' ' + arrow} href={paths.booking()} />
            <Pill label={t('Explore the activities')} href={paths.explore()} />
          </div>
        </div>
      </section>
    </main>
  );
}
