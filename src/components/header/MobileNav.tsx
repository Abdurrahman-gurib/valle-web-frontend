import { Fwd } from '@/components/ui/arrows';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useApp } from '../../store/AppStore';
import { useCatalog } from '../../store/CatalogContext';
import { paths, useGoto } from '../../lib/nav';
import { useT, _t } from '../../i18n';
import { Stripes } from '../Stripes';
import { SpaLink, mobileNavRow } from './parts';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import type { MenuGroup } from './packageGroups';

type Go = (fn: () => void) => () => void;

const CATEGORY_TILES: [label: string, cat: string, bg: string, fg: string, rot: number][] = [
  [_t('Adventure'), 'adventure', '#D6173F', '#FFFFFF', -1],
  [_t('Nature'), 'nature', '#33FF74', '#340057', 1],
  [_t('Kids Park'), 'kids', '#FFFC33', '#340057', 1],
  [_t('Tours & Groups'), 'tours', '#7333FF', '#FFFFFF', -1],
];

/** One full-width row of the overlay: label left, yellow arrow right. */
function NavRow({ href, onClick, delay, arrow = 'text-[rgba(255,252,51,.7)]', children }: { href: string; onClick: () => void; delay: string; arrow?: string; children: ReactNode }) {
  return (
    <SpaLink href={href} onClick={onClick} className={cn(mobileNavRow, delay)} color="#FFFFFF">
      {children}<span className={arrow}><Fwd /></span>
    </SpaLink>
  );
}

/** The compact layout's full-screen menu under the header bar. */
export function MobileNav({ groups, go, searchQ, setSearchQ, onSearch, close, gotoGroups, dine, header }: {
  groups: MenuGroup[]; go: Go; searchQ: string; setSearchQ: (q: string) => void; onSearch: () => void; close: () => void; gotoGroups: () => void;
  dine: [string, string][];
  /** The header bar stays usable (and in the Tab cycle) while the menu covers the page. */
  header: () => HTMLElement | null;
}) {
  const t = useT();
  const app = useApp();
  const catalog = useCatalog();
  const goto = useGoto();
  const navigate = useNavigate();
  // the page behind goes inert; focus starts on the menu itself, so no phone keyboard pops up
  const trap = useFocusTrap<HTMLElement>(true, { onEscape: close, also: () => [header()], initialFocus: (): HTMLElement | null => document.getElementById('mobile-nav') });
  return (
    <nav
      ref={trap}
      id="mobile-nav"
      aria-label={t('Menu')}
      tabIndex={-1}
      className="fixed top-[70px] short:top-[54px] right-0 bottom-0 left-0 z-[89] bg-valle-deep overflow-y-auto pt-[16px] px-[20px] pb-[28px] flex flex-col"
    >
      <div className="flex gap-[8px] animate-[vfadeup_.3s_ease_both]">
        <input
          className="vbar-input flex-1 min-w-0 border-[1.5px] border-solid border-[rgba(255,255,255,.3)] bg-[rgba(255,255,255,.12)] rounded-[999px] py-[12px] px-[18px] [font-family:inherit] text-[14px] text-white outline-none"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
          placeholder={t('Search ziplines, tortoises, waterfalls…')}
          aria-label={t('Search experiences')}
          type="search"
          enterKeyHint="search"
        />
        <button
          onClick={onSearch}
          aria-label={t('Search')}
          className="vbtn vbtn-on-dark size-[44px] shrink-0 p-0"
        >
          <Fwd />
        </button>
      </div>
      <div className="grid grid-cols-[1fr_1fr] gap-[8px] mt-[14px] mb-[4px] animate-[vfadeup_.3s_ease_both] [animation-delay:.05s]">
        {CATEGORY_TILES.map(([label, cat, bg, fg, rot]) => (
          <SpaLink
            key={cat}
            href={paths.explore(cat)}
            onClick={go(() => goto.explore(cat))}
            className="press block cursor-pointer rounded-[12px] py-[13px] px-[14px] font-display italic font-extrabold text-[15px] uppercase"
            color={fg}
            style={{ background: bg, transform: `rotate(${rot}deg)` }}
          >
            {t(label)}
          </SpaLink>
        ))}
      </div>
      <NavRow href={paths.home()} onClick={go(goto.home)} delay="[animation-delay:.1s]">{t('Home')}</NavRow>
      <NavRow href={paths.explore('all')} onClick={go(() => goto.explore('all'))} delay="[animation-delay:.14s]" arrow="text-valle-yellow">{t('All {n} experiences', { n: catalog.ACTS.length })}</NavRow>
      <NavRow href={paths.packages()} onClick={go(() => goto.packages())} delay="[animation-delay:.16s]">{t('Packages')}</NavRow>
      {/* the packages menu's groups, folded so the overlay stays short */}
      <details data-testid="mobile-packages-menu" className="border-b border-solid border-[rgba(255,255,255,.16)] animate-[vfadeup_.3s_ease_both] [animation-delay:.17s]">
        <summary className="cursor-pointer py-[12px] font-mono text-[11.5px] font-bold tracking-[.12em] text-valle-yellow">{t('ALL PACKAGES BY TYPE')}</summary>
        <div className="grid grid-cols-[1fr_1fr] gap-x-[14px] gap-y-[12px] pb-[14px]">
          {groups.map((g) => (
            <div key={g.title} className="min-w-0">
              <div className="font-mono text-[10.5px] font-bold tracking-[.12em] text-valle-green mb-[3px]">{g.title}</div>
              {g.links.map(([name, href]) => (
                <SpaLink key={href} href={href} onClick={go(() => navigate(href))} className="block py-[5px] text-[14px] font-medium leading-[1.3]" color="#FFFFFF">{name}</SpaLink>
              ))}
            </div>
          ))}
        </div>
      </details>
      <button type="button" onClick={() => { close(); app.openRateGate(); }} className={cn(mobileNavRow, 'border-x-0 border-t-0 bg-transparent px-0 [animation-delay:.18s]')}>
        <span className="flex gap-[7px]">{t('Prices shown:')}<span className="text-[rgba(255,255,255,.72)]">{t(app.rateWord)}</span></span>
        <span className="font-mono text-[11px] font-bold bg-valle-yellow text-valle-purple rounded-[999px] py-[5px] px-[10px] whitespace-nowrap">{app.rateTag} ⇄</span>
      </button>
      <NavRow href={paths.groups()} onClick={go(gotoGroups)} delay="[animation-delay:.18s]">{t('Groups & schools')}</NavRow>
      <NavRow href={paths.plan()} onClick={go(goto.plan)} delay="[animation-delay:.2s]">{t('Plan your visit')}</NavRow>
      <details data-testid="mobile-dine-menu" className="border-b border-solid border-[rgba(255,255,255,.16)] animate-[vfadeup_.3s_ease_both] [animation-delay:.22s]">
        <summary className="group/dine flex cursor-pointer list-none items-center justify-between py-[12px] text-[16.5px] font-semibold text-white [&::-webkit-details-marker]:hidden">
          {t('Dine')}<ChevronDown aria-hidden size={18} strokeWidth={2.5} className="text-[rgba(255,252,51,.7)] [transition:transform_var(--t-fast)] group-open/dine:rotate-180" />
        </summary>
        <div className="grid gap-[2px] pb-[12px]">
          {dine.map(([name, href]) => (
            <SpaLink key={href} href={href} onClick={go(() => navigate(href))} className="block py-[7px] text-[15px] font-medium" color="#FFFFFF">{name}</SpaLink>
          ))}
        </div>
      </details>
      <NavRow href={paths.story()} onClick={go(goto.story)} delay="[animation-delay:.26s]">{t('Our story')}</NavRow>
      <button type="button" onClick={() => { close(); app.openDay(); }} className={cn(mobileNavRow, 'border-x-0 border-t-0 bg-transparent px-0 [animation-delay:.3s]')}>
        <span className="flex gap-[10px] items-center">
          {t('My Day')}
          {app.hasSel && (
            <span className="bg-valle-red-ink text-white rounded-[999px] min-w-[22px] h-[22px] inline-flex items-center justify-center text-[12px] px-[6px]">
              {app.selCount}
            </span>
          )}
        </span>
        <span className="text-[rgba(255,252,51,.7)]"><Fwd /></span>
      </button>
      <button
        onClick={go(goto.booking)}
        className="vbtn vbtn-on-dark vbtn-block mt-[14px] text-[16px] animate-[vfadeup_.3s_ease_both] [animation-delay:.34s]"
      >
        {t('Book now')} <Fwd />
      </button>
      <div className="mt-[14px] animate-[vfadeup_.3s_ease_both] [animation-delay:.38s]">
        <Stripes height={6} style={{ borderRadius: 99 }} />
        <div className="font-mono text-[11px] text-[rgba(255,255,255,.7)] mt-[10px]">
          {t('OPEN DAILY · 09:00–17:30 · CHAMOUNY, MAURITIUS')}
        </div>
      </div>
    </nav>
  );
}
