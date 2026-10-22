import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { type BuildContext, type Placeable, RELATIONS, type Relation } from '../kit/contract';
import { diorama } from '../kit/diorama';
import { seeded } from '../kit/random';
import { RELATION_OPTIONS, relationBrief, relationQuestion } from '../engine/relations';
import { MAX_BRIEF_CHARACTERS } from '../engine/decision-limits';
import { decideSchema } from '../server/decision-schema';

const context = (): BuildContext => ({
  idea: 'a relations check',
  mood: { wear: 0.3, warmth: 0.5, energy: 0.4, density: 0.5, daylight: 0.5, cheer: 0.5 },
  scale: 'room', seed: 3, random: seeded(3),
});

const placeable = (height: number, radius: number, hero: boolean, relation?: Relation): Placeable => {
  const holder = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(radius * 2, height, radius * 2), new THREE.MeshStandardMaterial());
  mesh.position.y = height / 2;
  holder.add(mesh);
  return { holder, radius, height, hero, ...(relation ? { relation } : {}) };
};

/** Place a hero and one supporting thing with a relation; report where the support ended up relative to the hero. */
function placed(relation?: Relation) {
  const { world } = diorama(context());
  const hero = placeable(1.4, 0.5, true);
  const support = placeable(0.6, 0.3, false, relation);
  world.object.add(hero.holder, support.holder);
  world.place([hero, support]);
  const h = hero.holder.position, s = support.holder.position;
  const heroTop = h.y + hero.height * hero.holder.scale.y;
  // Touching distance in the world's own scaled metres: the two footprints plus a little air.
  const touching = (hero.radius * hero.holder.scale.x + support.radius * support.holder.scale.x) * 1.12;
  const result = { dx: s.x - h.x, dz: s.z - h.z, dy: s.y - h.y, heroTop, touching, distance: Math.hypot(s.x - h.x, s.z - h.z), scale: support.holder.scale.x, turn: support.holder.rotation.y };
  world.dispose();
  return result;
}

test('the relation question is a typed choice over the five relations and its brief fits', () => {
  const question = relationQuestion('Cat', 'Chair');
  assert.equal(question.type, 'choice');
  assert.deepEqual(Object.keys(question.options), [...RELATIONS]);
  assert.match(question.ask, /Cat .* Chair/);
  decideSchema.parse({ idea: 'x', brief: relationBrief('Base.', 'Kitchen', 'Chair'), questions: [question] });
  assert.ok(relationBrief('x'.repeat(1300), 'Kitchen', 'Chair').length <= MAX_BRIEF_CHARACTERS);
  for (const relation of RELATIONS) assert.ok(RELATION_OPTIONS[relation].length > 10);
});

test('without a relation the support takes the next slot, as before', () => {
  const none = placed();
  const apart = placed('apart');
  assert.deepEqual(none, apart);
  assert.ok(none.distance > 2, `slot placement keeps things apart: ${none.distance}`);
});

test('on sits the support on top of the hero, smaller', () => {
  const on = placed('on');
  assert.ok(on.distance < 1e-6, 'directly above the hero');
  assert.ok(Math.abs(on.dy - (on.heroTop - 0)) < 1e-6, `lifted to the hero top: ${on.dy} vs ${on.heroTop}`);
  assert.ok(on.scale < placed().scale, 'scaled down to perch');
});

test('beside, behind and facing gather round the hero at touching distance', () => {
  const beside = placed('beside');
  const behind = placed('behind');
  const facing = placed('facing');
  for (const [name, spot] of Object.entries({ beside, behind, facing })) {
    assert.ok(Math.abs(spot.distance - spot.touching) < 1e-6, `${name} is at touching distance: ${spot.distance} vs ${spot.touching}`);
    assert.ok(spot.distance < placed().distance, `${name} is closer than a slot`);
    assert.ok(Math.abs(spot.dy) < 1e-6, `${name} stays on the floor`);
  }
  assert.ok(Math.abs(beside.dx) > Math.abs(beside.dz), 'beside is to the side');
  assert.ok(behind.dz < -0.3, 'behind is further from the viewer');
  assert.ok(facing.dz > 0.3, 'facing is nearer the viewer');
  assert.ok(Math.abs(Math.abs(facing.turn) - Math.PI) < 0.3, `facing turns round to look at the hero: ${facing.turn}`);
});

test('two things beside the hero take opposite sides', () => {
  const { world } = diorama(context());
  const hero = placeable(1.4, 0.5, true);
  const left = placeable(0.6, 0.3, false, 'beside');
  const right = placeable(0.6, 0.3, false, 'beside');
  world.object.add(hero.holder, left.holder, right.holder);
  world.place([hero, left, right]);
  const a = left.holder.position.x - hero.holder.position.x;
  const b = right.holder.position.x - hero.holder.position.x;
  assert.ok(a * b < 0, `opposite sides: ${a} and ${b}`);
  world.dispose();
});
