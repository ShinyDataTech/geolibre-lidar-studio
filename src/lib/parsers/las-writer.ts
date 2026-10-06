/**
 * Universal LAS Binary Serializer and Classifier Reader.
 * Formats: LAS 1.2 Point Data Record Format 1 (universally supported by loaders.gl and WhiteboxTools).
 */

export interface ExportPointData {
  positions: Float32Array; // [x, y, z] in local coordinate or world coordinates
  coordinateOrigin?: readonly [number, number, number];
  pointCount: number;
  classifications?: Uint8Array;
  intensities?: Float32Array | Uint16Array;
  colors?: Uint8Array;
}

const HEADER_SIZE = 227; // Standard LAS 1.2 header size
const POINT_RECORD_LENGTH = 28; // Point data record format 1 (LAS 1.2)

function writeAscii(view: DataView, offset: number, text: string, length: number): void {
  for (let i = 0; i < length; i++) {
    view.setUint8(offset + i, i < text.length ? text.charCodeAt(i) : 0);
  }
}

/**
 * Serializes point cloud arrays to an uncompressed LAS 1.2 binary buffer.
 */
export function writeLas(cloud: ExportPointData): Uint8Array {
  const count = cloud.pointCount;
  const positions = cloud.positions;
  const origin = cloud.coordinateOrigin ?? [0, 0, 0];

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (let i = 0; i < count; i++) {
    const x = origin[0] + positions[i * 3];
    const y = origin[1] + positions[i * 3 + 1];
    const z = origin[2] + positions[i * 3 + 2];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  if (count === 0) {
    minX = maxX = minY = maxY = minZ = maxZ = 0;
  }

  const scale = 0.001; // 1mm precision
  const offsetX = Math.floor((minX + maxX) / 2);
  const offsetY = Math.floor((minY + maxY) / 2);
  const offsetZ = Math.floor((minZ + maxZ) / 2);

  const bufferSize = HEADER_SIZE + count * POINT_RECORD_LENGTH;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // File Signature "LASF"
  writeAscii(view, 0, "LASF", 4);
  view.setUint16(4, 0, true); // File source ID
  view.setUint16(6, 0, true); // Global encoding
  view.setUint8(24, 1); // Version major (1)
  view.setUint8(25, 2); // Version minor (2)
  writeAscii(view, 26, "GeoLibre", 32);
  writeAscii(view, 58, "GeoLibre LiDAR Studio", 32);

  view.setUint16(94, HEADER_SIZE, true);
  view.setUint32(96, HEADER_SIZE, true); // Offset to point data
  view.setUint32(100, 0, true); // Number of VLRs
  view.setUint8(104, 1); // Point Data Record Format 1
  view.setUint16(105, POINT_RECORD_LENGTH, true); // Record length
  view.setUint32(107, count, true); // Number of point records

  // Scales
  view.setFloat64(131, scale, true);
  view.setFloat64(139, scale, true);
  view.setFloat64(147, scale, true);

  // Offsets
  view.setFloat64(155, offsetX, true);
  view.setFloat64(163, offsetY, true);
  view.setFloat64(171, offsetZ, true);

  // Max / Min
  view.setFloat64(179, maxX, true);
  view.setFloat64(187, minX, true);
  view.setFloat64(195, maxY, true);
  view.setFloat64(203, minY, true);
  view.setFloat64(211, maxZ, true);
  view.setFloat64(219, minZ, true);

  // Write points
  let ptr = HEADER_SIZE;
  const intensities = cloud.intensities;
  const classifications = cloud.classifications;

  for (let i = 0; i < count; i++) {
    const x = origin[0] + positions[i * 3];
    const y = origin[1] + positions[i * 3 + 1];
    const z = origin[2] + positions[i * 3 + 2];

    const intX = Math.round((x - offsetX) / scale);
    const intY = Math.round((y - offsetY) / scale);
    const intZ = Math.round((z - offsetZ) / scale);

    view.setInt32(ptr + 0, intX, true);
    view.setInt32(ptr + 4, intY, true);
    view.setInt32(ptr + 8, intZ, true);

    // Intensity (uint16)
    let intensity = 0;
    if (intensities) {
      const val = intensities[i];
      intensity = val > 1.0 ? Math.min(65535, Math.round(val)) : Math.min(65535, Math.round(val * 65535));
    }
    view.setUint16(ptr + 12, intensity, true);

    // Return info byte (byte 14 in formats 0-5: 3 bits return number, 3 bits number of returns)
    // 1 of 1: (1 & 0x07) | ((1 & 0x07) << 3) = 1 | 8 = 9 (0x09)
    view.setUint8(ptr + 14, 0x09);

    // Classification byte (byte 15 for format 0-5)
    const cls = classifications ? classifications[i] : 1;
    view.setUint8(ptr + 15, cls & 0x1f);

    ptr += POINT_RECORD_LENGTH;
  }

  return bytes;
}

/**
 * Extracts classification codes directly from an uncompressed LAS byte array (formats 0-10).
 */
export function readLasClassifications(bytes: Uint8Array): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 227 || String.fromCharCode(...bytes.subarray(0, 4)) !== "LASF") {
    throw new Error("Invalid output: LASF signature missing.");
  }
  const formatByte = bytes[104];
  const format = formatByte & 0x3f;
  const recordLength = view.getUint16(105, true);
  const pointOffset = view.getUint32(96, true);
  const minor = bytes[25];

  let count = view.getUint32(107, true);
  if (minor >= 4 && bytes.length >= 255) {
    const extended = Number(view.getBigUint64(247, true));
    if (extended > 0) count = extended;
  }

  const legacy = format < 6;
  const classOffset = legacy ? 15 : 16;
  const available = Math.floor((bytes.length - pointOffset) / recordLength);
  const n = Math.min(count, available);

  const classes = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const b = bytes[pointOffset + i * recordLength + classOffset];
    classes[i] = legacy ? b & 0x1f : b;
  }
  return classes;
}
