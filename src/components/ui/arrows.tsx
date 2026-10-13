import { ArrowLeft, ArrowRight } from 'lucide-react';
import { isRtl, useLang } from '@/i18n';

/**
 * Direction arrows as Lucide icons sized to the surrounding text. "Forward"
 * points right in left-to-right languages and left in Arabic; "Back" the
 * opposite. Decorative: the button or link text carries the meaning.
 */
const iconStyle = { width: '1.05em', height: '1.05em', display: 'inline-block', verticalAlign: '-0.15em', flexShrink: 0 } as const;

export function Fwd() {
  const Icon = isRtl(useLang()) ? ArrowLeft : ArrowRight;
  return <Icon aria-hidden strokeWidth={2.5} style={iconStyle} />;
}

export function Back() {
  const Icon = isRtl(useLang()) ? ArrowRight : ArrowLeft;
  return <Icon aria-hidden strokeWidth={2.5} style={iconStyle} />;
}
