import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('../Copa_Esperanca_Fighter_Generator_Seed_v1/tools/fighter-generator/node_modules/sharp');

const PARTICIPANTS = [
  // 32 Official
  'adriel', 'alexandre', 'ana', 'caio', 'daniel', 'david', 'dinarte', 'erikson',
  'evellyn', 'fabio', 'fatinha', 'fernando', 'izaias', 'jailson', 'joao', 'joemerson',
  'lailson', 'leandro', 'leonardo', 'livia', 'manasses', 'marconi', 'monalisa', 'neto',
  'radja', 'rhussiana', 'ricardo', 'ryan', 'samara', 'tiago', 'wendson', 'wesley',
  // 2 Reserves
  'hiago', 'kelvin'
];

const FRAMES = ['idle_01', 'idle_02', 'walk_01', 'walk_02', 'attack', 'hurt', 'victory', 'lying'];

async function analyzeFrame(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const image = sharp(filePath);
  const metadata = await image.metadata();
  const { width, height } = metadata;
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  let minX = width, maxX = -1, minY = height, maxY = -1;
  let opaquePixels = 0;

  const channels = info.channels;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const alpha = channels === 4 ? data[idx + 3] : 255;
      if (alpha > 15) { // filter faint compression artifacts
        opaquePixels++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX === -1) {
    return { width, height, empty: true };
  }

  const contentW = maxX - minX + 1;
  const contentH = maxY - minY + 1;
  const centerX = (minX + maxX) / 2;
  const bottomOffset = height - 1 - maxY;

  return {
    width,
    height,
    minX,
    maxX,
    minY,
    maxY,
    contentW,
    contentH,
    centerX,
    bottomOffset,
    opaquePixels
  };
}

async function runAudit() {
  const basePath = path.resolve('app/public/assets/participants');
  const results = [];

  for (const p of PARTICIPANTS) {
    const pDir = path.join(basePath, p, 'fighter');
    const pData = { slug: p, isReserve: (p === 'hiago' || p === 'kelvin'), frames: {} };

    for (const f of FRAMES) {
      const fPath = path.join(pDir, `${f}.png`);
      const analysis = await analyzeFrame(fPath);
      pData.frames[f] = analysis;
    }

    // Compute key metrics
    const idle1 = pData.frames['idle_01'];
    const idle2 = pData.frames['idle_02'];
    const walk1 = pData.frames['walk_01'];
    const walk2 = pData.frames['walk_02'];

    const idleHeights = [idle1?.contentH, idle2?.contentH].filter(Boolean);
    const avgIdleH = idleHeights.length ? (idleHeights.reduce((a, b) => a + b, 0) / idleHeights.length) : 0;
    const maxIdleH = idleHeights.length ? Math.max(...idleHeights) : 0;

    // Grounding drift
    const idleGroundDrift = (idle1 && idle2) ? Math.abs(idle1.maxY - idle2.maxY) : 0;
    const idleHeightDiff = (idle1 && idle2) ? Math.abs(idle1.contentH - idle2.contentH) : 0;
    const idleCenterDrift = (idle1 && idle2) ? Math.abs(idle1.centerX - idle2.centerX) : 0;

    const walkGroundDrift = (walk1 && walk2) ? Math.abs(walk1.maxY - walk2.maxY) : 0;
    const walkHeightDiff = (walk1 && walk2) ? Math.abs(walk1.contentH - walk2.contentH) : 0;

    pData.metrics = {
      idle1H: idle1?.contentH ?? 0,
      idle2H: idle2?.contentH ?? 0,
      walk1H: walk1?.contentH ?? 0,
      walk2H: walk2?.contentH ?? 0,
      attackH: pData.frames['attack']?.contentH ?? 0,
      hurtH: pData.frames['hurt']?.contentH ?? 0,
      victoryH: pData.frames['victory']?.contentH ?? 0,
      lyingH: pData.frames['lying']?.contentH ?? 0,
      avgIdleH: Math.round(avgIdleH),
      maxIdleH,
      idleGroundDrift,
      idleHeightDiff,
      idleCenterDrift: Math.round(idleCenterDrift * 10) / 10,
      walkGroundDrift,
      walkHeightDiff,
      idle1Bottom: idle1?.bottomOffset ?? 0,
      idle2Bottom: idle2?.bottomOffset ?? 0,
      idle1Center: idle1 ? Math.round((idle1.centerX - 288) * 10) / 10 : 0
    };

    results.push(pData);
  }

  // Write full JSON report
  fs.writeFileSync('scripts/fighter_proportions_report.json', JSON.stringify(results, null, 2), 'utf-8');

  // Print summary tables
  console.log('=== AUDITORIA DE PROPORÇÃO E ALTURA DOS 34 LUTADORES ===\n');
  console.log('Slug'.padEnd(12) + 'Tipo'.padEnd(10) + 'Idle1 H'.padEnd(10) + 'Idle2 H'.padEnd(10) + 'Walk1 H'.padEnd(10) + 'AvgIdleH'.padEnd(10) + 'Drift Gnd'.padEnd(12) + 'Drift H'.padEnd(10) + 'Idle1 BaseY');
  console.log('-'.repeat(94));

  for (const r of results) {
    const m = r.metrics;
    const tipo = r.isReserve ? 'RESERVA' : 'OFICIAL';
    console.log(
      r.slug.padEnd(12) +
      tipo.padEnd(10) +
      (m.idle1H + 'px').padEnd(10) +
      (m.idle2H + 'px').padEnd(10) +
      (m.walk1H + 'px').padEnd(10) +
      (m.avgIdleH + 'px').padEnd(10) +
      (m.idleGroundDrift + 'px').padEnd(12) +
      (m.idleHeightDiff + 'px').padEnd(10) +
      `bottom-${m.idle1Bottom}px`
    );
  }

  // Statistical distribution
  const adults = results.filter(r => !r.isReserve);
  const adultHeights = adults.map(r => r.metrics.avgIdleH);
  const minH = Math.min(...adultHeights);
  const maxH = Math.max(...adultHeights);
  const avgH = Math.round(adultHeights.reduce((a, b) => a + b, 0) / adultHeights.length);
  const sortedHeights = [...adultHeights].sort((a, b) => a - b);
  const medianH = sortedHeights[Math.floor(sortedHeights.length / 2)];

  console.log('\n=== ESTATÍSTICAS DOS ADULTOS (32 OFICIAIS) ===');
  console.log(`Mínima Altura: ${minH}px (${adults.find(a => a.metrics.avgIdleH === minH)?.slug})`);
  console.log(`Máxima Altura: ${maxH}px (${adults.find(a => a.metrics.avgIdleH === maxH)?.slug})`);
  console.log(`Média Altura: ${avgH}px`);
  console.log(`Mediana Altura: ${medianH}px`);
  console.log(`Variação Total: ${maxH - minH}px (${Math.round((maxH - minH) / minH * 100)}% de amplitude)`);

  console.log('\n=== CRIANÇAS / RESERVAS (2) ===');
  for (const c of results.filter(r => r.isReserve)) {
    console.log(`${c.slug}: idle1=${c.metrics.idle1H}px, avgIdle=${c.metrics.avgIdleH}px (proporção vs média adulta ${avgH}px: ${(c.metrics.avgIdleH / avgH).toFixed(2)})`);
  }
}

runAudit().catch(console.error);
