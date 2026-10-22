import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { type BuildContext, NATURAL_FRAMING, type Placeable } from '../kit/contract';
import { diorama } from '../kit/diorama';
import { seeded } from '../kit/random';
import { FRAMING_QUESTIONS, adjustFraming, framingOf } from '../engine/framing';
import type { Ruling } from '../engine/settle';
import { decideSchema } from '../server/decision-schema';

const context = (framing?: BuildContext['framing']): BuildContext => ({
  idea: 'a framing check',
  mood: { wear: 0.3, warmth: 0.5, energy: 0.4, density: 0.5, daylight: 0.5, cheer: 0.5 },
  scale: 'room',
  seed: 7,
  random: seeded(7),
  ...(framing ? { framing } : {}),
});

const placeable = (): Placeable => {
  const holder = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1.4, 1), new THREE.MeshStandardMaterial());
  mesh.position.y = 0.7;
  holder.add(mesh);
  return { holder, radius: 0.5, height: 1.4, hero: true };
};

/** Build the stock diorama with one thing and read back where its camera ended up. */
function framed(framing?: BuildContext['framing']) {
  const { world } = diorama(context(framing));
  const item = placeable();
  world.object.add(item.holder);
  world.place([item]);
  const camera = world.camera as THREE.OrthographicCamera;
  camera.updateMatrixWorld(true);
  const direction = camera.getWorldDirection(new THREE.Vector3()).negate();
  // A level camera's right-hand axis is horizontal; a tilted one lifts it.
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const centreOfFrame = item.holder.position.clone().applyMatrix4(camera.matrixWorldInverse);
  world.dispose();
  return { pitch: Math.asin(direction.y), yaw: Math.atan2(direction.x, direction.z), extent: camera.right, roll: Math.asin(right.y), heroX: centreOfFrame.x };
}

test('the framing questions are typed and fit the live request schema', () => {
  assert.deepEqual(Object.keys(FRAMING_QUESTIONS), ['elevation', 'distance', 'turn', 'anchor', 'level']);
  decideSchema.parse({ idea: 'x', brief: 'y', questions: Object.values(FRAMING_QUESTIONS) });
  for (const name of ['elevation', 'distance', 'turn'] as const) assert.equal(FRAMING_QUESTIONS[name].levels.length, 5);
});

test('settled answers map onto the framing contract, and missing answers mean the natural view', () => {
  assert.deepEqual(framingOf({}), NATURAL_FRAMING);
  assert.deepEqual(framingOf({ elevation: 1, distance: 0, turn: 0, anchor: 'left', level: 'tilted' }), { elevation: 1, distance: 0, turn: -1, tilt: 1, anchor: 'left' });
  assert.equal(framingOf({ turn: 1 }).turn, 1);
  assert.equal(framingOf({ anchor: 'sideways' }).anchor, 'centre');
  assert.equal(framingOf({ elevation: 'high' }).elevation, 0.5);
});

test('a world without framing frames exactly as it did before', () => {
  const natural = framed();
  const explicit = framed({ ...NATURAL_FRAMING });
  assert.deepEqual(natural, explicit);
  assert.ok(Math.abs(natural.pitch - 32 * Math.PI / 180) < 1e-6);
  assert.ok(Math.abs(natural.yaw - 28 * Math.PI / 180) < 1e-6);
  assert.ok(Math.abs(natural.roll) < 1e-9);
});

test('elevation raises the camera, distance widens the frame, turn swings it and anchor shifts the hero', () => {
  const natural = framed();
  const high = framed({ ...NATURAL_FRAMING, elevation: 1 });
  const low = framed({ ...NATURAL_FRAMING, elevation: 0 });
  assert.ok(high.pitch > natural.pitch && natural.pitch > low.pitch);
  assert.ok(low.pitch >= 12 * Math.PI / 180 - 1e-6 && high.pitch <= 68 * Math.PI / 180 + 1e-6);
  const far = framed({ ...NATURAL_FRAMING, distance: 1 });
  const near = framed({ ...NATURAL_FRAMING, distance: 0 });
  assert.ok(far.extent > natural.extent && natural.extent > near.extent);
  const left = framed({ ...NATURAL_FRAMING, turn: -1 });
  const right = framed({ ...NATURAL_FRAMING, turn: 1 });
  assert.ok(left.yaw < natural.yaw && natural.yaw < right.yaw);
  const anchoredLeft = framed({ ...NATURAL_FRAMING, anchor: 'left' });
  const anchoredRight = framed({ ...NATURAL_FRAMING, anchor: 'right' });
  assert.ok(anchoredLeft.heroX < natural.heroX && natural.heroX < anchoredRight.heroX);
  const tilted = framed({ ...NATURAL_FRAMING, tilt: 1 });
  assert.ok(Math.abs(tilted.roll) > 0.1);
});

test('a plate may move the camera and the rulings say so without claiming the model chose it', () => {
  const rulings: Ruling[] = [
    { owner: 'direction', name: 'distance', ask: 'How close?', picked: 'The whole scene, comfortably framed', confidence: 0.6, alternatives: [], kind: 'score' },
    { owner: 'direction', name: 'level', ask: 'Level?', picked: 'level', confidence: 0.9, alternatives: [], kind: 'choice' },
  ];
  const adjusted = adjustFraming({ ...NATURAL_FRAMING }, { distance: 0.95, tilt: 1 }, rulings, 'Set by the approach presentation: from afar.');
  assert.equal(adjusted.distance, 0.95);
  assert.equal(adjusted.tilt, 1);
  assert.equal(rulings[0].picked, 'Far away: the scene is small in a large emptiness');
  assert.equal(rulings[0].confidence, 0.6, 'the model probability is kept as it was');
  assert.match(rulings[0].note ?? '', /approach presentation/);
  assert.equal(rulings[1].picked, 'tilted');
  assert.deepEqual(adjustFraming({ ...NATURAL_FRAMING }, undefined, rulings, 'x'), NATURAL_FRAMING);
});
