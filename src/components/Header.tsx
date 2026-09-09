import { useEffect, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppStore';
import { useCatalog } from '../store/CatalogContext';
import { useGoto } from '../lib/nav';
import { useIsMobile } from '../hooks/useIsMobile';
import { useHover } from '../hooks/useHover';
import { StripesSm, Stripes } from './Stripes';
import { MobileBar } from './MobileBar';
import { Img } from './Img';

function NavBtn({ label, onClick, color, chev }: { label: string; onClick: () => void; color: string; chev?: string }) {
  const [h, bind] = useHover();
  return (
    <button
      {...bind}
      onClick={onClick}
      style={{
        border: 0, background: h ? 'rgba(255,51,88,.14)' : 'transparent', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 15, fontWeight: 600, color, padding: '10px 14px',
        borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
      }}
    >
      {label}
      {chev && <span style={{ fontSize: 9, opacity: 0.7 }}>{chev}</span>}
    </button>
  );
}

function MegaLink({ name, onClick, hoverColor = '#FF3358' }: { name: string; onClick: () => void; hoverColor?: string }) {
  const [h, bind] = useHover();
  return (
    <div
      {...bind}
      onClick={onClick}
      style={{
        cursor: 'pointer', fontSize: 15, fontWeight: 500, color: h ? hoverColor : '#340057',
        padding: '5.5px 0', transform: h ? 'translateX(3px)' : 'none', transition: 'transform .15s ease',
      }}
    >
      {name}
    </div>
  );
}

const mobileNavRow: CSSProperties = {
  cursor: 'pointer', fontSize: 16.5, fontWeight: 600, color: '#FFFFFF', padding: '12px 0',
  borderBottom: '1px solid rgba(255,255,255,.16)', display: 'flex',
  justifyContent: 'space-between', alignItems: 'center',
};

export function Header() {
  const app = useApp();
  const catalog = useCatalog();
  const goto = useGoto();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  // Careers lives outside the catalog-driven nav helpers, so it routes directly.
  const gotoVacancies = () => navigate('/vacancies');

  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [megaPkgOpen, setMegaPkgOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [hRate, bindRate] = useHover();
  const [hDay, bindDay] = useHover();
  const [hBook, bindBook] = useHover();
  const [hZip, bindZip] = useHover();

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

  const pkgLinks: [string, string][] = [
    ['Light & Standard', 'ls'], ['Exclusive tiers', 'ex'], ['VIP Ultimate', 'vip'],
    ['Combo packages', 'combo'], ['Cinematic experience', 'cine'], ['Photo pricelist', 'photo'],
    ['Team building', 'team'],
  ];

  const searchGo = () => { closeAll(); goto.explore('all', searchQ.trim() || undefined); };

  return (
    <>
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 90, transition: 'background .3s ease',
        background: headerBg, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: headerBorder,
      }}>
        <div style={{
          maxWidth: 1320, margin: '0 auto', padding: '0 clamp(16px,3.5vw,40px)', height: 70,
          display: 'flex', alignItems: 'center', gap: 'clamp(12px,2.5vw,32px)',
        }}>
          <div
            onClick={go(goto.home)}
            style={{
              cursor: 'pointer', display: 'flex', flexDirection: 'column', lineHeight: 1,
              userSelect: 'none', transform: 'rotate(-4deg)', flexShrink: 1, minWidth: 0,
            }}
          >
            <span style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 27, letterSpacing: '-0.01em', color: headerFg }}>VALLÉ</span>
            <span style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 8, fontWeight: 600, letterSpacing: '.22em', color: headerFg, opacity: 0.75, marginTop: 2 }}>ADVENATURE™ PARK</span>
          </div>

          {!isMobile && (
            <>
              <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center' }}>
                <NavBtn label="Explore" chev={megaOpen ? '▲' : '▼'} color={headerFg} onClick={() => { setMegaOpen(!megaOpen); setMegaPkgOpen(false); }} />
                <NavBtn label="Packages" chev={megaPkgOpen ? '▲' : '▼'} color={headerFg} onClick={() => { setMegaPkgOpen(!megaPkgOpen); setMegaOpen(false); }} />
                <NavBtn label="Plan your visit" color={headerFg} onClick={go(goto.plan)} />
                <NavBtn label="Dine" color={headerFg} onClick={go(goto.dine)} />
                <NavBtn label="Our story" color={headerFg} onClick={go(goto.story)} />
                <NavBtn label="Vacancies" color={headerFg} onClick={go(gotoVacancies)} />
              </nav>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  {...bindRate}
                  onClick={app.openRateGate}
                  title="Change your rate"
                  style={{
                    border: `1.5px solid ${hRate ? '#7333FF' : 'rgba(115,51,255,.5)'}`,
                    background: hRate ? '#7333FF' : 'transparent', cursor: 'pointer',
                    fontFamily: "'Chivo Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: '.1em',
                    color: hRate ? '#FFFFFF' : headerFg, padding: '9px 12px', borderRadius: 999,
                    whiteSpace: 'nowrap', lineHeight: 1,
                  }}
                >
                  {app.rateTag} ⇄
                </button>
                <button
                  {...bindDay}
                  onClick={() => { setMegaOpen(false); setMegaPkgOpen(false); app.openDay(); }}
                  title="Your selected experiences"
                  style={{
                    border: `1.5px solid ${headerFg}`, opacity: hDay ? 1 : 0.92, background: 'transparent',
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: headerFg,
                    padding: '9px 15px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 8,
                    whiteSpace: 'nowrap', transform: hDay ? 'translateY(-1px)' : 'none',
                  }}
                >
                  My Day
                  {app.hasSel && (
                    <span style={{
                      background: '#FF3358', color: '#FFFFFF', borderRadius: 999, minWidth: 20, height: 20,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, padding: '0 5px',
                    }}>
                      {app.selCount}
                    </span>
                  )}
                </button>
                <button
                  {...bindBook}
                  onClick={go(goto.booking)}
                  style={{
                    border: 0, background: hBook ? '#D91E44' : '#FF3358', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 14, fontWeight: 700, color: '#FFFFFF', padding: '11px 20px', borderRadius: 999,
                    boxShadow: '0 4px 14px rgba(255,51,88,.35)', whiteSpace: 'nowrap',
                    transform: hBook ? 'translateY(-1px)' : 'none',
                  }}
                >
                  Book now
                </button>
              </div>
            </>
          )}

          {isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginLeft: 'auto' }}>
              <button
                onClick={app.openRateGate}
                title="Change your rate"
                style={{
                  border: '1.5px solid rgba(115,51,255,.55)', background: 'transparent', cursor: 'pointer',
                  fontFamily: "'Chivo Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: '.06em',
                  color: headerFg, padding: '8px 9px', borderRadius: 999, whiteSpace: 'nowrap', lineHeight: 1, flexShrink: 0,
                }}
              >
                {app.rateTag}
              </button>
              {app.hasSel && (
                <button
                  onClick={app.openDay}
                  title="My Day"
                  aria-label="My Day"
                  style={{
                    border: 0, background: '#340057', cursor: 'pointer', fontFamily: "'Barlow',sans-serif",
                    fontStyle: 'italic', fontSize: 16, fontWeight: 900, color: '#FFFFFF', width: 34, height: 34,
                    padding: 0, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, lineHeight: 1, boxShadow: '0 3px 10px rgba(52,0,87,.35)',
                  }}
                >
                  {app.selCount}
                </button>
              )}
              <button
                onClick={go(goto.booking)}
                style={{
                  border: 0, background: '#FF3358', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                  fontWeight: 700, color: '#FFFFFF', padding: '9px 14px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                Book
              </button>
              <button
                onClick={() => { setMobileNavOpen(!mobileNavOpen); setMegaOpen(false); setMegaPkgOpen(false); }}
                aria-label="Menu"
                style={{
                  border: `1.5px solid ${headerFg}`, background: 'transparent', cursor: 'pointer', color: headerFg,
                  width: 40, height: 40, borderRadius: 999, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 3,
                }}
              >
                <span style={{ width: 16, height: 2, background: 'currentColor', borderRadius: 2, display: 'block', transition: 'transform .25s ease', transform: mobileNavOpen ? 'translateY(5px) rotate(45deg)' : 'none' }} />
                <span style={{ width: 16, height: 2, background: 'currentColor', borderRadius: 2, display: 'block', transition: 'opacity .2s ease', opacity: mobileNavOpen ? 0 : 1 }} />
                <span style={{ width: 16, height: 2, background: 'currentColor', borderRadius: 2, display: 'block', transition: 'transform .25s ease', transform: mobileNavOpen ? 'translateY(-5px) rotate(-45deg)' : 'none' }} />
              </button>
            </div>
          )}
        </div>

        {/* Packages mega menu */}
        {megaPkgOpen && !isMobile && (
          <div style={{ position: 'absolute', top: 70, left: 0, right: 0, background: '#FFFFFF', borderBottom: '1px solid #EBE2FF', boxShadow: '0 32px 60px -20px rgba(52,0,87,.35)' }}>
            <StripesSm />
            <div style={{ maxWidth: 1320, margin: '0 auto', padding: '28px clamp(16px,3.5vw,40px) 32px', display: 'flex', gap: 'clamp(20px,3vw,44px)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div onClick={go(() => goto.packages())} style={{ cursor: 'pointer', fontFamily: "'Chivo Mono',monospace", fontSize: 12, fontWeight: 600, letterSpacing: '.12em', color: '#FF3358', marginBottom: 14 }}>
                  ALL PACKAGES →
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '2px 24px' }}>
                  {pkgLinks.map(([name, key]) => (
                    <MegaLink key={key} name={name} onClick={go(() => goto.packages(key))} />
                  ))}
                </div>
              </div>
              <div style={{ flex: '0 0 280px', background: '#340057', borderRadius: 16, padding: '18px 20px', color: '#FFFFFF' }}>
                <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color: '#33FF74' }}>MOST BOOKED</div>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 24, textTransform: 'uppercase', marginTop: 6 }}>VIP Ultimate</div>
                <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,.78)', marginTop: 6, lineHeight: 1.45 }}>
                  Everything in the valley, private guide, butler service and lunch. Souvenir gift included.
                </div>
                <div onClick={go(() => goto.packages('vip'))} style={{ cursor: 'pointer', fontFamily: "'Chivo Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: '#FFFC33', marginTop: 12 }}>
                  SEE THE FULL DAY →
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Explore mega menu */}
        {megaOpen && !isMobile && (
          <div style={{ position: 'absolute', top: 70, left: 0, right: 0, background: '#FFFFFF', borderBottom: '1px solid #EBE2FF', boxShadow: '0 32px 60px -20px rgba(52,0,87,.35)' }}>
            <StripesSm />
            <div style={{ maxWidth: 1320, margin: '0 auto', padding: '30px clamp(16px,3.5vw,40px) 36px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 'clamp(20px,3vw,44px)' }}>
              <div>
                <div onClick={go(() => goto.explore('adventure'))} style={{ cursor: 'pointer', fontFamily: "'Chivo Mono',monospace", fontSize: 12, fontWeight: 600, letterSpacing: '.12em', color: '#FF3358', marginBottom: 14 }}>ADVENTURE →</div>
                {linkList('adventure').map((a) => <MegaLink key={a.id} name={a.name} onClick={go(() => goto.detail(a.id))} />)}
              </div>
              <div>
                <div onClick={go(() => goto.explore('nature'))} style={{ cursor: 'pointer', fontFamily: "'Chivo Mono',monospace", fontSize: 12, fontWeight: 600, letterSpacing: '.12em', color: '#340057', marginBottom: 14 }}>
                  <span style={{ color: '#33FF74' }}>●</span> NATURE →
                </div>
                {linkList('nature').map((a) => <MegaLink key={a.id} name={a.name} onClick={go(() => goto.detail(a.id))} hoverColor="#7333FF" />)}
              </div>
              <div>
                <div onClick={go(() => goto.explore('kids'))} style={{ cursor: 'pointer', fontFamily: "'Chivo Mono',monospace", fontSize: 12, fontWeight: 600, letterSpacing: '.12em', color: '#340057', marginBottom: 14 }}>
                  <span style={{ color: '#FFFC33', textShadow: '0 0 1px rgba(52,0,87,.4)' }}>●</span> KIDS PARK →
                </div>
                {linkList('kids').map((a) => <MegaLink key={a.id} name={a.name} onClick={go(() => goto.detail(a.id))} hoverColor="#7333FF" />)}
              </div>
              <div>
                <div onClick={go(() => goto.explore('tours'))} style={{ cursor: 'pointer', fontFamily: "'Chivo Mono',monospace", fontSize: 12, fontWeight: 600, letterSpacing: '.12em', color: '#7333FF', marginBottom: 14 }}>TOURS &amp; GROUPS →</div>
                {linkList('tours').map((a) => <MegaLink key={a.id} name={a.name} onClick={go(() => goto.detail(a.id))} hoverColor="#7333FF" />)}
                <div onClick={go(() => goto.packages())} style={{ cursor: 'pointer', fontFamily: "'Chivo Mono',monospace", fontSize: 12, fontWeight: 600, letterSpacing: '.12em', color: '#7333FF', margin: '20px 0 0' }}>PACKAGES →</div>
                <div onClick={go(goto.team)} style={{ cursor: 'pointer', fontFamily: "'Chivo Mono',monospace", fontSize: 12, fontWeight: 600, letterSpacing: '.12em', color: '#7333FF', margin: '12px 0 0' }}>TEAM BUILDING →</div>
                <div onClick={go(goto.dine)} style={{ cursor: 'pointer', fontFamily: "'Chivo Mono',monospace", fontSize: 12, fontWeight: 600, letterSpacing: '.12em', color: '#7333FF', margin: '12px 0 0' }}>DINE →</div>
              </div>
              <div
                {...bindZip}
                onClick={go(() => goto.detail('zipline'))}
                style={{
                  cursor: 'pointer', borderRadius: 16, overflow: 'hidden', position: 'relative', minHeight: 210,
                  background: '#340057', transform: hZip ? 'translateY(-3px)' : 'none', transition: 'transform .2s ease',
                }}
              >
                <Img src="/images/ziplineadventures.avif" alt="Zipline Adventures" surface="dark" placeholder="#340057" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(31,0,51,.9), rgba(31,0,51,0) 60%)' }} />
                <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14, color: '#FFFFFF' }}>
                  <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 10, fontWeight: 600, letterSpacing: '.16em', color: '#FFFC33' }}>MOST LOVED</div>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 800, fontSize: 22, marginTop: 4, textTransform: 'uppercase' }}>Zipline Adventures</div>
                  <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 2 }}>8 routes · up to 5.5 km of flight</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div style={{
          position: 'fixed', inset: '70px 0 0 0', zIndex: 89, background: '#260040', overflowY: 'auto',
          padding: '16px 20px 28px', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', gap: 8, animation: 'vfadeup .3s ease both' }}>
            <input
              className="vbar-input"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') searchGo(); }}
              placeholder="Search ziplines, tortoises, waterfalls…"
              style={{
                flex: 1, minWidth: 0, border: '1.5px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.12)',
                borderRadius: 999, padding: '12px 18px', fontFamily: 'inherit', fontSize: 14, color: '#FFFFFF', outline: 'none',
              }}
            />
            <button
              onClick={searchGo}
              aria-label="Search"
              className="press-sm"
              style={{ border: 0, background: '#FF3358', color: '#FFFFFF', width: 44, height: 44, borderRadius: 999, cursor: 'pointer', fontSize: 16, flexShrink: 0 }}
            >
              →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '14px 0 4px', animation: 'vfadeup .3s ease both', animationDelay: '.05s' }}>
            {([
              ['Adventure', 'adventure', '#FF3358', '#FFFFFF', -1],
              ['Nature', 'nature', '#33FF74', '#340057', 1],
              ['Kids Park', 'kids', '#FFFC33', '#340057', 1],
              ['Tours & Groups', 'tours', '#7333FF', '#FFFFFF', -1],
            ] as [string, string, string, string, number][]).map(([label, cat, bg, fg, rot]) => (
              <div
                key={cat}
                onClick={go(() => goto.explore(cat))}
                className="press"
                style={{
                  cursor: 'pointer', background: bg, color: fg, borderRadius: 12, padding: '13px 14px',
                  fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 800, fontSize: 15,
                  textTransform: 'uppercase', transform: `rotate(${rot}deg)`,
                }}
              >
                {label}
              </div>
            ))}
          </div>
          <div onClick={go(goto.home)} style={{ ...mobileNavRow, animation: 'vfadeup .3s ease both', animationDelay: '.1s' }}>Home<span style={{ color: 'rgba(255,252,51,.7)' }}>→</span></div>
          <div onClick={go(() => goto.explore('all'))} style={{ ...mobileNavRow, animation: 'vfadeup .3s ease both', animationDelay: '.14s' }}>All 21 experiences<span style={{ color: '#FFFC33' }}>→</span></div>
          <div onClick={go(() => goto.packages())} style={{ ...mobileNavRow, animation: 'vfadeup .3s ease both', animationDelay: '.16s' }}>Packages &amp; team building<span style={{ color: 'rgba(255,252,51,.7)' }}>→</span></div>
          <div onClick={() => { setMobileNavOpen(false); app.openRateGate(); }} style={{ ...mobileNavRow, animation: 'vfadeup .3s ease both', animationDelay: '.18s' }}>
            <span style={{ display: 'flex', gap: 7 }}>Prices shown:<span style={{ color: 'rgba(255,255,255,.72)' }}>{app.rateWord}</span></span>
            <span style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 11, fontWeight: 700, background: '#FFFC33', color: '#340057', borderRadius: 999, padding: '5px 10px', whiteSpace: 'nowrap' }}>{app.rateTag} ⇄</span>
          </div>
          <div onClick={go(goto.plan)} style={{ ...mobileNavRow, animation: 'vfadeup .3s ease both', animationDelay: '.18s' }}>Plan your visit<span style={{ color: 'rgba(255,252,51,.7)' }}>→</span></div>
          <div onClick={go(goto.dine)} style={{ ...mobileNavRow, animation: 'vfadeup .3s ease both', animationDelay: '.22s' }}>Dine<span style={{ color: 'rgba(255,252,51,.7)' }}>→</span></div>
          <div onClick={go(goto.story)} style={{ ...mobileNavRow, animation: 'vfadeup .3s ease both', animationDelay: '.26s' }}>Our story<span style={{ color: 'rgba(255,252,51,.7)' }}>→</span></div>
          <div onClick={go(gotoVacancies)} style={{ ...mobileNavRow, animation: 'vfadeup .3s ease both', animationDelay: '.28s' }}>Vacancies<span style={{ color: 'rgba(255,252,51,.7)' }}>→</span></div>
          <div onClick={() => { setMobileNavOpen(false); app.openDay(); }} style={{ ...mobileNavRow, animation: 'vfadeup .3s ease both', animationDelay: '.3s' }}>
            <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              My Day
              {app.hasSel && (
                <span style={{ background: '#FF3358', color: '#FFFFFF', borderRadius: 999, minWidth: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, padding: '0 6px' }}>
                  {app.selCount}
                </span>
              )}
            </span>
            <span style={{ color: 'rgba(255,252,51,.7)' }}>→</span>
          </div>
          <button
            onClick={go(goto.booking)}
            className="press"
            style={{
              marginTop: 14, border: 0, background: '#FF3358', cursor: 'pointer', fontFamily: "'Barlow',sans-serif",
              fontStyle: 'italic', fontWeight: 800, fontSize: 16, letterSpacing: '.04em', textTransform: 'uppercase',
              color: '#FFFFFF', padding: '14px 0', width: '100%', borderRadius: 999,
              boxShadow: '0 8px 20px rgba(255,51,88,.35)', animation: 'vfadeup .3s ease both', animationDelay: '.34s',
            }}
          >
            Book now →
          </button>
          <div style={{ marginTop: 14, animation: 'vfadeup .3s ease both', animationDelay: '.38s' }}>
            <Stripes height={6} style={{ borderRadius: 99 }} />
            <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 10 }}>
              OPEN DAILY · 09:00–17:30 · CHAMOUNY, MAURITIUS
            </div>
          </div>
        </div>
      )}

      <MobileBar mobileNavOpen={mobileNavOpen} />
    </>
  );
}
