import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Img } from '../components/Img';
import { Stripes } from '../components/Stripes';
import { useIsMobile } from '../hooks/useIsMobile';
import { useReveal } from '../hooks/useReveal';
import { useHover } from '../hooks/useHover';
import { fwd, isRtl, useT, _t } from '../i18n';
import { paths } from '../lib/nav';
import { breadcrumbs, useSeo } from '../lib/seo';
import { color, display, font, mono, motion, radius, shadow } from '../styles/theme';

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
const eyebrow: CSSProperties = { ...mono, letterSpacing: '.16em' };
const body: CSSProperties = { fontSize: 'clamp(15px,1.25vw,17px)', lineHeight: 1.7, color: 'rgba(52,0,87,.78)', margin: '18px 0 0' };

/** A vintage print: white border, slight tilt, mono caption and a year tag. */
function Polaroid({ f, tilt, big }: { f: Frame; tilt: number; big?: boolean }) {
  const t = useT();
  const [h, bind] = useHover();
  return (
    <figure
      {...bind}
      style={{
        margin: 0, background: '#FFFDF7', padding: '10px 10px 12px', borderRadius: 6,
        boxShadow: h ? shadow.lifted : '0 14px 34px -18px rgba(52,0,87,.55)',
        transform: `rotate(${h ? 0 : tilt}deg) translateY(${h ? -6 : 0}px)`,
        transition: `transform ${motion.base}, box-shadow ${motion.base}`,
        width: '100%', boxSizing: 'border-box',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: f.tall ? '3 / 4' : '4 / 3', overflow: 'hidden', background: '#E9DFCB' }}>
        <Img
          src={f.src}
          alt={f.alt}
          sizes={big ? '(max-width: 1080px) 92vw, 640px' : '(max-width: 1080px) 46vw, 320px'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'sepia(.14) contrast(1.03) saturate(.95)' }}
        />
        {f.year && (
          <span style={{
            position: 'absolute', top: 10, insetInlineStart: 10, ...mono, fontSize: 10, letterSpacing: '.14em',
            background: color.yellow, color: color.purple, padding: '5px 8px', borderRadius: radius.sm,
          }}>{f.year}</span>
        )}
      </div>
      <figcaption style={{ ...mono, fontWeight: 400, fontSize: 11, letterSpacing: '.08em', color: 'rgba(52,0,87,.7)', marginTop: 10, lineHeight: 1.4 }}>
        {f.caption}
        {f.year && <span style={{ color: 'rgba(52,0,87,.4)' }}> · {t('FAMILY ARCHIVE')}</span>}
      </figcaption>
    </figure>
  );
}

/** Two to four prints scattered on a tinted mat. */
function Prints({ frames, flip }: { frames: Frame[]; flip?: boolean }) {
  const isMobile = useIsMobile();
  const tilts = [-3, 2.5, -1.5, 3];
  const cols = frames.length === 1 ? '1fr' : isMobile ? '1fr 1fr' : frames.length >= 3 ? '1fr 1fr' : '1fr 1fr';
  return (
    <div data-reveal-kids="1" style={{
      display: 'grid', gridTemplateColumns: cols, gap: isMobile ? 14 : 22, alignItems: 'start',
      padding: isMobile ? 14 : 'clamp(18px,2.4vw,34px)', background: flip ? '#FFF6E8' : color.tint, borderRadius: radius.xl,
    }}>
      {frames.map((f, i) => (
        <div key={f.src} style={{ marginTop: i % 2 === 1 && !isMobile ? 34 : 0 }}>
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
    <div data-reveal="1" style={{ alignSelf: 'center' }}>
      <span style={{ ...eyebrow, color: 'rgba(52,0,87,.55)' }}>{n} · {kicker}</span>
      <h2 style={{ ...display, fontSize: 'clamp(32px,4.2vw,56px)', color: color.purple, margin: '14px 0 0', transform: 'rotate(-3deg)', transformOrigin: pivot() }}>
        {title}
      </h2>
      {children}
    </div>
  );
  return (
    <section id={id} style={{ scrollMarginTop: 120, marginTop: 'clamp(56px,8vw,110px)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.15fr', gap: isMobile ? 26 : 'clamp(28px,4vw,64px)', alignItems: 'center' }}>
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
    <div data-reveal="1" style={{ marginTop: 'clamp(28px,4vw,48px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ ...eyebrow, color: color.pink }}>{t('THEN AND NOW · DRAG THE HANDLE')}</span>
        <span style={{ ...mono, fontWeight: 400, color: 'rgba(52,0,87,.55)' }}>{t('SAME HILL, 1998 AND TODAY')}</span>
      </div>
      <div
        ref={box}
        onPointerDown={(e) => { dragging.current = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); setFromX(e.clientX); }}
        onPointerMove={(e) => { if (dragging.current) setFromX(e.clientX); }}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
        style={{ position: 'relative', marginTop: 14, borderRadius: radius.xl, overflow: 'hidden', aspectRatio: '16 / 9', background: color.border, cursor: 'ew-resize', touchAction: 'pan-y', userSelect: 'none', boxShadow: shadow.card }}
      >
        <Img src="/images/23colouredearth.avif" alt={t('The 23 Coloured Earth today, with its trails and viewpoints')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <Img src={V + '1998-coloured-earth-hill.webp'} alt={t('The same slope in 1998, bare earth before any trail')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'sepia(.14) contrast(1.03)', clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `calc(${pos}% - 2px)`, width: 4, background: color.white, boxShadow: '0 0 0 1px rgba(52,0,87,.25)' }} />
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
          style={{
            position: 'absolute', top: '50%', left: `calc(${pos}% - 26px)`, width: 52, height: 52, marginTop: -26, borderRadius: '50%',
            background: color.pink, color: color.white, display: 'grid', placeItems: 'center', boxShadow: shadow.pink, ...mono, fontSize: 14, outlineOffset: 3,
          }}
        >⇔</div>
        <span style={{ position: 'absolute', top: 14, left: 14, ...mono, background: color.yellow, color: color.purple, padding: '6px 9px', borderRadius: radius.sm }}>1998</span>
        <span style={{ position: 'absolute', top: 14, right: 14, ...mono, background: color.green, color: color.purple, padding: '6px 9px', borderRadius: radius.sm }}>{t('TODAY')}</span>
      </div>
    </div>
  );
}

function UniqueCard({ n, title, text }: { n: string; title: string; text: string }) {
  const [h, bind] = useHover();
  return (
    <div {...bind} style={{
      background: color.white, borderRadius: radius.lg, padding: '22px 22px 20px', boxShadow: h ? shadow.lifted : `0 0 0 1.5px ${color.border}`,
      transform: h ? 'translateY(-6px)' : 'none', transition: `transform ${motion.base}, box-shadow ${motion.base}`, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <span style={{ ...display, fontSize: 30, color: color.pink }}>{n}</span>
      <div style={{ ...display, fontSize: 'clamp(20px,2vw,24px)', color: color.purple }}>{title}</div>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(52,0,87,.72)', margin: 0 }}>{text}</p>
    </div>
  );
}

function Pill({ label, href, primary }: { label: string; href: string; primary?: boolean }) {
  const [h, bind] = useHover();
  return (
    <a {...bind} href={href} className="press" style={{
      display: 'inline-block', textDecoration: 'none', fontFamily: font.body, fontWeight: 700, fontSize: 15, padding: '14px 26px', borderRadius: radius.pill,
      background: primary ? (h ? color.pinkDark : color.pink) : 'rgba(255,255,255,.12)', color: color.white,
      boxShadow: primary ? shadow.pink : `inset 0 0 0 1.5px rgba(255,255,255,.4)`, transform: h ? 'translateY(-1px)' : 'none', transition: `transform ${motion.fast}, background ${motion.fast}`,
    }}>{label}</a>
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
    <main ref={ref} style={{ maxWidth: 1320, margin: '0 auto', padding: '104px clamp(16px,3.5vw,40px) 0' }}>
      {/* ---- hero ---- */}
      <section data-reveal="1" style={{ position: 'relative', background: color.deep, borderRadius: radius.xl, overflow: 'hidden', boxShadow: shadow.card, minHeight: isMobile ? 520 : 600 }}>
        <Img src={V + '1998-tea-field-ploughing.webp'} alt={t('Tractors ploughing the old tea rows in the valley, 1998')} priority surface="dark" sizes="100vw"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'sepia(.2) contrast(1.05)', opacity: 0.9 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(38,0,64,.96) 18%, rgba(38,0,64,.35) 60%, rgba(38,0,64,.15))' }} />
        <Stripes height={10} style={{ position: 'relative' }} />
        <div style={{ position: 'relative', padding: 'clamp(24px,3.4vw,48px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: isMobile ? 500 : 580, boxSizing: 'border-box' }}>
          <span style={{ ...eyebrow, color: color.yellow }}>{t('OUR STORY · CHAMOUNY, MAURITIUS · SINCE 1998')}</span>
          <h1 style={{ ...display, fontSize: 'clamp(42px,7vw,104px)', color: color.white, margin: '14px 0 0', transform: 'rotate(-4deg)', transformOrigin: pivot(), maxWidth: 900 }}>
            {t('From a tea field')}<br /><span style={{ color: color.green }}>{t('to the sky.')}</span>
          </h1>
          <p style={{ fontSize: 'clamp(15px,1.3vw,18px)', lineHeight: 1.6, color: 'rgba(255,255,255,.82)', margin: '22px 0 0', maxWidth: 620 }}>
            {t('A family plantation, a valley that turned out to be painted in twenty-three colours, trails cut by hand, and a father who decided that people should be able to fly over all of it. This is how the valley became Vallé.')}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 26 }}>
            {[t('1998 · FIRST ROLL OF FILM'), t('23 COLOURS OF EARTH'), t('3 WATERFALLS'), t('5.5 KM OF ZIPLINES')].map((chip) => (
              <span key={chip} style={{ ...mono, fontWeight: 400, letterSpacing: '.12em', color: 'rgba(255,255,255,.88)', background: 'rgba(255,255,255,.12)', borderRadius: radius.sm, padding: '9px 12px' }}>{chip}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ---- chapter rail ---- */}
      <nav aria-label={t('Chapters')} style={{ position: 'sticky', top: isMobile ? 64 : 84, zIndex: 5, marginTop: 18, background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(8px)', borderRadius: radius.pill, boxShadow: `0 0 0 1.5px ${color.border}`, padding: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ display: 'flex', gap: 4, minWidth: 'max-content' }}>
          {CHAPTERS.map((c) => {
            const on = active === c.id;
            return (
              <a key={c.id} href={'#' + c.id} onClick={(e) => { e.preventDefault(); document.getElementById(c.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                style={{ ...mono, textDecoration: 'none', whiteSpace: 'nowrap', padding: '10px 14px', borderRadius: radius.pill, color: on ? color.white : color.purple, background: on ? color.purple : 'transparent', transition: `background ${motion.fast}, color ${motion.fast}` }}>
                <span style={{ color: on ? color.yellow : color.pink }}>{c.n}</span> {t(c.nav).toUpperCase()}
              </a>
            );
          })}
        </div>
      </nav>

      {/* ---- 01 the land ---- */}
      <Chapter id="land" n="01" kicker={t('THE LAND')} title={<>{t('A tea field')}<br /><span style={{ color: color.violet }}>{t('with a secret.')}</span></>}
        frames={[
          { src: V + '1998-tea-field-tractors-s.webp', alt: t('Two tractors turning the soil of the old tea plantation'), caption: t('The tea rows come out'), year: '1998' },
          { src: V + '1998-forest-scouting-group-s.webp', alt: t('The family and friends resting in the forest on an early scouting walk'), caption: t('The first scouting walks through the forest'), year: '1998' },
          { src: V + '1998-walking-the-ridges-s.webp', alt: t('A small group walking the open ridges above the valley'), caption: t('Walking the ridges to find the way down'), year: '1998' },
          { src: V + '1998-team-on-the-hill-s.webp', alt: t('A group photo on the hill with the south coast behind'), caption: t('The team that walked every trail first'), year: '1998' },
        ]}>
        <p style={body}>{t('Mare Anguilles, Chamouny, in the green south of Mauritius. For generations this valley was a tea plantation: rows of bushes on the slopes, a river at the bottom, the Savanne mountains at its back and the ocean on the horizon.')}</p>
        <p style={body}>{t('Decades ago a young father stepped onto his family\'s land and saw more than tea. He walked it for months, through forest nobody had crossed in years, down to a river that had to be forded on foot, and he began to notice that where the bushes were cleared, the ground showed its true self.')}</p>
      </Chapter>

      {/* ---- 02 the colours ---- */}
      <Chapter id="colours" n="02" kicker={t('THE COLOURS')} flip title={<>{t('Twenty-three shades')}<br /><span style={{ color: color.pink }}>{t('of the island\'s fire.')}</span></>}
        frames={[
          { src: V + '1998-coloured-earth-raw-s.webp', alt: t('The bare coloured earth below the forested hill in 1998'), caption: t('Bare earth below the hill, before a single trail'), year: '1998' },
          { src: V + '1998-coloured-earth-visitors-s.webp', alt: t('The first visitors standing on the coloured earth'), caption: t('The first visitors step onto the colours'), year: '1998' },
        ]}
        extra={<ThenNow />}>
        <p style={body}>{t('Under the roots lay volcanic earth in twenty-three colours: deep reds, golden yellows, purples, blues and greens, laid down by ash and minerals millions of years ago. Nothing is painted and nothing is added; every shower of rain simply reveals a little more.')}</p>
        <p style={body}>{t('The family chose to protect the slope rather than plant over it, and the discovery gave the place its first name: La Vallée des Couleurs, the valley of colours.')}</p>
      </Chapter>

      {/* ---- 03 first trails ---- */}
      <Chapter id="trails" n="03" kicker={t('THE FIRST TRAILS')} title={<>{t('Cut by hand,')}<br /><span style={{ color: color.violet }}>{t('one pick at a time.')}</span></>}
        frames={[
          { src: V + '1998-workers-with-picks-s.webp', alt: t('Two workers with picks cutting a path across the coloured earth'), caption: t('Picks on the coloured earth: the first path'), year: '1998' },
          { src: V + '1998-digging-the-lake-s.webp', alt: t('A backhoe digging the lake below the hill'), caption: t('Digging the lake under the hill'), year: '1998' },
          { src: V + '1998-pickup-river-crossing-s.webp', alt: t('A pickup truck crossing the river ford into the valley'), caption: t('Fording the river, the only way in'), year: '1998' },
          { src: V + '1998-vacoas-waterfall-s.webp', alt: t('Vacoas waterfall seen through the branches in 1998'), caption: t('Vacoas waterfall, reached for the first time'), year: '1998' },
          { src: V + '1998-chamouze-waterfall-s.webp', alt: t('Chamouzé waterfall dropping into its pool'), caption: t('Chamouzé, before the restaurant beside it'), year: '1998', tall: true },
          { src: V + '1998-terraces-and-cascade-s.webp', alt: t('Newly planted terraces and a cascade on the hillside'), caption: t('Terraces planted on the slope, a cascade built down the middle'), year: '1998' },
        ]}>
        <p style={body}>{t('There was no road into the valley, only a river to ford. The first trails were cut with picks and shovels. Then a backhoe shaped the paths around the earth, so the colours could be seen without being walked on, and dug the lake below the hill.')}</p>
        <p style={body}>{t('A natural path led to a waterfall, so the founder built the first quad trail around it. Three waterfalls, Vacoas, Chamouzé and Cheveux d\'Ange, were opened up one after the other so that anyone could reach them.')}</p>
      </Chapter>

      {/* ---- 04 the gates ---- */}
      <Chapter id="gates" n="04" kicker={t('OPENING DAY')} flip title={<>{t('1998. The valley')}<br /><span style={{ color: color.pink }}>{t('says bonjour.')}</span></>}
        frames={[
          { src: V + '1998-river-ford-gate-s.webp', alt: t('A 4x4 full of visitors splashing through the river ford at the park gate'), caption: t('The gate was a river ford, and everyone loved the splash'), year: '1998' },
          { src: V + '1998-palisade-entrance-s.webp', alt: t('Visitors walking through the wooden palisade entrance'), caption: t('The palisade entrance on an opening weekend'), year: '1998' },
          { src: V + '1998-school-trail-s.webp', alt: t('A long line of schoolchildren walking down the trail'), caption: t('Whole classes came down the trail in a single line'), year: '1998' },
          { src: V + '1998-building-the-kiosk-s.webp', alt: t('Workers thatching the first kiosk beside the reception'), caption: t('Thatching the first kiosk with the valley\'s own timber'), year: '1998' },
          { src: V + '1998-shell-museum-s.webp', alt: t('The small museum with shelves of shells and volcanic rock'), caption: t('The shell and rock museum'), year: '1998' },
          { src: V + '1998-sega-musicians-s.webp', alt: t('A sega band with an accordion and ravanne drum playing at the gate'), caption: t('A sega band at the gate, buses in the background'), year: '1998' },
        ]}>
        <p style={body}>{t('The negatives in the family archive carry the stamp of August 1998. A palisade gate, kiosks thatched with timber from the valley, a small museum of shells and volcanic rock, a hand-painted map, and a car park that filled on the first weekends.')}</p>
        <p style={body}>{t('School buses came from every corner of the island; teachers remember entire classes walking the trail down to the colours in a single line. A sega band played at the gate. The valley had become a place people came to.')}</p>
      </Chapter>

      {/* ---- 05 into the air ---- */}
      <Chapter id="air" n="05" kicker={t('INTO THE AIR')} title={<>{t('Then the valley')}<br /><span style={{ color: color.violet }}>{t('learned to fly.')}</span></>}
        frames={[
          { src: '/images/zipline-waterfall.webp', alt: t('A guest ziplining past a waterfall'), caption: t('The Waterfall Zipline, 300 m over Chamouzé') },
          { src: '/images/bicycle-sky.webp', alt: t('Two guests riding the bicycle zipline against the sky'), caption: t('The bicycle zipline, 18 m above the lake') },
          { src: '/images/bridge-span.webp', alt: t('The Nepalese bridge strung across the forest'), caption: t('The Nepalese bridge, 80 to 100 m above the ground') },
          { src: '/images/luge-race.webp', alt: t('Two luge karts racing down the mountain track'), caption: t('The mountain luge kart') },
        ]}>
        <p style={body}>{t('From the ridges the ocean is always in view, and that is where the idea came from: people should be able to fly over this. The ziplines came line by line, until a 1.5 km Signature line crossed the estate, one of the longest in the Indian Ocean.')}</p>
        <p style={body}>{t('Quads and buggies took on the river crossings, a Nepalese bridge was strung above the canopy, a bicycle zipline rode out over the lake, and a luge kart found its curves on the mountain. Today the Advenature Flight links eleven ziplines, 5.5 km in all, into one journey across the whole park.')}</p>
      </Chapter>

      {/* ---- 06 guardians ---- */}
      <Chapter id="guardians" n="06" kicker={t('GUARDIANS')} flip title={<>{t('Built by nature,')}<br /><span style={{ color: color.pink }}>{t('kept by people.')}</span></>}
        frames={[
          { src: V + '1998-cyclone-palms-s.webp', alt: t('Palms bent flat by a cyclone over the park buildings'), caption: t('After the cyclone: the thatch went back up'), year: '1998' },
          { src: V + '1998-ebony-tree-s.webp', alt: t('A tall old ebony tree standing over the trail'), caption: t('An ebony that was already old in 1998'), year: '1998', tall: true },
          { src: '/images/valle-giant-tortoise-park-mauritius.avif', alt: t('A giant tortoise on the grass at Vallé'), caption: t('The giant tortoises, free to roam') },
          { src: '/images/endemictrees.avif', alt: t('Endemic trees along a shaded trail'), caption: t('Over 50 endemic species along the trails') },
        ]}>
        <p style={body}>{t('Cyclones have flattened the palms and the kiosks more than once. Each time the trails were cleared, the thatch went back up and the planting carried on. Over fifty species of endemic trees stand on the estate today, black ebony and bois de natte among them, many of them older than the park.')}</p>
        <p style={body}>{t('Java deer graze the grasslands, giant tortoises take their time on the lawns and a rare albino deer lives in the green zone. Nothing here was built against the land; everything was placed around it.')}</p>
      </Chapter>

      {/* ---- 07 today ---- */}
      <Chapter id="today" n="07" kicker={t('TODAY')} title={<>{t('Formerly La Vallée des Couleurs.')}<br /><span style={{ color: color.violet }}>{t('Forever Vallé.')}</span></>}
        frames={[
          { src: '/images/home-overview.avif', alt: t('Aerial view of the 23 Coloured Earth and its trails today'), caption: t('The colours today, trails and viewpoints around them') },
          { src: '/images/chamouze-restaurant.webp', alt: t('Guests dining at Le Chamouzé beside the waterfall'), caption: t('Le Chamouzé, lunch beside the waterfall') },
          { src: '/images/peak-tower.webp', alt: t('The viewpoint tower above the south coast'), caption: t('The Peak and its view to the coast') },
          { src: '/images/quad-river.webp', alt: t('Quads crossing the river on the Adventure Track'), caption: t('The river crossings, now on four wheels') },
        ]}>
        <p style={body}>{t('The name changed to Vallé Advenature Park; the purpose never did. Advenature is the balance the valley has always had: high-pulse moments on the lines and low-pulse ones at the foot of a waterfall.')}</p>
        <p style={body}>{t('There are four places to eat, among them Le Chamouzé beside its waterfall and Kazmaël on the hill with its 360° view, a kids park, a rock garden and twenty-one experiences. Travellers voted the park a TripAdvisor Best of the Best in 2022 and 2023, a Travellers\' Choice in 2024, and it won a Sustainable Tourism Mauritius Award in 2023.')}</p>
      </Chapter>

      {/* ---- founder ---- */}
      <section data-reveal="1" style={{ marginTop: 'clamp(56px,8vw,110px)', background: color.pink, borderRadius: radius.xl, overflow: 'hidden', boxShadow: shadow.card }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.1fr .9fr', alignItems: 'stretch' }}>
          <div style={{ padding: 'clamp(28px,4vw,56px)' }}>
            <span style={{ ...eyebrow, color: color.yellow }}>{t('A MESSAGE FROM OUR FOUNDER')}</span>
            <blockquote style={{ ...display, fontSize: 'clamp(30px,4vw,54px)', color: color.white, margin: '16px 0 0', transform: 'rotate(-3deg)', transformOrigin: pivot() }}>
              {t('"Never say adventure is impossible. Make it unforgettable!"')}
            </blockquote>
            <p style={{ fontSize: 'clamp(15px,1.25vw,17px)', lineHeight: 1.7, color: 'rgba(255,255,255,.9)', margin: '24px 0 0', maxWidth: 560 }}>
              {t('"When I first set foot on this land, it wasn\'t just about the tea plantation it once was. The 23 shades of soil beneath my feet felt like an artist\'s palette, waiting to create something extraordinary. This land had a heartbeat, and we were here to listen. Whether you are soaring through the treetops or standing still in the quiet embrace of nature, know this: you are part of our story. A story still being written, with every step you take."')}
            </p>
            <div style={{ marginTop: 22, ...mono, color: color.white }}>{t('ASIFF POLIN · FOUNDER & CEO, VALLÉ ADVENATURE™ PARK')}</div>
          </div>
          <div style={{ position: 'relative', minHeight: isMobile ? 260 : 380 }}>
            <Img src={V + '1998-first-track-on-the-earth.webp'} alt={t('The first track winding across the coloured earth, 1998')} surface="dark" sizes="(max-width: 1080px) 100vw, 600px"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'sepia(.2) contrast(1.05)' }} />
            <div style={{ position: 'absolute', inset: 0, background: isMobile ? 'linear-gradient(to bottom, rgba(255,51,88,.5), rgba(255,51,88,0) 50%)' : 'linear-gradient(to right, rgba(255,51,88,.85), rgba(255,51,88,0) 55%)' }} />
          </div>
        </div>
      </section>

      {/* ---- what makes it unlike anywhere ---- */}
      <section style={{ marginTop: 'clamp(56px,8vw,110px)' }}>
        <div data-reveal="1">
          <span style={{ ...eyebrow, color: color.pink }}>{t('WHY THERE IS ONLY ONE VALLÉ')}</span>
          <h2 style={{ ...display, fontSize: 'clamp(32px,4.2vw,56px)', color: color.purple, margin: '12px 0 0', transform: 'rotate(-3deg)', transformOrigin: pivot() }}>
            {t('Seven things')} <span style={{ color: color.violet }}>{t('you will not find anywhere else.')}</span>
          </h2>
        </div>
        <div data-reveal-kids="1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16, marginTop: 'clamp(24px,3vw,40px)' }}>
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
      <section data-reveal="1" style={{ marginTop: 'clamp(48px,6vw,80px)', background: color.purple, borderRadius: radius.xl, padding: 'clamp(24px,3.4vw,44px)', boxShadow: shadow.card }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 'clamp(18px,3vw,36px)' }}>
          {[
            { n: '1998', l: t('THE GATES OPEN'), c: color.yellow },
            { n: '23', l: t('COLOURS OF EARTH'), c: color.pink },
            { n: '3', l: t('WATERFALLS'), c: color.green },
            { n: '11', l: t('ZIPLINES · 5.5 KM'), c: color.violet },
            { n: '50+', l: t('ENDEMIC TREE SPECIES'), c: color.yellow },
            { n: '21', l: t('EXPERIENCES'), c: color.green },
          ].map((s) => (
            <div key={s.l}>
              <div style={{ ...display, fontSize: 'clamp(36px,4.6vw,56px)', color: s.c }}>{s.n}</div>
              <div style={{ ...mono, color: 'rgba(255,255,255,.75)', marginTop: 6, borderTop: `3px solid ${s.c}`, paddingTop: 8 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- cta ---- */}
      <section data-reveal="1" style={{ margin: 'clamp(40px,6vw,80px) 0 clamp(56px,8vw,110px)', position: 'relative', borderRadius: radius.xl, overflow: 'hidden', boxShadow: shadow.card, minHeight: 360 }}>
        <Img src={V + '1998-school-trail.webp'} alt={t('A line of schoolchildren walking down the trail to the coloured earth, 1998')} surface="dark" sizes="100vw"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'sepia(.2) contrast(1.05)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(38,0,64,.95) 20%, rgba(38,0,64,.4))' }} />
        <div style={{ position: 'relative', padding: 'clamp(28px,4vw,56px)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', minHeight: 360, boxSizing: 'border-box' }}>
          <span style={{ ...eyebrow, color: color.yellow }}>{t('THE NEXT CHAPTER IS YOURS')}</span>
          <h2 style={{ ...display, fontSize: 'clamp(32px,4.6vw,60px)', color: color.white, margin: '12px 0 0', transform: 'rotate(-3deg)' }}>
            {t('Walk the story yourself.')}
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(255,255,255,.82)', margin: '16px 0 0', maxWidth: 560 }}>
            {t('The Discovery Track follows the first trails to the three waterfalls and the colours. The Advenature Flight sees all of it from the air.')}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 26 }}>
            <Pill primary label={t('Book your day') + ' ' + arrow} href={paths.booking()} />
            <Pill label={t('Explore the activities')} href={paths.explore()} />
          </div>
        </div>
      </section>
    </main>
  );
}
