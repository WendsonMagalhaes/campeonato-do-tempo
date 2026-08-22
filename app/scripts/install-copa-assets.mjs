#!/usr/bin/env node
/**
 * Optional MERGE of an external folder INTO app/public/assets (runtime SoT).
 *
 * Runtime authority is ALWAYS app/public/assets — this never deletes the tree.
 * Use when importing leftovers from an archive ZIP into public.
 *
 * Usage (from app/):
 *   node scripts/install-copa-assets.mjs --source ../some-archive/assets
 *   node scripts/install-copa-assets.mjs --source ../some-archive --target public/assets
 *
 * Without --source: prints policy and exits 0 (public is already SoT).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const target = path.resolve(appRoot, arg('--target', 'public/assets'));
const explicitSource = arg('--source', null);

function copyDirMerge(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDirMerge(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (!explicitSource) {
  console.log('Runtime SoT: app/public/assets (Vite /assets/...).');
  console.log('Nothing to install. To merge an archive into public:');
  console.log('  node scripts/install-copa-assets.mjs --source <folder-with-assets>');
  console.log('See docs/ASSET_INTAKE.md');
  process.exit(0);
}

const sourceRoot = path.resolve(appRoot, explicitSource);
const candidates = [];
const direct = path.join(sourceRoot, 'assets');
if (fs.existsSync(direct)) candidates.push(direct);
else if (fs.existsSync(sourceRoot)) candidates.push(sourceRoot);

const runtime = path.join(sourceRoot, 'runtime-assets');
if (fs.existsSync(runtime)) candidates.push({ from: runtime, into: path.join(target, 'runtime') });

if (!candidates.length) {
  console.error(`No assets found under ${sourceRoot}`);
  process.exit(1);
}

fs.mkdirSync(target, { recursive: true });
for (const c of candidates) {
  if (typeof c === 'string') {
    console.log(`Merging ${c} → ${target}`);
    copyDirMerge(c, target);
  } else {
    console.log(`Merging ${c.from} → ${c.into}`);
    copyDirMerge(c.from, c.into);
  }
}

console.log('DONE. Runtime SoT remains app/public/assets.');
