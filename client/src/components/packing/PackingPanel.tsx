import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePackingStore } from '../../store/usePackingStore';
import { useTripStore } from '../../store/useTripStore';
import { usePackingList } from '../../hooks/usePackingList';
import PackingCategory from './PackingCategory';

export default function PackingPanel() {
  const { list, loading, error } = usePackingStore();
  const { generate } = usePackingList();
  const location = useTripStore((s) => s.location);
  const checkin = useTripStore((s) => s.checkin);
  const checkout = useTripStore((s) => s.checkout);
  const tripType = useTripStore((s) => s.tripType);
  const groupSize = useTripStore((s) => s.groupSize);
  const setGroupSize = useTripStore((s) => s.setGroupSize);
  const isDayHike = tripType === 'hiking';
  const canGenerate = !!location && (isDayHike || (!!checkin && !!checkout));

  // Budget calculation
  const budgetRange = useMemo(() => {
    if (!list) return null;
    let low = 0, high = 0, count = 0;
    for (const cat of list.categories) {
      for (const item of cat.items) {
        if (!item.priceRangeUsd) continue;
        const match = item.priceRangeUsd.match(/\$?([\d.]+)[–\-]([\d.]+)/);
        if (match) {
          low += parseFloat(match[1]) * item.quantity;
          high += parseFloat(match[2]) * item.quantity;
          count++;
        }
      }
    }
    if (count === 0) return null;
    return { low: Math.round(low), high: Math.round(high), count };
  }, [list]);

  return (
    <div className="flex flex-col h-full">
      {/* Hidden printable div — only visible during @media print */}
      {list && (
        <div className="print-packing-list hidden">
          <h1 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>
            TrailReady Packing List
          </h1>
          {location && (
            <p style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>
              {location.name}{checkin && checkout ? ` · ${checkin} – ${checkout}` : ''}
            </p>
          )}
          {list.tripSummary && (
            <p style={{ fontSize: 12, fontStyle: 'italic', marginBottom: 16, color: '#444' }}>
              {list.tripSummary}
            </p>
          )}
          {list.categories.map((cat) => (
            <div key={cat.name} className="print-category">
              <div className="print-category-name">{cat.name}</div>
              {cat.items.map((item) => (
                <div key={item.name} className="print-item">
                  <span className="print-item-name">
                    {item.quantity > 1 ? `${item.quantity}× ` : ''}{item.name}
                    {item.notes ? ` — ${item.notes}` : ''}
                  </span>
                  {item.weightOz > 0 && (
                    <span className="print-item-weight">{item.weightOz} oz</span>
                  )}
                  <span className="print-item-priority">{item.priority}</span>
                </div>
              ))}
            </div>
          ))}
          <p style={{ fontSize: 10, color: '#aaa', marginTop: 24 }}>
            Generated {new Date(list.generatedAt).toLocaleDateString()} · TrailReady
          </p>
        </div>
      )}

      <div className="p-3 border-b border-stone-800 flex items-center justify-between flex-shrink-0 no-print">
        <h2 className="text-sm font-semibold text-stone-300">Packing List</h2>
        <div className="flex items-center gap-2">
          {list && (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Export PDF
            </button>
          )}
          {list && (
            <Link to="/packing" className="text-xs text-forest-400 hover:text-forest-300">
              Full list →
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-b border-stone-800 no-print flex-shrink-0">
        <span className="text-xs text-stone-400 flex-1">Group size</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGroupSize(Math.max(1, groupSize - 1))}
            className="w-6 h-6 rounded-full bg-stone-700 hover:bg-stone-600 text-stone-300 text-sm flex items-center justify-center transition-colors"
          >−</button>
          <span className="text-sm font-semibold text-stone-100 w-4 text-center">{groupSize}</span>
          <button
            onClick={() => setGroupSize(Math.min(12, groupSize + 1))}
            className="w-6 h-6 rounded-full bg-stone-700 hover:bg-stone-600 text-stone-300 text-sm flex items-center justify-center transition-colors"
          >+</button>
        </div>
        <span className="text-xs text-stone-600">{groupSize === 1 ? 'Solo' : `${groupSize} people`}</span>
      </div>

      <div className="p-3 border-b border-stone-800 flex-shrink-0 no-print">
        <button
          onClick={generate}
          disabled={!canGenerate || loading}
          className="btn-primary w-full text-sm flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {list ? 'Regenerate' : 'Generate'} Packing List
            </>
          )}
        </button>
        {!canGenerate && (
          <p className="text-xs text-stone-600 mt-2 text-center">
            {!location ? 'Search a location first' : 'Select trip dates above'}
          </p>
        )}
      </div>

      {error && (
        <div className="m-3 bg-red-950 border border-red-800 rounded-lg p-3 text-xs text-red-400 no-print">
          {error}
        </div>
      )}

      {list && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2 no-print">
          {list.tripSummary && (
            <p className="text-xs text-stone-500 italic border-l-2 border-forest-600 pl-3 py-1">
              {list.tripSummary}
            </p>
          )}
          {list.categories.map((cat) => (
            <PackingCategory key={cat.name} category={cat} />
          ))}
          <p className="text-xs text-stone-700 text-center pb-2">
            Generated {new Date(list.generatedAt).toLocaleDateString()}
          </p>
        </div>
      )}

      {budgetRange && (
        <div className="flex-shrink-0 border-t border-stone-800 px-4 py-3 bg-stone-900/80 no-print">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500">Estimated gear budget</p>
              <p className="text-sm font-bold text-stone-100">
                ${budgetRange.low.toLocaleString()} – ${budgetRange.high.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-stone-600">{budgetRange.count} items priced</p>
              <p className="text-[10px] text-stone-600">mid-range estimate</p>
            </div>
          </div>
        </div>
      )}

      {!list && !loading && !error && (
        <div className="flex-1 flex items-center justify-center text-center p-6 no-print">
          <div className="text-stone-600">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">AI-powered packing list based on your destination and weather</p>
          </div>
        </div>
      )}
    </div>
  );
}
