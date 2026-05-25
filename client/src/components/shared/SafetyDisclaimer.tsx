import { useState, useEffect } from 'react';

export default function SafetyDisclaimer() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('trailready-safety-dismissed');
    if (!dismissed) setShow(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem('trailready-safety-dismissed', '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⚠️</span>
          <h2 className="text-base font-bold text-stone-100">Safety First</h2>
        </div>
        <div className="space-y-3 text-sm text-stone-400 leading-relaxed mb-6">
          <p>TrailReady provides AI-generated trip planning information to help you prepare. Always:</p>
          <ul className="space-y-1.5 ml-2">
            {[
              'Verify trail conditions with local rangers before departure',
              'Check official weather forecasts — mountain conditions change rapidly',
              'Carry a paper map and compass as backup',
              'Tell someone your planned route and expected return time',
              'Backcountry ski & climbing info may be incomplete — consult certified guides',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-forest-500 mt-0.5 flex-shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-stone-600 pt-1">
            Trail data sourced from OpenStreetMap, NPS, and AI-generated content. Data may be inaccurate or outdated.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="w-full py-2.5 bg-forest-600 hover:bg-forest-500 text-white font-semibold text-sm rounded-xl transition-colors"
        >
          I understand — Let's plan
        </button>
      </div>
    </div>
  );
}
