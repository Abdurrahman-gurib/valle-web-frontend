import { useEffect, useState, type CSSProperties } from 'react';
import { LANG_META, useLang, useT } from '../i18n';
import { CONDITION_LABEL, conditionAdvice, conditionIcon, fetchParkStatus, fetchWeather, type ParkStatus, type WeatherView } from '../lib/weather';
import { useCatalog } from '../store/CatalogContext';

/**
 * Live weather at the park (Open-Meteo through the API, refreshed every ten
 * minutes) next to the park's status of the day as set by the desk. On the
 * home-page map; a compact form lives on the ticket.
 */

const MONO = "'Chivo Mono',monospace";

export function useWeather(): WeatherView | null {
  const [w, setW] = useState<WeatherView | null>(null);
  useEffect(() => {
    let dead = false;
    const load = () => fetchWeather().then((v) => { if (!dead) setW(v); }).catch(() => { /* the card simply stays quiet */ });
    load();
    const timer = setInterval(load, 10 * 60_000);
    return () => { dead = true; clearInterval(timer); };
  }, []);
  return w;
}

export function useParkStatus(): ParkStatus | null {
  const [s, setS] = useState<ParkStatus | null>(null);
  useEffect(() => {
    let dead = false;
    const load = () => fetchParkStatus().then((v) => { if (!dead) setS(v); }).catch(() => { /* ignore */ });
    load();
    const timer = setInterval(load, 60_000);
    const onShow = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onShow);
    return () => { dead = true; clearInterval(timer); document.removeEventListener('visibilitychange', onShow); };
  }, []);
  return s;
}

const STATE_LABEL = { open: 'OPEN TODAY', partial: 'PARTLY OPEN TODAY', closed: 'CLOSED TODAY' } as const;
const STATE_COLOR = { open: '#33FF74', partial: '#FFFC33', closed: '#FF3358' } as const;

export function WeatherCard({ dark = true }: { dark?: boolean }) {
  const t = useT();
  const lang = useLang();
  const w = useWeather();
  const status = useParkStatus();
  const catalog = useCatalog();
  const fg = dark ? '#FFFFFF' : '#340057';
  const muted = dark ? 'rgba(255,255,255,.7)' : 'rgba(52,0,87,.65)';
  const box: CSSProperties = { background: dark ? 'rgba(255,255,255,.07)' : '#F7F3FF', border: `1px solid ${dark ? 'rgba(255,255,255,.16)' : '#EBE2FF'}`, borderRadius: 18, padding: '16px 18px', color: fg };
  const hourLabel = (iso: string) => new Date(iso).toLocaleTimeString(LANG_META[lang].locale, { hour: '2-digit', minute: '2-digit' });
  const dayLabel = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString(LANG_META[lang].locale, { weekday: 'short' });
  const advice = w ? conditionAdvice(w.now) : null;
  const pausedNames = status?.pausedActivities.map((id) => catalog.ACTS.find((a) => a.id === id)?.name ?? id) ?? [];

  return (
    <div data-testid="weather-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14 }}>
      <div style={box} data-testid="weather-now">
        <div style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em', color: muted }}>{t('LIVE AT THE PARK · CHAMOUNY')}</div>
        {!w && <div style={{ marginTop: 10, fontSize: 14, color: muted }}>{t('Reading the valley’s weather…')}</div>}
        {w && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
              <span aria-hidden style={{ fontSize: 44, lineHeight: 1 }}>{conditionIcon(w.now.condition, w.now.isDay)}</span>
              <div>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 40, lineHeight: 0.9 }} data-testid="weather-temp">{Math.round(w.now.tempC)}°C</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>{t(CONDITION_LABEL[w.now.condition])}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, fontFamily: MONO, fontSize: 11, color: muted }}>
              <span>{t('FEELS {n}°', { n: Math.round(w.now.feelsC) })}</span>
              <span>{t('WIND {n} KM/H', { n: Math.round(w.now.windKmh) })}{w.now.gustKmh > w.now.windKmh + 10 ? ` · ${t('GUSTS {n}', { n: Math.round(w.now.gustKmh) })}` : ''}</span>
              <span>{t('HUMIDITY {n}%', { n: w.now.humidity })}</span>
              {w.days[0] && <span>☀ {w.days[0].sunrise} · ☾ {w.days[0].sunset}</span>}
            </div>
            {advice && <div style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.5, color: fg }}>{t(advice)}</div>}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 14, paddingBottom: 4 }} data-testid="weather-hours">
              {w.hours.map((h) => (
                <div key={h.time} style={{ flex: '0 0 auto', minWidth: 54, textAlign: 'center', background: dark ? 'rgba(255,255,255,.06)' : '#FFFFFF', borderRadius: 12, padding: '8px 6px' }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: muted }}>{hourLabel(h.time)}</div>
                  <div aria-hidden style={{ fontSize: 18, margin: '3px 0' }}>{conditionIcon(h.condition)}</div>
                  <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700 }}>{Math.round(h.tempC)}°</div>
                  <div style={{ fontFamily: MONO, fontSize: 9.5, color: h.rainPct >= 50 ? '#7FD4FF' : muted }}>{h.rainPct}%</div>
                </div>
              ))}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9.5, color: muted, marginTop: 8 }}>{t('HOURLY · RAIN CHANCE · OPEN-METEO · UPDATED {time}', { time: hourLabel(w.fetchedAt) })}</div>
          </>
        )}
      </div>

      <div style={box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em', color: muted }}>{t('THE WEEK AHEAD')}</div>
          {status && (
            <span data-testid="park-state" data-state={status.state} style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '.12em', background: STATE_COLOR[status.state], color: '#340057', padding: '5px 10px', borderRadius: 999 }}>
              {t(STATE_LABEL[status.state])}
            </span>
          )}
        </div>
        {status && (status.state !== 'open' || status.message) && (
          <div data-testid="park-status-note" style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.5 }}>
            {pausedNames.length > 0 && <div>{t('Paused right now: {names}', { names: pausedNames.join(', ') })}</div>}
            {status.message && <div style={{ marginTop: 4 }}>{status.message}</div>}
          </div>
        )}
        {w && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(7, w.days.length)}, 1fr)`, gap: 4, marginTop: 12 }} data-testid="weather-days">
            {w.days.map((d, i) => (
              <div key={d.date} style={{ textAlign: 'center', background: i === 0 ? (dark ? 'rgba(255,255,255,.1)' : '#FFFFFF') : 'transparent', borderRadius: 12, padding: '8px 2px' }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: muted }}>{i === 0 ? t('TODAY') : dayLabel(d.date).toUpperCase()}</div>
                <div aria-hidden style={{ fontSize: 20, margin: '4px 0' }}>{conditionIcon(d.condition)}</div>
                <div style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700 }}>{Math.round(d.maxC)}°</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: muted }}>{Math.round(d.minC)}°</div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, color: d.rainPct >= 50 ? '#7FD4FF' : muted }}>{d.rainPct}%</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontFamily: MONO, fontSize: 9.5, color: muted, marginTop: 10 }}>{t('MOST ACTIVITIES RUN RAIN OR SHINE · ZIPLINES PAUSE IN STRONG WIND OR STORMS · WEATHER DAYS ARE POSTPONED, NEVER LOST')}</div>
      </div>
    </div>
  );
}

/** One line for a visit date: the forecast for that day when it is within the week. */
export function DayForecast({ date, style }: { date: string; style?: CSSProperties }) {
  const t = useT();
  const w = useWeather();
  const d = w?.days.find((x) => x.date === date);
  if (!d) return null;
  return (
    <div data-testid="day-forecast" style={{ fontSize: 13.5, display: 'flex', gap: 8, alignItems: 'center', ...style }}>
      <span aria-hidden style={{ fontSize: 20 }}>{conditionIcon(d.condition)}</span>
      <span>{t('Forecast: {cond}, {max}° / {min}°, {rain}% rain', { cond: t(CONDITION_LABEL[d.condition]), max: Math.round(d.maxC), min: Math.round(d.minC), rain: d.rainPct })}</span>
    </div>
  );
}
