import { Link } from 'react-router-dom';
import { paths } from '../../lib/nav';
import type { PackageGroup } from '../../lib/packageGroups';
import { useT } from '../../i18n';
import { BLACK_ITALIC, MONO } from './shared';

/**
 * The package classes: large cards on the index, a row of pills on a class
 * page (where the current class is filled purple).
 */
export function ClassNav({ classes, current, marginTop }: { classes: PackageGroup[]; current?: PackageGroup; marginTop: number }) {
  const t = useT();
  const pills = !!current;
  return (
    <nav aria-label={t('Package classes')} data-testid="package-classes" style={{ display: 'grid', gridTemplateColumns: pills ? 'repeat(auto-fit,minmax(150px,1fr))' : 'repeat(auto-fit,minmax(240px,1fr))', gap: pills ? 8 : 14, marginTop }}>
      {classes.map((g) => {
        const on = current?.slug === g.slug;
        return (
          <Link key={g.slug} to={paths.packageGroup(g.slug)} data-testid={`class-${g.slug}`} aria-current={on ? 'page' : undefined} style={{ textDecoration: 'none', color: on ? '#FFFFFF' : '#340057', background: on ? '#340057' : '#FFFFFF', boxShadow: on ? 'none' : '0 0 0 1.5px #EBE2FF', borderRadius: pills ? 999 : 18, padding: pills ? '10px 14px' : '18px 20px', display: 'flex', flexDirection: 'column', gap: 6, textAlign: pills ? 'center' : 'start' }}>
            <span style={{ ...BLACK_ITALIC, fontSize: pills ? 14 : 22, textTransform: 'uppercase', lineHeight: 1 }}>{t(g.title)}</span>
            {!pills && <span style={{ fontSize: 13.5, lineHeight: 1.5, color: 'rgba(52,0,87,.72)' }}>{t(g.intro)}</span>}
            {!pills && <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.12em', color: '#5B21B6', marginTop: 'auto' }}>{t('SEE THE PRICES →')}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
