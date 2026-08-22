import fs from 'node:fs';

const rawReport = JSON.parse(fs.readFileSync('scripts/fighter_proportions_report.json', 'utf-8'));
const animDetails = JSON.parse(fs.readFileSync('scripts/fighter_animation_details.json', 'utf-8'));

console.log('# TABELA COMPLETA DE MEDIÇÕES DOS 34 LUTADORES (CANVAS 576x576)\n');

console.log('| Slug | Tipo | Idle 01 (H x W) | Idle 02 (H x W) | Walk 01 | Walk 02 | Attack | Hurt | Victory | Lying | Média Idle H | Escala Proposta (Target: 420px) |');
console.log('| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |');

for (const item of rawReport) {
  const f = item.frames;
  const isReserve = item.isReserve;
  const slug = item.slug;
  const i1 = f['idle_01'] ? `${f['idle_01'].contentH}x${f['idle_01'].contentW}` : 'N/A';
  const i2 = f['idle_02'] ? `${f['idle_02'].contentH}x${f['idle_02'].contentW}` : 'N/A';
  const w1 = f['walk_01'] ? `${f['walk_01'].contentH}x${f['walk_01'].contentW}` : 'N/A';
  const w2 = f['walk_02'] ? `${f['walk_02'].contentH}x${f['walk_02'].contentW}` : 'N/A';
  const atk = f['attack'] ? `${f['attack'].contentH}x${f['attack'].contentW}` : 'N/A';
  const hrt = f['hurt'] ? `${f['hurt'].contentH}x${f['hurt'].contentW}` : 'N/A';
  const vic = f['victory'] ? `${f['victory'].contentH}x${f['victory'].contentW}` : 'N/A';
  const lyg = f['lying'] ? `${f['lying'].contentH}x${f['lying'].contentW}` : 'N/A';

  const avgH = item.metrics.avgIdleH;
  // Target: 420 for adults, 0.85 * 420 = 357 for children
  const target = isReserve ? (420 * 0.85) : 420;
  const scaleFactor = (target / avgH).toFixed(3);

  console.log(`| **${slug}** | ${isReserve ? 'Reserva (Criança)' : 'Oficial (Adulto)'} | ${i1} | ${i2} | ${w1} | ${w2} | ${atk} | ${hrt} | ${vic} | ${lyg} | **${avgH}px** | **${scaleFactor}** |`);
}
