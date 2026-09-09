import { forwardRef, useCallback, useRef, useState, type CSSProperties, type ImgHTMLAttributes } from 'react';

/** Which surface the image sits on: picks the brand placeholder colour shown while loading. */
export type ImgSurface = 'light' | 'dark';

const PLACEHOLDER: Record<ImgSurface, string> = { light: '#EBE2FF', dark: '#260040' };

export interface ImgProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading' | 'ref'> {
  src: string;
  /** Always required: every image on the public site must describe itself. */
  alt: string;
  /** Above-the-fold art: loads eagerly at high fetch priority instead of lazily. */
  priority?: boolean;
  /** Brand placeholder tint shown while the image loads (default 'light' = #EBE2FF). */
  surface?: ImgSurface;
  /** Explicit placeholder colour, overrides `surface`. Use 'transparent' to opt out. */
  placeholder?: string;
}

/**
 * Thin wrapper over <img> used across the public pages.
 * Adds lazy loading (unless `priority`), async decoding, a brand placeholder tint that
 * shows while the bytes are in flight, a fade-in once decoded, and an error fallback that
 * drops the src so the browser never paints a broken-image glyph; the placeholder stays.
 */
export const Img = forwardRef<HTMLImageElement, ImgProps>(function Img(
  { src, alt, priority, surface = 'light', placeholder, style, onLoad, onError, draggable, ...rest },
  ref,
) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const seen = useRef<string>('');

  // A cached image can finish before React attaches onLoad, so catch that on mount.
  const setRef = useCallback(
    (node: HTMLImageElement | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLImageElement | null>).current = node;
      if (node && node.complete && node.naturalWidth > 0) setState('loaded');
    },
    [ref],
  );

  // Re-arm the fade when the src changes (rails and slideshows swap src in place).
  if (seen.current !== src) {
    seen.current = src;
    if (state !== 'loading') setState('loading');
  }

  const bg = placeholder ?? PLACEHOLDER[surface];
  const baseOpacity = typeof style?.opacity === 'number' ? style.opacity : 1;
  const merged: CSSProperties = {
    backgroundColor: bg,
    ...style,
    opacity: state === 'loading' ? 0 : baseOpacity,
    transition: style?.transition ? `opacity .45s ease, ${style.transition}` : 'opacity .45s ease',
  };

  return (
    <img
      ref={setRef}
      src={state === 'error' ? undefined : src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
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
