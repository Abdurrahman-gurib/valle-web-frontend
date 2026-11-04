import { useEffect, useRef, useState, type KeyboardEvent as RKeyboardEvent, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppStore';
import { useCatalog } from '../store/CatalogContext';
import { paths, useGoto } from '../lib/nav';
import { cn } from '@/lib/utils';
import { MobileBar } from './MobileBar';
import { LanguagePicker, LanguageSuggest } from './LanguagePicker';
import { useLang, useT, _t } from '../i18n';
import { NavBtn, hamburgerBar, type CSSVars } from './header/parts';
import { useCompactHeader, useScrolled } from './header/useHeaderLayout';
import { packageGroups } from './header/packageGroups';
import { ExploreMenu, PackagesMenu } from './header/MegaMenus';
import { MobileNav } from './header/MobileNav';
import { focusablesIn } from '../hooks/useFocusTrap';

// app.rateWord is one of these; listed so the extractor picks them up.
const RATE_WORD_KEYS = [_t('Resident'), _t('Visitor')];
void RATE_WORD_KEYS;

// Shorter wording for the top menu only, where French and Italian run long.
// English falls back to the plain label.
const MENU_KEYS = [_t('menu:Plan your visit'), _t('menu:Our story'), _t('menu:Vacancies')];
void MENU_KEYS;

type Mega = 'explore' | 'pkg' | null;
/** Hover intent: a short wait before a menu opens, a longer one before it closes, so the pointer can cross into the panel. */
const HOVER_OPEN_MS = 120;
const HOVER_CLOSE_MS = 220;

export function Header() {
  const app = useApp();
  const catalog = useCatalog();
  const goto = useGoto();
  const lang = useLang();
  const { navRef, isMobile } = useCompactHeader();
  const location = useLocation();
  const navigate = useNavigate();
  const t = useT();
  const menu = (en: string) => { const k = 'menu:' + en; const s = t(k); return s === k ? t(en) : s; };
  // Careers lives outside the catalog-driven nav helpers, so it routes directly.
  const gotoVacancies = () => navigate(paths.vacancies());

  const scrolled = useScrolled();
  const [mega, setMega] = useState<Mega>(null);
  const megaOpen = mega === 'explore';
  const megaPkgOpen = mega === 'pkg';
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const headerRef = useRef<HTMLElement>(null);
  const exploreBtn = useRef<HTMLButtonElement>(null);
  const pkgBtn = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedBy = useRef<'hover' | 'click' | 'key'>('click');

  // close menus on navigation
  useEffect(() => {
    setMega(null);
    setMobileNavOpen(false);
  }, [location]);
  useEffect(() => () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }, []);

  const triggerOf = (m: Mega) => (m === 'explore' ? exploreBtn.current : m === 'pkg' ? pkgBtn.current : null);
  const focusFirstLink = () => requestAnimationFrame(() => { if (panelRef.current) focusablesIn(panelRef.current)[0]?.focus(); });

  // ---- hover (mouse only: a tap is a click) -------------------------------
  const clearHover = () => { if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; } };
  const hoverIn = (m: Exclude<Mega, null>) => (e: RPointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    clearHover();
    if (mega === m) return;
    hoverTimer.current = setTimeout(() => { openedBy.current = 'hover'; setMega(m); }, mega ? 0 : HOVER_OPEN_MS);
  };
  const hoverOut = (e: RPointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    clearHover();
    hoverTimer.current = setTimeout(() => {
      // a keyboard user inside the panel keeps it
      if (panelRef.current?.contains(document.activeElement)) return;
      setMega(null);
    }, HOVER_CLOSE_MS);
  };
  const onTriggerClick = (m: Exclude<Mega, null>) => (e: RMouseEvent) => {
    clearHover();
    const keyboard = e.detail === 0; // Enter / Space
    // a click on a menu the hover just opened keeps it open
    if (mega === m && (openedBy.current !== 'hover' || keyboard)) { setMega(null); return; }
    openedBy.current = keyboard ? 'key' : 'click';
    setMega(m);
    if (keyboard) focusFirstLink();
  };
  const onTriggerKey = (m: Exclude<Mega, null>) => (e: RKeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); openedBy.current = 'key'; setMega(m); focusFirstLink(); }
    // Tab from an open trigger goes into its panel (the panel sits after the actions in the DOM)
    else if (e.key === 'Tab' && !e.shiftKey && mega === m) { e.preventDefault(); focusFirstLink(); }
  };
  // Escape closes; Tab past the last link closes and carries on along the menu bar
  const onPanelKey = (e: RKeyboardEvent) => {
    const tr = triggerOf(mega);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setMega(null); tr?.focus(); return; }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const items = focusablesIn(panelRef.current);
    if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); tr?.focus(); return; }
    if (!e.shiftKey && document.activeElement === items[items.length - 1]) {
      e.preventDefault();
      const bar = navRef.current ? focusablesIn(navRef.current) : [];
      const next = tr ? bar[bar.indexOf(tr) + 1] : undefined;
      setMega(null);
      (next ?? tr)?.focus();
    }
  };
  // Escape from anywhere (a hover-opened menu) and focus leaving trigger + panel close the menu
  useEffect(() => {
    if (!mega) return;
    const tr = mega === 'explore' ? exploreBtn.current : pkgBtn.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const inMenu = !!panelRef.current?.contains(document.activeElement) || document.activeElement === tr;
      setMega(null);
      if (inMenu) tr?.focus();
    };
    const onFocus = (e: FocusEvent) => {
      const el = e.target as Node;
      if (panelRef.current?.contains(el) || tr?.contains(el)) return;
      setMega(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', onFocus);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('focusin', onFocus); };
  }, [mega]);

  const isHome = location.pathname === '/';
  const onHeroTop = isHome && !scrolled && !mobileNavOpen && !megaOpen && !megaPkgOpen;
  const headerFg = mobileNavOpen || onHeroTop ? '#FFFFFF' : '#340057';
  const headerBg = mobileNavOpen
    ? '#260040'
    : onHeroTop
      ? 'linear-gradient(rgba(31,0,51,.55), rgba(31,0,51,0))'
      : 'rgba(255,255,255,.94)';
  const headerBorder = mobileNavOpen || onHeroTop ? '1px solid transparent' : '1px solid #EBE2FF';

  const headerStyle: CSSVars = { background: headerBg, borderBottom: headerBorder, '--fg': headerFg };

  const closeAll = () => { setMega(null); setMobileNavOpen(false); };
  const go = (fn: () => void) => () => { closeAll(); fn(); };
  const pkgGroups = packageGroups(t, catalog);

  const searchGo = () => { closeAll(); goto.explore('all', searchQ.trim() || undefined); };

  return (
    <>
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-[90] [transition:background_.3s_ease] md:backdrop-blur-[14px]"
        // --fg carries the state-driven foreground colour to the class-styled controls below
        style={headerStyle}
      >
        {/* The language offer rides on top of the fixed header so nothing covers it. */}
        <LanguageSuggest />
        <div className={cn(
          // full width: the logo hugs the left edge and the actions the right
          'mx-auto px-[clamp(12px,2.5vw,40px)] h-[70px] short:h-[54px] items-center gap-[clamp(10px,2.5vw,32px)]',
          // desktop: three columns so the menu sits in the true centre between logo and actions
          isMobile ? 'flex' : 'grid grid-cols-[1fr_auto_1fr]',
        )}>
          <a
            href="/"
            aria-label={t('VALLÉ Advenature Park, home')}
            onClick={(e) => { e.preventDefault(); go(goto.home)(); }}
            className="cursor-pointer flex flex-col leading-none select-none [transform:rotate(-4deg)] shrink-0 justify-self-start"
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            <span className={cn('font-display italic font-black tracking-[-0.01em]', isMobile ? 'text-[24px]' : 'text-[27px]')} style={{ color: headerFg }}>VALLÉ</span>
            <span className={cn('font-mono font-semibold opacity-75 mt-[2px]', isMobile ? 'text-[7px] tracking-[.16em]' : 'text-[8px] tracking-[.22em]')} style={{ color: headerFg }}>ADVENATURE™ PARK</span>
          </a>

          {!isMobile && (
            <>
              <nav ref={navRef} className="flex items-center gap-[2px] min-w-0 justify-center overflow-hidden">
                <NavBtn
                  snug={lang !== 'en'} label={t('Explore')} chev={megaOpen ? '▲' : '▼'} color={headerFg} btnRef={exploreBtn} controls="mega-explore"
                  onClick={onTriggerClick('explore')} onKeyDown={onTriggerKey('explore')} onPointerEnter={hoverIn('explore')} onPointerLeave={hoverOut}
                />
                <NavBtn
                  snug={lang !== 'en'} label={t('Packages')} chev={megaPkgOpen ? '▲' : '▼'} color={headerFg} btnRef={pkgBtn} controls="mega-packages"
                  onClick={onTriggerClick('pkg')} onKeyDown={onTriggerKey('pkg')} onPointerEnter={hoverIn('pkg')} onPointerLeave={hoverOut}
                />
                <NavBtn snug={lang !== 'en'} label={menu('Plan your visit')} href={paths.plan()} color={headerFg} onClick={go(goto.plan)} />
                <NavBtn snug={lang !== 'en'} label={t('Dine')} href={paths.dine()} color={headerFg} onClick={go(goto.dine)} />
                <NavBtn snug={lang !== 'en'} label={menu('Our story')} href={paths.story()} color={headerFg} onClick={go(goto.story)} />
                <NavBtn snug={lang !== 'en'} label={menu('Vacancies')} href={paths.vacancies()} color={headerFg} onClick={go(gotoVacancies)} />
              </nav>
              <div className="flex items-center gap-[10px] justify-self-end">
                <button
                  onClick={app.openRateGate}
                  title={t('Change your rate')}
                  className={cn("border-[1.5px] border-solid bg-transparent cursor-pointer font-mono text-[11px]", headerFg === "#FFFFFF" ? "border-white/55" : "border-[rgba(115,51,255,.5)]", " font-bold tracking-[.1em] text-[var(--fg)] py-[9px] px-[12px] rounded-[999px] whitespace-nowrap leading-none hover:border-valle-violet hover:bg-valle-violet hover:text-white")}
                >
                  {app.rateTag} ⇄
                </button>
                <LanguagePicker fg={headerFg} />
                <button
                  onClick={() => { setMega(null); app.openDay(); }}
                  title={t('Your selected experiences')}
                  className="border-[1.5px] border-solid border-[var(--fg)] opacity-[.92] hover:opacity-100 bg-transparent cursor-pointer [font-family:inherit] text-[13.5px] font-bold text-[var(--fg)] py-[9px] px-[15px] rounded-[999px] flex items-center gap-[8px] whitespace-nowrap hover:[transform:translateY(-1px)]"
                >
                  {t('My Day')}
                  {app.hasSel && (
                    <span className="bg-valle-red-ink text-white rounded-[999px] min-w-[20px] h-[20px] inline-flex items-center justify-center text-[11.5px] px-[5px]">
                      {app.selCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={go(goto.booking)}
                  className={cn('vbtn min-h-[44px] px-5 text-[14px]', headerFg === '#FFFFFF' ? 'vbtn-on-dark' : 'vbtn-primary')}
                >
                  {t('Book now')}
                </button>
              </div>
            </>
          )}

          {isMobile && (
            // fits 360-414px with every control at least 40px: once the My Day count shows,
            // "Book" leaves the bar on the narrowest phones (the bottom bar carries it, with the count)
            <div className="flex items-center gap-[6px] ml-auto shrink-0">
              <button
                onClick={app.openRateGate}
                title={t('Change your rate')}
                className="border-[1.5px] border-solid border-[rgba(115,51,255,.55)] bg-transparent cursor-pointer font-mono text-[10px] font-bold tracking-[.06em] text-[var(--fg)] min-h-[40px] min-w-[40px] px-[8px] rounded-[999px] whitespace-nowrap leading-none shrink-0"
              >
                {app.rateTag}
              </button>
              <LanguagePicker fg={headerFg} compact />
              {app.hasSel && (
                <button
                  onClick={app.openDay}
                  title={t('My Day')}
                  aria-label={t('My Day') + ' · ' + app.selCount}
                  className="border-0 bg-valle-purple cursor-pointer font-display italic text-[16px] font-black text-white w-[40px] h-[40px] p-0 rounded-[999px] flex items-center justify-center shrink-0 leading-none shadow-[0_3px_10px_rgba(52,0,87,.35)]"
                >
                  {app.selCount}
                </button>
              )}
              <button
                onClick={go(goto.booking)}
                className={cn('vbtn vbtn-sm shrink-0 px-3.5 text-[13px]', headerFg === '#FFFFFF' ? 'vbtn-on-dark' : 'vbtn-primary', app.hasSel && 'max-[419px]:hidden')}
              >
                {t('Book')}
              </button>
              <button
                onClick={() => { setMobileNavOpen(!mobileNavOpen); setMega(null); }}
                aria-label={t('Menu')}
                aria-expanded={mobileNavOpen}
                aria-controls="mobile-nav"
                data-testid="menu-toggle"
                className="border-[1.5px] border-solid border-[var(--fg)] bg-transparent cursor-pointer text-[var(--fg)] w-[40px] h-[40px] shrink-0 rounded-[999px] flex flex-col items-center justify-center gap-[3px]"
              >
                <span className={cn(hamburgerBar, '[transition:transform_.25s_ease]', mobileNavOpen && '[transform:translateY(5px)_rotate(45deg)]')} />
                <span className={cn(hamburgerBar, '[transition:opacity_.2s_ease]', mobileNavOpen ? 'opacity-0' : 'opacity-100')} />
                <span className={cn(hamburgerBar, '[transition:transform_.25s_ease]', mobileNavOpen && '[transform:translateY(-5px)_rotate(-45deg)]')} />
              </button>
            </div>
          )}
        </div>

        {mega && !isMobile && (
          // pointer and keys of the open panel; the panel itself is positioned against the header
          <div
            ref={panelRef}
            id={megaPkgOpen ? 'mega-packages' : 'mega-explore'}
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') clearHover(); }}
            onPointerLeave={hoverOut}
            onKeyDown={onPanelKey}
          >
            {megaPkgOpen ? <PackagesMenu groups={pkgGroups} go={go} /> : <ExploreMenu go={go} />}
          </div>
        )}
      </header>

      {mobileNavOpen && (
        <MobileNav
          groups={pkgGroups} go={go} searchQ={searchQ} setSearchQ={setSearchQ} onSearch={searchGo}
          close={() => setMobileNavOpen(false)} gotoVacancies={gotoVacancies} header={() => headerRef.current}
        />
      )}

      <MobileBar mobileNavOpen={mobileNavOpen} />
    </>
  );
}
