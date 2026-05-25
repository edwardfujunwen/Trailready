import { useState, useRef, useEffect } from 'react';
import { useTripStore } from '../../store/useTripStore';

const activities = [
  { type: 'hiking',         emoji: '🥾', label: 'Hiking',          color: 'bg-forest-600' },
  { type: 'backpacking',    emoji: '🎒', label: 'Backpacking',      color: 'bg-forest-600' },
  { type: 'rockclimbing',   emoji: '🧗', label: 'Rock Climbing',    color: 'bg-orange-600' },
  { type: 'kayaking',       emoji: '🚣', label: 'Kayaking',         color: 'bg-blue-600' },
  { type: 'snowshoeing',    emoji: '🏔️', label: 'Snowshoeing',      color: 'bg-sky-700' },
  { type: 'backcountryski', emoji: '⛷️', label: 'Backcountry Ski',  color: 'bg-indigo-600' },
] as const;

export default function ActivitySelector() {
  const tripType = useTripStore((s) => s.tripType);
  const setTripType = useTripStore((s) => s.setTripType);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = activities.find((a) => a.type === tripType) ?? activities[0];

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm ${active.color} hover:opacity-90`}
      >
        <span>{active.emoji}</span>
        <span>{active.label}</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-52 bg-stone-900 border border-stone-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-1">
            {activities.map((a) => (
              <button
                key={a.type}
                onClick={() => { setTripType(a.type); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  tripType === a.type
                    ? 'bg-stone-700 text-stone-100'
                    : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                <span className="text-base">{a.emoji}</span>
                <span className="text-sm font-medium">{a.label}</span>
                {tripType === a.type && (
                  <svg className="w-3.5 h-3.5 ml-auto text-forest-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
