import { Fwd } from '@/components/ui/arrows';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useCatalog } from '../../store/CatalogContext';
import { paths, useGoto } from '../../lib/nav';
import { useT } from '../../i18n';
import { StripesSm } from '../Stripes';
import { Img } from '../Img';
import { KidsParkLogo, MegaLink, SpaLink, megaPanel, monoLink } from './parts';

/** valle-red-ink: the brand red dark enough for small text (see tailwind.css). */
const RED_INK = '#D6173F';
import type { MenuGroup } from './packageGroups';

/** `go` closes the menus and then runs the navigation. */
type Go = (fn: () => void) => () => void;

/** Desktop packages mega menu: the package groups in CSS columns, plus the VIP teaser. */
export function PackagesMenu({ groups, go }: { groups: MenuGroup[]; go: Go }) {
  const t = useT();
  const goto = useGoto();
  const navigate = useNavigate();
  return (
    <div className={megaPanel}>
      <StripesSm />
      <div className="max-w-[1320px] mx-auto pt-[28px] px-[clamp(16px,3.5vw,40px)] pb-[32px] flex gap-[clamp(20px,3vw,44px)] flex-wrap items-start">
        <div className="flex-1 min-w-[220px]">
          <SpaLink href={paths.packages()} onClick={go(() => goto.packages())} className={cn(monoLink, 'mb-[14px]')} color={RED_INK}>
            {t('ALL PACKAGES')} <Fwd />
          </SpaLink>
          {/* CSS columns pack the groups top to bottom, so a short group never leaves a gap under it */}
          <div className="[column-width:170px] [column-gap:24px]" data-testid="packages-menu">
            {groups.map((g) => (
              <div key={g.title} className="break-inside-avoid mb-[16px]">
                <div className="font-mono text-[12.5px] font-bold tracking-[.14em] text-valle-violet mb-[6px] flex items-center gap-2">
                  {g.title}
                  {g.kids && <KidsParkLogo width={40} />}
                </div>
                {g.links.map(([name, href]) => (
                  <MegaLink key={href} name={name} href={href} onClick={go(() => navigate(href))} />
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
          <SpaLink href={paths.packages('vip')} onClick={go(() => goto.packages('vip'))} className="block cursor-pointer font-mono text-[11px] font-bold tracking-[.1em] mt-[12px]" color="#FFFC33">
            {t('SEE THE FULL DAY')} <Fwd />
          </SpaLink>
        </div>
      </div>
    </div>
  );
}

/** Desktop explore mega menu: the four categories with their experiences, plus the zipline teaser. */
export function ExploreMenu({ go }: { go: Go }) {
  const t = useT();
  const goto = useGoto();
  const catalog = useCatalog();
  const links = (cat: string, hoverColor?: string) => catalog.ACTS.filter((a) => a.cat === cat).map((a) => (
    <MegaLink key={a.id} name={a.name} href={paths.detail(a.id)} onClick={go(() => goto.detail(a.id))} hoverColor={hoverColor} />
  ));

  return (
    <div className={megaPanel}>
      <StripesSm />
      <div className="max-w-[1320px] mx-auto pt-[30px] px-[clamp(16px,3.5vw,40px)] pb-[36px] grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[clamp(20px,3vw,44px)]">
        <div>
          <SpaLink href={paths.explore('adventure')} onClick={go(() => goto.explore('adventure'))} className={cn(monoLink, 'mb-[14px]')} color={RED_INK}>{t('ADVENTURE')} <Fwd /></SpaLink>
          {links('adventure')}
        </div>
        <div>
          <SpaLink href={paths.explore('nature')} onClick={go(() => goto.explore('nature'))} className={cn(monoLink, 'mb-[14px]')} color="#340057">
            <span aria-hidden className="text-valle-green">●</span> {t('NATURE')} <Fwd />
          </SpaLink>
          {links('nature', '#7333FF')}
        </div>
        <div>
          <SpaLink href={paths.explore('kids')} onClick={go(() => goto.explore('kids'))} className={cn(monoLink, 'mb-[14px]')} color="#340057">
            <span aria-hidden className="text-valle-yellow [text-shadow:0_0_1px_rgba(52,0,87,.4)]">●</span> {t('KIDS PARK')} <Fwd />
          </SpaLink>
          {links('kids', '#7333FF')}
        </div>
        <div>
          <SpaLink href={paths.explore('tours')} onClick={go(() => goto.explore('tours'))} className={cn(monoLink, 'mb-[14px]')} color="#7333FF">{t('TOURS & GROUPS')} <Fwd /></SpaLink>
          {links('tours', '#7333FF')}
          <SpaLink href={paths.packages()} onClick={go(() => goto.packages())} className={cn(monoLink, 'mt-[20px]')} color="#7333FF">{t('PACKAGES')} <Fwd /></SpaLink>
          <SpaLink href={paths.team()} onClick={go(goto.team)} className={cn(monoLink, 'mt-[12px]')} color="#7333FF">{t('TEAM BUILDING')} <Fwd /></SpaLink>
          <SpaLink href={paths.dine()} onClick={go(goto.dine)} className={cn(monoLink, 'mt-[12px]')} color="#7333FF">{t('DINE')} <Fwd /></SpaLink>
        </div>
        <SpaLink
          href={paths.detail('zipline')}
          onClick={go(() => goto.detail('zipline'))}
          className="block cursor-pointer rounded-[16px] overflow-hidden relative min-h-[210px] bg-valle-purple [transition:transform_.2s_ease] hover:[transform:translateY(-3px)]"
        >
          <Img src="/images/ziplineadventures.avif" alt={t('Zipline Adventures')} surface="dark" placeholder="#340057" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(31,0,51,.9),rgba(31,0,51,0)_60%)]" />
          <div className="absolute left-[16px] right-[16px] bottom-[14px] text-white">
            <div className="font-mono text-[10px] font-semibold tracking-[.16em] text-valle-yellow">{t('MOST LOVED')}</div>
            <div className="font-display italic font-extrabold text-[22px] mt-[4px] uppercase">{t('Zipline Adventures')}</div>
            <div className="text-[12.5px] opacity-85 mt-[2px]">{t('8 routes · up to 5.5 km of flight')}</div>
          </div>
        </SpaLink>
      </div>
    </div>
  );
}
