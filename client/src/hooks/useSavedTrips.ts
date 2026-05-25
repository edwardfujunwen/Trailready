import { useState, useCallback } from 'react';
import { supabase, type SavedTrip } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useTripStore } from '../store/useTripStore';
import { useTrailStore } from '../store/useTrailStore';
import { usePackingStore } from '../store/usePackingStore';

export function useSavedTrips() {
  const user = useAuthStore((s) => s.user);
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tripStore = useTripStore();
  const loadedTrail = useTrailStore((s) => s.loadedTrail);
  const packingList = usePackingStore((s) => s.list);

  const fetchTrips = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) setError(error.message);
    else setTrips(data ?? []);
    setLoading(false);
  }, [user]);

  const saveTrip = useCallback(async (tripName: string) => {
    if (!user) return { error: 'Not signed in' };
    const tripData = {
      location: tripStore.location,
      tripType: tripStore.tripType,
      nights: tripStore.nights,
      checkin: tripStore.checkin,
      checkout: tripStore.checkout,
      groupSize: tripStore.groupSize,
      loadedTrail,
      packingList,
    };

    const { error } = await supabase.from('trips').upsert({
      user_id: user.id,
      name: tripName,
      trip_data: tripData,
      updated_at: new Date().toISOString(),
    });

    if (error) return { error: error.message };
    await fetchTrips();
    return { error: null };
  }, [user, tripStore, loadedTrail, packingList, fetchTrips]);

  const loadTrip = useCallback((trip: SavedTrip) => {
    const data = trip.trip_data as Record<string, unknown>;
    if (data.location) tripStore.setLocation(data.location as Parameters<typeof tripStore.setLocation>[0]);
    if (data.tripType) tripStore.setTripType(data.tripType as Parameters<typeof tripStore.setTripType>[0]);
    if (data.checkin && data.checkout) tripStore.setDates(data.checkin as string, data.checkout as string);
    if (data.groupSize) tripStore.setGroupSize(data.groupSize as number);
  }, [tripStore]);

  const deleteTrip = useCallback(async (tripId: string) => {
    const { error } = await supabase.from('trips').delete().eq('id', tripId);
    if (error) return { error: error.message };
    setTrips((prev) => prev.filter((t) => t.id !== tripId));
    return { error: null };
  }, []);

  return { trips, loading, error, fetchTrips, saveTrip, loadTrip, deleteTrip };
}
