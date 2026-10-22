import * as THREE from 'three';
import '@ateliers/clanker/src/faces/sketches';
import '@ateliers/clanker/src/suit/parts';
import { FaceEngine, stillWorld } from '@ateliers/clanker/src/faces/engine';
import { Materials } from '@ateliers/clanker/src/materials/library';
import { setWear, setWearWorld } from '@ateliers/clanker/src/materials/wear';
import { ARCHETYPES } from '@ateliers/clanker/src/suit/archetypes';
import { buildSuit } from '@ateliers/clanker/src/suit/build';
import { Animator, POSE_LIST, type PoseName } from '@ateliers/clanker/src/suit/rig';
import { choice, choiceFrom, defineThing, mix } from '@conjure/kit';

const MOODS = {
  calm: 'Calm and attentive.',
  happy: 'Happy.',
  alert: 'Alert, on guard.',
  sleepy: 'Sleepy, winding down.',
  angry: 'Angry.',
  curious: 'Curious.',
  error: 'Malfunctioning, showing an error.',
  love: 'Smitten, hearts for eyes.',
  smug: 'Smug.',
  sad: 'Sad.',
} as const;

const world = stillWorld();
const faces = new FaceEngine(world);

export default defineThing({
  questions: {
    unit: choiceFrom('Which robot is it?', ARCHETYPES, (entry) => entry.id, (entry) => `${entry.name}, a ${entry.family}: ${entry.blurb}`),
    feeling: choice('What is on its face?', MOODS),
    pose: choiceFrom('What is it doing?', POSE_LIST, (pose) => pose.value, (pose) => `${pose.label}: ${pose.hint}`),
  },

  async build(answers, { mood, seed }) {
    await Promise.all([faces.ready, document.fonts.ready]);
    const spec = ARCHETYPES.find((entry) => entry.id === answers.unit)!.make();
    spec.seed = seed;
    spec.face.mood = answers.feeling;
    for (const dial of Object.keys(spec.wear) as (keyof typeof spec.wear)[]) spec.wear[dial] = mix(spec.wear[dial], 1, mood.wear * 0.8);
    setWear(mood.wear, mood.wear * 0.8, mood.wear * 0.7, mood.wear, mood.wear * 0.8);
    setWearWorld(0, new THREE.Vector3(-0.4, 0.8, 0.45).normalize(), new THREE.Color('#b9a98c'));
    const materials = new Materials(spec, faces, 1);
    const built = buildSuit(spec, materials, faces, 1);
    const animator = new Animator(built.bones, built.dims, spec.chassis.frame, spec.seed);
    // A pose a frame cannot take falls back to that frame's standing pose inside the rig.
    animator.setPose(answers.pose as PoseName);
    built.root.traverse((node) => (node.castShadow = true));
    world.mood = answers.feeling;
    return {
      object: built.root,
      update(dt, time) {
        const power = 1;
        animator.update({ dt, time, power, look: null, speed: 0, tremor: mood.wear * 0.3, sway: mix(0.2, 1, mood.energy), fingers: null });
        for (const animate of built.animates) animate({ dt, time, power, speed: 0, heat: 0, camera: null } as never);
        world.time = time;
        faces.update(dt, world);
      },
      dispose() {
        for (const face of built.faces) face.dispose();
        built.root.traverse((node) => (node as THREE.Mesh).geometry?.dispose());
        materials.dispose();
        built.root.removeFromParent();
      },
    };
  },
});
