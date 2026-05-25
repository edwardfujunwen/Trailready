import { useEffect, useState } from 'react';
import { API_BASE } from '../../api/base';

interface ClimbingDetail {
  name: string;
  description?: string | null;
  gradeContext?: string | null;
  routeType?: string | null;
  pitches?: number | null;
  heightFt?: number | null;
  protection?: string | null;
  approach?: string | null;
  descent?: string | null;
  bestSeason?: string | null;
  rockType?: string | null;
  keyFeatures?: string[];
  warnings?: string | null;
  firstAscent?: string | null;
}

interface Props {
  name: string;
  grade?: string;
  locationName?: string;
}

function gradeColor(grade: string | undefined): string {
  if (!grade) return 'bg-stone-800 text-stone-300';
  // V-scale bouldering
  const vMatch = grade.match(/^V(\d+)/i);
  if (vMatch) {
    const v = parseInt(vMatch[1], 10);
    if (v <= 3) return 'bg-green-900/60 text-green-300';
    if (v <= 6) return 'bg-yellow-900/60 text-yellow-300';
    return 'bg-red-900/60 text-red-300';
  }
  // YDS / Yosemite Decimal System
  const ydsMatch = grade.match(/^5\.(\d+)/);
  if (ydsMatch) {
    const sub = parseInt(ydsMatch[1], 10);
    if (sub <= 9) return 'bg-green-900/60 text-green-300';
    if (sub <= 11) return 'bg-yellow-900/60 text-yellow-300';
    if (sub <= 12) return 'bg-orange-900/60 text-orange-300';
    return 'bg-red-900/60 text-red-300';
  }
  return 'bg-stone-800 text-stone-300';
}

export default function ClimbingRouteDetailPanel({ name, grade, locationName }: Props) {
  const [detail, setDetail] = useState<ClimbingDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!name) return;
    setLoading(true);
    setDetail(null);
    const params = new URLSearchParams({ name });
    if (grade) params.set('grade', grade);
    if (locationName) params.set('locationName', locationName);
    fetch(API_BASE + '/api/climbing/detail?' + params.toString())
      .then((r) => r.json())
      .then((d) => { setDetail(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [name, grade, locationName]);

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

  const gradeBadgeClass = gradeColor(grade);

  return (
    <div className="border-t border-stone-700 bg-stone-900/60">

      {/* Description */}
      {detail.description && (
        <div className="px-3 pt-3 pb-2">
          <p className="text-xs text-stone-300 leading-relaxed">{detail.description}</p>
        </div>
      )}

      {/* Grade context */}
      {detail.gradeContext && (
        <div className="px-3 pb-2">
          <p className="text-[10px] text-stone-500 leading-relaxed italic">{detail.gradeContext}</p>
        </div>
      )}

      {/* Key stats grid */}
      <div className="px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {grade && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Grade</p>
            <span className={'text-xs font-bold px-2 py-0.5 rounded-full ' + gradeBadgeClass}>
              {grade}
            </span>
          </div>
        )}
        {detail.routeType && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Type</p>
            <p className="text-xs font-semibold text-stone-200">{detail.routeType}</p>
          </div>
        )}
        {detail.pitches != null && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Pitches</p>
            <p className="text-xs font-semibold text-stone-200">{detail.pitches}</p>
          </div>
        )}
        {detail.heightFt != null && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Height</p>
            <p className="text-xs font-semibold text-stone-200">{detail.heightFt} ft</p>
          </div>
        )}
        {detail.rockType && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Rock</p>
            <p className="text-xs text-stone-300 capitalize">{detail.rockType}</p>
          </div>
        )}
        {detail.bestSeason && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Best Season</p>
            <p className="text-xs text-stone-300">{detail.bestSeason}</p>
          </div>
        )}
      </div>

      {/* Protection — safety-critical, amber highlight */}
      {detail.protection && (
        <div className="px-3 py-2 border-t border-stone-800">
          <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-2">
            <p className="text-[10px] font-semibold text-amber-400 mb-0.5">Gear / Protection</p>
            <p className="text-[10px] text-amber-300/80 leading-relaxed">{detail.protection}</p>
          </div>
        </div>
      )}

      {/* Approach & Descent */}
      {(detail.approach || detail.descent) && (
        <div className="px-3 py-2 border-t border-stone-800 grid grid-cols-1 gap-2">
          {detail.approach && (
            <div>
              <p className="text-[10px] text-stone-600 uppercase tracking-wide mb-0.5">Approach</p>
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
                <span className="text-blue-500 mt-0.5 flex-shrink-0">✦</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {detail.warnings && (
        <div className="px-3 py-2 border-t border-stone-800">
          <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-2">
            <p className="text-[10px] font-semibold text-amber-400 mb-0.5">⚠ Know Before You Climb</p>
            <p className="text-[10px] text-amber-300/80 leading-relaxed">{detail.warnings}</p>
          </div>
        </div>
      )}

      {/* First ascent */}
      {detail.firstAscent && (
        <div className="px-3 pb-3 pt-2 border-t border-stone-800">
          <p className="text-[10px] text-stone-600">FA: {detail.firstAscent}</p>
        </div>
      )}
    </div>
  );
}
