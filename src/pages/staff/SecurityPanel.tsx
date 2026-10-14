import { useEffect, useState, type FormEvent } from 'react';
import {
  beginTwoFactorSetup, disableTwoFactor, enableTwoFactor, getTwoFactorStatus, regenerateRecoveryCodes,
  type TotpSetup, type TwoFactorStatus,
} from '../../lib/staffApi';
import { ValleButton } from '../../components/ui/valle';
import { Panel } from './reportUi';
import { Spinner, inputStyle, mono } from './ui';

const fieldLabel = { ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: 'rgba(52,0,87,.6)' } as const;

function CodeForm({ id, labelText, submitText, busy, onSubmit, variant = 'dark' }: {
  id: string; labelText: string; submitText: string; busy: boolean; onSubmit: (code: string) => void; variant?: 'dark' | 'primary' | 'outline';
}) {
  const [code, setCode] = useState('');
  const submit = (e: FormEvent) => { e.preventDefault(); if (code.trim()) onSubmit(code.trim()); };
  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-2.5">
      <div className="min-w-[180px] flex-1">
        <label htmlFor={id} style={fieldLabel}>{labelText}</label>
        <input id={id} inputMode="text" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={40} required style={{ ...inputStyle, marginTop: 6 }} />
      </div>
      <ValleButton type="submit" variant={variant} size="sm" disabled={busy} className="w-auto px-5">{busy ? <Spinner /> : submitText}</ValleButton>
    </form>
  );
}

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  return (
    <div className="mt-3 rounded-2xl bg-valle-lilac p-4">
      <p className="m-0 text-sm font-semibold">
        Your recovery codes. Each works once if you lose your phone. Store them somewhere safe now: they are not shown again.
      </p>
      <ul className="mt-3 grid list-none grid-cols-2 gap-2 p-0 font-mono text-[14px] sm:grid-cols-4" aria-label="Recovery codes">
        {codes.map((c) => <li key={c} className="rounded-lg bg-white px-2.5 py-1.5 text-center">{c}</li>)}
      </ul>
      <ValleButton size="sm" className="mt-3 w-auto px-5" onClick={onDone}>I have saved them</ValleButton>
    </div>
  );
}

/** The signed-in operator's own two-step login. */
export default function SecurityPanel() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const reload = () => getTwoFactorStatus().then(setStatus).catch((e: Error) => setError(e.message));
  useEffect(() => { void reload(); }, []);

  const run = async <T,>(fn: () => Promise<T>, then: (v: T) => void) => {
    setBusy(true); setError(''); setNote('');
    try { then(await fn()); } catch (e) { setError((e as Error).message || 'That did not work'); }
    finally { setBusy(false); }
  };

  return (
    <Panel title="TWO-STEP LOGIN">
      <div className="p-4 text-valle-purple">
        {!status ? (
          <div className="flex justify-center p-4"><Spinner color="#7333FF" /></div>
        ) : codes ? (
          <RecoveryCodes codes={codes} onDone={() => { setCodes(null); void reload(); }} />
        ) : status.enabled ? (
          <>
            <p className="m-0 text-sm leading-normal">
              <span className="font-bold text-[#0A8F3C]">On.</span> Signing in asks for a code from your authenticator app.
              {' '}{status.recoveryCodesLeft} recovery code{status.recoveryCodesLeft === 1 ? '' : 's'} left.
            </p>
            <CodeForm id="sec-regen" labelText="CURRENT CODE, TO MAKE NEW RECOVERY CODES" submitText="New recovery codes" busy={busy}
              onSubmit={(c) => void run(() => regenerateRecoveryCodes(c), (r) => setCodes(r.recoveryCodes))} />
            <CodeForm id="sec-off" labelText="CURRENT CODE, TO TURN IT OFF" submitText="Turn off" variant="outline" busy={busy}
              onSubmit={(c) => void run(() => disableTwoFactor(c), () => { setNote('Two-step login is off.'); void reload(); })} />
          </>
        ) : setup ? (
          <>
            <p className="m-0 text-sm leading-normal">
              Scan this with Google Authenticator, Microsoft Authenticator or 1Password, then type the 6-digit code it shows.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <img src={setup.qrDataUrl} alt="QR code to add VALLÉ Staff to your authenticator app" width={180} height={180} className="rounded-xl shadow-[0_0_0_1.5px_#EBE2FF]" />
              <div className="min-w-0 text-[13px]">
                <div style={fieldLabel}>OR ENTER THIS KEY</div>
                <code className="mt-1 block font-mono text-[13px] break-all select-all">{setup.secret.replace(/(.{4})/g, '$1 ').trim()}</code>
              </div>
            </div>
            <CodeForm id="sec-confirm" labelText="6-DIGIT CODE" submitText="Turn on" variant="primary" busy={busy}
              onSubmit={(c) => void run(() => enableTwoFactor(c), (r) => { setSetup(null); setCodes(r.recoveryCodes); })} />
          </>
        ) : (
          <>
            <p className="m-0 text-sm leading-normal">
              Off. Add a second step to your sign-in so a leaked password is not enough. Strongly recommended for managers.
            </p>
            <ValleButton variant="primary" size="sm" className="mt-3 w-auto px-5" disabled={busy}
              onClick={() => void run(beginTwoFactorSetup, setSetup)}>
              {busy ? <Spinner /> : 'Set up two-step login'}
            </ValleButton>
          </>
        )}
        {(error || note) && (
          <div role={error ? 'alert' : 'status'} className={`mt-3 text-[13.5px] font-semibold ${error ? 'text-[#D91E44]' : 'text-valle-purple'}`}>{error || note}</div>
        )}
      </div>
    </Panel>
  );
}
