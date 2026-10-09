import { showsDuration } from '../types';
import { breadcrumbs, useSeo } from '../lib/seo';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCatalog } from '../store/CatalogContext';
import { useApp } from '../store/AppStore';
import { useCardModel, type CardModel } from '../lib/card';
import { paths, useGoto } from '../lib/nav';
import { money } from '../lib/format';
import { useHover } from '../hooks/useHover';
import { useReveal } from '../hooks/useReveal';
import { Img } from '../components/Img';
import { _t, useT } from '../i18n';

const PULSE_RANGES: Record<string, [number, number]> = {
  any: [1, 5], serene: [1, 2], moderate: [3, 3], extreme: [4, 5],
};

const CAT_CHIPS = [
  { key: 'all', label: _t('Everything'), c: '#340057', f: '#FFFFFF' },
  { key: 'adventure', label: _t('Adventure'), c: '#FF3358', f: '#FFFFFF' },
  { key: 'nature', label: _t('Nature'), c: '#33FF74', f: '#340057' },
  { key: 'kids', label: _t('Kids Park'), c: '#FFFC33', f: '#340057' },
  { key: 'tours', label: _t('Tours & Groups'), c: '#7333FF', f: '#FFFFFF' },
];

const PULSE_CHIPS = [
  { key: 'any', label: _t('Any') },
  { key: 'serene', label: _t('● Serene') },
  { key: 'moderate', label: _t('●●● Moderate') },
  { key: 'extreme', label: _t('●●●●● Extreme') },
];

/** chip(on, c, f): same colouring rule as the original template */
function chipColors(on: boolean, c?: string, f?: string) {
  return {
    bg: on ? (c || '#340057') : '#FFFFFF',
    fg: on ? (f || '#FFFFFF') : '#340057',
    bd: on ? (c || '#340057') : '#EBE2FF',
  };
}

function Chip({ label, onClick, bg, fg, bd, small }: {
  label: string; onClick: () => void; bg: string; fg: string; bd: string; small?: boolean;
}) {
  const [h, bind] = useHover();
  return (
    <button
      {...bind}
      onClick={onClick}
      style={{
        border: `1.5px solid ${bd}`,
        background: bg,
        color: fg,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: small ? '12.5px' : '13.5px',
        fontWeight: 700,
        padding: small ? '8px 15px' : '10px 17px',
        borderRadius: 999,
        transition: 'all .15s',
        ...(h ? { transform: 'translateY(-1px)' } : undefined),
      }}
    >
      {label}
    </button>
  );
}

function ResultCard({ a, rateTag }: { a: CardModel; rateTag: string }) {
  const t = useT();
  const [h, bind] = useHover();
  const [hAdd, bindAdd] = useHover();
  return (
    <div
      {...bind}
      onClick={a.open}
      style={{
        cursor: 'pointer',
        background: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 0 1.5px #EBE2FF',
        transition: 'transform .25s ease, box-shadow .25s ease',
        ...(h ? { transform: 'translateY(-6px)', boxShadow: '0 26px 50px -20px rgba(52,0,87,.4)' } : undefined),
      }}
    >
      <div style={{ position: 'relative', height: 195, background: '#EBE2FF' }}>
        <Img src={a.img} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <span style={{
          position: 'absolute', top: 12, left: 12, background: a.catColor, color: a.catFg,
          fontFamily: "'Chivo Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
          borderRadius: 999, padding: '6px 11px', transform: 'rotate(-4deg)',
        }}>{a.catBadge}</span>
        <span style={{
          position: 'absolute', bottom: 12, right: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#FFFC33', color: '#340057', fontFamily: "'Chivo Mono',monospace", fontSize: 11,
          fontWeight: 700, borderRadius: 8, padding: '6px 10px', boxShadow: '0 6px 16px -6px rgba(0,0,0,.5)',
        }}>
          {a.priceLabel}
          <span style={{
            background: '#340057', color: '#FFFC33', borderRadius: 4, padding: '2px 5px',
            fontSize: 9, letterSpacing: '.06em',
          }}>{rateTag}</span>
        </span>
      </div>
      <div style={{ padding: '15px 17px 17px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
          <div style={{
            fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 800,
            fontSize: 20, textTransform: 'uppercase',
          }}><a href={paths.detail(a.id)} onClick={(e) => { e.preventDefault(); e.stopPropagation(); a.open(); }} style={{ color: 'inherit', textDecoration: 'none' }}>{a.name}</a></div>
          <div title={t('Pulse level')} style={{
            fontSize: '10.5px', fontWeight: 700, letterSpacing: '.13em', color: a.pulseColor, whiteSpace: 'nowrap',
          }}>{a.pulseStr}</div>
        </div>
        <div style={{ fontSize: '13.5px', color: 'rgba(52,0,87,.68)', lineHeight: 1.5, marginTop: 6, flex: 1 }}>
          {a.blurb}
        </div>
        <div style={{
          fontFamily: "'Chivo Mono',monospace", fontSize: 11, color: 'rgba(52,0,87,.6)',
          marginTop: 12, borderTop: '1px dashed #D9C9F0', paddingTop: 11,
        }}>{showsDuration(a.id) ? `${a.dur} · ${a.age}` : a.age}</div>
        {a.hasAdd && (
          <button
            {...bindAdd}
            onClick={a.add}
            style={{
              marginTop: 11,
              border: `1.5px solid ${a.selOn ? '#340057' : '#C9B3E8'}`,
              background: a.selOn ? '#340057' : 'transparent',
              color: a.selOn ? '#FFFFFF' : '#340057',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '13.5px',
              fontWeight: 700,
              padding: '11px 0',
              borderRadius: 999,
              width: '100%',
              transition: 'all .15s',
              ...(hAdd ? { transform: 'translateY(-1px)' } : undefined),
            }}
          >
            {a.addLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const t = useT();
  const catalog = useCatalog();
  const app = useApp();
  const goto = useGoto();
  const card = useCardModel();
  const ref = useReveal<HTMLElement>();

  const [params, setParams] = useSearchParams();
  const cat = params.get('cat') || 'all';
  const q = params.get('q') || '';
  const pulseLvl = params.get('pulse') || 'any';
  const catName = cat !== 'all' && catalog.CAT[cat as keyof typeof catalog.CAT] ? catalog.CAT[cat as keyof typeof catalog.CAT].name : '';
  useSeo({
    title: catName ? t('{name} experiences · VALLÉ Advenature™ Park', { name: catName }) : t('All {count} experiences · VALLÉ Advenature™ Park', { count: catalog.ACTS.length }),
    description: catName
      ? t('{name} at Vallé Advenature Park, Chamouny: every {lower} experience with prices, age limits and thrill level.', { name: catName, lower: catName.toLowerCase() })
      : t('Every experience in the valley: ziplines, quad and buggy trails, the Nepalese bridge, luge kart, waterfalls, the 23 Coloured Earth, giant tortoises and the Kids Park.'),
    canonicalPath: catName ? `/explore?cat=${cat}` : '/explore',
    noindex: Boolean(q) || pulseLvl !== 'any',
    jsonLd: [breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Explore', path: '/explore' }, ...(catName ? [{ name: catName, path: `/explore?cat=${cat}` }] : [])])],
  });

  /** Detail's "← All experiences" reads this to come back to the same filtered list. */
  useEffect(() => {
    try {
      sessionStorage.setItem('exploreQS', params.toString());
    } catch {
      /* private mode can throw, so filters simply won't be restored */
    }
  }, [params]);

  const [searchFocus, setSearchFocus] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const scrollRail = (dir: 1 | -1) => railRef.current?.scrollBy({ left: dir * Math.max(280, railRef.current.clientWidth * 0.8), behavior: 'smooth' });
  const arrowStyle: CSSProperties = { width: 44, height: 44, borderRadius: 999, border: '1.5px solid #340057', background: '#FFFFFF', color: '#340057', fontSize: 26, lineHeight: 1, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
  const [hRate, bindRate] = useHover();
  const [hClear, bindClear] = useHover();
  const [hCta, bindCta] = useHover();

  const setParam = (key: 'cat' | 'q', value: string, replace = false) => {
    const next = new URLSearchParams(params);
    if (!value || (key === 'cat' && value === 'all')) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace });
  };

  const setPulseLvl = (v: string) => {
    const next = new URLSearchParams(params);
    if (v === 'any') next.delete('pulse');
    else next.set('pulse', v);
    setParams(next);
  };

  const rk = app.rate === 'nr' ? 'nr' : 'rr';
  const admissionRows = (catalog.PL.admission || []).map((r) => ({
    n: r.n,
    p: r[rk] ? money(r[rk]) : t('FREE'),
  }));

  const results = useMemo(() => {
    const rg = PULSE_RANGES[pulseLvl] || PULSE_RANGES.any;
    const query = q.trim().toLowerCase();
    return catalog.ACTS.filter((a) =>
      (cat === 'all' || a.cat === cat) &&
      a.thrill >= rg[0] && a.thrill <= rg[1] &&
      (!query || (a.name + ' ' + a.blurb + ' ' + catalog.CAT[a.cat].name).toLowerCase().includes(query)),
    );
  }, [catalog, cat, pulseLvl, q]);

  const cards = results.map((a) => card(a));
  const noResults = results.length === 0;
  const resultCount = t('{shown} OF {total}', { shown: results.length, total: catalog.ACTS.length });
  const exploreCtaLabel = app.selCount > 0 ? t('Book My Day · {count}', { count: app.selCount }) : t('Start booking');

  const clearFilters = () => {
    setParams(new URLSearchParams(), { replace: true });
  };

  const searchStyle: CSSProperties = {
    flex: 1,
    minWidth: 220,
    border: `1.5px solid ${searchFocus ? '#7333FF' : '#EBE2FF'}`,
    background: '#FFFFFF',
    borderRadius: 999,
    padding: '13px 22px',
    fontFamily: 'inherit',
    fontSize: 15,
    color: '#340057',
    outline: 'none',
  };

  return (
    <main ref={ref} style={{ maxWidth: 1320, margin: '0 auto', padding: '104px clamp(16px,3.5vw,40px) 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <h1 style={{
          fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900,
          fontSize: 'clamp(42px,6.4vw,90px)', lineHeight: 0.82, letterSpacing: '-0.01em',
          margin: 0, textTransform: 'uppercase', transform: 'rotate(-4deg)', transformOrigin: 'left bottom',
        }}>{cat === 'nature' ? t('Already included in entrance admission fees') : t('Explore Vallé')}</h1>
        <span style={{
          fontFamily: "'Chivo Mono',monospace", fontSize: 12, fontWeight: 600,
          letterSpacing: '.16em', color: 'rgba(52,0,87,.55)',
        }}>{t('{count} EXPERIENCES · ONE PARK', { count: catalog.ACTS.length })}</span>
      </div>

      <div style={{ marginTop: 20, background: '#340057', borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ height: 8, background: 'repeating-linear-gradient(-45deg,#33FF74 0 12px,#340057 12px 24px)' }} />
        <div style={{ padding: '14px 20px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{
              fontFamily: "'Chivo Mono',monospace", fontSize: 10, fontWeight: 700,
              letterSpacing: '.14em', color: '#FFFC33',
            }}>{t('ADMISSION FEE')} · {app.rateTag}</div>
            <div style={{
              fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900,
              fontSize: 22, textTransform: 'uppercase', color: '#FFFFFF', marginTop: 2,
            }}>{t('{rate} prices', { rate: app.rateWord })}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
            {admissionRows.map((ar) => (
              <span key={ar.n} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.1)',
                borderRadius: 10, padding: '8px 12px', fontSize: 13, color: 'rgba(255,255,255,.9)',
              }}>
                {t(ar.n)}
                <span style={{
                  background: '#FFFC33', color: '#340057', fontFamily: "'Chivo Mono',monospace",
                  fontWeight: 700, fontSize: 12, borderRadius: 5, padding: '3px 7px',
                }}>{ar.p}</span>
              </span>
            ))}
          </div>
          <button
            {...bindRate}
            onClick={app.openRateGate}
            style={{
              border: '1.5px solid rgba(255,255,255,.4)',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: "'Chivo Mono',monospace",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '.1em',
              color: '#FFFFFF',
              padding: '10px 16px',
              borderRadius: 999,
              ...(hRate ? { background: '#FFFFFF', color: '#340057' } : undefined),
            }}
          >{t('CHANGE RATE ⇄')}</button>
        </div>
      </div>

      {/* the search box and category chips went: categories come from the Explore menu, the search from the header */}
      <div style={{ margin: '22px 0 0', padding: '14px 0', borderBottom: '1px solid #EBE2FF' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
          <span style={{
            fontFamily: "'Chivo Mono',monospace", fontSize: 11, fontWeight: 600,
            letterSpacing: '.12em', color: 'rgba(52,0,87,.55)', marginRight: 4,
          }}>{t('PULSE LEVEL')}</span>
          {PULSE_CHIPS.map((c) => {
            const cc = chipColors(pulseLvl === c.key);
            return (
              <Chip
                key={c.key}
                label={t(c.label)}
                onClick={() => setPulseLvl(c.key)}
                bg={cc.bg}
                fg={cc.fg}
                bd={cc.bd}
                small
              />
            );
          })}
          <span style={{
            marginLeft: 'auto', fontFamily: "'Chivo Mono',monospace", fontSize: 12, color: 'rgba(52,0,87,.55)',
          }}>{resultCount}</span>
        </div>
      </div>

      {cat === 'nature' ? (
        <div style={{ position: 'relative', marginTop: 24 }} data-testid="nature-carousel">
          <div ref={railRef} style={{ display: 'flex', gap: 16, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', paddingBottom: 6 }}>
            {cards.map((a) => (
              <div key={a.id} style={{ flex: '0 0 min(300px, 82vw)', scrollSnapAlign: 'start' }}>
                <ResultCard a={a} rateTag={app.rateTag} />
              </div>
            ))}
          </div>
          {cards.length > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <button type="button" onClick={() => scrollRail(-1)} aria-label={t('Previous')} data-testid="carousel-prev" style={arrowStyle}>&lsaquo;</button>
              <button type="button" onClick={() => scrollRail(1)} aria-label={t('Next')} data-testid="carousel-next" style={arrowStyle}>&rsaquo;</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(265px,1fr))', gap: 16, marginTop: 24,
        }}>
          {cards.map((a) => (
            <ResultCard key={a.id} a={a} rateTag={app.rateTag} />
          ))}
        </div>
      )}

      {noResults && (
        <div style={{ textAlign: 'center', padding: '70px 20px', color: 'rgba(52,0,87,.6)' }}>
          <div style={{
            fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900,
            fontSize: 28, color: '#340057', textTransform: 'uppercase',
          }}>{t('Nothing matches that')}</div>
          <div style={{ fontSize: 15, marginTop: 8 }}>{t('Try a different search, or clear the filters.')}</div>
          <button
            {...bindClear}
            onClick={clearFilters}
            style={{
              marginTop: 18,
              border: '2px solid #340057',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 700,
              color: '#340057',
              padding: '12px 24px',
              borderRadius: 999,
              ...(hClear ? { background: '#340057', color: '#FFFFFF' } : undefined),
            }}
          >{t('Clear filters')}</button>
        </div>
      )}

      <div style={{
        marginTop: 'clamp(48px,6vw,72px)', background: '#340057', borderRadius: 20,
        padding: '26px 30px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{
            fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 800,
            fontSize: 24, color: '#FFFFFF', textTransform: 'uppercase',
          }}>{t("Can't decide? Build your day as you go.")}</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,.75)', marginTop: 5 }}>
            {t('Add experiences to My Day, then book them all in one step, pay on arrival.')}
          </div>
        </div>
        <button
          {...bindCta}
          onClick={goto.booking}
          style={{
            border: 0,
            background: hCta ? '#D91E44' : '#FF3358',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 15,
            fontWeight: 700,
            color: '#FFFFFF',
            padding: '15px 28px',
            borderRadius: 999,
          }}
        >{exploreCtaLabel}</button>
      </div>
    </main>
  );
}
