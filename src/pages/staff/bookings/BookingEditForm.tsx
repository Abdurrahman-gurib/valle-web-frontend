import type { BookingDetailFull } from '../../../lib/staffApi';
import { cn } from '../../../lib/utils';
import { LineEditor, type EditableLine } from '../LineEditor';
import { Field, SectionLabel, inputStyle, textareaStyle } from '../ui';
import type { Draft } from './draft';
import { MAX_ADULTS, MAX_KIDS, type LineChange } from './partyLines';
import { Select, inputCls } from './shared';

/** The limit of one booking, said out loud rather than silently clamped. */
export function partyLimitHint(value: string, max: number, who: string): string | undefined {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= max) return undefined;
  return `At most ${max} ${who} per booking. For ${n}, make a group booking (Quotes / group form) or split it.`;
}

const grid = 'grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3';

/** Typed setter for one draft field: `set('slot')('morning')`. */
export type SetDraft = <K extends keyof Draft>(k: K) => (v: Draft[K]) => void;

/** The drawer's Edit mode: every field the PATCH accepts, plus the experience lines. */
export function BookingEditForm({ form, set, fieldErr, lines, onLinesChange, lineDiff }: {
  data: BookingDetailFull;
  form: Draft;
  set: SetDraft;
  fieldErr: Record<string, string>;
  /** the lines a save would send, already fitted to the party on screen */
  lines: EditableLine[];
  onLinesChange: (lines: EditableLine[]) => void;
  /** what the party change does to the lines, shown before saving */
  lineDiff: LineChange[];
}) {
  return (
    <div className="grid gap-3.5">
      <div className={grid}>
        <Field id="bk-date" tag="VISIT DATE" hint={fieldErr.visitDate}>
          <input
            id="bk-date" type="date" value={form.visitDate}
            onChange={(e) => set('visitDate')(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field id="bk-slot" tag="SLOT">
          <Select id="bk-slot" value={form.slot} onChange={set('slot')} width="100%">
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(118px,1fr))] gap-3">
        <Field id="bk-adults" tag={`ADULTS (MAX ${MAX_ADULTS})`} hint={partyLimitHint(form.adults, MAX_ADULTS, 'adults') ?? fieldErr.adults}>
          <input
            id="bk-adults" type="number" min={1} max={MAX_ADULTS} value={form.adults}
            onChange={(e) => set('adults')(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field id="bk-kids" tag={`CHILDREN (MAX ${MAX_KIDS})`} hint={partyLimitHint(form.kids, MAX_KIDS, 'children') ?? fieldErr.kids}>
          <input
            id="bk-kids" type="number" min={0} max={MAX_KIDS} value={form.kids}
            onChange={(e) => set('kids')(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field id="bk-rate" tag="RATE">
          <Select id="bk-rate" value={form.rate} onChange={set('rate')} width="100%">
            <option value="rr">RR · Resident</option>
            <option value="nr">NR · Visitor</option>
          </Select>
        </Field>
      </div>

      <div className="rounded-[12px] border-[1.5px] border-solid border-valle-lilac bg-[#F7F3FF] px-3 py-[9px] font-mono text-[10px] leading-[1.5] tracking-[.06em] text-valle-purple/60">
        CHANGING THE PARTY OR THE RATE RE-PRICES THE BOOKING ON THE SERVER.
      </div>
      {lineDiff.length > 0 && (
        <div data-testid="party-line-changes" role="status" className="rounded-[12px] border-[1.5px] border-solid border-[#FFD24D] bg-[#FFF4D6] px-3 py-2.5 text-[13px] leading-[1.5]">
          <strong>The new party changes these activities when you save:</strong>
          <ul className="m-0 mt-1 ps-5">
            {lineDiff.map((c) => (
              <li key={c.id + (c.variant ?? '')}>{c.id}{c.variant ? ` (${c.variant})` : ''}: {c.before} → {c.after ?? 'removed'}</li>
            ))}
          </ul>
          <span className="text-valle-purple/70">Adjust them below if that is not right.</span>
        </div>
      )}

      <Field id="bk-name" tag="GUEST NAME" hint={fieldErr.guestName}>
        <input id="bk-name" value={form.guestName} onChange={(e) => set('guestName')(e.target.value)} style={inputStyle} />
      </Field>

      <div className={grid}>
        <Field id="bk-phone" tag="PHONE" hint={fieldErr.phone}>
          <input id="bk-phone" value={form.phone} onChange={(e) => set('phone')(e.target.value)} style={inputStyle} />
        </Field>
        <Field id="bk-email" tag="EMAIL" hint={fieldErr.email}>
          <input id="bk-email" type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} style={inputStyle} />
        </Field>
      </div>

      <div className={grid}>
        <Field id="bk-nat" tag="NATIONALITY" hint={fieldErr.nationality}>
          <input id="bk-nat" value={form.nationality} onChange={(e) => set('nationality')(e.target.value)} style={inputStyle} />
        </Field>
        <Field id="bk-pay" tag="PAYMENT">
          <Select id="bk-pay" value={form.payMode} onChange={set('payMode')} width="100%">
            <option value="gate">At gate</option>
            <option value="online">Online</option>
          </Select>
        </Field>
        <Field id="bk-status" tag="STATUS">
          <Select id="bk-status" value={form.status} onChange={set('status')} width="100%">
            <option value="confirmed">Confirmed</option>
            <option value="arrived">Arrived</option>
            <option value="cancelled">Cancelled</option>
            <option value="postponed">Postponed (weather)</option>
          </Select>
        </Field>
      </div>

      <SectionLabel>EXPERIENCES · ADD A TOP-UP OR REMOVE</SectionLabel>
      <LineEditor
        lines={lines}
        onChange={onLinesChange}
        adults={Number(form.adults) || 1}
        kids={Number(form.kids) || 0}
        rate={form.rate || 'rr'}
      />

      <SectionLabel>FOC PASS · DISCOUNT · CODE</SectionLabel>
      <div className={grid}>
        <Field id="bk-adj" tag="ADJUSTMENT">
          <Select id="bk-adj" value={form.adjustmentKind} onChange={(v) => { set('adjustmentKind')(v); set('couponCode')(''); }} width="100%">
            <option value="none">None</option>
            <option value="percent">Percentage off</option>
            <option value="amount">Rupees off</option>
            <option value="entry_free">Free park entry</option>
            <option value="foc">FOC: everything free</option>
          </Select>
        </Field>
        {(form.adjustmentKind === 'percent' || form.adjustmentKind === 'amount') && (
          <Field id="bk-adjv" tag={form.adjustmentKind === 'percent' ? 'PERCENT' : 'RUPEES'}>
            <input id="bk-adjv" type="number" min={0} value={form.adjustmentValue} onChange={(e) => set('adjustmentValue')(e.target.value)} style={inputStyle} data-testid="adj-value" />
          </Field>
        )}
        <Field id="bk-adjn" tag="REASON / PASS NUMBER" hint="Shown on the receipt">
          <input id="bk-adjn" value={form.adjustmentNote} onChange={(e) => set('adjustmentNote')(e.target.value)} placeholder="FOC pass #12 · hotel partner" style={inputStyle} data-testid="adj-note" />
        </Field>
        <Field id="bk-coupon" tag="OR A CODE" hint="A code replaces the manual adjustment">
          <input id="bk-coupon" value={form.couponCode} onChange={(e) => set('couponCode')(e.target.value.toUpperCase())} placeholder="HOTEL10" className={cn(inputCls, 'font-mono uppercase')} data-testid="adj-coupon" />
        </Field>
      </div>

      <Field id="bk-note" tag="INTERNAL NOTE" hint={fieldErr.staffNote}>
        <textarea
          id="bk-note"
          value={form.staffNote}
          maxLength={2000}
          onChange={(e) => set('staffNote')(e.target.value)}
          placeholder="Visible to the team only, never to the guest."
          style={textareaStyle}
        />
      </Field>
    </div>
  );
}
