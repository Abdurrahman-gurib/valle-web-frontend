import { useCallback, useEffect, useRef, useState } from 'react';
import { Btn, card, display, inputStyle, label, mono, StatusChip, clockTime, shortDate } from './ui';
import { gateCheckIn, getGateDay, getGateView, isHttpError, type GateDayRow, type GateView } from '../../lib/staffApi';

const money = (n: number) => 'Rs ' + n.toLocaleString('en-US');

/** VAL-1234-26 from a scanned ticket / waiver URL, or from what the operator typed. */
export function refFromScan(text: string): string | null {
  const s = text.trim();
  const inUrl = s.match(/\/(?:ticket|waiver)\/([A-Za-z]{3}-\d{3,6}-\d{2})/);
  if (inUrl) return inUrl[1].toUpperCase();
  const bare = s.match(/^([A-Za-z]{3}-\d{3,6}-\d{2})$/);
  return bare ? bare[1].toUpperCase() : null;
}

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

/**
 * Camera QR scanner. Uses the browser's BarcodeDetector where it exists
 * (Chrome, Android) and falls back to jsQR (iPhone Safari), loaded on demand.
 */
function Scanner({ onRef, onClose }: { onRef: (ref: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      } catch {
        setErr('Camera not available. Allow camera access, or type the reference below.');
        return;
      }
      const v = video.current;
      if (!v || stopped) return;
      v.srcObject = stream;
      await v.play().catch(() => {});
      const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
      const detector = BD ? new BD({ formats: ['qr_code'] }) : null;
      const jsQR = detector ? null : (await import('jsqr')).default;
      let busy = false;
      const tick = async () => {
        if (stopped) return;
        raf = requestAnimationFrame(tick);
        if (busy || !v.videoWidth) return;
        busy = true;
        try {
          let text = '';
          if (detector) {
            const found = await detector.detect(v);
            text = found[0]?.rawValue ?? '';
          } else if (jsQR && ctx) {
            const w = Math.min(640, v.videoWidth), h = Math.round((v.videoHeight / v.videoWidth) * w);
            canvas.width = w; canvas.height = h;
            ctx.drawImage(v, 0, 0, w, h);
            text = jsQR(ctx.getImageData(0, 0, w, h).data, w, h)?.data ?? '';
          }
          const ref = text && refFromScan(text);
          if (ref) { stopped = true; onRef(ref); }
        } finally {
          busy = false;
        }
      };
      tick();
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onRef]);

  return (
    <div style={{ ...card, padding: 12, background: '#1F0033' }}>
      {err ? (
        <div style={{ color: '#FFFFFF', padding: 16, fontWeight: 600 }}>{err}</div>
      ) : (
        <div style={{ position: 'relative' }}>
          <video ref={video} playsInline muted style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 12, display: 'block', background: '#000' }} />
          <div style={{ position: 'absolute', inset: '15% 25%', border: '3px solid #33FF74', borderRadius: 16, pointerEvents: 'none' }} />
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <span style={{ ...mono, color: 'rgba(255,255,255,.75)', fontSize: 11 }}>POINT AT THE TICKET QR CODE</span>
        <Btn variant="ghost" onClick={onClose} style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,.4)' }}>Close camera</Btn>
      </div>
    </div>
  );
}

export default function GatePanel({ onChanged }: { onChanged?: () => void }) {
  const [day, setDay] = useState<GateDayRow[] | null>(null);
  const [view, setView] = useState<GateView | null>(null);
  const [typed, setTyped] = useState('');
  const [scan, setScan] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState('');
  const [openSig, setOpenSig] = useState<string | null>(null);

  const loadDay = useCallback(() => { getGateDay().then(setDay).catch(() => setDay([])); }, []);
  useEffect(loadDay, [loadDay]);

  const open = useCallback(async (ref: string) => {
    setScan(false); setErr(''); setOverride(false); setReason(''); setOpenSig(null);
    try {
      setView(await getGateView(ref));
    } catch (e) {
      setView(null);
      setErr(isHttpError(e) && e.status === 404 ? `No booking ${ref}` : (e as Error).message);
    }
  }, []);

  const lookup = () => {
    const ref = refFromScan(typed) ?? typed.trim().toUpperCase();
    if (ref) open(ref);
  };

  const checkIn = async (withOverride: boolean) => {
    if (!view) return;
    setBusy(true); setErr('');
    try {
      const v = await gateCheckIn(view.refCode, withOverride, withOverride ? reason : undefined);
      setView(v); setOverride(false); loadDay(); onChanged?.();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const blocked = !!view && (view.missing > 0 || view.stops > 0);
  const signedToday = day?.reduce((n, r) => n + Math.min(r.signed, r.party), 0) ?? 0;
  const partyToday = day?.reduce((n, r) => n + r.party, 0) ?? 0;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* ---- find the booking ---- */}
      <div style={{ ...card, padding: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Btn variant="dark" onClick={() => { setScan(true); setView(null); setErr(''); }}>Scan ticket QR</Btn>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') lookup(); }}
          placeholder="or type VAL-1234-26"
          data-testid="gate-ref"
          style={{ ...inputStyle, width: 220, flex: '1 1 180px', ...mono, textTransform: 'uppercase' }}
        />
        <Btn variant="ghost" onClick={lookup}>Look up</Btn>
      </div>

      {scan && <Scanner onRef={open} onClose={() => setScan(false)} />}
      {err && <div role="alert" style={{ ...card, padding: '12px 16px', borderColor: '#FF3358', background: '#FFE2E7', fontWeight: 600 }}>{err}</div>}

      {/* ---- the scanned booking ---- */}
      {view && (
        <div data-testid="gate-view" style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', background: blocked ? '#FFF1F3' : '#EFFFF4', borderBottom: '1.5px solid #EBE2FF' }}>
            <div>
              <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: '#FF3358' }}>{view.refCode}</div>
              <div style={{ ...display, fontSize: 26, lineHeight: 1 }}>{view.guestName}</div>
              <div style={{ fontSize: 13, marginTop: 4, color: 'rgba(52,0,87,.7)' }}>
                {shortDate(view.visitDate)} · {view.slot} · {view.adults} adult{view.adults === 1 ? '' : 's'}{view.kids ? ` · ${view.kids} child${view.kids === 1 ? '' : 'ren'}` : ''} · {view.payMode === 'online' ? 'paid online' : `to pay ${money(view.total)}`}
              </div>
              {!view.isToday && <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: '#D91E44', marginTop: 6 }}>NOT TODAY'S BOOKING</div>}
            </div>
            <div style={{ textAlign: 'right', display: 'grid', gap: 6, justifyItems: 'end' }}>
              <StatusChip status={view.status} />
              <div data-testid="gate-waiver-count" style={{ ...mono, fontWeight: 700, fontSize: 15, color: view.missing ? '#D91E44' : '#1E9E4A' }}>
                WAIVERS {view.signedCount}/{view.required}
              </div>
              {view.stops > 0 && <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: '#D91E44' }}>{view.stops} LIMIT WARNING{view.stops > 1 ? 'S' : ''}</div>}
            </div>
          </div>

          <div style={{ padding: '14px 18px', display: 'grid', gap: 10 }}>
            {view.lines.length > 0 && (
              <div style={{ fontSize: 13, color: 'rgba(52,0,87,.75)' }}>{view.lines.map((l) => l.label).join(' · ')}</div>
            )}
            {view.waivers.length === 0 && <div style={{ fontWeight: 600 }}>No waiver signed yet. The guest can sign at the gate on their phone from the ticket link, or on paper.</div>}
            {view.waivers.map((w) => (
              <div key={w.id} data-testid="gate-waiver" style={{ border: '1.5px solid #EBE2FF', borderRadius: 14, padding: '10px 14px', background: w.flags.some((f) => f.level === 'stop') ? '#FFF6F7' : '#FFFFFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 800 }}>
                    {w.participantName}
                    <span style={{ ...mono, fontWeight: 600, fontSize: 12, marginLeft: 10 }}>{w.age} yrs · {w.heightCm} cm · {w.weightKg} kg</span>
                  </div>
                  <button type="button" onClick={() => setOpenSig(openSig === w.id ? null : w.id)} style={{ border: 0, background: 'transparent', color: '#7333FF', fontWeight: 700, cursor: 'pointer', fontSize: 12.5 }}>
                    {openSig === w.id ? 'Hide details' : 'Signature & details'}
                  </button>
                </div>
                {w.flags.map((f, i) => (
                  <div key={i} style={{ fontSize: 13, fontWeight: 700, color: f.level === 'stop' ? '#D91E44' : '#B7791F', marginTop: 4 }}>
                    {f.level === 'stop' ? '⛔' : '⚠'} {f.activity}: {f.message}
                  </div>
                ))}
                {w.medicalNotes && <div style={{ fontSize: 13, marginTop: 4 }}><strong>Medical:</strong> {w.medicalNotes}</div>}
                {openSig === w.id && (
                  <div style={{ marginTop: 8, display: 'grid', gap: 6, fontSize: 13 }}>
                    <img src={w.signature} alt={`Signature of ${w.signedBy}`} style={{ maxWidth: 320, width: '100%', border: '1px solid #EBE2FF', borderRadius: 10, background: '#FFFFFF' }} />
                    <div>Signed by <strong>{w.signedBy}</strong>{w.isMinor ? ' (guardian)' : ''} · {shortDate(w.signedAt)} {clockTime(w.signedAt)} · read in {w.lang.toUpperCase()}</div>
                    <div>Born {shortDate(w.birthDate)} · {w.nationality || 'nationality not given'}{w.idNumber ? ` · ID/passport ${w.idNumber}` : ''}</div>
                    <div>{w.address ? `${w.address} · ` : ''}{w.phone}{w.email ? ` · ${w.email}` : ''}</div>
                    <div>Emergency: {w.emergencyName}, {w.emergencyPhone}</div>
                    <div>Promotions (clause 18): {w.marketingConsent ? 'yes' : 'no'}</div>
                  </div>
                )}
              </div>
            ))}
            {view.missing > 0 && (
              <div style={{ fontSize: 13.5 }}>
                <strong>{view.missing} still to sign.</strong> They can do it now on their phone:{' '}
                <a href={view.waiverUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#7333FF', wordBreak: 'break-all' }}>waiver link</a>
              </div>
            )}

            {view.status === 'arrived' ? (
              <div style={{ ...mono, fontWeight: 700, color: '#1E9E4A', fontSize: 14 }}>✓ CHECKED IN</div>
            ) : view.status === 'cancelled' ? (
              <div style={{ ...mono, fontWeight: 700, color: '#D91E44', fontSize: 14 }}>CANCELLED BOOKING</div>
            ) : blocked ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {!override ? (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <Btn variant="danger" onClick={() => setOverride(true)}>Check in anyway…</Btn>
                    <Btn variant="ghost" onClick={() => open(view.refCode)}>Refresh</Btn>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason, e.g. paper waivers signed at the desk" style={{ ...inputStyle, flex: '1 1 260px' }} data-testid="gate-reason" />
                    <Btn variant="danger" disabled={busy || !reason.trim()} onClick={() => checkIn(true)}>Confirm check-in</Btn>
                    <Btn variant="ghost" onClick={() => setOverride(false)}>Cancel</Btn>
                  </div>
                )}
              </div>
            ) : (
              <Btn onClick={() => checkIn(false)} disabled={busy} style={{ justifySelf: 'start', padding: '12px 26px', fontSize: 15 }}>Check in {view.required} guest{view.required === 1 ? '' : 's'}</Btn>
            )}
          </div>
        </div>
      )}

      {/* ---- today's arrivals ---- */}
      <div style={{ ...card, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={label}>TODAY&apos;S ARRIVALS</div>
          <div style={{ ...mono, fontSize: 12 }}>{signedToday}/{partyToday} waivers signed</div>
        </div>
        {day === null && <div style={{ fontSize: 13 }}>Loading…</div>}
        {day && day.length === 0 && <div style={{ fontSize: 13 }}>No bookings for today.</div>}
        {day && day.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <tbody>
                {day.map((r) => (
                  <tr key={r.refCode} onClick={() => open(r.refCode)} style={{ cursor: 'pointer', borderTop: '1px solid #F1EAFF' }}>
                    <td style={{ padding: '8px 6px', ...mono, fontSize: 12 }}>{r.refCode}</td>
                    <td style={{ padding: '8px 6px', fontWeight: 600 }}>{r.guestName}</td>
                    <td style={{ padding: '8px 6px' }}>{r.slot}</td>
                    <td style={{ padding: '8px 6px', ...mono, fontWeight: 700, color: r.signed >= r.party ? '#1E9E4A' : '#D91E44' }}>{Math.min(r.signed, r.party)}/{r.party}</td>
                    <td style={{ padding: '8px 6px' }}><StatusChip status={r.status} /></td>
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
