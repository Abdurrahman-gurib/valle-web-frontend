import { Fwd } from '@/components/ui/arrows';
import { motion } from 'motion/react';
import { Check, Plus } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { BtnLabel, ValleButton, ValleCard } from '@/components/ui/valle';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { paths } from '../../lib/nav';
import { useApp } from '../../store/AppStore';
import type { CardModel } from '../../lib/card';
import { money } from '../../lib/format';
import { StripesSm } from '../../components/Stripes';
import { Img } from '../../components/Img';
import { showsDuration, type Activity, type Catalog } from '../../types';
import { useT } from '../../i18n';
import { KP, KP_CONFETTI, kpButton } from '../../components/KidsPark';
import { BARLOW, MONO, sectionLabel } from './shared';

/** Kids Park confetti strip or the brand stripes, at the top of a purple panel. */
function PanelTop({ kids, height }: { kids: boolean; height: number }) {
  return kids ? <div aria-hidden style={{ height: 18, ...KP_CONFETTI }} /> : <StripesSm height={height} />;
}

/** The activity's options at the current rate, each addable to My Day. */
export function DetailPricelist({ act, d, kids, catalog }: { act: Activity; d: CardModel; kids: boolean; catalog: Catalog }) {
  const t = useT();
  const app = useApp();
  const rk = app.rate === 'nr' ? 'nr' : 'rr';
  const pl = catalog.PL[act.id] || [];
  if (pl.length === 0) return null;
  // cheapest first at the rate shown (the zipline tours rank differently for residents and visitors);
  // lists of single/double pairs keep their sheet order so each pair stays together
  const paired = pl.some((r) => /single|double/i.test(r.n));
  const rows = paired ? pl : [...pl].sort((x, y) => x[rk] - y[rk]);
  const prices = rows.map((r) => ({ n: r.n, p: r[rk] ? money(r[rk]) : t('FREE') }));
  return (
    <div data-testid={kids ? 'kids-detail-pricelist' : undefined} style={{ marginTop: 26, background: kids ? KP.purple : '#7333FF', borderRadius: kids ? 24 : 18, overflow: 'hidden', boxShadow: '0 18px 40px -18px rgba(52,0,87,.5)' }}>
      <PanelTop kids={kids} height={10} />
      <div style={{ padding: '16px 20px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: BARLOW, fontStyle: kids ? 'normal' : 'italic', fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: kids ? KP.yellow : '#FFFC33' }}>{t('Pricelist')}</span>
          <button onClick={app.openRateGate} title={t('Change rate')} style={{ border: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', background: '#FFFC33', color: '#340057', borderRadius: 999, padding: '6px 11px' }}>{app.rateTag} ⇄</button>
        </div>
        <div style={{ marginTop: 10 }}>
          {prices.map((pr) => {
            const on = d.hasAdd && app.isSelected(act.id, pr.n);
            return (
              <div key={pr.n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px dashed rgba(255,255,255,.28)' }}>
                <span style={{ fontSize: 14, color: '#FFFFFF', fontWeight: 500, flex: 1 }}>{t(pr.n)}</span>
                <span style={{ background: kids ? KP.yellow : '#FFFC33', color: kids ? '#3A0A46' : '#340057', fontFamily: MONO, fontWeight: 700, fontSize: 12.5, borderRadius: kids ? 999 : 6, padding: kids ? '5px 11px' : '5px 9px', whiteSpace: 'nowrap' }}>{pr.p}</span>
                {d.hasAdd && (
                  <button
                    onClick={() => app.toggleSel(act.id, pr.n)}
                    title={on ? t('Remove from My Day') : t('Add this option to My Day')}
                    style={{ border: on ? 0 : '1.5px solid rgba(255,255,255,.55)', background: on ? '#33FF74' : 'transparent', color: on ? '#340057' : '#FFFFFF', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700, padding: '6px 10px', borderRadius: 999, whiteSpace: 'nowrap', minWidth: 68 }}
                  >{on ? t('✓ Added') : t('+ Add')}</button>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.08em', color: 'rgba(255,255,255,.65)', marginTop: 11 }}>{t('VAT INCLUSIVE · 1 JULY 2026 TO 30 JUNE 2027 · FREE TO BOOK · PAY AT THE GATE')}</div>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: '.14em', opacity: 0.6 }}>{label}</div>
      {children}
    </div>
  );
}
const factValue: CSSProperties = { fontWeight: 600, fontSize: 16, marginTop: 4 };

/** The sticky purple panel: duration, age, pulse, price and the booking buttons. */
export function DetailAside({ act, d, kids, paused, onBook }: { act: Activity; d: CardModel; kids: boolean; paused: boolean; onBook: () => void }) {
  const t = useT();
  return (
    <div style={{ background: kids ? KP.purple : '#340057', color: '#FFFFFF', borderRadius: kids ? 26 : 20, padding: '0 0 26px', position: 'sticky', top: 90, overflow: 'hidden' }}>
      <PanelTop kids={kids} height={8} />
      <div style={{ padding: '22px 26px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontFamily: MONO }}>
          {showsDuration(act.id) && <Fact label={t('DURATION')}><div style={factValue}>{act.dur}</div></Fact>}
          <Fact label={t('MIN AGE')}><div style={factValue}>{act.age}</div></Fact>
          <Fact label={t('PULSE')}>
            <div style={{ ...factValue, color: '#FFFC33' }}>{d.pulseName}</div>
            {paused && <div data-testid="activity-paused" style={{ marginTop: 6, display: 'inline-block', background: '#D6173F', color: '#FFFFFF', fontSize: 10, letterSpacing: '.14em', fontWeight: 700, padding: '4px 8px', borderRadius: 999 }}>{t('PAUSED TODAY · WEATHER')}</div>}
          </Fact>
          <Fact label={t('PRICE')}><div style={factValue}>{d.priceLabel}</div></Fact>
        </div>
        <div style={{ height: 1, background: 'rgba(255,255,255,.2)', margin: '20px 0' }} />
        {d.hasAdd && (
          <ValleButton onClick={() => d.add()} variant="ghost" className={cn(d.selOn && 'bg-valle-green/25 hover:bg-valle-green/35')}>{d.addLabel}</ValleButton>
        )}
        {kids
          ? <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={onBook} className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" style={{ ...kpButton('yellow'), width: '100%', marginTop: 12 }}>{t('Book this now →')}</motion.button>
          : <ValleButton variant="onDark" onClick={onBook} className="mt-2.5"><BtnLabel>{t('Book this now →')}</BtnLabel></ValleButton>}
        <div style={{ fontFamily: MONO, fontSize: 10.5, opacity: 0.65, textAlign: 'center', marginTop: 12 }}>{t('PAY ON ARRIVAL · NO CANCELLATION FEE')}</div>
      </div>
    </div>
  );
}

/** The two zipline reviews from TripAdvisor. */
export function ZiplineReviews() {
  const t = useT();
  const reviews: [bg: string, quote: string, by: string][] = [
    ['#FFFFE2', t('"Did I just zipline in and out of a waterfall? YES I DID! The instructors were fantastic, great way to spend my birthday."'), t('KATE O · TRIPADVISOR, MAY 2025')],
    ['#E2FFEB', t('"Magnificent views and ziplines that make the adrenaline rise! Staff professional and welcoming. To do and do again."'), t('ANNABELLE A · TRIPADVISOR, MAY 2025')],
  ];
  return (
    <>
      <div style={{ ...sectionLabel, marginTop: 30 }}>{t('WHAT VISITORS SAY')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, marginTop: 12 }}>
        {reviews.map(([bg, quote, by]) => (
          <div key={by} style={{ background: bg, borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ color: '#D6173F', letterSpacing: 2, fontSize: 13 }}>★★★★★</div>
            <div style={{ fontSize: 14.5, lineHeight: 1.55, marginTop: 8, color: 'rgba(52,0,87,.82)' }}>{quote}</div>
            <div style={{ fontFamily: MONO, fontSize: 11, marginTop: 10, color: 'rgba(52,0,87,.6)' }}>{by}</div>
          </div>
        ))}
      </div>
    </>
  );
}

/** "See also" pills to the pages a guest usually opens next. */
export function SeeAlso({ act, catName }: { act: Activity; catName: string }) {
  const t = useT();
  const links: [label: string, href: string][] = [
    [t('All {category} experiences', { category: catName.toLowerCase() }), paths.explore(act.cat)],
    [t('Packages & 2026 prices'), paths.packages()],
    [t('Book your day'), paths.booking()],
    [t('Plan your visit'), paths.plan()],
    [t('Lunch at Le Chamouzé'), paths.resto('chamouze')],
  ];
  return (
    <nav aria-label={t('Related pages')} style={{ marginTop: 'clamp(36px,5vw,56px)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ ...sectionLabel, fontSize: 11 }}>{t('SEE ALSO')}</span>
      {links.map(([label, href]) => (
        <Link key={href} to={href} style={{ border: '1.5px solid #EBE2FF', borderRadius: 999, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#340057', textDecoration: 'none', background: '#FFFFFF' }}>{label} <Fwd /></Link>
      ))}
    </nav>
  );
}

export function RelatedCard({ a }: { a: CardModel }) {
  return (
    <ValleCard onClick={a.open} className="cursor-pointer rounded-2xl" data-testid="related-card">
      <div className="relative h-[150px] bg-valle-lilac">
        <Img src={a.img} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {a.hasAdd && (
          <motion.button
            type="button"
            onClick={a.add}
            title={a.addLabel}
            aria-label={a.addLabel}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            className={cn('absolute top-2.5 right-2.5 flex size-8 cursor-pointer items-center justify-center rounded-full border-2 border-white p-0 shadow-[0_4px_10px_rgba(0,0,0,.3)]', a.selOn ? 'bg-valle-green text-valle-purple' : 'bg-valle-purple/50 text-white')}
          >{a.selOn ? <Check size={16} strokeWidth={3} aria-hidden /> : <Plus size={16} strokeWidth={3} aria-hidden />}</motion.button>
        )}
      </div>
      <div className="px-[15px] pt-[13px] pb-[15px]">
        <div className="font-display text-[17px] font-extrabold uppercase italic"><a href={paths.detail(a.id)} onClick={(e) => { e.preventDefault(); e.stopPropagation(); a.open(); }} style={{ color: 'inherit', textDecoration: 'none' }}>{a.name}</a></div>
        <div className="mt-1.5 flex justify-between font-mono text-[11px] text-valle-purple/60">
          <span>{showsDuration(a.id) ? a.dur : ''}</span>
          <span className="font-bold text-valle-purple">{a.priceLabel}</span>
        </div>
      </div>
    </ValleCard>
  );
}
