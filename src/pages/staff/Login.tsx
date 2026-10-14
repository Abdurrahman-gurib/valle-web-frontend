import { useSeo } from '../../lib/seo';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStaffAuth } from '../../store/StaffAuth';
import { isHttpError, isTwoFactorPending, requestPasswordReset } from '../../lib/staffApi';
import { landingPathFor } from '../../lib/hrApi';
import { Stripes } from '../../components/Stripes';
import { Btn, Lockup, Spinner, inputStyle, label, mono, display } from './ui';

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
  const [f, setF] = useState(false);
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setF(true)}
      onBlur={() => setF(false)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      disabled={disabled}
      style={{ ...inputStyle, ...(f ? { borderColor: '#7333FF' } : undefined) }}
    />
  );
}

type Mode = 'password' | 'code' | 'forgot' | 'forgot-sent';

const fieldLabel = { ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: 'rgba(52,0,87,.6)' } as const;

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
    <main style={{
      minHeight: '100vh', background: '#340057', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 'clamp(16px,4vw,48px)',
      fontFamily: "'Work Sans',sans-serif", color: '#340057',
    }}>
      <div style={{ width: 'min(420px,100%)', animation: 'vfadeup .35s ease both' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <Lockup color="#FFFFFF" size={38} />
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: 24, overflow: 'hidden', boxShadow: '0 40px 90px -25px rgba(0,0,0,.6)' }}>
          <Stripes />
          <form onSubmit={submit} style={{ padding: 'clamp(22px,4vw,32px)' }}>
            <span style={label}>STAFF ACCESS</span>
            <h1 style={{ ...display, fontSize: 'clamp(28px,5vw,38px)', lineHeight: 0.9, margin: '10px 0 0' }}>
              {heading}
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(52,0,87,.66)', margin: '12px 0 22px' }} aria-live="polite">
              {intro}
            </p>

            {(mode === 'password' || mode === 'forgot') && (
              <>
                <label htmlFor="staff-email" style={fieldLabel}>EMAIL</label>
                <div style={{ marginTop: 6 }}>
                  <Field id="staff-email" type="email" value={email} onChange={setEmail} placeholder="you@valle.mu" autoComplete="username" disabled={busy} />
                </div>
              </>
            )}

            {mode === 'password' && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <label htmlFor="staff-password" style={fieldLabel}>PASSWORD</label>
                  <LinkBtn onClick={() => go('forgot')}>Forgot password?</LinkBtn>
                </div>
                <div style={{ marginTop: 6 }}>
                  <Field id="staff-password" type="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete="current-password" disabled={busy} />
                </div>
              </div>
            )}

            {mode === 'code' && (
              <>
                <label htmlFor="staff-code" style={fieldLabel}>CODE</label>
                <div style={{ marginTop: 6 }}>
                  <Field id="staff-code" type="text" value={code} onChange={setCode} placeholder="123456" autoComplete="one-time-code" disabled={busy} />
                </div>
              </>
            )}

            {error && (
              <div
                role="alert"
                style={{
                  marginTop: 14, background: 'rgba(217,30,68,.1)', border: '1.5px solid rgba(217,30,68,.35)',
                  borderRadius: 12, padding: '10px 14px', fontSize: 13.5, fontWeight: 600, color: '#D91E44',
                  animation: 'vfade .2s ease both',
                }}
              >
                {error}
              </div>
            )}

            {mode !== 'forgot-sent' && (
              <Btn type="submit" disabled={busy} style={{ width: '100%', marginTop: 18, padding: '14px 0', fontSize: 15 }}>
                {busy ? <Spinner /> : mode === 'code' ? 'Verify →' : mode === 'forgot' ? 'Send reset link →' : 'Sign in →'}
              </Btn>
            )}

            {mode !== 'password' && (
              <div style={{ marginTop: 14, textAlign: 'center' }}>
                <LinkBtn onClick={() => { setPendingToken(''); go('password'); }}>← Back to sign in</LinkBtn>
              </div>
            )}

            <div style={{ ...mono, fontSize: 10, letterSpacing: '.1em', color: 'rgba(52,0,87,.45)', marginTop: 16, textAlign: 'center' }}>
              INTERNAL USE ONLY · VALLÉ ADVENATURE™ PARK
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
