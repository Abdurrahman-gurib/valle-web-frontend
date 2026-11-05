import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/AppStore';
import { useCatalog } from '../store/CatalogContext';
import { parseSelKey } from '../lib/sel';
import { useT } from '../i18n';
import { productDisplayName } from '../lib/photoTier';

/**
 * Polite live region for My Day: "Added Zipline Adventures to My Day · 2 items".
 * Watches the selection, so every add button on the site (cards, price lists,
 * option picker, packages) is announced the same way without wiring each one.
 */
export function MyDayAnnouncer() {
  const app = useApp();
  const catalog = useCatalog();
  const t = useT();
  const prev = useRef<string[] | null>(null);
  const [msg, setMsg] = useState('');
  const keys = Object.keys(app.sel);
  const sig = keys.join('|');

  useEffect(() => {
    const before = prev.current;
    prev.current = keys;
    if (!before) return; // the first render restores a saved day: nothing to announce
    const added = keys.find((k) => !before.includes(k));
    const removed = before.find((k) => !keys.includes(k));
    const key = added ?? removed;
    if (!key) return;
    const { id, variant } = parseSelKey(key);
    const act = catalog.ACTS.find((a) => a.id === id);
    const product = id.startsWith('product:') ? (catalog.PRODUCTS ?? []).find((p) => 'product:' + p.key === id) : undefined;
    const base = act?.name ?? (product ? t(productDisplayName(product)) : id);
    const name = variant ? base + ' · ' + t(variant) : base;
    const n = keys.length;
    const count = n === 1 ? t('1 item') : t('{n} items', { n });
    setMsg(added
      ? t('Added {name} to My Day · {count}', { name, count })
      : t('Removed {name} from My Day · {count}', { name, count }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  return <div role="status" aria-live="polite" aria-atomic="true" data-testid="myday-announcer" className="sr-only">{msg}</div>;
}
