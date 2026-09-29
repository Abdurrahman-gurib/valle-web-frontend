import { useEffect, useState } from 'react';
import { getConsent, onConsentOpen, setConsent, type ConsentLevel } from '../lib/consent';
import { useHover } from '../hooks/useHover';
import { useT } from '../i18n';

const MONO = "'Chivo Mono',monospace";
const BARLOW = "'Barlow',sans-serif";

function Btn({ label, primary, onClick, testId }: { label: string; primary?: boolean; onClick: () => void; testId?: string }) {
  const [h, bind] = useHover();
  return (
    <button
      {...bind}
      onClick={onClick}
      data-testid={testId}
      style={{
        cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, padding: '12px 20px', borderRadius: 999, whiteSpace: 'nowrap',
        border: primary ? 0 : '1.5px solid #340057',
        background: primary ? (h ? '#D91E44' : '#FF3358') : (h ? '#340057' : 'transparent'),
        color: primary ? '#FFFFFF' : (h ? '#FFFFFF' : '#340057'),
        transition: 'all .15s',
      }}
    >{label}</button>
  );
}

function Toggle({ on, locked, onChange, label }: { on: boolean; locked?: boolean; onChange?: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={locked}
      onClick={() => onChange?.(!on)}
      style={{
        width: 44, height: 26, borderRadius: 999, border: 0, padding: 0, position: 'relative', flexShrink: 0,
        background: on ? '#33FF74' : '#D9CCF2', cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.7 : 1, transition: 'background .2s',
      }}
    >
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: 999, background: '#340057', transition: 'left .2s' }} />
    </button>
  );
}

/**
 * Cookie / storage consent banner. Shown once per browser on the first visit
 * (after hydration only, so crawlers and the prerender never see it), and again
 * from the footer's "Cookie settings" link. Essential storage (rate, My Day,
 * chat) is always on; performance monitoring (Sentry tracing + on-error replay)
 * needs "Accept all" or the toggle. See src/lib/consent.ts.
 */
export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const t = useT();

  useEffect(() => {
    if (!getConsent()) setOpen(true);
    return onConsentOpen(() => { setAnalytics(getConsent()?.level === 'all'); setDetails(true); setOpen(true); });
  }, []);

  if (!open) return null;

  const choose = (level: ConsentLevel) => { setConsent(level); setOpen(false); setDetails(false); };

  return (
    <div
      role="dialog"
      aria-label={t('Cookies and storage')}
      aria-live="polite"
      data-nosnippet=""
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 125, padding: 'clamp(10px,2vw,20px)', pointerEvents: 'none',
        paddingBottom: 'max(clamp(10px,2vw,20px), env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div style={{
        pointerEvents: 'auto', margin: '0 auto', width: 'min(920px,100%)', background: '#FFFFFF', color: '#340057', borderRadius: 20,
        boxShadow: '0 30px 70px -20px rgba(31,0,51,.6), 0 0 0 1.5px #EBE2FF', padding: 'clamp(16px,2.6vw,24px)', animation: 'vfadeup .35s ease both',
        maxHeight: 'min(80vh, 640px)', overflowY: 'auto',
        fontFamily: "'Work Sans',sans-serif",
      }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 360px', minWidth: 0 }}>
            <div style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em', color: '#7333FF' }}>{t('COOKIES & STORAGE')}</div>
            <div style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(22px,3vw,28px)', textTransform: 'uppercase', lineHeight: 0.95, marginTop: 6, transform: 'rotate(-2deg)', transformOrigin: 'left bottom' }}>
              {t('A small trail of crumbs')}
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: 'rgba(52,0,87,.75)', margin: '10px 0 0' }}>
              {t('We store your rate and your My Day picks in this browser so the site works. With your OK we also run anonymous performance monitoring to catch slow pages and errors. No advertising cookies, nothing sold on.')}{' '}
              <button onClick={() => setDetails((d) => !d)} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#7333FF', textDecoration: 'underline' }}>
                {details ? t('Hide details') : t('Choose what to allow')}
              </button>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', flex: '0 0 auto', marginLeft: 'auto' }}>
            <Btn label={t('Essential only')} onClick={() => choose('essential')} testId="consent-essential" />
            <Btn label={t('Accept all')} primary onClick={() => choose('all')} testId="consent-accept" />
          </div>
        </div>

        {details && (
          <div style={{ marginTop: 16, borderTop: '1px dashed #D9CCF2', paddingTop: 14, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <Toggle on locked label={t('Essential storage (always on)')} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t('Essential · always on')}</div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(52,0,87,.7)', marginTop: 3 }}>
                  {t('Your rate (resident or visitor), the experiences in My Day, your Explore filters, and a random key that keeps your live-chat conversation together. Stored in this browser only, never sent to advertisers.')}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <Toggle on={analytics} onChange={setAnalytics} label={t('Performance monitoring')} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t('Performance monitoring')}</div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(52,0,87,.7)', marginTop: 3 }}>
                  {t('Page-speed measurements and, only when something breaks, a short masked recording of the screen so we can fix it. Provided by Sentry. Text and images are masked; names and contact details are never included.')}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Btn label={t('Save my choices')} primary onClick={() => choose(analytics ? 'all' : 'essential')} testId="consent-save" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
