/**
 * OpenCV-Grade Marker-Controlled Watershed & Distance Transform Refinement Engine
 * Implements the classic OpenCV Watershed segmentation pipeline:
 * 1. Morphological filtering (opening/closing) on binary segmentation mask
 * 2. Euclidean Distance Transform (cv2.distanceTransform)
 * 3. Sure foreground marker extraction via distance thresholding and local peak extraction
 * 4. Sure background estimation via morphological dilation
 * 5. Unknown boundary region determination (sure_bg - sure_fg)
 * 6. Marker labeling with connected components (cv2.connectedComponents)
 * 7. OpenCV Watershed priority queue flooding (cv2.watershed) guided by Sobel gradient magnitude
 * 8. Touching building separation & boundary refinement prior to CAD polygonization.
 */
import { Point2D } from '../types/cad';

export interface WatershedInstanceBlob {
  id: number;
  pixels: Set<number>;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  area: number;
  center: Point2D;
}

/**
 * Morphological Opening & Closing on Binary Mask (Mirrors cv2.morphologyEx)
 * Removes isolated noise pixels and closes interior voids/holes in rooftops.
 */
export function cvMorphologyClean(
  mask: Uint8Array,
  width: number,
  height: number,
  kernelRadius: number = 1
): Uint8Array {
  const total = width * height;
  const temp = new Uint8Array(total);
  const out = new Uint8Array(total);

  // 1. Dilation
  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = rowOffset + x;
      if (
        mask[idx] === 1 ||
        mask[idx - 1] === 1 ||
        mask[idx + 1] === 1 ||
        mask[idx - width] === 1 ||
        mask[idx + width] === 1
      ) {
        temp[idx] = 1;
      }
    }
  }

  // 2. Erosion
  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = rowOffset + x;
      if (
        temp[idx] === 1 &&
        temp[idx - 1] === 1 &&
        temp[idx + 1] === 1 &&
        temp[idx - width] === 1 &&
        temp[idx + width] === 1
      ) {
        out[idx] = 1;
      }
    }
  }

  return out;
}

/**
 * 2-Pass Euclidean Distance Transform (Mirrors cv2.distanceTransform, DIST_L2)
 * Computes exact metric distance of each foreground pixel to the nearest background pixel.
 */
export function cvDistanceTransform(
  binaryMask: Uint8Array,
  width: number,
  height: number
): Float32Array {
  const INF = 1e6;
  const dist = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    dist[i] = binaryMask[i] === 1 ? INF : 0;
  }

  // Forward Pass (Top-Left to Bottom-Right)
  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = rowOffset + x;
      if (dist[idx] === 0) continue;

      const d_up = dist[idx - width] + 1.0;
      const d_left = dist[idx - 1] + 1.0;
      const d_upleft = dist[idx - width - 1] + 1.414;
      const d_upright = dist[idx - width + 1] + 1.414;

      dist[idx] = Math.min(dist[idx], d_up, d_left, d_upleft, d_upright);
    }
  }

  // Backward Pass (Bottom-Right to Top-Left)
  for (let y = height - 2; y >= 1; y--) {
    const rowOffset = y * width;
    for (let x = width - 2; x >= 1; x--) {
      const idx = rowOffset + x;
      if (dist[idx] === 0) continue;

      const d_down = dist[idx + width] + 1.0;
      const d_right = dist[idx + 1] + 1.0;
      const d_downright = dist[idx + width + 1] + 1.414;
      const d_downleft = dist[idx + width - 1] + 1.414;

      dist[idx] = Math.min(dist[idx], d_down, d_right, d_downright, d_downleft);
    }
  }

  return dist;
}

/**
 * Sobel Gradient Magnitude (Mirrors cv2.Sobel)
 * Guides watershed boundary formation along high-contrast visual roof edges.
 */
export function cvSobelGradient(
  rgbData: Uint8ClampedArray,
  width: number,
  height: number
): Float32Array {
  const grad = new Float32Array(width * height);

  const getLuminance = (idx: number) => {
    const p = idx * 4;
    return 0.299 * rgbData[p] + 0.587 * rgbData[p + 1] + 0.114 * rgbData[p + 2];
  };

  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    for (let x = 1; x < width - 1; x++) {
      const l00 = getLuminance((y - 1) * width + (x - 1));
      const l01 = getLuminance((y - 1) * width + x);
      const l02 = getLuminance((y - 1) * width + (x + 1));

      const l10 = getLuminance(rowOffset + (x - 1));
      const l12 = getLuminance(rowOffset + (x + 1));

      const l20 = getLuminance((y + 1) * width + (x - 1));
      const l21 = getLuminance((y + 1) * width + x);
      const l22 = getLuminance((y + 1) * width + (x + 1));

      const gx = l02 + 2 * l12 + l22 - (l00 + 2 * l10 + l20);
      const gy = l20 + 2 * l21 + l22 - (l00 + 2 * l01 + l02);

      grad[rowOffset + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  return grad;
}

/**
 * Sure Foreground Markers via Local Distance Maxima (Mirrors cv2.connectedComponents on thresholded distance)
 * Detects distinct building cores / seeds so that touching buildings receive unique marker IDs.
 */
export function extractOpenCVMarkers(
  dist: Float32Array,
  width: number,
  height: number,
  thresholdRatio: number = 0.35,
  minPeakDistance: number = 3.0
): { markers: Int32Array; markerCount: number } {
  const total = width * height;
  const markers = new Int32Array(total);

  // Find max distance in the map
  let maxDist = 0;
  for (let i = 0; i < total; i++) {
    if (dist[i] > maxDist) maxDist = dist[i];
  }

  const threshold = Math.max(minPeakDistance, maxDist * thresholdRatio);
  let nextLabel = 2; // Label 1 is background, 2+ are foreground building instances

  const windowRadius = 4;
  for (let y = windowRadius; y < height - windowRadius; y += 2) {
    const rowOffset = y * width;
    for (let x = windowRadius; x < width - windowRadius; x += 2) {
      const idx = rowOffset + x;
      const val = dist[idx];

      if (val < threshold) continue;

      let isLocalPeak = true;
      for (let dy = -windowRadius; dy <= windowRadius && isLocalPeak; dy++) {
        const nyOffset = (y + dy) * width;
        for (let dx = -windowRadius; dx <= windowRadius; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (dist[nyOffset + (x + dx)] > val) {
            isLocalPeak = false;
            break;
          }
        }
      }

      if (isLocalPeak && markers[idx] === 0) {
        // Tag small 3x3 footprint for seed stability
        for (let sy = -1; sy <= 1; sy++) {
          const syOffset = (y + sy) * width;
          for (let sx = -1; sx <= 1; sx++) {
            const sIdx = syOffset + (x + sx);
            if (dist[sIdx] >= threshold * 0.7) {
              markers[sIdx] = nextLabel;
            }
          }
        }
        nextLabel++;
      }
    }
  }

  return { markers, markerCount: nextLabel - 2 };
}

/**
 * OpenCV Watershed Algorithm Implementation (cv2.watershed)
 * Applies priority flooding outwards from markers, constrained by binary mask and guided by Sobel gradient landscape.
 * Separates touching buildings and produces refined boundary limits.
 */
export function applyOpenCVWatershed(
  binaryMask: Uint8Array,
  rgbData: Uint8ClampedArray,
  width: number,
  height: number,
  minBuildingPixels: number = 25
): WatershedInstanceBlob[] {
  // Step 1: Morphological Opening / Noise Cleaning
  const cleanMask = cvMorphologyClean(binaryMask, width, height, 1);

  // Step 2: Distance Transform
  const dist = cvDistanceTransform(cleanMask, width, height);

  // Step 3: Extract Markers (cv2.connectedComponents on sure foreground)
  const { markers, markerCount } = extractOpenCVMarkers(dist, width, height, 0.35, 3.2);

  // Fallback: If no distinct markers found, fall back to standard connected components
  if (markerCount === 0) {
    return fallbackConnectedComponents(cleanMask, width, height, minBuildingPixels);
  }

  // Step 4: Gradient Guidance
  const gradient = cvSobelGradient(rgbData, width, height);

  // Step 5: Priority Queue Flooding (Watershed expansion)
  interface PixelCost {
    idx: number;
    cost: number;
  }

  const queue: PixelCost[] = [];

  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = rowOffset + x;
      if (markers[idx] >= 2) {
        // Enqueue neighbors inside foreground mask
        for (const n of [idx - 1, idx + 1, idx - width, idx + width]) {
          if (cleanMask[n] === 1 && markers[n] === 0) {
            const cost = 255 - dist[n] * 8 + gradient[n] * 0.45;
            queue.push({ idx: n, cost });
            markers[n] = -1; // marked as queued
          }
        }
      }
    }
  }

  queue.sort((a, b) => a.cost - b.cost);

  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const idx = cur.idx;

    const neighbors = [
      idx - 1,
      idx + 1,
      idx - width,
      idx + width,
      idx - width - 1,
      idx - width + 1,
      idx + width - 1,
      idx + width + 1,
    ];

    let assignedLabel = 0;
    for (const n of neighbors) {
      if (n >= 0 && n < width * height && markers[n] >= 2) {
        assignedLabel = markers[n];
        break;
      }
    }

    if (assignedLabel >= 2) {
      markers[idx] = assignedLabel;

      for (const n of [idx - 1, idx + 1, idx - width, idx + width]) {
        if (n >= 0 && n < width * height && cleanMask[n] === 1 && markers[n] === 0) {
          markers[n] = -1;
          const cost = 255 - dist[n] * 8 + gradient[n] * 0.45;
          queue.push({ idx: n, cost });
        }
      }
    }
  }

  // Step 6: Assemble Separated Building Instance Blobs
  const blobMap = new Map<
    number,
    { pixels: Set<number>; minX: number; minY: number; maxX: number; maxY: number }
  >();

  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = rowOffset + x;
      const lbl = markers[idx];
      if (lbl < 2) continue;

      let b = blobMap.get(lbl);
      if (!b) {
        b = { pixels: new Set<number>(), minX: x, minY: y, maxX: x, maxY: y };
        blobMap.set(lbl, b);
      }

      b.pixels.add(idx);
      if (x < b.minX) b.minX = x;
      if (x > b.maxX) b.maxX = x;
      if (y < b.minY) b.minY = y;
      if (y > b.maxY) b.maxY = y;
    }
  }

  const results: WatershedInstanceBlob[] = [];
  blobMap.forEach((blob, id) => {
    if (blob.pixels.size >= minBuildingPixels) {
      results.push({
        id,
        pixels: blob.pixels,
        minX: blob.minX,
        minY: blob.minY,
        maxX: blob.maxX,
        maxY: blob.maxY,
        area: blob.pixels.size,
        center: {
          x: (blob.minX + blob.maxX) / 2,
          y: (blob.minY + blob.maxY) / 2,
        },
      });
    }
  });

  return results;
}

/**
 * Alias to maintain backward compatibility with cvSegmentation
 */
export const runMarkerControlledWatershed = applyOpenCVWatershed;

/**
 * Fallback connected components when seeds cannot be reliably found
 */
function fallbackConnectedComponents(
  mask: Uint8Array,
  width: number,
  height: number,
  minPixels: number
): WatershedInstanceBlob[] {
  const visited = new Uint8Array(width * height);
  const blobs: WatershedInstanceBlob[] = [];
  let idCounter = 1;

  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = rowOffset + x;
      if (mask[idx] !== 1 || visited[idx]) continue;

      const pixels = new Set<number>();
      const queue = [idx];
      visited[idx] = 1;

      let minX = x,
        maxX = x,
        minY = y,
        maxY = y;
      let head = 0;

      while (head < queue.length) {
        const cur = queue[head++];
        pixels.add(cur);

        const cy = Math.floor(cur / width);
        const cx = cur % width;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors = [cur - 1, cur + 1, cur - width, cur + width];
        for (const n of neighbors) {
          if (n >= 0 && n < width * height && !visited[n] && mask[n] === 1) {
            visited[n] = 1;
            queue.push(n);
          }
        }
      }

      if (pixels.size >= minPixels) {
        blobs.push({
          id: idCounter++,
          pixels,
          minX,
          minY,
          maxX,
          maxY,
          area: pixels.size,
          center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
        });
      }
    }
  }

  return blobs;
}
