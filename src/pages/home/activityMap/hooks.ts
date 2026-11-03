import { useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { useCatalog } from '../../../store/CatalogContext';
import { useApp } from '../../../store/AppStore';
import { money } from '../../../lib/format';
import type { MapRoute } from '../../../data/maps';
import { _t } from '../../../i18n';

/** One bookable option of a route: the experience id plus the exact price-list row. */
export interface Bookable { id: string; variant: string; price: string; label: string }

/** Resolves a route's price-list rows (by label prefix) into bookable options at the visitor's rate. */
export function useBookables() {
  const catalog = useCatalog();
  const app = useApp();
  const rk = app.rate === 'nr' ? 'nr' : 'rr';
  const find = (cat: string, prefix: string, label: string): Bookable | null => {
    const row = (catalog.PL[cat] || []).find((r) => r.n.toLowerCase().startsWith(prefix.toLowerCase()));
    if (!row) return null;
    return { id: cat, variant: row.n, price: money(row[rk]) + (app.rate ? '' : ' (RR)'), label };
  };
  return (r: Pick<MapRoute, 'priceCat' | 'priceRow' | 'priceCat2' | 'priceRow2' | 'priceLabel2'>): Bookable[] => {
    const out: Bookable[] = [];
    const a = find(r.priceCat, r.priceRow, r.priceCat === 'zipline' ? _t('ZIPLINE') : r.priceCat.toUpperCase());
    if (a) out.push(a);
    if (r.priceCat2 && r.priceRow2) {
      const b = find(r.priceCat2, r.priceRow2, r.priceLabel2 || r.priceCat2.toUpperCase());
      if (b) out.push(b);
    }
    return out;
  };
}

/** Zoom + drag-to-pan for the map. Pan is clamped so the map always fills the frame. */
export function useMapZoom() {
  const [zoom, setZoomState] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const frame = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);
  const clamp = (z: number, x: number, y: number) => {
    const el = frame.current; if (!el) return { x, y };
    const w = el.clientWidth, h = el.clientHeight;
    return { x: Math.min(0, Math.max(w - w * z, x)), y: Math.min(0, Math.max(h - h * z, y)) };
  };
  const setZoom = (z: number) => {
    const nz = Math.min(3, Math.max(1, Math.round(z * 4) / 4));
    const el = frame.current;
    // keep the frame centre fixed while zooming
    const cx = el ? el.clientWidth / 2 : 0, cy = el ? el.clientHeight / 2 : 0;
    setPan((p) => clamp(nz, cx - (cx - p.x) * (nz / zoom), cy - (cy - p.y) * (nz / zoom)));
    setZoomState(nz);
  };
  const reset = () => { setZoomState(1); setPan({ x: 0, y: 0 }); };
  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (zoom === 1 || (e.target instanceof Element && e.target.closest('button, aside'))) return;
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    setPan(clamp(zoom, d.px + dx, d.py + dy));
  };
  const onPointerUp = () => { drag.current = null; setDragging(false); };
  return { zoom, pan, dragging, frame, setZoom, reset, bind: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp } };
}
