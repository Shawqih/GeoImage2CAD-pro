import { generateDXF } from '../src/engine/dxfWriter';
import type { CADFeature, CADLayer } from '../src/types/cad';

const layers: CADLayer[] = [{
  name: 'BUILDINGS', displayName: 'Buildings', color: '#FF0000', dxfColorIndex: 1,
  lineweight: 0.25, linetype: 'CONTINUOUS', visible: true, locked: false, featureCount: 1,
}];
const features: CADFeature[] = [
  {
    id: 'b-1', layer: 'BUILDINGS', geometryType: 'LWPOLYLINE', isClosed: true,
    points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 0, y: 5 }, { x: 0, y: 0 }],
    confidence: 1, classification: 'Building', source: 'AI_SEGMENTATION', attributes: {},
  },
  {
    id: 'text-1', layer: 'SURVEY/ANNOTATIONS', geometryType: 'TEXT', isClosed: false,
    points: [{ x: 2, y: 2 }], text: 'TEST', textHeight: 1.5,
    confidence: 1, classification: 'Label', source: 'MANUAL_EDIT', attributes: {},
  },
];

const dxf = generateDXF(features, layers, {
  imageHeight: 10,
  invertY: false,
  unit: 'm',
});
const required = [
  '0\r\nSECTION\r\n2\r\nHEADER',
  '9\r\n$ACADVER\r\n1\r\nAC1027',
  '9\r\n$INSUNITS\r\n70\r\n6',
  '2\r\nLAYER',
  '2\r\nSURVEY_ANNOTATIONS',
  '0\r\nLWPOLYLINE',
  '0\r\nTEXT',
  '0\r\nENDSEC',
  '0\r\nEOF',
];
for (const token of required) {
  if (!dxf.includes(token)) throw new Error(`DXF validation failed: missing ${JSON.stringify(token)}`);
}
const entityCount = (type: string) => (dxf.match(new RegExp(`\\r\\n${type}\\r\\n`, 'g')) ?? []).length;
if (entityCount('LWPOLYLINE') !== 1 || entityCount('TEXT') !== 1) {
  throw new Error('DXF validation failed: entity count mismatch');
}
console.log(JSON.stringify({ ok: true, bytes: dxf.length, entities: { lwpolyline: 1, text: 1 }, units: 'meters' }, null, 2));
