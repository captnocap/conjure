import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = [number, number, number];
type Bit = { p: V3; s: V3; r?: V3; c?: THREE.ColorRepresentation };

/** One instanced draw call of freely placed, turned, stretched and tinted copies. r = [pitch, yaw, roll]. */
function bits(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, list: readonly Bit[]) {
  if (!list.length) { geometry.dispose(); return null; }
  const mesh = new THREE.InstancedMesh(geometry, material, list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ');
  const v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  list.forEach((b, i) => {
    e.set(...(b.r ?? [0, 0, 0]), 'YXZ');
    m.compose(v.set(...b.p), q.setFromEuler(e), sc.set(...b.s));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, col.set(b.c ?? '#ffffff'));
  });
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const CROPS = {
  lettuce: 'Loose heads of butter lettuce, ruffled green and red-tipped rosettes.',
  tomato: 'Tomato vines that trail down the tower hung with red and green fruit.',
  strawberry: 'Low strawberry plants with white flowers and red berries dangling on runners.',
  chard: 'Rainbow chard standing upright on crimson, yellow and pink stalks.',
  herbs: 'Bushy basil and purple-flowering herbs, dense and fragrant.',
  nasturtium: 'Round lily-pad leaves and orange and yellow edible flowers, grown as much for joy as for food.',
  mixed: 'A different crop on every tier, a whole kitchen garden on one pole.',
} as const;
type Crop = Exclude<keyof typeof CROPS, 'mixed'>;

export default defineThing({
  questions: {
    crop: choice('What is growing in the column?', CROPS),
    state: choice('How is the crop doing right now?', {
      seedlings: 'Just planted: tiny pale sprouts in mostly bare pockets, all promise.',
      thriving: 'Thriving: full, glossy, evenly grown, ready to pick.',
      overgrown: 'Overgrown: nobody has harvested in weeks and it spills and trails everywhere.',
      bolted: 'Bolted to seed: tall leggy flower stalks with yellow blooms, leaves gone thin and bitter.',
      blighted: 'Blighted: brown, spotted, collapsed leaves and empty pockets where plants were pulled.',
      harvested: 'Freshly harvested: cut stubs in most pockets, a few plants left for seed.',
    }),
    lights: choice('What colour are the grow-lights?', {
      pink: 'Hot magenta-pink, the classic red-and-blue grow-light glow.',
      white: 'Clean full-spectrum white, like a clinic.',
      violet: 'Deep blue-violet, a night cycle.',
      amber: 'Old amber sodium, warm and tired.',
      dark: 'Dark: the lights have failed or been switched off.',
    }),
    rig: choice('How are the grow-lights arranged?', {
      halo: 'One glowing halo ring held over the top on a curved arm.',
      rings: 'Three light rings stacked around the tower on thin posts.',
      bars: 'Four upright light bars standing around it like a cage.',
    }),
    tower: choice('What is the tower made of?', {
      pipe: 'A smooth white plastic pipe with angled cup pockets.',
      ship: 'A brushed-metal ship-issue column with riveted bands and numbered tiers.',
      clay: 'Stacked terracotta-coloured planter rings, hand-made and patched.',
      salvage: 'A salvaged dark drum pipe with mismatched coloured cups wired on.',
    }),
    tiers: score('How tall is the column?', ['A short three-tier stub', 'Chest high', 'Head high', 'A towering nine-tier pole']),
    foot: choice('What has been left at its foot?', {
      nothing: 'Nothing, the deck is swept clean.',
      crate: 'A harvest crate heaped with picked produce.',
      can: 'A watering can and a hand trowel.',
      leak: 'A spreading puddle from a leaking drip line.',
      stool: 'A little stool with a tending log-book on it.',
      litter: 'A litter of fallen leaves and dropped fruit.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rr = (lo: number, hi: number) => mix(lo, hi, random());
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    const tiers = Math.round(mix(3, 9, a.tiers));
    const around = a.tower === 'clay' ? 5 : 6;
    const gap = 0.24;
    const baseH = 0.42;
    const colR = a.tower === 'clay' ? 0.17 : 0.15;
    const colH = tiers * gap + 0.22;
    const top = baseH + colH;

    const shell = {
      pipe: s.material('#eef0ea', { roughness: 0.4 }),
      ship: s.material('#aab4b6', { metalness: 0.7, roughness: 0.38 }),
      clay: s.material('#c0714d', { roughness: 0.9 }),
      salvage: s.material('#3d4a4f', { roughness: 0.7 }),
    }[a.tower];
    const dark = s.material('#252b2d', { roughness: 0.7 });
    const steel = s.material('#8f9a9c', { metalness: 0.75, roughness: 0.35 });

    // Reservoir drum with a hazard band, lid, pump box and feet.
    s.lathe([[0, 0.02], [0.4, 0.02], [0.45, 0.08], [0.45, baseH - 0.06], [0.4, baseH], [colR + 0.05, baseH], [colR + 0.05, baseH + 0.05], [0, baseH + 0.05]], a.tower === 'clay' ? s.material('#7d8a80') : s.material(a.tower === 'salvage' ? '#4a6da0' : '#d9ddd6', { roughness: 0.5 }));
    s.cylinder(0.455, 0.455, 0.05, [0, baseH * 0.62, 0], s.material(a.tower === 'ship' ? '#d8a020' : '#5f8f5a'), 32);
    s.box([0.16, 0.14, 0.1], [0.3, baseH + 0.07, 0.18], dark);
    s.label(a.tower === 'ship' ? `AG-${1 + Math.floor(random() * 88)}` : 'H2O', 0.22, 0.08, [0, baseH * 0.3, 0.452], '#1f2a2c', '#e9e4cf');
    for (let i = 0; i < 3; i++) s.cylinder(0.05, 0.06, 0.04, [Math.sin(i * 2.094) * 0.36, 0.02, Math.cos(i * 2.094) * 0.36], dark, 10);

    // Everything that turns.
    const spin = new THREE.Group();
    s.root.add(spin);
    const turn = <T extends THREE.Object3D>(o: T) => { spin.add(o); return o; };
    turn(s.cylinder(colR, colR, colH, [0, baseH + colH / 2, 0], shell, a.tower === 'ship' ? 6 : 24));
    turn(s.lathe([[colR + 0.03, 0], [colR + 0.03, 0.05], [0.05, 0.12], [0, 0.12]], a.tower === 'pipe' ? s.material('#5f8f5a') : dark, [0, top, 0]));
    if (a.tower === 'ship' || a.tower === 'salvage') for (let t = 0; t <= tiers; t++) turn(s.cylinder(colR + 0.012, colR + 0.012, 0.025, [0, baseH + 0.1 + t * gap, 0], a.tower === 'ship' ? steel : s.material('#8a5a34'), a.tower === 'ship' ? 6 : 24));
    if (a.tower === 'clay') for (let t = 0; t < tiers; t++) turn(s.lathe([[colR, 0], [colR + 0.07, 0.05], [colR + 0.09, 0.12], [colR + 0.07, 0.12], [colR, 0.07]], shell, [0, baseH + 0.1 + t * gap, 0]));

    // Drip manifold and feed lines spiralling down the column.
    turn(s.ring(colR + 0.045, 0.012, [0, top - 0.02, 0], dark)).rotation.x = Math.PI / 2;
    for (let l = 0; l < 3; l++) {
      const pts: V3[] = [];
      for (let k = 0; k <= 10; k++) {
        const ang = l * 2.094 + k * 0.5, y = top - 0.02 - (colH - 0.1) * (k / 10);
        pts.push([Math.sin(ang) * (colR + 0.018), y, Math.cos(ang) * (colR + 0.018)]);
      }
      turn(s.tube(pts, 0.009, dark));
    }

    // Plants.
    const leaves: Bit[] = [], stems: Bit[] = [], fruit: Bit[] = [], cups: Bit[] = [], stubs: Bit[] = [];
    const cupTints = ['#d8573f', '#e2b23c', '#4d8fb5', '#e9e6dc', '#6aa36a'];
    const sick = () => pick(['#6f4b2a', '#8b6a2e', '#b9a544', '#3d3323', '#7a6a3c']);
    const tint = (hex: string, spread = 0.06) => {
      const c = new THREE.Color(hex);
      const hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      c.setHSL(hsl.h + rr(-0.02, 0.02), hsl.s * mix(0.7, 1.05, mood.cheer), THREE.MathUtils.clamp(hsl.l + rr(-spread, spread), 0.05, 0.9));
      if (a.state === 'blighted' && random() < 0.8) c.set(sick());
      else if (a.state === 'bolted') c.lerp(new THREE.Color('#c9c96a'), 0.35);
      else if (a.state === 'seedlings') c.lerp(new THREE.Color('#c8e08a'), 0.5);
      else if (random() < mood.wear * 0.3) c.set(sick());
      return c;
    };
    const cropList: Crop[] = ['lettuce', 'tomato', 'strawberry', 'chard', 'herbs', 'nasturtium'];
    const size = 1.75 * { seedlings: 0.26, thriving: 1, overgrown: 1.3, bolted: 0.8, blighted: 0.75, harvested: 0.9 }[a.state];
    const lush = mix(0.7, 1.25, mood.density) * (a.state === 'overgrown' ? 1.4 : a.state === 'bolted' || a.state === 'blighted' ? 0.6 : 1);
    const droop = a.state === 'blighted' ? 0.9 : a.state === 'overgrown' ? 0.3 : 0;

    for (let t = 0; t < tiers; t++) {
      const crop: Crop = a.crop === 'mixed' ? cropList[(t + Math.floor(context.seed % 6)) % 6] : a.crop;
      const y = baseH + 0.16 + t * gap;
      for (let k = 0; k < around; k++) {
        const th = (k + (t % 2) * 0.5) / around * Math.PI * 2;
        const sx = Math.sin(th), cz = Math.cos(th);
        const reach = colR + (a.tower === 'clay' ? 0.05 : 0.07);
        const O: V3 = [sx * reach, y + 0.06, cz * reach];
        const at = (out: number, up: number, side = 0): V3 => [O[0] + sx * out + cz * side, O[1] + up, O[2] + cz * out - sx * side];
        if (a.tower !== 'clay') cups.push({ p: [sx * (colR + 0.025), y, cz * (colR + 0.025)], s: [0.82, 0.82, 0.82], r: [0.8, th, 0], c: a.tower === 'salvage' ? pick(cupTints) : a.tower === 'ship' ? '#7f8a8c' : '#f4f5ee' });

        const empty = (a.state === 'blighted' && random() < 0.3) || (a.state === 'harvested' && random() < 0.82) || (a.state === 'seedlings' && random() < 0.12) || random() < mood.wear * 0.12;
        if (empty) {
          if (a.state === 'harvested' || random() < 0.5) for (let j = 0; j < 3; j++) stubs.push({ p: at(rr(-0.01, 0.02), 0.01, rr(-0.02, 0.02)), s: [0.008, 0.03, 0.008], r: [rr(0.2, 0.9), th + rr(-0.6, 0.6), 0], c: a.state === 'harvested' ? '#b9c98a' : '#6f5a3a' });
          continue;
        }
        const sz = size * rr(0.8, 1.15);
        const leaf = (yawOff: number, up: number, len: number, wide: number, hex: string, from: V3 = O, thick = 0.22) =>
          leaves.push({ p: from, s: [wide * sz, wide * sz * thick, (len * sz) / 2], r: [-(up - droop * rr(0.4, 1.2)), th + yawOff, rr(-0.4, 0.4)], c: tint(hex) });

        if (crop === 'lettuce') {
          const red = random() < 0.3;
          for (let j = 0, n = Math.round(9 * lush); j < n; j++) leaf(rr(-2.2, 2.2), rr(0.15, 1.25), rr(0.1, 0.17), rr(0.045, 0.065), red && j % 2 ? '#8a3350' : pick(['#7fbf3f', '#93cf52', '#5fa63a']));
        } else if (crop === 'chard') {
          const stalk = pick(['#d2264a', '#f0c22e', '#f06a9a', '#f4f1e0']);
          for (let j = 0, n = Math.round(6 * lush); j < n; j++) {
            const yo = rr(-1.3, 1.3), up = rr(0.85, 1.35), len = rr(0.1, 0.16) * sz;
            const tip: V3 = [O[0] + Math.sin(th + yo) * Math.cos(up) * len, O[1] + Math.sin(up) * len, O[2] + Math.cos(th + yo) * Math.cos(up) * len];
            stems.push({ p: O, s: [0.007, 0.007, len / 2], r: [-up, th + yo, 0], c: stalk });
            leaf(yo, up - rr(0, 0.3), rr(0.14, 0.2), rr(0.045, 0.06), pick(['#2f7d3a', '#3b8f3f', '#5a2a45']), tip);
          }
        } else if (crop === 'herbs') {
          for (let j = 0, n = Math.round(16 * lush); j < n; j++) leaf(rr(-2.6, 2.6), rr(0.3, 1.4), rr(0.05, 0.085), rr(0.028, 0.04), pick(['#3f9a3c', '#57b04a', '#2f7f3a', '#6a4c93']), at(rr(-0.02, 0.05), rr(0, 0.09) * sz, rr(-0.05, 0.05)), 0.4);
          if (a.state !== 'seedlings' && random() < 0.5) {
            const h = rr(0.1, 0.16) * sz;
            stems.push({ p: at(0.02, 0.05), s: [0.004, 0.004, h / 2], r: [-1.3, th, 0], c: '#5a8a46' });
            for (let j = 0; j < 4; j++) fruit.push({ p: at(0.02 + Math.cos(1.3) * h * (0.6 + j * 0.13), 0.05 + Math.sin(1.3) * h * (0.6 + j * 0.13)), s: [0.011, 0.014, 0.011], c: '#9a6ad0' });
          }
        } else if (crop === 'nasturtium') {
          for (let j = 0, n = Math.round(8 * lush); j < n; j++) {
            const p = at(rr(-0.02, 0.1) * sz, rr(-0.12 * (1 + droop), 0.1) * sz, rr(-0.1, 0.1) * sz);
            leaves.push({ p, s: [rr(0.03, 0.05) * sz, 0.006, rr(0.015, 0.025) * sz], r: [rr(-0.9, 0.2), th + rr(-0.6, 0.6), rr(-0.3, 0.3)], c: tint('#6fb24a') });
          }
          if (a.state !== 'seedlings') for (let j = 0, n = Math.round(rr(1, 4) * (a.state === 'blighted' ? 0.4 : 1)); j < n; j++) fruit.push({ p: at(rr(0.04, 0.12) * sz, rr(-0.08, 0.1) * sz, rr(-0.09, 0.09) * sz), s: [0.034, 0.02, 0.034], c: a.state === 'blighted' ? '#8a5a2a' : pick(['#f28a1e', '#f6c42a', '#e2472a']) });
        } else if (crop === 'strawberry') {
          for (let j = 0, n = Math.round(8 * lush); j < n; j++) leaf(rr(-2, 2), rr(0.1, 0.9), rr(0.06, 0.09), rr(0.04, 0.055), pick(['#3f8f3a', '#4fa544', '#2f7a36']), at(rr(-0.01, 0.04), rr(0, 0.03), rr(-0.03, 0.03)), 0.3);
          if (a.state !== 'seedlings') for (let j = 0, n = Math.round(rr(1, 4.5) * (a.state === 'overgrown' ? 1.5 : 1)); j < n; j++) {
            const out = rr(0.04, 0.1), side = rr(-0.07, 0.07), drop = rr(0.05, 0.16) * (a.state === 'overgrown' ? 1.6 : 1);
            stems.push({ p: at(out, 0, side), s: [0.003, 0.003, drop / 2], r: [Math.PI / 2, 0, 0], c: '#7aa04a' });
            const flower = random() < 0.25;
            fruit.push({ p: at(out, -drop, side), s: flower ? [0.024, 0.008, 0.024] : [0.024, 0.031, 0.024], c: flower ? '#fbf7ea' : a.state === 'blighted' ? '#4a2f2a' : random() < 0.75 ? '#d81f33' : '#d9e08a' });
          }
        } else {
          // Tomato: a vine that climbs out then hangs, with leaves and trusses of fruit.
          let p: V3 = O, up = rr(0.5, 0.9);
          const segs = Math.round(mix(2, 6, random()) * sz * (a.state === 'overgrown' ? 1.5 : 1)) + 1, yo = rr(-0.5, 0.5);
          for (let j = 0; j < segs; j++) {
            const len = 0.11;
            stems.push({ p, s: [0.006, 0.006, len / 2], r: [-up, th + yo, 0], c: a.state === 'blighted' ? '#6f5a3a' : '#5d8f3c' });
            const next: V3 = [p[0] + Math.sin(th + yo) * Math.cos(up) * len, p[1] + Math.sin(up) * len, p[2] + Math.cos(th + yo) * Math.cos(up) * len];
            for (let l = 0, n = Math.round(2.4 * lush); l < n; l++) leaf(yo + rr(-1.5, 1.5), up + rr(-0.6, 0.6), rr(0.07, 0.11) / sz, rr(0.03, 0.042) / sz, pick(['#3f8a3a', '#4f9c40', '#357a36']), next, 0.3);
            if (a.state !== 'seedlings' && j > 0 && random() < (a.state === 'bolted' ? 0.2 : 0.7)) {
              const r = rr(0.028, 0.045);
              fruit.push({ p: [next[0] + rr(-0.03, 0.03), next[1] - 0.04, next[2] + rr(-0.03, 0.03)], s: [r, r * 0.92, r], c: a.state === 'blighted' ? pick(['#3d2a22', '#6a4a2a']) : random() < 0.65 ? '#e03a26' : pick(['#8fbf3a', '#f0a23a']) });
            }
            p = next;
            up -= rr(0.5, 0.95);
            if (up < -1.45) up = -1.45;
          }
        }
        if (a.state === 'bolted' && random() < 0.8) {
          const h = rr(0.24, 0.42), lean = rr(1.0, 1.4), yo = rr(-0.5, 0.5);
          stems.push({ p: O, s: [0.005, 0.005, h / 2], r: [-lean, th + yo, 0], c: '#9aa85a' });
          for (let j = 0; j < 5; j++) {
            const d = h * rr(0.6, 1.02);
            fruit.push({ p: [O[0] + Math.sin(th + yo) * Math.cos(lean) * d + rr(-0.02, 0.02), O[1] + Math.sin(lean) * d, O[2] + Math.cos(th + yo) * Math.cos(lean) * d + rr(-0.02, 0.02)], s: [0.022, 0.022, 0.022], c: random() < 0.7 ? '#f3d82e' : '#e9e2c0' });
          }
        }
      }
    }
    const leafGeo = new THREE.SphereGeometry(1, 7, 5); leafGeo.translate(0, 0, 1);
    const stemGeo = new THREE.BoxGeometry(1, 1, 2); stemGeo.translate(0, 0, 1);
    const cupGeo = new THREE.CylinderGeometry(0.068, 0.045, 0.13, 12); cupGeo.translate(0, 0.045, 0);
    const white = () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 });
    bits(spin, cupGeo, white(), cups);
    bits(spin, leafGeo, white(), leaves);
    bits(spin, stemGeo, white(), stems);
    bits(spin, new THREE.BoxGeometry(1, 2, 1), white(), stubs);
    bits(spin, new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35 }), fruit);

    // Grow-light rig (static).
    const hue = { pink: '#ff3fa8', white: '#f4f8ff', violet: '#7a4dff', amber: '#ffab3a', dark: '#3a3f42' }[a.lights];
    const lit = a.lights !== 'dark';
    const lamp = new THREE.MeshStandardMaterial({ color: lit ? hue : '#4a4f52', emissive: lit ? hue : '#000000', emissiveIntensity: lit ? mix(1.1, 2.2, mood.cheer) : 0, roughness: 0.4 });
    const glow = new THREE.MeshBasicMaterial({ color: hue, transparent: true, opacity: lit ? 0.1 : 0, depthWrite: false, side: THREE.DoubleSide });
    const halo = (y: number, radius: number) => {
      s.ring(radius, 0.022, [0, y, 0], lamp).rotation.x = Math.PI / 2;
      s.ring(radius, 0.034, [0, y + 0.02, 0], dark).rotation.x = Math.PI / 2;
      if (lit) s.mesh(new THREE.CylinderGeometry(radius * 0.9, radius * 1.25, 0.5, 24, 1, true), glow, [0, y - 0.27, 0]);
    };
    if (a.rig === 'halo') {
      const y = top + 0.34;
      halo(y, 0.44);
      s.tube([[-0.42, baseH - 0.05, -0.2], [-0.62, top * 0.5, -0.3], [-0.6, top + 0.2, -0.28], [-0.4, y + 0.03, -0.18]], 0.018, steel);
      for (let i = 0; i < 3; i++) s.rod([Math.sin(i * 2.094 + 1) * 0.44, y + 0.02, Math.cos(i * 2.094 + 1) * 0.44], [0, y + 0.2, 0], 0.006, steel);
      s.rod([0, y + 0.2, 0], [-0.4, y + 0.03, -0.18], 0.008, steel);
    } else if (a.rig === 'rings') {
      for (let i = 0; i < 3; i++) halo(baseH + 0.3 + (colH + 0.1) * ((i + 0.6) / 3), 0.5);
      for (let i = 0; i < 3; i++) s.rod([Math.sin(i * 2.094) * 0.5, baseH - 0.1, Math.cos(i * 2.094) * 0.5], [Math.sin(i * 2.094) * 0.5, top + 0.2, Math.cos(i * 2.094) * 0.5], 0.012, steel);
    } else {
      for (let i = 0; i < 4; i++) {
        const ang = i * Math.PI / 2 + Math.PI / 4, x = Math.sin(ang) * 0.56, z = Math.cos(ang) * 0.56;
        s.box([0.07, top + 0.1, 0.05], [x * 1.04, (top + 0.1) / 2, z * 1.04], dark).rotation.y = ang;
        s.box([0.05, colH, 0.02], [x * 0.99, baseH + colH / 2 + 0.05, z * 0.99], lamp).rotation.y = ang;
        s.cylinder(0.08, 0.1, 0.03, [x * 1.04, 0.015, z * 1.04], dark, 12);
      }
      s.ring(0.585, 0.012, [0, top + 0.1, 0], steel).rotation.x = Math.PI / 2;
    }

    // What was left at its foot.
    const fx = 0.72, fz = 0.42;
    if (a.foot === 'crate') {
      const wood = s.material('#b98a52');
      s.box([0.42, 0.03, 0.3], [fx, 0.015, fz], wood);
      for (const dz of [-0.14, 0.14]) for (const y of [0.07, 0.15]) s.box([0.42, 0.05, 0.02], [fx, y, fz + dz], wood);
      for (const dx of [-0.2, 0.2]) for (const y of [0.07, 0.15]) s.box([0.02, 0.05, 0.3], [fx + dx, y, fz], wood);
      const heap: Bit[] = [];
      const colour = { lettuce: '#8fcf52', tomato: '#e03a26', strawberry: '#d81f33', chard: '#3b8f3f', herbs: '#57b04a', nasturtium: '#f28a1e', mixed: '#e03a26' }[a.crop];
      for (let i = 0; i < 26; i++) heap.push({ p: [fx + rr(-0.16, 0.16), 0.08 + rr(0, 0.14), fz + rr(-0.1, 0.1)], s: [rr(0.03, 0.05), rr(0.03, 0.045), rr(0.03, 0.05)], c: random() < 0.75 ? colour : '#7fbf3f' });
      bits(s.root, new THREE.SphereGeometry(1, 8, 6), white(), heap);
    } else if (a.foot === 'can') {
      const tin = s.material('#4f8f86', { metalness: 0.4, roughness: 0.45 });
      s.cylinder(0.1, 0.11, 0.22, [fx, 0.11, fz], tin, 18);
      s.rod([fx + 0.08, 0.08, fz], [fx + 0.3, 0.25, fz], 0.016, tin, 0.01);
      s.cylinder(0.035, 0.012, 0.03, [fx + 0.31, 0.26, fz], tin, 12).rotation.z = -0.9;
      s.ring(0.07, 0.01, [fx - 0.1, 0.13, fz], tin, Math.PI).rotation.z = Math.PI / 2;
      s.box([0.05, 0.012, 0.13], [fx - 0.05, 0.008, fz + 0.26], steel).rotation.y = 0.5;
      s.rod([fx - 0.02, 0.012, fz + 0.31], [fx + 0.03, 0.012, fz + 0.4], 0.012, s.material('#b06a3a'));
    } else if (a.foot === 'leak') {
      const water = new THREE.MeshStandardMaterial({ color: '#7fb4c8', roughness: 0.05, metalness: 0.3 });
      for (let i = 0; i < 4; i++) s.cylinder(rr(0.14, 0.3), rr(0.14, 0.3), 0.006, [rr(0.25, 0.7), 0.003 + i * 0.001, rr(0.1, 0.55)], water, 20).scale.z = rr(0.6, 1);
      s.tube([[0.3, baseH + 0.1, 0.2], [0.5, baseH, 0.3], [0.52, 0.2, 0.34], [0.6, 0.02, 0.4]], 0.01, dark);
    } else if (a.foot === 'stool') {
      const wood = s.material('#a9814e');
      s.cylinder(0.15, 0.15, 0.03, [fx, 0.34, fz], wood, 18);
      for (let i = 0; i < 3; i++) s.rod([fx + Math.sin(i * 2.094) * 0.14, 0, fz + Math.cos(i * 2.094) * 0.14], [fx + Math.sin(i * 2.094) * 0.08, 0.33, fz + Math.cos(i * 2.094) * 0.08], 0.014, wood);
      s.box([0.16, 0.022, 0.21], [fx, 0.366, fz], s.material('#2f5d50')).rotation.y = 0.4;
      s.box([0.145, 0.006, 0.195], [fx, 0.38, fz], s.material('#efe9d6')).rotation.y = 0.4;
      s.rod([fx - 0.03, 0.39, fz - 0.05], [fx + 0.06, 0.39, fz + 0.04], 0.005, s.material('#d8a020'));
    } else if (a.foot === 'litter') {
      const drop: Bit[] = [];
      for (let i = 0; i < 40; i++) {
        const ang = rr(0, 6.283), d = rr(0.48, 0.85);
        drop.push({ p: [Math.sin(ang) * d, 0.004, Math.cos(ang) * d], s: [rr(0.02, 0.04), 0.004, rr(0.03, 0.06)], r: [0, rr(0, 6.283), 0], c: random() < 0.6 ? sick() : '#7fa84a' });
      }
      bits(s.root, new THREE.SphereGeometry(1, 7, 5), white(), drop);
    }

    // Falling drips.
    const drips: THREE.Mesh[] = [];
    if (a.state !== 'blighted' || mood.wear < 0.7) {
      const water = new THREE.MeshStandardMaterial({ color: '#bfe6f5', roughness: 0.1, emissive: '#7fc8e8', emissiveIntensity: 0.3 });
      for (let i = 0; i < 5; i++) {
        const ang = rr(0, 6.283);
        const drip = s.ball([0.008, 0.014, 0.008], [Math.sin(ang) * (colR + 0.13), baseH + rr(0.1, colH), Math.cos(ang) * (colR + 0.13)], water, 8);
        drips.push(drip);
      }
    }

    spin.rotation.y = rr(0, 6.283);
    const speed = mix(0.04, 0.5, mood.energy);
    return s.finish({
      footprint: 0.7,
      update: (dt) => {
        spin.rotation.y += dt * speed;
        for (const drip of drips) {
          drip.position.y -= dt * mix(0.25, 0.9, mood.energy);
          if (drip.position.y < baseH + 0.06) drip.position.y = top - 0.05;
        }
      },
    });
  },
});
