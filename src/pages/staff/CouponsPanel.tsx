import { useCallback, useEffect, useState } from 'react';
import { Btn, Field, shortDate } from './ui';
import { createCoupon, listCoupons, setCouponActive, type CouponRow } from '../../lib/staffApi';

const CARD = 'bg-white border-[1.5px] border-valle-lilac rounded-[18px]';
const LABEL = 'font-mono text-[10px] font-bold tracking-[.14em] text-valle-violet';
const INPUT = 'w-full border-[1.5px] border-valle-lilac bg-[#F7F3FF] rounded-[12px] px-[14px] py-[11px] [font-family:inherit] text-[14.5px] outline-none text-valle-purple';
const SEL = INPUT + ' cursor-pointer appearance-auto';
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
    <div className="grid gap-[14px]">
      <div className={CARD + ' p-[16px]'}>
        <div className={LABEL}>NEW CODE</div>
        <div className="grid gap-[10px] grid-cols-[repeat(auto-fit,minmax(150px,1fr))] mt-[10px]">
          <Field id="cp-code" tag="CODE"><input id="cp-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="HOTEL10" className={INPUT.replace('[font-family:inherit]', 'font-mono') + ' uppercase'} data-testid="coupon-code" /></Field>
          <Field id="cp-kind" tag="WHAT IT GIVES">
            <select id="cp-kind" value={kind} onChange={(e) => setKind(e.target.value as CouponRow['kind'])} className={SEL}>
              <option value="percent">Percentage off</option>
              <option value="amount">Rupees off</option>
              <option value="entry_free">Free park entry</option>
              <option value="foc">FOC: everything free</option>
            </select>
          </Field>
          {(kind === 'percent' || kind === 'amount') && (
            <Field id="cp-value" tag={kind === 'percent' ? 'PERCENT' : 'RUPEES'}><input id="cp-value" type="number" min={1} value={value} onChange={(e) => setValue(e.target.value)} className={INPUT} data-testid="coupon-value" /></Field>
          )}
          <Field id="cp-note" tag="SHOWN TO THE GUEST"><input id="cp-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Hotel partner offer" className={INPUT} /></Field>
          <Field id="cp-to" tag="VALID UNTIL (OPTIONAL)"><input id="cp-to" type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} className={INPUT} /></Field>
          <Field id="cp-max" tag="MAX USES (OPTIONAL)"><input id="cp-max" type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="unlimited" className={INPUT} /></Field>
        </div>
        {err && <div role="alert" className="text-[#D91E44] font-semibold text-[13px] mt-[8px]">{err}</div>}
        <div className="mt-[12px]"><Btn onClick={() => { void create(); }} disabled={busy || code.trim().length < 3} data-testid="coupon-create">Create code</Btn></div>
      </div>

      <div className={CARD + ' p-[16px]'}>
        <div className={LABEL}>CODES</div>
        {rows === null && <div className="text-[13px] mt-[8px]">Loading…</div>}
        {rows && rows.length === 0 && <div className="text-[13px] mt-[8px]">No codes yet. Create one above; guests type it in the "Promo code" box when booking, or staff apply it in the booking window.</div>}
        {rows && rows.length > 0 && (
          <div className="overflow-x-auto mt-[8px]">
            <table className="w-full border-collapse text-[13.5px]">
              <thead><tr className="font-mono text-[10px] tracking-[.1em] text-valle-violet text-left">
                <th className="p-[6px]">CODE</th><th className="p-[6px]">GIVES</th><th className="p-[6px]">NOTE</th><th className="p-[6px]">VALID</th><th className="p-[6px]">USED</th><th className="p-[6px]"></th>
              </tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.code} className={c.active ? 'border-t border-[#F1EAFF] opacity-100' : 'border-t border-[#F1EAFF] opacity-[.55]'} data-testid="coupon-row">
                    <td className="px-[6px] py-[8px] font-mono font-bold">{c.code}</td>
                    <td className="px-[6px] py-[8px]">{describe(c)}</td>
                    <td className="px-[6px] py-[8px]">{c.note}</td>
                    <td className="px-[6px] py-[8px] whitespace-nowrap">{c.validTo ? 'until ' + shortDate(c.validTo) : 'no end date'}</td>
                    <td className="px-[6px] py-[8px] font-mono">{c.uses}{c.maxUses ? ' / ' + c.maxUses : ''}</td>
                    <td className="px-[6px] py-[8px] text-right">
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
