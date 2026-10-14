import { createElement, type ComponentType } from 'react';

/**
 * A page component that lives in its own chunk but never shows a loading
 * gap: once its module has been fetched it renders synchronously, like a
 * normal import. Until then it suspends (React.lazy semantics).
 *
 * The prerender and the first browser render call `preloadPagesFor(path)` /
 * `preloadAllPages()` first, so the prerendered HTML is complete and the
 * browser swaps it for the live page without a flash.
 */
type Loader<P> = () => Promise<{ default: ComponentType<P> }>;
export interface LazyPage<P> { (props: P): ReturnType<typeof createElement>; preload: () => Promise<void> }

export function lazyPage<P extends object>(load: Loader<P>): LazyPage<P> {
  let Comp: ComponentType<P> | null = null;
  let pending: Promise<void> | null = null;
  const preload = () => (pending ??= load().then((m) => { Comp = m.default; }));
  const Page = ((props: P) => {
    if (!Comp) throw preload();
    return createElement(Comp, props);
  }) as unknown as LazyPage<P>;
  Page.preload = preload;
  return Page;
}

/** Route patterns (without the language prefix) to the page that serves them. */
const routes: [RegExp, () => Promise<void>][] = [];
export function registerPage(pattern: RegExp, page: { preload: () => Promise<void> }) { routes.push([pattern, page.preload]); }

export function preloadPagesFor(pathname: string): Promise<void> {
  const bare = pathname.replace(/^\/(fr|de|it|ar|ru|es|hi)(?=\/|$)/, '') || '/';
  const hit = routes.find(([re]) => re.test(bare));
  return hit ? hit[1]() : Promise.resolve();
}
export const preloadAllPages = (): Promise<void[]> => Promise.all(routes.map(([, p]) => p()));
