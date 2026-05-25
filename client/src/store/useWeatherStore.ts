import { create } from 'zustand';
import type { ForecastPeriod, WeatherSummary } from '../types/weather';

interface WeatherState {
  periods: ForecastPeriod[];
  loading: boolean;
  error: string | null;
  setPeriods: (periods: ForecastPeriod[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  summary: WeatherSummary | null;
}

function computeSummary(periods: ForecastPeriod[]): WeatherSummary | null {
  if (!periods.length) return null;
  const day = periods.filter((p) => p.isDaytime);
  const night = periods.filter((p) => !p.isDaytime);
  const tempHighF = Math.max(...day.map((p) => p.temperature));
  const tempLowF = Math.min(...night.map((p) => p.temperature));
  const maxPrecip = Math.max(...periods.map((p) => p.probabilityOfPrecipitation ?? 0));
  const precipRisk: 'low' | 'medium' | 'high' = maxPrecip >= 60 ? 'high' : maxPrecip >= 30 ? 'medium' : 'low';
  const windSpeed = day[0]?.windSpeed || 'unknown';
  const conditions = day[0]?.shortForecast || '';
  return { tempHighF, tempLowF, precipRisk, windSpeed, conditions };
}

export const useWeatherStore = create<WeatherState>()((set) => ({
  periods: [],
  loading: false,
  error: null,
  summary: null,
  setPeriods: (periods) => set({ periods, summary: computeSummary(periods), error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}));
