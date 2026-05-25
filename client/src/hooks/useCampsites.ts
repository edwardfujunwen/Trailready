import { useEffect } from 'react';
import { searchCampgrounds, checkAvailability } from '../api/campsites';
import { useCampsiteStore } from '../store/useCampsiteStore';
import { useTripStore } from '../store/useTripStore';

export function useCampsites() {
  const location = useTripStore((s) => s.location);
  const checkin = useTripStore((s) => s.checkin);
  const checkout = useTripStore((s) => s.checkout);
  const { campgrounds, setCampgrounds, updateCampground, setLoading, setError } = useCampsiteStore();

  // Load campgrounds when location changes
  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    setLoading(true);

    const timeout = setTimeout(() => {
      if (!cancelled) setError('Campsite search timed out. Make sure the server is running (npm run dev).');
    }, 10000);

    searchCampgrounds(location.lat, location.lon)
      .then((cgs) => {
        clearTimeout(timeout);
        if (!cancelled) { setCampgrounds(cgs); setLoading(false); }
      })
      .catch((err) => {
        clearTimeout(timeout);
        if (!cancelled) setError(err.message);
      });
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [location?.lat, location?.lon]);

  // Auto-check availability for all campgrounds when dates are set
  useEffect(() => {
    if (!checkin || !checkout || campgrounds.length === 0) return;
    let cancelled = false;

    // Reset stale availability data from previous date selection
    campgrounds.forEach((cg) =>
      updateCampground(cg.id, { availabilityChecked: false, availableSites: [] })
    );

    // Check each campground sequentially to avoid hammering the API
    (async () => {
      for (const cg of campgrounds) {
        if (cancelled) break;
        try {
          const result = await checkAvailability(cg.id, checkin, checkout);
          if (!cancelled) {
            updateCampground(cg.id, {
              availableSites: result.availableSites,
              availabilityChecked: true,
            });
          }
        } catch {
          if (!cancelled) updateCampground(cg.id, { availabilityChecked: true, availableSites: [] });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [checkin, checkout]);

  const checkSiteAvailability = async (campgroundId: string) => {
    if (!checkin || !checkout) return;
    try {
      const result = await checkAvailability(campgroundId, checkin, checkout);
      updateCampground(campgroundId, {
        availableSites: result.availableSites,
        availabilityChecked: true,
      });
    } catch (err: any) {
      console.error('Availability check failed:', err.message);
    }
  };

  return { checkSiteAvailability };
}
