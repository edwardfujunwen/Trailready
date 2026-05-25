import { useEffect } from 'react';
import { fetchForecast } from '../api/nws';
import { useWeatherStore } from '../store/useWeatherStore';
import { useTripStore } from '../store/useTripStore';

export function useWeather() {
  const location = useTripStore((s) => s.location);
  const { setPeriods, setLoading, setError } = useWeatherStore();

  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    setLoading(true);
    fetchForecast(location.lat, location.lon)
      .then((periods) => { if (!cancelled) { setPeriods(periods); setLoading(false); } })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [location?.lat, location?.lon]);
}
