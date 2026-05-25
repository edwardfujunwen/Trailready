import { useCampsiteStore } from '../../store/useCampsiteStore';
import { useTripStore } from '../../store/useTripStore';
import CampsiteCard from './CampsiteCard';

export default function CampsitePanel() {
  const { campgrounds, loading, error } = useCampsiteStore();
  const location = useTripStore((s) => s.location);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-stone-800 flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold text-stone-300">Nearby Campsites</h2>
        {campgrounds.length > 0 && (
          <span className="text-xs text-stone-500">{campgrounds.length} found</span>
        )}
      </div>

      {!location ? (
        <div className="flex-1 flex items-center justify-center text-center p-6">
          <div className="text-stone-600">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm">Campsites load after searching a location</p>
          </div>
        </div>
      ) : loading && campgrounds.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-forest-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error && campgrounds.length === 0 ? (
        <div className="p-4">
          <div className="bg-red-950 border border-red-800 rounded-lg p-3 text-sm text-red-400">
            {error.includes('PLACEHOLDER') ? 'Add RIDB_API_KEY to .env to search campsites' : error}
          </div>
        </div>
      ) : campgrounds.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center p-6">
          <p className="text-sm text-stone-600">No campgrounds found within 25 miles</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {campgrounds.map((cg) => (
            <CampsiteCard key={cg.id} campground={cg} />
          ))}
          <div className="pt-1 pb-2">
            <a
              href="https://www.reserveamerica.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full btn-secondary text-center text-xs py-2"
            >
              Also search ReserveAmerica (state parks) →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
