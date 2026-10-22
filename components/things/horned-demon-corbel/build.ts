import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const STONE = { limestone: '#cdc3a8', sandstone: '#b98562', basalt: '#66686b', marble: '#e4e0d6' } as const;
const FACES = {
  leering: { mw: 0.62, mh: 0.11, my: -0.4, curve: 0.2, frown: 0.6, lids: 0 },
  screaming: { mw: 0.4, mh: 0.3, my: -0.5, curve: 0, frown: 1, lids: 0 },
  tongue: { mw: 0.5, mh: 0.17, my: -0.45, curve: 0.08, frown: 0.35, lids: 0 },
  bored: { mw: 0.42, mh: 0.05, my: -0.46, curve: -0.07, frown: 0, lids: 0.62 },
  laughing: { mw: 0.58, mh: 0.22, my: -0.42, curve: 0.24, frown: 0.1, lids: 0.45 },
} as const;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A tube that narrows along its length, for horns, tongues and legs. */
function taperTube(points: readonly THREE.Vector3[], from: number, to: number, upTo = 1, sides = 9) {
  const curve = new THREE.CatmullRomCurve3([...points]);
  const steps = 26;
  const frames = curve.computeFrenetFrames(steps, false);
  const position: number[] = [], index: number[] = [];
  const at = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * upTo;
    curve.getPoint(t, at);
    const radius = from + (to - from) * t;
    const n = frames.normals[Math.round(t * steps)], b = frames.binormals[Math.round(t * steps)];
    for (let k = 0; k < sides; k++) {
      const angle = (k / sides) * Math.PI * 2;
      position.push(at.x + (n.x * Math.cos(angle) + b.x * Math.sin(angle)) * radius, at.y + (n.y * Math.cos(angle) + b.y * Math.sin(angle)) * radius, at.z + (n.z * Math.cos(angle) + b.z * Math.sin(angle)) * radius);
    }
  }
  for (let i = 0; i < steps; i++) for (let k = 0; k < sides; k++) {
    const a = i * sides + k, b = i * sides + ((k + 1) % sides), c = a + sides, d = b + sides;
    index.push(a, c, b, b, c, d);
  }
  // Cap the far end.
  curve.getPoint(upTo, at);
  position.push(at.x, at.y, at.z);
  const tip = position.length / 3 - 1;
  for (let k = 0; k < sides; k++) index.push(steps * sides + k, tip, steps * sides + ((k + 1) % sides));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    horns: choice('What kind of horns does it have?', {
      ram: 'Heavy ram horns curling back and round beside the ears.',
      goat: 'Two long goat spikes sweeping up and out.',
      bull: 'Thick bull horns thrust sideways and hooked up at the tips.',
      nubs: 'Short blunt budding horns, a young devil.',
      snapped: 'Long horns, but one has been snapped off to a stump.',
    }),
    expression: choice('What face is it pulling?', {
      leering: 'A wide thin leer, corners of the mouth pulled up, brows down.',
      screaming: 'Screaming, the mouth a tall black hole.',
      tongue: 'Sticking its tongue out at the congregation.',
      bored: 'Bored: heavy lids, flat mouth, eight hundred years of the same view.',
      laughing: 'Laughing, mouth open in a big toothy crescent.',
    }),
    holds: choice('What does it hold in its mouth?', {
      nothing: 'Nothing.',
      ring: 'A heavy iron ring, like a door knocker.',
      spout: 'A lead spout, pouring a thin stream of water.',
      sinner: 'The kicking legs of a sinner it is swallowing.',
      candle: 'A candle stuck on its lower lip, wax down its chin.',
      bone: 'A long bone clamped crosswise in its teeth, like a dog.',
    }),
    eyes: noul('Do its eyes glow?'),
    ears: choice('What ears does it have?', {
      pointed: 'Small pointed ears.',
      bat: 'Big spread bat ears.',
      lop: 'Drooping pig ears.',
      lost: 'None; weathered or knocked away.',
    }),
    stone: choice('What is it carved from?', {
      limestone: 'Pale honey limestone.',
      sandstone: 'Red sandstone.',
      basalt: 'Dark grey volcanic stone.',
      marble: 'White marble.',
    }),
    mount: choice('What does it project from?', {
      wall: 'A flat block of coursed masonry wall.',
      pier: 'A round pier, the head at the top of the shaft.',
      arch: 'The springing of an arch, a curved rib rising from the ledge above it.',
    }),
    history: choice('What has happened to it over the centuries?', {
      crisp: 'Nothing much; the carving is still sharp.',
      noseless: 'Its nose was knocked off by someone who disapproved.',
      painted: 'Traces of its old paint survive: red mouth, gilded horns.',
      whitewashed: 'It was limewashed over, and the wash is flaking off.',
      nested: 'Birds have built a nest of twigs between its horns.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const R = 0.39; // head radius, metres
    const headY = 0.66, headZ = 0.28;
    const g = new THREE.Group();
    g.position.set(0, headY, headZ);
    g.scale.setScalar(R);
    s.root.add(g);
    const mesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number] = [0, 0, 0]) => {
      const m = new THREE.Mesh(geometry, material);
      m.position.set(...at);
      m.castShadow = m.receiveShadow = true;
      parent.add(m);
      return m;
    };

    const base = new THREE.Color(STONE[a.stone]).lerp(new THREE.Color(mood.warmth > 0.5 ? '#c9a070' : '#9aa3a8'), Math.abs(mood.warmth - 0.5) * 0.35);
    const mossAmount = mood.wear * mix(1, 0.55, mood.warmth);
    const sootAmount = (1 - mood.cheer) * 0.35 + (a.holds === 'candle' ? 0.25 : 0);
    const moss = new THREE.Color('#5d7a3c'), soot = new THREE.Color('#2a2624'), wash = new THREE.Color('#f1eee4');
    const face = { ...FACES[a.expression] } as { mw: number; mh: number; my: number; curve: number; frown: number; lids: number };
    if (a.holds !== 'nothing') face.mh = Math.max(face.mh, a.holds === 'sinner' ? 0.2 : 0.15);
    const nose = a.history === 'noseless' ? -0.06 : 1;
    const o = [random() * 9, random() * 9, random() * 9];
    const noiseAt = (d: THREE.Vector3) => 0.5 + 0.3 * Math.sin(d.x * 5 + o[0]) * Math.sin(d.y * 6 + o[1]) + 0.2 * Math.sin(d.z * 9 + o[2]) * Math.sin(d.x * 11 + o[1]);
    const stoneTint = (d: THREE.Vector3, up: number, hollow = 0) => {
      const n = noiseAt(d);
      const tint = base.clone().multiplyScalar(mix(0.9, 1.06, n));
      if (a.history === 'whitewashed') tint.lerp(wash, smooth(0.38, 0.5, n + mood.wear * -0.12) * 0.9);
      tint.lerp(soot, sootAmount * smooth(0.2, 0.9, n) * 0.8);
      tint.lerp(moss, mossAmount * smooth(0.1, 0.7, up) * smooth(0.35, 0.6, n));
      return tint.lerp(new THREE.Color('#1c1815'), hollow * 0.85);
    };

    const cTemp = new THREE.Vector3();
    const carve = (direction: THREE.Vector3) => {
      const d = direction.clone().normalize();
      const p = new THREE.Vector3(d.x, d.y * 1.08, d.z * (d.z > 0 ? 1 : 0.6));
      if (d.y < 0) p.x *= 1 - 0.25 * d.y * d.y;
      let dark = 0, mouth = 0;
      if (d.z > 0) {
        const ax = Math.abs(d.x);
        const browY = 0.42 - face.frown * 0.17 * (1 - Math.min(1, ax / 0.6));
        const brow = Math.exp(-(((d.y - browY) / 0.09) ** 2)) * smooth(0.95, 0.5, ax);
        p.z += 0.2 * brow;
        for (const side of [-1, 1]) {
          const k = 1 - smooth(0.1, 0.27, d.angleTo(cTemp.set(side * 0.36, 0.16, 0.9).normalize()));
          p.z -= 0.2 * k;
          dark = Math.max(dark, k * 0.7);
          const cheek = Math.exp(-((d.angleTo(cTemp.set(side * 0.56, -0.12, 0.75).normalize()) / 0.22) ** 2));
          p.addScaledVector(cTemp, 0.13 * cheek);
        }
        const bridge = Math.exp(-((d.x / 0.17) ** 2) - ((d.y + 0.06) / 0.2) ** 2);
        p.z += 0.3 * nose * bridge;
        if (nose < 0) dark = Math.max(dark, bridge * 0.25);
        const mx = d.x / face.mw;
        if (Math.abs(mx) < 1.6) {
          const cy = face.my + face.curve * mx * mx;
          const my = (d.y - cy) / (face.mh * (1 - 0.5 * Math.min(1, mx * mx)) + 0.02);
          const reach = Math.max(Math.abs(mx), Math.abs(my));
          const k = 1 - smooth(0.6, 1.1, reach);
          p.z -= 0.36 * k;
          dark = Math.max(dark, k);
          mouth = k;
          p.z += 0.08 * Math.exp(-(((reach - 1.2) / 0.2) ** 2));
        }
        p.z += 0.1 * Math.exp(-((d.x / 0.3) ** 2) - ((d.y + 0.86) / 0.14) ** 2);
      }
      return { p, dark, mouth, d };
    };

    // The head.
    const geometry = new THREE.SphereGeometry(1, 64, 44);
    const position = geometry.attributes.position as THREE.BufferAttribute;
    const colours = new Float32Array(position.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) {
      const { p, dark, mouth, d } = carve(v.fromBufferAttribute(position, i));
      position.setXYZ(i, p.x, p.y, p.z);
      const tint = stoneTint(d, d.y, dark);
      if (a.history === 'painted') tint.lerp(new THREE.Color('#9c2f24'), mouth * 0.8);
      colours.set([tint.r, tint.g, tint.b], i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    geometry.computeVertexNormals();
    const roughness = a.stone === 'marble' ? 0.55 : 0.95;
    const carved = new THREE.MeshStandardMaterial({ vertexColors: true, roughness });
    const stone = new THREE.MeshStandardMaterial({ color: stoneTint(new THREE.Vector3(0.3, 0.2, 0.5), 0), roughness });
    const stoneDark = new THREE.MeshStandardMaterial({ color: stoneTint(new THREE.Vector3(0.1, 0.7, 0.2), 0).multiplyScalar(0.8), roughness });
    mesh(g, geometry, carved);
    const surfaceAt = (x: number, y: number) => carve(new THREE.Vector3(x, y, Math.sqrt(Math.max(0.01, 1 - x * x - y * y)))).p;

    // Eyes: bulging carved balls with drilled pupils, lids for the weary.
    const glowColour = mood.warmth > 0.4 ? '#ff6a1c' : '#9dff5a';
    const eyeMaterial = a.eyes
      ? new THREE.MeshStandardMaterial({ color: glowColour, emissive: glowColour, emissiveIntensity: 2.2, roughness: 0.4 })
      : stone;
    for (const side of [-1, 1]) {
      const at = carve(new THREE.Vector3(side * 0.36, 0.16, 0.9)).p;
      const ball = mesh(g, new THREE.SphereGeometry(0.135, 14, 10), eyeMaterial, [at.x, at.y, at.z + 0.03]);
      if (a.eyes) ball.castShadow = false;
      mesh(g, new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshStandardMaterial({ color: a.eyes ? '#fff3c4' : '#1c1815', emissive: a.eyes ? '#fff3c4' : '#000000', emissiveIntensity: a.eyes ? 2 : 0 }), [at.x - side * 0.02, at.y - 0.02, at.z + 0.145]);
      if (face.lids > 0) {
        const lid = mesh(g, new THREE.SphereGeometry(0.15, 14, 8, 0, Math.PI * 2, 0, Math.PI * face.lids), stone, [at.x, at.y, at.z + 0.03]);
        lid.rotation.x = 0.35;
      }
    }

    // Teeth along the lips.
    const toothMaterial = new THREE.MeshStandardMaterial({ color: a.history === 'painted' ? '#efe6cf' : base.clone().multiplyScalar(1.08), roughness: 0.8 });
    const toothy = a.expression === 'leering' || a.expression === 'screaming' || a.expression === 'laughing' || a.holds === 'bone';
    if (toothy) for (const upper of [true, false]) {
      if (!upper && a.expression === 'leering') continue;
      const count = 7;
      for (let i = 0; i < count; i++) {
        if (random() < mood.wear * 0.3) continue;
        const mx = ((i - (count - 1) / 2) / (count / 2)) * 0.82;
        const half = face.mh * (1 - 0.5 * mx * mx) + 0.02;
        const y = face.my + face.curve * mx * mx + (upper ? half : -half) * 0.92;
        const x = mx * face.mw;
        const lip = surfaceAt(x, y + (upper ? 0.1 : -0.1));
        const fang = i === 1 || i === count - 2;
        const length = Math.min(half * 1.5, (fang ? 0.2 : 0.11) * mix(0.8, 1.2, random()));
        const tooth = mesh(g, new THREE.ConeGeometry(fang ? 0.055 : 0.048, length, 5), toothMaterial, [x * (1 - 0.25 * y * y), y * 1.08 + (upper ? -length / 2 : length / 2), lip.z - 0.17]);
        if (upper) tooth.rotation.x = Math.PI;
      }
    }
    const lipY = (face.my - face.mh) * 1.08, mouthZ = surfaceAt(0, face.my - face.mh - 0.12).z;

    // Tongue.
    const fleshy = a.history === 'painted' ? new THREE.MeshStandardMaterial({ color: '#b0382c', roughness: 0.8 }) : stone;
    if (a.expression === 'tongue' && a.holds !== 'sinner' && a.holds !== 'spout') {
      const tongue = mesh(g, taperTube([new THREE.Vector3(0, face.my * 1.08, 0.45), new THREE.Vector3(0, lipY + 0.06, mouthZ - 0.02), new THREE.Vector3(0, lipY - 0.22, mouthZ + 0.12), new THREE.Vector3(0, lipY - 0.5, mouthZ + 0.05)], 0.12, 0.09), fleshy);
      tongue.scale.x = 1.7;
    }

    // What it holds.
    const iron = new THREE.MeshStandardMaterial({ color: new THREE.Color('#3f3c3b').lerp(new THREE.Color('#8a4a2a'), mood.wear * 0.5), roughness: 0.7, metalness: 0.6 });
    let flame: THREE.Mesh | null = null, legs: THREE.Group | null = null, stream: THREE.Mesh | null = null;
    const groundY = -headY / R;
    if (a.holds === 'ring') {
      const ring = mesh(g, new THREE.TorusGeometry(0.34, 0.05, 8, 28), iron, [0, lipY - 0.2, mouthZ + 0.04]);
      ring.rotation.x = 0.18;
    } else if (a.holds === 'spout') {
      const lead = new THREE.MeshStandardMaterial({ color: '#7d8388', roughness: 0.5, metalness: 0.5 });
      const end = new THREE.Vector3(0, lipY + 0.08, mouthZ + 0.55);
      mesh(g, taperTube([new THREE.Vector3(0, face.my * 1.08, 0.4), new THREE.Vector3(0, lipY + 0.14, mouthZ), end], 0.1, 0.085, 1, 10), lead);
      const water = new THREE.MeshStandardMaterial({ color: '#a9d6e8', emissive: '#4f8fa8', emissiveIntensity: 0.5, transparent: true, opacity: 0.6, roughness: 0.1, depthWrite: false });
      const width = mix(0.02, 0.055, mood.energy);
      stream = mesh(g, taperTube([end, end.clone().add(new THREE.Vector3(0, -0.12, 0.3)), end.clone().add(new THREE.Vector3(0, -0.9, 0.62)), new THREE.Vector3(0, groundY + 0.02, end.z + 0.85)], width, width * 1.5, 1, 7), water);
      stream.castShadow = false;
      const puddle = mesh(g, new THREE.CylinderGeometry(0.5, 0.5, 0.02, 20), water, [0, groundY + 0.02, end.z + 0.85]);
      puddle.castShadow = false;
      if (mood.wear > 0.3) mesh(g, new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: '#4c6a45', roughness: 1 }), [0, lipY - 0.2, mouthZ - 0.02]).scale.set(0.16, 0.3, 0.05);
    } else if (a.holds === 'sinner') {
      legs = new THREE.Group();
      legs.position.set(0, lipY + 0.1, mouthZ - 0.1);
      const body = a.history === 'painted' ? new THREE.MeshStandardMaterial({ color: '#d9a98c', roughness: 0.8 }) : new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(1.1), roughness });
      for (const side of [-1, 1]) {
        const kick = side * 0.12 + jitter(0.12);
        const knee = new THREE.Vector3(side * 0.13, -0.1, 0.42), foot = new THREE.Vector3(side * 0.16 + kick, -0.62, 0.5 + side * 0.14);
        mesh(legs, taperTube([new THREE.Vector3(side * 0.1, 0.05, 0), knee, foot], 0.1, 0.065), body);
        mesh(legs, new THREE.SphereGeometry(1, 10, 8), body, [foot.x, foot.y - 0.04, foot.z + 0.09]).scale.set(0.075, 0.07, 0.15);
      }
      g.add(legs);
    } else if (a.holds === 'candle') {
      const wax = new THREE.MeshStandardMaterial({ color: '#ede3c4', roughness: 0.6, emissive: '#7a5a20', emissiveIntensity: 0.3 });
      const tall = mix(0.22, 0.5, random());
      const cx = jitter(0.12), cz = mouthZ - 0.02, cy = lipY + 0.05;
      mesh(g, new THREE.CylinderGeometry(0.06, 0.07, tall, 10), wax, [cx, cy + tall / 2, cz]);
      for (let i = 0; i < 5; i++) { const len = mix(0.12, 0.5, random()); mesh(g, new THREE.CylinderGeometry(0.03, 0.018, len, 6), wax, [cx + jitter(0.1), cy - len / 2 + 0.04, cz + 0.05 + jitter(0.02)]); }
      mesh(g, new THREE.SphereGeometry(1, 10, 6), wax, [cx, cy, cz]).scale.set(0.16, 0.05, 0.1);
      flame = mesh(g, new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffe2a0', emissive: '#ff9a2a', emissiveIntensity: 2.6 }), [cx, cy + tall + 0.11, cz]);
      flame.scale.set(0.045, 0.11, 0.045);
      flame.castShadow = false;
      const halo = mesh(g, new THREE.SphereGeometry(0.26, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffc46a', transparent: true, opacity: 0.16, depthWrite: false }), [cx, cy + tall + 0.11, cz]);
      halo.castShadow = false;
    } else if (a.holds === 'bone') {
      const boneMaterial = new THREE.MeshStandardMaterial({ color: '#e6dcc0', roughness: 0.7 });
      const y = face.my * 1.08, z = mouthZ - 0.1;
      const shaft = mesh(g, new THREE.CylinderGeometry(0.055, 0.06, 1.7, 8), boneMaterial, [0, y, z]);
      shaft.rotation.z = Math.PI / 2 + jitter(0.12);
      for (const end of [-1, 1]) for (const k of [-1, 1]) mesh(g, new THREE.SphereGeometry(0.085, 8, 6), boneMaterial, [end * 0.85, y + k * 0.05 + end * Math.sin(shaft.rotation.z - Math.PI / 2) * 0.85, z]);
    }

    // Ears.
    if (a.ears !== 'lost') for (const side of [-1, 1]) {
      const ear = new THREE.Group();
      if (a.ears === 'pointed') {
        mesh(ear, new THREE.ConeGeometry(0.17, 0.5, 8), stone, [0, 0.2, 0]).scale.z = 0.5;
        ear.rotation.z = -side * 0.75;
      } else if (a.ears === 'bat') {
        mesh(ear, new THREE.ConeGeometry(0.36, 0.85, 3), stone, [0, 0.36, 0]).scale.z = 0.25;
        mesh(ear, new THREE.ConeGeometry(0.2, 0.6, 3), stoneDark, [0, 0.3, 0.04]).scale.z = 0.2;
        ear.rotation.z = -side * 1.0;
      } else {
        mesh(ear, new THREE.SphereGeometry(1, 10, 8), stone, [0, -0.1, 0]).scale.set(0.2, 0.32, 0.1);
        ear.rotation.z = -side * 1.9;
      }
      ear.position.set(side * 0.9, a.ears === 'lop' ? 0.2 : 0.12, 0.12);
      ear.rotation.y = side * 0.35;
      g.add(ear);
    }

    // Horns.
    const hornMaterial = a.history === 'painted'
      ? new THREE.MeshStandardMaterial({ color: new THREE.Color('#d2a83c').lerp(base, 0.3 + mood.wear * 0.4), roughness: 0.5, metalness: 0.5 })
      : new THREE.MeshStandardMaterial({ color: stoneTint(new THREE.Vector3(0.5, 0.6, 0.2), mossAmount > 0.5 ? 0.6 : 0).multiplyScalar(0.93), roughness });
    const hornPath = (kind: string, side: number): [THREE.Vector3[], number, number] => {
      if (kind === 'ram') {
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= 12; i++) {
          const t = i / 12, phi = t * Math.PI * 2 * 1.12, r = 0.72 * (1 - 0.42 * t);
          points.push(new THREE.Vector3(side * (0.7 + 0.6 * t), 0.2 + Math.cos(phi) * r, 0.1 - Math.sin(phi) * r));
        }
        return [points, 0.3, 0.05];
      }
      if (kind === 'goat') return [[new THREE.Vector3(side * 0.5, 0.72, 0.2), new THREE.Vector3(side * 1.08, 1.02, 0.32), new THREE.Vector3(side * 1.38, 1.62, 0.36), new THREE.Vector3(side * 1.46, 2.25, 0.3)], 0.19, 0.02];
      if (kind === 'bull') return [[new THREE.Vector3(side * 0.55, 0.66, 0.2), new THREE.Vector3(side * 1.3, 0.62, 0.26), new THREE.Vector3(side * 1.85, 0.9, 0.45), new THREE.Vector3(side * 1.98, 1.42, 0.7)], 0.24, 0.03];
      return [[new THREE.Vector3(side * 0.45, 0.75, 0.25), new THREE.Vector3(side * 0.6, 1.0, 0.3), new THREE.Vector3(side * 0.7, 1.18, 0.33)], 0.19, 0.06];
    };
    const kind = a.horns === 'snapped' ? (random() < 0.5 ? 'goat' : 'bull') : a.horns;
    const brokenSide = random() < 0.5 ? -1 : 1;
    for (const side of [-1, 1]) {
      const [points, from, to] = hornPath(kind, side);
      const upTo = a.horns === 'snapped' && side === brokenSide ? mix(0.25, 0.4, random()) : 1;
      mesh(g, taperTube(points, from, to, upTo, 10), hornMaterial);
      if (kind !== 'nubs' && upTo === 1) {
        const curve = new THREE.CatmullRomCurve3(points);
        for (let i = 1; i < 8; i++) {
          const t = i / 9;
          const band = mesh(g, new THREE.TorusGeometry((from + (to - from) * t) * 1.06, 0.022, 5, 12), hornMaterial, curve.getPoint(t).toArray() as [number, number, number]);
          band.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), curve.getTangent(t));
        }
      }
    }
    if (a.history === 'nested') {
      const twig = new THREE.MeshStandardMaterial({ color: '#6f5637', roughness: 1 });
      const nest = new THREE.Group();
      for (let i = 0; i < 26; i++) {
        const angle = random() * Math.PI * 2, r = mix(0.2, 0.36, random());
        const stick = mesh(nest, new THREE.CylinderGeometry(0.014, 0.014, mix(0.3, 0.55, random()), 4), twig, [Math.cos(angle) * r, jitter(0.05), Math.sin(angle) * r]);
        stick.rotation.set(Math.PI / 2 + jitter(0.3), 0, angle + Math.PI / 2 + jitter(0.4));
        stick.rotation.order = 'ZXY';
      }
      for (let i = 0; i < 3; i++) mesh(nest, new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#cfe1e0', roughness: 0.5 }), [jitter(0.1), 0.05, jitter(0.1)]).scale.set(0.07, 0.09, 0.07);
      nest.position.set(0, 1.04, 0.42);
      g.add(nest);
    }

    // Chin taper down into the wall, and the ledge it carries.
    const foot = mesh(s.root, new THREE.SphereGeometry(1, 16, 12), stone, [0, headY - 0.34, 0.07]);
    foot.scale.set(0.2, 0.26, 0.2);
    const ledgeY = headY + R * 1.08 + 0.01;
    mesh(s.root, new THREE.BoxGeometry(0.44, 0.05, 0.2), stoneDark, [0, ledgeY + 0.025, 0.1]);
    mesh(s.root, new THREE.BoxGeometry(0.54, 0.07, 0.26), stone, [0, ledgeY + 0.085, 0.12]);

    // What it projects from.
    const wallHeight = 1.4;
    if (a.mount === 'pier') {
      mesh(s.root, new THREE.CylinderGeometry(0.34, 0.34, wallHeight, 28), stone, [0, wallHeight / 2, -0.26]);
      for (let i = 1; i < 5; i++) mesh(s.root, new THREE.CylinderGeometry(0.343, 0.343, 0.008, 28), stoneDark, [0, i * 0.27 + jitter(0.01), -0.26]);
      mesh(s.root, new THREE.CylinderGeometry(0.4, 0.35, 0.07, 28), stoneDark, [0, wallHeight + 0.035, -0.26]);
    } else {
      mesh(s.root, new THREE.BoxGeometry(1.0, wallHeight, 0.16), stone, [0, wallHeight / 2, -0.06]);
      for (let row = 1; row < 7; row++) {
        const y = row * 0.2 + jitter(0.008);
        mesh(s.root, new THREE.BoxGeometry(1.002, 0.008, 0.162), stoneDark, [0, y, -0.06]);
        for (let i = 0; i < 2; i++) mesh(s.root, new THREE.BoxGeometry(0.008, 0.2, 0.162), stoneDark, [-0.34 + i * 0.48 + (row % 2) * 0.18 + jitter(0.03), y - 0.1, -0.06]);
      }
      if (a.mount === 'arch') {
        // Two ribs spring from the ledge and part, as at the foot of a vault.
        mesh(s.root, new THREE.BoxGeometry(1.0, 0.62, 0.16), stone, [0, wallHeight + 0.31, -0.06]);
        for (const side of [-1, 1]) {
          const rib = mesh(s.root, new THREE.TorusGeometry(0.5, 0.06, 8, 18, 1.15), stoneDark, [side * 0.5, ledgeY + 0.12, 0.09]);
          rib.rotation.z = side > 0 ? Math.PI - 1.15 : 0;
        }
      }
    }
    // Moss cushions where water sits.
    const tufts = Math.round(mossAmount * mix(3, 12, mood.density));
    const mossMaterial = new THREE.MeshStandardMaterial({ color: moss.clone().lerp(new THREE.Color('#8a9a4a'), random() * 0.4), roughness: 1 });
    for (let i = 0; i < tufts; i++) {
      const size = mix(0.02, 0.05, random());
      const tuft = mesh(s.root, new THREE.SphereGeometry(1, 8, 6), mossMaterial, [jitter(0.24), ledgeY + 0.125, 0.12 + jitter(0.1)]);
      tuft.scale.set(size * 1.4, size * 0.6, size * 1.4);
    }

    const tempo = mix(1.5, 9, mood.energy), kickReach = mix(0.03, 0.3, mood.energy);
    const eyeGlow = a.eyes ? (eyeMaterial as THREE.MeshStandardMaterial) : null;
    const animated = flame || legs || stream || eyeGlow;
    return s.finish({
      update: animated ? (_dt, time) => {
        if (flame) { const f = 1 + Math.sin(time * tempo) * 0.12 + Math.sin(time * tempo * 2.7) * 0.07; flame.scale.set(0.045 * (2 - f), 0.11 * f, 0.045 * (2 - f)); }
        if (legs) legs.rotation.x = Math.sin(time * tempo * 0.6) * kickReach;
        if (stream) (stream.material as THREE.MeshStandardMaterial).opacity = 0.55 + Math.sin(time * tempo) * 0.1;
        if (eyeGlow) eyeGlow.emissiveIntensity = 2 + Math.sin(time * tempo * 0.3) * 0.7;
      } : undefined,
    });
  },
});
