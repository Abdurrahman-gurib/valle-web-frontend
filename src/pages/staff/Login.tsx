import { useSeo } from '../../lib/seo';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStaffAuth } from '../../store/StaffAuth';
import { isHttpError, isTwoFactorPending, requestPasswordReset } from '../../lib/staffApi';
import { landingPathFor } from '../../lib/hrApi';
import { Stripes } from '../../components/Stripes';
import { cn } from '../../lib/utils';
import { Btn, Lockup, Spinner, displayCls, fieldLabelCls, inputCls, labelCls, monoCls } from './ui';

/** Focus ring in the site's violet, like the booking form's fields. */
function Field({ id, type, value, onChange, placeholder, autoComplete, disabled }: {
  id: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
  disabled: boolean;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      disabled={disabled}
      className={cn(inputCls, 'focus:border-valle-violet')}
    />
  );
}

type Mode = 'password' | 'code' | 'forgot' | 'forgot-sent';

function LinkBtn({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-semibold text-valle-violet underline underline-offset-2 hover:text-valle-purple focus-visible:outline-2 focus-visible:outline-valle-violet"
    >
      {children}
    </button>
  );
}

export default function StaffLogin() {
  useSeo({ title: 'Staff sign in · VALLÉ', description: 'Vallé back office.', noindex: true });
  const auth = useStaffAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Already holding a valid cookie? Skip the card and land on the area this
  // role is allowed into (hr -> /hr, everyone else -> /staff).
  useEffect(() => {
    if (!auth.loading && auth.user) navigate(landingPathFor(auth.user.role), { replace: true });
  }, [auth.loading, auth.user, navigate]);

  const go = (m: Mode) => { setMode(m); setError(''); setBusy(false); };

  const fail = (err: unknown, on401: string) => {
    if (isHttpError(err) && err.status === 401) setError(on401);
    else if (isHttpError(err) && err.status === 429) setError('Too many attempts. Wait a minute and try again.');
    else if (isHttpError(err) && err.status === 400) setError(err.message);
    else setError('Could not reach the server. Try again.');
    setBusy(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      if (mode === 'password') {
        const res = await auth.login(email.trim(), password);
        if (isTwoFactorPending(res)) {
          setPendingToken(res.pendingToken);
          setCode('');
          setPassword('');
          go('code');
          return;
        }
        navigate(landingPathFor(res.role), { replace: true });
      } else if (mode === 'code') {
        const user = await auth.completeTwoFactor(pendingToken, code.trim());
        navigate(landingPathFor(user.role), { replace: true });
      } else if (mode === 'forgot') {
        await requestPasswordReset(email.trim());
        go('forgot-sent');
      }
    } catch (err) {
      if (mode === 'code' && isHttpError(err) && err.status === 401 && /enter your password/i.test(err.message)) {
        go('password');
        setError('That sign-in took too long. Enter your password again.');
        return;
      }
      fail(err, mode === 'code' ? 'That code is not right. Try the newest one.' : 'Email or password is incorrect');
    }
  };

  const heading = mode === 'code' ? <>Two-step<br />check</> : mode === 'password' ? <>Park<br />back office</> : <>Reset<br />password</>;
  const intro = mode === 'code'
    ? 'Open your authenticator app and enter the 6-digit code for VALLÉ Staff. Lost your phone? Use one of your recovery codes instead.'
    : mode === 'forgot'
      ? 'Enter your work e-mail. If it belongs to a staff account, we send a link to choose a new password (valid 30 minutes).'
      : mode === 'forgot-sent'
        ? 'If that e-mail belongs to a staff account, a reset link is on its way. Check your inbox (and spam). The link works once, for 30 minutes.'
        : 'One sign-in for the park team: reservations, visitor chat and hiring. You land on the area your account covers.';

  return (
    <main className="flex min-h-screen items-center justify-center bg-valle-purple p-[clamp(16px,4vw,48px)] font-sans text-valle-purple">
      <div className="w-[min(420px,100%)] [animation:vfadeup_.35s_ease_both]">
        <div className="mb-[22px] flex justify-center">
          <Lockup color="#FFFFFF" size={38} />
        </div>

        <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_40px_90px_-25px_rgba(0,0,0,.6)]">
          <Stripes />
          <form onSubmit={submit} className="p-[clamp(22px,4vw,32px)]">
            <span className={labelCls}>STAFF ACCESS</span>
            <h1 className={cn(displayCls, 'mx-0 mt-[10px] mb-0 text-[length:clamp(28px,5vw,38px)] leading-[0.9]')}>
              {heading}
            </h1>
            <p className="mx-0 mt-[12px] mb-[22px] text-[14px] leading-[1.5] text-[rgba(52,0,87,.66)]" aria-live="polite">
              {intro}
            </p>

            {(mode === 'password' || mode === 'forgot') && (
              <>
                <label htmlFor="staff-email" className={fieldLabelCls}>EMAIL</label>
                <div className="mt-[6px]">
                  <Field id="staff-email" type="email" value={email} onChange={setEmail} placeholder="you@valle.mu" autoComplete="username" disabled={busy} />
                </div>
              </>
            )}

            {mode === 'password' && (
              <div className="mt-[14px]">
                <div className="flex items-baseline justify-between gap-[8px]">
                  <label htmlFor="staff-password" className={fieldLabelCls}>PASSWORD</label>
                  <LinkBtn onClick={() => go('forgot')}>Forgot password?</LinkBtn>
                </div>
                <div className="mt-[6px]">
                  <Field id="staff-password" type="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete="current-password" disabled={busy} />
                </div>
              </div>
            )}

            {mode === 'code' && (
              <>
                <label htmlFor="staff-code" className={fieldLabelCls}>CODE</label>
                <div className="mt-[6px]">
                  <Field id="staff-code" type="text" value={code} onChange={setCode} placeholder="123456" autoComplete="one-time-code" disabled={busy} />
                </div>
              </>
            )}

            {error && (
              <div
                role="alert"
                className="mt-[14px] rounded-[12px] border-[1.5px] border-[rgba(217,30,68,.35)] bg-[rgba(217,30,68,.1)] px-[14px] py-[10px] text-[13.5px] font-semibold text-[#D91E44] [animation:vfade_.2s_ease_both]"
              >
                {error}
              </div>
            )}

            {mode !== 'forgot-sent' && (
              <Btn type="submit" disabled={busy} className="mt-[18px] w-full px-0 py-[14px] text-[15px]">
                {busy ? <Spinner /> : mode === 'code' ? 'Verify →' : mode === 'forgot' ? 'Send reset link →' : 'Sign in →'}
              </Btn>
            )}

            {mode !== 'password' && (
              <div className="mt-[14px] text-center">
                <LinkBtn onClick={() => { setPendingToken(''); go('password'); }}>← Back to sign in</LinkBtn>
              </div>
            )}

            <div className={cn(monoCls, 'mt-[16px] text-center text-[10px] tracking-[.1em] text-[rgba(52,0,87,.45)]')}>
              INTERNAL USE ONLY · VALLÉ ADVENATURE™ PARK
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
