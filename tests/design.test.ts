import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Mood, Question } from '../kit/contract';
import { generateSvg, SVG_MOTIFS } from '../kit/svg';
import { DESIGN_QUESTIONS, DesignDecisions, settleDesign, traceLayer } from '../engine/design';
import type { Direction } from '../kit/contract';
import { decideSchema } from '../server/decision-schema';
import { noUsage, type Verdict } from '../engine/oracle';
import type { Ruling } from '../engine/settle';

const mood: Mood = { wear: 0.3, warmth: 0.4, energy: 0.5, density: 0.6, daylight: 0.7, cheer: 0.8 };
/** A direction with a full brief and a one-line note, as a components/directions/ folder would export. */
const direction: Direction = {
  brief: 'Direction: a test direction. Lean into the uncanny: impossible scale, liminal places, things that do not belong. Keep the subject readable.',
  note: 'Direction: a test direction. Prefer the uncanny answer where the idea allows.',
  finishes: ['otherworld'],
};
const choices = {
  motif: 'botanical', companion: 'orbital', palette: 'botanical', placement: 'background', angle: 'rising', blend: 'multiply',
} as const;

function modelVerdicts(): Record<string, Verdict> {
  return Object.fromEntries(Object.entries(DESIGN_QUESTIONS).map(([name, question]) => {
    const verdict: Verdict = question.type === 'choice'
      ? { type: 'choice', probabilities: Object.fromEntries(Object.keys(question.options).map((key) => [key, key === choices[name as keyof typeof choices] ? 1 : 0])) }
      : question.type === 'score'
        ? { type: 'score', value: name === 'opacity' ? 0 : name === 'density' ? 1 : 0.5, probabilities: [0.05, 0.1, 0.5, 0.25, 0.1] }
        : { type: 'noul', p: 0.9 };
    return [name, verdict];
  }));
}

function response(verdicts = modelVerdicts()) {
  return new Response(JSON.stringify({
    model: 'test/decision-model', inputTokens: 321, costUsd: 0.00123,
    verdicts: Object.keys(DESIGN_QUESTIONS).map((name) => verdicts[name]),
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

test('the SVG inventory is expressed as typed questions with a required leading motif', () => {
  assert.equal(DESIGN_QUESTIONS.motif.type, 'choice');
  assert.deepEqual(Object.keys(DESIGN_QUESTIONS.motif.options), SVG_MOTIFS.map((motif) => motif.id));
  assert.ok(!('none' in DESIGN_QUESTIONS.motif.options));
  assert.deepEqual(Object.keys(DESIGN_QUESTIONS.companion.options), ['none', ...SVG_MOTIFS.map((motif) => motif.id)]);
  for (const name of ['opacity', 'density', 'scale'] as const) {
    assert.equal(DESIGN_QUESTIONS[name].type, 'score');
    assert.equal(DESIGN_QUESTIONS[name].levels.length, 5);
  }
  assert.equal(DESIGN_QUESTIONS.annotation.type, 'noul');
  assert.match(DESIGN_QUESTIONS.opacity.levels[0], /visible/);
  assert.equal(Object.keys(DESIGN_QUESTIONS).length, 10);
});

test('settled model decisions become visible layers with unique stable identities and seeds', () => {
  const rulings: Ruling[] = [];
  const design = settleDesign(modelVerdicts(), 0, 101, rulings);
  assert.deepEqual(design.layers.map(({ motif }) => motif), ['botanical', 'orbital', 'blueprint']);
  assert.deepEqual(design.layers.map(({ id }) => id), ['design-primary', 'design-companion', 'design-annotation']);
  assert.equal(new Set(design.layers.map(({ seed }) => seed)).size, 3);
  assert.equal(design.layers[0].color, '#244f3b');
  assert.equal(design.layers[0].accent, '#a18449');
  assert.equal(design.layers[1].color, '#a18449');
  assert.equal(design.layers[0].opacity, 0.04, 'the quietest model answer preserves the medium with a subtle sheet');
  assert.equal(design.layers[0].density, 0.88);
  assert.equal(design.layers[0].scale, 1.1);
  assert.equal(design.layers[0].rotation, -20);
  assert.equal(design.layers[0].blend, 'multiply');
  assert.equal(design.layers[0].placement, 'background');
  assert.equal(design.layers[2].placement, 'all', 'field notes annotate the sheet');
  assert.ok(design.layers.every((layer) => layer.visible && layer.opacity > 0));
  assert.match(design.notes.join(' '), /Wild herbarium with Orbital mechanics in botanical inks/);
  assert.equal(rulings.length, Object.keys(DESIGN_QUESTIONS).length);
  assert.ok(rulings.every(({ owner, kind, options }) => owner === 'design' && kind && options?.length));
  assert.deepEqual(rulings.find(({ name }) => name === 'motif')?.options?.[0], { label: 'botanical', p: 1 });
});

test('typed pins control every aspect of the generated composition', () => {
  const rulings: Ruling[] = [];
  const design = settleDesign(modelVerdicts(), 0, 121, rulings, {
    motif: 'ribbons', companion: 'none', palette: 'carnival', placement: 'subject',
    opacity: 0, density: 1, scale: 1, angle: 'quarter', blend: 'screen', annotation: false,
  });
  assert.equal(design.layers.length, 1);
  assert.equal(design.layers[0].motif, 'ribbons');
  assert.equal(design.layers[0].color, '#4268d4');
  assert.equal(design.layers[0].accent, '#e45f7a');
  assert.equal(design.layers[0].placement, 'subject');
  assert.equal(design.layers[0].opacity, 0.04);
  assert.equal(design.layers[0].density, 0.88);
  assert.equal(design.layers[0].scale, 1.55);
  assert.equal(design.layers[0].rotation, 90);
  assert.equal(design.layers[0].blend, 'screen');
  assert.equal(design.answers.annotation, false);
  assert.ok(rulings.every(({ forced }) => forced));
});

test('opacity spans subtle to bold while every automatic composition retains vector artwork', () => {
  for (const [answer, opacity] of [[0, 0.04], [0.5, 0.42], [1, 0.8]]) {
    const design = settleDesign(modelVerdicts(), 0, 101, [], { opacity: answer });
    assert.equal(design.layers[0].opacity, opacity);
    assert.ok(design.layers.every((layer) => layer.visible && layer.opacity > 0));
    const svg = generateSvg(720, design.layers);
    assert.match(svg, /design-primary/);
    assert.match(svg, /<path\b/);
    assert.ok(svg.includes(`opacity="${opacity}"`), 'the renderer retains even the subtle automatic sheet');
  }
});

test('repeat rolls repeat design geometry; pins preserve other draws; rerolls change each sheet seed', () => {
  const first = settleDesign({}, 1, 200, []);
  assert.deepEqual(first, settleDesign({}, 1, 200, []));
  assert.equal(generateSvg(720, first.layers), generateSvg(720, settleDesign({}, 1, 200, []).layers));
  const changed = settleDesign({}, 1, 200, [], { motif: 'collage' });
  assert.deepEqual({ ...first.answers, motif: 'collage' }, changed.answers, 'forcing one choice must preserve the other draws');
  const next = settleDesign(modelVerdicts(), 0, 201, []);
  const previous = settleDesign(modelVerdicts(), 0, 200, []);
  assert.deepEqual(next.answers, previous.answers, 'first choices retain the model answers across rolls');
  for (let index = 0; index < next.layers.length; index++) assert.notEqual(next.layers[index].seed, previous.layers[index].seed);
  assert.notEqual(generateSvg(720, next.layers), generateSvg(720, previous.layers));
});

test('unknown and inherited choice names cannot bypass the typed inventory through URL pins', () => {
  const rulings: Ruling[] = [];
  const design = settleDesign(modelVerdicts(), 0, 1, rulings, {
    motif: 'none', palette: 'constructor', placement: '__proto__', blend: 'toString', inventedQuestion: 'value',
  });
  assert.equal(design.answers.motif, 'botanical');
  assert.equal(design.answers.palette, 'botanical');
  assert.equal(design.answers.placement, 'background');
  assert.equal(design.answers.blend, 'multiply');
  assert.ok(rulings.every(({ forced }) => !forced));
});

test('offline studies always receive a primary sheet and can explore the whole motif inventory', () => {
  const motifs = new Set<string>();
  for (let seed = 0; seed < 128; seed++) {
    const design = settleDesign({}, 1, seed, []);
    assert.ok(design.layers.length >= 1 && design.layers.length <= 3);
    assert.ok(design.layers.every((layer) => layer.visible && layer.opacity > 0));
    motifs.add(design.layers[0].motif);
  }
  assert.deepEqual([...motifs].sort(), SVG_MOTIFS.map(({ id }) => id).sort());
});

test('online consultation sends typed questions and accounts usage once across concurrent same-look rolls and pins', async (context) => {
  const calls: { url: string; body: { idea: string; brief: string; model: string; questions: Question[] }; signal: AbortSignal | null | undefined }[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  context.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(init.body as string), signal: init.signal });
    await gate;
    return response();
  });
  const usage = noUsage(), controller = new AbortController();
  const decisions = new DesignDecisions('a quiet machine waiting for spring', usage, { model: 'chosen/model', signal: controller.signal }, undefined, direction);
  const firstRulings: Ruling[] = [], secondRulings: Ruling[] = [];
  const first = decisions.plan({ seed: 12, temperature: 0, rulings: firstRulings, mood, look: 'Graphic press' });
  const second = decisions.plan({ seed: 12, temperature: 0, rulings: secondRulings, mood: { ...mood, cheer: 0.1 }, look: 'Graphic press' });
  assert.equal(calls.length, 1, 'simultaneous plans must share the in-flight consultation');
  const { url, body, signal } = calls[0];
  assert.equal(url, '/api/decide');
  assert.equal(body.idea, 'a quiet machine waiting for spring');
  assert.equal(body.model, 'chosen/model');
  assert.ok(decideSchema.safeParse(body).success, 'the complete live SVG request must fit the server schema, including its brief');
  assert.equal(signal, controller.signal);
  assert.deepEqual(body.questions, Object.values(DESIGN_QUESTIONS));
  assert.match(body.brief, /Every illustration receives at least one vector layer/);
  assert.ok(body.brief.includes(direction.brief), 'the direction reaches the model rather than silently overriding its answers');
  for (const medium of ['photography', 'watercolor', 'early 3D games']) assert.ok(body.brief.includes(medium));
  assert.match(body.brief, /Graphic press/);
  assert.ok(body.brief.includes(JSON.stringify(mood)));
  release();
  const [original, repeated] = await Promise.all([first, second]);
  assert.deepEqual(original, repeated);
  assert.equal(original.answers.motif, 'botanical', 'the returned model verdict, not a local heuristic, decides the primary motif');
  assert.equal(original.answers.placement, 'background');
  assert.deepEqual(firstRulings, secondRulings);
  const rolled = await decisions.plan({ seed: 13, temperature: 0, rulings: [], mood, look: 'Graphic press' });
  const pinned = await decisions.plan({ seed: 12, temperature: 0, rulings: [], mood, look: 'Graphic press', forced: { palette: 'solar' } });
  assert.deepEqual(rolled.answers, original.answers);
  assert.notEqual(rolled.layers[0].seed, original.layers[0].seed);
  assert.equal(pinned.answers.palette, 'solar');
  assert.equal(pinned.layers[0].color, '#cf6d43');
  assert.equal(calls.length, 1, 'rerolls and pinned decisions must not ask again');
  assert.equal(usage.requests, 1);
  assert.equal(usage.inputTokens, 321);
  assert.equal(usage.costUsd, 0.00123);
  assert.equal(usage.model, 'test/decision-model');
  assert.ok(usage.milliseconds >= 0);
});

test('changing the selected look consults again and revisiting it restores its accounted model decisions', async (context) => {
  const calls: { brief: string }[] = [];
  context.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    calls.push(body);
    assert.ok(decideSchema.safeParse(body).success, 'each medium-specific request fits the live schema');
    const verdicts = modelVerdicts();
    if (body.brief.includes('Selected look: Watercolor studio.')) {
      verdicts.motif = { type: 'choice', probabilities: { ribbons: 1 } };
      verdicts.palette = { type: 'choice', probabilities: { solar: 1 } };
      verdicts.companion = { type: 'choice', probabilities: { none: 1 } };
      verdicts.annotation = { type: 'noul', p: 0 };
    }
    return response(verdicts);
  });
  const usage = noUsage(), decisions = new DesignDecisions('a quiet machine waiting for spring', usage);
  const roll = { seed: 12, temperature: 0, rulings: [], mood };
  const [press, watercolor] = await Promise.all([
    decisions.plan({ ...roll, look: 'Graphic press' }),
    decisions.plan({ ...roll, look: 'Watercolor studio' }),
  ]);
  assert.equal(calls.length, 2, 'different looks receive independent consultations even when requested concurrently');
  assert.match(calls[0].brief, /Selected look: Graphic press\./);
  assert.match(calls[1].brief, /Selected look: Watercolor studio\./);
  assert.equal(press.answers.motif, 'botanical');
  assert.equal(watercolor.answers.motif, 'ribbons');
  assert.equal(watercolor.answers.palette, 'solar', 'a new look uses its fresh model answers, not inherited art direction');
  assert.equal(watercolor.layers.length, 1, 'the model may remove companions while preserving automatic artwork');
  assert.deepEqual(await decisions.plan({ ...roll, look: 'Graphic press' }), press);
  assert.deepEqual(await decisions.plan({ ...roll, look: 'Watercolor studio' }), watercolor);
  assert.equal(calls.length, 2, 'revisiting either look reuses its cached consultation');
  assert.equal(usage.requests, 2);
  assert.equal(usage.inputTokens, 642);
  assert.equal(usage.costUsd, 0.00246);
});

test('the medium guidance leaves brief capacity for descriptive look titles and full-precision moods', async (context) => {
  let requests = 0;
  context.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
    requests++;
    assert.ok(decideSchema.safeParse(JSON.parse(init.body as string)).success, 'the actual request must fit the 1200-character live brief cap');
    return response();
  });
  const precise = 0.12345678901234567;
  const preciseMood: Mood = { wear: precise, warmth: precise, energy: precise, density: precise, daylight: precise, cheer: precise };
  const decisions = new DesignDecisions('preserve the selected medium', noUsage());
  const design = await decisions.plan({ seed: 12, temperature: 0, rulings: [], mood: preciseMood, look: 'A descriptive look title '.repeat(4) });
  assert.equal(requests, 1);
  assert.ok(design.layers.length > 0);
});

test('offline design consultations never fetch or accrue model usage', async (context) => {
  context.mock.method(globalThis, 'fetch', () => { throw new Error('offline design must not fetch'); });
  const usage = noUsage();
  const decisions = new DesignDecisions('an offline catalogue study', usage, { offline: true });
  const design = await decisions.plan({ seed: 21, temperature: 1, rulings: [], mood });
  assert.ok(design.layers.length >= 1);
  assert.deepEqual(usage, noUsage());
});

test('model failure rejects the design and never silently substitutes a local composition', async (context) => {
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return new Response(JSON.stringify({ error: 'Design model unavailable' }), { status: 503 });
  });
  const usage = noUsage(), rulings: Ruling[] = [];
  const decisions = new DesignDecisions('no hidden fallback', usage);
  await assert.rejects(decisions.plan({ seed: 1, temperature: 0, rulings, mood }), /Design model unavailable/);
  await assert.rejects(decisions.plan({ seed: 2, temperature: 1, rulings, mood }), /Design model unavailable/);
  assert.equal(calls, 1);
  assert.deepEqual(rulings, []);
  assert.deepEqual({ ...usage, milliseconds: 0 }, noUsage(), 'a failed response adds no reported model usage');
  assert.ok(usage.milliseconds >= 0, 'attempted chains still record their elapsed time');
});

const library = (fail = false) => {
  const summary = { id: 'biscuit-ab12', name: 'Biscuit, my dog', width: 4, height: 4, createdAt: '', colours: ['#a0703c'], darkBackground: false, bytes: 10 };
  const image = { id: 'biscuit-ab12', name: 'Biscuit, my dog', width: 4, height: 4, shapes: [{ d: 'M 0 0 L 4 0 L 4 4 Z', fill: '#a0703c', tone: 0.4, background: false }] };
  return { list: () => [summary], get: async () => (fail ? null : image) };
};

test('an empty trace library adds no questions and leaves every draw as it was', () => {
  const plain: Ruling[] = [], empty: Ruling[] = [];
  const a = settleDesign(modelVerdicts(), 1, 77, plain);
  const b = settleDesign(modelVerdicts(), 1, 77, empty, {}, []);
  assert.deepEqual(a, b);
  assert.deepEqual(plain.map((ruling) => ruling.name), empty.map((ruling) => ruling.name));
  assert.equal(a.trace, undefined);
});

test('a chosen trace becomes a sheet in the composition inks, placed and sized by its answers', async () => {
  const traces = library().list();
  const rulings: Ruling[] = [];
  const plan = settleDesign(modelVerdicts(), 0, 77, rulings, { traceSheet: 'biscuit-ab12', traceStyle: 'ink', traceSpot: 'left', traceSize: 1 }, traces);
  assert.deepEqual(plan.trace, { id: 'biscuit-ab12', name: 'Biscuit, my dog', style: 'ink', x: 0.3, y: 0.55, size: 1.05 });
  assert.match(plan.notes[0], /Biscuit, my dog.*ink sheet/);
  assert.ok(rulings.some((ruling) => ruling.name === 'traceSheet' && ruling.forced));
  const first = rulings.findIndex((ruling) => ruling.name === 'traceSheet');
  assert.ok(first > rulings.findIndex((ruling) => ruling.name === 'annotation'), 'trace questions come after the motif questions');
  const layer = traceLayer(plan, (await library().get())!, 77)!;
  assert.equal(layer.motif, 'trace');
  assert.equal(layer.color, plan.layers[0].color);
  assert.ok(layer.opacity >= 0.55);
  assert.match(generateSvg(720, [layer]), /data-motif="trace"/);
  const ghost = settleDesign(modelVerdicts(), 0, 77, [], { traceSheet: 'biscuit-ab12', traceStyle: 'ghost', traceSpot: 'corner' }, traces);
  assert.equal(ghost.trace?.size, 0.25, 'a corner stamp is small');
  assert.equal(traceLayer(ghost, (await library().get())!, 77)!.blend, 'multiply');
  const ignored: Ruling[] = [];
  settleDesign(modelVerdicts(), 0, 77, ignored, { traceSheet: 'not-in-library' }, traces);
  assert.equal(ignored.find((ruling) => ruling.name === 'traceSheet')?.forced, undefined, 'a pin outside the library is not applied');
});

test('the design consultation asks about traces only when there are some, and a missing trace drops out', async (context) => {
  const bodies: { questions: Question[] }[] = [];
  context.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string) as { questions: Question[] };
    decideSchema.parse(body);
    bodies.push(body);
    const verdicts = body.questions.map((question): Verdict => question.type === 'choice'
      ? { type: 'choice', probabilities: Object.fromEntries(Object.keys(question.options).map((key) => [key, key === 'biscuit-ab12' ? 0.9 : 0.1])) }
      : question.type === 'score' ? { type: 'score', value: 0.5, probabilities: question.levels.map(() => 1 / question.levels.length) } : { type: 'noul', p: 0.2 });
    return new Response(JSON.stringify({ model: 'test', inputTokens: 1, costUsd: 0, verdicts }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  const roll = { seed: 5, temperature: 0, rulings: [] as Ruling[], mood, look: 'Graphic press' };
  const plan = await new DesignDecisions('Biscuit chasing gulls', noUsage(), {}, library()).plan(roll);
  assert.ok(bodies[0].questions.some((question) => question.ask.startsWith('Which of your traced pictures')));
  assert.equal(plan.layers.at(-1)!.motif, 'trace');
  const none = await new DesignDecisions('Biscuit chasing gulls', noUsage(), {}).plan({ ...roll, rulings: [] });
  assert.ok(!bodies.at(-1)!.questions.some((question) => question.ask.startsWith('Which of your traced pictures')));
  assert.ok(none.layers.every((layer) => layer.motif !== 'trace'));
  const missing = await new DesignDecisions('Biscuit chasing gulls', noUsage(), {}, library(true)).plan({ ...roll, rulings: [] });
  assert.equal(missing.trace, undefined);
  assert.ok(missing.layers.every((layer) => layer.motif !== 'trace'));
  assert.ok(!missing.notes.some((note) => note.startsWith('Your traced picture')));
});

test('the design brief carries the direction and stays under the cap even for an opposite reading', async () => {
  const { designBrief } = await import('../engine/design');
  const { OPPOSITE_NOTE } = await import('../engine/oracle');
  const { MAX_BRIEF_CHARACTERS } = await import('../engine/decision-limits');
  const precise = 0.12345678901234567;
  const preciseMood: Mood = { wear: precise, warmth: precise, energy: precise, density: precise, daylight: precise, cheer: precise };
  const plain = designBrief('Old master light', preciseMood, undefined, direction);
  assert.ok(plain.includes(direction.brief));
  assert.ok(plain.includes('"wear":0.12'), 'moods are rounded so they do not crowd the direction out');
  const undirected = designBrief('Old master light', preciseMood);
  assert.ok(!undirected.includes('Direction:') && !/\s{2}/.test(undirected), 'a plain study adds no direction and no stray spaces');
  const wide: Direction = { brief: `Direction: ${'a very long brief '.repeat(26)}`, note: direction.note, finishes: [] };
  for (const look of ['Old master light', 'A descriptive look title '.repeat(8)]) {
    const opposite = designBrief(look, preciseMood, (brief) => `${OPPOSITE_NOTE} ${brief}`, wide);
    assert.ok(opposite.length <= MAX_BRIEF_CHARACTERS, `${opposite.length} characters`);
    assert.ok(opposite.startsWith(OPPOSITE_NOTE));
    assert.ok(opposite.includes(wide.brief) || opposite.includes(wide.note), 'the direction falls back to its note rather than being dropped');
  }
});
