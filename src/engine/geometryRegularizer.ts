/**
 * Enhanced CAD Geometry Regularization Engine
 * Professional photogrammetry-grade building polygon orthogonalization,
 * Oriented Bounding Box (OBB), dominant azimuth detection,
 * collinear segment merging, sub-pixel intersection, and circle fitting.
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
  let a = angle % (Math.PI / 2);
  if (a < 0) a += Math.PI / 2;
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

  // If the polygon fills > 70% of its bounding box, it is predominantly a clean rectangular building
  if (polyArea / boxArea >= 0.70) {
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
 * Photogrammetry-Grade Building Orthogonalization:
 * Snaps all edges to parallel or perpendicular to dominant orientation,
 * producing crisp right-angled CAD building footprints.
 */
export function orthogonalizePolygon(
  rawPoints: Point2D[],
  toleranceDeg: number = 20,
  snapDist: number = 4
): Point2D[] {
  if (rawPoints.length < 3) return rawPoints;

  // Check if it's rectangular first
  const obb = computeOrientedBoundingBox(rawPoints);
  if (obb) return obb;

  let points = simplifyRDP(rawPoints, 2.0);
  if (points.length < 3) return rawPoints;

  if (distance(points[0], points[points.length - 1]) < 2) {
    points.pop();
  }
  if (points.length < 3) return rawPoints;

  const domAngle = findDominantOrientation(points);
  const cosRot = Math.cos(-domAngle);
  const sinRot = Math.sin(-domAngle);
  const cosInv = Math.cos(domAngle);
  const sinInv = Math.sin(domAngle);

  // 1. Rotate polygon to canonical horizontal/vertical orientation
  const rotatedPoints: Point2D[] = points.map((p) => ({
    x: p.x * cosRot - p.y * sinRot,
    y: p.x * sinRot + p.y * cosRot,
  }));

  const n = rotatedPoints.length;
  const tolRad = (toleranceDeg * Math.PI) / 180;

  interface CanonicalEdge {
    mid: Point2D;
    isHoriz: boolean;
    isVert: boolean;
    dir: Point2D;
    len: number;
  }

  const edges: CanonicalEdge[] = [];

  for (let i = 0; i < n; i++) {
    const p1 = rotatedPoints[i];
    const p2 = rotatedPoints[(i + 1) % n];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    // In canonical frame, 0 or PI is horizontal, PI/2 or -PI/2 is vertical
    const angleModPi = ((angle % Math.PI) + Math.PI) % Math.PI; // [0, PI)
    const diffHoriz = Math.min(angleModPi, Math.PI - angleModPi);
    const diffVert = Math.abs(angleModPi - Math.PI / 2);

    let isHoriz = diffHoriz <= tolRad;
    let isVert = diffVert <= tolRad;

    if (isHoriz && isVert) {
      if (diffHoriz <= diffVert) isVert = false;
      else isHoriz = false;
    }

    let dir: Point2D;
    if (isHoriz) {
      dir = { x: Math.sign(dx) || 1, y: 0 };
    } else if (isVert) {
      dir = { x: 0, y: Math.sign(dy) || 1 };
    } else {
      dir = len > 0 ? { x: dx / len, y: dy / len } : { x: 1, y: 0 };
    }

    edges.push({
      mid: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
      isHoriz,
      isVert,
      dir,
      len,
    });
  }

  // 2. Intersect consecutive canonical edges to find clean right-angle corners
  const regularizedCanon: Point2D[] = [];

  for (let i = 0; i < n; i++) {
    const prev = edges[(i - 1 + n) % n];
    const curr = edges[i];

    // Check if one is horizontal and other is vertical: perfect 90-degree corner
    if (prev.isHoriz && curr.isVert) {
      regularizedCanon.push({ x: curr.mid.x, y: prev.mid.y });
    } else if (prev.isVert && curr.isHoriz) {
      regularizedCanon.push({ x: prev.mid.x, y: curr.mid.y });
    } else {
      // General ray intersection
      const l1_a = prev.mid;
      const l1_b = { x: l1_a.x + prev.dir.x * 50, y: l1_a.y + prev.dir.y * 50 };
      const l2_a = curr.mid;
      const l2_b = { x: l2_a.x + curr.dir.x * 50, y: l2_a.y + curr.dir.y * 50 };

      const inter = lineIntersection(l1_a, l1_b, l2_a, l2_b);
      if (inter && distance(inter, rotatedPoints[i]) < Math.max(30, curr.len * 0.8)) {
        regularizedCanon.push(inter);
      } else {
        regularizedCanon.push(rotatedPoints[i]);
      }
    }
  }

  // 3. Rotate back to original world coordinate frame
  const restoredPoints: Point2D[] = regularizedCanon.map((p) => ({
    x: Number((p.x * cosInv - p.y * sinInv).toFixed(2)),
    y: Number((p.x * sinInv + p.y * cosInv).toFixed(2)),
  }));

  // 4. Prune micro-segments
  const cleaned: Point2D[] = [];
  for (let i = 0; i < restoredPoints.length; i++) {
    const next = restoredPoints[(i + 1) % restoredPoints.length];
    if (distance(restoredPoints[i], next) >= snapDist) {
      cleaned.push(restoredPoints[i]);
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
