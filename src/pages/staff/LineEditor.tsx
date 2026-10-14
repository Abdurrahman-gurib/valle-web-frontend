import { useState, type CSSProperties } from 'react';
import type { RateKey } from '../../types';
import { useCatalog } from '../../store/CatalogContext';
import { mur } from '../../lib/format';
import { Btn, inputStyle } from './ui';

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
    <div className="grid gap-2" data-testid="line-editor">
      <div className="flex flex-wrap gap-2">
        <select aria-label="Experience" value={pickAct} onChange={(e) => { setPickAct(e.target.value); setPickVar(''); }} style={sel} className="flex-[1_1_180px]">
          <option value="">Add an experience…</option>
          {bookable.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {options.length > 0 && (
          <select aria-label="Option" value={pickVar} onChange={(e) => setPickVar(e.target.value)} style={sel} className="flex-[1_1_200px]">
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
          <div key={l.id + '::' + (l.variant || '')} className="flex flex-wrap items-center gap-2.5 rounded-[12px] border-[1.5px] border-solid border-valle-lilac px-3 py-2">
            <div className="min-w-0 flex-[1_1_160px]">
              <div className="text-[13.5px] font-bold">{a?.name ?? l.id}</div>
              {l.variant && <div className="font-mono text-[10px] text-valle-purple/60">{l.variant}</div>}
            </div>
            {flat ? (
              <Counter label={a?.flatLabel || 'units'} value={l.units} onChange={(d) => bump(i, 'units', d)} />
            ) : (
              <>
                <Counter label="adults" value={l.adults} onChange={(d) => bump(i, 'adults', d)} />
                <Counter label="kids" value={l.kids} onChange={(d) => bump(i, 'kids', d)} />
              </>
            )}
            <button type="button" onClick={() => onChange(lines.filter((_, j) => j !== i))} aria-label="Remove" className="cursor-pointer border-0 bg-transparent text-[16px] text-[#D91E44]">×</button>
          </div>
        );
      })}
    </div>
  );
}

const counterBtn = 'h-[26px] w-[26px] cursor-pointer rounded-full border-[1.5px] border-solid border-valle-lilac bg-white font-bold';

function Counter({ label, value, onChange }: { label: string; value: number; onChange: (d: number) => void }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="font-mono text-[9.5px] tracking-[.1em] text-valle-purple/60">{label.toUpperCase()}</span>
      <button type="button" onClick={() => onChange(-1)} aria-label={`Fewer ${label}`} className={counterBtn}>−</button>
      <span className="min-w-4 text-center font-mono font-bold">{value}</span>
      <button type="button" onClick={() => onChange(1)} aria-label={`More ${label}`} className={counterBtn}>+</button>
    </div>
  );
}
