import { useFocusTrap } from '../hooks/useFocusTrap';
import { useLocation } from 'react-router-dom';
import { useApp } from '../store/AppStore';
import { useCatalog } from '../store/CatalogContext';
import { entryPrices } from '../store/booking';
import { mur } from '../lib/format';
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
      <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', color: '#5B21B6', marginTop: 12 }}>{cta}</div>
    </button>
  );
}

export function RateGate() {
  const app = useApp();
  const catalog = useCatalog();
  const rr = entryPrices(catalog, 'rr');
  const nr = entryPrices(catalog, 'nr');
  const t = useT();
  const { pathname } = useLocation();
  // A guest opening their ticket or waiver from the e-mail has already booked:
  // the first-visit rate question would only stand between them and the form.
  const skip = !app.rateGateDismissable && /^(\/(fr|de|it|ar|ru|es|hi))?\/(ticket|waiver)\//.test(pathname);
  const shown = app.rateGateOpen && !skip;
  // Modal: the page behind is inert. Escape closes it once a rate is already chosen (the
  // first visit has to pick one). Focus returns to the control that opened it, or, after
  // the first-visit choice, to the start of the page content.
  const trap = useFocusTrap(shown, {
    onEscape: app.rateGateDismissable ? app.closeRateGate : undefined,
    fallbackFocus: () => document.getElementById('main'),
  });
  if (!shown) return null;

  return (
    <div ref={trap} role="dialog" aria-modal="true" aria-labelledby="rate-gate-title" aria-describedby="rate-gate-desc" style={{
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
            <h2 id="rate-gate-title" tabIndex={-1} data-autofocus="" style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(28px,4.2vw,46px)', lineHeight: 0.86, margin: 0, textTransform: 'uppercase' }}>
              {t('Which rate')}<br />{t('applies to you?')}
            </h2>
          </div>
          <p id="rate-gate-desc" style={{ fontSize: 15, lineHeight: 1.55, color: 'rgba(52,0,87,.72)', margin: '14px 0 0' }}>
            {t('Mauritian residents pay a local rate. Pick yours and every price on the site updates instantly.')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 12, marginTop: 20 }}>
            <RateCard
              tag={t('RESIDENT RATE')}
              title={t('I live in Mauritius')}
              body={t('Resident rate · adults {adult} entry, kids {child}, under 6 free.', { adult: mur(rr.adult), child: mur(rr.child) })}
              cta={t('SHOW RESIDENT PRICES') + ' ' + fwd()}
              onClick={() => app.setRate('rr')}
            />
            <RateCard
              tag={t('VISITOR RATE')}
              title={t('I am visiting')}
              body={t('Visitor rate · adults {adult} entry, kids {child}, under 6 free.', { adult: mur(nr.adult), child: mur(nr.child) })}
              cta={t('SHOW VISITOR PRICES') + ' ' + fwd()}
              onClick={() => app.setRate('nr')}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 10, letterSpacing: '.08em', color: 'rgba(52,0,87,.7)' }}>
              {t('YOU CAN SWITCH ANY TIME FROM THE MENU')}
            </span>
            {app.rateGateDismissable ? (
              <button type="button" onClick={app.closeRateGate} className="vbtn vbtn-secondary vbtn-sm">
                {t('Keep {rate}', { rate: t(app.rateWord) })}
              </button>
            ) : (
              // a first visit can skip the question: visitor prices are the default
              <button type="button" onClick={() => app.setRate('nr')} data-testid="rate-browse" className="vbtn-link" style={{ textDecoration: 'underline', textUnderlineOffset: 4 }}>
                {t('Just browsing: show visitor prices')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
