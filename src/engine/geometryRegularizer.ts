/**
 * Enhanced CAD Geometry Regularization Engine
 * Implements RDP simplification, Oriented Bounding Box (OBB), Dominant Azimuth Rectification,
 * True 90° Orthogonalization, Collinear Segment Merging, and Polygon Closure.
 */
import { Point2D } from '../types/cad';

export function distance(p1: Point2D, p2: Point2D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function perpendicularDistance(p: Point2D, a: Point2D, b: Point2D): number {
  const l2 = (b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y);
  if (l2 === 0) return distance(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2));
  const projection = {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  };
  return distance(p, projection);
}

/**
 * Ramer-Douglas-Peucker (RDP) Algorithm
 */
export function simplifyRDP(points: Point2D[], epsilon: number): Point2D[] {
  if (points.length <= 2) return [...points];

  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyRDP(points.slice(0, index + 1), epsilon);
    const right = simplifyRDP(points.slice(index), epsilon);
    return left.slice(0, left.length - 1).concat(right);
  } else {
    return [start, end];
  }
}

/**
 * Polygon Area (Shoelace formula)
 */
export function calculatePolygonArea(points: Point2D[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Polyline / Polygon perimeter length
 */
export function calculatePolylineLength(points: Point2D[], isClosed: boolean): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += distance(points[i], points[i + 1]);
  }
  if (isClosed && points.length > 2) {
    total += distance(points[points.length - 1], points[0]);
  }
  return total;
}

export function segmentAngle(p1: Point2D, p2: Point2D): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

export function normalizeAnglePi(angle: number): number {
  let a = angle % Math.PI;
  if (a < 0) a += Math.PI;
  return a;
}

/**
 * Finds dominant orientation (azimuth) of a building polygon
 */
export function findDominantOrientation(points: Point2D[]): number {
  if (points.length < 3) return 0;

  let sumSin = 0;
  let sumCos = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const len = distance(p1, p2);
    if (len < 1) continue;

    const angle = segmentAngle(p1, p2);
    // Multiply by 4 so 90-degree rotations map to 360 degrees
    const angle4 = 4 * angle;
    sumSin += len * Math.sin(angle4);
    sumCos += len * Math.cos(angle4);
  }

  const avg4 = Math.atan2(sumSin, sumCos);
  return normalizeAnglePi(avg4 / 4);
}

/**
 * Computes Minimum Area Bounding Box (Oriented Bounding Box) for simple rectangular buildings
 */
export function computeOrientedBoundingBox(points: Point2D[]): Point2D[] | null {
  if (points.length < 3) return null;

  const domAngle = findDominantOrientation(points);
  const cosA = Math.cos(-domAngle);
  const sinA = Math.sin(-domAngle);

  // Rotate points into principal coordinate frame
  let minU = Infinity,
    minV = Infinity,
    maxU = -Infinity,
    maxV = -Infinity;

  for (const p of points) {
    const u = p.x * cosA - p.y * sinA;
    const v = p.x * sinA + p.y * cosA;
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }

  const w = maxU - minU;
  const h = maxV - minV;
  const polyArea = calculatePolygonArea(points);
  const boxArea = w * h;

  // If the polygon fills > 75% of its bounding box, it is predominantly rectangular
  if (polyArea / boxArea >= 0.72) {
    const cosB = Math.cos(domAngle);
    const sinB = Math.sin(domAngle);

    const cornersU = [minU, maxU, maxU, minU];
    const cornersV = [minV, minV, maxV, maxV];

    const result: Point2D[] = [];
    for (let i = 0; i < 4; i++) {
      const u = cornersU[i];
      const v = cornersV[i];
      result.push({
        x: Number((u * cosB - v * sinB).toFixed(2)),
        y: Number((u * sinB + v * cosB).toFixed(2)),
      });
    }
    return result;
  }

  return null;
}

/**
 * Intersects two 2D lines defined by points (p1, p2) and (p3, p4)
 */
export function lineIntersection(p1: Point2D, p2: Point2D, p3: Point2D, p4: Point2D): Point2D | null {
  const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(d) < 1e-6) return null;

  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
  return {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y),
  };
}

/**
 * High-accuracy Orthogonalization:
 * Snaps all edges to parallel or perpendicular to dominant orientation,
 * producing crisp right-angled CAD building footprints.
 */
export function orthogonalizePolygon(
  rawPoints: Point2D[],
  toleranceDeg: number = 18,
  snapDist: number = 4
): Point2D[] {
  if (rawPoints.length < 3) return rawPoints;

  // Check if it's rectangular first
  const obb = computeOrientedBoundingBox(rawPoints);
  if (obb) return obb;

  let points = simplifyRDP(rawPoints, 2.5);
  if (points.length < 3) return rawPoints;

  if (distance(points[0], points[points.length - 1]) < 3) {
    points.pop();
  }
  if (points.length < 3) return rawPoints;

  const n = points.length;
  const domAngle = findDominantOrientation(points);
  const tolRad = (toleranceDeg * Math.PI) / 180;

  interface Edge {
    p1: Point2D;
    p2: Point2D;
    mid: Point2D;
    dir: Point2D;
    len: number;
  }

  const adjustedEdges: Edge[] = [];

  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const edgeLen = distance(p1, p2);
    const rawAngle = segmentAngle(p1, p2);

    let closestAngle = rawAngle;
    let minDiff = Infinity;

    for (let k = 0; k < 4; k++) {
      const target = domAngle + (k * Math.PI) / 2;
      const diff = Math.atan2(Math.sin(rawAngle - target), Math.cos(rawAngle - target));
      if (Math.abs(diff) < Math.abs(minDiff)) {
        minDiff = diff;
        closestAngle = target;
      }
    }

    const finalAngle = Math.abs(minDiff) <= tolRad ? closestAngle : rawAngle;

    adjustedEdges.push({
      p1,
      p2,
      mid: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
      dir: { x: Math.cos(finalAngle), y: Math.sin(finalAngle) },
      len: edgeLen,
    });
  }

  const regularized: Point2D[] = [];

  for (let i = 0; i < n; i++) {
    const prev = adjustedEdges[(i - 1 + n) % n];
    const curr = adjustedEdges[i];

    const l1_a = prev.mid;
    const l1_b = { x: l1_a.x + prev.dir.x * 60, y: l1_a.y + prev.dir.y * 60 };
    const l2_a = curr.mid;
    const l2_b = { x: l2_a.x + curr.dir.x * 60, y: l2_a.y + curr.dir.y * 60 };

    const inter = lineIntersection(l1_a, l1_b, l2_a, l2_b);

    if (inter && distance(inter, points[i]) < Math.max(35, curr.len * 0.75)) {
      regularized.push({
        x: Number(inter.x.toFixed(1)),
        y: Number(inter.y.toFixed(1)),
      });
    } else {
      regularized.push(points[i]);
    }
  }

  // Prune micro-segments
  const cleaned: Point2D[] = [];
  for (let i = 0; i < regularized.length; i++) {
    const next = regularized[(i + 1) % regularized.length];
    if (distance(regularized[i], next) >= snapDist) {
      cleaned.push(regularized[i]);
    }
  }

  return cleaned.length >= 3 ? cleaned : points;
}

/**
 * Merges collinear segments in a polyline
 */
export function mergeCollinearSegments(points: Point2D[], tolerancePx: number = 1.2): Point2D[] {
  if (points.length <= 2) return points;

  const result: Point2D[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const next = points[i + 1];

    const d = perpendicularDistance(curr, prev, next);
    if (d > tolerancePx) {
      result.push(curr);
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

/**
 * Fits a circle (center and radius) using Kasa's least-squares algorithm
 */
export function fitCircleToPoints(points: Point2D[]): { center: Point2D; radius: number; error: number } | null {
  if (points.length < 3) return null;

  let sumX = 0,
    sumY = 0,
    sumX2 = 0,
    sumY2 = 0,
    sumXY = 0,
    sumX3 = 0,
    sumY3 = 0,
    sumXY2 = 0,
    sumX2Y = 0;
  const n = points.length;

  for (const p of points) {
    const x = p.x;
    const y = p.y;
    const x2 = x * x;
    const y2 = y * y;
    sumX += x;
    sumY += y;
    sumX2 += x2;
    sumY2 += y2;
    sumXY += x * y;
    sumX3 += x * x2;
    sumY3 += y * y2;
    sumXY2 += x * y2;
    sumX2Y += x2 * y;
  }

  const C = n * sumX2 - sumX * sumX;
  const D = n * sumXY - sumX * sumY;
  const E = n * sumX3 + n * sumXY2 - (sumX2 + sumY2) * sumX;
  const G = n * sumY2 - sumY * sumY;
  const H = n * sumX2Y + n * sumY3 - (sumX2 + sumY2) * sumY;

  const denom = 2 * (C * G - D * D);
  if (Math.abs(denom) < 1e-7) return null;

  const cx = (E * G - D * H) / denom;
  const cy = (C * H - D * E) / denom;

  let sumR = 0;
  for (const p of points) {
    sumR += distance(p, { x: cx, y: cy });
  }
  const radius = sumR / n;

  let errorSum = 0;
  for (const p of points) {
    errorSum += Math.abs(distance(p, { x: cx, y: cy }) - radius);
  }

  return {
    center: { x: Number(cx.toFixed(1)), y: Number(cy.toFixed(1)) },
    radius: Number(radius.toFixed(1)),
    error: errorSum / n,
  };
}
