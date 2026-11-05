import { useFocusTrap } from '../hooks/useFocusTrap';
import { Fwd } from '@/components/ui/arrows';
import { useApp } from '../store/AppStore';
import { ExplorerPassNote } from './ExplorerPassNote';
import { useGoto } from '../lib/nav';
import { flatUnitName, money } from '../lib/format';
import { Img } from './Img';
import { useT } from '../i18n';
import type { SelLine } from '../types';

const qtyBtn = 'h-[24px] w-[24px] cursor-pointer rounded-[6px] border-0 bg-white p-0 text-[12px] leading-none font-bold text-valle-purple';

function Qty({ tag, val, dec, inc, what }: { tag: string; val: number; dec: () => void; inc: () => void; what: string }) {
  const t = useT();
  return (
    <span role="group" aria-label={what} className="inline-flex items-center gap-[3px] rounded-[8px] bg-[#F7F3FF] px-[5px] py-0.5">
      <span aria-hidden className="font-mono text-[10px] text-valle-purple/70">{tag}</span>
      <button type="button" onClick={dec} aria-label={t('Fewer: {what}', { what })} className={qtyBtn}>−</button>
      <span aria-live="polite" className="min-w-[14px] text-center text-[12.5px] font-bold">{val}</span>
      <button type="button" onClick={inc} aria-label={t('More: {what}', { what })} className={qtyBtn}>+</button>
    </span>
  );
}

function CartRow({ line }: { line: SelLine }) {
  const app = useApp();
  const goto = useGoto();
  const t = useT();
  const a = line.act;
  const c = line.qty;
  const isFlat = a.mode === 'flat';
  const price = line.price;
  const amt = isFlat
    ? price * (c.u || 0)
    : price * (c.a || 0) + Math.round(price * 0.5) * (c.k || 0);
  const unitName = flatUnitName(a.flatLabel, t);

  return (
    <div className="flex items-center gap-2.5 py-[11px]" style={{ borderBottom: '1px dashed #EBE2FF' }}>
      <button
        type="button"
        onClick={() => { app.closeDay(); goto.detail(a.id); }}
        aria-label={a.name}
        className="h-[46px] w-[46px] shrink-0 cursor-pointer overflow-hidden rounded-[10px] bg-valle-lilac p-0"
      >
        <Img src={a.img} alt="" sizes="160px" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-bold">{a.name}</div>
        {line.variant && <div className="truncate text-[10.5px] font-semibold text-valle-violet">{t(line.variant)}</div>}
        <div className="mt-[5px] flex flex-wrap items-center gap-[5px]">
          {!isFlat && (
            <>
              <Qty tag={t('AD')} what={a.name + ' · ' + t('Adults')} val={c.a || 0} dec={() => app.bumpSel(line.key, 'a', -1)} inc={() => app.bumpSel(line.key, 'a', 1)} />
              <Qty tag={t('CH')} what={a.name + ' · ' + t('Children')} val={c.k || 0} dec={() => app.bumpSel(line.key, 'k', -1)} inc={() => app.bumpSel(line.key, 'k', 1)} />
            </>
          )}
          {isFlat && (
            <Qty tag={unitName} what={a.name + ' · ' + unitName} val={c.u || 0} dec={() => app.bumpSel(line.key, 'u', -1)} inc={() => app.bumpSel(line.key, 'u', 1)} />
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-mono text-[11.5px] font-bold">{money(amt)}</span>
        <button
          onClick={() => app.toggleSel(a.id, line.variant)}
          title={t('Remove')}
          aria-label={t('Remove') + ': ' + a.name}
          className="h-[24px] w-[24px] cursor-pointer rounded-full border border-valle-lilac bg-transparent p-0 text-[12px] leading-none text-valle-purple/50 hover:border-valle-purple hover:text-valle-purple"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function MyDayDrawer() {
  const app = useApp();
  const goto = useGoto();
  const t = useT();

  const trap = useFocusTrap(app.dayOpen, { onEscape: app.closeDay });
  if (!app.dayOpen) return null;

  const cartActs = app.booking.selLines;
  const cartCountLabel =
    cartActs.length === 0
      ? t('PARK ENTRY')
      : cartActs.length > 1
        ? t('{n} ACTIVITIES + ENTRY', { n: cartActs.length })
        : t('{n} ACTIVITY + ENTRY', { n: cartActs.length });
  const entryAmt = money(app.booking.entry);

  return (
    <div ref={trap}>
      <div
        onClick={app.closeDay}
        className="fixed inset-0 z-[95] bg-[rgba(31,0,51,.55)] backdrop-blur-[3px]"
      />
      <div role="dialog" aria-modal="true" aria-labelledby="my-day-title" className="fixed top-0 right-0 bottom-0 z-[96] flex w-[min(100vw,400px)] flex-col bg-white shadow-[-24px_0_60px_rgba(31,0,51,.4)]">
        <div className="flex shrink-0 items-center gap-2.5 bg-valle-purple px-5 py-4 text-white">
          <h2 id="my-day-title" tabIndex={-1} data-autofocus="" className="m-0 flex-1 -rotate-2 font-display text-[22px] font-black uppercase italic">{t('My Day')}</h2>
          <span className="font-mono text-[10px] tracking-[.08em] text-white/70">{cartCountLabel}</span>
          <button
            onClick={app.closeDay}
            aria-label={t('Close')}
            className="h-10 w-10 cursor-pointer rounded-full border-[1.5px] border-white/40 bg-transparent p-0 text-[15px] leading-none text-white hover:bg-white/15"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-[18px] pt-1.5 pb-[14px]">
          <div className="flex flex-wrap items-center gap-2 py-3" style={{ borderBottom: '1px dashed #EBE2FF' }}>
            <div className="min-w-[110px] flex-1">
              <div className="text-[13.5px] font-bold">{t('Park entry')}</div>
              <div className="mt-0.5 font-mono text-[10px] text-valle-purple/75">{app.booking.entryIncludedBy === 'expo' ? t('INCLUDED WITH THE EXPO DEAL') + ' · ' : ''}{t('TRAILS INCLUDED')}</div>
            </div>
            <Qty tag={t('AD')} what={t('Park entry') + ' · ' + t('Adults')} val={app.adults} dec={() => app.setAdults(app.adults - 1)} inc={() => app.setAdults(app.adults + 1)} />
            <Qty tag={t('CH')} what={t('Park entry') + ' · ' + t('Children')} val={app.kids} dec={() => app.setKids(app.kids - 1)} inc={() => app.setKids(app.kids + 1)} />
            <span className="min-w-16 text-right font-mono text-[11.5px] font-bold">{entryAmt}</span>
          </div>
          {cartActs.map((l) => <CartRow key={l.key} line={l} />)}
          {cartActs.length === 0 && (
            <div className="px-2.5 py-7 text-center">
              <div className="font-display text-[19px] font-extrabold uppercase italic">{t('Nothing here yet')}</div>
              <div className="mt-1.5 text-[13px] leading-[1.5] text-valle-purple/60">{t('Tap + on any activity card to build your day.')}</div>
              <button
                onClick={() => { app.closeDay(); goto.explore('all'); }}
                type="button"
                className="vbtn vbtn-secondary vbtn-sm mt-[14px]"
              >
                {t('Explore activities')} <Fwd />
              </button>
            </div>
          )}
        </div>
        <div className="shrink-0 border-t-[1.5px] border-valle-lilac bg-white px-[18px] pt-[14px] pb-4">
          <div className="mb-3 empty:hidden"><ExplorerPassNote compact /></div>
          <div className="flex items-baseline justify-between">
            <span className="text-[14px] font-bold">{t('Total')}</span>
            <span aria-live="polite" aria-atomic="true" className="font-display text-[26px] font-black italic">{money(app.booking.total)}</span>
          </div>
          <button
            type="button"
            onClick={() => { app.closeDay(); goto.booking(); }}
            className="vbtn vbtn-primary vbtn-block mt-2.5"
          >
            {t('Check out')} <Fwd />
          </button>
          <div className="mt-[9px] text-center font-mono text-[10px] tracking-[.06em] text-valle-purple/70">
            {t('FREE TO BOOK · PAY AT THE GATE')}
          </div>
        </div>
      </div>
    </div>
  );
}
