// Laps: conjure a spread of ideas headlessly and keep what was decided for each, so recurring
// choices (a world that turns up for everything, a look that wins too often, a thing cast into
// scenes it does not belong to) can be seen across prompts rather than guessed from one.
//   node dev/laps.mjs ideas.txt [--base http://127.0.0.1:3400] [--t 0] [--roll 0] [--parallel 2] [--model nanogpt:liquid/d1] [--timeout 240] [--out .data/laps/<stamp>]
//     one idea per line; each is conjured with first choices (t=0) unless --t says otherwise.
//   node dev/laps.mjs --tally .data/laps/<run> [--min 3]
//     counts directions, settings, looks, media, cast, presentations and finishes across the run.
// Running asks the configured model and spends like the studio does; tallying is free.
import { chromium } from '@playwright/test';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const option = (name, fallback) => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : fallback; };

if (args.includes('--tally')) {
  tally(option('--tally'), Number(option('--min', 3)));
} else {
  const file = args.find((arg) => !arg.startsWith('--') && !args.includes(`--${arg}`) && args[args.indexOf(arg) - 1]?.startsWith('--') !== true);
  if (!file) { console.error('usage: node dev/laps.mjs ideas.txt | --tally <run dir>'); process.exit(1); }
  await run(file, {
    base: option('--base', 'http://127.0.0.1:3400'),
    t: option('--t', '0'), roll: option('--roll', '0'), model: option('--model'), timeout: Number(option('--timeout', 240)),
    parallel: Number(option('--parallel', 2)),
    out: option('--out', join('.data/laps', new Date().toISOString().slice(0, 16).replace(/[-:T]/g, ''))),
  });
}

async function run(file, { base, t, roll, model, timeout, parallel, out }) {
  const ideas = readFileSync(file, 'utf8').split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let next = 0;
  const started = Date.now();
  const worker = async () => {
    const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
    page.on('pageerror', (error) => console.log(`[pageerror] ${String(error).slice(0, 300)}`));
    while (next < ideas.length) {
      const index = next++;
      const idea = ideas[index];
      const name = `${String(index + 1).padStart(2, '0')}-${idea.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)}.json`;
      const at = Date.now();
      try {
        await page.goto(`${base}/?idea=${encodeURIComponent(idea)}&t=${t}&roll=${roll}${model ? `&model=${encodeURIComponent(model)}` : ''}`);
        await page.waitForFunction(() => document.title.startsWith('conjure-'), null, { timeout: timeout * 1000 });
        const record = await page.evaluate(() => {
          const held = window.__conjure;
          if (!held) return { failed: document.querySelector('#status')?.textContent ?? 'no plan' };
          const { plan, reports } = held;
          const ruling = (owner, name) => plan.rulings.find((r) => r.owner === owner && r.name === name);
          const picked = (owner, name) => ruling(owner, name)?.picked ?? null;
          const top = (owner, name, n = 4) => (ruling(owner, name)?.options ?? []).slice(0, n).map((o) => `${o.label} ${Math.round(o.p * 100)}`);
          return {
            direction: plan.direction?.entry.id ?? null, directionTop: top('direction', 'house', 5),
            world: plan.world.entry.id, worldTop: top('direction', 'world', 5), scale: plan.scale,
            look: plan.look?.entry.id ?? null, medium: picked('direction', 'medium'), mediumTop: top('direction', 'medium', 7),
            styleSpecified: ruling('direction', 'styleSpecified')?.options?.find((o) => o.label === 'yes')?.p ?? null,
            cast: plan.cast.map((m) => ({ id: m.entry.id, belongs: Math.round(m.belongs * 100), relation: m.relation ?? null })),
            nearly: (plan.nearly ?? []).slice(0, 5).map((n) => `${n.id} ${Math.round(n.belongs * 100)}`),
            wanted: plan.wanted, mood: plan.mood, framing: plan.framing,
            presentation: plan.presentation.kind, arc: plan.presentation.arc, blend: plan.presentation.blend ?? null,
            accent: plan.accent ? { region: plan.accent.region, look: plan.accent.look.entry.id } : null,
            otherworld: plan.otherworld ?? null, vacui: plan.vacui ?? null, camera: plan.camera ?? null,
            materialize: plan.materialize ?? null, materials: { [plan.world.entry.id]: plan.world.material ?? null, ...Object.fromEntries(plan.cast.map((m) => [m.entry.id, m.material ?? null])) },
            design: plan.design ? { notes: plan.design.notes, layers: plan.design.layers.map((l) => `${l.motif}${l.ink ? `/${l.ink}` : ''}`) } : null,
            lookAnswers: plan.look?.answers ?? null, worldAnswers: plan.world.answers,
            failed: reports.filter((r) => r.error).map((r) => `${r.id}: ${r.error}`),
            usage: plan.usage, status: document.querySelector('#status')?.textContent ?? '',
            // Every ruling with its full probabilities, so a run can be read decision by decision afterwards.
            rulings: plan.rulings,
          };
        });
        writeFileSync(join(out, name), JSON.stringify({ idea, t: Number(t), roll: Number(roll), ...record }, null, 1));
        console.log(`${String(index + 1).padStart(2)}/${ideas.length} ${((Date.now() - at) / 1000).toFixed(0).padStart(3)} s  ${idea}  →  ${record.direction?.split('/')[1] ?? '?'} · ${record.world?.split('/')[1] ?? '?'} · ${record.look?.split('/')[1] ?? '?'} · ${record.presentation ?? '?'} · [${(record.cast ?? []).map((m) => m.id.split('/')[1]).join(', ')}]${record.failed?.length ? `  FAILED ${JSON.stringify(record.failed)}` : ''}`);
      } catch (error) {
        writeFileSync(join(out, name), JSON.stringify({ idea, t: Number(t), roll: Number(roll), failed: String(error).slice(0, 300) }, null, 1));
        console.log(`${String(index + 1).padStart(2)}/${ideas.length} ${idea}  →  FAILED ${String(error).slice(0, 200)}`);
      }
    }
    await page.close();
  };
  await Promise.all(Array.from({ length: Math.max(1, parallel) }, worker));
  await browser.close();
  console.log(`\n${ideas.length} ideas in ${((Date.now() - started) / 60000).toFixed(1)} min → ${out}\n`);
  tally(out, 3);
}

function tally(dir, min) {
  const records = readdirSync(dir).filter((name) => name.endsWith('.json')).sort().map((name) => JSON.parse(readFileSync(join(dir, name), 'utf8')));
  const laps = records.filter((record) => record.world);
  const count = (items) => {
    const tallies = new Map();
    for (const item of items) if (item) tallies.set(item, (tallies.get(item) ?? 0) + 1);
    return [...tallies.entries()].sort((a, b) => b[1] - a[1]);
  };
  const show = (title, pairs, total = laps.length, keep = min) => {
    const rows = pairs.filter(([, n]) => n >= keep || pairs.length <= 8);
    if (!rows.length) return;
    console.log(`\n${title} (${pairs.length} distinct over ${total})`);
    for (const [label, n] of rows.slice(0, 25)) console.log(`  ${String(n).padStart(3)}  ${Math.round((n / total) * 100).toString().padStart(3)}%  ${label}`);
  };
  console.log(`${laps.length} laps settled, ${records.length - laps.length} failed, t=${records[0]?.t} roll=${records[0]?.roll}`);
  show('Direction', count(laps.map((r) => r.direction)));
  show('Setting', count(laps.map((r) => r.world)));
  show('Scale', count(laps.map((r) => r.scale)));
  show('Medium', count(laps.map((r) => r.medium)));
  show('Look', count(laps.map((r) => r.look)));
  show('Presentation', count(laps.map((r) => r.presentation)));
  show('Cast (ideas a thing was cast into)', count(laps.flatMap((r) => [...new Set(r.cast.map((m) => m.id))])));
  show('Hero (first cast)', count(laps.map((r) => r.cast[0]?.id)));
  show('Materials (things and settings dressed by the idea)', count(laps.flatMap((r) => Object.entries(r.materials ?? {}).flatMap(([id, m]) => m ? [`${id.split('/')[1]} ${Object.values(m).join('/')}`] : []))), laps.length, 1);
  show('Surfaces through the medium', count(laps.map((r) => r.materialize ? `${Math.round(r.materialize.weight * 100)}%` : null)));
  show('Relation', count(laps.flatMap((r) => r.cast.map((m) => m.relation))), laps.reduce((n, r) => n + r.cast.filter((m) => m.relation).length, 0));
  show('Framing anchor', count(laps.map((r) => r.framing?.anchor)));
  show('Frame level', count(laps.map((r) => (r.framing?.tilt ? 'tilted' : 'level'))));
  show('Accent', count(laps.map((r) => (r.accent ? `${r.accent.region}: ${r.accent.look}` : 'none'))));
  show('Otherworld rift', count(laps.map((r) => (r.otherworld ? r.otherworld.rift : 'none'))));
  show('Dead space', count(laps.map((r) => (r.vacui ? r.vacui.fill : 'none'))));
  show('Doodles (glyph fills)', count(laps.map((r) => (r.vacui?.fill === 'glyphs' ? r.vacui.doodles ?? 'machinery' : 'none'))));
  show('Camera', count(laps.map((r) => r.camera)));
  show('Vector motif', count(laps.flatMap((r) => (r.design?.layers ?? []).map((layer) => layer.split('/')[0]))));
  show('Vector ink', count(laps.flatMap((r) => (r.design?.layers ?? []).map((layer) => layer.split('/')[1]).filter(Boolean))));
  const specified = laps.filter((r) => typeof r.styleSpecified === 'number');
  if (specified.length) {
    const yes = specified.filter((r) => r.styleSpecified >= 0.5);
    console.log(`\nStyle "explicitly requested" read as yes for ${yes.length} of ${specified.length} ideas (locks the medium and look against rerolls)`);
    for (const r of yes.slice(0, 12)) console.log(`   ${Math.round(r.styleSpecified * 100)}%  ${r.idea}`);
  }
  const moods = ['wear', 'warmth', 'energy', 'density', 'daylight', 'cheer'];
  const mean = (key) => laps.reduce((sum, r) => sum + (r.mood?.[key] ?? 0), 0) / laps.length;
  const spread = (key) => { const m = mean(key); return Math.sqrt(laps.reduce((sum, r) => sum + ((r.mood?.[key] ?? 0) - m) ** 2, 0) / laps.length); };
  console.log(`\nMood means ± spread: ${moods.map((key) => `${key} ${mean(key).toFixed(2)}±${spread(key).toFixed(2)}`).join(' · ')}`);
  const cost = laps.reduce((sum, r) => sum + (r.usage?.costUsd ?? 0), 0);
  const requests = laps.reduce((sum, r) => sum + (r.usage?.requests ?? 0), 0);
  console.log(`Spend: $${cost.toFixed(3)} over ${requests} requests (${(cost / laps.length * 100).toFixed(2)} ¢ per idea)`);
  const failed = records.filter((r) => !r.world || r.failed?.length);
  if (failed.length) { console.log('\nFailures'); for (const r of failed) console.log(`  ${r.idea}: ${JSON.stringify(r.failed).slice(0, 200)}`); }
}
