import { useEffect, useState } from 'react';
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

// app.rateWord is one of these; listed so the extractor picks them up.
const RATE_WORD_KEYS = [_t('Resident'), _t('Visitor')];
void RATE_WORD_KEYS;

// Shorter wording for the top menu only, where French and Italian run long.
// English falls back to the plain label.
const MENU_KEYS = [_t('menu:Plan your visit'), _t('menu:Our story'), _t('menu:Vacancies')];
void MENU_KEYS;

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
  const [megaOpen, setMegaOpen] = useState(false);
  const [megaPkgOpen, setMegaPkgOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  // close menus on navigation
  useEffect(() => {
    setMegaOpen(false);
    setMegaPkgOpen(false);
    setMobileNavOpen(false);
  }, [location]);

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

  const closeAll = () => { setMegaOpen(false); setMegaPkgOpen(false); setMobileNavOpen(false); };
  const go = (fn: () => void) => () => { closeAll(); fn(); };
  const pkgGroups = packageGroups(t, catalog);

  const searchGo = () => { closeAll(); goto.explore('all', searchQ.trim() || undefined); };

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-[90] [transition:background_.3s_ease] md:backdrop-blur-[14px]"
        // --fg carries the state-driven foreground colour to the class-styled controls below
        style={headerStyle}
      >
        {/* The language offer rides on top of the fixed header so nothing covers it. */}
        <LanguageSuggest />
        <div className={cn(
          // full width: the logo hugs the left edge and the actions the right
          'mx-auto px-[clamp(16px,2.5vw,40px)] h-[70px] items-center gap-[clamp(12px,2.5vw,32px)]',
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
            <span className="font-display italic font-black text-[27px] tracking-[-0.01em]" style={{ color: headerFg }}>VALLÉ</span>
            <span className="font-mono text-[8px] font-semibold tracking-[.22em] opacity-75 mt-[2px]" style={{ color: headerFg }}>ADVENATURE™ PARK</span>
          </a>

          {!isMobile && (
            <>
              <nav ref={navRef} className="flex items-center gap-[2px] min-w-0 justify-center overflow-hidden">
                <NavBtn snug={lang !== 'en'} label={t('Explore')} chev={megaOpen ? '▲' : '▼'} color={headerFg} onClick={() => { setMegaOpen(!megaOpen); setMegaPkgOpen(false); }} />
                <NavBtn snug={lang !== 'en'} label={t('Packages')} chev={megaPkgOpen ? '▲' : '▼'} color={headerFg} onClick={() => { setMegaPkgOpen(!megaPkgOpen); setMegaOpen(false); }} />
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
                  onClick={() => { setMegaOpen(false); setMegaPkgOpen(false); app.openDay(); }}
                  title={t('Your selected experiences')}
                  className="border-[1.5px] border-solid border-[var(--fg)] opacity-[.92] hover:opacity-100 bg-transparent cursor-pointer [font-family:inherit] text-[13.5px] font-bold text-[var(--fg)] py-[9px] px-[15px] rounded-[999px] flex items-center gap-[8px] whitespace-nowrap hover:[transform:translateY(-1px)]"
                >
                  {t('My Day')}
                  {app.hasSel && (
                    <span className="bg-valle-red text-white rounded-[999px] min-w-[20px] h-[20px] inline-flex items-center justify-center text-[11.5px] px-[5px]">
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
            <div className="flex items-center gap-[7px] ml-auto">
              <button
                onClick={app.openRateGate}
                title={t('Change your rate')}
                className="border-[1.5px] border-solid border-[rgba(115,51,255,.55)] bg-transparent cursor-pointer font-mono text-[10px] font-bold tracking-[.06em] text-[var(--fg)] py-[8px] px-[9px] rounded-[999px] whitespace-nowrap leading-none shrink-0"
              >
                {app.rateTag}
              </button>
              <LanguagePicker fg={headerFg} compact />
              {app.hasSel && (
                <button
                  onClick={app.openDay}
                  title={t('My Day')}
                  aria-label={t('My Day')}
                  className="border-0 bg-valle-purple cursor-pointer font-display italic text-[16px] font-black text-white w-[34px] h-[34px] p-0 rounded-[999px] flex items-center justify-center shrink-0 leading-none shadow-[0_3px_10px_rgba(52,0,87,.35)]"
                >
                  {app.selCount}
                </button>
              )}
              <button
                onClick={go(goto.booking)}
                className={cn('vbtn vbtn-sm shrink-0 px-3.5 text-[13px]', headerFg === '#FFFFFF' ? 'vbtn-on-dark' : 'vbtn-primary')}
              >
                {t('Book')}
              </button>
              <button
                onClick={() => { setMobileNavOpen(!mobileNavOpen); setMegaOpen(false); setMegaPkgOpen(false); }}
                aria-label={t('Menu')}
                className="border-[1.5px] border-solid border-[var(--fg)] bg-transparent cursor-pointer text-[var(--fg)] w-[40px] h-[40px] rounded-[999px] flex flex-col items-center justify-center gap-[3px]"
              >
                <span className={cn(hamburgerBar, '[transition:transform_.25s_ease]', mobileNavOpen && '[transform:translateY(5px)_rotate(45deg)]')} />
                <span className={cn(hamburgerBar, '[transition:opacity_.2s_ease]', mobileNavOpen ? 'opacity-0' : 'opacity-100')} />
                <span className={cn(hamburgerBar, '[transition:transform_.25s_ease]', mobileNavOpen && '[transform:translateY(-5px)_rotate(-45deg)]')} />
              </button>
            </div>
          )}
        </div>

        {megaPkgOpen && !isMobile && <PackagesMenu groups={pkgGroups} go={go} />}
        {megaOpen && !isMobile && <ExploreMenu go={go} />}
      </header>

      {mobileNavOpen && (
        <MobileNav
          groups={pkgGroups} go={go} searchQ={searchQ} setSearchQ={setSearchQ} onSearch={searchGo}
          close={() => setMobileNavOpen(false)} gotoVacancies={gotoVacancies}
        />
      )}

      <MobileBar mobileNavOpen={mobileNavOpen} />
    </>
  );
}
