/**
 * Advanced Computer Vision Filters & Algorithms Engine
 * 1. Edge-Preserving Bilateral Filter (Texture smoothing with sharp edge retention)
 * 2. Zhang-Suen Morphological Skeletonization / Thinning (True medial axis extraction)
 * 3. Integral-Image Accelerated Local Adaptive Sauvola Thresholding
 * 4. Multi-Spectral Photogrammetric Indices (NDVI / ExG, NDWI, Rayleigh Shadow Metric)
 */
import { Point2D } from '../types/cad';
import { distance, simplifyRDP } from './geometryRegularizer';

type NativeAndroidBridge = {
  nativeBilateralRgba: (
    inputBase64: string,
    width: number,
    height: number,
    diameter: number,
    sigmaColor: number,
    sigmaSpace: number
  ) => string;
  nativeSauvola: (
    grayBase64: string,
    width: number,
    height: number,
    windowRadius: number,
    k: number,
    dynamicRange: number
  ) => string;
};

function getNativeAndroidBridge(): NativeAndroidBridge | null {
  const bridge = (window as Window & { AndroidBridge?: NativeAndroidBridge }).AndroidBridge;
  return bridge ?? null;
}

function encodeBytesToBase64(bytes: ArrayLike<number>): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const end = Math.min(offset + chunkSize, bytes.length);
    for (let i = offset; i < end; i++) binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decodeBase64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Fast Edge-Preserving Bilateral Filter
 * Smooths high-frequency rooftop and ground textures (solar panels, gravel, tiles)
 * while preserving high-contrast building footprints and road boundaries.
 */
export function applyBilateralFilter(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  spatialRadius: number = 2,
  rangeSigma: number = 25
): Uint8ClampedArray {
  const nativeBridge = getNativeAndroidBridge();
  if (nativeBridge && width * height <= 12_000_000) {
    const nativeResult = nativeBridge.nativeBilateralRgba(
      encodeBytesToBase64(data), width, height, Math.max(1, spatialRadius * 2 + 1), rangeSigma, spatialRadius
    );
    if (nativeResult) return new Uint8ClampedArray(decodeBase64ToBytes(nativeResult));
  }

  const total = width * height;
  const filtered = new Uint8ClampedArray(data.length);
  const rangeCoeff = -0.5 / (rangeSigma * rangeSigma);

  // Precompute spatial Gaussian weights
  const spatialWeights: number[][] = [];
  const spatialSigma = spatialRadius;
  const spatialCoeff = -0.5 / (spatialSigma * spatialSigma);

  for (let dy = -spatialRadius; dy <= spatialRadius; dy++) {
    spatialWeights[dy + spatialRadius] = [];
    for (let dx = -spatialRadius; dx <= spatialRadius; dx++) {
      spatialWeights[dy + spatialRadius][dx + spatialRadius] = Math.exp(
        (dx * dx + dy * dy) * spatialCoeff
      );
    }
  }

  for (let y = 0; y < height; y++) {
    const yMin = Math.max(0, y - spatialRadius);
    const yMax = Math.min(height - 1, y + spatialRadius);
    const rowOffset = y * width;

    for (let x = 0; x < width; x++) {
      const centerIdx = (rowOffset + x) * 4;
      const centerR = data[centerIdx];
      const centerG = data[centerIdx + 1];
      const centerB = data[centerIdx + 2];
      const centerLum = 0.299 * centerR + 0.587 * centerG + 0.114 * centerB;

      let sumR = 0,
        sumG = 0,
        sumB = 0,
        sumWeight = 0;

      for (let ny = yMin; ny <= yMax; ny++) {
        const nyRowOffset = ny * width;
        const wY = ny - y + spatialRadius;

        for (let nx = Math.max(0, x - spatialRadius); nx <= Math.min(width - 1, x + spatialRadius); nx++) {
          const nIdx = (nyRowOffset + nx) * 4;
          const nr = data[nIdx];
          const ng = data[nIdx + 1];
          const nb = data[nIdx + 2];
          const nLum = 0.299 * nr + 0.587 * ng + 0.114 * nb;

          const lumDiff = centerLum - nLum;
          const rangeW = Math.exp(lumDiff * lumDiff * rangeCoeff);
          const weight = spatialWeights[wY][nx - x + spatialRadius] * rangeW;

          sumR += nr * weight;
          sumG += ng * weight;
          sumB += nb * weight;
          sumWeight += weight;
        }
      }

      const invW = 1.0 / (sumWeight || 1);
      filtered[centerIdx] = Math.round(sumR * invW);
      filtered[centerIdx + 1] = Math.round(sumG * invW);
      filtered[centerIdx + 2] = Math.round(sumB * invW);
      filtered[centerIdx + 3] = data[centerIdx + 3];
    }
  }

  return filtered;
}

/**
 * Integral Image Computation for O(1) Local Area Sums
 */
export function computeIntegralImages(
  gray: Uint8Array,
  width: number,
  height: number
): { sum: Float64Array; sumSq: Float64Array } {
  const stride = width + 1;
  const sum = new Float64Array((width + 1) * (height + 1));
  const sumSq = new Float64Array((width + 1) * (height + 1));

  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    let rowSumSq = 0;
    const yOffset = (y + 1) * stride;
    const yPrevOffset = y * stride;
    const srcOffset = y * width;

    for (let x = 0; x < width; x++) {
      const val = gray[srcOffset + x];
      rowSum += val;
      rowSumSq += val * val;

      const outIdx = yOffset + (x + 1);
      sum[outIdx] = sum[yPrevOffset + (x + 1)] + rowSum;
      sumSq[outIdx] = sumSq[yPrevOffset + (x + 1)] + rowSumSq;
    }
  }

  return { sum, sumSq };
}

/**
 * Local Adaptive Sauvola Thresholding
 * Optimal for architectural blueprints, scanned drawings, and maps with uneven lighting/contrast.
 * T(x, y) = mean * (1 + k * (std / R - 1))
 */
export function applySauvolaThreshold(
  gray: Uint8Array,
  width: number,
  height: number,
  windowRadius: number = 12,
  k: number = 0.2,
  R: number = 128
): Uint8Array {
  const nativeBridge = getNativeAndroidBridge();
  if (nativeBridge && width * height <= 12_000_000) {
    const nativeResult = nativeBridge.nativeSauvola(
      encodeBytesToBase64(gray), width, height, windowRadius, k, R
    );
    if (nativeResult) return decodeBase64ToBytes(nativeResult);
  }

  const binary = new Uint8Array(width * height);
  const { sum, sumSq } = computeIntegralImages(gray, width, height);
  const stride = width + 1;

  for (let y = 0; y < height; y++) {
    const y1 = Math.max(0, y - windowRadius);
    const y2 = Math.min(height - 1, y + windowRadius);
    const rowOffset = y * width;

    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - windowRadius);
      const x2 = Math.min(width - 1, x + windowRadius);
      const area = (x2 - x1 + 1) * (y2 - y1 + 1);

      // 4-corner integral lookups
      const bl = (y2 + 1) * stride + (x2 + 1);
      const br = (y2 + 1) * stride + x1;
      const tl = y1 * stride + (x2 + 1);
      const tr = y1 * stride + x1;

      const totalVal = sum[bl] - sum[br] - sum[tl] + sum[tr];
      const totalValSq = sumSq[bl] - sumSq[br] - sumSq[tl] + sumSq[tr];

      const mean = totalVal / area;
      const variance = Math.max(0, totalValSq / area - mean * mean);
      const std = Math.sqrt(variance);

      const threshold = mean * (1.0 + k * (std / R - 1.0));
      binary[rowOffset + x] = gray[rowOffset + x] < threshold ? 1 : 0;
    }
  }

  return binary;
}

/**
 * Zhang-Suen Morphological Skeletonization / Thinning Algorithm
 * Extracts the true 1-pixel-wide medial axis skeleton of curved road corridors and CAD walls.
 */
export function zhangSuenThinning(
  mask: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const skeleton = new Uint8Array(mask);
  let changed = true;
  let iter = 0;
  const maxIters = 60;

  const getP = (x: number, y: number): number => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0;
    return skeleton[y * width + x];
  };

  while (changed && iter++ < maxIters) {
    changed = false;
    const toDeleteSub1: number[] = [];
    const toDeleteSub2: number[] = [];

    // Sub-iteration 1
    for (let y = 1; y < height - 1; y++) {
      const rowOffset = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = rowOffset + x;
        if (skeleton[idx] !== 1) continue;

        // 8-neighbors (P2..P9 in clockwise order)
        const p2 = getP(x, y - 1);
        const p3 = getP(x + 1, y - 1);
        const p4 = getP(x + 1, y);
        const p5 = getP(x + 1, y + 1);
        const p6 = getP(x, y + 1);
        const p7 = getP(x - 1, y + 1);
        const p8 = getP(x - 1, y);
        const p9 = getP(x - 1, y - 1);

        const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (b < 2 || b > 6) continue;

        // 0 -> 1 transitions in P2, P3, P4, P5, P6, P7, P8, P9, P2
        const nArr = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
        let a = 0;
        for (let k = 0; k < 8; k++) {
          if (nArr[k] === 0 && nArr[k + 1] === 1) a++;
        }
        if (a !== 1) continue;

        if (p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0) {
          toDeleteSub1.push(idx);
        }
      }
    }

    if (toDeleteSub1.length > 0) {
      changed = true;
      for (const idx of toDeleteSub1) skeleton[idx] = 0;
    }

    // Sub-iteration 2
    for (let y = 1; y < height - 1; y++) {
      const rowOffset = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = rowOffset + x;
        if (skeleton[idx] !== 1) continue;

        const p2 = getP(x, y - 1);
        const p3 = getP(x + 1, y - 1);
        const p4 = getP(x + 1, y);
        const p5 = getP(x + 1, y + 1);
        const p6 = getP(x, y + 1);
        const p7 = getP(x - 1, y + 1);
        const p8 = getP(x - 1, y);
        const p9 = getP(x - 1, y - 1);

        const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (b < 2 || b > 6) continue;

        const nArr = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
        let a = 0;
        for (let k = 0; k < 8; k++) {
          if (nArr[k] === 0 && nArr[k + 1] === 1) a++;
        }
        if (a !== 1) continue;

        if (p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0) {
          toDeleteSub2.push(idx);
        }
      }
    }

    if (toDeleteSub2.length > 0) {
      changed = true;
      for (const idx of toDeleteSub2) skeleton[idx] = 0;
    }
  }

  return skeleton;
}

/**
 * Traces smooth centerlines from a Zhang-Suen skeletonized road corridor.
 */
export function traceSkeletonCenterline(
  skeleton: Uint8Array,
  width: number,
  height: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  invScale: number
): Point2D[] | null {
  // Find endpoints (pixels with exactly 1 neighbor in 8-connectivity)
  const endpoints: number[] = [];
  const DIRS = [
    { dx: 1, dy: 0 },
    { dx: 1, dy: 1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: -1, dy: -1 },
    { dx: 0, dy: -1 },
    { dx: 1, dy: -1 },
  ];

  for (let y = minY; y <= maxY; y++) {
    const rowOffset = y * width;
    for (let x = minX; x <= maxX; x++) {
      const idx = rowOffset + x;
      if (skeleton[idx] !== 1) continue;

      let nNeighbors = 0;
      for (const d of DIRS) {
        const nx = x + d.dx;
        const ny = y + d.dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          if (skeleton[ny * width + nx] === 1) nNeighbors++;
        }
      }

      if (nNeighbors === 1) {
        endpoints.push(idx);
      }
    }
  }

  // If no single endpoint found, take the leftmost/topmost skeleton pixel
  let startIdx = endpoints.length > 0 ? endpoints[0] : -1;
  if (startIdx === -1) {
    for (let y = minY; y <= maxY && startIdx === -1; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (skeleton[y * width + x] === 1) {
          startIdx = y * width + x;
          break;
        }
      }
    }
  }

  if (startIdx === -1) return null;

  // DFS/BFS longest path walk
  const visited = new Uint8Array(width * height);
  const path: Point2D[] = [];
  let curr = startIdx;
  visited[curr] = 1;

  const maxSteps = 3000;
  let steps = 0;

  while (steps++ < maxSteps) {
    const cx = curr % width;
    const cy = Math.floor(curr / width);
    path.push({
      x: Number((cx * invScale).toFixed(1)),
      y: Number((cy * invScale).toFixed(1)),
    });

    let next = -1;
    for (const d of DIRS) {
      const nx = cx + d.dx;
      const ny = cy + d.dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx;
        if (skeleton[nIdx] === 1 && !visited[nIdx]) {
          visited[nIdx] = 1;
          next = nIdx;
          break;
        }
      }
    }

    if (next === -1) break;
    curr = next;
  }

  if (path.length < 2) return null;
  return simplifyRDP(path, 2.0 * invScale);
}
