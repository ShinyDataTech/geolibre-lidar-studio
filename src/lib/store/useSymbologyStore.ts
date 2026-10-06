import { create } from "zustand";

export type ColorMode = "elevation" | "intensity" | "classification" | "rgb";

interface SymbologyState {
  colorMode: ColorMode;
  colorRamp: string; // 'turbo' | 'viridis' | 'plasma' | 'elevation'
  pointSize: number;
  minElevationCustom: number | null;
  maxElevationCustom: number | null;
  intensityContrast: number; // 0.5 - 2.0
  hiddenClasses: Set<number>; // ASPRS classes toggled off
  maxPointsRendered: number;

  setColorMode: (mode: ColorMode) => void;
  setColorRamp: (ramp: string) => void;
  setPointSize: (size: number) => void;
  setElevationRange: (min: number | null, max: number | null) => void;
  setIntensityContrast: (contrast: number) => void;
  toggleClassificationVisibility: (cls: number) => void;
  showAllClasses: () => void;
  setMaxPointsRendered: (limit: number) => void;
}

export const useSymbologyStore = create<SymbologyState>((set) => ({
  colorMode: "elevation",
  colorRamp: "turbo",
  pointSize: 2.5,
  minElevationCustom: null,
  maxElevationCustom: null,
  intensityContrast: 1.0,
  hiddenClasses: new Set<number>(),
  maxPointsRendered: 5000000,

  setColorMode: (colorMode) => set({ colorMode }),
  setColorRamp: (colorRamp) => set({ colorRamp }),
  setPointSize: (pointSize) => set({ pointSize }),
  setElevationRange: (minElevationCustom, maxElevationCustom) => set({ minElevationCustom, maxElevationCustom }),
  setIntensityContrast: (intensityContrast) => set({ intensityContrast }),

  toggleClassificationVisibility: (cls) => {
    set((state) => {
      const next = new Set(state.hiddenClasses);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return { hiddenClasses: next };
    });
  },

  showAllClasses: () => set({ hiddenClasses: new Set() }),
  setMaxPointsRendered: (maxPointsRendered) => set({ maxPointsRendered }),
}));
