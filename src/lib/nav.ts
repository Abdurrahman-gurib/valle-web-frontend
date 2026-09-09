import { useNavigate } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

/**
 * Semantic navigation: maps the original SPA "page" state changes onto routes.
 *   home()            -> /
 *   explore(cat?, q?) -> /explore?cat=..&q=..
 *   detail(id)        -> /experience/:id
 *   packages(sect?)   -> /packages#sect   (ls | ex | vip | combo | cine | photo | team | quote)
 *   resto(id)         -> /dine/:id        (chamouze | citronelle)
 *   booking()         -> /booking
 *   plan()/dine()/story() -> /#plan /#dine /#story (scrolls on the home page)
 */
export function useGoto() {
  const navigate = useNavigate();

  const explore = useCallback((cat?: string, q?: string) => {
    const p = new URLSearchParams();
    if (cat && cat !== 'all') p.set('cat', cat);
    if (q) p.set('q', q);
    const qs = p.toString();
    navigate('/explore' + (qs ? '?' + qs : ''));
  }, [navigate]);

  return useMemo(() => ({
    home: () => navigate('/'),
    explore,
    detail: (id: string) => navigate('/experience/' + id),
    packages: (section?: string) => navigate('/packages' + (section ? '#' + section : '')),
    resto: (id: string) => navigate('/dine/' + id),
    booking: () => navigate('/booking'),
    plan: () => navigate('/#plan'),
    dine: () => navigate('/#dine'),
    story: () => navigate('/#story'),
    team: () => navigate('/packages#team'),
  }), [navigate, explore]);
}
