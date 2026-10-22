import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { SKINS, anatomy, at, busSeat, closeEyes, garment, joints, pick, poseArm, poseLeg, reachArm, seatPalette, sideWall } from './bus';

const SCRUBS = {
  ceil: 'Pale ceil blue scrubs, the hospital default.',
  navy: 'Dark navy scrubs.',
  burgundy: 'Deep burgundy scrubs.',
  green: 'Surgical green scrubs.',
  lilac: 'Soft lilac scrubs.',
} as const;
const SCRUB_COLOUR: Record<keyof typeof SCRUBS, string> = { ceil: '#8cc0d8', navy: '#273a63', burgundy: '#6b2234', green: '#2f7a5a', lilac: '#b6a0d0' };
const PARKAS = {
  olive: 'An olive green parka with a fur-trimmed hood.',
  black: 'A black puffer-style parka.',
  navy: 'A navy parka.',
  maroon: 'A maroon parka.',
  khaki: 'A sandy khaki parka.',
} as const;
const PARKA_COLOUR: Record<keyof typeof PARKAS, string> = { olive: '#4f5a32', black: '#1d1f23', navy: '#22304d', maroon: '#5a2630', khaki: '#9a8a62' };

export default defineThing({
  questions: {
    scrubs: choice('What colour are her scrubs?', SCRUBS),
    parka: choice('What coat hangs open over them?', PARKAS),
    lap: choice('What is in her lap?', {
      tote: 'A canvas tote bag, stuffed full.',
      lunchbox: 'A plastic lunchbox with a clip lid.',
      book: 'A paperback lying face down, open where she stopped reading.',
    }),
    sleep: score('How deep is the sleep?', ['Nodding, chin dipping', 'Properly asleep, head on the pillar', 'Out cold, slumped against the window', 'Gone, mouth open, bag sliding']),
    grip: noul('Does her hand still grip the bag in her lap?'),
    hair: choice('How is her hair?', {
      bun: 'Scraped back into a bun.',
      short: 'Cropped short.',
      long: 'Long and loose, falling over the collar.',
      beanie: 'Under a woolly beanie hat.',
    }),
    beside: choice('What is on the empty aisle seat beside her?', {
      nothing: 'Nothing; the empty seat.',
      coat: 'A second coat, folded in a heap.',
      coffee: 'A paper coffee cup standing on the seat.',
      phone: 'Her phone, face up, screen still glowing.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.58, 1.74, random());
    const build = random() < 0.3 ? 'slight' : random() < 0.75 ? 'average' : 'heavy';
    const skin = pick(random, SKINS);
    const scrub = SCRUB_COLOUR[a.scrubs];
    const parkaColour = PARKA_COLOUR[a.parka];
    const hairColor = pick(random, ['#2a1d18', '#3b2a22', '#6b4a2e', '#b8884a', '#1f1a18', '#8a8a86']);
    const person = figure(s, {
      height: H, build, style: 'doll', pose: 'sitting', gaze: 'down', skin, hairColor,
      hair: a.hair === 'beanie' ? 'none' : a.hair,
      top: scrub, bottom: scrub, shoes: pick(random, ['#f1f1ee', '#e8e4dc', '#dfe3ea']), sleeves: 'long',
    });
    s.root.add(person.root);
    const { limb, torsoL, headR, chestR, spine, shoulderW } = anatomy(person, H, build);
    const neckL = H * 0.03;

    // ---- the parka: open at the front over the scrubs, its sleeves on both arms.
    const parka = s.material(parkaColour, { roughness: a.parka === 'black' ? 0.35 : 0.9 });
    garment(person, H, build, parka, { open: 95, grow: 1.16, length: 1.02, flare: 1.12 });
    for (const side of ['left', 'right'] as const) {
      const { shoulder, elbow } = joints(person, side);
      for (const node of [shoulder, elbow]) for (const child of node.children) if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = parka;
    }
    const fur = s.material(a.parka === 'black' ? '#4a4a4c' : '#c9b89a', { roughness: 1 });
    const collar = new THREE.Mesh(new THREE.TorusGeometry(chestR * 1.25, limb * 0.55, 8, 18, Math.PI * 1.3), fur);
    collar.position.set(0, torsoL * 0.99, -chestR * 0.3);
    collar.rotation.set(Math.PI / 2 - 0.3, 0, Math.PI * 0.85);
    collar.scale.x = 1.3;
    collar.castShadow = true;
    spine.add(collar);
    // Lanyard and badge.
    const lanyard = s.material(pick(random, ['#2b5fb8', '#c8303a', '#2a9a6a', '#1d1d1f']), { roughness: 0.8 });
    const badgeY = torsoL * 0.62;
    for (const side of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, torsoL * 0.36, 6), lanyard);
      strap.position.set(side * shoulderW * 0.28, torsoL * 0.8, chestR + 0.006);
      strap.rotation.z = side * 0.22;
      spine.add(strap);
    }
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.085, 0.006), s.material('#f4f2ea', { roughness: 0.6 }));
    badge.position.set(0, badgeY, chestR + 0.01);
    const badgeFace = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.002), s.material('#3a7fc4'));
    badgeFace.position.set(0, badgeY + 0.018, chestR + 0.014);
    spine.add(badge, badgeFace);
    if (a.hair === 'beanie') {
      const wool = s.material(pick(random, ['#8a3a3a', '#2d3b5e', '#6a6a66', '#d9b36a']), { roughness: 1 });
      const hat = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), wool);
      hat.position.y = headR * 0.12;
      hat.scale.y = 1.15;
      hat.castShadow = true;
      const bobble = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.3, 10, 8), wool);
      bobble.position.y = headR * 1.3;
      person.head.add(hat, bobble);
    }

    // ---- the pose: legs together, head slumped sideways toward the window (-x) through the neck and spine.
    poseLeg(person, 'left', { forward: 86, knee: 84, out: 4 });
    poseLeg(person, 'right', { forward: 88, knee: 86, out: 2 });
    const depth = a.sleep;
    const { neck } = joints(person, 'left');
    const neckTilt = mix(0.18, 0.62, depth);
    neck.rotation.set(mix(0.5, 0.25, depth), -0.1, neckTilt);
    spine.rotation.set(mix(0.08, 0.2, depth), 0, mix(0.05, 0.22, depth));
    closeEyes(person, headR);
    if (depth > 0.72) {
      const mouth = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.12, 8, 6), s.material('#3a2320'));
      mouth.position.set(0, -headR * 0.4, headR * 0.9);
      mouth.scale.set(1, 1.3, 0.3);
      person.head.add(mouth);
    }
    person.settle();
    const hips = at(person.pelvis);
    const seatTop = hips.y - 0.045 * H;

    // ---- the seat and the wall it sits against; the head rests on the pillar between windows.
    const palette = seatPalette(s, random);
    const seatX = hips.x + 0.215, seatZ = hips.z + 0.06;
    busSeat(s, palette, { x: seatX, z: seatZ, seatTop, aisle: 'right', cantilever: true });
    const wallX = seatX - 0.47;
    const panel = s.material(pick(random, ['#2c3140', '#3a3f4a', '#4a3a3a']), { roughness: 0.7 });
    const trim = s.material('#9aa0a6', { metalness: 0.5, roughness: 0.4 });
    // Lean the torso until the head's outer edge meets the pillar.
    const head = at(person.head);
    const wanted = wallX + 0.035 + headR * 0.98;
    const extra = Math.asin(Math.min(0.45, Math.max(-0.2, (head.x - wanted) / (torsoL + neckL + headR))));
    spine.rotation.z += extra;
    person.root.updateMatrixWorld(true);
    const headNow = at(person.head);
    sideWall(s, { x: wallX, z: seatZ + 0.02, length: 0.98, pillarZ: headNow.z, panel, trim, height: 1.78 });

    // ---- what is in her lap, and the hands.
    const lapY = hips.y + 0.03, lapZ = hips.z + 0.2;
    const canvasBag = s.material(pick(random, ['#d8cfb4', '#2b2f3a', '#8a3a3a', '#5a6a8a']), { roughness: 1 });
    let gripAt: THREE.Vector3;
    if (a.lap === 'tote') {
      const slide = depth > 0.72 ? 0.07 : 0;
      const bag = s.box([0.36, 0.27, 0.14], [hips.x + 0.02 + slide, lapY + 0.13, lapZ + slide * 0.5], canvasBag);
      bag.rotation.set(-0.25, 0, slide ? -0.25 : 0);
      for (const dx of [-0.1, 0.1]) s.ring(0.07, 0.008, [hips.x + 0.02 + slide + dx, lapY + 0.255, lapZ - 0.02], canvasBag, Math.PI).rotation.z = 0;
      gripAt = new THREE.Vector3(hips.x + 0.1 + slide, lapY + 0.28, lapZ + 0.02);
    } else if (a.lap === 'lunchbox') {
      const plastic = s.material(pick(random, ['#4a9ad4', '#e85a3a', '#8ac050', '#f0e6c8']), { roughness: 0.4 });
      s.box([0.23, 0.08, 0.16], [hips.x + 0.02, lapY + 0.06, lapZ], plastic);
      s.box([0.235, 0.015, 0.165], [hips.x + 0.02, lapY + 0.108, lapZ], s.material('#f4f4ee', { roughness: 0.4 }));
      s.box([0.03, 0.03, 0.02], [hips.x + 0.02, lapY + 0.1, lapZ + 0.085], plastic);
      gripAt = new THREE.Vector3(hips.x + 0.09, lapY + 0.12, lapZ);
    } else {
      const cover = s.material(pick(random, ['#c8403a', '#2f6a9a', '#e0c070', '#f1e6cc']), { roughness: 0.7 });
      const paper = s.material('#f3efe2', { roughness: 0.95 });
      for (const side of [-1, 1]) {
        const half = s.box([0.11, 0.015, 0.16], [hips.x + 0.02 + side * 0.052, lapY + 0.05 + 0.02, lapZ], cover);
        half.rotation.z = -side * 0.5;
        const pages = s.box([0.1, 0.012, 0.15], [hips.x + 0.02 + side * 0.05, lapY + 0.055, lapZ], paper);
        pages.rotation.z = -side * 0.5;
      }
      gripAt = new THREE.Vector3(hips.x + 0.1, lapY + 0.09, lapZ);
    }
    for (const side of ['left', 'right'] as const) {
      const shoulder = at(joints(person, side).shoulder);
      if (a.grip && side === 'left') {
        reachArm(person, side, H, gripAt.y + 0.03 - shoulder.y, gripAt.z - shoulder.z, 4, 28);
      } else if (side === 'right') {
        // The window-side arm folds in the lap, or falls limp when she is far gone.
        if (depth > 0.72) poseArm(person, side, { forward: -4, out: 6, bend: 8 });
        else reachArm(person, side, H, lapY + 0.08 - shoulder.y, lapZ - 0.06 - shoulder.z, 6, 30);
      } else {
        poseArm(person, side, { forward: 6, out: 12, bend: 14 });
      }
    }

    // ---- the aisle seat beside her.
    const asideX = seatX + 0.215, asideZ = seatZ + 0.02;
    if (a.beside === 'coat') {
      const heap = s.box([0.32, 0.14, 0.3], [asideX, seatTop + 0.07, asideZ], s.material(pick(random, ['#3a3a3c', '#5a4a3a', '#1f2a3a']), { roughness: 1 }));
      heap.rotation.y = random() * 0.6;
      s.ball([0.14, 0.06, 0.12], [asideX + 0.06, seatTop + 0.16, asideZ - 0.04], heap.material as THREE.Material, 10);
    } else if (a.beside === 'coffee') {
      s.cylinder(0.04, 0.034, 0.12, [asideX + 0.05, seatTop + 0.06, asideZ + 0.04], s.material('#f1ece0', { roughness: 0.6 }), 14);
      s.cylinder(0.042, 0.042, 0.01, [asideX + 0.05, seatTop + 0.125, asideZ + 0.04], s.material('#2a2320', { roughness: 0.5 }), 14);
      s.cylinder(0.04, 0.04, 0.03, [asideX + 0.05, seatTop + 0.06, asideZ + 0.04], s.material('#8a6a3a', { roughness: 0.9 }), 14);
    } else if (a.beside === 'phone') {
      s.box([0.07, 0.008, 0.14], [asideX + 0.04, seatTop + 0.004, asideZ + 0.03], s.material('#1a1a1e', { roughness: 0.3 })).rotation.y = 0.4;
      s.box([0.062, 0.002, 0.13], [asideX + 0.04, seatTop + 0.0095, asideZ + 0.03], new THREE.MeshStandardMaterial({ color: '#dfe8ff', emissive: '#bcd0ff', emissiveIntensity: mix(0.6, 1.6, 1 - mood.daylight) })).rotation.y = 0.4;
    }

    return s.finish({ update: (dt, time) => person.update(dt, time) });
  },
});
