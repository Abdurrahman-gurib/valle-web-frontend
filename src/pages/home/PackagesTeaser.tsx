import { paths, useGoto } from '../../lib/nav';
import { useApp } from '../../store/AppStore';
import { useCatalog } from '../../store/CatalogContext';
import { money } from '../../lib/format';
import { track } from '@/lib/funnel';
import { BulletList, CardImage, CardTitle, ValleButton, ValleCard } from '@/components/ui/valle';
import { productAmount, type PackItem, type Product } from '../../types';
import { useT } from '../../i18n';

interface Teaser { key: string; name: string; img: string; color: string; badge?: string; items: PackItem[]; section: string; product?: Product }

/** "Best value packages": Light, Standard, the middle Exclusive tier and VIP, each bookable in one tap. */
export function PackagesTeaser() {
  const t = useT();
  const app = useApp();
  const goto = useGoto();
  const catalog = useCatalog();
  const products = catalog.PRODUCTS ?? [];
  const byKey = (k?: string) => (k ? products.find((p) => p.key === k) : undefined);
  const ex = catalog.PACKS.ex;
  const exMid = ex[Math.floor(ex.length / 2)];
  const vip = byKey('vip');

  const cards: Teaser[] = [];
  for (const tier of catalog.PACKS.ls.slice(0, 2)) {
    cards.push({ key: tier.key ?? tier.name, name: tier.name, img: tier.img, color: tier.color, badge: tier.badge, items: tier.items.slice(0, 3), section: 'ls', product: byKey(tier.key) });
  }
  if (exMid) cards.push({ key: exMid.key ?? exMid.name, name: exMid.name, img: exMid.img, color: exMid.color, badge: t('MOST POPULAR'), items: exMid.items.slice(0, 3), section: 'ex', product: byKey(exMid.key) });
  if (vip) cards.push({ key: vip.key, name: vip.name, img: vip.image, color: '#33FF74', badge: t('ALL INCLUSIVE'), items: catalog.PACKS.vip.slice(0, 3), section: 'vip', product: vip });
  if (cards.length === 0) return null;

  const book = (c: Teaser) => {
    track('package_click', c.key);
    if (c.product && !app.isSelected('product:' + c.product.key)) app.toggleSel('product:' + c.product.key);
    goto.booking();
  };

  return (
    <section data-testid="home-packages" className="mx-auto max-w-[1320px] px-[clamp(16px,3.5vw,40px)] pt-[clamp(56px,8vw,104px)]">
      <div className="mb-[30px] flex flex-wrap items-baseline justify-between gap-5 pb-7" style={{ borderBottom: '2px solid #340057' }}>
        <h2 className="m-0 origin-bottom-left -rotate-4 font-display text-[clamp(30px,4.6vw,64px)] leading-[0.85] font-black tracking-[-0.01em] uppercase italic">{t('Best value packages')}</h2>
        <a href={paths.packages()} onClick={(e) => { e.preventDefault(); goto.packages(); }} className="font-mono text-xs font-semibold tracking-[.16em]" style={{ color: '#FF3358', textDecoration: 'none' }}>{t('ALL PACKAGES')} →</a>
      </div>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        {cards.map((c) => {
          const from = c.product ? productAmount(c.product, app.rate, 1, 0, 0) : 0;
          return (
            <ValleCard key={c.key} data-testid="home-pack-card" className="flex flex-col">
              <CardImage src={c.img} alt={t('{name} package', { name: c.name })}>
                {c.badge && <span className="absolute top-3 left-3 -rotate-4 rounded-full bg-valle-yellow px-[11px] py-1.5 font-mono text-[10px] font-bold tracking-[.1em] text-valle-purple">{c.badge}</span>}
              </CardImage>
              <div className="h-[6px]" style={{ background: c.color }} />
              <div className="flex flex-1 flex-col px-5 pt-4 pb-5">
                <CardTitle size={24}>{c.name}</CardTitle>
                <BulletList items={c.items} color={c.color} className="mt-2 flex-1 [&_li]:py-1 [&_li]:text-[13.5px]" />
                {from > 0 && <div className="mt-3 font-mono text-[12px] font-bold tracking-[.06em] text-valle-purple">{t('From {price} per person', { price: money(from) })}</div>}
                <ValleButton variant="primary" onClick={() => book(c)} className="mt-3" aria-label={t('Book the {name} package', { name: c.name })}>{t('Book')}</ValleButton>
                <a href={paths.packages(c.section)} onClick={(e) => { e.preventDefault(); goto.packages(c.section); }} className="mt-2.5 text-center text-[13px] font-semibold" style={{ color: '#7333FF' }}>{t('What is included')}</a>
              </div>
            </ValleCard>
          );
        })}
      </div>
    </section>
  );
}
