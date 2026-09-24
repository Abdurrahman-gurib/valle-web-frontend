// Sentry must initialise before React renders, so the earliest errors are caught.
import { Sentry, sentryEnabled } from './lib/sentry';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/global.css';

function CrashScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#340057', color: '#FFFFFF', fontFamily: "'Work Sans',sans-serif", padding: 24, textAlign: 'center' }}>
      <div>
        <div style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 40, textTransform: 'uppercase', color: '#FFFC33', transform: 'rotate(-3deg)' }}>Something slipped</div>
        <p style={{ maxWidth: 420, lineHeight: 1.6, opacity: 0.85 }}>The page hit an error and our team has been notified. Reload to carry on planning your day.</p>
        <button onClick={() => location.reload()} style={{ border: 0, background: '#FF3358', color: '#FFFFFF', fontWeight: 700, fontSize: 15, padding: '13px 26px', borderRadius: 999, cursor: 'pointer' }}>Reload</button>
      </div>
    </div>
  );
}

const tree = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

createRoot(document.getElementById('root')!).render(
  sentryEnabled ? <Sentry.ErrorBoundary fallback={<CrashScreen />}>{tree}</Sentry.ErrorBoundary> : tree,
);
