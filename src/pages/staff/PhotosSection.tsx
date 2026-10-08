import { useEffect, useRef, useState } from 'react';
import { deletePhoto, getPhotos, photosReady, uploadPhoto, type StaffPhotoSet } from '../../lib/staffApi';
import { Btn, SectionLabel, Spinner, card, mono } from './ui';

/**
 * Visit photos in the booking drawer: upload the shoot (one file at a time,
 * up to 8 MB each), remove a miss, then tell the guest they are ready. The
 * guest downloads them from the ticket page.
 */
export function PhotosSection({ refCode }: { refCode: string }) {
  const [set, setSet] = useState<StaffPhotoSet | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => { let dead = false; getPhotos(refCode).then((s) => { if (!dead) setSet(s); }).catch(() => undefined); return () => { dead = true; }; }, [refCode]);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy('upload'); setErr(''); setMsg('');
    try {
      let last: StaffPhotoSet | null = null;
      for (let i = 0; i < files.length; i++) {
        setProgress(`${i + 1} / ${files.length}`);
        last = await uploadPhoto(refCode, files[i]);
      }
      if (last) setSet(last);
      setMsg(`${files.length} photo${files.length === 1 ? '' : 's'} uploaded.`);
    } catch (e) { setErr((e as Error).message || 'Upload failed.'); } finally { setBusy(null); setProgress(''); if (fileInput.current) fileInput.current.value = ''; }
  };
  const remove = async (id: string) => {
    setBusy(id); setErr('');
    try { setSet(await deletePhoto(refCode, id)); } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  };
  const ready = async () => {
    setBusy('ready'); setErr(''); setMsg('');
    try {
      const r = await photosReady(refCode);
      setSet((s) => (s ? { ...s, photosReadyAt: r.photosReadyAt } : s));
      setMsg(`Guest told: e-mail ${r.email ? 'sent' : 'not sent'}, WhatsApp ${r.whatsapp ? 'sent' : 'not sent (outside the 24-hour window or no number)'}.`);
    } catch (e) { setErr((e as Error).message || 'Could not notify.'); } finally { setBusy(null); }
  };

  return (
    <>
      <SectionLabel>VISIT PHOTOS{set?.packageLabel ? ` · ${set.packageLabel.toUpperCase()}` : ' · NO PHOTO PACKAGE ON THIS BOOKING'}</SectionLabel>
      <div style={{ ...card, padding: 14, display: 'grid', gap: 10 }} data-testid="photos-section">
        {!set && <Spinner color="#340057" />}
        {set && (
          <>
            {set.count > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 6 }}>
                {set.photos.map((p) => (
                  <div key={p.id} style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 8, overflow: 'hidden', border: '1px solid #EBE2FF', background: '#F7F3FF' }} data-testid="staff-photo">
                    <img src={p.url} alt={p.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <button type="button" onClick={() => { void remove(p.id); }} disabled={busy !== null} title="Remove" aria-label={`Remove ${p.name}`} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 999, border: 0, background: 'rgba(52,0,87,.8)', color: '#FFFFFF', cursor: 'pointer', fontSize: 12, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple onChange={(e) => { void onFiles(e.target.files); }} disabled={busy !== null} data-testid="photo-file" style={{ fontSize: 12.5 }} />
              {progress && <span style={{ ...mono, fontSize: 11 }}>uploading {progress}</span>}
              {set.count > 0 && <Btn variant="dark" onClick={() => { void ready(); }} disabled={busy !== null}>{busy === 'ready' ? <Spinner color="#FFFFFF" /> : set.photosReadyAt ? 'Tell the guest again' : 'Photos ready · tell the guest'}</Btn>}
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(52,0,87,.6)' }}>
              {set.count} photo{set.count === 1 ? '' : 's'}{set.photosReadyAt ? ` · guest told ${new Date(set.photosReadyAt).toLocaleString('en-GB', { timeZone: 'Indian/Mauritius' })}` : ''} · JPEG, PNG, WebP or HEIC, 8 MB each, 120 a booking. They download from the ticket page.
            </div>
            {msg && <div role="status" style={{ color: '#1E9E4A', fontSize: 13, fontWeight: 600 }}>{msg}</div>}
            {err && <div role="alert" style={{ color: '#D91E44', fontSize: 13 }}>{err}</div>}
          </>
        )}
      </div>
    </>
  );
}
