/**
 * "My Day" selection keys. A line is either a whole experience (`zipline`) or one
 * priced option of it (`zipline::Advenature Flight · 5.5 km, 11 lines`), the option
 * being the exact label of a catalog.PL row for that experience.
 */
export const SEL_SEP = '::';

export function selKey(id: string, variant?: string | null): string {
  return variant ? id + SEL_SEP + variant : id;
}

export function parseSelKey(key: string): { id: string; variant?: string } {
  const i = key.indexOf(SEL_SEP);
  return i < 0 ? { id: key } : { id: key.slice(0, i), variant: key.slice(i + SEL_SEP.length) };
}
