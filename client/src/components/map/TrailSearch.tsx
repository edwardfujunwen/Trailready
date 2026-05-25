import { useState, useRef, useEffect } from 'react';
import { useTripStore } from '../../store/useTripStore';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string]; // [south, north, west, east]
  type: string;
  address?: {
    state?: string;
    country?: string;
  };
}

export default function TrailSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const setLocation = useTripStore((s) => s.setLocation);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 3) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        // Nominatim — OpenStreetMap geocoder, free, no key required
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1&countrycodes=us`;
        const res = await fetch(url, {
          headers: { 'Accept-Language': 'en', 'User-Agent': 'TrailReady/1.0' },
        });
        const data: NominatimResult[] = await res.json();
        setResults(data);
      } catch { setResults([]); }
      setLoading(false);
    }, 500);
  }, [query]);

  const handleSelect = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    // Nominatim boundingbox: [south, north, west, east] → reorder to [west, south, east, north]
    const [south, north, west, east] = result.boundingbox.map(parseFloat);
    setLocation({
      name: result.display_name,
      lat,
      lon,
      bbox: [west, south, east, north],
      state: result.address?.state,
    });
    setQuery(result.display_name.split(',')[0]);
    setResults([]);
  };

  const shortName = (r: NominatimResult) => r.display_name.split(',')[0];
  const subName = (r: NominatimResult) => r.display_name.split(',').slice(1, 3).join(',').trim();

  return (
    <div className="relative p-3">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search trails, parks, mountains..."
          className="input pl-9 text-sm"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-forest-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>
      {results.length > 0 && (
        <ul className="absolute left-3 right-3 top-full mt-1 bg-stone-800 border border-stone-700 rounded-lg overflow-hidden shadow-xl z-50">
          {results.map((r) => (
            <li key={r.place_id}>
              <button
                onClick={() => handleSelect(r)}
                className="w-full text-left px-3 py-2 text-sm text-stone-200 hover:bg-stone-700 transition-colors"
              >
                <span className="font-medium">{shortName(r)}</span>
                {subName(r) && <span className="text-stone-500 text-xs ml-1">{subName(r)}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
