import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { type Blob, type V, clump, fuse, instances, limb, v } from './parts';

const SPECIES = {
  rhinoceros: 'Rhinoceros hornbill: black, white tail with a black band, ivory bill under an upswept orange horn.',
  helmeted: 'Helmeted hornbill: a blunt red block of a casque, bare wrinkled red neck and two absurdly long central tail feathers.',
  great: 'Great hornbill: a broad flat yellow casque, yellow neck and a pale bar across each wing.',
  wreathed: 'Wreathed hornbill: a low ridged casque, cream neck, bulging yellow throat pouch and an all-white tail.',
  pied: 'Pied hornbill: smaller, white-bellied, with a big cream casque blotched black.',
} as const;

interface Kit { size: number; bill: string; casque: string; neck: string; belly: string; tail: [string, string, string]; pouch?: string }
const KITS: Record<keyof typeof SPECIES, Kit> = {
  rhinoceros: { size: 1, bill: '#efe2b0', casque: '#e8642a', neck: '#17181a', belly: '#e9e6dc', tail: ['#eeeae0', '#17181a', '#eeeae0'] },
  helmeted: { size: 1.1, bill: '#e8c55a', casque: '#c9332b', neck: '#a8322c', belly: '#e9e6dc', tail: ['#eeeae0', '#17181a', '#eeeae0'] },
  great: { size: 1.08, bill: '#f0c93a', casque: '#f0c93a', neck: '#e9cf6a', belly: '#17181a', tail: ['#eeeae0', '#17181a', '#eeeae0'] },
  wreathed: { size: 0.86, bill: '#e9dfb4', casque: '#b9643a', neck: '#ead9b0', belly: '#17181a', tail: ['#eeeae0', '#eeeae0', '#eeeae0'], pouch: '#f2d22e' },
  pied: { size: 0.68, bill: '#efe6c0', casque: '#efe6c0', neck: '#17181a', belly: '#eeeae0', tail: ['#17181a', '#17181a', '#eeeae0'] },
};

export default defineThing({
  questions: {
    species: choice('Which hornbills are they?', SPECIES),
    silhouette: noul('Are they seen as pure black cut-out silhouettes against the light, with no colour at all?'),
    perch: choice('What is the perched bird sitting on?', {
      snag: 'A bleached dead snag with one bare side branch.',
      fig: 'A leafy bough of a fruiting fig, hung with ripe figs.',
      nest: 'A stub beside the nest hole in a great trunk, the entrance walled up with mud to a narrow slit.',
      crown: 'The topmost bare twigs poking out of a rounded tree crown, nothing above but sky.',
    }),
    sitting: choice('What is the perched bird doing?', {
      watching: 'Sitting bolt upright, bill level, watching the other.',
      calling: 'Head thrown back, bill wide open, honking.',
      tossing: 'Tossing a fruit into the air to catch it down its throat.',
      hunched: 'Hunched and sunk into its shoulders, waiting out rain or a bad mood.',
    }),
    flying: choice('What is the flying bird doing?', {
      glide: 'A long level glide, wings flat, primaries spread like fingers.',
      stroke: 'Deep in a wingbeat, wings swept down, the air whooshing.',
      arriving: 'Flaring to land beside its mate: body tipped back, wings high, tail fanned, feet reaching.',
      carrying: 'Gliding in with a fig held at the tip of its bill, a gift.',
    }),
    apart: score('How far apart are they?', ['Almost touching', 'A few wingbeats apart', 'One far out in open air, the other left behind']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();
    const kit = KITS[a.species];
    const ink = '#17181a';
    const tone = (c: string) => (a.silhouette ? ink : c);
    const mat = (c: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: tone(c), roughness: 0.75, side: THREE.DoubleSide, ...extra });
    const black = mat(ink), bill = mat(kit.bill, { roughness: 0.45 }), casque = mat(kit.casque, { roughness: 0.45, emissive: a.silhouette ? '#000000' : kit.casque, emissiveIntensity: 0.12 * mood.cheer }), neckMat = mat(kit.neck), belly = mat(kit.belly), grey = mat('#5d5a55');
    const fruitMat = new THREE.MeshStandardMaterial({ color: a.silhouette ? ink : '#d8442b', roughness: 0.5 });
    const tailMats = kit.tail.map((c) => mat(c));
    const add = (group: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };
    const ball = (group: THREE.Object3D, size: [number, number, number], at: [number, number, number], material: THREE.Material) => {
      const mesh = add(group, new THREE.SphereGeometry(1, 16, 10), material);
      mesh.scale.set(...size);
      mesh.position.set(...at);
      return mesh;
    };

    const wingRigs: { pivot: THREE.Group; base: number; amp: number; sign: number }[] = [];

    function bird(flying: boolean, pose: string) {
      const g = new THREE.Group();
      const torso = new THREE.Group();
      g.add(torso);
      const pitch = flying ? (pose === 'arriving' ? 0.6 : pose === 'stroke' ? 0.08 : 0) : pose === 'hunched' ? 0.75 : 1.0;
      torso.rotation.z = pitch;
      torso.position.set(flying ? 0 : -0.03, flying ? 0 : 0.2, 0);
      ball(torso, [0.25, 0.135, 0.13], [0, 0, 0], black);
      if (kit.belly !== ink) ball(torso, [0.13, 0.09, 0.105], [-0.11, -0.055, 0], belly);

      // Tail: three bands, plus streamers for the helmeted hornbill.
      const fan = pose === 'arriving' ? 1.7 : 1;
      const tail = new THREE.Group();
      tail.position.set(-0.2, 0.01, 0);
      tail.rotation.z = flying ? 0.05 : -0.25;
      torso.add(tail);
      [0.2, 0.14, 0.12].reduce((x, len, i) => {
        const w0 = (0.1 + i * 0.03) * fan, shape = new THREE.BoxGeometry(len, 0.014, w0 + 0.04);
        add(tail, shape, tailMats[i]).position.set(-x - len / 2, 0, 0);
        return x + len;
      }, 0);
      if (a.species === 'helmeted') for (const z of [-0.02, 0.02]) add(tail, new THREE.BoxGeometry(0.5, 0.01, 0.035), tailMats[z < 0 ? 0 : 2]).position.set(-0.68, 0.004, z);

      // Wings.
      for (const sign of [-1, 1]) {
        if (!flying) {
          const folded = ball(torso, [0.23, 0.1, 0.035], [-0.05, 0.02, sign * 0.115], black);
          folded.rotation.z = -0.12;
          if (a.species === 'great') ball(torso, [0.1, 0.02, 0.04], [-0.02, 0.0, sign * 0.118], mat('#e9dca0'));
          continue;
        }
        const pivot = new THREE.Group();
        pivot.position.set(0.06, 0.07, sign * 0.09);
        torso.add(pivot);
        const wing = new THREE.Group();
        wing.scale.set(1.15, 1, sign * 1.3);
        pivot.add(wing);
        const plan = new THREE.Shape();
        plan.moveTo(0.16, 0);
        plan.quadraticCurveTo(0.22, 0.3, 0.13, 0.6);
        plan.lineTo(-0.1, 0.56);
        plan.lineTo(-0.2, 0.42);
        plan.lineTo(-0.17, 0.3);
        plan.lineTo(-0.23, 0.18);
        plan.lineTo(-0.19, 0);
        plan.closePath();
        const panel = new THREE.ExtrudeGeometry(plan, { depth: 0.014, bevelEnabled: false, curveSegments: 6 });
        panel.rotateX(Math.PI / 2);
        add(wing, panel, black);
        if (a.species === 'great') add(wing, new THREE.BoxGeometry(0.07, 0.018, 0.5), mat('#e9dca0')).position.set(-0.02, 0, 0.3);
        const feathers: THREE.BufferGeometry[] = [];
        for (let i = 0; i < 7; i++) {
          if (random() < mood.wear * 0.3) continue;
          const len = 0.36 - i * 0.025, ang = -0.35 + i * 0.24;
          const f = new THREE.BoxGeometry(0.052, 0.008, len);
          f.translate(0, 0, len / 2);
          f.rotateY(-ang);
          f.translate(0.11 - i * 0.04, -0.006, 0.55);
          feathers.push(f);
        }
        if (feathers.length) add(wing, fuse(feathers), a.species === 'pied' ? mat('#eeeae0') : black);
        const base = pose === 'arriving' ? -0.75 : pose === 'stroke' ? 0.5 : -0.1;
        pivot.rotation.x = sign * base;
        wingRigs.push({ pivot, base, amp: pose === 'stroke' ? 0.55 : pose === 'arriving' ? 0.3 : 0.06, sign });
      }

      // Neck and head.
      const neckBase = v(0.2, 0.05, 0).applyAxisAngle(v(0, 0, 1), pitch).add(torso.position);
      const neckAngle = flying ? (pose === 'arriving' ? 0.5 : 0.12) : pose === 'hunched' ? 0.9 : pose === 'calling' ? 1.5 : 1.15;
      const neckLen = (flying ? 0.24 : pose === 'hunched' ? 0.08 : 0.2);
      const headAt = neckBase.clone().add(v(Math.cos(neckAngle) * neckLen, Math.sin(neckAngle) * neckLen, 0));
      add(g, limb([neckBase.clone().add(v(-0.06, -0.03, 0)), neckBase.clone().lerp(headAt, 0.5).add(v(-0.01, 0, 0)), headAt], 0.085, 0.062, 8), neckMat);
      if (kit.pouch && !a.silhouette) ball(g, [0.06, 0.07, 0.05], [neckBase.x + 0.05, neckBase.y + neckLen * 0.5, 0], mat(kit.pouch));
      const head = new THREE.Group();
      head.position.copy(headAt);
      head.rotation.z = pose === 'calling' ? 1.0 : pose === 'tossing' ? 0.75 : pose === 'hunched' ? -0.3 : flying ? (pose === 'arriving' ? -0.25 : -0.05) : rnd(-0.12, 0.06);
      g.add(head);
      ball(head, [0.085, 0.078, 0.07], [0.01, 0.01, 0], a.species === 'wreathed' ? neckMat : black);
      if (!a.silhouette) for (const z of [-0.062, 0.062]) ball(head, [0.016, 0.016, 0.01], [0.04, 0.03, z], mat('#c8332b'));
      const gape = pose === 'calling' ? 0.4 : pose === 'tossing' ? 0.3 : 0;
      const upper = limb([v(0.05, 0.015, 0), v(0.2, 0.012, 0), v(0.34, -0.045, 0), v(0.42, -0.11, 0)], 0.05, 0.012, 7);
      upper.scale(1, 1, 0.55);
      add(head, upper, bill);
      const lower = limb([v(0.04, -0.03, 0), v(0.18, -0.045, 0), v(0.32, -0.085, 0), v(0.4, -0.125, 0)], 0.032, 0.01, 6);
      lower.scale(1, 1, 0.5);
      const jaw = add(head, lower, bill);
      jaw.rotation.z = -gape;
      // The casque is what makes each species itself.
      if (a.species === 'rhinoceros') {
        const horn = limb([v(-0.02, 0.07, 0), v(0.1, 0.085, 0), v(0.2, 0.12, 0), v(0.26, 0.21, 0)], 0.045, 0.014, 7);
        horn.scale(1, 1, 0.6);
        add(head, horn, casque);
      } else if (a.species === 'helmeted') {
        ball(head, [0.085, 0.06, 0.045], [0.07, 0.075, 0], casque);
        add(head, new THREE.BoxGeometry(0.03, 0.1, 0.07), bill).position.set(0.15, 0.065, 0);
      } else if (a.species === 'great') {
        ball(head, [0.14, 0.035, 0.075], [0.08, 0.085, 0], casque);
        for (const z of [-0.05, 0.05]) ball(head, [0.05, 0.03, 0.022], [0.2, 0.09, z], casque);
      } else if (a.species === 'wreathed') {
        for (let i = 0; i < 4; i++) ball(head, [0.03, 0.03, 0.04], [0.04 + i * 0.045, 0.07 - i * 0.004, 0], casque);
      } else {
        ball(head, [0.14, 0.065, 0.04], [0.1, 0.08, 0], casque);
        ball(head, [0.04, 0.05, 0.042], [0.21, 0.075, 0], black);
      }
      const tip = v(0.43, -0.12, 0);
      if (pose === 'carrying') ball(head, [0.035, 0.035, 0.035], [tip.x, tip.y - 0.01, 0], fruitMat);
      if (pose === 'tossing') ball(head, [0.035, 0.035, 0.035], [tip.x + 0.12, tip.y + 0.02, 0], fruitMat);

      // Feet.
      if (!flying) for (const z of [-0.05, 0.05]) { add(g, limb([v(0, 0.14, z), v(0.02, 0.03, z)], 0.02, 0.016, 5), grey); ball(g, [0.045, 0.02, 0.022], [0.02, 0.012, z], grey); }
      if (flying && pose === 'arriving') for (const z of [-0.05, 0.05]) add(g, limb([v(0.02, -0.08, z), v(0.14, -0.22, z), v(0.2, -0.25, z)], 0.02, 0.014, 5), grey);
      g.scale.setScalar(kit.size);
      return g;
    }

    // The perch.
    const deadWood = s.material(a.silhouette ? '#55504a' : new THREE.Color('#b5ad9c').lerp(new THREE.Color('#8f8b76'), mood.wear * 0.5), { roughness: 0.95 });
    const bark = s.material(a.silhouette ? '#4a4640' : new THREE.Color('#7b6a55').lerp(new THREE.Color('#9a7a55'), mood.warmth * 0.4), { roughness: 0.95 });
    const leafTone = a.silhouette ? new THREE.Color('#3c423a') : new THREE.Color().setHSL(mix(0.36, 0.26, mood.warmth), 0.5, mix(0.18, 0.28, mood.cheer));
    const leafMaterial = new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true });
    const leaves: Blob[] = [];
    const leaf = (at: V, size: number, flat = 0.6) => leaves.push({ at, size: v(size, size * flat, size), color: leafTone.clone().offsetHSL(rnd(-0.02, 0.02), 0, rnd(-0.04, 0.05)), turn: rnd(0, 6) });
    const woodParts: THREE.BufferGeometry[] = [];
    let seat = v(0, 2.6, 0);
    let woodMat: THREE.Material = deadWood;
    if (a.perch === 'snag') {
      const top = rnd(2.3, 2.9), lean = rnd(-0.35, 0.1);
      woodParts.push(limb([v(-0.75, -0.3, 0), v(-0.7 + lean * 0.3, top * 0.4, rnd(-0.1, 0.1)), v(-0.62 + lean, top * 0.8, 0), v(-0.5 + lean, top, 0.05)], 0.26, 0.07, 8));
      seat = v(0.1, top * 0.66, 0);
      woodParts.push(limb([v(-0.68 + lean * 0.5, top * 0.56, 0), v(-0.3, top * 0.64, 0), seat.clone().add(v(0, -0.04, 0)), v(0.75, top * 0.7, 0.04), v(1.15, top * 0.78, 0.1)], 0.09, 0.025, 6));
      woodParts.push(limb([v(-0.66 + lean * 0.4, top * 0.42, 0), v(-1.1, top * 0.52, -0.2), v(-1.35, top * 0.63, -0.3)], 0.06, 0.02, 5));
      woodParts.push(limb([v(-0.6 + lean, top * 0.83, 0), v(-0.9 + lean, top * 0.93, 0.2)], 0.045, 0.015, 5));
    } else if (a.perch === 'fig') {
      woodMat = bark;
      const h = rnd(1.9, 2.3);
      woodParts.push(limb([v(-1.25, -0.3, 0), v(-1.2, h * 0.5, 0), v(-1.1, h * 0.95, 0), v(-0.95, h * 1.3, 0)], 0.28, 0.14, 9));
      seat = v(0.15, h * 0.92, 0);
      woodParts.push(limb([v(-1.15, h * 0.8, 0), v(-0.5, h * 0.93, 0), seat.clone().add(v(0, -0.05, 0)), v(0.9, h * 0.86, 0.05), v(1.4, h * 0.74, 0.1)], 0.12, 0.03, 7));
      for (let i = 0; i < 6 + Math.round(mood.density * 5); i++) leaf(v(rnd(-1.6, -0.2), h * rnd(1.15, 1.5), rnd(-0.7, 0.7)), rnd(0.35, 0.6));
      for (let i = 0; i < 4; i++) leaf(v(rnd(0.9, 1.6), h * rnd(0.7, 0.86), rnd(-0.3, 0.4)), rnd(0.22, 0.36));
      const figs: Blob[] = [];
      for (let i = 0; i < 14 + Math.round(mood.density * 14); i++) {
        const t = rnd(0, 1), size = rnd(0.035, 0.055);
        figs.push({ at: v(mix(-0.9, 1.35, t), h * mix(0.9, 0.76, t * t) - rnd(0.08, 0.2), rnd(-0.1, 0.12)), size: v(size, size, size), color: a.silhouette ? ink : random() < 0.6 ? '#d8442b' : '#e39a2e' });
      }
      s.root.add(instances(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.5 }), figs));
    } else if (a.perch === 'nest') {
      woodMat = bark;
      const h = rnd(2.7, 3.1), r = 0.45;
      woodParts.push(limb([v(-1.0, -0.4, 0), v(-0.98, h * 0.5, 0), v(-0.95, h, 0)], r * 1.1, r * 0.85, 12));
      seat = v(0.05, h * 0.52, 0.12);
      woodParts.push(limb([v(-0.7, h * 0.44, 0.1), v(-0.3, h * 0.5, 0.12), seat.clone().add(v(0, -0.04, 0)), v(0.5, h * 0.56, 0.14)], 0.08, 0.03, 6));
      // The sealed nest: a mud plaster oval with one dark slit, and sometimes a bill tip poking out.
      const mud = s.ball([0.1, 0.3, 0.22], [-0.98 + r * 0.92, h * 0.66, 0.16], s.material(a.silhouette ? '#6a645c' : '#a08460', { roughness: 1 }), 14);
      mud.rotation.y = 0.25;
      s.box([0.06, 0.34, 0.035], [-0.98 + r * 0.92 + 0.07, h * 0.66, 0.18], s.material('#0f0f10'));
      if (mood.cheer > 0.3) { const peek = limb([v(-0.4, h * 0.68, 0.18), v(-0.28, h * 0.675, 0.18), v(-0.2, h * 0.65, 0.18)], 0.03, 0.01, 6); woodParts.length; s.mesh(peek, bill); }
      for (let i = 0; i < 3 + Math.round(mood.density * 4); i++) leaf(v(-0.98 + rnd(-0.45, 0.45), h * rnd(0.98, 1.1), rnd(-0.45, 0.45)), rnd(0.35, 0.55));
    } else {
      woodMat = bark;
      const r = rnd(1.1, 1.4);
      for (let i = 0; i < 9; i++) { const ang = (i / 9) * 6.28, out = i === 0 ? 0 : r * rnd(0.45, 0.75); leaf(v(Math.cos(ang) * out, i === 0 ? r * 0.55 : r * rnd(0.15, 0.4), Math.sin(ang) * out), r * rnd(0.5, 0.7), 0.75); }
      const top = r * 1.05 + rnd(1.0, 1.4);
      seat = v(0.12, top * 0.9, 0);
      woodParts.push(limb([v(-0.2, 0.2, 0), v(-0.15, top * 0.5, 0), v(-0.05, top * 0.82, 0), seat.clone().add(v(0, -0.04, 0)), v(0.5, top, 0.05)], 0.09, 0.02, 6));
      woodParts.push(limb([v(-0.12, top * 0.6, 0), v(-0.5, top * 0.85, 0.15), v(-0.7, top * 1.08, 0.2)], 0.045, 0.012, 5));
      woodParts.push(limb([v(-0.1, top * 0.7, 0), v(0.1, top * 1.0, -0.3), v(0.05, top * 1.2, -0.4)], 0.04, 0.012, 5));
    }
    s.mesh(fuse(woodParts), woodMat);
    if (leaves.length) s.root.add(instances(clump(), leafMaterial, leaves));

    const sitter = bird(false, a.sitting);
    sitter.position.copy(seat);
    s.root.add(sitter);

    const flyer = bird(true, a.flying);
    const gap = mix(0.9, 2.8, a.apart) * kit.size + 0.5;
    const arriving = a.flying === 'arriving' || a.flying === 'carrying';
    const home = v(seat.x + gap, seat.y + mix(0.35, 1.3, a.apart) * rnd(0.7, 1.2), seat.z + rnd(0.3, 0.8));
    flyer.position.copy(home);
    // Arrivals face the perch; otherwise it is on its way out.
    flyer.rotation.set((arriving ? -1 : 1) * rnd(0.6, 0.85), arriving ? Math.PI + rnd(-0.2, 0.2) : rnd(-0.25, 0.25), 0, 'YXZ');
    s.root.add(flyer);

    const speed = mix(0.6, 5, mood.energy);
    // Keep the perch, not the empty air between the birds, over the origin.
    const thing = s.finish({
      footprint: 1.2,
      update: (_dt, time) => {
        for (const rig of wingRigs) rig.pivot.rotation.x = rig.sign * (rig.base + Math.sin(time * speed) * rig.amp);
        flyer.position.y = home.y + Math.sin(time * speed * 0.5) * 0.05;
      },
    });
    s.root.position.x = 0.35 - seat.x;
    s.root.position.z = 0;
    return thing;
  },
});
