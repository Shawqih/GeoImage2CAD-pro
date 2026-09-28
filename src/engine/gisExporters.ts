/**
 * GIS Exporters Engine - Production Grade
 * Produces GeoJSON (RFC 7946), ESRI Shapefile Bundle (.zip containing .shp, .shx, .dbf, .prj),
 * OGC KML 2.2, SVG Vector, and CSV Attribute tables.
 * Fully compatible with QGIS, ArcGIS Pro, Google Earth, and web GIS viewers.
 */
import JSZip from 'jszip';
import { CADFeature, CADLayer, GeoreferenceInfo, ScaleCalibration } from '../types/cad';

export const WGS84_PRJ =
  'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]';

export const LOCAL_METRIC_PRJ =
  'PROJCS["Local_Metric_Grid",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],UNIT["Meter",1.0]]';

/**
 * Ensures a 2D polygon ring has CLOCKWISE vertex ordering (ESRI Shapefile requirement)
 */
function ensureClockwiseRing(ring: [number, number][]): [number, number][] {
  let signedArea = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    signedArea += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  // In Cartesian coordinates (Y upwards), positive signedArea is CCW, so reverse to make it CW
  if (signedArea > 0) {
    return [...ring].reverse();
  }
  return ring;
}

/**
 * Standard GeoJSON FeatureCollection (RFC 7946)
 */
export function generateGeoJSON(
  features: CADFeature[],
  scaleCalibration?: ScaleCalibration,
  geoInfo?: GeoreferenceInfo,
  imgHeight: number = 1000
): string {
  const isScale = scaleCalibration?.isCalibrated;
  const mPerPx = isScale ? scaleCalibration!.metersPerPixel : 1.0;

  const toGeoCoord = (x: number, y: number): [number, number] => {
    if (geoInfo?.isReferenced && geoInfo.affineMatrix) {
      const [a, b, c, d, e, f] = geoInfo.affineMatrix;
      return [
        Number((a * x + b * y + c).toFixed(6)),
        Number((d * x + e * y + f).toFixed(6)),
      ];
    }
    return [
      Number((x * mPerPx).toFixed(3)),
      Number(((imgHeight - y) * mPerPx).toFixed(3)),
    ];
  };

  const geoJsonFeatures = features
    .map((feat) => {
      let geometry: any = null;

      if (feat.geometryType === 'POINT' || feat.geometryType === 'CIRCLE') {
        const pt = feat.center || feat.points[0] || { x: 0, y: 0 };
        geometry = {
          type: 'Point',
          coordinates: toGeoCoord(pt.x, pt.y),
        };
      } else if (feat.isClosed && feat.points.length >= 3) {
        const ring = feat.points.map((p) => toGeoCoord(p.x, p.y));
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          ring.push([...first]);
        }
        geometry = {
          type: 'Polygon',
          coordinates: [ring],
        };
      } else if (feat.points.length >= 2) {
        geometry = {
          type: 'LineString',
          coordinates: feat.points.map((p) => toGeoCoord(p.x, p.y)),
        };
      }

      return {
        type: 'Feature',
        id: feat.id,
        properties: {
          id: feat.id,
          layer: feat.layer,
          classification: feat.classification,
          confidence: Number(feat.confidence.toFixed(2)),
          geometryType: feat.geometryType,
          source: feat.source,
          area: Number((feat.area || 0).toFixed(1)),
          length: Number((feat.length || 0).toFixed(1)),
          ...feat.attributes,
        },
        geometry,
      };
    })
    .filter((f) => f.geometry !== null);

  const collection = {
    type: 'FeatureCollection',
    name: 'GeoImage2CAD_Plan',
    features: geoJsonFeatures,
  };

  return JSON.stringify(collection, null, 2);
}

/**
 * Generates an OGC KML 2.2 XML file
 */
export function generateKML(
  features: CADFeature[],
  layers: CADLayer[],
  scaleCalibration?: ScaleCalibration,
  geoInfo?: GeoreferenceInfo,
  imgHeight: number = 1000
): string {
  const isScale = scaleCalibration?.isCalibrated;
  const mPerPx = isScale ? scaleCalibration!.metersPerPixel : 1.0;

  const toLonLat = (x: number, y: number): [number, number] => {
    if (geoInfo?.isReferenced && geoInfo.affineMatrix) {
      const [a, b, c, d, e, f] = geoInfo.affineMatrix;
      return [a * x + b * y + c, d * x + e * y + f];
    }
    // Projected geographic anchor (Cairo datum anchor)
    const lon = 31.2357 + (x * mPerPx) / 111320;
    const lat = 30.0444 + ((imgHeight - y) * mPerPx) / 110540;
    return [Number(lon.toFixed(6)), Number(lat.toFixed(6))];
  };

  const placemarks: string[] = [];

  for (const feat of features) {
    let geomXml = '';

    if (feat.geometryType === 'POINT' || feat.geometryType === 'CIRCLE') {
      const pt = feat.center || feat.points[0] || { x: 0, y: 0 };
      const [lon, lat] = toLonLat(pt.x, pt.y);
      geomXml = `<Point><coordinates>${lon},${lat},0</coordinates></Point>`;
    } else if (feat.isClosed && feat.points.length >= 3) {
      const ring = feat.points.map((p) => {
        const [lon, lat] = toLonLat(p.x, p.y);
        return `${lon},${lat},0`;
      });
      ring.push(ring[0]);
      geomXml = `<Polygon><outerBoundaryIs><LinearRing><coordinates>${ring.join(' ')}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
    } else if (feat.points.length >= 2) {
      const coords = feat.points.map((p) => {
        const [lon, lat] = toLonLat(p.x, p.y);
        return `${lon},${lat},0`;
      });
      geomXml = `<LineString><coordinates>${coords.join(' ')}</coordinates></LineString>`;
    }

    if (geomXml) {
      placemarks.push(`
    <Placemark>
      <name>${feat.id}</name>
      <styleUrl>#style_${feat.layer}</styleUrl>
      <ExtendedData>
        <Data name="Layer"><value>${feat.layer}</value></Data>
        <Data name="Class"><value>${feat.classification}</value></Data>
        <Data name="Confidence"><value>${feat.confidence}</value></Data>
        <Data name="Area"><value>${feat.area || 0}</value></Data>
        <Data name="Length"><value>${feat.length || 0}</value></Data>
      </ExtendedData>
      ${geomXml}
    </Placemark>`);
    }
  }

  const stylesXml = layers
    .map((l) => {
      const hex = l.color.replace('#', '').padEnd(6, '0');
      const r = hex.slice(0, 2);
      const g = hex.slice(2, 4);
      const b = hex.slice(4, 6);
      const kmlColor = `ff${b}${g}${r}`;
      const kmlFillColor = `66${b}${g}${r}`;

      return `
    <Style id="style_${l.name}">
      <LineStyle>
        <color>${kmlColor}</color>
        <width>${Math.max(1, Math.round(l.lineweight * 5))}</width>
      </LineStyle>
      <PolyStyle>
        <color>${kmlFillColor}</color>
      </PolyStyle>
    </Style>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>GeoImage2CAD Plan</name>
    <description>Vector engineering plan generated by GeoImage2CAD Pro</description>
    ${stylesXml}
    ${placemarks.join('\n')}
  </Document>
</kml>`;
}

/**
 * Generates clean, valid SVG with grouped layers
 */
export function generateSVG(
  features: CADFeature[],
  layers: CADLayer[],
  width: number,
  height: number
): string {
  const layerGroups: Record<string, string[]> = {};
  layers.forEach((l) => (layerGroups[l.name] = []));

  for (const feat of features) {
    const l = layers.find((lay) => lay.name === feat.layer) || {
      color: '#3B82F6',
      lineweight: 0.25,
      linetype: 'CONTINUOUS',
    };
    const strokeWidth = Math.max(1, Math.round(l.lineweight * 4));
    const strokeDash =
      l.linetype === 'DASHED'
        ? 'stroke-dasharray="6,4"'
        : l.linetype === 'CENTER'
        ? 'stroke-dasharray="14,4,4,4"'
        : '';

    if (feat.geometryType === 'CIRCLE') {
      const c = feat.center || feat.points[0] || { x: 0, y: 0 };
      const r = feat.radius || 10;
      layerGroups[feat.layer]?.push(
        `<circle id="${feat.id}" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${l.color}" fill-opacity="0.25" stroke="${l.color}" stroke-width="${strokeWidth}" />`
      );
    } else if (feat.isClosed && feat.points.length >= 3) {
      const pts = feat.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      layerGroups[feat.layer]?.push(
        `<polygon id="${feat.id}" points="${pts}" fill="${l.color}" fill-opacity="0.2" stroke="${l.color}" stroke-width="${strokeWidth}" ${strokeDash} />`
      );
    } else if (feat.points.length >= 2) {
      const pts = feat.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      layerGroups[feat.layer]?.push(
        `<polyline id="${feat.id}" points="${pts}" fill="none" stroke="${l.color}" stroke-width="${strokeWidth}" ${strokeDash} />`
      );
    }
  }

  const groupsXml = Object.entries(layerGroups)
    .filter(([_, elements]) => elements.length > 0)
    .map(
      ([layerName, elements]) => `
  <g id="layer_${layerName}">
    ${elements.join('\n    ')}
  </g>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#0F172A" />
  ${groupsXml}
</svg>`;
}

/**
 * Generates CSV Attribute Table with WKT
 */
export function generateCSV(features: CADFeature[], scale?: ScaleCalibration): string {
  const isScale = scale?.isCalibrated;
  const unit = isScale ? 'm' : 'px';
  const areaUnit = isScale ? 'm2' : 'px2';

  const rows = [
    `Feature_ID,Layer,Classification,Geometry_Type,Confidence,Length_${unit},Area_${areaUnit},Vertex_Count,WKT_Geometry`,
  ];

  for (const f of features) {
    let wkt = '';
    if (f.geometryType === 'POINT' || f.geometryType === 'CIRCLE') {
      const p = f.center || f.points[0] || { x: 0, y: 0 };
      wkt = `"POINT(${p.x.toFixed(2)} ${p.y.toFixed(2)})"`;
    } else if (f.isClosed && f.points.length >= 3) {
      const pts = [...f.points, f.points[0]].map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(', ');
      wkt = `"POLYGON((${pts}))"`;
    } else if (f.points.length >= 2) {
      const pts = f.points.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(', ');
      wkt = `"LINESTRING(${pts})"`;
    }

    rows.push(
      `${f.id},${f.layer},${f.classification},${f.geometryType},${f.confidence.toFixed(2)},${(f.length || 0).toFixed(2)},${(f.area || 0).toFixed(2)},${f.points.length},${wkt}`
    );
  }

  return rows.join('\r\n');
}

/**
 * Builds a 100% compliant multi-file ESRI Shapefile Package (.zip containing .shp, .shx, .dbf, .prj)
 */
export async function generateShapefileZip(
  features: CADFeature[],
  layers: CADLayer[],
  scaleCalibration?: ScaleCalibration,
  geoInfo?: GeoreferenceInfo,
  imgHeight: number = 1000
): Promise<Blob> {
  const zip = new JSZip();

  // 1. Polygons (Buildings, Parcels, Water, Vegetation)
  const polygonFeatures = features.filter((f) => f.isClosed && f.points.length >= 3);
  if (polygonFeatures.length > 0) {
    const { shpBuffer, shxBuffer, dbfBuffer } = buildShapefileBuffers(
      polygonFeatures,
      5, // ShapeType 5: Polygon
      scaleCalibration,
      geoInfo,
      imgHeight
    );
    zip.file('polygons.shp', shpBuffer);
    zip.file('polygons.shx', shxBuffer);
    zip.file('polygons.dbf', dbfBuffer);
    zip.file('polygons.prj', geoInfo?.isReferenced ? WGS84_PRJ : LOCAL_METRIC_PRJ);
  }

  // 2. Lines (Roads, Centerlines, Boundaries)
  const lineFeatures = features.filter((f) => !f.isClosed && f.points.length >= 2);
  if (lineFeatures.length > 0) {
    const { shpBuffer, shxBuffer, dbfBuffer } = buildShapefileBuffers(
      lineFeatures,
      3, // ShapeType 3: PolyLine
      scaleCalibration,
      geoInfo,
      imgHeight
    );
    zip.file('lines.shp', shpBuffer);
    zip.file('lines.shx', shxBuffer);
    zip.file('lines.dbf', dbfBuffer);
    zip.file('lines.prj', geoInfo?.isReferenced ? WGS84_PRJ : LOCAL_METRIC_PRJ);
  }

  // 3. Points (Trees, Poles)
  const pointFeatures = features.filter((f) => f.geometryType === 'POINT' || f.geometryType === 'CIRCLE');
  if (pointFeatures.length > 0) {
    const { shpBuffer, shxBuffer, dbfBuffer } = buildShapefileBuffers(
      pointFeatures,
      1, // ShapeType 1: Point
      scaleCalibration,
      geoInfo,
      imgHeight
    );
    zip.file('points.shp', shpBuffer);
    zip.file('points.shx', shxBuffer);
    zip.file('points.dbf', dbfBuffer);
    zip.file('points.prj', geoInfo?.isReferenced ? WGS84_PRJ : LOCAL_METRIC_PRJ);
  }

  // Readme for GIS operators
  const readmeText = `GeoImage2CAD Pro - ESRI Shapefile Package
Generated at: ${new Date().toISOString()}
CRS: ${geoInfo?.isReferenced ? 'WGS 84 (EPSG:4326)' : 'Local Metric Grid (Meters)'}

Layers Included:
- polygons.shp (.shx, .dbf, .prj): Closed building footprints, parcels, vegetation, water bodies
- lines.shp (.shx, .dbf, .prj): Roads, centerlines, walls, boundary lines
- points.shp (.shx, .dbf, .prj): Point features, columns, poles, trees

Compatible with: QGIS 3.x, ArcGIS Pro, Civil 3D Map, Global Mapper.`;
  zip.file('README_GIS.txt', readmeText);

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Binary ESRI Shapefile encoder adhering to ESRI Shapefile Technical Specification
 */
function buildShapefileBuffers(
  features: CADFeature[],
  shapeType: number,
  scaleCalibration?: ScaleCalibration,
  geoInfo?: GeoreferenceInfo,
  imgHeight: number = 1000
) {
  const mPerPx = scaleCalibration?.isCalibrated ? scaleCalibration.metersPerPixel : 1.0;

  const toGeo = (x: number, y: number): [number, number] => {
    if (geoInfo?.isReferenced && geoInfo.affineMatrix) {
      const [a, b, c, d, e, f] = geoInfo.affineMatrix;
      return [a * x + b * y + c, d * x + e * y + f];
    }
    return [x * mPerPx, (imgHeight - y) * mPerPx];
  };

  let xmin = Infinity,
    ymin = Infinity,
    xmax = -Infinity,
    ymax = -Infinity;

  interface RecordDesc {
    feat: CADFeature;
    contentWords: number;
    pts: [number, number][];
    box: [number, number, number, number];
  }

  const recordDescs: RecordDesc[] = [];
  let totalContentBytes = 0;

  for (const f of features) {
    let pts: [number, number][] = [];

    if (shapeType === 1) {
      const p = f.center || f.points[0] || { x: 0, y: 0 };
      pts = [toGeo(p.x, p.y)];
    } else {
      pts = f.points.map((p) => toGeo(p.x, p.y));
      if (shapeType === 5) {
        // Enforce closed loop
        const first = pts[0];
        const last = pts[pts.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          pts.push([...first]);
        }
        // Enforce CLOCKWISE orientation for ESRI polygon outer boundary
        pts = ensureClockwiseRing(pts);
      }
    }

    let bxmin = Infinity,
      bymin = Infinity,
      bxmax = -Infinity,
      bymax = -Infinity;
    for (const [px, py] of pts) {
      if (px < bxmin) bxmin = px;
      if (px > bxmax) bxmax = px;
      if (py < bymin) bymin = py;
      if (py > bymax) bymax = py;

      if (px < xmin) xmin = px;
      if (px > xmax) xmax = px;
      if (py < ymin) ymin = py;
      if (py > ymax) ymax = py;
    }

    let contentBytes = 0;
    if (shapeType === 1) {
      contentBytes = 4 + 8 + 8; // ShapeType (4) + X (8) + Y (8) = 20 bytes
    } else {
      contentBytes = 4 + 32 + 4 + 4 + 4 + pts.length * 16;
    }

    recordDescs.push({
      feat: f,
      contentWords: contentBytes / 2,
      pts,
      box: [bxmin, bymin, bxmax, bymax],
    });

    totalContentBytes += 8 + contentBytes; // 8-byte record header
  }

  if (!isFinite(xmin)) {
    xmin = 0;
    ymin = 0;
    xmax = 100;
    ymax = 100;
  }

  const shpTotalBytes = 100 + totalContentBytes;
  const shxTotalBytes = 100 + features.length * 8;

  const shpBuffer = new ArrayBuffer(shpTotalBytes);
  const shpView = new DataView(shpBuffer);
  const shxBuffer = new ArrayBuffer(shxTotalBytes);
  const shxView = new DataView(shxBuffer);

  // Write 100-byte Main Header
  const writeHeader = (view: DataView, fileBytes: number) => {
    view.setInt32(0, 9994, false); // File Code: 9994 (Big Endian)
    view.setInt32(24, fileBytes / 2, false); // File Length in 16-bit words (Big Endian)
    view.setInt32(28, 1000, true); // Version: 1000 (Little Endian)
    view.setInt32(32, shapeType, true); // Shape Type
    view.setFloat64(36, xmin, true); // Xmin
    view.setFloat64(44, ymin, true); // Ymin
    view.setFloat64(52, xmax, true); // Xmax
    view.setFloat64(60, ymax, true); // Ymax
    view.setFloat64(68, 0.0, true); // Zmin
    view.setFloat64(76, 0.0, true); // Zmax
    view.setFloat64(84, 0.0, true); // Mmin
    view.setFloat64(92, 0.0, true); // Mmax
  };

  writeHeader(shpView, shpTotalBytes);
  writeHeader(shxView, shxTotalBytes);

  let shpOffset = 100;
  let shxOffset = 100;

  for (let i = 0; i < recordDescs.length; i++) {
    const desc = recordDescs[i];
    const recNum = i + 1;

    // SHX Entry
    shxView.setInt32(shxOffset, shpOffset / 2, false);
    shxView.setInt32(shxOffset + 4, desc.contentWords, false);
    shxOffset += 8;

    // SHP Record Header
    shpView.setInt32(shpOffset, recNum, false);
    shpView.setInt32(shpOffset + 4, desc.contentWords, false);
    shpOffset += 8;

    // SHP Record Body
    shpView.setInt32(shpOffset, shapeType, true);
    shpOffset += 4;

    if (shapeType === 1) {
      shpView.setFloat64(shpOffset, desc.pts[0][0], true);
      shpView.setFloat64(shpOffset + 8, desc.pts[0][1], true);
      shpOffset += 16;
    } else {
      // Bounding box
      shpView.setFloat64(shpOffset, desc.box[0], true);
      shpView.setFloat64(shpOffset + 8, desc.box[1], true);
      shpView.setFloat64(shpOffset + 16, desc.box[2], true);
      shpView.setFloat64(shpOffset + 24, desc.box[3], true);
      shpOffset += 32;

      shpView.setInt32(shpOffset, 1, true); // NumParts = 1
      shpView.setInt32(shpOffset + 4, desc.pts.length, true); // NumPoints
      shpOffset += 8;

      shpView.setInt32(shpOffset, 0, true); // Part Index 0
      shpOffset += 4;

      // Points array
      for (const [px, py] of desc.pts) {
        shpView.setFloat64(shpOffset, px, true);
        shpView.setFloat64(shpOffset + 8, py, true);
        shpOffset += 16;
      }
    }
  }

  // DBF table
  const dbfBuffer = buildDbfBuffer(features);

  return { shpBuffer, shxBuffer, dbfBuffer };
}

/**
 * Builds valid dBASE III (.dbf) binary table
 */
function buildDbfBuffer(features: CADFeature[]): ArrayBuffer {
  const fields = [
    { name: 'FEAT_ID', type: 'C', len: 16, dec: 0 },
    { name: 'LAYER', type: 'C', len: 20, dec: 0 },
    { name: 'CLASS', type: 'C', len: 24, dec: 0 },
    { name: 'CONF', type: 'N', len: 6, dec: 2 },
    { name: 'AREA', type: 'N', len: 12, dec: 2 },
    { name: 'LENGTH', type: 'N', len: 12, dec: 2 },
  ];

  const recordLength = 1 + fields.reduce((sum, f) => sum + f.len, 0); // 1 byte deletion flag + fields = 91 bytes
  const headerLength = 32 + fields.length * 32 + 1; // 32 + 6*32 + 1 = 225 bytes
  const totalLength = headerLength + features.length * recordLength + 1; // + 1 for EOF 0x1A

  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);
  const uint8 = new Uint8Array(buffer);

  // DBF Header
  view.setUint8(0, 0x03); // dBASE III standard
  const now = new Date();
  view.setUint8(1, (now.getFullYear() - 1900) % 256); // Year
  view.setUint8(2, now.getMonth() + 1); // Month
  view.setUint8(3, now.getDate()); // Day
  view.setUint32(4, features.length, true); // Number of records (Little Endian)
  view.setUint16(8, headerLength, true); // Header length
  view.setUint16(10, recordLength, true); // Record length

  // Field descriptors (32 bytes each)
  let offset = 32;
  for (const f of fields) {
    for (let c = 0; c < 11; c++) {
      uint8[offset + c] = c < f.name.length ? f.name.charCodeAt(c) : 0;
    }
    uint8[offset + 11] = f.type.charCodeAt(0);
    uint8[offset + 16] = f.len;
    uint8[offset + 17] = f.dec;
    offset += 32;
  }
  uint8[offset++] = 0x0d; // Header terminator

  // Write Records
  for (const feat of features) {
    uint8[offset++] = 0x20; // 0x20 = Valid record (not deleted)

    const cleanAscii = (s: string) => (s || '').replace(/[^\x20-\x7E]/g, '_');

    const padString = (str: string, len: number) => {
      const s = cleanAscii(str).slice(0, len);
      return s.padEnd(len, ' ');
    };

    const padNumber = (num: number, len: number, dec: number) => {
      const val = (num || 0).toFixed(dec);
      if (val.length > len) {
        return val.slice(0, len);
      }
      return val.padStart(len, ' ');
    };

    const recValues = [
      padString(feat.id, 16),
      padString(feat.layer, 20),
      padString(feat.classification, 24),
      padNumber(feat.confidence, 6, 2),
      padNumber(feat.area || 0, 12, 2),
      padNumber(feat.length || 0, 12, 2),
    ];

    for (const val of recValues) {
      for (let i = 0; i < val.length; i++) {
        uint8[offset++] = val.charCodeAt(i) & 0x7f;
      }
    }
  }

  uint8[offset] = 0x1a; // EOF
  return buffer;
}
