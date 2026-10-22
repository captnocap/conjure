import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type V3 = [number, number, number];

export default defineThing({
  questions: {
    kind: choice('What kind of sled is it?', {
      davos: 'A classic wooden sled: slatted seat on two ash runners that curl up into horns.',
      aluminium: 'An aluminium frame sled with coloured wooden slats and a little backrest, as every child in the block had.',
      flyer: 'A low wooden deck on thin red steel runners with a steering bar across the front.',
      plastic: 'A moulded plastic toboggan shell in a loud colour.',
    }),
    pose: choice('How has it been left?', {
      leaning: 'Leaned upright against the wall on its back end.',
      hung: 'Hung high on the wall from a nail.',
      standing: 'Standing on its runners on the floor, ready to go.',
      side: 'Tipped over on its side.',
    }),
    state: choice('What state is it in, and what does that say?', {
      dripping: 'Just back from the snow: clumps of it on the runners, drips, a spreading puddle.',
      ready: 'Dry and clean, runners waxed, waiting for the first snowfall.',
      dusty: 'Grey with dust and a cobweb: nobody has ridden it for years.',
      outgrown: 'Outgrown and turned into storage: old skis and a box stacked up against it.',
      broken: 'Broken: a snapped slat and a frayed rope, kept anyway.',
    }),
    rope: choice('What is the tow rope like?', {
      trailing: 'A loop of rope spilled across the floor.',
      toggle: 'A rope hanging down with a wooden handle in the middle.',
      wound: 'Wound neatly round the front bar.',
      strap: 'Replaced with an old leather belt.',
      none: 'No rope at all.',
    }),
    paint: choice('What colour are the seat slats or shell?', {
      natural: 'Bare varnished wood (or, for plastic, plain red).',
      red: 'Fire-engine red.',
      rainbow: 'Every slat a different colour: red, yellow, green, blue.',
      blue: 'Sky blue.',
      green: 'Fir green.',
      yellow: 'Egg-yolk yellow.',
    }),
    extra: choice('What has been left on it?', {
      cushion: 'A checked cushion tied to the seat.',
      mittens: 'A child’s mittens on a string, hooked over the front.',
      teddy: 'A small teddy bear tied on as a passenger.',
      nothing: 'Nothing.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const sled = new THREE.Group();
    const mats = new Set<THREE.MeshStandardMaterial>();
    const mat = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => { const m = s.material(colour, options); mats.add(m); return m; };
    const part = (geo: THREE.BufferGeometry, m: THREE.Material, at: V3 = [0, 0, 0], rot?: V3, parent: THREE.Object3D = sled) => {
      const mesh = new THREE.Mesh(geo, m); mesh.position.set(...at); if (rot) mesh.rotation.set(...rot); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    const tube = (pts: V3[], r: number, m: THREE.Material, parent: THREE.Object3D = sled) => part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), Math.max(12, pts.length * 6), r, 7), m, [0, 0, 0], undefined, parent);
    const rodGeo = (from: V3, to: V3, r: number, m: THREE.Material, parent: THREE.Object3D = sled) => {
      const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to), d = B.clone().sub(A);
      const mesh = part(new THREE.CylinderGeometry(r, r, Math.max(d.length(), 0.001), 8), m, A.clone().addScaledVector(d, 0.5).toArray() as V3, undefined, parent);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return mesh;
    };
    const rainbow = ['#d8332b', '#f0c419', '#3da35a', '#2f7fd0', '#f08a2a', '#d8332b', '#f0c419'];
    const paintColour = { natural: '', red: '#d12f28', rainbow: '', blue: '#3f8fd6', green: '#2f7a4a', yellow: '#f0c021' }[a.paint];
    const wood = mat(pick(['#c79a5e', '#b98248', '#d4b07a']), { roughness: 0.55 });
    const slatMat = (i: number) => a.paint === 'rainbow' ? mat(rainbow[i % rainbow.length], { roughness: 0.5 }) : paintColour ? mat(paintColour, { roughness: 0.5 }) : wood;
    const steelDark = mat('#4a4d50', { metalness: 0.7, roughness: 0.45 });
    const alu = mat('#c3c7c8', { metalness: 0.75, roughness: 0.35 });
    const slats: THREE.Mesh[] = [];
    let L = 0.85, seatY = 0.25, seatZ = 0, hw = 0.15;
    let attach: [V3, V3] = [[-0.15, 0.13, 0.42], [0.15, 0.13, 0.42]];

    if (a.kind === 'davos') {
      L = 0.86; seatY = 0.256; seatZ = -0.07;
      for (const x of [-hw, hw]) {
        tube([[x, 0.018, -L / 2], [x, 0.018, 0], [x, 0.018, L / 2 - 0.22], [x, 0.045, L / 2 - 0.08], [x, 0.13, L / 2], [x, 0.21, L / 2 - 0.035], [x, 0.228, L / 2 - 0.13]], 0.016, wood);
        part(new THREE.BoxGeometry(0.02, 0.004, L - 0.24), steelDark, [x, 0.001, -0.11]);
        part(new THREE.BoxGeometry(0.028, 0.03, L - 0.12), wood, [x, 0.225, -0.06]);
        for (const z of [-L / 2 + 0.08, -0.04, L / 2 - 0.3]) part(new THREE.BoxGeometry(0.024, 0.2, 0.03), wood, [x, 0.12, z]);
      }
      for (const z of [-L / 2 + 0.08, -0.04, L / 2 - 0.3]) part(new THREE.BoxGeometry(hw * 2, 0.02, 0.03), wood, [0, 0.238, z]);
      for (let i = 0; i < 5; i++) slats.push(part(new THREE.BoxGeometry(0.05, 0.012, L - 0.2), slatMat(i), [(i - 2) * 0.062, 0.25, seatZ]));
      rodGeo([-hw, 0.13, L / 2], [hw, 0.13, L / 2], 0.009, wood);
      attach = [[-hw + 0.02, 0.13, L / 2], [hw - 0.02, 0.13, L / 2]];
    } else if (a.kind === 'aluminium') {
      L = 0.76; seatY = 0.197; seatZ = -0.02;
      for (const x of [-hw, hw]) {
        part(new THREE.BoxGeometry(0.022, 0.006, L), alu, [x, 0.003, 0]);
        tube([[x, 0.004, L / 2 - 0.02], [x, 0.03, L / 2 + 0.06], [x, 0.1, L / 2 + 0.075], [x, 0.16, L / 2 + 0.02], [x, 0.176, L / 2 - 0.08]], 0.009, alu);
        part(new THREE.BoxGeometry(0.016, 0.016, L - 0.08), alu, [x, 0.176, -0.04]);
        for (const z of [-L / 2 + 0.07, -0.03, L / 2 - 0.16]) part(new THREE.BoxGeometry(0.014, 0.172, 0.006), alu, [x, 0.09, z]);
      }
      for (const z of [-L / 2 + 0.07, L / 2 - 0.16]) part(new THREE.BoxGeometry(hw * 2, 0.008, 0.02), alu, [0, 0.18, z]);
      for (let i = 0; i < 6; i++) slats.push(part(new THREE.BoxGeometry(0.043, 0.012, L - 0.12), slatMat(i), [(i - 2.5) * 0.052, 0.19, seatZ - 0.02]));
      tube([[-hw, 0.176, -L / 2 + 0.06], [-hw, 0.36, -L / 2 - 0.01], [-hw + 0.04, 0.42, -L / 2 - 0.02], [hw - 0.04, 0.42, -L / 2 - 0.02], [hw, 0.36, -L / 2 - 0.01], [hw, 0.176, -L / 2 + 0.06]], 0.008, alu);
      slats.push(part(new THREE.BoxGeometry(hw * 2 + 0.02, 0.05, 0.012), slatMat(2), [0, 0.35, -L / 2 + 0.003], [0.3, 0, 0]));
      attach = [[-hw, 0.1, L / 2 + 0.075], [hw, 0.1, L / 2 + 0.075]];
    } else if (a.kind === 'flyer') {
      L = 1.0; seatY = 0.158; seatZ = -0.08; hw = 0.15;
      const red = mat('#b8261f', { metalness: 0.4, roughness: 0.45 });
      for (const x of [-hw, hw]) {
        tube([[x, 0.007, -L / 2], [x, 0.007, 0], [x, 0.007, L / 2 - 0.22], [x, 0.04, L / 2 - 0.06], [x * 0.85, 0.11, L / 2 - 0.01], [x * 0.7, 0.15, L / 2 - 0.1]], 0.007, red);
        for (const z of [-L / 2 + 0.16, L / 2 - 0.4]) { rodGeo([x, 0.007, z - 0.05], [x * 0.85, 0.145, z], 0.005, red); rodGeo([x, 0.007, z + 0.05], [x * 0.85, 0.145, z], 0.005, red); }
      }
      for (const z of [-L / 2 + 0.16, L / 2 - 0.4]) part(new THREE.BoxGeometry(hw * 2, 0.006, 0.03), red, [0, 0.146, z]);
      for (let i = 0; i < 3; i++) slats.push(part(new THREE.BoxGeometry(0.092, 0.014, i === 1 ? L * 0.84 : L * 0.7), slatMat(i), [(i - 1) * 0.1, 0.156, i === 1 ? -0.04 : -0.1]));
      part(new THREE.BoxGeometry(0.48, 0.022, 0.045), wood, [0, 0.172, L / 2 - 0.13]);
      attach = [[-0.21, 0.172, L / 2 - 0.13], [0.21, 0.172, L / 2 - 0.13]];
    } else {
      L = 0.82; seatY = 0.124; seatZ = -0.08; hw = 0.18;
      const shell = mat(paintColour || pick(['#d12f28', '#e8408a', '#f0c021', '#3f8fd6', '#ff7a1a']), { roughness: 0.35 });
      const shape = new THREE.Shape();
      const pts: [number, number][] = [[-L / 2, 0.02], [-L / 2, 0.12], [L / 2 - 0.2, 0.12], [L / 2 - 0.06, 0.15], [L / 2, 0.2], [L / 2 + 0.015, 0.185], [L / 2 - 0.08, 0.05], [L / 2 - 0.2, 0], [-L / 2 + 0.05, 0]];
      pts.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
      const geo = new THREE.ExtrudeGeometry(shape, { depth: hw * 2 - 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 3 });
      geo.translate(0, 0, -(hw - 0.02)); geo.rotateY(-Math.PI / 2);
      slats.push(part(geo, shell));
      const inset = mat(new THREE.Color(shell.color).multiplyScalar(0.62), { roughness: 0.5 });
      part(new THREE.BoxGeometry(hw * 2 - 0.11, 0.012, L * 0.6), inset, [0, 0.13, seatZ]);
      for (const x of [-1, 1]) { part(new THREE.BoxGeometry(0.03, 0.03, L * 0.6), shell, [x * (hw - 0.03), 0.145, seatZ]); part(new THREE.BoxGeometry(0.012, 0.02, 0.1), mat('#141414'), [x * (hw - 0.03), 0.152, 0.05]); }
      for (const x of [-0.08, 0.08]) part(new THREE.BoxGeometry(0.03, 0.01, L * 0.7), inset, [x, -0.004, -0.06]);
      attach = [[-0.06, 0.175, L / 2 - 0.035], [0.06, 0.175, L / 2 - 0.035]];
      seatY = 0.137;
    }

    // Passengers and padding, in the sled's own frame.
    if (a.extra === 'cushion') {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
      const g = canvas.getContext('2d')!;
      const [c1, c2] = pick([['#b23a3a', '#f1e9d6'], ['#2f5f9a', '#e9e3d0'], ['#3d7a4a', '#f0c94a'], ['#7a3a6a', '#e9d9e3']] as const);
      g.fillStyle = c2; g.fillRect(0, 0, 64, 64); g.fillStyle = c1; g.globalAlpha = 0.6;
      for (let k = 0; k < 4; k++) { g.fillRect(k * 16, 0, 8, 64); g.fillRect(0, k * 16, 64, 8); }
      const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 2);
      const cm = new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }); mats.add(cm);
      const cushion = part(new THREE.SphereGeometry(1, 16, 10), cm, [0, seatY + 0.03, seatZ]);
      cushion.scale.set(Math.min(hw - 0.01, 0.15), 0.035, 0.19);
      for (const z of [-0.1, 0.1]) part(new THREE.BoxGeometry(hw * 2 + 0.02, 0.004, 0.012), mat('#e9e3d0'), [0, seatY + 0.045, seatZ + z]);
    } else if (a.extra === 'teddy') {
      const fur = mat(pick(['#b07a3e', '#8a5a34', '#d9c29a', '#9a9590']), { roughness: 1 });
      const bear = new THREE.Group(); bear.position.set((random() - 0.5) * 0.06, seatY, seatZ + 0.02); bear.rotation.y = (random() - 0.5) * 0.6; sled.add(bear);
      const ball = (size: V3, at: V3, m: THREE.Material = fur) => { const mesh = part(new THREE.SphereGeometry(1, 12, 9), m, at, undefined, bear); mesh.scale.set(...size); return mesh; };
      ball([0.055, 0.065, 0.05], [0, 0.065, 0]);
      ball([0.045, 0.042, 0.042], [0, 0.155, 0.005]);
      ball([0.02, 0.016, 0.016], [0, 0.146, 0.042], mat('#e9d9b8', { roughness: 1 }));
      ball([0.006, 0.005, 0.005], [0, 0.152, 0.057], mat('#1b1b1b'));
      for (const x of [-1, 1]) { ball([0.016, 0.016, 0.008], [x * 0.035, 0.192, 0]); ball([0.02, 0.02, 0.05], [x * 0.035, 0.022, 0.055]); ball([0.018, 0.045, 0.018], [x * 0.062, 0.08, 0.01]).rotation.z = x * 0.5; ball([0.005, 0.005, 0.004], [x * 0.016, 0.168, 0.04], mat('#1b1b1b')); }
      part(new THREE.BoxGeometry(hw * 2 + 0.02, 0.012, 0.004), mat(pick(['#d12f28', '#3f8fd6', '#e9e3d0'])), [-bear.position.x, 0.07, 0.05], undefined, bear);
    }

    // Wound rope and snow belong to the sled frame too.
    const ropeColour = a.rope === 'strap' ? '#4a3020' : pick(['#d9cba0', '#c9b27a', '#e9e3d0', '#3f6fb0']);
    const ropeMat = mat(ropeColour, { roughness: 1 });
    const mid: V3 = [0, (attach[0][1] + attach[1][1]) / 2, (attach[0][2] + attach[1][2]) / 2];
    if (a.rope === 'wound') for (let k = 0; k < 9; k++) part(new THREE.TorusGeometry(0.02, 0.006, 6, 14), ropeMat, [mix(attach[0][0], attach[1][0], 0.25 + k * 0.055), mid[1], mid[2]], [0, Math.PI / 2 + (random() - 0.5) * 0.3, 0]);
    if (a.state === 'dripping') {
      const snow = new THREE.MeshStandardMaterial({ color: '#f4f8fb', roughness: 0.9, emissive: '#cfe0ee', emissiveIntensity: 0.15 });
      for (let k = 0; k < 12; k++) {
        const onSeat = k > 8;
        const lump = part(new THREE.SphereGeometry(1, 9, 6), snow, [(random() < 0.5 ? -1 : 1) * hw * (onSeat ? random() * 0.7 : 1), onSeat ? seatY + 0.008 : 0.012 + random() * 0.03, onSeat ? seatZ + (random() - 0.5) * 0.4 : (random() - 0.5) * L * 0.95]);
        lump.scale.set(0.02 + random() * 0.025, 0.012 + random() * 0.014, 0.03 + random() * 0.05);
      }
    }
    // A snapped slat.
    let splinter: THREE.Mesh | null = null;
    if (a.state === 'broken') {
      if (a.kind === 'plastic') { for (let k = 0; k < 5; k++) part(new THREE.BoxGeometry(0.006, 0.004, 0.07), mat('#1a1a1a'), [0.02 + (k % 2) * 0.03, seatY + 0.002, -0.2 + k * 0.055], [0, (k % 2 ? 1 : -1) * 0.5, 0]); }
      else {
        const victim = slats[Math.min(slats.length - 1, 1 + Math.floor(random() * 2))];
        victim.scale.z = 0.42; victim.position.z -= L * 0.2; victim.rotation.x = 0.06;
        splinter = new THREE.Mesh(victim.geometry, victim.material); splinter.scale.set(1, 1, 0.3); splinter.castShadow = true;
      }
    }
    // Dust greys everything on the sled.
    if (a.state === 'dusty' || a.state === 'outgrown') {
      const dust = new THREE.Color('#9a968c'), amount = a.state === 'dusty' ? 0.5 : 0.25;
      for (const m of mats) { m.color.lerp(dust, amount); m.roughness = 1; m.metalness *= 0.4; }
    }

    // Wall and floor.
    const hung = a.pose === 'hung';
    const wallW = 1.05, wallH = hung ? 1.62 : a.state === 'outgrown' ? 1.55 : 1.25, dado = Math.min(1.5, wallH - 0.25);
    const [lowC, highC] = pick([['#7c8a5a', '#e4e0d2'], ['#9fb9c6', '#e8e7df'], ['#c39a45', '#ebe2c6'], ['#6f8f8a', '#deded2'], ['#a9886a', '#e3dccb']] as const);
    s.box([wallW, dado, 0.1], [0, dado / 2, -0.05], s.material(lowC, { roughness: 0.45 }));
    s.box([wallW, wallH - dado, 0.1], [0, dado + (wallH - dado) / 2, -0.05], s.material(highC, { roughness: 0.95 }));
    s.box([wallW, 0.022, 0.004], [0, dado, 0.002], s.material(new THREE.Color(lowC).multiplyScalar(0.55)));
    s.box([wallW, 0.08, 0.014], [0, 0.04, 0.007], s.material('#4a4640'));
    s.box([wallW, 0.05, 0.8], [0, -0.025, 0.3], s.material('#a9a498', { roughness: 0.9 }));

    // Pose it.
    const holder = new THREE.Group();
    s.root.add(holder);
    holder.add(sled);
    const sx = a.state === 'outgrown' ? 0.12 : 0;
    if (a.pose === 'leaning' || hung) {
      holder.rotation.y = Math.PI + (hung ? 0 : (random() - 0.5) * 0.12);
      sled.rotation.x = -Math.PI / 2 + (hung ? 0.03 : 0.2 + random() * 0.1);
      sled.rotation.z = hung ? (random() - 0.5) * 0.12 : 0;
    } else if (a.pose === 'standing') {
      holder.rotation.y = 0.75 + random() * 0.6;
    } else {
      holder.rotation.set(0, 0.5 + random() * 0.9, 0);
      sled.rotation.z = Math.PI / 2 - 0.06;
    }
    holder.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(holder);
    const lift = hung ? 0.36 : 0;
    holder.position.y += lift - box.min.y;
    holder.position.x += sx - (box.min.x + box.max.x) / 2;
    holder.position.z += a.pose === 'leaning' || hung ? 0.004 - box.min.z : 0.38 - (box.min.z + box.max.z) / 2;
    holder.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(holder);
    const world = (p: V3) => sled.localToWorld(new THREE.Vector3(...p));
    const A = world(attach[0]), B = world(attach[1]), M = A.clone().add(B).multiplyScalar(0.5);
    const arr = (v: THREE.Vector3): V3 => [v.x, v.y, v.z];

    // Rope, hanging under gravity in the world frame.
    const frayed = a.state === 'broken';
    const rr = a.rope === 'strap' ? 0.007 : 0.005;
    if (hung) {
      const nail: V3 = [M.x + (random() - 0.5) * 0.04, Math.min(wallH - 0.08, box.max.y + 0.16), 0.03];
      s.rod([nail[0], nail[1], 0], [nail[0], nail[1] + 0.012, 0.045], 0.004, s.material('#3a3a3a', { metalness: 0.7 }));
      if (a.rope !== 'none') { s.rod(arr(A), nail, rr, ropeMat); s.rod(arr(B), nail, rr, ropeMat); }
      else for (const P of [A, B]) s.rod([P.x, P.y + 0.03, 0], [P.x, P.y + 0.035, 0.05], 0.005, s.material('#3a3a3a', { metalness: 0.7 }));
    } else if (a.rope === 'trailing') {
      const out = a.pose === 'leaning' ? 0.3 : 0.2;
      const end: V3 = [M.x + (random() - 0.5) * 0.3, 0.008, Math.min(0.66, Math.max(M.z, box.max.z) + out)];
      const ptsA: V3[] = [arr(A), [A.x + (end[0] - A.x) * 0.2 - 0.05, Math.max(0.01, A.y * 0.25), A.z + (end[2] - A.z) * 0.45], [A.x + (end[0] - A.x) * 0.6 - 0.08, 0.008, A.z + (end[2] - A.z) * 0.8], end];
      const ptsB: V3[] = [arr(B), [B.x + (end[0] - B.x) * 0.2 + 0.05, Math.max(0.01, B.y * 0.25), B.z + (end[2] - B.z) * 0.45], [B.x + (end[0] - B.x) * 0.6 + 0.08, 0.008, B.z + (end[2] - B.z) * 0.8], end];
      s.tube(ptsA, rr, ropeMat);
      if (!frayed) s.tube(ptsB, rr, ropeMat);
    } else if (a.rope === 'toggle' || a.rope === 'strap') {
      const drop = Math.min(0.35, Math.max(0.05, M.y - 0.03));
      const bottom: V3 = [M.x, M.y - drop, M.z + 0.03];
      s.tube([arr(A), [mix(A.x, bottom[0], 0.3), mix(A.y, bottom[1], 0.75), bottom[2]], [bottom[0] - 0.045, bottom[1], bottom[2]]], rr, ropeMat);
      if (!frayed) s.tube([arr(B), [mix(B.x, bottom[0], 0.3), mix(B.y, bottom[1], 0.75), bottom[2]], [bottom[0] + 0.045, bottom[1], bottom[2]]], rr, ropeMat);
      if (a.rope === 'toggle') s.cylinder(0.012, 0.012, 0.11, bottom, s.material('#b98248', { roughness: 0.6 }), 10).rotation.z = Math.PI / 2 + (frayed ? 0.9 : 0);
      else s.box([0.03, 0.03, 0.006], bottom, s.material('#c9a24a', { metalness: 0.8, roughness: 0.3 }));
    }
    if (a.extra === 'mittens') {
      const wool = s.material(pick(['#c8332b', '#2f5d9a', '#e0a020', '#3f7d5a']), { roughness: 1 });
      const P = A.x < B.x ? A : B;
      [0.16, 0.24].forEach((len, i) => {
        const end: V3 = [P.x - 0.02 + i * 0.05, Math.max(0.05, P.y - len), P.z + 0.03 + i * 0.015];
        s.rod(arr(P), end, 0.002, s.material('#e9e3d0'));
        s.ball([0.03, 0.045, 0.014], [end[0], end[1] - 0.035, end[2]], wool, 10);
        s.ball([0.012, 0.022, 0.01], [end[0] + (i ? 0.03 : -0.03), end[1] - 0.03, end[2]], wool, 8).rotation.z = i ? -0.6 : 0.6;
        s.box([0.05, 0.02, 0.022], [end[0], end[1] - 0.002, end[2]], s.material('#e9e3d0', { roughness: 1 }));
      });
    }
    if (splinter) { splinter.position.set(box.min.x - 0.05 + random() * 0.1, 0.008, Math.min(0.62, box.max.z + 0.08)); splinter.rotation.y = 1 + random(); s.root.add(splinter); }

    // Stored-on clutter for an outgrown sled.
    if (a.state === 'outgrown') {
      const skiMat = s.material(pick(['#b8261f', '#2f4f8a', '#d9b23a', '#3a3a3a']), { roughness: 0.4 });
      for (let k = 0; k < 2; k++) {
        const x = -wallW / 2 + 0.13 + k * 0.1, lean = 0.1 + k * 0.03;
        const ski = s.box([0.07, 1.3, 0.012], [x, 0.65 * Math.cos(lean), 0.01 + 0.65 * Math.sin(lean) + 0.012], skiMat);
        ski.rotation.x = -lean;
        s.box([0.07, 0.09, 0.012], [x, 1.3 * Math.cos(lean) + 0.035, 0.04], skiMat).rotation.x = 0.45;
        s.box([0.06, 0.03, 0.05], [x, 0.6, 0.05 + 0.6 * Math.sin(lean)], s.material('#2a2a2a'));
      }
      const px = -wallW / 2 + 0.3;
      s.rod([px, 0, 0.16], [px - 0.02, 1.05, 0.012], 0.006, s.material('#c3c7c8', { metalness: 0.6 }));
      s.cylinder(0.035, 0.035, 0.004, [px, 0.08, 0.15], s.material('#2a2a2a'), 12);
      const bx = box.max.x + 0.2 > wallW / 2 - 0.16 ? wallW / 2 - 0.19 : box.max.x + 0.2;
      const carton = s.box([0.3, 0.24, 0.26], [bx, 0.12, 0.45], s.material('#b58a5a', { roughness: 0.95 }));
      carton.rotation.y = (random() - 0.5) * 0.5;
      s.box([0.31, 0.004, 0.05], [bx, 0.242, 0.45], s.material('#d9cf9a')).rotation.y = carton.rotation.y;
      for (let k = 0; k < 2; k++) { s.cylinder(0.04, 0.04, 0.1, [bx - 0.06 + k * 0.1, 0.295, 0.43 + k * 0.03], s.material(pick(['#a03a2a', '#c9a23a', '#5a7a3a']), { roughness: 0.15 }), 14); s.cylinder(0.042, 0.042, 0.012, [bx - 0.06 + k * 0.1, 0.35, 0.43 + k * 0.03], s.material('#c9a24a', { metalness: 0.7, roughness: 0.4 }), 14); }
    }
    if (a.state === 'dusty') {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
      const g = canvas.getContext('2d')!;
      g.strokeStyle = 'rgba(240,240,235,0.9)'; g.lineWidth = 1.3;
      for (let k = 0; k < 7; k++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos((k / 6) * 1.571) * 128, Math.sin((k / 6) * 1.571) * 128); g.stroke(); }
      for (let r = 16; r < 128; r += 14 + random() * 6) { g.beginPath(); for (let k = 0; k < 7; k++) { const ang = (k / 6) * 1.571, q = r * (0.93 + random() * 0.1); if (k === 0) g.moveTo(Math.cos(ang) * q, Math.sin(ang) * q); else g.lineTo(Math.cos(ang) * q, Math.sin(ang) * q); } g.stroke(); }
      const web = s.mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }), [box.max.x + 0.05, Math.max(0.2, box.max.y - 0.2), 0.09]);
      web.rotation.set(0, -0.9, Math.PI); web.castShadow = false;
    }

    // Meltwater.
    const drops: { mesh: THREE.Mesh; from: number; phase: number }[] = [];
    if (a.state === 'dripping') {
      const water = new THREE.MeshStandardMaterial({ color: '#55676f', roughness: 0.06, metalness: 0.3, transparent: true, opacity: 0.55, depthWrite: false });
      const cx = (box.min.x + box.max.x) / 2, cz = Math.min(0.6, (box.min.z + box.max.z) / 2 + 0.05);
      for (let k = 0; k < 3; k++) { const pool = s.cylinder(0.1 + random() * 0.07, 0.1, 0.002, [cx + (random() - 0.5) * 0.2, 0.002 + k * 0.0004, Math.min(0.56, cz + random() * 0.14)], water, 22); pool.scale.z = 0.55 + random() * 0.4; pool.castShadow = false; }
      const high = Math.max(0.12, box.max.y * 0.55);
      for (let k = 0; k < 4; k++) { const mesh = s.ball([0.007, 0.01, 0.007], [mix(box.min.x, box.max.x, 0.15 + random() * 0.7), high, Math.min(0.7, mix(box.min.z, box.max.z, 0.3 + random() * 0.6))], water, 8); mesh.castShadow = false; drops.push({ mesh, from: high * (0.5 + random() * 0.5), phase: random() }); }
    }

    const rate = mix(0.3, 1.1, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const d of drops) { const p = (time * rate + d.phase) % 1, fall = Math.min(1, p * 2.3); d.mesh.position.y = mix(d.from, 0.006, fall * fall); d.mesh.visible = p < 0.44; }
      },
    });
  },
});
