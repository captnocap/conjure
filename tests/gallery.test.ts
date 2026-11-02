import assert from 'node:assert/strict';
import { once } from 'node:events';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import express from 'express';

const JPEG = 'data:image/jpeg;base64,';
const picture = (byte: number) => JPEG + Buffer.from([0xff, 0xd8, byte, 0xff, 0xd9]).toString('base64');

test('a saved entry keeps the server’s own id and day, the listing reads light summaries, and strangers are refused', async () => {
  const root = mkdtempSync(join(tmpdir(), 'conjure-gallery-'));
  process.env.CONJURE_GALLERY_PATH = join(root, 'gallery');
  process.env.CONJURE_THUMBS_PATH = join(root, 'thumbs');
  const { gallery, summaryOf } = await import('../server/gallery');
  const app = express();
  app.use(gallery);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (body: unknown, headers: Record<string, string> = {}) =>
    fetch(`${base}/api/gallery`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  try {
    const forged = { id: 'forged', day: '1999-01-01', savedAt: 'never', idea: 'not this', hasPrint: true, roll: 2, rulings: [{ owner: 'x', text: 'y'.repeat(2000) }], nearly: [{ id: 'z' }] };
    const saved = await (await post({ idea: 'a lamp post', print: null, scene: picture(1), record: forged })).json() as { id: string; day: string };
    assert.notEqual(saved.id, 'forged');
    assert.match(saved.day, /^\d{4}-\d{2}-\d{2}$/);
    const folder = join(process.env.CONJURE_GALLERY_PATH, saved.day);
    const record = JSON.parse(readFileSync(join(folder, `${saved.id}.json`), 'utf8'));
    assert.equal(record.id, saved.id, 'the client cannot choose the id');
    assert.equal(record.idea, 'a lamp post');
    assert.equal(record.hasPrint, false, 'the client cannot claim a print it did not send');
    assert.notEqual(record.savedAt, 'never');
    assert.equal(record.roll, 2, 'the client’s own fields are kept');
    assert.equal(record.rulings.length, 1);
    const summary = JSON.parse(readFileSync(join(folder, `${saved.id}.summary.json`), 'utf8'));
    assert.deepEqual(summary, summaryOf(record));
    assert.equal(summary.rulings, undefined);
    assert.equal(summary.nearly, undefined);

    const page = await (await fetch(`${base}/api/gallery`)).json() as { total: number; entries: Record<string, unknown>[] };
    assert.equal(page.total, 1, 'summary files are not entries');
    assert.deepEqual(page.entries[0], summary);

    const again = await (await post({ idea: 'a lamp post again', print: null, scene: picture(1), record: {} })).json() as { duplicate?: boolean; id: string };
    assert.equal(again.duplicate, true);
    assert.equal(again.id, saved.id);

    const refused = await post({ idea: 'from elsewhere', print: null, scene: picture(2), record: {} }, { origin: 'http://attacker.example' });
    assert.equal(refused.status, 403);
    assert.ok(!existsSync(join(folder, `${saved.id}.window.jpg`)));
    const full = await (await fetch(`${base}/api/gallery/entry/${saved.day}/${saved.id}`)).json() as { rulings: unknown[] };
    assert.equal(full.rulings.length, 1, 'the entry itself still carries the tree');
  } finally {
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
  }
});
