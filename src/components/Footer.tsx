import { useCatalog } from '../store/CatalogContext';
import { ValleLogo } from '@/components/ui/ValleLogo';
import { Link, useNavigate } from 'react-router-dom';
import { Stripes } from './Stripes';
import { openConsentSettings } from '../lib/consent';
import { paths, useGoto } from '../lib/nav';
import { LANGS, LANG_META, localizePath, stripLang, useLang, useT } from '../i18n';
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
  return (
    <a
      href={href}
      onClick={(e) => { e.preventDefault(); onClick(); }}
      className="block cursor-pointer py-[7px] text-[15px] font-medium opacity-[.92] transition-[color,opacity] [--fc:#FFFFFF] hover:[--fc:var(--hover)] hover:opacity-100 focus-visible:[--fc:var(--hover)]"
      style={{ textDecoration: 'none', color: 'var(--fc)', ['--hover' as string]: hoverColor }}
    >
      {label}
    </a>
  );
}

/** The column heads: real headings, so the footer reads as sections. */
const colHead = 'm-0 font-mono text-[11px] font-bold tracking-[.12em] text-white/75';
const MAPS = 'https://www.google.com/maps/place/Vall%C3%A9+Advenature+Park+(formerly+La+Vall%C3%A9e+des+Couleurs)/@-20.457614,57.4826031,17z';

export function Footer() {
  const goto = useGoto();
  const navigate = useNavigate();
  const t = useT();
  const catalog = useCatalog();
  return (
    <footer className="mt-[clamp(64px,9vw,120px)]">
      <Stripes />
      <div className="bg-valle-deep px-0 pt-[clamp(44px,6vw,72px)] pb-[34px] text-white">
        <div className="mx-auto max-w-[1320px] px-[clamp(16px,3.5vw,40px)] py-0">
          <div aria-hidden className="origin-left -rotate-4 overflow-hidden font-display text-[clamp(52px,9vw,140px)] leading-[0.82] font-black tracking-[-0.01em] whitespace-nowrap text-white/8 uppercase italic">
            {t('LIVE THE PULSE')}
          </div>
        </div>
        <div className="mx-auto mt-[clamp(24px,4vw,44px)] mb-0 grid max-w-[1320px] [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] gap-[clamp(24px,4vw,48px)] px-[clamp(16px,3.5vw,40px)] py-0">
          <div>
            {/* official lockup in white on purple; the paragraph keeps a third of its height clear */}
            <ValleLogo className="w-[170px] text-white" />
            <p className="mx-0 mt-[28px] mb-0 max-w-[32ch] text-[14px] leading-[1.6] opacity-75">
              {t('Where nature & adventure collide. Formerly La Vallée des Couleurs, Chamouny, Mauritius.')}
            </p>
            <div className="mt-[18px] flex flex-wrap gap-2.5">
              {[
                ['Instagram', 'https://www.instagram.com/valleadvenaturepark/'],
                ['Facebook', 'https://www.facebook.com/share/1ADvErZgRi/'],
                ['YouTube', 'https://www.youtube.com/channel/UCfHmy2KfmQk32tiT0zcxbTQ'],
              ].map(([label, href]) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="rounded-full border border-solid border-white/35 px-3.5 py-2 text-[12.5px] font-bold" style={{ color: '#FFFFFF' }}>
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div>
            <h2 className={colHead}>{t('EXPLORE')}</h2>
            <div className="mt-2.5">
              <FootLink label={t('All {n} activities', { n: catalog.ACTS.length })} href={paths.explore('all')} onClick={() => goto.explore('all')} hoverColor="#FFFC33" />
              <FootLink label={t('Adventure')} href={paths.explore('adventure')} onClick={() => goto.explore('adventure')} hoverColor="#FFFC33" />
              <FootLink label={t('Nature')} href={paths.explore('nature')} onClick={() => goto.explore('nature')} hoverColor="#FFFC33" />
              <FootLink label={t('Kids Park')} href={paths.explore('kids')} onClick={() => goto.explore('kids')} hoverColor="#FFFC33" />
              <FootLink label={t('Tours')} href={paths.explore('tours')} onClick={() => goto.explore('tours')} hoverColor="#FFFC33" />
              <FootLink label={t('Packages')} href={paths.packages()} onClick={() => goto.packages()} hoverColor="#FFFC33" />
              <FootLink label="Le Chamouzé" href={paths.resto('chamouze')} onClick={() => goto.resto('chamouze')} hoverColor="#FFFC33" />
              <FootLink label="La Bigarade" href={paths.resto('citronelle')} onClick={() => goto.resto('citronelle')} hoverColor="#FFFC33" />
              <FootLink label="Le Palmiste" href={paths.resto('palmiste')} onClick={() => goto.resto('palmiste')} hoverColor="#FFFC33" />
              <FootLink label={t('Book your day')} href={paths.booking()} onClick={() => goto.booking()} hoverColor="#FFFC33" />
            </div>
          </div>
          <div>
            <h2 className={colHead}>{t('VISIT')}</h2>
            <div className="mt-3 text-[14.5px] leading-[1.7] opacity-90">
              {t('Open daily 09:00 – 17:30')}<br />B102, Mare Anguilles<br />{t('Chamouny, Mauritius')}
            </div>
            <div className="mt-2">
              <a href={MAPS} target="_blank" rel="noopener" className="block py-[7px] text-[15px] font-medium" style={{ color: '#FFFC33' }}>{t('Directions · Google Maps ↗')}</a>
              <FootLink label={t('Plan your visit')} href={paths.plan()} onClick={() => goto.plan()} hoverColor="#FFFC33" />
              <FootLink label={t('Our story')} href={paths.story()} onClick={() => goto.story()} hoverColor="#FFFC33" />
            </div>
            <div className="mt-2 text-[14.5px] leading-[1.7]">
              <a href="tel:+2306604477" style={{ color: '#FFFC33' }}>+230 660 4477</a><br />
              <a href="mailto:sales@vallepark.com" style={{ color: '#FFFC33' }}>sales@vallepark.com</a>
            </div>
          </div>
          <div>
            <h2 className={colHead}>{t('GROUPS')}</h2>
            <div className="mt-2.5">
              <FootLink label={t('Schools')} href={paths.packageGroup('student')} onClick={() => navigate(paths.packageGroup('student'))} hoverColor="#FFFC33" />
              <FootLink label={t('Companies')} href={paths.packageGroup('corporate')} onClick={() => navigate(paths.packageGroup('corporate'))} hoverColor="#FFFC33" />
              <FootLink label={t('Groups of 10+')} href={paths.groups()} onClick={() => navigate(paths.groups())} hoverColor="#FFFC33" />
              <FootLink label={t('Careers')} href={paths.vacancies()} onClick={() => goto.vacancies()} hoverColor="#FFFC33" />
            </div>
            <div className="mt-6 flex items-center gap-3">
              <Img
                src="/images/wlta-logo-160.webp"
                alt={t('World Luxury Travel Awards 2026 winner')}
                surface="dark"
                placeholder="transparent"
                width={160}
                height={160}
                style={{ height: 52, width: 'auto', aspectRatio: '1 / 1', objectFit: 'contain' }}
              />
              <div className="text-[12.5px] leading-[1.4] opacity-75">World Luxury Travel Awards 2026</div>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-[38px] mb-0 flex max-w-[1320px] flex-wrap justify-between gap-3.5 border-0 border-t border-solid border-white/16 px-[clamp(16px,3.5vw,40px)] pt-[22px] pb-0 font-mono text-[11px] opacity-60">
          <span>©2026 VALLÉ ADVENATURE™ PARK · {t('MARE ANGUILLES FARMS LTD')}</span>
          <span>
            <button onClick={openConsentSettings} className="cursor-pointer border-0 bg-transparent p-0 [font:inherit] tracking-[inherit] text-inherit">{t('COOKIE SETTINGS')}</button>
            {' · '}<Link to={paths.privacy()} style={{ color: 'inherit', textDecoration: 'none' }}>{t('PRIVACY POLICY')}</Link>{' · '}<Link to={paths.terms()} style={{ color: 'inherit', textDecoration: 'none' }}>{t('TERMS OF USE')}</Link>{' · '}
            <InstallFooterLink />
            <FooterLangs />
          </span>
        </div>
      </div>
    </footer>
  );
}
