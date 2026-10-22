import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = THREE.Vector3;

export default defineThing({
  questions: {
    gone: score('How far gone is it?', ['Sulking: yellowing and starting to drop', 'Half bare, the rest brown at the edges', 'A few crisp leaves hanging on', 'Bare grey twigs, dead for a year']),
    watered: choice('Is it still being watered?', {
      dry: 'No: the compost has shrunk from the pot and cracked like a riverbed.',
      still: 'Yes, faithfully: dark wet compost, a little watering can left beside it.',
      drowned: 'Too much: a saucer brimming over into a puddle, green algae on the soil.',
      bottle: 'By proxy: an upturned plastic bottle stuck in the soil as a drip feeder, long empty.',
    }),
    height: score('How tall is it?', ['Waist high', 'Chest high', 'Head high', 'Brushing the ceiling']),
    trunk: choice('What form was it grown in?', {
      single: 'One slim grey trunk with a loose weeping crown.',
      braided: 'Three stems plaited together, the garden-centre showpiece.',
      standard: 'A lollipop standard tied to a bamboo cane, a ball of twigs on a stick.',
    }),
    pot: choice('What is it planted in?', {
      terracotta: 'A terracotta-coloured plastic pot with a rolled rim.',
      white: 'A shiny white plastic pot gone yellow.',
      basket: 'Its black nursery pot dropped inside a woven basket.',
      gift: 'Still in the crinkled foil wrap and ribbon bow it arrived in.',
    }),
    shoot: choice('Is there any sign of life?', {
      none: 'None at all.',
      base: 'One stubborn bright green shoot from the base of the trunk.',
      tip: 'A single green sprig at the very top, reaching for the light.',
      several: 'Several new shoots along the branches: it is coming back.',
    }),
    fallen: choice('Where are the leaves it has dropped?', {
      ring: 'In a ring on the floor exactly where they fell, never swept.',
      drift: 'Blown into a drift on one side by the draught under the door.',
      swept: 'Swept away; only one or two fresh ones on the floor.',
    }),
    dressing: choice('Is anything still hung on it?', {
      nothing: 'Nothing.',
      lights: 'A string of fairy lights from some Christmas, never taken down.',
      tag: 'The care label and a gift tag, still tied to a branch.',
      baubles: 'Three baubles and a strand of tinsel.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = (lo: number, hi: number) => lo + (hi - lo) * random();
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const tall = mix(1.0, 2.35, a.height);
    const potH = 0.27, soilY = potH - 0.025;

    // Pot, compost and whatever stands under it.
    const potColour = { terracotta: '#b9603c', white: '#e6dfc4', basket: '#17181a', gift: '#17181a' }[a.pot];
    const potMaterial = s.material(potColour, { roughness: a.pot === 'white' ? 0.3 : 0.6 });
    s.lathe([[0.125, 0], [0.13, 0.01], [0.165, potH - 0.04], [0.18, potH - 0.035], [0.18, potH], [0.165, potH], [0.16, soilY]], potMaterial);
    const soilTint = { dry: '#8a7256', still: '#2e2118', drowned: '#2a2a1c', bottle: '#6b563f' }[a.watered];
    s.cylinder(a.watered === 'dry' ? 0.145 : 0.162, 0.15, 0.03, [0, soilY - 0.012, 0], s.material(soilTint, { roughness: 1 }), 18);
    if (a.watered === 'dry') for (let i = 0; i < 5; i++) { const t = r(0, 6.28); s.rod([0, soilY + 0.004, 0], [Math.cos(t) * 0.14, soilY + 0.004, Math.sin(t) * 0.14], 0.003, s.material('#3d2f22')); }
    if (a.watered === 'drowned') {
      s.cylinder(0.15, 0.15, 0.004, [0, soilY + 0.004, 0], s.material('#5f8a3a', { roughness: 0.5 }), 18);
      s.cylinder(0.24, 0.2, 0.035, [0, 0.0175, 0], potMaterial, 22);
      const water = s.material('#8fa6ad', { roughness: 0.08, metalness: 0.2 });
      s.cylinder(0.23, 0.23, 0.004, [0, 0.034, 0], water, 22);
      s.ball([0.34, 0.004, 0.25], [0.2, 0.003, 0.14], water, 16).rotation.y = r(0, 3);
    }
    if (a.watered === 'still') {
      s.cylinder(0.23, 0.2, 0.03, [0, 0.015, 0], potMaterial, 22);
      const can = s.material(mood.cheer > 0.5 ? '#4f9d5a' : '#6f8fa3', { roughness: 0.4 });
      const cx = 0.42, cz = 0.22;
      s.cylinder(0.075, 0.085, 0.16, [cx, 0.08, cz], can, 16);
      s.rod([cx + 0.06, 0.05, cz], [cx + 0.24, 0.18, cz + 0.02], 0.016, can, 0.009);
      s.ball([0.022, 0.022, 0.012], [cx + 0.245, 0.185, cz + 0.02], can, 8);
      s.ring(0.06, 0.009, [cx - 0.085, 0.1, cz], can, Math.PI).rotation.z = Math.PI / 2;
    }
    if (a.watered === 'bottle') {
      const pet = new THREE.MeshStandardMaterial({ color: '#b9d9cf', roughness: 0.15, transparent: true, opacity: 0.6 });
      const bottle = s.lathe([[0.012, 0], [0.014, 0.05], [0.04, 0.1], [0.042, 0.27], [0.03, 0.285], [0, 0.285]], pet, [0.09, soilY - 0.02, 0.05]);
      bottle.rotation.z = -0.2;
      s.cylinder(0.043, 0.043, 0.05, [0.125, soilY + 0.16, 0.05], s.material('#3f78b8', { roughness: 0.4 }), 14).rotation.z = -0.2;
    }
    if (a.pot === 'basket') {
      const weave = document.createElement('canvas');
      weave.width = weave.height = 64;
      const g = weave.getContext('2d')!;
      g.fillStyle = '#b08a52'; g.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x += 16) { g.fillStyle = (x / 16 + y / 8) % 2 ? '#8f6c3a' : '#c9a468'; g.fillRect(x + (y % 16 ? 8 : 0), y, 14, 6); }
      const map = new THREE.CanvasTexture(weave);
      map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(5, 2);
      s.lathe([[0.16, 0], [0.2, 0.02], [0.225, 0.2], [0.21, 0.245], [0.2, 0.245]], new THREE.MeshStandardMaterial({ map, roughness: 0.95, side: THREE.DoubleSide }));
    }
    if (a.pot === 'gift') {
      const foil = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#c8273a' : '#8c6fb5', metalness: 0.7, roughness: 0.3, flatShading: true, side: THREE.DoubleSide });
      const wrap = s.mesh(new THREE.CylinderGeometry(0.25, 0.14, 0.34, 11, 3, true), foil, [0, 0.17, 0]);
      const p = wrap.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setXYZ(i, p.getX(i) * r(0.85, 1.12), p.getY(i) * r(0.85, 1.1), p.getZ(i) * r(0.85, 1.12));
      wrap.geometry.computeVertexNormals();
      const ribbon = s.material('#f0d27a', { roughness: 0.4 });
      s.ring(0.185, 0.012, [0, 0.19, 0], ribbon).rotation.x = Math.PI / 2;
      for (const side of [-1, 1]) s.ball([0.055, 0.035, 0.02], [side * 0.05, 0.19, 0.19], ribbon, 10).rotation.z = side * 0.4;
    }

    // Woody parts are gathered as instances of one tapered stick.
    const bark = new THREE.Color('#7d6f5d').lerp(new THREE.Color('#8f8a84'), a.gone * 0.6);
    const sticks: { from: V3; to: V3; radius: number; green?: boolean }[] = [];
    const twigs: { from: V3; to: V3 }[] = [];
    const up = v(0, 1, 0);
    const grow = (from: V3, dir: V3, length: number, radius: number, depth: number) => {
      const to = from.clone().addScaledVector(dir, length);
      sticks.push({ from, to, radius });
      if (depth === 0) {
        // Weeping tips: a last thin length that gives up and hangs.
        const hang = to.clone().add(v(dir.x * 0.05, -r(0.1, 0.24) * tall / 1.6, dir.z * 0.05));
        sticks.push({ from: to, to: hang, radius: radius * 0.6 });
        twigs.push({ from: to, to: hang }, { from, to });
        return;
      }
      const kids = depth > 2 ? 3 : 2 + (random() < 0.45 ? 1 : 0);
      for (let i = 0; i < kids; i++) {
        const next = dir.clone().add(v(r(-0.75, 0.75), r(-0.15, 0.35) - (3 - depth) * 0.14, r(-0.75, 0.75))).normalize();
        grow(to, next, length * r(0.62, 0.8), radius * 0.62, depth - 1);
      }
      if (depth < 3) twigs.push({ from, to });
    };
    const base = v(0, soilY, 0);
    const crownAt = a.trunk === 'standard' ? tall * 0.68 : tall * r(0.4, 0.5);
    const lean = v(r(-0.04, 0.04), 0, r(-0.04, 0.04));
    const crownBase = base.clone().add(v(lean.x, crownAt - soilY, lean.z));
    const wood = s.material(bark, { roughness: 0.9 });
    if (a.trunk === 'braided') {
      for (let k = 0; k < 3; k++) {
        const points: [number, number, number][] = [];
        for (let i = 0; i <= 14; i++) {
          const t = i / 14, angle = t * 9 + (k * Math.PI * 2) / 3, rad = 0.02 + (t < 0.1 ? (0.1 - t) * 0.25 : 0);
          points.push([Math.cos(angle) * rad + lean.x * t, soilY + t * (crownAt - soilY), Math.sin(angle) * rad + lean.z * t]);
        }
        s.tube(points, 0.016, wood);
      }
    } else {
      const mid = base.clone().lerp(crownBase, 0.5).add(v(r(-0.03, 0.03), 0, r(-0.03, 0.03)));
      s.tube([base.toArray(), mid.toArray(), crownBase.toArray()] as [number, number, number][], a.trunk === 'standard' ? 0.014 : 0.02, wood);
      if (a.trunk === 'standard') {
        const cane = s.material('#c9aa5c', { roughness: 0.7 });
        s.rod([0.03, soilY - 0.05, 0.02], [0.03 + lean.x, crownAt + 0.12, 0.02 + lean.z], 0.008, cane);
        for (const t of [0.3, 0.62, 0.9]) s.ring(0.028, 0.004, [0.015 + lean.x * t, soilY + (crownAt - soilY) * t, 0.01 + lean.z * t], s.material('#3e7a4a')).rotation.x = Math.PI / 2;
      }
    }
    const crownHeight = tall - crownAt;
    const limbs = a.trunk === 'standard' ? 5 : 4;
    for (let i = 0; i < limbs; i++) {
      const angle = (i / limbs) * Math.PI * 2 + r(-0.4, 0.4);
      const spread = a.trunk === 'standard' ? r(0.5, 0.9) : r(0.25, 0.6);
      grow(crownBase.clone(), v(Math.cos(angle) * spread, 1, Math.sin(angle) * spread).normalize(), crownHeight * (a.trunk === 'standard' ? 0.36 : 0.46), 0.013, 3);
    }

    // New growth, where the answer puts it.
    const sprouts: V3[] = [];
    const sprout = (from: V3, dir: V3, length: number) => {
      const to = from.clone().addScaledVector(dir.normalize(), length);
      sticks.push({ from, to, radius: 0.005, green: true });
      for (let i = 0; i < 6; i++) sprouts.push(from.clone().lerp(to, 0.3 + i * 0.14).add(v(r(-0.025, 0.025), r(-0.01, 0.02), r(-0.025, 0.025))));
    };
    if (a.shoot === 'base' || a.shoot === 'several') sprout(base.clone().add(v(0.02, 0.02, 0.03)), v(r(0.3, 0.6), 1, r(0.3, 0.7)), 0.3);
    if (a.shoot === 'tip' || a.shoot === 'several') {
      const highest = twigs.reduce((best, twig) => (twig.from.y > best.from.y ? twig : best), twigs[0]);
      sprout(highest.from.clone(), v(r(-0.2, 0.2), 1, r(-0.2, 0.2)), 0.2);
    }
    if (a.shoot === 'several') for (let i = 0; i < 4; i++) { const twig = twigs[Math.floor(random() * twigs.length)]; sprout(twig.from.clone().lerp(twig.to, 0.5), v(r(-0.6, 0.6), 1, r(-0.6, 0.6)), 0.14); }

    const stick = new THREE.CylinderGeometry(0.62, 1, 1, 5);
    stick.translate(0, 0.5, 0);
    const forest = new THREE.InstancedMesh(stick, new THREE.MeshStandardMaterial({ roughness: 0.9 }), sticks.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    sticks.forEach((part, index) => {
      const span = part.to.clone().sub(part.from);
      q.setFromUnitVectors(up, span.clone().normalize());
      m.compose(part.from, q, v(part.radius, span.length(), part.radius));
      forest.setMatrixAt(index, m);
      forest.setColorAt(index, part.green ? new THREE.Color('#6fae3e') : bark);
    });
    forest.castShadow = forest.receiveShadow = true;
    s.root.add(forest);

    // Leaves: what still hangs, what has fallen, and the green that is new.
    const leafShape = new THREE.SphereGeometry(1, 6, 4);
    const palette = (dead: number) => {
      const roll = random();
      if (roll < dead * 0.75) return new THREE.Color('#8a6535').lerp(new THREE.Color('#5e4526'), random());
      if (roll < dead * 0.75 + 0.3) return new THREE.Color('#c7ad45').lerp(new THREE.Color('#a8913a'), random());
      return new THREE.Color('#3f6e3a').lerp(new THREE.Color('#5d8443'), random());
    };
    const hanging = Math.round(mix(520, 0, Math.pow(a.gone, 0.6)) * mix(0.75, 1.2, a.height)) + (a.gone > 0.97 ? 0 : 5);
    const dropped = a.fallen === 'swept' ? 2 + Math.floor(random() * 3) : Math.round(mix(40, 260, a.gone) * mix(0.7, 1.2, mood.density));
    const fresh = sprouts.length;
    const leaves = new THREE.InstancedMesh(leafShape, new THREE.MeshStandardMaterial({ roughness: 0.6 }), hanging + dropped + fresh);
    const e = new THREE.Euler();
    let n = 0;
    for (let i = 0; i < hanging; i++) {
      const twig = twigs[Math.floor(random() * twigs.length)];
      const at = twig.from.clone().lerp(twig.to, random()).add(v(r(-0.03, 0.03), -r(0, 0.04), r(-0.03, 0.03)));
      const size = r(0.8, 1.25);
      q.setFromEuler(e.set(r(-0.5, 0.5) + 1.2, r(0, 6.28), r(-0.4, 0.4)));
      m.compose(at, q, v(0.017 * size, 0.004, 0.036 * size));
      leaves.setMatrixAt(n, m);
      leaves.setColorAt(n++, palette(a.gone));
    }
    const side = r(0, Math.PI * 2);
    for (let i = 0; i < dropped; i++) {
      let angle = r(0, Math.PI * 2), reach = 0.2 + Math.pow(random(), 0.7) * 0.55 * mix(0.8, 1.15, a.height);
      if (a.fallen === 'drift') { angle = side + r(-0.7, 0.7) * r(0.2, 1); reach = 0.3 + random() * 0.55; }
      const curl = r(0.7, 1.2);
      q.setFromEuler(e.set(r(-0.25, 0.25), r(0, 6.28), r(-0.25, 0.25)));
      m.compose(v(Math.cos(angle) * reach, 0.006 + random() * (a.fallen === 'drift' ? 0.03 : 0.008), Math.sin(angle) * reach), q, v(0.017 * curl, 0.005, 0.036 * curl));
      leaves.setMatrixAt(n, m);
      leaves.setColorAt(n++, palette(Math.max(0.7, a.gone)));
    }
    for (const at of sprouts) {
      q.setFromEuler(e.set(r(-0.6, 0.6), r(0, 6.28), r(-0.6, 0.6)));
      m.compose(at, q, v(0.02, 0.004, 0.04));
      leaves.setMatrixAt(n, m);
      leaves.setColorAt(n++, new THREE.Color('#7fd13f'));
    }
    leaves.castShadow = leaves.receiveShadow = true;
    s.root.add(leaves);

    // Leftover decorations.
    const perch = () => { const twig = twigs[Math.floor(random() * twigs.length)]; return twig.from.clone().lerp(twig.to, random()); };
    const bulbs: THREE.MeshStandardMaterial[] = [];
    if (a.dressing === 'lights') {
      const glow = mix(0.2, 1.6, mood.cheer);
      const wire = s.material('#2c3a2c');
      let last: V3 | null = null;
      const tints = ['#ffd27a', '#ff6a5a', '#6ad0ff', '#8cf07a'];
      const lamps = tints.map((tint) => { const material = new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: glow }); bulbs.push(material); return material; });
      const ordered = Array.from({ length: 26 }, perch).sort((p1, p2) => Math.atan2(p1.z, p1.x) + p1.y * 3 - Math.atan2(p2.z, p2.x) - p2.y * 3);
      ordered.forEach((at, index) => {
        s.ball([0.014, 0.02, 0.014], at.toArray() as [number, number, number], lamps[index % 4], 8);
        if (last) s.rod(last.toArray() as [number, number, number], at.toArray() as [number, number, number], 0.0025, wire);
        last = at;
      });
    } else if (a.dressing === 'tag') {
      const at = perch();
      s.rod(at.toArray() as [number, number, number], [at.x, at.y - 0.1, at.z], 0.002, s.material('#c8273a'));
      s.box([0.06, 0.1, 0.003], [at.x, at.y - 0.15, at.z], s.material('#f4f1e6')).rotation.y = r(0, 3);
      s.box([0.05, 0.07, 0.003], [at.x + 0.03, at.y - 0.13, at.z + 0.012], s.material('#e9b9c2')).rotation.set(0, r(0, 3), 0.3);
    } else if (a.dressing === 'baubles') {
      for (const tint of ['#c8273a', '#d9a521', '#2f6fb7']) {
        const at = perch();
        s.rod(at.toArray() as [number, number, number], [at.x, at.y - 0.06, at.z], 0.0015, s.material('#d9dde0'));
        s.ball([0.035, 0.035, 0.035], [at.x, at.y - 0.095, at.z], s.material(tint, { metalness: 0.7, roughness: 0.2 }), 14);
      }
      const tinsel = s.material('#cfd4d8', { metalness: 0.8, roughness: 0.3, flatShading: true });
      const path = Array.from({ length: 6 }, perch).sort((p1, p2) => Math.atan2(p1.z, p1.x) - Math.atan2(p2.z, p2.x)).map((p) => p.toArray() as [number, number, number]);
      s.tube(path, 0.012, tinsel);
    }

    // One loose leaf keeps falling while there are still leaves to lose.
    const faller = hanging > 12 ? s.ball([0.017, 0.004, 0.036], [0, tall * 0.7, 0], s.material('#c7ad45'), 6) : null;
    const start = perch();
    const pace = mix(0.05, 0.45, mood.energy);
    return s.finish({
      footprint: 0.55,
      update: faller || bulbs.length ? (_dt, time) => {
        if (faller) {
          const t = (time * pace) % 1.6;
          const drop = Math.min(1, t);
          faller.position.set(start.x + Math.sin(drop * 9) * 0.07, mix(start.y, 0.008, drop * drop), start.z + 0.12 + Math.cos(drop * 7) * 0.05);
          faller.rotation.set(drop < 1 ? Math.sin(drop * 14) * 0.9 : 0, drop * 5, 0);
        }
        bulbs.forEach((bulb, index) => { bulb.emissiveIntensity = mix(0.2, 1.6, mood.cheer) * (0.75 + 0.25 * Math.sin(time * 2 + index * 1.7)); });
      } : undefined,
    });
  },
});
