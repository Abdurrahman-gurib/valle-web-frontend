import { Clock, MapPin, Ticket, Wallet } from 'lucide-react';
import { useRawCatalog } from '../../store/CatalogContext';
import { entryPrices } from '../../store/booking';
import { mur } from '../../lib/format';
import { paths } from '../../lib/nav';
import { useT } from '../../i18n';

const MAPS = 'https://www.google.com/maps/place/Vall%C3%A9+Advenature+Park+(formerly+La+Vall%C3%A9e+des+Couleurs)/@-20.457614,57.4826031,17z';

/** The one line of visit facts under the marquee: hours, entry at both rates (catalog), directions, pay on arrival. */
export function InfoStrip() {
  const t = useT();
  const raw = useRawCatalog();
  const nr = entryPrices(raw, 'nr').adult;
  const rr = entryPrices(raw, 'rr').adult;
  return (
    <section aria-label={t('Visit at a glance')} data-testid="home-info-strip" className="home-info">
      <ul>
        <li><Clock aria-hidden /><span>{t('Open daily 09:00 – 17:30')}</span></li>
        <li><Ticket aria-hidden /><span>{t('Entry from {nr} (visitor) / {rr} (resident)', { nr: mur(nr), rr: mur(rr) })}</span></li>
        <li><MapPin aria-hidden /><a href={MAPS} target="_blank" rel="noopener" style={{ color: '#5B21B6' }}>{t('Directions')}</a></li>
        <li><Wallet aria-hidden /><a href={paths.plan()} style={{ color: '#340057', textDecoration: 'none' }}>{t('Pay on arrival')}</a></li>
      </ul>
    </section>
  );
}
