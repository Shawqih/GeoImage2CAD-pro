/**
 * Enhanced Computer Vision & Semantic Feature Segmentation Engine
 * Features Marker-Controlled Watershed & Distance-Transform Post-Processing
 * to separate touching buildings and refine boundaries on high-resolution aerial imagery.
 */
import { STANDARD_LAYERS } from '../constants/layers';
import {
  CADFeature,
  CADLayer,
  ImageAnalysisReport,
  Point2D,
  ProcessingParameters,
} from '../types/cad';
import {
  calculatePolygonArea,
  calculatePolylineLength,
  fitCircleToPoints,
  mergeCollinearSegments,
  orthogonalizePolygon,
  simplifyRDP,
} from './geometryRegularizer';
import { applyOpenCVWatershed, runMarkerControlledWatershed } from './watershedSegmentation';

export interface ProgressCallback {
  (stage: string, percent: number): void;
}

export async function convertRasterToCAD(
  imageElement: HTMLImageElement,
  report: ImageAnalysisReport,
  params: ProcessingParameters,
  onProgress?: ProgressCallback
): Promise<{ features: CADFeature[]; layers: CADLayer[] }> {
  const width = imageElement.naturalWidth || imageElement.width;
  const height = imageElement.naturalHeight || imageElement.height;

  // Ultra-crisp processing scale
  const maxDim = params.quality === 'ULTRA' ? 1600 : params.quality === 'HIGH' ? 1280 : 960;
  const scale = Math.min(1.0, maxDim / Math.max(width, height));
  const procW = Math.round(width * scale);
  const procH = Math.round(height * scale);
  const invScale = 1.0 / scale;

  onProgress?.('Initializing Image Preprocessing (معالجة الصورة المسبقة)...', 10);
  await yieldToMain();

  const canvas = document.createElement('canvas');
  canvas.width = procW;
  canvas.height = procH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D unavailable');

  ctx.drawImage(imageElement, 0, 0, procW, procH);
  const imgData = ctx.getImageData(0, 0, procW, procH);
  const data = imgData.data;

  const features: CADFeature[] = [];
  const layerUsage = new Set<string>();

  if (
    report.type === 'CAD_SCAN_BLUEPRINT' ||
    report.type === 'ARCHITECTURAL_DRAWING' ||
    report.type === 'BLACK_WHITE_LINE'
  ) {
    await processDrawingScanPipeline(
      data,
      procW,
      procH,
      invScale,
      params,
      features,
      layerUsage,
      report.type,
      onProgress
    );
  } else {
    await processAerialSatellitePipeline(
      data,
      procW,
      procH,
      invScale,
      params,
      features,
      layerUsage,
      onProgress
    );
  }

  onProgress?.('Regularizing Geometry & Topology Validation...', 90);
  await yieldToMain();

  const finalLayers: CADLayer[] = [];
  for (const layerKey of Object.keys(STANDARD_LAYERS)) {
    const std = STANDARD_LAYERS[layerKey as keyof typeof STANDARD_LAYERS];
    const count = features.filter((f) => f.layer === std.name).length;
    if (count > 0 || std.name === 'BUILDINGS' || std.name === 'ROADS' || std.name === 'PARCELS') {
      finalLayers.push({
        ...std,
        featureCount: count,
      });
    }
  }

  onProgress?.('CAD Vectorization Completed (اكتمل التحويل الهندسي)', 100);
  return { features, layers: finalLayers };
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 15));
}

/**
 * Enhanced Aerial Drone & Satellite Processing with Watershed Refinement
 */
async function processAerialSatellitePipeline(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  invScale: number,
  params: ProcessingParameters,
  features: CADFeature[],
  layerUsage: Set<string>,
  onProgress?: ProgressCallback
) {
  const total = width * height;
  const classMask = new Uint8Array(total);

  onProgress?.('Running Semantic Segmentation (المعالم الجوية والمعمارية)...', 25);
  await yieldToMain();

  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const sat = max === 0 ? 0 : delta / max;

    // Water Body: Deep cyan/blue with low red
    if (params.waterDetection && b > r + 16 && b > g - 10 && lum < 150) {
      classMask[i] = 4;
      continue;
    }

    // Trees and Vegetation (Excess Green Index: 2G - R - B)
    const excessGreen = 2 * g - r - b;
    if (params.treeDetection && (excessGreen > 14 || (g > r + 10 && g > b + 10 && sat > 0.16))) {
      classMask[i] = 3;
      continue;
    }

    // Roads: Asphalt/concrete corridors
    if (sat < 0.14 && lum > 40 && lum < 165) {
      classMask[i] = 2;
      continue;
    }

    // Buildings: Rooftops (warm tiles, white/gray concrete, dark roofs)
    if (
      (r > 120 && r > g + 20 && r > b + 20) ||
      (lum > 175 && sat < 0.22) ||
      (lum < 38 && sat < 0.2)
    ) {
      classMask[i] = 1;
      continue;
    }

    // Grounds / Parcels
    if (g > b && g > r && sat > 0.08) {
      classMask[i] = 5;
    }
  }

  // ADVANCED POST-PROCESSING: Apply Watershed algorithm to binary building mask
  // to cleanly separate touching buildings and refine boundary edges before vectorization
  onProgress?.('Watershed Boundary Refinement & Building Separation (فصل المباني وخوارزمية Watershed)...', 40);
  await yieldToMain();

  const buildingBinaryMask = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    buildingBinaryMask[i] = classMask[i] === 1 ? 1 : 0;
  }

  const minBuildingPx = Math.max(25, Math.round(params.minFeatureSize / (invScale * invScale)));
  const buildingBlobs = applyOpenCVWatershed(buildingBinaryMask, data, width, height, minBuildingPx);

  onProgress?.('Orthogonalizing Building Polygons (تقويم الزوايا القائمة 90°)...', 55);
  await yieldToMain();

  for (let bIdx = 0; bIdx < buildingBlobs.length; bIdx++) {
    const blob = buildingBlobs[bIdx];
    const rawContour = traceContour(blob.pixels, width, height, blob.minX, blob.minY, blob.maxX, blob.maxY);
    if (rawContour.length < 4) continue;

    const scaledContour = rawContour.map((p) => ({
      x: Number((p.x * invScale).toFixed(1)),
      y: Number((p.y * invScale).toFixed(1)),
    }));

    let finalPoints = scaledContour;
    if (params.buildingRegularization) {
      finalPoints = orthogonalizePolygon(
        scaledContour,
        params.orthogonalizationToleranceDeg,
        params.snapTolerancePx * invScale
      );
    } else {
      finalPoints = simplifyRDP(scaledContour, params.rdpTolerance * invScale);
    }

    finalPoints = mergeCollinearSegments(finalPoints, 1.5 * invScale);
    if (finalPoints.length < 3) continue;

    const area = calculatePolygonArea(finalPoints);
    const perimeter = calculatePolylineLength(finalPoints, true);

    features.push({
      id: `BLD_${bIdx + 1}`,
      layer: 'BUILDINGS',
      geometryType: 'LWPOLYLINE',
      isClosed: true,
      points: finalPoints,
      confidence: 0.95,
      classification: 'Building Footprint',
      source: 'AI_SEGMENTATION',
      area: Math.round(area),
      length: Math.round(perimeter),
      attributes: {
        type: 'Building',
        vertices: finalPoints.length,
        regularized: params.buildingRegularization,
        watershedRefined: true,
      },
    });
    layerUsage.add('BUILDINGS');
  }

  // Extract Roads & Centerlines
  onProgress?.('Tracing Roads & Centerlines (استخراج مسارات الطرق ومحاورها)...', 65);
  await yieldToMain();

  const minRoadPx = Math.max(100, Math.round((params.minFeatureSize * 2) / (invScale * invScale)));
  const roadBlobs = extractConnectedComponents(classMask, width, height, 2, minRoadPx);

  for (let rIdx = 0; rIdx < roadBlobs.length; rIdx++) {
    const blob = roadBlobs[rIdx];
    const rawContour = traceContour(blob.pixels, width, height, blob.minX, blob.minY, blob.maxX, blob.maxY);
    if (rawContour.length < 5) continue;

    const scaledContour = rawContour.map((p) => ({
      x: Number((p.x * invScale).toFixed(1)),
      y: Number((p.y * invScale).toFixed(1)),
    }));
    const simplified = simplifyRDP(scaledContour, params.rdpTolerance * 1.5 * invScale);
    if (simplified.length < 3) continue;

    const area = calculatePolygonArea(simplified);
    const len = calculatePolylineLength(simplified, true);

    features.push({
      id: `RD_BND_${rIdx + 1}`,
      layer: 'ROAD_BOUNDARIES',
      geometryType: 'LWPOLYLINE',
      isClosed: true,
      points: simplified,
      confidence: 0.90,
      classification: 'Road Boundary Corridor',
      source: 'AI_SEGMENTATION',
      area: Math.round(area),
      length: Math.round(len),
      attributes: { type: 'Road Boundary' },
    });
    layerUsage.add('ROAD_BOUNDARIES');

    if (params.roadCenterlineExtraction) {
      const centerline = extractSkeletonCenterline(
        blob.pixels,
        width,
        height,
        blob.minX,
        blob.minY,
        blob.maxX,
        blob.maxY,
        invScale
      );
      if (centerline && centerline.length >= 2) {
        const cLen = calculatePolylineLength(centerline, false);
        features.push({
          id: `RD_CTR_${rIdx + 1}`,
          layer: 'ROAD_CENTERLINES',
          geometryType: 'LWPOLYLINE',
          isClosed: false,
          points: centerline,
          confidence: 0.88,
          classification: 'Road Centerline',
          source: 'AI_SEGMENTATION',
          length: Math.round(cLen),
          attributes: { type: 'Road Centerline' },
        });
        layerUsage.add('ROAD_CENTERLINES');
      }
    }
  }

  // Extract Trees & Vegetation
  if (params.treeDetection) {
    onProgress?.('Detecting Trees & Canopies (استخراج الأشجار المستقلة والغطاء الأخضر)...', 75);
    await yieldToMain();

    const treeBlobs = extractConnectedComponents(classMask, width, height, 3, 15);
    for (let tIdx = 0; tIdx < treeBlobs.length; tIdx++) {
      const blob = treeBlobs[tIdx];
      const count = blob.pixels.size;

      if (count < 550) {
        const cx = Number((((blob.minX + blob.maxX) / 2) * invScale).toFixed(1));
        const cy = Number((((blob.minY + blob.maxY) / 2) * invScale).toFixed(1));
        const r = Math.max(6, Number((((blob.maxX - blob.minX + blob.maxY - blob.minY) / 4) * invScale).toFixed(1)));

        features.push({
          id: `TREE_${tIdx + 1}`,
          layer: 'TREES',
          geometryType: 'CIRCLE',
          isClosed: true,
          points: [{ x: cx, y: cy }],
          center: { x: cx, y: cy },
          radius: r,
          confidence: 0.92,
          classification: 'Tree Canopy',
          source: 'AI_SEGMENTATION',
          area: Math.round(Math.PI * r * r),
          attributes: { type: 'Tree' },
        });
        layerUsage.add('TREES');
      } else {
        const rawContour = traceContour(blob.pixels, width, height, blob.minX, blob.minY, blob.maxX, blob.maxY);
        if (rawContour.length >= 4) {
          const scaled = rawContour.map((p) => ({
            x: Number((p.x * invScale).toFixed(1)),
            y: Number((p.y * invScale).toFixed(1)),
          }));
          const simplified = simplifyRDP(scaled, params.rdpTolerance * 2 * invScale);
          features.push({
            id: `VEG_${tIdx + 1}`,
            layer: 'VEGETATION',
            geometryType: 'LWPOLYLINE',
            isClosed: true,
            points: simplified,
            confidence: 0.88,
            classification: 'Vegetation Area',
            source: 'AI_SEGMENTATION',
            area: Math.round(calculatePolygonArea(simplified)),
            attributes: { type: 'Vegetation' },
          });
          layerUsage.add('VEGETATION');
        }
      }
    }
  }

  // Extract Water Bodies
  if (params.waterDetection) {
    const waterBlobs = extractConnectedComponents(classMask, width, height, 4, 60);
    for (let wIdx = 0; wIdx < waterBlobs.length; wIdx++) {
      const blob = waterBlobs[wIdx];
      const rawContour = traceContour(blob.pixels, width, height, blob.minX, blob.minY, blob.maxX, blob.maxY);
      if (rawContour.length < 4) continue;

      const scaled = rawContour.map((p) => ({
        x: Number((p.x * invScale).toFixed(1)),
        y: Number((p.y * invScale).toFixed(1)),
      }));
      const simplified = simplifyRDP(scaled, params.rdpTolerance * 2 * invScale);

      features.push({
        id: `WATER_${wIdx + 1}`,
        layer: 'WATER',
        geometryType: 'LWPOLYLINE',
        isClosed: true,
        points: simplified,
        confidence: 0.95,
        classification: 'Water Reservoir',
        source: 'AI_SEGMENTATION',
        area: Math.round(calculatePolygonArea(simplified)),
        attributes: { type: 'Water' },
      });
      layerUsage.add('WATER');
    }
  }
}

/**
 * Enhanced Technical Drawing & Blueprint Processing
 */
async function processDrawingScanPipeline(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  invScale: number,
  params: ProcessingParameters,
  features: CADFeature[],
  layerUsage: Set<string>,
  imageType: string,
  onProgress?: ProgressCallback
) {
  onProgress?.('Adaptive Thresholding & Edge Detection (تصفية المخطط وتحديد الحواف)...', 30);
  await yieldToMain();

  const binary = new Uint8Array(width * height);
  const isBlueprint = imageType === 'CAD_SCAN_BLUEPRINT';

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (isBlueprint) {
      binary[i] = lum > 135 && r > 90 ? 1 : 0;
    } else {
      binary[i] = lum < 145 ? 1 : 0;
    }
  }

  onProgress?.('Tracing Walls & Column Geometries (استخراج الجدران والأعمدة)...', 55);
  await yieldToMain();

  const blobs = extractConnectedComponents(binary, width, height, 1, 20);

  for (let bIdx = 0; bIdx < blobs.length; bIdx++) {
    const blob = blobs[bIdx];
    const rawContour = traceContour(blob.pixels, width, height, blob.minX, blob.minY, blob.maxX, blob.maxY);
    if (rawContour.length < 3) continue;

    const scaled = rawContour.map((p) => ({
      x: Number((p.x * invScale).toFixed(1)),
      y: Number((p.y * invScale).toFixed(1)),
    }));

    const circleFit = fitCircleToPoints(scaled);
    if (circleFit && circleFit.error < 1.6 && circleFit.radius > 6 * invScale && circleFit.radius < 80 * invScale) {
      features.push({
        id: `CIRC_${bIdx + 1}`,
        layer: 'WALLS',
        geometryType: 'CIRCLE',
        isClosed: true,
        points: [circleFit.center],
        center: circleFit.center,
        radius: circleFit.radius,
        confidence: 0.96,
        classification: 'Circular Column / Tank',
        source: 'LINE_DETECTION',
        area: Math.round(Math.PI * circleFit.radius * circleFit.radius),
        attributes: { type: 'Circle' },
      });
      layerUsage.add('WALLS');
      continue;
    }

    let wallPoints = simplifyRDP(scaled, params.rdpTolerance * invScale);
    if (params.buildingRegularization) {
      wallPoints = orthogonalizePolygon(
        wallPoints,
        params.orthogonalizationToleranceDeg,
        params.snapTolerancePx * invScale
      );
    }
    wallPoints = mergeCollinearSegments(wallPoints, 1.2 * invScale);

    if (wallPoints.length >= 2) {
      const isClosed =
        distance(wallPoints[0], wallPoints[wallPoints.length - 1]) < 8 * invScale && wallPoints.length >= 4;
      const area = isClosed ? calculatePolygonArea(wallPoints) : undefined;
      const len = calculatePolylineLength(wallPoints, isClosed);

      features.push({
        id: `WALL_${bIdx + 1}`,
        layer: 'WALLS',
        geometryType: 'LWPOLYLINE',
        isClosed,
        points: wallPoints,
        confidence: 0.93,
        classification: isClosed ? 'Room Enclosure' : 'Wall Line',
        source: 'LINE_DETECTION',
        area: area ? Math.round(area) : undefined,
        length: Math.round(len),
        attributes: { type: 'Wall' },
      });
      layerUsage.add('WALLS');
    }
  }
}

function distance(p1: Point2D, p2: Point2D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

interface ComponentBlob {
  pixels: Set<number>;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function extractConnectedComponents(
  mask: Uint8Array,
  width: number,
  height: number,
  targetClass: number,
  minPixels: number
): ComponentBlob[] {
  const visited = new Uint8Array(width * height);
  const blobs: ComponentBlob[] = [];
  const maxBlobs = 350;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (mask[idx] !== targetClass || visited[idx]) continue;

      const blobPixels = new Set<number>();
      const queue = [idx];
      visited[idx] = 1;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;

      let head = 0;
      while (head < queue.length) {
        const cur = queue[head++];
        blobPixels.add(cur);

        const cy = Math.floor(cur / width);
        const cx = cur % width;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors = [cur - 1, cur + 1, cur - width, cur + width];
        for (const n of neighbors) {
          if (n >= 0 && n < width * height && !visited[n] && mask[n] === targetClass) {
            visited[n] = 1;
            queue.push(n);
          }
        }
      }

      if (blobPixels.size >= minPixels) {
        blobs.push({ pixels: blobPixels, minX, minY, maxX, maxY });
        if (blobs.length >= maxBlobs) return blobs;
      }
    }
  }

  return blobs;
}

function traceContour(
  blobPixels: Set<number>,
  width: number,
  _height: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): Point2D[] {
  const contour: Point2D[] = [];
  let startX = -1;
  let startY = -1;

  for (let y = minY; y <= maxY && startY === -1; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (blobPixels.has(y * width + x)) {
        startX = x;
        startY = y;
        break;
      }
    }
  }

  if (startX === -1) return [];

  const DIRS = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 1, dy: 1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: -1, dy: -1 },
  ];

  let currX = startX;
  let currY = startY;
  let backtrackDir = 6;
  contour.push({ x: currX, y: currY });

  const maxSteps = 2500;
  let step = 0;

  while (step++ < maxSteps) {
    let foundNext = false;
    const checkDir = (backtrackDir + 1) % 8;

    for (let i = 0; i < 8; i++) {
      const d = (checkDir + i) % 8;
      const nx = currX + DIRS[d].dx;
      const ny = currY + DIRS[d].dy;

      if (blobPixels.has(ny * width + nx)) {
        currX = nx;
        currY = ny;
        backtrackDir = (d + 4) % 8;
        foundNext = true;
        break;
      }
    }

    if (!foundNext) break;
    if (currX === startX && currY === startY) break;

    if (step % 2 === 0) {
      contour.push({ x: currX, y: currY });
    }
  }

  return contour;
}

function extractSkeletonCenterline(
  blobPixels: Set<number>,
  width: number,
  _height: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  invScale: number
): Point2D[] | null {
  const points: Point2D[] = [];
  const isHorizontal = maxX - minX > maxY - minY;

  if (isHorizontal) {
    const step = Math.max(8, Math.floor((maxX - minX) / 16));
    for (let x = minX + 5; x <= maxX - 5; x += step) {
      let sumY = 0;
      let count = 0;
      for (let y = minY; y <= maxY; y++) {
        if (blobPixels.has(y * width + x)) {
          sumY += y;
          count++;
        }
      }
      if (count > 0) {
        points.push({ x: Number((x * invScale).toFixed(1)), y: Number(((sumY / count) * invScale).toFixed(1)) });
      }
    }
  } else {
    const step = Math.max(8, Math.floor((maxY - minY) / 16));
    for (let y = minY + 5; y <= maxY - 5; y += step) {
      let sumX = 0;
      let count = 0;
      for (let x = minX; x <= maxX; x++) {
        if (blobPixels.has(y * width + x)) {
          sumX += x;
          count++;
        }
      }
      if (count > 0) {
        points.push({ x: Number(((sumX / count) * invScale).toFixed(1)), y: Number((y * invScale).toFixed(1)) });
      }
    }
  }

  if (points.length < 2) return null;
  return simplifyRDP(points, 2.5 * invScale);
}
