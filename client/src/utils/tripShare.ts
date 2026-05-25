interface ShareableTrip {
  locationName: string;
  lat: number;
  lon: number;
  tripType: string;
  checkin?: string;
  checkout?: string;
}

export function encodeTripToUrl(trip: ShareableTrip): string {
  const compressed = btoa(JSON.stringify(trip));
  const url = new URL(window.location.href);
  url.searchParams.set('trip', compressed);
  return url.toString();
}

export function decodeTripFromUrl(): ShareableTrip | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('trip');
    if (!encoded) return null;
    return JSON.parse(atob(encoded)) as ShareableTrip;
  } catch {
    return null;
  }
}
