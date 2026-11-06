import { useEffect, useState } from 'react';
import { getGroupPayment, saveGroupPayment } from '../../lib/staffApi';
import { errorMessage } from '../../lib/errors';
import { Btn, Spinner } from './ui';
import { Panel } from './reportUi';

/**
 * Group deposits (managers): the bank transfer details schools and groups see
 * on their confirmation and ticket when a deposit is due. Left empty, they are
 * told the team sends the details within one working day.
 */
export default function GroupPaymentPanel() {
  const [text, setText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    getGroupPayment()
      .then((d) => { setText(d.bankDetails); setLoaded(true); })
      .catch((e) => setErr(errorMessage(e, 'Could not load the deposit details.')));
  }, []);

  const save = async () => {
    setBusy(true); setErr(''); setSaved('');
    try {
      const d = await saveGroupPayment(text);
      setText(d.bankDetails);
      setSaved(d.bankDetails ? 'Saved. Schools and groups now see these details.' : 'Cleared. Groups are told the team sends the details.');
    } catch (e) {
      setErr(errorMessage(e, 'Could not save the deposit details.'));
    } finally { setBusy(false); }
  };

  return (
    <div data-testid="group-payment-panel" className="mt-[18px]">
      <Panel title="SCHOOL & GROUP DEPOSITS · HOW TO PAY" action={<Btn variant="dark" onClick={() => { void save(); }} disabled={busy || !loaded}>{busy ? <Spinner color="#FFFFFF" /> : 'Save details'}</Btn>}>
        <div className="p-[14px] grid gap-[10px]">
          {err && <div role="alert" className="text-[#D6173F] text-[13.5px]">{err}</div>}
          {saved && <div role="status" className="text-[#1E9E4A] text-[13.5px] font-semibold">{saved}</div>}
          {!loaded && !err && <Spinner />}
          {loaded && (
            <>
              <label htmlFor="group-bank-details" className="font-mono text-[10px] font-bold tracking-[.14em] text-valle-violet">BANK TRANSFER DETAILS · SHOWN ON THE GROUP CONFIRMATION AND TICKET</label>
              <textarea
                id="group-bank-details" data-testid="group-bank-details" value={text} onChange={(e) => setText(e.target.value)} rows={6} maxLength={1000}
                placeholder={'Bank: …\nAccount name: …\nAccount number: …\nIBAN / SWIFT: …\nReference: your booking reference'}
                className="w-full border-[1.5px] border-valle-lilac bg-[#F7F3FF] rounded-[12px] [font-family:inherit] text-[14.5px] text-valle-purple px-[14px] py-[11px] focus-visible:outline-2 focus-visible:outline-valle-violet"
              />
              <div className="text-[13px] text-[rgba(52,0,87,.65)]">
                Line breaks are kept. Leave empty and schools are told our team sends the payment details within one working day.
              </div>
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
