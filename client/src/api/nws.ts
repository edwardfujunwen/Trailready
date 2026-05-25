import type { ForecastPeriod } from '../types/weather';

const BASE = 'https://api.weather.gov';

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'TrailReady/1.0 (backpackplanner@example.com)' } });
    if (res.ok) return res;
    if (res.status === 503 && i < retries - 1) {
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      continue;
    }
    throw new Error(`NWS API error: ${res.status}`);
  }
  throw new Error('NWS API unavailable after retries');
}

export async function fetchForecast(lat: number, lon: number): Promise<ForecastPeriod[]> {
  const pointsRes = await fetchWithRetry(`${BASE}/points/${lat.toFixed(4)},${lon.toFixed(4)}`);
  const pointsData = await pointsRes.json();
  const forecastUrl = pointsData.properties?.forecast;
  if (!forecastUrl) throw new Error('NWS: no forecast URL in points response');

  const forecastRes = await fetchWithRetry(forecastUrl);
  const forecastData = await forecastRes.json();
  const periods: ForecastPeriod[] = forecastData.properties?.periods || [];

  return periods.map((p: any) => ({
    ...p,
    probabilityOfPrecipitation: p.probabilityOfPrecipitation?.value ?? 0,
  }));
}
