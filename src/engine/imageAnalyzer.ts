/**
 * Image Analysis Engine
 * Automatically detects whether an image is Aerial Drone, Satellite, Urban Map,
 * CAD Scan, Architectural Blueprint, or Black/White Line Drawing.
 */
import { ImageAnalysisReport, ImageTypeCategory } from '../types/cad';

export async function analyzeImage(imageElement: HTMLImageElement): Promise<ImageAnalysisReport> {
  const width = imageElement.naturalWidth || imageElement.width;
  const height = imageElement.naturalHeight || imageElement.height;

  // Sample canvas at scaled resolution for fast on-device analysis
  const sampleWidth = Math.min(width, 400);
  const sampleHeight = Math.round((height / width) * sampleWidth);

  const canvas = document.createElement('canvas');
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  ctx.drawImage(imageElement, 0, 0, sampleWidth, sampleHeight);
  const imgData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
  const data = imgData.data;

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let totalSaturation = 0;
  let blueprintBlueCount = 0;
  let pureBlackWhiteCount = 0;
  let greenVegetationCount = 0;
  let asphaltGrayCount = 0;
  let roofWarmCount = 0;
  const totalPixels = sampleWidth * sampleHeight;

  // Fast single pass over pixels
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    totalR += r;
    totalG += g;
    totalB += b;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const sat = max === 0 ? 0 : delta / max;
    totalSaturation += sat;

    // Check for blueprint characteristics (predominantly blue/navy background)
    if (b > 100 && b > r + 30 && b > g + 20 && lum < 140) {
      blueprintBlueCount++;
    }

    // Check for high contrast black/white (drawings, scans)
    if (lum < 40 || lum > 220) {
      if (sat < 0.15) {
        pureBlackWhiteCount++;
      }
    }

    // Check for vegetation (Excess Green)
    if (g > r + 15 && g > b + 15 && sat > 0.2) {
      greenVegetationCount++;
    }

    // Check for asphalt / concrete (neutral dark/medium gray)
    if (sat < 0.12 && lum > 40 && lum < 160) {
      asphaltGrayCount++;
    }

    // Check for terracotta / brick / red tile roof
    if (r > 130 && r > g + 25 && r > b + 25) {
      roofWarmCount++;
    }
  }

  const avgSaturation = totalSaturation / totalPixels;
  const bwRatio = pureBlackWhiteCount / totalPixels;
  const blueprintRatio = blueprintBlueCount / totalPixels;
  const vegetationRatio = greenVegetationCount / totalPixels;
  const asphaltRatio = asphaltGrayCount / totalPixels;
  const roofRatio = roofWarmCount / totalPixels;

  // Analyze Edge Orientations (detect orthogonal CAD drawings vs organic aerial curves)
  let orthogonalScore = 0;
  const step = 4;
  let edgeCount = 0;

  for (let y = 1; y < sampleHeight - 1; y += step) {
    for (let x = 1; x < sampleWidth - 1; x += step) {
      const idx = (y * sampleWidth + x) * 4;
      const idxR = (y * sampleWidth + (x + 1)) * 4;
      const idxD = ((y + 1) * sampleWidth + x) * 4;

      const lumCenter = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      const lumRight = (data[idxR] + data[idxR + 1] + data[idxR + 2]) / 3;
      const lumDown = (data[idxD] + data[idxD + 1] + data[idxD + 2]) / 3;

      const gx = lumRight - lumCenter;
      const gy = lumDown - lumCenter;
      const grad = Math.abs(gx) + Math.abs(gy);

      if (grad > 35) {
        edgeCount++;
        // Check if edge is strictly horizontal or vertical
        if (Math.abs(gx) < 6 || Math.abs(gy) < 6) {
          orthogonalScore++;
        }
      }
    }
  }

  const orthoRatio = edgeCount > 0 ? orthogonalScore / edgeCount : 0;
  const edgeDensity = Math.min(1.0, (edgeCount * step * step) / (totalPixels * 0.4));

  // Determine Category based on multi-parameter classification
  let detectedType: ImageTypeCategory = 'AERIAL_DRONE';
  let typeName = 'Aerial Drone Photography';
  let confidence = 0.88;
  let pipeline = 'Aerial/Drone Semantic Segmentation + Orthogonal Building Regularization';
  let summary = '';
  let estimatedScale = 0.08; // meters per pixel default guess

  if (blueprintRatio > 0.35) {
    detectedType = 'CAD_SCAN_BLUEPRINT';
    typeName = 'Architectural / Engineering Blueprint (مخطط هندسي أزرق)';
    confidence = 0.94;
    pipeline = 'Inverted Thresholding + Hough Line Tracing + Text Isolation + CAD Classification';
    summary = 'Blueprint pattern detected with high blue channel dominance and crisp vector lines.';
    estimatedScale = 0.02;
  } else if (bwRatio > 0.65 && avgSaturation < 0.08) {
    if (orthoRatio > 0.45) {
      detectedType = 'ARCHITECTURAL_DRAWING';
      typeName = 'Architectural / Structural CAD Scan (مسح ضوئي لمخطط معماري)';
      confidence = 0.92;
      pipeline = 'Adaptive Otsu Threshold + Morphological Skeletonization + Wall Tracing + Geometry Snap';
      summary = 'Black & White scanned technical drawing with strong orthogonal wall alignments.';
      estimatedScale = 0.025;
    } else {
      detectedType = 'BLACK_WHITE_LINE';
      typeName = 'Monochrome Line Drawing / Contour Plan (مخطط خطي أبيض وأسود)';
      confidence = 0.89;
      pipeline = 'Canny Edge + Contour Hierarchy + RDP Polyline Simplification';
      summary = 'High contrast black and white linework detected without color information.';
      estimatedScale = 0.05;
    }
  } else if (vegetationRatio > 0.08 || roofRatio > 0.03 || asphaltRatio > 0.15) {
    if (edgeDensity > 0.35 && (roofRatio > 0.02 || asphaltRatio > 0.1)) {
      detectedType = 'AERIAL_DRONE';
      typeName = 'High-Resolution Aerial Drone Imagery (صورة جوية درون)';
      confidence = 0.93;
      pipeline = 'Semantic Instance Segmentation (Buildings, Roads, Trees, Parcels) + Right-Angle Regularization';
      summary = 'Aerial drone scene identified with visible rooftop parcels, asphalt road corridors, and tree canopies.';
      estimatedScale = 0.05;
    } else {
      detectedType = 'SATELLITE';
      typeName = 'Satellite Orthoimagery (صورة قمر صناعي)';
      confidence = 0.87;
      pipeline = 'Multi-Spectral Contrast Stretch + Parcel Extrusion + Highway Skeletonization';
      summary = 'Broad geographic orthoimagery with extensive land cover, roads, and parcel blocks.';
      estimatedScale = 0.5;
    }
  } else if (avgSaturation > 0.25 && orthoRatio > 0.3) {
    detectedType = 'URBAN_CADASTRAL';
    typeName = 'Urban Cadastral & Zoning Map (خريطة طبوغرافية وكادسترال)';
    confidence = 0.90;
    pipeline = 'Color-Segmented Parcel Extraction + Road Network Graph + Boundary Polygonization';
    summary = 'Cadastral zoning map with color-coded parcels, property lines, and right-of-way corridors.';
    estimatedScale = 0.1;
  } else {
    detectedType = 'GENERAL_IMAGE';
    typeName = 'General Topographic / Site Image (صورة موقع عامة)';
    confidence = 0.82;
    pipeline = 'Hybrid Edge-Color Segmentation + Polyline Regularization';
    summary = 'General site photograph or mixed map with structural and natural elements.';
    estimatedScale = 0.1;
  }

  return {
    type: detectedType,
    typeName,
    confidence,
    dimensions: { width, height },
    isGrayscale: avgSaturation < 0.08,
    isHighContrast: bwRatio > 0.6,
    colorRichness: Math.min(1.0, avgSaturation * 2.5),
    edgeDensity,
    estimatedScaleMetersPerPx: estimatedScale,
    recommendedPipeline: pipeline,
    summary,
  };
}
