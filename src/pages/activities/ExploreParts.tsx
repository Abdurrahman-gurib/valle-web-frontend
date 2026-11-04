import { BtnLabel } from '@/components/ui/valle';
import { useApp } from '../../store/AppStore';
import { useCatalog } from '../../store/CatalogContext';
import { useGoto } from '../../lib/nav';
import { money } from '../../lib/format';
import { useHover } from '../../hooks/useHover';
import { _t, useT } from '../../i18n';
import { BARLOW, MONO } from './shared';

const PULSE_CHIPS = [
  { key: 'any', label: _t('Any') },
  { key: 'serene', label: _t('● Serene') },
  { key: 'moderate', label: _t('●●● Moderate') },
  { key: 'extreme', label: _t('●●●●● Extreme') },
];

/** A filter chip: filled purple when on, white with a lilac ring when off. */
function Chip({ label, onClick, on }: { label: string; onClick: () => void; on: boolean }) {
  const [h, bind] = useHover();
  return (
    <button
      {...bind}
      onClick={onClick}
      style={{
        border: `1.5px solid ${on ? '#340057' : '#EBE2FF'}`,
        background: on ? '#340057' : '#FFFFFF',
        color: on ? '#FFFFFF' : '#340057',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: '12.5px',
        fontWeight: 700,
        padding: '8px 15px',
        borderRadius: 999,
        transition: 'all .15s',
        ...(h ? { transform: 'translateY(-1px)' } : undefined),
      }}
    >
      {label}
    </button>
  );
}

/** The purple admission strip: entry prices at the current rate and the rate switch. */
export function AdmissionBar() {
  const t = useT();
  const app = useApp();
  const catalog = useCatalog();
  const [hRate, bindRate] = useHover();
  const rk = app.rate === 'nr' ? 'nr' : 'rr';
  const rows = (catalog.PL.admission || []).map((r) => ({ n: r.n, p: r[rk] ? money(r[rk]) : t('FREE') }));
  return (
    <div style={{ marginTop: 20, background: '#340057', borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ height: 8, background: 'repeating-linear-gradient(-45deg,#33FF74 0 12px,#340057 12px 24px)' }} />
      <div style={{ padding: '14px 20px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: '#FFFC33' }}>{t('ADMISSION FEE')} · {app.rateTag}</div>
          <div style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: '#FFFFFF', marginTop: 2 }}>{t('{rate} prices', { rate: app.rateWord })}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          {rows.map((ar) => (
            <span key={ar.n} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.1)', borderRadius: 10, padding: '8px 12px', fontSize: 13, color: 'rgba(255,255,255,.9)' }}>
              {t(ar.n)}
              <span dir="ltr" style={{ background: '#FFFC33', color: '#340057', fontFamily: MONO, fontWeight: 700, fontSize: 12, borderRadius: 5, padding: '3px 7px', whiteSpace: 'nowrap', unicodeBidi: 'isolate' }}>{ar.p}</span>
            </span>
          ))}
        </div>
        <button
          {...bindRate}
          onClick={app.openRateGate}
          style={{
            border: '1.5px solid rgba(255,255,255,.4)', background: 'transparent', cursor: 'pointer', fontFamily: MONO, fontSize: 11,
            fontWeight: 700, letterSpacing: '.1em', color: '#FFFFFF', padding: '10px 16px', borderRadius: 999,
            ...(hRate ? { background: '#FFFFFF', color: '#340057' } : undefined),
          }}
        >{t('CHANGE RATE ⇄')}</button>
      </div>
    </div>
  );
}

/** Pulse-level chips and the result count. */
export function PulseFilter({ value, onChange, resultCount }: { value: string; onChange: (v: string) => void; resultCount: string }) {
  const t = useT();
  return (
    <div style={{ margin: '22px 0 0', padding: '14px 0', borderBottom: '1px solid #EBE2FF' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: 'rgba(52,0,87,.7)', marginRight: 4 }}>{t('PULSE LEVEL')}</span>
        {PULSE_CHIPS.map((c) => <Chip key={c.key} label={t(c.label)} onClick={() => onChange(c.key)} on={value === c.key} />)}
        <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 12, color: 'rgba(52,0,87,.7)' }}>{resultCount}</span>
      </div>
    </div>
  );
}

export function NoResults({ onClear }: { onClear: () => void }) {
  const t = useT();
  return (
    <div style={{ textAlign: 'center', padding: '70px 20px', color: 'rgba(52,0,87,.6)' }}>
      <div style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: 28, color: '#340057', textTransform: 'uppercase' }}>{t('Nothing matches that')}</div>
      <div style={{ fontSize: 15, marginTop: 8 }}>{t('Try a different search, or clear the filters.')}</div>
      <button type="button" onClick={onClear} className="vbtn vbtn-secondary" style={{ marginTop: 18 }}>{t('Clear filters')}</button>
    </div>
  );
}

/** "Can't decide?" banner at the foot of the list, into the booking page. */
export function BuildYourDayCta() {
  const t = useT();
  const app = useApp();
  const goto = useGoto();
  const label = app.selCount > 0 ? t('Book My Day · {count}', { count: app.selCount }) : t('Start booking');
  return (
    <div style={{ marginTop: 'clamp(48px,6vw,72px)', background: '#340057', borderRadius: 20, padding: '26px 30px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 800, fontSize: 24, color: '#FFFFFF', textTransform: 'uppercase' }}>{t("Can't decide? Build your day as you go.")}</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.75)', marginTop: 5 }}>
          {t('Add experiences to My Day, then book them all in one step, pay on arrival.')}
        </div>
      </div>
      <button type="button" onClick={goto.booking} className="vbtn vbtn-on-dark"><BtnLabel>{label}</BtnLabel></button>
    </div>
  );
}
