import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import type { BuildContext } from '../kit/contract';
import { FIGURE_GAZES, FIGURE_HAIR, FIGURE_POSES, FIGURE_STYLES, figure } from '../kit/figure';
import { Sculpture } from '../kit/geometry';
import { visibleBounds } from '../kit/measure';
import { seeded } from '../kit/random';

const context = (energy = 0.5): BuildContext => ({
  idea: 'a figure check',
  mood: { wear: 0.2, warmth: 0.5, energy, density: 0.5, daylight: 0.5, cheer: 0.5 },
  scale: 'street',
  seed: 11,
  random: seeded(11),
});

const meshes = (root: THREE.Object3D) => {
  let count = 0;
  root.traverse((node) => { if ((node as THREE.Mesh).isMesh) count++; });
  return count;
};

test('every pose, style, gaze and hair builds a grounded, centred figure of sane size', () => {
  for (const pose of FIGURE_POSES) {
    for (const style of FIGURE_STYLES) {
      const art = new Sculpture(context());
      const person = figure(art, { pose, style, gaze: FIGURE_GAZES[pose.length % FIGURE_GAZES.length], hair: FIGURE_HAIR[style.length % FIGURE_HAIR.length] });
      art.root.add(person.root);
      person.root.updateMatrixWorld(true);
      const bounds = visibleBounds(person.root);
      assert.ok(!bounds.isEmpty(), `${pose}/${style} built nothing`);
      assert.ok(Math.abs(bounds.min.y) < 1e-6, `${pose}/${style} does not stand on the ground: ${bounds.min.y}`);
      const centre = bounds.getCenter(new THREE.Vector3());
      assert.ok(Math.hypot(centre.x, centre.z) < 0.05, `${pose}/${style} is off centre`);
      const size = bounds.getSize(new THREE.Vector3());
      assert.ok(Math.max(size.x, size.y, size.z) > 0.6 && Math.max(size.x, size.y, size.z) < 2.2, `${pose}/${style} is ${size.toArray().join(',')}`);
      assert.ok([size.x, size.y, size.z].every(Number.isFinite));
      assert.ok(meshes(person.root) <= 30, `${pose}/${style} uses ${meshes(person.root)} meshes`);
      assert.ok(person.height > (pose === 'lying' ? 0.15 : 0.5) && person.height < 2.2, `${pose}/${style} is ${person.height} tall`);
      assert.ok(person.hipHeight > (pose === 'lying' ? 0.04 : 0.15) && person.hipHeight < 1.2, `${pose}/${style} hips at ${person.hipHeight}`);
      person.update(0.016, 1);
    }
  }
});

test('a standing figure is as tall as asked and a sitting one is lower, with its hips at seat height', () => {
  const art = new Sculpture(context());
  const standing = figure(art, { height: 1.8 });
  assert.ok(Math.abs(standing.height - 1.8) < 0.12, `standing height ${standing.height}`);
  const sitting = figure(art, { height: 1.8, pose: 'sitting' });
  assert.ok(sitting.height < standing.height * 0.8);
  assert.ok(sitting.hipHeight > 0.35 && sitting.hipHeight < 0.6, `seat height ${sitting.hipHeight}`);
  const small = figure(art, { height: 0.3 });
  assert.ok(small.height < 0.4, 'a figurine scales down with its height');
  const lying = figure(art, { pose: 'lying' });
  assert.ok(lying.height < 0.6, `a lying figure is low: ${lying.height}`);
});

test('mirroring swaps the hands and props hang from the attachment points', () => {
  const art = new Sculpture(context());
  const pointing = figure(art, { pose: 'pointing' });
  const mirrored = figure(art, { pose: 'pointing', mirror: true });
  for (const person of [pointing, mirrored]) {
    art.root.add(person.root);
    person.root.updateMatrixWorld(true);
  }
  const forward = (person: ReturnType<typeof figure>, side: 'left' | 'right') => person.hands[side].getWorldPosition(new THREE.Vector3()).z;
  assert.ok(forward(pointing, 'left') > forward(pointing, 'right') + 0.3, 'the left hand points forward');
  assert.ok(forward(mirrored, 'right') > forward(mirrored, 'left') + 0.3, 'mirrored, the right hand points forward');
  const prop = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), art.material('#fff'));
  pointing.hands.left.add(prop);
  prop.updateMatrixWorld(true);
  assert.ok(prop.getWorldPosition(new THREE.Vector3()).distanceTo(pointing.hands.left.getWorldPosition(new THREE.Vector3())) < 1e-6);
});

test('the pose signs read the way a builder expects: down looks down, out swings out, lean leans forward', () => {
  const art = new Sculpture(context());
  const headZ = (gaze: 'ahead' | 'down' | 'up') => {
    const person = figure(art, { gaze });
    art.root.add(person.root);
    person.root.updateMatrixWorld(true);
    return person.head.getWorldPosition(new THREE.Vector3()).z - person.joints.neck.getWorldPosition(new THREE.Vector3()).z;
  };
  assert.ok(headZ('down') > headZ('ahead') + 0.02, 'looking down tips the head forward');
  assert.ok(headZ('up') < headZ('ahead') - 0.02, 'looking up tips the head back');
  const elbowX = (pose: 'standing' | 'hands-on-hips' | 'waving') => {
    const person = figure(art, { pose });
    art.root.add(person.root);
    person.root.updateMatrixWorld(true);
    return person.joints.elbows.left.getWorldPosition(new THREE.Vector3()).x - person.joints.shoulders.left.getWorldPosition(new THREE.Vector3()).x;
  };
  assert.ok(elbowX('hands-on-hips') > elbowX('standing') + 0.05, 'arms out swing the elbows outward, not into the torso');
  const crouch = figure(art, { pose: 'crouching' });
  art.root.add(crouch.root);
  crouch.root.updateMatrixWorld(true);
  const headAhead = crouch.head.getWorldPosition(new THREE.Vector3()).z - crouch.pelvis.getWorldPosition(new THREE.Vector3()).z;
  assert.ok(headAhead > 0.05, `a crouching figure leans forward: head ${headAhead} ahead of the hips`);
  const kneeling = figure(art, { pose: 'kneeling' });
  art.root.add(kneeling.root);
  kneeling.root.updateMatrixWorld(true);
  const footY = kneeling.joints.ankles.left.getWorldPosition(new THREE.Vector3()).y;
  assert.ok(footY < 0.12, `kneeling keeps the shins on the ground: ankle at ${footY}`);
  assert.equal(kneeling.joints.elbows.left.rotation.order, 'YXZ');
});

test('joints can be re-posed and the figure settled back onto the ground', () => {
  const art = new Sculpture(context());
  const person = figure(art, { pose: 'standing' });
  art.root.add(person.root);
  const before = person.height;
  person.joints.hips.left.rotation.x = -Math.PI / 2;
  person.joints.hips.right.rotation.x = -Math.PI / 2;
  person.settle();
  person.root.updateMatrixWorld(true);
  const bounds = visibleBounds(person.root);
  assert.ok(Math.abs(bounds.min.y) < 1e-6, 'settled back onto the ground');
  assert.ok(person.height < before, 'a figure with both legs raised is shorter');
  const lying = figure(art, { pose: 'lying', hair: 'hood' });
  const roll = lying.joints.body.rotation.z;
  lying.update(0.016, 3);
  assert.ok(Math.abs(lying.joints.body.rotation.z - roll) < 0.02, 'the sway keeps the lying tilt');
});

test('settle works wherever the root was placed, measure updates without moving, and the forearm swings across', () => {
  const art = new Sculpture(context());
  const person = figure(art, { pose: 'standing' });
  art.root.add(person.root);
  person.root.position.set(2, 1.3, -0.5);
  person.root.rotation.y = 0.7;
  person.joints.hips.left.rotation.x = -Math.PI / 2;
  person.settle();
  person.root.updateMatrixWorld(true);
  const bounds = visibleBounds(person.root).applyMatrix4(person.root.matrixWorld.clone().invert());
  assert.ok(Math.abs(bounds.min.y) < 1e-6, `settled onto its own ground plane, not the sculpture's: ${bounds.min.y}`);
  assert.ok(Math.abs(person.root.position.y - 1.3) < 1e-9, 'the root itself was not moved');
  const tall = figure(art, { pose: 'standing' });
  const before = tall.hipHeight;
  tall.joints.hips.left.rotation.x = -Math.PI / 2;
  tall.joints.hips.right.rotation.x = -Math.PI / 2;
  tall.measure();
  assert.ok(tall.hipHeight < before, `measure sees the lowered hips: ${tall.hipHeight} vs ${before}`);
  assert.equal(tall.joints.body.position.y, figure(art, { pose: 'standing' }).joints.body.position.y, 'measure did not re-ground the figure');
  const crossed = figure(art, { pose: 'arms-crossed' });
  art.root.add(crossed.root);
  crossed.root.updateMatrixWorld(true);
  const leftHandX = crossed.hands.left.getWorldPosition(new THREE.Vector3()).x - crossed.root.getWorldPosition(new THREE.Vector3()).x;
  const leftShoulderX = crossed.joints.shoulders.left.getWorldPosition(new THREE.Vector3()).x - crossed.root.getWorldPosition(new THREE.Vector3()).x;
  assert.ok(leftHandX < leftShoulderX, `crossed arms bring the left hand across the chest: hand ${leftHandX.toFixed(2)}, shoulder ${leftShoulderX.toFixed(2)}`);
  const hips = figure(art, { pose: 'hands-on-hips' });
  art.root.add(hips.root);
  hips.root.updateMatrixWorld(true);
  const hipHandX = hips.hands.left.getWorldPosition(new THREE.Vector3()).x - hips.root.getWorldPosition(new THREE.Vector3()).x;
  const elbowX = hips.joints.elbows.left.getWorldPosition(new THREE.Vector3()).x - hips.root.getWorldPosition(new THREE.Vector3()).x;
  assert.ok(hipHandX < elbowX, `hands on hips bring the hand inward of the elbow: hand ${hipHandX.toFixed(2)}, elbow ${elbowX.toFixed(2)}`);
});

test('the sway respects a roll the builder set after the figure was built', () => {
  const art = new Sculpture(context(1));
  const person = figure(art, { pose: 'standing' });
  person.update(0.016, 1);
  person.joints.body.rotation.z = 0.3;
  person.update(0.016, 2);
  assert.ok(Math.abs(person.joints.body.rotation.z - 0.3) < 0.02, `the builder's roll is kept under the sway: ${person.joints.body.rotation.z}`);
  person.update(0.016, 3);
  assert.ok(Math.abs(person.joints.body.rotation.z - 0.3) < 0.02, 'and stays kept on later frames');
});

test('a silhouette is one dark material and the figure takes its randomness from the context', () => {
  const art = new Sculpture(context());
  const shadow = figure(art, { style: 'silhouette', top: '#ff0000' });
  const colours = new Set<string>();
  shadow.root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh) colours.add((mesh.material as THREE.MeshStandardMaterial).color.getHexString());
  });
  assert.equal(colours.size, 1);
  const first = figure(new Sculpture(context()), { pose: 'walking' });
  const second = figure(new Sculpture(context()), { pose: 'walking' });
  first.update(0, 2); second.update(0, 2);
  assert.equal(first.root.children[0].rotation.z, second.root.children[0].rotation.z, 'the same seed sways the same way');
});

test('reach puts a palm on a point within reach, from either side, with the elbow down', () => {
  for (const side of ['left', 'right'] as const) {
    const art = new Sculpture(context());
    const person = figure(art, { pose: 'standing' });
    art.root.add(person.root);
    const sign = side === 'left' ? 1 : -1;
    const target = new THREE.Vector3(sign * 0.25, 1.15, 0.4);
    const gap = person.reach(side, target);
    assert.equal(gap, 0, `${side} reached`);
    const palm = person.root.worldToLocal(person.hands[side].getWorldPosition(new THREE.Vector3()));
    assert.ok(palm.distanceTo(target) < 0.01, `${side} palm is ${palm.distanceTo(target)} m from the target`);
    const shoulder = person.root.worldToLocal(person.joints.shoulders[side].getWorldPosition(new THREE.Vector3()));
    const elbow = person.root.worldToLocal(person.joints.elbows[side].getWorldPosition(new THREE.Vector3()));
    const along = target.clone().sub(shoulder).normalize();
    const offLine = elbow.clone().sub(shoulder).sub(along.clone().multiplyScalar(elbow.clone().sub(shoulder).dot(along)));
    assert.ok(offLine.y < 0, `${side} elbow hangs below the line to the hand`);
    assert.ok(offLine.x * sign >= -0.01, `${side} elbow does not swing across the body`);
  }
});

test('reach works in the sculpture space of a placed, turned figure, and reports a target out of reach', () => {
  const art = new Sculpture(context());
  const person = figure(art, { pose: 'sitting', height: 1.5 });
  person.root.position.set(1.2, 0.3, -0.5);
  person.root.rotation.y = 0.8;
  art.root.add(person.root);
  // A point on a table in front of the seated figure, given in the thing's own coordinates.
  art.root.updateMatrixWorld(true);
  const shoulderAt = art.root.worldToLocal(person.joints.shoulders.right.getWorldPosition(new THREE.Vector3()));
  const front = new THREE.Vector3(0.12, -0.2, 0.3).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.8).add(shoulderAt);
  assert.equal(person.reach('right', front, { space: art.root }), 0);
  const palm = art.root.worldToLocal(person.hands.right.getWorldPosition(new THREE.Vector3()));
  assert.ok(palm.distanceTo(front) < 0.01, `palm is ${palm.distanceTo(front)} m off`);
  const far = new THREE.Vector3(0, 1.2, 4);
  const gap = person.reach('left', far);
  assert.ok(gap > 2, `an unreachable point leaves a gap: ${gap}`);
  const shoulder = person.root.worldToLocal(person.joints.shoulders.left.getWorldPosition(new THREE.Vector3()));
  const hand = person.root.worldToLocal(person.hands.left.getWorldPosition(new THREE.Vector3()));
  assert.ok(hand.distanceTo(far) < shoulder.distanceTo(far) - 0.4, 'the straight arm points at it');
  for (const value of [person.joints.shoulders.left.quaternion.x, person.joints.elbows.left.rotation.x]) assert.ok(Number.isFinite(value));
});

test('lookAt turns the head toward a point and stays within a neck range', () => {
  const art = new Sculpture(context());
  const person = figure(art, {});
  art.root.add(person.root);
  person.lookAt(new THREE.Vector3(2, 1.6, 0.5));
  assert.ok(person.joints.neck.rotation.y > 0.5, 'turns toward its left (+x)');
  person.lookAt(new THREE.Vector3(0, 0, 0.5));
  assert.ok(person.joints.neck.rotation.x > 0.3, 'looks down at the floor in front');
  person.lookAt(new THREE.Vector3(0, 1.6, -3));
  assert.ok(Math.abs(person.joints.neck.rotation.y) <= 75 * Math.PI / 180 + 1e-9, 'never turns past the shoulder');
});
