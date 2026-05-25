import { useState, useCallback, useEffect, useRef } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { useTrailStore } from '../../store/useTrailStore';
import { parseGpx } from '../../utils/gpx';
import type { NearbyTrail } from '../../store/useTrailStore';
import TrailDetailPanel from './TrailDetailPanel';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ── Overpass (OSM) helpers ───────────────────────────────────────────────────

function buildGeoJSON(element: any): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: (element.members || [])
      .filter((m: any) => m.geometry?.length >= 2)
      .map((m: any) => ({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: m.geometry.map((pt: any) => [pt.lon, pt.lat]) },
        properties: {},
      })),
  };
}

function haversineMi(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function calcDistanceMi(geojson: GeoJSON.FeatureCollection) {
  let total = 0;
  for (const f of geojson.features) {
    if (f.geometry.type === 'LineString') {
      const c = f.geometry.coordinates as [number, number][];
      for (let i = 1; i < c.length; i++) total += haversineMi(c[i-1][1], c[i-1][0], c[i][1], c[i][0]);
    }
  }
  return total;
}

// ── Filter types ─────────────────────────────────────────────────────────────

type LengthFilter = 'all' | 'short' | 'day' | 'backpacking';
const LENGTH_LABELS: Record<LengthFilter, string> = { all: 'All', short: '< 5 mi', day: '5–15 mi', backpacking: '15+ mi' };

type DifficultyFilter = 'all' | 'easy' | 'moderate' | 'hard';
const DIFFICULTY_LABELS: Record<DifficultyFilter, string> = { all: 'All', easy: 'Easy', moderate: 'Moderate', hard: 'Hard' };

function inferDifficulty(trail: NearbyTrail): DifficultyFilter {
  // Use explicit difficulty field if available
  if (trail.difficulty) {
    const d = trail.difficulty.toLowerCase();
    if (d.includes('easy') || d.includes('beginner')) return 'easy';
    if (d.includes('hard') || d.includes('strenuous') || d.includes('expert')) return 'hard';
    return 'moderate';
  }
  // Fall back to distance heuristic
  if (trail.distanceMi <= 0) return 'moderate';
  if (trail.distanceMi < 5) return 'easy';
  if (trail.distanceMi <= 12) return 'moderate';
  return 'hard';
}

// ── Difficulty badge ─────────────────────────────────────────────────────────

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const d = difficulty.toLowerCase();
  const color = d.includes('easy') ? 'text-green-400 bg-green-900/40'
    : d.includes('moderate') ? 'text-yellow-400 bg-yellow-900/40'
    : d.includes('strenuous') || d.includes('hard') ? 'text-red-400 bg-red-900/40'
    : 'text-stone-400 bg-stone-800';
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${color}`}>{difficulty}</span>;
}

// ── Main component ───────────────────────────────────────────────────────────

export default function TrailList() {
  const location = useTripStore((s) => s.location);
  const { nearbyTrails, loadingTrails, trailError, loadedTrail, activeParkCode } = useTrailStore();
  const { setNearbyTrails, setLoadingTrails, setTrailError, setLoadedTrail, clearTrail, setActiveParkCode } = useTrailStore();
  const parkCode = activeParkCode ?? '';

  const [nameFilter, setNameFilter] = useState('');
  const [lengthFilter, setLengthFilter] = useState<LengthFilter>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [loadingTrailId, setLoadingTrailId] = useState<string | null>(null);
  const [gpxError, setGpxError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'nps' | 'osm' | null>(null);
  const [parkName, setParkName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevLocationKeyRef = useRef<string | null>(null);

  const searchTrails = useCallback(async () => {
    if (!location) return;
    setLoadingTrails(true);
    setTrailError(null);
    setDataSource(null);
    setParkName(null);

    try {
      // ── Step 1: Try OSM first (global coverage, rich attributes) ──
      try {
        const osmRes = await fetch(`${API}/api/osm/trails?lat=${location.lat}&lon=${location.lon}`);
        const osmData = await osmRes.json();
        if (osmRes.ok && Array.isArray(osmData) && osmData.length > 0) {
          const trails: NearbyTrail[] = osmData.map((t: any) => ({
            id: t.id,
            name: t.name,
            distanceMi: t.distanceMi,
            source: 'osm' as const,
            difficulty: t.difficulty ?? undefined,
            lat: t.lat,
            lon: t.lon,
            routeType: t.routeType ?? undefined,
          }));
          setNearbyTrails(trails);
          setDataSource('osm');
          setActiveParkCode(null);
          setLoadingTrails(false);
          return;
        }
      } catch { /* fall through to NPS */ }

      // ── Step 2: OSM returned nothing — check NPS as fallback ──
      const parkRes = await fetch(
        `${API}/api/nps/park?lat=${location.lat}&lon=${location.lon}&q=${encodeURIComponent(location.name)}`
      );
      const parkData = await parkRes.json();

      if (parkData.park) {
        const trailsRes = await fetch(`${API}/api/nps/trails?parkCode=${parkData.park.parkCode}`);
        const trailsData = await trailsRes.json();

        if (trailsData.trails?.length > 0) {
          const trails: NearbyTrail[] = trailsData.trails.map((t: any) => ({
            id: t.id,
            name: t.name,
            distanceMi: t.distanceMi,
            source: 'nps' as const,
            activities: t.activities || [],
          }));
          setNearbyTrails(trails);
          setDataSource('nps');
          setParkName(parkData.park.fullName);
          setActiveParkCode(parkData.park.parkCode);
          setLoadingTrails(false);
          return;
        }
      }

      // ── Nothing found — show GPX prompt ──
      setNearbyTrails([]);
      setDataSource('none' as any);
    } catch (err: any) {
      setTrailError(err.message);
    } finally {
      setLoadingTrails(false);
    }
  }, [location, setLoadingTrails, setTrailError, setNearbyTrails, setActiveParkCode]);

  // Auto-search when location changes
  useEffect(() => {
    if (!location) return;
    const key = `${location.lat},${location.lon}`;
    if (key === prevLocationKeyRef.current) return;
    prevLocationKeyRef.current = key;
    searchTrails();
  }, [location, searchTrails]);

  // Click handler — NPS: fetch geometry from NPS ArcGIS; OSM: fetch via /api/osm/trail-geom
  const handleTrailClick = useCallback(async (trail: NearbyTrail) => {
    if (trail.source === 'nps') {
      setLoadingTrailId(trail.id);
      try {
        const res = await fetch(
          `${API}/api/nps/trail-geom?parkCode=${parkCode}&name=${encodeURIComponent(trail.name)}`
        );
        const geojson: GeoJSON.FeatureCollection = await res.json();
        if (res.ok && geojson.features?.length > 0) {
          // Calculate total distance from all segments
          const dist = geojson.features.reduce((sum, f) => {
            if (f.geometry.type === 'LineString') {
              const c = f.geometry.coordinates as [number, number][];
              for (let i = 1; i < c.length; i++) sum += haversineMi(c[i-1][1], c[i-1][0], c[i][1], c[i][0]);
            }
            return sum;
          }, 0);
          setLoadedTrail({ name: trail.name, geojson, source: 'search', distanceMi: dist });
          setLoadingTrailId(null);
          return;
        }
      } catch { /* fall through */ }
      // Fallback: no geometry — zoom to trail location point
      setLoadedTrail({ name: trail.name, source: 'search', distanceMi: 0, lat: trail.lat ?? location?.lat, lon: trail.lon ?? location?.lon });
      setLoadingTrailId(null);
      return;
    }

    // OSM trail — fetch geometry on demand using /api/osm/trail-geom
    if (trail.geojson) {
      setLoadedTrail({ name: trail.name, geojson: trail.geojson, source: 'search', distanceMi: trail.distanceMi });
      return;
    }
    setLoadingTrailId(trail.id);
    try {
      const trailLat = trail.lat ?? location?.lat ?? 0;
      const trailLon = trail.lon ?? location?.lon ?? 0;
      const res = await fetch(
        `${API}/api/osm/trail-geom?name=${encodeURIComponent(trail.name)}&lat=${trailLat}&lon=${trailLon}`
      );
      const geojson: GeoJSON.FeatureCollection = await res.json();
      if (!res.ok) throw new Error((geojson as any).error || 'Failed to load trail');
      if (!geojson.features?.length) throw new Error('Trail geometry not found');
      const distanceMi = trail.distanceMi > 0 ? trail.distanceMi : calcDistanceMi(geojson);
      setNearbyTrails(nearbyTrails.map((t) => t.id === trail.id ? { ...t, geojson, distanceMi } : t));
      setLoadedTrail({ name: trail.name, geojson, source: 'search', distanceMi });
    } catch (err: any) {
      // Fallback: show point on map even if geometry fetch fails
      setLoadedTrail({ name: trail.name, source: 'search', distanceMi: trail.distanceMi, lat: trail.lat ?? location?.lat, lon: trail.lon ?? location?.lon });
    } finally {
      setLoadingTrailId(null);
    }
  }, [nearbyTrails, location, setLoadedTrail, setNearbyTrails, setTrailError, parkCode]);

  const handleGpxFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.gpx')) { setGpxError('Please upload a .gpx file'); return; }
    setGpxError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = parseGpx(e.target?.result as string);
        setLoadedTrail({ name: result.name, geojson: result.geojson, source: 'gpx', distanceMi: result.distanceMi });
      } catch (err: any) { setGpxError(err.message || 'Failed to parse GPX file'); }
    };
    reader.readAsText(file);
  }, [setLoadedTrail]);

  const filteredTrails = nearbyTrails.filter((t) => {
    const matchesName = !nameFilter || t.name.toLowerCase().includes(nameFilter.toLowerCase());
    const matchesLength = lengthFilter === 'all'
      || (lengthFilter === 'short' && t.distanceMi > 0 && t.distanceMi < 5)
      || (lengthFilter === 'day' && t.distanceMi >= 5 && t.distanceMi < 15)
      || (lengthFilter === 'backpacking' && t.distanceMi >= 15);
    const matchesDifficulty = difficultyFilter === 'all' || inferDifficulty(t) === difficultyFilter;
    return matchesName && matchesLength && matchesDifficulty;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-2.5 pb-2 flex items-center justify-between flex-shrink-0">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
            {nearbyTrails.length > 0 ? `${nearbyTrails.length} Trails Found` : 'Nearby Trails'}
          </h2>
          {parkName && (
            <p className="text-[10px] text-forest-400 mt-0.5 truncate">📍 {parkName}</p>
          )}
          {dataSource === 'osm' && nearbyTrails.length > 0 && (
            <p className="text-[10px] text-stone-500 mt-0.5">via OpenStreetMap</p>
          )}
          {dataSource === 'nps' && nearbyTrails.length > 0 && (
            <p className="text-[10px] text-stone-500 mt-0.5">via NPS</p>
          )}
        </div>
        <button onClick={() => fileInputRef.current?.click()}
          className="text-xs text-stone-400 hover:text-stone-200 flex items-center gap-1 transition-colors flex-shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          GPX
        </button>
        <input ref={fileInputRef} type="file" accept=".gpx" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleGpxFile(f); e.target.value = ''; }} />
      </div>

      {/* Loaded GPX badge */}
      {loadedTrail?.source === 'gpx' && (
        <div className="mx-3 mb-2 bg-stone-800 border border-blue-500/40 rounded-lg px-3 py-2 flex items-center gap-2 flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-4.724A1 1 0 013 14.382V5a1 1 0 011-1h16a1 1 0 011 1v9.382a1 1 0 01-.553.894L15 20m-6 0v-4a1 1 0 011-1h4a1 1 0 011 1v4m-6 0h6" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-stone-100 truncate">{loadedTrail.name}</p>
            {loadedTrail.distanceMi !== undefined && (
              <p className="text-xs text-stone-400">{loadedTrail.distanceMi.toFixed(1)} mi · GPX</p>
            )}
          </div>
          <button onClick={clearTrail} className="text-stone-500 hover:text-stone-300">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {gpxError && <p className="mx-3 mb-2 text-xs text-red-400 flex-shrink-0">{gpxError}</p>}

      {/* Filters */}
      {nearbyTrails.length > 0 && (
        <div className="px-3 pb-2 space-y-1.5 flex-shrink-0">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)}
              placeholder={`Filter ${nearbyTrails.length} trails...`}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-forest-500" />
          </div>
          {/* Difficulty filter */}
          <div className="flex gap-1">
            {(Object.keys(DIFFICULTY_LABELS) as DifficultyFilter[]).map((f) => {
              const colors: Record<DifficultyFilter, string> = {
                all: 'bg-forest-600 text-white',
                easy: 'bg-green-700 text-white',
                moderate: 'bg-yellow-700 text-white',
                hard: 'bg-red-700 text-white',
              };
              const inactive = 'bg-stone-700 text-stone-400 hover:bg-stone-600';
              return (
                <button key={f} onClick={() => setDifficultyFilter(f)}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${difficultyFilter === f ? colors[f] : inactive}`}>
                  {DIFFICULTY_LABELS[f]}
                </button>
              );
            })}
          </div>

          {/* Show length filter whenever trails have distance data */}
          {nearbyTrails.some((t) => t.distanceMi > 0) && (
            <div className="flex gap-1 flex-wrap">
              {(Object.keys(LENGTH_LABELS) as LengthFilter[]).map((f) => (
                <button key={f} onClick={() => setLengthFilter(f)}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${lengthFilter === f ? 'bg-forest-600 text-white' : 'bg-stone-700 text-stone-400 hover:bg-stone-600'}`}>
                  {LENGTH_LABELS[f]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {trailError && (
        <div className="mx-3 mb-2 px-3 py-2 bg-red-900/30 border border-red-700/50 rounded-lg text-xs text-red-400 flex-shrink-0">
          {trailError}
          <button onClick={searchTrails} className="ml-2 underline hover:text-red-300">Retry</button>
        </div>
      )}

      {loadingTrails && (
        <div className="flex flex-col items-center justify-center gap-2 py-6 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <div className="w-4 h-4 border-2 border-forest-500 border-t-transparent rounded-full animate-spin" />
            Finding trails nearby...
          </div>
          <p className="text-[10px] text-stone-600">Searching OpenStreetMap — may take up to 30 sec</p>
        </div>
      )}

      {!loadingTrails && nearbyTrails.length === 0 && !trailError && (
        <div className="px-4 py-5 flex-shrink-0">
          {location ? (
            <div className="text-center space-y-3">
              <p className="text-sm font-medium text-stone-300">No trails found nearby</p>
              <p className="text-xs text-stone-500 leading-relaxed">
                No named trails were found in OpenStreetMap or NPS for this area. Try uploading a GPX file from AllTrails, Garmin, or CalTopo.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 bg-forest-700 hover:bg-forest-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload GPX from AllTrails
              </button>
              <p className="text-[10px] text-stone-600">
                On AllTrails: open any trail → ··· → Export to GPX
              </p>
            </div>
          ) : (
            <p className="text-xs text-stone-500 text-center">Search a location above to find nearby trails</p>
          )}
        </div>
      )}

      {/* Trail list */}
      <div className="flex-1 overflow-y-auto">
        {filteredTrails.map((trail) => {
          const isActive = loadedTrail?.name === trail.name && loadedTrail?.source === 'search';
          const isLoadingThis = loadingTrailId === trail.id;

          return (
            <div key={trail.id}
              className={`border-b border-stone-800 ${isActive ? 'bg-blue-500/15 border-l-2 border-l-blue-500' : ''}`}>
              <div
                className={`px-3 py-3 cursor-pointer transition-colors ${isActive ? '' : 'hover:bg-stone-700/40'}`}
                onClick={() => !isLoadingThis && handleTrailClick(trail)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${isActive ? 'text-blue-300' : 'text-stone-100'}`}>
                      {trail.name}
                    </p>

                    {/* NPS trail */}
                    {trail.source === 'nps' && (
                      <p className="text-xs text-stone-500 mt-0.5">
                        {trail.distanceMi > 0 ? `${trail.distanceMi.toFixed(1)} mi` : 'Tap to load on map'}
                      </p>
                    )}

                    {/* OSM trail */}
                    {trail.source === 'osm' && (
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <p className="text-xs text-stone-500">
                          {trail.distanceMi > 0 ? `${trail.distanceMi.toFixed(1)} mi` : 'Tap to load details'}
                        </p>
                        {trail.routeType && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            trail.routeType === 'Loop'
                              ? 'bg-emerald-900/50 text-emerald-400'
                              : trail.routeType === 'Out & Back'
                              ? 'bg-sky-900/50 text-sky-400'
                              : 'bg-stone-700/50 text-stone-400'
                          }`}>
                            {trail.routeType}
                          </span>
                        )}
                        {trail.difficulty && (
                          <DifficultyBadge difficulty={
                            trail.difficulty === 'hiking' ? 'Easy'
                            : trail.difficulty === 'mountain_hiking' ? 'Moderate'
                            : trail.difficulty === 'demanding_mountain_hiking' ? 'Hard'
                            : trail.difficulty === 'alpine_hiking' ? 'Strenuous'
                            : trail.difficulty
                          } />
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-1 mt-0.5">
                    {isLoadingThis && <div className="w-3.5 h-3.5 border-2 border-forest-500 border-t-transparent rounded-full animate-spin" />}
                    {isActive && !isLoadingThis && <span className="text-[10px] text-blue-400">On map</span>}
                  </div>
                </div>
              </div>
              {isActive && (
                <TrailDetailPanel
                  trail={{ name: trail.name, distanceMi: trail.distanceMi, lat: trail.lat, lon: trail.lon }}
                />
              )}
            </div>
          );
        })}

        {filteredTrails.length === 0 && nearbyTrails.length > 0 && !loadingTrails && (
          <p className="text-xs text-stone-500 text-center px-3 py-4">No trails match your filter</p>
        )}
      </div>
    </div>
  );
}
