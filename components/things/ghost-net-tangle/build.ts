import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { afloat, painted, waterPatch } from './sea';

const MIXES = {
  green: 'Trawl green and black twine with orange floats, the commonest kind.',
  bluorange: 'Bright blue netting knotted through with orange polypropylene rope.',
  mono: 'Pale, nearly invisible monofilament gillnet strung with small white floats.',
  rainbow: 'Every colour at once: a dozen nets from a dozen boats wound together.',
  bleached: 'Sun-bleached to bone grey and chalk white, brittle with age.',
  black: 'Heavy tarred black net with rusty steel floats.',
} as const;
const PALETTE: Record<keyof typeof MIXES, { nets: string[]; ropes: string[]; floats: string[]; core: string }> = {
  green: { nets: ['#1f7a5c', '#17463a', '#2f9a6c'], ropes: ['#e07a1f', '#1d2a26', '#d8d2b8'], floats: ['#ee6a1c', '#f08a2a', '#f1efe6'], core: '#1d5a47' },
  bluorange: { nets: ['#1f6fd0', '#2a8fe0', '#174a9a'], ropes: ['#f07a14', '#f39a2a', '#f1efe6'], floats: ['#f1efe6', '#f07a14', '#f2c21a'], core: '#1c4f9a' },
  mono: { nets: ['#cfe3df', '#b7d0d4', '#e3ecea'], ropes: ['#e9e6da', '#9fb8b8', '#4c8f8a'], floats: ['#f6f5ef', '#f6f5ef', '#e9e2c8'], core: '#a9c2c2' },
  rainbow: { nets: ['#1f7a5c', '#1f6fd0', '#d8432e', '#f2c21a', '#8a3fb0'], ropes: ['#f07a14', '#e9e6da', '#2a8fe0', '#d8432e'], floats: ['#ee6a1c', '#f2c21a', '#f1efe6', '#e84a8a', '#35b06a'], core: '#3f5f6a' },
  bleached: { nets: ['#d5d0c2', '#bdb8aa', '#e6e2d6'], ropes: ['#cfc8b4', '#a8a393', '#e9e6da'], floats: ['#e8d8c8', '#e6c9b0', '#efece2'], core: '#aaa596' },
  black: { nets: ['#232527', '#34373a', '#1a1b1c'], ropes: ['#3a3d40', '#6d4a2f', '#8a8d8e'], floats: ['#8a4a2a', '#6d3f28', '#a35a30'], core: '#202224' },
};

export default defineThing({
  questions: {
    colours: choice('What is it made of?', MIXES),
    size: score('How big is the mass?', ['A clump you could lift with a boathook', 'The size of a car', 'A floating island several boats long']),
    caught: choice('What is caught in it?', {
      nothing: 'Nothing visible now.',
      turtle: 'A sea turtle wound in the mesh at the edge, one flipper free.',
      shark: 'A small grey shark rolled in net, fin and tail lifted clear of the water.',
      seabird: 'A white seabird with one wing spread limp across the twine.',
      seal: 'A seal with a collar of green net cut into its neck, hauled out on top, still alive.',
      trap: 'A battered wire crab pot and the picked-clean skeleton of a big fish.',
    }),
    riders: choice('What rides on top of it?', {
      nothing: 'Nothing.',
      crabs: 'A colony of small red crabs that has never seen land.',
      booby: 'A booby with bright blue feet using it as a perch.',
      seedlings: 'A sprouted coconut and tufts of grass: the beginning of an island.',
      highflyer: 'A bent fishing marker pole with a ragged orange flag.',
      castaway: 'Signs of a person: a flattened patch, a lashed stick shelter and a hung-up shirt.',
    }),
    age: score('How long has it drifted?', ['Cut loose last week, colours still bright', 'A year: faded, weed taking hold', 'A decade: bearded with weed and crusted in goose barnacles']),
    junk: choice('What plastic has gathered in it?', {
      little: 'Hardly any: it is nearly all net and rope.',
      bottles: 'Drink bottles and jugs by the dozen.',
      crates: 'Fish crates, a jerrycan and a broken bucket.',
      domestic: 'Odd domestic things: flip-flops, a doll, a toothbrush, a lighter.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const g = new Sculpture(context);
    s.root.add(g.root);
    const { mood, random } = context;
    const palette = PALETTE[a.colours];
    const fade = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#bdb9aa'), a.age * 0.35).lerp(new THREE.Color('#4f6a45'), Math.max(0, a.age - 0.4) * 0.35);
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const R = mix(1.0, 2.8, a.size);
    const Rc = R * 0.78, H = Math.min(0.95, R * 0.32);
    const p1 = random() * 6, p2 = random() * 6, p3 = random() * 6;
    const noise = (x: number, z: number) => Math.sin(x * 2.3 + p1) * Math.sin(z * 2.9 + p2) * 0.5 + Math.sin((x + z) * 4.1 + p3) * 0.3;
    const cx = (random() - 0.5) * R * 0.2, cz = (random() - 0.5) * R * 0.2;
    const mound = (x: number, z: number) => {
      const d = Math.hypot(x - cx, (z - cz) * 1.2) / Rc;
      return d >= 1 ? 0.015 : 0.015 + H * (1 - d * d) * (1 + 0.35 * noise(x, z));
    };

    const netTexture = (hex: THREE.Color, holes: number) => {
      const texture = painted(256, 256, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = `#${hex.getHexString()}`; ctx.lineWidth = 7;
        for (let i = -8; i < 16; i++) { ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32 + h, h); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32 - h, h); ctx.stroke(); }
        ctx.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < holes; i++) { ctx.beginPath(); ctx.ellipse(random() * w, random() * h, mix(14, 40, random()), mix(10, 30, random()), random() * 3, 0, 7); ctx.fill(); }
      });
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      return texture;
    };
    const sheet = (radius: number, lift: number, ox: number, oz: number, tile: number, drape: (x: number, z: number) => number) => {
      const rings = 9, segs = 30;
      const positions: number[] = [], uvs: number[] = [], index: number[] = [];
      const q1 = random() * 6, q2 = random() * 6;
      for (let i = 0; i <= rings; i++) for (let j = 0; j <= segs; j++) {
        const angle = (j / segs) * Math.PI * 2, f = i / rings;
        const r = f * radius * (1 + 0.22 * Math.sin(angle * 3 + q1) + 0.14 * Math.sin(angle * 5 + q2));
        const x = ox + Math.cos(angle) * r, z = oz + Math.sin(angle) * r;
        positions.push(x, drape(x, z) + lift * (1 - f) + 0.012 + Math.sin(x * 9 + z * 7 + q1) * 0.012, z);
        uvs.push(x / tile, z / tile);
        if (i < rings && j < segs) { const p = i * (segs + 1) + j, q = p + segs + 1; index.push(p, q, p + 1, p + 1, q, q + 1); }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      return geometry;
    };

    // The dense heart of the tangle, then looser sheets of mesh spreading out over the water.
    const coreTexture = painted(128, 128, (ctx, w, h) => {
      const core = fade(palette.core);
      ctx.fillStyle = `#${core.clone().multiplyScalar(0.55).getHexString()}`; ctx.fillRect(0, 0, w, h);
      ctx.lineWidth = 5;
      for (let i = 0; i < 46; i++) { ctx.strokeStyle = `#${fade(pick(palette.nets)).getHexString()}`; ctx.beginPath(); const x = random() * w, y = random() * h; ctx.moveTo(x, y); ctx.bezierCurveTo(x + mix(-60, 60, random()), y + mix(-60, 60, random()), x + mix(-60, 60, random()), y + mix(-60, 60, random()), x + mix(-90, 90, random()), y + mix(-90, 90, random())); ctx.stroke(); }
    });
    coreTexture.wrapS = coreTexture.wrapT = THREE.RepeatWrapping;
    g.mesh(sheet(Rc * 0.92, 0, cx, cz, 0.9, (x, z) => mound(x, z) - 0.02), new THREE.MeshStandardMaterial({ map: coreTexture, roughness: 1 }));
    const layers = 3 + Math.round(a.size * 2) + (a.colours === 'rainbow' ? 2 : 0);
    for (let i = 0; i < layers; i++) {
      const angle = random() * 6, off = R * mix(0, 0.28, random());
      const mesh = g.mesh(sheet(R * mix(0.5, 0.8, random()), 0.03 + i * 0.012, cx + Math.cos(angle) * off, cz + Math.sin(angle) * off, mix(0.45, 0.8, random()), mound),
        new THREE.MeshStandardMaterial({ map: netTexture(fade(palette.nets[i % palette.nets.length]), 3 + Math.round(mood.wear * 8)), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1 }));
      mesh.castShadow = false;
    }

    // Rope wandering over and around it.
    const ropes = 4 + Math.round(a.size * 5);
    for (let i = 0; i < ropes; i++) {
      const start = random() * 6, turn = mix(0.5, 1.1, random()) * (random() < 0.5 ? -1 : 1);
      let r = R * mix(0.15, 0.6, random());
      const points = Array.from({ length: 8 }, (_u, k) => {
        r = Math.min(R * 1.15, Math.max(R * 0.1, r + R * mix(-0.2, 0.3, random())));
        const x = cx + Math.cos(start + k * turn) * r, z = cz + Math.sin(start + k * turn) * r;
        return [x, mound(x, z) + 0.05, z] as const;
      });
      g.tube(points, mix(0.018, 0.035, random()), new THREE.MeshStandardMaterial({ color: fade(pick(palette.ropes)), roughness: 0.95 }));
    }

    // Floats: round and oval, a few still strung in a row on their headline.
    const floatCount = Math.round(mix(8, 34, a.size) * mix(0.7, 1.3, mood.density));
    const along = random() * 6;
    const spots = Array.from({ length: floatCount }, (_u, i) => {
      const strung = i < floatCount * 0.4;
      const angle = strung ? along + i * 0.22 : random() * 6, r = strung ? R * 0.92 : R * Math.sqrt(random()) * 1.05;
      const x = cx + Math.cos(angle) * r, z = cz + Math.sin(angle) * r;
      return { x, z, size: strung ? 0.085 : mix(0.07, 0.17, random() ** 2) };
    });
    g.scatter(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ roughness: 0.6 }), spots.map(({ x, z, size }) => ({ at: [x, mound(x, z) + size * 0.55, z] as const, size, color: fade(pick(palette.floats)) })));

    // Gathered plastic.
    const plastic = (hex: string) => new THREE.MeshStandardMaterial({ color: fade(hex), roughness: 0.5 });
    const somewhere = (spread = 0.9): [number, number] => { const angle = random() * 6, r = R * Math.sqrt(random()) * spread; return [cx + Math.cos(angle) * r, cz + Math.sin(angle) * r]; };
    const lay = (mesh: THREE.Object3D, x: number, z: number, up = 0.04) => { mesh.position.set(x, mound(x, z) + up, z); mesh.rotation.set(random() * 0.6 - 0.3, random() * 6, Math.PI / 2 + random() * 0.5 - 0.25); return mesh; };
    if (a.junk === 'bottles') {
      const count = Math.round(mix(5, 22, a.size));
      for (let i = 0; i < count; i++) {
        const [x, z] = somewhere();
        lay(g.mesh(new THREE.CapsuleGeometry(mix(0.035, 0.06, random()), mix(0.12, 0.2, random()), 3, 8), new THREE.MeshStandardMaterial({ color: fade(pick(['#cfe6ee', '#e9f1f1', '#8fd0a0', '#f1efe6', '#e2c14a'])), roughness: 0.2, transparent: true, opacity: 0.75 })), x, z);
      }
    } else if (a.junk === 'crates') {
      for (let i = 0; i < 2 + Math.round(a.size * 3); i++) {
        const [x, z] = somewhere(0.75);
        const crate = new Sculpture(context);
        const tint = plastic(pick(['#2a6fd0', '#d8432e', '#f2c21a', '#35a06a']));
        crate.box([0.6, 0.04, 0.4], [0, 0, 0], tint);
        for (const [w, d, px, pz] of [[0.6, 0.04, 0, 0.2], [0.6, 0.04, 0, -0.2], [0.04, 0.4, 0.3, 0], [0.04, 0.4, -0.3, 0]] as const) for (const y of [0.1, 0.26]) crate.box([w, 0.07, d], [px, y, pz], tint);
        for (const px of [-0.3, 0.3]) for (const pz of [-0.2, 0.2]) crate.box([0.05, 0.3, 0.05], [px, 0.15, pz], tint);
        crate.root.position.set(x, mound(x, z) + 0.02, z);
        crate.root.rotation.set(random() * 0.5 - 0.25, random() * 6, random() * 0.5 - 0.25);
        g.root.add(crate.root);
      }
      const [x, z] = somewhere(0.6);
      const can = g.box([0.34, 0.44, 0.16], [x, mound(x, z) + 0.1, z], plastic('#e9e2c8'));
      can.rotation.set(1.2, random() * 6, 0.2);
      const [bx, bz] = somewhere(0.8);
      lay(g.cylinder(0.16, 0.12, 0.26, [0, 0, 0], plastic('#e84a3a'), 14), bx, bz, 0.1);
    } else if (a.junk === 'domestic') {
      for (let i = 0; i < 4 + Math.round(a.size * 4); i++) {
        const [x, z] = somewhere();
        const sole = g.ball([0.12, 0.018, 0.05], [x, mound(x, z) + 0.05, z], plastic(pick(['#e84a8a', '#2a8fe0', '#f2c21a', '#35b06a'])), 10);
        sole.rotation.y = random() * 6;
      }
      const [dx, dz] = somewhere(0.5), dy = mound(dx, dz) + 0.07;
      g.ball([0.07, 0.07, 0.07], [dx + 0.2, dy, dz], plastic('#e9b89a'), 12);
      g.ball([0.08, 0.05, 0.14], [dx, dy - 0.01, dz], plastic('#e86a9a'), 10).rotation.y = Math.PI / 2;
      for (const side of [-1, 1]) g.rod([dx - 0.05, dy, dz + side * 0.03], [dx - 0.24, dy - 0.02, dz + side * 0.09], 0.018, plastic('#e9b89a'));
      const [tx, tz] = somewhere(0.7);
      lay(g.cylinder(0.008, 0.008, 0.19, [0, 0, 0], plastic('#35b06a'), 6), tx, tz, 0.03);
      const [lx, lz] = somewhere(0.7);
      lay(g.box([0.025, 0.08, 0.012], [0, 0, 0], plastic('#f2c21a')), lx, lz, 0.03);
    }

    // What it has caught, lying at the edge under a fold of mesh.
    const edgeAngle = 0.9 + random() * 1.4;
    const ex = cx + Math.cos(edgeAngle) * R * 0.72, ez = cz + Math.sin(edgeAngle) * R * 0.72, ey = mound(ex, ez);
    const victim = new Sculpture(context);
    victim.root.position.set(ex, ey, ez);
    victim.root.rotation.y = -edgeAngle + Math.PI / 2 + (random() - 0.5) * 0.6;
    g.root.add(victim.root);
    const over = (radius: number, lift: number) => {
      const fold = victim.mesh(sheet(radius, lift, 0, 0, 0.4, () => 0.02), new THREE.MeshStandardMaterial({ map: netTexture(fade(palette.nets[0]), 4), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1 }));
      fold.castShadow = false;
    };
    if (a.caught === 'turtle') {
      const shell = victim.material('#5d6b3a', { roughness: 0.6 }), skin = victim.material('#8a9160', { roughness: 0.7 });
      victim.ball([0.36, 0.15, 0.44], [0, 0.1, 0], shell, 16);
      victim.ball([0.3, 0.12, 0.37], [0, 0.14, 0], victim.material('#6f5a34', { roughness: 0.6 }), 12);
      victim.ball([0.1, 0.085, 0.13], [0, 0.12, 0.5], skin, 12);
      for (const side of [-1, 1]) {
        const flipper = victim.ball([0.3, 0.03, 0.1], [side * 0.48, side > 0 ? 0.32 : 0.06, 0.25], skin, 10);
        flipper.rotation.set(0, -side * 0.5, side > 0 ? 0.75 : 0);
        victim.ball([0.14, 0.025, 0.08], [side * 0.32, 0.05, -0.38], skin, 8).rotation.y = side * 0.6;
      }
      over(0.6, 0.24);
    } else if (a.caught === 'shark') {
      const hide = victim.material('#7b868c', { roughness: 0.5 });
      const spine: [number, number, number][] = [[-0.85, 0.1, 0.05], [-0.5, 0.15, 0.16], [0, 0.17, 0.2], [0.45, 0.2, 0.14], [0.85, 0.3, 0.07], [1.05, 0.42, 0.04]];
      for (let i = 0; i < spine.length - 1; i++) for (const f of [0, 0.5]) {
        const [x0, y0, r0] = spine[i], [x1, y1, r1] = spine[i + 1];
        victim.ball([mix(r0, r1, f) * 1.6, mix(r0, r1, f), mix(r0, r1, f) * 0.9], [mix(x0, x1, f), mix(y0, y1, f), 0], hide, 12);
      }
      const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.quadraticCurveTo(0.1, 0.3, -0.12, 0.38); fin.quadraticCurveTo(-0.08, 0.15, -0.3, 0); fin.closePath();
      const finGeometry = new THREE.ExtrudeGeometry(fin, { depth: 0.03, bevelEnabled: false });
      victim.mesh(finGeometry, hide, [0.1, 0.3, -0.015]);
      const tail = victim.mesh(finGeometry, hide, [1.2, 0.36, -0.015]);
      tail.scale.set(1.2, 1.5, 1); tail.rotation.z = -0.5;
      victim.mesh(finGeometry, hide, [1.1, 0.4, -0.015]).rotation.z = -2.4;
      over(0.75, 0.22);
    } else if (a.caught === 'seabird') {
      const white = victim.material('#f2f0e8'), dark = victim.material('#3a3d42');
      victim.ball([0.13, 0.1, 0.26], [0, 0.1, 0], white, 12);
      victim.ball([0.07, 0.065, 0.085], [0.06, 0.08, 0.32], white, 10);
      victim.mesh(new THREE.ConeGeometry(0.02, 0.14, 6), victim.material('#e9b23a'), [0.1, 0.07, 0.43]).rotation.set(Math.PI / 2, 0, -0.3);
      const wing = victim.ball([0.55, 0.015, 0.16], [-0.6, 0.07, 0.02], white, 12);
      wing.rotation.set(0, 0.2, -0.05);
      victim.ball([0.2, 0.016, 0.1], [-1.05, 0.065, 0.1], dark, 10).rotation.y = 0.5;
      victim.ball([0.12, 0.05, 0.2], [0.13, 0.11, -0.05], dark, 10);
      over(0.5, 0.14);
    } else if (a.caught === 'seal') {
      const fur = victim.material('#5d5f63', { roughness: 0.55 });
      victim.root.position.set(cx + Math.cos(edgeAngle) * R * 0.3, mound(cx + Math.cos(edgeAngle) * R * 0.3, cz + Math.sin(edgeAngle) * R * 0.3) - 0.03, cz + Math.sin(edgeAngle) * R * 0.3);
      const spine: [number, number, number][] = [[-0.7, 0.1, 0.09], [-0.4, 0.17, 0.19], [0, 0.22, 0.25], [0.35, 0.26, 0.21], [0.58, 0.4, 0.15], [0.68, 0.56, 0.12]];
      for (let i = 0; i < spine.length - 1; i++) for (const f of [0, 0.5]) {
        const [x0, y0, r0] = spine[i], [x1, y1, r1] = spine[i + 1];
        victim.ball([mix(r0, r1, f) * 1.3, mix(r0, r1, f), mix(r0, r1, f) * 1.05], [mix(x0, x1, f), mix(y0, y1, f), 0], fur, 12);
      }
      victim.ball([0.12, 0.11, 0.11], [0.72, 0.6, 0], fur, 12);
      victim.ball([0.06, 0.05, 0.06], [0.82, 0.58, 0], victim.material('#3a3b3d'), 8);
      for (const side of [-1, 1]) { victim.ball([0.02, 0.02, 0.02], [0.76, 0.64, side * 0.08], victim.material('#111214', { roughness: 0.2 }), 6); victim.ball([0.16, 0.025, 0.08], [0.3, 0.05, side * 0.27], fur, 8).rotation.y = side * 0.6; }
      const collar = victim.ring(0.15, 0.02, [0.6, 0.44, 0], new THREE.MeshStandardMaterial({ color: fade(palette.nets[0]), roughness: 1 }));
      collar.rotation.set(0, Math.PI / 2, 0.6);
      victim.tube([[0.6, 0.3, 0.1], [0.4, 0.1, 0.35], [0.1, 0.03, 0.5]], 0.012, collar.material as THREE.Material);
    } else if (a.caught === 'trap') {
      const wire = victim.material('#6a5a44', { metalness: 0.5, roughness: 0.7 });
      const w = 0.7, h = 0.3, d = 0.5;
      const trap = new Sculpture(context);
      for (const y of [0, h]) for (const z of [-d / 2, d / 2]) trap.rod([-w / 2, y, z], [w / 2, y, z], 0.012, wire);
      for (const y of [0, h]) for (const x of [-w / 2, 0, w / 2]) trap.rod([x, y, -d / 2], [x, y, d / 2], 0.012, wire);
      for (const x of [-w / 2, 0, w / 2]) for (const z of [-d / 2, d / 2]) trap.rod([x, 0, z], [x, h, z], 0.012, wire);
      const lattice = painted(64, 64, (ctx) => { ctx.clearRect(0, 0, 64, 64); ctx.strokeStyle = '#6a5a44'; ctx.lineWidth = 3; for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * 16, 0); ctx.lineTo(i * 16, 64); ctx.moveTo(0, i * 16); ctx.lineTo(64, i * 16); ctx.stroke(); } });
      lattice.wrapS = lattice.wrapT = THREE.RepeatWrapping; lattice.repeat.set(3, 2);
      trap.box([w, h, d], [0, h / 2, 0], new THREE.MeshStandardMaterial({ map: lattice, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 }));
      trap.root.position.set(0.1, 0.05, 0);
      trap.root.rotation.set(0.25, 0.3, 0.15);
      victim.root.add(trap.root);
      const bone = victim.material('#eeeadb');
      victim.rod([-1.3, 0.06, 0.45], [-0.3, 0.07, 0.6], 0.014, bone);
      for (let i = 0; i < 11; i++) { const t = i / 10, x = mix(-1.15, -0.45, t), z = mix(0.47, 0.58, t), len = 0.13 * Math.sin(t * Math.PI * 0.9 + 0.3); for (const side of [-1, 1]) victim.rod([x, 0.065, z], [x - 0.04, 0.05, z + side * len], 0.006, bone); }
      victim.ball([0.11, 0.07, 0.09], [-0.22, 0.08, 0.62], bone, 10);
      victim.mesh(new THREE.ConeGeometry(0.11, 0.16, 3), bone, [-1.38, 0.06, 0.44]).rotation.set(Math.PI / 2, 0, -1.4);
    }

    // What lives on top.
    const topY = mound(cx, cz);
    if (a.riders === 'crabs') {
      const count = Math.round(mix(5, 14, a.size));
      const at = Array.from({ length: count }, () => { const [x, z] = somewhere(0.6); return { x, z, turn: random() * 6, size: mix(0.035, 0.06, random()) }; });
      const red = new THREE.MeshStandardMaterial({ color: '#d2452c', roughness: 0.5 });
      const carapace = new THREE.SphereGeometry(1, 10, 6); carapace.scale(1.25, 0.5, 1);
      g.scatter(carapace, red, at.map(({ x, z, size }) => ({ at: [x, mound(x, z) + size * 0.7, z] as const, size })));
      g.scatter(new THREE.SphereGeometry(1, 8, 6), red, at.flatMap(({ x, z, size, turn }) => [-1, 1].map((side) => ({ at: [x + Math.cos(turn + side * 0.8) * size * 1.5, mound(x, z) + size * 0.9, z + Math.sin(turn + side * 0.8) * size * 1.5] as const, size: size * 0.42 }))));
      g.scatter(new THREE.SphereGeometry(1, 6, 4), red, at.flatMap(({ x, z, size, turn }) => [-2.2, -1.6, 1.6, 2.2, 2.8, -2.8].map((leg) => ({ at: [x + Math.cos(turn + leg) * size * 1.5, mound(x, z) + size * 0.3, z + Math.sin(turn + leg) * size * 1.5] as const, size: size * 0.22 }))));
    } else if (a.riders === 'booby') {
      const bird = new Sculpture(context);
      const white = bird.material('#f3f1e8'), brown = bird.material('#5a4636'), blue = new THREE.MeshStandardMaterial({ color: '#3fa7e0', roughness: 0.5 });
      bird.ball([0.14, 0.2, 0.17], [0, 0.34, 0], white, 14).rotation.x = -0.25;
      bird.ball([0.15, 0.17, 0.06], [0, 0.34, -0.11], brown, 12).rotation.x = -0.35;
      bird.rod([0, 0.48, 0.06], [0, 0.66, 0.1], 0.07, white, 0.06);
      bird.ball([0.075, 0.075, 0.085], [0, 0.69, 0.11], brown, 12);
      bird.mesh(new THREE.ConeGeometry(0.035, 0.2, 8), bird.material('#9fb3bd'), [0, 0.67, 0.27]).rotation.x = Math.PI / 2 + 0.12;
      bird.rod([0, 0.22, -0.16], [0, 0.1, -0.4], 0.05, brown, 0.015);
      for (const side of [-1, 1]) { bird.rod([side * 0.06, 0.18, 0.02], [side * 0.07, 0.03, 0.04], 0.015, blue); bird.ball([0.06, 0.015, 0.085], [side * 0.075, 0.02, 0.09], blue, 8); }
      bird.root.position.set(cx, topY, cz);
      bird.root.rotation.y = random() * 1.2 - 0.3;
      bird.root.scale.setScalar(1.25);
      g.root.add(bird.root);
    } else if (a.riders === 'seedlings') {
      const husk = g.material('#6d5233', { roughness: 0.9 }), leaf = new THREE.MeshStandardMaterial({ color: '#63a83a', roughness: 0.7, side: THREE.DoubleSide });
      g.ball([0.16, 0.13, 0.2], [cx, topY + 0.09, cz], husk, 12).rotation.y = random() * 3;
      for (let i = 0; i < 4; i++) {
        const angle = i * 1.7 + random(), reach = mix(0.35, 0.6, random());
        const blade = new THREE.Shape(); blade.moveTo(0, 0); blade.quadraticCurveTo(0.09, reach * 0.5, 0, reach); blade.quadraticCurveTo(-0.09, reach * 0.5, 0, 0);
        const frond = g.mesh(new THREE.ShapeGeometry(blade), leaf, [cx, topY + 0.18, cz]);
        frond.rotation.set(mix(0.2, 0.7, random()), angle, 0, 'YXZ');
      }
      const tuft = new THREE.ConeGeometry(0.02, 0.22, 4);
      g.scatter(tuft, new THREE.MeshStandardMaterial({ color: '#8fb04a', roughness: 0.9 }), Array.from({ length: Math.round(mix(14, 50, a.size)) }, () => { const [x, z] = somewhere(0.55); return { at: [x, mound(x, z) + 0.1, z] as const, size: mix(0.6, 1.4, random()) }; }));
    } else if (a.riders === 'highflyer') {
      const lean = mix(0.25, 0.6, random()), tall = 2.3;
      const tip: [number, number, number] = [cx + Math.sin(lean) * tall, topY + Math.cos(lean) * tall, cz + 0.1];
      g.rod([cx, topY - 0.1, cz], tip, 0.02, g.material('#d9d6c8'));
      g.ball([0.16, 0.2, 0.16], [cx + Math.sin(lean) * 0.5, topY + Math.cos(lean) * 0.5, cz + 0.02], new THREE.MeshStandardMaterial({ color: fade('#ee6a1c'), roughness: 0.6 }), 12);
      const flag = new THREE.PlaneGeometry(0.5, 0.36, 5, 2);
      const p = flag.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 10) * 0.04);
      flag.computeVertexNormals();
      const cloth = g.mesh(flag, new THREE.MeshStandardMaterial({ color: fade('#f0661a'), side: THREE.DoubleSide, roughness: 0.9 }), [tip[0] + 0.2, tip[1] - 0.25, tip[2]]);
      cloth.rotation.z = -lean;
    } else if (a.riders === 'castaway') {
      const stick = g.material('#9a9488', { roughness: 1 });
      const apex: [number, number, number] = [cx, topY + 0.85, cz];
      for (let i = 0; i < 3; i++) { const angle = i * 2.1 + 0.4; g.rod([cx + Math.cos(angle) * 0.6, mound(cx + Math.cos(angle) * 0.6, cz + Math.sin(angle) * 0.6), cz + Math.sin(angle) * 0.6], apex, 0.022, stick); }
      const tarp = new THREE.BufferGeometry();
      tarp.setAttribute('position', new THREE.Float32BufferAttribute([apex[0], apex[1] - 0.03, apex[2], cx + Math.cos(0.4) * 0.62, topY * 0.8, cz + Math.sin(0.4) * 0.62, cx + Math.cos(2.5) * 0.62, topY * 0.8, cz + Math.sin(2.5) * 0.62], 3));
      tarp.computeVertexNormals();
      g.mesh(tarp, new THREE.MeshStandardMaterial({ color: fade('#2a6fd0'), side: THREE.DoubleSide, roughness: 0.8 }));
      const shirt = g.box([0.34, 0.3, 0.01], [cx + 0.02, topY + 1.0, cz], new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#f1efe6' : '#c9c2ad', roughness: 0.9 }));
      shirt.rotation.y = 0.5;
      g.rod([cx, topY + 0.8, cz], [cx, topY + 1.2, cz], 0.016, stick);
      g.ball([0.3, 0.03, 0.2], [cx + 0.25, mound(cx + 0.25, cz + 0.4) + 0.03, cz + 0.4], g.material('#8c8c86'), 10);
    }

    // Age: weed fronds trailing out, goose barnacles hanging on the floats and rope.
    if (a.age > 0.3) {
      const weed = new THREE.ConeGeometry(0.05, 0.4, 5);
      weed.rotateX(Math.PI / 2);
      const fronds = Math.round(a.age * mix(20, 60, a.size));
      const mesh = new THREE.InstancedMesh(weed, new THREE.MeshStandardMaterial({ color: '#4f6a2f', roughness: 1 }), fronds);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < fronds; i++) {
        const angle = random() * 6, r = R * mix(0.85, 1.1, random());
        dummy.position.set(cx + Math.cos(angle) * r, 0.015, cz + Math.sin(angle) * r);
        dummy.rotation.set(0, -angle + Math.PI / 2 + (random() - 0.5), 0);
        dummy.scale.set(mix(0.6, 1.4, random()), 0.3, mix(0.6, 1.5, random()));
        dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      }
      g.root.add(mesh);
    }
    if (a.age > 0.6) g.scatter(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshStandardMaterial({ color: '#e9e6da', roughness: 0.6 }), Array.from({ length: Math.round((a.age - 0.6) * mix(60, 160, a.size)) }, () => {
      const spot = pick(spots), angle = random() * 6;
      return { at: [spot.x + Math.cos(angle) * spot.size, mound(spot.x, spot.z) + spot.size * mix(0.1, 0.6, random()), spot.z + Math.sin(angle) * spot.size] as const, size: mix(0.015, 0.03, random()) };
    }));

    waterPatch(s, R * 1.3, R * 1.22, { rings: 2, foam: 4, at: [cx, cz] });
    const pace = mix(0.4, 1.3, mood.energy), sway = mix(0.004, 0.035, mood.energy);
    return afloat(s, {
      footprint: R * 1.1,
      update: (_dt, time) => { g.root.rotation.z = Math.sin(time * pace) * sway; g.root.rotation.x = Math.cos(time * pace * 0.8) * sway; },
    });
  },
});
