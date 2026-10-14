import { useEscape } from '../hooks/useEscape';
import { useEffect, useState } from 'react';
import { getConsent, onConsentOpen, setConsent, type ConsentLevel } from '../lib/consent';
import { useT } from '../i18n';
import { cn } from '@/lib/utils';

function Btn({ label, primary, onClick, testId }: { label: string; primary?: boolean; onClick: () => void; testId?: string }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={cn(
        'cursor-pointer rounded-full px-5 py-3 font-[inherit] text-[14px] font-bold whitespace-nowrap transition-all duration-150 ease-[ease]',
        primary
          ? 'border-0 bg-valle-red text-white hover:bg-[#D91E44]'
          : 'border-[1.5px] border-solid border-valle-purple bg-transparent text-valle-purple hover:bg-valle-purple hover:text-white',
      )}
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
      className={cn(
        'relative h-[26px] w-11 shrink-0 rounded-full border-0 p-0 transition-[background] duration-200 ease-[ease]',
        on ? 'bg-valle-green' : 'bg-[#D9CCF2]',
        locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer opacity-100',
      )}
    >
      <span className={cn('absolute top-[3px] size-5 rounded-full bg-valle-purple transition-[left] duration-200 ease-[ease]', on ? 'left-[21px]' : 'left-[3px]')} />
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

  // Escape folds the settings back; it never counts as a choice
  useEscape(open && details, () => setDetails(false));
  if (!open) return null;

  const choose = (level: ConsentLevel) => { setConsent(level); setOpen(false); setDetails(false); };

  return (
    <div
      role="dialog"
      aria-label={t('Cookies and storage')}
      aria-live="polite"
      data-nosnippet=""
      className="pointer-events-none fixed right-0 bottom-0 left-0 z-[125] p-[clamp(10px,2vw,20px)] pb-[max(clamp(10px,2vw,20px),env(safe-area-inset-bottom,0px))]"
    >
      <div className="pointer-events-auto mx-auto my-0 max-h-[min(80vh,640px)] w-[min(920px,100%)] animate-[vfadeup_.35s_ease_both] overflow-y-auto rounded-[20px] bg-white p-[clamp(16px,2.6vw,24px)] font-sans text-valle-purple shadow-[0_30px_70px_-20px_rgba(31,0,51,.6),0_0_0_1.5px_#EBE2FF]">
        <div className="flex flex-wrap items-start gap-[18px]">
          <div className="min-w-0 flex-[1_1_360px]">
            <div className="font-mono text-[10.5px] font-bold tracking-[.14em] text-valle-violet">{t('COOKIES & STORAGE')}</div>
            <div className="mt-1.5 origin-bottom-left -rotate-2 font-display text-[clamp(22px,3vw,28px)] leading-[0.95] font-black uppercase italic">
              {t('A small trail of crumbs')}
            </div>
            <p className="mx-0 mt-2.5 mb-0 text-[14px] leading-[1.55] text-valle-purple/75">
              {t('We store your rate and your My Day picks in this browser so the site works. With your OK we also run anonymous performance monitoring to catch slow pages and errors. No advertising cookies, nothing sold on.')}{' '}
              <button onClick={() => setDetails((d) => !d)} className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-[14px] font-bold text-valle-violet underline">
                {details ? t('Hide details') : t('Choose what to allow')}
              </button>
            </p>
          </div>
          <div className="ml-auto flex flex-[0_0_auto] flex-wrap items-center gap-2.5">
            <Btn label={t('Essential only')} onClick={() => choose('essential')} testId="consent-essential" />
            <Btn label={t('Accept all')} primary onClick={() => choose('all')} testId="consent-accept" />
          </div>
        </div>

        {details && (
          <div className="mt-4 grid gap-3 pt-3.5" style={{ borderTop: '1px dashed #D9CCF2' }}>
            <div className="flex items-start gap-3.5">
              <Toggle on locked label={t('Essential storage (always on)')} />
              <div>
                <div className="text-[14px] font-bold">{t('Essential · always on')}</div>
                <div className="mt-[3px] text-[13px] leading-[1.5] text-valle-purple/70">
                  {t('Your rate (resident or visitor), the experiences in My Day, your Explore filters, and a random key that keeps your live-chat conversation together. Stored in this browser only, never sent to advertisers.')}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3.5">
              <Toggle on={analytics} onChange={setAnalytics} label={t('Performance monitoring')} />
              <div>
                <div className="text-[14px] font-bold">{t('Performance monitoring')}</div>
                <div className="mt-[3px] text-[13px] leading-[1.5] text-valle-purple/70">
                  {t('Page-speed measurements and, only when something breaks, a short masked recording of the screen so we can fix it. Provided by Sentry. Text and images are masked; names and contact details are never included.')}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2.5">
              <Btn label={t('Save my choices')} primary onClick={() => choose(analytics ? 'all' : 'essential')} testId="consent-save" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
