import { useEffect } from 'react';
import { useApp } from '../store/AppStore';
import { useCatalog } from '../store/CatalogContext';
import { useGoto } from '../lib/nav';
import { money } from '../lib/format';
import { useHover } from '../hooks/useHover';
import { Img } from './Img';
import { StripesSm } from './Stripes';

const MONO = "'Chivo Mono',monospace";
const BARLOW = "'Barlow',sans-serif";

function RowBtn({ on, onClick }: { on: boolean; onClick: () => void }) {
  const [h, bind] = useHover();
  return (
    <button
      {...bind}
      onClick={onClick}
      style={{
        border: on ? 0 : '1.5px solid #340057', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
        background: on ? '#33FF74' : (h ? '#340057' : 'transparent'), color: on ? '#340057' : (h ? '#FFFFFF' : '#340057'),
        padding: '9px 14px', borderRadius: 999, transition: 'all .15s', flexShrink: 0,
      }}
    >{on ? '✓ Added' : '+ Add'}</button>
  );
}

/**
 * "Choose your option" sheet: for an experience with several priced options
 * (zipline tours, quad tracks, buggy sizes, luge rides, expeditions), lists every
 * price-list row at the visitor's rate with its own add-to-My-Day toggle.
 * Opened through app.openOptions(id); mounted once in the public shell.
 */
export function OptionPicker() {
  const app = useApp();
  const catalog = useCatalog();
  const goto = useGoto();
  const id = app.optionsFor;
  const act = id ? catalog.ACTS.find((a) => a.id === id) : undefined;
  const rows = id ? catalog.PL[id] || [] : [];
  const rk = app.rate === 'nr' ? 'nr' : 'rr';
  const [hDone, bindDone] = useHover();
  const [hBook, bindBook] = useHover();

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') app.closeOptions(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [id, app]);

  if (!id || !act) return null;
  const chosen = rows.filter((r) => app.isSelected(act.id, r.n)).length;
  const isFlat = act.mode === 'flat';
  const unit = isFlat ? (act.flatLabel || '').replace('/', '').trim() : 'person';

  return (
    <div onClick={app.closeOptions} style={{ position: 'fixed', inset: 0, zIndex: 97, background: 'rgba(31,0,51,.62)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(10px,3vw,32px)', animation: 'vfade .18s ease both' }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Choose your ${act.name} option`} style={{ width: 'min(560px,100%)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#FFFFFF', borderRadius: 22, overflow: 'hidden', boxShadow: '0 40px 90px -30px rgba(31,0,51,.8)', animation: 'vfadeup .25s ease both' }}>
        <StripesSm height={8} />
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '16px 20px 12px' }}>
          <div style={{ width: 62, height: 62, borderRadius: 14, overflow: 'hidden', background: '#EBE2FF', flexShrink: 0 }}>
            <Img src={act.img} alt={act.name} priority style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color: '#7333FF' }}>CHOOSE YOUR OPTION · {app.rateTag} RATE</div>
            <div style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: 24, textTransform: 'uppercase', lineHeight: 0.95, color: '#340057', marginTop: 4 }}>{act.name}</div>
          </div>
          <button onClick={app.closeOptions} aria-label="Close" style={{ border: '1.5px solid #EBE2FF', background: '#FFFFFF', color: 'rgba(52,0,87,.6)', width: 32, height: 32, borderRadius: 999, cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '0 20px' }}>
          {rows.map((r) => {
            const on = app.isSelected(act.id, r.n);
            const price = r[rk];
            return (
              <div key={r.n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px dashed #EBE2FF' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: '#340057' }}>{r.n}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(52,0,87,.6)', marginTop: 3 }}>
                    {price ? money(price) + ' / ' + unit : 'FREE'}{!isFlat && price ? ' · ' + money(Math.round(price * 0.5)) + ' / child' : ''}
                  </div>
                </div>
                <RowBtn on={on} onClick={() => app.toggleSel(act.id, r.n)} />
              </div>
            );
          })}
        </div>
        <div style={{ padding: '14px 20px 18px', borderTop: '1.5px solid #EBE2FF', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '.1em', color: 'rgba(52,0,87,.6)', flex: 1 }}>
            {chosen === 0 ? 'NOTHING ADDED YET' : chosen + ' OPTION' + (chosen > 1 ? 'S' : '') + ' IN MY DAY'}
          </span>
          <button {...bindDone} onClick={app.closeOptions} style={{ border: '1.5px solid #340057', background: hDone ? '#340057' : 'transparent', color: hDone ? '#FFFFFF' : '#340057', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, padding: '11px 18px', borderRadius: 999 }}>Done</button>
          <button {...bindBook} onClick={() => { app.closeOptions(); goto.booking(); }} style={{ border: 0, background: hBook ? '#D91E44' : '#FF3358', color: '#FFFFFF', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, padding: '11px 18px', borderRadius: 999, boxShadow: '0 10px 24px -8px rgba(255,51,88,.6)' }}>Book now →</button>
        </div>
      </div>
    </div>
  );
}
