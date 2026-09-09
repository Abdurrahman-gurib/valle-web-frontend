import { useState } from 'react';
import { useCatalog } from '../../store/CatalogContext';
import { useGoto } from '../../lib/nav';
import { useCardModel } from '../../lib/card';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useHover } from '../../hooks/useHover';
import { Img } from '../../components/Img';
import type { Pin } from '../../types';

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

function PinButton({ p, i, on, isMobile, onClick }: { p: Pin; i: number; on: boolean; isMobile: boolean; onClick: (i: number) => void }) {
  const [h, bind] = useHover();
  const sub = p.kind === 'sub';
  const base = isMobile ? (sub ? 17 : 21) : (sub ? 30 : 36);
  const dim = on ? base + (isMobile ? 4 : 10) : base;
  const fs = isMobile ? (sub ? 7 : 9.5) : (sub ? 10 : 13);
  return (
    <button
      {...bind}
      onClick={() => onClick(i)}
      title={p.name}
      style={{
        position: 'absolute', left: p.px + '%', top: p.py + '%', transform: 'translate(-50%,-50%)',
        width: dim, height: dim, borderRadius: 999, border: '2px solid #FFFFFF',
        background: on ? '#FFFC33' : (sub ? '#33FF74' : '#FF3358'),
        color: sub || on ? '#340057' : '#FFFFFF',
        fontFamily: "'Chivo Mono',monospace", fontWeight: 700, fontSize: fs, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: on ? '0 0 0 7px rgba(255,252,51,.35), 0 6px 16px rgba(0,0,0,.4)' : '0 4px 10px rgba(0,0,0,.35)',
        transition: 'all .2s ease', padding: 0, lineHeight: 1,
        ...(h ? { transform: 'translate(-50%,-50%) scale(1.18)' } : undefined),
      }}
    >
      {p.n}
    </button>
  );
}

function PinPopup({ sel, left, top, transform, onClose }: { sel: SelPinModel; left: string; top: string; transform: string; onClose: () => void }) {
  const [hBtn, bindBtn] = useHover();
  const [hX, bindX] = useHover();
  return (
    <div style={{ position: 'absolute', left, top, transform, pointerEvents: 'none', zIndex: 6, width: 'min(320px,94%)' }}>
      <div style={{ pointerEvents: 'auto', position: 'relative', display: 'flex', width: '100%', background: '#FFFFFF', borderRadius: 14, overflow: 'hidden', boxShadow: '0 18px 44px -10px rgba(31,0,51,.65)', animation: 'vfadeup .22s ease both' }}>
        <div style={{ width: 96, flexShrink: 0, background: '#EBE2FF' }}>
          <Img src={sel.img} alt={sel.name} priority style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: '11px 13px 12px' }}>
          <span style={{ background: sel.catColor, color: sel.catFg, fontFamily: "'Chivo Mono',monospace", fontSize: 8.5, fontWeight: 700, letterSpacing: '.08em', borderRadius: 999, padding: '4px 8px', display: 'inline-block', transform: 'rotate(-3deg)' }}>{sel.catBadge}</span>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 800, fontSize: 14.5, textTransform: 'uppercase', marginTop: 6, lineHeight: 1 }}>{sel.name}</div>
          <div style={{ fontSize: 11.5, color: 'rgba(52,0,87,.7)', lineHeight: 1.45, marginTop: 5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{sel.sub}</div>
          <button
            {...bindBtn}
            onClick={sel.btnClick}
            style={{ marginTop: 8, border: 0, background: hBtn ? '#7333FF' : '#340057', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700, color: '#FFFFFF', padding: '8px 15px', borderRadius: 999 }}
          >
            {sel.btnLabel}
          </button>
        </div>
        <button
          {...bindX}
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: 8, right: 8, border: '1px solid ' + (hX ? '#FF3358' : '#EBE2FF'), background: '#FFFFFF',
            color: hX ? '#FF3358' : 'rgba(52,0,87,.6)', width: 24, height: 24, borderRadius: 999, cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 0,
          }}
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
          btnLabel: 'View details →',
          btnClick: () => goto.detail(pp.act as string),
        };
      }
    } else {
      selPin = {
        name: pp.name, sub: pp.sub || '', img: pp.img,
        catBadge: pp.go === 'kids' ? 'KIDS PARK' : (pp.go === 'plan' ? 'SERVICES' : 'DINE'),
        catColor: pp.go === 'kids' ? '#FFFC33' : '#EBE2FF',
        catFg: '#340057',
        btnLabel: (pp.btnLabel || '') + ' →',
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
    <section style={{ background: '#260040', marginTop: 'clamp(56px,8vw,104px)', padding: 'clamp(56px,8vw,104px) 0 clamp(48px,7vw,88px)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: '-2%', right: '-2%', height: 10, background: 'repeating-linear-gradient(-45deg,#33FF74 0 14px,#340057 14px 28px)', transform: 'rotate(-.6deg)' }} />
      <div style={{ position: 'absolute', left: '50%', top: '30%', width: 1400, height: 1400, marginLeft: -700, borderRadius: 999, background: 'radial-gradient(circle, rgba(115,51,255,.22), rgba(31,0,51,0) 55%)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 clamp(16px,3.5vw,40px)', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', borderBottom: '2px solid rgba(255,255,255,.25)', paddingBottom: 28 }}>
          <h2 style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(30px,4.6vw,64px)', lineHeight: 0.85, letterSpacing: '-0.01em', margin: 0, color: '#FFFFFF', textTransform: 'uppercase', transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>The walking trail</h2>
          <span style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 12, fontWeight: 600, letterSpacing: '.16em', color: 'rgba(255,255,255,.6)' }}>02 · SITEMAP · ≈1.8 KM LOOP</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 15.5, lineHeight: 1.55, maxWidth: '56ch', margin: '18px 0 0' }}>
          The official park sitemap, live. Ten lettered stops loop 1.8 km through the valley, plus the Green Zone wildlife and the Chamouzé falls. Tap any pin to preview a stop.
        </p>
        <div data-reveal="1" style={{ marginTop: 38 }}>
          <div>
            <div style={{ position: 'relative', background: '#2E0A4E', border: '1px solid rgba(255,255,255,.16)', borderRadius: 22, padding: 'clamp(10px,1.5vw,20px)', boxShadow: '0 40px 90px -40px rgba(0,0,0,.55)' }}>
              <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
                <div style={{ transform: 'translate(0px, 0px) scale(1)', transformOrigin: '50% 50%', willChange: 'transform' }}>
                  <div style={{ position: 'relative' }}>
                    <Img
                      src="/images/park-sitemap.webp"
                      alt="Vallé official walking trail sitemap: ten lettered stops on a 1.8 km loop"
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
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(115deg, rgba(255,255,255,.1), rgba(255,255,255,0) 46%)', mixBlendMode: 'screen' }} />
                {selPin && (
                  <PinPopup sel={selPin} left={popLeft} top={popTop} transform={popTransform} onClose={() => setSelectedPin(-1)} />
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', padding: '14px 8px 2px', fontFamily: "'Chivo Mono',monospace", fontSize: 10.5, letterSpacing: '.08em', color: 'rgba(255,255,255,.7)' }}>
                <span>TAP A PIN TO PREVIEW A STOP</span>
                <a
                  href="https://www.google.comimapsiplaceiVall%C3%A9+Advenature+Park+(formerly+La+Vall%C3%A9e+des+Couleurs)i@-20.457614,57.4826031,17z"
                  target="_blank"
                  rel="noopener"
                  style={{ color: '#FFFC33', fontWeight: 600 }}
                >
                  GET DIRECTIONS · GOOGLE MAPS ↗
                </a>
                <span>A→J ≈1.8 KM · VALLEPARK.COM</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{ border: '1.5px dashed rgba(255,255,255,.35)', borderRadius: 16, padding: '16px 22px', color: 'rgba(255,255,255,.8)', marginTop: 18, display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, flex: 1, minWidth: 260 }}>
            From the entrance the trail climbs past the Kids Park, La Citronelle and the Green Zone's tortoises and albino deer to the Luge Kart zone, then loops back along the 23 Coloured Earth, both waterfalls and La Tour viewpoint.
          </div>
          <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 11, opacity: 0.8 }}>A ENTRANCE · F 23 COLOURED EARTH · GZ WILDLIFE</div>
        </div>
      </div>
    </section>
  );
}
