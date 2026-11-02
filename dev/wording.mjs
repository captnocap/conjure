// Wording probe: does a decision follow a word, or what the word means? For each word that locks a
// decision (see /dev/influence.html), conjure the original ideas again alongside rewordings: synonyms
// and paraphrases (same meaning, word gone), antonyms (opposite meaning) and other senses (same word,
// different meaning). Then read off how likely the locked answer still is for each.
//   node dev/wording.mjs probe.json [--model nanogpt:liquid/d1] [--timeout 240] [--out .data/wording/<stamp>] [--base http://127.0.0.1:3400] [--parallel 2]
//     conjures every prompt at first choices through dev/laps.mjs (asks and spends like the studio), then tallies
//   node dev/wording.mjs probe.json --tally <run dir>
//     free; prints the table and writes <run dir>/wording.json for the Wording tab of /dev/influence.html
// probe.json: [{ word, targets: [{ decision: "design.motif" | "built.cast" | "built.world" | "built.scale", answer }],
//                prompts: [{ kind: "original" | "synonym" | "paraphrase" | "antonym" | "other sense", text }] }]
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const option = (name, fallback) => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : fallback; };
const file = args[0];
if (!file || file.startsWith('--')) { console.error('usage: node dev/wording.mjs probe.json [--tally <run dir>]'); process.exit(1); }
const probe = JSON.parse(readFileSync(file, 'utf8'));

let dir = option('--tally');
if (!dir) {
  dir = option('--out', join('.data/wording', new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')));
  mkdirSync(dir, { recursive: true });
  const ideas = [...new Set(probe.flatMap((group) => group.prompts.map((p) => p.text)))];
  writeFileSync(join(dir, 'ideas.txt'), `${ideas.join('\n')}\n`);
  const laps = spawnSync('node', ['dev/laps.mjs', join(dir, 'ideas.txt'), '--out', join(dir, 'laps'), '--t', '0', '--roll', '0',
    '--base', option('--base', 'http://127.0.0.1:3400'), '--parallel', option('--parallel', '2'), ...(option('--model') ? ['--model', option('--model')] : []), '--timeout', option('--timeout', '240')], { stdio: 'inherit' });
  if (laps.status !== 0) process.exit(laps.status ?? 1);
}

const records = new Map();
const lapsDir = join(dir, 'laps');
for (const name of readdirSync(lapsDir).filter((n) => n.endsWith('.json'))) {
  const record = JSON.parse(readFileSync(join(lapsDir, name), 'utf8'));
  records.set(record.idea, record);
}

/**
 * How the answer fared for this decision in one record. "built" is whether it is what the picture
 * actually got: for a score that is the settled value (the mean of the bins, not the largest bin),
 * for a choice the answer that settled, for cast whether the thing was cast. A thing left out of the
 * cast still reports how much it belonged when it was a near miss, so a displaced thing is not read
 * as an irrelevant one. "margin" is the winner's lead over the runner-up, to tell a tie from a rout.
 */
function read(record, { decision, answer }) {
  if (!record?.world) return { failed: true };
  const [owner, name] = decision.split('.');
  if (owner === 'built') {
    if (name === 'cast') {
      const member = record.cast.find((m) => m.id === answer);
      const near = (record.nearly ?? []).map((n) => String(n).split(' ')).find(([id]) => id === answer);
      return { built: Boolean(member), p: member ? member.belongs / 100 : near ? Number(near[1]) / 100 : null, nearMiss: !member && Boolean(near), winner: record.cast[0]?.id ?? null };
    }
    // The setting is chosen through chained batches over every world, so its probabilities are not
    // comparable from idea to idea; what was built is the reading.
    const got = name === 'world' ? record.world : record.scale;
    return { built: got === answer, p: null, winner: got };
  }
  const ruling = record.rulings?.find((r) => r.owner === owner && r.name === name);
  if (!ruling) return { missing: true };
  const options = [...ruling.options].sort((a, b) => b.p - a.p);
  const p = ruling.options.find((o) => o.label === answer)?.p ?? 0;
  const settled = ruling.picked ?? options[0]?.label ?? null;
  const rival = settled === answer ? options.find((o) => o.label !== answer) : options.find((o) => o.label === settled);
  // A score settles on the mean of its bins, so a lead between two bins only means something for a choice.
  return { p, built: settled === answer, winner: settled, margin: ruling.kind === 'choice' && rival ? Math.abs(p - rival.p) : null, kind: ruling.kind };
}

const short = (label) => String(label ?? '—').replace(/^(directions|worlds|things|looks)\//, '');
const result = probe.map((group) => ({
  word: group.word, targets: group.targets,
  prompts: group.prompts.map((prompt) => ({ ...prompt, readings: group.targets.map((target) => read(records.get(prompt.text), target)) })),
}));

const cell = (r) => (r.failed ? 'failed' : r.missing ? 'not asked'
  : `${r.built ? '■' : '□'} ${r.p === null ? '' : `${Math.round(r.p * 100)}%`.padStart(4)}${r.built ? '' : r.nearMiss ? ' near miss' : ` → ${short(r.winner)}`}${r.margin !== null && r.margin !== undefined && r.margin < 0.05 ? ' (tie)' : ''}`);
for (const group of result) {
  console.log(`\n${group.word}  →  ${group.targets.map((t) => `${t.decision} = ${short(t.answer)}`).join('  |  ')}`);
  for (const prompt of group.prompts) console.log(`  ${prompt.kind.padEnd(12)} ${prompt.text.padEnd(70).slice(0, 70)} ${prompt.readings.map(cell).join('  |  ')}`);
  // Share of each kind of rewording that still lands on the first target.
  const kinds = [...new Set(group.prompts.map((p) => p.kind))];
  console.log(`  ${kinds.map((kind) => { const ps = group.prompts.filter((p) => p.kind === kind && !p.readings[0].failed && !p.readings[0].missing); return `${kind} ${ps.filter((p) => p.readings[0].built).length}/${ps.length}`; }).join(' · ')}`);
}
const spent = [...records.values()].reduce((sum, r) => sum + (r.usage?.costUsd ?? 0), 0);
console.log(`\n■ the answer settled (or was built), □ it did not; % is its probability (cast: belongs, also for a near miss left out); (tie) is within 5 points of the rival. ${records.size} prompts, $${spent.toFixed(3)}.`);
// The model that actually answered (a dated snapshot of the one asked for), as most records report it.
const answered = [...records.values()].map((r) => r.usage?.model).filter(Boolean);
const model = answered.sort((a, b) => answered.filter((m) => m === b).length - answered.filter((m) => m === a).length)[0] ?? option('--model') ?? 'default';
const failed = [...records.values()].filter((r) => !r.world).length;
const summary = { made: new Date().toISOString(), run: dir, model, probe: file, prompts: records.size, failed, spentUsd: spent };
writeFileSync(join(dir, 'wording.json'), JSON.stringify({ ...summary, groups: result }, null, 1));
mkdirSync('.data/wording', { recursive: true });
writeFileSync('.data/wording/latest.json', JSON.stringify({ ...summary, groups: result }, null, 1));
// Every run, newest first, for the model comparison on /dev/influence.html.
let index = [];
try { index = JSON.parse(readFileSync('.data/wording/index.json', 'utf8')); } catch { /* the first run */ }
index = [summary, ...index.filter((entry) => entry.run !== dir)];
writeFileSync('.data/wording/index.json', JSON.stringify(index, null, 1));
console.log(`answered by ${model}${failed ? `, ${failed} failed` : ''}`);
