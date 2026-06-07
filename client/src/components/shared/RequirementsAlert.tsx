import { useEffect, useState } from 'react';
import { useTrailStore } from '../../store/useTrailStore';
import { API_BASE } from '../../api/base';

interface Requirements {
  bearCanisterRequired: boolean;
  permitRequired: boolean;
  bearInfo: string;
  permitInfo: string;
  source: string;
}

export default function RequirementsAlert() {
  const activeParkCode = useTrailStore((s) => s.activeParkCode);
  const [requirements, setRequirements] = useState<Requirements | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [prevParkCode, setPrevParkCode] = useState<string | null>(null);

  useEffect(() => {
    // Reset dismissed state when park code changes
    if (activeParkCode !== prevParkCode) {
      setDismissed(false);
      setPrevParkCode(activeParkCode);
    }

    if (!activeParkCode) {
      setRequirements(null);
      return;
    }

    let cancelled = false;
    fetch(`${API_BASE}/api/location/requirements?parkCode=${encodeURIComponent(activeParkCode)}`)
      .then((r) => r.json())
      .then((data: Requirements) => {
        if (!cancelled) setRequirements(data);
      })
      .catch(() => {
        if (!cancelled) setRequirements(null);
      });

    return () => { cancelled = true; };
  }, [activeParkCode, prevParkCode]);

  if (!activeParkCode || dismissed || !requirements) return null;

  const { bearCanisterRequired, permitRequired, bearInfo, permitInfo } = requirements;

  // Don't render if neither requirement applies
  if (!bearCanisterRequired && !permitRequired) return null;

  return (
    <div className="mx-3 mt-2 mb-1 flex flex-col gap-1.5">
      {/* Bear canister alert */}
      {bearCanisterRequired && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-600/50 bg-amber-950/60 px-3 py-2 text-xs">
          <span className="mt-0.5 text-sm leading-none flex-shrink-0">🐻</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-300">Bear canister required</p>
            <p className="text-amber-200/80 mt-0.5 leading-snug line-clamp-2" title={bearInfo}>
              {bearInfo}
            </p>
            <a
              href="https://www.rei.com/c/bear-canisters"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-1 text-amber-400 hover:text-amber-300 underline"
            >
              Rent at REI →
            </a>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 text-amber-500 hover:text-amber-300 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Permit alert */}
      {permitRequired && (
        <div className="flex items-start gap-2 rounded-lg border border-orange-600/50 bg-orange-950/60 px-3 py-2 text-xs">
          <span className="mt-0.5 text-sm leading-none flex-shrink-0">📋</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-orange-300">Wilderness permit required</p>
            <p className="text-orange-200/80 mt-0.5 leading-snug line-clamp-2" title={permitInfo}>
              {permitInfo}
            </p>
            <a
              href="https://www.recreation.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-1 text-orange-400 hover:text-orange-300 underline"
            >
              Reserve at recreation.gov →
            </a>
          </div>
          {!bearCanisterRequired && (
            <button
              onClick={() => setDismissed(true)}
              className="flex-shrink-0 text-orange-500 hover:text-orange-300 transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
