import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Btn, Field, card, inputStyle, label, mono, shortDate } from './ui';
import { createCoupon, listCoupons, setCouponActive, type CouponRow } from '../../lib/staffApi';

const sel: CSSProperties = { ...inputStyle, cursor: 'pointer', appearance: 'auto' };
const KIND_LABEL: Record<string, string> = { percent: '% off', amount: 'Rs off', foc: 'FOC (free of charge)', entry_free: 'Free park entry' };

/**
 * Offers: promo codes the guest types on the website, partner discounts,
 * FOC passes as codes. Staff create them here; the booking window can also
 * apply an FOC / discount by hand without a code.
 */
export default function CouponsPanel() {
  const [rows, setRows] = useState<CouponRow[] | null>(null);
  const [code, setCode] = useState('');
  const [kind, setKind] = useState<CouponRow['kind']>('percent');
  const [value, setValue] = useState('10');
  const [note, setNote] = useState('');
  const [validTo, setValidTo] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { listCoupons().then(setRows).catch(() => setRows([])); }, []);
  useEffect(load, [load]);

  const create = async () => {
    setErr('');
    setBusy(true);
    try {
      await createCoupon({
        code: code.trim(), kind, value: kind === 'percent' || kind === 'amount' ? Number(value) : undefined,
        note: note.trim() || undefined, validTo: validTo || undefined, maxUses: maxUses ? Number(maxUses) : undefined,
      });
      setCode(''); setNote(''); setValidTo(''); setMaxUses('');
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const describe = (c: CouponRow) => c.kind === 'percent' ? `${c.value}% off` : c.kind === 'amount' ? `Rs ${c.value.toLocaleString('en-US')} off` : KIND_LABEL[c.kind];

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ ...card, padding: 16 }}>
        <div style={label}>NEW CODE</div>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginTop: 10 }}>
          <Field id="cp-code" tag="CODE"><input id="cp-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="HOTEL10" style={{ ...inputStyle, ...mono, textTransform: 'uppercase' }} data-testid="coupon-code" /></Field>
          <Field id="cp-kind" tag="WHAT IT GIVES">
            <select id="cp-kind" value={kind} onChange={(e) => setKind(e.target.value as CouponRow['kind'])} style={sel}>
              <option value="percent">Percentage off</option>
              <option value="amount">Rupees off</option>
              <option value="entry_free">Free park entry</option>
              <option value="foc">FOC: everything free</option>
            </select>
          </Field>
          {(kind === 'percent' || kind === 'amount') && (
            <Field id="cp-value" tag={kind === 'percent' ? 'PERCENT' : 'RUPEES'}><input id="cp-value" type="number" min={1} value={value} onChange={(e) => setValue(e.target.value)} style={inputStyle} data-testid="coupon-value" /></Field>
          )}
          <Field id="cp-note" tag="SHOWN TO THE GUEST"><input id="cp-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Hotel partner offer" style={inputStyle} /></Field>
          <Field id="cp-to" tag="VALID UNTIL (OPTIONAL)"><input id="cp-to" type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} style={inputStyle} /></Field>
          <Field id="cp-max" tag="MAX USES (OPTIONAL)"><input id="cp-max" type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="unlimited" style={inputStyle} /></Field>
        </div>
        {err && <div role="alert" style={{ color: '#D91E44', fontWeight: 600, fontSize: 13, marginTop: 8 }}>{err}</div>}
        <div style={{ marginTop: 12 }}><Btn onClick={() => { void create(); }} disabled={busy || code.trim().length < 3} data-testid="coupon-create">Create code</Btn></div>
      </div>

      <div style={{ ...card, padding: 16 }}>
        <div style={label}>CODES</div>
        {rows === null && <div style={{ fontSize: 13, marginTop: 8 }}>Loading…</div>}
        {rows && rows.length === 0 && <div style={{ fontSize: 13, marginTop: 8 }}>No codes yet. Create one above; guests type it in the "Promo code" box when booking, or staff apply it in the booking window.</div>}
        {rows && rows.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead><tr style={{ ...mono, fontSize: 10, letterSpacing: '.1em', color: '#7333FF', textAlign: 'left' }}>
                <th style={{ padding: '6px' }}>CODE</th><th style={{ padding: '6px' }}>GIVES</th><th style={{ padding: '6px' }}>NOTE</th><th style={{ padding: '6px' }}>VALID</th><th style={{ padding: '6px' }}>USED</th><th style={{ padding: '6px' }}></th>
              </tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.code} style={{ borderTop: '1px solid #F1EAFF', opacity: c.active ? 1 : 0.55 }} data-testid="coupon-row">
                    <td style={{ padding: '8px 6px', ...mono, fontWeight: 700 }}>{c.code}</td>
                    <td style={{ padding: '8px 6px' }}>{describe(c)}</td>
                    <td style={{ padding: '8px 6px' }}>{c.note}</td>
                    <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>{c.validTo ? 'until ' + shortDate(c.validTo) : 'no end date'}</td>
                    <td style={{ padding: '8px 6px', ...mono }}>{c.uses}{c.maxUses ? ' / ' + c.maxUses : ''}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                      <Btn variant={c.active ? 'ghost' : 'dark'} onClick={() => { void setCouponActive(c.code, !c.active).then(load); }} style={{ padding: '6px 12px', fontSize: 12 }}>{c.active ? 'Switch off' : 'Switch on'}</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
