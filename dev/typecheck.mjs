// Typecheck the project. The six things that wrap builders from the Three.js ateliers repository
// only typecheck against its source: when it is not linked in (./ateliers or CONJURE_ATELIERS_DIR),
// every component whose manifest requires it is left out, as the catalogue leaves it out at runtime.
//   npm run typecheck
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const linked = existsSync(resolve('ateliers')) || existsSync(resolve(process.env.CONJURE_ATELIERS_DIR ?? 'ateliers'));
let project = 'tsconfig.json';
if (!linked) {
  const excluded = [];
  for (const kind of readdirSync('components')) {
    for (const name of readdirSync(`components/${kind}`)) {
      const folder = `components/${kind}/${name}`;
      if (!statSync(folder).isDirectory()) continue;
      const manifest = readFileSync(`${folder}/manifest.ts`, 'utf8');
      if (/requires:\s*\[[^\]]*'ateliers'/.test(manifest)) excluded.push(`../${folder}`);
    }
  }
  mkdirSync('.data', { recursive: true });
  project = '.data/tsconfig.without-ateliers.json';
  writeFileSync(project, `${JSON.stringify({ extends: '../tsconfig.json', exclude: ['../node_modules', ...excluded] }, null, 2)}\n`);
  console.log(`The ateliers repository is not linked: ${excluded.length} components that require it are left out of the typecheck.`);
}
const tsc = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['tsc', '--noEmit', '-p', project], { stdio: 'inherit' });
process.exit(tsc.status ?? 1);
