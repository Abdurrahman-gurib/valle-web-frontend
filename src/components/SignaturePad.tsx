import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Eraser, PenLine, Undo2 } from 'lucide-react';

export interface SignaturePadHandle {
  clear: () => void;
  /** PNG data URL of the signature, or '' when nothing was drawn. */
  toPng: () => string;
}

type Pt = { x: number; y: number; w: number };
const INK = '#1F0033';

/**
 * Finger (or mouse / pen) signature on a canvas. Pointer events cover touch,
 * pen and mouse alike; touch-action:none stops the page from scrolling while
 * the guest signs. Strokes are kept as point lists, so Undo removes the last
 * stroke and a resize redraws them; ink is smoothed (quadratic curves through
 * the midpoints) and slightly thinner when the pen moves fast, like a real pen.
 * The export is a small transparent PNG (strokes only).
 */
export const SignaturePad = forwardRef<SignaturePadHandle, { label: string; clearLabel: string; undoLabel?: string; onChange?: (hasInk: boolean) => void }>(
  function SignaturePad({ label, clearLabel, undoLabel, onChange }, ref) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const strokes = useRef<Pt[][]>([]);
    const current = useRef<Pt[] | null>(null);
    const lastT = useRef(0);
    const [count, setCount] = useState(0);
    const changed = useRef(onChange);
    changed.current = onChange;

    const drawStroke = (ctx: CanvasRenderingContext2D, pts: Pt[]) => {
      if (pts.length === 1) { ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, pts[0].w / 2, 0, Math.PI * 2); ctx.fill(); return; }
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const p0 = i > 1 ? { x: (pts[i - 2].x + a.x) / 2, y: (pts[i - 2].y + a.y) / 2 } : a;
        const p1 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        ctx.lineWidth = (a.w + b.w) / 2;
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.quadraticCurveTo(a.x, a.y, p1.x, p1.y); ctx.stroke();
      }
    };
    const redraw = useCallback(() => {
      const c = canvas.current; const ctx = c?.getContext('2d');
      if (!c || !ctx) return;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); ctx.restore();
      for (const s of strokes.current) drawStroke(ctx, s);
    }, []);
    const report = useCallback(() => { const n = strokes.current.length; setCount(n); changed.current?.(n > 0); }, []);

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
        if (ctx) { ctx.scale(dpr, dpr); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.fillStyle = INK; }
        redraw();
      };
      fit();
      const ro = new ResizeObserver(fit);
      ro.observe(c);
      return () => ro.disconnect();
    }, [redraw]);

    const point = (e: React.PointerEvent<HTMLCanvasElement>, prev?: Pt): Pt => {
      const r = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const now = performance.now();
      let w = 2.6;
      if (prev) {
        const v = Math.hypot(x - prev.x, y - prev.y) / Math.max(1, now - lastT.current); // px per ms
        w = Math.max(1.4, Math.min(3.2, 3.2 - v * 1.1));
        w = prev.w * 0.6 + w * 0.4; // ease width changes
      }
      // a pen with real pressure (stylus) wins over the speed estimate
      if (e.pointerType === 'pen' && e.pressure > 0) w = 1.2 + e.pressure * 2.6;
      lastT.current = now;
      return { x, y, w };
    };
    const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      const p = point(e);
      current.current = [p];
      const ctx = e.currentTarget.getContext('2d');
      if (ctx) drawStroke(ctx, [p]);
    };
    const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const s = current.current;
      if (!s) return;
      const p = point(e, s[s.length - 1]);
      s.push(p);
      const ctx = e.currentTarget.getContext('2d');
      if (ctx) drawStroke(ctx, s.slice(-3));
      if (s.length === 2) { strokes.current.push(s); report(); }
    };
    const up = () => {
      const s = current.current;
      if (s && s.length === 1) { strokes.current.push(s); report(); }
      current.current = null;
    };
    const undo = () => { strokes.current.pop(); redraw(); report(); };
    const clear = () => { strokes.current = []; current.current = null; redraw(); report(); };

    useImperativeHandle(ref, () => ({
      clear,
      toPng: () => {
        const c = canvas.current;
        if (!c || strokes.current.length === 0) return '';
        // Downscale to at most 600 px wide: plenty for a signature, small to store.
        const scale = Math.min(1, 600 / c.width);
        const out = document.createElement('canvas');
        out.width = Math.round(c.width * scale); out.height = Math.round(c.height * scale);
        out.getContext('2d')?.drawImage(c, 0, 0, out.width, out.height);
        return out.toDataURL('image/png');
      },
    }));

    const ink = count > 0;
    return (
      <div>
        <div className={'relative overflow-hidden rounded-[14px] border-[1.5px] border-dashed bg-white transition-colors ' + (ink ? 'border-valle-violet' : 'border-valle-violet/60')}>
          <canvas
            ref={canvas}
            data-testid="signature-pad"
            aria-label={label}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onPointerLeave={up}
            className="block h-[170px] w-full cursor-crosshair touch-none"
          />
          {!ink && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm font-semibold text-valle-purple/35">
              <PenLine size={16} aria-hidden /> {label}
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-[18px] bottom-[34px]" style={{ borderBottom: '1px solid #D9C9F0' }} />
          <span aria-hidden className="pointer-events-none absolute bottom-[38px] left-[18px] font-display text-lg font-black text-valle-purple/25 italic">×</span>
        </div>
        <div className="mt-2 flex gap-4">
          {undoLabel && (
            <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={undo} disabled={!ink}
              className="inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 font-sans text-[13px] font-bold text-valle-violet disabled:cursor-default disabled:opacity-40">
              <Undo2 size={14} aria-hidden /> {undoLabel}
            </motion.button>
          )}
          <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={clear}
            className="inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 font-sans text-[13px] font-bold text-valle-violet">
            <Eraser size={14} aria-hidden /> {clearLabel}
          </motion.button>
        </div>
      </div>
    );
  },
);
