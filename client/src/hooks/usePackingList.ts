import { generatePackingList } from '../api/packing';
import { usePackingStore } from '../store/usePackingStore';
import { useTripStore } from '../store/useTripStore';
import { useWeatherStore } from '../store/useWeatherStore';
import { useTrailStore } from '../store/useTrailStore';

export function usePackingList() {
  const { setList, setLoading, setError } = usePackingStore();
  const trip = useTripStore();
  const groupSize = useTripStore((s) => s.groupSize);
  const weather = useWeatherStore((s) => s.summary);
  const loadedTrail = useTrailStore((s) => s.loadedTrail);

  const generate = async () => {
    if (!trip.location) return;
    const isDayHike = trip.tripType === 'hiking';
    if (!isDayHike && (!trip.checkin || !trip.checkout)) return;
    const today = new Date().toISOString().split('T')[0];
    setLoading(true);
    try {
      const list = await generatePackingList({
        location: trip.location.name,
        nights: isDayHike ? 0 : trip.nights,
        checkin: trip.checkin || today,
        checkout: trip.checkout || today,
        elevationFt: trip.location.elevationFt,
        tempHighF: weather?.tempHighF,
        tempLowF: weather?.tempLowF,
        precipRisk: weather?.precipRisk,
        windSpeed: weather?.windSpeed,
        tripType: trip.tripType,
        trailName: loadedTrail?.name,
        trailDistanceMi: loadedTrail?.distanceMi,
        groupSize: groupSize,
      });
      setList(list);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return { generate };
}
