import { paths } from '../../lib/nav';
import { liveDeals } from '../../lib/deals';
import type { Catalog } from '../../types';

type Translate = (s: string, vars?: Record<string, string | number>) => string;

export interface MenuGroup { title: string; kids?: boolean; links: [name: string, href: string][] }

/** The packages menu, classified the way the park sells them (desktop mega menu and mobile overlay). */
export function packageGroups(t: Translate, catalog: Catalog): MenuGroup[] {
  const pk = (name: string, key: string): [string, string] => [name, paths.packages(key)];
  return [
    ...(liveDeals(catalog).length ? [{ title: t('SPECIAL DEALS'), links: [pk(t('Expo deals'), 'deals')] }] : []),
    { title: t('EXCLUSIVE PACKAGE'), links: [pk(t('Light & Standard'), 'ls'), pk(t('Exclusive tiers'), 'ex'), pk(t('VIP Ultimate'), 'vip'), pk(t('Diamond'), 'diamond'), pk(t('Combo packages'), 'combo')] },
    { title: t('RESIDENT PACKAGE'), links: [pk(t('Resident packages'), 'resident')] },
    { title: t('KIDS PARK'), kids: true, links: [pk(t('Vallé Kids Park pricelist'), 'kids'), [t('Kids Park activities'), paths.explore('kids')]] },
    { title: t('SENIOR CITIZEN'), links: [pk(t('Senior citizens 55+'), 'senior')] },
    { title: t('STUDENT PACKAGE'), links: [pk(t('Student package'), 'student')] },
    { title: t('CORPORATE PACKAGE'), links: [pk(t('Team building'), 'team')] },
    { title: t('PHOTO & VIDEO PACKAGE'), links: [pk(t('Photo pricelist'), 'photo'), pk(t('Cinematic experience'), 'cine')] },
    { title: t('RESTAURANTS & MENUS'), links: [[t('Le Chamouzé menu'), paths.resto('chamouze') + '#menu'], [t('Kids menu'), paths.resto('chamouze') + '#kids-menu'], [t('La Citronelle menu'), paths.resto('citronelle') + '#menu']] },
  ];
}
