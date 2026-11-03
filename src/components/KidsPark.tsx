import type { CSSProperties, ElementType, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Img } from './Img';
import { paths } from '../lib/nav';
import { useCatalog } from '../store/CatalogContext';
import type { Activity } from '../types';
import { useT } from '../i18n';

/**
 * Vallé Kids Park identity, after the park's sign design: the logo with the
 * cheeky mascot, a lime squiggle pattern, purple posts with pink and yellow
 * loops, purple cards with sunflower prices and chunky rounded buttons.
 * The patterns are CSS backgrounds (no layout cost); the logo is a lazy image
 * with its intrinsic size reserved.
 */
export const KP = {
  purple: '#7A2A8C',
  deep: '#5A1A6B',
  lime: '#A6CE39',
  yellow: '#FDB913',
  sun: '#F7C244',
  pink: '#E8609F',
} as const;

export const KP_FONT: CSSProperties = { fontFamily: "'Barlow',sans-serif", fontWeight: 900, fontStyle: 'normal', textTransform: 'uppercase', letterSpacing: '.01em' };

/** Lime green with pale squiggles, tiled. */
export const KP_PATTERN: CSSProperties = {
  backgroundColor: KP.lime,
  backgroundImage: 'url(/images/kids-park/green-pattern.webp)',
  backgroundSize: '160px auto',
  backgroundRepeat: 'repeat',
};

/** The purple post with pink and yellow loops, tiled down. */
export const KP_POST: CSSProperties = {
  backgroundColor: KP.purple,
  backgroundImage: 'url(/images/kids-park/squiggle-panel.webp)',
  backgroundSize: '100% auto',
  backgroundRepeat: 'repeat-y',
};

/** The confetti strip (green | purple | green with squiggles), as a horizontal band. */
export const KP_CONFETTI: CSSProperties = {
  backgroundColor: KP.purple,
  backgroundImage: 'url(/images/kids-park/confetti.webp)',
  backgroundSize: 'auto 100%',
  backgroundRepeat: 'repeat-x',
  backgroundPosition: 'center',
};

const POST_W = 'clamp(14px,3.6vw,48px)';

/** The order of the flyer's "Little Explorer's Profile". */
export const KIDS_PROFILE_ORDER = ['playground', 'miniexc', 'coaster', 'miniquad', 'pirate', 'bonding'];
/** Catalog facts that belong in the profile (height and weight limits); matched on their translation. */
const PROFILE_FACTS = ['Minimum height 1.2 m', 'Weight limit: chair under 50 kg, bicycle under 80 kg'];

/** The official logo. Its alt text is the name written on it. */
export function KidsParkLogo({ width = 260, priority, style }: { width?: number | string; priority?: boolean; style?: CSSProperties }) {
  return (
    <Img
      src="/images/kids-park/kids-park-logo.webp"
      alt="Vallé Kids Park"
      width={900}
      height={641}
      priority={priority}
      placeholder="transparent"
      style={{ display: 'block', width, maxWidth: '100%', height: 'auto', aspectRatio: '900 / 641', filter: 'drop-shadow(0 10px 18px rgba(58,10,70,.28))', ...style }}
    />
  );
}

/** A rounded, chunky Kids Park button or link. */
export function kpButton(tone: 'yellow' | 'purple' | 'lime' = 'yellow'): CSSProperties {
  const c = tone === 'yellow' ? { bg: KP.yellow, fg: '#3A0A46', sh: '#B07C00' } : tone === 'lime' ? { bg: KP.lime, fg: '#3A0A46', sh: '#6E8F1A' } : { bg: KP.purple, fg: '#FFFFFF', sh: '#3A0A46' };
  return {
    ...KP_FONT,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    background: c.bg, color: c.fg, border: 0, borderRadius: 999, padding: '14px 26px',
    fontSize: 16, lineHeight: 1, textDecoration: 'none', cursor: 'pointer',
    boxShadow: `0 5px 0 ${c.sh}`,
  };
}

/** One activity's line in the "Little Explorer's Profile": age from the catalog, plus its height or weight facts. */
export function profileOf(a: Activity, t: (s: string) => string) {
  const wanted = new Set(PROFILE_FACTS.map((f) => t(f)));
  return { age: a.age, limits: a.gtk.map((g) => g.t).filter((x) => wanted.has(x)) };
}

/**
 * The entrance arch: lime squiggle banner between two purple posts, the
 * logo as the heading, the yellow entrance sign and the intro copy.
 */
export function KidsParkEntrance({ as: Tag = 'h2', id, priority, children }: { as?: ElementType; id?: string; priority?: boolean; children?: ReactNode }) {
  const t = useT();
  return (
    <section id={id} data-testid="kids-park-entrance" aria-label="Vallé Kids Park" style={{ position: 'relative', borderRadius: 28, overflow: 'hidden', ...KP_PATTERN, boxShadow: `0 0 0 4px ${KP.purple}` }}>
      <div aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: POST_W, ...KP_POST }} />
      <div aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: POST_W, ...KP_POST, backgroundPosition: '0 -300px' }} />
      <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'clamp(18px,3vw,40px)', padding: `clamp(22px,3.4vw,40px) calc(${POST_W} + clamp(12px,2.6vw,34px))` }}>
        <div style={{ flex: '0 1 300px', minWidth: 'min(100%,200px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <Tag style={{ margin: 0, width: '100%', display: 'flex', justifyContent: 'center' }}><KidsParkLogo width="min(100%,300px)" priority={priority} /></Tag>
          <span style={{ ...KP_FONT, background: KP.yellow, color: '#3A0A46', borderRadius: 12, padding: '9px 16px', fontSize: 14, transform: 'rotate(-3deg)', boxShadow: `0 4px 0 ${KP.purple}`, textAlign: 'center' }}>{t('Kids Park entrance')}</span>
        </div>
        <div style={{ flex: '1 1 320px', minWidth: 0, background: '#FFFFFF', borderRadius: 24, padding: 'clamp(18px,2.6vw,28px)', boxShadow: `0 6px 0 ${KP.purple}`, color: '#3A0A46' }}>
          <p style={{ margin: 0, fontSize: 'clamp(15px,1.5vw,17px)', lineHeight: 1.6 }}>
            {t('Step into a world where little feet lead the way, welcome to Vallé Kids Park! Imagine a place where children can conquer playful obstacle courses and run free in nature’s embrace. Here, every laugh echoes through the trees, and every climb is a small victory.')}
          </p>
          <p style={{ margin: '10px 0 0', fontSize: 'clamp(15px,1.5vw,17px)', lineHeight: 1.6 }}>
            {t('Built just for them, this magical space offers a safe, supervised haven where imagination knows no limits. Whether it’s a fun family day, a school adventure, or a birthday to remember, Vallé Kids Park turns ordinary days into unforgettable memories, because every great explorer starts small.')}
          </p>
          {children}
        </div>
      </div>
    </section>
  );
}

/** "Little Explorer's Profile": who can ride what, from the catalog. */
export function KidsProfile({ only, headingAs: H = 'h3' }: { only?: string; headingAs?: ElementType }) {
  const t = useT();
  const { ACTS } = useCatalog();
  const rows = KIDS_PROFILE_ORDER.map((id) => ACTS.find((a) => a.id === id)).filter((a): a is Activity => !!a && (!only || a.id === only));
  if (!rows.length) return null;
  return (
    <section data-testid="kids-profile" aria-labelledby={'kp-profile-' + (only ?? 'all')} style={{ marginTop: 22, background: KP.purple, borderRadius: 26, overflow: 'hidden', color: '#FFFFFF' }}>
      <div aria-hidden style={{ height: 22, ...KP_CONFETTI }} />
      <div style={{ padding: only ? '16px 20px 18px' : 'clamp(18px,2.6vw,26px)' }}>
        <H id={'kp-profile-' + (only ?? 'all')} style={{ ...KP_FONT, margin: 0, fontSize: only ? 20 : 'clamp(22px,2.6vw,30px)', color: KP.yellow, lineHeight: 1 }}>{t('Little Explorer’s Profile')}</H>
        <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'grid', gridTemplateColumns: only ? '1fr' : 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: 10 }}>
          {rows.map((a) => {
            const p = profileOf(a, t);
            return (
              <li key={a.id} style={{ background: 'rgba(255,255,255,.1)', borderRadius: 18, padding: '12px 14px', border: `2px solid ${KP.lime}` }}>
                {!only && <Link to={paths.detail(a.id)} style={{ ...KP_FONT, fontSize: 16, color: '#FFFFFF', textDecoration: 'none' }}>{a.name}</Link>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: only ? 0 : 8 }}>
                  <span style={{ background: KP.yellow, color: '#3A0A46', borderRadius: 999, padding: '5px 11px', fontFamily: "'Chivo Mono',monospace", fontSize: 11.5, fontWeight: 700 }}>{t('AGE {age}', { age: a.age })}</span>
                  {p.limits.map((l) => (
                    <span key={l} style={{ background: '#FFFFFF', color: '#3A0A46', borderRadius: 999, padding: '5px 11px', fontSize: 12.5, fontWeight: 600 }}>{l}</span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
