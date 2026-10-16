import { useState, type ReactNode } from 'react';
import { ParkMap } from './ParkMap';
import { Img } from '../../components/Img';
import { useT } from '../../i18n';
import { Accordion } from '@/components/ui/accordion';

function InfoTile({ bg, tag, head, children, caps = true }: { bg: string; tag: string; head: string; children: ReactNode; caps?: boolean }) {
  return (
    <div className="rounded-[18px] px-6 py-[22px]" style={{ background: bg }}>
      <div className="font-mono text-[10.5px] font-semibold tracking-[.14em] text-valle-purple/70">{tag}</div>
      <div className={'mt-2 font-display text-[27px] font-black italic ' + (caps ? 'uppercase' : '')}>{head}</div>
      <div className="mt-1.5 text-sm leading-normal text-valle-purple/70">{children}</div>
    </div>
  );
}

/** "Plan your visit": hours, tickets, getting here, contact, plus the awards strip. */
export function PlanSection() {
  const t = useT();
  const [map, setMap] = useState(false);
  return (
    <>
    <section id="plan" data-screen-label="Plan your visit" className="mx-auto max-w-[1320px] px-[clamp(16px,3.5vw,40px)] pt-[clamp(56px,8vw,104px)]">
      <div className="mb-7 flex flex-wrap items-baseline justify-between gap-5 pb-7" style={{ borderBottom: '2px solid #340057' }}>
        <h2 className="m-0 origin-bottom-left -rotate-4 font-display text-[clamp(30px,4.6vw,64px)] leading-[0.85] font-black tracking-[-0.01em] uppercase italic">{t('Plan your visit')}</h2>
        <span className="font-mono text-xs font-semibold tracking-[.16em] text-valle-purple/70">{t('06 · GOOD TO KNOW')}</span>
      </div>
      <div data-reveal-kids="1" className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        <InfoTile bg="#E2FFEB" tag={t('HOURS')} head="09:00–17:30">{t('Open every day of the week. Last activity departures around 16:00.')}</InfoTile>
        <InfoTile bg="#FFE2E7" tag={t('TICKETS')} head={t('Pay on arrival')}>{t('Book free online, no cancellation fee. Nature trails included with park entry.')}</InfoTile>
        <InfoTile bg="#FFFFE2" tag={t('GETTING HERE')} head={t('Chamouny, South')}>
          B102, Mare Anguilles, Chamouny. <a href="https://www.google.com/maps/place/Vall%C3%A9+Advenature+Park+(formerly+La+Vall%C3%A9e+des+Couleurs)/@-20.457614,57.4826031,17z" target="_blank" rel="noopener">{t('Open in Google Maps →')}</a>
        </InfoTile>
        <InfoTile bg="#EBE2FF" tag={t('TALK TO US')} head="+230 660 44 77" caps={false}>
          <a href="https://api.whatsapp.com/send/?phone=23052928841" target="_blank" rel="noopener">{t('WhatsApp us →')}</a> · sales@vallepark.com
        </InfoTile>
      </div>
      {/* the questions the desk hears most, answered from the park rules (21st.dev accordion) */}
      <div className="mt-4" data-testid="faq">
        <div className="mb-3 font-mono text-[10.5px] font-semibold tracking-[.14em] text-valle-purple/70 uppercase">{t('Questions before you come')}</div>
        <Accordion defaultOpen={['pay']} items={[
          { id: 'pay', title: t('Do I pay when I book?'), content: t('Book free online, no cancellation fee. Nature trails included with park entry.') },
          { id: 'kids', title: t('How much do children pay?'), content: t('Children aged 6 to 11 pay the child rate; under 6 enter free. The Explorer Pass discount applies automatically when three or more different adventure experiences are booked for the same day. Promo and partner codes are applied as shown on the booking page and cannot be combined with another code.') },
          { id: 'bring', title: t('What should I bring?'), content: t('Closed shoes, sunscreen, water and a change of clothes for the waterfalls. Ziplines, quad and buggy have age, height and weight limits, shown on each activity page.') },
          { id: 'waiver', title: t('Do I need to sign a waiver?'), content: t('Before ziplines, quad, buggy, luge and similar activities every participant, or a parent or guardian for a minor, signs the park’s safety waiver, online from the booking confirmation or at the gate. No signed waiver, no activity.') },
          { id: 'rain', title: t('What happens if it rains?'), content: t('Most activities run rain or shine. Ziplines pause in strong wind or storms; if the weather stops your day, we postpone it to another date, never lose it.') },
          { id: 'hours', title: t('When is the park open?'), content: '09:00–17:30 · ' + t('Open every day of the week. Last activity departures around 16:00.') },
        ]} />
      </div>
      <button
        type="button"
        onClick={() => setMap((m) => !m)}
        aria-expanded={map}
        aria-controls="park-map"
        data-testid="park-map-toggle"
        className="mt-4 w-full cursor-pointer rounded-[18px] border-[1.5px] border-solid border-valle-lilac bg-white px-6 py-4 text-start font-display text-[20px] font-black text-valle-purple uppercase italic hover:bg-valle-lilac/40"
      >
        {map ? t('Hide the park map') : t('See the park map')} <span aria-hidden>{map ? '▲' : '▼'}</span>
      </button>
      <div className="mt-4 flex flex-wrap items-center gap-5 rounded-[18px] bg-valle-purple px-[26px] py-5">
        <Img src="/images/wlta-logo-1.png" alt={t('World Luxury Travel Awards 2026 winner')} surface="dark" placeholder="transparent" width={614} height={614} style={{ height: 54, width: 'auto', aspectRatio: '1 / 1', objectFit: 'contain', flexShrink: 0 }} />
        <div className="min-w-[220px] flex-1 text-[15px] font-semibold text-white">{t('World Luxury Travel Awards 2026 winner, rated Excellent by visitors on TripAdvisor.')}</div>
        <a href="https://www.tripadvisor.com/Attraction_Review-g2359803-d1994858-Reviews-Valle_Advenature_Park-Chamouny.html" target="_blank" rel="noopener" className="font-mono text-[12.5px] font-semibold text-valle-yellow">{t('READ REVIEWS →')}</a>
      </div>
    </section>
    {map && <div id="park-map"><ParkMap /></div>}
    </>
  );
}
