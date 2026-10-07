import { useT } from '../i18n';
import { useCatalog } from '../store/CatalogContext';
import { useParkStatus } from './WeatherCard';

/**
 * The strip under the header when the desk has set the park to partly open
 * or closed, or left a notice. Silent on an ordinary open day.
 */
export function ParkStatusBanner() {
  const t = useT();
  const status = useParkStatus();
  const catalog = useCatalog();
  if (!status || (status.state === 'open' && !status.message)) return null;
  const names = status.pausedActivities.map((id) => catalog.ACTS.find((a) => a.id === id)?.name ?? id);
  const bg = status.state === 'closed' ? '#FF3358' : status.state === 'partial' ? '#FFFC33' : '#E2FFEB';
  const fg = status.state === 'closed' ? '#FFFFFF' : '#340057';
  return (
    <div role="status" data-testid="park-status-banner" data-state={status.state} style={{ background: bg, color: fg, padding: '10px clamp(16px,3.5vw,40px)', fontSize: 14, lineHeight: 1.5, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', textAlign: 'center' }}>
      <strong style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 11, letterSpacing: '.14em' }}>
        {status.state === 'closed' ? t('PARK CLOSED TODAY') : status.state === 'partial' ? t('PARTLY OPEN TODAY') : t('PARK NOTICE')}
      </strong>
      {names.length > 0 && <span>{t('Paused right now: {names}', { names: names.join(', ') })}</span>}
      {status.message && <span>{status.message}</span>}
    </div>
  );
}
