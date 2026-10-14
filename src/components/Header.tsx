import { Fwd } from '@/components/ui/arrows';
import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppStore';
import { useCatalog } from '../store/CatalogContext';
import { paths, useGoto } from '../lib/nav';
import { useIsMobile } from '../hooks/useIsMobile';
import { cn } from '@/lib/utils';
import { StripesSm, Stripes } from './Stripes';
import { MobileBar } from './MobileBar';
import { Img } from './Img';
import { LanguagePicker, LanguageSuggest } from './LanguagePicker';
import { useLang, useT, _t, fwd } from '../i18n';

// app.rateWord is one of these; listed so the extractor picks them up.
const RATE_WORD_KEYS = [_t('Resident'), _t('Visitor')];
void RATE_WORD_KEYS;

// Shorter wording for the top menu only, where French and Italian run long.
// English falls back to the plain label.
const MENU_KEYS = [_t('menu:Plan your visit'), _t('menu:Our story'), _t('menu:Vacancies')];
void MENU_KEYS;

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function NavBtn({ label, onClick, color, chev, href, snug }: { label: string; onClick: () => void; color: string; chev?: string; href?: string; snug?: boolean }) {
  const cls = cn(
    'flex items-center gap-[6px] whitespace-nowrap rounded-[999px] border-0 bg-transparent cursor-pointer no-underline [font-family:inherit] font-semibold py-[10px] hover:bg-[rgba(255,51,88,.14)]',
    // longer (non-English) labels stop growing at the size that fits the 1320px row
    snug ? 'text-[length:clamp(13px,1.05vw,14.3px)] px-[clamp(7px,0.95vw,13px)]' : 'text-[length:clamp(13px,1.05vw,15px)] px-[clamp(7px,0.95vw,14px)]',
  );
  // Real links get a real href (crawlable); menu toggles stay buttons.
  if (href) {
    return (
      <a href={href} onClick={(e) => { e.preventDefault(); onClick(); }} className={cls} style={{ color, textDecoration: 'none' }}>
        {label}
      </a>
    );
  }
  return (
    <button onClick={onClick} aria-expanded={chev === '▲'} className={cls} style={{ color }}>
      {label}
      {chev && <motion.span aria-hidden animate={{ rotate: chev === '▲' ? 180 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }} className="inline-flex opacity-75"><ChevronDown size={14} strokeWidth={2.5} /></motion.span>}
    </button>
  );
}

function MegaLink({ name, onClick, hoverColor = '#FF3358', href }: { name: string; onClick: () => void; hoverColor?: string; href: string }) {
  return (
    <a
      href={href}
      onClick={(e) => { e.preventDefault(); onClick(); }}
      className="block cursor-pointer text-[15px] font-medium py-[5.5px] [--c:#340057] hover:[--c:var(--hc)] [transition:transform_.15s_ease] hover:[transform:translateX(3px)]"
      // global a / a:hover colours are unlayered, so the colour stays inline and reads a class-driven variable
      style={{ color: 'var(--c)', textDecoration: 'none', ['--hc' as string]: hoverColor } as CSSProperties}
    >
      {name}
    </a>
  );
}

const mobileNavRow = 'cursor-pointer text-[16.5px] font-semibold text-white py-[12px] border-b border-solid border-[rgba(255,255,255,.16)] flex justify-between items-center animate-[vfadeup_.3s_ease_both]';
const monoLink = 'block no-underline cursor-pointer font-mono text-[12px] font-semibold tracking-[.12em]';
const megaPanel = 'absolute top-[70px] left-0 right-0 bg-white border-b border-solid border-valle-lilac shadow-[0_32px_60px_-20px_rgba(52,0,87,.35)]';
const hamburgerBar = 'block w-[16px] h-[2px] bg-current rounded-[2px]';

export function Header() {
  const app = useApp();
  const catalog = useCatalog();
  const goto = useGoto();
  const narrow = useIsMobile();
  const lang = useLang();
  const navRef = useRef<HTMLElement>(null);
  // Window width the desktop row needs in this language; below it the header
  // uses the compact (hamburger) layout instead of letting the menu overlap.
  const [needW, setNeedW] = useState(0);
  const [winW, setWinW] = useState(() => (typeof window === 'undefined' ? 0 : window.innerWidth));
  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  useEffect(() => { setNeedW(0); }, [lang]);
  const isMobile = narrow || winW < needW;
  useIsoLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => {
      const over = nav.scrollWidth - nav.clientWidth;
      if (over > 1) setNeedW(window.innerWidth + over + 24);
    };
    measure();
    // web fonts can arrive after the first layout and widen the labels
    document.fonts?.ready.then(measure).catch(() => {});
  }, [isMobile, lang, winW]);
  const location = useLocation();
  const navigate = useNavigate();
  const t = useT();
  const menu = (en: string) => { const k = 'menu:' + en; const s = t(k); return s === k ? t(en) : s; };
  // Careers lives outside the catalog-driven nav helpers, so it routes directly.
  const gotoVacancies = () => navigate(paths.vacancies());

  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [megaPkgOpen, setMegaPkgOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => {
    let raf = false;
    const onScroll = () => {
      if (raf) return;
      raf = true;
      requestAnimationFrame(() => {
        raf = false;
        setScrolled(window.scrollY > 24);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  const closeAll = () => { setMegaOpen(false); setMegaPkgOpen(false); setMobileNavOpen(false); };
  const linkList = (cat: string) => catalog.ACTS.filter((a) => a.cat === cat);

  const go = (fn: () => void) => () => { closeAll(); fn(); };

  /** The packages menu, classified the way the park sells them. */
  const pkgGroups: { title: string; links: [string, string][] }[] = [
    { title: t('EXCLUSIVE PACKAGE'), links: [[t('Light & Standard'), 'ls'], [t('Exclusive tiers'), 'ex'], [t('VIP Ultimate'), 'vip'], [t('Diamond'), 'diamond'], [t('Combo packages'), 'combo']] },
    { title: t('RESIDENT PACKAGE'), links: [[t('Resident packages'), 'resident'], [t('Kids Park pricelist'), 'kids']] },
    { title: t('SENIOR CITIZEN'), links: [[t('Senior citizens 55+'), 'senior']] },
    { title: t('STUDENT PACKAGE'), links: [[t('Student offer'), 'student']] },
    { title: t('CORPORATE PACKAGE'), links: [[t('Team building'), 'team']] },
    { title: t('PHOTO & VIDEO PACKAGE'), links: [[t('Photo pricelist'), 'photo'], [t('Cinematic experience'), 'cine']] },
  ];

  const searchGo = () => { closeAll(); goto.explore('all', searchQ.trim() || undefined); };

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-[90] [transition:background_.3s_ease] backdrop-blur-[14px]"
        // --fg carries the state-driven foreground colour to the class-styled controls below
        style={{ background: headerBg, borderBottom: headerBorder, ['--fg' as string]: headerFg } as CSSProperties}
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
                  className="border-[1.5px] border-solid border-[rgba(115,51,255,.5)] bg-transparent cursor-pointer font-mono text-[11px] font-bold tracking-[.1em] text-[var(--fg)] py-[9px] px-[12px] rounded-[999px] whitespace-nowrap leading-none hover:border-valle-violet hover:bg-valle-violet hover:text-white"
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
                  className="border-0 bg-valle-red hover:bg-[#D91E44] cursor-pointer [font-family:inherit] text-[14px] font-bold text-white py-[11px] px-[20px] rounded-[999px] shadow-[0_4px_14px_rgba(255,51,88,.35)] whitespace-nowrap hover:[transform:translateY(-1px)]"
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
                className="border-0 bg-valle-red cursor-pointer [font-family:inherit] text-[13px] font-bold text-white py-[9px] px-[14px] rounded-[999px] whitespace-nowrap shrink-0"
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

        {/* Packages mega menu */}
        {megaPkgOpen && !isMobile && (
          <div className={megaPanel}>
            <StripesSm />
            <div className="max-w-[1320px] mx-auto pt-[28px] px-[clamp(16px,3.5vw,40px)] pb-[32px] flex gap-[clamp(20px,3vw,44px)] flex-wrap items-start">
              <div className="flex-1 min-w-[220px]">
                <div onClick={go(() => goto.packages())} className="cursor-pointer font-mono text-[12px] font-semibold tracking-[.12em] text-valle-red mb-[14px]">
                  {t('ALL PACKAGES')} <Fwd />
                </div>
                {/* CSS columns pack the groups top to bottom, so a short group never leaves a gap under it */}
                <div className="[column-width:170px] [column-gap:24px]" data-testid="packages-menu">
                  {pkgGroups.map((g) => (
                    <div key={g.title} className="break-inside-avoid mb-[16px]">
                      <div className="font-mono text-[12.5px] font-bold tracking-[.14em] text-valle-violet mb-[6px]">{g.title}</div>
                      {g.links.map(([name, key]) => (
                        <MegaLink key={key} name={name} href={paths.packages(key)} onClick={go(() => goto.packages(key))} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-[0_0_280px] bg-valle-purple rounded-[16px] py-[18px] px-[20px] text-white">
                <div className="font-mono text-[10px] font-bold tracking-[.14em] text-valle-green">{t('MOST BOOKED')}</div>
                <div className="font-display italic font-black text-[24px] uppercase mt-[6px]">{t('VIP Ultimate')}</div>
                <div className="text-[13.5px] text-[rgba(255,255,255,.78)] mt-[6px] leading-[1.45]">
                  {t('Everything in the valley, private guide, butler service and lunch. Souvenir gift included.')}
                </div>
                <div onClick={go(() => goto.packages('vip'))} className="cursor-pointer font-mono text-[11px] font-bold tracking-[.1em] text-valle-yellow mt-[12px]">
                  {t('SEE THE FULL DAY')} <Fwd />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Explore mega menu */}
        {megaOpen && !isMobile && (
          <div className={megaPanel}>
            <StripesSm />
            <div className="max-w-[1320px] mx-auto pt-[30px] px-[clamp(16px,3.5vw,40px)] pb-[36px] grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[clamp(20px,3vw,44px)]">
              <div>
                <a href={paths.explore('adventure')} onClick={(e) => { e.preventDefault(); go(() => goto.explore('adventure'))(); }} className={cn(monoLink, 'mb-[14px]')} style={{ color: '#FF3358', textDecoration: 'none' }}>{t('ADVENTURE')} <Fwd /></a>
                {linkList('adventure').map((a) => <MegaLink key={a.id} name={a.name} href={paths.detail(a.id)} onClick={go(() => goto.detail(a.id))} />)}
              </div>
              <div>
                <div onClick={go(() => goto.explore('nature'))} className="cursor-pointer font-mono text-[12px] font-semibold tracking-[.12em] text-valle-purple mb-[14px]">
                  <span className="text-valle-green">●</span> {t('NATURE')} <Fwd />
                </div>
                {linkList('nature').map((a) => <MegaLink key={a.id} name={a.name} href={paths.detail(a.id)} onClick={go(() => goto.detail(a.id))} hoverColor="#7333FF" />)}
              </div>
              <div>
                <div onClick={go(() => goto.explore('kids'))} className="cursor-pointer font-mono text-[12px] font-semibold tracking-[.12em] text-valle-purple mb-[14px]">
                  <span className="text-valle-yellow [text-shadow:0_0_1px_rgba(52,0,87,.4)]">●</span> {t('KIDS PARK')} <Fwd />
                </div>
                {linkList('kids').map((a) => <MegaLink key={a.id} name={a.name} href={paths.detail(a.id)} onClick={go(() => goto.detail(a.id))} hoverColor="#7333FF" />)}
              </div>
              <div>
                <a href={paths.explore('tours')} onClick={(e) => { e.preventDefault(); go(() => goto.explore('tours'))(); }} className={cn(monoLink, 'mb-[14px]')} style={{ color: '#7333FF', textDecoration: 'none' }}>{t('TOURS & GROUPS')} <Fwd /></a>
                {linkList('tours').map((a) => <MegaLink key={a.id} name={a.name} href={paths.detail(a.id)} onClick={go(() => goto.detail(a.id))} hoverColor="#7333FF" />)}
                <a href={paths.packages()} onClick={(e) => { e.preventDefault(); go(() => goto.packages())(); }} className={cn(monoLink, 'mt-[20px]')} style={{ color: '#7333FF', textDecoration: 'none' }}>{t('PACKAGES')} <Fwd /></a>
                <a href={paths.team()} onClick={(e) => { e.preventDefault(); go(goto.team)(); }} className={cn(monoLink, 'mt-[12px]')} style={{ color: '#7333FF', textDecoration: 'none' }}>{t('TEAM BUILDING')} <Fwd /></a>
                <a href={paths.dine()} onClick={(e) => { e.preventDefault(); go(goto.dine)(); }} className={cn(monoLink, 'mt-[12px]')} style={{ color: '#7333FF', textDecoration: 'none' }}>{t('DINE')} <Fwd /></a>
              </div>
              <div
                onClick={go(() => goto.detail('zipline'))}
                className="cursor-pointer rounded-[16px] overflow-hidden relative min-h-[210px] bg-valle-purple [transition:transform_.2s_ease] hover:[transform:translateY(-3px)]"
              >
                <Img src="/images/ziplineadventures.avif" alt={t('Zipline Adventures')} surface="dark" placeholder="#340057" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(31,0,51,.9),rgba(31,0,51,0)_60%)]" />
                <div className="absolute left-[16px] right-[16px] bottom-[14px] text-white">
                  <div className="font-mono text-[10px] font-semibold tracking-[.16em] text-valle-yellow">{t('MOST LOVED')}</div>
                  <div className="font-display italic font-extrabold text-[22px] mt-[4px] uppercase">{t('Zipline Adventures')}</div>
                  <div className="text-[12.5px] opacity-85 mt-[2px]">{t('8 routes · up to 5.5 km of flight')}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div className="fixed top-[70px] right-0 bottom-0 left-0 z-[89] bg-valle-deep overflow-y-auto pt-[16px] px-[20px] pb-[28px] flex flex-col">
          <div className="flex gap-[8px] animate-[vfadeup_.3s_ease_both]">
            <input
              className="vbar-input flex-1 min-w-0 border-[1.5px] border-solid border-[rgba(255,255,255,.3)] bg-[rgba(255,255,255,.12)] rounded-[999px] py-[12px] px-[18px] [font-family:inherit] text-[14px] text-white outline-none"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') searchGo(); }}
              placeholder={t('Search ziplines, tortoises, waterfalls…')}
            />
            <button
              onClick={searchGo}
              aria-label={t('Search')}
              className="press-sm border-0 bg-valle-red text-white w-[44px] h-[44px] rounded-[999px] cursor-pointer text-[16px] shrink-0"
            >
              <Fwd />
            </button>
          </div>
          <div className="grid grid-cols-[1fr_1fr] gap-[8px] mt-[14px] mb-[4px] animate-[vfadeup_.3s_ease_both] [animation-delay:.05s]">
            {([
              [t('Adventure'), 'adventure', '#FF3358', '#FFFFFF', -1],
              [t('Nature'), 'nature', '#33FF74', '#340057', 1],
              [t('Kids Park'), 'kids', '#FFFC33', '#340057', 1],
              [t('Tours & Groups'), 'tours', '#7333FF', '#FFFFFF', -1],
            ] as [string, string, string, string, number][]).map(([label, cat, bg, fg, rot]) => (
              <a
                key={cat}
                href={paths.explore(cat)}
                onClick={(e) => { e.preventDefault(); go(() => goto.explore(cat))(); }}
                className="press block cursor-pointer rounded-[12px] py-[13px] px-[14px] font-display italic font-extrabold text-[15px] uppercase"
                style={{ textDecoration: 'none', background: bg, color: fg, transform: `rotate(${rot}deg)` }}
              >
                {label}
              </a>
            ))}
          </div>
          <a href={paths.home()} onClick={(e) => { e.preventDefault(); go(goto.home)(); }} className={cn(mobileNavRow, '[animation-delay:.1s]')} style={{ color: '#FFFFFF', textDecoration: 'none' }}>{t('Home')}<span className="text-[rgba(255,252,51,.7)]"><Fwd /></span></a>
          <a href={paths.explore('all')} onClick={(e) => { e.preventDefault(); go(() => goto.explore('all'))(); }} className={cn(mobileNavRow, '[animation-delay:.14s]')} style={{ color: '#FFFFFF', textDecoration: 'none' }}>{t('All {n} experiences', { n: catalog.ACTS.length })}<span className="text-valle-yellow"><Fwd /></span></a>
          <a href={paths.packages()} onClick={(e) => { e.preventDefault(); go(() => goto.packages())(); }} className={cn(mobileNavRow, '[animation-delay:.16s]')} style={{ color: '#FFFFFF', textDecoration: 'none' }}>{t('Packages & team building')}<span className="text-[rgba(255,252,51,.7)]"><Fwd /></span></a>
          <div onClick={() => { setMobileNavOpen(false); app.openRateGate(); }} className={cn(mobileNavRow, '[animation-delay:.18s]')}>
            <span className="flex gap-[7px]">{t('Prices shown:')}<span className="text-[rgba(255,255,255,.72)]">{t(app.rateWord)}</span></span>
            <span className="font-mono text-[11px] font-bold bg-valle-yellow text-valle-purple rounded-[999px] py-[5px] px-[10px] whitespace-nowrap">{app.rateTag} ⇄</span>
          </div>
          <a href={paths.plan()} onClick={(e) => { e.preventDefault(); go(goto.plan)(); }} className={cn(mobileNavRow, '[animation-delay:.18s]')} style={{ color: '#FFFFFF', textDecoration: 'none' }}>{t('Plan your visit')}<span className="text-[rgba(255,252,51,.7)]"><Fwd /></span></a>
          <a href={paths.dine()} onClick={(e) => { e.preventDefault(); go(goto.dine)(); }} className={cn(mobileNavRow, '[animation-delay:.22s]')} style={{ color: '#FFFFFF', textDecoration: 'none' }}>{t('Dine')}<span className="text-[rgba(255,252,51,.7)]"><Fwd /></span></a>
          <a href={paths.story()} onClick={(e) => { e.preventDefault(); go(goto.story)(); }} className={cn(mobileNavRow, '[animation-delay:.26s]')} style={{ color: '#FFFFFF', textDecoration: 'none' }}>{t('Our story')}<span className="text-[rgba(255,252,51,.7)]"><Fwd /></span></a>
          <a href={paths.vacancies()} onClick={(e) => { e.preventDefault(); go(gotoVacancies)(); }} className={cn(mobileNavRow, '[animation-delay:.28s]')} style={{ color: '#FFFFFF', textDecoration: 'none' }}>{t('Vacancies')}<span className="text-[rgba(255,252,51,.7)]"><Fwd /></span></a>
          <div onClick={() => { setMobileNavOpen(false); app.openDay(); }} className={cn(mobileNavRow, '[animation-delay:.3s]')}>
            <span className="flex gap-[10px] items-center">
              {t('My Day')}
              {app.hasSel && (
                <span className="bg-valle-red text-white rounded-[999px] min-w-[22px] h-[22px] inline-flex items-center justify-center text-[12px] px-[6px]">
                  {app.selCount}
                </span>
              )}
            </span>
            <span className="text-[rgba(255,252,51,.7)]"><Fwd /></span>
          </div>
          <button
            onClick={go(goto.booking)}
            className="press mt-[14px] border-0 bg-valle-red cursor-pointer font-display italic font-extrabold text-[16px] tracking-[.04em] uppercase text-white py-[14px] px-0 w-full rounded-[999px] shadow-[0_8px_20px_rgba(255,51,88,.35)] animate-[vfadeup_.3s_ease_both] [animation-delay:.34s]"
          >
            {t('Book now')} <Fwd />
          </button>
          <div className="mt-[14px] animate-[vfadeup_.3s_ease_both] [animation-delay:.38s]">
            <Stripes height={6} style={{ borderRadius: 99 }} />
            <div className="font-mono text-[11px] text-[rgba(255,255,255,.7)] mt-[10px]">
              {t('OPEN DAILY · 09:00–17:30 · CHAMOUNY, MAURITIUS')}
            </div>
          </div>
        </div>
      )}

      <MobileBar mobileNavOpen={mobileNavOpen} />
    </>
  );
}
