import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * Rules that keep components independent of each other. They are checked from the
 * files alone, so they run without a browser and fail before anything is built.
 */
const ROOT = 'components';
const KIND_FOLDERS = ['worlds', 'things', 'looks', 'directions'];
const ALLOWED_PACKAGES = [/^@conjure\/kit$/, /^@ateliers\//, /^three$/, /^three\/addons\//, /^p5$/];

const folders = readdirSync(ROOT).flatMap((kind) =>
  readdirSync(join(ROOT, kind))
    .filter((name) => statSync(join(ROOT, kind, name)).isDirectory())
    .map((name) => ({ kind, name, path: join(ROOT, kind, name) })),
);
const sources = (folder: string): string[] =>
  readdirSync(folder).flatMap((name) => {
    const path = join(folder, name);
    return statSync(path).isDirectory() ? sources(path) : /\.(ts|js|mjs)$/.test(name) ? [path] : [];
  });
const importsOf = (code: string) =>
  [...code.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g)].map((match) => match[1]);

test('components live only under worlds/, things/, looks/ and directions/', () => {
  assert.deepEqual(readdirSync(ROOT).filter((name) => !KIND_FOLDERS.includes(name)), []);
  assert.ok(folders.length > 0);
});

for (const { kind, name, path } of folders) {
  const id = `${kind}/${name}`;

  test(`${id}: folder name is lowercase words joined by hyphens`, () => {
    assert.match(name, /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/);
  });

  test(`${id}: has manifest.ts and build.ts`, () => {
    const files = readdirSync(path);
    assert.ok(files.includes('manifest.ts'), 'manifest.ts is missing');
    assert.ok(files.includes('build.ts'), 'build.ts is missing');
  });

  test(`${id}: manifest is data only and names the right kind`, () => {
    const manifest = readFileSync(join(path, 'manifest.ts'), 'utf8');
    assert.deepEqual(importsOf(manifest), ['@conjure/kit'], 'manifest.ts may import only @conjure/kit: it is loaded for every idea');
    assert.match(manifest, new RegExp(`kind:\\s*'${kind.slice(0, -1)}'`), `kind must be '${kind.slice(0, -1)}'`);
    assert.match(manifest, /export default defineManifest\(/);
  });

  test(`${id}: imports nothing from the engine or from another component`, () => {
    for (const file of sources(path))
      for (const specifier of importsOf(readFileSync(file, 'utf8'))) {
        if (specifier.startsWith('.')) {
          assert.ok(
            join(file, '..', specifier).startsWith(path),
            `${file} imports ${specifier}, which leaves its own folder`,
          );
        } else {
          assert.ok(
            ALLOWED_PACKAGES.some((allowed) => allowed.test(specifier)),
            `${file} imports ${specifier}; a component may import @conjure/kit, three, p5 and @ateliers/* only`,
          );
        }
      }
  });

  test(`${id}: draws its randomness from the build context`, () => {
    for (const file of sources(path))
      assert.doesNotMatch(readFileSync(file, 'utf8'), /Math\.random\s*\(/, `${file} calls Math.random(); use context.random() so a roll can be repeated`);
  });
}
