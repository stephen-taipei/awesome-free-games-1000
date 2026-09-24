import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const numbers = [8, 9, 11, 23, 37, 41, 43, 77, 78, 87, 95, 126, 132, 136, 138, 263, 287, 289, 355];
function dir(number) {
  const category = number < 151 ? 'puzzle' : number === 263 ? 'arcade' : 'action';
  return `src/games/${category}/` + fs.readdirSync(`src/games/${category}`).find(slug => slug.startsWith(`game-${String(number).padStart(3, '0')}-`));
}
const transpile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const load = source => import('data:text/javascript;base64,' + Buffer.from(transpile(source)).toString('base64'));
function canvas() {
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({ arc(x, y, radius) { assert.ok(Number.isFinite(radius) && radius >= 0, `Invalid arc radius: ${radius}`); } }, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return () => ({ width: 50 });
      if (/^create.*Gradient$/.test(String(prop))) return () => gradient;
      return () => {};
    },
  });
  return { width: 400, height: 400, style: {}, parentElement: { clientWidth: 400, clientHeight: 400, getBoundingClientRect: () => ({ width: 400, height: 400 }) }, getContext: () => ctx, addEventListener() {}, getBoundingClientRect: () => ({ width: 400, height: 400, left: 0, top: 0 }) };
}
for (const number of numbers) {
  test(`game ${number}: constructor and resize are safe before Start`, async () => {
    const source = fs.readFileSync(`${dir(number)}/game.ts`, 'utf8');
    const name = source.match(/export class (\w+)/)[1];
    const module = await load(source);
    globalThis.window = { addEventListener() {}, devicePixelRatio: 1, innerWidth: 400, innerHeight: 400 };
    globalThis.localStorage = { getItem: () => null, setItem() {} };
    globalThis.requestAnimationFrame = () => 1;
    try {
      const game = new module[name](canvas());
      game.resize?.();
      // A fixed clock drives Oracle Warrior sparkles through negative sine phases.
      if (number === 355) { const now = Date.now; try { Date.now = () => 0; game.draw(); } finally { Date.now = now; } }
    } finally { delete globalThis.window; delete globalThis.localStorage; delete globalThis.requestAnimationFrame; }
  });
}
for (let number = 64; number <= 76; number++) {
  test(`game ${number}: optional GPU renderer is published only on successful initialization`, async () => {
    const source = fs.readFileSync(`${dir(number)}/main.ts`, 'utf8');
    const ast = ts.createSourceFile('main.ts', source, ts.ScriptTarget.Latest, true);
    const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'initWebGPU');
    assert.ok(fn, 'Expected an explicit GPU initialization function');
    const isolated = transpile(`let renderer = null; let animationId = 0; const webgpuCanvas = document.createElement('canvas'); ${fn.getText(ast)}\nreturn { run: initWebGPU, renderer: () => renderer };`);
    for (const success of [false, true]) {
      let resolve;
      const pending = new Promise(done => { resolve = done; });
      const document = { createElement: () => ({ style: {}, width: 400, height: 400 }), getElementById: () => ({ width: 400, height: 400 }), querySelector: () => ({ insertBefore() {} }) };
      class Renderer { initialize() { return pending; } render() {} }
      const subject = new Function('WebGPURenderer', 'document', 'requestAnimationFrame', isolated)(Renderer, document, () => 1);
      const ready = subject.run();
      assert.equal(subject.renderer(), null, 'Effects must remain unavailable while adapter selection is pending');
      resolve(success); await ready;
      assert.equal(subject.renderer() instanceof Renderer, success);
    }
  });
}
test('Word Search starts with the typed locale word array rather than string translation keys', async () => {
  const { translations } = await load(fs.readFileSync(`${dir(30)}/i18n.ts`, 'utf8'));
  const { WordSearchGame } = await load(fs.readFileSync(`${dir(30)}/game.ts`, 'utf8'));
  const source = fs.readFileSync(`${dir(30)}/main.ts`, 'utf8');
  assert.equal(source.includes('i18n.t("words")'), false);
  for (const locale of ['en', 'zh-TW', 'ja', 'unsupported']) {
    const game = new WordSearchGame();
    const words = translations[locale]?.words ?? translations.en.words;
    game.start(words);
    assert.equal(game.words.length, words.length);
    assert.equal(game.grid.length, 10);
  }
});
