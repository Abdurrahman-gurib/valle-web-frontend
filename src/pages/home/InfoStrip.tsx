import { useRawCatalog } from '../../store/CatalogContext';
import { entryPrices } from '../../store/booking';
import { mur } from '../../lib/format';
import { paths } from '../../lib/nav';
import { Fwd } from '@/components/ui/arrows';
import { useT } from '../../i18n';
import { ValleIcon } from '@/components/ui/ValleIcon';

const MAPS = 'https://www.google.com/maps/place/Vall%C3%A9+Advenature+Park+(formerly+La+Vall%C3%A9e+des+Couleurs)/@-20.457614,57.4826031,17z';

/** The visit facts under the marquee, as a purple brand band: hours, entry at both rates (catalog), directions, pay on arrival. */
export function InfoStrip() {
  const t = useT();
  const raw = useRawCatalog();
  const nr = entryPrices(raw, 'nr').adult;
  const rr = entryPrices(raw, 'rr').adult;
  // "Rs 550" never breaks across lines
  const price = (n: number) => mur(n).replace(' ', ' ');
  return (
    <section aria-label={t('Visit at a glance')} data-testid="home-info-strip" className="home-info">
      <ul>
        <li>
          <span className="home-info-k"><ValleIcon name="events" size={18} />{t('OPEN DAILY')}</span>
          <span className="home-info-v"><bdi dir="ltr">09:00 – 17:30</bdi></span>
        </li>
        <li>
          <span className="home-info-k">{t('PARK ENTRY')}</span>
          <span className="home-info-v">{t('{nr} visitor · {rr} resident', { nr: price(nr), rr: price(rr) })}</span>
        </li>
        <li>
          <span className="home-info-k"><ValleIcon name="meeting-point" size={18} />{t('FIND US')}</span>
          <a className="home-info-v home-info-link" href={MAPS} target="_blank" rel="noopener">{t('Directions')} <Fwd /></a>
        </li>
        <li>
          <span className="home-info-k">{t('PAY')}</span>
          <a className="home-info-v home-info-link" href={paths.plan()}>{t('On arrival')} <Fwd /></a>
        </li>
      </ul>
    </section>
  );
}
