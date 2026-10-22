import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const SPECIES = {
  canada: { size: 1, neck: 0.3, body: '#7a6248', breast: '#cfc3ab', neckTone: '#17181a', head: '#17181a', beak: '#1c1c1c', wing: '#5c4a38', tip: '#2e2620', cheek: '#f1ede2', legs: 0, crown: '' },
  greylag: { size: 0.95, neck: 0.26, body: '#8c8474', breast: '#bdb6a6', neckTone: '#8c8474', head: '#857c6c', beak: '#e8862e', wing: '#77705f', tip: '#3c3830', cheek: '', legs: 0, crown: '' },
  snow: { size: 0.9, neck: 0.25, body: '#f4f3ee', breast: '#cfd3d6', neckTone: '#f4f3ee', head: '#f4f3ee', beak: '#e58a8a', wing: '#f4f3ee', tip: '#17181a', cheek: '', legs: 0, crown: '' },
  swan: { size: 1.45, neck: 0.52, body: '#fbfaf5', breast: '#cdd2d6', neckTone: '#f2f1ea', head: '#fbfaf5', beak: '#e8a020', wing: '#f6f5ef', tip: '#c9ced2', cheek: '', legs: 0, crown: '' },
  crane: { size: 1.2, neck: 0.5, body: '#9a9c9e', breast: '#aeb0b2', neckTone: '#d9d9d6', head: '#2a2a2c', beak: '#c9b47a', wing: '#8a8c8e', tip: '#1c1c1e', cheek: '', legs: 0.55, crown: '#c8281e' },
} as const;

export default defineThing({
  questions: {
    formation: choice('What shape is the formation?', {
      vee: 'A clean symmetrical V behind one leader.',
      jay: 'A lopsided J: one long arm and one short.',
      echelon: 'A single slanting line, each bird off the shoulder of the one ahead.',
      ragged: 'A ragged bunch still sorting itself into a line.',
    }),
    number: score('How many birds are there?', ['A lone three', 'Seven or so', 'A dozen', 'A long skein of twenty']),
    species: choice('What kind of bird, by silhouette?', {
      canada: 'Canada geese: brown bodies, black necks, a white chinstrap.',
      greylag: 'Greylag geese: plain grey-brown with orange bills, farmyard ancestors.',
      snow: 'Snow geese: all white with black wingtips.',
      swan: 'Wild swans: larger, pure white, with very long necks.',
      crane: 'Cranes: grey, long-necked, with long legs trailing behind.',
    }),
    straggler: choice('Is one bird out of place?', {
      none: 'No: every bird holds its position.',
      lagging: 'One has dropped a few lengths behind the end of the line and is working to catch up.',
      far: 'One is far behind and lower, alone, falling out of touch.',
      gap: 'There is an empty place in the line where a bird should be.',
      turned: 'One has peeled away and is flying back the other way.',
    }),
    flight: choice('What is the flock doing?', {
      level: 'Flying level and steady, a long way still to go.',
      banking: 'Banking together into a turn.',
      landing: 'Coming down to land: wings cupped, feet lowered, home.',
      climbing: 'Climbing hard, just risen.',
    }),
    below: choice('What are they passing over?', {
      skim: 'Nothing: they are skimming so low their wingtips nearly touch the ground.',
      reeds: 'A stand of bulrushes at the edge of a marsh.',
      mist: 'A low bank of morning mist.',
      vane: 'The weathervane on top of a steeple.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const kind = SPECIES[a.species];
    const k = kind.size;
    const paint = (hex: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).offsetHSL((mood.warmth - 0.5) * 0.03, 0, (mood.cheer - 0.5) * 0.04), roughness: 0.85, ...extra });
    const bodyPaint = paint(kind.body), breastPaint = paint(kind.breast), neckPaint = paint(kind.neckTone), headPaint = paint(kind.head), beakPaint = paint(kind.beak);
    const wingPaint = paint(kind.wing, { side: THREE.DoubleSide }), tipPaint = paint(kind.tip, { side: THREE.DoubleSide });
    const legPaint = paint(a.species === 'crane' ? '#2a2a2c' : '#d8782a');

    const flat = (outline: [number, number][]) => {
      const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
      const geometry = new THREE.ShapeGeometry(shape);
      geometry.rotateX(-Math.PI / 2);
      return geometry;
    };
    const span = 0.92 * k;
    const sphere = new THREE.SphereGeometry(1, 14, 10);
    const innerWing = flat([[0, 0.17 * k], [span * 0.5, 0.18 * k], [span * 0.5, -0.15 * k], [0, -0.17 * k]]);
    const outerWing = flat([[0, 0.18 * k], [span * 0.32, 0.13 * k], [span * 0.52, -0.08 * k], [span * 0.3, -0.17 * k], [0, -0.15 * k]]);
    const tail = new THREE.ConeGeometry(0.09 * k, 0.2 * k, 6);
    tail.rotateX(-Math.PI / 2); tail.scale(1, 0.35, 1);
    const beak = new THREE.ConeGeometry(0.022 * k, (a.species === 'crane' ? 0.16 : 0.09) * k, 6);
    beak.rotateX(Math.PI / 2);
    const neckGeometry = new THREE.CylinderGeometry(0.026 * k, 0.04 * k, kind.neck * k + 0.06 * k, 8);
    neckGeometry.rotateX(Math.PI / 2);
    const legGeometry = new THREE.CylinderGeometry(0.008 * k, 0.012 * k, 1, 6);

    interface Bird { root: THREE.Group; wings: { inner: THREE.Group; outer: THREE.Group; side: number }[]; phase: number; rate: number }
    const birds: Bird[] = [];
    const flock = new THREE.Group();
    s.root.add(flock);
    const landing = a.flight === 'landing';
    const bird = (x: number, y: number, z: number, turn = 0, parent: THREE.Object3D = flock) => {
      const root = new THREE.Group();
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, px: number, py: number, pz: number, into: THREE.Object3D = root) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(px, py, pz); mesh.castShadow = mesh.receiveShadow = true; into.add(mesh); return mesh;
      };
      add(sphere, bodyPaint, 0, 0, 0).scale.set(0.13 * k, 0.11 * k, 0.3 * k);
      add(sphere, breastPaint, 0, -0.03 * k, 0.03 * k).scale.set(0.115 * k, 0.095 * k, 0.26 * k);
      const neckEnd = 0.24 * k + kind.neck * k;
      const droop = landing ? 0.1 * k : 0.03 * k;
      const neck = add(neckGeometry, neckPaint, 0, 0.02 * k + droop / 2, 0.22 * k + kind.neck * k / 2);
      neck.rotation.x = -Math.atan2(droop, kind.neck * k);
      add(sphere, headPaint, 0, 0.03 * k + droop, neckEnd + 0.03 * k).scale.set(0.04 * k, 0.04 * k, 0.058 * k);
      add(beak, beakPaint, 0, 0.022 * k + droop, neckEnd + (a.species === 'crane' ? 0.15 : 0.11) * k);
      if (kind.cheek) add(sphere, paint(kind.cheek), 0, 0.012 * k + droop, neckEnd + 0.012 * k).scale.set(0.043 * k, 0.03 * k, 0.03 * k);
      if (kind.crown) add(sphere, paint(kind.crown), 0, 0.058 * k + droop, neckEnd + 0.035 * k).scale.set(0.025 * k, 0.015 * k, 0.03 * k);
      add(tail, a.species === 'canada' ? tipPaint : bodyPaint, 0, 0.005, -0.33 * k);
      const legLength = (kind.legs || 0.1) * k;
      if (kind.legs || landing)
        for (const side of [-1, 1]) {
          const leg = add(legGeometry, legPaint, side * 0.04 * k, landing ? -0.08 * k - legLength * 0.4 : -0.02 * k, landing ? 0.02 * k : -0.3 * k - legLength / 2);
          leg.scale.y = legLength;
          leg.rotation.x = landing ? 0.35 : Math.PI / 2;
        }
      const wings: Bird['wings'] = [];
      for (const side of [-1, 1]) {
        const inner = new THREE.Group();
        inner.position.set(side * 0.07 * k, 0.05 * k, 0.03 * k);
        inner.scale.x = side;
        const outer = new THREE.Group();
        outer.position.x = span * 0.5;
        add(innerWing, wingPaint, 0, 0, 0, inner);
        add(outerWing, a.species === 'snow' || a.species === 'crane' ? tipPaint : wingPaint, 0, 0, 0, outer);
        if (a.species === 'canada' || a.species === 'greylag') add(flat([[span * 0.25, 0], [span * 0.52, -0.08 * k], [span * 0.3, -0.17 * k], [span * 0.1, -0.16 * k]]), tipPaint, 0, 0.002, 0, outer);
        inner.add(outer);
        root.add(inner);
        wings.push({ inner, outer, side });
      }
      root.position.set(x, y, z);
      root.rotation.y = turn;
      parent.add(root);
      const entry = { root, wings, phase: random() * Math.PI * 2, rate: mix(0.9, 1.1, random()) };
      birds.push(entry);
      return entry;
    };

    // Places in the line: the leader, then alternating (or one-sided) arms falling back.
    const total = Math.max(3, Math.round(mix(3, 15, a.number) + (mood.density - 0.5) * 3));
    const dx = 0.8 * k, dz = 0.7 * k;
    const slope = a.flight === 'landing' ? 0.14 : a.flight === 'climbing' ? -0.14 : 0.04;
    const places: [number, number, number][] = [[0, 0, 0]];
    let left = 0, right = 0;
    const lean = random() < 0.5 ? -1 : 1;
    for (let i = 1; i < total; i++) {
      let side = i % 2 ? 1 : -1;
      if (a.formation === 'jay') side = i % 4 === 0 ? -lean : lean;
      if (a.formation === 'echelon') side = lean;
      const rank = side > 0 ? ++right : ++left;
      const loose = a.formation === 'ragged' ? 1 : 0.16;
      places.push([
        side * rank * dx * (a.formation === 'ragged' ? 0.7 : 1) + (random() - 0.5) * dx * loose * 2,
        (random() - 0.5) * 0.4 * (1 + loose) + rank * slope * k,
        -rank * dz * (a.formation === 'ragged' ? 0.75 : 1) + (random() - 0.5) * dz * loose * 2.4,
      ]);
    }
    const gapAt = a.straggler === 'gap' && total > 3 ? 1 + Math.floor(random() * (total - 2)) : -1;
    places.forEach(([x, y, z], index) => { if (index !== gapAt) bird(x, y, z, (random() - 0.5) * 0.08); });
    const depth = Math.max(left, right) * dz, reach = Math.max(left, right, 1) * dx;
    if (a.straggler === 'lagging') bird((right >= left ? 1 : -1) * (reach + dx * 0.6), -0.25, -depth - dz * 3.2, (random() - 0.5) * 0.2);
    if (a.straggler === 'far') bird((random() - 0.5) * reach, -1.5 - random() * 0.6, -depth - dz * 6 - 2, (random() - 0.5) * 0.3).rate = 1.3;
    if (a.straggler === 'turned') bird(-(right >= left ? 1 : -1) * (reach * 0.5 + 1.2), 0.5, -depth * 0.3 - 1.5, Math.PI + (random() - 0.5) * 0.5);

    const roll = a.flight === 'banking' ? lean * mix(0.3, 0.45, random()) : 0;
    const pitch = a.flight === 'landing' ? 0.2 : a.flight === 'climbing' ? -0.24 : 0;
    flock.rotation.set(0, roll * 0.5, roll * 0.3, 'YXZ');
    // Every bird pitches and rolls about its own axis; the line itself only leans a little.
    for (const one of birds) { one.root.rotation.order = 'YXZ'; one.root.rotation.x = pitch; one.root.rotation.z = roll; }

    // What lies under them; the flock is lifted to clear it.
    flock.updateMatrixWorld(true);
    const low = new THREE.Box3().setFromObject(flock).min.y;
    if (a.below === 'reeds') {
      const stem = s.material('#7c8a48'), head = s.material('#5a3a22', { roughness: 1 }), leaf = s.material('#93a058', { side: THREE.DoubleSide });
      const count = 22 + Math.round(mood.density * 16);
      let top = 0;
      for (let i = 0; i < count; i++) {
        const angle = random() * 7, d = Math.sqrt(random()) * 1.5, x = Math.cos(angle) * d * 1.6, z = Math.sin(angle) * d - depth * 0.4;
        const tall = mix(1.3, 2.3, random()), lx = (random() - 0.5) * 0.4, lz = (random() - 0.5) * 0.4;
        s.rod([x, 0, z], [x + lx, tall, z + lz], 0.014, stem, 0.008);
        if (random() < 0.6) { s.rod([x + lx * 0.86, tall * 0.86, z + lz * 0.86], [x + lx * 0.97, tall * 0.97, z + lz * 0.97], 0.034, head); top = Math.max(top, tall); }
        else { const blade = s.mesh(new THREE.PlaneGeometry(0.05, tall * 0.9), leaf, [x + lx / 2, tall * 0.45, z + lz / 2]); blade.rotation.set(lz * 0.5, random() * 3, -lx * 0.5); }
      }
      flock.position.y = Math.max(top, 2) + 0.5 - low;
    } else if (a.below === 'mist') {
      const fog = new THREE.MeshStandardMaterial({ color: '#dfe5ea', roughness: 1 });
      const puffs = 9 + Math.round(mood.density * 7);
      for (let i = 0; i < puffs; i++) {
        const w = mix(1.0, 2.0, random()), t = random() * 7, d = Math.sqrt(random());
        s.ball([w, mix(0.3, 0.55, random()), w * mix(0.7, 0.95, random())], [Math.cos(t) * d * Math.min(reach * 0.6 + 1, 4), 0.25 + random() * 0.2, -depth * 0.5 + Math.sin(t) * d * Math.min(depth * 0.5 + 1, 3.5)], fog, 16);
      }
      flock.position.y = 1.0 - low;
    } else if (a.below === 'vane') {
      const slate = s.material('#56606a'), gilt = s.material('#d2a640', { metalness: 0.8, roughness: 0.35 }), iron = s.material('#2c2e32', { metalness: 0.5 });
      const zc = -Math.max(depth * 0.55, 1.4), xc = a.formation === 'echelon' || a.formation === 'jay' ? -lean * 1.3 : 0;
      s.mesh(new THREE.ConeGeometry(1.1, 3.2, 8), slate, [xc, 1.6, zc]);
      s.rod([xc, 3.1, zc], [xc, 5.1, zc], 0.035, iron);
      s.ball([0.13, 0.13, 0.13], [xc, 3.5, zc], gilt, 14);
      for (const [ex, ez] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) { s.rod([xc, 3.95, zc], [xc + ex, 3.95, zc + ez], 0.014, iron); s.ball([0.045, 0.045, 0.045], [xc + ex, 3.95, zc + ez], gilt, 8); }
      const arrow = new THREE.Group();
      arrow.position.set(xc, 4.75, zc);
      arrow.rotation.y = random() * 6;
      s.root.add(arrow);
      arrow.add(s.rod([-0.6, 0, 0], [0.55, 0, 0], 0.016, gilt));
      const point = s.mesh(new THREE.ConeGeometry(0.09, 0.26, 4), gilt, [0.66, 0, 0]); point.rotation.z = -Math.PI / 2; point.scale.z = 0.2; arrow.add(point);
      const fletch = s.mesh(flat([[0, 0], [0.34, 0.2], [0.34, -0.2]]), new THREE.MeshStandardMaterial({ color: '#d2a640', metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide }), [-0.72, 0, 0]); fletch.rotation.x = Math.PI / 2; arrow.add(fletch);
      flock.position.y = 5.5 - low;
    } else flock.position.y = 0.25 - low;

    const beat = mix(1.6, 4.6, mood.energy) * (a.species === 'swan' || a.species === 'crane' ? 0.75 : 1) / Math.sqrt(k);
    const pose = (time: number) => {
      for (const one of birds) {
        const angle = time * beat * one.rate * Math.PI * 2 + one.phase;
        for (const wing of one.wings) {
          if (landing) {
            wing.inner.rotation.z = wing.side * (0.42 + 0.08 * Math.sin(angle));
            wing.outer.rotation.z = wing.side * (-0.5 + 0.1 * Math.sin(angle - 0.8));
            wing.inner.rotation.x = -0.3;
          } else {
            wing.inner.rotation.z = wing.side * (0.12 + 0.5 * Math.sin(angle));
            wing.outer.rotation.z = wing.side * (-0.05 + 0.45 * Math.sin(angle - 1.0));
          }
        }
      }
    };
    pose(0);
    return s.finish({ update: (_dt, time) => pose(time) });
  },
});
