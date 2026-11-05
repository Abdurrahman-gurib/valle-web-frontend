import { forwardRef, useCallback, useRef, useState, type CSSProperties, type ImgHTMLAttributes } from 'react';
import VARIANTS from '../data/imageVariants.json';

/** Per photo: [original width, widths of the lighter copies] from scripts/image-variants.py (<name>-<w>w.<ext>). */
const COPIES = VARIANTS as unknown as Record<string, number[]>;

/**
 * srcset for a site photo: its smaller copies plus the original at its own
 * width, or undefined for images without copies (logos, small files, anything
 * outside /images/).
 */
export function srcSetFor(src: string): string | undefined {
  if (!src.startsWith('/images/')) return undefined;
  const entry = COPIES[src.slice(8)];
  const ext = src.match(/\.[a-z0-9]+$/i)?.[0];
  if (!entry || !ext) return undefined;
  const [width, ...copies] = entry;
  const base = src.slice(0, -ext.length);
  return [...copies.map((w) => `${base}-${w}w${ext} ${w}w`), `${src} ${width}w`].join(', ');
}

/** Rendering the static HTML (scripts/prerender.mjs), not in a browser. */
const PRERENDER = typeof window === 'undefined';

/** Which surface the image sits on: picks the brand placeholder colour shown while loading. */
export type ImgSurface = 'light' | 'dark';

const PLACEHOLDER: Record<ImgSurface, string> = { light: '#EBE2FF', dark: '#260040' };

export interface ImgProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading' | 'ref'> {
  src: string;
  /** Always required: every image on the public site must describe itself. */
  alt: string;
  /** Above-the-fold art: loads eagerly at high fetch priority instead of lazily. */
  priority?: boolean;
  /** Load as soon as the page does, at normal priority: for carousel slides that sit off screen sideways. */
  eager?: boolean;
  /** Brand placeholder tint shown while the image loads (default 'light' = #EBE2FF). */
  surface?: ImgSurface;
  /** Explicit placeholder colour, overrides `surface`. Use 'transparent' to opt out. */
  placeholder?: string;
  /**
   * How wide the image is drawn, for the browser's pick from the srcset (default
   * 100vw). Cards pass their column width so phones fetch the small copy.
   */
  sizes?: string;
}

/**
 * Thin wrapper over <img> used across the public pages.
 * Adds lazy loading (unless `priority`), async decoding, a srcset of the smaller copies
 * (scripts/image-variants.py; pass `sizes` when the image is narrower than the screen),
 * a brand placeholder tint that
 * shows while the bytes are in flight, a fade-in once decoded, and an error fallback that
 * drops the src so the browser never paints a broken-image glyph; the placeholder stays.
 */
export const Img = forwardRef<HTMLImageElement, ImgProps>(function Img(
  { src, alt, priority, eager, surface = 'light', placeholder, style, onLoad, onError, draggable, sizes, srcSet, ...rest },
  ref,
) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const seen = useRef<string>('');

  // A cached image can finish before React attaches onLoad, so catch that on mount.
  const setRef = useCallback(
    (node: HTMLImageElement | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (node && node.complete && node.naturalWidth > 0) setState('loaded');
    },
    [ref],
  );

  // Re-arm the fade when the src changes (rails and slideshows swap src in place).
  if (seen.current !== src) {
    seen.current = src;
    if (state !== 'loading') setState('loading');
  }

  const set = state === 'error' ? undefined : srcSet ?? srcSetFor(src);
  const bg = placeholder ?? PLACEHOLDER[surface];
  const baseOpacity = typeof style?.opacity === 'number' ? style.opacity : 1;
  const merged: CSSProperties = {
    backgroundColor: bg,
    ...style,
    // No fade in the prerendered HTML (the browser shows each photo as it arrives, long
    // before the app has loaded, and it counts as the page's first content), nor for
    // above-the-fold art; the fade is for images the live app swaps in.
    opacity: state === 'loading' && !priority && !PRERENDER ? 0 : baseOpacity,
    transition: style?.transition ? `opacity .45s ease, ${style.transition}` : 'opacity .45s ease',
  };

  return (
    <img
      ref={setRef}
      // loading, priority and srcset go before src so the browser makes its pick once
      loading={priority || eager ? 'eager' : 'lazy'}
      {...(priority ? ({ fetchpriority: 'high' } as Record<string, string>) : {})}
      decoding="async"
      {...(set ? { srcSet: set, sizes: sizes ?? '100vw' } : {})}
      src={state === 'error' ? undefined : src}
      alt={alt}
      draggable={draggable ?? false}
      onLoad={(e) => {
        setState('loaded');
        onLoad?.(e);
      }}
      onError={(e) => {
        setState('error');
        onError?.(e);
      }}
      style={merged}
      {...rest}
    />
  );
});
