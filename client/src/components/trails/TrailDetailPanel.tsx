import { useEffect, useState } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { useTrailStore } from '../../store/useTrailStore';
import ElevationChart from './ElevationChart';
import { API_BASE } from '../../api/base';

interface TrailDetail {
  name: string;
  // Real data
  surface?: string | null;
  allowedUses?: string | null;
  managedBy?: string | null;
  parkName?: string | null;
  trailheadElevFt?: number | null;
  // Fire
  fireRisk?: 'active' | 'none' | 'unknown';
  fireIncidents?: string[];
  // AI-generated
  description?: string | null;
  difficulty?: string | null;
  elevationGainFt?: number | null;
  highPointFt?: number | null;
  terrain?: string | null;
  bestSeason?: string | null;
  keyFeatures?: string[];
  permitRequired?: boolean | null;
  permitNotes?: string | null;
  wildlife?: string | null;
  warnings?: string | null;
}

interface TrailPhoto {
  url: string;
  credit: string;
  alt: string;
}

interface NpsAlert {
  title: string;
  description: string;
  category: string;
  url: string;
}

interface Props {
  trail: { name: string; distanceMi?: number; lat?: number; lon?: number };
}

const difficultyColors: Record<string, string> = {
  Easy: 'bg-green-900/60 text-green-300',
  Moderate: 'bg-yellow-900/60 text-yellow-300',
  Hard: 'bg-orange-900/60 text-orange-300',
  Strenuous: 'bg-red-900/60 text-red-300',
};

export default function TrailDetailPanel({ trail }: Props) {
  const [detail, setDetail] = useState<TrailDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<TrailPhoto[]>([]);
  const [alerts, setAlerts] = useState<NpsAlert[]>([]);
  const locationName = useTripStore((s) => s.location?.name);
  const activeParkCode = useTrailStore((s) => s.activeParkCode);
  const trailGeojson = useTrailStore((s) => s.loadedTrail?.geojson);
  const elevCoords = trailGeojson?.features?.[0]?.geometry?.type === 'LineString'
    ? (trailGeojson.features[0].geometry as GeoJSON.LineString).coordinates as [number, number][]
    : undefined;

  useEffect(() => {
    if (!trail?.name) return;
    setLoading(true);
    setDetail(null);
    const params = new URLSearchParams({ name: trail.name });
    if (trail.lat) params.set('lat', trail.lat.toString());
    if (trail.lon) params.set('lon', trail.lon.toString());
    if (trail.distanceMi) params.set('distanceMi', trail.distanceMi.toString());
    if (locationName) params.set('locationName', locationName);
    fetch(`${API_BASE}/api/trails/detail?${params}`)
      .then(r => r.json())
      .then(d => { setDetail(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [trail.name]);

  // Fetch trail photos
  useEffect(() => {
    if (!trail?.name) return;
    setPhotos([]);
    const params = new URLSearchParams({ name: trail.name });
    if (activeParkCode) params.set('parkCode', activeParkCode);
    fetch(`${API_BASE}/api/trails/photos?${params}`)
      .then(r => r.json())
      .then(d => { if (d.photos) setPhotos(d.photos); })
      .catch(() => { /* silently skip */ });
  }, [trail.name, activeParkCode]);

  // Fetch NPS alerts for the active park
  useEffect(() => {
    if (!activeParkCode) { setAlerts([]); return; }
    fetch(`${API_BASE}/api/nps/alerts?parkCode=${activeParkCode}`)
      .then(r => r.json())
      .then(d => { if (d.alerts) setAlerts(d.alerts); })
      .catch(() => { /* silently skip */ });
  }, [activeParkCode]);

  if (loading) {
    return (
      <div className="p-3 border-t border-stone-800 bg-stone-900/40">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 border-2 border-forest-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-stone-500">Loading trail details...</span>
        </div>
        {/* Skeleton placeholders */}
        <div className="space-y-2">
          <div className="h-3 bg-stone-800 rounded animate-pulse w-full" />
          <div className="h-3 bg-stone-800 rounded animate-pulse w-4/5" />
          <div className="h-3 bg-stone-800 rounded animate-pulse w-3/5" />
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const diffClass = detail.difficulty ? (difficultyColors[detail.difficulty] ?? 'bg-stone-800 text-stone-400') : null;

  return (
    <div className="border-t border-stone-700 bg-stone-900/60">

      {/* Closure alerts — most prominent, shown first */}
      {alerts.filter(a => a.category === 'Closure').length > 0 && (
        <div className="px-3 py-2 bg-red-950/60 border-b border-red-800/50">
          {alerts.filter(a => a.category === 'Closure').map((a, i) => (
            <div key={i}>
              <p className="text-xs font-bold text-red-400">🚫 {a.title}</p>
              <p className="text-[10px] text-red-300/70 mt-0.5 leading-relaxed">{a.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Danger / Caution alerts */}
      {alerts.filter(a => a.category === 'Danger' || a.category === 'Caution').length > 0 && (
        <div className="px-3 py-2 bg-amber-950/40 border-b border-amber-800/40">
          {alerts.filter(a => ['Danger', 'Caution'].includes(a.category)).map((a, i) => (
            <div key={i}>
              <p className="text-xs font-semibold text-amber-400">⚠️ {a.title}</p>
              <p className="text-[10px] text-amber-300/70 mt-0.5 leading-relaxed">{a.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Description */}
      {detail.description && (
        <div className="px-3 pt-3 pb-2">
          <p className="text-xs text-stone-300 leading-relaxed">{detail.description}</p>
        </div>
      )}

      {/* Photo strip — horizontal scroll of trail photos */}
      {photos.length > 0 && (
        <div className="overflow-x-auto flex gap-2 px-3 py-2 border-t border-stone-800">
          {photos.map((photo, i) => (
            <img
              key={i}
              src={photo.url}
              alt={photo.alt}
              className="h-24 w-36 object-cover rounded-lg flex-shrink-0 bg-stone-800"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ))}
        </div>
      )}

      {/* Elevation Profile Chart */}
      {elevCoords && elevCoords.length >= 2 && (
        <ElevationChart coordinates={elevCoords} totalDistanceMi={trail.distanceMi} />
      )}

      {/* Key stats grid */}
      <div className="px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {detail.difficulty && diffClass && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Difficulty</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${diffClass}`}>
              {detail.difficulty}
            </span>
          </div>
        )}
        {detail.elevationGainFt != null && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Elevation Gain</p>
            <p className="text-xs font-semibold text-stone-200">+{detail.elevationGainFt.toLocaleString()} ft</p>
          </div>
        )}
        {detail.highPointFt != null && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">High Point</p>
            <p className="text-xs font-semibold text-stone-200">{detail.highPointFt.toLocaleString()} ft</p>
          </div>
        )}
        {detail.trailheadElevFt != null && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Trailhead Elev.</p>
            <p className="text-xs font-semibold text-stone-200">{detail.trailheadElevFt.toLocaleString()} ft</p>
          </div>
        )}
        {detail.bestSeason && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Best Season</p>
            <p className="text-xs text-stone-300">{detail.bestSeason}</p>
          </div>
        )}
        {detail.terrain && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Terrain</p>
            <p className="text-xs text-stone-300 capitalize">{detail.terrain}</p>
          </div>
        )}
      </div>

      {/* Key features */}
      {detail.keyFeatures && detail.keyFeatures.length > 0 && (
        <div className="px-3 py-2 border-t border-stone-800">
          <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-1.5">Highlights</p>
          <ul className="space-y-1">
            {detail.keyFeatures.map((f, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-stone-400">
                <span className="text-forest-500 mt-0.5 flex-shrink-0">✦</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Wildlife */}
      {detail.wildlife && (
        <div className="px-3 py-2 border-t border-stone-800">
          <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-1">Wildlife</p>
          <p className="text-xs text-stone-400">{detail.wildlife}</p>
        </div>
      )}

      {/* Warnings */}
      {detail.warnings && (
        <div className="px-3 py-2 border-t border-stone-800">
          <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-2">
            <p className="text-[10px] font-semibold text-amber-400 mb-0.5">⚠ Know Before You Go</p>
            <p className="text-[10px] text-amber-300/80 leading-relaxed">{detail.warnings}</p>
          </div>
        </div>
      )}

      {/* Permit info */}
      {detail.permitRequired && detail.permitNotes && (
        <div className="px-3 py-2 border-t border-stone-800">
          <div className="bg-blue-950/40 border border-blue-800/40 rounded-lg p-2">
            <p className="text-[10px] font-semibold text-blue-400 mb-0.5">🎫 Permit Required</p>
            <p className="text-[10px] text-blue-300/80 leading-relaxed">{detail.permitNotes}</p>
          </div>
        </div>
      )}

      {/* Fire risk */}
      <div className="px-3 py-2 border-t border-stone-800">
        {detail.fireRisk === 'active' && detail.fireIncidents && detail.fireIncidents.length > 0 ? (
          <div className="bg-red-950/40 border border-red-800/40 rounded-lg p-2">
            <p className="text-[10px] font-semibold text-red-400 mb-1">🔥 Active Fire Incidents Nearby</p>
            {detail.fireIncidents.map((f, i) => (
              <p key={i} className="text-[10px] text-red-300/70">{f}</p>
            ))}
          </div>
        ) : detail.fireRisk === 'none' ? (
          <p className="text-[10px] text-green-500">✓ No active fire incidents within 150 mi</p>
        ) : null}
      </div>

      {/* Footer: cell signal + allowed uses + NPS link */}
      <div className="px-3 pb-3 pt-1 border-t border-stone-800 space-y-2">
        <div className="flex items-start gap-1.5">
          <span className="text-[10px] text-stone-600 mt-0.5">📶</span>
          <p className="text-[10px] text-stone-600 leading-relaxed">
            Most backcountry trails have limited or no cell signal. Download offline maps before departing.
          </p>
        </div>
        {detail.allowedUses && (
          <p className="text-[10px] text-stone-600">Uses: {detail.allowedUses}</p>
        )}
        {detail.managedBy && (
          <p className="text-[10px] text-stone-600">Managed by {detail.managedBy}</p>
        )}
        <a
          href="https://www.nps.gov/planyourvisit/maps.htm"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[10px] text-forest-400 hover:text-forest-300 transition-colors"
        >
          View on NPS.gov →
        </a>
      </div>
    </div>
  );
}
