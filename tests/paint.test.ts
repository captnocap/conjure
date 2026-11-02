import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { PAINTS, paint, paintHex } from '../kit/paint';
import { WORLD_PAINT_QUESTIONS, paintOf, paintQuestionsFor, relight, repaint, thingPaintQuestions } from '../engine/paint';

const SRGB = THREE.SRGBColorSpace;
const hueOf = (colour: THREE.Color) => colour.getHSL({ h: 0, s: 0, l: 0 }, SRGB).h;

/** A body (big) and a trim (small) part, in different colours. */
function object(shared?: THREE.MeshStandardMaterial) {
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), shared ?? new THREE.MeshStandardMaterial({ color: '#2f6fb0' }));
  const trim = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshStandardMaterial({ color: '#dddddd' }));
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial({ color: '#88ccff', transparent: true, opacity: 0.3 }));
  root.add(body, trim, glass);
  return { root, body, trim, glass };
}

test('the main colour takes the largest surfaces and leaves the rest as made', () => {
  const { root, body, trim } = object();
  repaint(root, { body: 'red' });
  const colour = (body.material as THREE.MeshStandardMaterial).color;
  assert.ok(Math.abs(hueOf(colour) - hueOf(new THREE.Color(PAINTS.red.hex))) < 0.03 || hueOf(colour) > 0.97);
  assert.equal((trim.material as THREE.MeshStandardMaterial).color.getHexString(SRGB), 'dddddd');
});

test('the trim colour takes the smaller surfaces', () => {
  const { root, trim } = object();
  repaint(root, { body: 'red', trim: 'black' });
  assert.ok((trim.material as THREE.MeshStandardMaterial).color.getHSL({ h: 0, s: 0, l: 0 }, SRGB).l < 0.2);
});

test('glass and veils are never repainted', () => {
  const { root, glass } = object();
  repaint(root, { body: 'red', trim: 'black' });
  assert.equal((glass.material as THREE.MeshStandardMaterial).color.getHexString(SRGB), '88ccff');
});

test('a shared material is cloned, never changed for its other users', () => {
  const shared = new THREE.MeshStandardMaterial({ color: '#2f6fb0' });
  const { root, body } = object(shared);
  const free = repaint(root, { body: 'green' });
  assert.notEqual(body.material, shared);
  assert.equal(shared.color.getHexString(SRGB), '2f6fb0');
  free();
});

test('vertex colours are moved onto the swatch on a copy of the geometry', () => {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const colors = new Float32Array(geometry.attributes.position.count * 3).fill(0.2);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true }));
  const root = new THREE.Group().add(mesh);
  repaint(root, { body: 'yellow' });
  assert.notEqual(mesh.geometry, geometry);
  assert.equal(colors[0], Math.fround(0.2));
  const moved = mesh.geometry.getAttribute('color');
  const colour = new THREE.Color(moved.getX(0), moved.getY(0), moved.getZ(0));
  assert.ok(Math.abs(hueOf(colour) - hueOf(new THREE.Color(PAINTS.yellow.hex))) < 0.03);
});

test('metal swatches make the surface metallic', () => {
  const { root, body } = object();
  repaint(root, { body: 'gold' });
  assert.ok((body.material as THREE.MeshStandardMaterial).metalness >= 0.85);
});

test('a world takes the coloured light and sky', () => {
  const object = new THREE.Group();
  const light = new THREE.DirectionalLight('#ffffff', 2);
  object.add(light);
  const background = relight({ object, background: new THREE.Color('#e4e4dc') }, { light: 'magenta', sky: 'violet' as never });
  assert.ok(light.color.g < light.color.r);
  assert.equal(background.getHexString(SRGB), 'e4e4dc', 'an unknown sky leaves the backdrop');
  const pink = relight({ object, background: new THREE.Color('#e4e4dc') }, { sky: 'pink' });
  assert.ok(pink.r > pink.g);
});

test('a second colour alone is not applied', () => {
  assert.deepEqual(paintOf({ paintBody: 'as-made', paintTrim: 'black' }), undefined);
  assert.deepEqual(paintOf({ paintBody: 'red', paintTrim: 'black' }), { body: 'red', trim: 'black' });
  assert.deepEqual(paintOf({ paintBody: 'as-made', paintTrim: 'as-made', paintLight: 'pink', paintSky: 'as-made' }), { light: 'pink' });
});

test('colour questions keep "as made" first, name the thing, and fit the decision schema', () => {
  const longest = { kind: 'thing', title: 'X'.repeat(120) };
  for (const entry of [longest, { kind: 'world', title: 'Any setting' }]) {
    const questions = paintQuestionsFor(entry);
    for (const question of Object.values(questions)) {
      assert.equal(question.type, 'choice');
      if (question.type !== 'choice') continue;
      assert.equal(Object.keys(question.options)[0], 'as-made');
      assert.ok(question.ask.length <= 600, `${entry.kind}: ${question.ask.length}`);
    }
  }
  assert.match(thingPaintQuestions('Bicycle').paintBody.ask, /the bicycle/);
  assert.ok(!('metal' in Object.keys(WORLD_PAINT_QUESTIONS.paintLight.options)));
  assert.deepEqual(Object.keys(paintQuestionsFor({ kind: 'look', title: 'x' })), []);
});

test('components can ask in the same colours', () => {
  const question = paint('What colour is the neon?', ['magenta', 'turquoise']);
  assert.deepEqual(Object.keys(question.options), ['magenta', 'turquoise']);
  assert.equal(paintHex('magenta'), PAINTS.magenta.hex);
  assert.equal(paintHex('nonsense', '#123456'), '#123456');
});
