import { useNavigate } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

/**
 * Semantic navigation: maps the original SPA "page" state changes onto routes.
 *   home()            -> /
 *   explore(cat?, q?) -> /explore?cat=..&q=..
 *   detail(id)        -> /activities/:id
 *   packages(sect?)   -> /packages#sect   (ls | ex | vip | combo | cine | photo | team | quote)
 *   resto(id)         -> /dine/:id        (chamouze | citronelle)
 *   booking()         -> /booking
 *   plan()/dine()/story() -> /#plan /#dine /#story (scrolls on the home page)
 */
/** Route builders. Anchors use these for real hrefs; useGoto() navigates to the same paths. */
export const paths = {
  home: () => '/',
  explore: (cat?: string, q?: string) => {
    const p = new URLSearchParams();
    if (cat && cat !== 'all') p.set('cat', cat);
    if (q) p.set('q', q);
    const qs = p.toString();
    return '/explore' + (qs ? '?' + qs : '');
  },
  detail: (id: string) => '/activities/' + id,
  packages: (section?: string) => '/packages' + (section ? '#' + section : ''),
  resto: (id: string) => '/dine/' + id,
  booking: () => '/booking',
  plan: () => '/#plan',
  dine: () => '/#dine',
  story: () => '/#story',
  team: () => '/packages#team',
  vacancies: () => '/vacancies',
};

export function useGoto() {
  const navigate = useNavigate();

  const explore = useCallback((cat?: string, q?: string) => {
    navigate(paths.explore(cat, q));
  }, [navigate]);

  return useMemo(() => ({
    home: () => navigate('/'),
    explore,
    detail: (id: string) => navigate(paths.detail(id)),
    packages: (section?: string) => navigate('/packages' + (section ? '#' + section : '')),
    resto: (id: string) => navigate('/dine/' + id),
    booking: () => navigate('/booking'),
    plan: () => navigate('/#plan'),
    dine: () => navigate('/#dine'),
    story: () => navigate('/#story'),
    team: () => navigate(paths.team()),
    vacancies: () => navigate(paths.vacancies()),
  }), [navigate, explore]);
}
