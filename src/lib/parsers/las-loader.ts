import { parse } from "@loaders.gl/core";
import { LASLoader } from "@loaders.gl/las";

export interface ParsedLidarCloud {
  id: string;
  name: string;
  pointCount: number;
  positions: Float32Array; // [dx, dy, dz] offsets relative to coordinateOrigin
  coordinateOrigin: [number, number, number];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
  intensities?: Float32Array; // normalized 0-1
  rawIntensities?: Uint16Array;
  classifications?: Uint8Array;
  colors?: Uint8Array; // RGBA
  classCounts: Record<number, number>;
  sourceBytes?: Uint8Array;
}

/**
 * Direct fast binary reader for LAS 1.4 point records (formats 6, 7, 8).
 * Used when loaders.gl/las hits its version <= 1.3 ceiling.
 */
function parseDirectLas14(bytes: Uint8Array, filename: string): ParsedLidarCloud {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 375 || String.fromCharCode(...bytes.subarray(0, 4)) !== "LASF") {
    throw new Error("Invalid LAS file signature.");
  }

  const pointOffset = view.getUint32(96, true);
  const pointFormat = view.getUint8(104) & 0x3f;
  const recordLength = view.getUint16(105, true);

  const xScale = view.getFloat64(131, true);
  const yScale = view.getFloat64(139, true);
  const zScale = view.getFloat64(147, true);

  const xOffset = view.getFloat64(155, true);
  const yOffset = view.getFloat64(163, true);
  const zOffset = view.getFloat64(171, true);

  const maxX = view.getFloat64(179, true);
  const minX = view.getFloat64(187, true);
  const maxY = view.getFloat64(195, true);
  const minY = view.getFloat64(203, true);
  const maxZ = view.getFloat64(211, true);
  const minZ = view.getFloat64(219, true);

  let pointCount = view.getUint32(107, true);
  if (bytes.length >= 255) {
    const ext = Number(view.getBigUint64(247, true));
    if (ext > 0) pointCount = ext;
  }

  const available = Math.floor((bytes.length - pointOffset) / recordLength);
  const count = Math.min(pointCount, available);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const coordinateOrigin: [number, number, number] = [centerX, centerY, centerZ];

  const positions = new Float32Array(count * 3);
  const intensities = new Float32Array(count);
  const classifications = new Uint8Array(count);
  const classCounts: Record<number, number> = {};

  let hasColors = pointFormat === 7 || pointFormat === 8;
  const colors = hasColors ? new Uint8Array(count * 4) : undefined;

  let maxInt = 1;

  for (let i = 0; i < count; i++) {
    const p = pointOffset + i * recordLength;
    const rawX = view.getInt32(p, true);
    const rawY = view.getInt32(p + 4, true);
    const rawZ = view.getInt32(p + 8, true);

    const worldX = xOffset + rawX * xScale;
    const worldY = yOffset + rawY * yScale;
    const worldZ = zOffset + rawZ * zScale;

    positions[i * 3] = worldX - centerX;
    positions[i * 3 + 1] = worldY - centerY;
    positions[i * 3 + 2] = worldZ - centerZ;

    const rawI = view.getUint16(p + 12, true);
    if (rawI > maxInt) maxInt = rawI;
    intensities[i] = rawI;

    const cls = view.getUint8(p + 16);
    classifications[i] = cls;
    classCounts[cls] = (classCounts[cls] || 0) + 1;

    if (colors && p + 36 <= bytes.length) {
      // RGB channels (uint16 in LAS 1.4, convert to uint8)
      const r = view.getUint16(p + 30, true) >> 8;
      const g = view.getUint16(p + 32, true) >> 8;
      const b = view.getUint16(p + 34, true) >> 8;
      colors[i * 4] = r;
      colors[i * 4 + 1] = g;
      colors[i * 4 + 2] = b;
      colors[i * 4 + 3] = 255;
    }
  }

  // Normalize intensities
  const invMax = maxInt > 0 ? 1 / maxInt : 1;
  for (let i = 0; i < count; i++) {
    intensities[i] *= invMax;
  }

  return {
    id: `cloud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: filename,
    pointCount: count,
    positions,
    coordinateOrigin,
    bounds: { minX, maxX, minY, maxY, minZ, maxZ },
    intensities,
    classifications,
    colors,
    classCounts,
    sourceBytes: bytes,
  };
}

/**
 * Universal LAS/LAZ parser using loaders.gl with direct LAS 1.4 fallback.
 */
export async function parseLidarFile(
  fileOrBuffer: File | ArrayBuffer | Uint8Array,
  filename = "pointcloud.las",
): Promise<ParsedLidarCloud> {
  let arrayBuffer: ArrayBuffer;
  let sourceBytes: Uint8Array;

  if (fileOrBuffer instanceof File) {
    arrayBuffer = await fileOrBuffer.arrayBuffer();
    sourceBytes = new Uint8Array(arrayBuffer);
    filename = fileOrBuffer.name;
  } else if (fileOrBuffer instanceof Uint8Array) {
    sourceBytes = fileOrBuffer;
    arrayBuffer = fileOrBuffer.buffer.slice(
      fileOrBuffer.byteOffset,
      fileOrBuffer.byteOffset + fileOrBuffer.byteLength,
    ) as ArrayBuffer;
  } else {
    arrayBuffer = fileOrBuffer;
    sourceBytes = new Uint8Array(arrayBuffer);
  }

  // Try parsing with loaders.gl first (handles LAS 1.0-1.3 and LAZ compressed)
  try {
    const result = await parse(arrayBuffer, LASLoader, {
      las: {
        colorDepth: 8,
        fp64: false,
      },
      worker: false,
    });

    const attributes = result.attributes || {};
    const rawPositions = attributes.POSITION?.value as Float32Array | Float64Array;
    if (!rawPositions || rawPositions.length === 0) {
      throw new Error("No position data found in loaders.gl result.");
    }

    const pointCount = rawPositions.length / 3;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (let i = 0; i < pointCount; i++) {
      const x = rawPositions[i * 3];
      const y = rawPositions[i * 3 + 1];
      const z = rawPositions[i * 3 + 2];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const coordinateOrigin: [number, number, number] = [centerX, centerY, centerZ];

    const positions = new Float32Array(pointCount * 3);
    for (let i = 0; i < pointCount; i++) {
      positions[i * 3] = rawPositions[i * 3] - centerX;
      positions[i * 3 + 1] = rawPositions[i * 3 + 1] - centerY;
      positions[i * 3 + 2] = rawPositions[i * 3 + 2] - centerZ;
    }

    let intensities: Float32Array | undefined;
    const rawIntensityAttr = attributes.intensity?.value || attributes.INTENSITY?.value;
    if (rawIntensityAttr && rawIntensityAttr.length >= pointCount) {
      intensities = new Float32Array(pointCount);
      let maxI = 1;
      for (let i = 0; i < pointCount; i++) {
        if (rawIntensityAttr[i] > maxI) maxI = rawIntensityAttr[i];
      }
      const invMax = maxI > 0 ? 1 / maxI : 1;
      for (let i = 0; i < pointCount; i++) {
        intensities[i] = rawIntensityAttr[i] * invMax;
      }
    }

    let classifications: Uint8Array | undefined;
    const classCounts: Record<number, number> = {};
    const rawClassAttr = attributes.classification?.value || attributes.CLASSIFICATION?.value;
    if (rawClassAttr && rawClassAttr.length >= pointCount) {
      classifications = new Uint8Array(pointCount);
      for (let i = 0; i < pointCount; i++) {
        const cls = rawClassAttr[i];
        classifications[i] = cls;
        classCounts[cls] = (classCounts[cls] || 0) + 1;
      }
    } else {
      classifications = new Uint8Array(pointCount).fill(1);
      classCounts[1] = pointCount;
    }

    let colors: Uint8Array | undefined;
    const rawColorAttr = attributes.COLOR_0?.value || attributes.color?.value;
    if (rawColorAttr && rawColorAttr.length >= pointCount * 3) {
      colors = new Uint8Array(pointCount * 4);
      const hasAlpha = rawColorAttr.length >= pointCount * 4;
      for (let i = 0; i < pointCount; i++) {
        const srcIdx = hasAlpha ? i * 4 : i * 3;
        colors[i * 4] = rawColorAttr[srcIdx];
        colors[i * 4 + 1] = rawColorAttr[srcIdx + 1];
        colors[i * 4 + 2] = rawColorAttr[srcIdx + 2];
        colors[i * 4 + 3] = hasAlpha ? rawColorAttr[srcIdx + 3] : 255;
      }
    }

    return {
      id: `cloud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: filename,
      pointCount,
      positions,
      coordinateOrigin,
      bounds: { minX, maxX, minY, maxY, minZ, maxZ },
      intensities,
      classifications,
      colors,
      classCounts,
      sourceBytes,
    };
  } catch (err) {
    // If loaders.gl fails due to version 1.4 or format 6+, fallback to direct parser
    return parseDirectLas14(sourceBytes, filename);
  }
}

/**
 * Creates a synthetic realistic 3D LiDAR terrain tile for immediate test & preview.
 * Features undulating terrain, a cluster of buildings, and vegetation canopy.
 */
export function createSyntheticLidarTile(): ParsedLidarCloud {
  const numPoints = 80000;
  const positions = new Float32Array(numPoints * 3);
  const intensities = new Float32Array(numPoints);
  const classifications = new Uint8Array(numPoints);
  const classCounts: Record<number, number> = {};

  const size = 300; // 300m x 300m
  let ptr = 0;

  for (let i = 0; i < numPoints; i++) {
    const x = (Math.random() - 0.5) * size;
    const y = (Math.random() - 0.5) * size;

    // Rolling hill terrain (bare earth)
    const terrainZ = Math.sin(x * 0.02) * 12 + Math.cos(y * 0.015) * 15 + Math.sin((x + y) * 0.04) * 4;

    let z = terrainZ;
    let cls = 2; // Ground
    let intensity = 0.3 + Math.random() * 0.2;

    // Building zone: [-80, -20] x [-60, 40]
    const inBuilding1 = x > -80 && x < -40 && y > -40 && y < 20;
    const inBuilding2 = x > 30 && x < 80 && y > -60 && y < -10;

    if (inBuilding1) {
      z = terrainZ + 18 + (Math.random() * 0.4);
      cls = 6; // Building
      intensity = 0.8 + Math.random() * 0.2;
    } else if (inBuilding2) {
      z = terrainZ + 12 + (Math.random() * 0.3);
      cls = 6; // Building
      intensity = 0.75 + Math.random() * 0.2;
    } else {
      // Tree canopy zone: random clusters
      const distFromTree1 = Math.hypot(x - 50, y - 60);
      const distFromTree2 = Math.hypot(x + 50, y - 80);
      const distFromTree3 = Math.hypot(x - 100, y - 90);

      if (distFromTree1 < 30 || distFromTree2 < 25 || distFromTree3 < 35) {
        if (Math.random() > 0.3) {
          z = terrainZ + 2 + Math.random() * 14;
          cls = 5; // High Vegetation
          intensity = 0.4 + Math.random() * 0.3;
        }
      }
    }

    // Outlier / noise points (low probability)
    if (Math.random() < 0.002) {
      z = terrainZ + 60 + Math.random() * 20;
      cls = 7; // Low/High Noise
      intensity = 0.1;
    }

    positions[ptr] = x;
    positions[ptr + 1] = y;
    positions[ptr + 2] = z;

    intensities[i] = intensity;
    classifications[i] = cls;
    classCounts[cls] = (classCounts[cls] || 0) + 1;

    ptr += 3;
  }

  return {
    id: "synthetic-autzen-demo",
    name: "Autzen_Terrain_Sample.laz",
    pointCount: numPoints,
    positions,
    coordinateOrigin: [0, 0, 0],
    bounds: {
      minX: -size / 2,
      maxX: size / 2,
      minY: -size / 2,
      maxY: size / 2,
      minZ: -20,
      maxZ: 90,
    },
    intensities,
    classifications,
    classCounts,
  };
}
