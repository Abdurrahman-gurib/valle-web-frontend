import type { ReactNode } from 'react';
import { Img } from '../../components/Img';
import type { HeroPhoto } from './ClassHero';

/**
 * The supporting section of a class page (the lunch menu, the school booking
 * steps, the swing...): a photo (or a brand block) half and a text half on the lilac panel.
 */
export function SupportPanel({ id, photo, aside, children, testId, reverse }: { id: string; photo?: HeroPhoto; aside?: ReactNode; children: ReactNode; testId?: string; reverse?: boolean }) {
  return (
    <section aria-labelledby={id} className={'sr-section sr-lunch' + (reverse ? ' pk-reverse' : '')} data-testid={testId}>
      {photo ? (
        <div className="sr-lunch-photo">
          <Img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: photo.position }} />
        </div>
      ) : <div className="pk-aside">{aside}</div>}
      <div className="sr-lunch-text">{children}</div>
    </section>
  );
}
