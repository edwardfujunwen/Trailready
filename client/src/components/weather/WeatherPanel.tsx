import { useWeatherStore } from '../../store/useWeatherStore';
import { useTripStore } from '../../store/useTripStore';
import WeatherCard from './WeatherCard';

export default function WeatherPanel() {
  const { periods, loading, error, summary } = useWeatherStore();
  const location = useTripStore((s) => s.location);
  const checkin = useTripStore((s) => s.checkin);
  const checkout = useTripStore((s) => s.checkout);

  const filteredPeriods = (() => {
    if (!checkin || !checkout || !periods.length) return periods.slice(0, 14);
    const start = new Date(checkin);
    const end = new Date(checkout);
    end.setDate(end.getDate() + 1);
    return periods.filter((p) => {
      const t = new Date(p.startTime);
      return t >= start && t <= end;
    });
  })();

  if (!location) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="text-stone-600">
          <svg className="w-10 h-10 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
          <p className="text-sm">Weather loads after searching a location</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-forest-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-950 border border-red-800 rounded-lg p-3 text-sm text-red-400">
          Weather unavailable: {error}
        </div>
      </div>
    );
  }

  const displayPeriods = filteredPeriods.length ? filteredPeriods : periods.slice(0, 14);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Summary bar */}
      {summary && (
        <div className="flex gap-2 px-3 py-2 border-b border-stone-800 flex-shrink-0">
          <div className="flex-1 bg-stone-800 rounded-lg p-2 text-center">
            <p className="text-[10px] text-stone-500">Temp Range</p>
            <p className="text-xs font-bold text-stone-100">{summary.tempLowF}°–{summary.tempHighF}°F</p>
          </div>
          <div className="flex-1 bg-stone-800 rounded-lg p-2 text-center">
            <p className="text-[10px] text-stone-500">Rain Risk</p>
            <p className={`text-xs font-bold ${summary.precipRisk === 'high' ? 'text-blue-400' : summary.precipRisk === 'medium' ? 'text-sky-400' : 'text-green-400'}`}>
              {summary.precipRisk.charAt(0).toUpperCase() + summary.precipRisk.slice(1)}
            </p>
          </div>
        </div>
      )}

      {/* Column headers */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-stone-800 flex-shrink-0">
        <p className="text-[10px] text-stone-600 uppercase tracking-wide w-16 flex-shrink-0">Period</p>
        <p className="text-[10px] text-stone-600 uppercase tracking-wide flex-1">Conditions</p>
        <p className="text-[10px] text-stone-600 uppercase tracking-wide w-10 text-right">Rain</p>
        <p className="text-[10px] text-stone-600 uppercase tracking-wide w-14 text-right">Wind</p>
        <p className="text-[10px] text-stone-600 uppercase tracking-wide w-10 text-right">Temp</p>
      </div>

      {/* Scrollable forecast rows */}
      <div className="flex-1 overflow-y-auto">
        {displayPeriods.map((period) => (
          <WeatherCard key={period.number} period={period} />
        ))}
      </div>
    </div>
  );
}
