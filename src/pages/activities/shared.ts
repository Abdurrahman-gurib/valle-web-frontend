import type { CSSProperties } from 'react';

/** Type styles shared by the explore list and the activity pages. */
export const MONO = "'Chivo Mono',monospace";
export const BARLOW = "'Barlow',sans-serif";

/** The small mono section label ("GOOD TO KNOW", "SEE ALSO"). */
export const sectionLabel: CSSProperties = { fontFamily: MONO, fontSize: 11.5, fontWeight: 600, letterSpacing: '.14em', color: 'rgba(52,0,87,.7)' };

/** Full-bleed cover image inside a positioned box. */
export const coverImg: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' };
