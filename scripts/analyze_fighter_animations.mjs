import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('../Copa_Esperanca_Fighter_Generator_Seed_v1/tools/fighter-generator/node_modules/sharp');

const rawReport = JSON.parse(fs.readFileSync('scripts/fighter_proportions_report.json', 'utf-8'));

async function analyzeAllFramesInDetail() {
  const basePath = path.resolve('app/public/assets/participants');
  const details = [];

  for (const item of rawReport) {
    const slug = item.slug;
    const pDir = path.join(basePath, slug, 'fighter');

    const frames = item.frames;
    const idle1 = frames['idle_01'];
    const idle2 = frames['idle_02'];
    const walk1 = frames['walk_01'];
    const walk2 = frames['walk_02'];
    const attack = frames['attack'];
    const hurt = frames['hurt'];
    const victory = frames['victory'];
    const lying = frames['lying'];

    // Analyze transitions
    // 1. Idle breathing
    const idleGroundDelta = idle1 && idle2 ? (idle2.maxY - idle1.maxY) : 0;
    const idleHeightDelta = idle1 && idle2 ? (idle2.contentH - idle1.contentH) : 0;
    const idleWidthDelta = idle1 && idle2 ? (idle2.contentW - idle1.contentW) : 0;
    const idleCenterDelta = idle1 && idle2 ? (idle2.centerX - idle1.centerX) : 0;
    const idlePixelDeltaRatio = idle1 && idle2 ? (idle2.opaquePixels / idle1.opaquePixels) : 1;

    // 2. Walk step
    const walkGroundDelta = walk1 && walk2 ? (walk2.maxY - walk1.maxY) : 0;
    const walkHeightDelta = walk1 && walk2 ? (walk2.contentH - walk1.contentH) : 0;
    const walkWidthDelta = walk1 && walk2 ? (walk2.contentW - walk1.contentW) : 0;
    const walkCenterDelta = walk1 && walk2 ? (walk2.centerX - walk1.centerX) : 0;

    // 3. Attack extension
    const attackReach = attack && idle1 ? (attack.contentW - idle1.contentW) : 0;
    const attackGroundDelta = attack && idle1 ? (attack.maxY - idle1.maxY) : 0;

    // 4. Hurt reaction
    const hurtGroundDelta = hurt && idle1 ? (hurt.maxY - idle1.maxY) : 0;
    const hurtHeightDelta = hurt && idle1 ? (hurt.contentH - idle1.contentH) : 0;

    // 5. Victory pose
    const victoryHeightDelta = victory && idle1 ? (victory.contentH - idle1.contentH) : 0;
    const victoryGroundDelta = victory && idle1 ? (victory.maxY - idle1.maxY) : 0;

    // 6. Lying ground alignment
    const lyingGroundOffset = lying ? lying.bottomOffset : 0;
    const lyingAspect = lying ? (lying.contentW / lying.contentH) : 0;

    // Classification / flags
    const issues = [];
    if (Math.abs(idleGroundDelta) >= 3) issues.push(`Idle foot drift: ${idleGroundDelta}px`);
    if (Math.abs(idleHeightDelta) >= 15) issues.push(`Idle height jump: ${idleHeightDelta}px`);
    if (Math.abs(idleCenterDelta) >= 10) issues.push(`Idle horizontal jitter: ${idleCenterDelta.toFixed(1)}px`);
    if (idlePixelDeltaRatio < 0.85 || idlePixelDeltaRatio > 1.15) issues.push(`Idle mass variation: ${Math.round(idlePixelDeltaRatio * 100)}%`);

    if (Math.abs(walkGroundDelta) >= 8) issues.push(`Walk foot drift: ${walkGroundDelta}px`);
    if (Math.abs(walkHeightDelta) >= 25) issues.push(`Walk height jump: ${walkHeightDelta}px`);

    if (Math.abs(hurtGroundDelta) >= 10) issues.push(`Hurt foot drift: ${hurtGroundDelta}px`);
    if (lying && lyingGroundOffset > 20) issues.push(`Lying floating above floor: ${lyingGroundOffset}px`);

    details.push({
      slug,
      isReserve: item.isReserve,
      idle1H: idle1?.contentH,
      idle2H: idle2?.contentH,
      walk1H: walk1?.contentH,
      walk2H: walk2?.contentH,
      attackH: attack?.contentH,
      hurtH: hurt?.contentH,
      victoryH: victory?.contentH,
      lyingH: lying?.contentH,
      lyingW: lying?.contentW,
      lyingAspect: lyingAspect.toFixed(2),
      idleGroundDelta,
      idleHeightDelta,
      idleCenterDelta: Number(idleCenterDelta.toFixed(1)),
      idlePixelDeltaRatio: Number(idlePixelDeltaRatio.toFixed(3)),
      walkGroundDelta,
      walkHeightDelta,
      walkCenterDelta: Number(walkCenterDelta.toFixed(1)),
      attackReach,
      attackGroundDelta,
      hurtGroundDelta,
      hurtHeightDelta,
      victoryHeightDelta,
      victoryGroundDelta,
      lyingGroundOffset,
      issues
    });
  }

  fs.writeFileSync('scripts/fighter_animation_details.json', JSON.stringify(details, null, 2), 'utf-8');

  console.log('=== DETECÇÃO DE ANOMALIAS DE ANIMAÇÃO E GROUNDING ===');
  for (const d of details) {
    if (d.issues.length > 0) {
      console.log(`[!] ${d.slug.toUpperCase()} (${d.isReserve ? 'RESERVA' : 'OFICIAL'}):`);
      for (const iss of d.issues) {
        console.log(`    - ${iss}`);
      }
    } else {
      console.log(`[OK] ${d.slug.toUpperCase()}: transições e grounding estáveis`);
    }
  }
}

analyzeAllFramesInDetail().catch(console.error);
