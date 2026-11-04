import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { BtnLabel, CardImage, ValleButton, ValleCard, valleButton } from '../../components/ui/valle';
import { useApp } from '../../store/AppStore';
import { paths, useGoto } from '../../lib/nav';
import { money, shortDateFromIso } from '../../lib/format';
import { dealSaving } from '../../lib/deals';
import type { Product, RateKey } from '../../types';
import { useT } from '../../i18n';
import { BLACK_ITALIC as BARLOW, MONO } from './shared';

/** Rotated h2 with its mono tag on the right, over a purple rule. */
function SectionHead({ id, title, tag, marginTop }: { id?: string; title: ReactNode; tag: string; marginTop: string }) {
  return (
    <div id={id} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', borderBottom: '2px solid #340057', paddingBottom: 28, marginTop }}>
      <h2 style={{ ...BARLOW, fontSize: 'clamp(30px,4.6vw,54px)', lineHeight: 0.85, margin: 0, textTransform: 'uppercase', transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>{title}</h2>
      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, letterSpacing: '.16em', color: 'rgba(52,0,87,.7)' }}>{tag}</span>
    </div>
  );
}

/** Photos that show each deal's headline activity (the catalog image is the fallback). */
const DEAL_PHOTOS: Record<string, { src: string; position: string }> = {
  'expo:go': { src: '/images/giant-swing/giant-swing-06.webp', position: 'center 30%' },
  'expo:plus': { src: '/images/zipline-waterfall.webp', position: '45% 40%' },
  'expo:pro': { src: '/images/zipline-new-4.webp', position: 'center 35%' },
  'expo:elite': { src: '/images/map/quad-duo-speed.webp', position: 'center 40%' },
};

const DEAL_ACCENTS = ['#33FF74', '#FFFC33', '#FF3358', '#7333FF'];

/** One expo deal, after the flyer: numbered contents, the struck "was" price, the deal price and what it saves. */
function DealCard({ deal, accent, rate, inDay, onBook, onSwitchRate }: { deal: Product; accent: string; rate: RateKey | null; inDay: boolean; onBook: () => void; onSwitchRate: () => void }) {
  const t = useT();
  const saving = dealSaving(deal);
  const visitor = rate === 'nr';
  const accentFg = accent === '#7333FF' ? '#FFFFFF' : '#340057';
  const photo = DEAL_PHOTOS[deal.key];
  const label = 'font-mono text-[9.5px] tracking-[.12em] text-valle-purple/70';
  const tag = 'rounded-full px-2.5 py-[5px] font-mono text-[9.5px] font-bold tracking-[.08em]';
  return (
    <ValleCard data-testid="deal-card" data-deal={deal.key}>
      <CardImage src={photo?.src ?? (deal.image || '/images/vip-ultimate-buggy-coloured-earth.avif')} position={photo?.position} alt={t('{name} package', { name: deal.name })} className="aspect-[16/9]">
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(31,0,51,.88)] via-[rgba(31,0,51,.25)] to-transparent" />
        {saving > 0 && (
          <span data-testid="deal-save" className="absolute top-3 left-3 -rotate-4 rounded-lg bg-valle-yellow px-3 py-[7px] font-mono text-[11px] font-bold tracking-[.08em] text-valle-purple shadow-[0_6px_16px_rgba(31,0,51,.35)]">
            {t('SAVE {amount}', { amount: money(saving) })}
          </span>
        )}
        <div className="absolute right-4 bottom-3 left-4 origin-bottom-left -rotate-3 font-display text-[clamp(28px,3.2vw,36px)] leading-[.9] font-black text-white uppercase italic">{deal.name}</div>
      </CardImage>
      <div className="h-[7px]" style={{ background: accent }} />
      <div className="flex flex-1 flex-col px-5 pt-4 pb-5">
        <div className="font-mono text-[10.5px] font-semibold tracking-[.14em] text-valle-purple/70">{t('WHAT IS INCLUDED')}</div>
        <ol className="m-0 mt-2 flex-1 list-none p-0">
          {(deal.contents ?? []).map((c, i) => (
            <li key={c} className="flex items-center gap-2.5 py-[5px] text-[14px] text-valle-purple/85" style={{ borderBottom: '1px dashed #EBE2FF' }}>
              <span aria-hidden className="flex size-[22px] shrink-0 items-center justify-center rounded-full font-mono text-[10.5px] font-bold" style={{ background: accent, color: accentFg }}>{i + 1}</span>
              <span>{c}</span>
            </li>
          ))}
        </ol>
        <div className="mt-3.5 flex items-end justify-between gap-3">
          {deal.was != null && (
            <div>
              <div className={label}>{t('WAS')}</div>
              <div data-testid="deal-was" className="mt-0.5 font-display text-[19px] font-black text-valle-purple/60 italic line-through decoration-valle-red decoration-2">
                <span className="sr-only">{t('Was')} </span>{money(deal.was)}
              </div>
            </div>
          )}
          <div className="text-end">
            <div className={label}>{t('DEAL · PER PERSON')}</div>
            <div data-testid="deal-price" className="mt-0.5 font-display text-[clamp(34px,3.6vw,42px)] leading-none font-black text-valle-purple italic">{money(deal.rr)}</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className={`${tag} bg-valle-purple text-valle-yellow`}>{t('RESIDENT RATE · ID REQUIRED')}</span>
          {deal.validFrom && deal.validTo && (
            <span className={`${tag} bg-[#F7F3FF] text-valle-purple`}>{t('VALID {from} – {to}', { from: shortDateFromIso(deal.validFrom).toUpperCase(), to: shortDateFromIso(deal.validTo).toUpperCase() })}</span>
          )}
        </div>
        {visitor ? (
          <div data-testid="deal-visitor" className="mt-3.5 rounded-xl bg-[#FFE2E7] px-3.5 py-3">
            <div className="text-[13px] leading-[1.45] font-semibold text-valle-purple">{t('This deal is for residents of Mauritius. You are browsing at the visitor rate.')}</div>
            <ValleButton variant="outline" size="sm" onClick={onSwitchRate} className="mt-2.5">{t('I am a resident: switch to the resident rate')}</ValleButton>
          </div>
        ) : (
          <ValleButton data-testid="deal-book" variant="primary" onClick={onBook} className="mt-4"><BtnLabel>{inDay ? t('In my day · continue to booking →') : t('Book this deal →')}</BtnLabel></ValleButton>
        )}
      </div>
    </ValleCard>
  );
}

/** /packages/deals: the expo deals on sale today, or a pointer to the resident packages once they end. */
export function DealsSection({ deals }: { deals: Product[] }) {
  const t = useT();
  const app = useApp();
  const goto = useGoto();
  const inDay = (d: Product) => !!app.sel['product:' + d.key];
  return (<>
    <SectionHead id="deals" title={t('Expo deals')} tag={t('RESIDENTS ONLY · PER PERSON')} marginTop="clamp(40px,6vw,64px)" />
    {deals.length > 0 ? (<>
      <div data-testid="deals-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,265px),1fr))', gap: 14, marginTop: 26 }}>
        {deals.map((d, i) => (
          <DealCard
            key={d.key}
            deal={d}
            accent={DEAL_ACCENTS[i % DEAL_ACCENTS.length]}
            rate={app.rate}
            inDay={inDay(d)}
            onBook={() => { if (!inDay(d)) app.toggleSel('product:' + d.key); goto.booking(); }}
            onSwitchRate={() => app.setRate('rr')}
          />
        ))}
      </div>
      <div data-testid="deals-notes" style={{ marginTop: 14, background: '#F7F3FF', borderRadius: 16, padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13.5, lineHeight: 1.55, color: '#340057' }}>{t('Resident rates apply upon presentation of a valid Mauritian National ID card, Residence Permit, Occupation Permit, Permanent Residence Permit, or valid work/dependent permit confirming residency in Mauritius.')}</div>
        <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, letterSpacing: '.08em', color: 'rgba(52,0,87,.8)' }}>{t('ALL PRICES ARE VAT INCLUSIVE · EXPO DEALS ARE NON REFUNDABLE · TERMS AND CONDITIONS APPLY')}</div>
      </div>
    </>) : (
      <div data-testid="deals-ended" style={{ marginTop: 26, background: '#F7F3FF', borderRadius: 16, padding: '22px 24px' }}>
        <div style={{ ...BARLOW, fontSize: 24, textTransform: 'uppercase' }}>{t('No deal on sale today')}</div>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'rgba(52,0,87,.75)', margin: '8px 0 14px' }}>{t('The expo deals are only bookable for visits inside their validity dates. The resident packages are available all year.')}</p>
        <Link to={paths.packageGroup('resident')} className={valleButton({ variant: 'primary', size: 'lg' })}><BtnLabel>{t('See the resident packages →')}</BtnLabel></Link>
      </div>
    )}
  </>);
}
