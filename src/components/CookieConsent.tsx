import { useEscape } from '../hooks/useEscape';
import { useEffect, useRef, useState } from 'react';
import { getConsent, onConsentOpen, setConsent } from '../lib/consent';
import { useT } from '../i18n';
import { cn } from '@/lib/utils';

function Btn({ label, primary, onClick, testId }: { label: string; primary?: boolean; onClick: () => void; testId?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={cn('vbtn max-sm:min-h-[40px] max-sm:px-4 max-sm:text-[13.5px] short:min-h-[40px] short:px-4', primary ? 'vbtn-primary' : 'vbtn-secondary')}
    >{label}</button>
  );
}

/** Always-on indicator for essential storage (there is nothing optional to switch). */
function LockedOn({ label }: { label: string }) {
  return (
    <button
      role="switch"
      aria-checked
      aria-label={label}
      disabled
      className="relative h-[26px] w-11 shrink-0 cursor-not-allowed rounded-full border-0 bg-valle-green p-0 opacity-70"
    >
      <span className="absolute top-[3px] left-[21px] size-5 rounded-full bg-valle-purple" />
    </button>
  );
}

/**
 * Cookie / storage consent banner. Shown once per browser on the first visit
 * (after hydration only, so crawlers and the prerender never see it), and again
 * from the footer's "Cookie settings" link. The site only keeps essential
 * storage (rate, My Day, chat) and runs no analytics or monitoring, so the
 * banner is a notice with one acknowledgement button. See src/lib/consent.ts.
 */
export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const t = useT();

  useEffect(() => {
    if (!getConsent()) setOpen(true);
    return onConsentOpen(() => { setDetails(true); setOpen(true); });
  }, []);

  // Escape folds the settings back; it never counts as a choice
  useEscape(open && details, () => setDetails(false));

  // Publish the notice's height so the chat launcher can sit above it instead of under it.
  const box = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = box.current;
    const root = document.documentElement;
    if (!open || !el) { root.style.removeProperty('--valle-cookie-h'); return; }
    const put = () => root.style.setProperty('--valle-cookie-h', Math.ceil(el.getBoundingClientRect().height) + 'px');
    put();
    const ro = new ResizeObserver(put);
    ro.observe(el);
    return () => { ro.disconnect(); root.style.removeProperty('--valle-cookie-h'); };
  }, [open]);
  if (!open) return null;

  const acknowledge = () => { setConsent('essential'); setOpen(false); setDetails(false); };

  return (
    // A notice, not a modal: a labelled region the page stays usable around. Compact on
    // phones, at 200% zoom and in landscape (no display heading, smaller type and button).
    <section
      ref={box}
      aria-label={t('Cookies and storage')}
      data-nosnippet=""
      className="pointer-events-none fixed right-0 bottom-0 left-0 z-[125] p-[clamp(8px,2vw,20px)] pb-[max(clamp(8px,2vw,20px),env(safe-area-inset-bottom,0px))]"
    >
      <div className="pointer-events-auto mx-auto my-0 max-h-[min(60vh,640px)] w-[min(920px,100%)] animate-[vfadeup_.35s_ease_both] overflow-y-auto rounded-[16px] sm:rounded-[20px] bg-white p-[clamp(12px,2.6vw,24px)] short:p-[10px] font-sans text-valle-purple shadow-[0_30px_70px_-20px_rgba(31,0,51,.6),0_0_0_1.5px_#EBE2FF]">
        <div className="flex flex-wrap items-center gap-x-[18px] gap-y-[10px]">
          <div className="min-w-0 flex-[1_1_300px]">
            <div className="font-mono text-[10.5px] font-bold tracking-[.14em] text-valle-violet">{t('COOKIES & STORAGE')}</div>
            <div className="mt-1.5 origin-bottom-left -rotate-2 font-display text-[clamp(22px,3vw,28px)] leading-[0.95] font-black uppercase italic max-sm:hidden short:hidden">
              {t('A small trail of crumbs')}
            </div>
            <p className="mx-0 mt-1.5 sm:mt-2.5 mb-0 text-[13px] sm:text-[14px] leading-[1.5] text-valle-purple/75">
              {t('We store your rate and your My Day picks in this browser so the site works. No advertising cookies, no tracking, nothing sold on.')}{' '}
              <button onClick={() => setDetails((d) => !d)} aria-expanded={details} className="vbtn-link underline">
                {details ? t('Hide details') : t('What we store')}
              </button>
            </p>
          </div>
          <div className="ml-auto flex flex-[0_0_auto] flex-wrap items-center gap-2.5">
            <Btn label={t('Got it')} primary onClick={acknowledge} testId="consent-ok" />
          </div>
        </div>

        {details && (
          <div className="mt-4 grid gap-3 pt-3.5" style={{ borderTop: '1px dashed #D9CCF2' }}>
            <div className="flex items-start gap-3.5">
              <LockedOn label={t('Essential storage (always on)')} />
              <div>
                <div className="text-[14px] font-bold">{t('Essential · always on')}</div>
                <div className="mt-[3px] text-[13px] leading-[1.5] text-valle-purple/70">
                  {t('Your rate (resident or visitor), the experiences in My Day, your Explore filters, and a random key that keeps your live-chat conversation together. Stored in this browser only, never sent to advertisers.')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
