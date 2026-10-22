import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    paint: choice('How is the swan painted?', {
      white: 'White with a red beak, the way it is always done.',
      black: 'Left black as a black swan, only the beak and eye painted.',
      pink: 'Pink, somebody wanted a flamingo.',
      blue: 'Sky blue, the colour left over from the fence.',
      gold: 'Gold radiator paint, a little grand.',
      spotted: 'White with red polka dots, like a toadstool.',
    }),
    neck: choice('How does it hold its neck?', {
      proud: 'A high S-curve, head up.',
      bowed: 'Arched forward with the beak tucked down to its breast.',
      sagging: 'The rubber has gone soft and the neck droops sideways.',
    }),
    planting: choice('What grows in the bed?', {
      marigolds: 'Orange and yellow marigolds, dense and bright.',
      petunias: 'Pink, purple and white petunias.',
      bare: 'Bare dug earth, raked and waiting.',
      weeds: 'Weeds and long grass, the gardener is gone.',
      snow: 'Nothing: it is under snow, with dry stalks poking through.',
    }),
    border: choice('What rings the flowerbed?', {
      tyres: 'Half-buried tyres painted in alternating colours.',
      bricks: 'Whitewashed bricks set on their corners like teeth.',
      bottles: 'Plastic bottles pushed in neck down, green and brown.',
      none: 'No border, just the edge of the soil.',
    }),
    company: choice('What keeps it company?', {
      alone: 'Nothing, one swan.',
      mate: 'A second swan facing it.',
      toadstools: 'Fly-agaric mushrooms made from enamel basins on stumps.',
      ladybirds: 'Stones painted as ladybirds.',
      palm: 'A palm tree made of brown and green plastic bottles.',
    }),
    basket: noul('Is the swan\'s hollow back itself planted with flowers?'),
    tended: choice('What sign is there of the person who looks after it?', {
      nothing: 'None.',
      can: 'A dented watering can left at the edge.',
      trowel: 'A trowel stuck upright in the soil and a pair of gloves.',
      fence: 'A tiny knee-high picket fence, freshly painted.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const snowy = a.planting === 'snow';
    const faded = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#8e877b'), mood.wear * 0.35 + (1 - mood.cheer) * 0.1);
    const rubber = s.material('#1c1c1e', { roughness: 0.95 });
    const snowMat = new THREE.MeshStandardMaterial({ color: '#f0f3f6', roughness: 0.95 });
    const BED = 0.9;

    const bloomColours = a.planting === 'petunias' ? ['#d94f9a', '#7a3fb0', '#f2eef2', '#c22f6a'] : ['#e8922a', '#e3c22c', '#d9601f'];
    const flowers = (sc: Sculpture, cx: number, cz: number, radius: number, count: number, y: number) => {
      const blooms: { at: P3; size: number; color: string }[] = [], leaves: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < count; i++) {
        const t = random() * 6.283, d = Math.sqrt(random()) * radius, h = 0.1 + random() * 0.14;
        const x = cx + Math.cos(t) * d, z = cz + Math.sin(t) * d;
        leaves.push({ at: [x, y + h * 0.4, z], size: 0.035 + random() * 0.02, color: random() < 0.5 ? '#3f7a3a' : '#57903f' });
        blooms.push({ at: [x + (random() - 0.5) * 0.03, y + h * 0.8, z], size: 0.028 + random() * 0.018, color: bloomColours[Math.floor(random() * bloomColours.length)] });
      }
      sc.scatter(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshStandardMaterial({ roughness: 1 }), leaves);
      const bloom = new THREE.SphereGeometry(1, 7, 5); bloom.scale(1, 0.6, 1);
      sc.scatter(bloom, new THREE.MeshStandardMaterial({ roughness: 0.8 }), blooms);
    };

    const swan = (x: number, z: number, turn: number, size: number, neckKind: typeof a.neck) => {
      const g = new Sculpture(context);
      g.root.position.set(x, 0.03, z); g.root.rotation.y = turn; g.root.scale.setScalar(size);
      s.root.add(g.root);
      const bodyColour = faded({ white: '#f1efe8', black: '#1f1f22', pink: '#e58fa8', blue: '#7fb2d9', gold: '#c9a23a', spotted: '#f1efe8' }[a.paint]);
      const body = g.material(bodyColour, { roughness: a.paint === 'gold' ? 0.4 : 0.7, metalness: a.paint === 'gold' ? 0.6 : 0, side: THREE.DoubleSide });
      // Body: the tyre's own curve, a hollow boat.
      const hull = g.lathe([[0.02, 0], [0.16, 0.01], [0.26, 0.07], [0.3, 0.16], [0.27, 0.24], [0.24, 0.25]], body, [0, 0, 0]);
      hull.scale.set(1.15, 1, 0.72);
      g.cylinder(0.26, 0.26, 0.02, [0, 0.19, 0], new THREE.MeshStandardMaterial({ color: snowy ? '#eef1f4' : '#3d2f22', roughness: 1 }), 16).scale.set(1.15, 1, 0.72);
      if (a.basket && !snowy) flowers(g, -0.02, 0, 0.17, 10 + Math.floor(mood.density * 8), 0.19);
      if (snowy) g.ball([0.27, 0.07, 0.18], [0, 0.22, 0], snowMat, 12);
      // Neck: one strip of tread bent up and over.
      const lean = neckKind === 'sagging' ? (random() < 0.5 ? -1 : 1) : 0;
      const neck: P3[] = neckKind === 'proud'
        ? [[0.3, 0.16, 0], [0.47, 0.3, 0], [0.42, 0.52, 0], [0.33, 0.72, 0], [0.4, 0.88, 0], [0.52, 0.86, 0]]
        : neckKind === 'bowed'
          ? [[0.3, 0.16, 0], [0.46, 0.34, 0], [0.5, 0.58, 0], [0.62, 0.72, 0], [0.75, 0.62, 0], [0.72, 0.46, 0]]
          : [[0.3, 0.16, 0], [0.46, 0.3, lean * 0.03], [0.5, 0.5, lean * 0.1], [0.58, 0.6, lean * 0.22], [0.68, 0.56, lean * 0.34], [0.74, 0.44, lean * 0.4]];
      g.tube(neck, 0.05, body);
      const end = new THREE.Vector3(...neck[neck.length - 1]), before = new THREE.Vector3(...neck[neck.length - 2]);
      const dir = end.clone().sub(before).normalize();
      const head = g.ball([0.1, 0.07, 0.065], end.clone().addScaledVector(dir, 0.03).toArray() as P3, body, 14);
      head.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
      const beak = g.mesh(new THREE.ConeGeometry(0.042, 0.15, 8), g.material(faded('#d6261c'), { roughness: 0.5 }), end.clone().addScaledVector(dir, 0.17).toArray() as P3);
      beak.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      const up = new THREE.Vector3(0, 1, 0).cross(dir).cross(dir).multiplyScalar(-1).normalize();
      for (const side of [-1, 1]) g.ball([0.014, 0.014, 0.014], end.clone().addScaledVector(dir, 0.05).addScaledVector(up, 0.025).add(new THREE.Vector3(0, 0, side * 0.045)).toArray() as P3, rubber, 6);
      g.ball([0.03, 0.025, 0.03], end.clone().addScaledVector(dir, 0.085).addScaledVector(up, 0.03).toArray() as P3, rubber, 8);
      // Wings: sidewall cut into scalloped feathers and bent out and up; a short fan of a tail.
      const wingShape = new THREE.Shape([[0.2, 0], [0.06, 0.15], [-0.2, 0.25], [-0.54, 0.31], [-0.41, 0.17], [-0.37, 0.21], [-0.27, 0.09], [-0.23, 0.13], [-0.13, 0.02], [-0.09, 0.06], [0, -0.03]].map(([x, y]) => new THREE.Vector2(x, y)));
      for (const side of [-1, 1]) {
        const wing = g.mesh(new THREE.ExtrudeGeometry(wingShape, { depth: 0.02, bevelEnabled: false }), body, [0.1, 0.2, side * 0.21 - 0.01]);
        wing.rotation.x = side * mix(0.55, 0.9, mood.wear * random());
        wing.rotation.y = side * -0.18;
      }
      const tailShape = new THREE.Shape([[0, 0], [-0.2, 0.2], [-0.12, 0.08], [-0.24, 0.1], [-0.12, 0.0], [-0.22, -0.04]].map(([x, y]) => new THREE.Vector2(x, y)));
      const tail = g.mesh(new THREE.ExtrudeGeometry(tailShape, { depth: 0.16, bevelEnabled: false }), body, [-0.3, 0.2, -0.08]);
      tail.rotation.z = -0.1;
      if (a.paint === 'spotted') {
        const dots: { at: P3; size: number }[] = [];
        for (let i = 0; i < 16; i++) { const t = random() * 6.283, h = 0.06 + random() * 0.14; const r = 0.3 * Math.sin(Math.acos(1 - h / 0.16 > 1 ? 1 : Math.abs(1 - h / 0.16)) * 0.5 + 1.05); dots.push({ at: [Math.cos(t) * r * 1.15, h, Math.sin(t) * r * 0.72], size: 0.025 }); }
        g.scatter(new THREE.SphereGeometry(1, 6, 5), g.material('#d6261c'), dots);
      }
      if (snowy) g.ball([0.06, 0.03, 0.045], end.clone().add(new THREE.Vector3(0, 0.05, 0)).toArray() as P3, snowMat, 8);
    };

    // The bed.
    const soil = new THREE.MeshStandardMaterial({ color: snowy ? '#e9edf0' : new THREE.Color('#4a3828').lerp(new THREE.Color('#6b6253'), mood.wear * 0.4), roughness: 1 });
    s.cylinder(BED, BED + 0.06, 0.07, [0, 0.035, 0], soil, 36);
    s.ball([BED * 0.8, 0.09, BED * 0.8], [0, 0.05, 0], soil, 20);
    s.cylinder(BED + 0.28, BED + 0.32, 0.02, [0, 0.0, 0], new THREE.MeshStandardMaterial({ color: snowy ? '#dfe3e6' : a.planting === 'weeds' ? '#6f7650' : '#8a8676', roughness: 1 }), 36);

    if (a.border === 'tyres') {
      const n = 11, palette = ['#f1efe8', '#d6261c', '#2f62ad', '#e3c22c', '#3f8a4a'];
      const scheme = random() < 0.5 ? [palette[0], palette[1 + Math.floor(random() * 4)]] : palette;
      for (let i = 0; i < n; i++) {
        const t = i / n * Math.PI * 2;
        const tyre = s.mesh(new THREE.TorusGeometry(0.24, 0.075, 8, 14, Math.PI), mood.wear > 0.8 ? rubber : s.material(faded(scheme[i % scheme.length]), { roughness: 0.75 }), [Math.cos(t) * BED, 0, Math.sin(t) * BED]);
        tyre.rotation.y = Math.PI / 2 - t; tyre.scale.y = 0.9 + random() * 0.15;
        if (snowy) { const cap = s.ball([0.09, 0.04, 0.2], [Math.cos(t) * BED, 0.3 * tyre.scale.y, Math.sin(t) * BED], snowMat, 8); cap.rotation.y = Math.PI / 2 - t; }
      }
    } else if (a.border === 'bricks') {
      const lime = s.material(faded('#f1efe8'), { roughness: 1 });
      for (let i = 0; i < 26; i++) { const t = i / 26 * Math.PI * 2; const b = s.box([0.2, 0.2, 0.07], [Math.cos(t) * BED, 0.08, Math.sin(t) * BED], lime); b.rotation.y = -t + Math.PI / 2; b.rotation.z = Math.PI / 4; b.rotation.order = 'YXZ'; }
    } else if (a.border === 'bottles') {
      const bottles: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < 44; i++) { const t = i / 44 * Math.PI * 2; bottles.push({ at: [Math.cos(t) * BED, 0.09, Math.sin(t) * BED], size: 1, color: random() < 0.5 ? '#3f8a4a' : random() < 0.6 ? '#7a5632' : '#9fc7d9' }); }
      s.scatter(new THREE.CylinderGeometry(0.045, 0.04, 0.2, 8), new THREE.MeshStandardMaterial({ roughness: 0.2, metalness: 0.2 }), bottles);
    }

    // Planting.
    const density = mix(0.5, 1.3, mood.density);
    if (a.planting === 'marigolds' || a.planting === 'petunias') {
      const count = Math.floor(60 * density);
      const blooms: { at: P3; size: number; color: string }[] = [], leaves: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < count; i++) {
        const t = random() * 6.283, d = 0.58 + random() * (BED - 0.68), h = 0.1 + random() * 0.1;
        const x = Math.cos(t) * d, z = Math.sin(t) * d;
        leaves.push({ at: [x, 0.08 + h * 0.4, z], size: 0.045 + random() * 0.025, color: random() < 0.5 ? '#3f7a3a' : '#57903f' });
        blooms.push({ at: [x, 0.08 + h, z], size: 0.032 + random() * 0.02, color: bloomColours[Math.floor(random() * bloomColours.length)] });
      }
      s.scatter(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshStandardMaterial({ roughness: 1 }), leaves);
      const bloom = new THREE.SphereGeometry(1, 7, 5); bloom.scale(1, 0.6, 1);
      s.scatter(bloom, new THREE.MeshStandardMaterial({ roughness: 0.8 }), blooms);
    } else if (a.planting === 'weeds' || snowy) {
      const stalks: { at: P3; size: number; color: string }[] = [];
      const count = Math.floor((snowy ? 26 : 120) * density);
      for (let i = 0; i < count; i++) { const t = random() * 6.283, d = Math.sqrt(random()) * (BED + (snowy ? -0.1 : 0.35)); stalks.push({ at: [Math.cos(t) * d, 0.12, Math.sin(t) * d], size: 0.06 + random() * 0.1, color: snowy ? '#8a7650' : ['#5f7a3a', '#8a8a4a', '#6f8f4a'][Math.floor(random() * 3)] }); }
      s.scatter(new THREE.ConeGeometry(0.22, 3, 4), new THREE.MeshStandardMaterial({ roughness: 1 }), stalks);
    } else {
      // Raked furrows in bare earth.
      for (let i = 0; i < 6; i++) { const r = 0.35 + i * 0.09; const furrow = s.ring(r, 0.012, [0, 0.105 - i * 0.008, 0], new THREE.MeshStandardMaterial({ color: '#33261a', roughness: 1 })); furrow.rotation.x = Math.PI / 2; }
    }

    // Swans and company.
    const turn = -0.45 + (random() - 0.5) * 0.3;
    const mate = a.company === 'mate';
    swan(mate ? -0.36 : -0.08, mate ? 0.0 : 0, mate ? -0.3 : turn, mate ? 1.15 : 1.4, a.neck);
    if (mate) swan(0.45, 0.16, Math.PI + 0.3, 0.95, a.neck === 'proud' ? 'bowed' : 'proud');
    if (a.company === 'toadstools') {
      for (const [x, z, k] of [[0.55, 0.52, 0.9], [0.74, 0.2, 0.6], [-0.6, 0.55, 0.5]] as const) {
        s.cylinder(0.07 * k, 0.09 * k, 0.34 * k, [x, 0.1 + 0.17 * k, z], s.material('#efe8d6', { roughness: 1 }), 10);
        const cap = s.lathe([[0, 0.11], [0.12, 0.09], [0.22, 0.03], [0.24, 0], [0.2, -0.01], [0, -0.01]], s.material(faded('#c9241c'), { roughness: 0.3 }), [x, 0.1 + 0.34 * k, z]); cap.scale.setScalar(k);
        const dots: { at: P3; size: number }[] = [];
        for (let i = 0; i < 9; i++) { const t = random() * 6.283, d = 0.04 + random() * 0.15; dots.push({ at: [x + Math.cos(t) * d * k, 0.1 + 0.34 * k + (0.105 - d * d * 2.0) * k, z + Math.sin(t) * d * k], size: 0.02 * k }); }
        s.scatter(new THREE.SphereGeometry(1, 6, 5), s.material('#f4f1e8'), dots);
      }
    } else if (a.company === 'ladybirds') {
      for (let i = 0; i < 4 + Math.floor(mood.density * 3); i++) {
        const t = random() * 6.283, d = 0.6 + random() * 0.2, x = Math.cos(t) * d, z = Math.abs(Math.sin(t)) * d, k = 0.07 + random() * 0.05;
        s.ball([k * 1.2, k * 0.7, k], [x, 0.1 + k * 0.3, z], s.material(faded('#d6261c'), { roughness: 0.4 }), 12);
        s.ball([k * 0.5, k * 0.45, k * 0.7], [x + k * 1.0, 0.1 + k * 0.25, z], rubber, 8);
        const dots: { at: P3; size: number }[] = [];
        for (const [dx, dz] of [[0.2, 0.5], [0.2, -0.5], [-0.5, 0.35], [-0.5, -0.35]]) dots.push({ at: [x + dx * k, 0.1 + k * 0.82, z + dz * k], size: k * 0.2 });
        s.scatter(new THREE.SphereGeometry(1, 6, 5), rubber, dots);
      }
    } else if (a.company === 'palm') {
      const px = 0.6, pz = -0.42;
      for (let i = 0; i < 7; i++) s.cylinder(0.05, 0.07, 0.19, [px + Math.sin(i * 0.5) * 0.02, 0.2 + i * 0.17, pz], s.material(i % 2 ? '#6a4a2a' : '#7d5832', { roughness: 0.3 }), 8);
      for (let i = 0; i < 7; i++) { const t = i / 7 * Math.PI * 2 + random() * 0.3; s.tube([[px, 1.34, pz], [px + Math.cos(t) * 0.28, 1.5, pz + Math.sin(t) * 0.28], [px + Math.cos(t) * 0.6, 1.3 - random() * 0.15, pz + Math.sin(t) * 0.6]], 0.035, s.material(faded('#3f8a4a'), { roughness: 0.3 })).scale.y = 1; }
    }

    // The gardener's trace, at the near edge.
    if (a.tended === 'can') {
      const tin = s.material(faded('#4f8a6a'), { metalness: 0.5, roughness: 0.5 });
      const cx = -0.7, cz = 0.98;
      s.cylinder(0.11, 0.12, 0.24, [cx, 0.13, cz], tin, 12);
      s.rod([cx + 0.1, 0.1, cz], [cx + 0.34, 0.3, cz], 0.016, tin);
      s.cylinder(0.045, 0.02, 0.03, [cx + 0.35, 0.31, cz], tin, 8).rotation.z = -0.9;
      s.ring(0.085, 0.01, [cx - 0.1, 0.16, cz], tin, Math.PI).rotation.z = Math.PI / 2;
    } else if (a.tended === 'trowel') {
      s.rod([0.2, 0.1, 0.72], [0.23, 0.26, 0.7], 0.022, s.material('#b3432c'));
      s.box([0.07, 0.14, 0.008], [0.19, 0.07, 0.725], s.material('#b9bec0', { metalness: 0.7 }));
      for (const dx of [0, 0.13]) s.ball([0.06, 0.02, 0.1], [0.5 + dx, 0.03, 1.02 + dx * 0.4], s.material('#c9a23a', { roughness: 1 }), 8).rotation.y = dx * 4;
    } else if (a.tended === 'fence') {
      const picket = s.material(faded('#e9e6da'), { roughness: 0.8 });
      const n = 30, r = BED + 0.2;
      const posts: { at: P3; size: number }[] = [];
      for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; posts.push({ at: [Math.cos(t) * r, 0.17, Math.sin(t) * r], size: 1 }); }
      s.scatter(new THREE.CylinderGeometry(0.018, 0.028, 0.34, 5), picket, posts);
      const rail = s.ring(r, 0.012, [0, 0.2, 0], picket); rail.rotation.x = Math.PI / 2;
    }
    if (snowy) for (let i = 0; i < 4; i++) { const t = random() * 6.283; s.ball([0.3, 0.07, 0.24], [Math.cos(t) * (BED + 0.1), 0.01, Math.sin(t) * (BED + 0.1)], snowMat, 8); }
    return s.finish();
  },
});
