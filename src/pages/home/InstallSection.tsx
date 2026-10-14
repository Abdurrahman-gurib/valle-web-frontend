import { useIsMobile } from '../../hooks/useIsMobile';
import { isRtl, useLang, useT } from '../../i18n';
import { promptInstall, useInstall } from '../../lib/pwa';
import { cn } from '@/lib/utils';

/**
 * "The park in your pocket": the home page's invitation to install the site to
 * the home screen. What it offers depends on the browser:
 *   - install dialog available (Android, desktop Chrome/Edge): one button
 *   - Safari on iPhone/iPad: the Share > Add to Home Screen steps
 *   - anything else: both sets of steps, so the guest can do it on their phone
 * Hidden once the site already runs from the home screen.
 */

function Benefit({ dot, children }: { dot: string; children: string }) {
  return (
    <li className="flex items-start gap-3 text-[15px] leading-[1.5] text-white/90">
      <span aria-hidden className="mt-[7px] size-2.5 flex-none rotate-45 rounded-[3px]" style={{ background: dot }} />
      <span>{children}</span>
    </li>
  );
}

/** A phone home screen drawn in CSS, with the VALLÉ icon where the guest's would be. */
function PhoneMock({ label }: { label: string }) {
  const tile = (bg: string, key: number) => <span key={key} className="aspect-square rounded-[13px]" style={{ background: bg }} />;
  const muted = 'rgba(255,255,255,.14)';
  return (
    <div role="img" aria-label={label} className="aspect-[9/17.5] w-[min(250px,62vw)] rotate-4 rounded-[34px] bg-[#1B0030] p-3 shadow-[0_40px_80px_-30px_rgba(0,0,0,.7),inset_0_0_0_2px_rgba(255,255,255,.14)]">
      <div className="box-border flex h-full flex-col rounded-[24px] bg-[linear-gradient(160deg,#7333FF_0%,#340057_55%,#260040_100%)] px-4 pt-[26px] pb-3.5">
        <div className="grid grid-cols-[repeat(4,1fr)] gap-3">
          {[0, 1, 2, 3, 4].map((k) => tile(muted, k))}
          <span className="relative">
            <img src="/icon-maskable-192.png" alt="" width={96} height={96} loading="lazy" className="block aspect-square h-auto w-full rounded-[13px] shadow-[0_0_0_2px_#33FF74,0_10px_22px_-6px_rgba(51,255,116,.6)]" />
            <span className="absolute top-full left-1/2 mt-1 -translate-x-1/2 font-mono text-[8.5px] font-bold tracking-[.08em] text-white">VALLÉ</span>
          </span>
          {[6, 7].map((k) => tile(muted, k))}
        </div>
        <div className="mt-auto grid grid-cols-[repeat(4,1fr)] gap-3 rounded-[18px] bg-white/10 p-2.5">
          {[0, 1, 2, 3].map((k) => tile('rgba(255,255,255,.22)', k))}
        </div>
      </div>
    </div>
  );
}

export function InstallSection() {
  const t = useT();
  const state = useInstall();
  const lang = useLang();
  const isMobile = useIsMobile();
  if (state === 'installed') return null;

  const steps = 'm-0 text-[14px] leading-[1.55] font-semibold text-valle-yellow';
  return (
    <section
      id="app"
      data-screen-label="Install the app"
      data-testid="install-section"
      className="mx-auto mt-[clamp(56px,8vw,104px)] mb-0 max-w-[1320px] px-[clamp(16px,3.5vw,40px)] py-0"
    >
      <div data-reveal="1" className={cn('relative grid items-center gap-[clamp(24px,4vw,56px)] overflow-hidden rounded-[24px] bg-valle-purple p-[clamp(28px,4.5vw,60px)]', isMobile ? 'grid-cols-[1fr]' : 'grid-cols-[1.25fr_.75fr]')}>
        <div>
          <span className="font-mono text-[12px] font-semibold tracking-[.16em] text-valle-green">{t('TAKE THE VALLEY WITH YOU')}</span>
          <h2 className={cn('mx-0 mt-4 mb-0 -rotate-3 font-display text-[clamp(34px,4.6vw,62px)] font-black tracking-[-0.01em] text-white uppercase italic', lang === 'hi' ? 'leading-[1.2]' : 'leading-[0.88]', isRtl() ? 'origin-bottom-right' : 'origin-bottom-left')}>
            {t('The park in')}<br /><span className="text-valle-yellow">{t('your pocket.')}</span>
          </h2>
          <p className="mx-0 mt-[22px] mb-0 max-w-[46ch] text-[16px] leading-[1.6] text-white/82">
            {t('Add VALLÉ to your home screen and it opens like an app, with or without signal.')}
          </p>
          <ul className="mx-0 mt-5 mb-0 grid list-none gap-2.5 p-0">
            <Benefit dot="#33FF74">{t('Activities, packages and prices, saved for offline')}</Benefit>
            <Benefit dot="#FFFC33">{t('Your ticket and QR code at the gate, even with no network')}</Benefit>
            <Benefit dot="#FF3358">{t('One tap from your home screen, nothing to download from a store')}</Benefit>
          </ul>

          <div className="mt-[26px] grid max-w-[52ch] gap-2">
            {state === 'prompt' && (
              <div>
                <button
                  data-testid="install-button"
                  className="press cursor-pointer rounded-full border-0 bg-valle-red px-[34px] py-4 font-[inherit] text-[16px] font-bold text-white shadow-[0_10px_28px_-6px_rgba(255,51,88,.6)] transition-[transform,background] duration-[.18s] ease-[ease] hover:bg-[#D91E44] hover:[transform:translateY(-2px)]"
                  onClick={() => { void promptInstall(); }}
                >
                  {t('Install the app')}
                </button>
              </div>
            )}
            {state !== 'prompt' && state !== 'ios' && (
              <p data-testid="install-steps-android" className={steps}>{t('On Android: open the browser menu and choose “Install app” or “Add to Home screen”.')}</p>
            )}
            {state !== 'prompt' && (
              <p data-testid="install-steps-ios" className={steps}>{t('On iPhone or iPad: tap Share, then “Add to Home Screen”.')}</p>
            )}
          </div>
        </div>

        <div className={cn('flex justify-center', isMobile ? 'px-0 pt-1.5 pb-2.5' : 'p-0')}>
          <PhoneMock label={t('The VALLÉ icon on a phone home screen')} />
        </div>
      </div>
    </section>
  );
}
