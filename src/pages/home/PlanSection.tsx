import type { ReactNode } from 'react';
import { Img } from '../../components/Img';
import { useT } from '../../i18n';
import { usePlanFaq } from './faq';
import { Accordion } from '@/components/ui/accordion';
import { ValleIcon, type ValleIconName } from '@/components/ui/ValleIcon';

/** One tile of the visit facts: lilac tint with a 3px brand rule on top (one accent per tile). */
function InfoTile({ rule, tag, head, children, caps = true, icon }: { rule: string; tag: string; head: string; children: ReactNode; caps?: boolean; icon?: ValleIconName }) {
  return (
    <div className={"relative rounded-[20px] bg-valle-tint px-6 py-[22px]" + (icon ? " pe-16" : "")} style={{ borderTop: `3px solid ${rule}` }}>
      {icon && <ValleIcon name={icon} size={30} className="absolute end-5 top-[18px] text-valle-purple" />}
      <div className="font-mono text-[11px] font-bold tracking-[.12em] text-valle-purple/75">{tag}</div>
      <div className={'mt-2 font-display text-[26px] leading-none font-black italic ' + (caps ? 'uppercase' : '')}>{head}</div>
      <div className="mt-2 text-sm leading-[1.5] text-valle-purple/80">{children}</div>
    </div>
  );
}

/** "Plan your visit": hours, tickets, getting here, contact, plus the awards strip. */
export function PlanSection() {
  const t = useT();
  const faq = usePlanFaq();
  return (
    <section id="plan" data-screen-label="Plan your visit" className="mx-auto max-w-[1320px] px-[clamp(16px,3.5vw,40px)] pt-[clamp(56px,8vw,104px)]">
      <div className="mb-7 flex flex-wrap items-baseline justify-between gap-5 pb-7" style={{ borderBottom: '2px solid #340057' }}>
        <h2 className="m-0 origin-bottom-left -rotate-4 font-display text-[clamp(30px,4.6vw,64px)] leading-[0.85] font-black tracking-[-0.01em] uppercase italic">{t('Plan your visit')}</h2>
        <span className="font-mono text-xs font-semibold tracking-[.16em] text-valle-purple/70">{t('06 · GOOD TO KNOW')}</span>
      </div>
      <div data-reveal-kids="1" className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        <InfoTile rule="#340057" icon="events" tag={t('HOURS')} head="09:00–17:30">{t('Open every day of the week. Last activity departures around 16:00.')}</InfoTile>
        <InfoTile rule="#340057" tag={t('TICKETS')} head={t('Pay on arrival')}>{t('Book free online, no cancellation fee. Nature trails included with park entry.')}</InfoTile>
        <InfoTile rule="#340057" icon="meeting-point" tag={t('GETTING HERE')} head={t('Chamouny, South')}>
          B102, Mare Anguilles, Chamouny. <a href="https://www.google.com/maps/place/Vall%C3%A9+Advenature+Park+(formerly+La+Vall%C3%A9e+des+Couleurs)/@-20.457614,57.4826031,17z" target="_blank" rel="noopener">{t('Open in Google Maps →')}</a>
        </InfoTile>
        <InfoTile rule="#340057" tag={t('TALK TO US')} head="+230 660 4477" caps={false}>
          <a href="https://api.whatsapp.com/send/?phone=23052928841" target="_blank" rel="noopener">{t('WhatsApp us →')}</a> · sales@vallepark.com
        </InfoTile>
      </div>
      {/* the questions the desk hears most, answered from the park rules (21st.dev accordion) */}
      <div className="mt-12" data-testid="faq">
        <div className="mb-3 font-mono text-[11px] font-bold tracking-[.12em] text-valle-purple/70 uppercase">{t('Questions before you come')}</div>
        <Accordion defaultOpen={['pay']} items={faq.map((q) => ({ id: q.id, title: q.question, content: q.answer }))} />
        {/* parking, access and similar questions are answered by the team, not guessed on the page */}
        <p className="mt-5 mb-0 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[14px] bg-valle-tint px-5 py-4 text-[15px] text-valle-purple">
          <span className="font-semibold">{t('Practical questions? Parking, access, food or anything else:')}</span>
          <a href="tel:+2306604477" className="font-semibold" style={{ color: '#5B21B6' }}>{t('Call +230 660 4477')}</a>
          <span aria-hidden className="text-valle-purple/50">·</span>
          <a href="https://api.whatsapp.com/send/?phone=23052928841" target="_blank" rel="noopener" className="font-semibold" style={{ color: '#5B21B6' }}>{t('Chat with us on WhatsApp')}</a>
        </p>
      </div>
      <div className="mt-12 flex flex-wrap items-center gap-5 rounded-[20px] bg-valle-purple px-[26px] py-5">
        <Img src="/images/wlta-logo-160.webp" alt={t('World Luxury Travel Awards 2026 winner')} surface="dark" placeholder="transparent" width={160} height={160} style={{ height: 54, width: 'auto', aspectRatio: '1 / 1', objectFit: 'contain', flexShrink: 0 }} />
        <div className="min-w-[220px] flex-1 text-[15px] font-semibold text-white">{t('World Luxury Travel Awards 2026 winner, rated Excellent by visitors on TripAdvisor.')}</div>
        <a href="https://www.tripadvisor.com/Attraction_Review-g2359803-d1994858-Reviews-Valle_Advenature_Park-Chamouny.html" target="_blank" rel="noopener" className="vbtn vbtn-on-dark vbtn-sm" style={{ textDecoration: 'none' }}>{t('Read our reviews on TripAdvisor')} <span aria-hidden>↗</span></a>
      </div>
    </section>
  );
}
