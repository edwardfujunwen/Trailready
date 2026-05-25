import { useState, useEffect, useRef, useCallback } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { useTrailStore } from '../../store/useTrailStore';
import KayakingRouteDetailPanel from './KayakingRouteDetailPanel';

const API = 'http://localhost:3001';

interface KayakRoute {
  id: string;
  name: string;
  distanceMi: number;
  difficulty?: string;
  waterType?: string;
  surface?: string;
  use?: string;
  description?: string;
  source: 'nps' | 'americanwhitewater' | 'ai';
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const lower = difficulty.toLowerCase();
  let colorClass = 'text-blue-400 bg-blue-900/40';
  if (lower.includes('class iv') || lower.includes('class v')) {
    colorClass = 'text-red-400 bg-red-900/40';
  } else if (lower.includes('class iii')) {
    colorClass = 'text-yellow-400 bg-yellow-900/40';
  } else if (lower.includes('class ii') || lower.includes('class i')) {
    colorClass = 'text-green-400 bg-green-900/40';
  }
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${colorClass}`}>
      {difficulty}
    </span>
  );
}

export default function KayakRouteList() {
  const location = useTripStore((s) => s.location);
  const locationName = useTripStore((s) => s.location?.name);
  const setLoadedTrail = useTrailStore((s) => s.setLoadedTrail);

  const [routes, setRoutes] = useState<KayakRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const prevLocationKeyRef = useRef<string | null>(null);

  const fetchRoutes = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    setError(null);
    try {
      const qParam = location.name ? `&q=${encodeURIComponent(location.name)}` : '';
      const url = `${API}/api/kayaking/routes?lat=${location.lat}&lon=${location.lon}${qParam}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load water trails');
      } else {
        setRoutes(data || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    if (!location) return;
    const key = `${location.lat},${location.lon}`;
    if (key === prevLocationKeyRef.current) return;
    prevLocationKeyRef.current = key;
    fetchRoutes();
  }, [location, fetchRoutes]);

  const handleRouteClick = useCallback((route: KayakRoute) => {
    setActiveRouteId(route.id);
    setLoadedTrail({
      name: route.name,
      source: 'search',
      distanceMi: route.distanceMi,
    });
  }, [setLoadedTrail]);

  const filteredRoutes = routes.filter((r) =>
    !nameFilter || r.name.toLowerCase().includes(nameFilter.toLowerCase())
  );

  // Source counts for header label
  const awCount = routes.filter((r) => r.source === 'americanwhitewater').length;
  const sourceLabel = awCount > 0 ? 'NPS + American Whitewater' : 'NPS national trails dataset';

  if (!location) {
    return (
      <div className="px-4 py-5 text-xs text-stone-500 text-center">
        Search a location above to find water trails nearby
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-2.5 pb-2 flex-shrink-0">
        <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
          {routes.length > 0 ? `${routes.length} Water Trails Found` : 'Kayaking / Water Trails'}
        </h2>
        <p className="text-[10px] text-stone-600 mt-0.5 truncate">📍 {location.name}</p>
        {routes.length > 0 && (
          <p className="text-[10px] text-stone-600">via {sourceLabel}</p>
        )}
      </div>

      {/* Filter */}
      {routes.length > 0 && (
        <div className="px-3 pb-2 flex-shrink-0">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder={`Filter ${routes.length} water trails...`}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mx-3 mb-2 px-3 py-2 bg-red-900/30 border border-red-700/50 rounded-lg text-xs text-red-400 flex-shrink-0">
          {error}
          <button onClick={fetchRoutes} className="ml-2 underline hover:text-red-300">Retry</button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-stone-500 flex-shrink-0">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Finding water trails...
        </div>
      )}

      {!loading && routes.length === 0 && !error && (
        <div className="px-4 py-5 text-center space-y-2">
          <p className="text-sm font-medium text-stone-300">No paddling routes found</p>
          <p className="text-xs text-stone-500 leading-relaxed">
            No paddling routes found. Try searching near a river valley, lake, or coastline.
          </p>
        </div>
      )}

      {/* Route list */}
      <div className="flex-1 overflow-y-auto">
        {filteredRoutes.map((route) => {
          const isActive = activeRouteId === route.id;

          return (
            <div key={route.id} className="border-b border-stone-800">
              <div
                className={`px-3 py-3 cursor-pointer transition-colors ${isActive ? 'bg-blue-500/15 border-l-2 border-l-blue-500' : 'hover:bg-stone-700/40'}`}
                onClick={() => handleRouteClick(route)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`text-xs font-semibold truncate ${isActive ? 'text-blue-300' : 'text-stone-100'}`}>
                        {route.name}
                      </p>
                      {route.source === 'americanwhitewater' && (
                        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-cyan-900/50 text-cyan-400 border border-cyan-700/40 flex-shrink-0">
                          AW
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {route.difficulty && (
                        <DifficultyBadge difficulty={route.difficulty} />
                      )}
                      {route.waterType && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded text-stone-400 bg-stone-700/50 capitalize">
                          {route.waterType}
                        </span>
                      )}
                      {!route.difficulty && route.surface && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-blue-400 bg-blue-900/40">
                          {route.surface}
                        </span>
                      )}
                      {route.distanceMi > 0 && (
                        <span className="text-[10px] text-stone-400">{route.distanceMi.toFixed(1)} mi</span>
                      )}
                    </div>
                    {route.use && !route.description && (
                      <p className="text-[10px] text-stone-500 mt-1 truncate">{route.use}</p>
                    )}
                    {route.description && (
                      <p className="text-[10px] text-stone-500 mt-1 leading-relaxed line-clamp-2">{route.description}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 mt-0.5">
                    {isActive && <span className="text-[10px] text-blue-400">Selected</span>}
                  </div>
                </div>
              </div>
              {isActive && (
                <KayakingRouteDetailPanel
                  name={route.name}
                  distanceMi={route.distanceMi > 0 ? route.distanceMi : undefined}
                  locationName={locationName}
                />
              )}
            </div>
          );
        })}

        {filteredRoutes.length === 0 && routes.length > 0 && !loading && (
          <p className="text-xs text-stone-500 text-center px-3 py-4">No routes match your filter</p>
        )}
      </div>
    </div>
  );
}
