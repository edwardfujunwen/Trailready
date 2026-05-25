import { useEffect, useState } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { API_BASE } from '../../api/base';

interface EmergencyInfo {
  emergencyNumber: string;
  searchAndRescue: string;
  nearestHospital: string;
  rangerStation?: string;
  poisonControl: string;
  avalancheHotline?: string | null;
  coastGuard?: string | null;
  preparednessNotes: string;
  offlineResourceNote: string;
}

export default function EmergencyPanel() {
  const location = useTripStore((s) => s.location);
  const [info, setInfo] = useState<EmergencyInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!location) return;
    setLoading(true);
    const params = new URLSearchParams({
      locationName: location.name,
      lat: location.lat.toString(),
      lon: location.lon.toString(),
    });
    fetch(API_BASE + '/api/emergency/info?' + params)
      .then(r => r.json())
      .then(d => { setInfo(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [location?.name]);

  if (!location) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <p className="text-sm text-stone-600">Search a location to see emergency contacts</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!info) return null;

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {/* Emergency header */}
      <div className="bg-red-950/50 border border-red-800/50 rounded-xl p-3">
        <p className="text-xs font-bold text-red-400 mb-2">🚨 Emergency Numbers</p>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-xs text-stone-400">Emergency</span>
            <a href={'tel:' + info.emergencyNumber} className="text-xs font-bold text-red-300">{info.emergencyNumber}</a>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-stone-400">Poison Control</span>
            <a href={'tel:' + info.poisonControl.replace(/\D/g,'')} className="text-xs font-semibold text-red-300">{info.poisonControl}</a>
          </div>
        </div>
      </div>

      {/* Local resources */}
      <div className="bg-stone-800/60 border border-stone-700 rounded-xl p-3 space-y-2">
        <p className="text-xs font-semibold text-stone-400">📍 Local Resources</p>
        {info.searchAndRescue && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide">Search & Rescue</p>
            <p className="text-xs text-stone-300">{info.searchAndRescue}</p>
          </div>
        )}
        {info.nearestHospital && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide">Nearest Hospital</p>
            <p className="text-xs text-stone-300">{info.nearestHospital}</p>
          </div>
        )}
        {info.rangerStation && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide">Ranger Station</p>
            <p className="text-xs text-stone-300">{info.rangerStation}</p>
          </div>
        )}
        {info.avalancheHotline && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide">Avalanche Hotline</p>
            <p className="text-xs text-stone-300">{info.avalancheHotline}</p>
          </div>
        )}
        {info.coastGuard && (
          <div>
            <p className="text-[10px] text-stone-600 uppercase tracking-wide">Coast Guard</p>
            <p className="text-xs text-stone-300">{info.coastGuard}</p>
          </div>
        )}
      </div>

      {/* Preparedness notes */}
      {info.preparednessNotes && (
        <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3">
          <p className="text-xs font-semibold text-amber-400 mb-1.5">⚠ Know Before You Go</p>
          <p className="text-xs text-amber-300/80 leading-relaxed">{info.preparednessNotes}</p>
        </div>
      )}

      {/* Offline reminder */}
      <div className="bg-stone-800/40 rounded-xl p-3">
        <p className="text-[10px] text-stone-500 leading-relaxed">
          📴 <strong className="text-stone-400">Save these numbers offline</strong> before departing — most backcountry areas have no cell service.
        </p>
      </div>
    </div>
  );
}
