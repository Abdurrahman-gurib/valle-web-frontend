import { paths } from '../../lib/nav';
import { liveDeals } from '../../lib/deals';
import type { Catalog, RateKey } from '../../types';

type Translate = (s: string, vars?: Record<string, string | number>) => string;

export interface MenuGroup { title: string; kids?: boolean; links: [name: string, href: string][] }

/**
 * The packages menu, classified the way the park sells them (desktop mega menu
 * and mobile overlay), in the order that suits the guest's rate: a visitor sees
 * the packages sold to visitors first and none of the resident-only ones (Expo
 * deals, resident packages); a resident sees the deals and resident packages
 * first. Before a rate is chosen the full list shows.
 */
export function packageGroups(t: Translate, catalog: Catalog, rate: RateKey | null = null): MenuGroup[] {
  const pk = (name: string, key: string): [string, string] => [name, paths.packages(key)];
  const deals: MenuGroup[] = liveDeals(catalog).length ? [{ title: t('SPECIAL DEALS'), links: [pk(t('Expo deals'), 'deals')] }] : [];
  const exclusive: MenuGroup = { title: t('EXCLUSIVE PACKAGE'), links: [pk(t('Light & Standard'), 'ls'), pk(t('Exclusive tiers'), 'ex'), pk(t('VIP Ultimate'), 'vip'), pk(t('Diamond'), 'diamond'), pk(t('Combo packages'), 'combo')] };
  const resident: MenuGroup = { title: t('RESIDENT PACKAGE'), links: [pk(t('Resident packages'), 'resident')] };
  const others: MenuGroup[] = [
    { title: t('KIDS PARK'), kids: true, links: [[t('Vallé Kids Park pricelist'), paths.explore('kids') + '#kids-prices'], [t('Kids Park activities'), paths.explore('kids')]] },
    { title: t('SENIOR CITIZEN'), links: [pk(t('Senior citizens 55+'), 'senior')] },
    { title: t('STUDENT PACKAGE'), links: [pk(t('Student package'), 'student')] },
    { title: t('CORPORATE PACKAGE'), links: [pk(t('Team building'), 'team')] },
    { title: t('PHOTO & VIDEO PACKAGE'), links: [pk(t('Photo pricelist'), 'photo'), pk(t('Cinematic experience'), 'cine')] },
    { title: t('RESTAURANTS & MENUS'), links: [[t('Le Chamouzé menu'), paths.resto('chamouze') + '#menu'], [t('Kids menu'), paths.resto('chamouze') + '#kids-menu'], [t('La Citronelle menu'), paths.resto('citronelle') + '#menu']] },
  ];
  if (rate === 'nr') return [exclusive, ...others];
  return [...deals, ...(rate === 'rr' ? [resident, exclusive] : [exclusive, resident]), ...others];
}

/** The Dine menu: the two restaurants and the kids menu. */
export function dineLinks(t: Translate): [name: string, href: string][] {
  return [
    ['Le Chamouzé', paths.resto('chamouze')],
    ['La Citronelle', paths.resto('citronelle')],
    [t('Kids menu'), paths.resto('chamouze') + '#kids-menu'],
  ];
}
