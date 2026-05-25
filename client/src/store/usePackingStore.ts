import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PackingList, PackingItem } from '../types/packing';

interface PackingState {
  list: PackingList | null;
  loading: boolean;
  error: string | null;
  setList: (list: PackingList) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleItem: (categoryName: string, itemName: string) => void;
  clearList: () => void;
}

export const usePackingStore = create<PackingState>()(
  persist(
    (set) => ({
      list: null,
      loading: false,
      error: null,
      setList: (list) => set({ list, error: null }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error, loading: false }),
      toggleItem: (categoryName, itemName) =>
        set((s) => {
          if (!s.list) return s;
          return {
            list: {
              ...s.list,
              categories: s.list.categories.map((cat) =>
                cat.name !== categoryName
                  ? cat
                  : {
                      ...cat,
                      items: cat.items.map((item: PackingItem) =>
                        item.name !== itemName ? item : { ...item, checked: !item.checked }
                      ),
                    }
              ),
            },
          };
        }),
      clearList: () => set({ list: null }),
    }),
    { name: 'packing-store-v3', partialize: () => ({}) }
  )
);
