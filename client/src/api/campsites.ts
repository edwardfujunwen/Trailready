import type { Campground, AvailableSite } from '../types/campsite';

export async function searchCampgrounds(lat: number, lon: number, radius = 25): Promise<Campground[]> {
  const res = await fetch(`/api/campsites/search?lat=${lat}&lon=${lon}&radius=${radius}`);
  if (!res.ok) throw new Error('Failed to search campgrounds');
  return res.json();
}

export async function checkAvailability(
  campgroundId: string,
  checkin: string,
  checkout: string
): Promise<{ availableSites: AvailableSite[] }> {
  const res = await fetch(
    `/api/campsites/availability/${campgroundId}?checkin=${checkin}&checkout=${checkout}`
  );
  if (!res.ok) throw new Error('Failed to check availability');
  return res.json();
}
