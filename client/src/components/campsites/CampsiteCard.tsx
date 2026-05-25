import type { Campground } from '../../types/campsite';
import { useTripStore } from '../../store/useTripStore';

interface Props {
  campground: Campground;
}

export default function CampsiteCard({ campground }: Props) {
  const checkin = useTripStore((s) => s.checkin);
  const checkout = useTripStore((s) => s.checkout);

  const hasChecked = campground.availabilityChecked;
  const availCount = campground.availableSites?.length ?? 0;
  const isChecking = checkin && checkout && !hasChecked;

  return (
    <div className="bg-stone-800 border border-stone-700 rounded-xl p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-stone-200 leading-tight">{campground.name}</h3>
          {campground.description && (
            <p className="text-xs text-stone-500 mt-1 line-clamp-2">{campground.description}</p>
          )}
        </div>

        {/* Availability badge */}
        {isChecking && (
          <div className="w-4 h-4 border-2 border-forest-500 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5" />
        )}
        {hasChecked && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${
            availCount > 0 ? 'bg-forest-900 text-forest-300' : 'bg-stone-700 text-stone-400'
          }`}>
            {availCount > 0 ? `${availCount} open` : 'Full'}
          </span>
        )}
      </div>

      {/* Available sites list */}
      {hasChecked && availCount > 0 && (
        <div className="space-y-1">
          {campground.availableSites!.slice(0, 3).map((site) => (
            <div key={site.siteId} className="text-xs text-stone-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-forest-500 flex-shrink-0" />
              Site {site.siteName}
              {site.loop && <span className="text-stone-600">· {site.loop}</span>}
              {site.type && <span className="text-stone-600">· {site.type}</span>}
            </div>
          ))}
          {availCount > 3 && (
            <p className="text-xs text-stone-600">+{availCount - 3} more sites</p>
          )}
        </div>
      )}

      {/* Book button */}
      <a
        href={campground.reservationUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-xs btn-primary py-1.5 text-center"
      >
        Book on Rec.gov →
      </a>
    </div>
  );
}
