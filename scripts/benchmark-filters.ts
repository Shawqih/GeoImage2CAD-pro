import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { applyBilateralFilter, applySauvolaThreshold } from '../src/engine/advancedCVFilters';

const width = 48;
const height = 32;
const fixture = new Uint8ClampedArray(width * height * 4);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const stripe = x >= 13 && x <= 20 && y >= 5 && y <= 26;
    const checker = ((x + y) % 5) * 11;
    const value = stripe ? 235 : 35 + ((x * 7 + y * 3 + checker) % 40);
    fixture[i] = value;
    fixture[i + 1] = Math.min(255, value + 8);
    fixture[i + 2] = Math.max(0, value - 5);
    fixture[i + 3] = 255;
  }
}

const gray = new Uint8Array(width * height);
for (let i = 0; i < gray.length; i++) {
  const p = i * 4;
  gray[i] = Math.round(0.299 * fixture[p] + 0.587 * fixture[p + 1] + 0.114 * fixture[p + 2]);
}

const start = performance.now();
const bilateral = applyBilateralFilter(fixture, width, height, 2, 25);
const sauvola = applySauvolaThreshold(gray, width, height, 6, 0.2, 128);
const elapsedMs = Number((performance.now() - start).toFixed(3));

const checksum = (data: ArrayLike<number>) => {
  let hash = 2166136261;
  for (let i = 0; i < data.length; i++) {
    hash ^= data[i];
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const deterministicResult = {
  fixture: 'synthetic-roof-stripe-v1',
  width,
  height,
  bilateral: {
    checksum: checksum(bilateral),
    alphaChecksum: checksum(new Uint8Array(bilateral.filter((_, i) => i % 4 === 3))),
  },
  sauvola: {
    checksum: checksum(sauvola),
    foregroundPixels: sauvola.reduce((sum, value) => sum + (value === 1 ? 1 : 0), 0),
  },
};

const goldenPath = 'fixtures/filters/reference-golden.json';
await mkdir('fixtures/filters', { recursive: true });
let previous: typeof deterministicResult | null = null;
try {
  previous = JSON.parse(await readFile(goldenPath, 'utf8'));
} catch {
  // First run creates the baseline.
}
await writeFile(goldenPath, `${JSON.stringify(deterministicResult, null, 2)}\n`);
console.log(JSON.stringify({
  result: { ...deterministicResult, typescriptBaselineElapsedMs: elapsedMs },
  previous,
  baselineChanged: Boolean(previous && JSON.stringify(previous) !== JSON.stringify(deterministicResult)),
}, null, 2));
