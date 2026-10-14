import { ValleyMist } from '../../components/ValleyMist';
import { useState } from 'react';
import { useCatalog } from '../../store/CatalogContext';
import { useGoto } from '../../lib/nav';
import { useCardModel } from '../../lib/card';
import { useIsMobile } from '../../hooks/useIsMobile';
import { cn } from '@/lib/utils';
import { Img } from '../../components/Img';
import type { Pin } from '../../types';
import { useT, fwd } from '../../i18n';

interface SelPinModel {
  name: string;
  sub: string;
  img: string;
  catBadge: string;
  catColor: string;
  catFg: string;
  btnLabel: string;
  btnClick: () => void;
}

export function PinButton({ p, i, on, isMobile, onClick, scale = 1 }: { p: Pin; i: number; on: boolean; isMobile: boolean; onClick: (i: number) => void; scale?: number }) {
  const sub = p.kind === 'sub';
  const base = (isMobile ? (sub ? 17 : 21) : (sub ? 30 : 36)) * scale;
  const dim = on ? base + (isMobile ? 4 : 10) * scale : base;
  const fs = (isMobile ? (sub ? 7 : 9.5) : (sub ? 10 : 13)) * (scale < 1 ? (1 + scale) / 2 : 1);
  return (
    <button
      onClick={() => onClick(i)}
      title={p.name}
      className={cn(
        'absolute flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-solid border-white p-0 font-mono leading-none font-bold transition-all duration-200 ease-[ease] hover:scale-[1.18]',
        on ? 'bg-valle-yellow shadow-[0_0_0_7px_rgba(255,252,51,.35),0_6px_16px_rgba(0,0,0,.4)]' : (sub ? 'bg-valle-green shadow-[0_4px_10px_rgba(0,0,0,.35)]' : 'bg-valle-red shadow-[0_4px_10px_rgba(0,0,0,.35)]'),
        sub || on ? 'text-valle-purple' : 'text-white',
      )}
      style={{ left: p.px + '%', top: p.py + '%', width: dim, height: dim, fontSize: fs }}
    >
      {p.n}
    </button>
  );
}

function PinPopup({ sel, left, top, transform, onClose }: { sel: SelPinModel; left: string; top: string; transform: string; onClose: () => void }) {
  const t = useT();
  return (
    <div className="pointer-events-none absolute z-[6] w-[min(320px,94%)]" style={{ left, top, transform }}>
      <div className="pointer-events-auto relative flex w-full animate-[vfadeup_.22s_ease_both] overflow-hidden rounded-[14px] bg-white shadow-[0_18px_44px_-10px_rgba(31,0,51,.65)]">
        <div className="w-24 shrink-0 bg-valle-lilac">
          <Img src={sel.img} alt={sel.name} priority style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div className="min-w-0 flex-1 px-[13px] pt-[11px] pb-3">
          <span className="inline-block -rotate-3 rounded-full px-2 py-1 font-mono text-[8.5px] font-bold tracking-[.08em]" style={{ background: sel.catColor, color: sel.catFg }}>{sel.catBadge}</span>
          <div className="mt-1.5 font-display text-[14.5px] leading-none font-extrabold uppercase italic">{sel.name}</div>
          <div className="mt-[5px] line-clamp-2 text-[11.5px] leading-[1.45] text-valle-purple/70">{sel.sub}</div>
          <button
            onClick={sel.btnClick}
            className="mt-2 cursor-pointer rounded-full border-0 bg-valle-purple px-[15px] py-2 font-[inherit] text-[11.5px] font-bold text-white hover:bg-valle-violet"
          >
            {sel.btnLabel}
          </button>
        </div>
        <button
          onClick={onClose}
          aria-label={t('Close')}
          className="absolute top-2 right-2 size-6 cursor-pointer rounded-full border border-solid border-valle-lilac bg-white p-0 text-[12px] leading-none text-valle-purple/60 hover:border-valle-red hover:text-valle-red"
        >
          ×
        </button>
      </div>
    </div>
  );
}

/** "The walking trail": the official park sitemap with tappable stop pins. */
export function ParkMap() {
  const { PINS, ACTS } = useCatalog();
  const goto = useGoto();
  const card = useCardModel();
  const isMobile = useIsMobile();
  const [selectedPin, setSelectedPin] = useState(-1);
  const t = useT();

  let selPin: SelPinModel | null = null;
  const pp = selectedPin >= 0 ? PINS[selectedPin] : null;
  if (pp) {
    if (pp.act) {
      const act = ACTS.find((x) => x.id === pp.act);
      if (act) {
        const a = card(act);
        selPin = {
          name: pp.name, sub: pp.sub || a.blurb, img: pp.img || a.img,
          catBadge: a.catBadge, catColor: a.catColor, catFg: a.catFg,
          btnLabel: t('View details →'),
          btnClick: () => goto.detail(pp.act as string),
        };
      }
    } else {
      selPin = {
        name: pp.name, sub: pp.sub || '', img: pp.img,
        catBadge: pp.go === 'kids' ? t('KIDS PARK') : (pp.go === 'plan' ? t('SERVICES') : t('DINE')),
        catColor: pp.go === 'kids' ? '#FFFC33' : '#EBE2FF',
        catFg: '#340057',
        btnLabel: (pp.btnLabel || '') + ' ' + fwd(),
        btnClick: () => {
          if (pp.go === 'kids') goto.explore('kids');
          else if (pp.go === 'chamouze' || pp.go === 'citronelle') goto.resto(pp.go);
          else if (pp.go === 'dine') goto.dine();
          else goto.plan();
        },
      };
    }
  }
  const popLeft = pp ? (isMobile ? 50 : Math.min(74, Math.max(26, pp.px))) + '%' : '0%';
  const popTop = pp ? (isMobile ? '8px' : pp.py + '%') : '0%';
  const popTransform = pp ? (isMobile ? 'translateX(-50%)' : (pp.py < 34 ? 'translate(-50%, 22px)' : 'translate(-50%, calc(-100% - 22px))')) : 'none';

  return (
    <section className="relative mt-[clamp(56px,8vw,104px)] overflow-hidden bg-valle-deep px-0 pt-[clamp(56px,8vw,104px)] pb-[clamp(48px,7vw,88px)]">
      <div className="absolute top-0 right-[-2%] left-[-2%] h-2.5 rotate-[-.6deg] bg-[repeating-linear-gradient(-45deg,#33FF74_0_14px,#340057_14px_28px)]" />
      <div className="pointer-events-none absolute top-[30%] left-1/2 ml-[-700px] size-[1400px] rounded-full bg-[radial-gradient(circle,rgba(115,51,255,.22),rgba(31,0,51,0)_55%)]" />
      <ValleyMist />
      <div className="relative mx-auto max-w-[1320px] px-[clamp(16px,3.5vw,40px)] py-0">
        <div className="flex flex-wrap items-baseline justify-between gap-5 border-0 border-b-2 border-solid border-white/25 pb-7">
          <h2 className="m-0 origin-bottom-left -rotate-4 font-display text-[clamp(30px,4.6vw,64px)] leading-[0.85] font-black tracking-[-0.01em] text-white uppercase italic">{t('The walking trail')}</h2>
          <span className="font-mono text-[12px] font-semibold tracking-[.16em] text-white/60">{t('02 · SITEMAP · ≈1.8 KM LOOP')}</span>
        </div>
        <p className="mx-0 mt-[18px] mb-0 max-w-[56ch] text-[15.5px] leading-[1.55] text-white/75">
          {t('The official park sitemap, live. Ten lettered stops loop 1.8 km through the valley, plus the Green Zone wildlife and the Chamouzé falls. Tap any pin to preview a stop.')}
        </p>
        <div data-reveal="1" className="mt-[38px]">
          <div>
            <div className="relative rounded-[22px] border border-solid border-white/16 bg-[#2E0A4E] p-[clamp(10px,1.5vw,20px)] shadow-[0_40px_90px_-40px_rgba(0,0,0,.55)]">
              <div className="relative overflow-hidden rounded-[12px]">
                <div className="origin-center will-change-transform" style={{ transform: 'translate(0px, 0px) scale(1)' }}>
                  <div className="relative">
                    <Img
                      src="/images/park-sitemap.webp"
                      alt={t('Vallé official walking trail sitemap: ten lettered stops on a 1.8 km loop')}
                      surface="dark"
                      placeholder="#2E0A4E"
                      width={1879}
                      height={1327}
                      style={{ width: '100%', height: 'auto', display: 'block', aspectRatio: '1879 / 1327', objectFit: 'contain' }}
                    />
                    {PINS.map((p, i) => (
                      <PinButton
                        key={p.n}
                        p={p}
                        i={i}
                        on={selectedPin === i}
                        isMobile={isMobile}
                        onClick={(idx) => setSelectedPin((cur) => (cur === idx ? -1 : idx))}
                      />
                    ))}
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,.1),rgba(255,255,255,0)_46%)] mix-blend-screen" />
                {selPin && (
                  <PinPopup sel={selPin} left={popLeft} top={popTop} transform={popTransform} onClose={() => setSelectedPin(-1)} />
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 px-2 pt-3.5 pb-0.5 font-mono text-[10.5px] tracking-[.08em] text-white/70">
                <span>{t('TAP A PIN TO PREVIEW A STOP')}</span>
                <a
                  href="https://www.google.com/maps/place/Vall%C3%A9+Advenature+Park+(formerly+La+Vall%C3%A9e+des+Couleurs)/@-20.457614,57.4826031,17z"
                  target="_blank"
                  rel="noopener"
                  className="font-semibold"
                  style={{ color: '#FFFC33' }}
                >
                  {t('GET DIRECTIONS · GOOGLE MAPS ↗')}
                </a>
                <span>{t('A→J ≈1.8 KM · VALLEPARK.COM')}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-[18px] flex flex-wrap items-baseline justify-between gap-[18px] rounded-[16px] border-[1.5px] border-dashed border-white/35 px-[22px] py-4 text-white/80">
          <div className="min-w-[260px] flex-1 text-[13.5px] leading-[1.55]">
            {t("From the entrance the trail climbs past the Kids Park, La Citronelle and the Green Zone's tortoises and albino deer to the Luge Kart zone, then loops back along the 23 Coloured Earth, both waterfalls and La Tour viewpoint.")}
          </div>
          <div className="font-mono text-[11px] opacity-80">{t('A ENTRANCE · F 23 COLOURED EARTH · GZ WILDLIFE')}</div>
        </div>
      </div>
    </section>
  );
}
