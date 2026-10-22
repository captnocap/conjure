import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P = [number, number, number];
interface Leaf { at: P; size: P; turn?: P; colour: THREE.Color }

export default defineThing({
  questions: {
    crop: choice('What is growing inside?', {
      lettuce: 'Tiered round trays of leafy greens, rosette after rosette.',
      wheat: 'A dense little field of grain standing in one deck of troughs.',
      tomato: 'Vines climbing strings, hung with red fruit.',
      tree: 'A single small fruit tree, the only one for a very long way.',
      algae: 'Tall glass columns of glowing green algae, more factory than garden.',
      flowers: 'Flowers of every colour, grown for no practical reason at all.',
    }),
    growth: choice('What state is the garden in?', {
      seedlings: 'Just planted: small sprouts in mostly bare trays.',
      thriving: 'Tidy, full and productive.',
      overgrown: 'Overgrown: leaves pressed against the glass and climbing the frame.',
      escaped: 'Burst out: a pane has gone and vines trail down the outside of the pod.',
      dead: 'Dead: brown stalks and fallen leaves under dusty glass.',
    }),
    lights: choice('What are the grow lights like?', {
      magenta: 'Pink-magenta LEDs, the red-and-blue glow of a grow room.',
      warm: 'Warm golden lamps, like late afternoon.',
      cool: 'Cold blue-white tubes.',
      off: 'Switched off: it lives on whatever light reaches it.',
    }),
    frame: choice('How is the dome framed?', {
      coarse: 'A geodesic frame of large triangles on chunky struts.',
      fine: 'A fine geodesic mesh of many small triangles.',
      ribbed: 'Greenhouse ribs: arches meeting at the crown with hoops round them.',
      bubble: 'One seamless blown bubble with only a collar and a cap.',
    }),
    radiator: choice('What radiator does it carry?', {
      fin: 'One tall white fin standing off the back like a sail.',
      pair: 'Two panels folded out to the sides like wings.',
      ring: 'A ring of small fins round the drum.',
    }),
    footing: choice('What does it stand on?', {
      legs: 'Four splayed lander legs with round pads.',
      dock: 'A docking collar on a short stub of truss.',
      berm: 'It is banked into the ground with a ring of regolith sandbags.',
    }),
    kit: noul('Has the gardener left their things on the step: a watering can and a crate of produce?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = 3.2;
    const dead = a.growth === 'dead';
    const wild = a.growth === 'overgrown' || a.growth === 'escaped';
    const grow = { seedlings: 0.42, thriving: 1, overgrown: 1.3, escaped: 1.35, dead: 0.85 }[a.growth];
    const fill = { seedlings: 0.6, thriving: 1, overgrown: 1.25, escaped: 1.25, dead: 0.7 }[a.growth];

    const hull = s.material('#e9e8e1', { roughness: 0.55 });
    const band = s.material(mood.cheer > 0.5 ? '#3f8f5a' : '#58707c', { roughness: 0.6 });
    const steel = s.material('#8d949b', { metalness: 0.5, roughness: 0.4 });
    const dark = s.material('#2a2e33', { roughness: 0.6 });
    const tray = s.material('#d9dcd6', { roughness: 0.6 });

    // ---- footing and drum --------------------------------------------------------------
    const drumH = 1.3;
    const base = { legs: 1.15, dock: 2.3, berm: 0.05 }[a.footing];
    const deck = base + drumH;
    if (a.footing === 'legs') {
      for (let k = 0; k < 4; k++) {
        const t = k * Math.PI / 2 + Math.PI / 4;
        const foot: P = [Math.cos(t) * (r + 1.5), 0.1, Math.sin(t) * (r + 1.5)];
        s.rod([Math.cos(t) * r * 0.95, base + 0.9, Math.sin(t) * r * 0.95], foot, 0.11, steel);
        s.rod([Math.cos(t) * r * 0.7, base + 0.05, Math.sin(t) * r * 0.7], [foot[0] * 0.93, 0.5, foot[2] * 0.93], 0.07, steel);
        s.cylinder(0.5, 0.58, 0.14, [foot[0], 0.07, foot[2]], dark, 14);
      }
      s.cylinder(1.0, 0.6, 0.7, [0, base - 0.35, 0], dark, 16);
    } else if (a.footing === 'dock') {
      s.cylinder(1.5, 1.5, 0.35, [0, base - 0.18, 0], dark, 20);
      s.cylinder(1.2, 1.2, 0.3, [0, base - 0.5, 0], steel, 20);
      const w = 0.8, top = base - 0.6;
      for (const x of [-w, w]) for (const z of [-w, w]) s.box([0.14, top, 0.14], [x, top / 2, z], steel);
      for (let y = 0.25; y < top; y += 0.75) {
        for (const z of [-w, w]) { s.box([w * 2, 0.08, 0.08], [0, y, z], steel); s.rod([-w, y, z], [w, Math.min(y + 0.75, top), z], 0.035, steel); }
        for (const x of [-w, w]) { s.box([0.08, 0.08, w * 2], [x, y, 0], steel); s.rod([x, y, -w], [x, Math.min(y + 0.75, top), w], 0.035, steel); }
      }
      s.box([2.6, 0.12, 2.6], [0, 0.06, 0], dark);
    } else {
      const dust = new THREE.Color('#a39a8c').lerp(new THREE.Color('#b9795a'), mood.warmth * 0.6);
      const bags = Array.from({ length: 46 }, (_x, k) => {
        const t = (k / 23) * Math.PI * 2 + (k >= 23 ? 0.14 : 0), tier = k >= 23 ? 1 : 0;
        return { at: [Math.cos(t) * (r + 0.55 - tier * 0.28), 0.22 + tier * 0.4, Math.sin(t) * (r + 0.55 - tier * 0.28)] as P, size: mix(0.42, 0.52, random()), colour: dust.clone().offsetHSL(0, 0, (random() - 0.5) * 0.1) };
      }).filter((bag) => !(bag.at[2] > r * 0.85 && Math.abs(bag.at[0]) < 1.2));
      s.scatter(new THREE.SphereGeometry(1, 8, 6).scale(1.15, 0.55, 0.8), new THREE.MeshStandardMaterial({ roughness: 1 }), bags.map((bag) => ({ at: bag.at, size: bag.size, color: bag.colour })));
    }
    s.cylinder(r * 1.03, r * 0.98, drumH, [0, base + drumH / 2, 0], hull, 36);
    s.cylinder(r * 1.045, r * 1.045, 0.22, [0, base + drumH * 0.72, 0], band, 36);
    s.cylinder(r * 1.06, r * 1.06, 0.14, [0, deck - 0.02, 0], steel, 36);
    for (let k = 0; k < 14; k++) {
      const t = (k / 14) * Math.PI * 2 + 0.2;
      if (Math.abs(Math.sin(t / 2)) > 0.96 || Math.cos(t - Math.PI / 2) > 0.9) continue;
      s.box([0.5, 0.36, 0.1], [Math.cos(t) * r * 1.03, base + 0.38, Math.sin(t) * r * 1.03], k % 3 ? tray : dark).rotation.y = -t + Math.PI / 2;
    }
    // Hatch, porthole and step, facing the viewer.
    s.box([1.15, 1.12, 0.16], [0, base + 0.62, r * 1.0], steel);
    s.box([0.95, 0.98, 0.1], [0, base + 0.6, r * 1.0 + 0.07], hull);
    s.mesh(new THREE.TorusGeometry(0.2, 0.045, 6, 16), dark, [0, base + 0.78, r + 0.13]);
    s.mesh(new THREE.CircleGeometry(0.2, 16), new THREE.MeshStandardMaterial({ color: '#27313c', roughness: 0.2, metalness: 0.4 }), [0, base + 0.78, r + 0.125]);
    s.rod([0.36, base + 0.3, r + 0.14], [0.36, base + 0.62, r + 0.14], 0.03, dark);
    s.box([1.9, 0.08, 1.0], [0, base + 0.02, r + 0.5], steel);
    if (base > 0.6) for (let k = 1; k <= Math.floor(base / 0.38); k++) s.box([1.2, 0.05, 0.3], [0, base - k * 0.38, r + 0.85 + k * 0.22], steel);
    // Water tank and plumbing on the flank.
    const tankAt: P = [-r * 0.84, base + 0.62, r * 0.84];
    s.mesh(new THREE.CapsuleGeometry(0.42, 0.6, 6, 16), s.material('#cfe3ea', { roughness: 0.4 }), tankAt);
    s.cylinder(0.435, 0.435, 0.16, tankAt, s.material('#2f7fa8'), 16);
    s.tube([[tankAt[0], tankAt[1] + 0.72, tankAt[2]], [tankAt[0] + 0.1, deck + 0.25, tankAt[2] - 0.2], [tankAt[0] + 0.5, deck + 0.12, tankAt[2] - 0.75]], 0.05, steel);

    // ---- radiator ----------------------------------------------------------------------
    const heat = new THREE.MeshStandardMaterial({ color: '#e0683a', emissive: '#d9481a', emissiveIntensity: mix(0.25, 1.1, mood.energy) * (dead ? 0.1 : 1) });
    const fin = s.material('#f1f1ec', { roughness: 0.5, side: THREE.DoubleSide });
    const panel = (centre: P, w: number, h: number, yaw: number) => {
      const group = new THREE.Group();
      group.position.set(...centre);
      group.rotation.y = yaw;
      s.root.add(group);
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = mesh.receiveShadow = true;
        group.add(mesh);
      };
      add(new THREE.BoxGeometry(w, h, 0.07), fin, 0, 0, 0);
      const pipes = Math.max(2, Math.round(w / 0.45));
      for (let k = 0; k < pipes; k++) for (const z of [-0.045, 0.045]) add(new THREE.BoxGeometry(0.06, h * 0.92, 0.02), heat, (k - (pipes - 1) / 2) * (w / pipes), 0, z);
      add(new THREE.BoxGeometry(w + 0.1, 0.1, 0.12), steel, 0, h / 2, 0);
      add(new THREE.BoxGeometry(w + 0.1, 0.1, 0.12), steel, 0, -h / 2, 0);
    };
    if (a.radiator === 'fin') {
      s.rod([-r * 0.6, base + 0.9, -r * 0.6], [-r - 0.9, base + 1.0, -r - 0.9], 0.1, steel);
      panel([-r - 1.0, base + 3.1, -r - 1.0], 1.9, 5.0, Math.PI / 4);
    } else if (a.radiator === 'pair') {
      for (const side of [-1, 1]) {
        s.rod([side * r, base + 0.8, -0.6], [side * (r + 2.0), base + 1.2, -1.0], 0.09, steel);
        panel([side * (r + 2.3), base + 1.9, -1.0], 3.4, 2.0, side * 0.25);
      }
    } else {
      for (let k = 0; k < 10; k++) {
        const t = (k / 10) * Math.PI * 2 + 0.31;
        if (Math.cos(t - Math.PI / 2) > 0.75) continue;
        panel([Math.cos(t) * (r + 0.75), base + 0.72, Math.sin(t) * (r + 0.75)], 1.3, 1.1, -t);
      }
    }

    // ---- dome --------------------------------------------------------------------------
    const cy = deck + r * 0.12;
    const cut = -r * 0.12;
    const frameMaterial = s.material(dead ? '#8b8475' : '#f4f4ef', { roughness: 0.5, metalness: 0.2 });
    const lost: THREE.Vector3[] = [];
    if (a.frame === 'coarse' || a.frame === 'fine') {
      const source = new THREE.IcosahedronGeometry(r, a.frame === 'coarse' ? 1 : 2);
      const pos = source.attributes.position;
      const edges = new Map<string, [THREE.Vector3, THREE.Vector3]>();
      const key = (v: THREE.Vector3) => `${Math.round(v.x * 50)},${Math.round(v.y * 50)},${Math.round(v.z * 50)}`;
      for (let i = 0; i < pos.count; i += 3) {
        const tri = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(pos, i + k));
        for (let k = 0; k < 3; k++) {
          const p = tri[k], q = tri[(k + 1) % 3];
          if (p.y < cut && q.y < cut) continue;
          const ka = key(p), kb = key(q);
          edges.set(ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`, [p, q]);
        }
        const centre = tri[0].clone().add(tri[1]).add(tri[2]).divideScalar(3);
        if (centre.y > r * 0.25 && centre.z > 0 && centre.x > 0) lost.push(centre);
      }
      source.dispose();
      const struts = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5), frameMaterial, edges.size);
      const thick = a.frame === 'coarse' ? 0.055 : 0.032;
      let index = 0;
      const up = new THREE.Vector3(0, 1, 0);
      for (const [p, q] of edges.values()) {
        const direction = q.clone().sub(p);
        const length = direction.length();
        struts.setMatrixAt(index++, new THREE.Matrix4().compose(p.clone().add(q).multiplyScalar(0.5).add(new THREE.Vector3(0, cy, 0)), new THREE.Quaternion().setFromUnitVectors(up, direction.normalize()), new THREE.Vector3(thick, length, thick)));
      }
      struts.instanceMatrix.needsUpdate = true;
      struts.castShadow = true;
      s.root.add(struts);
    } else {
      if (a.frame === 'ribbed') {
        for (let k = 0; k < 6; k++) s.mesh(new THREE.TorusGeometry(r, 0.05, 5, 40, Math.PI * 1.08).rotateZ(-Math.PI * 0.04), frameMaterial, [0, cy, 0]).rotation.y = (k / 6) * Math.PI;
        for (const h of [0.35, 0.72]) s.mesh(new THREE.TorusGeometry(r * Math.sqrt(1 - h * h), 0.04, 5, 48).rotateX(Math.PI / 2), frameMaterial, [0, cy + r * h, 0]);
      }
      s.ball([0.5, 0.16, 0.5], [0, cy + r - 0.05, 0], frameMaterial, 16);
      lost.push(new THREE.Vector3(r * 0.5, r * 0.62, r * 0.6));
    }
    const lightColour = { magenta: '#ff4fd0', warm: '#ffc65a', cool: '#bfe6ff', off: '#59606a' }[a.lights];
    const lit = a.lights !== 'off' && !dead;
    const glass = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(dead ? '#b7a98c' : '#e9fbff').lerp(new THREE.Color(lightColour), lit ? 0.25 : 0), transparent: true, opacity: dead ? 0.3 : mix(0.13, 0.24, mood.wear), roughness: 0.08, depthWrite: false, side: THREE.DoubleSide });
    const shell = s.mesh(new THREE.SphereGeometry(r * 0.99, 40, 20, 0, Math.PI * 2, 0, Math.acos(cut / r)), glass, [0, cy, 0]);
    shell.castShadow = false;

    // ---- lamps -------------------------------------------------------------------------
    const lampMaterial = new THREE.MeshStandardMaterial({ color: lit ? lightColour : '#4a4f55', emissive: lightColour, emissiveIntensity: lit ? mix(1.6, 2.8, mood.cheer) : 0 });
    const lamp = (geometry: THREE.BufferGeometry, at: P) => { const mesh = s.mesh(geometry, lampMaterial, at); mesh.castShadow = false; return mesh; };
    lamp(new THREE.TorusGeometry(r * 0.42, 0.07, 6, 32).rotateX(Math.PI / 2), [0, cy + r * 0.86, 0]);
    for (let k = 0; k < 3; k++) s.rod([Math.cos(k * 2.1) * r * 0.42, cy + r * 0.86, Math.sin(k * 2.1) * r * 0.42], [Math.cos(k * 2.1) * r * 0.3, cy + r * 0.95, Math.sin(k * 2.1) * r * 0.3], 0.02, dark);

    // ---- the garden ----------------------------------------------------------------------
    const leaves: Leaf[] = [];
    const greens = ['#3f9a3c', '#58b04a', '#2f7f3a', '#7cc257', '#4aa35a'];
    const leafColour = () => (dead ? new THREE.Color('#7a6038').offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.14) : new THREE.Color(greens[Math.floor(random() * greens.length)]).offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.08));
    const blob = (at: P, size: P, turn: P = [0, random() * 6, 0], colour = leafColour()) => leaves.push({ at, size, turn, colour });
    const inside = (x: number, y: number, z: number) => Math.hypot(x, y - cy, z) < r * 0.93;
    const soil = s.material(dead ? '#6b5a48' : '#4a3a2c', { roughness: 1 });
    const fruit: { at: P; size: number; color: string }[] = [];
    s.cylinder(r * 0.95, r * 0.95, 0.06, [0, deck + 0.05, 0], s.material('#b9bdb6', { roughness: 0.7 }), 36);

    if (a.crop === 'lettuce' || a.crop === 'flowers') {
      const tiers: [number, number][] = a.crop === 'lettuce' ? [[0.35, 0.84], [1.25, 0.66], [2.1, 0.42]] : [[0.35, 0.84], [1.2, 0.56]];
      s.cylinder(0.09, 0.09, tiers[tiers.length - 1][0] + 0.3, [0, deck + (tiers[tiers.length - 1][0] + 0.3) / 2, 0], steel, 10);
      for (const [h, f] of tiers) {
        const radius = r * f, y = deck + h;
        s.mesh(new THREE.TorusGeometry(radius - 0.28, 0.26, 6, 40).rotateX(Math.PI / 2).scale(1, 0.4, 1), tray, [0, y, 0]);
        s.mesh(new THREE.TorusGeometry(radius - 0.28, 0.2, 6, 40).rotateX(Math.PI / 2).scale(1, 0.3, 1), soil, [0, y + 0.07, 0]);
        for (let k = 0; k < 3; k++) s.rod([0, y, 0], [Math.cos(k * 2.1 + h) * (radius - 0.3), y, Math.sin(k * 2.1 + h) * (radius - 0.3)], 0.03, steel);
        lamp(new THREE.TorusGeometry(radius - 0.28, 0.035, 5, 40).rotateX(Math.PI / 2), [0, y + 0.72, 0]);
        const count = Math.round((radius - 0.28) * 6.2 * fill * 0.9);
        for (let n = 0; n < count; n++) {
          if (random() > fill) continue;
          const t = (n / count) * Math.PI * 2 + random() * 0.1;
          const px = Math.cos(t) * (radius - 0.28), pz = Math.sin(t) * (radius - 0.28), py = y + 0.1;
          const size = 0.17 * grow * mix(0.8, 1.2, random());
          if (a.crop === 'lettuce') {
            for (let l = 0; l < 4; l++) { const u = l * 1.57 + random(); blob([px + Math.cos(u) * size * 0.5, py + size * 0.45, pz + Math.sin(u) * size * 0.5], [size, size * 0.42, size * 0.7], [0, -u, dead ? -0.5 : 0.55]); }
            blob([px, py + size * 0.5, pz], [size * 0.55, size * 0.6, size * 0.55]);
          } else {
            blob([px, py + size * 0.5, pz], [size * 0.9, size * 0.7, size * 0.9]);
            const stem = size * mix(1.2, 2.2, random());
            if (a.growth !== 'seedlings') fruit.push({ at: [px + (random() - 0.5) * 0.1, py + stem, pz + (random() - 0.5) * 0.1], size: 0.09 * grow * mix(0.8, 1.3, random()), color: dead ? '#6a5a40' : new THREE.Color().setHSL(random(), 0.85, 0.62).getStyle() });
            if (a.growth !== 'seedlings') blob([px, py + stem * 0.6, pz], [0.025, stem * 0.45, 0.025], [0, 0, 0]);
          }
        }
      }
    } else if (a.crop === 'wheat') {
      for (const z of [-1.8, -0.9, 0, 0.9, 1.8]) {
        const halfLength = Math.sqrt(Math.max((r * 0.88) ** 2 - z * z, 0.1));
        s.box([halfLength * 2, 0.28, 0.62], [0, deck + 0.22, z], tray);
        s.box([halfLength * 2 - 0.1, 0.06, 0.5], [0, deck + 0.36, z], soil);
        lamp(new THREE.BoxGeometry(halfLength * 1.7, 0.05, 0.08), [0, deck + 0.36 + 1.55, z]);
        for (let n = 0, count = Math.round(halfLength * 2 * 9 * fill); n < count; n++) {
          const x = (random() * 2 - 1) * (halfLength - 0.1), zz = z + (random() - 0.5) * 0.44;
          const height = mix(0.75, 1.15, random()) * grow;
          const gold = dead ? new THREE.Color('#8a7448') : new THREE.Color('#7fb84a').lerp(new THREE.Color('#d9b84a'), a.growth === 'seedlings' ? 0 : mix(0.2, 0.9, random()));
          blob([x, deck + 0.38 + height / 2, zz], [0.028, height / 2, 0.028], [(random() - 0.5) * (dead ? 1.2 : 0.25), 0, (random() - 0.5) * (dead ? 1.2 : 0.25)], gold);
        }
      }
    } else if (a.crop === 'tomato') {
      for (const [x, z] of [[-1.5, -1.2], [0, -1.6], [1.5, -1.2], [-1.6, 0.7], [0, 1.1], [1.6, 0.7]]) {
        const top = Math.min(Math.sqrt(Math.max((r * 0.9) ** 2 - x * x - z * z, 0.2)) + r * 0.12, 2.9);
        s.box([0.7, 0.4, 0.7], [x, deck + 0.28, z], tray);
        s.rod([x, deck + 0.4, z], [x, deck + top, z], 0.015, steel);
        const reach = top * Math.min(grow, 1) * (a.growth === 'seedlings' ? 0.5 : 1);
        for (let n = 0, count = Math.round(16 * fill * reach); n < count; n++) {
          const h = mix(0.5, reach, random()), u = random() * 6.28, out = mix(0.1, 0.36, random()) * Math.min(grow, 1.2);
          const size = mix(0.14, 0.24, random()) * Math.min(grow, 1.15);
          blob([x + Math.cos(u) * out, deck + h - (dead ? 0.1 : 0), z + Math.sin(u) * out], [size, size * 0.5, size * 0.8], [0, -u, dead ? -1 : 0.3]);
          if (a.growth !== 'seedlings' && random() < 0.4) fruit.push({ at: [x + Math.cos(u + 1) * out * 0.9, deck + h - 0.12, z + Math.sin(u + 1) * out * 0.9], size: mix(0.07, 0.11, random()), color: dead ? '#4a3626' : random() < 0.75 ? '#d8322a' : '#8fb23a' });
        }
      }
      lamp(new THREE.BoxGeometry(3.6, 0.05, 0.1), [0, deck + 2.75, -0.2]);
    } else if (a.crop === 'tree') {
      s.cylinder(1.15, 0.95, 0.6, [0, deck + 0.38, 0], tray, 20);
      s.cylinder(1.08, 1.08, 0.06, [0, deck + 0.68, 0], soil, 20);
      const bark = s.material(dead ? '#5a4a3a' : '#6b4a30', { roughness: 0.95 });
      const crown = mix(1.5, 2.25, Math.min(grow, 1));
      s.tube([[0, deck + 0.68, 0], [0.08, deck + 1.2, 0.03], [-0.06, deck + crown, -0.02]], 0.1 * Math.min(grow + 0.2, 1.1), bark);
      const boughs = a.growth === 'seedlings' ? 3 : 6;
      for (let b = 0; b < boughs; b++) {
        const u = (b / boughs) * 6.28 + random(), length = mix(0.7, 1.15, random()) * Math.min(grow, 1.1);
        const tip: P = [Math.cos(u) * length, deck + crown + mix(-0.15, 0.6, random()) * Math.min(grow, 1), Math.sin(u) * length];
        s.rod([0, deck + crown - 0.3, 0], tip, 0.045, bark, 0.02);
        const tufts = dead ? 1 : Math.round(7 * fill);
        for (let n = 0; n < tufts; n++) {
          const at: P = [tip[0] + (random() - 0.5) * 0.9, tip[1] + (random() - 0.3) * 0.7, tip[2] + (random() - 0.5) * 0.9];
          if (!inside(...at) && !wild) continue;
          const size = mix(0.26, 0.44, random()) * Math.min(grow, 1.15);
          blob(at, [size, size * 0.75, size]);
          if (a.growth !== 'seedlings' && random() < 0.35) fruit.push({ at: [at[0], at[1] - size * 0.7, at[2]], size: 0.1, color: mood.warmth > 0.5 ? '#f08a1c' : '#d8322a' });
        }
      }
      if (dead) for (let n = 0; n < 40; n++) { const u = random() * 6.28, d = random() * r * 0.8; blob([Math.cos(u) * d, deck + 0.1 + (d < 1.1 ? 0.62 : 0), Math.sin(u) * d], [0.1, 0.015, 0.07]); }
      s.box([0.9, 0.06, 0.4], [1.9, deck + 0.42, 0.6], s.material('#8a6a48', { roughness: 0.9 })).rotation.y = 0.5;
      for (const x of [-0.35, 0.35]) s.box([0.06, 0.36, 0.34], [1.9 + x * 0.88, deck + 0.24, 0.6 - x * 0.48], dark).rotation.y = 0.5;
    } else {
      const liquid = new THREE.MeshStandardMaterial({ color: dead ? '#6a6238' : '#4fd06a', emissive: dead ? '#2a2610' : '#2fd05a', emissiveIntensity: dead ? 0.1 : mix(0.7, 1.5, mood.cheer), roughness: 0.3 });
      const spots: [number, number][] = [[0, 0], ...Array.from({ length: 6 }, (_x, k) => [Math.cos(k * 1.047) * 1.75, Math.sin(k * 1.047) * 1.75] as [number, number])];
      for (const [x, z] of spots) {
        const tall = Math.min(Math.sqrt((r * 0.9) ** 2 - x * x - z * z), 2.6);
        const level = tall * { seedlings: 0.3, thriving: 0.85, overgrown: 0.97, escaped: 0.97, dead: 0.45 }[a.growth] * mix(0.85, 1, random());
        s.cylinder(0.36, 0.4, 0.22, [x, deck + 0.18, z], dark, 14);
        s.cylinder(0.3, 0.3, level, [x, deck + 0.28 + level / 2, z], liquid, 14).castShadow = false;
        const tubeGlass = s.cylinder(0.33, 0.33, tall, [x, deck + 0.28 + tall / 2, z], new THREE.MeshPhysicalMaterial({ color: '#dff5ee', transparent: true, opacity: 0.18, depthWrite: false, roughness: 0.05 }), 14);
        tubeGlass.castShadow = false;
        s.cylinder(0.36, 0.36, 0.1, [x, deck + 0.3 + tall, z], steel, 14);
        if (x || z) s.rod([x, deck + 0.34 + tall, z], [x * 0.2, deck + 0.34 + Math.min(tall + 0.3, 2.75), z * 0.2], 0.035, steel);
      }
      if (wild) for (let n = 0; n < 60; n++) { const u = random() * 6.28, d = mix(0.5, r * 0.9, random()); blob([Math.cos(u) * d, deck + 0.12, Math.sin(u) * d], [mix(0.2, 0.5, random()), 0.05, mix(0.2, 0.5, random())], [0, u, 0], new THREE.Color('#3fbf5a')); }
    }
    // Growth pressing against the glass and climbing the frame.
    if (wild && a.crop !== 'algae') {
      for (let n = 0; n < 90; n++) {
        const u = random() * 6.28, h = mix(0.0, 0.92, random() ** 1.6);
        const ring = Math.sqrt(1 - h * h) * r * 0.93;
        const size = mix(0.2, 0.42, random());
        blob([Math.cos(u) * ring, cy + h * r * 0.93, Math.sin(u) * ring], [size, size * 0.35, size * 0.8], [h * 1.2, -u, 0.4]);
      }
    }
    if (a.growth === 'escaped' && lost.length) {
      const hole = lost[Math.floor(random() * lost.length)].clone().normalize();
      const out = (scale: number): P => [hole.x * r * scale, cy + hole.y * r * scale, hole.z * r * scale];
      for (let k = 0; k < 5; k++) {
        const shard = s.mesh(new THREE.TetrahedronGeometry(mix(0.18, 0.4, random())), new THREE.MeshStandardMaterial({ color: '#dff3f6', roughness: 0.1, metalness: 0.3, flatShading: true }), out(1.0));
        shard.position.x += (random() - 0.5) * 1.3; shard.position.y += (random() - 0.5) * 1.3; shard.position.z += (random() - 0.5) * 1.0;
        shard.scale.set(1, 1, 0.12); shard.rotation.set(random() * 3, random() * 3, random() * 3);
      }
      const vine = s.material(dead ? '#6a5a40' : '#3a7a38', { roughness: 0.9 });
      for (let v = 0; v < 4; v++) {
        const swing = hole.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (v - 1.5) * 0.3);
        const path: P[] = [out(0.8)];
        for (let step = 1; step <= 6; step++) {
          const drop = hole.y - (step / 6) * (hole.y + 0.12);
          const flat = Math.sqrt(Math.max(1 - drop * drop, 0.05));
          const planar = new THREE.Vector2(swing.x, swing.z).normalize();
          path.push([planar.x * flat * r * 1.05, cy + drop * r * 1.05, planar.y * flat * r * 1.05]);
        }
        const end = path[path.length - 1];
        path.push([end[0] * 1.06, Math.max(end[1] - mix(0.6, 1.4, random()), 0.3), end[2] * 1.06]);
        s.tube(path, 0.04, vine);
        for (const p of path.slice(1)) for (let l = 0; l < 3; l++) { const size = mix(0.18, 0.34, random()); blob([p[0] + (random() - 0.5) * 0.5, p[1] + (random() - 0.5) * 0.5, p[2] + (random() - 0.5) * 0.5], [size, size * 0.3, size * 0.75], [random(), random() * 6, random()]); }
      }
    }
    if (leaves.length) {
      const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.75, flatShading: true }), leaves.length);
      const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), euler = new THREE.Euler();
      leaves.forEach((leaf, index) => {
        const [tx, ty, tz] = leaf.turn ?? [0, 0, 0];
        quaternion.setFromEuler(euler.set(tx, ty, tz, 'YXZ'));
        matrix.compose(new THREE.Vector3(...leaf.at), quaternion, new THREE.Vector3(...leaf.size));
        mesh.setMatrixAt(index, matrix);
        mesh.setColorAt(index, leaf.colour);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }
    if (fruit.length) s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.4 }), fruit);

    // ---- the gardener's things -------------------------------------------------------------
    if (a.kit) {
      const stepY = base + 0.06;
      const can = s.material(mood.cheer > 0.5 ? '#3f8fbf' : '#7d8a80', { metalness: 0.4, roughness: 0.4 });
      s.cylinder(0.14, 0.16, 0.3, [-0.62, stepY + 0.15, r + 0.62], can, 14);
      s.rod([-0.5, stepY + 0.1, r + 0.66], [-0.2, stepY + 0.34, r + 0.76], 0.025, can);
      s.cylinder(0.05, 0.02, 0.05, [-0.19, stepY + 0.35, r + 0.765], can, 8).rotation.z = -0.9;
      s.mesh(new THREE.TorusGeometry(0.12, 0.018, 5, 14, Math.PI), can, [-0.72, stepY + 0.24, r + 0.6]).rotation.set(0, 0.3, Math.PI / 2 + 0.4);
      s.box([0.6, 0.26, 0.42], [0.58, stepY + 0.13, r + 0.66], s.material('#a07a4c', { roughness: 0.9 })).rotation.y = 0.2;
      const produce = { lettuce: '#58b04a', wheat: '#d9b84a', tomato: '#d8322a', tree: mood.warmth > 0.5 ? '#f08a1c' : '#d8322a', algae: '#3fbf5a', flowers: '#e86aa8' }[a.crop];
      for (let k = 0; k < 7; k++) s.ball([0.1, 0.09, 0.1], [0.58 + (random() - 0.5) * 0.4, stepY + 0.29 + random() * 0.05, r + 0.66 + (random() - 0.5) * 0.24], s.material(dead ? '#6a5a40' : produce, { roughness: 0.6 }), 8);
    }

    const pulse = mix(0.2, 1.4, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (lit) lampMaterial.emissiveIntensity = mix(1.6, 2.8, mood.cheer) * (0.92 + Math.sin(time * pulse) * 0.08);
      },
    });
  },
});
