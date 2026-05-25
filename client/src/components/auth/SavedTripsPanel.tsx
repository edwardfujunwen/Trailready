import { useEffect, useState } from 'react';
import { useSavedTrips } from '../../hooks/useSavedTrips';
import type { SavedTrip } from '../../lib/supabase';

interface Props {
  onClose: () => void;
  onTripLoaded: () => void;
}

export function SavedTripsPanel({ onClose, onTripLoaded }: Props) {
  const { trips, loading, fetchTrips, saveTrip, loadTrip, deleteTrip } = useSavedTrips();
  const [saving, setSaving] = useState(false);
  const [tripName, setTripName] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  const handleSave = async () => {
    if (!tripName.trim()) return;
    setSaving(true);
    setSaveError(null);
    const { error } = await saveTrip(tripName.trim());
    if (error) { setSaveError(error); }
    else { setSaved(true); setTripName(''); setTimeout(() => setSaved(false), 3000); }
    setSaving(false);
  };

  const handleLoad = (trip: SavedTrip) => {
    loadTrip(trip);
    onTripLoaded();
    onClose();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteTrip(id);
    setDeletingId(null);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-800">
          <div>
            <h2 className="text-white font-bold text-lg">🗺️ My Saved Trips</h2>
            <p className="text-stone-400 text-sm mt-0.5">Save your current trip or load a previous one</p>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors text-xl leading-none">✕</button>
        </div>

        {/* Save current trip */}
        <div className="p-4 border-b border-stone-800">
          <p className="text-stone-400 text-xs font-medium uppercase tracking-wider mb-2">Save current trip</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Yosemite July, Zion Fall"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="flex-1 bg-stone-800 border border-stone-700 text-white placeholder-stone-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-forest-500"
            />
            <button
              onClick={handleSave}
              disabled={saving || !tripName.trim()}
              className="bg-forest-600 hover:bg-forest-500 disabled:opacity-40 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save'}
            </button>
          </div>
          {saveError && <p className="text-red-400 text-xs mt-1">{saveError}</p>}
        </div>

        {/* Trip list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-stone-500 text-sm">Loading…</div>
          ) : trips.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-stone-400 text-sm">No saved trips yet.</p>
              <p className="text-stone-500 text-xs mt-1">Plan something amazing and save it above!</p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-800">
              {trips.map((trip) => (
                <li key={trip.id} className="flex items-center justify-between p-4 hover:bg-stone-800/50 group transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{trip.name}</p>
                    <p className="text-stone-500 text-xs mt-0.5">
                      {(trip.trip_data as Record<string, unknown>).tripType as string ?? 'Trip'} · Saved {formatDate(trip.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <button
                      onClick={() => handleLoad(trip)}
                      className="bg-stone-700 hover:bg-forest-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDelete(trip.id)}
                      disabled={deletingId === trip.id}
                      className="text-stone-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-sm"
                      title="Delete trip"
                    >
                      {deletingId === trip.id ? '…' : '🗑️'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
