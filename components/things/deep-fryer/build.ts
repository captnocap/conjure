import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type V3 = [number, number, number];
interface Bit { p: V3; r?: V3; s?: V3 | number; c?: THREE.ColorRepresentation }

/** Many rotated, scaled copies in one draw call. */
function strew(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, bits: readonly Bit[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(bits.length, 1));
  mesh.count = bits.length;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), po = new THREE.Vector3();
  bits.forEach((bit, i) => {
    e.set(...(bit.r ?? [0, 0, 0]));
    q.setFromEuler(e);
    if (typeof bit.s === 'number') sc.setScalar(bit.s); else sc.set(...(bit.s ?? [1, 1, 1]));
    m.compose(po.set(...bit.p), q, sc);
    mesh.setMatrixAt(i, m);
    if (bit.c !== undefined) mesh.setColorAt(i, new THREE.Color(bit.c));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** A see-through wire grid painted on a canvas, for basket walls. */
function wireTexture(cells: number, ink: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5;
  const step = 128 / cells;
  for (let i = 0; i <= cells; i++) {
    ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(128, i * step); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const FOODS = {
  fries: 'A heap of thin golden chips.',
  chicken: 'Craggy pieces of battered fried chicken.',
  fish: 'Two or three long fillets of battered fish.',
  rings: 'A tangle of onion rings.',
  doughnuts: 'Fat ring doughnuts, pale brown, for the morning.',
  forgotten: 'Something left in far too long: black, shrunken, smoking.',
  empty: 'Nothing. The baskets are bare wire.',
} as const;

export default defineThing({
  questions: {
    state: choice('What is the fryer doing right now?', {
      rolling: 'Both baskets down and the oil boiling hard, steam pouring up: the middle of the rush.',
      'one-down': 'One basket frying, the other hung up loaded and dripping.',
      draining: 'Both baskets lifted onto the hanger bar to drain over calm hot oil.',
      idle: 'Hot and waiting, pilot lights on, oil flat as glass, baskets hung empty.',
      cold: 'Switched off and dark, oil gone still and dull, after close or long abandoned.',
    }),
    food: choice('What is in the baskets, if anything?', FOODS),
    oil: score('How old is the oil?', ['Fresh, pale and clear gold', 'Amber, a few days in', 'Dark brown and foaming', 'Black tar that should have been changed weeks ago']),
    body: choice('What kind of fryer is it?', {
      steel: 'A plain commercial stainless floor fryer on legs.',
      enamel: 'A cream-enamelled chip shop range with a rounded chrome trim.',
      blackened: 'An old dark cast unit, seasoned black from decades of use.',
      branded: 'A fast-food chain fryer with a red control fascia and digital timers.',
    }),
    guard: noul('Does it have a tall steel splash guard on one side?'),
    beside: choice('What stands with it?', {
      nothing: 'Nothing, just the fryer.',
      salt: 'A side shelf with a big salt shaker and a chip scoop.',
      bucket: 'A dented steel bucket of drained old oil on the floor.',
      cartons: 'A stack of frozen-chip cartons waiting to be opened.',
      extinguisher: 'A red fire extinguisher standing close at hand.',
    }),
    notice: choice('Is there a notice stuck on the front?', {
      none: 'No notice.',
      hot: 'A warning: HOT OIL.',
      filter: 'A reminder: FILTER DAILY.',
      order: 'A scrawled OUT OF ORDER.',
      touch: 'DO NOT TOUCH, in capitals.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const on = a.state !== 'cold';
    const boiling = a.state === 'rolling' || a.state === 'one-down';
    const W = 0.8, D = 0.78, TOP = 0.9;

    const bodyTint = { steel: '#b8bdbd', enamel: '#e9e0c6', blackened: '#3a3835', branded: '#c2c6c6' }[a.body];
    const metalBody = a.body === 'steel' || a.body === 'branded';
    const body = s.material(bodyTint, { metalness: metalBody ? 0.7 : 0.15, roughness: metalBody ? 0.38 : 0.55 });
    const steel = s.material('#c9cdcd', { metalness: 0.8, roughness: 0.3 });
    const dark = s.material('#1f2021', { roughness: 0.7 });
    const grime = s.material('#3b2a17', { roughness: 0.9 });
    const oilTint = new THREE.Color('#e8b23c').lerp(new THREE.Color('#7a4312'), Math.min(1, a.oil * 1.6)).lerp(new THREE.Color('#1b0f07'), Math.max(0, a.oil * 1.8 - 0.8));
    const oil = new THREE.MeshStandardMaterial({ color: oilTint, roughness: boiling ? 0.5 : 0.08, metalness: 0.1, emissive: oilTint, emissiveIntensity: on ? mix(0.12, 0.3, mood.warmth) : 0 });

    // Cabinet on legs.
    s.box([W, 0.67, D], [0, 0.485, 0], body);
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      s.cylinder(0.022, 0.022, 0.15, [x * (W / 2 - 0.06), 0.075, z * (D / 2 - 0.06)], steel, 10);
      s.cylinder(0.035, 0.04, 0.02, [x * (W / 2 - 0.06), 0.01, z * (D / 2 - 0.06)], dark, 10);
    }
    // Top deck: a rim around two sunken vats.
    const rimY = 0.86, vatW = 0.33, vatD = 0.44, vatZ = 0.07;
    s.box([W, 0.08, 0.1], [0, rimY, D / 2 - 0.05], body);
    s.box([W, 0.08, D - 0.1 - vatD], [0, rimY, vatZ - vatD / 2 - (D - 0.1 - vatD) / 2], body);
    for (const x of [-W / 2 + 0.025, 0, W / 2 - 0.025]) s.box([x === 0 ? 0.06 : 0.05, 0.08, vatD], [x, rimY, vatZ], body);
    s.box([W - 0.04, 0.01, vatD], [0, 0.825, vatZ], dark);
    const vatX = [-0.19, 0.19];
    const bubbleBits: Bit[] = [];
    for (const x of vatX) {
      s.box([vatW, 0.012, vatD], [x, 0.872, vatZ], oil).castShadow = false;
      if (boiling || a.oil > 0.55) {
        const n = boiling ? Math.round(mix(40, 110, mood.energy)) : 26;
        for (let i = 0; i < n; i++) bubbleBits.push({ p: [x + (random() - 0.5) * (vatW - 0.03), 0.878, vatZ + (random() - 0.5) * (vatD - 0.03)], s: mix(0.005, boiling ? 0.016 : 0.009, random()) });
      }
    }
    const foamTint = new THREE.Color('#fff3c9').lerp(oilTint, 0.55 + a.oil * 0.3);
    const bubbles = bubbleBits.length ? strew(s.root, new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: foamTint, roughness: 0.3, emissive: foamTint, emissiveIntensity: 0.15 }), bubbleBits) : null;
    if (bubbles) bubbles.castShadow = false;

    // Back riser with flue slots and the hanger bar.
    const riserZ = -D / 2 + 0.07;
    s.box([W, 0.5, 0.14], [0, TOP + 0.25, riserZ], body);
    s.box([W + 0.02, 0.03, 0.17], [0, TOP + 0.51, riserZ], a.body === 'enamel' ? steel : body);
    for (let i = 0; i < 6; i++) s.box([W * 0.78, 0.014, 0.01], [0, TOP + 0.29 + i * 0.032, riserZ + 0.072], dark);
    const barY = TOP + 0.2, barZ = riserZ + 0.13;
    s.rod([-W / 2 + 0.04, barY, barZ], [W / 2 - 0.04, barY, barZ], 0.011, steel);
    for (const x of [-W / 2 + 0.05, 0, W / 2 - 0.05]) s.rod([x, barY, barZ], [x, barY, riserZ + 0.07], 0.008, steel);

    // Front: door, handle, controls, drain.
    const front = D / 2;
    s.box([W - 0.08, 0.44, 0.016], [0, 0.42, front + 0.006], body);
    s.box([W - 0.1, 0.012, 0.02], [0, 0.645, front + 0.012], dark);
    s.rod([-0.2, 0.56, front + 0.05], [0.2, 0.56, front + 0.05], 0.011, steel);
    for (const x of [-0.2, 0.2]) s.rod([x, 0.56, front + 0.05], [x, 0.56, front + 0.01], 0.009, steel);
    const fascia = a.body === 'branded' ? s.material('#c2302a', { roughness: 0.45 }) : a.body === 'enamel' ? steel : dark;
    s.box([W, 0.13, 0.03], [0, 0.745, front + 0.012], fascia);
    const pilot = new THREE.MeshStandardMaterial({ color: on ? '#ff8a2a' : '#4a2c1c', emissive: on ? '#ff6a10' : '#000000', emissiveIntensity: on ? 1.6 : 0, roughness: 0.4 });
    for (const x of vatX) {
      if (a.body === 'branded') {
        s.box([0.2, 0.07, 0.008], [x, 0.745, front + 0.03], dark);
        s.label(on ? `${1 + Math.floor(random() * 3)}:${10 + Math.floor(random() * 49)}` : '--:--', 0.16, 0.05, [x, 0.745, front + 0.035], on ? '#ff5a3a' : '#3a2b2b', '#170f0f');
      } else {
        const knob = s.cylinder(0.034, 0.038, 0.03, [x - 0.04, 0.745, front + 0.04], a.body === 'blackened' ? s.material('#8a3a2a') : dark, 16);
        knob.rotation.x = Math.PI / 2;
        s.box([0.006, 0.03, 0.008], [x - 0.04, 0.757, front + 0.056], steel).rotation.z = (random() - 0.5) * 2;
      }
      s.ball([0.013, 0.013, 0.008], [x + (a.body === 'branded' ? 0.13 : 0.06), 0.745 + (a.body === 'branded' ? 0.045 : 0), front + 0.03], pilot, 10);
    }
    s.rod([0, 0.21, front - 0.02], [0, 0.21, front + 0.06], 0.02, steel);
    s.box([0.012, 0.09, 0.012], [0, 0.25, front + 0.06], s.material('#c33a2c'));
    if (a.body === 'enamel') {
      s.box([W + 0.02, 0.02, D + 0.02], [0, 0.815, 0], steel);
      s.label('FRYING TONIGHT', 0.5, 0.07, [0, TOP + 0.13, riserZ + 0.075], '#8a2a22', '#efe6cd');
    }

    // Grease: streaks down the front and a film on the deck, by wear and oil age.
    const filth = Math.min(1, mood.wear * 0.8 + a.oil * 0.35);
    for (let i = 0; i < Math.round(filth * 12); i++) {
      const len = mix(0.06, 0.34, random());
      s.box([mix(0.006, 0.02, random()), len, 0.004], [(random() - 0.5) * (W - 0.1), 0.81 - len / 2, front + 0.03], grime).castShadow = false;
    }
    if (filth > 0.4) for (let i = 0; i < 5; i++) s.cylinder(0.02 + random() * 0.03, 0.02 + random() * 0.03, 0.004, [(random() - 0.5) * W * 0.9, 0.903, front - 0.02 - random() * 0.06], grime, 9);

    // Splash guard.
    if (a.guard) {
      const side = random() < 0.5 ? -1 : 1;
      s.box([0.012, 0.36, D - 0.16], [side * (W / 2 - 0.006), TOP + 0.18, 0.06], steel);
      s.box([0.03, 0.02, D - 0.16], [side * (W / 2 - 0.012), TOP + 0.37, 0.06], steel);
    }

    // Baskets.
    const wire = new THREE.MeshStandardMaterial({ map: wireTexture(9, '#d9dddd'), alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.4, color: on || mood.wear < 0.5 ? '#ffffff' : '#b9a68c' });
    const foodTint = { fries: '#e8b84a', chicken: '#b9722a', fish: '#d39a3c', rings: '#d8a046', doughnuts: '#b27a3e', forgotten: '#19130f', empty: '#000000' }[a.food];
    const foodMat = new THREE.MeshStandardMaterial({ color: foodTint, roughness: 0.8 });
    const bw = 0.27, bh = 0.13, bd = 0.3;
    const makeBasket = (loaded: boolean) => {
      const g = new THREE.Group();
      const walls = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), wire);
      walls.position.y = bh / 2;
      walls.castShadow = true;
      g.add(walls);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.006, 6, 4), steel);
      rim.rotation.set(Math.PI / 2, 0, Math.PI / 4);
      rim.scale.set(bw / 0.283, bd / 0.283, 1);
      rim.position.y = bh;
      rim.castShadow = true;
      g.add(rim);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.3, 8), steel);
      handle.rotation.x = Math.PI / 2 - 0.5;
      handle.position.set(0, bh + 0.07, bd / 2 + 0.12);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.14, 10), s.material(a.body === 'branded' ? '#c2302a' : '#22272b', { roughness: 0.5 }));
      grip.rotation.x = Math.PI / 2 - 0.5;
      grip.position.set(0, bh + 0.155, bd / 2 + 0.275);
      handle.castShadow = grip.castShadow = true;
      g.add(handle, grip);
      if (loaded && a.food !== 'empty') {
        const bits: Bit[] = [];
        const inside = (): V3 => [(random() - 0.5) * (bw - 0.07), 0.06 + random() * 0.09, (random() - 0.5) * (bd - 0.07)];
        const turn = (): V3 => [random() * 3, random() * 3, random() * 3];
        let geometry: THREE.BufferGeometry;
        if (a.food === 'fries') {
          geometry = new THREE.BoxGeometry(0.014, 0.014, 0.1);
          for (let i = 0; i < 90; i++) { const p = inside(); p[1] += 0.03; bits.push({ p, r: [(random() - 0.5) * 1.2, random() * 6, 0], c: new THREE.Color(foodTint).offsetHSL(0, 0, (random() - 0.5) * 0.12) }); }
        } else if (a.food === 'rings') {
          geometry = new THREE.TorusGeometry(0.04, 0.011, 6, 14);
          for (let i = 0; i < 12; i++) { const p = inside(); p[1] += 0.03; bits.push({ p, r: turn(), s: mix(0.7, 1.2, random()) }); }
        } else if (a.food === 'doughnuts') {
          geometry = new THREE.TorusGeometry(0.036, 0.022, 8, 16);
          for (let i = 0; i < 6; i++) bits.push({ p: [((i % 3) - 1) * 0.085, 0.07 + Math.floor(i / 3) * 0.035, (Math.floor(i / 3) - 0.5) * 0.12 + (random() - 0.5) * 0.02], r: [Math.PI / 2 + (random() - 0.5) * 0.5, 0, 0] });
        } else if (a.food === 'fish') {
          geometry = new THREE.IcosahedronGeometry(1, 1);
          for (let i = 0; i < 3; i++) bits.push({ p: [(i - 1) * 0.08, 0.13 + random() * 0.03, (random() - 0.5) * 0.03], r: [0, (random() - 0.5) * 0.5, (random() - 0.5) * 0.4], s: [0.042, 0.026, 0.13] });
        } else {
          geometry = new THREE.IcosahedronGeometry(1, 1);
          const n = a.food === 'forgotten' ? 6 : 9;
          for (let i = 0; i < n; i++) { const k = a.food === 'forgotten' ? mix(0.02, 0.035, random()) : mix(0.045, 0.062, random()); const p = inside(); p[1] += 0.02; bits.push({ p, r: turn(), s: [k, k * 0.75, k * 1.15] }); }
        }
        strew(g, geometry, foodMat, bits);
      }
      return g;
    };
    const down = a.state === 'rolling' ? [true, true] : a.state === 'one-down' ? (random() < 0.5 ? [true, false] : [false, true]) : [false, false];
    const loaded = a.state === 'rolling' || a.state === 'one-down' || a.state === 'draining';
    const hung: THREE.Group[] = [];
    vatX.forEach((x, i) => {
      const basket = makeBasket(loaded || (a.state === 'cold' && a.food === 'forgotten' && i === 0));
      if (down[i]) {
        basket.position.set(x, 0.868, vatZ - 0.03);
        basket.rotation.y = (random() - 0.5) * 0.12;
      } else {
        basket.position.set(x, barY - 0.1, barZ + bd / 2 + 0.015);
        basket.rotation.x = -0.22 - random() * 0.1;
        basket.rotation.z = (random() - 0.5) * 0.08;
        hung.push(basket);
      }
      s.root.add(basket);
    });

    // Things standing with it.
    const sideX = W / 2 + 0.2;
    if (a.beside === 'salt') {
      s.box([0.3, 0.02, 0.4], [sideX - 0.04, TOP - 0.02, 0.1], steel);
      s.rod([sideX - 0.04, TOP - 0.03, 0.1], [W / 2, TOP - 0.2, 0.1], 0.01, steel);
      s.cylinder(0.045, 0.05, 0.14, [sideX - 0.07, TOP + 0.06, 0.02], steel, 16);
      s.cylinder(0.02, 0.045, 0.03, [sideX - 0.07, TOP + 0.145, 0.02], steel, 16);
      const scoop = s.box([0.1, 0.05, 0.16], [sideX - 0.01, TOP + 0.02, 0.2], steel);
      scoop.rotation.y = 0.5;
      s.rod([sideX + 0.02, TOP + 0.03, 0.27], [sideX + 0.07, TOP + 0.05, 0.36], 0.012, dark);
    } else if (a.beside === 'bucket') {
      s.lathe([[0.0, 0], [0.12, 0], [0.15, 0.27], [0.158, 0.275]], s.material('#9aa0a0', { metalness: 0.6, roughness: 0.5, side: THREE.DoubleSide }), [sideX, 0, 0.18]);
      s.cylinder(0.143, 0.143, 0.01, [sideX, 0.21, 0.18], new THREE.MeshStandardMaterial({ color: '#1d1108', roughness: 0.1 }), 20);
      s.ring(0.15, 0.005, [sideX, 0.27, 0.18], steel, Math.PI).rotation.set(0.5, Math.PI / 2, 0);
      s.cylinder(0.2, 0.22, 0.004, [sideX + 0.02, 0.002, 0.2], grime, 14).castShadow = false;
    } else if (a.beside === 'cartons') {
      const card = s.material('#b9935e');
      const n = 2 + Math.floor(mix(0, 3.99, mood.density));
      for (let i = 0; i < n; i++) {
        const box = s.box([0.36, 0.2, 0.28], [sideX + 0.03 + (random() - 0.5) * 0.04, 0.1 + i * 0.2, 0.1 + (random() - 0.5) * 0.04], card);
        box.rotation.y = (random() - 0.5) * 0.3;
        const tag = s.label('FROZEN', 0.2, 0.07, [box.position.x, 0.1 + i * 0.2, box.position.z + 0.142], '#f2f2ea', '#2f5fa8');
        tag.rotation.y = box.rotation.y;
      }
    } else if (a.beside === 'extinguisher') {
      const red = s.material('#c8241c', { roughness: 0.4 });
      s.cylinder(0.075, 0.075, 0.42, [sideX - 0.05, 0.22, 0.2], red, 18);
      s.ball([0.075, 0.05, 0.075], [sideX - 0.05, 0.43, 0.2], red, 16);
      s.cylinder(0.02, 0.02, 0.07, [sideX - 0.05, 0.5, 0.2], dark, 10);
      s.box([0.03, 0.02, 0.12], [sideX - 0.05, 0.54, 0.23], dark);
      s.tube([[sideX - 0.05, 0.5, 0.2], [sideX + 0.04, 0.45, 0.2], [sideX + 0.04, 0.2, 0.22]], 0.012, dark);
      s.label('FIRE', 0.1, 0.06, [sideX - 0.05, 0.27, 0.277], '#ffffff', '#c8241c');
    }

    if (a.notice !== 'none') {
      const text = { hot: 'HOT OIL', filter: 'FILTER DAILY', order: 'OUT OF ORDER', touch: 'DO NOT TOUCH' }[a.notice];
      const note = s.label(text, 0.3, 0.11, [0.12 * (random() < 0.5 ? -1 : 1), 0.42, front + 0.018], a.notice === 'hot' ? '#111111' : '#a02018', a.notice === 'hot' ? '#f2c81e' : '#f4efdf');
      note.rotation.z = (random() - 0.5) * 0.2;
    }

    // Steam: soft see-through puffs that are not measured as part of the object.
    const puffs: { mesh: THREE.Mesh; x: number; z: number; phase: number; speed: number }[] = [];
    const smoke = a.food === 'forgotten' && on;
    const puffCount = a.state === 'rolling' ? Math.round(mix(8, 16, mood.energy)) : a.state === 'one-down' ? 7 : a.state === 'cold' ? 0 : 3;
    const steamMat = new THREE.MeshStandardMaterial({ color: smoke ? '#4a463f' : '#f4f1ea', transparent: true, opacity: smoke ? 0.3 : 0.2, depthWrite: false, roughness: 1 });
    const puffGeo = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < puffCount; i++) {
      const mesh = new THREE.Mesh(puffGeo, steamMat);
      const x = vatX[i % 2] + (random() - 0.5) * 0.2, z = vatZ + (random() - 0.5) * 0.2;
      puffs.push({ mesh, x, z, phase: random(), speed: mix(0.12, 0.3, random()) });
      s.root.add(mesh);
    }
    const drips: { mesh: THREE.Mesh; top: number; phase: number }[] = [];
    if (on && loaded) for (const basket of hung) for (let i = 0; i < 3; i++) {
      const mesh = s.ball([0.006, 0.012, 0.006], [basket.position.x + (random() - 0.5) * 0.18, 0, basket.position.z + (random() - 0.3) * 0.12], oil, 6);
      mesh.castShadow = false;
      drips.push({ mesh, top: basket.position.y, phase: random() });
    }
    const setPuffs = (time: number) => {
      for (const puff of puffs) {
        const t = (puff.phase + time * puff.speed * mix(0.5, 1.6, mood.energy)) % 1;
        const size = mix(0.05, 0.2, t);
        puff.mesh.scale.set(size, size * 1.15, size);
        puff.mesh.position.set(puff.x + Math.sin(t * 5 + puff.phase * 9) * 0.05, TOP + 0.05 + t * 0.95, puff.z - t * 0.1);
      }
      for (const drip of drips) {
        const t = (drip.phase + time * 0.9) % 1;
        drip.mesh.position.y = mix(drip.top, 0.89, t * t);
      }
    };
    setPuffs(0);
    const matrix = new THREE.Matrix4(), scale = new THREE.Vector3(), pos = new THREE.Vector3(), quat = new THREE.Quaternion();
    return s.finish({
      update: (_dt, time) => {
        setPuffs(time);
        if (bubbles && boiling) {
          for (let i = 0; i < bubbleBits.length; i++) {
            const bit = bubbleBits[i];
            const pulse = 0.55 + 0.45 * Math.sin(time * mix(4, 11, mood.energy) + i * 2.4);
            scale.setScalar((bit.s as number) * pulse);
            matrix.compose(pos.set(...bit.p), quat, scale);
            bubbles.setMatrixAt(i, matrix);
          }
          bubbles.instanceMatrix.needsUpdate = true;
        }
      },
    });
  },
});
