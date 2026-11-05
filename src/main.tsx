import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { langFromPath, loadDict } from './i18n';
import { preloadAllPages, preloadPagesFor } from './lib/lazyPage';
import './styles/tailwind.css';
import './styles/global.css';
import { registerServiceWorker } from './lib/pwa';

registerServiceWorker();

const tree = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// the prerendered HTML stays on screen while the page's own language dictionary loads
// ...and the page being opened, so it renders straight away; the other pages follow when the browser is idle
void Promise.all([
  loadDict(langFromPath(location.pathname)).catch(() => undefined),
  preloadPagesFor(location.pathname).catch(() => undefined),
]).finally(() => {
  createRoot(document.getElementById('root')!).render(
    tree,
  );
  // the other pages only after this one has fully loaded (its photos come first), and
  // not at all on a slow or data-saving connection: they load when the guest opens them
  const idle = (cb: () => void) => ('requestIdleCallback' in window ? window.requestIdleCallback(cb, { timeout: 4000 }) : setTimeout(cb, 2500));
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn && (conn.saveData || /2g|3g/.test(conn.effectiveType || ''))) return;
  const later = () => idle(() => { void preloadAllPages().catch(() => undefined); });
  if (document.readyState === 'complete') later();
  else window.addEventListener('load', later, { once: true });
});
