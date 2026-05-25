export interface Location {
  name: string;
  lat: number;
  lon: number;
  bbox?: [number, number, number, number]; // [west, south, east, north]
  elevationFt?: number;
  state?: string;
}

export interface Waypoint {
  lat: number;
  lon: number;
  name?: string;
}

export interface Trail {
  id: string;
  name: string;
  geometry: GeoJSON.LineString | GeoJSON.MultiLineString;
  distanceMi?: number;
  surface?: string;
}
