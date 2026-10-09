import { Link } from 'react-router-dom';
import { Stripes } from './Stripes';
import { openConsentSettings } from '../lib/consent';
import { paths, useGoto } from '../lib/nav';
import { LANGS, LANG_META, localizePath, stripLang, useLang, useT } from '../i18n';
import { useHover } from '../hooks/useHover';
import { Img } from './Img';
import { InstallFooterLink } from './InstallApp';

/** EN / FR / DE / IT as real links to the same page in each language (crawlable, hreflang'd). */
function FooterLangs() {
  const lang = useLang();
  const here = typeof window !== 'undefined' ? stripLang(window.location.pathname) : '/';
  return (
    <>
      {LANGS.map((l, i) => (
        <span key={l}>
          {i > 0 && ' / '}
          <a href={localizePath(here, l)} hrefLang={l} lang={l} aria-current={l === lang ? 'true' : undefined} style={{ color: 'inherit', textDecoration: l === lang ? 'underline' : 'none' }}>{LANG_META[l].short}</a>
        </span>
      ))}
    </>
  );
}

function FootLink({ label, onClick, hoverColor, href }: { label: string; onClick: () => void; hoverColor: string; href: string }) {
  const [h, bind] = useHover();
  return (
    <a
      {...bind}
      href={href}
      onClick={(e) => { e.preventDefault(); onClick(); }}
      style={{
        display: 'block', textDecoration: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '7px 0', opacity: h ? 1 : 0.92,
        color: h ? hoverColor : '#FFFFFF',
      }}
    >
      {label}
    </a>
  );
}

export function Footer() {
  const goto = useGoto();
  const t = useT();
  return (
    <footer style={{ marginTop: 'clamp(64px,9vw,120px)' }}>
      <Stripes />
      <div style={{ background: '#260040', color: '#FFFFFF', padding: 'clamp(44px,6vw,72px) 0 34px' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 clamp(16px,3.5vw,40px)' }}>
          <div style={{
            fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900,
            fontSize: 'clamp(52px,9vw,140px)', lineHeight: 0.82, letterSpacing: '-0.01em',
            color: 'rgba(255,255,255,.08)', textTransform: 'uppercase', whiteSpace: 'nowrap',
            overflow: 'hidden', transform: 'rotate(-4deg)', transformOrigin: 'left center',
          }}>
            {t('LIVE THE PULSE')}
          </div>
        </div>
        <div style={{
          maxWidth: 1320, margin: 'clamp(24px,4vw,44px) auto 0', padding: '0 clamp(16px,3.5vw,40px)',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 'clamp(24px,4vw,48px)',
        }}>
          <div>
            <div style={{ transform: 'rotate(-4deg)', transformOrigin: 'left bottom', display: 'inline-block' }}>
              <div style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 32, letterSpacing: '-0.01em' }}>VALLÉ</div>
              <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 9, fontWeight: 600, letterSpacing: '.22em', opacity: 0.7, marginTop: 3 }}>ADVENATURE™ PARK</div>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.75, margin: '16px 0 0', maxWidth: '32ch' }}>
              {t('Where nature & adventure collide. Formerly La Vallée des Couleurs, Chamouny, Mauritius.')}
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
              {[
                ['Instagram', 'https://www.instagram.com/valleadvenaturepark/'],
                ['Facebook', 'https://www.facebook.com/share/1ADvErZgRi/'],
                ['YouTube', 'https://www.youtube.com/channel/UCfHmy2KfmQk32tiT0zcxbTQ'],
              ].map(([label, href]) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{
                  border: '1px solid rgba(255,255,255,.35)', color: '#FFFFFF', borderRadius: 999,
                  padding: '8px 14px', fontSize: 12.5, fontWeight: 700,
                }}>
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: '.16em', opacity: 0.6 }}>{t('EXPLORE')}</div>
            <div style={{ marginTop: 10 }}>
              <FootLink label={t('All 21 experiences')} href={paths.explore('all')} onClick={() => goto.explore('all')} hoverColor="#FFFC33" />
              <FootLink label={t('Adventure')} href={paths.explore('adventure')} onClick={() => goto.explore('adventure')} hoverColor="#FF3358" />
              <FootLink label={t('Nature')} href={paths.explore('nature')} onClick={() => goto.explore('nature')} hoverColor="#33FF74" />
              <FootLink label={t('Kids Park')} href={paths.explore('kids')} onClick={() => goto.explore('kids')} hoverColor="#FFFC33" />
              <FootLink label={t('Tours & Groups')} href={paths.explore('tours')} onClick={() => goto.explore('tours')} hoverColor="#FFFC33" />
              <FootLink label={t('Packages')} href={paths.packages()} onClick={() => goto.packages()} hoverColor="#FFFC33" />
              <FootLink label={t('Team building')} href={paths.team()} onClick={() => goto.team()} hoverColor="#FFFC33" />
              <FootLink label={t('Restaurants')} href={paths.dine()} onClick={() => goto.dine()} hoverColor="#FFFC33" />
              <FootLink label="Le Chamouzé" href={paths.resto('chamouze')} onClick={() => goto.resto('chamouze')} hoverColor="#FFFC33" />
              <FootLink label="La Citronelle" href={paths.resto('citronelle')} onClick={() => goto.resto('citronelle')} hoverColor="#FFFC33" />
              <FootLink label={t('Book your day')} href={paths.booking()} onClick={() => goto.booking()} hoverColor="#FF3358" />
              <FootLink label={t('Careers')} href={paths.vacancies()} onClick={() => goto.vacancies()} hoverColor="#FFFC33" />
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: '.16em', opacity: 0.6 }}>{t('VISIT')}</div>
            <div style={{ fontSize: 14.5, lineHeight: 1.7, opacity: 0.88, marginTop: 12 }}>
              {t('Open daily 09:00 – 17:30')}<br />B102, Mare Anguilles<br />{t('Chamouny, Mauritius')}
            </div>
            <div style={{ fontSize: 14.5, lineHeight: 1.7, marginTop: 12 }}>
              <a href="tel:+2306604477" style={{ color: '#FFFC33' }}>+230 660 44 77</a><br />
              <a href="mailto:sales@vallepark.com" style={{ color: '#FFFC33' }}>sales@vallepark.com</a>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: '.16em', opacity: 0.6 }}>{t('RECOGNISED BY')}</div>
            <Img
              src="/images/wlta-logo-1.png"
              alt={t('World Luxury Travel Awards 2026 winner')}
              surface="dark"
              placeholder="transparent"
              width={614}
              height={614}
              style={{ height: 60, width: 'auto', marginTop: 14, aspectRatio: '1 / 1', objectFit: 'contain' }}
            />
            <div style={{ fontSize: 12.5, opacity: 0.6, marginTop: 8 }}>World Luxury Travel Awards 2026</div>
            <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 13, fontWeight: 600, letterSpacing: '.1em', marginTop: 18, color: '#FFFC33' }}>VALLEPARK.COM</div>
          </div>
        </div>
        <div style={{
          maxWidth: 1320, margin: '38px auto 0', padding: '22px clamp(16px,3.5vw,40px) 0',
          borderTop: '1px solid rgba(255,255,255,.16)', display: 'flex', justifyContent: 'space-between',
          gap: 14, flexWrap: 'wrap', fontFamily: "'Chivo Mono',monospace", fontSize: 11, opacity: 0.6,
        }}>
          <span>©2026 VALLÉ ADVENATURE™ PARK · {t('MARE ANGUILLES FARMS LTD')}</span>
          <span>
            <button onClick={openConsentSettings} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit', letterSpacing: 'inherit' }}>{t('COOKIE SETTINGS')}</button>
            {' · '}<Link to={paths.privacy()} style={{ color: 'inherit', textDecoration: 'none' }}>{t('PRIVACY POLICY')}</Link>{' · '}<Link to={paths.terms()} style={{ color: 'inherit', textDecoration: 'none' }}>{t('TERMS OF USE')}</Link>{' · '}
            <InstallFooterLink />
            <FooterLangs />
          </span>
        </div>
      </div>
    </footer>
  );
}
