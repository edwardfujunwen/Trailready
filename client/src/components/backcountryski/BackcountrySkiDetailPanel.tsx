import { useEffect, useState } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { API_BASE } from '../../api/base';

interface SkiDetail {
  name: string;
  description?: string | null;
  difficulty?: string | null;
  verticalFt?: number | null;
  aspectsSkied?: string | null;
  avalancheTerrain?: 'Simple' | 'Challenging' | 'Complex' | null;
  bestSeason?: string | null;
  approach?: string | null;
  descent?: string | null;
  hazards?: string | null;
  avalancheNotes?: string | null;
  keyFeatures?: string[];
  gearRequired?: string | null;
  emergencyInfo?: string | null;
  fireRisk?: 'active' | 'none' | 'unknown';
  fireIncidents?: string[];
}

interface Props {
  route: { name: string; distanceMi?: number; lat?: number; lon?: number };
}

const difficultyColors: Record<string, string> = {
  Beginner: 'bg-green-900/60 text-green-300',
  Intermediate: 'bg-blue-900/60 text-blue-300',
  Advanced: 'bg-orange-900/60 text-orange-300',
  Expert: 'bg-red-900/60 text-red-300',
};

const avalancheColors: Record<string, string> = {
  Simple: 'bg-green-900/50 text-green-300 border-green-800/40',
  Challenging: 'bg-yellow-900/50 text-yellow-300 border-yellow-800/40',
  Complex: 'bg-red-900/50 text-red-300 border-red-800/40',
};

export default function BackcountrySkiDetailPanel({ route }: Props) {
  const [detail, setDetail] = useState<SkiDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const locationName = useTripStore((s) => s.location?.name);

  useEffect(() => {
    if (!route?.name) return;
    setLoading(true);
    setDetail(null);
    const params = new URLSearchParams({ name: route.name });
    if (route.distanceMi) params.set('distanceMi', route.distanceMi.toString());
    if (route.lat) params.set('lat', route.lat.toString());
    if (route.lon) params.set('lon', route.lon.toString());
    if (locationName) params.set('locationName', locationName);
    fetch(`${API_BASE}/api/backcountryski/detail?${params}`)
      .then(r => r.json())
      .then(d => { setDetail(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [route.name]);

  if (loading) {
    return (
      <div className="p-3 border-t border-stone-800 bg-stone-900/40">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-stone-500">Loading route details...</span>
        </div>
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
  const avyClass = detail.avalancheTerrain ? (avalancheColors[detail.avalancheTerrain] ?? 'bg-stone-800 text-stone-400 border-stone-700') : null;

  return (
    <div className="border-t border-stone-700 bg-stone-900/60">

      {/* Description */}
      {detail.description && (
        <div className="px-3 pt-3 pb-2">
          <p className="text-xs text-stone-300 leading-relaxed">{detail.description}</p>
        </div>
      )}

      {/* Stats grid */}
      <div className="px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {detail.difficulty && diffClass && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Difficulty</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${diffClass}`}>
              {detail.difficulty}
            </span>
          </div>
        )}
        {detail.verticalFt != null && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Vertical</p>
            <p className="text-xs font-semibold text-stone-200">+{detail.verticalFt.toLocaleString()} ft</p>
          </div>
        )}
        {detail.aspectsSkied && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Aspects</p>
            <p className="text-xs text-stone-300">{detail.aspectsSkied}</p>
          </div>
        )}
        {detail.bestSeason && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Best Season</p>
            <p className="text-xs text-stone-300">{detail.bestSeason}</p>
          </div>
        )}
      </div>

      {/* Avalanche terrain rating — always prominent */}
      {detail.avalancheTerrain && avyClass && (
        <div className="px-3 py-2 border-t border-stone-800">
          <div className={`border rounded-lg p-2 ${avyClass}`}>
            <p className="text-[10px] font-bold uppercase tracking-wide mb-0.5">
              ⚠ Avalanche Terrain: {detail.avalancheTerrain}
            </p>
            {detail.avalancheNotes && (
              <p className="text-[10px] opacity-80 leading-relaxed">{detail.avalancheNotes}</p>
            )}
            <a
              href="https://avalanche.org"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[10px] mt-1 underline opacity-70 hover:opacity-100"
            >
              Check forecast at avalanche.org →
            </a>
          </div>
        </div>
      )}

      {/* Approach & Descent */}
      {(detail.approach || detail.descent) && (
        <div className="px-3 py-2 border-t border-stone-800 space-y-2">
          {detail.approach && (
            <div>
              <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Approach / Skin Up</p>
              <p className="text-xs text-stone-400 leading-relaxed">{detail.approach}</p>
            </div>
          )}
          {detail.descent && (
            <div>
              <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Descent</p>
              <p className="text-xs text-stone-400 leading-relaxed">{detail.descent}</p>
            </div>
          )}
        </div>
      )}

      {/* Key features */}
      {detail.keyFeatures && detail.keyFeatures.length > 0 && (
        <div className="px-3 py-2 border-t border-stone-800">
          <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-1.5">Highlights</p>
          <ul className="space-y-1">
            {detail.keyFeatures.map((f, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-stone-400">
                <span className="text-indigo-500 mt-0.5 flex-shrink-0">✦</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hazards */}
      {detail.hazards && (
        <div className="px-3 py-2 border-t border-stone-800">
          <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-2">
            <p className="text-[10px] font-semibold text-amber-400 mb-0.5">⚠ Hazards</p>
            <p className="text-[10px] text-amber-300/80 leading-relaxed">{detail.hazards}</p>
          </div>
        </div>
      )}

      {/* Gear required */}
      {detail.gearRequired && (
        <div className="px-3 py-2 border-t border-stone-800">
          <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Additional Gear</p>
          <p className="text-xs text-stone-400 leading-relaxed">{detail.gearRequired}</p>
        </div>
      )}

      {/* Fire risk */}
      {detail.fireRisk === 'active' && detail.fireIncidents && detail.fireIncidents.length > 0 && (
        <div className="px-3 py-2 border-t border-stone-800">
          <div className="bg-red-950/40 border border-red-800/40 rounded-lg p-2">
            <p className="text-[10px] font-semibold text-red-400 mb-1">🔥 Active Fire Incidents Nearby</p>
            {detail.fireIncidents.map((f, i) => (
              <p key={i} className="text-[10px] text-red-300/70">{f}</p>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-3 pb-3 pt-2 border-t border-stone-800 space-y-1.5">
        {detail.emergencyInfo && (
          <p className="text-[10px] text-stone-600">{detail.emergencyInfo}</p>
        )}
        <p className="text-[10px] text-stone-600">
          📶 No cell signal in most backcountry terrain. Carry a satellite communicator.
        </p>
        <a
          href="https://avalanche.org"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Check avalanche forecast at avalanche.org →
        </a>
      </div>
    </div>
  );
}
