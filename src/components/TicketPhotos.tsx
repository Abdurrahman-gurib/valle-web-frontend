import { useEffect, useState } from 'react';
import { useT } from '../i18n';
import { changeBooking, type TicketView } from '../lib/api';
import { fetchPhotos, type PhotoSet } from '../lib/day';
import { mur } from '../lib/format';
import { useCatalog } from '../store/CatalogContext';
import { productAmount, type RateKey } from '../types';

const MONO = "'Chivo Mono',monospace";

/**
 * Visit photos on the ticket. Before the visit, a booking without a photo
 * package can add one here (the shooter is booked with it). After the visit
 * the desk uploads the shots and the guest downloads them, one by one or all.
 */
export function TicketPhotos({ tk, token, onChanged }: { tk: TicketView; token: string; onChanged: (v: TicketView) => void }) {
  const t = useT();
  const catalog = useCatalog();
  const [set, setSet] = useState<PhotoSet | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    let dead = false;
    fetchPhotos(tk.refCode, token).then((s) => { if (!dead) setSet(s); }).catch(() => { /* no photos block then */ });
    return () => { dead = true; };
  }, [tk.refCode, token, tk.lines]);

  const rate = (tk.rate === 'nr' ? 'nr' : 'rr') as RateKey;
  const hasPackage = tk.lines.some((l) => l.productKey?.startsWith('photo:'));
  const tiers = (catalog.PRODUCTS ?? []).filter((p) => p.family === 'photo' && (p.rateOnly === null || p.rateOnly === rate));
  const canAdd = !hasPackage && tiers.length > 0 && (tk.status === 'confirmed' || tk.status === 'postponed');
  const addPackage = async (key: string) => {
    setBusy(key); setErr('');
    try {
      // the entry line (no experience, no product) is priced by the server, never sent
      const items = tk.lines.filter((l) => l.experienceId || l.productKey).map((l) => (l.experienceId
        ? { id: l.experienceId, variant: l.variant || undefined, adults: l.adults, kids: l.kids, units: l.units, time: l.time ?? undefined }
        : { id: 'product:' + l.productKey, adults: l.adults, kids: l.kids, units: l.units }));
      items.push({ id: 'product:' + key, adults: tk.adults, kids: tk.kids, units: 1 });
      onChanged(await changeBooking(tk.refCode, token, { items }));
    } catch (e) { setErr((e as Error).message || t('Could not add the package.')); } finally { setBusy(null); }
  };

  if (!set) return null;
  if (set.count === 0 && !canAdd && !hasPackage) return null;
  return (
    <section id="photos" data-testid="ticket-photos" style={{ margin: '14px 0 10px', textAlign: 'start', background: '#F7F3FF', border: '1.5px solid #EBE2FF', borderRadius: 14, padding: '12px 14px' }}>
      <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color: '#7333FF' }}>{t('YOUR PHOTOS')}</div>
      {set.count > 0 ? (
        <>
          <div style={{ fontSize: 13.5, marginTop: 6 }}>{t('{n} photos from your visit, yours to download and keep.', { n: set.count })}{set.packageLabel ? ` · ${set.packageLabel}` : ''}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 6, marginTop: 10 }}>
            {set.photos.map((p) => (
              <button key={p.id} type="button" onClick={() => setOpen(open === p.id ? null : p.id)} data-testid="ticket-photo" style={{ padding: 0, border: '1.5px solid #EBE2FF', borderRadius: 10, overflow: 'hidden', background: '#FFFFFF', cursor: 'pointer', aspectRatio: '1 / 1' }}>
                <img src={p.url} alt={p.caption || p.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </button>
            ))}
          </div>
          {open && (() => { const p = set.photos.find((x) => x.id === open); return p ? (
            <div style={{ marginTop: 10, background: '#FFFFFF', border: '1.5px solid #EBE2FF', borderRadius: 12, padding: 8 }}>
              <img src={p.url} alt={p.caption || p.name} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginTop: 8, fontSize: 13 }}>
                <span>{p.caption || p.name} · {(p.size / 1024 / 1024).toFixed(1)} MB</span>
                <a href={p.url + '&download=1'} download={p.name} style={{ background: '#340057', color: '#FFFFFF', textDecoration: 'none', fontWeight: 700, padding: '8px 14px', borderRadius: 999, fontSize: 13 }}>{t('Download')}</a>
              </div>
            </div>
          ) : null; })()}
          <div style={{ fontSize: 12, color: 'rgba(52,0,87,.6)', marginTop: 8 }}>{t('Tap a photo to see it full size and download it. The photos stay here on your ticket page.')}</div>
        </>
      ) : hasPackage ? (
        <div style={{ fontSize: 13.5, marginTop: 6 }}>{t('Your photo package is booked. The park photographer meets you at the briefing; the photos appear here after your visit and we message you when they are ready.')}</div>
      ) : (
        <>
          <div style={{ fontSize: 13.5, marginTop: 6 }}>{t('Book the park photographer: edited photos of your activities, delivered here on your ticket page after the visit.')}</div>
          <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
            {tiers.map((p) => (
              <button key={p.key} type="button" disabled={busy !== null} onClick={() => { void addPackage(p.key); }} data-testid={`add-photo-${p.key}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', textAlign: 'start', background: '#FFFFFF', border: '1.5px solid #EBE2FF', borderRadius: 12, padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit', color: '#340057' }}>
                <span><strong>{p.name}</strong>{p.note ? <span style={{ color: 'rgba(52,0,87,.65)' }}> · {p.note}</span> : null}</span>
                <span style={{ fontFamily: MONO, fontWeight: 700, whiteSpace: 'nowrap' }}>{busy === p.key ? '…' : mur(productAmount(p, rate, tk.adults, tk.kids, 1))}</span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(52,0,87,.6)', marginTop: 8 }}>{t('Priced for your party; added to your booking and paid with it.')}</div>
          {err && <div role="alert" style={{ color: '#D91E44', fontSize: 13, marginTop: 6 }}>{err}</div>}
        </>
      )}
    </section>
  );
}
