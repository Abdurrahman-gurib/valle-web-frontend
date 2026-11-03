import { motion } from 'motion/react';
import { Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SelLine } from '../../types';
import { productAmount } from '../../types';
import { useApp } from '../../store/AppStore';
import { useCatalog } from '../../store/CatalogContext';
import { entryPrices } from '../../store/booking';
import { useGoto } from '../../lib/nav';
import type { CardModel } from '../../lib/card';
import { flatUnitName, money } from '../../lib/format';
import { useHover } from '../../hooks/useHover';
import { tr, useT } from '../../i18n';
import { MONO, StepLabel, Stepper } from './bookingUi';

/* 1 · TAP TO ADD EXPERIENCES: pick card */
export function BookCard({ m }: { m: CardModel }) {
  const on = m.selOn;
  return (
    <motion.div
      onClick={m.add}
      role="button"
      tabIndex={0}
      aria-pressed={on}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); m.add(); } }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className={cn('cursor-pointer overflow-hidden rounded-[14px] border-[1.5px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-valle-violet', on ? 'border-valle-violet bg-valle-violet/[.08]' : 'border-valle-lilac bg-white')}
    >
      <div className="relative h-[86px] bg-valle-lilac">
        <img src={m.img} alt={m.name} className="block size-full object-cover" />
        <span className={cn('absolute top-2 right-2 flex size-6 items-center justify-center rounded-full border-[1.5px] border-white', on ? 'bg-valle-green text-valle-purple' : 'bg-valle-purple/50 text-white')}>
          {on ? <Check size={13} strokeWidth={3} aria-hidden /> : <Plus size={13} strokeWidth={3} aria-hidden />}
        </span>
      </div>
      <div className="px-[11px] pt-[9px] pb-[11px]">
        <div className="text-[12.5px] leading-tight font-bold">{m.name}</div>
        <div className="mt-1 font-mono text-[9px] font-bold text-valle-purple/60">{m.priceLabel}</div>
      </div>
    </motion.div>
  );
}

const amountStyle = { fontFamily: MONO, fontWeight: 700, fontSize: '13px', minWidth: '84px', textAlign: 'right' } as const;
const noteStyle = { fontFamily: MONO, fontSize: '10px', color: 'rgba(52,0,87,.6)', marginTop: '3px' } as const;

/* 2 · YOUR DAY: one cart line */
function CartLine({ line }: { line: SelLine }) {
  const t = useT();
  const app = useApp();
  const goto = useGoto();
  const [hx, bindX] = useHover();
  const { act: a, qty: c, price, product: p } = line;
  const isFlat = a.mode === 'flat';
  const amt = p
    ? productAmount(p, app.rate, c.a || 0, c.k || 0, c.u || 0)
    : isFlat ? price * (c.u || 0) : price * (c.a || 0) + Math.round(price * 0.5) * (c.k || 0);
  const dbl = p ? (app.rate === 'nr' ? p.dblNr : p.dblRr) : null;
  const each = p
    ? p.mode === 'flat'
      ? money(price) + ' / ' + t('FILM')
      : p.mode === 'pair' && dbl != null
      ? t('{single} /PERSON · {double} /2 PERSONS', { single: money(price), double: money(dbl) })
      : t('{price} /PERSON', { price: money(price) })
    : isFlat
    ? money(price) + ' ' + tr(a.flatLabel || '').toUpperCase()
    : t('{adult} /ADULT · {child} /CHILD', { adult: money(price), child: money(Math.round(price * 0.5)) });
  const unitName = flatUnitName(a.flatLabel, t);
  const stepper = (tag: string, k: 'a' | 'k' | 'u') => (
    <Stepper tag={tag} val={c[k] || 0} inc={() => app.bumpSel(line.key, k, 1)} dec={() => app.bumpSel(line.key, k, -1)} boxBg="#F7F3FF" btnBg="#FFFFFF" />
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 18px', flexWrap: 'wrap', borderTop: '1px dashed #EBE2FF' }}>
      <div
        onClick={() => (p ? goto.packages() : goto.detail(a.id))}
        style={{ width: '52px', height: '52px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, cursor: 'pointer', background: '#EBE2FF' }}
      >
        <img src={a.img} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ flex: 1, minWidth: '130px' }}>
        <div style={{ fontWeight: 700, fontSize: '14.5px' }}>{a.name}</div>
        {line.variant && <div style={{ fontSize: '11.5px', color: '#7333FF', fontWeight: 600, marginTop: '2px' }}>{t(line.variant)}</div>}
        <div style={noteStyle}>{each}</div>
      </div>
      {isFlat ? stepper(unitName, 'u') : <>{stepper(t('ADULTS'), 'a')}{stepper(t('CHILD 6–11'), 'k')}</>}
      <div style={amountStyle}>{money(amt)}</div>
      <button
        onClick={() => app.toggleSel(a.id, line.variant)}
        title={t('Remove')}
        {...bindX}
        style={{
          border: '1.5px solid ' + (hx ? '#340057' : '#EBE2FF'), background: hx ? '#F4EEFF' : 'transparent',
          color: hx ? '#340057' : 'rgba(52,0,87,.7)', width: '28px', height: '28px', borderRadius: '999px',
          cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0,
        }}
      >×</button>
    </div>
  );
}

/** Start times of a timed session (key = activity|variant); full ones are shown but disabled. */
function SessionPicker({ line, options, picked, onPick }: { line: SelLine; options: [string, string][]; picked?: string; onPick: (tm: string) => void }) {
  const t = useT();
  return (
    <div data-testid={`session-picker-${line.act.id}`} style={{ padding: '0 18px 12px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ fontFamily: MONO, fontSize: '9.5px', fontWeight: 700, letterSpacing: '.1em', color: picked ? 'rgba(52,0,87,.6)' : '#D91E44' }}>{t('START TIME')}</span>
      {options.map(([tm, lv]) => {
        const on = picked === tm;
        const full = lv === 'full';
        return (
          <button
            key={tm}
            type="button"
            disabled={full}
            aria-pressed={on}
            onClick={() => onPick(tm)}
            style={{
              border: '1.5px solid ' + (on ? '#7333FF' : '#EBE2FF'), background: on ? '#7333FF' : full ? '#F7F3FF' : '#FFFFFF',
              color: on ? '#FFFFFF' : '#340057', opacity: full ? 0.5 : 1, cursor: full ? 'not-allowed' : 'pointer',
              fontFamily: MONO, fontWeight: 700, fontSize: '12px', padding: '6px 10px', borderRadius: '999px',
            }}
          >{tm}{full ? ' · ' + t('FULL') : lv === 'busy' ? ' · ' + t('FEW LEFT') : ''}</button>
        );
      })}
      {options.length === 0 && <span style={{ fontSize: '12.5px', color: '#D91E44', fontWeight: 600 }}>{t('No session for an afternoon arrival: choose the morning.')}</span>}
    </div>
  );
}

/** 2 · YOUR DAY: park entry, then one line per experience (with its session picker when it runs in sessions). */
export function CartStep({ times, setTime, hasSessions, timesFor }: {
  times: Record<string, string>;
  setTime: (lineKey: string, tm: string) => void;
  hasSessions: (id: string) => boolean;
  timesFor: (id: string) => [string, string][];
}) {
  const t = useT();
  const catalog = useCatalog();
  const { rate, adults, kids, setAdults, setKids, booking } = useApp();
  const cartActs = booking.selLines;
  const cartCountLabel = cartActs.length === 0
    ? t('PARK ENTRY')
    : (cartActs.length > 1 ? t('{n} EXPERIENCES + ENTRY', { n: cartActs.length }) : t('{n} EXPERIENCE + ENTRY', { n: cartActs.length }));
  const ep = entryPrices(catalog, rate);
  const entryNote = t('{adult} /ADULT (12+) · {child} /CHILD (6 TO 11) · UNDER 6 FREE', { adult: money(ep.adult), child: money(ep.child) });
  const entryIncludedNote = booking.entryIncludedBy === 'expo' ? t('INCLUDED WITH THE EXPO DEAL') : booking.entryIncludedBy ? t('INCLUDED WITH THE STUDENT RATE') : '';
  return (
    <div style={{ marginTop: '34px' }}>
      <StepLabel>{t('2 · YOUR DAY')} · {cartCountLabel}</StepLabel>
      <div style={{ background: '#FFFFFF', borderRadius: '18px', boxShadow: '0 0 0 1.5px #EBE2FF', marginTop: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', flexWrap: 'wrap', background: '#F7F3FF' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <div style={{ fontWeight: 700, fontSize: '14.5px' }}>{t('Park entry')}</div>
            <div data-testid="entry-note" style={noteStyle}>{entryIncludedNote || entryNote} · {t('ALL NATURE TRAILS INCLUDED')}</div>
          </div>
          <Stepper tag={t('ADULTS')} val={adults} inc={() => setAdults(adults + 1)} dec={() => setAdults(adults - 1)} boxBg="#FFFFFF" btnBg="#F7F3FF" />
          <Stepper tag={t('CHILD 6–11')} val={kids} inc={() => setKids(kids + 1)} dec={() => setKids(kids - 1)} boxBg="#FFFFFF" btnBg="#F7F3FF" />
          <div style={amountStyle}>{money(booking.entry)}</div>
        </div>
        {cartActs.map((l) => (
          <div key={l.key}>
            <CartLine line={l} />
            {hasSessions(l.act.id) && <SessionPicker line={l} options={timesFor(l.act.id)} picked={times[l.key]} onPick={(tm) => setTime(l.key, tm)} />}
          </div>
        ))}
        {cartActs.length === 0 && (
          <div style={{ padding: '15px 18px', borderTop: '1px dashed #EBE2FF', fontSize: '13.5px', color: 'rgba(52,0,87,.7)' }}>
            {t('No experiences yet. Tap the cards above to add them. All nature trails are already covered by your entry.')}
          </div>
        )}
      </div>
    </div>
  );
}
