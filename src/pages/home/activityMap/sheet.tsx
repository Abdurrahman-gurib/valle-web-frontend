import type { MapKeyItem } from '../../../data/maps';
import { useLang, useT } from '../../../i18n';

/** The sheet's key column, laid out like the walking-trail sitemap's "KEY / LÉGENDE". */
export function MapKey({ items, compact }: { items: MapKeyItem[]; compact: boolean }) {
  const t = useT();
  // The printed sheet is bilingual English | French. On the English page the key keeps
  // that look; in any other language the translated label stands alone (no mixed languages).
  const bilingual = useLang() === 'en';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(auto-fill, minmax(150px, 1fr))' : '1fr', gap: compact ? '6px 14px' : 10 }}>
      {items.map((k) => (
        <div key={k.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {k.icon ? (
            <img src={k.icon} alt="" style={{ width: compact ? 26 : 34, height: compact ? 26 : 34, objectFit: 'contain', flexShrink: 0, borderRadius: 4 }} />
          ) : k.dashed !== undefined ? (
            <span style={{ width: compact ? 26 : 34, borderTop: `3px ${k.dashed ? 'dashed' : 'solid'} ${k.swatch}`, flexShrink: 0 }} />
          ) : (
            <span style={{ width: 14, height: 14, borderRadius: 999, background: k.swatch, border: '2px solid #FFFFFF', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,.35)' }} />
          )}
          <span style={{ fontSize: compact ? 10.5 : 12, fontWeight: 600, color: '#FFFFFF', lineHeight: 1.2 }}>
            {t(k.label)}{bilingual && k.fr && <span lang="fr" style={{ opacity: 0.75, fontWeight: 400 }}> | {k.fr}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

const COMPASS_POINTS: [string, number, number, 'middle' | 'start' | 'end'][] = [['N', 50, 6, 'middle'], ['S', 50, 100, 'middle'], ['W', 2, 54, 'start'], ['E', 98, 54, 'end']];

export function Compass({ size }: { size: number }) {
  const t = useT();
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-label={t('Compass rose, north up')} style={{ display: 'block' }}>
      <circle cx="50" cy="50" r="46" fill="none" stroke="#FFFC33" strokeWidth="2.5" />
      <path d="M50 8 L58 50 L50 92 L42 50 Z" fill="#FFFC33" />
      <path d="M8 50 L50 42 L92 50 L50 58 Z" fill="#FFFC33" opacity="0.75" />
      <path d="M50 8 L58 50 L50 50 Z" fill="#340057" opacity="0.45" />
      {COMPASS_POINTS.map(([label, x, y, anchor]) => (
        <text key={label} x={x} y={y} textAnchor={anchor} fontSize="11" fontWeight="700" fill="#FFFC33" fontFamily="'Chivo Mono',monospace">{label}</text>
      ))}
    </svg>
  );
}
