import type { Activity, Category } from '../types';
import { useApp } from '../store/AppStore';
import { useCatalog } from '../store/CatalogContext';
import { useGoto } from './nav';
import { money } from './format';

export interface CardModel extends Activity {
  catName: string;
  catBadge: string;
  catColor: string;
  catFg: string;
  pulseColor: string;
  pulseStr: string;    // "●●●○○"
  pulseName: string;   // SERENE..EXTREME
  priceLabel: string;  // "FROM Rs 875" | "Rs 6,200 / buggy" | "WITH ENTRY" | "AT THE KIOSK"
  hasAdd: boolean;
  selOn: boolean;
  addLabel: string;
  open: () => void;
  add: (e?: { stopPropagation?: () => void }) => void;
}

export const PULSE_NAMES = ['', 'SERENE', 'GENTLE', 'MODERATE', 'WILD', 'EXTREME'];

/**
 * Decorates activities exactly like the original template's card factory:
 * category colors, thrill dots, rate-aware price label and My Day handlers.
 */
export function useCardModel(): (a: Activity) => CardModel {
  const catalog = useCatalog();
  const app = useApp();
  const goto = useGoto();

  return (a: Activity): CardModel => {
    const c: Category = catalog.CAT[a.cat];
    const sel = app.isSelected(a.id);
    const hasAdd = a.mode === 'pp' || a.mode === 'flat';
    const price = app.activityPrice(a.id);
    let priceLabel = 'WITH ENTRY';
    if (a.mode === 'pp') priceLabel = 'FROM ' + money(price);
    if (a.mode === 'flat') priceLabel = money(price) + ' ' + (a.flatLabel || '');
    if (a.mode === 'kiosk') priceLabel = 'AT THE KIOSK';
    return {
      ...a,
      catName: c.name,
      catBadge: c.badge,
      catColor: c.color,
      catFg: c.fg,
      pulseColor: c.pulse,
      pulseStr: '●'.repeat(a.thrill) + '○'.repeat(5 - a.thrill),
      pulseName: PULSE_NAMES[a.thrill],
      priceLabel,
      hasAdd,
      selOn: sel,
      addLabel: sel ? '✓ Added to My Day' : '+ Add to My Day',
      open: () => goto.detail(a.id),
      add: (e) => { e?.stopPropagation?.(); app.toggleSel(a.id); },
    };
  };
}
