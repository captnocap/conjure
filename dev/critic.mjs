// Critic: show a finished print back to a decision model that can see images and ask whether it is
// what the idea meant. It reads what the picture actually shows (mood, medium, whether each cast thing
// can be made out), then, having seen it, what the idea should have been given; where that differs
// from what was decided, it proposes pins and, with --loop, conjures again with them and asks again.
//   node --env-file=.env dev/critic.mjs <gallery entry .json> ... | --recent 5
//        [--critics nanogpt:perplexity/pplx-decider-v1.2,…] [--loop 2 [--model nanogpt:typesafe/jev-latest]]
//        [--base http://127.0.0.1:3400] [--out .data/critic/<stamp>.json]
// Asks NanoGPT directly with NANO_GPT_API_KEY (pennies an image); --loop conjures through the studio
// like dev/laps.mjs, which spends like the studio does.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const option = (name, fallback) => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : fallback; };
const GALLERY = '.data/gallery';
const BASE = option('--base', 'http://127.0.0.1:3400');
const CRITICS = option('--critics', 'nanogpt:perplexity/pplx-decider-v1.2').split(',').map((m) => m.trim()).filter(Boolean);
const LOOP = Number(option('--loop', 0));
const MODEL = option('--model');
const KEY = process.env.NANO_GPT_API_KEY;
if (!KEY) { console.error('NANO_GPT_API_KEY is not set (run with node --env-file=.env).'); process.exit(1); }

/** Revise a mood when, having seen the picture, the critic wants it this far from what was decided. */
const REVISE = 0.2;
/** A "should" this close to what the picture shows is read as an echo of the picture, not a revision. */
const ECHO = 0.1;
const MOODS = ['wear', 'warmth', 'energy', 'density', 'daylight', 'cheer'];
const MEDIA = {
  painting: 'A painting: oil, watercolour, gouache, ink wash',
  print: 'A print: woodcut, linocut, screenprint, risograph, poster',
  realism: 'A photograph or a photorealistic render',
  game: 'Video game graphics: pixel art, low-poly, cel-shaded',
  optical: 'An optical or instrument image: thermal, x-ray, night vision, scan',
  craft: 'A craft: stitching, cut paper, clay, stained glass',
  mixed: 'Mixed media or collage',
};
const OFF = {
  setting: 'The place or setting is wrong for the idea',
  objects: 'The objects or figures in it are wrong or missing',
  style: 'The art style or medium is wrong',
  mood: 'The mood or emotional weather is wrong',
  light: 'The light or time of day is wrong',
  framing: 'The framing, viewpoint or composition is wrong',
  legibility: 'It is hard to tell what anything is',
  nothing: 'Nothing: it is what the idea meant',
};
const nameOf = (id) => id.split('/').pop().replace(/-/g, ' ');
const STOP = new Set('the and with from into over under after before about that this their there where which while what when your have been were they them only just still every some than then very'.split(' '));
const THINGS = (() => { try { return readdirSync('components/things'); } catch { return []; } })();
/** Things the picture might be missing: catalogue things named by the idea's words, then the near misses. */
function candidatesFor(entry) {
  const words = entry.idea.toLowerCase().replace(/[’']s\b/g, '').split(/[^a-z]+/).filter((w) => w.length >= 4 && !STOP.has(w));
  const named = THINGS.filter((folder) => words.some((w) => folder.split('-').some((part) => part === w || part === `${w}s` || `${part}s` === w)))
    .sort((a, b) => a.length - b.length).map((folder) => `things/${folder}`);
  const cast = new Set((entry.cast ?? []).map((c) => c.id));
  return [...new Set([...named.slice(0, 12), ...(entry.nearly ?? []).map((n) => n.id)])].filter((id) => !cast.has(id)).slice(0, 18);
}

function entriesFromArgs() {
  const recent = Number(option('--recent', 0));
  if (recent) {
    const days = readdirSync(GALLERY).sort().reverse();
    const found = [];
    for (const day of days) {
      for (const name of readdirSync(join(GALLERY, day)).filter((n) => n.endsWith('.json')).sort().reverse()) {
        const entry = JSON.parse(readFileSync(join(GALLERY, day, name), 'utf8'));
        if (entry.source === 'model' && entry.hasPrint && entry.rulings?.length) found.push(join(GALLERY, day, name));
        if (found.length >= recent) return found;
      }
    }
    return found;
  }
  return args.filter((arg, i) => arg.endsWith('.json') && !args[i - 1]?.startsWith('--'));
}

/** The print as a JPEG data URL no larger than 512 × 512, as the image-reading decision models require. */
function imageOf(jsonPath) {
  const source = jsonPath.replace(/\.json$/, '.print.jpg');
  const result = spawnSync('ffmpeg', ['-v', 'error', '-i', source, '-vf', 'scale=512:512:force_original_aspect_ratio=decrease', '-q:v', '5', '-f', 'mjpeg', '-'], { maxBuffer: 8 << 20 });
  if (result.status !== 0) throw new Error(`could not read ${source}: ${String(result.stderr).slice(0, 200)}`);
  const data = `data:image/jpeg;base64,${result.stdout.toString('base64')}`;
  if (data.length > 240_000) throw new Error(`${source} is too large once encoded (${data.length} characters).`);
  return data;
}

async function ask(critic, state, questions) {
  const model = critic.replace(/^nanogpt:/, '');
  const response = await fetch('https://nano-gpt.com/api/v1/decisions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, state, questions }),
    signal: AbortSignal.timeout(90_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${model}: HTTP ${response.status} ${body?.error?.message ?? body?.message ?? ''}`.trim());
  return { answers: body.answers, cost: body.usage?.cost ?? body.usage?.estimated_cost ?? 0, tokens: body.usage?.input_tokens ?? 0, model: body.model };
}

const scoreOf = (answer, levels) => (answer?.type === 'score' ? Math.min(1, answer.score / (levels - 1)) : null);
const top = (answer) => (answer?.type === 'choice' ? Object.entries(answer.probabilities).sort((a, b) => b[1] - a[1])[0] : null);

/** One critic's reading of one print. */
async function critique(jsonPath, critic) {
  const entry = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const image = { type: 'image_url', image_url: { url: imageOf(jsonPath) } };
  const ruling = (name) => entry.rulings.find((r) => r.owner === 'direction' && r.name === name);
  const moods = MOODS.filter((m) => ruling(m) && typeof entry.mood?.[m] === 'number');
  const levels = Object.fromEntries(moods.map((m) => [m, ruling(m).options.map((o) => o.label)]));
  const medium = ruling('medium')?.picked ?? null;
  const directions = ruling('house')?.options.map((o) => o.label) ?? [];
  const intro = `Someone typed this idea for a picture: "${entry.idea}". A generator made the picture below for it.`;

  // What the picture shows, and the verdict.
  const seen = {
    meant: { type: 'noul', instructions: `Is this picture what the person meant by "${entry.idea}"?` },
    fit: { type: 'score', instructions: 'How well does the picture express the idea?', criteria: ['Not at all', 'Barely', 'Partly', 'Well', 'Exactly'] },
    off: { type: 'choice', instructions: 'What is most wrong with the picture for this idea?', criteria: OFF },
    medium: { type: 'choice', instructions: 'Looking only at the picture, what does it look like it was made as?', criteria: Object.fromEntries(Object.keys(MEDIA).map((k) => [k, MEDIA[k]])) },
    ...Object.fromEntries(moods.map((m) => [`seen_${m}`, { type: 'score', instructions: `Looking only at the picture: ${ruling(m).ask}`, criteria: levels[m] }])),
  };
  // Having seen it, what the idea should have had.
  const should = {
    medium: { type: 'choice', instructions: `Having seen this picture, which medium would best express "${entry.idea}"?`, criteria: Object.fromEntries(Object.keys(MEDIA).map((k) => [k, MEDIA[k]])) },
    ...Object.fromEntries(moods.map((m) => [`should_${m}`, { type: 'score', instructions: `Having seen this picture, for the idea itself: ${ruling(m).ask}`, criteria: levels[m] }])),
  };
  const cast = (entry.cast ?? []).slice(0, 8);
  const legible = Object.fromEntries(cast.map((c, i) => [`thing${i}`, { type: 'noul', instructions: `Can you make out ${nameOf(c.id)} in the picture?` }]));
  const candidates = candidatesFor(entry);
  if (candidates.length) legible.missing = { type: 'choice', instructions: `Which one thing is this picture most missing that "${entry.idea}" needs?`, criteria: { ...Object.fromEntries(candidates.map((id, i) => [`c${i}`, nameOf(id)])), none: 'Nothing is missing' } };

  const state = [intro, image];
  const [a, b, c] = await Promise.all([ask(critic, state, seen), ask(critic, state, should), Object.keys(legible).length ? ask(critic, state, legible) : null]);
  const intended = Object.fromEntries(moods.map((m) => [m, entry.mood[m]]));
  const perceived = Object.fromEntries(moods.map((m) => [m, scoreOf(a.answers[`seen_${m}`], levels[m].length)]));
  const wanted = Object.fromEntries(moods.map((m) => [m, scoreOf(b.answers[`should_${m}`], levels[m].length)]));
  const seenMedium = top(a.answers.medium);
  const shouldMedium = top(b.answers.medium);
  const things = cast.map((m, i) => ({ id: m.id, p: c?.answers[`thing${i}`]?.noul ?? null }));
  const missingTop = top(c?.answers.missing);
  const missing = missingTop && missingTop[0] !== 'none' ? [candidates[Number(missingTop[0].slice(1))], missingTop[1]] : missingTop ? ['none', missingTop[1]] : null;

  // Pins for another try: the thing the picture most lacks, moods the critic would move (unless its
  // "should" only echoes what it sees, which would ratify the picture), a medium it would change.
  const force = {};
  if (missing && missing[0] !== 'none' && missing[1] >= 0.35) force[`direction::cast:${missing[0]}`] = true;
  for (const m of moods) {
    if (wanted[m] === null || Math.abs(wanted[m] - intended[m]) < REVISE) continue;
    if (perceived[m] !== null && Math.abs(wanted[m] - perceived[m]) < ECHO) continue;
    force[`direction::${m}`] = Math.round(wanted[m] * 100) / 100;
  }
  if (shouldMedium && medium && shouldMedium[0] !== medium && shouldMedium[1] >= 0.5) force['direction::medium'] = shouldMedium[0];
  return {
    entry: jsonPath, idea: entry.idea, critic, answered: a.model,
    meant: a.answers.meant?.noul ?? null, fit: scoreOf(a.answers.fit, 5), off: top(a.answers.off),
    medium: { decided: medium, seen: seenMedium, should: shouldMedium },
    moods: Object.fromEntries(moods.map((m) => [m, { decided: intended[m], seen: perceived[m], should: wanted[m] }])),
    things, missing, directions, force,
    costUsd: (a.cost ?? 0) + (b.cost ?? 0) + (c?.cost ?? 0),
  };
}

const pct = (p) => (p === null || p === undefined ? '  —' : `${Math.round(p * 100)}%`.padStart(4));
function report(r) {
  console.log(`\n${r.idea}  ·  ${r.critic.replace(/^nanogpt:/, '')}`);
  console.log(`  meant ${pct(r.meant)}   fit ${pct(r.fit)}   most off: ${r.off ? `${r.off[0]} ${pct(r.off[1])}` : '—'}`);
  console.log(`  medium decided ${r.medium.decided ?? '—'} · looks like ${r.medium.seen?.[0] ?? '—'} ${pct(r.medium.seen?.[1])} · should be ${r.medium.should?.[0] ?? '—'} ${pct(r.medium.should?.[1])}`);
  for (const [m, v] of Object.entries(r.moods)) console.log(`  ${m.padEnd(9)} decided ${pct(v.decided)}  shows ${pct(v.seen)}  should ${pct(v.should)}${Math.abs((v.should ?? v.decided) - v.decided) >= REVISE ? (Math.abs((v.should ?? 0) - (v.seen ?? 1)) < ECHO ? '  (should echoes the picture)' : '  ← revise') : ''}${Math.abs((v.seen ?? v.decided) - v.decided) >= REVISE ? '  (picture does not show it)' : ''}`);
  if (r.things.length) console.log(`  can make out: ${r.things.map((t) => `${nameOf(t.id)} ${pct(t.p)}`).join(' · ')}`);
  if (r.missing) console.log(`  most missing: ${r.missing[0] === 'none' ? 'nothing' : nameOf(r.missing[0])} ${pct(r.missing[1])}`);
  console.log(`  pins: ${Object.keys(r.force).length ? JSON.stringify(r.force) : 'none'}   ($${r.costUsd.toFixed(5)})`);
}

/** Conjure the idea again through the studio with the pins, and return the new gallery entry's path. */
async function conjure(idea, force) {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const started = new Date().toISOString();
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
    await page.goto(`${BASE}/?idea=${encodeURIComponent(idea)}&t=0&roll=0${MODEL ? `&model=${encodeURIComponent(MODEL)}` : ''}&force=${encodeURIComponent(JSON.stringify(force))}`);
    await page.waitForFunction(() => document.title.startsWith('conjure-'), null, { timeout: 420_000 });
    // The page saves the picture after it is printed; wait for the gallery to have it.
    for (let i = 0; i < 60; i++) {
      const list = await (await fetch(`${BASE}/api/gallery?limit=20`)).json();
      const items = Array.isArray(list) ? list : list.entries ?? list.items ?? [];
      const found = items.find((e) => e.idea === idea && (e.savedAt ?? '') > started && e.hasPrint);
      if (found) return join(GALLERY, found.day, `${found.id}.json`);
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error('the new picture never reached the gallery');
  } finally { await browser.close(); }
}

const entries = entriesFromArgs();
if (!entries.length) { console.error('usage: node --env-file=.env dev/critic.mjs <gallery entry .json> ... | --recent N'); process.exit(1); }
const results = [];
for (const first of entries) {
  let path = first;
  let pins = {};
  for (let round = 0; round <= LOOP; round++) {
    const readings = [];
    for (const critic of CRITICS) {
      try { const r = await critique(path, critic); r.round = round; r.pinned = pins; report(r); readings.push(r); results.push(r); }
      catch (error) { console.log(`\n${path} · ${critic}: ${error.message}`); }
    }
    if (round === LOOP || !readings.length) break;
    // The first critic leads the revision; pins accumulate over rounds.
    const lead = readings[0];
    if ((lead.meant ?? 0) >= 0.7 || !Object.keys(lead.force).length) { console.log(`  → satisfied after round ${round}`); break; }
    pins = { ...pins, ...lead.force };
    console.log(`\n  → round ${round + 1}: conjuring "${lead.idea}" again with ${JSON.stringify(pins)}`);
    try { path = await conjure(lead.idea, pins); console.log(`  → ${path}`); }
    catch (error) { console.log(`  → could not conjure again: ${error.message}`); break; }
  }
}
const out = option('--out', join('.data/critic', `${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}.json`));
mkdirSync('.data/critic', { recursive: true });
writeFileSync(out, JSON.stringify(results, null, 1));
console.log(`\n${results.length} readings, $${results.reduce((s, r) => s + r.costUsd, 0).toFixed(4)} → ${out}`);
