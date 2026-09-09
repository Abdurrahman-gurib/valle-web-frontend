import { useCatalog } from '../../store/CatalogContext';
import { useGoto } from '../../lib/nav';
import { useHover } from '../../hooks/useHover';
import { Img } from '../../components/Img';

/** "Taste the soul": the two restaurant teaser cards (markup: Restaurants section). */
export function DineTeasers() {
  const catalog = useCatalog();
  const goto = useGoto();
  const [chamH, chamBind] = useHover();
  const [citH, citBind] = useHover();

  const cham = catalog.RESTOS['chamouze'];
  const cit = catalog.RESTOS['citronelle'];
  if (!cham || !cit) return null;

  const cardBase = {
    cursor: 'pointer',
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 400,
    background: '#260040',
    transition: 'transform .25s ease, box-shadow .25s ease',
  } as const;
  const cardHover = {
    transform: 'translateY(-5px)',
    boxShadow: '0 26px 50px -18px rgba(52,0,87,.45)',
  } as const;

  return (
    <section
      id="dine"
      data-screen-label="Restaurants"
      style={{ maxWidth: 1320, margin: '0 auto', padding: 'clamp(56px,8vw,104px) clamp(16px,3.5vw,40px) 0' }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', borderBottom: '2px solid #340057', paddingBottom: 28, marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(30px,4.6vw,64px)', lineHeight: 0.85, letterSpacing: '-0.01em', margin: 0, textTransform: 'uppercase', transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>Taste the soul</h2>
        <span style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 12, fontWeight: 600, letterSpacing: '.16em', color: 'rgba(52,0,87,.55)' }}>04 · DINE IN THE VALLEY</span>
      </div>
      <div data-reveal-kids="1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
        <div
          {...chamBind}
          onClick={() => goto.resto('chamouze')}
          style={{ ...cardBase, ...(chamH ? cardHover : {}) }}
        >
          <Img src={cham.img} alt="Le Chamouzé restaurant overlooking the waterfall" surface="dark" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(31,0,51,.92), rgba(31,0,51,.05) 55%)' }} />
          <span style={{ position: 'absolute', top: 16, left: 16, background: '#FFFC33', color: '#340057', fontFamily: "'Chivo Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: '.1em', borderRadius: 999, padding: '7px 13px', transform: 'rotate(-4deg)' }}>WATERFALL DINING</span>
          <div style={{ position: 'absolute', left: 24, right: 24, bottom: 22, color: '#FFFFFF' }}>
            <div style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 36, textTransform: 'uppercase', transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>Le Chamouzé</div>
            <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.5, marginTop: 8, maxWidth: '44ch' }}>Mauritian–European fusion beside a cascading waterfall. Open daily 11:30 – 16:30 · menus Rs 700 – 4,250.</div>
            <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#FFFC33', marginTop: 10 }}>SEE THE RESTAURANT →</div>
          </div>
        </div>
        <div
          {...citBind}
          onClick={() => goto.resto('citronelle')}
          style={{ ...cardBase, ...(citH ? cardHover : {}) }}
        >
          <Img src={cit.img} alt="La Citronelle riverside restaurant" surface="dark" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(31,0,51,.92), rgba(31,0,51,.05) 55%)' }} />
          <span style={{ position: 'absolute', top: 16, left: 16, background: '#FFFC33', color: '#340057', fontFamily: "'Chivo Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: '.1em', borderRadius: 999, padding: '7px 13px', transform: 'rotate(-4deg)' }}>RIVERSIDE · EVENTS TO 400</span>
          <div style={{ position: 'absolute', left: 24, right: 24, bottom: 22, color: '#FFFFFF' }}>
            <div style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 36, textTransform: 'uppercase', transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>La Citronelle</div>
            <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.5, marginTop: 8, maxWidth: '44ch' }}>Refined Indian cuisine in a rustic lakeside setting. 11:30 – 16:30 · à la carte from Rs 600.</div>
            <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#FFFC33', marginTop: 10 }}>SEE THE RESTAURANT →</div>
          </div>
        </div>
      </div>
    </section>
  );
}
