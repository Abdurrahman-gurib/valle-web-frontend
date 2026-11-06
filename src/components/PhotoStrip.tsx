import { Img } from './Img';
import { cn } from '@/lib/utils';

export interface StripPhoto { src: string; alt: string; caption: string; position?: string }

/**
 * A titled row of captioned photos (team days, the people at work): equal 4:3
 * frames that wrap to two columns on a phone.
 */
export function PhotoStrip({ id, eyebrow, title, photos }: { id: string; eyebrow: string; title: string; photos: StripPhoto[] }) {
  return (
    <section aria-labelledby={id} className="mt-[clamp(40px,6vw,72px)]">
      <div className="font-mono text-[11px] font-bold tracking-[.14em] text-valle-violet uppercase">{eyebrow}</div>
      <h2 id={id} className="m-0 mt-2 origin-bottom-left -rotate-2 font-display text-[clamp(28px,3.6vw,46px)] leading-[.95] font-black uppercase italic text-valle-purple">{title}</h2>
      {/* full rows only: six photos run 2 / 3 / 6 across, four run 2 / 4 */}
      <ul className={cn('m-0 mt-6 grid list-none grid-cols-2 gap-[clamp(10px,1.6vw,18px)] p-0', photos.length % 3 === 0 ? 'md:grid-cols-3 xl:grid-cols-6' : 'md:grid-cols-4')}>
        {photos.map((p) => (
          <li key={p.src} className="m-0">
            <figure className="m-0">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[16px] bg-valle-lilac">
                <Img src={p.src} alt={p.alt} sizes="(max-width: 767px) 50vw, 25vw" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: p.position ?? 'center' }} />
              </div>
              <figcaption className="mt-2 font-mono text-[11px] font-bold tracking-[.1em] text-valle-purple/80 uppercase">{p.caption}</figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
