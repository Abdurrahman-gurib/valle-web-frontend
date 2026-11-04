import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', 'iframe', 'summary',
  '[tabindex]:not([tabindex="-1"])', '[contenteditable="true"]',
].join(',');

/** Visible, enabled, keyboard-reachable elements inside `root`, in DOM order. */
export function focusablesIn(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest('[inert]') && el.getClientRects().length > 0,
  );
}

export interface FocusTrapOptions {
  /** Escape calls this; leave it out when the dialog must not close on Escape. */
  onEscape?: () => void;
  /**
   * Modal (the default): Tab and Shift+Tab cycle inside the dialog and the rest
   * of the page is made `inert` (unreachable by keyboard, pointer and screen
   * readers). Non-modal: focus still moves in and back, Escape still closes.
   */
  modal?: boolean;
  /** Elements outside the dialog that stay reachable and join the Tab cycle (the toggle of a menu, say). */
  also?: () => (HTMLElement | null | undefined)[];
  /** Where focus goes on open; by default the first [data-autofocus], else the first focusable, else the dialog. */
  initialFocus?: () => HTMLElement | null | undefined;
  /** Where focus goes on close when the element that opened the dialog is gone (or was the page body). */
  fallbackFocus?: () => HTMLElement | null | undefined;
}

/** Open traps, innermost last: only the top one answers Tab and Escape. */
const stack: symbol[] = [];

/**
 * One focus trap for every overlay: moves focus into the dialog when it opens,
 * keeps Tab / Shift+Tab inside it, closes on Escape and gives focus back to
 * whatever opened it. Attach the returned ref to the dialog's outermost
 * element (the backdrop, when the backdrop closes it on click).
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(active: boolean, opts: FocusTrapOptions = {}) {
  const ref = useRef<T>(null);
  const o = useRef(opts);
  o.current = opts;

  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;
    const id = Symbol('trap');
    stack.push(id);
    const opener = document.activeElement as HTMLElement | null;
    const modal = o.current.modal !== false;
    const containers = () => [root, ...(o.current.also?.() ?? [])].filter((el): el is HTMLElement => !!el);

    // ---- make the page behind unreachable --------------------------------
    const madeInert: HTMLElement[] = [];
    const freed: HTMLElement[] = [];
    if (modal) {
      const keep = containers();
      // an outer trap may have made one of our ancestors inert: lift that while we are open
      for (const c of keep) {
        for (let el: HTMLElement | null = c; el && el !== document.body; el = el.parentElement) {
          if (el.hasAttribute('inert')) { el.removeAttribute('inert'); freed.push(el); }
        }
      }
      const walk = (parent: HTMLElement) => {
        for (const child of Array.from(parent.children) as HTMLElement[]) {
          if (keep.some((k) => k === child)) continue;
          if (keep.some((k) => child.contains(k))) { walk(child); continue; }
          if (/^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(child.tagName) || child.hasAttribute('inert')) continue;
          child.setAttribute('inert', '');
          madeInert.push(child);
        }
      };
      walk(document.body);
    }

    // ---- focus in ---------------------------------------------------------
    const focusIn = () => {
      const pick = o.current.initialFocus?.()
        ?? root.querySelector<HTMLElement>('[data-autofocus]')
        ?? focusablesIn(root)[0]
        ?? root;
      if (pick === root && !root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1');
      pick.focus({ preventScroll: true });
    };
    // after the entrance frame, so an element that only now became visible can take focus
    const raf = requestAnimationFrame(() => { if (!root.contains(document.activeElement)) focusIn(); });

    // ---- keys ---------------------------------------------------------------
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === 'Escape' && o.current.onEscape) {
        e.preventDefault();
        e.stopPropagation();
        o.current.onEscape();
        return;
      }
      if (e.key !== 'Tab' || !modal) return;
      const items = containers().flatMap((c) => focusablesIn(c))
        .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
      if (items.length === 0) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      const cur = document.activeElement as HTMLElement | null;
      const inside = !!cur && items.includes(cur);
      if (e.shiftKey && (cur === first || !inside)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (cur === last || !inside)) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey, true);
      const i = stack.indexOf(id);
      if (i >= 0) stack.splice(i, 1);
      for (const el of madeInert) el.removeAttribute('inert');
      for (const el of freed) el.setAttribute('inert', '');
      const back = opener && opener !== document.body && opener.isConnected && !opener.closest('[inert]')
        ? opener
        : o.current.fallbackFocus?.();
      back?.focus({ preventScroll: true });
    };
  }, [active]);

  return ref;
}
