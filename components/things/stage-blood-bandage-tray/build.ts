import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';
import { faceOut, headGeometry, headPoint, wobble } from './head';

type Triple = [number, number, number];
const TAU = Math.PI * 2;

/** Open-weave gauze: a pale ground crossed by faint threads. */
function gauzeTexture(tint: THREE.Color, repeatX: number, repeatY: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = `#${tint.getHexString()}`;
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = 'rgba(70,60,40,0.28)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 64; i += 8) {
    ctx.beginPath(); ctx.moveTo(i + 0.5, 0); ctx.lineTo(i + 0.5, 64); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i + 0.5); ctx.lineTo(64, i + 0.5); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  return texture;
}

/** A flat strip of cloth laid along a path. */
function ribbon(points: readonly Triple[], width: number, material: THREE.Material) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  const steps = Math.max(8, points.length * 6);
  const positions: number[] = [], uvs: number[] = [], index: number[] = [];
  const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(), at = new THREE.Vector3(), tangent = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    curve.getPoint(i / steps, at);
    curve.getTangent(i / steps, tangent);
    side.crossVectors(tangent, up);
    if (side.lengthSq() < 0.0001) side.set(1, 0, 0);
    side.normalize().multiplyScalar(width / 2);
    positions.push(at.x - side.x, at.y - side.y, at.z - side.z, at.x + side.x, at.y + side.y, at.z + side.z);
    uvs.push(i / steps * 6, 0, i / steps * 6, 1);
    if (i < steps) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export default defineThing({
  questions: {
    injury: choice('What injury is being faked on the foam head?', {
      boxer: 'A boxer’s cut brow: a split eyebrow held with butterfly strips, a swollen purple eye and a line of blood down the cheek.',
      crown: 'A head wound: a bandage wound round the crown and under the chin, blood seeping through at the temple.',
      mummy: 'A mummy: the whole head bound in yellowed linen strips with dark gaps and a trailing loose end.',
      invisible: 'The Invisible Man: the head wrapped completely in clean white bandage, with round dark goggles and nothing underneath.',
      nosejob: 'A bandaged nose job: a white splint taped across the nose with bruised yellow-purple eyes above it.',
      pirate: 'A pirate: a black eye patch on its strap, a red headscarf and a painted scar down the cheek.',
    }),
    blood: score('How bloody is it?', ['Bloodless and clean', 'A few careful drips', 'Smeared and spattered', 'Awash, a pool on the tray']),
    state: choice('What state is the tray in?', {
      tidy: 'Laid out before the call: rolls stacked, plasters in a row, the bottle capped and upright.',
      emergency: 'Mid-emergency: the bottle knocked over and leaking, a roll unspooled over the rim, scissors open, plasters everywhere.',
      aftermath: 'After the scene: a heap of used red wads in the corner, peeled backing papers, the bandage on the head coming loose.',
    }),
    bottle: choice('What is the stage blood kept in?', {
      squeeze: 'A soft clear squeeze bottle with a red nozzle, half full of dark blood.',
      pharmacy: 'A brown glass pharmacy bottle with a black cap and a typed label.',
      diner: 'A red diner ketchup bottle with a pointed tip, pressed into service.',
      syringe: 'A fat plastic syringe loaded with red, lying ready.',
    }),
    tray: choice('What kind of tray is it?', {
      steel: 'A stainless steel instrument tray with a rolled rim.',
      enamel: 'A chipped white enamel tray with a navy rim.',
      plastic: 'A brown moulded canteen tray.',
    }),
    head: choice('What is the practice head?', {
      foam: 'A white polystyrene wig head, featureless and calm.',
      canvas: 'A tan canvas milliner’s block with a seam down the middle.',
      mannequin: 'A glossy shop mannequin head with painted brows and red lips.',
    }),
    label: choice('What is written on the strip of tape stuck to the tray?', {
      fight: 'ACT 3 FIGHT',
      stunts: 'STUNTS',
      continuity: 'CONTINUITY',
      fake: 'NOT REAL',
      triage: 'TRIAGE DRILL',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const seed = random() * 30;
    const mess = a.state === 'tidy' ? mix(0.05, 0.3, mood.wear) : 1;
    const gore = clamp01(a.blood * (a.state === 'tidy' ? 0.8 : 1.1));

    const TW = 0.52, TD = 0.36, ty = 0.012;
    const trayTint = { steel: '#b8bec2', enamel: '#f1efe6', plastic: '#8a5a3c' }[a.tray];
    const trayMat = s.material(trayTint, a.tray === 'steel' ? { metalness: 0.85, roughness: 0.28 } : a.tray === 'enamel' ? { roughness: 0.25 } : { roughness: 0.7 });
    const rimMat = a.tray === 'enamel' ? s.material('#1f2f5c', { roughness: 0.3 }) : trayMat;
    const bloodTint = new THREE.Color('#6e0b10').lerp(new THREE.Color('#d0161e'), mix(0.25, 0.9, mood.cheer));
    const blood = new THREE.MeshStandardMaterial({ color: bloodTint, roughness: 0.12 });
    const gauzeTint = new THREE.Color(a.injury === 'mummy' ? '#cdb98a' : '#f4f1e8').lerp(new THREE.Color('#b5a888'), mood.wear * 0.3);
    const gauze = new THREE.MeshStandardMaterial({ map: gauzeTexture(gauzeTint, 3, 2), roughness: 0.95, side: THREE.DoubleSide });
    const wrap = new THREE.MeshStandardMaterial({ map: gauzeTexture(gauzeTint, 120, 2), roughness: 0.95 });
    const dark = s.material('#17171a', { roughness: 0.6 });
    const chrome = s.material('#dfe4e6', { metalness: 0.9, roughness: 0.2 });

    // Tray: floor, low walls and a rolled rim.
    s.box([TW, ty, TD], [0, ty / 2, 0], trayMat);
    for (const x of [-1, 1]) s.box([0.006, 0.026, TD], [x * (TW / 2 + 0.002), 0.015, 0], trayMat).rotation.z = x * -0.25;
    for (const z of [-1, 1]) s.box([TW, 0.026, 0.006], [0, 0.015, z * (TD / 2 + 0.002)], trayMat).rotation.x = z * 0.25;
    const rim: Triple[] = [];
    const hw = TW / 2 + 0.006, hd = TD / 2 + 0.006, corner = 0.03;
    for (let q = 0; q < 4; q++) {
      const cx = (q === 0 || q === 3 ? 1 : -1) * (hw - corner), cz = (q < 2 ? 1 : -1) * (hd - corner);
      for (let k = 0; k <= 4; k++) { const t = q * Math.PI / 2 + k / 4 * Math.PI / 2; rim.push([cx + Math.cos(t) * corner, 0.028, cz + Math.sin(t) * corner]); }
    }
    s.tube(rim, 0.0055, rimMat, true);
    const onTray = (x: number, z: number, y = 0): Triple => [x, ty + y, z];

    // ---- The practice head ----
    const HY = 0.212;
    const head = new THREE.Group();
    head.position.set(-0.15, ty, -0.055);
    head.rotation.y = mix(0.15, 0.4, random());
    s.root.add(head);
    const inHead = <T extends THREE.Object3D>(node: T) => { head.add(node); return node; };
    const formTint = new THREE.Color({ foam: '#f3f1ea', canvas: '#c9ad7f', mannequin: '#e3b999' }[a.head]);
    const covered = a.injury === 'mummy' || a.injury === 'invisible';
    const side = random() < 0.5 ? 1 : -1;
    const tone = new THREE.Color();
    const bruise = new THREE.Color('#5d2b6b'), sallow = new THREE.Color('#b9a23c'), voidTint = new THREE.Color(a.injury === 'mummy' ? '#3b2b1c' : '#111114');
    const geometry = headGeometry((d) => {
      tone.copy(formTint).multiplyScalar(1 - 0.03 * wobble(d.x * 4, d.y * 4, d.z * 4, seed));
      if (covered) return tone.copy(voidTint);
      if (a.injury === 'boxer') {
        const near = Math.hypot(d.x - side * 0.36, d.y - 0.12, d.z - 0.92);
        tone.lerp(bruise, clamp01(1.25 * Math.exp(-((near / 0.24) ** 2))));
        tone.lerp(sallow, 0.5 * Math.exp(-(((near - 0.34) / 0.1) ** 2)));
      }
      if (a.injury === 'nosejob')
        for (const ex of [0.36, -0.36]) {
          const near = Math.hypot(d.x - ex, d.y - 0.02, d.z - 0.92);
          tone.lerp(bruise, clamp01(0.9 * Math.exp(-((near / 0.2) ** 2))));
          tone.lerp(sallow, 0.55 * Math.exp(-(((near - 0.28) / 0.09) ** 2)));
        }
      return tone;
    });
    const formMat = new THREE.MeshStandardMaterial({ color: formTint, roughness: a.head === 'mannequin' ? 0.3 : 0.9 });
    const neck = inHead(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.058, 0], [0.06, 0.012], [0.044, 0.03], [0.036, 0.06], [0.037, 0.13]].map(([x, y]) => new THREE.Vector2(x, y)), 28), formMat));
    neck.castShadow = neck.receiveShadow = true;
    const skull = inHead(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: a.head === 'mannequin' ? 0.3 : 0.9 })));
    skull.position.y = HY;
    skull.castShadow = skull.receiveShadow = true;
    const hp = (x: number, y: number, z: number, lift = 1) => headPoint(x, y, z, lift).add(new THREE.Vector3(0, HY, 0));
    const blob = (x: number, y: number, z: number, size: Triple, material: THREE.Material, lift = 1) => {
      const mesh = inHead(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), material));
      mesh.position.copy(hp(x, y, z, lift));
      mesh.scale.set(...size);
      faceOut(mesh, new THREE.Vector3(x / 0.077, y / 0.118, z / 0.097));
      mesh.castShadow = true;
      return mesh;
    };
    const band = (points: Triple[], radius: number, material: THREE.Material, closed = false) => inHead(s.tube(points, radius, material, closed));
    /** A bandage wound round the head between two elevations, in radians above the ears. */
    const winding = (from: number, to: number, turns: number, lift: number) => {
      const points: Triple[] = [], count = Math.round(turns * 18), start = random() * TAU;
      for (let i = 0; i <= count; i++) {
        const u = i / count, phi = mix(from, to, u) + 0.03 * Math.sin(u * turns * 9 + seed), t = start + u * turns * TAU;
        points.push(hp(Math.cos(t) * Math.cos(phi), Math.sin(phi), Math.sin(t) * Math.cos(phi), lift).toArray() as Triple);
      }
      return points;
    };
    const ringAround = (phi: number, tilt: number, lift: number) => {
      const points: Triple[] = [];
      for (let k = 0; k < 24; k++) {
        const t = k / 24 * TAU, e = phi + tilt * Math.cos(t);
        points.push(hp(Math.cos(t) * Math.cos(e), Math.sin(e), Math.sin(t) * Math.cos(e), lift).toArray() as Triple);
      }
      return points;
    };

    // Nose, unless it is buried in bandage.
    if (!covered) {
      const bridge = inHead(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), formMat));
      bridge.scale.set(0.013, 0.028, 0.017);
      bridge.position.copy(hp(0, -0.05, 1)).add(new THREE.Vector3(0, 0, 0.004));
      bridge.rotation.x = -0.35;
      const tip = inHead(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), formMat));
      tip.scale.set(0.016, 0.011, 0.012);
      tip.position.copy(hp(0, -0.2, 1)).add(new THREE.Vector3(0, 0, 0.008));
      for (const ex of [1, -1]) {
        const ear = inHead(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), formMat));
        ear.scale.set(0.008, 0.027, 0.016);
        ear.position.copy(hp(ex, -0.02, -0.08)).add(new THREE.Vector3(ex * 0.004, 0, 0));
      }
      const lip: Triple[] = [];
      for (let i = 0; i <= 8; i++) { const t = mix(-0.4, 0.4, i / 8); lip.push(hp(Math.sin(t), -0.47 + 0.02 * Math.cos(t * 3.5), Math.cos(t)).toArray() as Triple); }
      band(lip, 0.0032, a.head === 'mannequin' ? new THREE.MeshStandardMaterial({ color: '#b3202a', roughness: 0.3 }) : new THREE.MeshStandardMaterial({ color: formTint.clone().multiplyScalar(0.84), roughness: 0.9 }));
      if (a.head === 'mannequin')
        for (const ex of [1, -1]) {
          const brow: Triple[] = [];
          for (let i = 0; i <= 5; i++) { const t = ex * mix(0.16, 0.58, i / 5); brow.push(hp(Math.sin(t), 0.3 + 0.03 * Math.sin(i / 5 * Math.PI), Math.cos(t), 1.01).toArray() as Triple); }
          band(brow, 0.0026, dark);
          blob(ex * 0.36, 0.115, 0.92, [0.012, 0.006, 0.003], dark, 0.985);
        }
      if (a.head === 'canvas') {
        const seam: Triple[] = [];
        for (let i = 0; i <= 14; i++) { const t = mix(-0.55, 2.6, i / 14); seam.push(hp(0.02, Math.sin(t), Math.cos(t), 1.004).toArray() as Triple); }
        band(seam, 0.0018, new THREE.MeshStandardMaterial({ color: '#7d6238', roughness: 0.9 }));
      }
    }

    const sway: THREE.Object3D[] = [];
    const tail = (from: THREE.Vector3, length: number) => {
      const group = new THREE.Group();
      group.position.copy(from);
      length = Math.min(length, from.y - 0.014);
      const drift = (random() - 0.5) * 0.05;
      group.add(ribbon([[0, 0, 0], [drift * 0.3, -length * 0.35, 0.012], [drift, -length * 0.75, 0.006], [drift * 1.4, -length, 0.02]], 0.02, gauze));
      inHead(group);
      sway.push(group);
    };
    const stain = (x: number, y: number, z: number, size: number, lift: number) => {
      if (gore < 0.12) return;
      const r = size * mix(0.5, 1.5, gore);
      blob(x, y, z, [r, r * mix(0.6, 0.95, random()), 0.0045], blood, lift);
      if (gore > 0.45) {
        const p = hp(x, y, z, lift + 0.01);
        inHead(s.rod([p.x, p.y, p.z], [p.x + (random() - 0.5) * 0.01, p.y - mix(0.02, 0.07, gore), p.z + 0.003], 0.0026, blood, 0.0009));
      }
    };

    if (a.injury === 'boxer') {
      const brow = side * 0.36;
      blob(brow, 0.1, 0.92, [0.021, 0.013, 0.008], new THREE.MeshStandardMaterial({ color: '#6a3270', roughness: 0.5 }), 0.99);
      blob(brow, 0.085, 0.92, [0.014, 0.002, 0.009], dark, 0.992);
      blob(brow * 1.05, 0.36, 0.9, [0.013, 0.0035, 0.003], new THREE.MeshStandardMaterial({ color: '#4a0a0e', roughness: 0.3 }), 1.005);
      const strip = new THREE.MeshStandardMaterial({ color: '#f6f4ee', roughness: 0.8 });
      for (const dx of [-0.05, 0.05]) blob(brow * 1.05 + dx, 0.36, 0.9, [0.0028, 0.011, 0.0022], strip, 1.012);
      stain(brow * 1.1, 0.3, 0.9, 0.006, 1.004);
      if (gore > 0.2) {
        const drip: Triple[] = [];
        for (let i = 0; i <= 6; i++) { const u = i / 6; drip.push(hp(brow * (1.35 + 0.35 * u), mix(0.25, -0.45, u * mix(0.5, 1, gore)), 0.86, 1.006).toArray() as Triple); }
        band(drip, 0.0024, blood);
      }
      const plaster = new THREE.MeshStandardMaterial({ color: '#d9a878', roughness: 0.7 });
      blob(-side * 0.5, -0.18, 0.8, [0.017, 0.006, 0.0025], plaster, 1.006).rotateZ(0.5);
      blob(0, 0.02, 1, [0.014, 0.005, 0.0025], plaster, 1.21);
    } else if (a.injury === 'crown') {
      band(winding(0.2, 0.62, 3.2, 1.05), 0.0125, wrap);
      const chin: Triple[] = [];
      for (let k = 0; k < 24; k++) { const t = k / 24 * TAU; chin.push(hp(Math.sin(t) * 0.99, Math.cos(t), -0.08 + 0.1 * Math.sin(t) ** 2, 1.055).toArray() as Triple); }
      band(chin, 0.0105, wrap, true);
      stain(side * 0.8, 0.45, 0.5, 0.014, 1.21);
      if (a.state === 'aftermath') tail(hp(-side * 0.9, 0.2, 0.3, 1.1), 0.16);
    } else if (a.injury === 'mummy' || a.injury === 'invisible') {
      const mummy = a.injury === 'mummy';
      band(winding(-0.92, 1.38, mummy ? 7.2 : 11.5, 1.045), mummy ? 0.0105 : 0.012, wrap);
      band(ringAround(-0.78, 0.05, 1.04), 0.012, wrap, true);
      blob(0, -0.12, 1, [0.014, 0.022, 0.016], wrap, 1.06);
      blob(0, 1, 0, [0.03, 0.03, 0.012], wrap, 1.03);
      if (mummy) {
        // Dry eye hollows left between the strips.
        for (const ex of [0.36, -0.36]) blob(ex, 0.12, 0.92, [0.015, 0.007, 0.006], dark, 1.175);
        tail(hp(side * 0.75, -0.6, 0.45, 1.12), mix(0.1, 0.19, random()));
        if (mood.wear > 0.5) tail(hp(-side * 0.9, 0.3, -0.2, 1.12), 0.09);
      } else {
        const lens = new THREE.MeshStandardMaterial({ color: '#0d1114', roughness: 0.08, metalness: 0.4 });
        for (const ex of [0.37, -0.37]) {
          const cup = new THREE.CylinderGeometry(0.021, 0.023, 0.014, 22);
          cup.rotateX(Math.PI / 2);
          const goggle = inHead(new THREE.Mesh(cup, lens));
          goggle.position.copy(hp(ex, 0.12, 0.92, 1.2));
          faceOut(goggle, new THREE.Vector3(ex * 0.8, 0.05, 0.95));
          goggle.castShadow = true;
          const ring = inHead(new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.003, 8, 24), chrome));
          ring.position.copy(hp(ex, 0.12, 0.92, 1.27));
          faceOut(ring, new THREE.Vector3(ex * 0.8, 0.05, 0.95));
        }
        band(ringAround(0.13, 0, 1.2), 0.0035, dark, true);
        if (a.state === 'aftermath') tail(hp(side * 0.8, -0.65, 0.4, 1.12), 0.15);
      }
      stain(side * 0.55, -0.42, 0.75, 0.012, 1.2);
    } else if (a.injury === 'nosejob') {
      const white = new THREE.MeshStandardMaterial({ color: '#f7f5ef', roughness: 0.7 });
      blob(0, -0.08, 1, [0.019, 0.03, 0.012], white, 1.15);
      for (const lift of [0.02, -0.2]) {
        const tape: Triple[] = [];
        for (let i = 0; i <= 8; i++) { const t = mix(-0.75, 0.75, i / 8); tape.push(hp(Math.sin(t), lift - 0.1 * Math.abs(Math.sin(t)), Math.cos(t), 1.02 + 0.27 * Math.exp(-((t / 0.2) ** 2))).toArray() as Triple); }
        band(tape, 0.0048, white);
      }
      for (const ex of [1, -1]) blob(ex * 0.1, -0.3, 1, [0.004, 0.004, 0.004], new THREE.MeshStandardMaterial({ color: '#f1ede2', roughness: 1 }), 1.1);
      stain(0.06, -0.33, 1, 0.005, 1.1);
    } else {
      // Pirate: headscarf, patch and scar.
      const scarf = new THREE.SphereGeometry(1, 36, 12, 0, TAU, 0, 1.2);
      const position = scarf.attributes.position, point = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) {
        point.fromBufferAttribute(position, i);
        headPoint(point.x, point.y, point.z, 1.05, point);
        position.setXYZ(i, point.x, point.y + HY, point.z);
      }
      scarf.computeVertexNormals();
      const cloth = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#c21f2c' : '#7d1620', roughness: 0.85, side: THREE.DoubleSide });
      inHead(new THREE.Mesh(scarf, cloth)).castShadow = true;
      for (const turn of [0.5, -0.35]) {
        const knot = inHead(new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.06, 8), cloth));
        knot.position.copy(hp(-side * 0.85, 0.35, -0.5, 1.12));
        knot.rotation.set(turn, 0, -side * (1.9 + turn));
      }
      blob(side * 0.36, 0.11, 0.92, [0.023, 0.019, 0.005], dark, 1.02);
      band(ringAround(0.32, -side * 0.55, 1.064), 0.0024, dark, true);
      const scar: Triple[] = [];
      for (let i = 0; i <= 5; i++) scar.push(hp(-side * mix(0.42, 0.58, i / 5), mix(-0.02, -0.5, i / 5), 0.82, 1.004).toArray() as Triple);
      band(scar, 0.0022, new THREE.MeshStandardMaterial({ color: '#7a2a2a', roughness: 0.5 }));
      for (let i = 1; i < 5; i++) blob(-side * mix(0.42, 0.58, i / 5), mix(-0.02, -0.5, i / 5), 0.82, [0.007, 0.0012, 0.0015], dark, 1.006);
    }

    // ---- Gauze rolls ----
    const rollMat = new THREE.MeshStandardMaterial({ map: gauzeTexture(gauzeTint, 6, 3), roughness: 0.95 });
    const coreMat = s.material('#a59c85');
    const roll = (at: Triple, radius: number, length: number, axis: 'x' | 'z' | 'y', turn = 0) => {
      const group = new THREE.Group();
      group.position.set(...at);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 22), rollMat);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.32, radius * 0.32, length + 0.002, 12), coreMat);
      body.castShadow = body.receiveShadow = true;
      group.add(body, core);
      if (axis === 'x') group.rotation.set(0, turn, Math.PI / 2);
      else if (axis === 'z') group.rotation.set(Math.PI / 2, 0, turn);
      else group.rotation.y = turn;
      s.root.add(group);
    };
    const R = 0.022, L = 0.075;
    const extra = Math.round(mood.density * 2);
    if (a.state === 'tidy') {
      for (const z of [-0.125, -0.079]) roll(onTray(0.125, z, R), R, L, 'x');
      roll(onTray(0.125, -0.102, R + 0.039), R, L, 'x');
      for (let i = 0; i < extra; i++) roll(onTray(0.215, -0.14 + i * 0.047, L / 2), R * 0.92, L, 'y');
    } else {
      roll(onTray(0.13, -0.12, R), R, L, 'x', (random() - 0.5) * 0.5);
      roll(onTray(0.2, -0.07, R), R * 0.9, L, 'x', 0.9 + random() * 0.6);
      for (let i = 0; i < extra; i++) roll(onTray(0.07 + i * 0.05, -0.135 + random() * 0.02, L / 2), R * 0.85, L, 'y');
    }
    if (a.state === 'emergency') {
      // One roll has run away over the rim.
      const drift = (random() - 0.5) * 0.08;
      s.root.add(ribbon([[0.13, ty + 0.046, -0.12], [0.12, ty + 0.012, -0.07], [0.1, ty + 0.004, 0.04], [0.085 + drift * 0.3, 0.036, TD / 2 + 0.008], [0.07 + drift, 0.004, TD / 2 + 0.07], [0.02 + drift * 1.6, 0.003, TD / 2 + 0.13]], 0.045, gauze));
    }

    // ---- Sticking plasters ----
    const plasterMat = s.material('#d9a878', { roughness: 0.7 }), padMat = s.material('#f1e4cf'), paperMat = s.material('#fbfaf6');
    const plasters = 3 + Math.round(mood.density * 4);
    for (let i = 0; i < plasters; i++) {
      const tidy = a.state === 'tidy';
      const x = tidy ? -0.215 + i * 0.043 : mix(-0.22, 0.2, random());
      const z = tidy ? 0.095 : mix(0.04, 0.13, random());
      const turn = tidy ? (random() - 0.5) * 0.1 * (1 + mess * 4) : random() * 3;
      const group = new THREE.Group();
      group.position.set(x, ty + 0.0012 + i * 0.0004, z);
      group.rotation.y = turn;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.019, 0.0016, 0.072), plasterMat);
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.0022, 0.022), padMat);
      strip.castShadow = strip.receiveShadow = true;
      group.add(strip, pad);
      s.root.add(group);
      if (!tidy && random() < 0.6) s.box([0.022, 0.0008, 0.04], [mix(-0.2, 0.2, random()), ty + 0.0006, mix(0.02, 0.14, random())], paperMat).rotation.y = random() * 3;
    }

    // ---- Bruise wheel ----
    const wx = 0.17, wz = 0.04;
    s.cylinder(0.043, 0.043, 0.012, onTray(wx, wz, 0.006), dark, 28);
    ['#8a1420', '#5b2a6e', '#c9b037', '#4f6b3a', '#2f1a3a'].forEach((tint, index) => {
      const wedge = s.mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.004, 10, 1, false, index / 5 * TAU + 0.05, TAU / 5 - 0.1), new THREE.MeshStandardMaterial({ color: tint, roughness: 0.35 }), onTray(wx, wz, 0.0125));
      wedge.castShadow = false;
    });
    const lid = s.cylinder(0.043, 0.043, 0.005, onTray(wx, wz - 0.043 - 0.018, 0.04), dark, 28);
    lid.rotation.x = Math.PI / 2 - 0.45;
    // Stipple sponge.
    s.box([0.03, 0.016, 0.022], onTray(wx - 0.075, wz + 0.02, 0.008), s.material(gore > 0.4 ? '#a8463a' : '#d88a3a', { roughness: 1 })).rotation.y = random();

    // ---- Stage blood ----
    const spilt = a.state === 'emergency';
    const bottle = new THREE.Group();
    const flat = spilt || a.bottle === 'syringe';
    const bx = spilt ? -0.07 : flat ? -0.07 : -0.005, bz = spilt ? 0.03 : flat ? -0.155 : -0.105;
    const add = (mesh: THREE.Mesh, y: number) => { mesh.position.y = y; mesh.castShadow = true; bottle.add(mesh); return mesh; };
    let tall = 0.13, girth = 0.024;
    if (a.bottle === 'squeeze') {
      const level = a.state === 'aftermath' ? 0.2 : mix(0.75, 0.4, gore);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.1, 20), new THREE.MeshStandardMaterial({ color: '#f2f1ea', roughness: 0.4, transparent: true, opacity: 0.55 })), 0.05);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.0215, 0.0215, 0.098 * level, 20), blood), 0.001 + 0.049 * level);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.024, 0.014, 20), new THREE.MeshStandardMaterial({ color: '#f2f1ea', roughness: 0.4 })), 0.107);
      add(new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.034, 14), new THREE.MeshStandardMaterial({ color: '#c8202a', roughness: 0.4 })), 0.131);
      tall = 0.148;
    } else if (a.bottle === 'pharmacy') {
      const glass = new THREE.MeshStandardMaterial({ color: '#5a3212', roughness: 0.15 });
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.085, 20), glass), 0.0425);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.026, 0.02, 20), glass), 0.095);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 16), dark), 0.114);
      const tag = s.label('BLOOD', 0.05, 0.036, [0, 0.045, 0.0275], '#7a1016', '#f3eedd');
      bottle.add(tag);
      tall = 0.124; girth = 0.027;
    } else if (a.bottle === 'diner') {
      const red = new THREE.MeshStandardMaterial({ color: '#cf1d1d', roughness: 0.35 });
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.027, 0.12, 20), red), 0.06);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.024, 0.016, 20), red), 0.128);
      add(new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.04, 14), red), 0.155);
      tall = 0.175; girth = 0.027;
    } else {
      const clear = new THREE.MeshStandardMaterial({ color: '#eef3f4', roughness: 0.2, transparent: true, opacity: 0.5 });
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.1, 18), clear), 0.07);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.0118, 0.0118, 0.07, 18), blood), 0.083);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.006, 0.022, 10), chrome), 0.131);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.004, 18), new THREE.MeshStandardMaterial({ color: '#f6f6f2', roughness: 0.4 })), 0.02);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.03, 10), new THREE.MeshStandardMaterial({ color: '#f6f6f2', roughness: 0.4 })), 0.008);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.004, 18), new THREE.MeshStandardMaterial({ color: '#f6f6f2', roughness: 0.4 })), -0.006);
      tall = 0.142; girth = 0.02;
    }
    const lying = flat;
    const heading = spilt ? -mix(0.35, 0.75, random()) : (random() - 0.5) * 0.16;
    if (lying) {
      // Laid on its side, nozzle toward the open middle of the tray.
      bottle.rotation.set(0, heading, -Math.PI / 2);
      bottle.position.set(bx, ty + girth, bz);
    } else bottle.position.set(bx, ty, bz);
    s.root.add(bottle);
    const mouth = new THREE.Vector3(lying ? bx + Math.cos(heading) * tall : bx + 0.02, 0, lying ? bz - Math.sin(heading) * tall : bz + 0.04);

    const puddle = (x: number, z: number, radius: number) => {
      for (let i = 0; i < 5; i++) {
        const r = radius * mix(0.45, 1, random()), t = random() * TAU, d = i ? radius * 0.6 * random() : 0;
        s.ball([r, 0.0022, r * mix(0.7, 1, random())], onTray(clampX(x + Math.cos(t) * d), clampZ(z + Math.sin(t) * d), 0.0006), blood, 16).castShadow = false;
      }
    };
    const clampX = (x: number) => Math.min(TW / 2 - 0.02, Math.max(-TW / 2 + 0.02, x));
    const clampZ = (z: number) => Math.min(TD / 2 - 0.02, Math.max(-TD / 2 + 0.02, z));
    if (spilt) puddle(mouth.x, mouth.z, mix(0.018, 0.075, gore));
    else if (gore > 0.15) puddle(mouth.x, mouth.z, mix(0.004, 0.04, gore));
    if (gore > 0.75) puddle(0.06, 0.07, mix(0.02, 0.06, gore));
    const drops = Array.from({ length: Math.round(gore * gore * 60) }, () => {
      const t = random() * TAU, d = 0.02 + random() ** 2 * 0.2;
      return { at: onTray(clampX(mouth.x + Math.cos(t) * d), clampZ(mouth.z + Math.sin(t) * d), 0.0004), size: mix(0.0015, 0.006, random() ** 2) };
    });
    if (drops.length) s.scatter(new THREE.SphereGeometry(1, 8, 6), blood, drops).scale.set(1, 1, 1);

    // ---- Cotton, used wads, scissors, spare patch ----
    const tuft = new THREE.IcosahedronGeometry(1, 1);
    const cotton: { at: Triple; size: number; color: THREE.ColorRepresentation }[] = [];
    const cottonCount = 3 + Math.round(mood.density * 4);
    for (let i = 0; i < cottonCount; i++) {
      const size = mix(0.011, 0.015, random());
      cotton.push({ at: onTray(0.085 + (random() - 0.5) * 0.05, -0.035 + (random() - 0.5) * 0.045, size * 0.9), size, color: random() < gore * 0.6 ? bloodTint.clone().lerp(new THREE.Color('#ffffff'), 0.25) : '#fbfaf5' });
    }
    if (a.state === 'aftermath' || gore > 0.6) {
      const heap = a.state === 'aftermath' ? 9 + Math.round(gore * 10) : 4;
      for (let i = 0; i < heap; i++) {
        const size = mix(0.012, 0.02, random()), t = random() * TAU, d = random() * 0.045;
        cotton.push({ at: onTray(0.2 + Math.cos(t) * d * 0.7, 0.115 + Math.sin(t) * d * 0.6, size * 0.8 + (1 - d / 0.045) * 0.022 * random()), size, color: bloodTint.clone().lerp(new THREE.Color('#f6efe6'), random() * mix(0.9, 0.3, gore)) });
      }
    }
    s.scatter(tuft, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), cotton);

    const open = a.state === 'emergency' ? 0.55 : a.state === 'aftermath' ? 0.25 : 0.06;
    const scissors = new THREE.Group();
    for (const half of [1, -1]) {
      const arm = new THREE.Group();
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.002, 0.007), chrome);
      blade.position.x = 0.036;
      const shank = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.003, 0.004), chrome);
      shank.position.x = -0.022;
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0028, 8, 18), new THREE.MeshStandardMaterial({ color: '#c8202a', roughness: 0.4 }));
      loop.rotation.x = Math.PI / 2;
      loop.position.set(-0.052, 0, half * 0.009);
      blade.castShadow = loop.castShadow = true;
      arm.add(blade, shank, loop);
      arm.rotation.y = half * open;
      arm.position.y = half * 0.0015;
      scissors.add(arm);
    }
    if (a.state === 'tidy') scissors.position.set(0.0, ty + 0.004, 0.045);
    else scissors.position.set(0.03, ty + 0.004, -0.09);
    scissors.rotation.y = mix(-0.4, 0.4, random()) + (a.state === 'tidy' ? 0 : 1);
    s.root.add(scissors);

    if (a.injury !== 'pirate') {
      const px = 0.2, pz = a.state === 'aftermath' ? 0.03 : 0.118;
      if (a.state !== 'aftermath') {
        s.ball([0.022, 0.004, 0.018], onTray(px, pz, 0.003), dark, 16);
        s.ring(0.03, 0.0012, onTray(px - 0.022, pz, 0.002), dark).rotation.x = Math.PI / 2;
      }
    }

    // ---- Tape label and old stains ----
    const text = { fight: 'ACT 3 FIGHT', stunts: 'STUNTS', continuity: 'CONTINUITY', fake: 'NOT REAL', triage: 'TRIAGE DRILL' }[a.label];
    const tape = s.label(text, 0.13, 0.026, [-0.02, ty + 0.0011, TD / 2 - 0.022], '#2a2622', '#e8d9a0');
    tape.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 0.08);
    if (mood.wear > 0.35) {
      const old = new THREE.MeshStandardMaterial({ color: '#5a2a22', roughness: 0.8, transparent: true, opacity: 0.55 });
      for (let i = 0; i < Math.round(mood.wear * 6); i++) {
        const r = mix(0.008, 0.03, random());
        s.ball([r, 0.0012, r * mix(0.5, 1, random())], onTray(clampX((random() - 0.5) * TW), clampZ((random() - 0.5) * TD), 0.0004), old, 12).castShadow = false;
      }
    }

    const base: [THREE.Object3D, number][] = sway.map((node) => [node, random() * 6]);
    const swing = mix(0.01, 0.12, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const [node, phase] of base) node.rotation.z = Math.sin(time * 1.1 + phase) * swing;
      },
    });
  },
});
