interface Props {
  onEnter: () => void;
}

export default function LandingPage({ onEnter }: Props) {
  return (
    <div className="min-h-screen bg-stone-950 flex flex-col overflow-hidden">

      {/* Hero section */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">

        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-forest-900/30 via-stone-950 to-stone-950 pointer-events-none" />

        {/* Mountain silhouette SVG (inline) */}
        <div className="absolute bottom-0 left-0 right-0 opacity-10 pointer-events-none">
          <svg viewBox="0 0 1440 320" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,320 L0,200 L120,120 L240,180 L360,60 L480,140 L600,20 L720,100 L840,40 L960,120 L1080,80 L1200,160 L1320,100 L1440,180 L1440,320 Z" fill="#22c55e" />
          </svg>
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3 mb-8">
          <span className="text-4xl">&#x26FA;</span>
          <span className="text-3xl font-bold text-stone-100 tracking-tight">TrailReady</span>
        </div>

        {/* Headline */}
        <div className="relative z-10 max-w-2xl mx-auto mb-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-stone-100 leading-tight mb-4">
            Your outdoor adventure,{' '}
            <span className="text-forest-500">fully planned</span>
          </h1>
          <p className="text-lg text-stone-400 leading-relaxed">
            Trails, weather, gear lists, campsite availability, and emergency info — all in one place. For hikers, climbers, paddlers, and skiers.
          </p>
        </div>

        {/* CTA */}
        <div className="relative z-10 mb-12">
          <button
            onClick={onEnter}
            className="px-8 py-3.5 bg-forest-600 hover:bg-forest-500 text-white font-bold text-lg rounded-2xl transition-all shadow-lg shadow-forest-900/50 hover:shadow-forest-800/50 hover:-translate-y-0.5"
          >
            Start Planning →
          </button>
          <p className="text-xs text-stone-600 mt-3">Free · No account required</p>
        </div>

        {/* Activity icons */}
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 mb-16">
          {[
            { emoji: '🥾', label: 'Hiking' },
            { emoji: '🎒', label: 'Backpacking' },
            { emoji: '🧗', label: 'Climbing' },
            { emoji: '🚣', label: 'Kayaking' },
            { emoji: '🏔️', label: 'Snowshoeing' },
            { emoji: '⛷️', label: 'BC Skiing' },
          ].map((a) => (
            <div key={a.label} className="flex items-center gap-1.5 bg-stone-800/60 border border-stone-700 rounded-full px-3 py-1.5">
              <span className="text-sm">{a.emoji}</span>
              <span className="text-xs text-stone-400">{a.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Features grid */}
      <div className="relative z-10 px-6 pb-12 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { icon: '🗺️', title: 'Trail Discovery', desc: 'Millions of trails from OpenStreetMap with route type, difficulty & elevation' },
            { icon: '🌤', title: 'Weather Forecast', desc: '14-day forecasts with rain risk and wind — filtered to your trip dates' },
            { icon: '🎒', title: 'AI Gear Lists', desc: 'Activity-specific packing lists with buy links at mid-range prices' },
            { icon: '⛺', title: 'Campsite Availability', desc: 'Real-time availability from Recreation.gov for your exact dates' },
            { icon: '🚨', title: 'Emergency Info', desc: 'Local SAR contacts, nearest hospital, and region-specific safety tips' },
            { icon: '📱', title: 'Works Offline', desc: 'Install as a mobile app and access your plan at the trailhead' },
          ].map((f) => (
            <div key={f.title} className="bg-stone-900/60 border border-stone-800 rounded-xl p-4">
              <div className="text-2xl mb-2">{f.icon}</div>
              <p className="text-sm font-semibold text-stone-200 mb-1">{f.title}</p>
              <p className="text-xs text-stone-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <button onClick={onEnter} className="text-sm text-forest-500 hover:text-forest-600 transition-colors">
            Jump straight in →
          </button>
          <p className="text-xs text-stone-700 mt-2">
            Trail data from OpenStreetMap · Weather from NOAA · Campsites from Recreation.gov
          </p>
        </div>
      </div>
    </div>
  );
}
