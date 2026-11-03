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
  const idle = (cb: () => void) => ('requestIdleCallback' in window ? window.requestIdleCallback(cb, { timeout: 4000 }) : setTimeout(cb, 2500));
  idle(() => { void preloadAllPages().catch(() => undefined); });
});
