import express, { Router } from 'express';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';

/**
 * Every finished generation is kept: the final composited print, the plain scene and the
 * decisions behind them, including an optional vector design. Files live under
 * .data/gallery/<day>/<id>.{json,print.jpg,scene.jpg}; ids sort by time.
 *   POST /api/gallery        save one generation (sent by the page after each print)
 *   GET  /api/gallery        newest first, ?offset=&limit=
 *   GET  /api/gallery/entry/<day>/<id>   one generation with its full decision tree
 *   POST /api/gallery/entry/<day>/<id>/window   attach its window print (the scene widened to the browser window)
 *   GET  /gallery            a page to browse them
 *   GET  /gallery/files/…    the saved images
 *   GET  /gallery/thumbs/<day>/<id>.jpg   a small copy of the print for the strip, made on first ask
 * A generation whose picture is byte for byte one already kept is not saved again: the page is
 * answered with the entry that has it.
 */
const ROOT = resolve(process.env.CONJURE_GALLERY_PATH ?? '.data/gallery');
/** Thumbnails sit beside the gallery, not in it, so they can be thrown away and made again. */
const THUMBS = resolve(process.env.CONJURE_THUMBS_PATH ?? join(dirname(ROOT), 'gallery-thumbs'));
const THUMB_SIZE = 312;
const JPEG = 'data:image/jpeg;base64,';
const WEBM = 'data:video/webm;base64,';
const picture = z.string().startsWith(JPEG).max(3_000_000);
const saveSchema = z.object({
  idea: z.string().trim().min(1).max(600),
  print: picture.nullable(),
  scene: picture,
  /** Every plate of a series on one mat, for presentations with more than one plate. */
  series: z.string().startsWith(JPEG).max(8_000_000).optional(),
  /** A short looping WebM of the scene moving. */
  loop: z.string().startsWith(WEBM).max(12_000_000).optional(),
  record: z.record(z.string(), z.unknown()),
});

const pad = (value: number, width = 2) => String(value).padStart(width, '0');
let sequence = 0;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** Records are <id>.json; the light copy beside each one is <id>.summary.json and is not an entry itself. */
const isRecord = (name: string) => name.endsWith('.json') && !name.endsWith('.summary.json');
/** The listing's view of a record: everything but the decision tree, which is fetched with the entry. */
export const summaryOf = ({ rulings: _rulings, nearly: _nearly, ...summary }: Record<string, unknown>) => summary;
const ID = /^[a-z0-9-]+$/;
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

/** The picture of every kept entry by its hash: the print, or the scene when there is no print. Read once, then kept up to date. */
let pictures: Promise<Map<string, { day: string; id: string }>> | null = null;
const knownPictures = () => pictures ??= (async () => {
  const known = new Map<string, { day: string; id: string }>();
  const days = (await readdir(ROOT).catch(() => [] as string[])).filter((name) => DAY.test(name)).sort();
  for (const day of days) {
    const names = (await readdir(join(ROOT, day))).filter(isRecord).sort();
    for (const name of names) {
      const id = name.slice(0, -'.json'.length);
      const bytes = await readFile(join(ROOT, day, `${id}.print.jpg`)).catch(() => readFile(join(ROOT, day, `${id}.scene.jpg`)).catch(() => null));
      if (bytes && !known.has(digest(bytes))) known.set(digest(bytes), { day, id });
    }
  }
  return known;
})().catch((error) => {
  pictures = null;
  throw error;
});

export const gallery = Router();

gallery.post('/api/gallery', express.json({ limit: '32mb' }), async (request, response) => {
  if (request.headers.origin && (!URL.canParse(request.headers.origin) || new URL(request.headers.origin).host !== request.headers.host)) {
    response.status(403).json({ error: 'Requests must come from this application.' });
    return;
  }
  const parsed = saveSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: `Invalid gallery entry: ${parsed.error.issues[0].path.join('.')} ${parsed.error.issues[0].message}` });
    return;
  }
  try {
    const { idea, print, scene, series, loop, record } = parsed.data;
    const hash = digest(Buffer.from((print ?? scene).slice(JPEG.length), 'base64'));
    const known = await knownPictures();
    const kept = known.get(hash);
    if (kept) {
      response.json({ ...kept, duplicate: true });
      return;
    }
    const now = new Date();
    const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const slug = idea.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'idea';
    const id = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${pad(now.getMilliseconds(), 3)}${pad(sequence++ % 100)}-${slug}`;
    const folder = join(ROOT, day);
    known.set(hash, { day, id });
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, `${id}.scene.jpg`), Buffer.from(scene.slice(JPEG.length), 'base64'));
    if (print) await writeFile(join(folder, `${id}.print.jpg`), Buffer.from(print.slice(JPEG.length), 'base64'));
    if (series) await writeFile(join(folder, `${id}.series.jpg`), Buffer.from(series.slice(JPEG.length), 'base64'));
    if (loop) await writeFile(join(folder, `${id}.loop.webm`), Buffer.from(loop.slice(WEBM.length), 'base64'));
    // The server's own fields come after the record, so a client cannot forge an id, a day or a time.
    const entry = { ...record, id, day, savedAt: now.toISOString(), idea, hasPrint: print !== null, hasSeries: !!series, hasLoop: !!loop };
    await writeFile(join(folder, `${id}.summary.json`), JSON.stringify(summaryOf(entry)));
    // The record is written last: an entry is listed only once its pictures and summary exist.
    await writeFile(join(folder, `${id}.json`), JSON.stringify(entry));
    response.json({ id, day });
  } catch (error) {
    pictures = null;
    console.error('Gallery save failed:', error instanceof Error ? error.message : error);
    response.status(500).json({ error: 'The generation could not be saved.' });
  }
});

gallery.get('/api/gallery', async (request, response) => {
  const offset = Math.max(0, Number(request.query.offset) || 0);
  const limit = Math.min(120, Math.max(1, Number(request.query.limit) || 48));
  try {
    const days = (await readdir(ROOT).catch(() => [] as string[])).filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name)).sort().reverse();
    const entries: unknown[] = [];
    let skipped = 0;
    let total = 0;
    for (const day of days) {
      const names = (await readdir(join(ROOT, day))).filter(isRecord).sort().reverse();
      total += names.length;
      for (const name of names) {
        if (skipped < offset) {
          skipped++;
          continue;
        }
        if (entries.length >= limit) break;
        // The listing stays light: it reads the summary beside each record, making it once for older entries.
        const id = name.slice(0, -'.json'.length);
        const summaryPath = join(ROOT, day, `${id}.summary.json`);
        let summary = await readFile(summaryPath, 'utf8').then((text) => JSON.parse(text) as Record<string, unknown>).catch(() => null);
        if (!summary) {
          summary = summaryOf(JSON.parse(await readFile(join(ROOT, day, name), 'utf8')));
          await writeFile(summaryPath, JSON.stringify(summary)).catch(() => undefined);
        }
        entries.push(summary);
      }
    }
    response.json({ total, offset, entries });
  } catch (error) {
    console.error('Gallery listing failed:', error instanceof Error ? error.message : error);
    response.status(500).json({ error: 'The gallery could not be read.' });
  }
});

gallery.get('/api/gallery/entry/:day/:id', async (request, response) => {
  const { day, id } = request.params;
  if (!DAY.test(day) || !ID.test(id)) {
    response.status(400).json({ error: 'Not a gallery entry.' });
    return;
  }
  try {
    response.type('json').send(await readFile(join(ROOT, day, `${id}.json`), 'utf8'));
  } catch {
    response.status(404).json({ error: 'That generation is not in the gallery.' });
  }
});

const windowSchema = z.object({
  image: z.string().startsWith(JPEG).max(8_000_000),
  view: z.object({
    width: z.number().positive().max(10_000),
    height: z.number().positive().max(10_000),
    frame: z.object({ x: z.number(), y: z.number(), size: z.number().positive() }),
  }),
});

/** The window print is made after the entry is saved, so it is attached to the entry afterwards. */
gallery.post('/api/gallery/entry/:day/:id/window', express.json({ limit: '12mb' }), async (request, response) => {
  if (request.headers.origin && (!URL.canParse(request.headers.origin) || new URL(request.headers.origin).host !== request.headers.host)) {
    response.status(403).json({ error: 'Requests must come from this application.' });
    return;
  }
  const { day, id } = request.params;
  const parsed = windowSchema.safeParse(request.body);
  if (!DAY.test(day) || !ID.test(id) || !parsed.success) {
    response.status(400).json({ error: 'Not a window print for a gallery entry.' });
    return;
  }
  try {
    const recordPath = join(ROOT, day, `${id}.json`);
    const record = JSON.parse(await readFile(recordPath, 'utf8'));
    await writeFile(join(ROOT, day, `${id}.window.jpg`), Buffer.from(parsed.data.image.slice(JPEG.length), 'base64'));
    const updated = { ...record, hasWindow: true, window: parsed.data.view };
    await writeFile(recordPath, JSON.stringify(updated));
    await writeFile(join(ROOT, day, `${id}.summary.json`), JSON.stringify(summaryOf(updated)));
    response.json({ id, day });
  } catch {
    response.status(404).json({ error: 'That generation is not in the gallery.' });
  }
});

gallery.use('/gallery/files', express.static(ROOT, { index: false, maxAge: '1y', immutable: true }));

/** ffmpeg makes the thumbnails; without it the strip is sent the full print. */
let ffmpeg = true;
const making = new Map<string, Promise<boolean>>();
let running = 0;
const waiting: (() => void)[] = [];
const shrink = (from: string, to: string) => new Promise<boolean>((done) => {
  const child = spawn('ffmpeg', ['-v', 'error', '-y', '-i', from, '-vf', `scale=${THUMB_SIZE}:${THUMB_SIZE}:force_original_aspect_ratio=increase:flags=lanczos,crop=${THUMB_SIZE}:${THUMB_SIZE}`, '-q:v', '4', '-f', 'mjpeg', to], { stdio: 'ignore' });
  child.on('error', () => { ffmpeg = false; done(false); });
  child.on('exit', (code) => done(code === 0));
});
const thumbnail = (day: string, id: string, to: string) => {
  let made = making.get(to);
  if (!made) {
    made = (async () => {
      if (running >= 4) await new Promise<void>((go) => waiting.push(go));
      running++;
      try {
        const from = await access(join(ROOT, day, `${id}.print.jpg`)).then(() => `${id}.print.jpg`, () => `${id}.scene.jpg`);
        await mkdir(dirname(to), { recursive: true });
        const part = `${to}.${process.pid}.part`;
        if (!(await shrink(join(ROOT, day, from), part))) return false;
        await rename(part, to);
        return true;
      } finally {
        running--;
        waiting.shift()?.();
      }
    })().finally(() => making.delete(to));
    making.set(to, made);
  }
  return made;
};

gallery.get('/gallery/thumbs/:day/:file', async (request, response) => {
  const { day, file } = request.params;
  const id = file.replace(/\.jpg$/, '');
  if (!DAY.test(day) || !ID.test(id) || !file.endsWith('.jpg')) {
    response.status(400).end();
    return;
  }
  const to = join(THUMBS, day, `${id}.jpg`);
  const ready = await access(to).then(() => true, () => false) || (ffmpeg && await thumbnail(day, id, to).catch(() => false));
  if (ready) {
    response.sendFile(to, { maxAge: '1y', immutable: true, dotfiles: 'allow' });
    return;
  }
  const exists = (kind: string) => access(join(ROOT, day, `${id}.${kind}.jpg`)).then(() => true, () => false);
  if (await exists('print')) response.redirect(302, `/gallery/files/${day}/${id}.print.jpg`);
  else if (await exists('scene')) response.redirect(302, `/gallery/files/${day}/${id}.scene.jpg`);
  else response.status(404).end();
});

gallery.get('/gallery', (_request, response) => response.type('html').send(PAGE));

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Conjure · gallery</title>
<style>
  :root { --paper: #edf0e5; --ink: #20362c; --soft: #5d6f64; --card: #f7f8f1; --line: #cfd6c6; }
  @media (prefers-color-scheme: dark) { :root { --paper: #161c19; --ink: #e4eadf; --soft: #9fb0a4; --card: #1f2723; --line: #33403a; } }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 20px 16px 60px; background: var(--paper); color: var(--ink); font: 14px/1.4 system-ui, sans-serif; }
  header { display: flex; flex-wrap: wrap; gap: 12px; align-items: baseline; justify-content: space-between; max-width: 1500px; margin: 0 auto 16px; }
  h1 { margin: 0; font-size: 22px; }
  a { color: inherit; }
  .tools { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  input, button, select { font: inherit; color: inherit; background: var(--card); border: 1px solid var(--line); border-radius: 6px; padding: 6px 10px; }
  button { cursor: pointer; }
  button[aria-pressed="true"] { background: var(--ink); color: var(--paper); }
  #grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; max-width: 1500px; margin: 0 auto; }
  figure { margin: 0; background: var(--card); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; cursor: zoom-in; }
  figure img { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; background: var(--line); }
  figcaption { padding: 8px 10px 10px; }
  figcaption b { display: block; font-weight: 600; overflow-wrap: anywhere; }
  figcaption span { color: var(--soft); font-size: 12px; overflow-wrap: anywhere; }
  #more { display: block; margin: 22px auto 0; }
  dialog { border: 1px solid var(--line); border-radius: 10px; background: var(--card); color: var(--ink); padding: 16px; width: min(1100px, 96vw); max-height: 94vh; }
  dialog::backdrop { background: rgb(0 0 0 / 0.6); }
  .detail { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 16px; }
  @media (max-width: 760px) { .detail { grid-template-columns: 1fr; } }
  .detail img { width: 100%; border-radius: 6px; display: block; }
  .detail h2 { margin: 0 0 6px; font-size: 18px; overflow-wrap: anywhere; }
  .detail dl { margin: 10px 0; display: grid; grid-template-columns: auto 1fr; gap: 3px 10px; font-size: 13px; }
  .detail dt { color: var(--soft); }
  .detail dd { margin: 0; overflow-wrap: anywhere; }
  .row { display: flex; gap: 8px; margin: 10px 0; flex-wrap: wrap; }
  .detail > div:last-child { max-height: 84vh; overflow: auto; }
  .tree h3 { margin: 14px 0 2px; font-size: 15px; border-top: 1px solid var(--line); padding-top: 8px; }
  .tree h3 small { font-weight: 400; color: var(--soft); font-size: 12px; margin-left: 6px; }
  .tree p { margin: 6px 0 3px; font-size: 12px; color: var(--soft); }
  .tree .answers { display: flex; flex-wrap: wrap; gap: 4px; }
  .tree a { position: relative; overflow: hidden; border: 1px solid var(--line); border-radius: 4px; padding: 1px 7px; font-size: 12.5px; text-decoration: none; }
  .tree a::before { content: ''; position: absolute; inset: 0 auto 0 0; width: var(--p, 0%); background: var(--soft); opacity: 0.22; }
  .tree a span, .tree a i { position: relative; }
  .tree a i { font-style: normal; color: var(--soft); font-size: 11px; margin-left: 5px; }
  .tree a.taken { border-color: var(--ink); font-weight: 600; }
  .tree a.pinned { border-color: #b4532f; }
  .tree a:hover { border-color: var(--ink); }
</style>
</head>
<body>
<header>
  <h1>Conjure gallery <small id="count" style="font-weight:400;color:var(--soft)"></small></h1>
  <div class="tools">
    <input id="search" type="search" placeholder="Filter by idea, world or thing…" aria-label="Filter the gallery" />
    <select id="model" aria-label="Filter by decision model"><option value="">Every model</option></select>
    <button id="mode-print" aria-pressed="true">Prints</button><button id="mode-scene" aria-pressed="false">Scenes</button>
    <a href="/">Back to the studio</a>
  </div>
</header>
<div id="grid"></div>
<button id="more" hidden>Load more</button>
<dialog id="detail"></dialog>
<script>
const grid = document.querySelector('#grid'), more = document.querySelector('#more'), detail = document.querySelector('#detail');
const search = document.querySelector('#search'), modelPick = document.querySelector('#model');
const modelOf = (e) => e.model || (e.usage && e.usage.model) || e.source || 'unknown';
const short = (m) => String(m).split('/').pop();
let offset = 0, total = 0, mode = 'print';
const loaded = [];
const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
const file = (e, kind) => '/gallery/files/' + e.day + '/' + encodeURIComponent(e.id) + '.' + (kind === 'series' && e.hasSeries ? 'series' : kind === 'print' && e.hasPrint ? 'print' : 'scene') + '.jpg';
const name = (id) => String(id || '').replace(/^(worlds|things|looks)\\//, '').replace(/-/g, ' ');
const words = (e) => [modelOf(e), e.idea, e.world && e.world.id, ...(e.cast || []).map((c) => c.id), e.look && e.look.id].join(' ').toLowerCase();
function card(e) {
  const figure = el('figure'), img = el('img'), caption = el('figcaption');
  img.loading = 'lazy'; img.alt = e.idea; img.src = file(e, mode); img.dataset.kind = 'thumb';
  const kind = e.presentation && e.presentation.kind && e.presentation.kind !== 'plate' ? ' · ' + e.presentation.kind : '';
  caption.append(el('b', e.idea), el('span', [name(e.world && e.world.id), (e.cast || []).map((c) => name(c.id)).join(', ')].filter(Boolean).join(' · ')), el('span', ' · ' + short(modelOf(e)) + kind));
  figure.append(img, caption); figure.entry = e;
  figure.addEventListener('click', () => open(e));
  return figure;
}
function draw() {
  const needle = search.value.trim().toLowerCase();
  const known = [...new Set(loaded.map(modelOf))].sort();
  if (known.length !== modelPick.options.length - 1) {
    const chosen = modelPick.value;
    modelPick.replaceChildren(new Option('Every model', ''), ...known.map((m) => new Option(short(m), m)));
    modelPick.value = chosen;
  }
  grid.replaceChildren(...loaded.filter((e) => (!needle || words(e).includes(needle)) && (!modelPick.value || modelOf(e) === modelPick.value)).map(card));
  document.querySelector('#count').textContent = total ? '· ' + total + ' saved' : '· nothing saved yet';
  more.hidden = offset >= total;
}
async function load() {
  const response = await fetch('/api/gallery?limit=60&offset=' + offset);
  const page = await response.json();
  total = page.total; offset += page.entries.length; loaded.push(...page.entries); draw();
}
function open(e) {
  const wrap = el('div', undefined, 'detail'), left = el('div'), right = el('div'), img = el('img');
  const kinds = [e.hasPrint && 'print', e.hasSeries && 'series', e.hasLoop && 'loop', 'scene'].filter(Boolean);
  let at = 0;
  const video = el('video'); video.autoplay = true; video.loop = true; video.muted = true; video.playsInline = true; video.style.width = '100%'; video.style.borderRadius = '6px'; video.hidden = true;
  const show = () => {
    const kind = kinds[at];
    if (kind === 'loop') { img.hidden = true; video.hidden = false; video.src = '/gallery/files/' + e.day + '/' + encodeURIComponent(e.id) + '.loop.webm'; video.play().catch(() => {}); }
    else { video.hidden = true; video.removeAttribute('src'); img.hidden = false; img.src = file(e, kind); }
  };
  show(); img.alt = e.idea;
  const row = el('div', undefined, 'row');
  const next = () => kinds[(at + 1) % kinds.length];
  const flip = el('button', 'Show the ' + next());
  flip.hidden = kinds.length < 2;
  flip.onclick = () => { at = (at + 1) % kinds.length; show(); flip.textContent = 'Show the ' + next(); };
  const again = el('a', 'Conjure this again');
  again.href = '/?idea=' + encodeURIComponent(e.idea) + '&t=' + (e.temperature || 0) + '&roll=' + (e.roll || 0);
  const close = el('button', 'Close'); close.onclick = () => detail.close();
  row.append(flip, again, close); left.append(img, video, row);
  const list = el('dl');
  const add = (k, v) => { if (v) list.append(el('dt', k), el('dd', v)); };
  add('Saved', new Date(e.savedAt).toLocaleString());
  add('World', name(e.world && e.world.id));
  add('Things', (e.cast || []).map((c, i) => name(c.id) + (i === 0 ? ' (hero)' : c.relation ? ' (' + c.relation + ')' : '')).join(', '));
  add('Look', [name(e.look && e.look.id), ...((e.look && e.look.notes) || [])].filter(Boolean).join(' · '));
  add('Vector composition', e.design && (e.design.notes || []).join(' · '));
  add('Mood', e.mood && Object.entries(e.mood).map(([k, v]) => k + ' ' + Number(v).toFixed(2)).join(', '));
  add('Presentation', e.presentation && (e.presentation.plates.length > 1 ? e.presentation.kind + (e.presentation.arc ? ' (' + e.presentation.arc + ')' : '') + ': ' + e.presentation.plates.join(' · ') : null));
  add('Framing', e.framing && ['elevation ' + Number(e.framing.elevation).toFixed(2), 'distance ' + Number(e.framing.distance).toFixed(2), 'turn ' + Number(e.framing.turn).toFixed(2), e.framing.anchor, e.framing.tilt ? 'tilted' : 'level'].join(', '));
  add('Roll', 'roll ' + (e.roll || 0) + (e.temperature ? ', sampled' : ', first choices'));
  add('Model', e.source === 'model' ? [modelOf(e), e.usage && e.usage.costUsd != null && '$' + Number(e.usage.costUsd).toFixed(5)].filter(Boolean).join(' · ') : e.source);
  add('Failed', (e.failed || []).join(', '));
  const tree = el('div', undefined, 'tree');
  right.append(el('h2', e.idea), list, tree);
  fetch('/api/gallery/entry/' + e.day + '/' + encodeURIComponent(e.id)).then((r) => r.json()).then((full) => drawTree(tree, full)).catch(() => {});
  wrap.append(left, right); detail.replaceChildren(wrap); detail.showModal();
}
// The decision tree of a saved generation. Every other answer is a link that reopens the idea
// in the studio with that answer pinned, on top of whatever was pinned when it was made.
function drawTree(host, e) {
  if (!e.rulings || !e.rulings.length) { host.append(el('p', 'This generation was saved before decision trees were kept.')); return; }
  const branch = (key, value) => {
    const pins = Object.assign({}, e.force || {}, { [key]: value });
    if (key === 'direction::medium') delete pins['direction::look'];
    if (key === 'direction::look') delete pins['direction::medium'];
    return '/?idea=' + encodeURIComponent(e.idea) + '&t=' + (e.temperature || 0) + '&roll=' + (e.roll || 0) + '&force=' + encodeURIComponent(JSON.stringify(pins));
  };
  const chip = (label, p, cls, href, title) => {
    const a = el('a', undefined, cls); a.href = href; a.title = title;
    a.append(el('span', label));
    if (p !== null) { a.append(el('i', Math.round(p * 100) + '%')); a.style.setProperty('--p', Math.round(p * 100) + '%'); }
    return a;
  };
  const section = (title, note, rulings, extra) => {
    if (!rulings.length && !extra) return;
    const h = el('h3', title); if (note) h.append(el('small', note)); host.append(h);
    for (const r of rulings) {
      host.append(el('p', r.ask));
      const row = el('div', undefined, 'answers');
      let options = r.options && r.options.length ? r.options.slice() : [{ label: r.picked, p: r.confidence }].concat(r.alternatives || []);
      if (!options.some((o) => o.label === r.picked)) options.unshift({ label: r.picked, p: r.confidence });
      const known = options.some((o) => o.p > 0);
      options.forEach((o, index) => {
        const taken = o.label === r.picked;
        const value = r.kind === 'score' ? index / Math.max(1, options.length - 1) : r.kind === 'noul' ? o.label === 'yes' : o.label;
        row.append(chip(name(o.label), known ? o.p : null, (taken ? 'taken' : '') + (taken && r.forced ? ' pinned' : ''), branch(r.owner + '::' + r.name, value), taken ? (r.forced ? 'Pinned when this was made' : 'The answer taken') : 'Open the studio with this answer instead'));
      });
      host.append(row);
      if (r.note) host.append(el('p', r.note));
    }
    if (extra) host.append(extra);
  };
  const of = (owner) => e.rulings.filter((r) => r.owner === owner);
  const direction = of('direction');
  section('Direction', 'mood', direction.filter((r) => !['world', 'look', 'medium', 'styleSpecified'].includes(r.name)));
  if (e.world) section(name(e.world.id), 'the setting', direction.filter((r) => r.name === 'world').concat(of(e.world.id)));
  for (const c of e.cast || []) section(name(c.id), 'belongs ' + Math.round((c.belongs || 0) * 100) + '%', of(c.id), (() => {
    const row = el('div', undefined, 'answers'); row.style.marginTop = '6px';
    row.append(chip('leave this out', null, '', branch('direction::cast:' + c.id, false), 'Open the studio without this thing'));
    return row;
  })());
  if (e.nearly && e.nearly.length) {
    const row = el('div', undefined, 'answers');
    for (const n of e.nearly) row.append(chip('+ ' + (n.title || name(n.id)), n.belongs, '', branch('direction::cast:' + n.id, true), 'Open the studio with this thing cast as well'));
    section('Nearly cast', 'came close', [], row);
  }
  section('Art medium', 'the family of treatments', direction.filter((r) => r.name === 'medium' || r.name === 'styleSpecified'));
  if (e.look) section(name(e.look.id), 'the print', direction.filter((r) => r.name === 'look').concat(of(e.look.id)));
  section('Vector composition', 'the generated design', of('design'));
}
detail.addEventListener('click', (event) => { if (event.target === detail) detail.close(); });
more.addEventListener('click', load);
search.addEventListener('input', draw);
modelPick.addEventListener('change', draw);
for (const kind of ['print', 'scene'])
  document.querySelector('#mode-' + kind).addEventListener('click', () => {
    mode = kind;
    document.querySelector('#mode-print').setAttribute('aria-pressed', String(kind === 'print'));
    document.querySelector('#mode-scene').setAttribute('aria-pressed', String(kind === 'scene'));
    draw();
  });
load();
</script>
</body>
</html>`;
