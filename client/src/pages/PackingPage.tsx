import { Link } from 'react-router-dom';
import { usePackingStore } from '../store/usePackingStore';
import { useTripStore } from '../store/useTripStore';
import PackingCategory from '../components/packing/PackingCategory';

export default function PackingPage() {
  const { list, clearList } = usePackingStore();
  const location = useTripStore((s) => s.location);
  const checkin = useTripStore((s) => s.checkin);
  const checkout = useTripStore((s) => s.checkout);
  const nights = useTripStore((s) => s.nights);

  const totalItems = list?.categories.reduce((sum, c) => sum + c.items.length, 0) ?? 0;
  const totalWeightOz = list?.categories.reduce(
    (sum, c) => sum + c.items.reduce((s, i) => s + i.weightOz * i.quantity, 0),
    0
  ) ?? 0;
  const checkedCount = list?.categories.reduce(
    (sum, c) => sum + c.items.filter((i) => i.checked).length,
    0
  ) ?? 0;

  if (!list) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-500 mb-4">No packing list generated yet.</p>
          <Link to="/" className="btn-primary">← Go back and generate one</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="sticky top-0 bg-stone-900 border-b border-stone-800 px-6 py-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-stone-400 hover:text-stone-200 text-sm">← Back to Planner</Link>
          <h1 className="font-bold text-lg">⛺ TrailReady — Packing List</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => window.print()} className="btn-secondary text-sm">Print / PDF</button>
          <button onClick={clearList} className="text-xs text-red-400 hover:text-red-300">Clear list</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Trip header */}
        <div className="mb-6 p-4 bg-stone-900 rounded-xl border border-stone-800">
          <h2 className="font-bold text-stone-100">{location?.name || 'Backpacking Trip'}</h2>
          <div className="flex gap-4 mt-1 text-sm text-stone-400">
            {checkin && checkout && <span>{checkin} → {checkout}</span>}
            {nights > 0 && <span>{nights} nights</span>}
          </div>
          {list.tripSummary && (
            <p className="mt-2 text-sm text-stone-500 italic">{list.tripSummary}</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-stone-900 rounded-lg p-3 text-center border border-stone-800">
            <p className="text-2xl font-bold text-forest-400">{totalItems}</p>
            <p className="text-xs text-stone-500">Total Items</p>
          </div>
          <div className="bg-stone-900 rounded-lg p-3 text-center border border-stone-800">
            <p className="text-2xl font-bold text-stone-200">{(totalWeightOz / 16).toFixed(1)}</p>
            <p className="text-xs text-stone-500">Pounds</p>
          </div>
          <div className="bg-stone-900 rounded-lg p-3 text-center border border-stone-800">
            <p className="text-2xl font-bold text-amber-400">{checkedCount}</p>
            <p className="text-xs text-stone-500">Packed</p>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          {list.categories.map((cat) => (
            <PackingCategory key={cat.name} category={cat} />
          ))}
        </div>
      </main>
    </div>
  );
}
