import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { type P, beanie, paint, pick, pickSkin, rig, worldOf } from './rig';

/** The open lattice of a plastic bread crate, painted with holes the alpha test cuts out. */
function lattice(colour: string) {
  const map = paint(128, 128, (c) => {
    c.clearRect(0, 0, 128, 128);
    c.fillStyle = colour;
    c.fillRect(0, 0, 128, 10);
    c.fillRect(0, 118, 128, 10);
    for (let i = 0; i <= 4; i++) { c.fillRect(i * 30 - 4 + 4, 0, 8, 128); c.fillRect(0, i * 27 + 6, 128, 7); }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return map;
}

export default defineThing({
  questions: {
    contents: choice('What is in the crate?', {
      flatbread: 'Round flatbreads stacked in two leaning piles.',
      water: 'Bottles of water standing in rows, caps up.',
      oranges: 'A heap of oranges, a few about to roll out.',
      blankets: 'Grey blankets folded and pressed in tight.',
    }),
    vest: choice('What vest do they wear?', {
      yellow: 'A hi-vis yellow vest with a grey reflective band.',
      orange: 'A hi-vis orange vest with a grey reflective band.',
      blue: 'A plain blue volunteer vest with many pockets.',
      none: 'No vest; a fleece and cargo trousers.',
    }),
    hat: choice('What is on their head?', {
      cap: 'A baseball cap.',
      beanie: 'A knitted beanie.',
      bare: 'Nothing, hair tied back or cropped.',
    }),
    stride: choice('How are they moving?', {
      standing: 'Standing still, the crate settled against the chest, waiting for a gap.',
      walking: 'Mid-stride, one leg forward, leaning into the next step.',
      stepping: 'Stepping high over a cable or a puddle, knee up.',
    }),
    weight: score('How heavy is the crate?', ['Light: carried easily, upright', 'Heavy: leaning back, chin up', 'Far too heavy: bent backwards, arms shaking']),
    second: noul('Is a second crate waiting on the ground beside them?'),
    lanyard: noul('Does a lanyard with a card swing from the neck?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.64, 1.86, random());
    const skin = pickSkin(random);
    const build = pick(random, ['slight', 'average', 'heavy'] as const);
    const fleece = pick(random, ['#3a3f4a', '#5a4a3a', '#2f5a4a', '#6a6a6c', '#8a3a3a']);
    const person = figure(s, {
      height: H, build, style: 'doll', skin, hair: a.hat === 'cap' ? 'cap' : a.hat === 'bare' ? pick(random, ['short', 'bun', 'long']) : 'short',
      hairColor: a.hat === 'cap' ? pick(random, ['#1f2a44', '#2a2a2c', '#8a2a2a', '#efece4']) : pick(random, ['#2a1d16', '#1d1d1f', '#4a3524', '#8a5a2a']),
      top: fleece, bottom: pick(random, ['#8a7a5a', '#5a5a4a', '#3a3f4a', '#6a6a5a']), shoes: pick(random, ['#5a4030', '#2a2a2c']), sleeves: 'long',
      pose: a.stride === 'walking' ? 'walking' : 'standing', gaze: 'ahead',
    });
    s.root.add(person.root);
    const joints = rig(person);
    const weight = a.weight;
    // Forearms level under the crate, hands at its front edge; the heavier it is, the further back they lean.
    joints.arm('left', { forward: 32, out: 2, bend: 62, across: 10 });
    joints.arm('right', { forward: 32, out: 2, bend: 62, across: 10 });
    joints.lean(-mix(2, 14, weight));
    joints.bow(-mix(0, 6, weight));
    joints.look(-mix(4, 14, weight), 0);
    if (a.stride === 'stepping') { joints.leg('left', { forward: 55, knee: 70 }); joints.leg('right', { forward: -8 }); }
    joints.settle();
    const wide = { slight: 0.85, average: 1, heavy: 1.3 }[build];
    const limb = H * 0.036 * wide, shoulderW = H * 0.115 * wide, torsoL = H * 0.28, headR = H * 0.064;
    const add = (mesh: THREE.Mesh, at: P, parent: THREE.Object3D = joints.spine) => { mesh.position.set(...at); mesh.castShadow = true; parent.add(mesh); return mesh; };

    // The vest over the fleece, a reflective band, pockets; a lanyard and card.
    if (a.vest !== 'none') {
      const colour = { yellow: '#e8f03a', orange: '#ff7a1a', blue: '#2f5fb0', none: '' }[a.vest];
      const vest = add(new THREE.Mesh(new THREE.CylinderGeometry(shoulderW * 1.12, shoulderW * 1.2, torsoL * 0.8, 20, 1, true), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.7, side: THREE.DoubleSide, emissive: a.vest === 'blue' ? '#000000' : colour, emissiveIntensity: a.vest === 'blue' ? 0 : 0.12 })), [0, torsoL * 0.55, 0]);
      vest.scale.z = 1.02;
      if (a.vest !== 'blue') { const band = add(new THREE.Mesh(new THREE.CylinderGeometry(shoulderW * 1.17, shoulderW * 1.18, torsoL * 0.09, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#c8ccd0', roughness: 0.3, metalness: 0.4, side: THREE.DoubleSide })), [0, torsoL * 0.38, 0]); band.scale.z = 1.02; }
      else for (const side of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(shoulderW * 0.45, torsoL * 0.2, 0.012), s.material('#2a4f90')), [side * shoulderW * 0.5, torsoL * 0.3, shoulderW * 1.2 + 0.002]);
    }
    if (a.lanyard) {
      const loop = add(new THREE.Mesh(new THREE.TorusGeometry(headR * 1.1, 0.005, 6, 18), s.material(pick(random, ['#c9402a', '#2f6fc4', '#1d1d1f']))), [0, torsoL * 0.95, 0.02]);
      loop.rotation.x = Math.PI / 2 - 0.9;
      loop.scale.y = 1.6;
      add(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.085, 0.004), new THREE.MeshStandardMaterial({ map: paint(64, 96, (c) => { c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, 64, 96); c.fillStyle = '#c8c4b8'; c.fillRect(14, 12, 36, 36); c.fillStyle = '#2a2a2c'; c.fillRect(10, 58, 44, 5); c.fillRect(10, 70, 30, 5); }), roughness: 0.8 })), [0.02, torsoL * 0.62, shoulderW * 1.2 + 0.03]);
    }
    if (a.hat === 'beanie') beanie(person, s.material(pick(random, ['#2a2a2c', '#8a2a2a', '#4a4a44', '#2b3a5a']), { roughness: 1 }), headR);
    person.root.updateMatrixWorld(true);
    const left = worldOf(person.hands.left), right = worldOf(person.hands.right);
    const hips = worldOf(person.pelvis);

    // The crate: open lattice sides on a frame, resting on the forearms against the chest.
    const crateColour = pick(random, ['#2f6fc4', '#c9402a', '#3a7a3a', '#e8e4dc', '#1d1d1f']);
    const CW = 0.62, CD = 0.42, CH = 0.2;
    const mid = new THREE.Vector3((left.x + right.x) / 2, (left.y + right.y) / 2, (left.z + right.z) / 2);
    const crate = new THREE.Group();
    crate.position.set(mid.x, mid.y - 0.01 + CH / 2, mid.z - CD / 2 + 0.06);
    crate.rotation.x = -mix(0.03, 0.22, weight);
    const panel = new THREE.MeshStandardMaterial({ map: lattice(crateColour), transparent: false, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 });
    const solid = s.material(crateColour, { roughness: 0.6 });
    const sideOf = (w: number, h: number, at: P, ry: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), panel); m.position.set(...at); m.rotation.y = ry; m.castShadow = true; crate.add(m); };
    sideOf(CW, CH, [0, 0, CD / 2], 0);
    sideOf(CW, CH, [0, 0, -CD / 2], Math.PI);
    sideOf(CD, CH, [CW / 2, 0, 0], Math.PI / 2);
    sideOf(CD, CH, [-CW / 2, 0, 0], -Math.PI / 2);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(CW, CD), panel);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -CH / 2 + 0.004;
    crate.add(floor);
    for (const [w, d, x, z] of [[CW, 0.02, 0, CD / 2], [CW, 0.02, 0, -CD / 2], [0.02, CD, CW / 2, 0], [0.02, CD, -CW / 2, 0]] as const) {
      for (const y of [CH / 2, -CH / 2]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.022, d + 0.02), solid); rail.position.set(x, y, z); rail.castShadow = true; crate.add(rail); }
    }
    for (const x of [-CW / 2, CW / 2]) for (const z of [-CD / 2, CD / 2]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.024, CH, 0.024), solid); post.position.set(x, 0, z); crate.add(post); }
    s.root.add(crate);
    // What is in it.
    const inside = (geometry: THREE.BufferGeometry, material: THREE.Material, points: { at: P; size: number; color?: string }[]) => {
      const mesh = new THREE.InstancedMesh(geometry, material, points.length);
      const matrix = new THREE.Matrix4();
      points.forEach((p, i) => { matrix.makeScale(p.size, p.size, p.size).setPosition(...p.at); mesh.setMatrixAt(i, matrix); if (p.color) mesh.setColorAt(i, new THREE.Color(p.color)); });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true;
      crate.add(mesh);
      return mesh;
    };
    const base = -CH / 2 + 0.012;
    if (a.contents === 'flatbread') {
      const bread = s.material('#d9b47a', { roughness: 0.95 });
      inside(new THREE.CylinderGeometry(0.15, 0.15, 0.011, 18), bread, Array.from({ length: 22 }, (_u, i) => ({ at: [(i % 2 ? -0.15 : 0.15) + (random() - 0.5) * 0.03, base + Math.floor(i / 2) * 0.014 + 0.006, (random() - 0.5) * 0.04] as P, size: 1, color: pick(random, ['#d9b47a', '#e2c08a', '#c9a060', '#b8884a']) })));
      inside(new THREE.SphereGeometry(1, 5, 4), s.material('#8a5a2a'), Array.from({ length: 24 }, () => ({ at: [(random() < 0.5 ? -0.15 : 0.15) + (random() - 0.5) * 0.2, base + 11 * 0.014 + 0.014, (random() - 0.5) * 0.2] as P, size: 0.008 })));
    }
    if (a.contents === 'water') {
      const clear = new THREE.MeshStandardMaterial({ color: '#dff0ff', transparent: true, opacity: 0.55, roughness: 0.1 });
      const spots = Array.from({ length: 18 }, (_u, i) => [-0.25 + (i % 6) * 0.1, -0.12 + Math.floor(i / 6) * 0.12] as const);
      inside(new THREE.CylinderGeometry(0.04, 0.038, 0.24, 12), clear, spots.map(([x, z]) => ({ at: [x, base + 0.12, z] as P, size: 1 })));
      inside(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 10), s.material(pick(random, ['#2f6fc4', '#efece4', '#c9402a'])), spots.map(([x, z]) => ({ at: [x, base + 0.25, z] as P, size: 1 })));
    }
    if (a.contents === 'oranges') inside(new THREE.SphereGeometry(0.042, 12, 9), s.material('#f08a20', { roughness: 0.75 }), Array.from({ length: 34 }, (_u, i) => ({
      // Four rows across the floor, then a loose second layer heaped on top.
      at: i < 28 ? [-0.25 + (i % 7) * 0.085 + (random() - 0.5) * 0.02, base + 0.04, -0.14 + Math.floor(i / 7) * 0.09] as P : [-0.2 + (i - 28) * 0.07 + (random() - 0.5) * 0.03, base + 0.105, (random() - 0.5) * 0.16] as P,
      size: mix(0.9, 1.1, random()),
    })));
    if (a.contents === 'blankets') for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.13, CH * 1.1, CD * 0.9), s.material(pick(random, ['#6a6a6c', '#4a5a6a', '#8a7a6a', '#5a6a5a']), { roughness: 1 })); b.position.set(-0.22 + i * 0.145, base + CH * 0.5, 0); b.rotation.z = (random() - 0.5) * 0.1; b.castShadow = true; crate.add(b); }

    // The second crate on the ground, and mud if the ground is bad.
    if (a.second) {
      const g = new THREE.Group();
      g.position.set(hips.x + (random() < 0.5 ? -0.75 : 0.75), CH / 2 + 0.01, hips.z + 0.3);
      g.rotation.y = (random() - 0.5) * 0.8;
      const paint2 = new THREE.MeshStandardMaterial({ map: lattice(pick(random, ['#2f6fc4', '#c9402a', '#1d1d1f'])), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 });
      const walls: { w: number; at: P; ry: number }[] = [{ w: CW, at: [0, 0, CD / 2], ry: 0 }, { w: CW, at: [0, 0, -CD / 2], ry: Math.PI }, { w: CD, at: [CW / 2, 0, 0], ry: Math.PI / 2 }, { w: CD, at: [-CW / 2, 0, 0], ry: -Math.PI / 2 }];
      for (const { w, at, ry } of walls) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, CH), paint2); m.position.set(...at); m.rotation.y = ry; m.castShadow = true; g.add(m); }
      const lid = new THREE.Mesh(new THREE.BoxGeometry(CW + 0.02, 0.022, CD + 0.02), s.material('#2a2a2c')); lid.position.y = CH / 2; g.add(lid);
      const bottom = new THREE.Mesh(new THREE.BoxGeometry(CW + 0.02, 0.022, CD + 0.02), s.material('#2a2a2c')); bottom.position.y = -CH / 2; g.add(bottom);
      s.root.add(g);
    }
    if (mood.wear > 0.5) s.scatter(new THREE.CylinderGeometry(1, 1, 0.004, 8), s.material('#4a3a2a', { roughness: 1 }), Array.from({ length: 5 }, () => ({ at: [hips.x + (random() - 0.5) * 1.2, 0.003, hips.z + (random() - 0.5) * 1] as P, size: 0.04 + random() * 0.05 })));

    const energy = mood.energy;
    const shake = weight > 0.75;
    const crateY = crate.position.y;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        if (shake) crate.position.y = crateY + Math.sin(time * 18) * 0.004 * (0.5 + energy);
      },
    });
  },
});
