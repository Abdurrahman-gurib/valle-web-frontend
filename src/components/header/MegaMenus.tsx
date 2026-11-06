import { Fwd } from '@/components/ui/arrows';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useCatalog } from '../../store/CatalogContext';
import { paths, useGoto } from '../../lib/nav';
import { useT } from '../../i18n';
import { StripesSm } from '../Stripes';
import { Img } from '../Img';
import { KidsParkLogo, MegaLink, SpaLink, megaPanel, monoLink } from './parts';
import { ValleIcon, iconForActivity, type ValleIconName } from '@/components/ui/ValleIcon';

/** Link/selected text colour of the design system. */
const LINK = '#5B21B6';
import type { GroupLink, MenuGroup } from './packageGroups';

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
          <SpaLink href={paths.packages()} onClick={go(() => goto.packages())} className={cn(monoLink, 'mb-[14px]')} color={LINK}>
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
        <div className="flex-[0_0_280px] bg-valle-purple rounded-[20px] py-[18px] px-[20px] text-white">
          <div className="font-mono text-[10px] font-bold tracking-[.14em] text-valle-green">{t('MOST BOOKED')}</div>
          <div className="font-display italic font-black text-[24px] uppercase mt-[6px]">{t('VIP Ultimate')}</div>
          <div className="text-[13.5px] text-[rgba(255,255,255,.8)] mt-[6px] leading-[1.45]">
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

/** Desktop dine menu: the two restaurants (with their photos) and the kids menu. */
export function DineMenu({ links, go }: { links: [string, string][]; go: Go }) {
  const t = useT();
  const navigate = useNavigate();
  const catalog = useCatalog();
  const img = (id: string) => catalog.RESTOS[id]?.img;
  return (
    <div className={megaPanel}>
      <StripesSm />
      <div className="max-w-[1320px] mx-auto pt-[28px] px-[clamp(16px,3.5vw,40px)] pb-[32px] grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[clamp(16px,2vw,28px)]" data-testid="dine-menu">
        {links.map(([name, href], i) => {
          const id = href.includes('citronelle') ? 'citronelle' : 'chamouze';
          const src = i < 2 ? img(id) : undefined;
          return (
            <SpaLink key={href} href={href} onClick={go(() => navigate(href))} className="group block rounded-[20px] overflow-hidden bg-white shadow-s2 [transition:transform_var(--t-ui)] hover:[transform:translateY(-4px)]" color="#340057">
              {src
                ? <span className="block relative aspect-[16/9] bg-valle-lilac"><Img src={src} alt="" sizes="320px" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /></span>
                : <span aria-hidden className="flex aspect-[16/9] items-center justify-center bg-valle-tint font-display italic font-black text-[28px] uppercase text-valle-purple">{t('Kids menu')}</span>}
              <span className="flex items-center justify-between gap-2 px-[18px] py-[14px] font-display italic font-black text-[19px] uppercase">
                {name}<span className="text-valle-link"><Fwd /></span>
              </span>
            </SpaLink>
          );
        })}
      </div>
    </div>
  );
}

/** Desktop groups menu: schools, team building and clubs, each with its photo and one line on how it works. */
export function GroupsMenu({ links, go }: { links: GroupLink[]; go: Go }) {
  const t = useT();
  const navigate = useNavigate();
  return (
    <div className={megaPanel}>
      <StripesSm />
      <div className="max-w-[1320px] mx-auto pt-[26px] px-[clamp(16px,3.5vw,40px)] pb-[32px]">
        <SpaLink href={paths.groups()} onClick={go(() => navigate(paths.groups()))} className={cn(monoLink, 'mb-[14px]')} color={LINK}>
          {t('BOOK FOR 10 OR MORE')} <Fwd />
        </SpaLink>
        <div className="grid grid-cols-3 gap-[clamp(16px,2vw,28px)]" data-testid="groups-menu">
          {links.map((l) => (
            <SpaLink key={l.key} href={l.href} onClick={go(() => navigate(l.href))} className="group flex flex-col rounded-[20px] overflow-hidden bg-white shadow-s2 [transition:transform_var(--t-ui)] hover:[transform:translateY(-4px)]" color="#340057">
              <span className="block relative aspect-[16/8] bg-valle-lilac">
                <Img src={l.photo.src} alt="" sizes="400px" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: l.photo.position }} />
              </span>
              <span className="flex items-center justify-between gap-2 px-[18px] pt-[14px] font-display italic font-black text-[19px] uppercase">
                {l.title}<span className="text-valle-link"><Fwd /></span>
              </span>
              <span className="block px-[18px] pt-[4px] pb-[16px] text-[13.5px] leading-[1.45] text-valle-purple/75">{l.sub}</span>
            </SpaLink>
          ))}
        </div>
      </div>
    </div>
  );
}

/** An explore column heading: the category's park icon, its name and the arrow. */
function CatHead({ cat, icon, label, go }: { cat: string; icon: ValleIconName; label: string; go: Go }) {
  const goto = useGoto();
  return (
    <SpaLink href={paths.explore(cat)} onClick={go(() => goto.explore(cat))} className={cn(monoLink, 'mb-[12px] flex items-center gap-[9px]')} color={LINK}>
      <ValleIcon name={icon} size={22} />
      <span>{label} <Fwd /></span>
    </SpaLink>
  );
}

/** Desktop explore mega menu: the four categories with their experiences, plus the zipline teaser. */
export function ExploreMenu({ go }: { go: Go }) {
  const t = useT();
  const goto = useGoto();
  const navigate = useNavigate();
  const catalog = useCatalog();
  const links = (cat: string, hoverColor?: string) => catalog.ACTS.filter((a) => a.cat === cat).map((a) => (
    <MegaLink key={a.id} name={a.name} icon={iconForActivity(a.id, a.cat)} href={paths.detail(a.id)} onClick={go(() => goto.detail(a.id))} hoverColor={hoverColor} />
  ));

  return (
    <div className={megaPanel}>
      <StripesSm />
      <div className="max-w-[1320px] mx-auto pt-[30px] px-[clamp(16px,3.5vw,40px)] pb-[36px] grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[clamp(20px,3vw,44px)]">
        <div>
          <CatHead cat="adventure" icon="zipline" label={t('ADVENTURE')} go={go} />
          {links('adventure')}
        </div>
        <div>
          <CatHead cat="nature" icon="landscape" label={t('NATURE')} go={go} />
          {links('nature')}
        </div>
        <div>
          <CatHead cat="kids" icon="kids-playground" label={t('KIDS PARK')} go={go} />
          {links('kids')}
          <MegaLink icon="kids-playground" name={t('Vallé Kids Park pricelist')} href={paths.explore('kids') + '#kids-prices'} onClick={go(() => navigate(paths.explore('kids') + '#kids-prices'))} />
        </div>
        <div>
          <CatHead cat="tours" icon="team-stars" label={t('TOURS')} go={go} />
          {links('tours')}

        </div>
        <SpaLink
          href={paths.detail('zipline')}
          onClick={go(() => goto.detail('zipline'))}
          className="block cursor-pointer rounded-[16px] overflow-hidden relative min-h-[210px] bg-valle-purple [transition:transform_.2s_ease] hover:[transform:translateY(-3px)]"
        >
          <Img src="/images/ziplineadventures.avif" sizes="480px" alt={t('Zipline Adventures')} surface="dark" placeholder="#340057" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
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
