#!/usr/bin/env node
/**
 * Verify required runtime assets.
 *
 * SoT: app/public/assets (Vite default publicDir)
 *
 * Usage (from app/):
 *   node scripts/verify-copa-assets.mjs
 *   node scripts/verify-copa-assets.mjs public/assets
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');

const required = [
  'ui/portrait_frame_base.png',
  'ui/vs_emblem.png',
  'brand/esperanca_distribuidora_logo.png',
  // Bitmap font v4 — one transparent PNG per glyph (no atlases).
  'fonts/glyphs/small/u0041.png',
  'fonts/glyphs/medium/u0041.png',
  'fonts/glyphs/large/u0041.png',
  'backgrounds/opening_street_bg.png',
  'backgrounds/battle_dock_coldroom_bg.png',
  'backgrounds/bracket_city_plaza_bg.png',
  'screens/team_formation_variant_03.png',
  'runtime/fighters/male_blue/idle_01.png',
  'runtime/fighters/male_red/idle_01.png',
  'runtime/fighters/female_blue/idle_01.png',
  'runtime/fighters/female_red/idle_01.png',
  'ui/selection_cursor_frame_sheet.png',
  'runtime/cursors/p1/idle_01.png',
  'runtime/cursors/p1/selected_04.png',
  'runtime/cursors/p2/idle_01.png',
  'runtime/cursors/p2/selected_04.png',
  'runtime/fx/impact_heavy.png',
  'audio/ui/selection_lock.wav',
  'audio/music/battle_main.mp3',
];

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const publicRoot = path.resolve(appRoot, args[0] ?? 'public/assets');

console.log(`[runtime check] ${publicRoot}`);

let bad = false;
for (const f of required) {
  const ok = fs.existsSync(path.join(publicRoot, f));
  console.log(`${ok ? 'OK  ' : 'MISS'} ${f}`);
  if (!ok) bad = true;
}

if (bad) {
  console.error('\nMissing assets. Place files under app/public/assets/.');
  process.exitCode = 1;
} else {
  console.log('\nPASS — required runtime assets present.');
}

