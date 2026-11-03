import { useEffect, useState, type CSSProperties } from 'react';
import { useT } from '../i18n';
import { CONDITION_LABEL, conditionIcon, fetchParkStatus, fetchWeather, type ParkStatus, type WeatherView } from '../lib/weather';

/**
 * Live weather at the park (Open-Meteo through the API, refreshed every ten
 * minutes) and the park's status of the day as set by the desk. The forecast
 * line shows on the ticket.
 */

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
