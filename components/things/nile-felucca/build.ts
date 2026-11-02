import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, paint, paintHex } from '@conjure/kit';

type P = [number, number, number];

const NAMES = { nour: 'NOUR EL NIL', amira: 'AMIRA', habibi: 'HABIBI', salam: 'SALAM 2', king: 'KING TUT' } as const;

/** A triangle of cloth between three points, bellied out along its normal. */
function sailGeometry(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, belly: number, n = 14) {
  const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
  if (normal.x < 0) normal.negate();
  const positions: number[] = [], uvs: number[] = [], index: number[] = [];
  const row: number[][] = [];
  let k = 0;
  for (let i = 0; i <= n; i++) {
    row[i] = [];
    for (let j = 0; j <= n - i; j++) {
      const w2 = i / n, w3 = j / n, w1 = 1 - w2 - w3;
      const p = a.clone().multiplyScalar(w1).addScaledVector(b, w2).addScaledVector(c, w3);
      p.addScaledVector(normal, belly * 27 * w1 * w2 * w3 * 1.1);
      positions.push(p.x, p.y, p.z); uvs.push(w2, w3);
      row[i][j] = k++;
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) {
    index.push(row[i][j], row[i + 1][j], row[i][j + 1]);
    if (j < n - i - 1) index.push(row[i + 1][j], row[i + 1][j + 1], row[i][j + 1]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/** Sailcloth seams, stains and patches. */
function clothMap(patched: boolean, wear: number, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 16; i++) { g.fillStyle = 'rgba(120,100,70,0.18)'; g.fillRect(0, i * 16, 256, 1.5); }
  for (let i = 0; i < 8 + wear * 20; i++) { g.fillStyle = `rgba(110,90,60,${0.05 + random() * 0.1})`; g.beginPath(); g.arc(random() * 256, random() * 256, 6 + random() * 22, 0, Math.PI * 2); g.fill(); }
  if (patched) for (let i = 0; i < 7; i++) {
    g.fillStyle = ['#e0d2b0', '#c9b48a', '#d8d8cc', '#b8a27a', '#e8c8a8'][i % 5];
    const x = random() * 150, y = random() * 150, w = 20 + random() * 40, h = 16 + random() * 34;
    g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(80,60,40,0.5)'; g.setLineDash([3, 3]); g.strokeRect(x, y, w, h);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export default defineThing({
  questions: {
    sail: choice('What is the sail doing?', {
      full: 'Raised and full of wind, the great triangle bellied out.',
      slack: 'Raised but slack, hanging in soft folds in a dead calm.',
      furled: 'Furled: rolled tight along the slanting yard.',
    }),
    patched: noul('Is the sail patched with squares of other cloth?'),
    hull: paint('What colour is the hull painted?', ['white', 'sky', 'blue', 'turquoise', 'green', 'yellow', 'red', 'cream', 'teal', 'navy']),
    band: paint('What colour is the band along the gunwale?', ['red', 'yellow', 'blue', 'green', 'orange', 'white', 'navy', 'magenta']),
    aboard: choice('Who is aboard besides the boatman?', {
      nobody: 'Nobody: the boatman alone at the tiller.',
      tourists: 'Tourists lounging on the cushions under the awning, sun hats on.',
      wedding: 'A wedding party: a bride in white, garlands and a drummer.',
      fisherman: 'A lone fisherman with his nets heaped amidships, no awning.',
    }),
    lanterns: noul('Are lanterns and a string of bulbs lit along the boat?'),
    name: choice('What name is painted on the bow?', {
      nour: 'NOUR EL NIL, light of the Nile.',
      amira: 'AMIRA, princess.',
      habibi: 'HABIBI, my darling.',
      salam: 'SALAM 2, peace, the second of its name.',
      king: 'KING TUT, for the tourists.',
    }),
    moored: noul('Is it tied to a mooring stake rather than drifting free?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const glow = Math.min(1, Math.max(0, lowSun * 1.25 - 0.25));

    const body = s.material(paintHex(a.hull), { roughness: 0.6, side: THREE.DoubleSide });
    const band = s.material(paintHex(a.band), { roughness: 0.55, side: THREE.DoubleSide });
    const wood = s.material(new THREE.Color('#8a6440').lerp(new THREE.Color('#5a4a3a'), wear * 0.5), { roughness: 0.85 });
    const dark = s.material('#2a2622', { roughness: 0.8 });

    // The hull: a lofted shell, broad and shallow, sheer rising to the bow.
    const L = 8;
    const beam = (u: number) => 1.3 * Math.pow(Math.max(0, Math.sin(Math.PI * (0.07 + 0.93 * u))), 0.55);
    const sheer = (u: number) => 0.95 + 0.55 * u ** 3 + 0.18 * (1 - u) ** 3;
    const depth = (u: number) => 0.8 * (0.25 + 0.75 * Math.sin(Math.PI * (0.04 + 0.92 * u)));
    const shell = (v0: number, v1: number) => (u: number, v: number, t: THREE.Vector3) => {
      const th = Math.PI * (v0 + (v1 - v0) * v);
      t.set(-Math.cos(th) * beam(u), sheer(u) - Math.pow(Math.sin(th), 0.6) * depth(u), -L / 2 + u * L);
    };
    s.surface(shell(0.16, 0.84), body, { segments: [32, 12] });
    s.surface(shell(0, 0.16), band, { segments: [32, 3] });
    s.surface(shell(0.84, 1), band, { segments: [32, 3] });
    // Transom at the stern, gunwale rails, floorboards and thwarts.
    {
      const shape = new THREE.Shape();
      for (let i = 0; i <= 12; i++) { const th = (Math.PI * i) / 12; const x = -Math.cos(th) * beam(0), y = sheer(0) - Math.pow(Math.sin(th), 0.6) * depth(0); i ? shape.lineTo(x, y) : shape.moveTo(x, y); }
      shape.closePath();
      s.mesh(new THREE.ShapeGeometry(shape), band, [0, 0, -L / 2]);
    }
    for (const side of [-1, 1]) s.tube(Array.from({ length: 9 }, (_u, i) => { const u = i / 8; return [side * beam(u) * 1.02, sheer(u) + 0.03, -L / 2 + u * L] as P; }), 0.05, wood);
    s.box([1.7, 0.05, 5.4], [0, 0.42, -0.2], wood);
    for (const z of [-2.6, 1.6]) s.box([beam((z + L / 2) / L) * 2 - 0.1, 0.06, 0.25], [0, 0.85, z], wood);
    // The eye at the bow, both sides, and the painted name.
    for (const side of [-1, 1]) {
      const u = 0.86, x = side * (beam(u) + 0.02), y = sheer(u) - 0.32, z = -L / 2 + u * L;
      const eye = s.ball([0.03, 0.12, 0.2], [x, y, z], s.material('#f4f2ec'), 12);
      eye.rotation.y = side * -0.35;
      s.ball([0.04, 0.07, 0.07], [x + side * 0.02, y, z + 0.02], s.material('#1a1a1a'), 8);
      const label = s.label(NAMES[a.name], 1.6, 0.22, [side * (beam(0.62) + 0.03), sheer(0.62) - 0.22, -L / 2 + 0.62 * L], '#f4f2ec', paintHex(a.hull));
      label.rotation.y = side * Math.PI / 2;
    }

    // Rudder and tiller at the stern.
    s.box([0.08, 1.1, 0.5], [0, 0.55, -L / 2 - 0.25], wood);
    s.rod([0, 1.15, -L / 2 - 0.2], [0.1, 1.2, -L / 2 + 1.0], 0.04, wood);

    // Mast, the long slanting yard and the sail.
    const mastZ = 1.3, mastTop = 5.6;
    s.rod([0, 0.4, mastZ], [0, mastTop, mastZ], 0.09, wood, 0.06);
    const furled = a.sail === 'furled';
    // The whole rig swings about the mast, the yard sheeted out to one side when sailing.
    const swing = a.sail === 'full' ? 0.6 + random() * 0.15 : a.sail === 'slack' ? 0.3 : 0.08;
    const swung = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z - mastZ).applyAxisAngle(new THREE.Vector3(0, 1, 0), swing).add(new THREE.Vector3(0, 0, mastZ));
    const tack = swung(0.15, 1.35, L / 2 - 0.4);
    const peak = furled ? swung(0.15, 8.2, -L / 2 + 0.2) : swung(0.15, 11.2, -L / 2 + 0.6);
    s.rod(tack.toArray() as P, peak.toArray() as P, 0.075, wood, 0.04);
    const sailMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f1e9d6').lerp(new THREE.Color('#c9b89a'), wear * 0.6), map: clothMap(a.patched, wear, random), roughness: 0.9, side: THREE.DoubleSide });
    let sail: THREE.Mesh | null = null;
    if (furled) {
      s.tube(Array.from({ length: 6 }, (_u, i) => { const p = tack.clone().lerp(peak, 0.08 + i * 0.17); p.y -= 0.12; p.x += 0.08 + Math.sin(i) * 0.03; return p.toArray() as P; }), 0.17, sailMat);
    } else {
      const clew = swung(a.sail === 'full' ? 0.9 : 0.3, 1.7, -L / 2 + 0.9);
      sail = s.mesh(sailGeometry(tack, peak, clew, a.sail === 'full' ? mix(0.9, 1.5, mood.energy) : 0.35), sailMat);
      s.rod(clew.toArray() as P, [0.6, 1.0, -L / 2 + 0.3], 0.015, dark);
    }
    s.rod([0, mastTop, mastZ], [0, 1.0, -L / 2 + 0.2], 0.012, dark);

    const skins = ['#c9956a', '#a8724b', '#7c5236', '#e2b894'];
    // The boatman sitting at the tiller.
    const boatman = figure(s, { height: 1.75, style: 'doll', pose: 'sitting', hair: 'hood', top: '#e8e2d2', bottom: '#e8e2d2', skin: skins[2], gaze: 'ahead' });
    s.root.add(boatman.root);
    boatman.root.position.set(0.15, 0.45, -L / 2 + 0.55);
    boatman.root.updateMatrixWorld(true);
    boatman.reach('right', new THREE.Vector3(0.1, 1.2, -L / 2 + 1.0), { space: s.root });

    // Awning and cushions, unless it is a working boat.
    const awning = a.aboard !== 'fisherman';
    if (awning) {
      const canopy = s.material(a.aboard === 'wedding' ? '#f4f2ec' : paintHex(a.band), { roughness: 0.9, side: THREE.DoubleSide });
      for (const x of [-0.85, 0.85]) for (const z of [-2.7, -0.3]) s.rod([x, 0.45, z], [x, 2.15, z], 0.035, wood);
      s.box([1.9, 0.04, 2.6], [0, 2.17, -1.5], canopy);
      for (const x of [-1, 1]) s.box([0.02, 0.35, 2.6], [x * 0.95, 2.0, -1.5], canopy);
      const cushionColours = ['#c0392b', '#e8b84a', '#2e6a8a', '#7a3a6a', '#3a7a4a'];
      for (let i = 0; i < 6; i++) s.box([0.55, 0.16, 0.55], [(i % 2 ? 0.5 : -0.5), 0.52, -2.5 + Math.floor(i / 2) * 0.75], s.material(cushionColours[Math.floor(random() * cushionColours.length)], { roughness: 0.95 }));
    }
    const sitter = (x: number, z: number, opts: Parameters<typeof figure>[1], rot: number) => {
      const p = figure(s, { height: 1.65, style: 'doll', pose: 'sitting', ...opts });
      s.root.add(p.root);
      p.root.position.set(x, 0.6, z);
      p.root.rotation.y = rot;
      return p;
    };
    if (a.aboard === 'tourists') {
      sitter(-0.5, -1.4, { hair: 'hat', top: '#e24a3a', bottom: '#d8cfb6', skin: skins[3] }, Math.PI / 2);
      sitter(0.5, -2.0, { hair: 'cap', top: '#3a6ad4', bottom: '#d8cfb6', skin: skins[0] }, -Math.PI / 2);
      sitter(0.5, -0.8, { hair: 'hat', top: '#f2f0e8', bottom: '#5a6a7a', skin: skins[3] }, -Math.PI / 2);
    }
    if (a.aboard === 'wedding') {
      sitter(-0.45, -1.2, { hair: 'long', top: '#fbfaf6', bottom: '#fbfaf6', skin: skins[1] }, Math.PI / 2);
      sitter(0.45, -1.2, { hair: 'short', top: '#1f2228', bottom: '#1f2228', skin: skins[0] }, -Math.PI / 2);
      sitter(0.5, -2.3, { hair: 'cap', top: '#c0392b', bottom: '#e8e2d2', skin: skins[2] }, -Math.PI / 2);
      s.cylinder(0.16, 0.13, 0.35, [0.1, 0.62, -2.3], s.material('#c9a06a'), 12);
      s.scatter(new THREE.SphereGeometry(1, 6, 5), s.material('#ffffff'), Array.from({ length: 40 }, (_u, i) => { const u = 0.15 + (i / 40) * 0.8; return { at: [(i % 2 ? 1 : -1) * beam(u), sheer(u) + 0.06, -L / 2 + u * L] as P, size: 0.08, color: i % 3 ? '#f2a0b8' : '#fbfaf6' }; }));
    }
    if (a.aboard === 'fisherman') {
      s.drape({ size: [1.4, 1.2], at: [0, 0.95, -0.5], over: [{ ball: 0.35, at: [0, 0.45, -0.5] }], floor: 0.45, rumple: 0.8, stiffness: 0.1 }, s.material('#6a7a5a', { roughness: 1 }));
      s.scatter(new THREE.SphereGeometry(1, 6, 5), s.material('#e8d8b0'), Array.from({ length: 6 }, () => ({ at: [(random() - 0.5) * 0.8, 0.55, -0.5 + (random() - 0.5)] as P, size: 0.07 })));
      const fisher = figure(s, { height: 1.7, style: 'doll', pose: 'crouching', hair: 'cap', top: '#6a5a48', bottom: '#4a4038', skin: skins[2], gaze: 'down' });
      s.root.add(fisher.root);
      fisher.root.position.set(0.2, 0.45, 0.4);
      fisher.root.rotation.y = Math.PI * 0.8;
    }

    // Lanterns and a string of bulbs from bow to mast to stern.
    if (a.lanterns) {
      const bulb = new THREE.MeshStandardMaterial({ color: '#fff2c0', emissive: '#ffcc66', emissiveIntensity: mix(0.9, 2.2, glow) });
      const pts: P[] = [];
      const line = (from: THREE.Vector3, to: THREE.Vector3, n: number) => { for (let i = 1; i < n; i++) { const p = from.clone().lerp(to, i / n); p.y -= Math.sin((i / n) * Math.PI) * 0.4; pts.push(p.toArray() as P); } };
      line(new THREE.Vector3(0, sheer(1) + 0.1, L / 2), new THREE.Vector3(0, mastTop - 0.2, mastZ), 10);
      line(new THREE.Vector3(0, mastTop - 0.2, mastZ), new THREE.Vector3(0, 1.3, -L / 2 - 0.1), 12);
      s.scatter(new THREE.SphereGeometry(1, 6, 5), bulb, pts.map((at) => ({ at, size: 0.07 })));
      s.lathe([[0, 0], [0.1, 0.02], [0.13, 0.15], [0.08, 0.3], [0, 0.32]], bulb, [0, 2.6, mastZ + 0.12]);
    }

    // Mooring: a stake on the bank and a line to the bow.
    if (a.moored) {
      s.rod([0.9, -0.3, L / 2 + 1.4], [1.0, 1.3, L / 2 + 1.5], 0.07, wood);
      s.tube([[0, sheer(1), L / 2 - 0.05], [0.5, 0.7, L / 2 + 0.7], [1.0, 1.0, L / 2 + 1.5]], 0.02, s.material('#c9b48a'));
    }

    const energy = mood.energy;
    const hullRoot = new THREE.Group();
    hullRoot.add(...s.root.children);
    s.root.add(hullRoot);
    return s.finish({
      update: (_dt, time) => {
        hullRoot.rotation.z = Math.sin(time * (0.6 + energy)) * 0.015 * (0.4 + energy);
        hullRoot.rotation.x = Math.sin(time * 0.7 + 1) * 0.008 * (0.4 + energy);
        if (sail) sail.scale.x = 1 + Math.sin(time * 1.3) * 0.04 * energy;
      },
    });
  },
});
