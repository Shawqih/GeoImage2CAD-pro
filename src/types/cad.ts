/**
 * GeoImage2CAD Pro - Core CAD and GIS Type Definitions
 */

export interface Point2D {
  x: number;
  y: number;
  z?: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type CADGeometryType =
  | 'POINT'
  | 'LINE'
  | 'LWPOLYLINE'
  | 'POLYLINE'
  | 'CIRCLE'
  | 'ARC'
  | 'TEXT';

export type StandardLayerName =
  | 'BUILDINGS'
  | 'ROADS'
  | 'ROAD_CENTERLINES'
  | 'ROAD_BOUNDARIES'
  | 'PARCELS'
  | 'WALLS'
  | 'FENCES'
  | 'SIDEWALKS'
  | 'PARKING'
  | 'TREES'
  | 'VEGETATION'
  | 'WATER'
  | 'DRAINAGE'
  | 'RAILWAYS'
  | 'POWER_LINES'
  | 'POLES'
  | 'CONTOURS'
  | 'DIMENSIONS'
  | 'OTHER';

export interface CADLayer {
  name: string;
  displayName: string;
  color: string; // Hex color for canvas
  dxfColorIndex: number; // AutoCAD ACI Color 1-255
  lineweight: number; // in mm, e.g. 0.15, 0.25, 0.35, 0.50
  linetype: 'CONTINUOUS' | 'DASHED' | 'CENTER' | 'PHANTOM' | 'DOT';
  visible: boolean;
  locked: boolean;
  featureCount: number;
}

export interface CADFeature {
  id: string;
  layer: string;
  geometryType: CADGeometryType;
  isClosed: boolean;
  points: Point2D[];
  center?: Point2D;
  radius?: number;
  startAngle?: number; // In radians for canvas, degrees for DXF
  endAngle?: number;
  text?: string;
  textHeight?: number;
  confidence: number; // 0.0 to 1.0
  classification: string;
  source: 'AI_SEGMENTATION' | 'LINE_DETECTION' | 'CONTOUR_EXTRACTION' | 'MANUAL_EDIT';
  area?: number; // In px² or m² if calibrated
  length?: number; // In px or m if calibrated
  attributes: Record<string, string | number | boolean>;
  selected?: boolean;
}

export type ImageTypeCategory =
  | 'AERIAL_DRONE'
  | 'SATELLITE'
  | 'URBAN_CADASTRAL'
  | 'CAD_SCAN_BLUEPRINT'
  | 'ARCHITECTURAL_DRAWING'
  | 'BLACK_WHITE_LINE'
  | 'GENERAL_IMAGE';

export interface ImageAnalysisReport {
  type: ImageTypeCategory;
  typeName: string;
  confidence: number;
  dimensions: { width: number; height: number };
  isGrayscale: boolean;
  isHighContrast: boolean;
  colorRichness: number; // 0 to 1
  edgeDensity: number; // 0 to 1
  estimatedScaleMetersPerPx?: number;
  recommendedPipeline: string;
  summary: string;
}

export type DetectionQualityPreset = 'DRAFT' | 'NORMAL' | 'HIGH' | 'ULTRA';

export interface ProcessingParameters {
  quality: DetectionQualityPreset;
  noiseRemoval: number; // 1 to 7 kernel size
  edgeSensitivity: number; // 10 to 90
  minFeatureSize: number; // In px², e.g. 50 to 500
  polygonAccuracy: number; // 1 to 10
  rdpTolerance: number; // 0.5 to 5.0 px
  orthogonalizationToleranceDeg: number; // 5 to 25 degrees
  snapTolerancePx: number; // 2 to 15 px
  gapClosingPx: number; // 2 to 20 px
  buildingRegularization: boolean;
  roadCenterlineExtraction: boolean;
  treeDetection: boolean;
  waterDetection: boolean;
}

export interface ScaleCalibration {
  isCalibrated: boolean;
  point1?: Point2D;
  point2?: Point2D;
  knownDistanceMeters: number;
  pixelDistance: number;
  metersPerPixel: number;
  unit: 'm' | 'ft' | 'cm';
}

export interface GroundControlPoint {
  id: string;
  pixelX: number;
  pixelY: number;
  worldX: number; // e.g. Easting or Longitude
  worldY: number; // e.g. Northing or Latitude
  elevation?: number;
}

export interface GeoreferenceInfo {
  crsName: string;
  epsgCode: string;
  isReferenced: boolean;
  gcps: GroundControlPoint[];
  affineMatrix?: [number, number, number, number, number, number]; // [a, b, c, d, e, f]
}

export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  imageFileName: string;
  imageWidth: number;
  imageHeight: number;
}

export interface ProjectData {
  metadata: ProjectMetadata;
  imageSrc: string;
  analysisReport: ImageAnalysisReport | null;
  features: CADFeature[];
  layers: CADLayer[];
  scaleCalibration: ScaleCalibration;
  georeference: GeoreferenceInfo;
  parameters: ProcessingParameters;
}

export interface TopologyIssue {
  id: string;
  featureId: string;
  layer: string;
  type:
    | 'UNCLOSED_POLYGON'
    | 'SELF_INTERSECTION'
    | 'DUPLICATE_VERTICES'
    | 'ZERO_LENGTH'
    | 'COLLINEAR_SLIVER';
  message: string;
  severity: 'WARNING' | 'ERROR';
  location: Point2D;
}
