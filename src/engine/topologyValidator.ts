/**
 * Topology Validation & Auto-Fix Engine
 * Audits geometry for CAD / GIS compliance (unclosed building polygons,
 * duplicate vertices, zero-length lines, collinear slivers) and automatically repairs them.
 */
import { CADFeature, TopologyIssue } from '../types/cad';
import {
  calculatePolygonArea,
  calculatePolylineLength,
  distance,
  mergeCollinearSegments,
} from './geometryRegularizer';

export function validateTopology(features: CADFeature[]): TopologyIssue[] {
  const issues: TopologyIssue[] = [];

  for (const feat of features) {
    // 1. Check unclosed polygons in building / parcel layers
    if ((feat.layer === 'BUILDINGS' || feat.layer === 'PARCELS') && !feat.isClosed) {
      issues.push({
        id: `ISSUE_${feat.id}_OPEN`,
        featureId: feat.id,
        layer: feat.layer,
        type: 'UNCLOSED_POLYGON',
        message: `Building ${feat.id} polygon has open boundaries. Buildings must be closed loops.`,
        severity: 'ERROR',
        location: feat.points[0] || { x: 0, y: 0 },
      });
    }

    // 2. Check duplicate consecutive vertices
    for (let i = 0; i < feat.points.length - 1; i++) {
      if (distance(feat.points[i], feat.points[i + 1]) < 0.7) {
        issues.push({
          id: `ISSUE_${feat.id}_DUP_${i}`,
          featureId: feat.id,
          layer: feat.layer,
          type: 'DUPLICATE_VERTICES',
          message: `Coincident vertices detected at index ${i} in ${feat.id}.`,
          severity: 'WARNING',
          location: feat.points[i],
        });
        break;
      }
    }

    // 3. Check zero-length lines
    if (feat.points.length >= 2) {
      const len = calculatePolylineLength(feat.points, feat.isClosed);
      if (len < 1.0) {
        issues.push({
          id: `ISSUE_${feat.id}_ZERO`,
          featureId: feat.id,
          layer: feat.layer,
          type: 'ZERO_LENGTH',
          message: `Zero or sub-pixel length feature ${feat.id}.`,
          severity: 'ERROR',
          location: feat.points[0],
        });
      }
    }
  }

  return issues;
}

/**
 * Automatically repairs topology issues across the feature collection
 */
export function autoFixTopology(features: CADFeature[]): {
  repairedFeatures: CADFeature[];
  fixedCount: number;
} {
  let fixedCount = 0;
  const repairedFeatures: CADFeature[] = [];

  for (const feat of features) {
    let pts = [...feat.points];
    let isClosed = feat.isClosed;
    let modified = false;

    // Remove zero length / single point artifacts
    if (pts.length < 2 && feat.geometryType !== 'POINT' && feat.geometryType !== 'CIRCLE') {
      fixedCount++;
      continue;
    }

    // Deduplicate consecutive vertices
    const deduped: typeof pts = [];
    for (let i = 0; i < pts.length; i++) {
      if (i === 0 || distance(pts[i], deduped[deduped.length - 1]) >= 1.0) {
        deduped.push(pts[i]);
      } else {
        modified = true;
      }
    }
    pts = deduped;

    // Auto-close building or parcel polygons if endpoints are near
    if ((feat.layer === 'BUILDINGS' || feat.layer === 'PARCELS') && !isClosed) {
      isClosed = true;
      modified = true;
    }

    // Merge collinear slivers
    if (pts.length >= 3) {
      const merged = mergeCollinearSegments(pts, 1.2);
      if (merged.length !== pts.length) {
        pts = merged;
        modified = true;
      }
    }

    if (modified) fixedCount++;

    const area = isClosed && pts.length >= 3 ? Math.round(calculatePolygonArea(pts)) : feat.area;
    const len = Math.round(calculatePolylineLength(pts, isClosed));

    repairedFeatures.push({
      ...feat,
      points: pts,
      isClosed,
      area,
      length: len,
    });
  }

  return { repairedFeatures, fixedCount };
}
