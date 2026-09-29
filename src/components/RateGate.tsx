import { useLocation } from 'react-router-dom';
import { useApp } from '../store/AppStore';
import { Stripes } from './Stripes';
import { useHover } from '../hooks/useHover';
import { useT, fwd } from '../i18n';

function RateCard({ tag, title, body, cta, onClick }: {
  tag: string; title: string; body: string; cta: string; onClick: () => void;
}) {
  const [h, bind] = useHover();
  return (
    <button
      {...bind}
      onClick={onClick}
      style={{
        textAlign: 'left', border: `2px solid ${h ? '#340057' : '#EBE2FF'}`, background: '#F7F3FF',
        cursor: 'pointer', fontFamily: 'inherit', borderRadius: 18, padding: '18px 20px',
        transition: 'transform .2s ease, border-color .2s ease',
        transform: h ? 'translateY(-3px)' : 'none',
      }}
    >
      <span style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color: '#7333FF' }}>{tag}</span>
      <div style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 26, textTransform: 'uppercase', color: '#340057', marginTop: 6 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: 'rgba(52,0,87,.7)', marginTop: 6, lineHeight: 1.45 }}>{body}</div>
      <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', color: '#FF3358', marginTop: 12 }}>{cta}</div>
    </button>
  );
}

export function RateGate() {
  const app = useApp();
  const t = useT();
  const [hKeep, bindKeep] = useHover();
  const { pathname } = useLocation();
  if (!app.rateGateOpen) return null;
  // A guest opening their ticket or waiver from the e-mail has already booked:
  // the first-visit rate question would only stand between them and the form.
  if (!app.rateGateDismissable && /^(\/(fr|de|it|ar))?\/(ticket|waiver)\//.test(pathname)) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 130, background: 'rgba(38,0,64,.62)',
      backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(14px,3vw,40px)', animation: 'vfade .3s ease both',
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: 24, width: 'min(660px,100%)', maxHeight: '92vh',
        overflowY: 'auto', boxShadow: '0 40px 90px -20px rgba(0,0,0,.6)', animation: 'vfadeup .35s ease both',
      }}>
        <Stripes />
        <div style={{ padding: 'clamp(22px,3.4vw,34px)' }}>
          <span style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em', color: '#7333FF' }}>
            {t('WELCOME TO VALLÉ ADVENATURE™ PARK')}
          </span>
          <div style={{ transform: 'rotate(-3deg)', transformOrigin: 'left bottom', marginTop: 12 }}>
            <h2 style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(28px,4.2vw,46px)', lineHeight: 0.86, margin: 0, textTransform: 'uppercase' }}>
              {t('Which rate')}<br />{t('applies to you?')}
            </h2>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.55, color: 'rgba(52,0,87,.72)', margin: '14px 0 0' }}>
            {t('Mauritian residents pay a local rate. Pick yours and every price on the site updates instantly.')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 12, marginTop: 20 }}>
            <RateCard
              tag={t('RR · RESIDENT RATE')}
              title={t('I live in Mauritius')}
              body={t('Resident rate · adults Rs 400 entry, kids Rs 275, under 5 free.')}
              cta={t('SHOW RESIDENT PRICES') + ' ' + fwd()}
              onClick={() => app.setRate('rr')}
            />
            <RateCard
              tag={t('NR · NON-RESIDENT RATE')}
              title={t('I am visiting')}
              body={t('Visitor rate · adults Rs 550 entry, kids Rs 325, under 5 free.')}
              cta={t('SHOW VISITOR PRICES') + ' ' + fwd()}
              onClick={() => app.setRate('nr')}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 10, letterSpacing: '.08em', color: 'rgba(52,0,87,.55)' }}>
              {t('YOU CAN SWITCH ANY TIME FROM THE MENU')}
            </span>
            {app.rateGateDismissable && (
              <button
                {...bindKeep}
                onClick={app.closeRateGate}
                style={{
                  border: '1.5px solid #340057', background: hKeep ? '#340057' : 'transparent',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
                  color: hKeep ? '#FFFFFF' : '#340057', padding: '10px 20px', borderRadius: 999,
                }}
              >
                {t('Keep {rate}', { rate: t(app.rateWord) })}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
