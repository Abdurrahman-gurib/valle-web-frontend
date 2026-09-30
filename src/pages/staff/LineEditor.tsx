import { useState, type CSSProperties } from 'react';
import type { RateKey } from '../../types';
import { useCatalog } from '../../store/CatalogContext';
import { mur } from '../../lib/format';
import { Btn, inputStyle, mono } from './ui';

export interface EditableLine { id: string; variant?: string; adults: number; kids: number; units: number }

const sel: CSSProperties = { ...inputStyle, cursor: 'pointer', appearance: 'auto' };

/**
 * The experience lines of a booking, editable: pick an activity (and its
 * price-list option), count adults / kids or units, remove. Used when staff
 * take a booking and when they top up an existing one on the day.
 */
export function LineEditor({ lines, onChange, adults, kids, rate }: {
  lines: EditableLine[];
  onChange: (lines: EditableLine[]) => void;
  adults: number;
  kids: number;
  rate: RateKey;
}) {
  const catalog = useCatalog();
  const [pickAct, setPickAct] = useState('');
  const [pickVar, setPickVar] = useState('');
  const bookable = catalog.ACTS.filter((a) => a.mode === 'pp' || a.mode === 'flat');
  const act = bookable.find((a) => a.id === pickAct);
  const options = act ? (catalog.PL[act.id] || []) : [];

  const addLine = () => {
    if (!act) return;
    if (options.length > 0 && !pickVar) return;
    const variant = options.length > 0 ? pickVar : undefined;
    if (lines.some((l) => l.id === act.id && l.variant === variant)) return;
    onChange([...lines, act.mode === 'flat' ? { id: act.id, variant, adults: 0, kids: 0, units: 1 } : { id: act.id, variant, adults, kids, units: 0 }]);
    setPickVar('');
  };
  const bump = (i: number, f: 'adults' | 'kids' | 'units', d: number) =>
    onChange(lines.map((l, j) => (j === i ? { ...l, [f]: Math.max(0, Math.min(12, l[f] + d)) } : l)).filter((l) => l.adults + l.kids + l.units > 0));

  return (
    <div style={{ display: 'grid', gap: 8 }} data-testid="line-editor">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select aria-label="Experience" value={pickAct} onChange={(e) => { setPickAct(e.target.value); setPickVar(''); }} style={{ ...sel, flex: '1 1 180px' }}>
          <option value="">Add an experience…</option>
          {bookable.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {options.length > 0 && (
          <select aria-label="Option" value={pickVar} onChange={(e) => setPickVar(e.target.value)} style={{ ...sel, flex: '1 1 200px' }}>
            <option value="">Option…</option>
            {options.map((o) => <option key={o.n} value={o.n}>{o.n} · {mur(o[rate])}</option>)}
          </select>
        )}
        <Btn onClick={addLine} disabled={!act || (options.length > 0 && !pickVar)}>Add</Btn>
      </div>
      {lines.map((l, i) => {
        const a = catalog.ACTS.find((x) => x.id === l.id);
        const flat = a?.mode === 'flat';
        return (
          <div key={l.id + '::' + (l.variant || '')} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1.5px solid #EBE2FF', borderRadius: 12, padding: '8px 12px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 160px', minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{a?.name ?? l.id}</div>
              {l.variant && <div style={{ ...mono, fontSize: 10, color: 'rgba(52,0,87,.6)' }}>{l.variant}</div>}
            </div>
            {flat ? (
              <Counter label={a?.flatLabel || 'units'} value={l.units} onChange={(d) => bump(i, 'units', d)} />
            ) : (
              <>
                <Counter label="adults" value={l.adults} onChange={(d) => bump(i, 'adults', d)} />
                <Counter label="kids" value={l.kids} onChange={(d) => bump(i, 'kids', d)} />
              </>
            )}
            <button type="button" onClick={() => onChange(lines.filter((_, j) => j !== i))} aria-label="Remove" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#D91E44', fontSize: 16 }}>×</button>
          </div>
        );
      })}
    </div>
  );
}

function Counter({ label, value, onChange }: { label: string; value: number; onChange: (d: number) => void }) {
  const b: CSSProperties = { border: '1.5px solid #EBE2FF', background: '#FFFFFF', width: 26, height: 26, borderRadius: 999, cursor: 'pointer', fontWeight: 700 };
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ ...mono, fontSize: 9.5, letterSpacing: '.1em', color: 'rgba(52,0,87,.6)' }}>{label.toUpperCase()}</span>
      <button type="button" onClick={() => onChange(-1)} aria-label={`Fewer ${label}`} style={b}>−</button>
      <span style={{ ...mono, fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{value}</span>
      <button type="button" onClick={() => onChange(1)} aria-label={`More ${label}`} style={b}>+</button>
    </div>
  );
}
