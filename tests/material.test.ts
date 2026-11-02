import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import type { Capture } from '../kit/contract';
import { BACKDROP_MATERIALS, MATERIALS, MATERIAL_NAMES, impliedMaterial, isMaterial, madeOf, material, materialByte, materialOfByte, surfaceAt, type MaterialName } from '../kit/material';
import { MATERIAL_COOLING, WORLD_MATERIAL_QUESTIONS, materialOf, materialQuestionsFor, materialWords, refinish, thingMaterialQuestions } from '../engine/material';
import { MATERIALIZE_FLOOR, MATERIALIZE_NAMES, MATERIALIZE_QUESTIONS, applyMaterialize, materializeOf } from '../engine/materialize';
import { surfaceBytes } from '../engine/capture';
import { decideSchema } from '../server/decision-schema';
import { replayOf } from '../src/replay';
import { ATELIER_MATERIALS } from '../kit/atelier-materials';

const named = (name: MaterialName) => MATERIAL_NAMES.indexOf(name) + 1;

/**
 * A flat backdrop, a lit floor and a sphere-like hero (normals bulging toward the viewer, lit from
 * the upper left) whose left half is one material and right half another; a print of mid grey with
 * darker subjects, so lifts and sinks are both visible.
 */
function scene(size = 120, left: MaterialName | null = null, right: MaterialName | null = null, backdrop?: MaterialName): { capture: Capture; print: Uint8ClampedArray } {
  const count = size * size;
  const identity = new Uint8Array(count * 4), normal = new Uint8ClampedArray(count * 4), diffuse = new Uint8Array(count * 4), material = new Uint8Array(count * 4), depth = new Uint8Array(count * 4);
  const print = new Uint8ClampedArray(count * 4);
  const cx = size * 0.5, cy = size * 0.45, radius = size * 0.28;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x, p = i * 4;
    const dx = (x - cx) / radius, dy = (cy - y) / radius, inside = dx * dx + dy * dy < 1;
    let id = y > size * 0.8 ? 1 : 0;
    if (inside) id = 3;
    identity[p] = id;
    const nz = inside ? Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy)) : id === 1 ? 0.5 : 1;
    const nx = inside ? dx : 0, ny = inside ? dy : id === 1 ? 0.86 : 0;
    normal[p] = Math.round((nx * 0.5 + 0.5) * 255); normal[p + 1] = Math.round((ny * 0.5 + 0.5) * 255); normal[p + 2] = Math.round((nz * 0.5 + 0.5) * 255);
    const lit = Math.max(0, nx * -0.45 + ny * 0.5 + nz * 0.74);
    diffuse[p] = diffuse[p + 1] = diffuse[p + 2] = id ? Math.round(40 + 200 * lit) : 0;
    const which = inside ? (x < cx ? left : right) : null;
    if (id) {
      // Plain diffuse surfaces unless named: metalness 0, roughness 0.8.
      material[p] = 0; material[p + 1] = which ? Math.round(MATERIALS[which].roughness * 255) : 204; material[p + 2] = which ? named(which) : 0; material[p + 3] = 0;
      if (which) material[p] = Math.round(MATERIALS[which].metalness * 255);
    }
    const tone = id === 3 ? 70 + 60 * lit : id === 1 ? 170 : 215;
    print[p] = tone; print[p + 1] = tone - 4; print[p + 2] = tone - 10; print[p + 3] = 255;
  }
  return { capture: { size, color: new Uint8ClampedArray(print), normal, depth, identity, diffuse, material, ...(backdrop ? { backdrop } : {}), near: 0.1, far: 100, pixelWorldSize: 0.01, light: [-0.45, -0.5, 0.74], baseColors: [] }, print };
}
const inside = (capture: Capture, id: number) => { const at: number[] = []; for (let i = 0; i < capture.size * capture.size; i++) if (capture.identity[i * 4] === id) at.push(i); return at; };
const meanLuma = (pixels: Uint8ClampedArray, at: number[]) => at.reduce((sum, i) => sum + pixels[i * 4] * 0.2126 + pixels[i * 4 + 1] * 0.7152 + pixels[i * 4 + 2] * 0.0722, 0) / (at.length || 1);
const changed = (a: Uint8ClampedArray, b: Uint8ClampedArray, at: number[]) => at.filter((i) => a[i * 4] !== b[i * 4] || a[i * 4 + 1] !== b[i * 4 + 1] || a[i * 4 + 2] !== b[i * 4 + 2]).length;

test('the material vocabulary is shared, typed, and fits the live schema', () => {
  assert.equal(MATERIAL_NAMES.length, 12);
  for (const name of BACKDROP_MATERIALS) assert.ok(isMaterial(name));
  assert.ok(!isMaterial('constructor') && !isMaterial('__proto__') && !isMaterial(3));
  for (const name of MATERIAL_NAMES) assert.equal(materialOfByte(materialByte(name)), name);
  assert.equal(materialByte('as-made'), 0);
  assert.equal(materialOfByte(0), null);
  assert.equal(materialOfByte(200), null);
  const question = material('What is the blade made of?', ['chrome', 'brushed']);
  assert.deepEqual(Object.keys(question.options), ['chrome', 'brushed']);
  decideSchema.parse({ idea: 'x', brief: 'y', questions: [question, ...Object.values(thingMaterialQuestions('Teapot')), ...Object.values(WORLD_MATERIAL_QUESTIONS), ...Object.values(MATERIALIZE_QUESTIONS)] });
  assert.ok(thingMaterialQuestions('Teapot').materialBody.ask.includes('the teapot'));
  assert.deepEqual(Object.keys(thingMaterialQuestions('x').materialBody.options), ['as-made', ...MATERIAL_NAMES, ...Object.keys(ATELIER_MATERIALS)]);
  assert.deepEqual(Object.keys(WORLD_MATERIAL_QUESTIONS.materialSky.options), ['as-made', ...BACKDROP_MATERIALS]);
  assert.deepEqual(Object.keys(materialQuestionsFor({ kind: 'thing', title: 'Chair' })), ['materialBody']);
  assert.deepEqual(Object.keys(materialQuestionsFor({ kind: 'world', title: 'Hall' })), ['materialBody', 'materialSky']);
  assert.deepEqual(materialQuestionsFor({ kind: 'look', title: 'Ink' }), {});
  assert.ok(MATERIAL_COOLING < 1);
  assert.deepEqual(MATERIALIZE_NAMES, ['materialize']);
});

test('material answers read back with as-made and nonsense left out', () => {
  assert.deepEqual(materialOf({ materialBody: 'velvet', materialSky: 'glitter' }), { body: 'velvet', sky: 'glitter' });
  assert.deepEqual(materialOf({ materialBody: 'as-made', materialSky: 'as-made' }), undefined);
  assert.deepEqual(materialOf({ materialBody: 'constructor', materialSky: 'velvet' }), { sky: 'velvet' });
  assert.equal(materialWords({ body: 'chrome', sky: 'glitter' }), 'of chrome, under a glitter backdrop');
  assert.deepEqual(materializeOf({ materialize: 0.7 }), { weight: 0.7 });
  assert.deepEqual(materializeOf({ materialize: 'x' }), { weight: 0 });
  assert.deepEqual(materializeOf({ materialize: 4 }), { weight: 1 });
});

test('madeOf tags a material for the capture and sets its surface to suit', () => {
  const standard = madeOf(new THREE.MeshStandardMaterial({ color: '#2040c0', roughness: 0.7 }), 'chrome');
  assert.equal(standard.userData.material, 'chrome');
  assert.equal(standard.metalness, 1);
  assert.ok(standard.roughness < 0.1);
  const glass = madeOf(new THREE.MeshStandardMaterial({ color: '#ffffff' }), 'glass');
  assert.ok(glass.transparent && glass.opacity <= 0.55);
  const lamp = madeOf(new THREE.MeshStandardMaterial({ color: '#ff8800' }), 'glow');
  assert.ok(lamp.emissive.r > 0.9 && lamp.emissiveIntensity >= 1, 'a luminous surface glows in its own colour');
  const basic = madeOf(new THREE.MeshBasicMaterial({ color: '#ffffff' }), 'velvet');
  assert.equal(basic.userData.material, 'velvet');
});

test('the capture pass reads every kind of material as four bytes', () => {
  const [metal, rough, which, glow] = surfaceBytes(new THREE.MeshStandardMaterial({ metalness: 1, roughness: 0.25 }));
  assert.equal(metal, 255);
  assert.ok(Math.abs(rough - 64) <= 4);
  assert.equal(which, 0);
  assert.equal(glow, 0);
  assert.equal(surfaceBytes(madeOf(new THREE.MeshStandardMaterial(), 'leather'))[2], named('leather'));
  assert.ok(surfaceBytes(new THREE.MeshStandardMaterial({ emissive: '#ffffff', emissiveIntensity: 2 }))[3] === 255);
  const phong = surfaceBytes(new THREE.MeshPhongMaterial({ shininess: 400, specular: '#ffffff' }));
  assert.ok(phong[1] < 10 && phong[0] > 200, 'a hard, bright Phong reads as polished metal');
  const flat = surfaceBytes(new THREE.MeshBasicMaterial());
  assert.deepEqual(flat, [0, 255, 0, 0]);
  const lacquer = new THREE.MeshPhysicalMaterial({ roughness: 0.9, clearcoat: 1, clearcoatRoughness: 0 });
  assert.ok(surfaceBytes(lacquer)[1] < 40, 'a clear coat shines whatever lies beneath');
});

test('surfaceAt decodes a pixel, the backdrop, and captures without materials', () => {
  const { capture } = scene(40, 'velvet', null, 'glitter');
  const hero = inside(capture, 3);
  const leftmost = hero.reduce((best, i) => (i % 40 < best % 40 ? i : best));
  assert.deepEqual(surfaceAt(capture, leftmost).material, 'velvet');
  const rightmost = hero.reduce((best, i) => (i % 40 > best % 40 ? i : best));
  const plain = surfaceAt(capture, rightmost);
  assert.equal(plain.material, null);
  assert.ok(Math.abs(plain.roughness - 0.8) < 0.01);
  assert.equal(surfaceAt(capture, 0).material, 'glitter', 'the backdrop reports the setting’s backdrop material');
  assert.equal(surfaceAt({ ...capture, backdrop: undefined }, 0).material, null);
  assert.deepEqual(surfaceAt({ identity: capture.identity }, leftmost), { material: null, metalness: 0, roughness: 1, glow: 0 });
});

test('a build implies shine, sparkle and light but never flatness', () => {
  assert.equal(impliedMaterial({ material: 'matte', metalness: 0, roughness: 0.1, glow: 0 })?.name, 'matte');
  assert.equal(impliedMaterial({ material: null, metalness: 1, roughness: 0.05, glow: 0 })?.name, 'chrome');
  assert.equal(impliedMaterial({ material: null, metalness: 0.9, roughness: 0.5, glow: 0 })?.name, 'brushed');
  assert.equal(impliedMaterial({ material: null, metalness: 0, roughness: 0.1, glow: 0 })?.name, 'gloss');
  assert.equal(impliedMaterial({ material: null, metalness: 0, roughness: 0.4, glow: 0 })?.name, 'satin');
  assert.equal(impliedMaterial({ material: null, metalness: 0, roughness: 0.3, glow: 0.8 })?.name, 'glow');
  assert.equal(impliedMaterial({ material: null, metalness: 0, roughness: 0.8, glow: 0 }), null, 'an ordinary diffuse surface is left alone');
  assert.equal(impliedMaterial({ material: null, metalness: 0, roughness: 1, glow: 0 }), null);
  assert.equal(impliedMaterial({ material: null, metalness: 1, roughness: 1, glow: 0 }), null);
  const strong = impliedMaterial({ material: null, metalness: 1, roughness: 0.02, glow: 0 })!.strength;
  const faint = impliedMaterial({ material: null, metalness: 1, roughness: 0.25, glow: 0 })!.strength;
  assert.ok(strong > faint && faint > 0 && strong <= 1);
});

/** A body (big) and a trim (small) part, in different colours, plus a small window. */
function object(shared?: THREE.MeshStandardMaterial) {
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), shared ?? new THREE.MeshStandardMaterial({ color: '#2f6fb0', roughness: 0.8 }));
  const trim = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshStandardMaterial({ color: '#dddddd' }));
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: '#88ccff', transparent: true, opacity: 0.3 }));
  root.add(body, trim, glass);
  return { root, body, trim, glass };
}

test('refinish dresses the body in the material and leaves trim and glass alone', () => {
  const { root, body, trim, glass } = object();
  const free = refinish(root, { body: 'chrome' });
  const dressed = body.material as THREE.MeshStandardMaterial;
  assert.equal(dressed.userData.material, 'chrome');
  assert.equal(dressed.metalness, 1);
  assert.equal((trim.material as THREE.MeshStandardMaterial).userData.material, undefined);
  assert.equal((glass.material as THREE.MeshStandardMaterial).userData.material, undefined);
  free();
});

test('a glass body is dressed too: solid again as chrome, still clear as glass', () => {
  const pane = () => new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), new THREE.MeshStandardMaterial({ color: '#a1b8ad', transparent: true, opacity: 0.42 }));
  const chrome = pane();
  refinish(new THREE.Group().add(chrome), { body: 'chrome' });
  const solid = chrome.material as THREE.MeshStandardMaterial;
  assert.equal(solid.userData.material, 'chrome');
  assert.ok(!solid.transparent && solid.opacity === 1, 'a chrome teapot is no longer see-through');
  const glass = pane();
  refinish(new THREE.Group().add(glass), { body: 'glass' });
  const clear = glass.material as THREE.MeshStandardMaterial;
  assert.ok(clear.transparent && clear.opacity <= 0.42, 'glass stays clear');
});

test('refinish clones a shared material, and dresses a whole setting when asked', () => {
  const shared = new THREE.MeshStandardMaterial({ color: '#2f6fb0' });
  const { root, body, trim } = object(shared);
  refinish(root, { body: 'glitter' }, true);
  assert.notEqual(body.material, shared);
  assert.equal(shared.userData.material, undefined);
  assert.equal((body.material as THREE.MeshStandardMaterial).userData.material, 'glitter');
  assert.equal((trim.material as THREE.MeshStandardMaterial).userData.material, 'glitter', 'a setting is dressed throughout');
  assert.ok((body.material as THREE.MeshStandardMaterial).normalMap, 'glitter carries a sparkle relief for the live render');
  assert.equal(refinish(root, {})(), undefined);
});

test('the materialize pass repeats, leaves its input alone, skips flat weights and plain scenes', () => {
  const { capture, print } = scene(100, 'chrome', 'velvet', 'glitter');
  const before = new Uint8ClampedArray(print);
  const first = applyMaterialize(print, capture, { weight: 1 }, 7), again = applyMaterialize(print, capture, { weight: 1 }, 7);
  assert.deepEqual(first.pixels, again.pixels);
  assert.deepEqual(print, before);
  assert.match(first.note, /^Materials at 100%: /);
  assert.ok(first.note.includes('glitter backdrop'));
  const flat = applyMaterialize(print, capture, { weight: MATERIALIZE_FLOOR / 2 }, 7);
  assert.equal(flat.pixels, print);
  const plain = applyMaterialize(print, scene(100).capture, { weight: 1 }, 7);
  assert.equal(plain.pixels, print);
  assert.match(plain.note, /plain/);
  const old = applyMaterialize(print, { ...capture, material: undefined, backdrop: undefined }, { weight: 1 }, 7);
  assert.equal(old.pixels, print);
});

test('each material changes only its own surface, and a lighter weight changes less', () => {
  for (const name of MATERIAL_NAMES) {
    const { capture, print } = scene(100, name, null);
    const hero = inside(capture, 3);
    const left = hero.filter((i) => i % 100 < 50), right = hero.filter((i) => i % 100 >= 50);
    const full = applyMaterialize(print, capture, { weight: 1 }, 3).pixels;
    assert.ok(changed(print, full, left) > left.length * 0.3, `${name} shows on its surface (${changed(print, full, left)} of ${left.length})`);
    // A luminous surface is the one material that reaches beyond itself: its halo.
    if (name !== 'glow') {
      assert.equal(changed(print, full, right), 0, `${name} leaves the plain half alone`);
      assert.equal(changed(print, full, inside(capture, 0)), 0, `${name} leaves the backdrop alone`);
    }
    const light = applyMaterialize(print, capture, { weight: 0.35 }, 3).pixels;
    const drift = (pixels: Uint8ClampedArray) => left.reduce((sum, i) => sum + Math.abs(pixels[i * 4] - print[i * 4]), 0);
    assert.ok(drift(light) < drift(full), `${name} at a hint moves less than fully`);
  }
});

test('shine lifts, chalk and velvet sink, glitter twinkles with the phase, and glow haloes beyond its surface', () => {
  const { capture, print } = scene(100, 'gloss', 'matte');
  const hero = inside(capture, 3);
  const left = hero.filter((i) => i % 100 < 50), right = hero.filter((i) => i % 100 >= 50);
  const shown = applyMaterialize(print, capture, { weight: 1 }, 5).pixels;
  const brightest = (pixels: Uint8ClampedArray, at: number[]) => Math.max(...at.map((i) => pixels[i * 4]));
  assert.ok(brightest(shown, left) > brightest(print, left) + 40, 'gloss adds a hard highlight');
  assert.ok(brightest(shown, right) <= brightest(print, right) + 12, 'matte gains no highlight');
  const velvet = scene(100, 'velvet', null);
  const dressed = applyMaterialize(velvet.print, velvet.capture, { weight: 1 }, 5).pixels;
  const facing = inside(velvet.capture, 3).filter((i) => i % 100 < 50 && velvet.capture.normal[i * 4 + 2] > 250);
  assert.ok(meanLuma(dressed, facing) < meanLuma(velvet.print, facing), 'velvet darkens where it faces the viewer');
  const glitter = scene(100, 'glitter', null, 'glitter');
  // A black backdrop: glitter on black is a sky of stars. (On pale paper it prints as dark sequins.)
  for (const i of inside(glitter.capture, 0)) glitter.print[i * 4] = glitter.print[i * 4 + 1] = glitter.print[i * 4 + 2] = 16;
  const still = applyMaterialize(glitter.print, glitter.capture, { weight: 1 }, 5, 0).pixels;
  const later = applyMaterialize(glitter.print, glitter.capture, { weight: 1 }, 5, 0.4).pixels;
  const round = applyMaterialize(glitter.print, glitter.capture, { weight: 1 }, 5, 1).pixels;
  assert.ok(changed(still, later, inside(glitter.capture, 0)) > 0, 'the stars twinkle as the phase moves');
  assert.deepEqual(round, still, 'a loop returns to its first frame');
  const backdrop = inside(glitter.capture, 0);
  assert.ok(backdrop.some((i) => still[i * 4] > 200), 'stars shine on the backdrop');
  const glow = scene(100, 'glow', null);
  const lit = applyMaterialize(glow.print, glow.capture, { weight: 1 }, 5).pixels;
  const ring = inside(glow.capture, 0).filter((i) => { const x = i % 100, y = (i / 100) | 0; return Math.hypot(x - 50, y - 45) < 32; });
  assert.ok(changed(glow.print, lit, ring) > ring.length * 0.3, 'a luminous surface haloes into its surroundings');
});

test('the pass works in the print’s own inks: a toner print stays a toner print', () => {
  const { capture, print } = scene(100, 'chrome', 'gloss');
  // Repaint the print as a two-colour toner: hot orange on near black.
  for (let i = 0; i < print.length; i += 4) { const dark = print[i] < 120; print[i] = dark ? 20 : 236; print[i + 1] = dark ? 12 : 91; print[i + 2] = dark ? 18 : 47; }
  const shown = applyMaterialize(print, capture, { weight: 1 }, 9).pixels;
  for (const i of inside(capture, 3)) {
    const [r, g, b] = [shown[i * 4], shown[i * 4 + 1], shown[i * 4 + 2]];
    // Everything added lies between the print's ink and a lift of its paper toward white: no foreign hue.
    assert.ok(g <= r + 8 && b <= r + 8, `pixel ${i} stays in the toner's warmth: ${r},${g},${b}`);
  }
});

test('a replay of a picture made before materials keeps every surface as built and prints flat', () => {
  const old = replayOf({ idea: 'a lamp', world: { id: 'worlds/plinth' }, cast: [{ id: 'things/lamp' }], rulings: [{ owner: 'direction', name: 'cheer', picked: 'Neutral', confidence: 0.5, kind: 'score' }] });
  assert.equal(old.force['worlds/plinth::materialBody'], 'as-made');
  assert.equal(old.force['worlds/plinth::materialSky'], 'as-made');
  assert.equal(old.force['things/lamp::materialBody'], 'as-made');
  assert.equal(old.force['direction::materialize'], 'none');
  const fresh = replayOf({ idea: 'a lamp', world: { id: 'worlds/plinth' }, cast: [{ id: 'things/lamp' }], rulings: [
    { owner: 'things/lamp', name: 'materialBody', picked: 'glass', confidence: 0.6, kind: 'choice' },
    { owner: 'direction', name: 'materialize', picked: 'Clearly', confidence: 0.67, kind: 'score' },
  ] });
  assert.equal(fresh.force['things/lamp::materialBody'], 'glass');
  assert.equal(fresh.force['direction::materialize'], 0.67);
  assert.equal(fresh.force['worlds/plinth::materialBody'], undefined);
});
