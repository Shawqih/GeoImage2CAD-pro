/**
 * Georeferencing & Metric Scale Engine
 * Supports two-point distance scale calibration and 6-parameter Affine GCP transformation.
 */
import { GroundControlPoint, Point2D, ScaleCalibration } from '../types/cad';
import { distance } from './geometryRegularizer';

/**
 * Calibrates scale from two picked pixel coordinates and a known real distance in meters
 */
export function calibrateScaleFromPoints(
  p1: Point2D,
  p2: Point2D,
  knownDistanceMeters: number,
  unit: 'm' | 'ft' | 'cm' = 'm'
): ScaleCalibration {
  const pixelDist = distance(p1, p2);
  if (pixelDist < 1) {
    throw new Error('Selected points are too close to establish accurate scale');
  }

  // Convert to meters if different unit
  let distInMeters = knownDistanceMeters;
  if (unit === 'ft') distInMeters = knownDistanceMeters * 0.3048;
  if (unit === 'cm') distInMeters = knownDistanceMeters * 0.01;

  const metersPerPixel = distInMeters / pixelDist;

  return {
    isCalibrated: true,
    point1: p1,
    point2: p2,
    knownDistanceMeters,
    pixelDistance: Math.round(pixelDist * 10) / 10,
    metersPerPixel: Math.round(metersPerPixel * 10000) / 10000,
    unit,
  };
}

/**
 * Solves 6-parameter Affine transformation matrix using Least-Squares:
 * [X] = [a b c] * [x y 1]^T
 * [Y] = [d e f] * [x y 1]^T
 * Returns [a, b, c, d, e, f] and RMS residual error.
 */
export function computeAffineFromGCPs(
  gcps: GroundControlPoint[]
): { matrix: [number, number, number, number, number, number]; rmse: number } | null {
  if (gcps.length < 3) return null;

  const n = gcps.length;
  // Matrix normal equation: (A^T A) theta = A^T Y
  let s_xx = 0,
    s_yy = 0,
    s_xy = 0,
    s_x = 0,
    s_y = 0;
  let s_xX = 0,
    s_yX = 0,
    s_X = 0;
  let s_xY = 0,
    s_yY = 0,
    s_Y = 0;

  for (const g of gcps) {
    const x = g.pixelX;
    const y = g.pixelY;
    const X = g.worldX;
    const Y = g.worldY;

    s_xx += x * x;
    s_yy += y * y;
    s_xy += x * y;
    s_x += x;
    s_y += y;

    s_xX += x * X;
    s_yX += y * X;
    s_X += X;

    s_xY += x * Y;
    s_yY += y * Y;
    s_Y += Y;
  }

  // 3x3 Determinant
  const det =
    s_xx * (s_yy * n - s_y * s_y) -
    s_xy * (s_xy * n - s_y * s_x) +
    s_x * (s_xy * s_y - s_yy * s_x);

  if (Math.abs(det) < 1e-9) return null;

  // Invert 3x3 matrix
  const inv00 = (s_yy * n - s_y * s_y) / det;
  const inv01 = (s_x * s_y - s_xy * n) / det;
  const inv02 = (s_xy * s_y - s_yy * s_x) / det;

  const inv10 = (s_y * s_x - s_xy * n) / det;
  const inv11 = (s_xx * n - s_x * s_x) / det;
  const inv12 = (s_xy * s_x - s_xx * s_y) / det;

  const inv20 = (s_xy * s_y - s_yy * s_x) / det;
  const inv21 = (s_xy * s_x - s_xx * s_y) / det;
  const inv22 = (s_xx * s_yy - s_xy * s_xy) / det;

  // Solve for [a, b, c]
  const a = inv00 * s_xX + inv01 * s_yX + inv02 * s_X;
  const b = inv10 * s_xX + inv11 * s_yX + inv12 * s_X;
  const c = inv20 * s_xX + inv21 * s_yX + inv22 * s_X;

  // Solve for [d, e, f]
  const d = inv00 * s_xY + inv01 * s_yY + inv02 * s_Y;
  const e = inv10 * s_xY + inv11 * s_yY + inv12 * s_Y;
  const f = inv20 * s_xY + inv21 * s_yY + inv22 * s_Y;

  // Compute Root-Mean-Square-Error (RMSE)
  let sumSqErr = 0;
  for (const g of gcps) {
    const estX = a * g.pixelX + b * g.pixelY + c;
    const estY = d * g.pixelX + e * g.pixelY + f;
    const errX = estX - g.worldX;
    const errY = estY - g.worldY;
    sumSqErr += errX * errX + errY * errY;
  }
  const rmse = Math.sqrt(sumSqErr / n);

  return {
    matrix: [a, b, c, d, e, f],
    rmse: Math.round(rmse * 100) / 100,
  };
}
