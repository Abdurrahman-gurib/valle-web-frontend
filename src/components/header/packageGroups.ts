import { paths } from '../../lib/nav';
import { liveDeals } from '../../lib/deals';
import type { Catalog } from '../../types';

type Translate = (s: string, vars?: Record<string, string | number>) => string;

export interface MenuGroup { title: string; kids?: boolean; links: [name: string, href: string][] }

/**
 * The packages menu (desktop mega menu and mobile overlay), in two groups: the
 * ready-made day packages, then the packages by who is coming. Restaurant menus
 * live under Dine, the Kids Park under Explore.
 */
export function packageGroups(t: Translate, catalog: Catalog): MenuGroup[] {
  const cls = (name: string, slug: string): [string, string] => [name, paths.packageGroup(slug)];
  return [
    {
      title: t('DAY PACKAGES'),
      links: [
        ...(liveDeals(catalog).length ? [cls(t('Special deals'), 'deals')] : []),
        cls(t('Exclusive package'), 'exclusive'),
        cls(t('Photo & video package'), 'photo-video'),
      ],
    },
    {
      title: t('BY GROUP'),
      links: [
        cls(t('Residents'), 'resident'),
        cls(t('Seniors 55+'), 'senior'),
        cls(t('Schools'), 'student'),
        cls(t('Companies'), 'corporate'),
        [t('Groups of 10+'), paths.groups()],
      ],
    },
  ];
}

/** The Dine menu: the two restaurants and the kids menu. */
export function dineLinks(t: Translate): [name: string, href: string][] {
  return [
    ['Le Chamouzé', paths.resto('chamouze')],
    ['La Citronelle', paths.resto('citronelle')],
    [t('Kids menu'), paths.resto('chamouze') + '#kids-menu'],
  ];
}
