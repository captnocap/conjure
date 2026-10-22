import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { type P3, type Pupil, ball, box, card, eyeMaterial, part, woodMaterial } from './parts';

const KINDS = {
  owl: { iris: '#f0a91e', pupil: 'round', r: 0.0125, white: false, name: 'OWL' },
  goat: { iris: '#d8c98a', pupil: 'hslit', r: 0.0105, white: false, name: 'GOAT' },
  cat: { iris: '#9ac43c', pupil: 'vslit', r: 0.0095, white: false, name: 'CAT' },
  deer: { iris: '#4a2c14', pupil: 'dark', r: 0.012, white: false, name: 'DEER' },
  fish: { iris: '#d9dccb', pupil: 'fish', r: 0.0085, white: false, name: 'FISH' },
  fox: { iris: '#c46a1c', pupil: 'vslit', r: 0.009, white: false, name: 'FOX' },
  doll: { iris: '#3f7fc4', pupil: 'round', r: 0.0115, white: true, name: 'DOLL' },
} as const satisfies Record<string, { iris: string; pupil: Pupil; r: number; white: boolean; name: string }>;
type Kind = keyof typeof KINDS;

export default defineThing({
  questions: {
    dominant: choice('Which eyes dominate the tray?', {
      owl: 'Big round amber owl eyes, bright as coins.',
      slit: 'Pale goat eyes with flat bar pupils and green cat eyes with slits.',
      deer: 'Dark, soft, almost all-pupil deer eyes.',
      fish: 'Small flat silver fish eyes with fixed black dots.',
      doll: 'Blue human-looking eyes with whites, for dolls or worse.',
      mixed: 'Every kind at once, a whole ark of stares.',
    }),
    sorting: choice('How are they sorted?', {
      species: 'Neatly, one animal to a compartment.',
      muddled: 'Sorted once, now muddled: strays in every compartment.',
      heap: 'Not sorted at all: heaped wherever they landed.',
      sparse: 'Nearly used up: a few left in each corner.',
    }),
    pairs: noul('Are they still wired together in matched pairs, rather than odd singles?'),
    gaze: choice('Where are they all looking?', {
      scattered: 'In every direction, wherever they rolled.',
      up: 'Straight up at whoever leans over the tray.',
      one: 'All turned the same way, as if something moved over there.',
    }),
    escaped: choice('Has anything left the tray?', {
      none: 'No, everything is in its place.',
      rolled: 'One eye has rolled out onto the bench.',
      spilled: 'A whole compartment has spilled across the bench.',
      posted: 'One eye stands upright on its wire in a lump of clay, watching.',
    }),
    labels: choice('How are the compartments labelled?', {
      none: 'They are not: the maker knows them by heart.',
      slips: 'Handwritten paper slips, curling.',
      tape: 'Embossed plastic label tape, black with white letters.',
      sizes: 'Pencilled millimetre sizes only.',
    }),
    container: choice('What kind of tray is it?', {
      pine: 'A shallow home-made pine tray with thin dividers.',
      cigar: 'An old cigar box with its lid propped open.',
      velvet: 'A dark velvet-lined case, a jeweller’s care.',
      tackle: 'A clear-lidded plastic tackle box.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const root = s.root;
    const cols = a.container === 'cigar' ? 3 : 4, rows = a.container === 'tackle' ? 2 : 3;
    const cell = 0.085, W = cols * cell + 0.02, D = rows * cell + 0.02, H = 0.032;
    const wood = a.container === 'tackle' ? s.material('#3f6b7a', { roughness: 0.4 }) : woodMaterial(random, { pine: '#c9a269', cigar: '#8a5a33', velvet: '#3a2418', tackle: '#3f6b7a' }[a.container], 0.3 * (1 - mood.wear));
    const lining = s.material({ pine: '#b48f5c', cigar: '#a87848', velvet: '#3b1030', tackle: '#5d8a98' }[a.container], { roughness: 1 });
    box(root, [W, 0.006, D], [0, 0.003, 0], lining);
    for (const z of [-1, 1]) box(root, [W, H, 0.008], [0, H / 2, z * (D / 2 - 0.004)], wood);
    for (const x of [-1, 1]) box(root, [0.008, H, D], [x * (W / 2 - 0.004), H / 2, 0], wood);
    for (let i = 1; i < cols; i++) if (!(mood.wear > 0.7 && random() < 0.25)) box(root, [0.004, H * 0.8, D - 0.016], [-W / 2 + 0.01 + i * cell, H * 0.4, 0], wood);
    for (let j = 1; j < rows; j++) box(root, [W - 0.016, H * 0.8, 0.004], [0, H * 0.4, -D / 2 + 0.01 + j * cell], wood);
    if (a.container === 'cigar' || a.container === 'velvet' || a.container === 'tackle') {
      const lid = a.container === 'tackle' ? new THREE.MeshStandardMaterial({ color: '#dfeef2', transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.1 }) : wood;
      const tilt = -0.25 - random() * 0.2;
      const g = new THREE.Group();
      g.position.set(0, H, -D / 2);
      g.rotation.x = tilt;
      root.add(g);
      box(g, [W, D, 0.007], [0, D / 2, 0], lid);
      if (a.container === 'cigar') card(g, ['FLOR FINA', 'HABANA'], W * 0.7, D * 0.5, [0, D / 2, 0.005], { paper: '#e9d7a4', ink: '#8a2a1a', border: true });
      if (a.container === 'velvet') box(g, [W - 0.02, D - 0.02, 0.003], [0, D / 2, 0.005], lining);
    }

    const all = Object.keys(KINDS) as Kind[];
    const lead: Kind[] = a.dominant === 'slit' ? ['goat', 'cat'] : a.dominant === 'mixed' ? all : [a.dominant as Kind];
    const pick = (favoured: number): Kind => (random() < favoured ? lead[Math.floor(random() * lead.length)] : all[Math.floor(random() * all.length)]);
    const per = Math.round(mix(3, 8, mood.density) * (a.sorting === 'sparse' ? 0.45 : a.sorting === 'heap' ? 1.3 : 1));
    const one = new THREE.Vector3(random() - 0.5, 0.35, random() - 0.2).normalize();
    const lookAt = (): THREE.Vector3 => {
      if (a.gaze === 'up') return new THREE.Vector3((random() - 0.5) * 0.3, 1, (random() - 0.5) * 0.3 + 0.25).normalize();
      if (a.gaze === 'one') return one.clone().add(new THREE.Vector3((random() - 0.5) * 0.15, 0, (random() - 0.5) * 0.15)).normalize();
      const t = random() * Math.PI * 2;
      return new THREE.Vector3(Math.cos(t), mix(-0.1, 1.2, random()), Math.sin(t)).normalize();
    };
    const eyes: Record<Kind, { at: THREE.Vector3; dir: THREE.Vector3; r: number }[]> = { owl: [], goat: [], cat: [], deer: [], fish: [], fox: [], doll: [] };
    const wires: { from: THREE.Vector3; to: THREE.Vector3 }[] = [];
    const drop = (kind: Kind, x: number, z: number, y: number, spread: number) => {
      const r = KINDS[kind].r * 1.6 * mix(0.8, 1.25, random());
      const dir = lookAt();
      const at = new THREE.Vector3(x + (random() - 0.5) * spread, y + r, z + (random() - 0.5) * spread);
      eyes[kind].push({ at, dir, r });
      const flat = new THREE.Vector3(-dir.x, 0, -dir.z);
      if (flat.lengthSq() < 0.01) flat.set(1, 0, 0);
      flat.normalize();
      if (a.pairs) {
        const side = new THREE.Vector3(flat.z, 0, -flat.x).multiplyScalar(r * 2.3);
        const twin = at.clone().add(side);
        eyes[kind].push({ at: twin, dir, r });
        const b1 = at.clone().addScaledVector(flat, r * 1.6), b2 = twin.clone().addScaledVector(flat, r * 1.6);
        wires.push({ from: at, to: b1 }, { from: twin, to: b2 }, { from: b1, to: b2 });
      } else if (random() < 0.7) wires.push({ from: at, to: at.clone().addScaledVector(flat, r * 3.2).setY(y + 0.002) });
    };
    const labelFor: string[] = [];
    let spillCell = -1;
    if (a.escaped === 'spilled') spillCell = Math.floor(random() * cols) + (rows - 1) * cols;
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const index = j * cols + i;
        const home: Kind = a.dominant === 'mixed' ? all[index % all.length] : index % 3 === 2 ? pick(0.25) : lead[index % lead.length];
        labelFor.push(a.labels === 'sizes' ? `${Math.round(KINDS[home].r * 2000)} mm` : KINDS[home].name);
        const cx = -W / 2 + 0.01 + (i + 0.5) * cell, cz = -D / 2 + 0.01 + (j + 0.5) * cell;
        const n = Math.max(index === spillCell ? 0 : 1, Math.round(per * mix(0.6, 1.2, random()) / (a.pairs ? 1.7 : 1)));
        for (let k = 0; k < (index === spillCell ? 1 : n); k++) {
          const kind = a.sorting === 'species' || a.sorting === 'sparse' ? home : a.sorting === 'muddled' ? (random() < 0.7 ? home : pick(0.3)) : pick(0.55);
          drop(kind, cx, cz, 0.006 + (k > 2 ? 0.018 : 0), cell * 0.62);
        }
        if (index === spillCell) for (let k = 0; k < n + 3; k++) drop(home, cx + (random() - 0.5) * 0.1, D / 2 + 0.05 + random() * 0.1, 0, 0.08);
      }
    if (a.escaped === 'rolled') drop(lead[0], W / 2 - 0.06 - random() * 0.1, D / 2 + 0.06 + random() * 0.04, 0, 0.02);
    if (a.escaped === 'posted') {
      const kind = lead[0], x = W / 2 - 0.05, z = D / 2 + 0.07;
      ball(root, [0.028, 0.014, 0.024], [x, 0.012, z], s.material('#9b6a4c', { roughness: 1 }));
      const at = new THREE.Vector3(x, 0.085, z);
      eyes[kind].push({ at, dir: new THREE.Vector3(-0.3, 0.1, 1).normalize(), r: KINDS[kind].r * 2.2 });
      wires.push({ from: at, to: new THREE.Vector3(x, 0.015, z) });
    }

    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), roll = new THREE.Quaternion(), forward = new THREE.Vector3(0, 0, 1), upAxis = new THREE.Vector3(0, 1, 0);
    for (const kind of all) {
      const list = eyes[kind];
      if (!list.length) continue;
      const spec = KINDS[kind];
      const material = eyeMaterial(spec.iris, spec.pupil, spec.white);
      if (mood.wear > 0.6) material.roughness = 0.35;
      const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 12), material, list.length);
      list.forEach((e, i) => {
        q.setFromUnitVectors(forward, e.dir);
        roll.setFromAxisAngle(forward, kind === 'goat' || kind === 'cat' || kind === 'fox' ? (random() - 0.5) * 0.8 : random() * 6);
        q.multiply(roll);
        const flatten = kind === 'fish' ? 0.6 : 1;
        m.compose(e.at, q, new THREE.Vector3(e.r, e.r, e.r * flatten));
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
    }
    if (wires.length) {
      const wire = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0014, 0.0014, 1, 5), s.material('#8d8f8a', { metalness: 0.8, roughness: 0.4 }), wires.length);
      const d = new THREE.Vector3();
      wires.forEach((w, i) => {
        d.subVectors(w.to, w.from);
        const len = Math.max(d.length(), 1e-4);
        q.setFromUnitVectors(upAxis, d.normalize());
        m.compose(w.from.clone().add(w.to).multiplyScalar(0.5), q, new THREE.Vector3(1, len, 1));
        wire.setMatrixAt(i, m);
      });
      wire.instanceMatrix.needsUpdate = true;
      wire.castShadow = true;
      root.add(wire);
    }

    if (a.labels !== 'none') {
      const tape = a.labels === 'tape';
      for (let i = 0; i < cols; i++) {
        const index = (rows - 1) * cols + i;
        const at: P3 = [-W / 2 + 0.01 + (i + 0.5) * cell, H * 0.55, D / 2 + 0.0008];
        card(root, [labelFor[index]], tape ? 0.06 : 0.055, tape ? 0.013 : 0.02, at, {
          paper: tape ? '#16171a' : a.labels === 'sizes' ? '#d9bd86' : '#f0e8cf', ink: tape ? '#f4f4f0' : a.labels === 'sizes' ? '#5a5046' : '#27306b',
          font: tape ? 'bold' : 'italic', rot: [0, 0, tape ? 0 : (random() - 0.5) * 0.25],
        });
      }
    }
    // Bench clutter that comes with the mood: tweezers and a dusty film.
    if (mood.density > 0.45) {
      const steel = s.material('#b9bec2', { metalness: 0.8, roughness: 0.3 });
      const x = -W / 2 - 0.035, t = random() * 0.5 - 0.25;
      for (const sx of [-1, 1]) part(root, new THREE.BoxGeometry(0.004, 0.002, 0.13), steel, [x + sx * 0.004, 0.003 + (sx > 0 ? 0.002 : 0), 0], 1, [0, t + sx * 0.04, 0]);
    }
    return s.finish();
  },
});
