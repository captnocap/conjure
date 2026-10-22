import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const PLACES = {
  spindletop: { tall: 21, base: 6.6, clad: 0, timber: '#9a7448', ground: '#5d4635', shed: '#8a6a48', roof: '#5a4a3c' },
  baku: { tall: 17, base: 7.4, clad: 0.93, timber: '#4a3a2e', ground: '#3b322c', shed: '#463a30', roof: '#2e2824' },
  pennsylvania: { tall: 11, base: 4.4, clad: 0, timber: '#7c6245', ground: '#6f6248', shed: '#73593e', roof: '#4f4033' },
  california: { tall: 25, base: 7, clad: 0.22, timber: '#a98a5e', ground: '#c2ac86', shed: '#9aa3a4', roof: '#7d8687' },
} as const;

export default defineThing({
  questions: {
    place: choice('Where and when does it stand?', {
      spindletop: 'Spindletop, Texas, 1901: a tall open derrick of fresh pine standing in churned mud.',
      baku: 'Baku on the Caspian, 1890s: a broad pyramid boarded in from top to bottom, black with oil.',
      pennsylvania: 'Oil Creek, Pennsylvania, 1860s: a short rough-hewn derrick, barely taller than the trees.',
      california: 'Signal Hill, California, 1920s: a very tall derrick with a tin-sided belt house, pale dust.',
    }),
    well: choice('What is the well doing?', {
      quiet: 'Nothing to see: drilling or pumping in the ordinary way.',
      gusher: 'A gusher: a black column of oil blows through the crown and rains downwind.',
      fire: 'The well is on fire: flame roars from the top and black smoke rolls off.',
    }),
    state: choice('What state is the rig in?', {
      working: 'Working: steam from the engine house, the walking beam rocking.',
      silent: 'Silent: shut down, doors closed, nothing moves.',
      new: 'Brand new: raw yellow lumber, the crew only just finished.',
      skeleton: 'A weathered grey skeleton, leaning, girts missing, the sheds half fallen.',
    }),
    engine: choice('What houses the engine?', {
      shed: 'A board-and-batten engine house with a stovepipe.',
      boiler: 'A boiler out in the open with a tall iron smokestack.',
      tin: 'A corrugated tin shack.',
    }),
    crown: choice('What is at the very top?', {
      bare: 'Just the crown block and its pulleys.',
      flag: 'A flag nailed up the day they struck oil.',
      lantern: 'A lantern hung for the night tour.',
      crows: 'Crows sitting on the crown.',
    }),
    storage: choice('Where does the oil go?', {
      tank: 'A wooden stave tank bound with iron hoops.',
      barrels: 'Stacks of wooden barrels.',
      pit: 'An open earthen pit, a black pond.',
      none: 'Nowhere yet: there is no storage.',
    }),
    crew: noul('Are men at work on the derrick floor?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const place = PLACES[a.place];
    const ruin = a.state === 'skeleton';
    const tall = place.tall * mix(0.94, 1.06, random()), base = place.base, half = base / 2, topHalf = 0.75;
    const timberColour = new THREE.Color(a.state === 'new' ? '#d2b077' : ruin ? '#8c877c' : place.timber).lerp(new THREE.Color('#77736b'), mood.wear * 0.3);
    if (a.well === 'fire') timberColour.lerp(new THREE.Color('#231d19'), 0.55);
    if (a.well === 'gusher') timberColour.lerp(new THREE.Color('#1c1512'), 0.35);
    const wood = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
    const plank = new THREE.MeshStandardMaterial({ color: timberColour.clone().multiplyScalar(0.86), roughness: 0.95 });
    const iron = new THREE.MeshStandardMaterial({ color: '#2b2a29', roughness: 0.6, metalness: 0.5 });
    const oil = new THREE.MeshStandardMaterial({ color: '#0f0c0a', roughness: 0.2, metalness: 0.35 });
    const into = <T extends THREE.Object3D>(group: THREE.Object3D, node: T) => { group.add(node); return node; };

    // Ground.
    const padColour = new THREE.Color(place.ground);
    const pad = s.box([base + 21, 0.08, base + 6], [7, 0.04, 0], new THREE.MeshStandardMaterial({ color: padColour, roughness: a.place === 'spindletop' ? 0.55 : 1 }));
    pad.castShadow = false;

    // The tower leans as one piece about its low edge.
    const tower = into(s.root, new THREE.Group());
    const lean = ruin ? mix(0.05, 0.1, random()) : 0;
    tower.position.set(-half, 0.08, 0);
    tower.rotation.z = lean;
    const inner = into(tower, new THREE.Group());
    inner.position.x = half;

    const up = new THREE.Vector3(0, 1, 0);
    const bars: { matrix: THREE.Matrix4; shade: number }[] = [];
    const bar = (from: [number, number, number], to: [number, number, number], thick: number, keep = 1) => {
      if (random() > keep) return;
      const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to), direction = q.clone().sub(p), length = direction.length();
      bars.push({ matrix: new THREE.Matrix4().compose(p.add(q).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(up, direction.normalize()), new THREE.Vector3(thick, length, thick)), shade: 0.82 + random() * 0.3 });
    };
    const widthAt = (y: number) => mix(half, topHalf, y / tall);
    const corner = (y: number, sx: number, sz: number): [number, number, number] => [sx * widthAt(y), y, sz * widthAt(y)];
    const signs: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const legThick = a.place === 'pennsylvania' ? 0.2 : 0.26;
    for (const [sx, sz] of signs) { bar(corner(0, sx, sz), corner(tall, sx, sz), legThick); bar(corner(0, sx * 0.96, sz * 0.96), corner(tall * 0.5, sx * 0.96, sz * 0.96), legThick * 0.8); }
    const levels = Math.round(tall / 2.5);
    const keep = ruin ? 0.62 : 1 - mood.wear * 0.12;
    for (let level = 1; level <= levels; level++) {
      const y0 = (level - 1) / levels * tall, y1 = level / levels * tall;
      signs.forEach(([sx, sz], index) => {
        const [nx, nz] = signs[(index + 1) % 4];
        bar(corner(y1, sx, sz), corner(y1, nx, nz), 0.15, level === levels ? 1 : keep);
        if (y0 > 2.6 || index !== 1) {
          bar(corner(y0, sx, sz), corner(y1, nx, nz), 0.09, keep);
          bar(corner(y1, sx, sz), corner(y0, nx, nz), 0.09, keep);
        }
      });
    }
    // Ladder up the front face.
    {
      const foot = corner(0, 0.2, 1), head = corner(tall, 0.2, 1);
      for (const d of [-0.22, 0.22]) bar([foot[0] + d, foot[1], foot[2] + 0.12], [head[0] + d * 0.6, head[1], head[2] + 0.12], 0.07);
      for (let y = 0.5; y < tall; y += 0.42) { const z = widthAt(y) + 0.12, x = 0.2 * widthAt(y); bar([x - 0.22, y, z], [x + 0.22, y, z], 0.045, ruin ? 0.6 : 1); }
    }
    // Derrick floor on sills.
    for (const z of [-half - 0.3, half + 0.3]) bar([-half - 0.6, 0.2, z], [half + 0.6, 0.2, z], 0.34);
    into(inner, s.box([base + 0.9, 0.12, base + 0.9], [0, 0.44, 0], plank));
    // Crown: water table, pulley frame and sheaves.
    into(inner, s.box([topHalf * 2 + 0.9, 0.16, topHalf * 2 + 0.9], [0, tall + 0.08, 0], plank));
    for (const z of [-0.45, 0.45]) bar([-topHalf - 0.3, tall + 0.3, z], [topHalf + 0.3, tall + 0.3, z], 0.2);
    for (const x of [-0.3, 0.3]) into(inner, s.cylinder(0.42, 0.42, 0.12, [x, tall + 0.62, 0], iron, 18)).rotation.x = Math.PI / 2;
    // Drilling line down the middle, and the line running out to the hoist.
    into(inner, s.rod([0, tall + 0.5, 0], [0, 0.5, 0], 0.03, iron));
    into(inner, s.rod([0.35, tall + 0.6, 0], [half + 1.9, 1.2, -0.9], 0.03, iron));
    into(inner, s.cylinder(0.2, 0.24, 1.0, [0, 0.95, 0], iron, 12));
    into(inner, s.cylinder(0.34, 0.34, 0.08, [0, 1.4, 0], iron, 14));

    // Cladding.
    if (place.clad > 0 && !ruin) {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const boardColour = a.place === 'california' ? new THREE.Color('#9aa3a4') : timberColour.clone().multiplyScalar(0.8);
      ctx.fillStyle = '#' + boardColour.getHexString(); ctx.fillRect(0, 0, 256, 256);
      for (let x = 0; x < 256; x += 16) { ctx.fillStyle = `rgba(0,0,0,${0.12 + random() * 0.3})`; ctx.fillRect(x, 0, 2.5, 256); if (random() < 0.4) { ctx.fillStyle = `rgba(0,0,0,${0.06 + random() * 0.14})`; ctx.fillRect(x, 0, 16, 256); } }
      for (let i = 0; i < 12; i++) { const streak = ctx.createLinearGradient(0, 0, 0, 256); streak.addColorStop(0, 'rgba(8,6,5,0.75)'); streak.addColorStop(1, 'rgba(8,6,5,0)'); ctx.fillStyle = streak; ctx.fillRect(random() * 256, 0, 6 + random() * 18, 256); }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace; map.wrapS = THREE.RepeatWrapping; map.repeat.set(8, 1);
      const cladTop = tall * place.clad;
      const skin = into(inner, s.mesh(new THREE.CylinderGeometry((widthAt(cladTop) + 0.14) * Math.SQRT2, (half + 0.14) * Math.SQRT2, cladTop, 4, 1, true), new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide }), [0, cladTop / 2 + 0.3, 0]));
      skin.rotation.y = Math.PI / 4;
      // A doorway and a few window holes.
      const hole = new THREE.MeshStandardMaterial({ color: '#15110e', roughness: 1 });
      into(inner, s.box([1.5, 2.6, 0.1], [-0.6, 1.75, widthAt(1.7) + 0.16], hole)).rotation.x = -Math.atan2(half - topHalf, tall);
      if (place.clad > 0.5) for (const y of [tall * 0.42, tall * 0.7]) into(inner, s.box([0.7, 0.9, 0.1], [0.2, y, widthAt(y) + 0.17], hole)).rotation.x = -Math.atan2(half - topHalf, tall);
    }
    {
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), wood, bars.length);
      bars.forEach(({ matrix, shade }, i) => { mesh.setMatrixAt(i, matrix); mesh.setColorAt(i, timberColour.clone().multiplyScalar(shade)); });
      mesh.castShadow = mesh.receiveShadow = true;
      inner.add(mesh);
    }

    // Crown dressing.
    let flag: THREE.Mesh | null = null;
    if (a.crown === 'flag') {
      into(inner, s.cylinder(0.04, 0.05, 3.4, [topHalf, tall + 1.8, 0], plank, 6));
      const cloth = new THREE.PlaneGeometry(2.2, 1.3, 8, 1);
      cloth.translate(1.1, 0, 0);
      const flagColour = a.place === 'baku' ? '#b12a26' : a.place === 'spindletop' ? '#b3262c' : '#2a437f';
      flag = into(inner, s.mesh(cloth, new THREE.MeshStandardMaterial({ color: new THREE.Color(flagColour).lerp(new THREE.Color('#8a8377'), (1 - mood.cheer) * 0.4), roughness: 0.9, side: THREE.DoubleSide }), [topHalf, tall + 2.8, 0]));
      const stripe = into(flag, new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.42), new THREE.MeshStandardMaterial({ color: '#efe9da', roughness: 0.9, side: THREE.DoubleSide })));
      stripe.position.set(1.1, a.place === 'baku' ? -0.3 : 0.1, 0.012);
    }
    if (a.crown === 'lantern') {
      const glow = 0.6 + Math.abs(mood.daylight - 0.5) * 4;
      into(inner, s.rod([topHalf + 0.4, tall + 0.3, 0.7], [topHalf + 0.4, tall - 0.5, 0.7], 0.015, iron));
      into(inner, s.cylinder(0.16, 0.2, 0.42, [topHalf + 0.4, tall - 0.7, 0.7], new THREE.MeshStandardMaterial({ color: '#ffe2a0', emissive: '#ffb648', emissiveIntensity: glow }), 10));
      into(inner, s.mesh(new THREE.ConeGeometry(0.26, 0.2, 10), iron, [topHalf + 0.4, tall - 0.4, 0.7]));
      into(inner, s.cylinder(0.22, 0.22, 0.05, [topHalf + 0.4, tall - 0.93, 0.7], iron, 10));
    }
    if (a.crown === 'crows') for (let i = 0; i < 3 + Math.floor(random() * 3); i++) {
      const x = (random() - 0.5) * (topHalf * 2 + 0.5), z = (random() < 0.5 ? -1 : 1) * (topHalf + 0.3), black = new THREE.MeshStandardMaterial({ color: '#17171a', roughness: 0.7 });
      into(inner, s.ball([0.16, 0.2, 0.26], [x, tall + 0.36, z], black, 10));
      into(inner, s.ball([0.1, 0.1, 0.1], [x, tall + 0.6, z + 0.14], black, 8));
      into(inner, s.mesh(new THREE.ConeGeometry(0.035, 0.16, 5), black, [x, tall + 0.58, z + 0.28])).rotation.x = Math.PI / 2;
      into(inner, s.box([0.12, 0.03, 0.3], [x, tall + 0.3, z - 0.3], black)).rotation.x = 0.4;
    }

    // Walking beam on its samson post, between the derrick and the band-wheel house.
    const postX = half + 1.6, postTall = 3.6;
    const sag = ruin ? 0.5 : 1;
    s.box([0.34, postTall, 0.34], [postX, postTall / 2 + 0.08, 0.9], plank);
    for (const d of [-1, 1]) s.rod([postX + d * 1.2, 0.1, 0.9], [postX, postTall * 0.7, 0.9], 0.09, plank);
    const beam = into(s.root, new THREE.Group());
    beam.position.set(postX, postTall + 0.25, 0.9);
    into(beam, s.box([postX + 2.9, 0.4, 0.3], [(2.9 - postX) / 2 + 0.3, 0, 0], plank));
    const rodDown = into(s.root, s.cylinder(0.035, 0.035, 1, [0, 0, 0.9], iron, 6));
    const pitman = into(s.root, s.cylinder(0.06, 0.06, 1, [0, 0, 0.9], plank, 6));
    const wheelX = postX + 3.2;
    const band = into(s.root, new THREE.Group());
    band.position.set(wheelX, 1.7, 0.9);
    into(band, s.mesh(new THREE.TorusGeometry(1.45, 0.11, 6, 30), plank));
    for (let i = 0; i < 4; i++) into(band, s.box([2.9, 0.12, 0.1], [0, 0, 0], plank)).rotation.z = i * Math.PI / 4;
    const span = new THREE.Vector3();
    const stretch = (mesh: THREE.Mesh, x0: number, y0: number, x1: number, y1: number) => {
      span.set(x1 - x0, y1 - y0, 0);
      const length = Math.max(span.length(), 0.01);
      mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, mesh.position.z);
      mesh.scale.set(1, length, 1);
      mesh.quaternion.setFromUnitVectors(up, span.normalize());
    };
    const pose = (phase: number) => {
      const theta = Math.sin(phase) * 0.13 + (ruin ? -0.22 : 0);
      beam.rotation.z = theta;
      band.rotation.z = phase;
      const by = postTall + 0.25;
      const headX = postX - (postX - 0.3) * Math.cos(theta), headY = by - (postX - 0.3) * Math.sin(theta);
      stretch(rodDown, headX, headY, headX, 0.6);
      const tailX = postX + 3.1 * Math.cos(theta), tailY = by + 3.1 * Math.sin(theta);
      stretch(pitman, wheelX + Math.cos(phase) * 0.55, 1.7 + Math.sin(phase) * 0.55, tailX, tailY);
    };
    let phase = random() * 6.28;
    pose(phase);
    rodDown.visible = !ruin;

    // Sheds: band-wheel house, belt run and the engine.
    const shedColour = new THREE.Color(a.engine === 'tin' || a.place === 'california' ? '#9aa3a4' : place.shed).lerp(new THREE.Color('#77736b'), mood.wear * 0.3 + (ruin ? 0.3 : 0));
    if (a.state === 'new') shedColour.lerp(new THREE.Color('#d2b077'), 0.6);
    const boardMap = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#' + shedColour.getHexString(); ctx.fillRect(0, 0, 128, 128);
      for (let x = 0; x < 128; x += 16) { ctx.fillStyle = `rgba(0,0,0,${0.18 + random() * 0.25})`; ctx.fillRect(x, 0, 3, 128); }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping;
      return map;
    })();
    const roofPaint = new THREE.MeshStandardMaterial({ color: new THREE.Color(a.engine === 'tin' ? '#7d8687' : place.roof), roughness: 0.8, side: THREE.DoubleSide });
    const house = (x: number, z: number, long: number, deep: number, wall: number, rise: number, tilt = 0) => {
      const group = into(s.root, new THREE.Group());
      group.position.set(x, 0.08, z);
      const map = boardMap.clone();
      map.repeat.set(long / 1.6, 1); map.needsUpdate = true;
      into(group, s.box([long, wall, deep], [0, wall / 2, 0], new THREE.MeshStandardMaterial({ map, roughness: 0.95 })));
      const gable = new THREE.Shape([new THREE.Vector2(-deep / 2 - 0.25, 0), new THREE.Vector2(0, rise), new THREE.Vector2(deep / 2 + 0.25, 0)]);
      const roof = new THREE.ExtrudeGeometry(gable, { depth: long + 0.5, bevelEnabled: false });
      roof.translate(0, 0, -(long + 0.5) / 2);
      const top = into(group, s.mesh(roof, roofPaint, [0, wall, 0]));
      top.rotation.y = Math.PI / 2;
      group.rotation.z = tilt;
      return group;
    };
    const bandHouse = house(wheelX, -0.9, 3.6, 2.4, 3.6 * sag, 0.9, ruin ? -0.06 : 0);
    void bandHouse;
    const engineX = wheelX + 8.2;
    const run = house((wheelX + engineX) / 2, -0.9, engineX - wheelX - 3.4, 1.4, 1.9 * sag, 0.4, ruin ? 0.05 : 0);
    run.position.y += ruin ? 0 : 0.5;
    let stackTop: THREE.Vector3;
    if (a.engine === 'boiler') {
      const barrel = s.cylinder(0.85, 0.85, 3.8, [engineX, 1.45, -0.9], iron, 20);
      barrel.rotation.z = Math.PI / 2;
      for (const d of [-1.2, 1.2]) s.box([0.5, 0.6, 1.5], [engineX + d, 0.38, -0.9], new THREE.MeshStandardMaterial({ color: '#8a4a36', roughness: 1 }));
      s.cylinder(0.42, 0.42, 0.5, [engineX - 1.9, 1.45, -0.9], iron, 14).rotation.z = Math.PI / 2;
      s.cylinder(0.25, 0.3, 7, [engineX + 1.5, 5.4, -0.9], iron, 14);
      s.ball([0.4, 0.3, 0.4], [engineX - 0.4, 2.4, -0.9], iron, 12);
      const fly = s.mesh(new THREE.TorusGeometry(1.0, 0.09, 6, 24), iron, [engineX - 3.2, 1.3, 0.2]);
      void fly;
      stackTop = new THREE.Vector3(engineX + 1.5, 9.0, -0.9);
    } else {
      const engineHouse = house(engineX, -0.6, 5, 4, 2.9 * sag, 1.3, ruin ? 0.07 : 0);
      const hole = new THREE.MeshStandardMaterial({ color: a.state === 'working' ? '#3a2a1c' : '#17120f', roughness: 1, emissive: '#ff9a3a', emissiveIntensity: a.state === 'working' ? 0.35 : 0 });
      into(engineHouse, s.box([1.2, 2.1, 0.08], [-0.9, 1.05, 2.02], a.state === 'working' ? hole : plank));
      into(engineHouse, s.box([0.9, 0.8, 0.08], [1.2, 1.7, 2.02], hole));
      into(engineHouse, s.cylinder(0.16, 0.16, 3.2, [1.4, 4.3, -0.6], iron, 10));
      into(engineHouse, s.mesh(new THREE.ConeGeometry(0.3, 0.25, 10), iron, [1.4, 6.0, -0.6]));
      stackTop = new THREE.Vector3(engineX + 1.4, 6.3, -1.2);
    }

    // Storage.
    const storeX = engineX - 2.2, storeZ = half + 0.2;
    if (a.storage === 'tank') {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#' + timberColour.clone().multiplyScalar(0.9).getHexString(); ctx.fillRect(0, 0, 512, 64);
      for (let x = 0; x < 512; x += 12) { ctx.fillStyle = `rgba(0,0,0,${0.2 + random() * 0.3})`; ctx.fillRect(x, 0, 2, 64); }
      for (let i = 0; i < 9; i++) { ctx.fillStyle = 'rgba(10,8,6,0.7)'; ctx.fillRect(random() * 512, 0, 8 + random() * 20, 20 + random() * 44); }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      s.cylinder(1.9, 2.1, 2.6, [storeX, 1.38, storeZ], new THREE.MeshStandardMaterial({ map, roughness: 0.9 }), 28);
      for (const y of [0.5, 1.4, 2.4]) s.ring(mix(2.1, 1.9, y / 2.6) + 0.02, 0.04, [storeX, y + 0.08, storeZ], iron).rotation.x = Math.PI / 2;
      s.cylinder(1.8, 1.8, 0.04, [storeX, 2.6, storeZ], oil, 28);
      s.tube([[wheelX, 0.5, 1.3], [mix(wheelX, storeX, 0.5), 0.3, storeZ - 1], [storeX - 1.8, 2.3, storeZ - 0.9], [storeX - 1.2, 2.8, storeZ - 0.5]], 0.07, iron);
    }
    if (a.storage === 'barrels') {
      const staves = new THREE.MeshStandardMaterial({ color: timberColour.clone().multiplyScalar(0.95), roughness: 0.9 });
      const barrel = new THREE.LatheGeometry([[0.24, 0], [0.31, 0.2], [0.33, 0.45], [0.31, 0.7], [0.24, 0.9], [0, 0.9]].map(([r, y]) => new THREE.Vector2(r, y)), 12);
      const spots: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
      const rows = 3 + Math.round(mood.density * 3);
      for (let i = 0; i < rows; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < ((i + j) % 3 === 0 ? 1 : 2); k++)
        spots.push({ at: [storeX - 2 + i * 0.72 + (random() - 0.5) * 0.06, 0.08 + k * 0.9, storeZ - 0.6 + j * 0.72], size: 1, color: new THREE.Color().setHSL(0.08, 0.3, 0.3 + random() * 0.2) });
      s.scatter(barrel, staves, spots);
      const fallen = s.mesh(barrel, staves, [storeX - 3.1, 0.4, storeZ + 1.2]);
      fallen.rotation.z = Math.PI / 2; fallen.rotation.y = random();
    }
    if (a.storage === 'pit') {
      const earth = new THREE.MeshStandardMaterial({ color: padColour.clone().multiplyScalar(0.8), roughness: 1, flatShading: true });
      for (let i = 0; i < 12; i++) { const angle = i / 12 * 6.28, mound = s.mesh(new THREE.IcosahedronGeometry(1, 1), earth, [storeX + Math.cos(angle) * 2.9, 0.05, storeZ + 0.6 + Math.sin(angle) * 2.0]); mound.scale.set(1, 0.45 + random() * 0.25, 0.9); mound.rotation.y = random() * 3; }
      const pond = s.cylinder(2.7, 2.7, 0.03, [storeX, 0.2, storeZ + 0.6], oil, 26); pond.scale.z = 0.68; pond.castShadow = false;
    }
    // Lumber and mud dressing by place.
    if (a.place === 'spindletop' || a.place === 'baku') for (let i = 0; i < 4 + Math.round(mood.wear * 5); i++) {
      const puddle = s.cylinder(0.8 + random() * 1.4, 1, 0.012, [mix(-half - 1, engineX, random()), 0.086 + i * 0.0006, (random() < 0.5 ? -1 : 1) * (half * 0.5 + random() * 2.4)], oil, 14);
      puddle.scale.z = 0.5; puddle.castShadow = false;
    }
    if (a.place === 'spindletop') for (let i = 0; i < 14; i++) s.box([0.3, 0.06, 2.2], [-half - 2.4 + i * 0.36, 0.11, half + 2 + (random() - 0.5) * 0.25], plank).rotation.y = (random() - 0.5) * 0.12;
    for (let i = 0; i < Math.round(mood.density * 5) + (a.state === 'new' ? 4 : 0); i++) s.box([3.6, 0.12, 0.24], [-half - 0.5 + random() * 2, 0.14 + i * 0.12, -half - 1.4 + (random() - 0.5) * 0.3], new THREE.MeshStandardMaterial({ color: '#cfae78', roughness: 0.9 })).rotation.y = (random() - 0.5) * 0.2;

    // Crew.
    if (a.crew && !ruin) {
      const man = (x: number, y: number, z: number, shirt: string) => {
        const cloth = s.material(shirt), trousers = s.material('#3d3a36');
        for (const d of [-0.1, 0.1]) s.box([0.14, 0.8, 0.16], [x + d, y + 0.4, z], trousers);
        s.box([0.4, 0.62, 0.24], [x, y + 1.1, z], cloth);
        s.ball([0.11, 0.13, 0.11], [x, y + 1.55, z], s.material('#c9976f'), 10);
        s.cylinder(0.2, 0.2, 0.03, [x, y + 1.66, z], trousers, 12);
        s.cylinder(0.11, 0.12, 0.12, [x, y + 1.72, z], trousers, 10);
        s.rod([x - 0.22, y + 1.35, z], [x - 0.36, y + 0.95, z + 0.2], 0.05, cloth);
        s.rod([x + 0.22, y + 1.35, z], [x + 0.4, y + 1.1, z + 0.25], 0.05, cloth);
      };
      man(-0.9, 0.5, half * 0.55, '#8a8f93');
      man(1.1, 0.5, half * 0.3, '#a34a3a');
      if (mood.density > 0.4) man(wheelX + 2.6, 0.08, 2.2, '#6f7f5a');
    }

    // Gusher, fire and steam.
    const drifting: { mesh: THREE.Mesh; home: THREE.Vector3; phase: number }[] = [];
    const puffGeometry = new THREE.IcosahedronGeometry(1, 1);
    const cloud = (start: THREE.Vector3, count: number, colour: string, size: number, driftX: number, opaque: boolean) => {
      const material = new THREE.MeshStandardMaterial({ color: colour, roughness: 1, flatShading: true, transparent: !opaque, opacity: opaque ? 1 : 0.7, depthWrite: opaque });
      for (let i = 0; i < count; i++) {
        const t = i / Math.max(count - 1, 1);
        const home = new THREE.Vector3(start.x + t * driftX + (random() - 0.5) * size * 0.6, start.y + t * count * size * 0.55, start.z + (random() - 0.5) * size * 0.8);
        const mesh = s.mesh(puffGeometry, material, home.toArray() as [number, number, number]);
        mesh.scale.setScalar(size * mix(0.6, 1.8, t) * (0.85 + random() * 0.3));
        mesh.rotation.set(random() * 3, random() * 3, 0);
        mesh.castShadow = false;
        drifting.push({ mesh, home, phase: random() * 6.28 });
      }
    };
    const leanX = -Math.sin(lean) * tall - half * (1 - Math.cos(lean));
    const tongues: { node: THREE.Mesh; tall: number; wide: number; phase: number }[] = [];
    if (a.well === 'gusher') {
      into(inner, s.cylinder(0.55, 0.3, tall + 5, [0, (tall + 5) / 2 + 0.5, 0], oil, 12));
      const head = new THREE.Vector3(leanX, tall + 5.5, 0);
      for (let i = 0; i < 16; i++) {
        const t = i / 15, home = new THREE.Vector3(head.x + t * t * 9 + (random() - 0.5) * 1.2, head.y + Math.sin(t * Math.PI * 0.8) * 3 - t * 3 + (random() - 0.5), (random() - 0.5) * 2.2);
        const mesh = s.mesh(puffGeometry, new THREE.MeshStandardMaterial({ color: '#14100d', roughness: 0.5, flatShading: true }), home.toArray() as [number, number, number]);
        mesh.scale.setScalar(mix(1.5, 0.7, t) * (0.8 + random() * 0.5));
        mesh.castShadow = false;
        drifting.push({ mesh, home, phase: random() * 6.28 });
      }
      for (let i = 0; i < 16; i++) { const x = head.x + 1 + random() * 9, y = head.y - 1 - random() * 2; s.rod([x, y, (random() - 0.5) * 2.5], [x + 1.2 + random(), y - 4 - random() * 7, (random() - 0.5) * 2.5], 0.05, oil, 0.02).castShadow = false; }
      const slick = s.cylinder(5.5, 5.5, 0.014, [leanX + 5.5, 0.09, 0], oil, 26); slick.scale.z = 0.55; slick.castShadow = false;
    }
    if (a.well === 'fire') {
      const profile = [[0, 0], [0.2, 0.05], [0.34, 0.2], [0.36, 0.38], [0.27, 0.6], [0.14, 0.82], [0, 1]].map(([r, y]) => new THREE.Vector2(r, y));
      const drop = new THREE.LatheGeometry(profile, 12);
      const heart = new THREE.MeshBasicMaterial({ color: '#fff0a0' }), shell = new THREE.MeshBasicMaterial({ color: '#ff6a1c', transparent: true, opacity: 0.7, depthWrite: false });
      const spots: [number, number, number, number][] = [[leanX, tall + 0.4, 0, 7], [leanX + 0.6, tall - 2, 0.5, 4], [leanX - 0.5, tall * 0.62, -0.3, 4.5], [0.3, 0.6, 0.2, 5], [leanX * 0.5, tall * 0.35, 0.6, 3.5]];
      for (const [x, y, z, size] of spots) for (const [material, k] of [[shell, 1], [heart, 0.62]] as const) {
        const node = s.mesh(drop, material, [x, y, z]);
        node.castShadow = false;
        tongues.push({ node, tall: size * k * (0.8 + random() * 0.4), wide: size * 0.6 * k, phase: x + y });
      }
      cloud(new THREE.Vector3(leanX + 1, tall + 6, 0), 9, '#1b1819', 1.6, 9, true);
    }
    if (a.state === 'working') cloud(stackTop, 5, a.engine === 'boiler' ? '#55504c' : '#e6e3dc', 0.55, 2.4, false);
    const flicker = (time: number) => { for (const tongue of tongues) { const wave = Math.sin(time * 7 + tongue.phase) * mix(0.08, 0.3, mood.energy); tongue.node.scale.set(tongue.wide * (1 - wave * 0.4), tongue.tall * (1 + wave), tongue.wide); } };
    flicker(0);

    const speed = a.state === 'working' ? mix(0.4, 2.6, mood.energy) : 0;
    return s.finish({
      update: (dt, time) => {
        if (speed) { phase += dt * speed; pose(phase); }
        if (tongues.length) flicker(time);
        for (const puff of drifting) puff.mesh.position.y = puff.home.y + Math.sin(time * 0.9 + puff.phase) * 0.15;
        if (flag) flag.rotation.y = Math.sin(time * mix(1, 5, mood.energy)) * 0.25;
      },
    });
  },
});
