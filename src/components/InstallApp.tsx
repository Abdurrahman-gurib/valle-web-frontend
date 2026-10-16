import { useEffect, useState, type CSSProperties } from 'react';
import { useT } from '../i18n';
import { promptInstall, useInstall, useOnline, warmOfflineImages } from '../lib/pwa';
import { useCatalog } from '../store/CatalogContext';
import { color, font, mono, radius, shadow } from '../styles/theme';

/** "Share, then Add to Home Screen": the only way to install on iPhone and iPad. */
function IosHint({ style }: { style?: CSSProperties }) {
  const t = useT();
  return <span style={style}>{t('On iPhone or iPad: tap Share, then “Add to Home Screen”.')}</span>;
}

/**
 * Invitation to install, shown where it is most useful: next to a guest's
 * ticket. Renders nothing when the browser cannot install the site or the app
 * is already on the home screen.
 */
export function InstallCard({ style }: { style?: CSSProperties }) {
  const t = useT();
  const state = useInstall();
  if (state !== 'prompt' && state !== 'ios') return null;
  return (
    <div data-testid="install-card" data-print-hide="" style={{
      background: color.tint, border: `1.5px solid ${color.border}`, borderRadius: radius.lg, padding: '16px 18px',
      display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', textAlign: 'start', ...style,
    }}>
      <img src="/favicon-192.png" alt="" width={44} height={44} style={{ borderRadius: 11, flex: 'none' }} />
      <div style={{ flex: '1 1 200px', minWidth: 0 }}>
        <div style={{ fontFamily: font.body, fontWeight: 700, fontSize: 15, color: color.purple }}>{t('Keep VALLÉ on your home screen')}</div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(52,0,87,.72)', marginTop: 3 }}>
          {t('Your ticket, prices and activities open instantly, even with no signal in the valley.')}
        </div>
        {state === 'ios' && <IosHint style={{ display: 'block', fontSize: 13, lineHeight: 1.5, color: color.violet, fontWeight: 600, marginTop: 6 }} />}
      </div>
      {state === 'prompt' && (
        <button
          onClick={() => { void promptInstall(); }}
          className="press"
          style={{
            border: 0, background: color.pink, color: color.white, fontFamily: font.body, fontWeight: 700, fontSize: 14,
            padding: '11px 20px', borderRadius: radius.pill, cursor: 'pointer', boxShadow: shadow.pink, whiteSpace: 'nowrap',
          }}
        >
          {t('Install the app')}
        </button>
      )}
    </div>
  );
}

/** Footer entry: the install dialog where the browser has one, the iOS steps otherwise. */
export function InstallFooterLink() {
  const t = useT();
  const state = useInstall();
  const [hint, setHint] = useState(false);
  if (state !== 'prompt' && state !== 'ios') return null;
  return (
    <>
      <button
        data-testid="install-link"
        onClick={() => { if (state === 'prompt') void promptInstall(); else setHint((h) => !h); }}
        style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit', letterSpacing: 'inherit' }}
      >
        {t('INSTALL THE APP')}
      </button>
      {hint && <IosHint style={{ display: 'block', marginTop: 6, letterSpacing: 'normal' }} />}
      {' · '}
    </>
  );
}

/**
 * Mounted once in the public shell: tells guests when they are looking at saved
 * data, and asks the service worker to keep the activity photos for later.
 */
export function OfflineStatus() {
  const t = useT();
  const online = useOnline();
  const catalog = useCatalog();

  useEffect(() => {
    // a few seconds after the page settles, so the photos never compete with what is on screen
    const timer = window.setTimeout(() => {
      const urls = new Set<string>();
      const collect = (node: unknown) => {
        if (typeof node === 'string') { if (/^\/images\/[^?#]+\.(avif|webp|jpe?g|png)$/.test(node)) urls.add(node); return; }
        if (Array.isArray(node)) { node.forEach(collect); return; }
        if (node && typeof node === 'object') Object.values(node).forEach(collect);
      };
      collect(catalog.ACTS);
      collect(catalog.RESTOS);
      warmOfflineImages([...urls]);
    }, 6000);
    return () => window.clearTimeout(timer);
    // the catalog's photo list does not change with the language
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (online) return null;
  return (
    <div role="status" data-testid="offline-pill" style={{
      position: 'fixed', top: 84, left: '50%', transform: 'translateX(-50%)', zIndex: 60, maxWidth: 'calc(100vw - 24px)',
      background: color.yellow, color: color.purple, borderRadius: radius.pill, padding: '8px 14px', boxShadow: shadow.card,
      ...mono, textAlign: 'center', pointerEvents: 'none',
    }}>
      {t('OFFLINE · SHOWING SAVED ACTIVITIES AND PRICES')}
    </div>
  );
}
