import { useEffect, useRef, useCallback, useMemo } from 'react';
import Map, { Source, Layer, NavigationControl, Marker } from 'react-map-gl/maplibre';
import type { LayerProps } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTripStore } from '../../store/useTripStore';
import { useTrailStore } from '../../store/useTrailStore';
import { useCampsiteStore } from '../../store/useCampsiteStore';
import { useWeather } from '../../hooks/useWeather';

const waypointLayer: LayerProps = {
  id: 'waypoints',
  type: 'circle',
  paint: {
    'circle-radius': 6,
    'circle-color': '#f97316',
    'circle-stroke-color': '#fff',
    'circle-stroke-width': 2,
  },
};

const routeLayer: LayerProps = {
  id: 'route',
  type: 'line',
  paint: {
    'line-color': '#f97316',
    'line-width': 3,
    'line-dasharray': [2, 1],
  },
};

const loadedTrailLayer: LayerProps = {
  id: 'loaded-trail',
  type: 'line',
  paint: {
    'line-color': '#3b82f6',
    'line-width': 3,
    'line-opacity': 0.9,
  },
};

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export default function TrailMap() {
  useWeather();
  const mapRef = useRef<any>(null);
  const location = useTripStore((s) => s.location);
  const waypoints = useTripStore((s) => s.waypoints);
  const addWaypoint = useTripStore((s) => s.addWaypoint);
  const loadedTrail = useTrailStore((s) => s.loadedTrail);
  const campgrounds = useCampsiteStore((s) => s.campgrounds);

  // Derive trailhead coordinates from loaded trail
  const trailheadCoords = useMemo((): [number, number] | null => {
    if (!loadedTrail) return null;
    const geom = loadedTrail.geojson?.features?.[0]?.geometry;
    if (geom?.type === 'LineString' && (geom.coordinates as number[][]).length > 0) {
      const [lon, lat] = (geom.coordinates as number[][])[0];
      return [lat, lon];
    }
    if (loadedTrail.lat && loadedTrail.lon) {
      return [loadedTrail.lat, loadedTrail.lon];
    }
    return null;
  }, [loadedTrail]);

  // Fly to location when selected
  useEffect(() => {
    if (!location || !mapRef.current) return;
    mapRef.current.flyTo({ center: [location.lon, location.lat], zoom: 11, duration: 1500 });
  }, [location]);

  // Fit map to loaded trail — route bounds if geometry, else zoom to point
  useEffect(() => {
    if (!loadedTrail || !mapRef.current) return;

    if (loadedTrail.geojson) {
      const coords: number[][] = [];
      loadedTrail.geojson.features.forEach((f) => {
        if (f.geometry.type === 'LineString') coords.push(...(f.geometry.coordinates as number[][]));
      });
      if (coords.length >= 2) {
        const lons = coords.map((c) => c[0]);
        const lats = coords.map((c) => c[1]);
        mapRef.current.fitBounds(
          [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
          { padding: 60, duration: 1200 }
        );
      }
    } else if (loadedTrail.lat && loadedTrail.lon) {
      // No route geometry — just fly to the trail's location
      mapRef.current.flyTo({ center: [loadedTrail.lon, loadedTrail.lat], zoom: 14, duration: 1200 });
    }
  }, [loadedTrail]);

  const handleMapClick = useCallback(
    (e: any) => {
      if (!location) return;
      addWaypoint({ lat: e.lngLat.lat, lon: e.lngLat.lng });
    },
    [location, addWaypoint]
  );

  const waypointGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: waypoints.map((wp, i) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [wp.lon, wp.lat] },
      properties: { index: i },
    })),
  };

  const routeGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features:
      waypoints.length >= 2
        ? [{
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: waypoints.map((wp) => [wp.lon, wp.lat]) },
            properties: {},
          }]
        : [],
  };

  const emptyGeoJSON: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: -119.5383, latitude: 37.8651, zoom: 7 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        onClick={handleMapClick}
        cursor={location ? 'crosshair' : 'default'}
      >
        <NavigationControl position="top-right" />

        {/* Loaded trail route (blue line) */}
        <Source id="loaded-trail-source" type="geojson" data={loadedTrail?.geojson ?? emptyGeoJSON as GeoJSON.FeatureCollection}>
          <Layer {...loadedTrailLayer} />
        </Source>

        {/* Trail location pin — shown when we have a point but no route geometry */}
        {loadedTrail && !loadedTrail.geojson && loadedTrail.lat && loadedTrail.lon && (
          <Marker longitude={loadedTrail.lon} latitude={loadedTrail.lat} anchor="bottom">
            <div className="flex flex-col items-center">
              <div className="bg-blue-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap max-w-[140px] truncate">
                {loadedTrail.name}
              </div>
              <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-lg mt-0.5" />
            </div>
          </Marker>
        )}

        {/* Trailhead marker — green dot at first coordinate of the loaded trail */}
        {loadedTrail && trailheadCoords && (
          <Marker longitude={trailheadCoords[1]} latitude={trailheadCoords[0]} anchor="center">
            <div
              title={`🥾 Trailhead: ${loadedTrail.name}`}
              style={{
                background: '#22c55e',
                width: 12,
                height: 12,
                borderRadius: '50%',
                border: '2px solid white',
                boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
                cursor: 'pointer',
              }}
            />
          </Marker>
        )}

        {/* Campsite markers — amber diamond if sites available, gray if not */}
        {campgrounds.map((cg) => {
          if (!cg.lat || !cg.lon) return null;
          const availCount = cg.availableSites?.length ?? 0;
          const color = availCount > 0 ? '#f59e0b' : '#78716c';
          const label = availCount > 0 ? `${availCount} sites available` : 'Check availability';
          return (
            <Marker key={cg.id} longitude={cg.lon} latitude={cg.lat} anchor="center">
              <div
                title={`⛺ ${cg.name}\n${label}`}
                style={{
                  background: color,
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  border: '2px solid white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                  transform: 'rotate(45deg)',
                  cursor: 'pointer',
                }}
              />
            </Marker>
          );
        })}

        {/* Manual waypoints + route (orange) */}
        <Source id="waypoints-source" type="geojson" data={waypointGeoJSON}>
          <Layer {...waypointLayer} />
        </Source>
        <Source id="route-source" type="geojson" data={routeGeoJSON}>
          <Layer {...routeLayer} />
        </Source>
      </Map>

      {/* Trail badge */}
      {loadedTrail && (
        <div className="absolute top-3 left-3 bg-blue-900/90 border border-blue-700 rounded-lg px-3 py-1.5 text-xs text-blue-200 backdrop-blur-sm flex items-center gap-2">
          <div className="w-3 h-1 bg-blue-400 rounded" />
          {loadedTrail.name}
          {loadedTrail.distanceMi !== undefined && (
            <span className="text-blue-400">{loadedTrail.distanceMi.toFixed(1)} mi</span>
          )}
        </div>
      )}

      {!loadedTrail && location && waypoints.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-stone-900/90 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-400">
          {waypoints.length} waypoint{waypoints.length !== 1 ? 's' : ''} plotted
          <button onClick={() => useTripStore.getState().clearWaypoints()} className="ml-3 text-red-400 hover:text-red-300">
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
