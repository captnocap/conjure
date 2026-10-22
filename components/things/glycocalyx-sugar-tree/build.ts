import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, score } from '@conjure/kit';
import { PALETTES, STYLES, bilayer, instances, paint, tone } from './membrane';

type Sugar = 'glcnac' | 'man' | 'gal' | 'sia' | 'fuc' | 'galnac' | 'glca';
const SUGARS: readonly Sugar[] = ['glcnac', 'man', 'gal', 'sia', 'fuc', 'galnac', 'glca'];
/** The glycobiologists' symbol code: colour and shape per sugar. */
const CODE: Record<Sugar, { color: string; shape: 'cube' | 'ball' | 'diamond' | 'cone' }> = {
  glcnac: { color: '#1f6fc2', shape: 'cube' },
  man: { color: '#14a654', shape: 'ball' },
  gal: { color: '#f2cc12', shape: 'ball' },
  sia: { color: '#a3439b', shape: 'diamond' },
  fuc: { color: '#e5262c', shape: 'cone' },
  galnac: { color: '#f2cc12', shape: 'cube' },
  glca: { color: '#4f8fd6', shape: 'diamond' },
};

interface Residue { at: THREE.Vector3; sugar: Sugar; parent: number }

export default defineThing({
  questions: {
    form: choice('What shape do the sugar trees grow in?', {
      antlers: 'Antlers: a short stalk forking into two to four symmetrical branches, each tipped with a cap.',
      coral: 'Coral: dense bushy clumps forking again and again in every direction.',
      bottlebrush: 'Bottlebrush: tall thin stems bristling with short side-chains all the way up, like mucus proteins.',
      whips: 'Whips: long unbranched chains of beads curling up and over like seaweed.',
    }),
    symbols: choice('How are the sugars drawn?', {
      code: 'The glycobiologists\' code: blue cubes, green and yellow balls, purple diamonds, red triangles.',
      rings: 'Hexagonal sugar rings, flat and chemical, linked like a chain of tiles.',
      pearls: 'Soft frosted pearls in one gentle colour, a fuzzy halo.',
    }),
    tips: choice('What caps the branch tips?', {
      sialic: 'Purple sialic acid diamonds: the charged, slippery cap most cells wear.',
      galactose: 'Bare yellow galactose: trimmed caps, an old or flagged cell.',
      fucose: 'Little red fucose flags, like a blood-group mark.',
      mixed: 'A jumble of caps, every branch different.',
    }),
    story: choice('What is happening in the forest?', {
      swaying: 'Nothing but the current: the stalks sway gently in the water.',
      grabbed: 'A spiky virus has landed in the canopy and is clutching the tips.',
      trimmed: 'A hungry enzyme is snipping branches; severed sugar fragments litter the membrane.',
      bacterium: 'A rod-shaped bacterium has blundered in and lies tangled on top.',
    }),
    height: score('How tall does the forest grow?', ['A short fuzz', 'Knee-high to a protein', 'A towering canopy']),
    style: choice('How is it drawn?', STYLES),
  },

  build(a, context) {
    const { mood, random } = context;
    const palette = PALETTES[a.style];
    const root = new THREE.Group();
    const R = 0.011, T = 0.09;
    const W = 0.5, D = 0.42;
    const r = 0.0125 * mix(0.9, 1.15, a.height);
    const bond = r * 2.4;
    const reach = mix(0.6, 1.5, a.height);

    // Where the trees stand.
    const count = Math.round(mix(6, 13, mood.density));
    const spots: { x: number; z: number; glycolipid: boolean }[] = [];
    for (let tries = 0; spots.length < count && tries < 400; tries++) {
      const x = (random() - 0.5) * (W - 0.1), z = (random() - 0.5) * (D - 0.1);
      if (spots.some((spot) => Math.hypot(spot.x - x, spot.z - z) < 0.075)) continue;
      spots.push({ x, z, glycolipid: spots.length > 2 && random() < 0.3 });
    }
    const patch = bilayer(context, palette, {
      width: W, depth: D, head: R, thickness: T,
      hole: (x, z) => spots.some((spot) => !spot.glycolipid && Math.hypot(spot.x - x, spot.z - z) < 0.024),
      mix: 0.3,
    });
    root.add(patch.group);

    const tipSugar = (): Sugar => (a.tips === 'mixed' ? (['sia', 'gal', 'fuc', 'glcnac'] as Sugar[])[Math.floor(random() * 4)] : { sialic: 'sia', galactose: 'gal', fucose: 'fuc' }[a.tips] as Sugar);
    const up = new THREE.Vector3(0, 1, 0);
    const bend = (dir: THREE.Vector3, amount: number) => dir.clone().add(new THREE.Vector3((random() - 0.5) * amount, (random() - 0.3) * amount * 0.5, (random() - 0.5) * amount)).normalize();

    // Grow one tree's residues from a starting point.
    const grow = (start: THREE.Vector3, glycolipid: boolean): Residue[] => {
      const list: Residue[] = [];
      const add = (at: THREE.Vector3, sugar: Sugar, parent: number) => list.push({ at, sugar, parent }) - 1;
      const chain = (from: number, dir: THREE.Vector3, sugars: Sugar[], wobble = 0.3) => {
        let at = from, d = dir.clone();
        for (const sugar of sugars) {
          d = bend(d.lerp(up, 0.15), wobble);
          at = add(list[at].at.clone().addScaledVector(d, bond), sugar, at);
        }
        return { at, d };
      };
      const first = add(start.clone(), 'glcnac', -1);
      if (glycolipid) {
        chain(first, up, (['gal', 'gal', tipSugar()] as Sugar[]).slice(0, 2 + Math.round(random() * reach)), 0.4);
        return list;
      }
      if (a.form === 'antlers') {
        const core = chain(first, up, ['glcnac', 'man'], 0.1);
        if (a.tips === 'fucose' || random() < 0.3) add(list[first].at.clone().add(new THREE.Vector3(bond * 0.9, bond * 0.2, 0)), 'fuc', first);
        const arms = 2 + Math.floor(random() * 2.4);
        const spin = random() * Math.PI;
        for (let k = 0; k < arms; k++) {
          const angle = spin + (k / arms) * Math.PI * 2;
          const out = new THREE.Vector3(Math.cos(angle), 0.9, Math.sin(angle)).normalize();
          const man = chain(core.at, out, ['man'], 0.05);
          const forks = random() < 0.5 * reach ? 2 : 1;
          for (let f = 0; f < forks; f++) {
            const dir = out.clone().applyAxisAngle(up, (f - (forks - 1) / 2) * 0.9).lerp(up, 0.35).normalize();
            const length = Math.round(mix(1, 4, a.height * (0.5 + random() * 0.5) + 0.2));
            const middle: Sugar[] = Array.from({ length }, (_unused, i) => (i % 2 ? 'gal' : 'glcnac'));
            chain(man.at, dir, ['glcnac', ...middle, tipSugar()], 0.15);
          }
        }
      } else if (a.form === 'coral') {
        const branch = (from: number, dir: THREE.Vector3, depth: number) => {
          const length = 1 + Math.floor(random() * 2);
          const pool: Sugar[] = ['glcnac', 'gal', 'man', 'galnac'];
          const end = chain(from, dir, Array.from({ length }, () => pool[Math.floor(random() * pool.length)]), 0.5);
          if (depth <= 0) { chain(end.at, end.d, [tipSugar()], 0.3); return; }
          const forks = 2 + (random() < 0.35 ? 1 : 0);
          for (let f = 0; f < forks; f++) branch(end.at, bend(end.d.clone().applyAxisAngle(up, f * 2.1 + random()).add(new THREE.Vector3(0, 0, 0)), 1.1), depth - 1);
        };
        const trunk = chain(first, up, ['glcnac', 'man'], 0.2);
        branch(trunk.at, up, Math.round(mix(2, 4, a.height)) - (random() < 0.3 ? 1 : 0));
      } else if (a.form === 'bottlebrush') {
        // A tall protein stem: side chains hang off invisible backbone points.
        const tall = mix(0.14, 0.38, a.height) * mix(0.75, 1.1, random());
        const steps = Math.round(tall / (bond * 0.85));
        let prev = first;
        const lean = new THREE.Vector3((random() - 0.5) * 0.4, 1, (random() - 0.5) * 0.4).normalize();
        for (let i = 1; i <= steps; i++) {
          const at = start.clone().addScaledVector(lean, i * bond * 0.85);
          at.x += Math.sin(i * 0.5) * 0.006;
          prev = add(at, 'galnac', prev);
          if (i < 2) continue;
          const angle = i * 2.4 + random() * 0.4;
          const out = new THREE.Vector3(Math.cos(angle), 0.35, Math.sin(angle)).normalize();
          const side = Math.max(1, Math.round(mix(1, 3, 1 - i / steps) * mix(0.6, 1.1, random())));
          chain(prev, out, [...Array.from({ length: side }, (_unused, k) => (k % 2 ? 'glcnac' : 'gal') as Sugar), tipSugar()], 0.25);
        }
      } else {
        const strands = 2 + Math.floor(random() * 2.5);
        const core = chain(first, up, ['glcnac'], 0.1);
        for (let k = 0; k < strands; k++) {
          const angle = random() * Math.PI * 2;
          let dir = new THREE.Vector3(Math.cos(angle) * 0.4, 1, Math.sin(angle) * 0.4).normalize();
          let at = core.at;
          const length = Math.round(mix(7, 18, a.height) * mix(0.7, 1.1, random()));
          const curl = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(mix(0.05, 0.14, random()));
          for (let i = 0; i < length; i++) {
            dir = dir.clone().add(curl.clone().multiplyScalar(i / length)).normalize();
            if (dir.y < -0.2) dir.y = -0.2;
            at = add(list[at].at.clone().addScaledVector(dir, bond), i === length - 1 ? tipSugar() : i % 2 ? 'glca' : 'glcnac', at);
          }
        }
      }
      return list;
    };

    // Shapes and materials for each sugar.
    const shapeOf = (sugar: Sugar): THREE.BufferGeometry => {
      if (a.symbols === 'pearls') return new THREE.SphereGeometry(r * 1.05, 12, 9);
      if (a.symbols === 'rings') return new THREE.CylinderGeometry(r * 1.2, r * 1.2, r * 0.7, 6);
      const shape = CODE[sugar].shape;
      return shape === 'cube' ? new THREE.BoxGeometry(r * 1.7, r * 1.7, r * 1.7)
        : shape === 'diamond' ? new THREE.OctahedronGeometry(r * 1.3)
        : shape === 'cone' ? new THREE.ConeGeometry(r * 1.1, r * 2, 3)
        : new THREE.SphereGeometry(r, 12, 9);
    };
    const colourOf = (sugar: Sugar, height: number) => {
      if (a.symbols === 'pearls') {
        const c = new THREE.Color(palette.protein[a.style === 'glossy' ? 2 : 1]).lerp(new THREE.Color('#ffffff'), height * 0.9);
        return tone(c, context);
      }
      const c = new THREE.Color(CODE[sugar].color);
      if (a.style === 'pastel') c.lerp(new THREE.Color('#ffffff'), 0.3);
      if (a.style === 'micrograph') { const l = c.getHSL({ h: 0, s: 0, l: 0 }).l; c.setHSL(0.1, 0.04, mix(0.35, 0.8, l)); }
      return tone(c, context);
    };
    const geometries = new Map<Sugar, THREE.BufferGeometry>();
    const sugarMaterial = paint('#ffffff', context, a.style);
    const bondMaterial = paint(a.style === 'micrograph' ? '#77776f' : '#c9c2b3', context, a.style);
    const stalkMaterial = paint(palette.protein[a.style === 'micrograph' ? 2 : 0], context, a.style);
    const bondGeometry = new THREE.CylinderGeometry(1, 1, 1, 5);

    const trees: { group: THREE.Group; phase: number; amount: number }[] = [];
    const tipsAll: THREE.Vector3[] = [];
    for (const spot of spots) {
      const group = new THREE.Group();
      group.position.set(spot.x, T - R * 0.3, spot.z);
      root.add(group);
      // The glycoprotein stalk standing in the membrane.
      let start = new THREE.Vector3(0, R * 0.8, 0);
      if (!spot.glycolipid) {
        const stalkHeight = mix(0.03, 0.07, random()) * mix(0.8, 1.3, a.height);
        const stalk = new THREE.Mesh(new THREE.CapsuleGeometry(0.017, stalkHeight + T * 0.6, 4, 10), stalkMaterial);
        stalk.position.y = (stalkHeight - T * 0.6) / 2;
        stalk.castShadow = stalk.receiveShadow = true;
        group.add(stalk);
        start = new THREE.Vector3(0, stalkHeight + 0.02, 0);
      }
      const list = grow(start, spot.glycolipid);
      const groups = new Map<Sugar, { matrix: THREE.Matrix4; color: THREE.Color }[]>();
      const bonds: { matrix: THREE.Matrix4 }[] = [];
      const top = Math.max(...list.map((item) => item.at.y), 0.05);
      list.forEach((item, index) => {
        if (!geometries.has(item.sugar)) geometries.set(item.sugar, shapeOf(item.sugar));
        const spin = new THREE.Quaternion().setFromEuler(new THREE.Euler(random() * 0.6, random() * 6, random() * 0.6));
        const entry = groups.get(item.sugar) ?? [];
        entry.push({ matrix: new THREE.Matrix4().compose(item.at, spin, new THREE.Vector3(1, 1, 1)), color: colourOf(item.sugar, item.at.y / top * 0.4) });
        groups.set(item.sugar, entry);
        if (item.parent >= 0) {
          const from = list[item.parent].at, d = item.at.clone().sub(from);
          bonds.push({ matrix: new THREE.Matrix4().compose(from.clone().add(item.at).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize()), new THREE.Vector3(r * 0.28, d.length(), r * 0.28)) });
        }
        const isTip = !list.some((other) => other.parent === index);
        if (isTip) tipsAll.push(item.at.clone().add(group.position));
      });
      for (const [sugar, entry] of groups) group.add(instances(geometries.get(sugar)!, sugarMaterial, entry));
      group.add(instances(bondGeometry, bondMaterial, bonds));
      trees.push({ group, phase: random() * 6, amount: mix(0.6, 1.4, random()) });
    }

    // The story.
    const highest = tipsAll.reduce((best, p) => (p.y > best.y ? p : best), new THREE.Vector3(0, 0.15, 0));
    const canopy = tipsAll.reduce((sum, p) => sum + p.y, 0) / Math.max(tipsAll.length, 1);
    let visitor: THREE.Object3D | null = null;
    if (a.story === 'grabbed') {
      const virus = new THREE.Group();
      const radius = 0.05;
      const coat = paint(a.style === 'micrograph' ? '#4d4d4a' : '#d35840', context, a.style);
      const knob = paint(a.style === 'micrograph' ? '#2e2e2c' : '#f2b13a', context, a.style);
      virus.add(new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 2), coat));
      for (let k = 0; k < 26; k++) {
        const dir = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
        const spike = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.02, 5), coat);
        spike.position.copy(dir).multiplyScalar(radius + 0.009);
        spike.quaternion.setFromUnitVectors(up, dir);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 8, 6), knob);
        ball.position.copy(dir).multiplyScalar(radius + 0.021);
        virus.add(spike, ball);
      }
      virus.traverse((node) => { node.castShadow = true; });
      virus.position.set(highest.x * 0.6, Math.max(canopy, highest.y * 0.8) + radius * 0.6, highest.z * 0.6);
      root.add(virus);
      visitor = virus;
    } else if (a.story === 'bacterium') {
      const bug = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.2, 6, 16), paint(a.style === 'micrograph' ? '#5d5d58' : '#7aa83e', context, a.style));
      body.rotation.z = Math.PI / 2;
      bug.add(body);
      const hairMaterial = paint(a.style === 'micrograph' ? '#3c3c39' : '#4f7a24', context, a.style);
      for (let k = 0; k < 14; k++) {
        const x = (random() - 0.5) * 0.24, angle = random() * Math.PI * 2;
        const from = new THREE.Vector3(x, Math.cos(angle) * 0.044, Math.sin(angle) * 0.044);
        const to = from.clone().add(new THREE.Vector3((random() - 0.5) * 0.04, Math.cos(angle) * 0.04, Math.sin(angle) * 0.04));
        const hair = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(from, to), 1, 0.0018, 4), hairMaterial);
        bug.add(hair);
      }
      const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.14, 0, 0), new THREE.Vector3(0.19, 0.02, 0.02), new THREE.Vector3(0.24, -0.01, -0.01), new THREE.Vector3(0.29, 0.02, 0.02)]), 20, 0.003, 4), hairMaterial);
      bug.add(tail);
      bug.traverse((node) => { node.castShadow = true; });
      bug.position.set(0, canopy + 0.03, 0);
      bug.rotation.y = random() * Math.PI;
      bug.rotation.x = 0.15;
      root.add(bug);
      visitor = bug;
    } else if (a.story === 'trimmed') {
      // The enzyme: a biting blob with a wedge for a mouth, and fallen fragments.
      const enzyme = new THREE.Mesh(new THREE.SphereGeometry(0.04, 20, 14, 0.5, Math.PI * 2 - 1), paint(palette.protein[2], context, a.style, { side: THREE.DoubleSide }));
      enzyme.position.set(highest.x, highest.y * 0.75, highest.z + 0.03);
      enzyme.rotation.set(0, -0.6, 0.2);
      enzyme.castShadow = true;
      root.add(enzyme);
      visitor = enzyme;
      const pieces = 3 + Math.round(mood.density * 3);
      for (let k = 0; k < pieces; k++) {
        const x = (random() - 0.5) * (W - 0.08), z = (random() - 0.5) * (D - 0.08);
        const n = 2 + Math.floor(random() * 2);
        for (let i = 0; i < n; i++) {
          const sugar = SUGARS[Math.floor(random() * 4)];
          const bead = new THREE.Mesh(shapeOf(sugar), new THREE.MeshStandardMaterial({ color: colourOf(sugar, 0.2), roughness: 0.6 }));
          bead.position.set(x + i * bond * 0.9 * Math.cos(k), T + r * 0.9, z + i * bond * 0.9 * Math.sin(k));
          bead.castShadow = true;
          root.add(bead);
        }
      }
    }

    const rest = visitor?.position.y ?? 0;
    const speed = mix(0.3, 1.8, mood.energy);
    const sway = mix(0.03, 0.09, mood.energy);
    const update = (_dt: number, time: number) => {
      for (const tree of trees) {
        tree.group.rotation.x = Math.sin(time * speed + tree.phase) * sway * tree.amount;
        tree.group.rotation.z = Math.cos(time * speed * 0.8 + tree.phase * 1.3) * sway * tree.amount;
      }
      if (visitor && a.story !== 'trimmed') visitor.position.y = rest + Math.sin(time * speed) * 0.004;
      if (visitor && a.story === 'trimmed') visitor.rotation.z = 0.2 + Math.sin(time * speed * 3) * 0.15;
    };
    return { object: root, update, dispose: () => disposeTree(root) };
  },
});
