export interface AsprsClassDef {
  code: number;
  label: string;
  color: [number, number, number]; // RGB
}

export const ASPRS_STANDARD_CLASSES: Record<number, AsprsClassDef> = {
  0: { code: 0, label: "Created / Never Classified", color: [140, 140, 140] },
  1: { code: 1, label: "Unassigned", color: [170, 170, 170] },
  2: { code: 2, label: "Ground", color: [160, 82, 45] }, // Sienna / Brown
  3: { code: 3, label: "Low Vegetation", color: [144, 238, 144] }, // Light Green
  4: { code: 4, label: "Medium Vegetation", color: [60, 179, 113] }, // Medium Sea Green
  5: { code: 5, label: "High Vegetation / Canopy", color: [34, 139, 34] }, // Forest Green
  6: { code: 6, label: "Building / Structure", color: [220, 20, 60] }, // Crimson / Red
  7: { code: 7, label: "Low Point (Noise)", color: [255, 69, 0] }, // Red-Orange
  8: { code: 8, label: "Model Key-point", color: [255, 215, 0] }, // Gold
  9: { code: 9, label: "Water", color: [30, 144, 255] }, // Dodger Blue
  10: { code: 10, label: "Rail", color: [128, 128, 128] },
  11: { code: 11, label: "Road Surface", color: [70, 70, 70] },
  12: { code: 12, label: "Overlap / Reserved", color: [199, 21, 133] },
  13: { code: 13, label: "Wire - Guard", color: [255, 140, 0] },
  14: { code: 14, label: "Wire - Conductor", color: [255, 165, 0] },
  15: { code: 15, label: "Transmission Tower", color: [210, 105, 30] },
  16: { code: 16, label: "Wire-structure Connector", color: [205, 133, 63] },
  17: { code: 17, label: "Bridge Deck", color: [165, 42, 42] },
  18: { code: 18, label: "High Noise", color: [255, 0, 255] },
};

export const DEFAULT_FALLBACK_COLOR: [number, number, number] = [180, 180, 180];

export function getAsprsClassColor(code: number): [number, number, number] {
  return ASPRS_STANDARD_CLASSES[code]?.color ?? DEFAULT_FALLBACK_COLOR;
}

export function getAsprsClassLabel(code: number): string {
  return ASPRS_STANDARD_CLASSES[code]?.label ?? `Class ${code}`;
}
