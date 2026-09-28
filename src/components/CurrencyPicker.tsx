import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/AppStore';
import { CURRENCY_ORDER } from '../lib/fx';

const MONO = "'Chivo Mono',monospace";

/**
 * Header currency switch. Rupees are what the park charges; every other
 * currency is a Bank of Mauritius indicative conversion for guests who think
 * in euros, dollars, dirhams, riyals, rupees from India, and so on.
 */
export function CurrencyPicker({ fg, compact }: { fg: string; compact?: boolean }) {
  const app = useApp();
  const [open, setOpen] = useState(false);
  const [h, setH] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const rates = app.fx.rates;
  const codes = CURRENCY_ORDER.filter((c) => c in rates);

  return (
    <div ref={box} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setH(true)}
        onMouseLeave={() => setH(false)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Prices shown in ${rates[app.currency]?.name ?? app.currency}. Change currency`}
        data-testid="currency-picker"
        style={{
          border: `1.5px solid ${h || open ? '#7333FF' : 'rgba(115,51,255,.5)'}`,
          background: h || open ? '#7333FF' : 'transparent', cursor: 'pointer',
          fontFamily: MONO, fontSize: compact ? 10 : 11, fontWeight: 700, letterSpacing: compact ? '.06em' : '.1em',
          color: h || open ? '#FFFFFF' : fg, padding: compact ? '8px 9px' : '9px 12px', borderRadius: 999,
          whiteSpace: 'nowrap', lineHeight: 1,
        }}
      >
        {app.currency} ▾
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Currency"
          style={{
            position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 60, width: 250, maxHeight: '70vh', overflowY: 'auto',
            background: '#FFFFFF', color: '#340057', borderRadius: 16, boxShadow: '0 24px 60px -18px rgba(31,0,51,.55), 0 0 0 1.5px #EBE2FF',
            padding: 8, animation: 'vfadeup .2s ease both', fontFamily: "'Work Sans',sans-serif",
          }}
        >
          {codes.map((c) => {
            const on = c === app.currency;
            return (
              <button
                key={c}
                role="option"
                aria-selected={on}
                onClick={() => { app.setCurrency(c); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', border: 0, cursor: 'pointer',
                  background: on ? '#F1EBFF' : 'transparent', color: '#340057', borderRadius: 10, padding: '9px 10px', fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = '#F7F3FF'; }}
                onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.08em', width: 36 }}>{c}</span>
                <span style={{ fontSize: 13.5, flex: 1 }}>{rates[c].name}</span>
                <span style={{ fontFamily: MONO, fontSize: 10.5, opacity: 0.6 }}>{c === 'MUR' ? '' : rates[c].symbol}</span>
              </button>
            );
          })}
          <div style={{ fontFamily: MONO, fontSize: 9.5, lineHeight: 1.5, letterSpacing: '.04em', color: 'rgba(52,0,87,.55)', padding: '8px 10px 4px', borderTop: '1px dashed #EBE2FF', marginTop: 6 }}>
            YOU PAY IN RUPEES. OTHER CURRENCIES ARE INDICATIVE, BANK OF MAURITIUS RATES OF {app.fx.asOf.split('-').reverse().join('/')}.
          </div>
        </div>
      )}
    </div>
  );
}
