import { useLocation } from 'react-router-dom';
import { useApp } from '../store/AppStore';
import { useGoto } from '../lib/nav';
import { useIsMobile } from '../hooks/useIsMobile';
import { useT } from '../i18n';
import { useCatalog } from '../store/CatalogContext';
import { useCardModel } from '../lib/card';

/** Sticky bottom action bar, mobile only. */
export function MobileBar({ mobileNavOpen }: { mobileNavOpen: boolean }) {
  const app = useApp();
  const goto = useGoto();
  const isMobile = useIsMobile();
  const t = useT();
  const { pathname } = useLocation();
  const catalog = useCatalog();
  const card = useCardModel();
  // on an activity page the bar's main action adds that activity (or opens its options)
  const actId = /^(?:\/(?:fr|de|it|ar|ru|es|hi))?\/activities\/([^/?#]+)/.exec(pathname)?.[1];
  const act = actId ? catalog.ACTS.find((a) => a.id === actId) : undefined;
  const m = act ? card(act) : undefined;
  const addMode = !!m && m.hasAdd && !m.selOn;
  const multi = !!act && (catalog.PL[act.id] || []).length > 1;
  // A guest on their ticket or waiver has already booked; the bar would only cover the form.
  const guestDoc = /^(\/(fr|de|it|ar|ru|es|hi))?\/(ticket|waiver)\//.test(pathname);
  // The booking and group pages carry their own sticky Confirm bar: this one would cover it.
  const ownActionBar = /^(\/(fr|de|it|ar|ru|es|hi))?\/(booking|groups)\/?$/.test(pathname);
  if (!isMobile || mobileNavOpen || app.dayOpen || guestDoc || ownActionBar) return null;

  return (
    <div style={{
      position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 80, background: '#340057',
      borderRadius: 18, boxShadow: '0 18px 40px -10px rgba(38,0,64,.55)', padding: 10, display: 'flex', gap: 8,
    }}>
      <button type="button" onClick={() => goto.explore('all')} className="vbtn vbtn-ghost" style={{ flex: 1, padding: 0 }}>
        {t('Explore')}
      </button>
      {addMode && m
        ? <button type="button" onClick={() => m.add()} data-testid="mobile-bar-add" className="vbtn vbtn-on-dark" style={{ flex: 1.6, padding: '0 12px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {multi ? t('Choose an option') : t('Add {name}', { name: m.name })}
          </button>
        : <button type="button" onClick={goto.booking} className="vbtn vbtn-on-dark" style={{ flex: 1.4, padding: 0 }}>
            {app.selCount > 0 ? t('Book · {n} picked', { n: app.selCount }) : t('Book now')}
          </button>}
    </div>
  );
}
