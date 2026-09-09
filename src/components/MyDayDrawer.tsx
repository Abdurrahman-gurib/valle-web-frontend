import { useApp } from '../store/AppStore';
import { useCatalog } from '../store/CatalogContext';
import { useGoto } from '../lib/nav';
import { money } from '../lib/format';
import { useHover } from '../hooks/useHover';
import { Img } from './Img';
import type { Activity } from '../types';

const qtyBtn: React.CSSProperties = {
  border: 0, background: '#FFFFFF', borderRadius: 6, width: 22, height: 22, cursor: 'pointer',
  fontSize: 12, fontWeight: 700, color: '#340057', lineHeight: 1, padding: 0,
};
const qtyWrap: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 3, background: '#F7F3FF', borderRadius: 8, padding: '2px 5px',
};
const qtyTag: React.CSSProperties = {
  fontFamily: "'Chivo Mono',monospace", fontSize: 8, color: 'rgba(52,0,87,.55)',
};
const qtyNum: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, minWidth: 14, textAlign: 'center' };

function Qty({ tag, val, dec, inc }: { tag: string; val: number; dec: () => void; inc: () => void }) {
  return (
    <span style={qtyWrap}>
      <span style={qtyTag}>{tag}</span>
      <button onClick={dec} style={qtyBtn}>−</button>
      <span style={qtyNum}>{val}</span>
      <button onClick={inc} style={qtyBtn}>+</button>
    </span>
  );
}

function CartRow({ a }: { a: Activity }) {
  const app = useApp();
  const goto = useGoto();
  const [hRem, bindRem] = useHover();
  const c = app.sel[a.id] || {};
  const isFlat = a.mode === 'flat';
  const price = app.activityPrice(a.id);
  const amt = isFlat
    ? price * (c.u || 0)
    : price * (c.a || 0) + Math.round(price * 0.5) * (c.k || 0);
  const unitName =
    ({ buggy: 'BUGGIES', group: 'GROUPS' } as Record<string, string>)[
      a.flatLabel ? a.flatLabel.replace('/', '').trim().toLowerCase() : ''
    ] || 'UNITS';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: '1px dashed #EBE2FF' }}>
      <div
        onClick={() => { app.closeDay(); goto.detail(a.id); }}
        style={{ width: 46, height: 46, borderRadius: 10, overflow: 'hidden', flexShrink: 0, cursor: 'pointer', background: '#EBE2FF' }}
      >
        <Img src={a.img} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
          {!isFlat && (
            <>
              <Qty tag="AD" val={c.a || 0} dec={() => app.bumpSel(a.id, 'a', -1)} inc={() => app.bumpSel(a.id, 'a', 1)} />
              <Qty tag="CH" val={c.k || 0} dec={() => app.bumpSel(a.id, 'k', -1)} inc={() => app.bumpSel(a.id, 'k', 1)} />
            </>
          )}
          {isFlat && (
            <Qty tag={unitName} val={c.u || 0} dec={() => app.bumpSel(a.id, 'u', -1)} inc={() => app.bumpSel(a.id, 'u', 1)} />
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <span style={{ fontFamily: "'Chivo Mono',monospace", fontWeight: 700, fontSize: 11.5 }}>{money(amt)}</span>
        <button
          {...bindRem}
          onClick={() => app.toggleSel(a.id)}
          title="Remove"
          style={{
            border: `1px solid ${hRem ? '#FF3358' : '#EBE2FF'}`, background: 'transparent',
            color: hRem ? '#FF3358' : 'rgba(52,0,87,.5)', width: 22, height: 22, borderRadius: 999,
            cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function MyDayDrawer() {
  const app = useApp();
  const catalog = useCatalog();
  const goto = useGoto();
  const [hClose, bindClose] = useHover();
  const [hCheckout, bindCheckout] = useHover();
  const [hBrowse, bindBrowse] = useHover();

  if (!app.dayOpen) return null;

  const cartActs = catalog.ACTS.filter((a) => app.sel[a.id]);
  const cartCountLabel =
    cartActs.length === 0
      ? 'PARK ENTRY'
      : cartActs.length + ' EXPERIENCE' + (cartActs.length > 1 ? 'S' : '') + ' + ENTRY';
  const entryAmt = money(catalog.ENTRY_A * app.adults + catalog.ENTRY_C * app.kids);

  return (
    <>
      <div
        onClick={app.closeDay}
        style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(31,0,51,.55)', backdropFilter: 'blur(3px)' }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 96, width: 'min(100vw,400px)',
        background: '#FFFFFF', boxShadow: '-24px 0 60px rgba(31,0,51,.4)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 20px', background: '#340057', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 22, textTransform: 'uppercase', flex: 1, transform: 'rotate(-2deg)' }}>My Day</div>
          <span style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 9.5, letterSpacing: '.08em', color: 'rgba(255,255,255,.7)' }}>{cartCountLabel}</span>
          <button
            {...bindClose}
            onClick={app.closeDay}
            aria-label="Close"
            style={{
              border: '1.5px solid rgba(255,255,255,.4)', background: hClose ? 'rgba(255,255,255,.15)' : 'transparent',
              color: '#FFFFFF', width: 32, height: 32, borderRadius: 999, cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 18px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', borderBottom: '1px dashed #EBE2FF', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 110 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>Park entry</div>
              <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 9, color: 'rgba(52,0,87,.6)', marginTop: 2 }}>TRAILS INCLUDED</div>
            </div>
            <Qty tag="AD" val={app.adults} dec={() => app.setAdults(app.adults - 1)} inc={() => app.setAdults(app.adults + 1)} />
            <Qty tag="CH" val={app.kids} dec={() => app.setKids(app.kids - 1)} inc={() => app.setKids(app.kids + 1)} />
            <span style={{ fontFamily: "'Chivo Mono',monospace", fontWeight: 700, fontSize: 11.5, minWidth: 64, textAlign: 'right' }}>{entryAmt}</span>
          </div>
          {cartActs.map((a) => <CartRow key={a.id} a={a} />)}
          {cartActs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '28px 10px' }}>
              <div style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 800, fontSize: 19, textTransform: 'uppercase' }}>Nothing here yet</div>
              <div style={{ fontSize: 13, color: 'rgba(52,0,87,.6)', marginTop: 6, lineHeight: 1.5 }}>Tap + on any experience card to build your day.</div>
              <button
                {...bindBrowse}
                onClick={() => { app.closeDay(); goto.explore('all'); }}
                style={{
                  marginTop: 14, border: '2px solid #340057', background: hBrowse ? '#340057' : 'transparent',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                  color: hBrowse ? '#FFFFFF' : '#340057', padding: '11px 22px', borderRadius: 999,
                }}
              >
                Explore experiences →
              </button>
            </div>
          )}
        </div>
        <div style={{ padding: '14px 18px 16px', borderTop: '1.5px solid #EBE2FF', flexShrink: 0, background: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Total</span>
            <span style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 26 }}>{money(app.booking.total)}</span>
          </div>
          <button
            {...bindCheckout}
            onClick={() => { app.closeDay(); goto.booking(); }}
            style={{
              width: '100%', marginTop: 10, border: 0, background: hCheckout ? '#D91E44' : '#FF3358',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: '#FFFFFF',
              padding: '15px 0', borderRadius: 999, boxShadow: '0 8px 20px rgba(255,51,88,.35)',
            }}
          >
            Check out →
          </button>
          <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 9, letterSpacing: '.06em', color: 'rgba(52,0,87,.55)', textAlign: 'center', marginTop: 9 }}>
            FREE TO BOOK · PAY ONLINE OR AT THE GATE
          </div>
        </div>
      </div>
    </>
  );
}
