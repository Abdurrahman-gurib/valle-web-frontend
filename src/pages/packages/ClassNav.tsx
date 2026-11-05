import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { paths } from '../../lib/nav';
import type { PackageGroup } from '../../lib/packageGroups';
import { useT } from '../../i18n';
import { Img } from '../../components/Img';
import { Fwd } from '@/components/ui/arrows';
import { cover } from './shared';

/** The photo of each class on the packages index (16:10, the campaign hero of its page). */
export const CLASS_PHOTO: Record<string, { src: string; position: string }> = {
  deals: { src: '/images/zipline-waterfall.webp', position: '45% 40%' },
  exclusive: { src: '/images/packages/exclusive/exclusive-quad-couple.webp', position: 'center 40%' },
  resident: { src: '/images/bridge-laugh.webp', position: 'center 35%' },
  senior: { src: '/images/senior/senior-guests-trail.webp', position: '28% 30%' },
  student: { src: '/images/packages/student/student-zipline-kid.webp', position: 'center 30%' },
  corporate: { src: '/images/team-building-goggles.webp', position: 'center 25%' },
  'photo-video': { src: '/images/shoot/cine-01.webp', position: 'center' },
};

/**
 * The package classes: photo cards on the index, a row of pills on a class
 * page (the current class filled purple; on phones one scrolling row with the
 * current pill scrolled into view).
 */
export function ClassNav({ classes, current, marginTop, meta }: { classes: PackageGroup[]; current?: PackageGroup; marginTop: number; meta?: (g: PackageGroup) => ReactNode }) {
  const t = useT();
  const rowRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const row = rowRef.current;
    const on = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!row || !on || row.scrollWidth <= row.clientWidth) return;
    // centre the current pill without moving the page (scrollIntoView would scroll the window too)
    const rtl = document.documentElement.dir === 'rtl';
    const start = rtl ? row.clientWidth - (on.offsetLeft + on.offsetWidth) : on.offsetLeft;
    const target = Math.max(0, start - (row.clientWidth - on.offsetWidth) / 2);
    row.scrollLeft = rtl ? -target : target;
  }, [current?.slug]);

  if (current) {
    return (
      <nav ref={rowRef} aria-label={t('Package classes')} data-testid="package-classes" className="pk-classrow" style={{ marginTop }}>
        {classes.map((g) => {
          const on = current.slug === g.slug;
          return (
            <Link key={g.slug} to={paths.packageGroup(g.slug)} data-testid={`class-${g.slug}`} aria-current={on ? 'page' : undefined} className="pk-pill" style={{ color: on ? '#FFFFFF' : '#340057' }}>
              {t(g.title)}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label={t('Package classes')} data-testid="package-classes" className="pk-classcards" style={{ marginTop }}>
      {classes.map((g) => {
        const ph = CLASS_PHOTO[g.slug];
        return (
          <Link key={g.slug} to={paths.packageGroup(g.slug)} data-testid={`class-${g.slug}`} className="v-card pk-classcard" style={{ color: '#340057' }}>
            {ph && (
              <span className="v-card-media">
                <Img src={ph.src} alt="" sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 33vw" style={cover(ph.position)} />
              </span>
            )}
            <span className="v-card-body">
              <span className="v-h3">{t(g.title)}</span>
              <span className="pk-classcard-intro">{t(g.intro)}</span>
              {meta && <span className="pk-classcard-meta">{meta(g)}</span>}
              <span className="v-card-foot pk-classcard-cta">{t('See the prices')} <Fwd /></span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
