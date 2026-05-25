import { useEffect, useState } from 'react';
import { API_BASE } from '../../api/base';

interface KayakDetail {
  name: string;
  description?: string | null;
  difficulty?: string | null;
  lengthMi?: number | null;
  estimatedHours?: number | null;
  waterType?: string | null;
  putIn?: string | null;
  takeOut?: string | null;
  shuttleRequired?: boolean | null;
  bestSeason?: string | null;
  hazards?: string | null;
  scenery?: string | null;
  keyFeatures?: string[];
  gearNotes?: string | null;
}

interface Props {
  name: string;
  distanceMi?: number;
  locationName?: string;
}

function difficultyColor(difficulty: string | null | undefined): string {
  if (!difficulty) return 'bg-stone-800 text-stone-300';
  const d = difficulty.toLowerCase();
  if (d === 'flatwater') return 'bg-blue-900/60 text-blue-300';
  if (d === 'tidal') return 'bg-cyan-900/60 text-cyan-300';
  if (d.includes('class i') && !d.includes('class ii')) return 'bg-green-900/60 text-green-300';
  if (d.includes('class ii') && !d.includes('class iii')) return 'bg-yellow-900/60 text-yellow-300';
  if (d.includes('class iii') && !d.includes('class iv')) return 'bg-orange-900/60 text-orange-300';
  if (d.includes('class iv') && !d.includes('class v')) return 'bg-red-900/60 text-red-300';
  if (d.includes('class v')) return 'bg-red-950/80 text-red-200';
  return 'bg-stone-800 text-stone-300';
}

export default function KayakingRouteDetailPanel({ name, distanceMi, locationName }: Props) {
  const [detail, setDetail] = useState<KayakDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!name) return;
    setLoading(true);
    setDetail(null);
    const params = new URLSearchParams({ name });
    if (distanceMi != null) params.set('distanceMi', distanceMi.toString());
    if (locationName) params.set('locationName', locationName);
    fetch(API_BASE + '/api/kayaking/detail?' + params.toString())
      .then((r) => r.json())
      .then((d) => { setDetail(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [name, distanceMi, locationName]);

  if (loading) {
    return (
      <div className="p-3 border-t border-stone-800 bg-stone-900/40">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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

  const diffClass = difficultyColor(detail.difficulty);

  return (
    <div className="border-t border-stone-700 bg-stone-900/60">

      {/* Description */}
      {detail.description && (
        <div className="px-3 pt-3 pb-2">
          <p className="text-xs text-stone-300 leading-relaxed">{detail.description}</p>
        </div>
      )}

      {/* Key stats grid */}
      <div className="px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {detail.difficulty && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Difficulty</p>
            <span className={'text-xs font-semibold px-2 py-0.5 rounded-full ' + diffClass}>
              {detail.difficulty}
            </span>
          </div>
        )}
        {detail.waterType && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Water Type</p>
            <p className="text-xs font-semibold text-stone-200 capitalize">{detail.waterType}</p>
          </div>
        )}
        {detail.lengthMi != null && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Length</p>
            <p className="text-xs font-semibold text-stone-200">{detail.lengthMi.toFixed(1)} mi</p>
          </div>
        )}
        {detail.estimatedHours != null && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Est. Time</p>
            <p className="text-xs font-semibold text-stone-200">{detail.estimatedHours} hr</p>
          </div>
        )}
        {detail.bestSeason && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Best Season</p>
            <p className="text-xs text-stone-300">{detail.bestSeason}</p>
          </div>
        )}
        {detail.shuttleRequired != null && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Shuttle</p>
            {detail.shuttleRequired ? (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-900/60 text-orange-300">
                Required
              </span>
            ) : (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-900/60 text-green-300">
                Not needed
              </span>
            )}
          </div>
        )}
      </div>

      {/* Put-in / Take-out */}
      {(detail.putIn || detail.takeOut) && (
        <div className="px-3 py-2 border-t border-stone-800 grid grid-cols-1 gap-2">
          {detail.putIn && (
            <div>
              <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Put-in</p>
              <p className="text-xs text-stone-400 leading-relaxed">{detail.putIn}</p>
            </div>
          )}
          {detail.takeOut && (
            <div>
              <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Take-out</p>
              <p className="text-xs text-stone-400 leading-relaxed">{detail.takeOut}</p>
            </div>
          )}
        </div>
      )}

      {/* Scenery */}
      {detail.scenery && (
        <div className="px-3 py-2 border-t border-stone-800">
          <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Scenery</p>
          <p className="text-xs text-stone-400 leading-relaxed">{detail.scenery}</p>
        </div>
      )}

      {/* Key features */}
      {detail.keyFeatures && detail.keyFeatures.length > 0 && (
        <div className="px-3 py-2 border-t border-stone-800">
          <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-1.5">Highlights</p>
          <ul className="space-y-1">
            {detail.keyFeatures.map((f, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-stone-400">
                <span className="text-blue-500 mt-0.5 flex-shrink-0">✦</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hazards — safety-critical, amber highlight */}
      {detail.hazards && (
        <div className="px-3 py-2 border-t border-stone-800">
          <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-2">
            <p className="text-[10px] font-semibold text-amber-400 mb-0.5">⚠ Hazards</p>
            <p className="text-[10px] text-amber-300/80 leading-relaxed">{detail.hazards}</p>
          </div>
        </div>
      )}

      {/* Gear notes */}
      {detail.gearNotes && (
        <div className="px-3 pb-3 pt-2 border-t border-stone-800">
          <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Gear Notes</p>
          <p className="text-[10px] text-stone-500 leading-relaxed">{detail.gearNotes}</p>
        </div>
      )}
    </div>
  );
}
