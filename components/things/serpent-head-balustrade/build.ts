import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { PAINT, lerpHex, paintCanvas, prism, stone, stoneTone, textured, tuft, weather } from './maya';

type P2 = readonly [number, number];

/** A side-view outline ([z, y]) given thickness across x, with softened edges. */
function slab(profile: readonly P2[], width: number, bevel = 0.06) {
  const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
  const depth = Math.max(0.02, width - bevel * 2);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 1 });
  geometry.translate(0, 0, -depth / 2);
  geometry.rotateY(-Math.PI / 2);
  return geometry;
}

const SCHEMES = {
  green: { body: PAINT.green, plume: PAINT.blue, mouth: PAINT.red },
  red: { body: PAINT.red, plume: PAINT.ochre, mouth: '#7a1f1a' },
  blue: { body: PAINT.blue, plume: PAINT.cream, mouth: PAINT.red },
  ochre: { body: PAINT.ochre, plume: PAINT.green, mouth: PAINT.red },
} as const;

export default defineThing({
  questions: {
    setting: choice('How does the head sit against the stair?', {
      single: 'One head at the foot of one balustrade ramp, a run of steps beside it.',
      pair: 'Two heads flanking a central stair, a matched pair of guardians.',
      alone: 'The head on its own, broken from its ramp and resting on the ground.',
    }),
    gape: score('How wide are the jaws open?', ['Clamped almost shut', 'Parted, showing teeth', 'Gaping wide enough to walk into']),
    collar: choice('What feathers does it wear?', {
      ruff: 'A stiff ruff of feather petals fanned around the neck like a flower.',
      plumes: 'Long plumes swept back along the ramp from the brow.',
      crest: 'A ridge of upright stepped plates down its back.',
      bare: 'None: a smooth scaled snake, no feathers at all.',
    }),
    mouth: choice('What is in its mouth?', {
      tongue: 'A long forked tongue lolling out over the ground.',
      face: 'A human face looking out from between the jaws, an ancestor being born from the serpent.',
      bowl: 'An offering bowl someone has set on its lower jaw.',
      empty: 'Nothing but teeth and shadow.',
    }),
    eyes: choice('What are its eyes like?', {
      obsidian: 'Polished black obsidian discs.',
      shell: 'White shell with a dark staring pupil.',
      hollow: 'Empty sockets, the inlays long gone.',
      ember: 'Glowing red-orange, as if lit from inside.',
    }),
    paint: choice('If its paint survives, what colours is it?', {
      green: 'Quetzal green body, blue plumes, red mouth.',
      red: 'Blood red with golden plumes.',
      blue: 'Maya blue with cream plumes and a red mouth.',
      ochre: 'Golden ochre with green plumes.',
    }),
    moment: choice('What is happening here right now?', {
      quiet: 'Nothing. Hot stone and silence.',
      equinox: 'The equinox sun throws a rippling line of light triangles down the balustrade: the serpent descending.',
      braziers: 'Braziers burn on either side of the head, a rite in progress.',
      garland: 'It is wreathed in marigolds, flowers heaped under its chin.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const fresh = Math.max(0, Math.min(1, 1.15 - wear * 1.5));
    const base = stoneTone(wear);
    const scheme = SCHEMES[a.paint];
    const paint = (colour: string, amount = 0.92) => lerpHex(base, colour, fresh * amount);
    const body = s.material(paint(scheme.body), { roughness: 0.85 });
    const plume = s.material(paint(scheme.plume), { roughness: 0.85 });
    const gum = s.material(lerpHex(lerpHex(base, '#544a40', 0.5), scheme.mouth, fresh), { roughness: 0.9 });
    const tooth = s.material(lerpHex(base, '#f4ecd6', 0.4 + fresh * 0.6), { roughness: 0.7 });
    const trim = s.material(paint(PAINT.cream, 0.8), { roughness: 0.85 });
    const plain = s.material(base, { roughness: 0.9 });
    const eyeTone = { obsidian: '#121214', shell: '#f1ead8', hollow: '#2a2622', ember: '#ff7a2a' }[a.eyes];
    const eyePaint = new THREE.MeshStandardMaterial({ color: eyeTone, roughness: a.eyes === 'obsidian' ? 0.15 : 0.6, emissive: a.eyes === 'ember' ? '#ff4a10' : '#000000', emissiveIntensity: a.eyes === 'ember' ? 1.8 : 0 });
    const pupil = s.material('#141210', { roughness: 0.4 });
    const W = 1.2;
    const alone = a.setting === 'alone';
    const K = alone ? 1.1 : 1.45;
    const run = 2.5, rise = 2.1, z0 = -0.7 * K;
    const slope = (0.55 + rise - 0.98 * K) / run;
    const lift = mix(0.06, 0.62, a.gape);
    const moving: THREE.Object3D[] = [];
    const flames: THREE.Mesh[] = [];

    const head = () => {
      const g = new THREE.Group();
      const add = <M extends THREE.Object3D>(parent: THREE.Object3D, node: M) => { parent.add(node); return node; };
      const make = (geometry: THREE.BufferGeometry, material: THREE.Material) => { const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = mesh.receiveShadow = true; return mesh; };
      // Lower jaw lies flat on the ground; the upper head hinges up from the back of the mouth.
      add(g, make(slab([[-0.75, 0], [1.12, 0], [1.24, 0.12], [1.2, 0.3], [0.95, 0.36], [0.2, 0.4], [-0.12, 0.5], [-0.75, 0.5]], W), body));
      add(g, make(slab([[-0.05, 0.4], [1.05, 0.33], [1.05, 0.38], [-0.05, 0.46]], W * 0.72, 0.02), gum));
      const upper = add(g, new THREE.Group());
      upper.position.set(0, 0.52, -0.12);
      const up = (z: number, y: number): P2 => [z + 0.12, y - 0.52];
      add(upper, make(slab([up(-0.75, 0.5), up(-0.75, 1.3), up(-0.3, 1.36), up(0.02, 1.47), up(0.26, 1.4), up(0.42, 1.14), up(0.92, 1.02), up(1.12, 1.1), up(1.27, 1.2), up(1.36, 1.08), up(1.33, 0.88), up(1.2, 0.72), up(0.95, 0.66), up(0.2, 0.62), up(-0.12, 0.54)], W), body));
      add(upper, make(slab([up(-0.05, 0.6), up(1.1, 0.64), up(1.1, 0.7), up(-0.05, 0.68)], W * 0.72, 0.02), gum));
      // Lip bands, brow plates and cheek scrolls in the cream trim colour.
      for (const side of [-1, 1]) {
        const x = side * (W / 2 + 0.005);
        const lip = add(upper, make(new THREE.BoxGeometry(0.06, 0.09, 1.25), trim)); lip.position.set(x, 0.17, 0.72); lip.rotation.x = -0.05;
        const lowLip = add(g, make(new THREE.BoxGeometry(0.06, 0.09, 1.2), trim)); lowLip.position.set(x, 0.33, 0.55); lowLip.rotation.x = 0.06;
        const eye = add(upper, make(new THREE.SphereGeometry(1, 16, 10), eyePaint)); eye.scale.set(0.06, 0.15, 0.17); eye.position.set(x, 0.6, 0.14);
        if (a.eyes === 'shell') { const dot = add(upper, make(new THREE.SphereGeometry(1, 10, 8), pupil)); dot.scale.set(0.04, 0.07, 0.07); dot.position.set(x + side * 0.035, 0.6, 0.16); }
        const socket = add(upper, make(new THREE.TorusGeometry(0.2, 0.045, 6, 20), trim)); socket.rotation.y = Math.PI / 2; socket.position.set(x, 0.6, 0.14); socket.scale.set(1.1, 0.95, 1);
        const brow = add(upper, make(new THREE.BoxGeometry(0.1, 0.1, 0.62), body)); brow.position.set(x, 0.86, 0.16); brow.rotation.x = 0.28;
        const scroll = add(g, make(new THREE.TorusGeometry(0.13, 0.04, 6, 18, Math.PI * 1.5), trim)); scroll.rotation.y = Math.PI / 2; scroll.position.set(x, 0.42, -0.38);
        const nostril = add(upper, make(new THREE.TorusGeometry(0.09, 0.035, 6, 16), trim)); nostril.position.set(side * 0.27, 0.62, 1.44); nostril.rotation.x = -0.4;
        // Teeth along both jaws, fewer as the stone wears.
        for (let i = 0; i < 6; i++) {
          if (random() < wear * 0.35) continue;
          const z = 0.3 + i * 0.16;
          const top = add(upper, make(new THREE.ConeGeometry(0.055, 0.2, 5), tooth)); top.position.set(side * (W / 2 - 0.1), 0.05 + i * 0.006, z + 0.12); top.rotation.x = Math.PI;
          const low = add(g, make(new THREE.ConeGeometry(0.05, 0.16, 5), tooth)); low.position.set(side * (W / 2 - 0.1), 0.44 - i * 0.012, z);
        }
        const fang = add(upper, make(new THREE.ConeGeometry(0.085, 0.42, 6), tooth)); fang.position.set(side * (W / 2 - 0.16), -0.02, 1.3); fang.rotation.x = Math.PI + 0.2;
      }
      for (let i = -1; i <= 1; i++) { const front = add(upper, make(new THREE.ConeGeometry(0.06, 0.22, 5), tooth)); front.position.set(i * 0.2, 0.06, 1.37); front.rotation.x = Math.PI; }
      upper.rotation.x = -lift;

      if (a.mouth === 'tongue') {
        const flesh = s.material(lerpHex(lerpHex(base, '#6a5a4c', 0.4), '#c9392c', fresh), { roughness: 0.8 });
        add(g, make(prism([[0.2, 0.42], [1.2, 0.4], [1.5, 0.12], [1.75, 0.03], [1.75, 0.1], [1.52, 0.2], [1.2, 0.47], [0.2, 0.48]], 0.5), flesh)).material.side = THREE.DoubleSide;
        for (const side of [-1, 1]) { const fork = add(g, make(prism([[-0.05, 0.03], [0.6, 0.0], [0.6, 0.05], [-0.05, 0.1]], 0.2), flesh)); fork.material.side = THREE.DoubleSide; fork.position.set(side * 0.14, 0, 1.72); fork.rotation.y = side * 0.3; }
      } else if (a.mouth === 'face') {
        const skin = s.material(lerpHex(base, '#c98a5c', Math.max(0.35, fresh)), { roughness: 0.8 });
        const face = add(g, make(new THREE.SphereGeometry(1, 18, 14), skin)); face.scale.set(0.26, 0.3, 0.27); face.position.set(0, 0.72 + lift * 0.25, 0.95);
        const nose = add(g, make(new THREE.ConeGeometry(0.06, 0.2, 5), skin)); nose.position.set(0, 0.72 + lift * 0.25, 1.22); nose.rotation.x = 1.9;
        for (const side of [-1, 1]) {
          const eye = add(g, make(new THREE.SphereGeometry(0.04, 8, 6), pupil)); eye.position.set(side * 0.1, 0.79 + lift * 0.25, 1.18);
          const spool = add(g, make(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12), s.material(paint('#57b58a'), { roughness: 0.4 }))); spool.rotation.z = Math.PI / 2; spool.position.set(side * 0.27, 0.68 + lift * 0.25, 0.95);
        }
        const band = add(g, make(new THREE.BoxGeometry(0.5, 0.09, 0.3), trim)); band.position.set(0, 0.96 + lift * 0.25, 0.98);
      } else if (a.mouth === 'bowl') {
        const clay = s.material('#b0623f', { roughness: 0.85 });
        const bowl = add(g, make(new THREE.LatheGeometry([[0.02, 0], [0.16, 0.02], [0.27, 0.2], [0.24, 0.21], [0.13, 0.06], [0, 0.06]].map(([x, y]) => new THREE.Vector2(x, y)), 20), clay)); bowl.position.set(0, 0.4, 0.8);
        const heap: { at: [number, number, number]; size: number; color: string }[] = [];
        for (let i = 0; i < 16; i++) heap.push({ at: [(random() - 0.5) * 0.3, 0.6 + random() * 0.08, 0.8 + (random() - 0.5) * 0.3], size: 0.05 + random() * 0.03, color: ['#f29a1f', '#f7d038', '#c8402e', '#f4eede'][Math.floor(random() * 4)] });
        const pile = new Sculpture(context).scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff'), heap);
        g.add(pile);
      }

      const neckY = 0.92;
      if (a.collar === 'ruff') {
        const n = 11;
        for (let i = 0; i < n; i++) {
          const t = -0.35 + (i / (n - 1)) * (Math.PI + 0.7);
          const petal = add(g, make(new THREE.SphereGeometry(1, 10, 8), i % 2 ? plume : body));
          petal.scale.set(0.2, 0.5, 0.09);
          petal.position.set(Math.cos(t) * 0.98, neckY * 0.75 + Math.sin(t) * 0.98, -0.72);
          petal.rotation.z = t - Math.PI / 2; petal.rotateX(-0.42);
        }
        const hub = add(g, make(new THREE.TorusGeometry(0.72, 0.1, 6, 28, Math.PI + 0.9), trim)); hub.position.set(0, neckY * 0.75, -0.66); hub.rotation.z = -0.45;
      } else if (a.collar === 'plumes') {
        for (let i = 0; i < 7; i++) {
          const x = (i - 3) * 0.2;
          const feather = add(g, make(new THREE.SphereGeometry(1, 10, 8), i % 2 ? plume : body));
          const length = alone ? 0.7 + random() * 0.4 : 1.1 + random() * 0.7;
          feather.scale.set(0.11, 0.07, length);
          feather.position.set(x, 1.5 - Math.abs(i - 3) * 0.08 + length * (alone ? 0.28 : 0.5), -0.5 - length * 0.8);
          feather.rotation.x = (alone ? 0.3 : Math.atan(slope)) + (random() - 0.5) * 0.15; feather.rotation.y = (i - 3) * -0.07;
          moving.push(feather);
        }
      } else if (a.collar === 'crest') {
        for (let i = 0; i < (alone ? 3 : 5); i++) {
          const pz = alone ? -i * 0.36 : -0.3 - i * 0.5;
          const plate = add(g, make(slab([[-0.2, 0], [0.2, 0], [0.2, 0.2], [0.07, 0.2], [0.07, 0.38], [-0.07, 0.38], [-0.07, 0.2], [-0.2, 0.2]], 0.22, 0.02), i % 2 ? plume : trim));
          plate.position.set(0, alone ? 1.42 - i * 0.05 : Math.max(1.36, 0.94 + (-0.7 - pz) * slope), pz); plate.rotation.x = alone || i === 0 ? 0.1 : Math.atan(slope) * 0.6;
        }
      }
      if (a.moment === 'garland') {
        const petals: { at: [number, number, number]; size: number; color: string }[] = [];
        for (let i = 0; i < 70; i++) { const t = -0.5 + (i / 69) * (Math.PI + 1); petals.push({ at: [Math.cos(t) * 0.72 + (random() - 0.5) * 0.06, 0.68 + Math.sin(t) * 0.82, -0.2 + (random() - 0.5) * 0.08], size: 0.07 + random() * 0.03, color: random() < 0.7 ? '#f29a1f' : '#f7d038' }); }
        const n = 30 + Math.round(mood.density * 60);
        for (let i = 0; i < n; i++) petals.push({ at: [(random() - 0.5) * 1.8, 0.05 + random() * 0.12, 1.3 + random() * 0.9], size: 0.06 + random() * 0.03, color: ['#f29a1f', '#f7d038', '#e8701a', '#c9372c'][Math.floor(random() * 4)] });
        g.add(new Sculpture(context).scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff', { roughness: 0.8 }), petals));
      }
      g.scale.setScalar(K);
      return g;
    };

    const tile = textured(paintCanvas(512, 512, (ctx, w, h) => stone(ctx, w, h, random, { base, wear, course: 64, block: 128 })), { side: THREE.DoubleSide });
    const scales = textured(paintCanvas(512, 512, (ctx, w, h) => {
      stone(ctx, w, h, random, { base: paint(scheme.body, 0.8), wear: 0 });
      ctx.strokeStyle = lerpHex(base, '#2a2420', 0.7); ctx.lineWidth = 5;
      for (let row = 0; row < 8; row++) for (let col = -1; col < 8; col++) { ctx.beginPath(); ctx.arc(col * 64 + (row % 2) * 32 + 32, row * 64 + 8, 30, 0.15, Math.PI - 0.15); ctx.stroke(); }
      weather(ctx, w, h, random, wear);
    }), { side: THREE.DoubleSide, bumpScale: 2 });

    const ramp = (x: number) => {
      s.mesh(prism([[z0, 0], [z0, 0.98 * K], [z0 - run, 0.55 + rise], [z0 - run - 0.5, 0.55 + rise], [z0 - run - 0.5, 0]], W * K * 0.8, 0.42), scales, [x, 0, 0]);
      s.box([W * K * 0.9, 0.14, 0.62], [x, 0.55 + rise + 0.07, z0 - run - 0.25], plain);
      if (a.moment === 'equinox') {
        const light = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd66a', emissiveIntensity: 1.1, side: THREE.DoubleSide, roughness: 1 });
        for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
          const top = (v: number) => [0.98 * K + v * (0.55 + rise - 0.98 * K) - 0.04, z0 - v * run] as const;
          const [y1, z1] = top(i / 7 + 0.01), [y2, z2] = top(i / 7 + 0.13), [y3, z3] = top(i / 7 + 0.05);
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, y1, z1, 0, y2, z2, 0, y3 - 0.6, z3 + 0.12], 3));
          geometry.computeVertexNormals();
          s.mesh(geometry, light, [x + side * (W * K * 0.4 + 0.015), 0, 0]).castShadow = false;
        }
      }
    };
    const stairs = (x: number, width: number) => {
      const n = Math.round(rise / 0.25), h = rise / n, d = run / n;
      const profile: [number, number][] = [[z0 - run - 0.5, 0], [z0, 0]];
      for (let i = 0; i < n; i++) profile.push([z0 - i * d, (i + 1) * h], [z0 - (i + 1) * d, (i + 1) * h]);
      profile.push([z0 - run - 0.5, rise]);
      s.mesh(prism(profile, width, 0.42), tile, [x, 0, 0]);
    };

    const spots: number[] = [];
    if (a.setting === 'alone') {
      const g = head();
      g.rotation.z = (random() - 0.5) * 0.2 * wear; g.rotation.y = (random() - 0.5) * 0.3;
      s.root.add(g);
      const stump = s.mesh(new THREE.DodecahedronGeometry(0.72, 0), plain, [0, 0.62, -0.95]); stump.scale.set(0.85, 0.85, 0.6); stump.rotation.set(0.4, 0.6, 0.2);
      for (let i = 0; i < 3 + Math.round(mood.density * 4); i++) { const size = 0.15 + random() * 0.25; s.box([size * 1.4, size, size], [(random() - 0.5) * 2.4, size * 0.4, -1.3 - random() * 0.9], plain).rotation.set(random(), random() * 3, random()); }
      spots.push(0);
    } else if (a.setting === 'single') {
      const g = head(); g.position.x = -1.5; s.root.add(g); ramp(-1.5);
      stairs(-0.02, 1.7);
      spots.push(-1.5);
    } else {
      for (const side of [-1, 1]) { const g = head(); g.position.x = side * 1.6; s.root.add(g); ramp(side * 1.6); spots.push(side * 1.6); }
      stairs(0, 1.85);
    }

    if (a.moment === 'braziers') {
      const clay = s.material('#a85a3a', { roughness: 0.85 });
      const fire = new THREE.MeshStandardMaterial({ color: '#ffb23a', emissive: '#ff6a12', emissiveIntensity: 2, roughness: 1 });
      const smoke = new THREE.MeshBasicMaterial({ color: '#efece4', transparent: true, opacity: 0.28, depthWrite: false });
      const xs = a.setting === 'pair' ? [-0.5, 0.5] : [spots[0] - 1.25, spots[0] + 1.25];
      for (const x of xs) {
        const z = 1.4 * K;
        s.lathe([[0.2, 0], [0.12, 0.12], [0.09, 0.5], [0.16, 0.68], [0.32, 0.92], [0.29, 0.94], [0.12, 0.74], [0, 0.74]], clay, [x, 0, z]);
        flames.push(s.mesh(new THREE.ConeGeometry(0.2, 0.6, 7), fire, [x, 1.2, z]));
        s.tube([[x, 1.4, z], [x + 0.18, 2.2, z + 0.1], [x - 0.14, 3, z - 0.05], [x + 0.2, 3.9, z + 0.1]], 0.08, smoke).castShadow = false;
      }
    }
    if (wear > 0.45) {
      const n = Math.round((wear - 0.45) * 2 * (4 + mood.density * 8));
      for (let i = 0; i < n; i++) s.root.add(tuft(random, [spots[Math.floor(random() * spots.length)] + (random() - 0.5) * 2.6, 0, (random() - 0.3) * 2.4], 0.35 + random() * 0.5, lerpHex('#3f7a3c', '#8aa648', random() * 0.6)));
      const moss: { at: [number, number, number]; size: number; color: string }[] = [];
      for (const x of spots) for (let i = 0; i < (wear - 0.45) * 60; i++) { const z = -0.7 + random() * 1.9; moss.push({ at: [x + (random() - 0.5) * W * 0.9 * K, (z < 0.3 ? 1.36 + lift * 0.1 : 1.08 + lift * z * 0.8 + (z > 1.1 ? 0.08 : 0)) * K, z * K], size: 0.08 + random() * 0.1, color: lerpHex('#4c7a3a', '#7d9a4a', random()) }); }
      const blob = new THREE.SphereGeometry(1, 7, 5); blob.scale(1, 0.35, 1);
      s.scatter(blob, s.material('#ffffff', { roughness: 1 }), moss);
    }

    const speed = mix(1.5, 8, mood.energy), sway = mix(0.01, 0.07, mood.energy);
    const rest = moving.map((node) => node.rotation.y);
    return s.finish({
      update: (_dt, time) => {
        flames.forEach((flame, index) => flame.scale.set(1 + Math.sin(time * speed + index) * 0.12, 1 + Math.sin(time * speed * 1.3 + index * 2) * 0.22, 1));
        moving.forEach((node, index) => { node.rotation.y = rest[index] + Math.sin(time * speed * 0.3 + index) * sway; });
      },
    });
  },
});
