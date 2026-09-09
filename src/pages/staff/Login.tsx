import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStaffAuth } from '../../store/StaffAuth';
import { isHttpError } from '../../lib/staffApi';
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

export default function StaffLogin() {
  const auth = useStaffAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Already holding a valid cookie? Skip the card and land on the area this
  // role is allowed into (hr -> /hr, everyone else -> /staff).
  useEffect(() => {
    if (!auth.loading && auth.user) navigate(landingPathFor(auth.user.role), { replace: true });
  }, [auth.loading, auth.user, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const user = await auth.login(email.trim(), password);
      navigate(landingPathFor(user.role), { replace: true });
    } catch (err) {
      if (isHttpError(err) && err.status === 401) {
        setError('Email or password is incorrect');
      } else if (isHttpError(err) && err.status === 429) {
        setError('Too many attempts. Wait a minute and try again.');
      } else {
        setError('Could not reach the server. Try again.');
      }
      setBusy(false);
    }
  };

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
              Park<br />back office
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(52,0,87,.66)', margin: '12px 0 22px' }}>
              One sign-in for the park team: reservations, visitor chat and hiring. You land on the
              area your account covers.
            </p>

            <label htmlFor="staff-email" style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: 'rgba(52,0,87,.6)' }}>
              EMAIL
            </label>
            <div style={{ marginTop: 6 }}>
              <Field
                id="staff-email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@valle.mu"
                autoComplete="username"
                disabled={busy}
              />
            </div>

            <div style={{ marginTop: 14 }}>
              <label htmlFor="staff-password" style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: 'rgba(52,0,87,.6)' }}>
                PASSWORD
              </label>
              <div style={{ marginTop: 6 }}>
                <Field
                  id="staff-password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={busy}
                />
              </div>
            </div>

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

            <Btn type="submit" disabled={busy} style={{ width: '100%', marginTop: 18, padding: '14px 0', fontSize: 15 }}>
              {busy ? <Spinner /> : 'Sign in →'}
            </Btn>

            <div style={{ ...mono, fontSize: 10, letterSpacing: '.1em', color: 'rgba(52,0,87,.45)', marginTop: 16, textAlign: 'center' }}>
              INTERNAL USE ONLY · VALLÉ ADVENATURE™ PARK
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
