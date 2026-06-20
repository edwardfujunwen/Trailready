import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NearbyTrail {
  id: string;
  name: string;
  distanceMi: number;
  geojson?: GeoJSON.FeatureCollection;
  // NPS enrichment (when trail comes from National Park Service)
  source?: 'nps' | 'osm';
  description?: string;
  duration?: string;
  difficulty?: string;
  npsUrl?: string;
  lat?: number;
  lon?: number;
  activities?: string[];
  routeType?: 'Loop' | 'Out & Back' | 'Point to Point';
}

export interface LoadedTrail {
  name: string;
  geojson?: GeoJSON.FeatureCollection;
  source: 'gpx' | 'search';
  distanceMi?: number;
  lat?: number; // fallback point when no route geometry available
  lon?: number;
}

interface TrailState {
  loadedTrail: LoadedTrail | null;
  nearbyTrails: NearbyTrail[];
  loadingTrails: boolean;
  trailError: string | null;
  activeParkCode: string | null;
  elevHoverPoint: { lat: number; lon: number } | null;
  trailheadCoords: { lat: number; lon: number } | null;
  parkingNotes: string | null;
  setLoadedTrail: (trail: LoadedTrail) => void;
  setNearbyTrails: (trails: NearbyTrail[]) => void;
  setLoadingTrails: (loading: boolean) => void;
  setTrailError: (error: string | null) => void;
  setActiveParkCode: (code: string | null) => void;
  setElevHoverPoint: (point: { lat: number; lon: number } | null) => void;
  setTrailheadCoords: (coords: { lat: number; lon: number } | null) => void;
  setParkingNotes: (notes: string | null) => void;
  clearTrail: () => void;
}

export const useTrailStore = create<TrailState>()(
  persist(
    (set) => ({
      loadedTrail: null,
      nearbyTrails: [],
      loadingTrails: false,
      trailError: null,
      activeParkCode: null,
      elevHoverPoint: null,
      trailheadCoords: null,
      parkingNotes: null,
      setLoadedTrail: (trail) => set({ loadedTrail: trail, trailError: null }),
      setNearbyTrails: (trails) => set({ nearbyTrails: trails }),
      setLoadingTrails: (loading) => set({ loadingTrails: loading }),
      setTrailError: (error) => set({ trailError: error }),
      setActiveParkCode: (code) => set({ activeParkCode: code }),
      setElevHoverPoint: (point) => set({ elevHoverPoint: point }),
      setTrailheadCoords: (coords) => set({ trailheadCoords: coords }),
      setParkingNotes: (notes) => set({ parkingNotes: notes }),
      clearTrail: () => set({ loadedTrail: null, trailheadCoords: null, parkingNotes: null }),
    }),
    { name: 'trail-store-v2', partialize: (s) => ({ loadedTrail: s.loadedTrail }) }
  )
);
