import { Fwd } from '@/components/ui/arrows';
import type { CSSProperties, MouseEvent } from 'react';
import { useHover } from '../hooks/useHover';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Img } from './Img';
import { toEnglish, useT } from '../i18n';
import { ValleIcon, iconForInclusion } from '@/components/ui/ValleIcon';
import { useApp } from '../store/AppStore';
import { useGoto } from '../lib/nav';

const MONO = "'Chivo Mono',monospace";
const BARLOW: CSSProperties = { fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900 };

export interface PackModalData {
  /** Bookable product key: shows "Add to my day" instead of the WhatsApp reservation. */
  productKey?: string;
  name: string;
  badge?: string;
  color: string;
  fg?: string;
  img: string;
  hero?: string;
  note?: string;
  single: string;
  dbl: string;
  items: { t: string }[];
}

function CloseBtn({ onClose }: { onClose: () => void }) {
  const [h, bind] = useHover();
  const t = useT();
  return (
    <button
      {...bind}
      type="button"
      onClick={onClose}
      title={t('Close')}
      aria-label={t('Close')}
      style={{
        border: 0, background: h ? '#340057' : '#F7F3FF', cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 19, fontWeight: 700, color: h ? '#FFFFFF' : '#340057',
        width: 38, height: 38, borderRadius: 999, flexShrink: 0,
      }}
    >
      ×
    </button>
  );
}

function AddToDay({ productKey, onClose }: { productKey: string; onClose: () => void }) {
  const t = useT();
  const app = useApp();
  const goto = useGoto();
  const id = 'product:' + productKey;
  const inDay = !!app.sel[id];
  return (
    <button
      type="button"
      data-testid="pack-add"
      onClick={() => { if (!inDay) app.toggleSel(id); onClose(); goto.booking(); }}
      className="vbtn vbtn-primary vbtn-block"
      style={{ marginTop: 16 }}
    >
      {inDay ? t('In my day · book now') : t('Add to my day and book')} <Fwd />
    </button>
  );
}

function ReserveLink({ href }: { href: string }) {
  const t = useT();
  return (
    <a href={href} target="_blank" rel="noopener" className="vbtn vbtn-primary vbtn-block" style={{ marginTop: 14 }}>
      {t('Reserve this package')} <Fwd />
    </a>
  );
}

function PillLink({ href, title, label, blank }: { href: string; title: string; label: string; blank?: boolean }) {
  const [h, bind] = useHover();
  return (
    <a
      {...bind}
      href={href}
      title={title}
      {...(blank ? { target: '_blank', rel: 'noopener' } : undefined)}
      style={{
        flex: 1, textAlign: 'center',
        border: h ? '1.5px solid #340057' : '1.5px solid #EBE2FF',
        background: h ? '#F7F3FF' : undefined,
        color: '#340057', fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em',
        padding: '11px 0', borderRadius: 999,
      }}
    >
      {label}
    </a>
  );
}

export function PackageModal({ pack, onClose }: { pack: PackModalData | null; onClose: () => void }) {
  const t = useT();
  const trap = useFocusTrap(!!pack, { onEscape: onClose });
  if (!pack) return null;

  const whatsapp = 'https://api.whatsapp.com/send/?phone=23052928841&text='
    + encodeURIComponent('Hello Vallé, I would like to book the ' + pack.name + ' package ' + (pack.dbl ? '(single ' + pack.single + ' / double ' + pack.dbl + ')' : '(' + pack.single + ' per person)') + '.');
  const mailto = 'mailto:sales@vallepark.com?subject='
    + encodeURIComponent('Package reservation: ' + pack.name)
    + '&body='
    + encodeURIComponent('Hello Vallé,\n\nI would like to reserve the ' + pack.name + ' package ' + (pack.dbl ? '(single ' + pack.single + ' / double ' + pack.dbl + ')' : '(' + pack.single + ' per person)') + '.\n\nPreferred date:\nNumber of guests:\nName:\nPhone:\n');

  return (
    <div
      ref={trap}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(38,0,64,.55)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(12px,3vw,40px)', animation: 'vfade .25s ease both',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="package-modal-title"
        onClick={(e: MouseEvent) => e.stopPropagation()}
        style={{
          background: '#FFFFFF', borderRadius: 22, overflow: 'hidden', width: 'min(1000px,100%)',
          maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 40px 90px -20px rgba(0,0,0,.6)',
          display: 'flex', flexWrap: 'wrap', animation: 'vfadeup .3s ease both',
        }}
      >
        <div style={{ flex: 1.1, minWidth: 'min(100%,320px)', position: 'relative', minHeight: 280, background: '#EBE2FF' }}>
          <Img src={pack.img} alt={t('{name} package', { name: pack.name })} priority style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          {!!pack.badge && <span style={{
            // small text on the brand red uses its darker ink shade (contrast)
            position: 'absolute', top: 14, left: 14, background: pack.color.toUpperCase() === '#FF3358' ? '#D6173F' : pack.color, color: pack.fg || '#FFFFFF',
            fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
            borderRadius: 999, padding: '7px 12px', transform: 'rotate(-4deg)',
          }}
          >
            {pack.badge}
          </span>}
        </div>
        <div style={{ flex: 1.25, minWidth: 'min(100%,300px)', padding: 'clamp(20px,3vw,32px)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <h2 id="package-modal-title" tabIndex={-1} data-autofocus="" style={{ ...BARLOW, fontSize: 'clamp(28px,3.6vw,42px)', lineHeight: 0.9, textTransform: 'uppercase', margin: 0 }}>{pack.name}</h2>
            <CloseBtn onClose={onClose} />
          </div>
          {!!pack.hero && (
            <div style={{ fontSize: 14, fontWeight: 700, color: '#7333FF', marginTop: 6 }}>{pack.hero}</div>
          )}
          <div style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: '.14em', color: 'rgba(52,0,87,.7)', marginTop: 16 }}>{t('WHAT IS INCLUDED')}</div>
          <div style={{ marginTop: 6 }}>
            {pack.items.map((pi) => (
              <div key={pi.t} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '5px 0', fontSize: 14.5, color: 'rgba(52,0,87,.85)' }}>
                {(() => {
                  const icon = iconForInclusion(toEnglish(pi.t));
                  return icon
                    ? <ValleIcon name={icon} size={18} style={{ color: '#7333FF', marginTop: 1 }} />
                    : <span style={{ color: pack.color, fontWeight: 800, flexShrink: 0, width: 18, textAlign: 'center' }}>●</span>;
                })()}
                <span>{pi.t}</span>
              </div>
            ))}
          </div>
          {!!pack.note && (
            <div style={{ fontSize: 13, color: 'rgba(52,0,87,.6)', marginTop: 10 }}>{pack.note}</div>
          )}
          <div style={{ flex: 1, minHeight: 12 }} />
          <div style={{ display: 'flex', gap: 18, borderTop: '1px dashed #D9C9F0', paddingTop: 14, marginTop: 14 }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', color: 'rgba(52,0,87,.7)' }}>{t('SINGLE')}</div>
              <div style={{ ...BARLOW, fontSize: 26, marginTop: 2 }}>{pack.single}</div>
            </div>
            {/* only packages sold per couple have a double price */}
            {!!pack.dbl && (
              <div>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', color: 'rgba(52,0,87,.7)' }}>{t('DOUBLE')}</div>
                <div style={{ ...BARLOW, fontSize: 26, marginTop: 2 }}>{pack.dbl}</div>
              </div>
            )}
          </div>
          {pack.productKey ? <AddToDay productKey={pack.productKey} onClose={onClose} /> : <ReserveLink href={whatsapp} />}
          <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
            <PillLink href={whatsapp} title={t('Chat with a park host')} label={t('CHAT')} blank />
            <PillLink href={mailto} title={t('Email the reservations team')} label={t('EMAIL')} />
            <PillLink href="tel:+2306604477" title={t('Call the park')} label={t('CALL')} />
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(52,0,87,.5)', marginTop: 10, textAlign: 'center' }}>
            {t('REPLY WITHIN 1 WORKING DAY · VAT INCLUSIVE · T&C APPLY')}
          </div>
        </div>
      </div>
    </div>
  );
}
