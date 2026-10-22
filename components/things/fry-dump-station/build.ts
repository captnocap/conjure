import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type V3 = [number, number, number];

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function instances(geometry: THREE.BufferGeometry, material: THREE.Material, items: { at: V3; rot?: V3; size?: V3 }[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, items.length));
  const matrix = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  items.forEach((item, index) => {
    e.set(...(item.rot ?? [0, 0, 0]));
    q.setFromEuler(e);
    matrix.compose(new THREE.Vector3(...item.at), q, new THREE.Vector3(...(item.size ?? [1, 1, 1])));
    mesh.setMatrixAt(index, matrix);
  });
  mesh.count = items.length;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** One fry of the chosen cut, centred, lying along z. */
function fryGeometry(cut: 'regular' | 'curly' | 'waffle' | 'wedges') {
  if (cut === 'curly') {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = (i / 24) * Math.PI * 3;
      points.push(new THREE.Vector3(Math.cos(t) * 0.012, Math.sin(t) * 0.012, -0.03 + (i / 24) * 0.06));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 36, 0.0035, 6, false);
  }
  if (cut === 'waffle') return new THREE.BoxGeometry(0.034, 0.004, 0.034);
  if (cut === 'wedges') {
    const shape = new THREE.Shape();
    shape.moveTo(-0.011, 0);
    shape.lineTo(0.011, 0);
    shape.lineTo(0, 0.016);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: false }).translate(0, -0.006, -0.035);
  }
  return new THREE.BoxGeometry(0.009, 0.009, 0.08);
}

export default defineThing({
  questions: {
    fill: score('How full is the fry bin?', ['A sad handful of cold ones', 'Half a bin', 'A golden mountain spilling over the lip']),
    cut: choice('What cut are the fries?', {
      regular: 'Regular straight-cut fries.',
      curly: 'Curly fries in seasoned spirals.',
      waffle: 'Waffle-cut lattice fries.',
      wedges: 'Thick potato wedges with the skin on.',
    }),
    scoop: choice('What is the metal scoop doing?', {
      rail: 'Hung on the front rail, idle.',
      filling: 'Mid-fill: tilted into the bin, fries pouring into a red carton.',
      buried: 'Dropped in and half buried in the fries.',
    }),
    lamp: choice('What is the heat lamp doing?', {
      lit: 'Glowing hot red over the bin.',
      dark: 'Switched off and cold.',
      blown: 'One bulb blown, the other buzzing.',
    }),
    waiting: choice('What is waiting beside the bin?', {
      cartons: 'A tall nested stack of red fry cartons.',
      bag: 'A white paper bag open and waiting to be filled.',
      filled: 'A row of cartons already filled and lined up for the pass.',
      nothing: 'Nothing: the counter is clear.',
    }),
    spill: noul('Is salt spilled in a heap and are loose fries scattered on the counter?'),
    station: choice('What is the dump built into?', {
      counter: 'A stainless cabinet with a door and a kick plate.',
      pass: 'A pass-through shelf with a glass sneeze guard above.',
      cart: 'A wheeled stainless cart with a push handle.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const jitter = (amount: number) => (random() - 0.5) * amount;

    const steel = s.material('#b9bec0', { metalness: 0.75, roughness: 0.3 });
    const dullSteel = s.material('#9ea4a6', { metalness: 0.6, roughness: 0.45 });
    const dark = s.material('#2a2d2f', { roughness: 0.6 });
    const red = s.material(new THREE.Color().setHSL(0.995, mix(0.55, 0.95, mood.cheer), 0.46).getStyle(), { roughness: 0.6 });
    const fryPaint = s.material(a.cut === 'curly' ? '#d9a13e' : a.cut === 'wedges' ? '#d7a660' : '#e8c35a', { roughness: 0.75, emissive: a.lamp === 'dark' ? '#000000' : '#ff5a1c', emissiveIntensity: a.lamp === 'dark' ? 0 : 0.12 });

    // ---- the base the dump is built into
    const W = a.station === 'pass' ? 1.3 : 0.95, D = 0.7;
    const TOP = a.station === 'cart' ? 0.88 : 0.9;
    if (a.station === 'counter') {
      s.box([W, TOP - 0.08, D], [0, (TOP - 0.08) / 2 + 0.08, 0], steel);
      s.box([W - 0.1, 0.08, D - 0.1], [0, 0.04, 0], dark);
      s.box([W * 0.5, TOP * 0.6, 0.01], [-W * 0.2, TOP * 0.45, D / 2 + 0.005], dullSteel);
      s.rod([-W * 0.2 - 0.15, TOP * 0.45, D / 2 + 0.02], [-W * 0.2 + 0.15, TOP * 0.45, D / 2 + 0.02], 0.008, steel);
    } else if (a.station === 'pass') {
      s.box([W, 0.06, D], [0, TOP - 0.03, 0], steel);
      for (const x of [-1, 1]) s.box([0.06, TOP - 0.06, 0.06], [x * (W / 2 - 0.05), (TOP - 0.06) / 2, -D / 2 + 0.05], steel);
      for (const x of [-1, 1]) s.box([0.06, TOP - 0.06, 0.06], [x * (W / 2 - 0.05), (TOP - 0.06) / 2, D / 2 - 0.05], steel);
      s.box([W, 0.04, D], [0, 0.3, 0], dullSteel);
      // Sneeze guard: a glass pane on posts over the front edge.
      for (const x of [-1, 1]) s.rod([x * (W / 2 - 0.08), TOP, D / 2 - 0.08], [x * (W / 2 - 0.08), TOP + 0.62, D / 2 - 0.08], 0.012, steel);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, 0.3, 0.008), new THREE.MeshPhysicalMaterial({ color: '#cfe3ea', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false }));
      glass.position.set(0, TOP + 0.5, D / 2 - 0.08);
      glass.rotation.x = 0.25;
      s.root.add(glass);
      s.rod([-W / 2 + 0.08, TOP + 0.62, D / 2 - 0.08], [W / 2 - 0.08, TOP + 0.62, D / 2 - 0.08], 0.012, steel);
    } else {
      s.box([W, 0.05, D], [0, TOP - 0.025, 0], steel);
      s.box([W, 0.04, D], [0, 0.18, 0], dullSteel);
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        s.rod([x * (W / 2 - 0.04), 0.12, z * (D / 2 - 0.04)], [x * (W / 2 - 0.04), TOP - 0.05, z * (D / 2 - 0.04)], 0.016, steel);
        const wheel = s.cylinder(0.05, 0.05, 0.03, [x * (W / 2 - 0.04), 0.05, z * (D / 2 - 0.04)], dark, 14);
        wheel.rotation.z = Math.PI / 2;
      }
      s.rod([-W / 2 + 0.04, TOP, -D / 2 - 0.06], [-W / 2 + 0.04, TOP + 0.06, -D / 2 - 0.06], 0.014, steel);
      s.rod([W / 2 - 0.04, TOP, -D / 2 - 0.06], [W / 2 - 0.04, TOP + 0.06, -D / 2 - 0.06], 0.014, steel);
      s.rod([-W / 2 + 0.04, TOP + 0.06, -D / 2 - 0.06], [W / 2 - 0.04, TOP + 0.06, -D / 2 - 0.06], 0.014, steel);
    }
    if (mood.wear > 0.35) for (let i = 0; i < Math.round(mood.wear * 8); i++) {
      const stain = s.cylinder(0.04, 0.04, 0.002, [jitter(W * 0.9), TOP + 0.001, jitter(D * 0.9)], s.material('#6f6457', { roughness: 0.3 }), 12);
      stain.scale.set(mix(0.5, 2, random()), 1, mix(0.5, 1.5, random()));
    }

    // ---- the dump pan: a sloped bin with a perforated floor, a splash back and a rail
    const PW = 0.72, PD = 0.46;
    const panX = a.station === 'pass' ? -0.12 : 0, panZ = 0.02;
    const pan = new THREE.Group();
    pan.position.set(panX, TOP, panZ);
    s.root.add(pan);
    const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; pan.add(mesh); return mesh; };
    const perforated = paint(128, 128, (ctx) => {
      ctx.fillStyle = '#8f9597';
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#3a3d3f';
      for (let y = 6; y < 128; y += 12) for (let x = 6; x < 128; x += 12) { ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill(); }
    });
    perforated.wrapS = perforated.wrapT = THREE.RepeatWrapping;
    perforated.repeat.set(6, 4);
    const tilt = 0.17;
    const floor = add(new THREE.Mesh(new THREE.BoxGeometry(PW, 0.012, PD), new THREE.MeshStandardMaterial({ map: perforated, metalness: 0.6, roughness: 0.4 })));
    floor.position.set(0, 0.08, 0);
    floor.rotation.x = tilt;
    const lip = add(new THREE.Mesh(new THREE.BoxGeometry(PW + 0.04, 0.05, 0.02), steel));
    lip.position.set(0, 0.06, PD / 2 + 0.005);
    for (const x of [-1, 1]) {
      const side = add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, PD + 0.02), steel));
      side.position.set(x * (PW / 2 + 0.01), 0.1, 0);
      side.rotation.x = tilt * 0.6;
    }
    const back = add(new THREE.Mesh(new THREE.BoxGeometry(PW + 0.04, 0.34, 0.02), steel));
    back.position.set(0, 0.22, -PD / 2 - 0.01);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, PW + 0.08, 10).rotateZ(Math.PI / 2), steel)).position.set(0, 0.4, -PD / 2 - 0.03);
    // Front rail: where the scoop hangs.
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, PW + 0.04, 10).rotateZ(Math.PI / 2), steel)).position.set(0, 0.1, PD / 2 + 0.03);

    // ---- the hood and the heat lamps on two uprights
    const HOOD = 0.72;
    for (const x of [-1, 1]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, HOOD, 10), steel)).position.set(x * (PW / 2 + 0.02), HOOD / 2 + 0.05, -PD / 2 + 0.08);
    const hood = add(new THREE.Mesh(new THREE.BoxGeometry(PW + 0.1, 0.1, 0.34), steel));
    hood.position.set(0, HOOD + 0.08, -0.05);
    const bulbs: THREE.MeshStandardMaterial[] = [];
    const glows: THREE.Mesh[] = [];
    const lampCount = a.lamp === 'blown' ? 2 : random() < 0.5 ? 2 : 1;
    const lit = a.lamp !== 'dark';
    for (let i = 0; i < lampCount; i++) {
      const x = lampCount === 1 ? 0 : (i - 0.5) * 0.32;
      const dead = a.lamp === 'blown' && i === 0;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.06, 20), dark)).position.set(x, HOOD + 0.01, -0.05);
      const bulbPaint = new THREE.MeshStandardMaterial({ color: dead || !lit ? '#6b2a24' : '#ff5a3c', emissive: '#ff3a1c', emissiveIntensity: dead || !lit ? 0 : 2.4, roughness: 0.3 });
      bulbs.push(bulbPaint);
      const bulb = add(new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), bulbPaint));
      bulb.position.set(x, HOOD + 0.015, -0.05);
      if (lit && !dead) {
        const glow = new THREE.Mesh(new THREE.ConeGeometry(0.26, HOOD - 0.1, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#ff6a3a', transparent: true, opacity: mix(0.16, 0.26, mood.warmth), depthWrite: false, side: THREE.DoubleSide }));
        glow.position.set(x, HOOD / 2 - 0.03, -0.05);
        pan.add(glow);
        glows.push(glow);
      }
    }
    if (lit) {
      const spill = new THREE.Mesh(new THREE.CircleGeometry(PW * 0.5, 24), new THREE.MeshBasicMaterial({ color: '#ff5a2a', transparent: true, opacity: 0.32, depthWrite: false }));
      spill.rotation.x = -Math.PI / 2;
      spill.position.set(0, 0.095, 0);
      pan.add(spill);
    }
    if (a.lamp === 'dark') {
      const card = s.label('LAMP OFF', 0.16, 0.06, [panX + PW / 2 - 0.1, TOP + HOOD + 0.13, panZ + 0.1], '#3a3a3a', '#f1e9d2');
      card.rotation.x = -0.4;
    }

    // ---- the fries, mounded in the pan
    const geometry = fryGeometry(a.cut);
    const count = Math.round(mix(6, a.cut === 'wedges' ? 90 : a.cut === 'waffle' ? 150 : 260, a.fill));
    const fries: { at: V3; rot?: V3; size?: V3 }[] = [];
    const mound = mix(0.02, 0.2, a.fill);
    for (let i = 0; i < count; i++) {
      const u = random(), v = random();
      const x = (u - 0.5) * PW * 0.88, z = (v - 0.5) * PD * 0.82;
      const hill = Math.max(0, 1 - Math.hypot(x / (PW * 0.5), z / (PD * 0.5)) ** 1.5);
      const y = 0.1 + (z * -tilt) + hill * mound * random() + 0.01;
      fries.push({ at: [x, y, z], rot: [jitter(0.5) + (random() < 0.15 ? Math.PI / 2 : 0), random() * Math.PI * 2, jitter(0.5)], size: [1, 1, a.cut === 'regular' ? mix(0.6, 1.3, random()) : mix(0.85, 1.15, random())] });
    }
    if (a.fill > 0.72) for (let i = 0; i < 10; i++) fries.push({ at: [jitter(PW * 0.9), 0.035 + random() * 0.02, PD / 2 + 0.04 + random() * 0.06], rot: [jitter(0.3), random() * Math.PI * 2, jitter(0.3)] });
    if (a.spill) for (let i = 0; i < 8; i++) fries.push({ at: [jitter(PW * 1.3), 0.005, PD / 2 + 0.1 + random() * 0.1], rot: [0, random() * Math.PI * 2, 0] });
    const fryMesh = instances(geometry, fryPaint, fries);
    pan.add(fryMesh);

    // ---- the scoop: a bottomless stainless scoop with a side handle
    const scoop = new THREE.Group();
    const scoopBody = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.13), steel);
    const scoopBack = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.008), steel);
    scoopBack.position.z = -0.065;
    const scoopBase = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.006, 0.13), steel);
    scoopBase.position.y = -0.035;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.13, 10).rotateZ(Math.PI / 2), dark);
    handle.position.set(0.11, 0.01, -0.02);
    for (const part of [scoopBack, scoopBase, handle]) { part.castShadow = true; scoop.add(part); }
    for (const x of [-1, 1]) { const wall = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.07, 0.13), steel); wall.position.x = x * 0.05; wall.castShadow = true; scoop.add(wall); }
    void scoopBody;
    if (a.scoop === 'rail') {
      scoop.position.set(PW * 0.3, 0.075, PD / 2 + 0.07);
      scoop.rotation.set(0.5, Math.PI, 0);
    } else if (a.scoop === 'buried') {
      scoop.position.set(jitter(PW * 0.5), 0.1 + mound * 0.5, jitter(PD * 0.4));
      scoop.rotation.set(-0.3, random() * 3, 0.4);
    } else {
      scoop.position.set(-PW * 0.1, 0.17 + mound, PD * 0.25);
      scoop.rotation.set(0.9, 0.3, 0);
      const inScoop = Array.from({ length: 14 }, () => ({ at: [jitter(0.08), jitter(0.05), jitter(0.1)] as V3, rot: [jitter(0.4), random() * 3, jitter(0.4)] as V3 }));
      scoop.add(instances(geometry, fryPaint, inScoop));
      // A carton held under the spout, and the stream of fries falling into it.
      const cartonAt = new THREE.Vector3(-PW * 0.1 + 0.04, 0.07, PD * 0.25 + 0.13);
      const carton = s.mesh(cartonGeometry(), red, [panX + cartonAt.x, TOP + cartonAt.y, panZ + cartonAt.z]);
      carton.rotation.y = Math.PI;
      const falling = Array.from({ length: 9 }, (_, i) => ({ at: [cartonAt.x + jitter(0.03), cartonAt.y + 0.06 + i * 0.012, cartonAt.z + jitter(0.03)] as V3, rot: [Math.PI / 2 + jitter(0.5), random() * 3, 0] as V3, size: [1, 1, 0.8] as V3 }));
      pan.add(instances(geometry, fryPaint, falling));
    }
    pan.add(scoop);

    // ---- salt, cartons, the bag and the basket
    const saltAt: V3 = [panX + PW / 2 + 0.1, TOP, panZ + PD / 2 - 0.05];
    s.cylinder(0.028, 0.03, 0.1, [saltAt[0], TOP + 0.05, saltAt[2]], new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: 0.3, transparent: true, opacity: 0.9 }), 16);
    s.cylinder(0.028, 0.028, 0.025, [saltAt[0], TOP + 0.112, saltAt[2]], steel, 16);
    if (a.spill) {
      const salt = s.cylinder(0.001, 0.05, 0.012, [saltAt[0] - 0.08 + jitter(0.03), TOP + 0.006, saltAt[2] + 0.06], s.material('#fbfbf7', { roughness: 1 }), 20);
      salt.scale.z = 0.7;
      const grains = Array.from({ length: 50 }, () => ({ at: [saltAt[0] - 0.08 + jitter(0.3), TOP + 0.002, saltAt[2] + 0.06 + jitter(0.2)] as V3 }));
      s.root.add(instances(new THREE.BoxGeometry(0.004, 0.003, 0.004), s.material('#ffffff'), grains));
    }
    const cartonBase: V3 = [panX - PW / 2 - 0.14, TOP, panZ + 0.1];
    if (a.waiting === 'cartons') {
      const stack = 8 + Math.round(random() * 6);
      const geometryC = cartonGeometry();
      const items = Array.from({ length: stack }, (_, i) => ({ at: [cartonBase[0] + jitter(0.006), TOP + i * 0.014, cartonBase[2] + 0.025 + jitter(0.006)] as V3, rot: [0, Math.PI + jitter(0.1), 0] as V3 }));
      s.root.add(instances(geometryC, red, items));
    } else if (a.waiting === 'filled') {
      const geometryC = cartonGeometry();
      const n = 3 + Math.round(random() * 2);
      const items = Array.from({ length: n }, (_, i) => ({ at: [cartonBase[0] - 0.05 + i * 0.09, TOP, cartonBase[2] - 0.15 + jitter(0.03)] as V3, rot: [0, Math.PI + jitter(0.3), 0] as V3 }));
      s.root.add(instances(geometryC, red, items));
      const packed: { at: V3; rot?: V3; size?: V3 }[] = [];
      for (const item of items) for (let i = 0; i < 12; i++) packed.push({ at: [item.at[0] + jitter(0.04), TOP + 0.09 + random() * 0.03, item.at[2] + 0.025 + jitter(0.03)], rot: [Math.PI / 2 + jitter(0.4), random() * 3, 0], size: [1, 1, 0.8] });
      s.root.add(instances(geometry, fryPaint, packed));
    } else if (a.waiting === 'bag') {
      const bagPaint = s.material('#f3eee2', { roughness: 0.95 });
      const bag = s.box([0.18, 0.26, 0.1], [cartonBase[0], TOP + 0.13, cartonBase[2]], bagPaint);
      bag.rotation.y = jitter(0.4);
      s.box([0.17, 0.06, 0.04], [cartonBase[0], TOP + 0.26, cartonBase[2] - 0.03], s.material('#e9e2d2', { roughness: 0.95 })).rotation.set(0.5, bag.rotation.y, 0);
      s.label(pick(['TO GO', 'ORDER 14', 'THANKS']), 0.12, 0.05, [cartonBase[0] + Math.sin(bag.rotation.y) * 0.05, TOP + 0.12, cartonBase[2] + 0.051 * Math.cos(bag.rotation.y)], '#c0392b', '#f3eee2').rotation.y = bag.rotation.y;
    }
    // The wire basket, hung from the back rail by its hook.
    const basketAt = new THREE.Vector3(panX + (random() < 0.5 ? -1 : 1) * PW * 0.28, TOP + 0.4, panZ - PD / 2 + 0.02);
    const wire = s.material('#c9ced0', { metalness: 0.7, roughness: 0.35 });
    const BW = 0.22, BH = 0.13, BD = 0.16;
    const base = new THREE.Vector3(basketAt.x, basketAt.y - 0.265, basketAt.z + 0.08);
    const uprights: { at: V3; rot?: V3; size?: V3 }[] = [];
    for (let i = 0; i <= 10; i++) for (const z of [-1, 1]) uprights.push({ at: [base.x - BW / 2 + (i / 10) * BW, base.y + BH / 2, base.z + z * BD / 2] });
    for (let i = 1; i < 8; i++) for (const x of [-1, 1]) uprights.push({ at: [base.x + x * BW / 2, base.y + BH / 2, base.z - BD / 2 + (i / 8) * BD] });
    s.root.add(instances(new THREE.BoxGeometry(0.003, BH, 0.003), wire, uprights));
    const rails: { at: V3; rot?: V3; size?: V3 }[] = [];
    for (const y of [0, BH / 2, BH]) for (const z of [-1, 1]) rails.push({ at: [base.x, base.y + y, base.z + z * BD / 2], size: [BW, 1, 1] });
    for (const y of [0, BH / 2, BH]) for (const x of [-1, 1]) rails.push({ at: [base.x + x * BW / 2, base.y + y, base.z], rot: [0, Math.PI / 2, 0], size: [BD, 1, 1] });
    for (let i = 1; i < 5; i++) rails.push({ at: [base.x, base.y, base.z - BD / 2 + (i / 5) * BD], size: [BW, 1, 1] });
    s.root.add(instances(new THREE.BoxGeometry(1, 0.004, 0.004), wire, rails));
    s.rod([basketAt.x - 0.11, basketAt.y - 0.135, basketAt.z + 0.08], [basketAt.x + 0.11, basketAt.y - 0.135, basketAt.z + 0.08], 0.004, steel);
    s.rod([basketAt.x, basketAt.y - 0.135, basketAt.z + 0.08], [basketAt.x, basketAt.y + 0.02, basketAt.z], 0.006, steel);
    const hook = s.ring(0.02, 0.005, [basketAt.x, basketAt.y + 0.02, basketAt.z], steel, Math.PI);
    hook.rotation.y = Math.PI / 2;
    s.box([0.06, 0.012, 0.14], [basketAt.x, basketAt.y - 0.27, basketAt.z + 0.16], dark);

    const energy = mood.energy;
    return s.finish({
      update(_dt, time) {
        if (a.lamp === 'blown' && bulbs[1]) {
          const buzz = Math.sin(time * 23) * Math.sin(time * 7.3) > 0.55 - energy * 0.3 ? 0.4 : 1.6;
          bulbs[1].emissiveIntensity = buzz;
          if (glows[0]) (glows[0].material as THREE.MeshBasicMaterial).opacity = buzz > 1 ? 0.2 : 0.05;
        }
      },
    });
  },
});

/** A red fry carton: a scoop-fronted trapezoid, standing on y = 0, open at the top. */
function cartonGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.035, 0);
  shape.lineTo(0.035, 0);
  shape.lineTo(0.048, 0.1);
  shape.quadraticCurveTo(0, 0.06, -0.048, 0.1);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false }).translate(0, 0, -0.025);
}
