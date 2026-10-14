import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge assumes a font-size class also sets line-height and drops an
 * earlier `leading-*`. On this site sizes are plain arbitrary values
 * (text-[clamp(...)]) that set no line-height, so an explicit leading must
 * survive: font-size no longer conflicts with leading.
 */
const twMerge = extendTailwindMerge({ override: { conflictingClassGroups: { 'font-size': [] } } });

/** Class-name helper used by shadcn and 21st.dev components (src/components/ui). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
