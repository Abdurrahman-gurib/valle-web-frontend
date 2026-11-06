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
    { title: t('RESTAURANTS & MENUS'), links: [[t('Le Chamouzé menu'), paths.resto('chamouze') + '#menu'], [t('Kids menu'), paths.resto('chamouze') + '#kids-menu'], [t('La Bigarade menu'), paths.resto('citronelle') + '#menu'], [t('Le Palmiste café'), paths.resto('palmiste')]] },
  ];
  if (rate === 'nr') return [exclusive, ...others];
  return [...deals, ...(rate === 'rr' ? [resident, exclusive] : [exclusive, resident]), ...others];
}

/** The Dine menu: the two restaurants and the kids menu. */
export function dineLinks(t: Translate): [name: string, href: string, restoId?: string][] {
  // La Bigarade keeps the id and address it had as "La Citronelle"
  return [
    ['Le Chamouzé', paths.resto('chamouze'), 'chamouze'],
    ['La Bigarade', paths.resto('citronelle'), 'citronelle'],
    ['Le Palmiste', paths.resto('palmiste'), 'palmiste'],
    [t('Kids menu'), paths.resto('chamouze') + '#kids-menu'],
  ];
}

/** Who a group visit is for: the Groups & schools menu and the cards on /groups. */
export type GroupAudience = 'school' | 'team' | 'club';
export interface GroupLink { key: GroupAudience; title: string; sub: string; href: string; photo: { src: string; position: string; alt: string } }

/** Schools and clubs book online on /groups; team building starts with a quote on the corporate page. */
export function groupLinks(t: Translate): GroupLink[] {
  return [
    {
      key: 'school', title: t('School trips'), href: paths.groups() + '?for=school#book',
      sub: t('Student prices per pupil, free entry for pre-primary pupils, and one waiver pack the teacher signs for the class.'),
      photo: { src: '/images/packages/student/student-zipline-kid.webp', position: '42% 30%', alt: t('A young student cheering on a zipline in a blue helmet') },
    },
    {
      key: 'team', title: t('Team building'), href: paths.team(),
      sub: t('Games and activities with certified facilitators, ending around a wellness lunch. For 10 to 300+ people, quoted for your team.'),
      photo: { src: '/images/team-building-goggles.webp', position: 'center 25%', alt: t('Colleagues in goggles cheering during a team challenge at Vallé') },
    },
    {
      key: 'club', title: t('Groups & clubs'), href: paths.groups() + '?for=club#book',
      sub: t('Friends, clubs and associations of ten or more: per-head prices online, a participant list and a small deposit.'),
      photo: { src: '/images/group-new-1.webp', position: 'center 55%', alt: t('A VALLÉ jeep full of visitors crossing the green valley') },
    },
  ];
}
