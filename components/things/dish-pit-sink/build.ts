import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type V3 = [number, number, number];
interface Bit { p: V3; r?: V3; s?: V3 | number; c?: THREE.ColorRepresentation }

function strew(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, bits: readonly Bit[]) {
  if (!bits.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, bits.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), po = new THREE.Vector3();
  bits.forEach((bit, i) => {
    e.set(...(bit.r ?? [0, 0, 0]));
    q.setFromEuler(e);
    if (typeof bit.s === 'number') sc.setScalar(bit.s); else sc.set(...(bit.s ?? [1, 1, 1]));
    m.compose(po.set(...bit.p), q, sc);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, new THREE.Color(bit.c ?? '#ffffff'));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export default defineThing({
  questions: {
    load: choice('How much is waiting to be washed?', {
      mountain: 'A mountain: burnt pots and pans towering out of every basin and stacked on the boards, mid-rush and losing.',
      steady: 'A steady flow: a rack of plates, a couple of pans soaking, under control.',
      glasses: 'Racks of glassware from the bar, fragile and endless.',
      soaking: 'One blackened pot left to soak alone, everything else done.',
      gleaming: 'Nothing. Every basin drained and wiped, racks stacked, steel shining after close.',
    }),
    water: choice('What is in the basins?', {
      fresh: 'Hot fresh water with a head of white suds, blue sanitiser in the last basin.',
      grey: 'Grey greasy water with a flat scum, long overdue a change.',
      drained: 'Empty basins, plugs out on their chains.',
      overflow: 'Brim-full and running over the front onto the floor, tap forgotten.',
    }),
    machine: choice('What is the dish machine doing?', {
      running: 'Hood down, mid-cycle, steam leaking from the seams.',
      open: 'Hood just lifted on a rack of clean plates in a burst of steam.',
      off: 'Hood propped up, empty and dark, drying out.',
    }),
    spraying: noul('Is the spray arm running, blasting plates?'),
    left: choice('What has the dishwasher left here?', {
      nothing: 'Nothing personal.',
      gloves: 'A pair of rubber gloves draped over the front edge.',
      apron: 'A soaked apron hung from the corner.',
      radio: 'A battered radio on the shelf, the only music in the building.',
      meal: 'A half-eaten plate of staff meal and a fork, eaten standing up.',
    }),
    floor: choice('What is on the floor in front?', {
      bare: 'Bare floor.',
      mat: 'A black rubber anti-fatigue mat with drain holes.',
      sign: 'A yellow wet-floor sign.',
      mop: 'A yellow mop bucket with the mop standing in it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const TOP = 0.9, D = 0.72;
    const BOARD = 0.58, BASIN = 0.48, GAP = 0.03;
    const sinkW = BOARD + 3 * BASIN + 4 * GAP + 0.12;
    const steel = s.material('#c6cbcb', { metalness: 0.78, roughness: 0.3 });
    const steelDull = s.material('#989e9f', { metalness: 0.7, roughness: 0.48 });
    const dark = s.material('#1c1e20', { roughness: 0.7 });
    const black = s.material('#27221e', { roughness: 0.85 });
    const china = s.material('#f4f2ec', { roughness: 0.35 });
    const j = (amount: number) => (random() - 0.5) * amount;
    const gleam = a.load === 'gleaming';

    // Sink body. x runs from 0 at the left end.
    const basinX = [0, 1, 2].map((i) => BOARD + GAP + BASIN / 2 + i * (BASIN + GAP));
    const basinZ = 0.02, basinD = 0.5;
    s.box([sinkW, 0.34, D - 0.1], [sinkW / 2, TOP - 0.21, 0], steelDull).position.x = BOARD + (sinkW - BOARD) / 2;
    (s.root.children[s.root.children.length - 1] as THREE.Mesh).scale.x = (sinkW - BOARD) / sinkW;
    // Rim frame.
    s.box([sinkW, 0.04, 0.07], [sinkW / 2, TOP - 0.02, D / 2 - 0.035], steel);
    s.box([sinkW, 0.04, D - 0.07 - basinD], [sinkW / 2, TOP - 0.02, basinZ - basinD / 2 - (D - 0.07 - basinD) / 2 + 0.0], steel);
    for (let i = 0; i <= 3; i++) s.box([i === 3 ? 0.12 + GAP : GAP, 0.04, basinD], [i === 3 ? sinkW - (0.12 + GAP) / 2 : BOARD + GAP / 2 + i * (BASIN + GAP), TOP - 0.02, basinZ + (D / 2 - 0.07 - basinZ - basinD / 2)], steel);
    s.box([sinkW - BOARD, 0.01, basinD], [BOARD + (sinkW - BOARD) / 2, TOP - 0.3, basinZ], dark);
    // Left drainboard with ridges and a raised edge.
    s.box([BOARD, 0.03, basinD + 0.01], [BOARD / 2, TOP - 0.035, basinZ + 0.01], steel);
    for (let i = 0; i < 9; i++) s.box([BOARD - 0.08, 0.006, 0.012], [BOARD / 2, TOP - 0.017, basinZ - 0.2 + i * 0.05], steelDull);
    s.box([0.025, 0.05, D], [0.0125, TOP - 0.015, 0], steel);
    // Backsplash and over-shelf.
    const backZ = -D / 2 + 0.015;
    s.box([sinkW, 0.3, 0.03], [sinkW / 2, TOP + 0.13, backZ], steel);
    const shelfY = 1.56, shelfL = BOARD + 0.1, shelfR = sinkW - 0.05;
    s.box([shelfR - shelfL, 0.025, 0.3], [(shelfL + shelfR) / 2, shelfY, backZ + 0.13], steelDull);
    for (const x of [shelfL + 0.03, shelfR - 0.03]) s.box([0.03, shelfY - TOP - 0.28, 0.03], [x, (shelfY + TOP + 0.28) / 2, backZ], steel);
    // Legs and braces.
    for (const x of [0.05, BOARD, sinkW / 2 + 0.25, sinkW - 0.05]) for (const z of [-1, 1]) {
      s.cylinder(0.022, 0.022, TOP - 0.04, [x, (TOP - 0.04) / 2, z * (D / 2 - 0.06)], steel, 10);
      s.cylinder(0.03, 0.036, 0.03, [x, 0.015, z * (D / 2 - 0.06)], dark, 10);
    }
    s.rod([0.05, 0.25, -D / 2 + 0.06], [sinkW - 0.05, 0.25, -D / 2 + 0.06], 0.012, steelDull);
    s.rod([0.05, 0.25, D / 2 - 0.06], [sinkW - 0.05, 0.25, D / 2 - 0.06], 0.012, steelDull);

    // Water.
    const full = a.water === 'overflow';
    const level = a.water === 'drained' ? 0 : full ? TOP - 0.002 : TOP - mix(0.07, 0.13, random());
    const waterTints = a.water === 'grey' ? ['#7d8273', '#8a8f84', '#93988c'] : ['#a9d6d0', '#b9e0ec', '#62c4c9'];
    const suds: Bit[] = [];
    if (a.water !== 'drained') basinX.forEach((x, i) => {
      const water = new THREE.MeshStandardMaterial({ color: waterTints[i], roughness: 0.08, metalness: 0.2 });
      s.box([BASIN, 0.01, basinD], [x, level, basinZ], water).castShadow = false;
      const n = a.water === 'grey' ? 10 : i === 0 ? 80 : i === 1 ? 14 : 0;
      for (let k = 0; k < n; k++) suds.push({ p: [x + j(BASIN - 0.05), level + 0.008, basinZ + j(basinD - 0.05)], s: [mix(0.015, 0.045, random()), a.water === 'grey' ? 0.004 : mix(0.01, 0.035, random()), mix(0.015, 0.045, random())], c: a.water === 'grey' ? '#b9b8a4' : '#ffffff' });
    }); else basinX.forEach((x) => {
      s.cylinder(0.03, 0.03, 0.006, [x, TOP - 0.292, basinZ], dark, 12);
      s.ball([0.03, 0.012, 0.03], [x + 0.1, TOP - 0.285, basinZ + 0.1], black, 10);
      s.rod([x + 0.1, TOP - 0.28, basinZ + 0.1], [x + 0.2, TOP - 0.02, basinZ - 0.24], 0.003, steel);
    });
    if (full) {
      const sheet = new THREE.MeshStandardMaterial({ color: '#bfe1e6', transparent: true, opacity: 0.5, roughness: 0.05, depthWrite: false });
      for (const x of basinX) { const w = s.box([BASIN * mix(0.4, 0.9, random()), TOP, 0.012], [x + j(0.08), TOP / 2, D / 2 + 0.008], sheet); w.castShadow = false; }
      for (let i = 0; i < 5; i++) s.cylinder(0.25 + random() * 0.3, 0.25 + random() * 0.3, 0.004, [BOARD + random() * (sinkW - BOARD), 0.003, D / 2 + 0.15 + random() * 0.4], sheet, 18).castShadow = false;
      for (let k = 0; k < 30; k++) suds.push({ p: [BOARD + random() * (sinkW - BOARD), 0.012, D / 2 + 0.1 + random() * 0.5], s: [0.03, 0.012, 0.03], c: '#ffffff' });
    }
    strew(s.root, new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.4 }), suds);

    // Taps between the basins.
    for (const x of [basinX[0] + BASIN / 2 + GAP / 2, basinX[1] + BASIN / 2 + GAP / 2]) {
      s.box([0.16, 0.05, 0.05], [x, TOP + 0.16, backZ + 0.04], steel);
      const swing = j(0.5);
      s.tube([[x, TOP + 0.17, backZ + 0.05], [x + swing * 0.1, TOP + 0.3, backZ + 0.14], [x + swing * 0.22, TOP + 0.3, backZ + 0.28], [x + swing * 0.25, TOP + 0.2, backZ + 0.32]], 0.014, steel);
      for (const side of [-1, 1]) s.box([0.012, 0.012, 0.07], [x + side * 0.06, TOP + 0.19, backZ + 0.08], s.material(side < 0 ? '#c4302a' : '#2f62b0'));
      if (full) { const run = s.cylinder(0.01, 0.012, 0.22, [x + swing * 0.25, TOP + 0.09, backZ + 0.32], new THREE.MeshStandardMaterial({ color: '#d9f0f4', transparent: true, opacity: 0.6, depthWrite: false }), 8); run.castShadow = false; }
    }

    // Pre-rinse spray arm: riser, spring coil gooseneck, hanging head.
    const ax = BOARD - 0.12, az = backZ + 0.05;
    s.cylinder(0.018, 0.018, 0.85, [ax, TOP + 0.28 + 0.425, az], steel, 10);
    s.box([0.07, 0.07, 0.07], [ax, TOP + 0.3, az], steel);
    const arcTop = TOP + 1.13, headY = TOP + 0.42, reach = 0.36;
    const arcPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const th = t * Math.PI;
      arcPts.push(new THREE.Vector3(ax, arcTop + Math.sin(th) * 0.16, az + (1 - Math.cos(th)) / 2 * reach));
    }
    for (let i = 1; i <= 10; i++) arcPts.push(new THREE.Vector3(ax, arcTop - i / 10 * (arcTop - headY - 0.12), az + reach + Math.sin(i / 10 * 2) * 0.02));
    const arc = new THREE.CatmullRomCurve3(arcPts);
    s.mesh(new THREE.TubeGeometry(arc, 60, 0.012, 8), dark);
    const coil: THREE.Vector3[] = [];
    const frame = arc.computeFrenetFrames(400);
    for (let i = 0; i <= 400; i++) {
      const p = arc.getPointAt(i / 400);
      const ang = i * 0.55;
      coil.push(p.addScaledVector(frame.normals[i], Math.cos(ang) * 0.024).addScaledVector(frame.binormals[i], Math.sin(ang) * 0.024));
    }
    s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 800, 0.005, 5), steel);
    const headZ = az + reach + 0.02;
    s.cylinder(0.022, 0.03, 0.12, [ax, headY + 0.06, headZ], dark, 12);
    s.cylinder(0.04, 0.03, 0.04, [ax, headY - 0.02, headZ], steel, 12);
    s.rod([ax, headY + 0.1, headZ + 0.02], [ax, headY - 0.01, headZ + 0.09], 0.008, steel);
    s.rod([ax, TOP + 0.9, az], [ax, TOP + 0.75, headZ - 0.02], 0.006, steel);
    let jet: THREE.Mesh | null = null;
    if (a.spraying) {
      jet = s.cylinder(0.03, 0.17, headY - TOP - 0.03, [ax, (headY + TOP) / 2 - 0.03, headZ], new THREE.MeshBasicMaterial({ color: '#e9f8fc', transparent: true, opacity: 0.38, depthWrite: false }), 14);
      jet.castShadow = jet.receiveShadow = false;
    }

    // Wares.
    const potMat = s.material('#b9bebf', { metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide });
    const burntMat = s.material('#2a2019', { roughness: 0.9, side: THREE.DoubleSide });
    const pot = (x: number, y: number, z: number, r: number, h: number, burnt = false, tilt: V3 = [0, 0, 0]) => {
      const g = new THREE.Group();
      g.position.set(x, y, z); g.rotation.set(...tilt);
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20, 1, true).translate(0, h / 2, 0), burnt ? burntMat : potMat);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.01, 20).translate(0, 0.005, 0), burnt ? burntMat : potMat);
      const crust = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.96, r * 0.96, 0.01, 20).translate(0, h * 0.25, 0), burnt ? s.material('#3a2414', { roughness: 1 }) : s.material('#8a5a2a', { roughness: 0.9 }));
      wall.castShadow = base.castShadow = true;
      g.add(wall, base, crust);
      for (const side of [-1, 1]) { const ear = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 6, 12, Math.PI), potMat); ear.position.set(side * r, h * 0.8, 0); ear.rotation.set(Math.PI / 2, 0, side * Math.PI / 2 + Math.PI / 2); g.add(ear); }
      s.root.add(g);
    };
    const pan = (x: number, y: number, z: number, r: number, tilt: V3 = [0, 0, 0]) => {
      const g = new THREE.Group();
      g.position.set(x, y, z); g.rotation.set(...tilt);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, 0.05, 20).translate(0, 0.025, 0), black);
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.93, r * 0.93, 0.006, 20).translate(0, 0.05, 0), s.material(['#6b4a2a', '#3a2414', '#8a3a1a'][Math.floor(random() * 3)], { roughness: 0.95 }));
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.014, 0.028).translate(r + 0.1, 0.045, 0), steelDull);
      body.castShadow = handle.castShadow = true;
      g.add(body, inner, handle);
      s.root.add(g);
    };
    const sheet = (x: number, y: number, z: number, lean: number) => { const m = s.box([0.44, 0.014, 0.62], [x, y, z], s.material('#8d8a80', { metalness: 0.5, roughness: 0.7 })); m.rotation.set(Math.PI / 2 - 0.12, 0, lean); return m; };
    const rackTints = ['#6f8fb0', '#c9a45a', '#7fa58a'];
    const rack = (x: number, y: number, z: number, content: 'plates' | 'glasses' | 'empty', parent: THREE.Object3D = s.root) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      const tint = rackTints[Math.floor(random() * rackTints.length)];
      const mat = s.material(tint, { roughness: 0.7 });
      const add = (size: V3, at: V3) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat); m.position.set(...at); m.castShadow = true; g.add(m); };
      add([0.5, 0.012, 0.5], [0, 0.006, 0]);
      for (const side of [-1, 1]) { add([0.5, 0.1, 0.014], [0, 0.05, side * 0.243]); add([0.014, 0.1, 0.5], [side * 0.243, 0.05, 0]); }
      if (content === 'plates') {
        const bits: Bit[] = [];
        for (let row = 0; row < 2; row++) for (let i = 0; i < 9; i++) if (random() < 0.85) bits.push({ p: [-0.19 + i * 0.047, 0.13, -0.11 + row * 0.22], r: [0, 0, Math.PI / 2 - 0.25], s: [0.1, 0.008, 0.1] });
        strew(g, new THREE.CylinderGeometry(1, 1, 1, 18), china, bits);
      } else if (content === 'glasses') {
        const bits: Bit[] = [];
        for (let ix = 0; ix < 5; ix++) for (let iz = 0; iz < 5; iz++) if (random() < 0.88) bits.push({ p: [-0.18 + ix * 0.09, 0.075, -0.18 + iz * 0.09], s: [0.036, 0.13, 0.036] });
        strew(g, new THREE.CylinderGeometry(0.8, 1, 1, 10, 1, true), new THREE.MeshStandardMaterial({ color: '#d5edf2', roughness: 0.08, metalness: 0.3, side: THREE.DoubleSide }), bits);
      }
      parent.add(g);
      return g;
    };
    const boardY = TOP - 0.014, inBasin = level ? level - 0.12 : TOP - 0.29;
    const plateStack = (x: number, y: number, z: number, n: number) => { const bits: Bit[] = []; for (let i = 0; i < n; i++) bits.push({ p: [x + j(0.012), y + 0.006 + i * 0.013, z + j(0.012)], s: [0.125, 0.01, 0.125] }); strew(s.root, new THREE.CylinderGeometry(1, 0.7, 1, 18), china, bits); };
    if (a.load === 'mountain') {
      const more = mix(0.6, 1.3, mood.density);
      basinX.forEach((x, i) => {
        pot(x + j(0.08), inBasin, basinZ + j(0.06), 0.17, 0.26 + random() * 0.14, random() < 0.5, [j(0.3), 0, j(0.3)]);
        pan(x + j(0.1), TOP + 0.1 + random() * 0.12, basinZ + j(0.1), 0.14, [0.5 + j(0.6), random() * 6, j(0.5)]);
        if (random() < 0.5 * more) pan(x + j(0.1), TOP + 0.28 + random() * 0.08, basinZ + j(0.1), 0.12, [-0.4 + j(0.4), random() * 6, 0.3]);
        if (i !== 1) sheet(x + j(0.1), TOP + 0.2, basinZ - 0.2, j(0.3));
        pot(x + j(0.12), TOP + 0.3 + random() * 0.1, basinZ + j(0.1), 0.13, 0.18, random() < 0.6, [0.9 + j(0.5), random() * 6, j(0.6)]);
        if (random() < 0.7 * more) pan(x + j(0.12), TOP + 0.5 + random() * 0.08, basinZ + j(0.08), 0.13, [0.3 + j(0.5), random() * 6, j(0.4)]);
      });
      const tower = Math.round(8 * more);
      for (let i = 0; i < tower; i++) s.box([0.5, 0.06, 0.32], [BOARD / 2 - 0.02 + j(0.05), boardY + 0.03 + i * 0.045, basinZ + j(0.05)], i % 2 ? steelDull : s.material('#8d8a80', { metalness: 0.5, roughness: 0.7 })).rotation.set(j(0.06), j(0.5), j(0.06));
      pot(BOARD / 2 + j(0.05), boardY + tower * 0.045 + 0.03, basinZ + j(0.05), 0.15, 0.2, true, [0.15, 0, -0.2]);
      plateStack(shelfL + 0.3, shelfY + 0.013, backZ + 0.13, 9);
      const tub = s.material('#70767a', { roughness: 0.7 });
      s.box([0.52, 0.16, 0.4], [sinkW / 2, 0.08, D / 2 + 0.35], tub).rotation.y = j(0.3);
      plateStack(sinkW / 2 - 0.1, 0.16, D / 2 + 0.35, 8);
      pan(sinkW / 2 + 0.12, 0.16, D / 2 + 0.36, 0.12, [0.3, 1, 0.2]);
    } else if (a.load === 'steady') {
      rack(BOARD / 2 - 0.02, boardY, basinZ, 'plates');
      pot(basinX[0] + j(0.05), inBasin, basinZ, 0.17, 0.3, false, [0.1, 0, 0.12]);
      pan(basinX[1], TOP - 0.02, basinZ + 0.02, 0.14, [0.7, 0.6, 0]);
      plateStack(shelfL + 0.3, shelfY + 0.013, backZ + 0.13, 6);
    } else if (a.load === 'glasses') {
      rack(BOARD / 2 - 0.02, boardY, basinZ, 'glasses');
      rack(BOARD / 2 - 0.02 + j(0.03), boardY + 0.14, basinZ + j(0.03), 'glasses');
      if (mood.density > 0.4) rack(basinX[1], TOP, basinZ, 'glasses').rotation.y = j(0.2);
    } else if (a.load === 'soaking') {
      pot(basinX[0], a.water === 'drained' ? TOP - 0.29 : inBasin, basinZ, 0.19, 0.3, true, [0.05, 0, 0.08]);
      s.box([0.1, 0.03, 0.07], [basinX[1] - BASIN / 2 - GAP / 2, TOP + 0.015, D / 2 - 0.05], s.material('#e8c531', { roughness: 0.95 }));
      s.box([0.1, 0.012, 0.07], [basinX[1] - BASIN / 2 - GAP / 2, TOP + 0.036, D / 2 - 0.05], s.material('#3f8a4a', { roughness: 1 }));
    } else {
      for (let i = 0; i < 4; i++) rack(BOARD / 2 - 0.02, boardY + i * 0.11, basinZ, 'empty').rotation.y = j(0.04);
      plateStack(shelfL + 0.3, shelfY + 0.013, backZ + 0.13, 14);
      plateStack(shelfL + 0.6, shelfY + 0.013, backZ + 0.13, 11);
      for (let i = 0; i < 3; i++) pot(shelfR - 0.25 - i * 0.02, shelfY + 0.013 + i * 0.07, backZ + 0.13, 0.13 - i * 0.012, 0.14);
    }
    // Chemicals on the shelf.
    const jugTints = ['#2f8fd0', '#d94a8a', '#e8c531'];
    const jugs = gleam ? 3 : 1 + Math.floor(random() * 3);
    for (let i = 0; i < jugs; i++) {
      const x = shelfR - 0.6 - i * 0.2 - (gleam ? 0.3 : 0);
      s.box([0.14, 0.22, 0.16], [x, shelfY + 0.123, backZ + 0.12], s.material(jugTints[i], { roughness: 0.5 })).rotation.y = gleam ? 0 : j(0.5);
      s.cylinder(0.025, 0.025, 0.04, [x + 0.03, shelfY + 0.25, backZ + 0.12], s.material('#f1efe8'), 8);
    }

    // Pass-through dish machine at the right-hand end.
    const mx = sinkW + 0.42, mw = 0.7;
    const hoodUp = a.machine !== 'running';
    s.box([mw, TOP - 0.14, D - 0.04], [mx, (TOP - 0.14) / 2 + 0.14, 0], steelDull);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.025, 0.03, 0.14, [mx + x * (mw / 2 - 0.06), 0.07, z * (D / 2 - 0.08)], dark, 10);
    s.box([mw + 0.02, 0.03, D], [mx, TOP - 0.015, 0], steel);
    s.box([mw - 0.1, 0.16, 0.012], [mx, TOP - 0.16, D / 2 - 0.015], dark);
    const running = a.machine === 'running', idleOn = a.machine === 'open';
    const lampTint = running ? '#ff9a2a' : idleOn ? '#39e06a' : '#39403c';
    const lamp = new THREE.MeshStandardMaterial({ color: lampTint, emissive: lampTint, emissiveIntensity: a.machine === 'off' ? 0 : 1.8 });
    for (let i = 0; i < 3; i++) s.ball([0.016, 0.016, 0.008], [mx - 0.2 + i * 0.06, TOP - 0.16, D / 2 - 0.007], i === 0 ? lamp : s.material('#3a3d3f'), 10);
    s.label(running ? '82 C' : idleOn ? 'END' : '---', 0.18, 0.07, [mx + 0.14, TOP - 0.16, D / 2 - 0.007], a.machine === 'off' ? '#2c3430' : '#7dffa0', '#101512');
    for (const x of [-1, 1]) s.box([0.035, 1.15, 0.035], [mx + x * (mw / 2 - 0.02), TOP + 0.575, -D / 2 + 0.05], steel);
    s.box([mw, 0.04, 0.06], [mx, TOP + 1.15, -D / 2 + 0.05], steel);
    const hood = new THREE.Group();
    const lift = hoodUp ? 0.46 : 0;
    hood.position.set(mx, TOP + lift, 0.01);
    const hoodMat = s.material('#cdd2d2', { metalness: 0.78, roughness: 0.28 });
    const hm = (size: V3, at: V3, mat: THREE.Material = hoodMat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat); m.position.set(...at); m.castShadow = m.receiveShadow = true; hood.add(m); return m; };
    const hw = mw - 0.08, hd = D - 0.12, hh = 0.5;
    hm([hw, 0.03, hd], [0, hh, 0]);
    hm([hw, hh, 0.02], [0, hh / 2, hd / 2]);
    hm([hw, hh, 0.02], [0, hh / 2, -hd / 2]);
    hm([0.02, hh, hd], [-hw / 2, hh / 2, 0]);
    hm([0.02, hh, hd], [hw / 2, hh / 2, 0]);
    hm([hw + 0.12, 0.03, 0.03], [0, 0.2, hd / 2 + 0.09], steel);
    for (const x of [-1, 1]) hm([0.02, 0.03, 0.1], [x * (hw / 2 + 0.05), 0.2, hd / 2 + 0.045], steel);
    s.root.add(hood);
    if (a.machine === 'open') rack(mx, TOP, 0.01, a.load === 'glasses' ? 'glasses' : 'plates');
    else if (running) rack(mx, TOP, 0.01, 'empty');

    // Steam: see-through puffs.
    const puffs: { mesh: THREE.Mesh; x: number; z: number; base: number; phase: number; speed: number }[] = [];
    const steamMat = new THREE.MeshStandardMaterial({ color: '#f6f6f2', transparent: true, opacity: 0.2, depthWrite: false, roughness: 1 });
    const puffGeo = new THREE.SphereGeometry(1, 10, 8);
    const puffCount = a.machine === 'open' ? Math.round(mix(8, 16, mood.energy)) : running ? 6 : 0;
    for (let i = 0; i < puffCount + (a.water === 'fresh' ? 4 : 0); i++) {
      const mesh = new THREE.Mesh(puffGeo, steamMat);
      const atMachine = i < puffCount;
      s.root.add(mesh);
      puffs.push({ mesh, x: atMachine ? mx + j(0.5) : basinX[0] + j(0.3), z: atMachine ? (running ? D / 2 - 0.08 : j(0.4)) : basinZ + j(0.3), base: atMachine ? TOP + (running ? 0.05 : 0.2) : TOP, phase: random(), speed: mix(0.1, 0.26, random()) });
    }

    // What the dishwasher left.
    if (a.left === 'gloves') {
      const rubber = s.material(mood.cheer > 0.5 ? '#f2c832' : '#e86a8a', { roughness: 0.55 });
      for (const k of [0, 1]) {
        const gx = basinX[2] - 0.1 + k * 0.17;
        s.ball([0.055, 0.02, 0.07], [gx, TOP + 0.012, D / 2 - 0.05], rubber, 10);
        s.ball([0.05, 0.12, 0.018], [gx + j(0.02), TOP - 0.11, D / 2 + 0.014], rubber, 10);
        for (let f = 0; f < 4; f++) s.ball([0.011, 0.04, 0.011], [gx - 0.036 + f * 0.024, TOP - 0.23, D / 2 + 0.014], rubber, 6);
      }
    } else if (a.left === 'apron') {
      const cloth = s.material('#e9e6dc', { roughness: 1 });
      const px = sinkW - 0.02;
      s.box([0.34, 0.6, 0.02], [px - 0.12, TOP - 0.34, D / 2 + 0.016], cloth).rotation.z = 0.05;
      s.box([0.2, 0.06, 0.08], [px - 0.12, TOP + 0.01, D / 2 - 0.03], cloth);
      for (let i = 0; i < 4; i++) s.cylinder(0.03 + random() * 0.04, 0.03 + random() * 0.04, 0.002, [px - 0.12 + j(0.22), TOP - 0.35 + j(0.4), D / 2 + 0.028], s.material(['#8a6a3a', '#a03a2a', '#6f7a70'][i % 3], { roughness: 1 }), 8).rotation.x = Math.PI / 2;
      s.rod([px - 0.26, TOP - 0.3, D / 2 + 0.03], [px - 0.34, TOP - 0.62, D / 2 + 0.03], 0.006, cloth);
    } else if (a.left === 'radio') {
      const rx = shelfL + 0.22, rz = backZ + 0.14;
      const shell = s.material(mood.cheer > 0.5 ? '#c8452f' : '#3a3f44', { roughness: 0.6 });
      const base = gleam ? shelfY + 0.185 : shelfY + 0.013 + (a.load === 'mountain' ? 0.13 : a.load === 'steady' ? 0.09 : 0);
      s.box([0.3, 0.17, 0.1], [rx + 0.0, base + 0.085, rz + 0.0], shell);
      const speaker = s.cylinder(0.055, 0.055, 0.01, [rx - 0.07, base + 0.085, rz + 0.052], dark, 16);
      speaker.rotation.x = Math.PI / 2;
      s.box([0.1, 0.03, 0.006], [rx + 0.08, base + 0.12, rz + 0.052], s.material('#f1e9c8'));
      s.rod([rx + 0.13, base + 0.17, rz], [rx + 0.27, base + 0.52, rz - 0.02], 0.004, steel);
      s.rod([rx - 0.12, base + 0.17, rz], [rx + 0.12, base + 0.17, rz], 0.006, dark);
    } else if (a.left === 'meal') {
      const px = basinX[2] + BASIN / 2 + 0.02, pz = D / 2 - 0.14;
      s.cylinder(0.12, 0.08, 0.016, [px, TOP + 0.008, pz], china, 20);
      s.ball([0.06, 0.025, 0.045], [px - 0.02, TOP + 0.03, pz], s.material('#e8dcae', { roughness: 0.9 }), 10);
      s.ball([0.04, 0.02, 0.04], [px + 0.04, TOP + 0.03, pz + 0.03], s.material('#9a4a2a', { roughness: 0.9 }), 10);
      s.rod([px + 0.05, TOP + 0.02, pz - 0.08], [px + 0.16, TOP + 0.03, pz - 0.02], 0.005, steel);
    }

    // Floor.
    const fx = BOARD + (sinkW - BOARD) / 2;
    if (a.floor === 'mat') {
      s.box([1.5, 0.018, 0.6], [fx, 0.009, D / 2 + 0.36], dark);
      const holes: Bit[] = [];
      for (let ix = 0; ix < 18; ix++) for (let iz = 0; iz < 6; iz++) holes.push({ p: [fx - 0.68 + ix * 0.08, 0.019, D / 2 + 0.12 + iz * 0.095], s: [0.024, 0.002, 0.024], c: '#4a4d50' });
      strew(s.root, new THREE.CylinderGeometry(1, 1, 1, 8), new THREE.MeshStandardMaterial({ roughness: 0.9 }), holes);
    } else if (a.floor === 'sign') {
      const yellow = s.material('#f2c81e', { roughness: 0.6 });
      const sx = fx + j(0.6), sz = D / 2 + 0.5;
      for (const side of [-1, 1]) { const leaf = s.box([0.3, 0.62, 0.012], [sx, 0.3, sz + side * 0.09], yellow); leaf.rotation.x = side * 0.3; }
      const text = s.label('WET FLOOR', 0.24, 0.09, [sx, 0.36, sz + 0.11], '#111111', '#f2c81e');
      text.rotation.x = -0.3;
    } else if (a.floor === 'mop') {
      const yellow = s.material('#f2c81e', { roughness: 0.6 });
      const bx2 = fx + 0.3, bz = D / 2 + 0.42;
      s.box([0.36, 0.3, 0.5], [bx2, 0.2, bz], yellow);
      s.box([0.32, 0.01, 0.46], [bx2, 0.34, bz], new THREE.MeshStandardMaterial({ color: '#6f7468', roughness: 0.2 }));
      s.box([0.3, 0.16, 0.16], [bx2, 0.43, bz - 0.17], yellow);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.03, 0.03, 0.03, [bx2 + x * 0.15, 0.03, bz + z * 0.2], dark, 10).rotation.z = Math.PI / 2;
      s.rod([bx2, 0.4, bz - 0.15], [bx2 - 0.25, 1.5, bz - 0.42], 0.014, s.material('#b8905a'));
      s.ball([0.1, 0.08, 0.08], [bx2, 0.42, bz - 0.15], s.material('#d9d6c8', { roughness: 1 }), 10);
    }

    // Wear: limescale and rust streaks down the front.
    for (let i = 0; i < Math.round(mood.wear * 14); i++) {
      const len = mix(0.08, 0.3, random());
      s.box([mix(0.008, 0.03, random()), len, 0.003], [BOARD + random() * (sinkW - BOARD), TOP - 0.04 - len / 2, D / 2 - 0.048], s.material(random() < 0.5 ? '#e9e6d8' : '#8a5a34', { roughness: 1 })).castShadow = false;
    }

    const setSteam = (time: number) => {
      for (const puff of puffs) {
        const t = (puff.phase + time * puff.speed * mix(0.5, 1.6, mood.energy)) % 1;
        const size = mix(0.06, 0.24, t);
        puff.mesh.scale.set(size, size * 1.1, size);
        puff.mesh.position.set(puff.x + Math.sin(t * 5 + puff.phase * 9) * 0.06, puff.base + t * 0.9, puff.z);
      }
    };
    setSteam(0);
    return s.finish({
      update: (_dt, time) => {
        setSteam(time);
        if (jet) jet.scale.x = jet.scale.z = 1 + Math.sin(time * 23) * 0.08;
        if (running) hood.position.x = mx + Math.sin(time * 40) * 0.002 * mood.energy;
      },
    });
  },
});
