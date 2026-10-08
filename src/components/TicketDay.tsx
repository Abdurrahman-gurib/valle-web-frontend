import { useEffect, useMemo, useState } from 'react';
import { useT } from '../i18n';
import type { TicketView } from '../lib/api';
import { fetchAvailability } from '../lib/api';
import { addMinutes, dayPosition, fetchParkLive, geoToMap, parkClock, waitLabel, type DayStep, type LiveOps } from '../lib/day';
import { useIsMobile } from '../hooks/useIsMobile';
import { useCatalog } from '../store/CatalogContext';
import { Img } from './Img';
import { PinButton } from '../pages/home/ParkMap';
import { useParkStatus } from './WeatherCard';

const MONO = "'Chivo Mono',monospace";

/**
 * The visit day on the ticket: what is running now and what is next from the
 * itinerary, the meeting point and the live wait of every booked activity
 * (set by the desk, read every minute), and the park map with the booked
 * stops lit and, if the guest allows it, their own position.
 */
export function TicketDay({ tk }: { tk: TicketView }) {
  const t = useT();
  const isMobile = useIsMobile();
  const catalog = useCatalog();
  const status = useParkStatus();
  const [live, setLive] = useState<LiveOps | null>(null);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [clock, setClock] = useState(parkClock());
  const [pos, setPos] = useState<{ px: number; py: number; distanceM: number; accuracy: number } | null>(null);
  const [geoState, setGeoState] = useState<'idle' | 'asking' | 'denied' | 'on'>('idle');
  const isToday = clock.date === tk.visitDate;

  useEffect(() => {
    let dead = false;
    const load = () => fetchParkLive().then((v) => { if (!dead) setLive(v); }).catch(() => { /* the day card still shows the itinerary */ });
    load();
    const timer = setInterval(() => { load(); setClock(parkClock()); }, 60_000);
    return () => { dead = true; clearInterval(timer); };
  }, []);
  useEffect(() => {
    fetchAvailability(tk.visitDate, 1).then((days) => {
      const d = days[0];
      if (!d?.sessions) return;
      setDurations(Object.fromEntries(Object.entries(d.sessions).map(([id, s]) => [id, s.durationMin])));
    }).catch(() => { /* durations default to an hour */ });
  }, [tk.visitDate]);

  const steps = useMemo<DayStep[]>(() => tk.lines.filter((l) => l.experienceId).map((l) => ({
    experienceId: l.experienceId as string,
    label: l.label.replace(/ · \d{2}:\d{2}$/, ''),
    time: l.time ?? null,
    endTime: l.time ? addMinutes(l.time, durations[l.experienceId as string] ?? 60) : null,
  })), [tk.lines, durations]);
  const { now, next, done } = dayPosition(steps, clock.time);
  const booked = new Set(steps.map((s) => s.experienceId));
  const pins = catalog.PINS;
  const litPins = pins.filter((p) => p.act && booked.has(p.act));

  const locate = () => {
    if (!('geolocation' in navigator)) { setGeoState('denied'); return; }
    setGeoState('asking');
    const id = navigator.geolocation.watchPosition(
      (g) => { const m = geoToMap(g.coords.latitude, g.coords.longitude); if (m) setPos({ ...m, accuracy: Math.round(g.coords.accuracy) }); setGeoState('on'); },
      () => setGeoState('denied'),
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
    );
    window.addEventListener('pagehide', () => navigator.geolocation.clearWatch(id), { once: true });
  };

  const info = (id: string) => live?.activities[id];
  const stepRow = (s: DayStep, tag: string, color: string) => {
    const i = info(s.experienceId);
    const paused = i?.paused || status?.pausedActivities.includes(s.experienceId) || status?.state === 'closed';
    return (
      <div key={s.experienceId + (s.time ?? '')} data-testid={`day-step-${tag.toLowerCase()}`} style={{ display: 'grid', gap: 3, padding: '10px 12px', borderRadius: 12, background: '#FFFFFF', border: `1.5px solid ${color}` }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color }}>{tag}</span>
          {s.time && <span style={{ fontFamily: MONO, fontWeight: 800 }}>{s.time}{s.endTime ? `–${s.endTime}` : ''}</span>}
          <span style={{ fontWeight: 700 }}>{s.label}</span>
          {paused && <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '.12em', background: '#FF3358', color: '#FFFFFF', padding: '2px 7px', borderRadius: 999 }}>{t('PAUSED')}</span>}
        </div>
        {i?.meetingPoint && <div style={{ fontSize: 13 }}>📍 {t('Meet at: {place}', { place: i.meetingPoint })}</div>}
        {isToday && i && i.waitMin !== null && <div style={{ fontSize: 13 }}>⏱ {t(waitLabel(i.waitMin), { n: i.waitMin })}</div>}
        {i?.note && <div style={{ fontSize: 12.5, color: 'rgba(52,0,87,.7)' }}>{i.note}</div>}
      </div>
    );
  };

  if (steps.length === 0) return null;
  return (
    <section data-testid="ticket-day" style={{ margin: '14px 0 10px', textAlign: 'start', background: '#F7F3FF', border: '1.5px solid #EBE2FF', borderRadius: 14, padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color: '#7333FF' }}>{isToday ? t('YOUR DAY · LIVE') : t('YOUR DAY')}</div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(52,0,87,.55)' }}>{t('PARK TIME {time}', { time: clock.time })}{live?.updatedAt ? ` · ${t('DESK UPDATE {time}', { time: new Date(live.updatedAt).toLocaleTimeString('en-GB', { timeZone: 'Indian/Mauritius', hour: '2-digit', minute: '2-digit' }) })}` : ''}</div>
      </div>
      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
        {isToday && now && stepRow(now, t('NOW'), '#1E9E4A')}
        {isToday && next && stepRow(next, t('NEXT · BE THERE 15 MIN EARLY'), '#FF3358')}
        {isToday && !now && !next && steps.some((s) => s.time) && done.length > 0 && <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t('All your timed activities are done. Enjoy the trails, the falls and the restaurant.')}</div>}
        {steps.filter((s) => s !== now && s !== next && !done.includes(s)).map((s) => stepRow(s, s.time ? t('LATER') : t('ANY TIME'), '#EBE2FF'))}
        {done.map((s) => stepRow(s, t('DONE'), '#D9CCF2'))}
      </div>

      <div style={{ marginTop: 12, position: 'relative', background: '#2E0A4E', borderRadius: 12, padding: 6 }} data-testid="ticket-map">
        <div style={{ position: 'relative' }}>
          <Img src="/images/park-sitemap.webp" alt={t('Park map with your booked stops')} surface="dark" placeholder="#2E0A4E" width={1879} height={1327} style={{ width: '100%', height: 'auto', display: 'block', aspectRatio: '1879 / 1327', borderRadius: 8 }} />
          {pins.map((p, i) => <PinButton key={p.n} p={p} i={i} on={litPins.includes(p)} isMobile={isMobile} onClick={() => undefined} scale={0.8} />)}
          {pos && pos.px >= 0 && (
            <div data-testid="you-are-here" title={t('You (approximate)')} style={{ position: 'absolute', left: pos.px + '%', top: pos.py + '%', transform: 'translate(-50%,-50%)', width: 16, height: 16, borderRadius: 999, background: '#33B5FF', border: '3px solid #FFFFFF', boxShadow: '0 0 0 8px rgba(51,181,255,.3)' }} />
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 6, fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,.75)' }}>
          {litPins.length > 0 ? <span>{t('YELLOW PINS: YOUR STOPS')}</span> : <span>{t('RED PINS: THE TRAIL STOPS')}</span>}
          {geoState !== 'on' && (
            <button type="button" onClick={locate} disabled={geoState === 'asking'} data-testid="locate-me" style={{ marginInlineStart: 'auto', background: '#FFFC33', color: '#340057', border: 0, borderRadius: 999, padding: '6px 12px', fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.1em', cursor: 'pointer' }}>
              {geoState === 'asking' ? t('LOCATING…') : t('SHOW MY POSITION')}
            </button>
          )}
          {geoState === 'denied' && <span>{t('Location is off; allow it in your browser to see yourself on the map.')}</span>}
          {pos && (pos.px < 0
            ? <span style={{ marginInlineStart: 'auto' }}>{t('You are {km} km from the entrance', { km: (pos.distanceM / 1000).toFixed(1) })} · <a href="https://maps.google.com/?q=Vall%C3%A9+Advenature+Park+Chamouny" style={{ color: '#FFFC33' }}>{t('directions')}</a></span>
            : <span style={{ marginInlineStart: 'auto' }}>{t('{m} m from the entrance · ±{acc} m', { m: pos.distanceM, acc: pos.accuracy })}</span>)}
        </div>
      </div>
    </section>
  );
}
