import { paths, useGoto } from '../../lib/nav';
import { useHover } from '../../hooks/useHover';
import { Img } from '../../components/Img';
import type { CatKey } from '../../types';
import { _t, useT } from '../../i18n';

interface WayCard {
  cat: CatKey;
  num: string;
  img: string;
  alt: string;
  title: string;
  sub: string;
  foot: string;
  bg: string;
  gradient: string;
  fg: string;
  subOpacity: number;
  dash: string;
}

const WAYS: WayCard[] = [
  {
    cat: 'adventure', num: '01', img: '/images/valle-zipline-adventure-mauritius.avif', alt: _t('Adventure'), title: _t('Adventure'),
    sub: _t('Go big. Go wild: ziplines, quad and luge.'), foot: _t('7 EXPERIENCES →'),
    bg: '#FF3358', gradient: 'linear-gradient(to top, rgba(233,28,69,.96) 12%, rgba(233,28,69,.6) 34%, rgba(31,0,51,0) 62%)',
    fg: '#FFFFFF', subOpacity: 0.94, dash: 'rgba(255,255,255,.5)',
  },
  {
    cat: 'nature', num: '02', img: '/images/valle-waterfall-nature-trail-mauritius.avif', alt: _t('Nature'), title: _t('Nature'),
    sub: _t('Waterfalls, coloured earth, the serene side.'), foot: _t('5 EXPERIENCES →'),
    bg: '#33FF74', gradient: 'linear-gradient(to top, rgba(38,224,103,.97) 12%, rgba(38,224,103,.6) 34%, rgba(31,0,51,0) 62%)',
    fg: '#340057', subOpacity: 0.9, dash: 'rgba(52,0,87,.45)',
  },
  {
    cat: 'kids', num: '03', img: '/images/valle-giant-tortoise-park-mauritius.avif', alt: _t('Kids Park'), title: _t('Kids Park'),
    sub: _t('Mini quads, pirate ships, gentle first thrills.'), foot: _t('7 EXPERIENCES →'),
    bg: '#FFFC33', gradient: 'linear-gradient(to top, rgba(250,246,44,.97) 12%, rgba(250,246,44,.6) 34%, rgba(31,0,51,0) 62%)',
    fg: '#340057', subOpacity: 0.9, dash: 'rgba(52,0,87,.45)',
  },
  {
    cat: 'tours', num: '04', img: '/images/valle-quad-bike-adventure-mauritius.avif', alt: _t('Tours and Groups'), title: _t('Tours & Groups'),
    sub: _t('Expeditions, team building, private days out.'), foot: _t('2 EXPERIENCES →'),
    bg: '#7333FF', gradient: 'linear-gradient(to top, rgba(101,38,240,.96) 12%, rgba(101,38,240,.6) 34%, rgba(31,0,51,0) 62%)',
    fg: '#FFFFFF', subOpacity: 0.94, dash: 'rgba(255,255,255,.5)',
  },
];

function WayCardEl({ w }: { w: WayCard }) {
  const t = useT();
  const goto = useGoto();
  const [h, bind] = useHover();
  return (
    <a
      href={paths.explore(w.cat)}
      {...bind}
      onClick={(e) => { e.preventDefault(); goto.explore(w.cat); }}
      style={{
        cursor: 'pointer', display: 'block', color: 'inherit', textDecoration: 'none', position: 'relative', borderRadius: 18, overflow: 'hidden', height: 400, background: w.bg,
        transition: 'transform .25s ease, box-shadow .25s ease',
        ...(h ? { transform: 'translateY(-6px) rotate(-1deg)', boxShadow: '0 26px 50px -18px rgba(52,0,87,.5)' } : undefined),
      }}
    >
      <Img src={w.img} alt={t('{name} at Vallé Advenature™ Park', { name: t(w.alt) })} placeholder={w.bg} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', inset: 0, background: w.gradient }} />
      <span style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(255,255,255,.94)', color: '#340057', fontFamily: "'Chivo Mono',monospace", fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '6px 11px', transform: 'rotate(-4deg)' }}>{w.num}</span>
      <div style={{ position: 'absolute', left: 20, right: 20, bottom: 18, color: w.fg }}>
        <div style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 30, textTransform: 'uppercase', transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>{t(w.title)}</div>
        <div style={{ fontSize: 13.5, opacity: w.subOpacity, marginTop: 7, lineHeight: 1.45 }}>{t(w.sub)}</div>
        <div style={{ marginTop: 12, fontFamily: "'Chivo Mono',monospace", fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', borderTop: '1px dashed ' + w.dash, paddingTop: 10, display: 'inline-block' }}>{t(w.foot)}</div>
      </div>
    </a>
  );
}

/** "Choose your day": the four ways into the park (adventure / nature / kids / tours). */
export function QuickPlan() {
  const t = useT();
  return (
    <section style={{ maxWidth: 1320, margin: '0 auto', padding: 'clamp(56px,8vw,104px) clamp(16px,3.5vw,40px) 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', borderBottom: '2px solid #340057', paddingBottom: 28, marginBottom: 30 }}>
        <h2 style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(30px,4.6vw,64px)', lineHeight: 0.85, letterSpacing: '-0.01em', margin: 0, textTransform: 'uppercase', transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>{t('Choose your day')}</h2>
        <span style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 12, fontWeight: 600, letterSpacing: '.16em', color: 'rgba(52,0,87,.55)' }}>{t('01 · FOUR WAYS IN')}</span>
      </div>
      <div data-reveal-kids="1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(235px,1fr))', gap: 16 }}>
        {WAYS.map((w) => <WayCardEl key={w.cat} w={w} />)}
      </div>
    </section>
  );
}
