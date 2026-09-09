import { useMemo, useState, type CSSProperties } from 'react';

export interface HoverBind {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/**
 * Ports the template's `style-hover="..."` attributes:
 *   const [h, bind] = useHover();
 *   <button {...bind} style={{ ...base, ...(h ? hoverStyle : undefined) }} />
 */
export function useHover(): [boolean, HoverBind] {
  const [hovered, setHovered] = useState(false);
  const bind = useMemo<HoverBind>(() => ({
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  }), []);
  return [hovered, bind];
}

/** Convenience for style merging without repeating the ternary everywhere. */
export function hov(hovered: boolean, style: CSSProperties): CSSProperties | undefined {
  return hovered ? style : undefined;
}
