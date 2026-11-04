import { Link } from 'react-router-dom';
import { Camera, Package, UtensilsCrossed } from 'lucide-react';
import type { ReactNode } from 'react';
import { useApp } from '../../store/AppStore';
import { useCatalog, useRawCatalog } from '../../store/CatalogContext';
import { classFrom } from '../../lib/packageGroups';
import { paths } from '../../lib/nav';
import { money } from '../../lib/format';
import { useT } from '../../i18n';
import { Fwd } from '@/components/ui/arrows';

/** Rs 2,700 -> 2700 */
const rupees = (s: string) => Number(String(s).replace(/[^\d]/g, '')) || 0;

function Line({ to, icon, children, testId }: { to: string; icon: ReactNode; children: ReactNode; testId: string }) {
  return (
    <Link to={to} data-testid={testId} className="booking-upsell" style={{ color: '#340057' }}>
      <span aria-hidden className="booking-upsell-icon">{icon}</span>
      <span style={{ flex: 1 }}>{children}</span>
      <span aria-hidden style={{ color: '#5B21B6', display: 'inline-flex' }}><Fwd /></span>
    </Link>
  );
}

/** Lowest package price at the guest's rate (catalog only), or null. */
function usePackagesFrom(): number | null {
  const catalog = useCatalog();
  const { rate } = useApp();
  const r = rate === 'nr' ? 'nr' : 'rr';
  const prices = ['deals', 'exclusive', 'resident', 'senior']
    .map((slug) => classFrom(slug, catalog, r))
    .filter((f): f is { price: number; rate: 'rr' | 'nr' } => !!f && f.rate === r)
    .map((f) => f.price);
  return prices.length ? Math.min(...prices) : null;
}

/** Step 1: "Prefer one price? Packages from Rs {min} →". */
export function PackagesLine() {
  const t = useT();
  const from = usePackagesFrom();
  if (from == null) return null;
  return (
    <Line to={paths.packages()} testId="upsell-packages" icon={<Package size={18} strokeWidth={2.2} />}>
      {t('Prefer one price? Packages from {price}', { price: money(from) })}
    </Line>
  );
}

/** After the day summary: the park photographer and lunch at Le Chamouzé, priced from the catalog. */
export function DayExtras() {
  const t = useT();
  const catalog = useCatalog();
  const raw = useRawCatalog();
  const { rate } = useApp();
  const r = rate === 'nr' ? 'nr' : 'rr';
  const photo = classFrom('photo-video', { ...catalog, PRODUCTS: (catalog.PRODUCTS ?? []).filter((p) => p.family === 'photo') }, r);
  // the set menus are the restaurant's "package offers" group (found by its English title)
  const groups = raw.RESTOS.chamouze?.menuGroups ?? [];
  const setIdx = groups.findIndex((g) => /package offers/i.test(g.title));
  const menus = setIdx >= 0 ? groups[setIdx].items.map((i) => rupees(i.p)).filter((n) => n > 0) : [];
  const lunch = menus.length ? Math.min(...menus) : null;
  if (!photo && lunch == null) return null;
  return (
    <div style={{ display: 'grid', gap: 8, marginTop: 14 }} data-testid="day-extras">
      {photo && (
        <Line to={paths.packageGroup('photo-video')} testId="upsell-photo" icon={<Camera size={18} strokeWidth={2.2} />}>
          {t('Add the park photographer · from {price}', { price: money(photo.price) })}
        </Line>
      )}
      {lunch != null && (
        <Line to={paths.resto('chamouze') + '#menu'} testId="upsell-lunch" icon={<UtensilsCrossed size={18} strokeWidth={2.2} />}>
          {t('Add lunch at Le Chamouzé · from {price}', { price: money(lunch) })}
        </Line>
      )}
    </div>
  );
}
