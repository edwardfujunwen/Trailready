import type { ForecastPeriod } from '../../types/weather';

interface Props {
  period: ForecastPeriod;
}

function getPrecipColor(pct: number) {
  if (pct >= 60) return 'text-blue-400';
  if (pct >= 30) return 'text-sky-400';
  return 'text-stone-500';
}

export default function WeatherCard({ period }: Props) {
  const precip = period.probabilityOfPrecipitation ?? 0;
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-stone-800 last:border-0">
      {/* Day label */}
      <p className="text-xs font-semibold text-stone-400 w-16 flex-shrink-0">{period.name}</p>

      {/* Short forecast (icon-like text) */}
      <p className="text-xs text-stone-500 flex-1 min-w-0 truncate">{period.shortForecast}</p>

      {/* Rain chance */}
      {precip > 0 ? (
        <p className={`text-xs font-medium flex-shrink-0 w-10 text-right ${getPrecipColor(precip)}`}>
          💧{precip}%
        </p>
      ) : (
        <div className="w-10" />
      )}

      {/* Wind */}
      <p className="text-xs text-stone-600 flex-shrink-0 w-14 text-right">{period.windSpeed}</p>

      {/* Temperature */}
      <p className="text-sm font-bold text-stone-100 flex-shrink-0 w-10 text-right">
        {period.temperature}°{period.temperatureUnit}
      </p>
    </div>
  );
}
