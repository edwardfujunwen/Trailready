import type { Trail } from '../types/trail';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export async function fetchTrails(bbox: [number, number, number, number]): Promise<Trail[]> {
  const [west, south, east, north] = bbox;
  const query = `
    [out:json][timeout:25];
    (
      way["highway"="path"]["foot"!="no"](${south},${west},${north},${east});
      way["highway"="track"]["foot"="yes"](${south},${west},${north},${east});
      way["highway"="footway"](${south},${west},${north},${east});
    );
    out geom;
  `;

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!res.ok) throw new Error('Overpass API error');
  const data = await res.json();

  return (data.elements || [])
    .filter((el: any) => el.type === 'way' && el.geometry?.length > 1)
    .map((el: any) => ({
      id: `way/${el.id}`,
      name: el.tags?.name || el.tags?.ref || 'Trail',
      geometry: {
        type: 'LineString',
        coordinates: el.geometry.map((pt: any) => [pt.lon, pt.lat]),
      },
      surface: el.tags?.surface,
    }));
}
