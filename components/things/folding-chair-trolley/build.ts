import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type V3 = readonly [number, number, number];
type Part = { m: THREE.Matrix4; c: THREE.Color };

/** Collects boxes, rods and lumps under a movable frame so a whole chair costs no extra draw calls. */
class Parts {
  boxes: Part[] = []; rods: Part[] = []; lumps: Part[] = [];
  frame = new THREE.Matrix4();
  private q = new THREE.Quaternion(); private up = new THREE.Vector3(0, 1, 0);
  box(p: V3, size: V3, c: THREE.ColorRepresentation, rot: V3 = [0, 0, 0]) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), this.q.setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...size));
    this.boxes.push({ m: m.premultiply(this.frame), c: new THREE.Color(c) });
  }
  rod(from: V3, to: V3, r: number, c: THREE.ColorRepresentation) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), dir = b.clone().sub(a), len = dir.length();
    const m = new THREE.Matrix4().compose(a.add(b).multiplyScalar(0.5), this.q.setFromUnitVectors(this.up, dir.normalize()), new THREE.Vector3(r, len, r));
    this.rods.push({ m: m.premultiply(this.frame), c: new THREE.Color(c) });
  }
  lump(p: V3, size: V3, c: THREE.ColorRepresentation, rot: V3 = [0, 0, 0]) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), this.q.setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...size));
    this.lumps.push({ m: m.premultiply(this.frame), c: new THREE.Color(c) });
  }
  at(x: number, y: number, z: number, yaw = 0, pitch = 0, roll = 0) {
    this.frame = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ')), new THREE.Vector3(1, 1, 1));
    return this;
  }
  within(parent: THREE.Matrix4, x: number, y: number, z: number, yaw = 0, pitch = 0, roll = 0) {
    this.at(x, y, z, yaw, pitch, roll);
    this.frame.premultiply(parent);
    return this;
  }
  emit(s: Sculpture, list: Part[], geometry: THREE.BufferGeometry, material: THREE.Material) {
    const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, list.length));
    mesh.count = list.length;
    list.forEach((part, i) => { mesh.setMatrixAt(i, part.m); mesh.setColorAt(i, part.c); });
    mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
    mesh.computeBoundingBox(); mesh.computeBoundingSphere();
    s.root.add(mesh);
  }
}

const SEATS = { burgundy: ['#7a2a36'], navy: ['#27365a'], green: ['#2f5a44'], grey: ['#8a8f92'], orange: ['#d9772e'], mixed: ['#7a2a36', '#27365a', '#2f5a44', '#8a8f92', '#d9772e', '#c9b06a'] } as const;

export default defineThing({
  questions: {
    chair: choice('What kind of hall chairs are they?', {
      steel: 'Grey tubular steel folding chairs with a thin vinyl pad, cold to sit on.',
      wooden: 'Old slatted wooden folding chairs, the kind that pinch fingers.',
      poly: 'Moulded plastic stacking chairs on steel legs, school-assembly chairs.',
      banquet: 'Padded banqueting chairs with gilt frames, stacked eight high.',
    }),
    stage: choice('Is the room being set up or cleared away?', {
      setup: 'Being set up: the trolley is still nearly full and the first few chairs have just been put out.',
      ready: 'Ready and waiting: nearly all the chairs are out, the trolley almost empty.',
      clearing: 'Being cleared away: half the chairs are back on the trolley, some folded and leaning against it, a few still standing where people sat.',
      packed: 'All packed away: every chair is back on the trolley and strapped down. It is over.',
    }),
    layout: choice('If chairs are out, how are they arranged?', {
      ring: 'A loose ring facing inward, for people who need to see each other.',
      rows: 'Short straight rows all facing the same way.',
      pairs: 'Pulled into twos and threes, turned toward each other for quiet talk.',
      alone: 'A tidy line, and one chair pulled well away from the others, turned to face nothing.',
    }),
    trolley: choice('If the chairs fold, what kind of trolley carries them?', {
      flatbed: 'A low flat-bed truck with a tubular push handle, chairs stacked lying flat.',
      rack: 'A long hanging rack, chairs stood upright in a row like books.',
      cage: 'A tall wire cage on castors.',
    }),
    colour: choice('What colour are the seats?', {
      burgundy: 'Burgundy.', navy: 'Navy blue.', green: 'Bottle green.', grey: 'Institutional grey.', orange: 'Seventies orange.', mixed: 'A mismatched mix collected over decades.',
    }),
    left: choice('What has been left behind on one of the chairs?', {
      nothing: 'Nothing.',
      orders: 'A folded order of service.',
      coat: 'A dark coat over the back, its owner still somewhere in the building.',
      handbag: 'A handbag tucked underneath.',
      stick: 'A walking stick hooked over the back.',
      plate: 'A paper plate with a napkin and crumbs.',
    }),
    fallen: noul('Has one chair been knocked over and left lying?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const P = new Parts();
    const folds = a.chair === 'steel' || a.chair === 'wooden';
    const frameColour = { steel: pick(['#a3a9ac', '#a3a9ac', '#3a3a3e', '#b9ad98']), wooden: pick(['#9a6a3a', '#7a4f2a', '#b98a54']), poly: '#b9bec1', banquet: '#c9a23c' }[a.chair];
    const wornTint = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#8b8275'), mood.wear * 0.3).offsetHSL(0, 0, rnd(-0.03, 0.03));
    const seatColour = () => a.chair === 'wooden' ? wornTint(frameColour).offsetHSL(0, 0, 0.04) : wornTint(pick(SEATS[a.colour]));
    const R = a.chair === 'wooden' ? 0.015 : a.chair === 'banquet' ? 0.012 : 0.011;

    const openChair = (colour: THREE.Color) => {
      if (folds) {
        for (const x of [-0.2, 0.2]) { P.rod([x, 0, 0.19], [x, 0.84, -0.17], R, frameColour); P.rod([x * 0.92, 0, -0.24], [x * 0.92, 0.45, 0.17], R, frameColour); }
        P.rod([-0.2, 0.03, 0.18], [0.2, 0.03, 0.18], R * 0.8, frameColour); P.rod([-0.185, 0.03, -0.22], [0.185, 0.03, -0.22], R * 0.8, frameColour);
        P.rod([-0.2, 0.84, -0.17], [0.2, 0.84, -0.17], R, frameColour);
        if (a.chair === 'wooden') {
          for (let i = 0; i < 4; i++) P.box([0, 0.455, -0.14 + i * 0.095], [0.4, 0.02, 0.08], colour);
          for (const y of [0.63, 0.76]) P.box([0, y, -0.085 - (y - 0.45) * 0.21], [0.4, 0.08, 0.018], colour, [-0.4, 0, 0]);
        } else {
          P.box([0, 0.455, 0], [0.4, 0.035, 0.38], colour);
          P.box([0, 0.71, -0.115], [0.4, 0.17, 0.025], colour, [-0.4, 0, 0]);
        }
      } else if (a.chair === 'poly') {
        for (const x of [-1, 1]) for (const z of [-1, 1]) P.rod([x * 0.2, 0, z * 0.21], [x * 0.17, 0.44, z * 0.16], R, frameColour);
        P.box([0, 0.45, 0], [0.44, 0.03, 0.42], colour); P.box([0, 0.47, 0.19], [0.44, 0.03, 0.05], colour, [0.5, 0, 0]);
        P.box([0, 0.69, -0.225], [0.42, 0.3, 0.028], colour, [-0.2, 0, 0]);
        for (const x of [-0.14, 0.14]) P.rod([x, 0.45, -0.19], [x, 0.58, -0.215], R, frameColour);
      } else {
        for (const x of [-1, 1]) { P.rod([x * 0.2, 0, 0.2], [x * 0.19, 0.44, 0.18], R, frameColour); P.rod([x * 0.2, 0, -0.22], [x * 0.17, 0.92, -0.25], R, frameColour); }
        P.rod([-0.17, 0.92, -0.25], [0.17, 0.92, -0.25], R, frameColour);
        P.box([0, 0.47, -0.01], [0.42, 0.075, 0.42], colour);
        P.box([0, 0.72, -0.235], [0.33, 0.32, 0.045], colour, [-0.04, 0, 0]);
      }
    };
    /** Folded flat: stands upright in its own frame, 0.95 m tall and a hand's width thick. */
    const foldedChair = (colour: THREE.Color) => {
      for (const x of [-0.2, 0.2]) { P.rod([x, 0, 0], [x, 0.95, 0], R, frameColour); P.rod([x * 0.92, 0.04, 0.022], [x * 0.92, 0.6, 0.022], R, frameColour); }
      P.rod([-0.2, 0.95, 0], [0.2, 0.95, 0], R, frameColour); P.rod([-0.2, 0.02, 0], [0.2, 0.02, 0], R * 0.8, frameColour);
      if (a.chair === 'wooden') { for (let i = 0; i < 4; i++) P.box([0, 0.27 + i * 0.095, 0.03], [0.38, 0.08, 0.018], colour); for (const y of [0.74, 0.87]) P.box([0, y, 0], [0.4, 0.08, 0.018], colour); }
      else { P.box([0, 0.42, 0.03], [0.38, 0.38, 0.03], colour); P.box([0, 0.83, 0], [0.4, 0.17, 0.025], colour); }
    };

    // ---- how many chairs, and where they are ----
    const total = Math.round(mix(8, 20, mood.density));
    const outShare = { setup: 0.25, ready: 0.85, clearing: 0.35, packed: 0 }[a.stage];
    const out = Math.min(8, Math.round(total * outShare));
    const leaning = a.stage === 'clearing' ? 2 + Math.floor(random() * 2) : a.stage === 'setup' && random() < 0.5 ? 1 : 0;
    const loaded = Math.max(a.stage === 'ready' ? 1 : 3, total - out - leaning);

    // ---- chairs that are out ----
    const spots: { x: number; z: number; yaw: number }[] = [];
    if (a.layout === 'ring') {
      const r = Math.max(0.62, (out * 0.54) / (Math.PI * 2));
      const gap = rnd(0, 6.28), sweep = Math.PI * 2 * (a.stage === 'setup' ? 0.45 : 0.86);
      for (let i = 0; i < out; i++) { const t = gap + (i / Math.max(out, 1)) * sweep + rnd(-0.08, 0.08), rr = r * rnd(0.9, 1.12); spots.push({ x: Math.cos(t) * rr, z: Math.sin(t) * rr, yaw: Math.atan2(-Math.cos(t), -Math.sin(t)) + rnd(-0.3, 0.3) }); }
    } else if (a.layout === 'rows') {
      const per = out > 6 ? 4 : 3;
      for (let i = 0; i < out; i++) spots.push({ x: ((i % per) - (per - 1) / 2) * 0.48 + rnd(-0.03, 0.03), z: (Math.floor(i / per) - 0.8) * -0.72 + rnd(-0.03, 0.03), yaw: rnd(-0.08, 0.08) });
    } else if (a.layout === 'pairs') {
      let i = 0;
      while (i < out) {
        const n = Math.min(out - i, random() < 0.5 ? 2 : 3), cx = rnd(-0.75, 0.75), cz = rnd(-0.7, 0.7), base = rnd(0, 6.28);
        if (spots.some((p) => Math.hypot(p.x - cx, p.z - cz) < 0.98) && random() < 0.9) continue;
        for (let k = 0; k < n; k++) { const t = base + (k / n) * Math.PI * 2 * (n === 2 ? 0.5 + 0.18 : 1); spots.push({ x: cx + Math.cos(t) * 0.42, z: cz + Math.sin(t) * 0.42, yaw: Math.atan2(-Math.cos(t), -Math.sin(t)) + rnd(-0.25, 0.25) }); }
        i += n;
      }
    } else {
      for (let i = 0; i < out - 1; i++) spots.push({ x: (i - (out - 2) / 2) * 0.5, z: -0.5 + rnd(-0.02, 0.02), yaw: rnd(-0.06, 0.06) });
      if (out > 0) spots.push({ x: rnd(-0.5, 0.5), z: 0.75, yaw: Math.PI + rnd(-0.5, 0.5) });
    }
    const minX = spots.length ? Math.min(...spots.map((p) => p.x)) : 0, maxX = spots.length ? Math.max(...spots.map((p) => p.x)) : 0;
    const shift = spots.length ? -maxX - 0.55 : 0;
    const fallenIndex = a.fallen && spots.length > 1 ? Math.floor(random() * spots.length) : -1;
    const leftIndex = spots.length ? (a.layout === 'alone' ? spots.length - 1 : (fallenIndex + 1 + Math.floor(random() * Math.max(1, spots.length - 1))) % spots.length) : -1;
    spots.forEach((spot, i) => {
      const x = spot.x + shift, colour = seatColour();
      if (i === fallenIndex) { P.at(x, 0.21, spot.z, spot.yaw + rnd(-0.5, 0.5), 0, Math.PI / 2 * (random() < 0.5 ? 1 : -1)); P.frame.multiply(new THREE.Matrix4().makeTranslation(0, 0, 0)); openChair(colour); return; }
      P.at(x, 0, spot.z, spot.yaw);
      openChair(colour);
      if (i !== leftIndex) return;
      const seatY = a.chair === 'banquet' ? 0.51 : 0.475;
      if (a.left === 'orders') { P.box([rnd(-0.05, 0.05), seatY + 0.004, 0.02], [0.15, 0.006, 0.21], '#f5f1e4', [0, rnd(-0.5, 0.5), 0]); P.box([0, seatY + 0.008, 0.0], [0.07, 0.002, 0.08], '#8b8f96', [0, 0.2, 0]); }
      else if (a.left === 'coat') { const top = folds ? 0.84 : a.chair === 'banquet' ? 0.92 : 0.84, bz = folds ? -0.17 : -0.25; const coat = pick(['#1e1d22', '#2a2c36', '#3a3026', '#4a4a50']); P.lump([0, top - 0.02, bz], [0.25, 0.07, 0.07], coat); P.box([0, top - 0.3, bz - 0.045], [0.44, 0.58, 0.03], coat, [0.06, 0, 0]); P.box([0, top - 0.16, bz + 0.05], [0.4, 0.3, 0.025], coat, [-0.1, 0, 0]); for (const sx of [-1, 1]) P.box([sx * 0.235, top - 0.34, bz - 0.01], [0.07, 0.5, 0.06], coat, [0, 0, sx * 0.06]); }
      else if (a.left === 'handbag') { const bag = pick(['#1e1d22', '#6b3a22', '#7a2a36', '#27365a']); P.box([0.03, 0.11, -0.02], [0.27, 0.2, 0.11], bag, [0, 0.3, 0]); P.rod([-0.06, 0.2, -0.05], [0.0, 0.3, -0.03], 0.007, bag); P.rod([0.0, 0.3, -0.03], [0.1, 0.2, 0.01], 0.007, bag); }
      else if (a.left === 'stick') { const top = folds ? 0.84 : 0.92, bz = folds ? -0.17 : -0.25; P.rod([0.12, top + 0.03, bz - 0.03], [0.17, 0.02, bz - 0.16], 0.011, '#6a4424'); P.rod([0.12, top + 0.03, bz - 0.03], [0.12, top + 0.03, bz + 0.07], 0.011, '#6a4424'); P.rod([0.12, top + 0.03, bz + 0.07], [0.125, top - 0.03, bz + 0.07], 0.011, '#6a4424'); }
      else if (a.left === 'plate') { P.rod([0, seatY, 0.02], [0, seatY + 0.01, 0.02], 0.09, '#f8f6f0'); P.lump([0.03, seatY + 0.03, 0.04], [0.04, 0.022, 0.035], '#f4f1e8', [0.5, 1, 0]); for (let k = 0; k < 6; k++) P.box([rnd(-0.06, 0.06), seatY + 0.012, rnd(-0.04, 0.08)], [0.008, 0.004, 0.008], '#c9964c'); }
    });

    // ---- the trolley ----
    const kind = folds ? a.trolley : 'dolly';
    const tx = spots.length ? 0.55 : 0, tz = spots.length ? rnd(-0.3, 0.1) : 0, tyaw = spots.length ? rnd(-0.5, -0.15) : rnd(-0.2, 0.2);
    void minX;
    const T = new THREE.Matrix4().compose(new THREE.Vector3(tx, 0, tz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, tyaw, 0)), new THREE.Vector3(1, 1, 1));
    const steel = '#8f969a', dark = '#232326', strap = '#e08a1e';
    const castor = (x: number, z: number) => { P.rod([x - 0.016, 0.05, z], [x + 0.016, 0.05, z], 0.05, dark); P.box([x, 0.11, z], [0.05, 0.05, 0.06], steel); };
    let lean: { x: number; z: number; yaw: number }[] = [];
    if (kind === 'flatbed') {
      P.within(T, 0, 0, 0);
      P.box([0, 0.16, 0], [0.56, 0.04, 1.1], pick(['#2f5d8a', '#3a3a3e', '#8a2a22', '#4a6a4a']));
      for (const x of [-0.23, 0.23]) for (const z of [-0.45, 0.45]) castor(x, z);
      for (const x of [-0.25, 0.25]) P.rod([x, 0.16, -0.54], [x, 0.98, -0.58], 0.014, steel);
      P.rod([-0.25, 0.98, -0.58], [0.25, 0.98, -0.58], 0.014, steel); P.rod([-0.25, 0.55, -0.56], [0.25, 0.55, -0.56], 0.01, steel);
      const n = Math.min(loaded, 15);
      for (let i = 0; i < n; i++) { P.within(T, rnd(-0.012, 0.012), 0.2 + i * 0.058, -0.49 + rnd(-0.015, 0.015), rnd(-0.03, 0.03), Math.PI / 2); foldedChair(seatColour()); }
      if (a.stage === 'packed') { P.within(T, 0, 0, 0); for (const z of [-0.2, 0.25]) { P.box([0, 0.2 + n * 0.058 + 0.004, z], [0.46, 0.006, 0.05], strap); for (const x of [-0.235, 0.235]) P.box([x, 0.19 + n * 0.029, z], [0.006, n * 0.058 + 0.03, 0.05], strap); } }
      lean = [{ x: 0.36, z: 0.1, yaw: Math.PI / 2 }, { x: 0.42, z: 0.12, yaw: Math.PI / 2 }, { x: 0.48, z: 0.08, yaw: Math.PI / 2 }];
    } else if (kind === 'rack') {
      P.within(T, 0, 0, 0);
      for (const z of [-0.26, 0.26]) P.rod([-0.78, 0.13, z], [0.78, 0.13, z], 0.016, steel);
      for (const x of [-0.78, 0.78]) { P.rod([x, 0.13, -0.26], [x, 0.13, 0.26], 0.016, steel); P.rod([x, 0.13, -0.26], [x, 1.22, 0], 0.016, steel); P.rod([x, 0.13, 0.26], [x, 1.22, 0], 0.016, steel); for (const z of [-0.26, 0.26]) castor(x, z); }
      P.rod([-0.78, 1.22, 0], [0.78, 1.22, 0], 0.016, steel);
      for (const z of [-0.12, 0.12]) P.rod([-0.78, 0.16, z], [0.78, 0.16, z], 0.012, steel);
      const n = Math.min(loaded, 19), pitch = Math.min(0.09, 1.4 / n);
      for (let i = 0; i < n; i++) { P.within(T, -0.7 + i * pitch + (a.stage === 'packed' ? 0 : rnd(-0.01, 0.01)), 0.18, 0, Math.PI / 2, 0, rnd(-0.04, 0.04)); foldedChair(seatColour()); }
      if (a.stage === 'packed') { P.within(T, 0, 0, 0); P.box([-0.7 + (n - 1) * pitch / 2, 0.7, 0.215], [n * pitch + 0.1, 0.05, 0.006], strap); P.box([-0.7 + (n - 1) * pitch / 2, 0.7, -0.215], [n * pitch + 0.1, 0.05, 0.006], strap); }
      lean = [{ x: 0.2, z: 0.36, yaw: 0 }, { x: 0.3, z: 0.42, yaw: 0 }, { x: -0.3, z: 0.38, yaw: 0 }];
    } else if (kind === 'cage') {
      P.within(T, 0, 0, 0);
      P.box([0, 0.15, 0], [0.76, 0.03, 1.0], '#3a3a3e');
      for (const x of [-0.33, 0.33]) for (const z of [-0.42, 0.42]) castor(x, z);
      for (let i = 0; i <= 5; i++) { const x = -0.37 + i * 0.148; P.rod([x, 0.16, -0.49], [x, 1.3, -0.49], 0.006, steel); }
      for (let i = 0; i <= 7; i++) { const z = -0.49 + i * 0.14; for (const x of [-0.37, 0.37]) P.rod([x, 0.16, z], [x, 1.3, z], 0.006, steel); }
      for (const y of [0.7, 1.3]) { P.rod([-0.37, y, -0.49], [0.37, y, -0.49], 0.009, steel); for (const x of [-0.37, 0.37]) P.rod([x, y, -0.49], [x, y, 0.49], 0.009, steel); }
      const n = Math.min(loaded, 16);
      for (let i = 0; i < n; i++) { P.within(T, rnd(-0.03, 0.03), 0.17, -0.44 + i * 0.058, 0, -0.07 + rnd(-0.02, 0.02)); foldedChair(seatColour()); }
      if (a.stage === 'packed') { P.within(T, 0, 0, 0); P.rod([-0.37, 0.95, 0.49], [0.37, 0.95, 0.49], 0.012, strap); P.rod([-0.37, 0.5, 0.49], [0.37, 0.5, 0.49], 0.012, strap); }
      lean = [{ x: 0.47, z: 0.1, yaw: Math.PI / 2 }, { x: 0.53, z: 0.14, yaw: Math.PI / 2 }, { x: 0.59, z: 0.05, yaw: Math.PI / 2 }];
    } else {
      // Stacking chairs ride a low dolly in one or two leaning towers.
      P.within(T, 0, 0, 0);
      P.box([0, 0.13, 0], [0.56, 0.04, loaded > 8 ? 1.15 : 0.6], '#3a3a3e');
      for (const x of [-0.23, 0.23]) for (const z of loaded > 8 ? [-0.5, 0.5] : [-0.24, 0.24]) castor(x, z);
      const rise = a.chair === 'banquet' ? 0.125 : 0.085, creep = a.chair === 'banquet' ? 0.012 : 0.035;
      const stacks = loaded > 8 ? [Math.ceil(loaded / 2), Math.floor(loaded / 2)] : [loaded];
      stacks.forEach((n, k) => {
        const colour = seatColour();
        for (let i = 0; i < Math.min(n, 10); i++) { P.within(T, rnd(-0.008, 0.008), 0.15 + i * rise, (stacks.length > 1 ? (k - 0.5) * 0.56 : 0) - 0.1 + i * creep, rnd(-0.02, 0.02)); openChair(a.colour === 'mixed' ? seatColour() : colour); }
      });
      lean = [{ x: 0.62, z: 0.0, yaw: rnd(-0.3, 0.3) }];
    }
    // Chairs waiting beside the trolley: folded and leaning, or a short stack.
    if (folds) for (let i = 0; i < Math.min(leaning, lean.length); i++) { const l = lean[i]; P.within(T, l.x, 0, l.z, l.yaw + rnd(-0.08, 0.08), l.yaw === 0 ? -0.2 - i * 0.02 : 0, 0); if (l.yaw !== 0) P.frame.multiply(new THREE.Matrix4().makeRotationX(0.2 + i * 0.02)); foldedChair(seatColour()); }
    else for (let i = 0; i < Math.min(leaning, 3); i++) { P.within(T, lean[0].x, i * (a.chair === 'banquet' ? 0.125 : 0.085), lean[0].z + i * 0.03, lean[0].yaw); openChair(seatColour()); }

    P.emit(s, P.boxes, new THREE.BoxGeometry(1, 1, 1), s.material('#ffffff', { roughness: 0.6 }));
    P.emit(s, P.rods, new THREE.CylinderGeometry(1, 1, 1, 8), s.material('#ffffff', { roughness: 0.4, metalness: a.chair === 'wooden' ? 0 : 0.25 }));
    P.emit(s, P.lumps, new THREE.IcosahedronGeometry(1, 1), s.material('#ffffff', { roughness: 0.9, flatShading: true }));
    return s.finish();
  },
});
