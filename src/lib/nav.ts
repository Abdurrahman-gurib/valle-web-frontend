import { useNavigate } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import { localizePath, useLang } from '../i18n';

/**
 * Semantic navigation: maps the original SPA "page" state changes onto routes.
 *   home()            -> /
 *   explore(cat?, q?) -> /explore?cat=..&q=..
 *   detail(id)        -> /activities/:id
 *   packages(sect?)   -> /packages#sect   (ls | ex | vip | combo | cine | photo | team | quote)
 *   resto(id)         -> /dine/:id        (chamouze | citronelle)
 *   booking()         -> /booking
 *   plan()/dine()        -> /#plan /#dine (scrolls on the home page)
 *   story()              -> /story
 *   privacy()/terms()    -> /privacy /terms
 */
/** Route builders. Anchors use these for real hrefs; useGoto() navigates to the same paths. */
// Every builder returns the path in the language of the page being rendered
// (/explore on English pages, /fr/explore on French ones): see src/i18n.
const L = localizePath;
export const paths = {
  home: () => L('/'),
  explore: (cat?: string, q?: string) => {
    const p = new URLSearchParams();
    if (cat && cat !== 'all') p.set('cat', cat);
    if (q) p.set('q', q);
    const qs = p.toString();
    return L('/explore' + (qs ? '?' + qs : ''));
  },
  detail: (id: string) => L('/activities/' + id),
  packages: (section?: string) => L('/packages' + (section ? '#' + section : '')),
  resto: (id: string) => L('/dine/' + id),
  booking: () => L('/booking'),
  plan: () => L('/#plan'),
  dine: () => L('/#dine'),
  story: () => L('/story'),
  team: () => L('/packages#team'),
  groups: () => L('/groups'),
  vacancies: () => L('/vacancies'),
  privacy: () => L('/privacy'),
  terms: () => L('/terms'),
  vacancy: (slug: string) => L('/vacancies/' + slug),
};

export function useGoto() {
  const navigate = useNavigate();
  // re-create the callbacks when the language changes so they target the new prefix
  const lang = useLang();

  const explore = useCallback((cat?: string, q?: string) => {
    navigate(paths.explore(cat, q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, lang]);

  return useMemo(() => ({
    home: () => navigate(paths.home()),
    explore,
    detail: (id: string) => navigate(paths.detail(id)),
    packages: (section?: string) => navigate(paths.packages(section)),
    resto: (id: string) => navigate(paths.resto(id)),
    booking: () => navigate(paths.booking()),
    plan: () => navigate(paths.plan()),
    dine: () => navigate(paths.dine()),
    story: () => navigate(paths.story()),
    team: () => navigate(paths.team()),
    vacancies: () => navigate(paths.vacancies()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [navigate, explore, lang]);
}
