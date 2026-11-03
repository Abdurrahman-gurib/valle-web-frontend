import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useT } from '../../i18n';
import { FineLine, SectionHeader } from './shared';

export interface KnowItem { icon: LucideIcon; title: string; text: ReactNode; action?: ReactNode }

/** "Before you come": the practical notes of a class page as a card grid, closed by the VAT / terms line. */
export function GoodToKnow({ id, items, fine, eyebrow }: { id: string; items: KnowItem[]; fine?: string; eyebrow?: string }) {
  const t = useT();
  return (
    <section aria-labelledby={id} className="sr-section">
      <SectionHeader id={id} eyebrow={eyebrow ?? t('BEFORE YOU COME')} title={t('Good to know')} />
      <ul className="sr-know">
        {items.map(({ icon: Icon, title, text, action }) => (
          <li key={title}>
            <Icon aria-hidden strokeWidth={1.9} />
            <h3>{title}</h3>
            <p>{text}</p>
            {action}
          </li>
        ))}
      </ul>
      <FineLine text={fine} />
    </section>
  );
}
