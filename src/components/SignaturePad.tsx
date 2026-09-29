import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

export interface SignaturePadHandle {
  clear: () => void;
  /** PNG data URL of the signature, or '' when nothing was drawn. */
  toPng: () => string;
}

/**
 * Finger (or mouse / pen) signature on a canvas. Pointer events cover touch,
 * pen and mouse alike; touch-action:none stops the page from scrolling while
 * the guest signs. The export is a small transparent PNG (strokes only).
 */
export const SignaturePad = forwardRef<SignaturePadHandle, { label: string; clearLabel: string; onChange?: (hasInk: boolean) => void }>(
  function SignaturePad({ label, clearLabel, onChange }, ref) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const last = useRef<{ x: number; y: number } | null>(null);
    const [ink, setInk] = useState(false);
    const changed = useRef(onChange);
    changed.current = onChange;

    // Match the backing store to the displayed size, so strokes are crisp and land under the finger.
    useEffect(() => {
      const c = canvas.current;
      if (!c) return;
      const fit = () => {
        const r = c.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
        if (c.width === w && c.height === h) return;
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        if (ctx) { ctx.scale(dpr, dpr); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 2.4; ctx.strokeStyle = '#1F0033'; }
        setInk(false); changed.current?.(false);
      };
      fit();
      const ro = new ResizeObserver(fit);
      ro.observe(c);
      return () => ro.disconnect();
    }, []);

    const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      drawing.current = true;
      last.current = pos(e);
      const ctx = e.currentTarget.getContext('2d');
      if (ctx && last.current) { ctx.beginPath(); ctx.arc(last.current.x, last.current.y, 1.2, 0, Math.PI * 2); ctx.fillStyle = '#1F0033'; ctx.fill(); }
    };
    const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawing.current || !last.current) return;
      const ctx = e.currentTarget.getContext('2d');
      const p = pos(e);
      if (ctx) { ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
      last.current = p;
      if (!ink) { setInk(true); changed.current?.(true); }
    };
    const up = () => { drawing.current = false; last.current = null; };

    const clear = () => {
      const c = canvas.current;
      const ctx = c?.getContext('2d');
      if (c && ctx) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); ctx.restore(); }
      setInk(false); changed.current?.(false);
    };

    useImperativeHandle(ref, () => ({
      clear,
      toPng: () => {
        const c = canvas.current;
        if (!c || !ink) return '';
        // Downscale to at most 600 px wide: plenty for a signature, small to store.
        const scale = Math.min(1, 600 / c.width);
        const out = document.createElement('canvas');
        out.width = Math.round(c.width * scale); out.height = Math.round(c.height * scale);
        out.getContext('2d')?.drawImage(c, 0, 0, out.width, out.height);
        return out.toDataURL('image/png');
      },
    }));

    return (
      <div>
        <div style={{ position: 'relative', border: '1.5px dashed #7333FF', borderRadius: 14, background: '#FFFFFF', overflow: 'hidden' }}>
          <canvas
            ref={canvas}
            data-testid="signature-pad"
            aria-label={label}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onPointerLeave={up}
            style={{ display: 'block', width: '100%', height: 170, touchAction: 'none', cursor: 'crosshair' }}
          />
          {!ink && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: 'rgba(52,0,87,.35)', fontSize: 14, fontWeight: 600 }}>
              {label}
            </div>
          )}
          <div style={{ position: 'absolute', insetInline: 18, bottom: 34, borderBottom: '1px solid #D9C9F0', pointerEvents: 'none' }} />
        </div>
        <button type="button" onClick={clear} style={{ marginTop: 8, border: 0, background: 'transparent', color: '#7333FF', fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
          {clearLabel}
        </button>
      </div>
    );
  },
);
