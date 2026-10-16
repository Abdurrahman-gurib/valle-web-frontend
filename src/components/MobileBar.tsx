import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../store/AppStore';
import { useCatalog } from '../store/CatalogContext';
import { useGoto } from '../lib/nav';
import { useCardModel } from '../lib/card';
import { useIsMobile } from '../hooks/useIsMobile';
import { useT } from '../i18n';

const LANG_PREFIX = '(\\/(fr|de|it|ar|ru|es|hi))?';
const ACTIVITY_RE = new RegExp('^' + LANG_PREFIX + '\\/activities\\/([^/]+)\\/?$');

/** Sticky bottom action bar, mobile only. On an activity page it is one "Book · from Rs X" button. */
export function MobileBar({ mobileNavOpen }: { mobileNavOpen: boolean }) {
  const app = useApp();
  const goto = useGoto();
  const isMobile = useIsMobile();
  const catalog = useCatalog();
  const card = useCardModel();
  const t = useT();
  const { pathname } = useLocation();
  // A guest on their ticket or waiver has already booked; the bar would only cover the form.
  const guestDoc = new RegExp('^' + LANG_PREFIX + '\\/(ticket|waiver)\\/').test(pathname);
  if (!isMobile || mobileNavOpen || app.dayOpen || guestDoc) return null;

  const actId = pathname.match(ACTIVITY_RE)?.[3];
  const act = actId ? catalog.ACTS.find((a) => a.id === actId) : undefined;

  const bar = (children: ReactNode) => (
    <div data-testid="mobile-bar" style={{
      position: 'fixed', left: 12, right: 12, bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', zIndex: 80, background: '#340057',
      borderRadius: 18, boxShadow: '0 18px 40px -10px rgba(38,0,64,.55)', padding: 10, display: 'flex', gap: 8,
    }}>{children}</div>
  );
  const bookBtn = 'press';
  const bookStyle = {
    flex: 1.4, border: 0, background: '#D91E44', cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 14.5, fontWeight: 700, color: '#FFFFFF', padding: '13px 0', borderRadius: 12,
  } as const;

  if (act) {
    const d = card(act);
    const bookIt = () => {
      if (!app.isSelected(act.id) && (act.mode === 'pp' || act.mode === 'flat')) app.toggleSel(act.id);
      goto.booking();
    };
    return bar(
      <button onClick={bookIt} className={bookBtn} style={bookStyle} data-testid="mobile-book-activity">
        {t('Book · {price}', { price: d.priceLabel })}
      </button>,
    );
  }

  return bar(
    <>
      <button
        onClick={() => goto.explore('all')}
        className="press"
        style={{
          flex: 1, border: '1.5px solid rgba(255,255,255,.35)', background: 'transparent', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, color: '#FFFFFF', padding: '13px 0', borderRadius: 12,
        }}
      >
        {t('Activities')}
      </button>
      <button onClick={goto.booking} className={bookBtn} style={bookStyle}>
        {app.selCount > 0 ? t('Book · {n} picked', { n: app.selCount }) : t('Book now')}
      </button>
    </>,
  );
}
