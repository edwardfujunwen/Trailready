import type { ForecastPeriod } from '../../types/weather';

interface Props {
  period: ForecastPeriod;
}

function getPrecipColor(pct: number) {
  if (pct >= 60) return 'text-blue-400';
  if (pct >= 30) return 'text-sky-400';
  return 'text-stone-500';
}

export function getWeatherIcon(condition: string): string {
  const c = condition.toLowerCase();

  // Thunderstorm / lightning
  if (c.includes('thunder') || c.includes('lightning') || c.includes('t-storm')) return '⛈️';

  // Heavy rain / showers
  if (c.includes('heavy rain') || c.includes('heavy shower')) return '🌧️';

  // Rain / drizzle / showers
  if (c.includes('rain') || c.includes('shower') || c.includes('drizzle')) return '🌦️';

  // Snow / blizzard / flurries / sleet / freezing
  if (
    c.includes('blizzard') ||
    c.includes('heavy snow') ||
    c.includes('snow squall')
  )
    return '🌨️';
  if (
    c.includes('snow') ||
    c.includes('flurr') ||
    c.includes('sleet') ||
    c.includes('freezing') ||
    c.includes('ice')
  )
    return '❄️';

  // Fog / haze / smoke / dust
  if (c.includes('fog') || c.includes('haze') || c.includes('mist')) return '🌫️';
  if (c.includes('smoke') || c.includes('dust') || c.includes('sand')) return '🌫️';

  // Windy / breezy
  if (c.includes('wind') || c.includes('breezy') || c.includes('blustery')) return '💨';

  // Hot / very hot
  if (c.includes('hot') || c.includes('heat')) return '🌡️';

  // Overcast / mostly cloudy
  if (c.includes('overcast') || c.includes('mostly cloudy') || c.includes('cloudy')) return '☁️';

  // Partly cloudy / partly sunny / mostly sunny
  if (
    c.includes('partly cloudy') ||
    c.includes('partly sunny') ||
    c.includes('mostly sunny') ||
    c.includes('mix')
  )
    return '⛅';

  // Sunny / clear
  if (c.includes('sunny') || c.includes('clear')) return '☀️';

  // Fallback
  return '🌤️';
}

export default function WeatherCard({ period }: Props) {
  const precip = period.probabilityOfPrecipitation ?? 0;
  const icon = getWeatherIcon(period.shortForecast);

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-stone-800 last:border-0">
      {/* Day label */}
      <p className="text-xs font-semibold text-stone-400 w-16 flex-shrink-0">{period.name}</p>

      {/* Weather icon + short forecast */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-base leading-none flex-shrink-0" role="img" aria-label={period.shortForecast}>
          {icon}
        </span>
        <p className="text-xs text-stone-500 min-w-0 truncate">{period.shortForecast}</p>
      </div>

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
