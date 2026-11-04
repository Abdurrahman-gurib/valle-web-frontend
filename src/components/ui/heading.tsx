import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The one heading of the public pages (the .v-h1/.v-h2/.v-h3/.v-display scale
 * in global.css): Barlow black italic, uppercase. H1 and display tilt -4°, H2
 * -3°, H3 and card titles stay level. The tilt pivots on the start edge, so it
 * mirrors in Arabic.
 */
export function Heading({ level = 2, display, className, style, children, ...rest }: {
  level?: 1 | 2 | 3;
  /** the larger hero size (still an h1) */
  display?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
} & HTMLAttributes<HTMLHeadingElement>) {
  const Tag = (`h${level}`) as 'h1' | 'h2' | 'h3';
  const scale = display ? 'v-display' : `v-h${level}`;
  return <Tag className={cn(scale, className)} style={style} {...rest}>{children}</Tag>;
}

/** The heading styles as plain values, for headings that cannot be the component. */
export const headingTilt = (level: 1 | 2): CSSProperties => ({ transform: `rotate(${level === 1 ? -4 : -3}deg)`, transformOrigin: 'var(--tilt-origin, left bottom)' });
