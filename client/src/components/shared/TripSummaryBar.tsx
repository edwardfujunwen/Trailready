import { useTripStore } from '../../store/useTripStore';

export default function TripSummaryBar() {
  const { checkin, checkout, nights, setDates } = useTripStore();

  return (
    <div className="px-3 py-2.5 bg-stone-900 border-b border-stone-800">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <span className="text-[10px] text-stone-500 uppercase tracking-wide block mb-0.5">Check-in</span>
          <input
            type="date"
            value={checkin || ''}
            onChange={(e) => setDates(e.target.value, checkout || e.target.value)}
            className="w-full bg-stone-800 border border-stone-700 rounded px-2 py-1 text-xs text-stone-100 focus:outline-none focus:border-forest-500"
          />
        </div>
        <div className="flex-1">
          <span className="text-[10px] text-stone-500 uppercase tracking-wide block mb-0.5">Check-out</span>
          <input
            type="date"
            value={checkout || ''}
            min={checkin || undefined}
            onChange={(e) => setDates(checkin || e.target.value, e.target.value)}
            className="w-full bg-stone-800 border border-stone-700 rounded px-2 py-1 text-xs text-stone-100 focus:outline-none focus:border-forest-500"
          />
        </div>
        {nights > 0 && (
          <div className="text-center flex-shrink-0 pb-0.5">
            <span className="text-lg font-bold text-forest-400 leading-none">{nights}</span>
            <span className="text-[10px] text-stone-500 block">nts</span>
          </div>
        )}
      </div>
    </div>
  );
}
