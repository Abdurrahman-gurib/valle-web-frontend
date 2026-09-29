import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LANGS, LANG_META, isLang, localizePath, stripLang, tr, useLang, type Lang } from '../i18n';

const MONO = "'Chivo Mono',monospace";

/** Same page, other language: keeps the path, the query and the #section. */
export function useSwitchLang(): (lang: Lang) => void {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  return (lang: Lang) => {
    try { localStorage.setItem('valle_lang', lang); } catch { /* ignore */ }
    navigate(localizePath(stripLang(pathname) + search + hash, lang));
  };
}

/** Header language switch (EN / FR / DE / IT), styled like the currency switch next to it. */
export function LanguagePicker({ fg, compact }: { fg: string; compact?: boolean }) {
  const lang = useLang();
  const switchTo = useSwitchLang();
  const [open, setOpen] = useState(false);
  const [h, setH] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div ref={box} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setH(true)}
        onMouseLeave={() => setH(false)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={tr('Language: {name}. Change language', { name: LANG_META[lang].name })}
        data-testid="language-picker"
        style={{
          border: `1.5px solid ${h || open ? '#7333FF' : 'rgba(115,51,255,.5)'}`,
          background: h || open ? '#7333FF' : 'transparent', cursor: 'pointer',
          fontFamily: MONO, fontSize: compact ? 10 : 11, fontWeight: 700, letterSpacing: compact ? '.06em' : '.1em',
          color: h || open ? '#FFFFFF' : fg, padding: compact ? '8px 9px' : '9px 12px', borderRadius: 999,
          whiteSpace: 'nowrap', lineHeight: 1,
        }}
      >
        {LANG_META[lang].short} ▾
      </button>
      {open && (
        <div role="listbox" aria-label="Language" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 60, width: 190, background: '#FFFFFF', color: '#340057',
          borderRadius: 16, boxShadow: '0 24px 60px -18px rgba(31,0,51,.55), 0 0 0 1.5px #EBE2FF', padding: 8, animation: 'vfadeup .2s ease both',
          fontFamily: "'Work Sans',sans-serif",
        }}>
          {LANGS.map((l) => {
            const on = l === lang;
            return (
              <a
                key={l}
                role="option"
                aria-selected={on}
                lang={l}
                hrefLang={l}
                href={localizePath(stripLang(typeof window !== 'undefined' ? window.location.pathname : '/'), l)}
                onClick={(e) => { e.preventDefault(); setOpen(false); switchTo(l); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#340057',
                  background: on ? '#F1EBFF' : 'transparent', borderRadius: 10, padding: '9px 10px',
                }}
              >
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.08em', width: 26 }}>{LANG_META[l].short}</span>
                <span style={{ fontSize: 14 }}>{LANG_META[l].name}</span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * A one-line offer on English pages when the browser prefers French, German
 * or Italian. Never redirects on its own (search engines and shared links
 * must land where they point); dismissing it is remembered.
 */
export function LanguageSuggest() {
  const lang = useLang();
  const switchTo = useSwitchLang();
  const [target, setTarget] = useState<Lang | null>(null);

  useEffect(() => {
    if (lang !== 'en') { setTarget(null); return; }
    try {
      if (localStorage.getItem('valle_lang_dismissed') === '1') return;
      if (localStorage.getItem('valle_lang') === 'en' && localStorage.getItem('valle_lang_chosen') === '1') return;
    } catch { /* ignore */ }
    const pref = (navigator.languages?.[0] || navigator.language || '').slice(0, 2).toLowerCase();
    if (isLang(pref) && pref !== 'en') setTarget(pref);
  }, [lang]);

  if (!target) return null;
  const dismiss = () => { try { localStorage.setItem('valle_lang_dismissed', '1'); } catch { /* ignore */ } setTarget(null); };
  return (
    <div role="region" aria-label="Language" data-testid="language-suggest" lang={target} dir={LANG_META[target].dir} style={{
      position: 'relative', zIndex: 61, background: '#340057', color: '#FFFFFF', fontFamily: "'Work Sans',sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap', paddingBlock: 9, paddingInline: '16px 44px', fontSize: 13.5,
    }}>
      <span>{tr('This site is also available in {language}.', { language: LANG_META[target].name }, target)}</span>
      <button onClick={() => switchTo(target)} style={{ border: 0, background: '#FFFC33', color: '#340057', fontWeight: 700, fontSize: 13, padding: '6px 14px', borderRadius: 999, cursor: 'pointer' }}>
        {tr('Switch to {language}', { language: LANG_META[target].name }, target)}
      </button>
      <button onClick={dismiss} aria-label="Dismiss" style={{ position: 'absolute', insetInlineEnd: 10, top: '50%', transform: 'translateY(-50%)', border: 0, background: 'transparent', color: '#FFFFFF', fontSize: 18, cursor: 'pointer' }}>×</button>
    </div>
  );
}
