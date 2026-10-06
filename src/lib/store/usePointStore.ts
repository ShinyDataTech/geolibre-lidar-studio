import { create } from "zustand";
import type { ParsedLidarCloud } from "../parsers/las-loader";
import { createSyntheticLidarTile } from "../parsers/las-loader";

export interface PointCloudLayerItem {
  id: string;
  name: string;
  cloud: ParsedLidarCloud;
  visible: boolean;
  opacity: number;
}

interface PointState {
  layers: PointCloudLayerItem[];
  activeLayerId: string | null;
  isLoading: boolean;
  loadingProgress: string | null;
  error: string | null;

  // Actions
  addLayer: (cloud: ParsedLidarCloud) => void;
  removeLayer: (id: string) => void;
  setActiveLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  updateActiveLayerCloud: (updater: (prev: ParsedLidarCloud) => ParsedLidarCloud) => void;
  loadDemoTile: () => void;
  setLoading: (isLoading: boolean, progress?: string | null) => void;
  setError: (error: string | null) => void;
}

export const usePointStore = create<PointState>((set, get) => ({
  layers: [],
  activeLayerId: null,
  isLoading: false,
  loadingProgress: null,
  error: null,

  addLayer: (cloud) => {
    const newItem: PointCloudLayerItem = {
      id: cloud.id,
      name: cloud.name,
      cloud,
      visible: true,
      opacity: 1.0,
    };
    set((state) => ({
      layers: [...state.layers, newItem],
      activeLayerId: newItem.id,
      error: null,
    }));
  },

  removeLayer: (id) => {
    set((state) => {
      const remaining = state.layers.filter((l) => l.id !== id);
      const nextActive = state.activeLayerId === id
        ? (remaining.length > 0 ? remaining[0].id : null)
        : state.activeLayerId;
      return { layers: remaining, activeLayerId: nextActive };
    });
  },

  setActiveLayer: (id) => set({ activeLayerId: id }),

  toggleLayerVisibility: (id) => {
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    }));
  },

  setLayerOpacity: (id, opacity) => {
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, opacity } : l)),
    }));
  },

  updateActiveLayerCloud: (updater) => {
    set((state) => {
      if (!state.activeLayerId) return state;
      return {
        layers: state.layers.map((l) => {
          if (l.id !== state.activeLayerId) return l;
          return {
            ...l,
            cloud: updater(l.cloud),
          };
        }),
      };
    });
  },

  loadDemoTile: () => {
    const demo = createSyntheticLidarTile();
    get().addLayer(demo);
  },

  setLoading: (isLoading, loadingProgress = null) => set({ isLoading, loadingProgress }),
  setError: (error) => set({ error }),
}));
