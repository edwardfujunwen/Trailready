import { useTripStore } from '../../store/useTripStore';

const activities = [
  { type: 'hiking', emoji: '🥾', label: 'Hiking', desc: 'Day hikes & nature walks' },
  { type: 'backpacking', emoji: '🎒', label: 'Backpacking', desc: 'Multi-night wilderness trips' },
  { type: 'rockclimbing', emoji: '🧗', label: 'Rock Climbing', desc: 'Sport, trad & bouldering' },
  { type: 'kayaking', emoji: '🚣', label: 'Kayaking', desc: 'Rivers, lakes & coastal' },
  { type: 'snowshoeing', emoji: '🏔️', label: 'Snowshoeing', desc: 'Winter trail exploration' },
  { type: 'backcountryski', emoji: '⛷️', label: 'BC Skiing', desc: 'Alpine ski touring' },
];

export default function WelcomeScreen() {
  const setTripType = useTripStore((s) => s.setTripType);
  const tripType = useTripStore((s) => s.tripType);

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-6 py-8 text-center max-w-lg mx-auto">
      {/* Hero */}
      <div className="mb-8">
        <div className="text-5xl mb-3">⛺</div>
        <h1 className="text-2xl font-bold text-stone-100 mb-2">Plan your next adventure</h1>
        <p className="text-sm text-stone-400 leading-relaxed">
          Get trail info, weather, gear lists, and campsite availability — all in one place.
        </p>
      </div>

      {/* Step 1: Pick activity */}
      <div className="w-full mb-6">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
          Step 1 — Choose your activity
        </p>
        <div className="grid grid-cols-3 gap-2">
          {activities.map((a) => (
            <button
              key={a.type}
              onClick={() => setTripType(a.type as 'hiking' | 'backpacking' | 'rockclimbing' | 'kayaking' | 'snowshoeing' | 'backcountryski')}
              className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border text-center transition-all ${
                tripType === a.type
                  ? 'bg-forest-900/60 border-forest-500 shadow-sm'
                  : 'bg-stone-800/60 border-stone-700 hover:border-stone-500 hover:bg-stone-800'
              }`}
            >
              <span className="text-2xl">{a.emoji}</span>
              <p className={`text-[11px] font-semibold leading-tight ${tripType === a.type ? 'text-forest-300' : 'text-stone-200'}`}>{a.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Search */}
      <div className="w-full mb-6">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
          Step 2 — Search a location
        </p>
        <div className="bg-stone-800/60 border border-stone-700 rounded-xl p-3">
          <p className="text-xs text-stone-400">
            Type any place in the search bar above — national parks, mountains, rivers, or trail areas.
          </p>
          <p className="text-[10px] text-stone-600 mt-1">Try: "Yosemite", "Red Rocks", "Colorado River"</p>
        </div>
      </div>

      {/* Step 3: Preview */}
      <div className="w-full">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
          Step 3 — Get your plan
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: '🗺️', label: 'Trails & Routes' },
            { icon: '🌤', label: 'Weather Forecast' },
            { icon: '🎒', label: 'AI Gear List' },
          ].map((item) => (
            <div key={item.label} className="bg-stone-800/40 border border-stone-800 rounded-lg p-2 text-center">
              <div className="text-lg mb-1">{item.icon}</div>
              <p className="text-[10px] text-stone-500">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
