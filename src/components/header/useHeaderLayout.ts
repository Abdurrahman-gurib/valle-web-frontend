import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useLang } from '../../i18n';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Whether the header uses the compact (hamburger) layout: on narrow screens,
 * and also wherever the desktop row would not fit in this language, instead
 * of letting the menu overlap. `navRef` goes on the desktop <nav>.
 */
export function useCompactHeader() {
  const narrow = useIsMobile();
  const lang = useLang();
  const navRef = useRef<HTMLElement>(null);
  // Window width the desktop row needs in this language.
  const [needW, setNeedW] = useState(0);
  const [winW, setWinW] = useState(() => (typeof window === 'undefined' ? 0 : window.innerWidth));
  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  useEffect(() => { setNeedW(0); }, [lang]);
  const isMobile = narrow || winW < needW;
  useIsoLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => {
      const over = nav.scrollWidth - nav.clientWidth;
      if (over > 1) setNeedW(window.innerWidth + over + 24);
    };
    measure();
    // web fonts can arrive after the first layout and widen the labels
    document.fonts?.ready.then(measure).catch(() => {});
  }, [isMobile, lang, winW]);
  return { navRef, isMobile };
}

/** True once the page has scrolled past the hero's top edge (rAF-throttled). */
export function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let raf = false;
    const onScroll = () => {
      if (raf) return;
      raf = true;
      requestAnimationFrame(() => {
        raf = false;
        setScrolled(window.scrollY > threshold);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}
