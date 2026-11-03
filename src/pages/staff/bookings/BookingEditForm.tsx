import type { BookingDetailFull } from '../../../lib/staffApi';
import { cn } from '../../../lib/utils';
import { LineEditor, type EditableLine } from '../LineEditor';
import { Field, SectionLabel, inputStyle, textareaStyle } from '../ui';
import { linesToEditable, type Draft } from './draft';
import { Select, inputCls } from './shared';

const grid = 'grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3';

/** Typed setter for one draft field: `set('slot')('morning')`. */
export type SetDraft = <K extends keyof Draft>(k: K) => (v: Draft[K]) => void;

/** The drawer's Edit mode: every field the PATCH accepts, plus the experience lines. */
export function BookingEditForm({ data, form, set, fieldErr, editLines, onLinesChange }: {
  data: BookingDetailFull;
  form: Draft;
  set: SetDraft;
  fieldErr: Record<string, string>;
  /** null = the lines are untouched */
  editLines: EditableLine[] | null;
  onLinesChange: (lines: EditableLine[]) => void;
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
        <Field id="bk-adults" tag="ADULTS" hint={fieldErr.adults}>
          <input
            id="bk-adults" type="number" min={1} max={12} value={form.adults}
            onChange={(e) => set('adults')(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field id="bk-kids" tag="CHILDREN" hint={fieldErr.kids}>
          <input
            id="bk-kids" type="number" min={0} max={12} value={form.kids}
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
        lines={editLines ?? linesToEditable(data)}
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
