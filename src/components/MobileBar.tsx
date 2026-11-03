import { useLocation } from 'react-router-dom';
import { useApp } from '../store/AppStore';
import { useGoto } from '../lib/nav';
import { useIsMobile } from '../hooks/useIsMobile';
import { useT } from '../i18n';

/** Sticky bottom action bar, mobile only. */
export function MobileBar({ mobileNavOpen }: { mobileNavOpen: boolean }) {
  const app = useApp();
  const goto = useGoto();
  const isMobile = useIsMobile();
  const t = useT();
  const { pathname } = useLocation();
  // A guest on their ticket or waiver has already booked; the bar would only cover the form.
  const guestDoc = /^(\/(fr|de|it|ar|ru|es|hi))?\/(ticket|waiver)\//.test(pathname);
  if (!isMobile || mobileNavOpen || app.dayOpen || guestDoc) return null;

  return (
    <div style={{
      position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 80, background: '#340057',
      borderRadius: 18, boxShadow: '0 18px 40px -10px rgba(38,0,64,.55)', padding: 10, display: 'flex', gap: 8,
    }}>
      <button type="button" onClick={() => goto.explore('all')} className="vbtn vbtn-ghost" style={{ flex: 1, padding: 0 }}>
        {t('Explore')}
      </button>
      <button type="button" onClick={goto.booking} className="vbtn vbtn-on-dark" style={{ flex: 1.4, padding: 0 }}>
        {app.selCount > 0 ? t('Book · {n} picked', { n: app.selCount }) : t('Book now')}
      </button>
    </div>
  );
}
