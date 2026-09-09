import { useApp } from '../store/AppStore';
import { useGoto } from '../lib/nav';
import { useIsMobile } from '../hooks/useIsMobile';

/** Sticky bottom action bar, mobile only. */
export function MobileBar({ mobileNavOpen }: { mobileNavOpen: boolean }) {
  const app = useApp();
  const goto = useGoto();
  const isMobile = useIsMobile();

  if (!isMobile || mobileNavOpen || app.dayOpen) return null;

  return (
    <div style={{
      position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 80, background: '#340057',
      borderRadius: 18, boxShadow: '0 18px 40px -10px rgba(38,0,64,.55)', padding: 10, display: 'flex', gap: 8,
    }}>
      <button
        onClick={() => goto.explore('all')}
        className="press"
        style={{
          flex: 1, border: '1.5px solid rgba(255,255,255,.35)', background: 'transparent', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, color: '#FFFFFF', padding: '13px 0', borderRadius: 12,
        }}
      >
        Explore
      </button>
      <button
        onClick={goto.booking}
        className="press"
        style={{
          flex: 1.4, border: 0, background: '#FF3358', cursor: 'pointer', fontFamily: 'inherit',
          fontSize: 14.5, fontWeight: 700, color: '#FFFFFF', padding: '13px 0', borderRadius: 12,
        }}
      >
        {app.selCount > 0 ? 'Book · ' + app.selCount + ' picked' : 'Book now'}
      </button>
    </div>
  );
}
