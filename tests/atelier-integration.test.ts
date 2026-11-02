import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve('public/atelier');
const load = (path: string) => import(pathToFileURL(resolve(path)).href);
const { styles } = await load('public/atelier/styles.js') as { styles: Array<{ id: string; name: string; draw: unknown }> };
const { parseArgs } = await load('dev/atelier-check.mjs') as { parseArgs: (args: string[]) => { scenes: string[]; only: string[] | null; images: string[]; lifecycle: boolean; geometry: boolean; timeout: number } };

test('Atelier dispatch preserves every authoritative study identity and its real drawing function', () => {
  assert.equal(styles.length, 84);
  assert.equal(new Set(styles.map((style) => style.id)).size, 84);
  for (const style of styles) {
    assert.match(style.id, /^[a-z0-9-]+$/);
    assert.ok(style.name.trim());
    assert.equal(typeof style.draw, 'function', `${style.id} has no drawing mechanism`);
  }
  for (const id of ['sections', 'voxels', 'surface-dots', 'continuous-thread', 'quilled-paper', 'thickness-exposure', 'section-ribs', 'chromatic-shadows', 'single-cutaway', 'interior-lattice', 'wholetoning', 'directional-color']) {
    assert.ok(styles.some((style) => style.id === id), `${id} lost its source recipe identity`);
  }
});

test('Atelier browser and worker dependency graph has no missing runtime files', () => {
  const seen = new Set<string>();
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    assert.ok(existsSync(file), `Missing Atelier runtime dependency ${file}`);
    const text = readFileSync(file, 'utf8');
    const imports = [...text.matchAll(/(?:from\s*|import\s*\(\s*|new URL\(\s*)['"](\.\.?\/[^'"]+)['"]/g)].map((match) => match[1]);
    for (const name of imports) {
      const target = resolve(dirname(file), name.split('?')[0]);
      assert.ok(target.startsWith(`${root}/`), `Runtime dependency escapes vendored root: ${name}`);
      visit(target);
    }
  };
  for (const entry of ['styles.js', 'mixer.js', 'contact-worker.js', 'image-finisher.js']) visit(resolve(root, entry));
  assert.ok(seen.size > 50, 'Expected to follow the actual shader/study/worker graph');
});

test('Atelier integration runner defaults to three scene scales and rejects mistyped subsets', () => {
  const defaults = parseArgs([]);
  assert.deepEqual(defaults.scenes, ['tabletop', 'room', 'street']);
  assert.equal(defaults.only, null);
  assert.deepEqual(defaults.images, []);
  assert.ok(defaults.lifecycle && defaults.geometry);
  const pilot = parseArgs(['--scenes', 'room', '--only', 'section-ribs,voxels', '--skip-lifecycle', '--timeout-ms', '180000']);
  assert.deepEqual(pilot.only, ['section-ribs', 'voxels']);
  assert.equal(pilot.lifecycle, false);
  assert.equal(pilot.timeout, 180000);
  for (const args of [['--scenes', 'rom'], ['--only'], ['--timeout-ms', 'NaN'], ['--scenes', 'room,room'], ['--unknown']]) {
    assert.throws(() => parseArgs(args));
  }
});

test('Atelier PNG exports select rendered studies and reject unsafe or impossible requests', () => {
  const full = parseArgs(['--scenes', 'street,perspective', '--images', 'section-ribs,chromatic-shadows']);
  assert.deepEqual(full.images, ['section-ribs', 'chromatic-shadows']);
  assert.equal(full.only, null);
  const subset = parseArgs(['--only', 'section-ribs,voxels', '--images', 'voxels']);
  assert.deepEqual(subset.images, ['voxels']);
  for (const args of [
    ['--images'], ['--images', '../escape'], ['--images', 'riso,'], ['--images', 'riso,riso'],
    ['--materials-only', '--images', 'riso'], ['--only', 'riso', '--images', 'woodcut'],
  ]) assert.throws(() => parseArgs(args));
});
