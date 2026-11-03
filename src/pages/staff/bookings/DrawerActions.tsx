import { useState } from 'react';
import type { BookingStatus } from '../../../types';
import {
  postponeBooking, recordPayment, refundPayment,
  type BookingDetailFull, type BookingUpdated, type PaymentMethod,
} from '../../../lib/staffApi';
import { mur as money } from '../../../lib/format';
import { cn } from '../../../lib/utils';
import { Btn, Field, Spinner, inputStyle } from '../ui';
import { inputCls } from './shared';

/**
 * Runs one cashier action against the server. `busyAs` is the status whose
 * spinner shows meanwhile; `onDone` resets the form in the same render as the
 * success note.
 */
export type RunAction = (
  busyAs: BookingStatus, call: () => Promise<BookingUpdated>, done: string, fail: string, onDone: () => void,
) => Promise<void>;

/**
 * The drawer footer. Editing: Cancel / Save. Reading: Edit, take a payment,
 * refund, postpone for the weather, mark arrived and cancel (asked once). It
 * stays mounted across Edit so a half-filled payment form survives it.
 */
export function DrawerActions({ data, busy, editing, saving, onEdit, onCancelEdit, onSave, onStatus, onError, run }: {
  data: BookingDetailFull;
  busy: BookingStatus | null;
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onStatus: (status: BookingStatus) => Promise<void>;
  onError: (msg: string) => void;
  run: RunAction;
}) {
  const refCode = data.refCode;
  // 'Cancel booking' asks once before releasing the reservation
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payReceipt, setPayReceipt] = useState('');
  const [postponeOpen, setPostponeOpen] = useState(false);
  const [postponeReason, setPostponeReason] = useState('');
  const balance = data.balance ?? data.total;
  const paid = data.paidAmount ?? 0;
  const locked = busy !== null;

  const takePayment = () => {
    const amount = Math.round(Number(payAmount));
    if (!(amount > 0)) { onError('Enter the amount taken.'); return; }
    void run('arrived', () => recordPayment(refCode, { amount, method: payMethod, receiptNo: payReceipt.trim() || undefined }),
      `Payment of ${money(amount)} recorded.`, 'Could not record the payment.',
      () => { setPayOpen(false); setPayAmount(''); setPayReceipt(''); });
  };
  const refund = () => {
    const amount = Math.round(Number(refundAmount));
    if (!(amount > 0)) { onError('Enter the amount to refund.'); return; }
    void run('arrived', () => refundPayment(refCode, { amount, reason: refundReason.trim() || undefined }),
      `Refund of ${money(amount)} sent through the payment provider.`, 'Could not refund.',
      () => { setRefundOpen(false); setRefundAmount(''); setRefundReason(''); });
  };
  const postpone = () => {
    void run('postponed', () => postponeBooking(refCode, postponeReason.trim()),
      'Postponed. The payment stays on the booking; pick the new date with Edit when the guest calls.', 'Could not postpone.',
      () => { setPostponeOpen(false); setPostponeReason(''); });
  };

  if (editing) {
    return (
      <>
        <Btn variant="ghost" onClick={onCancelEdit} disabled={saving} style={{ flex: 1 }}>Cancel</Btn>
        <Btn onClick={onSave} disabled={saving} style={{ flex: 1.4 }}>
          {saving ? <Spinner /> : 'Save changes'}
        </Btn>
      </>
    );
  }

  return (
    <>
      {payOpen && (
        <div data-testid="pay-form" className="flex basis-full flex-wrap items-end gap-2 rounded-[14px] border-[1.5px] border-solid border-valle-lilac bg-[#F7F3FF] px-3 py-2.5">
          <Field id="pay-amt" tag="AMOUNT TAKEN (RS)"><input id="pay-amt" type="number" min={1} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className={cn(inputCls, 'w-[130px]')} data-testid="pay-amount" /></Field>
          <Field id="pay-how" tag="HOW">
            {/* the options are exactly the PaymentMethod values */}
            <select id="pay-how" value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)} className={cn(inputCls, 'w-[130px] cursor-pointer appearance-auto')}>
              <option value="cash">Cash</option><option value="card">Card</option><option value="juice">Juice</option><option value="online">Online</option><option value="other">Other</option>
            </select>
          </Field>
          <Field id="pay-rc" tag="TILL RECEIPT NO."><input id="pay-rc" value={payReceipt} onChange={(e) => setPayReceipt(e.target.value)} placeholder="optional" className={cn(inputCls, 'w-[140px]')} /></Field>
          <Btn onClick={takePayment} disabled={locked} data-testid="pay-confirm">Record</Btn>
          <Btn variant="ghost" onClick={() => setPayOpen(false)}>Close</Btn>
        </div>
      )}
      {postponeOpen && (
        <div data-testid="postpone-form" className="flex basis-full flex-wrap items-center gap-2 rounded-[14px] border-[1.5px] border-solid border-[#FFD24D] bg-[#FFF4D6] px-3 py-2.5">
          <span className="flex-[1_1_100%] text-[13px] font-semibold">Weather day: the visit is postponed, nothing is refunded, the guest picks a new date later (Edit → date + status Confirmed).</span>
          <input value={postponeReason} onChange={(e) => setPostponeReason(e.target.value)} placeholder="Reason, e.g. heavy rain, park closed 11:00" style={inputStyle} className="flex-[1_1_220px]" data-testid="postpone-reason" />
          <Btn variant="dark" onClick={postpone} disabled={locked} data-testid="postpone-confirm">Postpone</Btn>
          <Btn variant="ghost" onClick={() => setPostponeOpen(false)}>Close</Btn>
        </div>
      )}
      <Btn variant="dark" onClick={onEdit} disabled={locked} style={{ flex: 1 }}>Edit</Btn>
      {balance > 0 && data.status !== 'cancelled' && (
        <Btn variant="ghost" onClick={() => { setPayOpen((v) => !v); setPayAmount(String(balance)); }} disabled={locked} style={{ flex: 1 }} data-testid="pay-open">Record payment</Btn>
      )}
      {data.paymentMethod === 'online' && paid > 0 && (
        <Btn variant="ghost" onClick={() => { setRefundOpen((v) => !v); setRefundAmount(String(paid)); }} disabled={locked} style={{ flex: 1 }} data-testid="refund-open">Refund online payment</Btn>
      )}
      {refundOpen && (
        <div data-testid="refund-form" className="flex basis-full flex-wrap items-center gap-2.5 rounded-[14px] border-[1.5px] border-solid border-valle-red bg-[#FFF1F3] px-3.5 py-2.5">
          <span className="flex-[1_1_100%] text-[13.5px] font-bold">Send money back through the payment provider. Up to {money(paid)} on this booking.</span>
          <input value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} inputMode="numeric" placeholder="Amount (Rs)" aria-label="Refund amount" className={cn(inputCls, 'w-[130px]')} data-testid="refund-amount" />
          <input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="Reason (shown in the trail)" aria-label="Refund reason" style={inputStyle} className="flex-[1_1_200px]" data-testid="refund-reason" />
          <Btn variant="danger" onClick={refund} disabled={locked} data-testid="refund-submit">{busy === 'arrived' ? <Spinner color="#D91E44" /> : 'Refund'}</Btn>
          <Btn variant="ghost" onClick={() => setRefundOpen(false)}>Close</Btn>
        </div>
      )}
      {data.status !== 'cancelled' && data.status !== 'postponed' && (
        <Btn variant="ghost" onClick={() => setPostponeOpen((v) => !v)} disabled={locked} style={{ flex: 1 }} data-testid="postpone-open">Postpone (weather)</Btn>
      )}
      <Btn
        onClick={() => { void onStatus('arrived'); }}
        disabled={locked || data.status === 'arrived'}
        style={{ flex: 1 }}
      >
        {busy === 'arrived' ? <Spinner /> : 'Mark arrived'}
      </Btn>
      {confirmCancel ? (
        <div data-testid="cancel-confirm" className="flex basis-full flex-wrap items-center gap-2.5 rounded-[14px] border-[1.5px] border-solid border-valle-red bg-[#FFF1F3] px-3.5 py-2.5">
          <span className="flex-[1_1_200px] text-[13.5px] font-bold">Cancel booking {data.refCode}? The guest keeps their e-mail but the reservation is released.</span>
          <Btn variant="danger" onClick={() => { setConfirmCancel(false); void onStatus('cancelled'); }} disabled={locked}>
            {busy === 'cancelled' ? <Spinner color="#D91E44" /> : 'Yes, cancel booking'}
          </Btn>
          <Btn variant="ghost" onClick={() => setConfirmCancel(false)}>Keep it</Btn>
        </div>
      ) : (
        <Btn
          variant="danger"
          onClick={() => setConfirmCancel(true)}
          disabled={locked || data.status === 'cancelled'}
          style={{ flex: 1 }}
        >
          {busy === 'cancelled' ? <Spinner color="#D91E44" /> : 'Cancel booking'}
        </Btn>
      )}
    </>
  );
}
