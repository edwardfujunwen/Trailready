import { useState, useEffect, useRef, useCallback } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { useTrailStore } from '../../store/useTrailStore';
import ClimbingRouteDetailPanel from './ClimbingRouteDetailPanel';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type TypeFilter = 'All' | 'Sport' | 'Trad' | 'Boulder' | 'Tr' | 'Alpine' | 'Aid';

interface ClimbingRoute {
  id: string;
  name: string;
  type: string;       // e.g. "Sport", "Trad, Sport", "Bouldering"
  rating: string;     // e.g. "5.10a", "V4", "?"
  location: string;   // e.g. "Yosemite Valley > El Capitan"
  latitude?: number;
  longitude?: number;
  fa?: string;        // first ascent
}

const TYPE_COLORS: Record<string, string> = {
  Sport:     'text-blue-400 bg-blue-900/40',
  Trad:      'text-orange-400 bg-orange-900/40',
  Bouldering:'text-purple-400 bg-purple-900/40',
  Tr:        'text-green-400 bg-green-900/40',
  Aid:       'text-yellow-400 bg-yellow-900/40',
  Alpine:    'text-indigo-400 bg-indigo-900/40',
};

function TypeBadge({ type }: { type: string }) {
  const label = type === 'Bouldering' ? 'Boulder' : type;
  const color = TYPE_COLORS[type] || 'text-stone-400 bg-stone-800';
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${color}`}>{label}</span>;
}

export default function ClimbingRouteList() {
  const location = useTripStore((s) => s.location);
  const locationName = useTripStore((s) => s.location?.name);
  const setLoadedTrail = useTrailStore((s) => s.setLoadedTrail);

  const [routes, setRoutes] = useState<ClimbingRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const prevLocationKeyRef = useRef<string | null>(null);

  const fetchRoutes = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    setError(null);
    try {
      const url = `${API}/api/climbing/routes?lat=${location.lat}&lon=${location.lon}&q=${encodeURIComponent(location.name)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load climbing routes');
      } else {
        setRoutes(data.routes || []);
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

  const handleRouteClick = useCallback((route: ClimbingRoute) => {
    setActiveRouteId(route.id);
    if (route.latitude && route.longitude) {
      setLoadedTrail({
        name: route.name,
        source: 'search',
        lat: route.latitude,
        lon: route.longitude,
        distanceMi: 0,
      });
    }
  }, [setLoadedTrail]);

  const filteredRoutes = routes.filter((r) => {
    const matchesName = !nameFilter || r.name.toLowerCase().includes(nameFilter.toLowerCase());
    const matchesType = typeFilter === 'All' || r.type.includes(typeFilter);
    return matchesName && matchesType;
  });

  if (!location) {
    return (
      <div className="px-4 py-5 text-xs text-stone-500 text-center">
        Search a location above to find climbing routes nearby
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-2.5 pb-2 flex-shrink-0">
        <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
          {routes.length > 0 ? `${routes.length} Routes Found` : 'Climbing Routes'}
        </h2>
        <p className="text-[10px] text-stone-600 mt-0.5 truncate">📍 {location.name}</p>
        {routes.length > 0 && (
          <p className="text-[10px] text-stone-600">via OpenBeta · free & open source</p>
        )}
      </div>

      {/* Filters */}
      {routes.length > 0 && (
        <div className="px-3 pb-2 space-y-1.5 flex-shrink-0">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)}
              placeholder={`Filter ${routes.length} routes...`}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-forest-500" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {(['All', 'Sport', 'Trad', 'Bouldering', 'Tr', 'Alpine', 'Aid'] as const).map((f) => (
              <button key={f} onClick={() => setTypeFilter(f as TypeFilter)}
                className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${typeFilter === f ? 'bg-forest-600 text-white' : 'bg-stone-700 text-stone-400 hover:bg-stone-600'}`}>
                {f === 'Tr' ? 'Top Rope' : f === 'Bouldering' ? 'Boulder' : f}
              </button>
            ))}
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
          <div className="w-4 h-4 border-2 border-forest-500 border-t-transparent rounded-full animate-spin" />
          Finding climbing routes...
        </div>
      )}

      {!loading && routes.length === 0 && !error && (
        <div className="px-4 py-5 text-center space-y-2">
          <p className="text-sm font-medium text-stone-300">No routes found</p>
          <p className="text-xs text-stone-500 leading-relaxed">
            OpenBeta has data for popular climbing destinations. Try searching a specific area like "Yosemite Valley", "Red Rocks", or "Joshua Tree".
          </p>
        </div>
      )}

      {/* Route list */}
      <div className="flex-1 overflow-y-auto">
        {filteredRoutes.map((route) => {
          const isActive = activeRouteId === route.id;
          const types = route.type
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);

          return (
            <div key={route.id} className="border-b border-stone-800">
              <div
                className={`px-3 py-3 cursor-pointer transition-colors ${isActive ? 'bg-blue-500/15 border-l-2 border-l-blue-500' : 'hover:bg-stone-700/40'}`}
                onClick={() => handleRouteClick(route)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${isActive ? 'text-blue-300' : 'text-stone-100'}`}>
                      {route.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {types.map((t) => <TypeBadge key={t} type={t} />)}
                      {route.rating && route.rating !== '?' && (
                        <span className="text-[10px] font-bold text-stone-300 bg-stone-700 px-1.5 py-0.5 rounded">
                          {route.rating}
                        </span>
                      )}
                    </div>
                    {route.location && (
                      <p className="text-[10px] text-stone-500 mt-1 truncate">{route.location}</p>
                    )}
                    {route.fa && (
                      <p className="text-[10px] text-stone-600 mt-0.5 truncate">FA: {route.fa}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 mt-0.5">
                    {isActive && <span className="text-[10px] text-blue-400">On map</span>}
                  </div>
                </div>
              </div>
              {isActive && (
                <ClimbingRouteDetailPanel
                  name={route.name}
                  grade={route.rating !== '?' ? route.rating : undefined}
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
