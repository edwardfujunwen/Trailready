/** Haversine distance between two lat/lon points in miles */
function haversineMi(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface GpxResult {
  name: string;
  geojson: GeoJSON.FeatureCollection;
  distanceMi: number;
}

export function parseGpx(text: string): GpxResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid GPX file');
  }

  // Extract trail name
  const nameEl = doc.querySelector('trk > name') || doc.querySelector('rte > name') || doc.querySelector('gpx > name');
  const name = nameEl?.textContent?.trim() || 'Unnamed Trail';

  // Try track points first, fall back to route points
  let pointEls = Array.from(doc.querySelectorAll('trkpt'));
  if (pointEls.length === 0) {
    pointEls = Array.from(doc.querySelectorAll('rtept'));
  }

  if (pointEls.length === 0) {
    throw new Error('No track or route points found in GPX file');
  }

  const coordinates: [number, number][] = pointEls.map((pt) => {
    const lat = parseFloat(pt.getAttribute('lat') || '0');
    const lon = parseFloat(pt.getAttribute('lon') || '0');
    return [lon, lat];
  });

  // Calculate total distance using Haversine
  let distanceMi = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const [lon1, lat1] = coordinates[i - 1];
    const [lon2, lat2] = coordinates[i];
    distanceMi += haversineMi(lat1, lon1, lat2, lon2);
  }

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates,
        },
        properties: { name },
      },
    ],
  };

  return { name, geojson, distanceMi };
}
