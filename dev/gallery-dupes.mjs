// Find gallery entries whose picture is byte for byte one kept earlier, and move them aside.
//   node dev/gallery-dupes.mjs          list the duplicates
//   node dev/gallery-dupes.mjs --move   move them to .data/gallery-duplicates/<day>/ (move back to restore)
// The earliest entry of each picture stays. The server refuses new duplicates on save; this clears the old ones.
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const root = resolve(process.env.CONJURE_GALLERY_PATH ?? '.data/gallery');
const aside = join(dirname(root), 'gallery-duplicates');
const move = process.argv.includes('--move');

const kept = new Map();
const duplicates = [];
const days = (await readdir(root)).filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name)).sort();
for (const day of days) {
  const names = await readdir(join(root, day));
  for (const id of names.filter((name) => name.endsWith('.json')).map((name) => name.slice(0, -5)).sort()) {
    const bytes = await readFile(join(root, day, `${id}.print.jpg`)).catch(() => readFile(join(root, day, `${id}.scene.jpg`)).catch(() => null));
    if (!bytes) continue;
    const hash = createHash('sha256').update(bytes).digest('hex');
    const first = kept.get(hash);
    if (!first) kept.set(hash, { day, id });
    else duplicates.push({ day, id, of: first, files: names.filter((name) => name.startsWith(`${id}.`)) });
  }
}

const byPicture = Map.groupBy(duplicates, (entry) => `${entry.of.day}/${entry.of.id}`);
for (const [first, copies] of [...byPicture].sort((a, b) => b[1].length - a[1].length)) console.log(`${String(copies.length).padStart(4)} × ${first}`);
console.log(`${duplicates.length} duplicate entries of ${byPicture.size} pictures, ${kept.size} distinct pictures kept.`);

if (move) {
  for (const entry of duplicates) {
    await mkdir(join(aside, entry.day), { recursive: true });
    for (const file of entry.files) await rename(join(root, entry.day, file), join(aside, entry.day, file));
  }
  console.log(`Moved to ${aside}.`);
} else if (duplicates.length) console.log('Run with --move to move them aside.');
