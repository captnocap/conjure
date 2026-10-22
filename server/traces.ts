import express, { Router } from 'express';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { z } from 'zod';

/**
 * The trace library: pictures traced in the browser into flat vector shapes, kept as validated path
 * data under .data/traces/<id>.json. Nothing is deleted; a removed trace moves to .data/traces/removed/.
 *   GET    /api/traces             every trace, light: id, name, size, colours
 *   GET    /api/traces/<id>        one trace with its shapes
 *   POST   /api/traces             save a trace { id, name, width, height, shapes }
 *   POST   /api/traces/<id>/name   rename { name }
 *   DELETE /api/traces/<id>        set it aside
 */
const ROOT = resolve(process.env.CONJURE_TRACES_PATH ?? '.data/traces');
const ID = /^[a-z0-9-]{1,64}$/;

const shape = z.object({
  d: z.string().min(1).max(400_000).regex(/^[MLQCZmlqcz0-9.,\s-]+$/),
  fill: z.string().regex(/^#[0-9a-f]{6}$/i),
  tone: z.number().min(0).max(1),
  background: z.boolean(),
}).strict();

export const traceSchema = z.object({
  id: z.string().regex(ID),
  name: z.string().trim().min(1).max(80),
  width: z.number().int().min(1).max(4096),
  height: z.number().int().min(1).max(4096),
  shapes: z.array(shape).min(1).max(64),
}).strict().refine((trace) => trace.shapes.reduce((sum, item) => sum + item.d.length, 0) <= 800_000, { message: 'the traced paths are too large' });

export type StoredTrace = z.infer<typeof traceSchema> & { createdAt: string };

/** What the decision model and the library list need, without the paths. */
export function summaryOf(trace: StoredTrace) {
  const kept = trace.shapes.filter((item) => !item.background).sort((a, b) => b.d.length - a.d.length);
  const backdrop = trace.shapes.filter((item) => item.background);
  return {
    id: trace.id,
    name: trace.name,
    width: trace.width,
    height: trace.height,
    createdAt: trace.createdAt,
    colours: kept.slice(0, 4).map((item) => item.fill),
    darkBackground: backdrop.length > 0 && backdrop.reduce((sum, item) => sum + item.tone, 0) / backdrop.length < 0.5,
    bytes: trace.shapes.reduce((sum, item) => sum + item.d.length, 0),
  };
}

const sameOrigin = (request: express.Request) =>
  !request.headers.origin || (URL.canParse(request.headers.origin) && new URL(request.headers.origin).host === request.headers.host);

async function readTrace(id: string): Promise<StoredTrace | null> {
  if (!ID.test(id)) return null;
  try { return JSON.parse(await readFile(join(ROOT, `${id}.json`), 'utf8')) as StoredTrace; } catch { return null; }
}

export const traces = Router();

traces.get('/api/traces', async (_request, response) => {
  try {
    const names = (await readdir(ROOT).catch(() => [] as string[])).filter((name) => name.endsWith('.json')).sort();
    const list = [];
    for (const name of names) {
      const trace = await readTrace(name.slice(0, -5));
      if (trace) list.push(summaryOf(trace));
    }
    response.json(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  } catch (error) {
    console.error('Trace listing failed:', error instanceof Error ? error.message : error);
    response.status(500).json({ error: 'The trace library could not be read.' });
  }
});

traces.get('/api/traces/:id', async (request, response) => {
  const trace = await readTrace(request.params.id);
  if (!trace) { response.status(404).json({ error: 'That trace is not in the library.' }); return; }
  response.json(trace);
});

traces.post('/api/traces', express.json({ limit: '4mb' }), async (request, response) => {
  if (!sameOrigin(request)) { response.status(403).json({ error: 'Requests must come from this application.' }); return; }
  const parsed = traceSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: `Invalid trace: ${parsed.error.issues[0].path.join('.')} ${parsed.error.issues[0].message}` });
    return;
  }
  try {
    await mkdir(ROOT, { recursive: true });
    const stored: StoredTrace = { ...parsed.data, createdAt: new Date().toISOString() };
    await writeFile(join(ROOT, `${stored.id}.json`), JSON.stringify(stored));
    response.json(summaryOf(stored));
  } catch (error) {
    console.error('Trace save failed:', error instanceof Error ? error.message : error);
    response.status(500).json({ error: 'The trace could not be saved.' });
  }
});

traces.post('/api/traces/:id/name', express.json({ limit: '4kb' }), async (request, response) => {
  if (!sameOrigin(request)) { response.status(403).json({ error: 'Requests must come from this application.' }); return; }
  const name = z.string().trim().min(1).max(80).safeParse(request.body?.name);
  const trace = await readTrace(request.params.id);
  if (!trace || !name.success) { response.status(trace ? 400 : 404).json({ error: trace ? 'A name needs 1 to 80 characters.' : 'That trace is not in the library.' }); return; }
  trace.name = name.data;
  await writeFile(join(ROOT, `${trace.id}.json`), JSON.stringify(trace));
  response.json(summaryOf(trace));
});

traces.delete('/api/traces/:id', async (request, response) => {
  if (!sameOrigin(request)) { response.status(403).json({ error: 'Requests must come from this application.' }); return; }
  const trace = await readTrace(request.params.id);
  if (!trace) { response.status(404).json({ error: 'That trace is not in the library.' }); return; }
  await mkdir(join(ROOT, 'removed'), { recursive: true });
  await rename(join(ROOT, `${trace.id}.json`), join(ROOT, 'removed', `${trace.id}-${Date.now()}.json`));
  response.json({ removed: trace.id });
});
