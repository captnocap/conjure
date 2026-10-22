import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, type BuildContext } from '@conjure/kit';
import { limb, monkeyHead, sittingBody, tufts, type Mouth, type V3 } from './primate';

const hex = (c: THREE.Color) => `#${c.getHexString()}`;
const SKIN = '#1b1716';

interface Coat { fur: string; tip: string; ragged: number }

function langurHead(context: BuildContext, coat: Coat, eyeOpen: number, mouth: Mouth, tilak: boolean) {
  const head = monkeyHead(context, {
    skin: SKIN, fur: coat.fur, tip: coat.tip, iris: '#b06f1c', ear: 0.7, muzzle: 1, brow: 1, eyeOpen, mouth, cheek: 0,
    furLength: 0.3, furCount: 260, ruff: 1, ruffColour: '#c9c6b8', ruffTip: '#f6f4ec', ragged: coat.ragged,
  });
  if (tilak) {
    const mark = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: '#e8261c', emissive: '#b01208', emissiveIntensity: 0.6, roughness: 0.6 }));
    mark.scale.set(0.055, 0.15, 0.04);
    mark.position.set(0, 0.5, 0.93);
    mark.rotation.x = -0.45;
    head.add(mark);
  }
  head.scale.setScalar(0.085);
  return head;
}

function garland(s: Sculpture, at: V3, cheer: number) {
  const points = [];
  for (let i = 0; i < 24; i++) {
    const t = (i / 24) * Math.PI * 2;
    points.push({ at: [at[0] + Math.sin(t) * 0.1, at[1] + 0.035 - 0.1 * (0.5 + 0.5 * Math.cos(t)), at[2] + 0.02 + Math.cos(t) * 0.085] as V3, size: 0.02, color: i % 3 ? '#f58a0c' : '#ffc21c' });
  }
  return s.scatter(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, emissive: '#c85a00', emissiveIntensity: 0.15 + cheer * 0.3 }), points);
}

function seated(context: BuildContext, coat: Coat, o: { hunch: number; eyeOpen: number; mouth: Mouth; tilak: boolean; garland: boolean; rightHand?: V3; leftHand?: V3; size?: number }) {
  const m = new Sculpture(context);
  const H = 0.46 * (o.size ?? 1);
  const body = sittingBody(m, { height: H, girth: 0.8, fur: coat.fur, tip: coat.tip, belly: '#dedacb', skin: SKIN, hunch: o.hunch, limbWidth: 0.8, furLength: 0.13, ragged: coat.ragged, rightHand: o.rightHand, leftHand: o.leftHand });
  const head = langurHead(context, coat, o.eyeOpen, o.mouth, o.tilak);
  head.position.set(body.neck[0], body.neck[1] + 0.05, body.neck[2] + 0.028);
  m.root.add(head);
  if (o.garland) garland(m, [body.neck[0], body.neck[1] - 0.03, body.neck[2]], context.mood.cheer);
  return { m, head, H };
}

export default defineThing({
  questions: {
    pose: choice('What is it doing?', {
      regal: 'Seated bolt upright in profile, hands on knees, a grey sentinel.',
      chin: 'Seated facing you with one hand raised to its chin, thinking it over.',
      leap: 'Mid-leap off the step, body stretched, arms reaching, tail streaming behind.',
      grooming: "Hunched over a second langur on the step below, both hands parting the fur on its scalp.",
    }),
    expression: choice('What is its face doing?', {
      calm: 'Calm and remote, mouth shut, eyes half lowered.',
      alert: 'Wide amber eyes fixed on something.',
      yawn: 'A huge yawn that shows the long canines.',
      basking: 'Eyes shut, face tipped to the sun.',
    }),
    tail: choice('If seated, how does the long tail lie?', {
      drop: 'A straight plumb-line drop down the face of the step and out along the ground.',
      looped: 'Carried up and looped forward over its back in a high arch.',
      hook: 'Out behind and curled up at the end like a question mark.',
      draped: 'Draped along the top of the step and over the far end.',
    }),
    devotion: choice('Has a devotee marked it?', {
      none: 'No: it is just a monkey.',
      garland: 'A marigold garland hung round its neck.',
      tilak: 'A red tilak mark pressed on its brow.',
      both: 'Garlanded and marked: fully a god this morning.',
    }),
    pair: noul('If it is not grooming, is a second langur seated beside it?'),
    perch: choice('What are the steps made of?', {
      stone: 'Worn grey-tan temple stone.',
      whitewash: 'Whitewashed masonry with an ochre band.',
      sandstone: 'Red sandstone with a carved edge.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const furC = new THREE.Color('#96948b').lerp(new THREE.Color('#c0b08e'), mood.warmth * 0.45).lerp(new THREE.Color('#84807a'), mood.wear * 0.4);
    const coat: Coat = { fur: hex(furC), tip: hex(furC.clone().lerp(new THREE.Color('#f7f5ee'), 0.45)), ragged: 0.25 + mood.wear * 0.4 };
    const furMat = s.material(coat.fur, { roughness: 0.95 }), skinMat = s.material(SKIN, { roughness: 0.6 });

    // Two steps.
    const top = 0.36, low = 0.18;
    const [face, trim] = { stone: ['#b3a892', '#9c917c'], whitewash: ['#ebe6d8', '#c98a2b'], sandstone: ['#b5604a', '#9a4c3a'] }[a.perch];
    const faceMat = s.material(face), trimMat = s.material(trim);
    s.box([0.88, top, 0.5], [0, top / 2, -0.1], faceMat);
    s.box([0.96, low, 0.5], [0, low / 2, 0.4], faceMat);
    s.box([0.92, 0.035, 0.54], [0, top - 0.014, -0.1], trimMat);
    s.box([1.0, 0.035, 0.54], [0, low - 0.014, 0.4], trimMat);
    if (a.perch === 'sandstone') for (let i = 0; i < 7; i++) s.box([0.06, 0.06, 0.012], [-0.33 + i * 0.11, top - 0.1, 0.156], trimMat).rotation.z = Math.PI / 4;
    if (a.perch === 'whitewash') s.box([0.885, 0.06, 0.505], [0, 0.07, -0.1], trimMat);
    for (let i = 0; i < Math.round(mood.wear * 9); i++) s.box([0.05 + random() * 0.1, 0.03 + random() * 0.05, 0.008], [mix(-0.42, 0.42, random()), mix(0.03, low - 0.06, random()), 0.652], s.material('#6f6a5e'));

    const mouth: Mouth = a.expression === 'yawn' ? 'threat' : 'closed';
    const eyeOpen = { calm: 0.6, alert: 1.3, yawn: 0.25, basking: 0.04 }[a.expression];
    const tilak = a.devotion === 'tilak' || a.devotion === 'both', wreath = a.devotion === 'garland' || a.devotion === 'both';
    const tilt = a.expression === 'basking' ? -0.4 : a.expression === 'yawn' ? -0.25 : 0;
    const second = a.pair && a.pose !== 'grooming';
    let head: THREE.Group;
    let tailMesh: THREE.Mesh | null = null;
    const tailMat = furMat;
    const tailRadius = 0.017;

    if (a.pose === 'leap') {
      const L = new Sculpture(context);
      // Built in the plane of the jump: p(forward, up, sideways).
      const p = (f: number, y: number, x = 0): V3 => [x, y, f];
      const trunk = new Sculpture(context);
      trunk.ball([0.1, 0.24, 0.1], [0, 0, 0], furMat, 16);
      tufts(trunk, { centre: [0, 0, 0], radii: [0.105, 0.25, 0.105], count: 240, colour: coat.fur, tip: coat.tip, length: 0.06, width: 0.014, comb: [0, -1, 0], combAmount: 0.7, ragged: coat.ragged });
      trunk.root.position.set(0, 0.55, 0.045);
      trunk.root.rotation.x = 0.5;
      L.root.add(trunk.root);
      limb(L, [p(-0.05, 0.38, 0.06), p(-0.2, 0.22, 0.08), p(-0.25, 0.035, 0.08)], 0.05, 0.026, furMat);
      limb(L, [p(-0.05, 0.38, -0.06), p(0.16, 0.36, -0.09), p(0.08, 0.2, -0.09)], 0.05, 0.026, furMat);
      limb(L, [p(0.14, 0.72, 0.09), p(0.3, 0.8, 0.13), p(0.4, 1.0, 0.12)], 0.036, 0.024, furMat);
      limb(L, [p(0.14, 0.72, -0.09), p(0.31, 0.7, -0.13), p(0.46, 0.86, -0.12)], 0.036, 0.024, furMat);
      for (const q of [p(0.41, 1.03, 0.12), p(0.48, 0.89, -0.12)]) L.ball([0.025, 0.04, 0.03], q, skinMat, 10);
      L.ball([0.03, 0.025, 0.055], p(-0.22, 0.02, 0.08), skinMat, 10);
      L.ball([0.03, 0.025, 0.045], p(0.1, 0.17, -0.09), skinMat, 10);
      head = langurHead(context, coat, eyeOpen, mouth, tilak);
      head.position.set(0, 0.87, 0.22);
      head.rotation.set(-0.2 + tilt * 0.5, 0, 0);
      L.root.add(head);
      if (wreath) garland(L, [0, 0.75, 0.15], mood.cheer);
      const arch = a.tail === 'looped' ? 0.22 : a.tail === 'hook' ? 0.1 : 0;
      tailMesh = L.tube([p(-0.08, 0.36), p(-0.3, 0.5 + arch), p(-0.55, 0.54 + arch * 1.6), p(-0.78, 0.42 + arch * 2.2), p(-0.94, 0.22 + arch * 3)], tailRadius, tailMat);
      L.root.position.set(-0.05, top, -0.02);
      L.root.rotation.y = 0.45;
      s.root.add(L.root);
    } else {
      const profile = a.pose === 'regal';
      const mx = profile ? 0.14 : second ? 0.14 : 0;
      const mz = profile ? -0.05 : -0.1;
      const grooming = a.pose === 'grooming';
      const main = seated(context, coat, {
        hunch: grooming ? 0.75 : a.pose === 'chin' ? 0.45 : 0.08, eyeOpen: grooming ? Math.max(eyeOpen, 0.8) : eyeOpen, mouth, tilak, garland: wreath,
        rightHand: grooming ? [0.1, 0.9, 1.02] : a.pose === 'chin' ? [0.07, 0.96, 0.4] : undefined,
        leftHand: grooming ? [-0.1, 0.92, 1.0] : undefined,
      });
      head = main.head;
      head.rotation.set(grooming ? 0.45 : tilt + (profile ? -0.08 : 0), profile ? -0.25 : (random() - 0.5) * 0.3, 0);
      main.m.root.position.set(mx, top, mz);
      main.m.root.rotation.y = profile ? -0.7 : (random() - 0.5) * 0.15;
      s.root.add(main.m.root);

      // The tail.
      if (a.tail === 'looped') tailMesh = main.m.tube([[0, 0.04, -0.15], [0, 0.22, -0.34], [0, 0.52, -0.4], [0, 0.76, -0.32], [0, 0.84, -0.18], [0, 0.77, -0.1]], tailRadius, tailMat);
      else if (a.tail === 'hook') tailMesh = main.m.tube([[0, 0.04, -0.15], [0, 0.03, -0.36], [0, 0.1, -0.56], [0, 0.32, -0.66], [0, 0.5, -0.58], [0, 0.47, -0.46]], tailRadius, tailMat);
      else if (profile) {
        tailMesh = a.tail === 'drop'
          ? s.tube([[0.27, top + 0.03, -0.07], [0.38, top + 0.025, -0.06], [0.455, top - 0.03, -0.05], [0.46, top - 0.2, -0.05], [0.46, 0.12, -0.05], [0.48, 0.025, -0.02], [0.58, 0.02, 0.08], [0.64, 0.02, 0.2]], tailRadius, tailMat)
          : s.tube([[0.27, top + 0.03, -0.07], [0.36, top + 0.02, -0.2], [0.26, top + 0.02, -0.3], [0.05, top + 0.02, -0.3], [-0.2, top + 0.02, -0.26], [-0.38, top + 0.02, -0.28]], tailRadius, tailMat);
      } else {
        tailMesh = a.tail === 'drop'
          ? s.tube([[mx, top + 0.03, -0.25], [mx + 0.2, top + 0.02, -0.2], [mx + 0.27, top + 0.02, 0], [mx + 0.28, top + 0.015, 0.14], [mx + 0.28, top - 0.08, 0.172], [mx + 0.28, low + 0.03, 0.18], [mx + 0.29, low + 0.018, 0.4], [mx + 0.3, low + 0.01, 0.64], [mx + 0.3, low - 0.1, 0.672], [mx + 0.3, 0.03, 0.68], [mx + 0.33, 0.02, 0.8]], tailRadius, tailMat)
          : s.tube([[mx, top + 0.03, -0.25], [mx + 0.22, top + 0.02, -0.25], [0.38, top + 0.02, -0.2], [0.455, top - 0.02, -0.2], [0.46, top - 0.18, -0.2], [0.46, top - 0.33, -0.2]], tailRadius, tailMat);
      }

      if (grooming || second) {
        const other = seated(context, coat, { hunch: grooming ? 0.55 : 0.2, eyeOpen: grooming ? 0.04 : 0.7, mouth: 'closed', tilak: false, garland: false, size: 0.92 });
        other.head.rotation.set(grooming ? 0.35 : 0, grooming ? 0 : 0.5, 0);
        if (grooming) other.m.root.position.set(0, low, 0.36);
        else {
          other.m.root.position.set(profile ? -0.26 : mx - 0.4, top, -0.1);
          other.m.root.rotation.y = 0.3;
        }
        other.m.tube(grooming
          ? [[0, 0.04, -0.14], [-0.2, 0.03, -0.1], [-0.34, 0.02, 0.1], [-0.36, 0.02, 0.27], [-0.36, -0.1, 0.3], [-0.36, -0.17, 0.32]]
          : [[0, 0.04, -0.14], [-0.05, 0.03, -0.24], [-0.06, -0.1, -0.265], [-0.06, -0.3, -0.26]], tailRadius * 0.9, tailMat);
        s.root.add(other.m.root);
      }
    }

    // What the morning left on the steps.
    const drop = Math.round(mood.density * 10);
    for (let i = 0; i < drop; i++) {
      const onLow = random() < 0.6;
      const petal = s.ball([0.022, 0.004, 0.012], [mix(-0.4, 0.4, random()), (onLow ? low : top) + 0.004, onLow ? mix(0.5, 0.62, random()) : mix(-0.33, -0.28, random())], s.material(i % 4 === 0 ? '#6f8f3a' : i % 2 ? '#f28a12' : '#e8c53a'), 8);
      petal.rotation.y = random() * 3;
    }

    const pace = mix(0.2, 2.2, mood.energy), baseYaw = head.rotation.y, tail = tailMesh;
    return s.finish({
      update: (_dt, time) => {
        head.rotation.y = baseYaw + Math.sin(time * pace) * 0.14 * mood.energy;
        if (tail && (a.tail === 'looped' || a.tail === 'hook' || a.pose === 'leap')) tail.rotation.x = Math.sin(time * pace * 1.4) * 0.05 * mood.energy;
      },
    });
  },
});
