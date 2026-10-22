import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const IRIS = {
  blue: 'A matched set of pale blue irises.',
  brown: 'A matched set of warm brown irises.',
  odd: 'An odd assortment: one blue, one brown, one green, nobody related.',
  clouded: 'Milky and clouded over, pupils barely visible.',
  cat: 'Yellow-green with vertical slit pupils, not from a person.',
  glowing: 'Irises that glow faintly from inside, red or sickly green.',
} as const;

type V3 = [number, number, number];

export default defineThing({
  questions: {
    count: choice('How many eyeballs are in the dish?', {
      one: 'A single eye, alone in the middle.',
      pair: 'One matching pair, side by side.',
      three: 'Three, which is one too many.',
      handful: 'Five rolling loose.',
      heaped: 'A heap of eight or nine, piled like grapes.',
    }),
    iris: choice('What are the irises like?', IRIS),
    gaze: choice('Where are the eyes looking?', {
      you: 'All of them up and out at the viewer.',
      each: 'At each other, as if conferring.',
      every: 'In every direction, loose and random.',
      aside: 'All off to one side, at something out of frame.',
      down: 'Down into the dish, averted.',
    }),
    forceps: noul('Is one eye held up by forceps on a clamp stand, hanging by its nerve?'),
    liquid: choice('What is in the dish with them?', {
      dry: 'Nothing: a dry dish.',
      saline: 'A shallow pool of clear saline.',
      formalin: 'Yellowed formalin.',
      blood: 'Thin pink watery blood.',
      green: 'Something luminous green that should not be there.',
    }),
    dish: choice('What is the dish made of?', {
      enamel: 'White enamel with a navy blue rim.',
      steel: 'Polished stainless steel.',
      green: 'Old hospital-green enamel.',
      pink: 'Disposable pink hospital plastic.',
    }),
    label: choice('What does the label taped to the dish say, if anything?', {
      none: 'No label.',
      exhibit: 'EXHIBIT 4',
      donor: 'DONOR',
      lunch: 'NOT LUNCH',
      lr: 'L / R ?',
      keep: 'DO NOT DISCARD',
    }),
    extras: choice('What did someone leave beside the dish?', {
      nothing: 'Nothing but the tray.',
      scalpel: 'A scalpel and a wad of gauze.',
      spoon: 'A teaspoon, inexplicably.',
      jar: 'A lidded specimen jar waiting to be filled.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const A = 0.115, B = 0.06, K = 0.03, H = 0.03;
    const outline = (scale: number, n = 64) => Array.from({ length: n }, (_u, i) => {
      const t = (i / n) * Math.PI * 2;
      return [A * Math.cos(t) * scale, (B * Math.sin(t) - K * Math.cos(t) ** 2 + K * 0.45) * (scale * 0.92 + 0.08)] as const;
    });
    const dishColour = { enamel: '#f3f1e8', steel: '#c9d0d3', green: '#a9c6ae', pink: '#e8a9a6' }[a.dish];
    const dishMat = s.material(dishColour, { side: THREE.DoubleSide, roughness: a.dish === 'steel' ? 0.25 : 0.4, metalness: a.dish === 'steel' ? 0.8 : 0.05 });
    const steel = s.material('#c3cacc', { metalness: 0.8, roughness: 0.3 });
    const dark = s.material('#2c3134', { roughness: 0.6 });

    // Instrument tray under everything.
    const TY = 0.004;
    const cloth = s.box([0.28, TY, 0.185], [0, TY / 2, 0.005], s.material(mood.cheer > 0.5 ? '#7fb3a4' : '#8aa6a0', { roughness: 0.95 }));
    cloth.rotation.y = (random() - 0.5) * 0.12;

    // Dish: flared wall, floor and rolled rim.
    const top = outline(1), bottom = outline(0.8);
    const positions: number[] = [], index: number[] = [];
    const n = top.length;
    for (let i = 0; i < n; i++) {
      positions.push(bottom[i][0], 0, bottom[i][1], top[i][0], H, top[i][1]);
      const j = (i + 1) % n;
      index.push(i * 2, j * 2, i * 2 + 1, i * 2 + 1, j * 2, j * 2 + 1);
    }
    const wall = new THREE.BufferGeometry();
    wall.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    wall.setIndex(index);
    wall.computeVertexNormals();
    const base = TY + 0.001;
    s.mesh(wall, dishMat, [0, base, 0]);
    const floorShape = new THREE.Shape(bottom.map(([x, z]) => new THREE.Vector2(x, -z)));
    const floor = s.mesh(new THREE.ShapeGeometry(floorShape), dishMat, [0, base + 0.001, 0]);
    floor.rotation.x = -Math.PI / 2;
    const rimMat = a.dish === 'enamel' ? s.material('#1f2f66', { roughness: 0.35 }) : dishMat;
    s.tube(top.filter((_p, i) => i % 2 === 0).map(([x, z]) => [x, base + H, z] as V3), 0.0028, rimMat, true);
    if (mood.wear > 0.35 && a.dish !== 'steel' && a.dish !== 'pink') {
      const chips = Math.round(mood.wear * 7);
      for (let i = 0; i < chips; i++) {
        const p = top[Math.floor(random() * n)];
        s.ball([0.005 + random() * 0.004, 0.003, 0.004], [p[0], base + H + 0.001, p[1]], dark, 8);
      }
    }
    if (a.liquid !== 'dry') {
      const tint = { saline: '#cfe6ee', formalin: '#d9c66a', blood: '#d98a8f', green: '#7dff6a' }[a.liquid];
      const level = 0.2;
      const shape = new THREE.Shape(outline(0.8 + 0.2 * level).map(([x, z]) => new THREE.Vector2(x, -z)));
      const pool = s.mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({
        color: tint, transparent: true, opacity: a.liquid === 'saline' ? 0.3 : 0.5, roughness: 0.08, depthWrite: false,
        emissive: a.liquid === 'green' ? '#49ff3a' : '#000000', emissiveIntensity: a.liquid === 'green' ? 0.9 : 0,
      }), [0, base + H * level, 0]);
      pool.rotation.x = -Math.PI / 2;
      pool.castShadow = false;
    }
    if (a.label !== 'none') {
      const text = { exhibit: 'EXHIBIT 4', donor: 'DONOR', lunch: 'NOT LUNCH', lr: 'L / R ?', keep: 'DO NOT DISCARD' }[a.label];
      const tag = s.label(text, 0.085, 0.022, [0.005, base + H * 0.5, B * 0.93 + K * 0.45 + 0.0015], '#1d2430', '#f4edcf');
      tag.rotation.x = -0.24;
      tag.rotation.z = (random() - 0.5) * 0.16;
    }

    // Eyeballs.
    const R = 0.0205;
    const sclera = s.material('#f2efe6', { roughness: 0.22 });
    const pupilMat = s.material(a.iris === 'clouded' ? '#aab3b8' : '#07080a', { roughness: 0.15 });
    const nerveMat = s.material('#b8545a', { roughness: 0.5 });
    const veinMat = s.material('#c2393f', { roughness: 0.5 });
    const irisTint = (i: number) => {
      switch (a.iris) {
        case 'blue': return '#4b86c4';
        case 'brown': return '#6b3d1c';
        case 'odd': return ['#4b86c4', '#6b3d1c', '#4f9a55', '#9aa3ab', '#b98a2a'][i % 5];
        case 'clouded': return '#c9d3d8';
        case 'cat': return '#c9d02c';
        default: return i % 2 ? '#5dff48' : '#ff3b2a';
      }
    };
    const eyeGeo = new THREE.SphereGeometry(R, 24, 16);
    const irisGeo = new THREE.SphereGeometry(R * 1.012, 20, 6, 0, Math.PI * 2, 0, 0.56);
    const makeEye = (i: number) => {
      const eye = new THREE.Group();
      const ball = new THREE.Mesh(eyeGeo, sclera);
      const tint = irisTint(i);
      const iris = new THREE.Mesh(irisGeo, s.material(tint, { roughness: 0.3, emissive: a.iris === 'glowing' ? tint : '#000000', emissiveIntensity: a.iris === 'glowing' ? 1.3 : 0 }));
      iris.rotation.x = Math.PI / 2;
      const pupil = new THREE.Mesh(eyeGeo, pupilMat);
      const pr = a.iris === 'glowing' ? 0.16 : mix(0.3, 0.2, mood.daylight > 0.5 ? 1 - mood.daylight : mood.daylight);
      pupil.scale.set(a.iris === 'cat' ? 0.09 : pr, a.iris === 'cat' ? 0.42 : pr, 0.1);
      pupil.position.z = R * 0.95;
      eye.add(ball, iris, pupil);
      // A few surface veins creeping forward from the back when things are grim or worn.
      const veins = Math.round(mix(0, 5, Math.max(mood.wear, 1 - mood.cheer) * 0.9));
      for (let v = 0; v < veins; v++) {
        const ang = random() * Math.PI * 2, reach = 0.9 + random() * 0.7;
        const pts = [0, 0.5, 1].map((f) => {
          const th = Math.PI - f * reach, wob = ang + (f - 0.5) * (random() - 0.5) * 1.2;
          return new THREE.Vector3(Math.sin(th) * Math.cos(wob), Math.sin(th) * Math.sin(wob), Math.cos(th)).multiplyScalar(R * 1.005);
        });
        const vein = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, R * 0.035, 4), veinMat);
        eye.add(vein);
      }
      eye.traverse((m) => { m.castShadow = true; });
      return eye;
    };
    const total = { one: 1, pair: 2, three: 3, handful: 5, heaped: 8 + Math.floor(random() * 2) }[a.count];
    const hung = a.forceps;
    const inDish = hung ? Math.max(total - 1, 0) : total;
    const spots: THREE.Vector3[] = [];
    const lower = Math.min(inDish, 6);
    const midline = (x: number) => (-K * (x / (A * 0.8)) ** 2 + K * 0.45) * 0.816;
    const front = lower <= 3 ? lower : Math.ceil(lower / 2);
    for (let i = 0; i < inDish; i++) {
      let p: THREE.Vector3;
      if (i < lower) {
        const inFront = i < front, row = inFront ? front : lower - front, k = inFront ? i : i - front;
        const x = (k - (row - 1) / 2) * R * 2.2 + (random() - 0.5) * 0.004 + (inFront || lower <= 3 ? 0 : R * 0.4);
        const z = lower <= 3 ? (random() - 0.5) * 0.01 : inFront ? R * 0.98 : -R * 0.98;
        p = new THREE.Vector3(x, base + R + 0.001, midline(x) + z);
      } else {
        const k = i - lower;
        p = spots[k].clone().add(spots[Math.min(lower - 1, k + front)]).add(spots[Math.min(front - 1, k + 1)]).multiplyScalar(1 / 3);
        p.y = base + R * 2.45;
      }
      spots.push(p);
    }
    const viewer = new THREE.Vector3(0, 0.62, 0.78);
    const side = new THREE.Vector3(random() < 0.5 ? -1 : 1, 0.25, 0.35).normalize();
    const gazeOf = (p: THREE.Vector3, i: number, all: THREE.Vector3[]) => {
      switch (a.gaze) {
        case 'you': return viewer.clone();
        case 'aside': return side.clone();
        case 'down': return new THREE.Vector3((random() - 0.5) * 0.6, -0.5, 0.75).normalize();
        case 'each': {
          if (all.length < 2) return viewer.clone();
          const other = all[(i + (i % 2 ? -1 : 1) + all.length) % all.length];
          return other.clone().sub(p).setY(0.012).add(new THREE.Vector3(0, 0, 0.012)).normalize();
        }
        default: return new THREE.Vector3(random() - 0.5, random() * 0.9 - 0.1, random() - 0.3).normalize();
      }
    };
    const eyes: { eye: THREE.Group; home: THREE.Quaternion; phase: number }[] = [];
    const forward = new THREE.Vector3(0, 0, 1);
    const tipPoint = new THREE.Vector3(-0.055, base + H + 0.085, 0.004);
    const allSpots = hung ? [...spots, tipPoint.clone().setY(base + H + 0.05)] : spots;
    spots.forEach((p, i) => {
      const eye = makeEye(i);
      const gaze = gazeOf(p, i, allSpots);
      eye.position.copy(p);
      eye.quaternion.setFromUnitVectors(forward, gaze);
      s.root.add(eye);
      eyes.push({ eye, home: eye.quaternion.clone(), phase: random() * 6.28 });
      const start = p.clone().addScaledVector(gaze, -R * 0.95);
      const mid = start.clone().addScaledVector(gaze, -R * 0.9); mid.y = Math.max(mid.y - R * 0.3, base + 0.004);
      const ang = random() * Math.PI * 2;
      const end = mid.clone().add(new THREE.Vector3(Math.cos(ang) * R * 1.6, 0, Math.sin(ang) * R * 1.2 - R)); end.y = base + 0.004;
      s.tube([start.toArray() as V3, mid.toArray() as V3, end.toArray() as V3], R * 0.17, nerveMat);
    });

    // Clamp stand, forceps and the hanging eye.
    let swing: THREE.Group | null = null;
    if (hung) {
      const sx = -0.15, sz = -0.06, top = tipPoint.y + 0.05;
      s.box([0.085, 0.01, 0.06], [sx, TY + 0.005, sz], dark);
      s.rod([sx, TY, sz], [sx, top + 0.02, sz], 0.004, steel);
      s.box([0.016, 0.016, 0.016], [sx, top, sz], dark);
      const grip: V3 = [tipPoint.x - 0.03, top, sz + 0.03];
      s.rod([sx, top, sz], grip, 0.003, steel);
      s.box([0.014, 0.012, 0.014], grip, dark);
      for (const off of [-1, 1]) {
        s.rod([grip[0] + off * 0.006, grip[1] + 0.012, grip[2] - 0.008], [tipPoint.x + off * 0.0008, tipPoint.y, tipPoint.z], 0.0024, steel, 0.0012);
      }
      swing = new THREE.Group();
      swing.position.copy(tipPoint);
      const drop = 0.04;
      const eye = makeEye(total - 1);
      eye.position.set(0, -drop - R * 0.9, 0);
      const gaze = a.gaze === 'down' ? new THREE.Vector3(0, -0.75, 0.66) : a.gaze === 'aside' ? side : a.gaze === 'every' ? new THREE.Vector3(0.5, 0.1, 0.85).normalize() : a.gaze === 'each' && spots.length ? spots[0].clone().sub(new THREE.Vector3(tipPoint.x, tipPoint.y - drop, tipPoint.z)).normalize() : new THREE.Vector3(0, 0.15, 0.99).normalize();
      eye.quaternion.setFromUnitVectors(forward, gaze);
      const back = gaze.clone().multiplyScalar(-R * 0.95).add(eye.position);
      const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0), new THREE.Vector3(back.x * 0.5, -drop * 0.55, back.z * 0.6), back.clone().addScaledVector(gaze, -R * 0.5), back,
      ]), 20, R * 0.17, 6), nerveMat);
      cord.castShadow = true;
      swing.add(eye, cord);
      s.root.add(swing);
      if (a.liquid !== 'dry') s.ball([0.003, 0.0045, 0.003], [tipPoint.x, tipPoint.y - drop - R * 2 - 0.006, tipPoint.z], nerveMat, 8);
    }

    // Beside the dish.
    if (a.extras === 'scalpel') {
      s.rod([0.07, TY + 0.004, 0.085], [0.135, TY + 0.004, 0.07], 0.003, steel);
      s.box([0.03, 0.0012, 0.008], [0.056, TY + 0.004, 0.088], steel).rotation.y = 0.27;
      const gauze = s.material('#f4f1ea', { roughness: 0.95 });
      for (let i = 0; i < 3; i++) s.box([0.04, 0.004, 0.04], [-0.115 + random() * 0.01, TY + 0.002 + i * 0.004, 0.075], gauze).rotation.y = random();
      if (mood.cheer < 0.6) s.ball([0.01, 0.002, 0.008], [-0.11, TY + 0.014, 0.077], s.material('#9c2f36'), 8);
    } else if (a.extras === 'spoon') {
      s.rod([0.05, TY + 0.004, 0.088], [0.13, TY + 0.004, 0.078], 0.0025, steel);
      s.ball([0.017, 0.004, 0.012], [0.036, TY + 0.005, 0.09], steel, 12);
    } else if (a.extras === 'jar') {
      const glass = new THREE.MeshStandardMaterial({ color: '#dfeef0', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false });
      s.cylinder(0.026, 0.026, 0.06, [0.125, TY + 0.03, -0.06], glass, 20);
      s.cylinder(0.028, 0.028, 0.012, [0.125, TY + 0.066, -0.06], dark, 20);
      s.label('SPEC.', 0.03, 0.014, [0.125, TY + 0.03, -0.0335], '#1d2430', '#f4edcf');
    }

    const energy = mood.energy;
    const q = new THREE.Quaternion(), e = new THREE.Euler();
    return s.finish({
      update: (_dt, time) => {
        for (const { eye, home, phase } of eyes) {
          const t = time * mix(0.3, 2.6, energy) + phase;
          // Saccades: hold, then jump, rather than a smooth drift.
          const step = Math.floor(t), hash = Math.sin(step * 12.9898 + phase * 78.233) * 43758.5453;
          const jx = (hash - Math.floor(hash) - 0.5), jy = (Math.sin(step * 4.1 + phase) * 0.5);
          e.set(jy * 0.3 * energy, jx * 0.5 * energy, 0);
          eye.quaternion.copy(home).multiply(q.setFromEuler(e));
        }
        if (swing) {
          swing.rotation.z = Math.sin(time * 2.1) * mix(0.02, 0.28, energy);
          swing.rotation.x = Math.sin(time * 1.3 + 1) * mix(0.01, 0.12, energy);
        }
      },
    });
  },
});
// r2
// r3
