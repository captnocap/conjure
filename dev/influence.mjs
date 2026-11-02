// Influence: gather what the decision model answered for every idea in the gallery, keyed by the
// words of the idea, so dev/influence.html can show which words move which decisions.
//   node dev/influence.mjs [--gallery .data/gallery] [--out .data/influence/data.json]
// Reads saved generations only (asks no model, spends nothing). One unit per idea and model
// family: first-choice records (roll 0) are preferred, since a reroll may have toured another
// direction and asked its downstream questions under that direction's words instead.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const args = process.argv.slice(2);
const option = (name, fallback) => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : fallback; };
const root = option('--gallery', '.data/gallery');
const out = option('--out', '.data/influence/data.json');

/** `nanogpt:typesafe/jev-1.14-20261014` → family `jev`, version `jev-1.14-20261014`; other models go by their maker. */
const FAMILIES = { typesafe: 'jev', openai: 'luna', llmtech: 'decider-4b', perplexity: 'pplx', liquid: 'liquid-d1' };
const modelOf = (record) => {
  const path = String(record.usage?.model ?? record.model ?? 'unknown').split(':').pop();
  const [maker, version = maker] = path.split('/');
  return { family: FAMILIES[maker] ?? maker, version };
};

/** Words as typed, lower-cased, possessive 's dropped; digits kept ("3am" is a word that matters). */
export const wordsOf = (idea) => idea.toLowerCase().replace(/[’']s\b/g, '').replace(/[’']/g, '').split(/[^a-z0-9]+/).filter(Boolean);

const questions = new Map(); // key → { owner, name, kind, ask, options: Set }
const units = new Map(); // family|idea → { idea, family, versions, days, records: [] }

for (const day of readdirSync(root).sort()) {
  let names;
  try { names = readdirSync(join(root, day)); } catch { continue; }
  for (const name of names.filter((n) => n.endsWith('.json') && !n.endsWith('.summary.json'))) {
    let record;
    try { record = JSON.parse(readFileSync(join(root, day, name), 'utf8')); } catch { continue; }
    // Studies and offline prints settle on even draws, not on the model.
    if (record.source !== 'model' || !Array.isArray(record.rulings) || !record.rulings.length || !record.idea) continue;
    const { family, version } = modelOf(record);
    const idea = record.idea.trim().replace(/\s+/g, ' ');
    const key = `${family}|${idea.toLowerCase()}`;
    const unit = units.get(key) ?? { idea, family, versions: new Set(), days: new Set(), records: [] };
    unit.versions.add(version); unit.days.add(day);
    unit.records.push(record);
    units.set(key, unit);
  }
}

/** The outcomes of one record: question key → { label: p }. Scene-wide questions only, plus what was cast and where. */
const outcomesOf = (record) => {
  const found = {};
  for (const ruling of record.rulings) {
    if (ruling.owner !== 'direction' && ruling.owner !== 'design') continue;
    if (!Array.isArray(ruling.options) || !ruling.options.length) continue;
    const key = `${ruling.owner}.${ruling.name}`;
    const meta = questions.get(key) ?? { owner: ruling.owner, name: ruling.name, kind: ruling.kind, ask: ruling.ask, options: new Map() };
    meta.ask = ruling.ask; // the newest wording wins; days are read in order
    const probabilities = {};
    ruling.options.forEach((o, index) => {
      probabilities[o.label] = o.p;
      if (!meta.options.has(o.label)) meta.options.set(o.label, ruling.kind === 'score' ? index : meta.options.size);
    });
    // A score's options are ordered bins; its settled value (0..1) is kept as the mean.
    if (ruling.kind === 'score') probabilities['(mean)'] = ruling.confidence;
    questions.set(key, meta);
    found[key] = probabilities;
  }
  // What was actually built: the setting and the cast, as yes/no outcomes per component.
  if (record.world?.id) found['built.world'] = { [record.world.id]: 1 };
  if (Array.isArray(record.cast) && record.cast.length) found['built.cast'] = Object.fromEntries(record.cast.map((c) => [c.id, 1]));
  if (record.scale) found['built.scale'] = { [record.scale]: 1 };
  return found;
};

const rows = [];
for (const unit of units.values()) {
  const first = unit.records.filter((r) => (r.roll ?? 0) === 0);
  const used = first.length ? first : unit.records;
  // Average each probability over the unit's records; a label missing from one record counts 0.
  const sums = {}; const seen = {};
  for (const record of used) {
    for (const [key, probabilities] of Object.entries(outcomesOf(record))) {
      sums[key] ??= {}; seen[key] = (seen[key] ?? 0) + 1;
      for (const [label, p] of Object.entries(probabilities)) sums[key][label] = (sums[key][label] ?? 0) + p;
    }
  }
  const outcomes = {};
  for (const [key, labels] of Object.entries(sums)) {
    outcomes[key] = Object.fromEntries(Object.entries(labels).map(([label, p]) => [label, Math.round((p / seen[key]) * 1e4) / 1e4]));
  }
  rows.push({
    idea: unit.idea, words: wordsOf(unit.idea), family: unit.family,
    versions: [...unit.versions].sort(), days: [...unit.days].sort(),
    records: used.length, outcomes,
  });
}

for (const key of ['built.world', 'built.cast', 'built.scale']) {
  const labels = new Map();
  for (const row of rows) for (const label of Object.keys(row.outcomes[key] ?? {})) labels.set(label, labels.size);
  questions.set(key, { owner: 'built', name: key.slice(6), kind: 'built', ask: `Which ${key.slice(6)} was built?`, options: labels });
}

const data = {
  made: new Date().toISOString(),
  units: rows.sort((a, b) => a.days[0].localeCompare(b.days[0]) || a.idea.localeCompare(b.idea)),
  questions: Object.fromEntries([...questions].map(([key, q]) => [key, {
    owner: q.owner, name: q.name, kind: q.kind, ask: q.ask,
    options: [...q.options].sort((a, b) => a[1] - b[1]).map(([label]) => label),
  }])),
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(data));
const families = rows.reduce((m, r) => ({ ...m, [r.family]: (m[r.family] ?? 0) + 1 }), {});
console.log(`${rows.length} ideas (${Object.entries(families).map(([f, n]) => `${f} ${n}`).join(', ')}), ${questions.size} questions → ${out}`);
