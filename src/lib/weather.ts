import { _t } from '../i18n';

/** GET /api/weather and /api/park-status, shaped by the API (Open-Meteo behind it). */
export type Condition =
  | 'clear' | 'mainly-clear' | 'partly-cloudy' | 'overcast' | 'fog'
  | 'drizzle' | 'rain-light' | 'rain' | 'rain-heavy' | 'showers' | 'showers-heavy'
  | 'thunderstorm' | 'thunder-hail' | 'snow';
export interface WeatherNow { time: string; tempC: number; feelsC: number; humidity: number; precipMm: number; windKmh: number; gustKmh: number; code: number; condition: Condition; isDay: boolean }
export interface WeatherHour { time: string; tempC: number; rainPct: number; code: number; condition: Condition; windKmh: number }
export interface WeatherDay { date: string; code: number; condition: Condition; maxC: number; minC: number; rainPct: number; windKmh: number; sunrise: string; sunset: string }
export interface WeatherView { place: string; fetchedAt: string; now: WeatherNow; hours: WeatherHour[]; days: WeatherDay[] }
export type ParkState = 'open' | 'partial' | 'closed';
export interface ParkStatus { state: ParkState; message: string; pausedActivities: string[]; pausedNames: string[]; updatedAt: string | null }

const BASE = import.meta.env.VITE_API_URL || '/api';
let weatherOnce: Promise<WeatherView> | null = null;
export function fetchWeather(): Promise<WeatherView> {
  if (!weatherOnce) {
    weatherOnce = fetch(`${BASE}/weather`).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<WeatherView>; });
    weatherOnce.catch(() => { weatherOnce = null; });
    setTimeout(() => { weatherOnce = null; }, 5 * 60_000);
  }
  return weatherOnce;
}
let statusOnce: Promise<ParkStatus> | null = null;
export function fetchParkStatus(): Promise<ParkStatus> {
  if (!statusOnce) {
    statusOnce = fetch(`${BASE}/park-status`, { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<ParkStatus>; });
    statusOnce.catch(() => { statusOnce = null; });
    setTimeout(() => { statusOnce = null; }, 60_000);
  }
  return statusOnce;
}

/** Words and symbols per condition; the words go through t(). */
export const CONDITION_LABEL: Record<Condition, string> = {
  clear: _t('Clear sky'), 'mainly-clear': _t('Mainly clear'), 'partly-cloudy': _t('Partly cloudy'), overcast: _t('Overcast'), fog: _t('Fog'),
  drizzle: _t('Drizzle'), 'rain-light': _t('Light rain'), rain: _t('Rain'), 'rain-heavy': _t('Heavy rain'), showers: _t('Rain showers'), 'showers-heavy': _t('Heavy showers'),
  thunderstorm: _t('Thunderstorm'), 'thunder-hail': _t('Thunderstorm with hail'), snow: _t('Snow'),
};
export function conditionIcon(c: Condition, isDay = true): string {
  switch (c) {
    case 'clear': return isDay ? '☀️' : '🌙';
    case 'mainly-clear': return isDay ? '🌤️' : '🌙';
    case 'partly-cloudy': return '⛅';
    case 'overcast': return '☁️';
    case 'fog': return '🌫️';
    case 'drizzle': case 'rain-light': return '🌦️';
    case 'rain': case 'showers': return '🌧️';
    case 'rain-heavy': case 'showers-heavy': return '🌧️';
    case 'thunderstorm': case 'thunder-hail': return '⛈️';
    case 'snow': return '🌨️';
  }
}
/** A hint the park can act on: wind and storms pause the ziplines, heavy rain the trails. */
export function conditionAdvice(now: WeatherNow): string | null {
  if (now.condition === 'thunderstorm' || now.condition === 'thunder-hail') return _t('Storms pause the ziplines and the quads until they pass.');
  if (now.gustKmh >= 45) return _t('Strong gusts: the ziplines may pause until the wind drops.');
  if (now.condition === 'rain-heavy' || now.condition === 'showers-heavy') return _t('Heavy rain: trails get slippery and some activities wait for it to pass.');
  if (now.condition === 'rain' || now.condition === 'showers' || now.condition === 'rain-light' || now.condition === 'drizzle') return _t('Showers in the valley come and go; bring a light rain jacket.');
  if (now.tempC >= 31) return _t('Hot day: water, a hat and sunscreen.');
  return null;
}
