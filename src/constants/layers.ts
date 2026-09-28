/**
 * Standard CAD & GIS Layers and AutoCAD Color Index (ACI) Mapping
 */
import { CADLayer, StandardLayerName } from '../types/cad';

export const STANDARD_LAYERS: Record<StandardLayerName, CADLayer> = {
  BUILDINGS: {
    name: 'BUILDINGS',
    displayName: 'Buildings (المباني)',
    color: '#E63946', // Vibrant Red / Coral
    dxfColorIndex: 1, // Red
    lineweight: 0.35,
    linetype: 'CONTINUOUS',
    visible: true,
    locked: false,
    featureCount: 0,
  },
  ROADS: {
    name: 'ROADS',
    displayName: 'Roads Area (مساحات الطرق)',
    color: '#457B9D', // Steel Blue
    dxfColorIndex: 4, // Cyan / Light Blue
    lineweight: 0.25,
    linetype: 'CONTINUOUS',
    visible: true,
    locked: false,
    featureCount: 0,
  },
  ROAD_CENTERLINES: {
    name: 'ROAD_CENTERLINES',
    displayName: 'Road Centerlines (محاور الطرق)',
    color: '#F4A261', // Orange / Amber
    dxfColorIndex: 2, // Yellow
    lineweight: 0.35,
    linetype: 'CENTER',
    visible: true,
    locked: false,
    featureCount: 0,
  },
  ROAD_BOUNDARIES: {
    name: 'ROAD_BOUNDARIES',
    displayName: 'Road Boundaries (حدود الطرق)',
    color: '#2A9D8F', // Teal / Green
    dxfColorIndex: 3, // Green
    lineweight: 0.25,
    linetype: 'CONTINUOUS',
    visible: true,
    locked: false,
    featureCount: 0,
  },
  PARCELS: {
    name: 'PARCELS',
    displayName: 'Parcels & Lots (قطع الأراضي والمحاور)',
    color: '#9D4EDD', // Purple / Violet
    dxfColorIndex: 6, // Magenta
    lineweight: 0.35,
    linetype: 'CONTINUOUS',
    visible: true,
    locked: false,
    featureCount: 0,
  },
  WALLS: {
    name: 'WALLS',
    displayName: 'Walls & Enclosures (الجدران والأسوار)',
    color: '#E76F51', // Terracotta
    dxfColorIndex: 1, // Red
    lineweight: 0.50,
    linetype: 'CONTINUOUS',
    visible: true,
    locked: false,
    featureCount: 0,
  },
  FENCES: {
    name: 'FENCES',
    displayName: 'Fences & Barriers (الحواجز)',
    color: '#D4A373', // Tan
    dxfColorIndex: 8, // Dark Gray
    lineweight: 0.18,
    linetype: 'DASHED',
    visible: true,
    locked: false,
    featureCount: 0,
  },
  SIDEWALKS: {
    name: 'SIDEWALKS',
    displayName: 'Sidewalks (الأرصفة)',
    color: '#A8DADC', // Light Aqua
    dxfColorIndex: 130,
    lineweight: 0.15,
    linetype: 'CONTINUOUS',
    visible: true,
    locked: false,
    featureCount: 0,
  },
  PARKING: {
    name: 'PARKING',
    displayName: 'Parking Areas (مواقف السيارات)',
    color: '#6C757D', // Slate
    dxfColorIndex: 9, // Light Gray
    lineweight: 0.18,
    linetype: 'CONTINUOUS',
    visible: true,
    locked: false,
    featureCount: 0,
  },
  TREES: {
    name: 'TREES',
    displayName: 'Trees (الأشجار المستقلة)',
    color: '#52B788', // Emerald Green
    dxfColorIndex: 3, // Green
    lineweight: 0.25,
    linetype: 'CONTINUOUS',
    visible: true,
    locked: false,
    featureCount: 0,
  },
  VEGETATION: {
    name: 'VEGETATION',
    displayName: 'Vegetation & Grass (الغطاء النباتي)',
    color: '#74C69D', // Light Green
    dxfColorIndex: 72,
    lineweight: 0.18,
    linetype: 'CONTINUOUS',
    visible: true,
    locked: false,
    featureCount: 0,
  },
  WATER: {
    name: 'WATER',
    displayName: 'Water Bodies (المسطحات المائية)',
    color: '#0077B6', // Deep Blue
    dxfColorIndex: 5, // Blue
    lineweight: 0.35,
    linetype: 'CONTINUOUS',
    visible: true,
    locked: false,
    featureCount: 0,
  },
  DRAINAGE: {
    name: 'DRAINAGE',
    displayName: 'Drainage & Channels (مجاري التصريف)',
    color: '#00B4D8', // Sky Blue
    dxfColorIndex: 4, // Cyan
    lineweight: 0.25,
    linetype: 'CONTINUOUS',
    visible: true,
    locked: false,
    featureCount: 0,
  },
  RAILWAYS: {
    name: 'RAILWAYS',
    displayName: 'Railways (السكك الحديدية)',
    color: '#B5179E', // Fuchsia
    dxfColorIndex: 6,
    lineweight: 0.35,
    linetype: 'PHANTOM',
    visible: true,
    locked: false,
    featureCount: 0,
  },
  POWER_LINES: {
    name: 'POWER_LINES',
    displayName: 'Power Lines (خطوط الطاقة)',
    color: '#FFB703', // Amber Yellow
    dxfColorIndex: 2,
    lineweight: 0.25,
    linetype: 'DASHED',
    visible: true,
    locked: false,
    featureCount: 0,
  },
  POLES: {
    name: 'POLES',
    displayName: 'Utility Poles (أعمدة الإنارة والمرافق)',
    color: '#FB8500', // Deep Orange
    dxfColorIndex: 30,
    lineweight: 0.25,
    linetype: 'CONTINUOUS',
    visible: true,
    locked: false,
    featureCount: 0,
  },
  CONTOURS: {
    name: 'CONTOURS',
    displayName: 'Contours (خطوط الكنتور)',
    color: '#B08968', // Earth Brown
    dxfColorIndex: 34,
    lineweight: 0.15,
    linetype: 'CONTINUOUS',
    visible: true,
    locked: false,
    featureCount: 0,
  },
  DIMENSIONS: {
    name: 'DIMENSIONS',
    displayName: 'Dimensions & Text (الأبعاد والنصوص)',
    color: '#FFFFFF', // White
    dxfColorIndex: 7, // White/Black
    lineweight: 0.18,
    linetype: 'CONTINUOUS',
    visible: true,
    locked: false,
    featureCount: 0,
  },
  OTHER: {
    name: 'OTHER',
    displayName: 'Other Features (معالم أخرى)',
    color: '#ADB5BD', // Neutral Gray
    dxfColorIndex: 8,
    lineweight: 0.18,
    linetype: 'CONTINUOUS',
    visible: true,
    locked: false,
    featureCount: 0,
  },
};

export const DEFAULT_PARAMETERS: Record<string, any> = {
  quality: 'HIGH',
  noiseRemoval: 3,
  edgeSensitivity: 45,
  minFeatureSize: 80,
  polygonAccuracy: 7,
  rdpTolerance: 1.8,
  orthogonalizationToleranceDeg: 12,
  snapTolerancePx: 5,
  gapClosingPx: 8,
  buildingRegularization: true,
  roadCenterlineExtraction: true,
  treeDetection: true,
  waterDetection: true,
};
