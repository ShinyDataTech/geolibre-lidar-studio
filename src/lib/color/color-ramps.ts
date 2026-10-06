/**
 * Common scientific colormaps represented as normalized [r, g, b] stops (0-255).
 */
export type ColorStop = [number, number, number];

export interface ColorRamp {
  id: string;
  name: string;
  stops: ColorStop[];
}

export const COLOR_RAMPS: Record<string, ColorRamp> = {
  turbo: {
    id: "turbo",
    name: "Turbo",
    stops: [
      [48, 18, 59],
      [70, 134, 251],
      [27, 229, 181],
      [164, 252, 60],
      [251, 185, 56],
      [227, 68, 10],
      [122, 4, 3],
    ],
  },
  viridis: {
    id: "viridis",
    name: "Viridis",
    stops: [
      [68, 1, 84],
      [71, 44, 122],
      [59, 81, 139],
      [44, 113, 142],
      [33, 144, 141],
      [57, 182, 105],
      [122, 209, 81],
      [253, 231, 37],
    ],
  },
  plasma: {
    id: "plasma",
    name: "Plasma",
    stops: [
      [13, 8, 135],
      [84, 2, 163],
      [139, 10, 165],
      [185, 50, 137],
      [219, 92, 104],
      [244, 136, 73],
      [254, 188, 43],
      [240, 249, 33],
    ],
  },
  elevation: {
    id: "elevation",
    name: "Terrain / Elevation",
    stops: [
      [46, 117, 89],
      [112, 163, 85],
      [199, 196, 129],
      [184, 144, 98],
      [154, 110, 87],
      [180, 180, 180],
      [255, 255, 255],
    ],
  },
  coolwarm: {
    id: "coolwarm",
    name: "Cool to Warm",
    stops: [
      [59, 76, 192],
      [120, 154, 242],
      [190, 209, 251],
      [242, 242, 242],
      [245, 180, 155],
      [221, 101, 80],
      [180, 4, 38],
    ],
  },
  grayscale: {
    id: "grayscale",
    name: "Grayscale",
    stops: [
      [0, 0, 0],
      [255, 255, 255],
    ],
  },
};

/**
 * Samples a color stop array with a normalized t value [0, 1].
 */
export function sampleColorRamp(
  ramp: ColorRamp,
  t: number,
  alpha = 255,
): [number, number, number, number] {
  const clampedT = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
  const stops = ramp.stops;
  if (stops.length === 0) return [255, 255, 255, alpha];
  if (stops.length === 1) return [...stops[0], alpha];

  const pos = clampedT * (stops.length - 1);
  const lowIdx = Math.floor(pos);
  const highIdx = Math.min(stops.length - 1, lowIdx + 1);
  const frac = pos - lowIdx;

  const c1 = stops[lowIdx];
  const c2 = stops[highIdx];

  const r = Math.round(c1[0] + frac * (c2[0] - c1[0]));
  const g = Math.round(c1[1] + frac * (c2[1] - c1[1]));
  const b = Math.round(c1[2] + frac * (c2[2] - c1[2]));

  return [r, g, b, alpha];
}
