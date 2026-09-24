/** Reproducible, idempotent repairs for the 34 failures in the 2026-09-24 browser audit. */
import fs from 'node:fs';
import path from 'node:path';
const write = process.argv.includes('--write');
let count = 0;
function gameDir(number) {
  const prefix = `game-${String(number).padStart(3, '0')}-`;
  const category = number < 151 ? 'puzzle' : number === 263 ? 'arcade' : 'action';
  const dirs = fs.readdirSync(`src/games/${category}`).filter(slug => slug.startsWith(prefix)).map(slug => `src/games/${category}/${slug}`);
  if (dirs.length !== 1) throw new Error(`Ambiguous repair target: ${number}`);
  return dirs[0];
}
function replace(file, before, after) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`Repair precondition changed: ${file}: ${before}`);
  const result = source.replaceAll(before, after);
  count++;
  if (write) fs.writeFileSync(file, result);
}
const grids = [
  [8, 'private render()', 'grid'], [9, 'private render()', 'grid'], [11, 'private render()', 'grid'],
  [23, 'public draw()', 'grid'], [37, 'public draw()', 'grid'], [41, 'public draw()', 'grid'],
  [43, 'public draw()', 'grid'], [77, 'private draw()', 'dirt'], [78, 'private draw()', 'grid'],
  [87, 'private draw()', 'grid'], [95, 'private draw()', 'grid'], [126, 'draw()', 'cells'],
  [132, 'draw()', 'grid'], [136, 'private render()', 'buildGrid'], [138, 'private render()', 'grid'],
  [287, 'private draw()', 'map'], [289, 'private draw()', 'map'],
];
for (const [number, method, field] of grids) {
  const entry = `  ${method} {`;
  replace(path.join(gameDir(number), 'game.ts'), entry, `${entry}\n    // Resize can run before Start initializes the board.\n    if (this.${field}.length === 0) return;`);
}
for (let number = 64; number <= 76; number++) {
  const file = path.join(gameDir(number), 'main.ts');
  replace(file, 'renderer = new WebGPURenderer();', 'const candidate = new WebGPURenderer();');
  const canvas = number === 70 ? 'canvas' : 'webgpuCanvas';
  replace(file, `const success = await renderer.initialize(${canvas});`, `const success = await candidate.initialize(${canvas});\n  // Keep optional effects unavailable until GPU initialization actually succeeds.\n  renderer = success ? candidate : null;`);
}
replace(path.join(gameDir(30), 'main.ts'), 'const words = i18n.t("words") as any as string[];', 'const words = translations[i18n.getLocale() as keyof typeof translations]?.words ?? translations.en.words;');
replace(path.join(gameDir(263), 'game.ts'), '    const shadowPos = this.shadow.positions[shadowIndex];\n    const distToShadow', '    const shadowPos = this.shadow.positions[shadowIndex];\n    // The idle preview has no movement history yet.\n    if (!shadowPos) return;\n    const distToShadow');
replace(path.join(gameDir(355), 'game.ts'), 'const size = 1 + Math.sin(Date.now() * 0.003 + i) * 1.5;', 'const size = Math.max(0, 1 + Math.sin(Date.now() * 0.003 + i) * 1.5);');
replace(path.join(gameDir(97), 'styles.css'), '.game-area {\n  position: relative;\n  width: 100%;\n  z-index: 1;\n}', '.game-area {\n  position: relative;\n  width: 100%;\n  /* Reserve space while the board is empty so controls cannot cover Start. */\n  min-height: 320px;\n  z-index: 2;\n}');
for (const number of [79, 98]) replace(path.join(gameDir(number), 'index.html'), '><</button>', '>&lt;</button>');
console.log(`${count} startup repairs ${write ? 'applied' : 'needed'}.`);
if (!write && count) process.exitCode = 1;
