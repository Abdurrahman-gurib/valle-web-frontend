import type { CSSProperties } from 'react';

/** Caution-stripe bar (green/purple diagonals) used across the site. */
export function Stripes({ height = 12, style }: { height?: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        height,
        background: 'repeating-linear-gradient(-45deg,#33FF74 0 14px,#340057 14px 28px)',
        ...style,
      }}
    />
  );
}

/** Smaller-period variant used in menus (12px period). */
export function StripesSm({ height = 8, style }: { height?: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        height,
        background: 'repeating-linear-gradient(-45deg,#33FF74 0 12px,#340057 12px 24px)',
        ...style,
      }}
    />
  );
}
