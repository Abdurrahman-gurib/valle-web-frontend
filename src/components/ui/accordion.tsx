/**
 * Accordion from 21st.dev (ddoemonn/accordion, community component, adapted):
 * accessible headers (aria-expanded / aria-controls, arrow/Home/End keys),
 * auto-measured spring height with Motion, reduced motion respected.
 * Restyled to the VALLÉ palette; the dark-mode classes were dropped (the
 * site has one theme).
 */
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const EASE = [0.23, 1, 0.32, 1] as const;
const EXIT_EASE = [0.4, 0, 1, 1] as const;
const DISCLOSE = { type: 'spring', stiffness: 480, damping: 40, mass: 0.6 } as const;
const CHEVRON = { type: 'spring', stiffness: 700, damping: 46, mass: 0.5 } as const;
const NONE: readonly string[] = [];
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function useAutoHeight(): { ref: RefObject<HTMLDivElement>; height: number; ready: boolean } {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [ready, setReady] = useState(false);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => { const next = el.getBoundingClientRect().height; setHeight((prev) => (Math.abs(prev - next) < 0.5 ? prev : next)); };
    read();
    setReady(true);
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, height, ready };
}

export type AccordionItem = { id: string; title: ReactNode; content: ReactNode };

export function Accordion({ items, type = 'single', defaultOpen = NONE, headingLevel = 3, className }: {
  items: readonly AccordionItem[]; type?: 'single' | 'multiple'; defaultOpen?: readonly string[]; headingLevel?: number; className?: string;
}) {
  const reduced = Boolean(useReducedMotion());
  const base = useId();
  const [open, setOpen] = useState<string[]>(() => (type === 'single' ? defaultOpen.slice(0, 1) : defaultOpen.slice()));
  const headers = useRef(new Map<string, HTMLButtonElement>());
  const order = useMemo(() => items.map((i) => i.id), [items]);
  const toggle = useCallback((id: string) => {
    setOpen((cur) => {
      const on = cur.includes(id);
      if (type === 'single') return on ? [] : [id];
      return on ? cur.filter((x) => x !== id) : [...cur, id];
    });
  }, [type]);
  const move = (id: string, delta: number, edge: 'first' | 'last' | null) => {
    const at = order.indexOf(id);
    if (at < 0) return;
    const next = edge === 'first' ? 0 : edge === 'last' ? order.length - 1 : (at + delta + order.length) % order.length;
    headers.current.get(order[next])?.focus();
  };
  const onKey = (id: string) => (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(id, 1, null); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(id, -1, null); }
    else if (e.key === 'Home') { e.preventDefault(); move(id, 0, 'first'); }
    else if (e.key === 'End') { e.preventDefault(); move(id, 0, 'last'); }
  };
  return (
    <div className={cn('overflow-hidden rounded-[18px] bg-white shadow-[0_0_0_1.5px_#EBE2FF] [&>div+div]:border-t [&>div+div]:border-valle-lilac', className)} data-testid="accordion">
      {items.map((item) => (
        <Row key={item.id} item={item} open={open.includes(item.id)} reduced={reduced} headingLevel={headingLevel}
          headerId={`${base}-h-${item.id}`} panelId={`${base}-p-${item.id}`}
          bind={(n) => { if (n) headers.current.set(item.id, n); else headers.current.delete(item.id); }}
          onToggle={() => toggle(item.id)} onKeyDown={onKey(item.id)} />
      ))}
    </div>
  );
}

function Row({ item, open, reduced, headingLevel, headerId, panelId, bind, onToggle, onKeyDown }: {
  item: AccordionItem; open: boolean; reduced: boolean; headingLevel: number; headerId: string; panelId: string;
  bind: (n: HTMLButtonElement | null) => void; onToggle: () => void; onKeyDown: (e: KeyboardEvent) => void;
}) {
  const { ref, height, ready } = useAutoHeight();
  useEffect(() => {
    const el = ref.current as (HTMLElement & { inert?: boolean }) | null;
    if (!el) return;
    el.inert = !open;
    return () => { el.inert = false; };
  }, [ref, open]);
  return (
    <div>
      <div role="heading" aria-level={headingLevel}>
        <button id={headerId} ref={bind} type="button" onClick={onToggle} onKeyDown={onKeyDown} aria-expanded={open} aria-controls={panelId}
          className="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-5 py-4 text-start font-sans text-valle-purple transition-colors outline-none hover:bg-[#F7F3FF] focus-visible:bg-valle-violet/[.06] focus-visible:shadow-[inset_0_0_0_2px_#7333FF]">
          <span className={cn('min-w-0 flex-1 text-[15px]', open ? 'font-bold' : 'font-semibold')}>{item.title}</span>
          <motion.span aria-hidden className="inline-flex shrink-0 text-valle-violet" initial={false} animate={{ rotate: open ? 180 : 0 }} transition={reduced ? { duration: 0 } : CHEVRON}>
            <ChevronDown size={18} strokeWidth={2.5} />
          </motion.span>
        </button>
      </div>
      <motion.div initial={false} animate={ready ? { height: open ? height : 0 } : {}} transition={reduced ? { duration: 0 } : DISCLOSE}
        style={{ overflow: 'hidden', height: ready ? undefined : open ? 'auto' : 0 }}>
        <div id={panelId} ref={ref} role="region" aria-labelledby={headerId} aria-hidden={open ? undefined : true} className="bg-[#F7F3FF]">
          <motion.div initial={false} animate={{ opacity: open ? 1 : 0 }}
            transition={reduced ? { duration: 0 } : open ? { duration: 0.18, ease: EASE } : { duration: 0.14, ease: EXIT_EASE }}
            className="px-5 pt-3 pb-4 text-sm leading-relaxed text-valle-purple/75">
            {item.content}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default Accordion;
