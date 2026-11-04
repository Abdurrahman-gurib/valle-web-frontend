import { useApp } from '../store/AppStore';
import { money } from '../lib/format';
import { useT } from '../i18n';

/**
 * The Explorer Pass, live: the same rule as the price (three different adventure
 * activities in the day take 15% off them). Two in the day: what one more would save;
 * three or more: what it saves now. Nothing below two.
 */
export function ExplorerPassNote({ compact }: { compact?: boolean }) {
  const t = useT();
  const { booking } = useApp();
  const on = booking.hasDiscount;
  if (!on && booking.advCount !== 2) return null;
  const text = on
    ? t('Explorer Pass on: you save {amount}', { amount: money(booking.discount) })
    : t('Add 1 more adventure and save 15% (at least {amount})', { amount: money(Math.round(booking.advSubtotal * 0.15)) });
  return (
    <div role="status" data-testid="explorer-pass" data-on={on || undefined} style={{
      background: on ? '#E2FFEB' : '#FFFFE2', color: '#340057', borderRadius: 14, fontWeight: 600,
      padding: compact ? '10px 14px' : '13px 18px', fontSize: compact ? 13.5 : 14,
      boxShadow: on ? 'inset 0 0 0 1.5px #33FF74' : 'inset 0 0 0 1.5px #EDE85A',
    }}>
      {on ? '✓ ' : ''}{text}
    </div>
  );
}
