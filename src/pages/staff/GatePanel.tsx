import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { Btn, StatusChip, clockTime, shortDate } from './ui';
import { gateCheckIn, gateWaiverPdfUrl, getGateDay, getGateView, isHttpError, type GateDayRow, type GateView } from '../../lib/staffApi';

const money = (n: number) => 'Rs ' + n.toLocaleString('en-US');

const CARD = 'bg-white border-[1.5px] border-valle-lilac rounded-[18px]';
const LABEL = 'font-mono text-[10px] font-bold tracking-[.14em] text-valle-violet';
const INPUT_CORE = 'border-[1.5px] border-valle-lilac bg-[#F7F3FF] rounded-[12px] [font-family:inherit] text-[14.5px] outline-none text-valle-purple';
const INPUT = INPUT_CORE + ' w-full px-[14px] py-[11px]';

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
    <div className="bg-[#1F0033] border-[1.5px] border-valle-lilac rounded-[18px] p-[12px]">
      {err ? (
        <div className="text-white p-[16px] font-semibold">{err}</div>
      ) : (
        <div className="relative">
          <video ref={video} playsInline muted className="w-full max-h-[360px] object-cover rounded-[12px] block bg-black" />
          <div className="absolute inset-y-[15%] inset-x-[25%] border-[3px] border-valle-green rounded-[16px] pointer-events-none" />
        </div>
      )}
      <div className="flex justify-between items-center mt-[10px]">
        <span className="font-mono text-[rgba(255,255,255,.75)] text-[11px]">POINT AT THE TICKET QR CODE</span>
        <Btn variant="ghost" onClick={onClose} style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,.4)' }}>Close camera</Btn>
      </div>
    </div>
  );
}

export default function GatePanel({ onChanged, onOpenBooking }: { onChanged?: () => void; onOpenBooking?: (ref: string) => void }) {
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
    <div className="grid gap-[14px]">
      {/* ---- find the booking ---- */}
      <div className={cn(CARD, 'p-[16px] flex gap-[10px] flex-wrap items-center')}>
        <Btn variant="dark" onClick={() => { setScan(true); setView(null); setErr(''); }}>Scan ticket QR</Btn>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') lookup(); }}
          placeholder="or type VAL-1234-26"
          data-testid="gate-ref"
          className={INPUT_CORE.replace('[font-family:inherit]', 'font-mono') + ' px-[14px] py-[11px] w-[220px] flex-[1_1_180px] uppercase'}
        />
        <Btn variant="ghost" onClick={lookup}>Look up</Btn>
      </div>

      {scan && <Scanner onRef={open} onClose={() => setScan(false)} />}
      {err && <div role="alert" className="bg-[#FFE2E7] border-[1.5px] border-valle-red rounded-[18px] px-[16px] py-[12px] font-semibold">{err}</div>}

      {/* ---- the scanned booking ---- */}
      {view && (
        <div data-testid="gate-view" className={cn(CARD, 'overflow-hidden')}>
          <div className={cn('px-[18px] py-[16px] flex justify-between gap-[12px] flex-wrap border-b-[1.5px] border-valle-lilac', blocked ? 'bg-[#FFF1F3]' : 'bg-[#EFFFF4]')}>
            <div>
              <div className="font-mono text-[13px] font-bold text-valle-red">{view.refCode}</div>
              <div className="font-display italic font-black uppercase text-[26px] leading-none">{view.guestName}</div>
              <div className="text-[13px] mt-[4px] text-[rgba(52,0,87,.7)]">
                {shortDate(view.visitDate)} · {view.slot} · {view.adults} adult{view.adults === 1 ? '' : 's'}{view.kids ? ` · ${view.kids} child${view.kids === 1 ? '' : 'ren'}` : ''} · {view.balance > 0 ? `to pay ${money(view.balance)}` : 'paid'}
              </div>
              {!view.isToday && <div className="font-mono text-[11px] font-bold text-[#D91E44] mt-[6px]">NOT TODAY'S BOOKING</div>}
              <div data-testid="gate-balance" className={cn('font-mono text-[12px] font-bold mt-[6px]', view.balance > 0 ? 'text-[#D91E44]' : 'text-[#1E9E4A]')}>
                {view.balance > 0 ? `TO COLLECT ${money(view.balance)} · PAID ${money(view.paidAmount)}` : 'FULLY PAID'}{view.adjustmentAmount > 0 ? ` · ${view.adjustmentNote || 'discount'} −${money(view.adjustmentAmount)}` : ''}
              </div>
            </div>
            <div className="text-right grid gap-[6px] justify-items-end">
              <StatusChip status={view.status} />
              <div data-testid="gate-waiver-count" className={cn('font-mono font-bold text-[15px]', view.missing ? 'text-[#D91E44]' : 'text-[#1E9E4A]')}>
                WAIVERS {view.signedCount}/{view.required}
              </div>
              {view.stops > 0 && <div className="font-mono text-[11px] font-bold text-[#D91E44]">{view.stops} LIMIT WARNING{view.stops > 1 ? 'S' : ''}</div>}
            </div>
          </div>

          <div className="px-[18px] py-[14px] grid gap-[10px]">
            {view.lines.length > 0 && (
              <div className="text-[13px] text-[rgba(52,0,87,.75)]">{view.lines.map((l) => l.label).join(' · ')}</div>
            )}
            {view.required === 0 && <div className="font-semibold text-[#1E9E4A]">No waiver needed: nothing on this booking is a zipline, quad, buggy or luge.</div>}
            {view.required > 0 && view.waivers.length === 0 && <div className="font-semibold">No waiver signed yet. The guest can sign at the gate on their phone from the ticket link, or on paper.</div>}
            {onOpenBooking && (
              <div><Btn variant="ghost" onClick={() => onOpenBooking(view.refCode)} style={{ padding: '7px 14px', fontSize: 12.5 }}>Open booking (payment, top-up, FOC, postpone)</Btn></div>
            )}
            {view.waivers.map((w) => (
              <div key={w.id} data-testid="gate-waiver" className={cn('border-[1.5px] border-valle-lilac rounded-[14px] px-[14px] py-[10px]', w.flags.some((f) => f.level === 'stop') ? 'bg-[#FFF6F7]' : 'bg-white')}>
                <div className="flex justify-between gap-[10px] flex-wrap">
                  <div className="font-extrabold">
                    {w.participantName}
                    <span className="font-mono font-semibold text-[12px] ml-[10px]">{w.age} yrs · {w.heightCm} cm · {w.weightKg} kg</span>
                  </div>
                  <span className="flex gap-[12px]">
                    <a href={gateWaiverPdfUrl(view.refCode, w.id)} target="_blank" rel="noopener noreferrer" className="font-bold text-[12.5px]" style={{ color: '#7333FF', textDecoration: 'none' }}>PDF</a>
                    <button type="button" onClick={() => setOpenSig(openSig === w.id ? null : w.id)} className="border-0 bg-transparent text-valle-violet font-bold cursor-pointer text-[12.5px] p-0">
                      {openSig === w.id ? 'Hide details' : 'Signature & details'}
                    </button>
                  </span>
                </div>
                {w.flags.map((f, i) => (
                  <div key={i} className={cn('text-[13px] font-bold mt-[4px]', f.level === 'stop' ? 'text-[#D91E44]' : 'text-[#B7791F]')}>
                    {f.level === 'stop' ? '⛔' : '⚠'} {f.activity}: {f.message}
                  </div>
                ))}
                {w.medicalNotes && <div className="text-[13px] mt-[4px]"><strong>Medical:</strong> {w.medicalNotes}</div>}
                {openSig === w.id && (
                  <div className="mt-[8px] grid gap-[6px] text-[13px]">
                    <img src={w.signature} alt={`Signature of ${w.signedBy}`} className="max-w-[320px] w-full border border-valle-lilac rounded-[10px] bg-white" />
                    <div>Signed by <strong>{w.signedBy}</strong>{w.isMinor ? ' (guardian)' : ''} · {shortDate(w.signedAt)} {clockTime(w.signedAt)} · read in {w.lang.toUpperCase()}{w.version > 1 ? <span data-testid="waiver-version" className="ms-[6px] font-mono text-[10px] bg-[#FFFDE0] border border-[#FFE94D] rounded-[999px] px-[7px] py-[2px]">signed {w.version}× · earlier versions kept</span> : null}</div>
                    <div>Born {shortDate(w.birthDate)} · {w.nationality || 'nationality not given'}{w.idNumber ? ` · ID/passport ${w.idNumber}` : ''}</div>
                    <div>{w.address ? `${w.address} · ` : ''}{w.phone}{w.email ? ` · ${w.email}` : ''}</div>
                    <div>Emergency: {w.emergencyName}, {w.emergencyPhone}</div>
                    <div>Promotions (clause 18): {w.marketingConsent ? 'yes' : 'no'}</div>
                  </div>
                )}
              </div>
            ))}
            {view.missing > 0 && (
              <div className="text-[13.5px]">
                <strong>{view.missing} still to sign.</strong> They can do it now on their phone:{' '}
                <a href={view.waiverUrl} target="_blank" rel="noopener noreferrer" className="break-all" style={{ color: '#7333FF' }}>waiver link</a>
              </div>
            )}

            {view.status === 'arrived' ? (
              <div className="font-mono font-bold text-[#1E9E4A] text-[14px]">✓ CHECKED IN</div>
            ) : view.status === 'cancelled' ? (
              <div className="font-mono font-bold text-[#D91E44] text-[14px]">CANCELLED BOOKING</div>
            ) : blocked ? (
              <div className="grid gap-[8px]">
                {!override ? (
                  <div className="flex gap-[10px] flex-wrap">
                    <Btn variant="danger" onClick={() => setOverride(true)}>Check in anyway…</Btn>
                    <Btn variant="ghost" onClick={() => open(view.refCode)}>Refresh</Btn>
                  </div>
                ) : (
                  <div className="flex gap-[10px] flex-wrap items-center">
                    <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason, e.g. paper waivers signed at the desk" className={INPUT + ' flex-[1_1_260px]'} data-testid="gate-reason" />
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
      <div className={cn(CARD, 'p-[16px]')}>
        <div className="flex justify-between items-baseline gap-[10px] flex-wrap mb-[10px]">
          <div className={LABEL}>TODAY&apos;S ARRIVALS</div>
          <div className="font-mono text-[12px]">{signedToday}/{partyToday} waivers signed</div>
        </div>
        {day === null && <div className="text-[13px]">Loading…</div>}
        {day && day.length === 0 && <div className="text-[13px]">No bookings for today.</div>}
        {day && day.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <tbody>
                {day.map((r) => (
                  <tr key={r.refCode} onClick={() => open(r.refCode)} className="cursor-pointer border-t border-[#F1EAFF]">
                    <td className="px-[6px] py-[8px] font-mono text-[12px]">{r.refCode}</td>
                    <td className="px-[6px] py-[8px] font-semibold">{r.guestName}</td>
                    <td className="px-[6px] py-[8px]">{r.slot}</td>
                    <td className={cn('px-[6px] py-[8px] font-mono font-bold', r.signed >= r.party ? 'text-[#1E9E4A]' : 'text-[#D91E44]')}>{Math.min(r.signed, r.party)}/{r.party}</td>
                    <td className={cn('px-[6px] py-[8px] font-mono text-[12px]', r.balance > 0 ? 'text-[#D91E44]' : 'text-[#1E9E4A]')}>{r.balance > 0 ? money(r.balance) : 'paid'}</td>
                    <td className="px-[6px] py-[8px]"><StatusChip status={r.status} /></td>
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
