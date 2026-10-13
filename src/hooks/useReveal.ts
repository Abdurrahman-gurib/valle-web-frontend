import { useEffect, useRef } from 'react';
import { animate } from 'motion';

/**
 * Scroll-reveal effect, ported from the template runtime:
 * elements with [data-reveal] (optionally [data-rdelay="ms"]) and children of
 * [data-reveal-kids] containers fade/slide in when they enter the viewport.
 *
 * Call once per page component: const ref = useReveal(); <main ref={ref}>...
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const rootRef = useRef<T | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (en.isIntersecting) {
          const el = en.target as HTMLElement;
          el.dataset.fxshown = '1';
          // Motion (motion.dev): a soft spring rather than a fixed CSS curve
          animate(el, { opacity: [0, 1], y: [30, 0], rotate: [-1, 0] }, { type: 'spring', stiffness: 120, damping: 20, mass: 0.9, delay: +(el.dataset.fxdelay || 0) / 1000 })
            .then(() => { el.style.transform = 'none'; });
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    const prep = (el: HTMLElement, delay: number) => {
      if (el.dataset.fxshown) return;
      if (!el.dataset.fxdone) {
        el.dataset.fxdone = '1';
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px) rotate(-1deg)';
        el.dataset.fxdelay = String(delay);
      }
      io.observe(el);
    };

    root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) =>
      prep(el, +(el.getAttribute('data-rdelay') || 0)),
    );
    root.querySelectorAll<HTMLElement>('[data-reveal-kids]').forEach((par) => {
      Array.from(par.children).forEach((ch, i) => prep(ch as HTMLElement, i * 90));
    });

    return () => io.disconnect();
  });

  return rootRef;
}
