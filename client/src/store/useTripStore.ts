import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Location, Waypoint } from '../types/trail';

export interface CarpoolEntry {
  driver: string;
  seats: number;
  passengers: string[];
}

export interface TentEntry {
  id: number;
  occupants: string[];
}

interface TripState {
  location: Location | null;
  checkin: string | null;
  checkout: string | null;
  waypoints: Waypoint[];
  tripType: 'hiking' | 'backpacking' | 'rockclimbing' | 'kayaking' | 'snowshoeing' | 'backcountryski';
  groupSize: number;
  groupMembers: string[];
  carpool: CarpoolEntry[];
  tents: TentEntry[];
  setLocation: (location: Location) => void;
  setDates: (checkin: string, checkout: string) => void;
  setTripType: (type: 'hiking' | 'backpacking' | 'rockclimbing' | 'kayaking' | 'snowshoeing' | 'backcountryski') => void;
  setGroupSize: (n: number) => void;
  setGroupMembers: (members: string[]) => void;
  setCarpool: (carpool: CarpoolEntry[]) => void;
  setTents: (tents: TentEntry[]) => void;
  addWaypoint: (waypoint: Waypoint) => void;
  clearWaypoints: () => void;
  nights: number;
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      location: null,
      checkin: null,
      checkout: null,
      waypoints: [],
      tripType: 'backpacking',
      groupSize: 1,
      groupMembers: [],
      carpool: [],
      tents: [],
      get nights() {
        const { checkin, checkout } = get();
        if (!checkin || !checkout) return 0;
        const ms = new Date(checkout).getTime() - new Date(checkin).getTime();
        return Math.max(0, Math.round(ms / 86400000));
      },
      setLocation: (location) => set({ location }),
      setDates: (checkin, checkout) => set({ checkin, checkout }),
      setTripType: (tripType) => set({ tripType }),
      setGroupSize: (groupSize) => set({ groupSize }),
      setGroupMembers: (groupMembers) => set({ groupMembers }),
      setCarpool: (carpool) => set({ carpool }),
      setTents: (tents) => set({ tents }),
      addWaypoint: (waypoint) => set((s) => ({ waypoints: [...s.waypoints, waypoint] })),
      clearWaypoints: () => set({ waypoints: [] }),
    }),
    { name: 'trip-store' }
  )
);
