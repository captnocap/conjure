// Bring the forge (the swarm's staging copy) level with the studio's contract and engine.
// Run only between waves: no `dev/forge.mjs check` processes and a quiet load average.
//   node dev/forge-sync.mjs            # copy kit/ and engine/ (never deleting), patch its check page, typecheck it
//   node dev/forge-sync.mjs --dry      # show what would be copied
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const studio = resolve('.');
const forge = resolve(process.env.CONJURE_FORGE_DIR ?? '../conjure-forge');
const dry = process.argv.includes('--dry');
if (!existsSync(`${forge}/forge`)) throw new Error(`${forge} is not the forge: its gate script is missing.`);

// Count real gate checks, not shells whose command line merely mentions them.
const processes = spawnSync('ps', ['-eo', 'args'], { encoding: 'utf8' }).stdout.split('\n');
const checks = processes.filter((line) => /(^|\/)node .*dev\/forge\.mjs check/.test(line) && !/bash|forge-sync/.test(line));
if (checks.length) throw new Error(`A wave is running (${checks.length} checks in flight). Sync between waves, never during one.`);
const load = Number(readFileSync('/proc/loadavg', 'utf8').split(' ')[0]);
if (load > 12) throw new Error(`The load average is ${load}; wait until the machine is quiet.`);

for (const folder of ['kit', 'engine']) {
  const args = ['-a', '--itemize-changes', ...(dry ? ['--dry-run'] : []), `${studio}/${folder}/`, `${forge}/${folder}/`];
  const out = execFileSync('rsync', args, { encoding: 'utf8' }).trim();
  console.log(`${folder}/: ${out ? out.split('\n').length : 0} files ${dry ? 'would change' : 'copied'}`);
  if (out) console.log(out.split('\n').map((line) => `  ${line}`).join('\n'));
}

const check = `${forge}/dev/check.ts`;
const source = readFileSync(check, 'utf8');
// Every Conjuring the check page creates must be plain: natural framing, one plate, no relations.
const patched = source.replace(/offline: true,(?!\s*\n?\s*plain: true)/g, 'offline: true,\n      plain: true,');
if (patched !== source) {
  if (!dry) writeFileSync(check, patched);
  console.log(`dev/check.ts: ${dry ? 'would add' : 'added'} plain: true to ${(patched.match(/plain: true/g) ?? []).length - (source.match(/plain: true/g) ?? []).length} Conjuring call(s)`);
} else console.log('dev/check.ts: already plain');

if (!dry) {
  const tsc = spawnSync(`${studio}/.data/toolchain/node/bin/npx`, ['tsc', '--noEmit'], { cwd: forge, encoding: 'utf8' });
  console.log(tsc.status === 0 ? 'forge typecheck: clean' : `forge typecheck failed:\n${tsc.stdout}${tsc.stderr}`);
  if (tsc.status !== 0) process.exit(1);
  console.log('Next: push one known component through `./forge check` before launching a wave.');
}
