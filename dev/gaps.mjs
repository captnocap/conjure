// What the catalogue could not answer well. Reads the gallery's saved generations and lists
// the ideas whose cast belonged weakly, with the things that came closest, so the next
// content wave can be aimed at real gaps instead of guesses. Asks no model.
//   node dev/gaps.mjs                 # print the report
//   node dev/gaps.mjs --json          # machine-readable, for a cartographer brief
//   node dev/gaps.mjs --below 0.6     # change the belonging threshold (default 0.5)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const json = args.includes('--json');
const belowAt = args.indexOf('--below');
const below = belowAt >= 0 ? Number(args[belowAt + 1]) : 0.5;
const root = process.env.CONJURE_GALLERY_PATH ?? '.data/gallery';

const entries = [];
for (const day of readdirSync(root).filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name)).sort()) {
  for (const name of readdirSync(join(root, day)).filter((file) => file.endsWith('.json')).sort()) {
    try {
      const entry = JSON.parse(readFileSync(join(root, day, name), 'utf8'));
      if (entry.source === 'model') entries.push(entry);
    } catch { /* a half-written entry is not a gap */ }
  }
}

/** One row per distinct idea: its weakest-cast generation, with what nearly made it. */
const byIdea = new Map();
for (const entry of entries) {
  const cast = entry.cast ?? [];
  const strongest = Math.max(0, ...cast.map((member) => member.belongs ?? 0));
  const known = byIdea.get(entry.idea);
  if (!known || strongest < known.strongest) {
    byIdea.set(entry.idea, {
      idea: entry.idea,
      strongest,
      world: entry.world?.id ?? null,
      cast: cast.map((member) => member.id),
      nearly: (entry.nearly ?? []).slice(0, 6).map((near) => `${near.id} ${Math.round((near.belongs ?? 0) * 100)}%`),
      generations: 1,
      savedAt: entry.savedAt,
    });
  } else known.generations++;
}
const gaps = [...byIdea.values()].filter((row) => row.strongest < below).sort((a, b) => a.strongest - b.strongest);

if (json) {
  console.log(JSON.stringify({ generations: entries.length, ideas: byIdea.size, below, gaps }, null, 2));
} else {
  console.log(`${entries.length} model generations, ${byIdea.size} distinct ideas, ${gaps.length} whose best cast member belonged below ${Math.round(below * 100)}%.\n`);
  for (const gap of gaps) {
    console.log(`${Math.round(gap.strongest * 100).toString().padStart(3)}%  ${gap.idea}`);
    console.log(`      in ${gap.world ?? '?'} with ${gap.cast.join(', ') || 'nothing'}`);
    if (gap.nearly.length) console.log(`      nearly: ${gap.nearly.join(', ')}`);
  }
  if (gaps.length) console.log('\nUse these as briefs for the next content wave: what thing or world would have made each idea land?');
}
