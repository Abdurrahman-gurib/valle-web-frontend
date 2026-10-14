import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSeo } from '../../lib/seo';
import { isHttpError, resetPassword } from '../../lib/staffApi';
import { Stripes } from '../../components/Stripes';
import { cn } from '../../lib/utils';
import { Btn, Lockup, Spinner, displayCls, fieldLabelCls, inputCls, labelCls } from './ui';

const MIN = 10;

/** /staff/reset?token=… — the link from the reset e-mail. */
export default function StaffResetPassword() {
  useSeo({ title: 'Reset password · VALLÉ staff', description: 'Vallé back office.', noindex: true });
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (pw.length < MIN) { setError(`Use at least ${MIN} characters.`); return; }
    if (pw !== pw2) { setError('The two passwords do not match.'); return; }
    setError('');
    setBusy(true);
    try {
      await resetPassword(token, pw);
      setDone(true);
    } catch (err) {
      if (isHttpError(err) && err.status === 429) setError('Too many attempts. Wait a minute and try again.');
      else if (isHttpError(err)) setError(err.message || 'This reset link is invalid or has expired.');
      else setError('Could not reach the server. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-valle-purple font-sans text-valle-purple p-[clamp(16px,4vw,48px)]">
      <div className="w-full max-w-[420px]">
        <div className="mb-[22px] flex justify-center"><Lockup color="#FFFFFF" size={38} /></div>
        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_40px_90px_-25px_rgba(0,0,0,.6)]">
          <Stripes />
          <form onSubmit={submit} className="p-[clamp(22px,4vw,32px)]">
            <span className={labelCls}>STAFF ACCESS</span>
            <h1 className={cn(displayCls, 'mx-0 mt-[10px] mb-0 text-[length:clamp(28px,5vw,38px)] leading-[0.9]')}>
              New<br />password
            </h1>

            {!token ? (
              <p role="alert" className="mt-3 text-sm">This link is missing its token. Ask for a new one from the sign-in page.</p>
            ) : done ? (
              <p role="status" className="mt-3 text-sm leading-normal">
                Your password is changed and every other session was signed out. Sign in with the new password.
              </p>
            ) : (
              <>
                <p className="mt-3 mb-[22px] text-sm leading-normal text-valle-purple/65">
                  At least {MIN} characters. A short sentence you will remember works well.
                </p>
                <label htmlFor="reset-pw" className={fieldLabelCls}>NEW PASSWORD</label>
                <input id="reset-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} disabled={busy} minLength={MIN} required className={cn(inputCls, 'mt-[6px]')} />
                <div className="mt-3.5">
                  <label htmlFor="reset-pw2" className={fieldLabelCls}>REPEAT IT</label>
                  <input id="reset-pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} disabled={busy} minLength={MIN} required className={cn(inputCls, 'mt-[6px]')} />
                </div>
                {error && (
                  <div role="alert" className="mt-3.5 rounded-xl border-[1.5px] border-[rgba(217,30,68,.35)] bg-[rgba(217,30,68,.1)] px-3.5 py-2.5 text-[13.5px] font-semibold text-[#D91E44]">
                    {error}
                  </div>
                )}
                <Btn type="submit" disabled={busy} className="mt-[18px] w-full px-0 py-[14px] text-[15px]">
                  {busy ? <Spinner /> : 'Save password →'}
                </Btn>
              </>
            )}

            <div className="mt-4 text-center">
              <Link to="/staff/login" className="text-[13px] font-semibold text-valle-violet underline underline-offset-2">← Back to sign in</Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
