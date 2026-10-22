import * as THREE from 'three';
import { type Placeable, choice, clamp01, defineWorld, disposeTree, mix } from '@conjure/kit';

type P = [number, number, number];

// Standing places: x, z, ground height, tallest and widest a thing may be. The hero is on the top landing.
const SLOTS = [
  { x: 0.9, z: -3.4, y: 3, h: 3.6, r: 1.7 },
  { x: -3.7, z: 5.6, y: 0, h: 2.7, r: 1.3 },
  { x: 3.9, z: 5.5, y: 0, h: 2.7, r: 1.3 },
  { x: -4.2, z: 2.0, y: 1.5, h: 2.4, r: 1.2 },
  { x: 4.1, z: 2.1, y: 1.5, h: 2.4, r: 1.2 },
  { x: -4.5, z: -2.3, y: 3, h: 2.4, r: 1.2 },
  { x: 4.5, z: -2.0, y: 3, h: 2.4, r: 1.2 },
] as const;
const HALF = 7, BACK = -9.5, FRONT = 8, STAIR = 1.9, FOOT = 3.5, HEAD = -1.5, LEDGE = 0.6;
const YAW = THREE.MathUtils.degToRad(21), PITCH = THREE.MathUtils.degToRad(25);

/** Height of the walking surface anywhere on the stage. */
const groundAt = (x: number, z: number) => {
  if (z > FOOT) return 0;
  if (Math.abs(x) < STAIR) return z > HEAD ? (FOOT - z) / (FOOT - HEAD) * 3 : 3;
  return z > LEDGE ? 1.5 : 3;
};

export default defineWorld({
  questions: {
    state: choice('What season and state is the approach in?', {
      festival: 'A festival evening: swept steps, strings of paper lanterns up both sides, banners out.',
      tended: 'An ordinary green summer day, moss thick and bright, everything quietly kept.',
      autumn: 'Late autumn: the steps and terraces drifted with red and yellow leaves.',
      snow: 'Deep midwinter snow lying on every step, roof and bough, unmarked.',
      forgotten: 'Forgotten for decades: steps heaved and overgrown, a fallen trunk, ferns everywhere.',
    }),
    air: choice('What is the air and light like?', {
      mist: 'Morning mist hanging between the trunks, everything pale and soft.',
      shafts: 'Clear air with long shafts of sun slanting through the canopy.',
      bluehour: 'The blue hour after sunset, the wood dim and anything lit glowing.',
      rain: 'Steady rain, wet dark stone, dripping boughs.',
    }),
    steps: choice('What are the steps made of?', {
      granite: 'Long cut granite treads, worn hollow in the middle.',
      fieldstone: 'Rough fieldstones of every size fitted together, uneven and old.',
      logs: 'Packed earth steps held by cedar logs, a mountain path.',
    }),
    shrine: choice('What stands at the top?', {
      hall: 'A small unpainted cedar hall with a bark roof and crossed finials on the ridge.',
      vermilion: 'A vermilion and white hall under a green copper roof.',
      hokora: 'Only a tiny wooden shrine box on a stone base, knee-high doors shut.',
      stone: 'A small shrine carved entirely of stone.',
      ruin: 'A collapsed hall: the roof down on its base, posts leaning.',
    }),
    gate: choice('What gate marks the foot of the steps?', {
      stone: 'A grey stone torii.',
      vermilion: 'A vermilion torii with a black cap.',
      wood: 'A plain weathered log torii.',
      none: 'No gate; the steps simply begin.',
    }),
    lining: choice('What lines the way up?', {
      lanterns: 'Stone lanterns on both sides.',
      banners: 'Tall narrow red banners on bamboo poles, donors\' names in white.',
      jizo: 'Rows of small stone figures in red bibs.',
      rail: 'A rope handrail on wooden posts.',
      nothing: 'Nothing; only moss and roots.',
    }),
    trace: choice('What did the last visitor leave behind?', {
      nothing: 'No sign of anyone.',
      umbrella: 'A red paper umbrella leaning at the foot of the steps.',
      broom: 'A bamboo broom and a heap of swept leaves: the caretaker is somewhere near.',
      sandals: 'A pair of wooden sandals left neatly at the top step.',
      flowers: 'Fresh flowers and a cup laid on the bottom step.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const ground = new THREE.Group();
    root.add(ground);
    const snowy = a.state === 'snow', wet = a.air === 'rain', dim = a.air === 'bluehour';
    const forgotten = a.state === 'forgotten';

    const sky = new THREE.Color({ mist: '#d6ddd5', shafts: '#dfe4cf', bluehour: '#8d9ab3', rain: '#b9c1c2' }[a.air]);
    if (snowy && !dim) sky.lerp(new THREE.Color('#e6eaee'), 0.6);
    if (!dim) sky.lerp(new THREE.Color().setHSL(mix(0.6, 0.08, mood.warmth), 0.4, 0.8), Math.abs(mood.daylight - 0.5) * 0.5);
    const background = sky.clone();

    // Light.
    root.add(new THREE.HemisphereLight(dim ? '#aab6e8' : '#f4f6ff', dim ? '#3d4458' : '#6f7462', dim ? 0.95 : a.air === 'shafts' ? 1.15 : 1.45));
    const key = new THREE.DirectionalLight(dim ? new THREE.Color('#9fb0e6') : new THREE.Color().setHSL(mix(0.6, 0.09, mood.warmth), 0.45, 0.86), dim ? 0.85 : a.air === 'shafts' ? 3.1 : a.air === 'mist' ? 1.7 : 1.9);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.05;
    key.shadow.bias = -0.0004;
    root.add(key, key.target);

    const mat = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.92, ...options });
    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: P = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const box = (parent: THREE.Object3D, size: P, at: P, material: THREE.Material) => put(parent, new THREE.BoxGeometry(...size), material, at);
    const rod = (parent: THREE.Object3D, from: P, to: P, radius: number, material: THREE.Material) => {
      const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to), d = q.clone().sub(p);
      const mesh = put(parent, new THREE.CylinderGeometry(radius, radius, d.length(), 8), material, p.add(q).multiplyScalar(0.5).toArray() as P);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return mesh;
    };
    const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, list: { at: P; scale?: P; rot?: P; color?: THREE.Color }[], shadow = true) => {
      const mesh = new THREE.InstancedMesh(geometry, material, Math.max(list.length, 1));
      mesh.count = list.length;
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      list.forEach((item, i) => {
        m.compose(new THREE.Vector3(...item.at), q.setFromEuler(e.set(...(item.rot ?? [0, 0, 0]))), new THREE.Vector3(...(item.scale ?? [1, 1, 1])));
        mesh.setMatrixAt(i, m);
        if (item.color) mesh.setColorAt(i, item.color);
      });
      mesh.castShadow = shadow;
      mesh.receiveShadow = true;
      root.add(mesh);
      return mesh;
    };

    // Palette.
    const mossGreen = new THREE.Color().setHSL(mix(0.3, 0.24, mood.warmth), mix(0.4, 0.6, mood.cheer), mix(0.17, 0.24, mood.cheer));
    const topColour = new THREE.Color({ festival: '#8d8f6e', tended: '#6f8a4b', autumn: '#857648', snow: '#eef1f4', forgotten: '#566d3c' }[a.state]);
    if (a.state === 'tended' || forgotten) topColour.lerp(mossGreen, 0.5);
    const stoneColour = new THREE.Color('#a9a89c').lerp(new THREE.Color('#7f866f'), mood.wear * 0.4 + (forgotten ? 0.3 : 0));
    if (wet) { stoneColour.multiplyScalar(0.72); topColour.multiplyScalar(0.82); }
    const stone = mat(stoneColour, { roughness: wet ? 0.35 : 0.95 });
    const top = mat(topColour, { roughness: wet ? 0.5 : 1 });
    const earth = mat(new THREE.Color('#5d5142').lerp(sky, 0.1), { roughness: 1 });
    const snow = mat('#f1f4f7', { roughness: 0.85 });
    const cedarWood = mat(new THREE.Color('#7b563a').lerp(new THREE.Color('#8b867b'), mood.wear * 0.5 + (forgotten ? 0.3 : 0)), { roughness: 0.85 });
    const vermilion = mat(new THREE.Color('#d8431f').lerp(new THREE.Color('#bf8f7d'), mood.wear * 0.4), { roughness: 0.55 });
    const black = mat('#1c1b1d', { roughness: 0.5 });
    const dusk = dim ? 1 : Math.max(0, Math.abs(mood.daylight - 0.5) * 2 - 0.55) * 2;
    const lit = !forgotten && (dim || a.state === 'festival' || dusk > 0.2);
    const glowColour = new THREE.Color().setHSL(mix(0.12, 0.06, mood.warmth), 1, 0.6);
    const glow = new THREE.MeshStandardMaterial({ color: lit ? '#ffe9b8' : '#cfc8b4', emissive: glowColour, emissiveIntensity: lit ? (dim ? 2.6 : 1.5) : 0, roughness: 0.8 });

    // Dry-stone retaining wall texture.
    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = wallCanvas.height = 256;
    const wctx = wallCanvas.getContext('2d')!;
    wctx.fillStyle = '#4c4a42';
    wctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 5; row++) {
      let x = -random() * 40;
      while (x < 256) {
        const w = 34 + random() * 50, y = row * 51.2;
        const tone = stoneColour.clone().offsetHSL(0, 0, (random() - 0.5) * 0.14);
        wctx.fillStyle = `#${tone.getHexString()}`;
        wctx.beginPath();
        wctx.roundRect(x + 2, y + 2, w - 4, 47, 9);
        wctx.fill();
        if (!snowy && random() < 0.5 + mood.wear * 0.4) { wctx.fillStyle = `rgba(${Math.round(mossGreen.r * 255)},${Math.round(mossGreen.g * 255)},${Math.round(mossGreen.b * 255)},0.75)`; wctx.beginPath(); wctx.ellipse(x + w * random(), y + 6 + random() * 40, 6 + random() * 14, 4 + random() * 7, 0, 0, 7); wctx.fill(); }
        x += w;
      }
    }
    const wallMap = new THREE.CanvasTexture(wallCanvas);
    wallMap.colorSpace = THREE.SRGBColorSpace;
    wallMap.wrapS = wallMap.wrapT = THREE.RepeatWrapping;
    const wallMaterial = new THREE.MeshStandardMaterial({ map: wallMap, roughness: wet ? 0.45 : 0.95 });
    const wall = (width: number, height: number, at: P, turn: number) => {
      const geometry = new THREE.PlaneGeometry(width, height);
      const uv = geometry.attributes.uv;
      const shift = random();
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * width / 3 + shift, uv.getY(i) * height / 2.4);
      const mesh = put(root, geometry, wallMaterial, at);
      mesh.rotation.y = turn;
      return mesh;
    };

    // Terraces: earth blocks with a walking surface on top and stone faces where they show.
    const terrace = (x0: number, x1: number, z0: number, z1: number, height: number) => {
      box(root, [x1 - x0, height + 0.6, z1 - z0], [(x0 + x1) / 2, height / 2 - 0.3, (z0 + z1) / 2], earth);
      box(ground, [x1 - x0, 0.06, z1 - z0], [(x0 + x1) / 2, height + 0.03, (z0 + z1) / 2], top);
    };
    terrace(-HALF, HALF, FOOT, FRONT, 0);
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? -HALF : STAIR, x1 = side < 0 ? -STAIR : HALF;
      terrace(x0, x1, LEDGE, FOOT, 1.5);
      terrace(x0, x1, BACK, LEDGE, 3);
      wall(x1 - x0, 1.5, [(x0 + x1) / 2, 0.75, FOOT + 0.005], 0);
      wall(x1 - x0, 1.5, [(x0 + x1) / 2, 2.25, LEDGE + 0.005], 0);
      // Faces along the stair cutting.
      wall(FOOT - LEDGE, 1.5, [side * (STAIR - 0.005), 0.75, (FOOT + LEDGE) / 2], side < 0 ? Math.PI / 2 : -Math.PI / 2);
      wall(LEDGE - HEAD, 3, [side * (STAIR - 0.005), 1.5, (LEDGE + HEAD) / 2], side < 0 ? Math.PI / 2 : -Math.PI / 2);
    }
    terrace(-STAIR, STAIR, BACK, HEAD, 3);
    // Bare cut faces of the stage on the camera side.
    wall(BACK * -1 + LEDGE, 3, [HALF + 0.004, 1.5, (BACK + LEDGE) / 2], Math.PI / 2);

    // The steps.
    const STEPS = 15, rise = 3 / STEPS, run = (FOOT - HEAD) / STEPS, width = STAIR * 2 - 0.5;
    const heave = (forgotten ? 0.06 : 0.012) + mood.wear * 0.03;
    const stepMaterial = a.steps === 'logs' ? mat(new THREE.Color('#7a684d').multiplyScalar(wet ? 0.75 : 1), { roughness: 1 }) : stone;
    const logMaterial = mat(new THREE.Color('#6a4a33').multiplyScalar(wet ? 0.75 : 1), { roughness: 0.9 });
    const mossBits: { at: P; scale: P; color: THREE.Color }[] = [];
    const snowCaps: { at: P; scale: P; rot?: P }[] = [];
    for (let i = 0; i < STEPS; i++) {
      const y = (i + 1) * rise, z = FOOT - (i + 0.5) * run;
      if (a.steps === 'fieldstone') {
        let x = -width / 2;
        while (x < width / 2 - 0.05) {
          const w = Math.min(width / 2 - x, 0.5 + random() * 0.9);
          const tread = box(ground, [w - 0.03, y + 0.3, run + 0.02], [x + w / 2, y / 2 - 0.15 + (random() - 0.5) * heave, z], stone);
          tread.rotation.z = (random() - 0.5) * heave;
          x += w;
        }
      } else {
        const tread = box(ground, [width, y + 0.3, run + 0.02], [(random() - 0.5) * heave, y / 2 - 0.15, z], stepMaterial);
        tread.rotation.z = (random() - 0.5) * heave * 0.8;
        tread.rotation.y = (random() - 0.5) * heave * 0.5;
        if (a.steps === 'logs') rod(ground, [-width / 2 - 0.1, y - 0.07, z + run / 2], [width / 2 + 0.1, y - 0.07, z + run / 2], 0.085, logMaterial);
      }
      if (snowy) snowCaps.push({ at: [0, y + 0.05, z], scale: [width + 0.1, 0.11, run * 0.96] });
      else {
        // Moss gathers at the back of each tread and thick toward the edges.
        const n = Math.round(mix(5, 12, mood.wear) * (forgotten ? 1.8 : a.state === 'festival' ? 0.5 : 1));
        for (let k = 0; k < n; k++) {
          const edge = random() < 0.7 ? (random() < 0.5 ? -1 : 1) * (width / 2 - random() * random() * 1.0) : (random() - 0.5) * width;
          mossBits.push({ at: [edge, y + 0.01, z - run * (0.2 + random() * 0.28)], scale: [0.14 + random() * 0.2, 0.03 + random() * 0.03, 0.07 + random() * 0.08], color: mossGreen.clone().offsetHSL((random() - 0.5) * 0.04, 0, (random() - 0.5) * 0.08) });
        }
      }
    }
    // Sloping stone curbs either side of the flight.
    const slope = Math.atan2(3, FOOT - HEAD), flight = Math.hypot(3, FOOT - HEAD);
    for (const side of [-1, 1]) {
      const curb = box(root, [0.3, 0.34, flight + 0.5], [side * (STAIR - 0.17), 1.5 + 0.2, (FOOT + HEAD) / 2], stone);
      curb.rotation.x = slope;
      if (snowy) snowCaps.push({ at: [side * (STAIR - 0.17), 1.5 + 0.41, (FOOT + HEAD) / 2], scale: [0.32, 0.1, flight + 0.5], rot: [slope, 0, 0] });
    }
    // Paved path across the forecourt and the top landing.
    const paving: { at: P; scale: P; rot: P; color: THREE.Color }[] = [];
    const pave = (z0: number, z1: number, y: number) => {
      for (let z = z0; z < z1 - 0.2; z += 0.62) for (const x of [-0.62, 0, 0.62]) {
        if (forgotten && random() < 0.25) continue;
        paving.push({ at: [x + (random() - 0.5) * 0.05, y + 0.045 + (random() - 0.5) * heave, z + 0.3 + (x === 0 ? 0.3 : 0)], scale: [0.58, 0.06, 0.58], rot: [(random() - 0.5) * heave, (random() - 0.5) * heave * 2, 0], color: stoneColour.clone().offsetHSL(0, 0, (random() - 0.5) * 0.1) });
      }
    };
    pave(FOOT + 0.05, FRONT, 0);
    pave(-5.2, HEAD - 0.1, 3);
    if (!snowy) ground.add(instanced(new THREE.BoxGeometry(1, 1, 1), mat('#ffffff', { roughness: wet ? 0.35 : 0.95 }), paving, false));
    else { snowCaps.push({ at: [0, 0.07, (FOOT + FRONT) / 2], scale: [1.7, 0.05, FRONT - FOOT - 0.3] }); }

    // Where the cast and the shrine stand, as seen from the camera: trees must not stand in front of them.
    const screenX = (x: number, z: number) => x * Math.cos(YAW) - z * Math.sin(YAW);
    const depth = (x: number, z: number) => x * Math.sin(YAW) + z * Math.cos(YAW);
    const shrineAt: P = [-1.3, 3, -6.7];
    const keepClear = [
      ...SLOTS.map((slot) => ({ x: slot.x, z: slot.z, r: slot.r + 0.2 })),
      { x: 0, z: 3, r: 2.3 }, { x: 0, z: 0.5, r: 2.3 }, { x: 0, z: -2, r: 2.2 }, { x: 0, z: 5.5, r: 2 },
      { x: shrineAt[0], z: shrineAt[2], r: 2.7 },
    ];

    // Giant cedars. Colour fades toward the sky with distance instead of using fog.
    const barkCanvas = document.createElement('canvas');
    barkCanvas.width = 128; barkCanvas.height = 256;
    const bctx = barkCanvas.getContext('2d')!;
    bctx.fillStyle = '#ffffff';
    bctx.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 200; i++) { bctx.fillStyle = random() < 0.6 ? 'rgba(40,25,15,0.3)' : 'rgba(0,0,0,0.12)'; bctx.fillRect(random() * 128, random() * 256 - 60, 1 + random() * 3, 40 + random() * 160); }
    const barkMap = new THREE.CanvasTexture(barkCanvas);
    barkMap.colorSpace = THREE.SRGBColorSpace;
    barkMap.wrapS = barkMap.wrapT = THREE.RepeatWrapping;
    barkMap.repeat.set(3, 4);
    const needle = new THREE.Color().setHSL(mix(0.42, 0.33, mood.warmth), mix(0.3, 0.5, mood.cheer), dim ? 0.13 : 0.17);
    const boughs: { at: P; scale: P; rot: P; color: THREE.Color }[] = [];
    const boughSnow: { at: P; scale: P; rot: P }[] = [];
    const trees: { x: number; z: number; r: number }[] = [];
    const wanted = Math.round(mix(9, 17, mood.density));
    const tree = (x: number, z: number, r: number) => {
      const y = groundAt(x, z), far = clamp01((-depth(x, z) - 1) / 13) * (a.air === 'mist' ? 0.72 : a.air === 'rain' ? 0.6 : 0.42);
      const height = 17 + random() * 6;
      const profile = [[r * 1.7, -0.3], [r * 1.3, 0.3], [r * 1.08, 1.1], [r, 2.5], [r * 0.82, height * 0.5], [r * 0.4, height]].map(([px, py]) => new THREE.Vector2(px, py));
      const geometry = new THREE.LatheGeometry(profile, 12);
      const at = geometry.attributes.position, phase = random() * 6;
      for (let i = 0; i < at.count; i++) { const k = 1 + Math.cos(Math.atan2(at.getX(i), at.getZ(i)) * 5 + phase) * 0.09 * Math.max(0.3, 1 - at.getY(i) / 3); at.setX(i, at.getX(i) * k); at.setZ(i, at.getZ(i) * k); }
      geometry.computeVertexNormals();
      const trunkColour = new THREE.Color('#8a5c40').offsetHSL((random() - 0.5) * 0.02, 0, (random() - 0.5) * 0.06).multiplyScalar(wet ? 0.75 : 1).lerp(sky, far);
      const trunk = put(root, geometry, new THREE.MeshStandardMaterial({ map: barkMap, color: trunkColour, roughness: 1 }), [x, y, z]);
      trunk.rotation.z = (random() - 0.5) * 0.03;
      const tint = needle.clone().lerp(sky, far);
      const count = 9;
      for (let i = 0; i < count; i++) {
        const by = (depth(x, z) > 1 ? 12 : 8.2) + i * 1.2 + random() * 0.6, angle = random() * Math.PI * 2, reach = mix(2.7, 1.3, i / count) * (0.8 + random() * 0.4);
        const bx = x + Math.sin(angle) * reach * 0.5, bz = z + Math.cos(angle) * reach * 0.5;
        const rot: P = [0.25 * Math.cos(angle), angle, -0.25 * Math.sin(angle)];
        boughs.push({ at: [bx, y + by, bz], scale: [reach, 1.0 + random() * 0.5, reach * 0.7], rot, color: tint.clone().offsetHSL(0, 0, (random() - 0.5) * 0.04) });
        if (snowy) boughSnow.push({ at: [bx, y + by + 0.3, bz], scale: [reach * 0.7, 0.55, reach * 0.5], rot });
      }
      trees.push({ x, z, r });
      // Root swell and moss skirt.
      if (!snowy) for (let i = 0; i < 4; i++) { const g = random() * 6.28; mossBits.push({ at: [x + Math.sin(g) * r * 1.5, y + 0.06, z + Math.cos(g) * r * 1.5], scale: [0.4 + random() * 0.4, 0.1, 0.3 + random() * 0.3], color: mossGreen.clone().offsetHSL(0, 0, (random() - 0.5) * 0.08) }); }
    };
    for (let attempt = 0; attempt < 500 && trees.length < wanted; attempt++) {
      const x = (random() * 2 - 1) * (HALF - 0.7), z = mix(BACK + 0.7, FRONT - 0.8, random()), r = 0.42 + random() * 0.42;
      if (Math.abs(x) < STAIR + r + 0.6 && z > HEAD - 0.5) continue;
      if (Math.abs(z - FOOT) < r * 2 + 0.3 || (Math.abs(z - LEDGE) < r * 2 + 0.3 && Math.abs(x) > STAIR)) continue;
      if (trees.some((other) => Math.hypot(other.x - x, other.z - z) < 2.3)) continue;
      const sx = screenX(x, z), d = depth(x, z);
      if (keepClear.some((spot) => Math.hypot(spot.x - x, spot.z - z) < spot.r + r || (Math.abs(screenX(spot.x, spot.z) - sx) < spot.r + r * 1.3 && d > depth(spot.x, spot.z) - 0.3))) continue;
      tree(x, z, r);
    }
    const boughGeometry = new THREE.ConeGeometry(1, 1, 7);
    instanced(boughGeometry, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), boughs);
    if (snowy) instanced(boughGeometry, snow, boughSnow);

    // Gate at the foot of the steps.
    if (a.gate !== 'none') {
      const material = a.gate === 'stone' ? stone : a.gate === 'vermilion' ? vermilion : cedarWood;
      const gz = FOOT + 0.9, half = 2.05, h = 4.3;
      for (const side of [-1, 1]) {
        const post = put(root, new THREE.CylinderGeometry(0.17, 0.2, h, 14), material, [side * half, h / 2, gz]);
        post.rotation.z = side * 0.03;
        put(root, new THREE.CylinderGeometry(0.27, 0.3, 0.45, 14), a.gate === 'vermilion' ? black : stone, [side * (half + 0.06), 0.22, gz]);
      }
      box(root, [half * 2 + 0.9, 0.24, 0.17], [0, h - 0.8, gz], material);
      box(root, [0.24, 0.5, 0.14], [0, h - 0.42, gz], material);
      const beam = (halfWidth: number, lift: number, thick: number, deep: number, y: number, m: THREE.Material) => {
        const shape = new THREE.Shape();
        shape.moveTo(-halfWidth, lift); shape.quadraticCurveTo(0, -lift * 0.4, halfWidth, lift);
        shape.lineTo(halfWidth + thick * 0.4, lift + thick); shape.quadraticCurveTo(0, thick - lift * 0.4, -halfWidth - thick * 0.4, lift + thick);
        shape.closePath();
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: deep, bevelEnabled: false, curveSegments: 10 });
        geometry.translate(0, 0, -deep / 2);
        return put(root, geometry, m, [0, y, gz]);
      };
      beam(half + 0.55, a.gate === 'wood' ? 0 : 0.2, 0.27, 0.3, h - 0.08, material);
      if (a.gate !== 'wood') beam(half + 0.7, 0.23, 0.13, 0.4, h + 0.19, a.gate === 'vermilion' ? black : material);
      if (snowy) snowCaps.push({ at: [0, h + (a.gate === 'wood' ? 0.25 : 0.42), gz], scale: [half * 2 + 1.2, 0.12, 0.4] });
    }

    // The shrine on the top terrace.
    const shrine = new THREE.Group();
    shrine.position.set(...shrineAt);
    root.add(shrine);
    const roofTone = a.shrine === 'vermilion' ? new THREE.Color('#7fae9a') : new THREE.Color('#40332a');
    const roofing = snowy ? snow : mat(roofTone.lerp(mossGreen, a.shrine === 'vermilion' ? 0 : mood.wear * 0.35 + (forgotten ? 0.3 : 0)), { roughness: 0.95 });
    const roof = (parent: THREE.Object3D, w: number, d: number, lift: number, y: number, finials: boolean, z = 0) => {
      const front = d * 0.62, back = d * 0.38;
      const shape = new THREE.Shape();
      shape.moveTo(-back, 0.08); shape.quadraticCurveTo(-back * 0.4, lift * 0.5, 0, lift); shape.quadraticCurveTo(front * 0.4, lift * 0.42, front, -0.05);
      shape.lineTo(front, 0.1); shape.quadraticCurveTo(front * 0.4, lift * 0.42 + 0.16, 0, lift + 0.18); shape.quadraticCurveTo(-back * 0.4, lift * 0.5 + 0.16, -back, 0.22);
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false, curveSegments: 8 });
      geometry.translate(0, 0, -w / 2);
      geometry.rotateY(-Math.PI / 2);
      const mesh = put(parent, geometry, roofing, [0, y, z]);
      const ridgeWood = a.shrine === 'vermilion' ? vermilion : cedarWood;
      box(parent, [w + 0.1, 0.14, 0.2], [0, y + lift + 0.2, z], ridgeWood);
      if (finials) {
        for (const side of [-1, 1]) for (const tilt of [-1, 1]) {
          const arm = box(parent, [0.07, 1.1 * (w / 4.4), 0.09], [side * (w / 2 - 0.12), y + lift + 0.52, z + tilt * 0.12], ridgeWood);
          arm.rotation.x = tilt * -0.55;
        }
        const logs = Math.max(2, Math.round(w / 1.3));
        for (let i = 0; i < logs; i++) put(parent, new THREE.CylinderGeometry(0.075, 0.075, 0.5, 8), ridgeWood, [(i - (logs - 1) / 2) * (w * 0.6 / Math.max(logs - 1, 1)), y + lift + 0.33, z]).rotation.x = Math.PI / 2;
      }
      return mesh;
    };
    if (a.shrine === 'hall' || a.shrine === 'vermilion' || a.shrine === 'ruin') {
      const wood = a.shrine === 'vermilion' ? vermilion : cedarWood;
      const panel = mat(a.shrine === 'vermilion' ? '#efe9da' : '#5a4130', { roughness: 0.9 });
      box(shrine, [4.0, 0.5, 3.4], [0, 0.25, 0], stone);
      for (let i = 0; i < 3; i++) box(shrine, [1.8, 0.5 - i * 0.165, 0.3], [0, (0.5 - i * 0.165) / 2, 1.85 + i * 0.3], stone);
      if (a.shrine === 'ruin') {
        for (const [x, z, lean] of [[-1.3, -0.9, 0.3], [1.3, -0.9, -0.12], [-1.3, 0.9, 0.5]] as P[]) { const post = box(shrine, [0.16, 2.0, 0.16], [x, 1.4, z], wood); post.rotation.z = lean; post.rotation.x = lean * 0.5; }
        const fallen = new THREE.Group();
        roof(fallen, 4.2, 3.4, 1.0, 0, true);
        fallen.position.set(0.5, 0.75, 0.4);
        fallen.rotation.set(0.16, 0.25, -0.24);
        shrine.add(fallen);
        for (let i = 0; i < 6; i++) { const plank = box(shrine, [1.4 + random(), 0.08, 0.16], [(random() - 0.5) * 3.6, 0.56 + random() * 0.1, 1.2 + random() * 1.6], wood); plank.rotation.y = random() * 3; }
      } else {
        box(shrine, [2.8, 1.9, 2.2], [0, 1.45, -0.3], panel);
        for (const x of [-1.4, 1.4]) for (const z of [-1.4, 0.8, 1.45]) box(shrine, [0.16, z > 1 ? 2.0 : 2.0, 0.16], [x, 1.5, z], wood);
        box(shrine, [3.1, 0.14, 0.14], [0, 2.4, 1.45], wood);
        box(shrine, [3.0, 0.08, 2.5], [0, 0.54, 0.2], wood);
        // Lattice doors with a glow behind them when the lamps are lit.
        const doors = document.createElement('canvas');
        doors.width = doors.height = 128;
        const d = doors.getContext('2d')!;
        d.fillStyle = lit ? '#ffd98a' : '#2a2019'; d.fillRect(0, 0, 128, 128);
        d.strokeStyle = a.shrine === 'vermilion' ? '#b5341b' : '#3a2a1f'; d.lineWidth = 5;
        for (let i = 0; i <= 8; i++) { d.beginPath(); d.moveTo(i * 16, 0); d.lineTo(i * 16, 128); d.moveTo(0, i * 16); d.lineTo(128, i * 16); d.stroke(); }
        d.lineWidth = 9; d.strokeRect(0, 0, 64, 128); d.strokeRect(64, 0, 64, 128);
        const doorMap = new THREE.CanvasTexture(doors);
        doorMap.colorSpace = THREE.SRGBColorSpace;
        put(shrine, new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshStandardMaterial({ map: doorMap, emissive: glowColour, emissiveMap: doorMap, emissiveIntensity: lit ? 0.9 : 0, roughness: 0.85 }), [0, 1.35, 0.805]);
        roof(shrine, 4.6, 4.3, 1.25, 2.45, true, -0.2);
        // Straw rope and streamers across the porch.
        rod(shrine, [-1.4, 2.2, 1.5], [1.4, 2.2, 1.5], 0.06, mat('#d9b862'));
        const paper = mat('#fbfaf5', { side: THREE.DoubleSide, emissive: '#fbfaf5', emissiveIntensity: 0.15 });
        for (const x of [-0.9, -0.3, 0.3, 0.9]) for (let k = 0; k < 3; k++) put(shrine, new THREE.PlaneGeometry(0.14, 0.15), paper, [x + (k % 2 ? 0.04 : -0.04), 2.05 - k * 0.13, 1.56]);
      }
    } else {
      const stoneMade = a.shrine === 'stone';
      const wood = stoneMade ? stone : cedarWood;
      box(shrine, [1.9, 0.35, 1.7], [0, 0.175, 0.6], stone);
      box(shrine, [1.3, 0.75, 1.1], [0, 0.72, 0.6], stone);
      box(shrine, [1.0, 0.9, 0.8], [0, 1.55, 0.6], wood);
      box(shrine, [0.5, 0.6, 0.03], [0, 1.5, 1.01], mat(stoneMade ? '#55544f' : '#3a2a1f'));
      if (!stoneMade) for (const x of [-0.13, 0.13]) put(shrine, new THREE.SphereGeometry(0.025, 8, 6), mat('#d8ad3c', { metalness: 0.8, roughness: 0.3 }), [x, 1.5, 1.03]);
      if (stoneMade) { const cap = put(shrine, new THREE.ConeGeometry(1.0, 0.55, 4), stone, [0, 2.27, 0.6]); cap.rotation.y = Math.PI / 4; cap.scale.z = 0.85; if (snowy) snowCaps.push({ at: [shrineAt[0], shrineAt[1] + 2.5, shrineAt[2] + 0.6], scale: [0.9, 0.2, 0.8] }); }
      else roof(shrine, 1.7, 1.7, 0.5, 2.0, true, 0.5);
      rod(shrine, [-0.5, 1.9, 1.03], [0.5, 1.9, 1.03], 0.035, mat('#d9b862'));
      // A rope strung between two cedars-sized posts frames so small a shrine.
      for (const x of [-1.5, 1.5]) put(shrine, new THREE.CylinderGeometry(0.1, 0.12, 2.6, 8), cedarWood, [x, 1.3, 0.9]);
      rod(shrine, [-1.5, 2.45, 0.9], [1.5, 2.45, 0.9], 0.045, mat('#d9b862'));
    }
    if (forgotten) { shrine.rotation.z = 0.03; shrine.rotation.x = -0.02; }

    // What lines the way: four stations up each side.
    const stations: P[] = [];
    for (const side of [-1, 1]) for (const z of [FOOT + 2.3, FOOT - 0.9, LEDGE - 0.7, HEAD - 2.4]) stations.push([side * (STAIR + 0.55), groundAt(side * (STAIR + 0.55), z), z]);
    const flames: THREE.Material[] = [glow];
    const tilt = () => (random() - 0.5) * (forgotten ? 0.3 : 0.04 + mood.wear * 0.08);
    if (a.lining === 'lanterns') {
      for (const [x, y, z] of stations) {
        const g = new THREE.Group();
        box(g, [0.5, 0.2, 0.5], [0, 0.1, 0], stone);
        put(g, new THREE.CylinderGeometry(0.1, 0.12, 0.85, 10), stone, [0, 0.62, 0]);
        box(g, [0.46, 0.1, 0.46], [0, 1.1, 0], stone);
        box(g, [0.3, 0.3, 0.3], [0, 1.3, 0], stone);
        for (let i = 0; i < 4; i++) { const pane = put(g, new THREE.PlaneGeometry(0.2, 0.2), glow, [Math.sin(i * Math.PI / 2) * 0.152, 1.3, Math.cos(i * Math.PI / 2) * 0.152]); pane.rotation.y = i * Math.PI / 2; pane.castShadow = false; }
        const cap = put(g, new THREE.ConeGeometry(0.46, 0.3, 4), snowy ? snow : stone, [0, 1.6, 0]);
        cap.rotation.y = Math.PI / 4;
        put(g, new THREE.SphereGeometry(0.07, 8, 6), stone, [0, 1.8, 0]);
        g.position.set(x, y, z);
        g.rotation.set(tilt(), random() * 0.2, tilt());
        root.add(g);
      }
    } else if (a.lining === 'banners') {
      const cloth = document.createElement('canvas');
      cloth.width = 64; cloth.height = 256;
      const c = cloth.getContext('2d')!;
      c.fillStyle = `#${new THREE.Color('#cf2f22').lerp(new THREE.Color('#c9a79c'), mood.wear * 0.6).getHexString()}`;
      c.fillRect(0, 0, 64, 256);
      c.strokeStyle = '#f7f2e6'; c.lineWidth = 5; c.lineCap = 'round';
      for (let i = 0; i < 5; i++) for (let k = 0; k < 5; k++) {
        const cy = 34 + i * 46, u = 32 + (random() - 0.5) * 30, v = cy + (random() - 0.5) * 30;
        c.beginPath();
        if (random() < 0.5) { c.moveTo(14, v); c.lineTo(50, v); } else { c.moveTo(u, cy - 16); c.lineTo(u, cy + 16); }
        c.stroke();
      }
      const clothMap = new THREE.CanvasTexture(cloth);
      clothMap.colorSpace = THREE.SRGBColorSpace;
      const flag = new THREE.MeshStandardMaterial({ map: clothMap, roughness: 0.9, side: THREE.DoubleSide });
      const bamboo = mat('#a9a35c', { roughness: 0.6 });
      for (const [x, y, z] of stations) {
        const g = new THREE.Group();
        put(g, new THREE.CylinderGeometry(0.03, 0.04, 3.3, 6), bamboo, [0, 1.65, 0]);
        rod(g, [0, 3.15, 0], [0.55 * -Math.sign(x), 3.15, 0], 0.02, bamboo);
        put(g, new THREE.PlaneGeometry(0.5, 2.3), flag, [0.28 * -Math.sign(x), 1.98, 0]);
        g.position.set(x, y, z);
        g.rotation.set(tilt(), 0.5 * Math.sign(x), tilt());
        root.add(g);
      }
    } else if (a.lining === 'jizo') {
      const bib = mat(new THREE.Color('#cf2f22').lerp(new THREE.Color('#d7b0a6'), mood.wear * 0.6), { roughness: 0.85 });
      for (const [x, y, z] of stations) for (let i = 0; i < 3; i++) {
        const k = 0.75 + random() * 0.5, px = x + Math.sign(x) * i * 0.42, pz = z + (random() - 0.5) * 0.25;
        const g = new THREE.Group();
        put(g, new THREE.LatheGeometry([[0, 0], [0.16, 0], [0.17, 0.1], [0.13, 0.42], [0.08, 0.5], [0, 0.5]].map(([u, v]) => new THREE.Vector2(u, v)), 10), stone);
        put(g, new THREE.SphereGeometry(0.11, 10, 8), stone, [0, 0.6, 0]);
        const cloth = put(g, new THREE.SphereGeometry(0.15, 10, 6, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.3), bib, [0, 0.47, 0]);
        cloth.scale.set(1, 1.3, 1);
        if (snowy) put(g, new THREE.SphereGeometry(0.1, 8, 6), snow, [0, 0.7, 0]).scale.y = 0.6;
        g.scale.setScalar(k);
        g.position.set(px, y, pz);
        g.rotation.set(tilt(), -Math.sign(x) * 0.5, tilt());
        root.add(g);
      }
    } else if (a.lining === 'rail') {
      const rope = mat('#c9ab62', { roughness: 0.95 });
      for (const side of [-1, 1]) {
        const posts: P[] = [];
        for (let i = 0; i <= 5; i++) { const z = mix(FOOT + 0.4, HEAD - 0.4, i / 5), x = side * (STAIR - 0.17); const y = groundAt(0, z) + 0.36; posts.push([x, y, z]); put(root, new THREE.CylinderGeometry(0.05, 0.06, 1.0, 8), cedarWood, [x, y + 0.45, z]).rotation.z = tilt(); }
        for (let i = 0; i < posts.length - 1; i++) {
          const p = posts[i], q = posts[i + 1];
          const midY = (p[1] + q[1]) / 2 + 0.72;
          rod(root, [p[0], p[1] + 0.88, p[2]], [p[0], midY, (p[2] + q[2]) / 2], 0.022, rope);
          rod(root, [p[0], midY, (p[2] + q[2]) / 2], [q[0], q[1] + 0.88, q[2]], 0.022, rope);
        }
      }
    }

    // Festival strings of paper lanterns up both sides.
    if (a.state === 'festival') {
      const strung: { at: P; scale: P }[] = [], strungRed: { at: P; scale: P }[] = [];
      const pole = mat('#3a2e26');
      for (const side of [-1, 1]) {
        const x = side * (STAIR + 0.15);
        const posts = [FOOT + 1.6, (FOOT + HEAD) / 2, HEAD - 1.0].map((z) => [x, groundAt(0, z), z] as P);
        for (const [px, py, pz] of posts) put(root, new THREE.CylinderGeometry(0.045, 0.055, 3.1, 8), pole, [px, py + 1.55, pz]);
        for (let i = 0; i < posts.length - 1; i++) {
          const p = posts[i], q = posts[i + 1], n = 8;
          const points: P[] = [];
          for (let k = 0; k <= n; k++) { const t = k / n; points.push([x, mix(p[1], q[1], t) + 3.0 - Math.sin(t * Math.PI) * 0.4, mix(p[2], q[2], t)]); }
          for (let k = 0; k < n; k++) rod(root, points[k], points[k + 1], 0.012, pole).castShadow = false;
          for (let k = 1; k < n; k++) (k % 2 ? strung : strungRed).push({ at: [x, points[k][1] - 0.2, points[k][2]], scale: [0.15, 0.19, 0.15] });
        }
      }
      const ball = new THREE.SphereGeometry(1, 12, 8);
      const redGlow = new THREE.MeshStandardMaterial({ color: '#ff8a70', emissive: '#ff4b2e', emissiveIntensity: dim ? 2.2 : 1.3, roughness: 0.8 });
      flames.push(redGlow);
      instanced(ball, glow, strung, false);
      instanced(ball, redGlow, strungRed, false);
    }

    // Ground cover: moss cushions, ferns, leaves, snow, the fallen trunk.
    const scatterSpot = (): P | null => {
      const x = (random() * 2 - 1) * (HALF - 0.3), z = mix(BACK + 0.3, FRONT - 0.3, random());
      if (Math.abs(x) < STAIR + 0.2 && z > HEAD - 0.2 && z < FOOT + 0.2) return null;
      if (Math.abs(z - FOOT) < 0.25 || (Math.abs(z - LEDGE) < 0.25 && Math.abs(x) > STAIR)) return null;
      return [x, groundAt(x, z) + 0.06, z];
    };
    if (!snowy) {
      const cushions = Math.round(mix(60, 170, mood.density) * (forgotten ? 1.6 : a.state === 'festival' ? 0.5 : 1));
      for (let i = 0; i < cushions; i++) { const p = scatterSpot(); if (!p || (Math.abs(p[0]) < 1.1 && !forgotten)) continue; mossBits.push({ at: p, scale: [0.2 + random() * 0.45, 0.04 + random() * 0.05, 0.2 + random() * 0.4], color: mossGreen.clone().offsetHSL((random() - 0.5) * 0.05, 0, (random() - 0.5) * 0.1) }); }
      instanced(new THREE.SphereGeometry(1, 8, 5), mat('#ffffff', { roughness: 1 }), mossBits, false);
      const ferns: { at: P; scale: P; rot: P; color: THREE.Color }[] = [];
      const fernCount = Math.round(mix(30, 90, mood.density) * (forgotten ? 2.2 : a.state === 'festival' ? 0.4 : 1));
      for (let i = 0; i < fernCount; i++) {
        const p = scatterSpot();
        if (!p || (Math.abs(p[0]) < 1.3 && !forgotten) || SLOTS.some((slot) => Math.hypot(slot.x - p[0], slot.z - p[2]) < slot.r * 0.8)) continue;
        const k = 0.5 + random() * 0.8;
        for (let f = 0; f < 5; f++) ferns.push({ at: p, scale: [k * 0.16, k * 0.75, k * 0.05], rot: [0.9 + random() * 0.4, f * 1.256 + random(), 0], color: mossGreen.clone().offsetHSL(0.03, 0.1, 0.02 + random() * 0.1) });
      }
      const frond = new THREE.ConeGeometry(1, 1, 4);
      frond.translate(0, 0.5, 0);
      const fernMesh = instanced(frond, mat('#ffffff', { roughness: 0.9, flatShading: true }), ferns.map((f) => ({ ...f, rot: [f.rot[0], f.rot[1], 0] as P })), false);
      fernMesh.userData.ferns = true;
    } else {
      for (let i = 0; i < 60; i++) { const p = scatterSpot(); if (p) snowCaps.push({ at: [p[0], p[1] + 0.02, p[2]], scale: [0.6 + random() * 1.2, 0.14 + random() * 0.14, 0.6 + random() * 1.0] }); }
      instanced(new THREE.BoxGeometry(1, 1, 1), snow, snowCaps.filter((cap) => cap.scale[1] < 0.13 || cap.rot), true);
      instanced(new THREE.SphereGeometry(0.5, 9, 6), snow, snowCaps.filter((cap) => cap.scale[1] >= 0.13 && !cap.rot), false);
    }
    if (a.state === 'autumn' || (forgotten && mood.warmth > 0.5)) {
      const leaves: { at: P; scale: P; rot: P; color: THREE.Color }[] = [];
      const n = Math.round(mix(700, 1700, mood.density));
      for (let i = 0; i < n; i++) {
        const x = (random() * 2 - 1) * (HALF - 0.2), z = mix(BACK + 0.2, FRONT - 0.2, random());
        const k = 0.07 + random() * 0.07;
        leaves.push({ at: [x, groundAt(x, z) + 0.075 + random() * 0.02, z], scale: [k, k, k], rot: [-Math.PI / 2 + (random() - 0.5) * 0.5, 0, random() * 6], color: new THREE.Color().setHSL(random() * 0.14, 0.85, 0.42 + random() * 0.14) });
      }
      instanced(new THREE.CircleGeometry(1, 5), mat('#ffffff', { roughness: 0.9, side: THREE.DoubleSide }), leaves, false);
      // A maple or two burning among the cedars.
      for (const [x, z] of [[-6.1, 4.6], [6.2, -4.6]] as [number, number][]) {
        const y = groundAt(x, z);
        rod(root, [x, y, z], [x + 0.3, y + 2.6, z], 0.13, cedarWood);
        const crown: { at: P; scale: P; color: THREE.Color }[] = [];
        for (let i = 0; i < 9; i++) crown.push({ at: [x + 0.3 + (random() - 0.5) * 2.2, y + 2.8 + random() * 1.5, z + (random() - 0.5) * 2.2], scale: [0.8 + random() * 0.5, 0.5 + random() * 0.3, 0.8 + random() * 0.5], color: new THREE.Color().setHSL(0.01 + random() * 0.09, 0.85, 0.45) });
        instanced(new THREE.IcosahedronGeometry(1, 1), mat('#ffffff', { roughness: 1, flatShading: true }), crown);
      }
    }
    if (forgotten) {
      // A cedar has come down across the left terrace and nobody has cleared it.
      const log = put(root, new THREE.CylinderGeometry(0.34, 0.46, 6.4, 10), new THREE.MeshStandardMaterial({ map: barkMap, color: '#7c5a44', roughness: 1 }), [-4.3, 1.9, 2.9]);
      log.rotation.set(0.1, 0.5, Math.PI / 2 - 0.09);
      for (let i = 0; i < 5; i++) { const stub = rod(root, [-6.3 + i * 1.0, 1.95, 2.0 + i * 0.5], [-6.2 + i * 1.0 + (random() - 0.5), 2.9 + random() * 0.6, 2.0 + i * 0.5 + (random() - 0.5) * 0.8], 0.05, cedarWood); stub.castShadow = true; }
    }

    // What the last visitor left.
    if (a.trace === 'umbrella') {
      const g = new THREE.Group();
      put(g, new THREE.ConeGeometry(0.6, 0.28, 16, 1, true), mat('#cf2f22', { side: THREE.DoubleSide, roughness: 0.7 }), [0, 0.9, 0]);
      put(g, new THREE.CylinderGeometry(0.014, 0.014, 1.05, 6), mat('#3a2e26'), [0, 0.5, 0]);
      g.position.set(STAIR - 0.5, 0.42, FOOT + 0.5);
      g.rotation.set(0.5, 0, -1.9);
      root.add(g);
    } else if (a.trace === 'broom') {
      rod(root, [-STAIR - 0.25, 0.05, FOOT + 0.7], [-STAIR - 0.05, 1.45, FOOT + 0.12], 0.02, mat('#a9a35c'));
      const head = put(root, new THREE.ConeGeometry(0.2, 0.5, 8), mat('#8a7a4d', { flatShading: true }), [-STAIR - 0.28, 0.25, FOOT + 0.78]);
      head.rotation.set(0.38, 0, -0.14);
      const heap: { at: P; scale: P; rot: P; color: THREE.Color }[] = [];
      for (let i = 0; i < 80; i++) { const g = random() * 6.28, r = random() * 0.5; heap.push({ at: [-STAIR - 1.0 + Math.sin(g) * r, 0.08 + (0.5 - r) * 0.45 * random(), FOOT + 1.4 + Math.cos(g) * r], scale: [0.09, 0.09, 0.09], rot: [random() * 3, random() * 3, 0], color: new THREE.Color().setHSL(0.03 + random() * 0.1, snowy ? 0.2 : 0.7, 0.35 + random() * 0.15) }); }
      instanced(new THREE.CircleGeometry(1, 5), mat('#ffffff', { side: THREE.DoubleSide }), heap, false);
    } else if (a.trace === 'sandals') {
      for (const dx of [0, 0.16]) {
        box(root, [0.11, 0.025, 0.25], [0.7 + dx, 3.12, HEAD - 0.28], mat('#8a6444'));
        for (const dz of [-0.07, 0.07]) box(root, [0.11, 0.05, 0.03], [0.7 + dx, 3.09, HEAD - 0.28 + dz], mat('#8a6444'));
        box(root, [0.08, 0.012, 0.1], [0.7 + dx, 3.137, HEAD - 0.23], mat('#cf2f22'));
      }
    } else if (a.trace === 'flowers') {
      put(root, new THREE.CylinderGeometry(0.04, 0.03, 0.06, 10), mat('#f3f1ea', { roughness: 0.3 }), [-0.5, rise + 0.03, FOOT - 0.15]);
      const petals = ['#f3d54a', '#f4f0ea', '#e8497a', '#c86bd6'];
      for (let i = 0; i < 7; i++) {
        const x = -0.2 + i * 0.05;
        rod(root, [x, rise + 0.02, FOOT - 0.28], [x + (i - 3) * 0.03, rise + 0.03, FOOT - 0.05], 0.007, mat('#4f7a3a'));
        put(root, new THREE.SphereGeometry(0.035, 8, 6), mat(petals[i % petals.length]), [x + (i - 3) * 0.03, rise + 0.05, FOOT - 0.03]);
      }
    }

    // Air: mist sheets, sun shafts or rain. All see-through, so none of it is measured as solid.
    const veil = (width: number, height: number, at: P, opacity: number, colour: THREE.Color, turn = YAW, lean = 0) => {
      const canvas = document.createElement('canvas');
      canvas.width = 8; canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      const fade = ctx.createLinearGradient(0, 0, 0, 64);
      fade.addColorStop(0, 'rgba(255,255,255,0)'); fade.addColorStop(0.55, 'rgba(255,255,255,1)'); fade.addColorStop(1, 'rgba(255,255,255,0.15)');
      ctx.fillStyle = fade; ctx.fillRect(0, 0, 8, 64);
      const alpha = new THREE.CanvasTexture(canvas);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ color: colour, alphaMap: alpha, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
      mesh.position.set(...at);
      mesh.rotation.set(0, turn, lean, 'YXZ');
      root.add(mesh);
      return mesh;
    };
    const veils: THREE.Mesh[] = [];
    if (a.air === 'mist' || a.air === 'rain') {
      const strength = a.air === 'mist' ? 0.5 : 0.2;
      for (const [z, y, o] of [[-8.6, 5.2, 1], [-5, 4.6, 0.55], [-0.6, 3.4, 0.35], [3, 1.6, 0.25]]) veils.push(veil(26, 5.5, [0, y, z], strength * o, sky));
    }
    if (a.air === 'shafts') {
      const sun = new THREE.Color().setHSL(mix(0.14, 0.09, mood.warmth), 0.9, 0.8);
      const from = mood.daylight < 0.5 ? -1 : 1;
      for (let i = 0; i < 5; i++) veil(1.0 + random() * 1.4, 16, [-5 + i * 2.6 + random(), 6.5, -5 + random() * 8], 0.13 + random() * 0.08, sun, YAW, from * 0.5);
    }
    let rain: THREE.InstancedMesh | null = null;
    const drops: THREE.Vector3[] = [];
    if (a.air === 'rain') {
      const n = Math.round(mix(160, 420, mood.density));
      for (let i = 0; i < n; i++) drops.push(new THREE.Vector3((random() * 2 - 1) * HALF, random() * 10, mix(BACK, FRONT, random())));
      rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.42, 0.012), new THREE.MeshBasicMaterial({ color: '#eef4f7', transparent: true, opacity: 0.5, depthWrite: false }), n);
      root.add(rain);
      // Puddles on the paving.
      for (let i = 0; i < 6; i++) { const puddle = put(ground, new THREE.CircleGeometry(0.35 + random() * 0.4, 14), mat(sky.clone().multiplyScalar(0.9), { roughness: 0.05, metalness: 0.4 }), [(random() - 0.5) * 5, 0.064, FOOT + 0.8 + random() * 3.2]); puddle.rotation.x = -Math.PI / 2; puddle.scale.y = 0.6; puddle.castShadow = false; }
    }
    const rainMatrix = new THREE.Matrix4();
    const fall = (time: number, speed: number) => {
      if (!rain) return;
      drops.forEach((drop, i) => { rainMatrix.makeTranslation(drop.x, 10 - ((drop.y + time * speed) % 10), drop.z); rain!.setMatrixAt(i, rainMatrix); });
      rain.instanceMatrix.needsUpdate = true;
    };
    fall(0, 0);

    // Camera: a fixed orthographic view up the flight from the front right.
    const camera = new THREE.OrthographicCamera(-9, 9, 9, -9, 0.1, 300);
    const toCamera = new THREE.Vector3(Math.sin(YAW) * Math.cos(PITCH), Math.sin(PITCH), Math.cos(YAW) * Math.cos(PITCH));
    const stage = new THREE.Box3(new THREE.Vector3(-5.9, 0, -7.6), new THREE.Vector3(5.9, 7.2, 7.3));
    const frame = () => {
      const centre = stage.getCenter(new THREE.Vector3());
      camera.position.copy(centre).addScaledVector(toCamera, 90);
      camera.lookAt(centre);
      camera.updateMatrixWorld(true);
      const seen = new THREE.Box2(), corner = new THREE.Vector3();
      for (const x of [stage.min.x, stage.max.x]) for (const y of [stage.min.y, stage.max.y]) for (const z of [stage.min.z, stage.max.z]) {
        corner.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
        seen.expandByPoint(new THREE.Vector2(corner.x, corner.y));
      }
      const middle = seen.getCenter(new THREE.Vector2());
      const extent = Math.max(...seen.getSize(new THREE.Vector2()).toArray()) * 0.5;
      camera.translateX(middle.x);
      camera.translateY(middle.y);
      camera.left = camera.bottom = -extent;
      camera.right = camera.top = extent;
      camera.updateProjectionMatrix();
      // Low sun from one side at either end of the day, higher at noon.
      const side = mix(-1, 1, mood.daylight), heightOfSun = mix(0.55, 1.5, 1 - Math.abs(mood.daylight - 0.5) * 2);
      key.target.position.set(0, 2, -1);
      key.position.set(side * 16 + (side >= 0 ? 4 : -4), 18 * heightOfSun + 6, 15);
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -15;
      shadow.right = shadow.top = 15;
      shadow.near = 0.5; shadow.far = 90;
      shadow.updateProjectionMatrix();
    };
    frame();

    const flicker = mix(0.04, 0.22, mood.energy), speed = mix(3, 9, mood.energy);
    const base = flames.map((material) => (material as THREE.MeshStandardMaterial).emissiveIntensity);
    return {
      object: root,
      camera,
      background,
      capacity: SLOTS.length,
      ground,
      keyLight: key,
      place(items: readonly Placeable[]) {
        items.forEach((item, index) => {
          const slot = SLOTS[index % SLOTS.length];
          // Near true size, but a tiny thing is brought up to be seen and a huge one fitted to its spot.
          const floorHeight = item.hero ? 2.0 : 1.2;
          const target = Math.min(Math.max(item.height, floorHeight), slot.h);
          const scale = Math.min(target / Math.max(item.height, 0.05), slot.r / Math.max(item.radius, 0.05));
          item.holder.scale.setScalar(scale);
          item.holder.position.set(slot.x, slot.y + 0.06, slot.z);
          item.holder.rotation.y = (item.hero ? YAW * 0.5 : YAW * 0.6 - Math.sign(slot.x) * 0.35) + (random() - 0.5) * 0.25;
          item.holder.updateMatrixWorld(true);
        });
        frame();
      },
      update(_dt: number, time: number) {
        flames.forEach((material, i) => { (material as THREE.MeshStandardMaterial).emissiveIntensity = base[i] * (1 - flicker + flicker * Math.sin(time * speed + i * 2) * Math.sin(time * speed * 0.31)); });
        fall(time, mix(7, 16, mood.energy));
        veils.forEach((sheet, i) => { sheet.position.x = Math.sin(time * 0.05 * (1 + mood.energy) + i * 2) * 1.5; });
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
