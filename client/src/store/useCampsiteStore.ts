import { create } from 'zustand';
import type { Campground } from '../types/campsite';

interface CampsiteState {
  campgrounds: Campground[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  setCampgrounds: (campgrounds: Campground[]) => void;
  updateCampground: (id: string, updates: Partial<Campground>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedId: (id: string | null) => void;
}

export const useCampsiteStore = create<CampsiteState>()((set) => ({
  campgrounds: [],
  loading: false,
  error: null,
  selectedId: null,
  setCampgrounds: (campgrounds) => set({ campgrounds, error: null }),
  updateCampground: (id, updates) =>
    set((s) => ({
      campgrounds: s.campgrounds.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  setSelectedId: (selectedId) => set({ selectedId }),
}));
