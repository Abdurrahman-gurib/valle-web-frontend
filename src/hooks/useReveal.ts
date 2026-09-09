import { useEffect, useRef } from 'react';

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
          el.style.opacity = '1';
          el.style.transform = 'none';
          el.dataset.fxshown = '1';
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
        el.style.transition =
          `opacity .7s cubic-bezier(.2,.7,.2,1) ${delay}ms, transform .7s cubic-bezier(.2,.7,.2,1) ${delay}ms`;
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
