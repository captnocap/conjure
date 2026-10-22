import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { SAND, bed, lump, strew, type Speck } from './grains';

const GEMS = {
  clear: 'Clear, a would-be diamond.',
  ruby: 'Ruby red.',
  sapphire: 'Sapphire blue.',
  emerald: 'Emerald green.',
  pink: 'Bubblegum pink.',
  turquoise: 'Opaque turquoise.',
} as const;
const GEM: Record<keyof typeof GEMS, string> = { clear: '#e8f4f6', ruby: '#d21f3c', sapphire: '#2456c8', emerald: '#1f9a5b', pink: '#f27fb2', turquoise: '#35b8b0' };
const METAL = { gold: '#e2b23e', silver: '#cfd4d8', rose: '#e0a28a' } as const;

export default defineThing({
  questions: {
    head: choice('What kind of stud is it?', {
      pearl: 'A single cream pearl on a little cup.',
      ball: 'A plain polished metal ball.',
      gem: 'A faceted paste gem held in four claws.',
      cabochon: 'A smooth domed stone in a rim setting.',
      daisy: 'A tiny enamel daisy, a child\'s first earring.',
    }),
    stone: choice('If it has a stone or enamel, what colour?', GEMS),
    metal: choice('What is the metal?', { gold: 'Yellow gold.', silver: 'Silver.', rose: 'Rose gold.' }),
    back: choice('Where is its butterfly back?', {
      on: 'Still clipped on the post: it fell out whole, somehow.',
      nearby: 'Lying a little way off in the sand, where it popped loose.',
      missing: 'Gone. Only the stud is here.',
      only: 'The back is all there is: the stud itself is still missing.',
    }),
    lie: choice('How does it lie?', {
      side: 'On its side, head and post tip touching the sand, its face turned up to the light.',
      faceup: 'Face up, the post sunk straight down like a pin in a cushion.',
      facedown: 'Face down, the post standing up like a tiny flagpole.',
    }),
    buried: score('How far has the sand taken it?', ['Lying on the surface, dropped a minute ago', 'Settled in, a rim of grains against it', 'Nearly swallowed, one glint left showing']),
    trace: choice('What else is there?', {
      nothing: 'Nothing but sand.',
      hair: 'A long hair still looped round the post.',
      furrow: 'Finger furrows raked through the sand by someone searching.',
      wet: 'A film of water from the last wave, already carrying sand over it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    s.root.scale.setScalar(0.03); // one unit is the radius of the stud's head (about 3 mm), shown magnified
    const tarnish = mood.wear * 0.45;
    const metalTint = new THREE.Color(METAL[a.metal]).lerp(new THREE.Color(a.metal === 'silver' ? '#5f5a52' : '#7a7448'), tarnish);
    const metal = new THREE.MeshStandardMaterial({ color: metalTint, metalness: 0.55, roughness: mix(0.2, 0.6, mood.wear), emissive: metalTint, emissiveIntensity: mix(0.1, 0.22, mood.cheer) });
    const gemTint = new THREE.Color(GEM[a.stone]);
    const dark = new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.8 });
    const ball = new THREE.SphereGeometry(1, 28, 20);
    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], scale: [number, number, number] | number = 1) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      if (typeof scale === 'number') mesh.scale.setScalar(scale); else mesh.scale.set(...scale);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const tube = (r: number, h: number) => { const g = new THREE.CylinderGeometry(r, r, h, 16); g.rotateX(Math.PI / 2); return g; };

    // The stud: face towards +z, post running back along -z.
    const stud = new THREE.Group();
    const postLength = 3.4;
    put(stud, tube(0.11, postLength), metal, [0, 0, -0.3 - postLength / 2]);
    put(stud, ball, metal, [0, 0, -0.3 - postLength], 0.11);
    put(stud, new THREE.TorusGeometry(0.11, 0.03, 6, 16), dark, [0, 0, -0.3 - postLength + 0.5]);
    let sparkle: THREE.MeshStandardMaterial | null = null;
    if (a.head === 'pearl') {
      const lustre = new THREE.Color('#f6eee1').lerp(new THREE.Color('#f3d9d6'), mood.warmth * 0.5);
      put(stud, ball, new THREE.MeshStandardMaterial({ color: lustre, roughness: 0.22, emissive: lustre, emissiveIntensity: 0.18 }), [0, 0, 0.45], 1);
      put(stud, tube(0.55, 0.14), metal, [0, 0, -0.42]);
    } else if (a.head === 'ball') {
      put(stud, ball, metal, [0, 0, 0.4], 0.95);
    } else if (a.head === 'gem') {
      const cut = new THREE.LatheGeometry([[0.001, -0.8], [1, 0], [1, 0.07], [0.62, 0.4], [0.001, 0.4]].map(([x, y]) => new THREE.Vector2(x, y)), 8);
      cut.rotateX(Math.PI / 2);
      const flat = cut.toNonIndexed();
      flat.computeVertexNormals();
      sparkle = new THREE.MeshStandardMaterial({ color: gemTint, roughness: 0.05, metalness: 0.15, emissive: gemTint, emissiveIntensity: 0.4, transparent: a.stone !== 'turquoise', opacity: 0.88 });
      put(stud, flat, sparkle, [0, 0, 0.45]);
      put(stud, new THREE.TorusGeometry(0.62, 0.07, 8, 24), metal, [0, 0, 0.02]);
      put(stud, tube(0.3, 0.3), metal, [0, 0, -0.3]);
      for (let i = 0; i < 4; i++) {
        const angle = i * 1.5708 + 0.785, cx = Math.cos(angle), cy = Math.sin(angle);
        const claw = put(stud, new THREE.CylinderGeometry(0.075, 0.09, 1.25, 8), metal, [cx * 0.78, cy * 0.78, 0.1]);
        claw.lookAt(cx * 1.05, cy * 1.05, 0.72 + 0.1);
        claw.rotateX(Math.PI / 2);
        put(stud, ball, metal, [cx * 0.9, cy * 0.9, 0.6], 0.13);
      }
    } else if (a.head === 'cabochon') {
      sparkle = new THREE.MeshStandardMaterial({ color: gemTint, roughness: 0.15, emissive: gemTint, emissiveIntensity: 0.25 });
      put(stud, ball, sparkle, [0, 0, 0], [0.92, 0.92, 0.6]);
      put(stud, new THREE.TorusGeometry(0.97, 0.12, 8, 32), metal, [0, 0, 0]);
      put(stud, tube(0.97, 0.16), metal, [0, 0, -0.14]);
    } else {
      const enamel = new THREE.MeshStandardMaterial({ color: a.stone === 'clear' ? '#f7f5ee' : gemTint, roughness: 0.2, emissive: a.stone === 'clear' ? '#f7f5ee' : gemTint, emissiveIntensity: 0.15 });
      for (let i = 0; i < 6; i++) put(stud, ball, enamel, [Math.cos(i * 1.047) * 0.68, Math.sin(i * 1.047) * 0.68, 0], [0.42, 0.42, 0.16]);
      put(stud, ball, metal, [0, 0, 0.08], [0.36, 0.36, 0.24]);
      put(stud, tube(0.5, 0.12), metal, [0, 0, -0.14]);
    }

    // The butterfly back: a pierced plate with two scrolled wings that pinch the post.
    const butterfly = () => {
      const group = new THREE.Group();
      put(group, tube(0.78, 0.07), metal, [0, 0, 0]);
      put(group, tube(0.14, 0.09), dark, [0, 0, 0]);
      for (const side of [-1, 1]) {
        const wing = put(group, new THREE.TorusGeometry(0.34, 0.05, 6, 22, 4.9), metal, [side * 0.42, 0, -0.34], [1, 1, 9]);
        wing.rotation.set(Math.PI / 2, 0, 0);
        wing.rotateZ(side > 0 ? Math.PI * 0.5 + 0.2 : -1.2);
        if (side > 0) wing.scale.x = -1;
      }
      return group;
    };

    const onlyBack = a.back === 'only';
    const sink = a.buried;
    const pivot = new THREE.Group();
    if (!onlyBack) {
      pivot.add(stud);
      if (a.back === 'on') { const back = butterfly(); back.position.z = -0.3 - postLength * 0.55; stud.add(back); }
      if (a.lie === 'side') {
        pivot.rotation.set(-0.3, 0.75 + (random() - 0.5) * 0.4, 0);
        pivot.position.y = 0.92 - sink * 1.05;
      } else if (a.lie === 'faceup') {
        pivot.rotation.set(-Math.PI / 2 + 0.22, (random() - 0.5) * 0.6, 0.1);
        pivot.position.y = (a.back === 'on' ? 2.3 : 0.75) - sink * 0.7;
      } else {
        pivot.rotation.set(Math.PI / 2 - 0.18, (random() - 0.5) * 0.6, 0);
        pivot.position.y = 1.0 - sink * 0.9;
      }
      s.root.add(pivot);
    }
    const reach = 3.2;
    if (a.back === 'nearby' || onlyBack) {
      const back = butterfly();
      back.rotation.set(Math.PI / 2 + 0.25, 0, random() * 6);
      const angle = 0.5 + random() * 1.4;
      if (onlyBack) { back.position.set(0, 0.5 - sink * 0.35, 0); back.scale.setScalar(1.5); back.rotation.x = Math.PI / 2 - 0.5; }
      else back.position.set(Math.sin(angle) * 2.1, 0.42 - sink * 0.3, Math.cos(angle) * 2.1);
      s.root.add(back);
    }
    pivot.updateMatrixWorld(true);
    if (!onlyBack) {
      const box = new THREE.Box3().setFromObject(pivot, true), centre = box.getCenter(new THREE.Vector3());
      pivot.position.x -= centre.x * 0.8;
      pivot.position.z -= centre.z * 0.8;
    }

    const wet = a.trace === 'wet';
    s.root.add(bed(random, { radius: reach, grain: 0.3, count: 420 + Math.round(mood.density * 380), palette: SAND.tan, specks: SAND.dark, speckShare: 0.05, wet: wet ? 0.7 : 0 }));
    // Grains banked up against it as it sinks.
    const loose: Speck[] = [];
    const bank = Math.round(sink * 70);
    for (let i = 0; i < bank; i++) {
      const angle = random() * 6.283, r = 0.5 + random() * 1.1;
      loose.push({ x: pivot.position.x * 0 + Math.cos(angle) * r, y: 0.12 + random() * 0.3 * sink * (1.6 - r), z: Math.sin(angle) * r + (a.lie === 'side' ? 0.4 : 0), size: 0.14 + random() * 0.1, color: SAND.tan[i % 6] });
    }
    if (a.trace === 'furrow') {
      // Four parallel grooves with ridges of spoil between them.
      for (let f = 0; f < 4; f++) for (let i = 0; i < 26; i++) {
        const t = i / 25 - 0.5, x = -1.9 + f * 0.62 + Math.sin(t * 3 + f) * 0.18 + t * 0.9, z = t * reach * 1.5 - 0.3;
        if (Math.hypot(x, z) > reach * 0.9 || Math.hypot(x, z) < 1.2) continue;
        loose.push({ x: x + 0.3, y: 0.2, z, size: 0.2 + random() * 0.08, color: SAND.tan[(i + f) % 6] });
        loose.push({ x, y: 0.05, z, size: 0.25, color: '#7d6741', flat: 0.3 });
      }
    }
    if (loose.length) s.root.add(strew(random, loose, lump(random, { detail: 1, amp: 0.3, chips: 2 }), new THREE.MeshStandardMaterial({ roughness: 0.6 })));
    if (a.trace === 'hair' && !onlyBack) {
      const hair = new THREE.MeshStandardMaterial({ color: mood.warmth > 0.6 ? '#7a3b1c' : mood.warmth < 0.3 ? '#d8c9a0' : '#2b1d14', roughness: 0.4 });
      const tip = new THREE.Vector3(0, 0, -0.3 - postLength * 0.7).applyMatrix4(pivot.matrixWorld.identity().compose(pivot.position, pivot.quaternion, pivot.scale));
      const points: [number, number, number][] = [];
      for (let i = 0; i < 7; i++) points.push([tip.x + Math.cos(i * 1.6) * 0.2, Math.max(0.12, tip.y + Math.sin(i * 1.6) * 0.2), tip.z + i * 0.03]);
      for (let i = 1; i < 9; i++) points.push([tip.x + i * 0.3 + Math.sin(i * 1.1) * 0.5, Math.max(0.14, tip.y * (1 - i / 4)), tip.z + Math.sin(i * 0.7) * 1.1 + i * 0.12]);
      const strand = s.tube(points.filter(([x, , z]) => Math.hypot(x, z) < reach * 0.95), 0.035, hair);
      strand.castShadow = true;
    }
    if (wet) {
      const film = s.mesh(new THREE.CylinderGeometry(reach * 0.78, reach * 0.84, 0.07, 40), new THREE.MeshStandardMaterial({ color: '#a9d2d6', transparent: true, opacity: 0.38, roughness: 0.04, metalness: 0.3, depthWrite: false }), [0.2, 0.16, 0.3]);
      film.scale.z = 0.75;
      film.castShadow = false;
    }

    const glow = sparkle?.emissiveIntensity ?? 0;
    return s.finish({
      footprint: reach * 0.03 * 0.7,
      update: (_dt, time) => { if (sparkle) sparkle.emissiveIntensity = glow * (1 + 0.5 * mood.energy * Math.sin(time * (1 + mood.energy * 4))); },
    });
  },
});
