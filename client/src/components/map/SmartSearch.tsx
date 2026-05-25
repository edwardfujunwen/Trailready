import { useState, useRef, useEffect } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { useTrailStore } from '../../store/useTrailStore';
import { usePackingStore } from '../../store/usePackingStore';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string];
  address?: { state?: string };
}

export default function SmartSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { setLocation } = useTripStore();
  const { setNearbyTrails } = useTrailStore();
  const { clearList } = usePackingStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setShowDropdown(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1&countrycodes=us`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'TrailReady/1.0' } });
        const data: NominatimResult[] = await res.json();
        setResults(data);
        setShowDropdown(data.length > 0);
      } catch { setResults([]); }
      setLoading(false);
    }, 350);
  }, [query]);

  const handleSelect = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const [south, north, west, east] = result.boundingbox.map(parseFloat);

    setNearbyTrails([]);
    clearList();
    setLocation({ name: result.display_name, lat, lon, bbox: [west, south, east, north], state: result.address?.state });
    setQuery(result.display_name.split(',')[0]);
    setShowDropdown(false);
  };

  return (
    <div ref={wrapperRef} className="relative p-3">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder="Search a place or park..."
          className="w-full bg-stone-800 border border-stone-600 rounded-xl pl-10 pr-10 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-forest-500 focus:ring-1 focus:ring-forest-500/30"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-forest-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Dropdown results */}
      {showDropdown && results.length > 0 && (
        <ul className="absolute left-3 right-3 top-full mt-1 bg-stone-800 border border-stone-600 rounded-xl overflow-hidden shadow-2xl z-50">
          {results.map((r) => (
            <li key={r.place_id}>
              <button
                onClick={() => handleSelect(r)}
                className="w-full text-left px-4 py-2.5 text-sm text-stone-200 hover:bg-stone-700 transition-colors border-b border-stone-700/50 last:border-0"
              >
                <span className="font-medium">{r.display_name.split(',')[0]}</span>
                <span className="text-stone-500 text-xs ml-2">{r.display_name.split(',').slice(1, 3).join(',')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
