import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

const LIVERY = {
  yellow: 'Construction yellow with black trim, the classic.',
  white: 'Dusty white with a red stripe, a marble-quarry fleet truck.',
  orange: 'Safety orange with grey chassis.',
  teal: 'Faded teal and cream, an old Eastern Bloc giant.',
  green: 'Olive green, ex-army and hand-painted.',
  bare: 'Mostly bare rusted steel with patches of old paint and a mismatched yellow cab.',
} as const;
const PAINT: Record<keyof typeof LIVERY, [string, string, string]> = {
  yellow: ['#e8b61a', '#e8b61a', '#25282b'], white: ['#e9e7de', '#e9e7de', '#c22a20'], orange: ['#e2671e', '#e2671e', '#5d6468'],
  teal: ['#3f8c8a', '#e6dcc0', '#2f4f52'], green: ['#5b6f3a', '#5b6f3a', '#3a4526'], bare: ['#7d5338', '#d8a81c', '#3a3c3e'],
};

export default defineThing({
  questions: {
    load: choice('What is it carrying?', {
      boulders: 'A heaped load of broken white boulders.',
      overburden: 'A brown mound of earth and overburden.',
      block: 'One single squared block of stone, absurdly neat in the huge body.',
      empty: 'Nothing: the body is empty and scarred.',
    }),
    body: score('Is the tipping body raised?', ['Down, travelling', 'Half raised', 'Fully raised, tipping its load out behind']),
    livery: choice('What livery is it in?', LIVERY),
    driver: choice('Where is the driver?', {
      cab: 'In the cab, small behind the glass.',
      ladder: 'Climbing the access ladder.',
      ground: 'Standing by the front wheel, dwarfed by it.',
      gone: 'Nowhere: the cab door hangs open.',
    }),
    tyres: choice('What about the tyres?', {
      plain: 'Plain deep-treaded tyres.',
      chains: 'Wrapped in steel rock-protection chains.',
      blowout: 'One front tyre has blown: it sags flat and a spare lies on the ground.',
    }),
    marking: choice('What is painted on the body side?', {
      number: 'A big fleet number.',
      cava: 'CAVA and a quarry number.',
      stripe: 'Only a warning chevron stripe.',
      none: 'Nothing at all.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const [bodyHex, cabHex, trimHex] = PAINT[a.livery];
    const dusty = (hex: string, amount = 1, extra: THREE.MeshStandardMaterialParameters = {}) =>
      s.material(new THREE.Color(hex).lerp(new THREE.Color('#b9ad98'), Math.min(0.75, wear * 0.55 * amount)), { roughness: mix(0.5, 0.95, wear), ...extra });
    const bodyPaint = dusty(bodyHex, 1), cabPaint = dusty(cabHex, 0.6), trim = dusty(trimHex, 0.8);
    const chassis = dusty('#3a3d40', 1.2);
    const rubber = dusty('#1f2022', 0.75, { roughness: 0.95, flatShading: true });
    const steel = dusty('#8a9094', 0.6, { metalness: 0.6, roughness: 0.4 });
    const inside = dusty(a.livery === 'bare' ? '#6a4a35' : '#6e6a62', 0.5, { roughness: 0.95 });
    const stone = s.material('#eceae2', { roughness: 0.9, flatShading: true });
    const textures: THREE.Texture[] = [];

    const R = 1.3, TW = 0.85;
    const frontX = 2.4, rearX = -2.3;
    const flat = a.tyres === 'blowout';

    // ---- Wheels ----------------------------------------------------------------------------
    let chainMat: THREE.Material | null = null;
    if (a.tyres === 'chains') {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.strokeStyle = '#c9ced2';
      ctx.lineWidth = 5;
      for (let i = -2; i < 12; i++) {
        ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32 + 64, 64); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i * 32 + 64, 0); ctx.lineTo(i * 32, 64); ctx.stroke();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.repeat.set(3, 1);
      textures.push(texture);
      chainMat = new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.4, metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide });
    }
    const wheel = (x: number, z: number, outer: number, squash = 1) => {
      const group = new THREE.Group();
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(R, R, TW, 22), rubber);
      const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.86, R * 0.86, TW + 0.1, 22), rubber);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.5, R * 0.5, TW + 0.14, 16), cabPaint);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.22, R * 0.27, TW + 0.34, 10), chassis);
      group.add(tyre, shoulder, rim, hub);
      // Tread lugs.
      const lug = new THREE.BoxGeometry(0.13, TW * 0.46, 0.14);
      const lugs = new THREE.InstancedMesh(lug, rubber, 52);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < 52; i++) {
        const ang = (i / 26) * Math.PI * 2 + (i >= 26 ? Math.PI / 26 : 0);
        e.set(0, -ang + Math.PI / 2, 0);
        q.setFromEuler(e);
        m.compose(new THREE.Vector3(Math.cos(ang) * R, (i >= 26 ? 1 : -1) * TW * 0.25, Math.sin(ang) * R), q, new THREE.Vector3(1, 1, 1));
        lugs.setMatrixAt(i, m);
      }
      group.add(lugs);
      if (chainMat) group.add(new THREE.Mesh(new THREE.CylinderGeometry(R + 0.1, R + 0.1, TW + 0.06, 22, 1, true), chainMat));
      hub.position.y = outer * 0.05;
      group.traverse((node) => { node.castShadow = node.receiveShadow = true; });
      group.rotation.x = Math.PI / 2;
      group.position.set(x, R * squash, z);
      group.scale.set(1, 1, 1);
      if (squash < 1) { group.scale.z = squash * 0.92; group.position.y = R * squash * 0.92; }
      s.root.add(group);
      return group;
    };
    wheel(frontX, 2.35, 1, flat ? 0.78 : 1);
    wheel(frontX, -2.35, -1);
    for (const z of [1.5, 2.4]) { wheel(rearX, z, 1); wheel(rearX, -z, -1); }
    if (flat) {
      const spare = wheel(frontX + 0.4, 4.1, 1);
      spare.rotation.x = 0;
      spare.position.y = TW / 2;
      // Jack stand under the axle.
      s.box([0.5, 0.9, 0.5], [frontX + 0.9, 0.45, 1.6], steel);
      s.box([0.8, 0.12, 0.8], [frontX + 0.9, 0.06, 1.6], chassis);
    }

    // ---- Chassis, engine deck and cab -------------------------------------------------------
    s.box([8.2, 0.9, 1.7], [0, 1.75, 0], chassis);
    s.cylinder(0.3, 0.3, 4.4, [frontX, R, 0], chassis, 10).rotation.x = Math.PI / 2;
    s.cylinder(0.55, 0.55, 2.6, [rearX, R, 0], chassis, 12).rotation.x = Math.PI / 2;
    s.ball([0.75, 0.75, 0.75], [rearX, R, 0], chassis, 12);
    // Engine housing and radiator grille.
    s.box([2.5, 1.9, 2.3], [3.0, 2.1, 0], cabPaint);
    s.box([0.08, 1.5, 1.9], [4.27, 2.15, 0], trim);
    for (let i = 0; i < 7; i++) s.box([0.05, 0.08, 1.8], [4.32, 1.55 + i * 0.2, 0], chassis);
    // Bumper, headlights.
    s.box([0.4, 0.5, 5.6], [4.3, 1.1, 0], trim);
    const glow = Math.abs(mood.daylight - 0.5) * 2;
    const lamp = new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#ffe9a8', emissiveIntensity: mix(0.15, 1.6, glow), roughness: 0.3 });
    for (const z of [-2.2, -1.7, 1.7, 2.2]) s.cylinder(0.17, 0.17, 0.1, [4.52, 1.15, z], lamp, 12).rotation.z = Math.PI / 2;
    // Deck over the front wheels with handrails.
    s.box([3.0, 0.14, 5.9], [3.0, 3.07, 0], cabPaint);
    for (const z of [-2.9, 2.9]) s.box([3.0, 0.5, 0.1], [3.0, 2.8, z], cabPaint);
    const railMat = dusty(a.livery === 'yellow' ? '#25282b' : '#e8b61a', 0.4);
    const rail = (pts: P3[]) => { for (let i = 1; i < pts.length; i++) s.rod(pts[i - 1], pts[i], 0.035, railMat); };
    rail([[4.45, 3.1, -2.85], [4.45, 4.05, -2.85], [4.45, 4.05, 0.2], [4.45, 3.1, 0.2]]);
    rail([[4.45, 4.05, -2.85], [1.7, 4.05, -2.85], [1.7, 3.1, -2.85]]);
    rail([[4.45, 3.6, -2.85], [4.45, 3.6, 0.2]]);
    rail([[4.45, 3.6, -2.85], [1.7, 3.6, -2.85]]);
    for (const x of [3.5, 2.6]) s.rod([x, 3.1, -2.85], [x, 4.05, -2.85], 0.03, railMat);
    for (const z of [-1.8, -0.8]) s.rod([4.45, 3.1, z], [4.45, 4.05, z], 0.03, railMat);
    // Diagonal access ladder across the radiator.
    const ladderFoot: P3 = [4.62, 0.75, -2.3], ladderHead: P3 = [4.62, 3.15, 0.55];
    for (const dy of [0, 0.42]) s.rod([ladderFoot[0], ladderFoot[1] + dy, ladderFoot[2] - dy * 0.3], [ladderHead[0], ladderHead[1] + dy, ladderHead[2] - dy * 0.3], 0.04, railMat);
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      s.box([0.3, 0.04, 0.42], [4.62, mix(ladderFoot[1], ladderHead[1], t), mix(ladderFoot[2], ladderHead[2], t) - 0.05], steel);
    }
    // Air tanks and fuel tank on the flanks.
    s.cylinder(0.42, 0.42, 1.6, [0.3, 1.5, 1.35], trim, 14).rotation.z = Math.PI / 2;
    s.box([1.5, 0.9, 0.6], [0.2, 1.5, -1.25], trim);
    // Cab: posts, half panels, glass you can see through.
    const cabX = 2.75, cabZ = 1.75, cw = 1.9, cd = 1.9, ch = 1.65, cy0 = 3.14;
    s.box([cw, 0.75, cd], [cabX, cy0 + 0.375, cabZ], cabPaint);
    s.box([cw + 0.16, 0.12, cd + 0.16], [cabX, cy0 + ch, cabZ], cabPaint);
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) s.box([0.1, ch, 0.1], [cabX + dx * (cw / 2 - 0.05), cy0 + ch / 2, cabZ + dz * (cd / 2 - 0.05)], cabPaint);
    const glass = new THREE.MeshStandardMaterial({ color: '#6fa7c4', transparent: true, opacity: 0.38, roughness: 0.1, depthWrite: false });
    s.box([0.02, 0.82, cd - 0.2], [cabX + cw / 2 - 0.02, cy0 + 1.18, cabZ], glass).castShadow = false;
    s.box([cw - 0.2, 0.82, 0.02], [cabX, cy0 + 1.18, cabZ + cd / 2 - 0.02], glass).castShadow = false;
    s.box([cw - 0.2, 0.82, 0.02], [cabX, cy0 + 1.18, cabZ - cd / 2 + 0.02], glass).castShadow = false;
    s.box([0.5, 0.4, 0.5], [cabX - 0.3, cy0 + 0.95, cabZ], chassis); // seat
    s.box([0.12, 0.8, 0.5], [cabX - 0.58, cy0 + 1.2, cabZ], chassis);
    const beacon = new THREE.MeshStandardMaterial({ color: '#ff9a1a', emissive: '#ff8a00', emissiveIntensity: 0.6 });
    s.cylinder(0.1, 0.1, 0.18, [cabX + 0.5, cy0 + ch + 0.15, cabZ + 0.5], beacon, 10);
    for (const z of [cabZ + cd / 2 + 0.25, -2.75]) s.box([0.06, 0.5, 0.3], [4.3, 4.1, z], chassis); // mirrors
    s.rod([cabX + cw / 2, cy0 + 1.4, cabZ + cd / 2], [4.3, 4.1, cabZ + cd / 2 + 0.25], 0.025, chassis);
    // Exhaust stack.
    s.cylinder(0.11, 0.11, 1.5, [1.75, 3.9, -1.5], steel, 10);
    if (a.driver === 'gone') {
      const door = s.box([0.9, 1.5, 0.06], [cabX + 0.45, cy0 + 0.85, cabZ + cd / 2 + 0.42], cabPaint);
      door.rotation.y = -1.1;
    }

    // ---- Driver ----------------------------------------------------------------------------
    const person = (at: P3, turn: number, pose: 'stand' | 'sit' | 'climb') => {
      const g = new THREE.Group();
      const hiVis = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.4 ? '#f4d21f' : '#e8641e', roughness: 0.8 });
      const trousers = new THREE.MeshStandardMaterial({ color: '#2f3a4c', roughness: 0.9 });
      const skin = new THREE.MeshStandardMaterial({ color: '#c79670', roughness: 0.8 });
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, p: P3) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...p); mesh.castShadow = true; g.add(mesh); return mesh; };
      const legH = pose === 'sit' ? 0.45 : 0.85;
      if (pose !== 'sit') for (const dx of [-0.11, 0.11]) add(new THREE.BoxGeometry(0.16, legH, 0.18), trousers, [dx, legH / 2, 0]);
      else add(new THREE.BoxGeometry(0.4, 0.18, 0.5), trousers, [0, 0.4, 0.2]);
      add(new THREE.BoxGeometry(0.46, 0.6, 0.26), hiVis, [0, legH + 0.3, 0]);
      add(new THREE.SphereGeometry(0.13, 12, 8), skin, [0, legH + 0.75, 0]);
      add(new THREE.SphereGeometry(0.15, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#f2f2ee', roughness: 0.5 }), [0, legH + 0.79, 0]);
      for (const dx of [-0.29, 0.29]) {
        const arm = add(new THREE.BoxGeometry(0.11, 0.58, 0.12), hiVis, [dx, legH + (pose === 'climb' ? 0.72 : 0.3), pose === 'climb' ? 0.12 : 0]);
        if (pose === 'climb') arm.rotation.x = -0.5;
      }
      g.position.set(...at);
      g.rotation.y = turn;
      s.root.add(g);
    };
    if (a.driver === 'cab') person([cabX - 0.25, cy0 + 0.55, cabZ], Math.PI / 2, 'sit');
    if (a.driver === 'ladder') person([4.95, 1.75, -1.0], -Math.PI / 2, 'climb');
    if (a.driver === 'ground') person([frontX + 1.2, 0, 3.4], 0.4 + random() * 0.6, 'stand');

    // ---- Tipping body ------------------------------------------------------------------------
    const pivot = new THREE.Vector3(-3.0, 2.7, 0);
    const angle = a.body * THREE.MathUtils.degToRad(50);
    const body = new THREE.Group();
    body.position.copy(pivot);
    body.rotation.z = angle;
    s.root.add(body);
    const W = 5.5;
    const sideShape = new THREE.Shape();
    for (const [i, [x, y]] of ([[4.45, 0], [-0.3, 0], [-1.9, 0.95], [-1.9, 1.3], [4.7, 2.15]] as const).entries()) i ? sideShape.lineTo(x, y) : sideShape.moveTo(x, y);
    sideShape.closePath();
    const sideGeo = new THREE.ExtrudeGeometry(sideShape, { depth: 0.14, bevelEnabled: false });
    for (const z of [-W / 2, W / 2 - 0.14]) body.add(s.mesh(sideGeo, bodyPaint, [0, 0, z]));
    body.add(s.box([4.75, 0.16, W - 0.2], [2.07, 0.0, 0], inside));
    const tail = s.box([1.9, 0.16, W - 0.2], [-1.1, 0.47, 0], inside);
    tail.rotation.z = -Math.atan2(0.95, 1.6);
    body.add(tail);
    const frontWall = s.box([0.16, 2.2, W], [4.57, 1.07, 0], bodyPaint);
    frontWall.rotation.z = -0.115;
    body.add(frontWall);
    const canopy = s.box([3.0, 0.16, W], [6.1, 2.25, 0], bodyPaint);
    canopy.rotation.z = 0.05;
    body.add(canopy);
    body.add(s.box([0.14, 0.3, W], [7.55, 2.2, 0], bodyPaint));
    // Stiffening ribs outside.
    for (let i = 0; i < 6; i++) {
      const x = -0.2 + i * 0.9;
      const h = 1.45 + i * 0.12;
      for (const z of [-W / 2 - 0.06, W / 2 + 0.06]) body.add(s.box([0.16, h, 0.14], [x, h / 2 - 0.05, z], bodyPaint));
    }
    for (const z of [-W / 2 - 0.06, W / 2 + 0.06]) body.add(s.box([6.6, 0.18, 0.16], [1.4, 1.62, z], trim)).rotation.z = 0.128;
    body.add(s.box([5.0, 0.4, 1.9], [2.0, -0.28, 0], chassis));
    if (a.marking !== 'none') {
      const text = a.marking === 'number' ? `${10 + Math.floor(random() * 89)}` : a.marking === 'cava' ? `CAVA ${1 + Math.floor(random() * 180)}` : '/ / / / / /';
      const dark = a.livery === 'white' || a.livery === 'yellow' || a.livery === 'orange';
      for (const side of [1, -1]) {
        const plate = s.label(text, a.marking === 'number' ? 1.3 : 2.6, 0.8, [2.4, 0.85, side * (W / 2 + 0.14)], a.marking === 'stripe' ? '#e8b61a' : dark ? '#1f2224' : '#f4f1e4', a.marking === 'stripe' ? '#1f2224' : bodyHex);
        if (side < 0) plate.rotation.y = Math.PI;
        body.add(plate);
      }
    }
    // Hoist cylinders.
    for (const z of [-1.15, 1.15]) {
      const foot = new THREE.Vector3(-0.6, 1.9, z);
      const head = new THREE.Vector3(2.4, -0.3, z).applyAxisAngle(new THREE.Vector3(0, 0, 1), angle).add(pivot);
      const mid = foot.clone().lerp(head, 0.45);
      s.rod(foot.toArray() as P3, mid.toArray() as P3, 0.16, trim);
      s.rod(mid.toArray() as P3, head.toArray() as P3, 0.09, new THREE.MeshStandardMaterial({ color: '#d9dde0', metalness: 0.9, roughness: 0.2 }));
    }

    // ---- Load ------------------------------------------------------------------------------
    const tipped = a.body > 0.55;
    const kept = a.load === 'empty' ? 0 : tipped ? mix(0.5, 0.05, (a.body - 0.55) / 0.45) : 1;
    const dropX = -5.9;
    if (a.load === 'boulders') {
      const rocks: { at: P3; size: number }[] = [];
      const n = Math.round(46 * kept);
      for (let i = 0; i < n; i++) {
        const u = random(), w = random() - 0.5;
        const x = tipped ? mix(-1.6, 1.2, u) : mix(-0.6, 4.0, u);
        const heap = tipped ? 0.5 : 1.5 * Math.sin(u * Math.PI) * (1 - Math.abs(w) * 1.2);
        rocks.push({ at: [x, (x < -0.3 ? (-0.3 - x) * 0.6 : 0) + 0.3 + random() * Math.max(0.2, heap), w * (W - 1.2)], size: 0.28 + random() * 0.34 });
      }
      if (rocks.length) body.add(s.scatter(new THREE.DodecahedronGeometry(1, 0), stone, rocks));
      if (!tipped) body.add(s.ball([2.3, 0.9, W / 2 - 0.5], [1.8, 0.5, 0], stone, 9));
      if (tipped) {
        const pile: { at: P3; size: number }[] = [];
        for (let i = 0; i < 46 - n; i++) {
          const r = random() * 2.1, an = random() * 6.283;
          pile.push({ at: [dropX - 0.4 + Math.cos(an) * r * 0.8, 0.2 + (2.1 - r) * 0.55 * random(), Math.sin(an) * r], size: 0.26 + random() * 0.36 });
        }
        s.scatter(new THREE.DodecahedronGeometry(1, 0), stone, pile);
        s.ball([1.5, 0.8, 1.9], [dropX - 0.4, 0.1, 0], stone, 8);
      }
    } else if (a.load === 'overburden') {
      const earth = s.material(mood.warmth > 0.5 ? '#8a5f3c' : '#6f5a48', { roughness: 1, flatShading: true });
      if (kept > 0.3) body.add(s.ball([2.6 * kept + 0.2, 1.5 * kept, W / 2 - 0.3], [tipped ? 0.4 : 1.9, 0.35, 0], earth, 10));
      if (kept > 0.3 && !tipped) for (let i = 0; i < 6; i++) body.add(s.mesh(new THREE.DodecahedronGeometry(0.35 + random() * 0.3, 0), earth, [random() * 3.6, 1.1 + random() * 0.5, (random() - 0.5) * 3.4]));
      if (tipped) {
        s.mesh(new THREE.ConeGeometry(2.6, 1.9, 9), earth, [dropX - 0.6, 0.95, 0]);
        // A chute of earth still falling from the tail.
        const chute = s.box([0.5, 2.6, W - 1.6], [dropX + 1.0, 1.7, 0], earth);
        chute.rotation.z = -0.5;
      }
    } else if (a.load === 'block') {
      const bw = 3.3, bh = 1.6, bd = 2.3;
      if (!tipped) {
        const block = s.box([bw, bh, bd], [1.9, bh / 2 + 0.1, 0], s.material('#eceae2', { roughness: 0.85 }));
        body.add(block);
        for (const x of [0.8, 3.0]) body.add(s.box([0.25, 0.12, bd + 0.6], [x, 0.14, 0], s.material('#8a623c')));
        body.add(s.label(`${Math.floor(100 + random() * 899)}`, 1.3, 0.6, [1.9, 1.75, 0.0], '#b8261c', '#eceae2')).rotation.x = -Math.PI / 2;
      } else {
        // It has slid out and landed corner-first.
        const block = s.box([bw, bh, bd], [dropX - 0.5, 1.05, 0.2], s.material('#eceae2', { roughness: 0.85 }));
        block.rotation.set(0.05, 0.3, 0.42);
        for (let i = 0; i < 8; i++) s.mesh(new THREE.DodecahedronGeometry(0.15 + random() * 0.2, 0), stone, [dropX - 1 + random() * 3, 0.1, (random() - 0.5) * 3.4]);
      }
    } else if (wear > 0.3) {
      // Scabs of dried mud left in an empty body.
      for (let i = 0; i < 6; i++) body.add(s.ball([0.4 + random() * 0.5, 0.06, 0.4 + random() * 0.5], [random() * 4, 0.1, (random() - 0.5) * 4], s.material('#9a8870', { roughness: 1 }), 8));
    }

    // Dust kicked up around the wheels when the place is busy.
    if (mood.energy > 0.55) {
      const puff = new THREE.MeshStandardMaterial({ color: '#e6dfd0', transparent: true, opacity: 0.35, roughness: 1, depthWrite: false });
      for (let i = 0; i < 7; i++) s.ball([0.7 + random() * 0.7, 0.5 + random() * 0.4, 0.7 + random() * 0.7], [rearX - 1.4 - random() * 1.5, 0.4 + random() * 0.6, (random() - 0.5) * 5.5], puff, 10).castShadow = false;
    }

    s.root.rotation.y = -Math.PI / 2 + mix(0.3, 0.55, random());
    const thing = s.finish({
      update: (_dt, time) => { beacon.emissiveIntensity = mood.energy > 0.2 && Math.sin(time * mix(3, 9, mood.energy)) > 0 ? 2.2 : 0.3; },
    });
    const dispose = thing.dispose;
    return { ...thing, dispose: () => { textures.forEach((texture) => texture.dispose()); dispose(); } };
  },
});
