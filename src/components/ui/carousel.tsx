import { useCallback, useEffect, useState, type ReactNode } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { isRtl, useLang } from '@/i18n';
import { cn } from '@/lib/utils';

/**
 * The site's one carousel (Embla): swipe and drag, snap per slide, keyboard
 * arrows, right-to-left in Arabic, optional autoplay that stops on hover,
 * touch and focus and never runs for reduced-motion visitors.
 */
export function useCarousel({ autoplayMs, loop = false }: { autoplayMs?: number; loop?: boolean } = {}) {
  const lang = useLang();
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const plugins = autoplayMs && !reduced ? [Autoplay({ delay: autoplayMs, stopOnInteraction: false, stopOnMouseEnter: true, stopOnFocusIn: true })] : [];
  const [viewportRef, api] = useEmblaCarousel({ align: 'start', loop, direction: isRtl(lang) ? 'rtl' : 'ltr', containScroll: 'trimSnaps', duration: reduced ? 0 : 28 }, plugins);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const update = useCallback(() => {
    if (!api) return;
    setCanPrev(api.canScrollPrev());
    setCanNext(api.canScrollNext());
  }, [api]);
  useEffect(() => {
    if (!api) return;
    update();
    api.on('select', update).on('reInit', update);
    return () => { api.off('select', update).off('reInit', update); };
  }, [api, update]);
  const prev = useCallback(() => api?.scrollPrev(), [api]);
  const next = useCallback(() => api?.scrollNext(), [api]);
  return { viewportRef, api, prev, next, canPrev, canNext };
}

export function CarouselArrows({ prev, next, canPrev, canNext, labels, tone = 'light', className }: {
  prev: () => void; next: () => void; canPrev: boolean; canNext: boolean;
  labels: { prev: string; next: string }; tone?: 'light' | 'dark'; className?: string;
}) {
  const lang = useLang();
  const rtl = isRtl(lang);
  const base = tone === 'dark'
    ? 'border-white/60 text-white hover:bg-white hover:text-valle-purple'
    : 'border-valle-purple text-valle-purple hover:bg-valle-purple hover:text-white';
  const btn = cn('inline-flex size-11 cursor-pointer items-center justify-center rounded-full border-2 bg-transparent transition-colors disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-valle-violet', base);
  // in right-to-left pages "back" points right and "forward" points left
  const Back = rtl ? ChevronRight : ChevronLeft;
  const Fwd = rtl ? ChevronLeft : ChevronRight;
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={prev} disabled={!canPrev} aria-label={labels.prev} data-testid="carousel-prev" className={btn}><Back size={20} strokeWidth={2.5} aria-hidden /></motion.button>
      <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={next} disabled={!canNext} aria-label={labels.next} data-testid="carousel-next" className={btn}><Fwd size={20} strokeWidth={2.5} aria-hidden /></motion.button>
    </div>
  );
}

/** Viewport + track. Slides are the children; give each a width with `slideClassName`. */
export function CarouselTrack({ viewportRef, children, gap = 'gap-4', className, label, onKeyDown }: {
  viewportRef: (el: HTMLElement | null) => void; children: ReactNode; gap?: string; className?: string; label: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  return (
    <div ref={viewportRef} className={cn('overflow-hidden', className)} role="region" aria-roledescription="carousel" aria-label={label} tabIndex={0} onKeyDown={onKeyDown} data-testid="carousel">
      <div className={cn('flex touch-pan-y', gap)}>{children}</div>
    </div>
  );
}

/** Keyboard support for a carousel region (arrow keys follow the reading direction). */
export function carouselKeys(prev: () => void, next: () => void, rtl: boolean) {
  return (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); (rtl ? next : prev)(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); (rtl ? prev : next)(); }
  };
}
