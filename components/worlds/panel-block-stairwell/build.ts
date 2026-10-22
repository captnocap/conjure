import * as THREE from 'three';
import { type Placeable, choice, defineWorld, disposeTree, mix, visibleBounds } from '@conjure/kit';

type P3 = [number, number, number];
const PAINTS = {
  olive: 'Olive green gloss below, whitewash above: the default of every housing office.',
  blue: 'Pale powder blue below, white above, cool and clean.',
  ochre: 'Mustard ochre below, cream above, warm and a little grubby.',
  brown: 'Dark chocolate gloss below, grey plaster above, heavy and dim.',
  mint: 'Mint green below, white above, like a clinic corridor.',
  rose: 'Dusty rose below, cream above, an unexpectedly tender choice.',
} as const;
const PAINT: Record<keyof typeof PAINTS, [string, string]> = {
  olive: ['#7f8d5c', '#e6e2d4'], blue: ['#9dbbc9', '#ebebe4'], ochre: ['#c79d48', '#eee5ca'], brown: ['#6d4f3d', '#d2cec3'], mint: ['#93c2a6', '#ecece3'], rose: ['#c9968c', '#eee4d6'],
};
const RISE = 0.175, TREAD = 0.32, STEPS = 8, RUN = TREAD * (STEPS - 1), HALF = RUN / 2, LIFT = RISE * STEPS;
const LAND = 1.7, XW = HALF + LAND, ZB = -1.3, ZF = 1.3, WELL = 0.15, FW = ZF - WELL, TOP = 5.3, BOTTOM = -1.6, SLAB = 0.2;

export default defineWorld({
  questions: {
    paint: choice('What two-tone paint is on the walls?', PAINTS),
    window: choice('What is the tall stair window like?', {
      frosted: 'A full-height wall of pale frosted glass bricks.',
      coloured: 'Glass bricks with amber and green ones set in at random.',
      patched: 'Glass bricks with several broken ones replaced by plywood and cement.',
      slits: 'Only two narrow vertical strips of glass brick, a meaner light.',
    }),
    doors: choice('What are the flat doors like?', {
      padded: 'Padded in buttoned leatherette, each one a different colour.',
      painted: 'Identical brown painted plywood, as the block was delivered.',
      steel: 'New grey steel security doors, anonymous.',
      mixed: 'One padded, one new steel: a building changing hands flat by flat.',
    }),
    railing: choice('What is the balustrade?', {
      bars: 'Thin steel bars under a red plastic-sleeved handrail.',
      wood: 'Flat steel uprights under a varnished wooden handrail.',
      green: 'Bars and rail all painted the same thick green.',
      parapet: 'A solid concrete parapet with a rounded top.',
    }),
    floor: choice('What is underfoot?', {
      terrazzo: 'Speckled grey terrazzo, worn smooth.',
      oxide: 'Concrete painted oxide red, worn grey along the walking line.',
      lino: 'Green linoleum glued over the landings.',
      tiles: 'Small buff and brown tiles in a checker.',
    }),
    life: choice('What does the stairwell say about the people who share it?', {
      kept: 'Looked after: a rug airing over the rail, plants on the window ledge, a broom in the corner.',
      neglected: 'Neglected: scrawls on the paint, litter on the steps, patches where it has peeled.',
      renovation: 'Being redone: one stretch freshly painted, a bucket, a dust sheet over the steps.',
      moving: 'Somebody is moving: boxes on the landings and a mattress against the wall.',
      quiet: 'Bare and quiet, nothing left out.',
    }),
    fixture: choice('What is fixed to the landing wall beside the doors?', {
      meters: 'A grey steel electricity meter cupboard with conduit rising from it.',
      notices: 'A notice board of curling papers.',
      pipes: 'Yellow gas risers and a meter.',
      none: 'Nothing.',
    }),
    view: choice('Where do we look from?', {
      section: 'Straight across the well, like a section drawing.',
      above: 'From high up, looking down into the turns of the stair.',
      toward: 'From the corner of the landing, looking along toward the window.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const floors = new THREE.Group();
    root.add(floors);
    const pick = <V,>(list: readonly V[]) => list[Math.floor(random() * list.length)];
    const put = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P3 = [0, 0, 0], parent: THREE.Object3D = root) => {
      const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    const box = (size: P3, at: P3, material: THREE.Material, parent: THREE.Object3D = root) => put(new THREE.BoxGeometry(...size), material, at, parent);
    const std = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...options });
    const paint = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) => {
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; draw(canvas.getContext('2d')!);
      const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
      if (repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(...repeat); }
      return tex;
    };
    const rod = (from: P3, to: P3, radius: number, material: THREE.Material) => {
      const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to), d = B.clone().sub(A);
      const mesh = put(new THREE.CylinderGeometry(radius, radius, Math.max(d.length(), 0.001), 8), material, A.clone().addScaledVector(d, 0.5).toArray() as P3);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return mesh;
    };

    // ---- time of day and light
    const noon = 1 - Math.abs(mood.daylight * 2 - 1);
    const lampsOn = noon < 0.36;
    const dusk = lampsOn ? 1 - noon / 0.36 : 0;
    const sky = new THREE.Color().setHSL(mix(0.07, 0.14, noon) + (1 - mood.warmth) * 0.42 * (1 - noon * 0.6), mix(0.55, 0.25, noon), mix(0.62, 0.9, noon));
    const lampColour = new THREE.Color('#ffc477').lerp(new THREE.Color('#fff0d2'), 1 - mood.warmth);
    const [lowHex, highHex] = PAINT[a.paint];
    const lowColour = new THREE.Color(lowHex), highColour = new THREE.Color(highHex);
    const grey = new THREE.Color('#9a968c');
    lowColour.lerp(grey, (1 - mood.cheer) * 0.28 + mood.wear * 0.1);
    highColour.lerp(grey, mood.wear * 0.22);
    const background = new THREE.Color('#e7e5dc').lerp(lowColour, 0.1).lerp(new THREE.Color('#aab0c0'), dusk * 0.55);
    root.add(new THREE.HemisphereLight('#fbf8f0', '#77736a', mix(1.25, 0.8, dusk)));
    const key = new THREE.DirectionalLight(new THREE.Color().setHSL(0.6 - mood.warmth * 0.5, 0.3, 0.9).lerp(new THREE.Color('#b9c6e6'), dusk * 0.6), mix(2.5, 1.1, dusk));
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.shadow.radius = 3;
    key.target.position.set(0, 1.4, 0);
    key.position.set(mix(-5, 5, mood.daylight), 9, 8);
    const sc = key.shadow.camera; sc.left = sc.bottom = -5.6; sc.right = sc.top = 5.6; sc.near = 1; sc.far = 32; sc.updateProjectionMatrix();
    root.add(key, key.target);
    const windowLight = new THREE.DirectionalLight(sky, mix(0.25, 1.0, noon));
    windowLight.position.set(6, 4, -5); root.add(windowLight);

    // ---- materials
    const lowMat = std(lowColour, { roughness: mix(0.4, 0.75, mood.wear), side: THREE.DoubleSide });
    const highMat = std(highColour, { roughness: 0.95 });
    const concrete = std(new THREE.Color('#b9b5a9').lerp(new THREE.Color('#8f8b80'), mood.wear * 0.5), { roughness: 0.95 });
    const floorTexture = paint(256, 256, (g) => {
      if (a.floor === 'terrazzo') { g.fillStyle = '#b6b3aa'; g.fillRect(0, 0, 256, 256); for (let k = 0; k < 1800; k++) { g.fillStyle = pick(['#6f6c66', '#e3e0d6', '#8d877c', '#4f4c48', '#c9b9a0']); g.beginPath(); g.ellipse(random() * 256, random() * 256, 1 + random() * 3, 1 + random() * 2, random() * 3, 0, 7); g.fill(); } }
      else if (a.floor === 'oxide') { g.fillStyle = '#9a4a3a'; g.fillRect(0, 0, 256, 256); const grd = g.createLinearGradient(0, 0, 256, 0); grd.addColorStop(0, 'rgba(160,155,145,0)'); grd.addColorStop(0.5, `rgba(160,155,145,${0.35 + mood.wear * 0.5})`); grd.addColorStop(1, 'rgba(160,155,145,0)'); g.fillStyle = grd; g.fillRect(0, 0, 256, 256); for (let k = 0; k < 300; k++) { g.fillStyle = 'rgba(170,165,155,0.5)'; g.fillRect(random() * 256, random() * 256, 2 + random() * 5, 2 + random() * 4); } }
      else if (a.floor === 'lino') { g.fillStyle = '#5f8a68'; g.fillRect(0, 0, 256, 256); for (let k = 0; k < 900; k++) { g.fillStyle = random() < 0.5 ? 'rgba(220,235,215,0.25)' : 'rgba(30,60,40,0.25)'; g.fillRect(random() * 256, random() * 256, 6 + random() * 14, 1.5); } g.fillStyle = 'rgba(30,40,30,0.5)'; g.fillRect(0, 126, 256, 3); }
      else { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#c9b48a' : '#8a5f3f'; g.fillRect(i * 32, j * 32, 32, 32); } g.strokeStyle = 'rgba(60,50,40,0.5)'; for (let i = 0; i <= 8; i++) { g.strokeRect(i * 32, 0, 0.5, 256); g.strokeRect(0, i * 32, 256, 0.5); } }
      for (let k = 0; k < mood.wear * 26; k++) { g.fillStyle = `rgba(50,44,38,${0.08 + random() * 0.14})`; g.beginPath(); g.ellipse(random() * 256, random() * 256, 8 + random() * 26, 5 + random() * 16, random() * 3, 0, 7); g.fill(); }
    }, [1, 1]);
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture, roughness: a.floor === 'lino' ? 0.5 : 0.8 });
    const treadMat = a.floor === 'lino' || a.floor === 'tiles' ? std('#aeaaa0', { roughness: 0.9 }) : floorMat;
    const nosing = std(new THREE.Color('#6f6a62'), { roughness: 0.7 });

    // ---- walls: back wall and the two end walls, whitewash with the gloss dado following the stairs
    const wallH = TOP - BOTTOM;
    box([XW * 2 + 0.3, wallH, 0.15], [0, BOTTOM + wallH / 2, ZB - 0.075], highMat);
    const openLeft = a.view === 'toward';
    for (const side of [-1, 1]) if (!(openLeft && side < 0)) box([0.15, wallH, ZF - ZB], [side * (XW + 0.075), BOTTOM + wallH / 2, 0], highMat);
    const D = 1.45;
    const poly = (points: [number, number][]) => { const shape = new THREE.Shape(); points.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y))); return new THREE.ShapeGeometry(shape); };
    const dadoBack: [number, number][][] = [
      [[-XW, 0], [-HALF, 0], [HALF, -LIFT], [XW, -LIFT], [XW, -LIFT + D], [HALF, -LIFT + D], [-HALF, D], [-XW, D]],
      [[XW, LIFT], [HALF, LIFT], [-HALF, 2 * LIFT], [-XW, 2 * LIFT], [-XW, Math.min(TOP, 2 * LIFT + D)], [-HALF, Math.min(TOP, 2 * LIFT + D)], [HALF, LIFT + D], [XW, LIFT + D]],
    ];
    for (const points of dadoBack) { const m = put(poly(points), lowMat, [0, 0, ZB + 0.004]); m.castShadow = false; }
    const stripe = std(lowColour.clone().multiplyScalar(0.6));
    for (const [from, to] of [[[-XW, D], [-HALF, D]], [[-HALF, D], [HALF, -LIFT + D]], [[XW, LIFT + D], [HALF, LIFT + D]], [[HALF, LIFT + D], [-HALF, 2 * LIFT + D]], [[-HALF, 2 * LIFT + D], [-XW, 2 * LIFT + D]]] as [[number, number], [number, number]][]) {
      if (from[1] > TOP || to[1] > TOP) continue;
      const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
      const m = box([len, 0.025, 0.004], [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, ZB + 0.007], stripe); m.rotation.z = Math.atan2(to[1] - from[1], to[0] - from[0]); m.castShadow = false;
    }
    for (const [side, levels] of [[-1, [0, 2 * LIFT]], [1, [-LIFT, LIFT]]] as [number, number[]][])
      for (const y of levels) {
        if (openLeft && side < 0) continue;
        const h = Math.min(D, TOP - y);
        const m = put(new THREE.PlaneGeometry(ZF - ZB, h), lowMat, [side * (XW - 0.004), y + h / 2, 0]); m.rotation.y = -side * Math.PI / 2; m.castShadow = false;
      }

    // ---- landings and flights
    const landing = (x0: number, x1: number, y: number) => {
      box([x1 - x0, SLAB, ZF - ZB], [(x0 + x1) / 2, y - SLAB / 2, 0], concrete, floors);
      const top = put(new THREE.PlaneGeometry(x1 - x0, ZF - ZB), floorMat, [(x0 + x1) / 2, y + 0.003, 0], floors); top.rotation.x = -Math.PI / 2; top.castShadow = false;
    };
    landing(-XW, -HALF, 0); landing(-XW, -HALF, 2 * LIFT); landing(HALF, XW, LIFT); landing(HALF, XW, -LIFT);
    const caps: { at: P3; dir: number }[] = [];
    const flight = (xStart: number, dir: number, y0: number, near: boolean, steps = STEPS) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      for (let j = 0; j < steps; j++) { shape.lineTo(j * TREAD, (j + 1) * RISE); if (j < steps - 1) shape.lineTo((j + 1) * TREAD, (j + 1) * RISE); }
      const endU = (steps - 1) * TREAD, endY = steps * RISE;
      shape.lineTo(endU, endY - SLAB - 0.04); shape.lineTo(0, -SLAB - 0.04); shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: FW, bevelEnabled: false });
      if (dir < 0) geo.scale(-1, 1, 1);
      const mesh = put(geo, concrete, [xStart, y0, near ? WELL : ZB], floors);
      if (dir < 0) { const index = geo.getIndex(); if (index) { const arr = index.array as Uint16Array | Uint32Array; for (let i = 0; i < arr.length; i += 3) { const t = arr[i]; arr[i] = arr[i + 2]; arr[i + 2] = t; } } else { const pos = geo.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pos.count; i += 3) { const ax = pos.getX(i), ay = pos.getY(i), az = pos.getZ(i); pos.setXYZ(i, pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2)); pos.setXYZ(i + 2, ax, ay, az); } } geo.computeVertexNormals(); }
      for (let j = 0; j < steps - 1; j++) caps.push({ at: [xStart + dir * (j + 0.5) * TREAD, y0 + (j + 1) * RISE, (near ? WELL : ZB) + FW / 2], dir });
      return mesh;
    };
    flight(-HALF, 1, 0, true);            // A: lower landing up to the half landing, near side
    flight(HALF, -1, LIFT, false);        // B: half landing up to the upper landing, far side
    flight(HALF, -1, -LIFT, false);       // D: descending from the lower landing on the far side, under B
    flight(-HALF, 1, 2 * LIFT, true, 4);  // C: a cut stub continuing upward
    {
      const capMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(TREAD, 0.012, FW), treadMat, caps.length);
      const noseMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.02, FW), nosing, caps.length);
      const m4 = new THREE.Matrix4();
      caps.forEach((cap, i) => { m4.makeTranslation(cap.at[0], cap.at[1] + 0.006, cap.at[2]); capMesh.setMatrixAt(i, m4); m4.makeTranslation(cap.at[0] - cap.dir * (TREAD / 2 - 0.012), cap.at[1] + 0.004, cap.at[2]); noseMesh.setMatrixAt(i, m4); });
      capMesh.receiveShadow = noseMesh.receiveShadow = true;
      floors.add(capMesh, noseMesh);
    }

    // ---- balustrades on the well side of each flight and round the landings
    const railColour = { bars: '#b8322a', wood: '#9a6a3c', green: '#4f7a58', parapet: '#b9b5a9' }[a.railing];
    const railMat = std(railColour, { roughness: a.railing === 'bars' ? 0.35 : 0.6 });
    const barMat = a.railing === 'green' ? railMat : std('#3a3c3d', { metalness: 0.5, roughness: 0.5 });
    const bars: { at: P3; h: number }[] = [];
    const RH = 0.92;
    const railRun = (from: P3, to: P3, count: number) => {
      if (a.railing === 'parapet') {
        const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to), len = Math.hypot(B.x - A.x, B.z - A.z);
        const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(len, B.y - A.y); shape.lineTo(len, B.y - A.y + RH); shape.lineTo(0, RH); shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.09, bevelEnabled: false }); geo.translate(0, 0, -0.045);
        const m = put(geo, concrete, from); m.rotation.y = -Math.atan2(B.z - A.z, B.x - A.x);
        rod([from[0], from[1] + RH, from[2]], [to[0], to[1] + RH, to[2]], 0.05, railMat);
        return;
      }
      rod([from[0], from[1] + RH, from[2]], [to[0], to[1] + RH, to[2]], a.railing === 'wood' ? 0.032 : 0.024, railMat);
      rod([from[0], from[1] + 0.12, from[2]], [to[0], to[1] + 0.12, to[2]], 0.01, barMat);
      for (let k = 0; k <= count; k++) { const t = k / count; bars.push({ at: [mix(from[0], to[0], t), mix(from[1], to[1], t), mix(from[2], to[2], t)], h: RH }); }
    };
    const slopeRail = (xStart: number, dir: number, y0: number, z: number, steps = STEPS) => railRun([xStart + dir * 0.02, y0 + RISE * 0.6, z], [xStart + dir * (steps - 1) * TREAD, y0 + steps * RISE, z], (steps - 1) * 2);
    slopeRail(-HALF, 1, 0, WELL + 0.05);
    slopeRail(HALF, -1, LIFT, -WELL - 0.05);
    slopeRail(HALF, -1, -LIFT, -WELL - 0.05);
    slopeRail(-HALF, 1, 2 * LIFT, WELL + 0.05, 4);
    railRun([-HALF, 0, -WELL - 0.05], [-HALF, 0, WELL + 0.05], 1);
    railRun([HALF, LIFT, -WELL - 0.05], [HALF, LIFT, WELL + 0.05], 1);
    railRun([-HALF, 2 * LIFT, -WELL - 0.05], [-HALF, 2 * LIFT, WELL + 0.05], 1);
    if (bars.length) {
      const flat = a.railing === 'wood';
      const barMesh = new THREE.InstancedMesh(flat ? new THREE.BoxGeometry(0.03, 1, 0.008) : new THREE.CylinderGeometry(0.008, 0.008, 1, 6), barMat, bars.length);
      const m4 = new THREE.Matrix4();
      bars.forEach((bar, i) => { m4.makeScale(1, bar.h, 1).setPosition(bar.at[0], bar.at[1] + bar.h / 2, bar.at[2]); barMesh.setMatrixAt(i, m4); });
      barMesh.castShadow = true; root.add(barMesh);
    }

    // ---- the glass brick window on the back wall by the half landings
    const glowIntensity = mix(0.3, 1.0, noon);
    const brickCols = a.window === 'slits' ? 1 : 6, brick = 0.2;
    const windowStrip = (x: number, y0: number, y1: number) => {
      const rows = Math.round((y1 - y0) / brick), h = rows * brick, w = brickCols * brick;
      const tex = paint(brickCols * 48, rows * 48, (g) => {
        g.fillStyle = '#7d7a72'; g.fillRect(0, 0, brickCols * 48, rows * 48);
        for (let c = 0; c < brickCols; c++) for (let r = 0; r < rows; r++) {
          let tint = '#e3efe8';
          if (a.window === 'coloured' && random() < 0.28) tint = pick(['#f0c15a', '#8fd0a0', '#f0c15a', '#e8a070']);
          if (a.window === 'patched' && random() < 0.16) tint = pick(['#8a6a48', '#6f6c66', '#a08060']);
          if (random() < mood.wear * 0.25) tint = '#c3cdc6';
          g.fillStyle = tint; g.fillRect(c * 48 + 3, r * 48 + 3, 42, 42);
          if (!tint.startsWith('#8a') && !tint.startsWith('#6f') && !tint.startsWith('#a0')) { g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 3; g.strokeRect(c * 48 + 10, r * 48 + 10, 28, 28); g.strokeStyle = 'rgba(90,120,110,0.28)'; g.strokeRect(c * 48 + 16, r * 48 + 16, 16, 16); }
        }
      });
      const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: sky.clone().lerp(new THREE.Color('#ffffff'), 0.35), emissiveIntensity: glowIntensity, roughness: 0.25 });
      box([w + 0.1, h + 0.1, 0.06], [x, y0 + h / 2, ZB + 0.01], concrete);
      put(new THREE.PlaneGeometry(w, h), mat, [x, y0 + h / 2, ZB + 0.045]).castShadow = false;
      return mat;
    };
    const winX = HALF + LAND / 2 + 0.05;
    const glassMats: THREE.MeshStandardMaterial[] = [];
    for (const x of a.window === 'slits' ? [winX - 0.4, winX + 0.4] : [winX]) { glassMats.push(windowStrip(x, LIFT + 0.8, TOP - 0.1)); glassMats.push(windowStrip(x, -LIFT + 0.8, LIFT - SLAB - 0.1)); }
    box([1.5, 0.05, 0.22], [winX, LIFT + 0.76, ZB + 0.11], concrete);
    // Shafts of light from the bricks: see-through, so nothing measures them.
    const shaftMat = new THREE.MeshBasicMaterial({ color: sky.clone().lerp(new THREE.Color('#ffffff'), 0.5), transparent: true, opacity: mix(0.0, 0.13, noon) * mix(0.6, 1, mood.warmth), depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    for (let k = 0; k < 3; k++) {
      const shaft = put(new THREE.PlaneGeometry(0.34, 3.6), shaftMat, [winX - 0.45 + k * 0.45, LIFT + 1.45, ZB + 1.35]);
      shaft.rotation.set(-0.85, 0, 0); shaft.castShadow = shaft.receiveShadow = false;
    }

    // ---- flat doors on the main landings
    const lampMats: THREE.MeshStandardMaterial[] = [];
    const hides = ['#6a2a26', '#5a3d2c', '#2f4f3c', '#26221f', '#55687a', '#8a6a44'];
    const door = (x: number, y: number, kind: 'padded' | 'painted' | 'steel', flatNo: number) => {
      const g0 = new THREE.Group(); g0.position.set(x, y, ZB); root.add(g0);
      const frame = std(kind === 'steel' ? '#8f9396' : '#5a3a26', { roughness: 0.5 });
      box([1.02, 2.08, 0.07], [0, 1.04, 0.035], frame, g0);
      const hide = pick(hides);
      const tex = paint(128, 288, (g) => {
        if (kind === 'padded') {
          g.fillStyle = hide; g.fillRect(0, 0, 128, 288);
          for (let i = -4; i < 8; i++) for (const s of [1, -1]) { const grd = g.createLinearGradient(0, 0, 32, 32); grd.addColorStop(0, 'rgba(255,255,255,0.13)'); grd.addColorStop(1, 'rgba(0,0,0,0.25)'); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 3; g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + s * 288 * (32 / 36), 288); g.stroke(); }
          g.fillStyle = '#d4ad52';
          for (let i = 0; i <= 4; i++) for (let j = 0; j <= 16; j++) if ((i + j) % 2 === 0) { g.beginPath(); g.arc(i * 32, j * 18, 2.6, 0, 7); g.fill(); }
          for (let k = 0; k < 30; k++) { g.beginPath(); g.arc(4, k * 10, 1.8, 0, 7); g.arc(124, k * 10, 1.8, 0, 7); g.fill(); }
        } else if (kind === 'painted') {
          g.fillStyle = '#6f4a30'; g.fillRect(0, 0, 128, 288); g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2; g.strokeRect(14, 16, 100, 110); g.strokeRect(14, 150, 100, 120);
          for (let k = 0; k < mood.wear * 30; k++) { g.fillStyle = 'rgba(190,170,140,0.5)'; g.fillRect(random() * 128, 200 + random() * 88, 3 + random() * 10, 2 + random() * 5); }
        } else {
          g.fillStyle = '#7f8689'; g.fillRect(0, 0, 128, 288); g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 2; for (const yy of [20, 110, 200]) g.strokeRect(16, yy, 96, 70);
        }
        g.fillStyle = '#e9e6dc'; g.fillRect(50, 44, 28, 16); g.fillStyle = '#1f2f6a'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.fillText(String(flatNo), 64, 57);
        g.fillStyle = '#d4ad52'; g.beginPath(); g.arc(64, 78, 3.2, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(64, 78, 1.5, 0, 7); g.fill();
        g.fillStyle = '#c9cdd0'; g.fillRect(108, 136, 10, 22);
      });
      box([0.88, 2.0, 0.05], [0, 1.0, 0.06], new THREE.MeshStandardMaterial({ map: tex, roughness: kind === 'padded' ? 0.5 : 0.6, metalness: kind === 'steel' ? 0.3 : 0 }), g0);
      box([0.1, 0.02, 0.05], [0.33, 1.02, 0.11], std('#c9cdd0', { metalness: 0.7, roughness: 0.3 }), g0);
      box([0.7, 0.02, 0.42], [0, 0.011, 0.36], std(pick(['#8a6a3c', '#2a2c2e', '#7a3a3a', '#5a6a4a']), { roughness: 1 }), g0);
      const home = random() < mix(0.25, 0.8, mood.cheer);
      if (home) { const slit = std('#ffd48a', { emissive: lampColour, emissiveIntensity: mix(0.5, 2.2, dusk) }); box([0.84, 0.014, 0.012], [0, 0.012, 0.085], slit, g0).castShadow = false; }
      // The landing light above the door.
      const lampMat = new THREE.MeshStandardMaterial({ color: '#f4efe0', emissive: lampColour, emissiveIntensity: lampsOn ? 2.2 : 0.08, roughness: 0.4 });
      lampMats.push(lampMat);
      box([0.2, 0.2, 0.04], [0.02, 2.38, 0.02], std('#8b8f8e', { metalness: 0.5 }), g0);
      const dome = put(new THREE.SphereGeometry(0.085, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), lampMat, [0.02, 2.38, 0.04], g0); dome.rotation.x = Math.PI / 2; dome.castShadow = false;
      box([0.07, 0.07, 0.03], [0.62, 1.3, 0.015], std('#3b2a20'), g0);
    };
    const kinds = (a.doors === 'mixed' ? ['padded', 'steel'] : [a.doors, a.doors]) as ('padded' | 'painted' | 'steel')[];
    const firstFlat = 1 + Math.floor(random() * 60);
    const doorX = -HALF - LAND + 0.62;
    door(doorX, 0, kinds[0], firstFlat); door(doorX, 2 * LIFT, kinds[1], firstFlat + 3);

    // ---- fixtures beside the doors
    const fx = -HALF - 0.38;
    for (const y of [0, 2 * LIFT]) {
      if (y + 2 > TOP) continue;
      if (a.fixture === 'meters') {
        box([0.46, 0.62, 0.14], [fx, y + 1.5, ZB + 0.07], std('#9aa0a2', { metalness: 0.4, roughness: 0.5 }));
        for (const dx of [-0.11, 0.11]) box([0.14, 0.12, 0.01], [fx + dx, y + 1.62, ZB + 0.145], std('#1c2226', { roughness: 0.15 }));
        box([0.4, 0.004, 0.004], [fx, y + 1.42, ZB + 0.142], std('#55595a'));
        rod([fx + 0.15, y + 1.81, ZB + 0.04], [fx + 0.15, Math.min(TOP, y + 2.75), ZB + 0.04], 0.014, std('#8f9396', { metalness: 0.5 }));
      } else if (a.fixture === 'notices') {
        box([0.5, 0.66, 0.025], [fx, y + 1.5, ZB + 0.012], std('#9a7a50'));
        for (let k = 0; k < 3 + Math.round(mood.density * 4); k++) { const n = box([0.13 + random() * 0.08, 0.16 + random() * 0.1, 0.003], [fx + (random() - 0.5) * 0.28, y + 1.5 + (random() - 0.5) * 0.36, ZB + 0.028 + k * 0.002], std(pick(['#f1eee2', '#f3e9a8', '#e9d0d0', '#d6e6f0']), { roughness: 1 })); n.rotation.z = (random() - 0.5) * 0.3; n.castShadow = false; }
      } else if (a.fixture === 'pipes') {
        const gas = std('#d9b21f', { roughness: 0.5 });
        rod([fx - 0.1, y + 0.01, ZB + 0.06], [fx - 0.1, Math.min(TOP, y + 2.75), ZB + 0.06], 0.022, gas);
        rod([fx - 0.1, y + 1.2, ZB + 0.06], [fx + 0.1, y + 1.2, ZB + 0.06], 0.016, gas);
        box([0.24, 0.26, 0.13], [fx + 0.16, y + 1.28, ZB + 0.08], std('#b9bcbc', { metalness: 0.5, roughness: 0.4 }));
        const tap = box([0.08, 0.02, 0.02], [fx - 0.1, y + 0.9, ZB + 0.09], std('#b8322a')); tap.rotation.z = 0.5;
      }
    }

    // ---- what the neighbours have left about
    const wallZ = ZB + 0.008;
    const sloped = (u: number) => LIFT + (HALF - u) / RUN * LIFT;  // floor height along flight B at x = u
    if (a.life === 'kept') {
      const rug = paint(64, 128, (g) => { const cs = ['#a8322a', '#2f4f7a', '#e3c95a', '#3d6a4a', '#e9e3d0']; let y = 0; while (y < 128) { const h = 5 + random() * 14; g.fillStyle = pick(cs); g.fillRect(0, y, 64, h); y += h; } g.strokeStyle = '#e9e3d0'; g.lineWidth = 4; g.strokeRect(2, 2, 60, 124); });
      const rugMat = new THREE.MeshStandardMaterial({ map: rug, roughness: 1, side: THREE.DoubleSide });
      const rx = 0.25, ry = sloped(rx) + RH + 0.02;
      const slope = -LIFT / RUN;
      for (const s of [-1, 1]) {
        const geo = new THREE.PlaneGeometry(0.62, 0.6, 4, 1);
        const pos = geo.attributes.position as THREE.BufferAttribute;
        for (let k = 0; k < pos.count; k++) pos.setY(k, pos.getY(k) + pos.getX(k) * slope);
        put(geo, rugMat, [rx, ry - 0.3, -WELL - 0.05 + s * 0.035]);
      }
      for (let k = 0; k < 3; k++) {
        const px = winX - 0.45 + k * 0.45, py = LIFT + 0.785;
        put(new THREE.CylinderGeometry(0.07, 0.05, 0.11, 12), std(pick(['#b9623c', '#e9e6dc', '#d8402f', '#3e6fa8']), { roughness: 0.8 }), [px, py + 0.055, ZB + 0.12]);
        const leaf = std(pick(['#4f8f3a', '#3f7048', '#6f9f58']), { roughness: 0.8 });
        for (let j = 0; j < 5; j++) { const b = put(new THREE.SphereGeometry(1, 8, 6), leaf, [px + (random() - 0.5) * 0.1, py + 0.16 + random() * 0.14, ZB + 0.12 + (random() - 0.5) * 0.06]); b.scale.set(0.05 + random() * 0.03, 0.04 + random() * 0.04, 0.04); }
        if (random() < 0.6) put(new THREE.SphereGeometry(0.03, 8, 6), std(pick(['#e0262b', '#f0559a', '#f6eef0']), { emissive: '#aa2030', emissiveIntensity: 0.2 }), [px, py + 0.32, ZB + 0.13]);
      }
      rod([XW - 0.12, LIFT, ZB + 0.3], [XW - 0.05, LIFT + 1.35, ZB + 0.12], 0.014, std('#c9a86a'));
      box([0.3, 0.14, 0.05], [XW - 0.13, LIFT + 0.07, ZB + 0.31], std('#b98a3a', { roughness: 1 }));
    } else if (a.life === 'neglected') {
      const scrawl = paint(256, 128, (g) => {
        g.lineCap = 'round';
        for (let k = 0; k < 6 + mood.density * 6; k++) { g.strokeStyle = pick(['rgba(20,20,30,0.85)', 'rgba(170,30,30,0.8)', 'rgba(240,240,235,0.85)', 'rgba(30,60,140,0.8)']); g.lineWidth = 2 + random() * 3; g.beginPath(); let x = random() * 220, y = 20 + random() * 90; g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += 8 + random() * 16; y += (random() - 0.5) * 44; g.lineTo(x, Math.max(6, Math.min(122, y))); } g.stroke(); }
      });
      const scrawlMat = new THREE.MeshStandardMaterial({ map: scrawl, transparent: true, alphaTest: 0.25, roughness: 0.9 });
      put(new THREE.PlaneGeometry(1.5, 0.75), scrawlMat, [winX - 0.1 - 1.9, sloped(0.2) + 0.95, wallZ + 0.004]).rotation.z = -Math.atan2(LIFT, RUN);
      put(new THREE.PlaneGeometry(1.0, 0.5), scrawlMat, [-HALF - 0.4, 0.75, wallZ + 0.004]).castShadow = false;
      const peel = std(new THREE.Color('#cfc9ba'), { roughness: 1 });
      for (let k = 0; k < 6 + mood.wear * 10; k++) {
        const u = -XW + 0.2 + random() * (XW * 2 - 0.4), inLeft = u < -HALF, inRight = u > HALF;
        const base = pick(inLeft ? [0, 2 * LIFT] : inRight ? [LIFT] : [sloped(u)]);
        const y = base + 0.15 + random() * 1.1; if (y > TOP - 0.2) continue;
        const patch = put(new THREE.CircleGeometry(0.06 + random() * 0.12, 7), peel, [u, y, wallZ + 0.002]); patch.scale.y = 0.5 + random() * 0.9; patch.rotation.z = random() * 3; patch.castShadow = false;
      }
      const litter = caps.filter(() => random() < 0.2 + mood.density * 0.4);
      for (const cap of litter) { const l = box([0.1 + random() * 0.12, 0.004 + random() * 0.03, 0.08 + random() * 0.1], [cap.at[0], cap.at[1] + 0.02, cap.at[2] + (random() - 0.5) * 0.8], std(pick(['#e9e6dc', '#d9d5c6', '#c8332b', '#3e6fa8', '#e9d94a', '#6a4a2a']), { roughness: 0.9 })); l.rotation.y = random() * 3; }
    } else if (a.life === 'renovation') {
      const fresh = std(new THREE.Color(pick(['#f0d27a', '#a8d8c0', '#f4b8a0', '#b8d4ee', '#f6f4ec'])), { roughness: 0.3 });
      const freshPoly: [number, number][] = [[XW, LIFT], [HALF, LIFT], [-0.2, sloped(-0.2)], [-0.2, sloped(-0.2) + D], [HALF, LIFT + D], [XW, LIFT + D]];
      put(poly(freshPoly), fresh, [0, 0, wallZ]).castShadow = false;
      const tape = box([0.03, D, 0.004], [-0.2, sloped(-0.2) + D / 2, wallZ + 0.003], std('#e9d98a')); tape.castShadow = false;
      const sheet = put(new THREE.PlaneGeometry(1.5, 1.0), std('#ecebe4', { roughness: 1, side: THREE.DoubleSide }), [0.3, sloped(0.3) + 0.13, ZB + 0.55]);
      sheet.rotation.set(-Math.PI / 2, Math.atan2(LIFT, RUN), 0);
      const bx = XW - 0.35, bz = ZB + 0.35;
      put(new THREE.CylinderGeometry(0.14, 0.12, 0.26, 16), std('#e9e6dc', { roughness: 0.5 }), [bx, LIFT + 0.13, bz]);
      put(new THREE.CylinderGeometry(0.13, 0.13, 0.01, 16), fresh, [bx, LIFT + 0.255, bz]);
      rod([bx - 0.05, LIFT + 0.2, bz], [bx - 0.3, LIFT + 0.75, bz + 0.1], 0.012, std('#c9a86a'));
      const roller = put(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 12), fresh, [bx - 0.32, LIFT + 0.78, bz + 0.1]); roller.rotation.x = Math.PI / 2;
      // A stepladder straddling the lower landing corner.
      const lx = -XW + 0.35, lz = ZB + 0.9, alu = std('#c3c7c8', { metalness: 0.6, roughness: 0.4 });
      for (const dz of [-0.2, 0.2]) { rod([lx - 0.25, 0, lz + dz], [lx, 1.5, lz + dz * 0.6], 0.016, alu); rod([lx + 0.3, 0, lz + dz], [lx, 1.5, lz + dz * 0.6], 0.014, alu); }
      for (let k = 1; k < 5; k++) box([0.03, 0.02, 0.36], [lx - 0.25 + k * 0.05, k * 0.3, lz], alu);
      box([0.2, 0.03, 0.3], [lx, 1.5, lz], alu);
    } else if (a.life === 'moving') {
      const card = std('#b58a5a', { roughness: 0.95 }), tapeMat = std('#d9cf9a');
      const stack = (x: number, y: number, z: number, n: number) => { let h = y; for (let k = 0; k < n; k++) { const w = 0.32 + random() * 0.16, bh = 0.22 + random() * 0.14, d = 0.28 + random() * 0.12; const b = box([w, bh, d], [x + (random() - 0.5) * 0.08, h + bh / 2, z + (random() - 0.5) * 0.06], card); b.rotation.y = (random() - 0.5) * 0.4; const t = box([w + 0.004, 0.004, 0.05], [b.position.x, h + bh + 0.002, b.position.z], tapeMat); t.rotation.y = b.rotation.y; h += bh; } };
      const n = 1 + Math.round(mood.density * 2);
      stack(XW - 0.35, LIFT, ZB + 0.35, 1 + n); stack(-XW + 0.32, 0, ZB + 0.85, n); stack(-XW + 0.32, 2 * LIFT, ZB + 0.9, n); stack(XW - 0.4, LIFT, ZF - 0.35, 1);
      const mattress = box([1.85, 0.9, 0.18], [0.1, sloped(0.1) + 0.62, ZB + 0.16], std(pick(['#e6dfd0', '#d9d0e0', '#d0dce0']), { roughness: 1 }));
      mattress.rotation.z = -Math.atan2(LIFT, RUN); mattress.rotation.x = -0.1;
      const stripes = box([1.86, 0.04, 0.19], [0.1, sloped(0.1) + 0.62, ZB + 0.16], std('#7a8aa8')); stripes.rotation.copy(mattress.rotation);
    }
    // Stains under the dado line and a dark scuff along the walls grow with wear.
    if (mood.wear > 0.3) {
      const stain = new THREE.MeshBasicMaterial({ color: '#4a4338', transparent: true, opacity: mix(0.04, 0.22, mood.wear), depthWrite: false });
      for (let k = 0; k < 8; k++) { const m = put(new THREE.PlaneGeometry(0.3 + random() * 0.5, 0.5 + random() * 1.2), stain, [-XW + 0.3 + random() * (XW * 2 - 0.6), BOTTOM + 0.6 + random() * (wallH - 1.5), wallZ + 0.005]); m.castShadow = m.receiveShadow = false; }
    }

    // ---- a lamp on the half landing, and warm pools when the lamps are on
    {
      const lampMat = new THREE.MeshStandardMaterial({ color: '#f4efe0', emissive: lampColour, emissiveIntensity: lampsOn ? 2.2 : 0.08, roughness: 0.4 });
      lampMats.push(lampMat);
      box([0.04, 0.2, 0.2], [XW - 0.02, LIFT + 2.3, 0.3], std('#8b8f8e', { metalness: 0.5 }));
      const dome = put(new THREE.SphereGeometry(0.085, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), lampMat, [XW - 0.04, LIFT + 2.3, 0.3]); dome.rotation.z = Math.PI / 2; dome.castShadow = false;
    }
    const pools: THREE.PointLight[] = [];
    if (lampsOn) for (const at of [[doorX, 2.2, ZB + 0.6], [XW - 0.5, LIFT + 2.1, 0.3]] as P3[]) { const light = new THREE.PointLight(lampColour, mix(2, 9, dusk), 6, 1.6); light.position.set(...at); root.add(light); pools.push(light); }

    // ---- camera and placement
    const camera = new THREE.PerspectiveCamera(a.view === 'toward' ? 30 : 27, 1, 0.5, 120);
    const toCamera = new THREE.Vector3(...({ section: [0.03, 0.2, 1], above: [0.1, 0.62, 1], toward: [-0.5, 0.3, 1] } as const)[a.view]).normalize();
    const slots = [
      { at: [HALF + LAND / 2 + 0.05, LIFT, 0.15] as P3, r: 0.62, h: 2.1, turn: -0.18 },
      { at: [-HALF - LAND / 2 - 0.05, 0, 0.5] as P3, r: 0.6, h: 2.0, turn: 0.2 },
      { at: [-HALF - LAND / 2 - 0.05, 2 * LIFT, 0.4] as P3, r: 0.58, h: 2.0, turn: 0.2 },
      { at: [XW - 0.45, LIFT, ZF - 0.4] as P3, r: 0.32, h: 1.0, turn: -0.4 },
      { at: [-HALF + TREAD * 2.5, RISE * 3, WELL + FW / 2 + 0.1] as P3, r: 0.26, h: 0.8, turn: 0.1 },
    ];
    const frameBox = new THREE.Box3(new THREE.Vector3(-XW - 0.15, -0.75, ZB - 0.15), new THREE.Vector3(XW + 0.15, TOP, ZF));
    const place = (items: readonly Placeable[]) => {
      const [hero, ...rest] = items;
      const ordered = rest.slice().sort((p, q) => Math.max(q.radius, q.height * 0.4) - Math.max(p.radius, p.height * 0.4));
      const boxes: THREE.Box3[] = [frameBox];
      [hero, ...ordered].forEach((item, index) => {
        if (!item) return;
        const slot = slots[index % slots.length];
        const scale = Math.min(slot.h / Math.max(item.height, 0.05), slot.r / Math.max(item.radius, 0.05), item.hero ? 1.4 : 1.3);
        item.holder.scale.setScalar(scale);
        item.holder.position.set(...slot.at);
        item.holder.rotation.y = slot.turn + (random() - 0.5) * 0.2;
        item.holder.updateMatrixWorld(true);
        boxes.push(visibleBounds(item.holder));
      });
      const all = boxes.reduce((sum, b) => sum.union(b), new THREE.Box3());
      const target = all.getCenter(new THREE.Vector3());
      const corners: THREE.Vector3[] = [];
      for (const b of boxes) for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) corners.push(new THREE.Vector3(x, y, z));
      const fits = (distance: number) => {
        camera.position.copy(target).addScaledVector(toCamera, distance);
        camera.lookAt(target); camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
        const range = new THREE.Box2(); const p = new THREE.Vector3();
        for (const corner of corners) { p.copy(corner).project(camera); range.expandByPoint(new THREE.Vector2(p.x, p.y)); }
        return range;
      };
      for (let pass = 0; pass < 3; pass++) {
        let distance = 5;
        let range = fits(distance);
        while (distance < 60 && Math.max(range.max.x - range.min.x, range.max.y - range.min.y) > 1.86) { distance += 0.25; range = fits(distance); }
        // Slide the aim so the stair sits in the middle of the frame.
        const mid = range.getCenter(new THREE.Vector2());
        const height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
        target.addScaledVector(right, mid.x * height / 2).addScaledVector(up, mid.y * height / 2);
        fits(distance);
      }
    };
    place([]);

    const flicker = mix(0.02, 0.22, mood.energy) * (0.4 + mood.wear);
    const hash = (n: number) => { const v = Math.sin(n * 91.7 + context.seed * 0.013) * 43758.5453; return v - Math.floor(v); };
    return {
      object: root, camera, background, capacity: slots.length, ground: floors, keyLight: key, place,
      update(_dt, time) {
        lampMats.forEach((lampMat, i) => {
          const stutter = hash(Math.floor(time * 14) + i * 31) < flicker ? 0.35 : 1;
          lampMat.emissiveIntensity = (lampsOn ? 2.2 : 0.08) * stutter;
          if (pools[i]) pools[i].intensity = mix(2, 9, dusk) * stutter;
        });
        const breathe = 1 + Math.sin(time * 0.6) * 0.04;
        for (const glass of glassMats) glass.emissiveIntensity = glowIntensity * breathe;
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
