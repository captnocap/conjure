import * as THREE from 'three';
import { type Placeable, Sculpture, choice, defineWorld, disposeTree, mix, noul } from '@conjure/kit';

const TIMES = {
  golden: 'Golden hour: low orange sun, long shadows, the bulbs just coming on.',
  dusk: 'Blue-pink dusk, the sky still bright behind the rides and every bulb glowing.',
  night: 'Full evening under a deep blue sky, the midway its own pool of light.',
  storm: 'A sickly yellow-green sky with a thunderhead rolling in, wind in the pennants.',
} as const;
const SKY: Record<keyof typeof TIMES, { top: string; horizon: string; key: string; power: number; hemi: string; hemiPower: number; glow: number; grass: number }> = {
  golden: { top: '#86a9cc', horizon: '#f7cf95', key: '#ffc27a', power: 2.7, hemi: '#fff0d6', hemiPower: 1.15, glow: 0.7, grass: 1 },
  dusk: { top: '#5a6aa0', horizon: '#eda08e', key: '#ffa98a', power: 1.5, hemi: '#b9bfe6', hemiPower: 1.35, glow: 1.15, grass: 0.82 },
  night: { top: '#2c3658', horizon: '#646489', key: '#b4c0ea', power: 1.0, hemi: '#98a2d0', hemiPower: 1.25, glow: 1.5, grass: 0.62 },
  storm: { top: '#56635c', horizon: '#c2bf90', key: '#ece6b4', power: 1.3, hemi: '#b4bfb0', hemiPower: 1.35, glow: 1.0, grass: 0.8 },
};
const PALETTES = {
  classic: 'Every joint red and white, like a box of popcorn.',
  mixed: 'A riot: each booth a different loud pairing.',
  faded: 'Sun-bleached pastels on canvas that has done thirty summers.',
  county: 'Green and yellow, tractor colours, a fair run by the grange.',
} as const;
const PAIRS: Record<keyof typeof PALETTES, [string, string][]> = {
  classic: [['#c9342f', '#f3ecdc'], ['#b82a2a', '#f6f0e2']],
  mixed: [['#c9342f', '#f3ecdc'], ['#2c4fa3', '#f2c53d'], ['#e86a9a', '#3aa6a0'], ['#e2762a', '#f3ecdc'], ['#6a3b96', '#e0b441'], ['#2f8f5a', '#f3ecdc']],
  faded: [['#d9938a', '#efe7d6'], ['#8fb0c9', '#efe7d6'], ['#d8c58a', '#efe7d6'], ['#a9c7a8', '#efe7d6']],
  county: [['#2f7a3e', '#f2c53d'], ['#2f7a3e', '#f3ecdc'], ['#e0b12e', '#f3ecdc']],
};
const BANNERS = { fair: 'COUNTY FAIR', welcome: 'WELCOME', last: 'LAST NIGHT', derby: 'DERBY TONIGHT', fourh: '4-H LIVESTOCK SHOW' } as const;
const JOINT_SIGNS = ['RING TOSS', 'BALLOON DARTS', 'DUCK POND', 'SKEE BALL', 'WATER GUNS', 'MILK BOTTLES', 'BINGO', 'GUESS YOUR AGE'];
const FOOD_SIGNS = ['CORN DOGS', 'LEMONADE', 'FRIED DOUGH', 'COTTON CANDY', 'ELEPHANT EARS', 'SNO CONES', 'FUNNEL CAKES'];
const SLOTS = [
  { x: 0, z: 8, h: 3.4, r: 1.6 },
  { x: -2.3, z: 3.4, h: 3.2, r: 1.25 },
  { x: 2.4, z: 1.6, h: 3.2, r: 1.25 },
  { x: -2.5, z: -4.6, h: 3.4, r: 1.3 },
  { x: 2.6, z: -8, h: 3.6, r: 1.3 },
];

function stripeTexture(a: string, b: string, repeat: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 8;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = a; ctx.fillRect(0, 0, 32, 8);
  ctx.fillStyle = b; ctx.fillRect(32, 0, 32, 8);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, 1);
  return texture;
}

export default defineWorld({
  questions: {
    time: choice('What is the light like?', TIMES),
    night: choice('Which night of the fair is it?', {
      opening: 'Opening evening: fresh grass, every joint open, nothing on the ground yet.',
      peak: 'Saturday at its peak: everything lit and the grass worn to dirt.',
      last: 'The last night: a few joints already shuttered, litter everywhere.',
      teardown: 'Tearing down: most awnings dropped, a box truck backed into the midway, the wheel dark.',
    }),
    palette: choice('What colours are the booths?', PALETTES),
    bulbs: choice('What are the strings of bulbs overhead like?', {
      warm: 'Plain warm-white bulbs.',
      rainbow: 'Every colour in turn: red, yellow, green, blue.',
      amber: 'Alternating amber and red.',
      cold: 'Harsh blue-white LEDs, newly bought.',
    }),
    beyond: choice('What rises beyond the far end of the midway?', {
      wheel: 'A Ferris wheel outlined in lights beside the barn roof.',
      silo: 'Just the barn and a silo against the sky: the farm part of the fair.',
      grandstand: 'The grandstand and its floodlights, where the derby is.',
    }),
    ground: choice('What is underfoot?', {
      grass: 'Grass trampled to a brown path down the middle.',
      mud: 'Mud after rain, with puddles and straw thrown down.',
      dust: 'Hard dry dirt and dust.',
    }),
    banner: choice('What does the banner strung across the far end say?', BANNERS),
    pennants: noul('Are there strings of coloured pennants as well as bulbs?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const s = new Sculpture(context);
    const root = s.root;
    const sky = SKY[a.time];
    const shutShare = { opening: 0, peak: 0.05, last: 0.3, teardown: 0.75 }[a.night] + mood.wear * 0.15;
    const litter = { opening: 0.05, peak: 0.6, last: 1, teardown: 0.8 }[a.night] * mix(0.5, 1.2, mood.density);
    const glow = sky.glow;

    // Sky backdrop.
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 256; skyCanvas.height = 256;
    const sc = skyCanvas.getContext('2d')!;
    const grad = sc.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, sky.top); grad.addColorStop(0.72, sky.horizon); grad.addColorStop(1, sky.horizon);
    sc.fillStyle = grad; sc.fillRect(0, 0, 256, 256);
    if (a.time === 'golden' || a.time === 'dusk') {
      const sun = sc.createRadialGradient(70, 190, 2, 70, 190, 90);
      sun.addColorStop(0, a.time === 'golden' ? 'rgba(255,244,200,0.95)' : 'rgba(255,190,150,0.7)'); sun.addColorStop(1, 'rgba(255,220,160,0)');
      sc.fillStyle = sun; sc.fillRect(0, 0, 256, 256);
    }
    for (let i = 0; i < (a.time === 'storm' ? 16 : 6); i++) {
      const cx = random() * 256, cy = a.time === 'storm' ? 20 + random() * 120 : 70 + random() * 90, w = 30 + random() * 60;
      sc.fillStyle = a.time === 'storm' ? `rgba(60,70,68,${0.25 + random() * 0.3})` : a.time === 'night' ? 'rgba(120,120,160,0.25)' : 'rgba(255,225,200,0.35)';
      for (let k = 0; k < 5; k++) { sc.beginPath(); sc.ellipse(cx + (k - 2) * w * 0.3, cy + (random() - 0.5) * 6, w * 0.3, 5 + random() * (a.time === 'storm' ? 16 : 5), 0, 0, Math.PI * 2); sc.fill(); }
    }
    if (a.time === 'night') { sc.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 50; i++) sc.fillRect(random() * 256, random() * 130, 1.2, 1.2); }
    const skyTex = new THREE.CanvasTexture(skyCanvas); skyTex.colorSpace = THREE.SRGBColorSpace;
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(260, 90), new THREE.MeshBasicMaterial({ map: skyTex, depthWrite: false }));
    backdrop.position.set(0, 36, -85);
    backdrop.renderOrder = -10;
    root.add(backdrop);
    const background = new THREE.Color(sky.horizon).lerp(new THREE.Color(sky.top), 0.25);

    // Lights.
    root.add(new THREE.HemisphereLight(sky.hemi, '#8d8563', sky.hemiPower + 0.12 * glow));
    const key = new THREE.DirectionalLight(new THREE.Color(sky.key).lerp(new THREE.Color('#ffb070'), (mood.warmth - 0.5) * 0.4), sky.power);
    key.position.set(mix(-16, 14, mood.daylight), a.time === 'golden' ? 9 : 16, 14);
    key.target.position.set(0, 0, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.04;
    const sh = key.shadow.camera;
    sh.left = -16; sh.right = 16; sh.top = 16; sh.bottom = -16; sh.near = 1; sh.far = 70;
    root.add(key, key.target);
    // Ground: grass, then the worn path laid over it.
    const grassTint = new THREE.Color(a.ground === 'dust' ? '#a99b62' : a.ground === 'mud' ? '#6f7a45' : '#7d9a4c').multiplyScalar(mix(0.85, 1.05, sky.grass));
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 190), new THREE.MeshStandardMaterial({ color: grassTint, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.z = -30; ground.receiveShadow = true;
    root.add(ground);
    const pc = document.createElement('canvas'); pc.width = 128; pc.height = 512;
    const pctx = pc.getContext('2d')!;
    const dirt = a.ground === 'mud' ? [74, 58, 42] : a.ground === 'dust' ? [196, 170, 124] : [150, 128, 84];
    const wearIn = a.night === 'opening' ? 0.45 : 1;
    for (let i = 0; i < 2600; i++) {
      const u = (random() + random() + random()) / 3, x = u * 128, y = random() * 512, r = 3 + random() * 9;
      const centre = 1 - Math.abs(u - 0.5) * 2;
      const k = 0.8 + random() * 0.4;
      pctx.fillStyle = `rgba(${dirt[0] * k | 0},${dirt[1] * k | 0},${dirt[2] * k | 0},${Math.min(1, centre * 1.6) * 0.5 * wearIn})`;
      pctx.beginPath(); pctx.ellipse(x, y, r * 0.5, r, 0, 0, Math.PI * 2); pctx.fill();
    }
    const pathTex = new THREE.CanvasTexture(pc); pathTex.colorSpace = THREE.SRGBColorSpace;
    const path = new THREE.Mesh(new THREE.PlaneGeometry(11, 60), new THREE.MeshStandardMaterial({ map: pathTex, transparent: true, depthWrite: false, roughness: 1 }));
    path.rotation.x = -Math.PI / 2; path.position.set(0, 0.012, -8); path.receiveShadow = true;
    root.add(path);
    if (a.ground === 'mud') {
      const water = new THREE.MeshStandardMaterial({ color: new THREE.Color(sky.horizon).multiplyScalar(0.8), roughness: 0.05, metalness: 0.4 });
      for (let i = 0; i < 9; i++) { const p = s.cylinder(1, 1, 0.01, [(random() - 0.5) * 7.5, 0.016, 10 - random() * 30], water, 20); p.scale.set(0.5 + random() * 1.1, 1, 0.3 + random() * 0.7); p.castShadow = false; }
    }

    // Booth rows.
    const bulbs: { at: [number, number, number]; tint: number }[] = [];
    const pairs = PAIRS[a.palette];
    const interior = new THREE.MeshStandardMaterial({ color: '#ffe2ae', emissive: '#ffb65c', emissiveIntensity: 0.75 * glow });
    const dead = s.material('#5a564e');
    const wood = s.material('#8a6a48'), steel = s.material('#b9bfc2', { metalness: 0.6, roughness: 0.4 }), tyre = s.material('#222224');
    const plush: { at: [number, number, number]; size: number; color: string }[] = [];
    const plushCols = ['#e9a6b8', '#9cc4e4', '#f2d98c', '#b9a0d8', '#8fd94a', '#f4d03f', '#f08a5a'];
    const signs = { joint: [...JOINT_SIGNS], food: [...FOOD_SIGNS] };
    const take = (list: string[]) => list.splice(Math.floor(random() * list.length), 1)[0] ?? 'PRIZES';
    const zs = [5.2, 0.6, -4.0, -8.6, -13.2, -17.8];
    const stripeMat = (c1: string, c2: string, repeat: number) => {
      const m = new THREE.MeshStandardMaterial({ map: stripeTexture(c1, c2, repeat), roughness: 0.9, side: THREE.DoubleSide });
      m.color.lerp(new THREE.Color('#b9b2a2'), mood.wear * 0.3);
      return m;
    };
    for (const side of [-1, 1]) zs.forEach((zc, index) => {
      const [c1, c2] = pairs[Math.floor(random() * pairs.length)];
      const food = random() < 0.4;
      const shut = random() < shutShare;
      const xf = side * 4.00, w = 4.0;
      const signText = take(food ? signs.food : signs.joint);
      const lit = !shut;
      let signY = 3.55;
      if (!food) {
        const canvasA = stripeMat(c1, c2, 7), canvasB = stripeMat(c1, c2, 5);
        s.box([0.08, 2.7, w], [side * 7.10, 1.35, zc], canvasA);
        for (const k of [-1, 1]) s.box([3.1, 2.7, 0.06], [side * 5.55, 1.35, zc + k * w / 2], canvasB);
        s.box([0.35, 0.95, w], [xf + side * -0.82, 0.475, zc], canvasA);
        s.box([0.6, 0.06, w + 0.1], [xf + side * -0.80, 0.98, zc], wood);
        s.box([0.04, 2.3, w - 0.2], [side * 7.00, 1.5, zc], lit ? interior : dead);
        const roof = s.box([4.3, 0.06, w + 0.3], [side * 5.35, 2.95, zc], stripeMat(c1, c2, 8));
        roof.rotation.z = side * -0.87;
        (roof.material as THREE.MeshStandardMaterial).map!.rotation = Math.PI / 2;
        s.box([0.04, 0.34, w + 0.3], [side * 3.22, 2.52, zc], canvasA);
        for (const k of [-1, 1]) s.cylinder(0.04, 0.04, 2.7, [xf, 1.35, zc + k * w / 2], steel, 8);
        if (shut) s.box([0.05, 1.5, w], [xf + side * -0.98, 1.72, zc], canvasA);
        else {
          const n = Math.round(mix(4, 9, mood.density));
          for (let i = 0; i < n; i++) {
            const z = zc - w / 2 + 0.3 + i * (w - 0.6) / (n - 1), c = plushCols[Math.floor(random() * plushCols.length)], y = 2.25 - random() * 0.25, sz = mix(0.8, 1.4, random());
            plush.push({ at: [xf + side * -0.85, y, z], size: 0.17 * sz, color: c }, { at: [xf + side * -0.85, y + 0.24 * sz, z], size: 0.13 * sz, color: c }, { at: [xf + side * -0.85, y + 0.36 * sz, z - 0.09 * sz], size: 0.05 * sz, color: c }, { at: [xf + side * -0.85, y + 0.36 * sz, z + 0.09 * sz], size: 0.05 * sz, color: c });
          }
          // Something on the back wall: shelves of targets.
          s.box([0.3, 0.05, w - 0.6], [side * 6.80, 1.5, zc], wood);
        }
        for (let i = 0; i < 11; i++) if (lit && random() > mood.wear * 0.4) bulbs.push({ at: [side * 3.20, 2.74, zc - w / 2 + i * w / 10], tint: 0 });
      } else {
        const body = s.material(['#f1ede2', '#f0c63a', '#49b3ad', '#eb8fb0', '#f1ede2'][Math.floor(random() * 5)], { roughness: 0.5 });
        const trim = s.material(c1);
        s.box([3.0, 2.5, w], [side * 5.60, 1.8, zc], body);
        s.box([3.04, 0.3, w + 0.04], [side * 5.60, 0.85, zc], trim);
        s.box([3.1, 0.08, w + 0.1], [side * 5.60, 3.07, zc], trim);
        s.box([0.03, 1.05, 2.6], [side * 4.09, 2.0, zc], lit ? interior : dead);
        s.box([0.45, 0.05, 2.9], [xf - side * -0.90, 1.42, zc], steel);
        const flap = s.box([1.3, 0.05, 2.8], [side * 3.50, 2.72, zc], body);
        if (shut) { flap.position.set(side * 4.07, 2.0, zc); flap.rotation.z = Math.PI / 2; } else flap.rotation.z = -side * -0.80;
        for (const k of [-1, 1]) { const wheel = s.cylinder(0.36, 0.36, 0.22, [side * 4.20, 0.36, zc + k * 0.9], tyre, 14); wheel.rotation.z = Math.PI / 2; }
        s.box([0.2, 0.55, 0.2], [side * 6.90, 0.28, zc - 1.7], tyre);
        if (!shut) for (let i = 0; i < 8; i++) if (random() > mood.wear * 0.4) bulbs.push({ at: [side * 2.90, 2.82, zc - 1.3 + i * 2.6 / 7], tint: 0 });
        if (!shut && index < 4) s.cylinder(0.3, 0.27, 0.9, [xf - side * -0.60, 0.45, zc + w / 2 - 0.2], s.material('#3f6b8f', { metalness: 0.3 }), 12);
        signY = 3.65;
      }
      // Roof sign, angled to be read from the entrance.
      const light = new THREE.Color(c1).getHSL({ h: 0, s: 0, l: 0 }).l > 0.6;
      const sign = s.label(signText, 3.3, 0.8, [side * 4.60, signY + 0.1, zc + 0.3], light ? '#3a1d16' : '#fff6dc', c1);
      sign.rotation.y = -side * 0.00;
      const sm = sign.material as THREE.MeshStandardMaterial;
      if (lit) { sm.emissive = new THREE.Color('#ffffff'); sm.emissiveMap = sm.map; sm.emissiveIntensity = 0.28 * glow; }
      s.rod([side * 4.60, 3.0, zc + 0.3], [side * 4.60, signY - 0.3, zc + 0.3], 0.05, steel);
    });
    if (plush.length) s.scatter(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ roughness: 1 }), plush);

    // Poles and overhead strings.
    const poleZ = [10.5, 3, -4.5, -12, -19.5];
    const poleMat = s.material('#6d5a44');
    const strungDown = a.night === 'teardown';
    const wireMat = new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 1 });
    const pennantPts: { at: [number, number, number]; size: number; color: string }[] = [];
    const pennantCols = ['#e23b3b', '#f2c53d', '#3f8fd0', '#58b368', '#f3ecdc', '#e86a9a'];
    let stringIndex = 0;
    const string = (from: [number, number, number], to: [number, number, number], sag: number, flags = false) => {
      stringIndex++;
      if (strungDown && from[2] < 4 && random() < 0.4) to = [mix(from[0], to[0], 0.6), 0.05, mix(from[2], to[2], 0.6) + 1];
      const len = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
      const n = Math.max(6, Math.round(len / (flags ? 0.42 : 0.5)));
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= n; i++) { const t = i / n; pts.push([mix(from[0], to[0], t), mix(from[1], to[1], t) - Math.sin(t * Math.PI) * sag, mix(from[2], to[2], t)]); }
      s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), n, 0.012, 3), wireMat).castShadow = false;
      for (let i = 1; i < n; i++) {
        if (flags) pennantPts.push({ at: [pts[i][0], pts[i][1] - 0.02, pts[i][2]], size: 0.2, color: pennantCols[(i + stringIndex) % pennantCols.length] });
        else if (random() > mood.wear * 0.3) bulbs.push({ at: [pts[i][0], pts[i][1] - 0.06, pts[i][2]], tint: i + stringIndex });
      }
    };
    for (const z of poleZ) for (const side of [-1, 1]) { s.cylinder(0.07, 0.09, 6, [side * 3.6, 3, z], poleMat, 8); }
    poleZ.forEach((z, i) => {
      string([-3.6, 5.9, z], [3.6, 5.9, z], 0.9);
      if (i < poleZ.length - 1) {
        string([i % 2 ? 3.6 : -3.6, 5.9, z], [i % 2 ? -3.6 : 3.6, 5.9, poleZ[i + 1]], 1.1);
        for (const side of [-1, 1]) string([side * 3.6, 5.6, z], [side * 3.6, 5.6, poleZ[i + 1]], 0.5);
        if (a.pennants) string([i % 2 ? -3.6 : 3.6, 5.2, z], [i % 2 ? 3.6 : -3.6, 5.2, poleZ[i + 1]], 0.9, true);
      }
    });
    if (pennantPts.length) {
      const g = new THREE.ConeGeometry(0.7, 1.7, 3); g.rotateX(Math.PI); g.translate(0, -0.85, 0); g.scale(1, 1, 0.15);
      s.scatter(g, new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }), pennantPts).castShadow = false;
    }

    // Banner across the far end.
    const bannerZ = -21.5;
    for (const side of [-1, 1]) s.cylinder(0.1, 0.13, 7.4, [side * 4.3, 3.7, bannerZ], poleMat, 8);
    const [bc1] = pairs[0];
    const banner = s.label(BANNERS[a.banner], 8.0, 1.3, [0, 6.2, bannerZ], '#fff6dc', bc1);
    banner.rotation.x = 0.04;
    const bm = banner.material as THREE.MeshStandardMaterial; bm.emissive = new THREE.Color('#ffffff'); bm.emissiveMap = bm.map; bm.emissiveIntensity = 0.2 * glow;
    for (let i = 0; i < 22; i++) bulbs.push({ at: [-4.0 + i * 8.0 / 21, 6.95, bannerZ + 0.05], tint: i });

    // Bulbs: two alternating sets so they can chase.
    const tints = { warm: ['#ffe2a0'], rainbow: ['#ff5a4a', '#ffd84a', '#5ad06a', '#58a8ff', '#ff8ad0'], amber: ['#ffb43a', '#ff5540'], cold: ['#dff0ff'] }[a.bulbs];
    const bulbGeo = new THREE.SphereGeometry(0.075, 6, 5);
    const sets = [0, 1].map((parity) => {
      const mine = bulbs.filter((_b, i) => i % 2 === parity);
      const mesh = new THREE.InstancedMesh(bulbGeo, new THREE.MeshBasicMaterial({ color: '#ffffff' }), Math.max(1, mine.length));
      const m = new THREE.Matrix4();
      mine.forEach((b, i) => { m.makeTranslation(...b.at); mesh.setMatrixAt(i, m); mesh.setColorAt(i, new THREE.Color(b.tint === 0 ? '#ffe2a0' : tints[b.tint % tints.length])); });
      mesh.count = mine.length;
      root.add(mesh);
      return mesh;
    });

    // Midway clutter: hay bales, barrels, litter.
    const bale = s.material('#cfa94a', { roughness: 1 });
    for (let i = 0; i < Math.round(mix(2, 6, mood.density)); i++) {
      const side = random() < 0.5 ? -1 : 1, z = 8 - random() * 26;
      const b = s.box([0.95, 0.42, 0.48], [side * (3.3 + random() * 0.3), 0.21, z], bale);
      b.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.5;
      if (random() < 0.4) s.box([0.95, 0.42, 0.48], [b.position.x, 0.63, z + 0.1], bale).rotation.y = Math.PI / 2 + (random() - 0.5) * 0.3;
    }
    const bits: { at: [number, number, number]; size: number; color: string }[] = [];
    const n = Math.round(litter * 160);
    for (let i = 0; i < n; i++) bits.push({ at: [(random() - 0.5) * 7.4, 0.02, 12 - random() * 32], size: 0.06 + random() * 0.07, color: ['#e23b3b', '#f6f3ea', '#f6f3ea', '#3f8fd0', '#f2c53d'][Math.floor(random() * 5)] });
    if (bits.length) s.scatter(new THREE.BoxGeometry(1, 0.15, 1.6), new THREE.MeshStandardMaterial({ roughness: 0.9 }), bits).castShadow = false;
    if (a.ground === 'mud') {
      const strawBits = Array.from({ length: 220 }, () => ({ at: [(random() - 0.5) * 8, 0.02, 12 - random() * 30] as [number, number, number], size: 0.1 + random() * 0.1, color: '#d9b54a' }));
      s.scatter(new THREE.BoxGeometry(2.4, 0.08, 0.14), new THREE.MeshStandardMaterial({ roughness: 1 }), strawBits).castShadow = false;
    }
    if (a.night === 'teardown') {
      // The box truck backed into the far end, ramp down, crates stacked behind it.
      const white = s.material('#e9e6dc');
      const tx = -1.6, tz = -15.5;
      const t = new THREE.Group();
      const add = (m: THREE.Object3D) => t.add(m);
      add(s.box([2.4, 2.5, 5.2], [0, 2.15, 0], white));
      add(s.box([2.3, 1.7, 1.8], [0, 1.45, -3.5], s.material('#c9342f')));
      add(s.box([2.1, 0.7, 0.05], [0, 1.9, -4.42], s.material('#27323a', { roughness: 0.2 })));
      for (const x of [-1, 1]) for (const z of [-3.6, 1.6]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.3, 14), tyre); wheel.rotation.z = Math.PI / 2; wheel.position.set(x * 1.1, 0.48, z); wheel.castShadow = true; t.add(wheel); }
      const ramp = s.box([1.6, 0.06, 3.2], [0, 0.48, 4.1], steel); ramp.rotation.x = 0.29; add(ramp);
      add(s.box([2.2, 2.2, 0.05], [0, 2.1, 2.58], s.material('#3b3a3a')));
      t.position.set(tx, 0, tz); t.rotation.y = 0.18;
      root.add(t);
      for (let i = 0; i < 6; i++) s.box([0.8, 0.6, 0.8], [1.4 + (i % 2) * 0.9 + random() * 0.2, 0.3 + Math.floor(i / 3) * 0.6, -11.5 - (i % 3) * 0.9], wood).rotation.y = random() * 0.4;
    }

    // Beyond the midway: treeline, barn, and whatever stands above it.
    const treeBits = Array.from({ length: 46 }, (_u, i) => ({ at: [-110 + i * 5 + random() * 3, 2 + random() * 2, -62 - random() * 8] as [number, number, number], size: 5 + random() * 4, color: new THREE.Color('#4f6b4a').lerp(new THREE.Color(sky.horizon), 0.35).getStyle() }));
    s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ roughness: 1 }), treeBits).castShadow = false;
    const barn = new THREE.Group();
    const profile = new THREE.Shape();
    const bw = 7, wallH = 6, kneeH = 9.2, kneeW = 5, peakH = 11.6;
    profile.moveTo(-bw, 0); profile.lineTo(bw, 0); profile.lineTo(bw, wallH); profile.lineTo(kneeW, kneeH); profile.lineTo(0, peakH); profile.lineTo(-kneeW, kneeH); profile.lineTo(-bw, wallH); profile.closePath();
    const barnBody = new THREE.Mesh(new THREE.ExtrudeGeometry(profile, { depth: 20, bevelEnabled: false }), s.material('#9c2f26'));
    barnBody.position.z = -20;
    barn.add(barnBody);
    const tin = s.material('#8d979b', { metalness: 0.4, roughness: 0.5 });
    const slope = (x0: number, y0: number, x1: number, y1: number) => {
      const len = Math.hypot(x1 - x0, y1 - y0) + 0.5;
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.25, 21), tin);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2 + 0.1, -10); m.rotation.z = Math.atan2(y1 - y0, x1 - x0);
      barn.add(m);
    };
    slope(bw + 0.4, wallH - 0.4, kneeW, kneeH); slope(kneeW, kneeH, 0, peakH); slope(0, peakH, -kneeW, kneeH); slope(-kneeW, kneeH, -bw - 0.4, wallH - 0.4);
    const white = s.material('#f1ecdf');
    const door = new THREE.Mesh(new THREE.BoxGeometry(5, 4.6, 0.1), white); door.position.set(0, 2.3, 0.05); barn.add(door);
    const doorIn = new THREE.Mesh(new THREE.BoxGeometry(4.4, 4.0, 0.12), new THREE.MeshStandardMaterial({ color: '#ffd89a', emissive: '#ffb65c', emissiveIntensity: 0.6 * glow })); doorIn.position.set(0, 2.1, 0.07); barn.add(doorIn);
    const loft = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 0.1), white); loft.position.set(0, 8.4, 0.05); barn.add(loft);
    const cup = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.3, 1.4), white); cup.position.set(0, peakH + 0.6, -10); barn.add(cup);
    const cupRoof = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1.1, 4), tin); cupRoof.rotation.y = Math.PI / 4; cupRoof.position.set(0, peakH + 1.8, -10); barn.add(cupRoof);
    barn.position.set(-15, 0, -34); barn.rotation.y = 0.5;
    root.add(barn);
    if (a.beyond === 'silo') {
      s.cylinder(2.6, 2.6, 15, [-3.5, 7.5, -44], s.material('#b9bcb4', { metalness: 0.3 }), 20).castShadow = false;
      s.ball([2.6, 2.0, 2.6], [-3.5, 15, -44], tin, 16);
      for (let i = 0; i < 6; i++) s.ring(2.62, 0.05, [-3.5, 2 + i * 2.4, -44], steel).rotation.x = Math.PI / 2;
      s.cylinder(1.8, 1.8, 10, [0.8, 5, -46], s.material('#a9b0ad', { metalness: 0.5 }), 16).castShadow = false;
      s.cylinder(0.1, 1.8, 1.6, [0.8, 10.8, -46], tin, 16);
    }
    // Ferris wheel.
    const wheel = new THREE.Group();
    const wheelLamps: THREE.InstancedMesh[] = [];
    if (a.beyond === 'wheel') {
      const R = 9.5, cx = 10, cy = 12, cz = -40;
      const frame = s.material('#d9d6cc', { metalness: 0.4 });
      for (const z of [-0.6, 0.6]) { const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.09, 6, 64), frame); rim.position.z = z; wheel.add(rim); const inner = new THREE.Mesh(new THREE.TorusGeometry(R * 0.55, 0.06, 6, 48), frame); inner.position.z = z; wheel.add(inner); }
      const spokeGeo = new THREE.CylinderGeometry(0.05, 0.05, R, 5); spokeGeo.translate(0, R / 2, 0);
      const spokes = new THREE.InstancedMesh(spokeGeo, frame, 32);
      const gondolas = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 0.9, 1.0), new THREE.MeshStandardMaterial({ roughness: 0.6 }), 16);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), zAxis = new THREE.Vector3(0, 0, 1);
      const lampPts: THREE.Vector3[] = [];
      for (let i = 0; i < 16; i++) {
        const t = i / 16 * Math.PI * 2;
        q.setFromAxisAngle(zAxis, t);
        for (const k of [0, 1]) spokes.setMatrixAt(i * 2 + k, m.compose(new THREE.Vector3(0, 0, k ? 0.6 : -0.6), q, new THREE.Vector3(1, 1, 1)));
        gondolas.setMatrixAt(i, m.makeTranslation(-Math.sin(t) * R, Math.cos(t) * R - 0.7, 0));
        gondolas.setColorAt(i, new THREE.Color(pennantCols[i % 4]));
        for (let j = 2; j <= 10; j++) lampPts.push(new THREE.Vector3(-Math.sin(t) * R * j / 10, Math.cos(t) * R * j / 10, 0.7));
      }
      for (let i = 0; i < 64; i++) { const t = i / 64 * Math.PI * 2; lampPts.push(new THREE.Vector3(Math.cos(t) * R, Math.sin(t) * R, 0.72)); }
      wheel.add(spokes, gondolas);
      const lit = a.night !== 'teardown';
      for (const parity of [0, 1]) {
        const mine = lampPts.filter((_p, i) => i % 2 === parity);
        const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 6, 4), new THREE.MeshBasicMaterial({ color: lit ? '#ffffff' : '#77756c' }), mine.length);
        mine.forEach((p, i) => { lamps.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z)); lamps.setColorAt(i, new THREE.Color(lit ? tints[(i + parity) % tints.length] : '#8a8880')); });
        wheel.add(lamps);
        if (lit) wheelLamps.push(lamps);
      }
      wheel.position.set(cx, cy, cz);
      root.add(wheel);
      for (const z of [-1.4, 1.4]) for (const x of [-1, 1]) s.rod([cx + x * 5.5, 0, cz + z], [cx, cy, cz + z * 0.6], 0.16, frame).castShadow = false;
      s.box([13, 0.5, 4], [cx, 0.9, cz], s.material('#6a7b88')).castShadow = false;
    } else if (a.beyond === 'grandstand') {
      const gx = 10, gz = -42, con = s.material('#b3b0a4');
      for (let i = 0; i < 7; i++) s.box([26, 1.0, 1.6], [gx, 0.5 + i * 1.0, gz - i * 1.6], con).castShadow = false;
      const roofM = s.box([27, 0.3, 13], [gx, 10.5, gz - 5], tin); roofM.rotation.x = 0.12; roofM.castShadow = false;
      for (let i = 0; i < 5; i++) s.rod([gx - 12 + i * 6, 0, gz + 0.8], [gx - 12 + i * 6, 9.8, gz + 0.8], 0.14, steel).castShadow = false;
      const flood = new THREE.MeshBasicMaterial({ color: '#fff7dc' });
      for (const x of [-9, 6, 24]) {
        s.rod([x, 0, -50], [x, 19, -50], 0.18, steel).castShadow = false;
        s.box([3.2, 1.6, 0.3], [x, 19.6, -50], s.material('#3a3f44')).castShadow = false;
        for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) s.mesh(new THREE.CircleGeometry(0.3, 10), flood, [x - 1.2 + i * 0.8, 19.2 + j * 0.8, -49.82]).castShadow = false;
      }
    }

    // Hay-bale stands for small things.
    const stands = SLOTS.map(() => {
      const g = new THREE.Group();
      for (let i = 0; i < 2; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.42, 0.62), bale); b.position.y = 0.21 + i * 0.42; b.rotation.y = i * 0.25 + (random() - 0.5) * 0.2; b.castShadow = b.receiveShadow = true; g.add(b); }
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.7), wood); crate.position.y = 0.87; crate.castShadow = true; g.add(crate);
      g.visible = false;
      root.add(g);
      return g;
    });

    const camera = new THREE.PerspectiveCamera(43, 1, 0.3, 260);
    camera.position.set(0.4, 2.1, 17.5);
    camera.lookAt(0, 2.9, -8);

    const place = (items: readonly Placeable[]) => {
      for (const stand of stands) stand.visible = false;
      items.forEach((item, index) => {
        const slot = SLOTS[index % SLOTS.length];
        const height = Math.max(item.height, 0.05), radius = Math.max(item.radius, 0.05);
        const fit = Math.min(slot.h / height, slot.r / radius);
        // True size when it fits; shrunk to fit the walkway when it does not; tiny things grow.
        const scale = Math.min(fit, Math.max(1, Math.min(0.75 / height, 3.5)));
        let y = 0;
        if (height * scale < 0.95 && radius * scale < 0.5) { stands[index % SLOTS.length].visible = true; stands[index % SLOTS.length].position.set(slot.x, 0, slot.z); y = 0.9; }
        item.holder.scale.setScalar(scale);
        item.holder.position.set(slot.x, y, slot.z);
        item.holder.rotation.y = -slot.x * 0.12 + (context.random() - 0.5) * 0.3;
        item.holder.updateMatrixWorld(true);
      });
      camera.updateMatrixWorld(true);
    };

    const chase = mix(0.6, 5, mood.energy), turn = a.night === 'teardown' ? 0 : mix(0.03, 0.22, mood.energy);
    const flick = (time: number) => {
      const step = Math.floor(time * chase) % 2;
      sets.forEach((mesh, i) => (mesh.material as THREE.MeshBasicMaterial).color.setScalar(i === step ? 1 : 0.72));
      wheelLamps.forEach((mesh, i) => (mesh.material as THREE.MeshBasicMaterial).color.setScalar(i === step ? 1 : 0.55));
    };
    flick(0);
    return {
      object: root, camera, background, capacity: SLOTS.length, ground, keyLight: key, place,
      update(dt, time) { wheel.rotation.z += dt * turn; flick(time); },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
