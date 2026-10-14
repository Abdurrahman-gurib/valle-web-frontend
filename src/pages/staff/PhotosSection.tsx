import { useEffect, useRef, useState } from 'react';
import { deletePhoto, getPhotos, photosReady, uploadPhoto, type StaffPhotoSet } from '../../lib/staffApi';
import { Btn, SectionLabel, Spinner, card } from './ui';

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
      <div style={card} className="grid gap-2.5 p-3.5" data-testid="photos-section">
        {!set && <Spinner color="#340057" />}
        {set && (
          <>
            {set.count > 0 && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-1.5">
                {set.photos.map((p) => (
                  <div key={p.id} className="relative aspect-square overflow-hidden rounded-[8px] border border-solid border-valle-lilac bg-[#F7F3FF]" data-testid="staff-photo">
                    <img src={p.url} alt={p.name} loading="lazy" className="block h-full w-full object-cover" />
                    <button type="button" onClick={() => { void remove(p.id); }} disabled={busy !== null} title="Remove" aria-label={`Remove ${p.name}`} className="absolute top-1 right-1 h-[22px] w-[22px] cursor-pointer rounded-full border-0 bg-valle-purple/80 text-[12px] leading-none text-white">×</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2.5">
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple onChange={(e) => { void onFiles(e.target.files); }} disabled={busy !== null} data-testid="photo-file" className="text-[12.5px]" />
              {progress && <span className="font-mono text-[11px]">uploading {progress}</span>}
              {set.count > 0 && <Btn variant="dark" onClick={() => { void ready(); }} disabled={busy !== null}>{busy === 'ready' ? <Spinner color="#FFFFFF" /> : set.photosReadyAt ? 'Tell the guest again' : 'Photos ready · tell the guest'}</Btn>}
            </div>
            <div className="text-[12.5px] text-valle-purple/60">
              {set.count} photo{set.count === 1 ? '' : 's'}{set.photosReadyAt ? ` · guest told ${new Date(set.photosReadyAt).toLocaleString('en-GB', { timeZone: 'Indian/Mauritius' })}` : ''} · JPEG, PNG, WebP or HEIC, 8 MB each, 120 a booking. They download from the ticket page.
            </div>
            {msg && <div role="status" className="text-[13px] font-semibold text-[#1E9E4A]">{msg}</div>}
            {err && <div role="alert" className="text-[13px] text-[#D91E44]">{err}</div>}
          </>
        )}
      </div>
    </>
  );
}
