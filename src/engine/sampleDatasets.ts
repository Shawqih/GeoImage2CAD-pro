/**
 * High-Fidelity Preloaded Benchmark Datasets
 * Synthesizes realistic aerial drone, satellite, CAD blueprint, and floorplan test images
 * directly in canvas, so users can test on-device CV & vectorization with zero delay.
 */

export interface SampleDataset {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  description: string;
  descriptionAr: string;
  dataUrl: string;
  width: number;
  height: number;
  suggestedScaleMetersPerPx: number;
}

export function generateSampleDatasets(): SampleDataset[] {
  return [
    createDroneUrbanSample(),
    createSatelliteHighwaySample(),
    createScannedBlueprintSample(),
    createArchitecturalFloorplanSample(),
  ];
}

/**
 * 1. Aerial Drone Urban Sector (1000 x 800)
 */
function createDroneUrbanSample(): SampleDataset {
  const w = 1000;
  const h = 800;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Ground base: Natural soil & light grass
  ctx.fillStyle = '#65784C';
  ctx.fillRect(0, 0, w, h);

  // Lawns & Parcels
  const parcels = [
    { x: 40, y: 40, w: 240, h: 320 },
    { x: 340, y: 40, w: 260, h: 320 },
    { x: 660, y: 40, w: 300, h: 320 },
    { x: 40, y: 440, w: 240, h: 320 },
    { x: 340, y: 440, w: 260, h: 320 },
    { x: 660, y: 440, w: 300, h: 320 },
  ];

  ctx.fillStyle = '#4D6B3C';
  parcels.forEach((p) => {
    ctx.fillRect(p.x, p.y, p.w, p.h);
  });

  // Main Asphalt Roads (Corridors)
  ctx.fillStyle = '#373D44';
  // Horizontal central avenue
  ctx.fillRect(0, 360, w, 70);
  // Vertical boulevards
  ctx.fillRect(280, 0, 60, h);
  ctx.fillRect(600, 0, 60, h);

  // Sidewalks
  ctx.fillStyle = '#8E9A9D';
  ctx.fillRect(0, 355, w, 5);
  ctx.fillRect(0, 430, w, 5);
  ctx.fillRect(275, 0, 5, h);
  ctx.fillRect(340, 0, 5, h);
  ctx.fillRect(595, 0, 5, h);
  ctx.fillRect(660, 0, 5, h);

  // Road Dash Markings
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.setLineDash([20, 15]);
  ctx.beginPath();
  ctx.moveTo(0, 395);
  ctx.lineTo(w, 395);
  ctx.moveTo(310, 0);
  ctx.lineTo(310, h);
  ctx.moveTo(630, 0);
  ctx.lineTo(630, h);
  ctx.stroke();
  ctx.setLineDash([]);

  // Buildings (Terracotta / Red tile roofs, Concrete flat roofs)
  // Building 1 (Villa with L-shape)
  ctx.fillStyle = '#B84A39';
  ctx.fillRect(60, 60, 160, 110);
  ctx.fillRect(60, 170, 90, 80);

  // Building 2 (Commercial Complex)
  ctx.fillStyle = '#D9D7CE';
  ctx.fillRect(360, 60, 200, 140);
  // Roof HVAC / details
  ctx.fillStyle = '#8B8C89';
  ctx.fillRect(390, 80, 40, 30);
  ctx.fillRect(470, 80, 50, 40);

  // Building 3 (Residential Block)
  ctx.fillStyle = '#A74232';
  ctx.fillRect(700, 80, 210, 180);

  // Building 4 (Southwest Residence)
  ctx.fillStyle = '#3E444B'; // Modern dark slate roof
  ctx.fillRect(70, 480, 180, 120);

  // Building 5 (Central Villa)
  ctx.fillStyle = '#C25943';
  ctx.fillRect(370, 490, 180, 150);

  // Building 6 (East Facility)
  ctx.fillStyle = '#E3E0D8';
  ctx.fillRect(690, 490, 230, 160);

  // Swimming Pool (Water Body)
  ctx.fillStyle = '#1D97BD';
  ctx.fillRect(100, 630, 80, 45);

  // Tree Canopies (Circular green clusters)
  const trees = [
    { x: 190, y: 280, r: 18 },
    { x: 230, y: 300, r: 22 },
    { x: 380, y: 250, r: 20 },
    { x: 440, y: 270, r: 24 },
    { x: 530, y: 240, r: 19 },
    { x: 740, y: 300, r: 26 },
    { x: 800, y: 280, r: 21 },
    { x: 860, y: 310, r: 23 },
    { x: 100, y: 720, r: 20 },
    { x: 200, y: 710, r: 25 },
    { x: 500, y: 700, r: 22 },
    { x: 560, y: 720, r: 28 },
    { x: 750, y: 710, r: 24 },
    { x: 840, y: 690, r: 21 },
  ];

  trees.forEach((t) => {
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fillStyle = '#265C2B';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(t.x - 2, t.y - 2, t.r * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = '#39783F';
    ctx.fill();
  });

  return {
    id: 'sample_drone_urban',
    name: 'Aerial Drone Urban Sector',
    nameAr: 'صورة جوية درون - قطاع حضري وسكني',
    category: 'AERIAL_DRONE',
    description: 'High-resolution drone orthoimage with roof tiles, asphalt road grid, trees, pool, and lots.',
    descriptionAr: 'صورة جوية تفصيلية عالية الدقة تحتوي على مباني سكنية، شبكة طرق إسفلتية، أشجار، ومسبح.',
    dataUrl: canvas.toDataURL('image/png'),
    width: w,
    height: h,
    suggestedScaleMetersPerPx: 0.05,
  };
}

/**
 * 2. Satellite Highway & Cadastral Interchange (1000 x 800)
 */
function createSatelliteHighwaySample(): SampleDataset {
  const w = 1000;
  const h = 800;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Base earth terrain
  ctx.fillStyle = '#5A684C';
  ctx.fillRect(0, 0, w, h);

  // Agricultural & Cadastral Parcels
  ctx.fillStyle = '#7A8C5E';
  ctx.fillRect(50, 50, 250, 200);
  ctx.fillStyle = '#8E774A';
  ctx.fillRect(320, 50, 280, 200);
  ctx.fillStyle = '#4A6B48';
  ctx.fillRect(620, 50, 320, 200);

  ctx.fillStyle = '#6E8552';
  ctx.fillRect(50, 520, 300, 230);
  ctx.fillStyle = '#546A42';
  ctx.fillRect(650, 520, 300, 230);

  // Water Canal / River
  ctx.fillStyle = '#1B658A';
  ctx.beginPath();
  ctx.moveTo(0, 700);
  ctx.bezierCurveTo(300, 680, 600, 740, 1000, 690);
  ctx.lineTo(1000, 770);
  ctx.bezierCurveTo(600, 820, 300, 760, 0, 780);
  ctx.closePath();
  ctx.fill();

  // Highway Overpass / Expressway
  ctx.fillStyle = '#2F363F';
  ctx.beginPath();
  ctx.moveTo(0, 350);
  ctx.bezierCurveTo(400, 330, 600, 420, 1000, 370);
  ctx.lineTo(1000, 450);
  ctx.bezierCurveTo(600, 500, 400, 410, 0, 430);
  ctx.closePath();
  ctx.fill();

  // Connecting interchange ramp
  ctx.beginPath();
  ctx.moveTo(250, 340);
  ctx.bezierCurveTo(320, 220, 480, 230, 500, 370);
  ctx.lineTo(540, 380);
  ctx.bezierCurveTo(520, 180, 280, 180, 210, 330);
  ctx.closePath();
  ctx.fill();

  // Road Centerlines
  ctx.strokeStyle = '#D9A74A';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 390);
  ctx.bezierCurveTo(400, 370, 600, 460, 1000, 410);
  ctx.stroke();

  // Industrial / Commercial Warehouses
  ctx.fillStyle = '#D4CEBF';
  ctx.fillRect(100, 100, 140, 90);
  ctx.fillRect(720, 90, 180, 110);
  ctx.fillRect(120, 560, 160, 120);
  ctx.fillRect(700, 560, 200, 130);

  return {
    id: 'sample_satellite_highway',
    name: 'Satellite Highway & Cadastral Interchange',
    nameAr: 'صورة قمر صناعي - طريق سريع وتقسيمات أراضي',
    category: 'SATELLITE',
    description: 'Regional satellite imagery featuring multi-lane expressway, river canal, parcels, and logistics parks.',
    descriptionAr: 'صورة قمر صناعي توضح مسارات الطرق السريعة ومجرى مائي وتقسيمات الأراضي الزراعية والمستودعات.',
    dataUrl: canvas.toDataURL('image/png'),
    width: w,
    height: h,
    suggestedScaleMetersPerPx: 0.5,
  };
}

/**
 * 3. Scanned Civil Engineering Blueprint (1000 x 800)
 */
function createScannedBlueprintSample(): SampleDataset {
  const w = 1000;
  const h = 800;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Classic Blueprint Deep Navy Blue Background
  ctx.fillStyle = '#102A45';
  ctx.fillRect(0, 0, w, h);

  // Blueprint subtle grid
  ctx.strokeStyle = '#18385A';
  ctx.lineWidth = 1;
  const grid = 40;
  for (let x = 0; x < w; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Crisp White CAD Vector Lines
  ctx.strokeStyle = '#E2EDF8';
  ctx.lineWidth = 3;

  // Outer Building Boundary
  ctx.strokeRect(100, 100, 800, 580);

  // Interior Structural Walls
  ctx.lineWidth = 3;
  ctx.beginPath();
  // Horizontal Main corridor
  ctx.moveTo(100, 360);
  ctx.lineTo(900, 360);
  ctx.moveTo(100, 440);
  ctx.lineTo(900, 440);
  // Room Divisions North
  ctx.moveTo(350, 100);
  ctx.lineTo(350, 360);
  ctx.moveTo(620, 100);
  ctx.lineTo(620, 360);
  // Room Divisions South
  ctx.moveTo(380, 440);
  ctx.lineTo(380, 680);
  ctx.moveTo(650, 440);
  ctx.lineTo(650, 680);
  ctx.stroke();

  // Circular Storage Tanks / Sump pits
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(220, 230, 45, 0, Math.PI * 2);
  ctx.arc(480, 230, 45, 0, Math.PI * 2);
  ctx.arc(760, 230, 45, 0, Math.PI * 2);
  ctx.stroke();

  // Centerline marks
  ctx.strokeStyle = '#6BA4D9';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([12, 4, 3, 4]);
  ctx.beginPath();
  ctx.moveTo(80, 400);
  ctx.lineTo(920, 400);
  ctx.moveTo(220, 80);
  ctx.lineTo(220, 380);
  ctx.stroke();
  ctx.setLineDash([]);

  // Title Box
  ctx.strokeStyle = '#E2EDF8';
  ctx.lineWidth = 2;
  ctx.strokeRect(620, 580, 260, 80);

  return {
    id: 'sample_scanned_blueprint',
    name: 'Scanned Engineering Blueprint',
    nameAr: 'مخطط هندسي أزرق (Blueprint Scan)',
    category: 'CAD_SCAN_BLUEPRINT',
    description: 'Scanned cyanotype civil engineering drawing with orthogonal walls, circular tanks, and corridors.',
    descriptionAr: 'مخطط أزرق هندسي يحتوي على جدران متعامدة وممرات وخزانات دائرية ومحاور.',
    dataUrl: canvas.toDataURL('image/png'),
    width: w,
    height: h,
    suggestedScaleMetersPerPx: 0.02,
  };
}

/**
 * 4. Architectural Floor Plan Scan (1000 x 800)
 */
function createArchitecturalFloorplanSample(): SampleDataset {
  const w = 1000;
  const h = 800;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Scanned paper off-white
  ctx.fillStyle = '#F5F5F0';
  ctx.fillRect(0, 0, w, h);

  // Black / Dark Charcoal Ink Lines
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 4;

  // Perimeter Walls
  ctx.strokeRect(120, 100, 760, 600);

  // Internal Partition Walls
  ctx.lineWidth = 3;
  ctx.beginPath();
  // Master Suite
  ctx.moveTo(120, 340);
  ctx.lineTo(440, 340);
  ctx.moveTo(440, 100);
  ctx.lineTo(440, 340);

  // Kitchen & Dining
  ctx.moveTo(560, 100);
  ctx.lineTo(560, 420);
  ctx.moveTo(560, 420);
  ctx.lineTo(880, 420);

  // Living Room / Patio
  ctx.moveTo(120, 520);
  ctx.lineTo(500, 520);
  ctx.moveTo(500, 520);
  ctx.lineTo(500, 700);

  ctx.stroke();

  // Columns (Filled black squares)
  ctx.fillStyle = '#1A1A1A';
  const cols = [
    { x: 120, y: 100 },
    { x: 440, y: 100 },
    { x: 560, y: 100 },
    { x: 880, y: 100 },
    { x: 120, y: 340 },
    { x: 440, y: 340 },
    { x: 560, y: 420 },
    { x: 880, y: 420 },
    { x: 120, y: 700 },
    { x: 500, y: 700 },
    { x: 880, y: 700 },
  ];
  cols.forEach((c) => {
    ctx.fillRect(c.x - 7, c.y - 7, 14, 14);
  });

  // Dimension extension lines
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 1;
  ctx.beginPath();
  // Top dimension
  ctx.moveTo(120, 70);
  ctx.lineTo(120, 90);
  ctx.moveTo(880, 70);
  ctx.lineTo(880, 90);
  ctx.moveTo(120, 80);
  ctx.lineTo(880, 80);
  ctx.stroke();

  return {
    id: 'sample_arch_floorplan',
    name: 'Architectural Floor Plan Scan',
    nameAr: 'مسح ضوئي لمخطط معماري (Floor Plan)',
    category: 'ARCHITECTURAL_DRAWING',
    description: 'Black and white architectural schematic with load-bearing walls, structural columns, and room layouts.',
    descriptionAr: 'مخطط معماري أبيض وأسود مع جدران حاملة وأعمدة إنشائية وتوزيع للغرف.',
    dataUrl: canvas.toDataURL('image/png'),
    width: w,
    height: h,
    suggestedScaleMetersPerPx: 0.025,
  };
}
