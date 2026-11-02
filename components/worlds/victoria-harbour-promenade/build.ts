import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Placeable, Sculpture, choice, defineWorld, disposeTree, figure, mix, noul, paint, paintHex, visibleBounds } from '@conjure/kit';

const canvasTexture = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat = false) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
};

const WATER_Y = -1.6, FAR_Y = 1.2, SHORE_Z = -78;
// Cast slots. The promenade holds street-sized things, the water holds long low hulls, the far shore holds towers.
const PROM = [[0, 13], [9, 11], [-7.5, 14.5], [6, 15.5], [-10, 11]] as const;
const LANDMARK = [[-10, 8], [13.5, 8]] as const;
const WATER = [[0, -14], [-22, -24], [24, -30]] as const;
const SKY = [[2, SHORE_Z - 6], [-46, SHORE_Z - 4], [46, SHORE_Z - 8], [-90, SHORE_Z - 10]] as const;

export default defineWorld({
  questions: {
    event: choice('What is happening on the harbour?', {
      ordinary: 'An ordinary evening: the city simply going about its business.',
      fireworks: 'Fireworks bursting over the water, the crowd packed against the railing.',
      typhoon: 'A typhoon coming in: grey heaving water, rain slanting, the promenade emptied.',
      lanterns: 'Mid-Autumn: strings of lanterns along the promenade, a full moon over the Peak.',
    }),
    traffic: choice('What is out on the water?', {
      ferries: 'Two green-and-white ferries crossing, wakes curling behind them.',
      junk: 'A red-sailed junk gliding past the towers.',
      barges: 'Working lighters and a tug pushing a barge of containers.',
      empty: 'Nothing: the last ferry has gone and the water is empty.',
    }),
    skyline: choice('What is the skyline across the water like?', {
      glass: 'Today: a dense wall of tall glass towers, sheer and blue-grey.',
      nineties: 'The early 1990s: lower, sparser blocks of concrete and tinted glass, gaps of sky.',
      billboards: 'Older harbourfront blocks crowned with giant rooftop neon billboards.',
    }),
    neon: paint('What colour dominates the rooftop neon and the light show?', ['magenta', 'turquoise', 'amber', 'red', 'lime', 'white', 'purple', 'gold', 'sky']),
    promenade: choice('Who is on the promenade?', {
      empty: 'Nobody: the granite slabs empty under the lamps.',
      strollers: 'A few people strolling and leaning on the railing.',
      tripods: 'Photographers lined up with tripods waiting for the light.',
      anglers: 'Old men fishing over the railing with long rods.',
    }),
    peakTower: noul('Can the wok-shaped Peak Tower be seen on the ridge?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const root = s.root;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const night = Math.min(1, Math.max(0, (lowSun - 0.3) / 0.7));
    const storm = a.event === 'typhoon';
    const haze = Math.min(1, mood.wear * 0.8 + (storm ? 0.45 : 0));
    const neonHex = paintHex(a.neon);
    const dusk = mood.daylight > 0.5;

    // Sky: a gradient wall far behind everything, warm toward the horizon at the ends of the day.
    const skyTop = new THREE.Color('#8fb3cf').lerp(new THREE.Color('#3b4a78'), night * 0.75).lerp(new THREE.Color('#8b9095'), storm ? 0.7 : haze * 0.3);
    const skyLow = new THREE.Color('#dfe6e6').lerp(new THREE.Color(dusk ? '#f09a62' : '#f2c0a0'), night * (0.55 + mood.warmth * 0.35)).lerp(new THREE.Color('#b9b7ad'), storm ? 0.6 : haze * 0.35);
    const background = skyTop.clone().lerp(skyLow, 0.5);
    const skyMap = canvasTexture(16, 256, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, `#${skyTop.getHexString()}`); g.addColorStop(0.75, `#${skyLow.getHexString()}`); g.addColorStop(1, `#${skyLow.clone().lerp(new THREE.Color('#ffffff'), 0.15).getHexString()}`);
      c.fillStyle = g; c.fillRect(0, 0, 16, 256);
    });
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(1400, 420), new THREE.MeshBasicMaterial({ map: skyMap, fog: false }));
    sky.position.set(0, 150, -330);
    root.add(sky);

    // Lights: a sky dome fill, a low sun or moon, and a warm city glow from the far shore at night.
    root.add(new THREE.HemisphereLight(skyTop.clone().lerp(new THREE.Color('#ffffff'), 0.4), '#4a4a50', 1.3 - night * 0.45));
    const sunColour = new THREE.Color().setHSL(mix(0.6, 0.07, mood.warmth) - lowSun * 0.02, 0.35 + lowSun * 0.3, 0.82 - night * 0.12);
    const key = new THREE.DirectionalLight(sunColour, 2.4 - night * 0.9);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.04;
    const sunSide = dusk ? 1 : -1;
    key.position.set(sunSide * 40 * (0.4 + lowSun), 18 + (1 - lowSun) * 50, 30);
    key.target.position.set(0, 0, 5);
    const sh = key.shadow.camera;
    sh.left = -50; sh.right = 50; sh.top = 40; sh.bottom = -40; sh.near = 1; sh.far = 220;
    root.add(key, key.target);
    const cityGlow = new THREE.DirectionalLight(new THREE.Color('#ffb070').lerp(new THREE.Color(neonHex), 0.3), night * 0.9);
    cityGlow.position.set(0, 10, -60);
    root.add(cityGlow);

    // ---- Near: the granite promenade, its railing and lamp standards.
    const graniteMap = canvasTexture(512, 512, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
        const g = 205 + Math.floor(random() * 40); c.fillStyle = `rgb(${g},${g - 3},${g - 8})`; c.fillRect(i * 64 + 1, j * 64 + 1, 62, 62);
        for (let k = 0; k < 40; k++) { c.fillStyle = `rgba(${random() < 0.5 ? '60,60,60' : '255,255,255'},0.18)`; c.fillRect(i * 64 + random() * 62, j * 64 + random() * 62, 2, 2); }
      }
      for (let i = 0; i < Math.round(mood.wear * 40); i++) { c.fillStyle = `rgba(40,35,30,${0.06 + random() * 0.12})`; c.beginPath(); c.ellipse(random() * 512, random() * 512, 10 + random() * 40, 6 + random() * 20, random() * 3, 0, 7); c.fill(); }
    }, true);
    graniteMap.repeat.set(30, 9);
    const wetGround = storm;
    const granite = s.material(wetGround ? '#8d8a86' : '#b9b3a8', { map: graniteMap, roughness: wetGround ? 0.2 : 0.85, metalness: wetGround ? 0.15 : 0 });
    const ground = s.box([160, 1.6, 30], [0, -0.8, 19], granite);
    ground.castShadow = false;
    s.box([160, 0.5, 0.7], [0, -0.25, 3.85], s.material('#8f8a80', { roughness: 0.8 }));
    const bandMat = s.material('#7d786f', { roughness: wetGround ? 0.25 : 0.8 });
    const bands: THREE.BufferGeometry[] = [];
    for (const z of [7.2, 17]) bands.push(new THREE.BoxGeometry(160, 0.02, 0.9).translate(0, 0.01, z));
    for (let x = -60; x <= 60; x += 6) bands.push(new THREE.BoxGeometry(0.35, 0.02, 9.8).translate(x, 0.012, 12.1));
    const paving = s.mesh(mergeGeometries(bands), bandMat); paving.castShadow = false;
    s.box([160, WATER_Y + 2.4, 0.4], [0, (WATER_Y - 0.8) / 2, 3.55], s.material('#6b6760', { roughness: 0.9 }));
    // Railing: posts and two rails along the water's edge.
    const iron = s.material('#2c3134', { metalness: 0.5, roughness: 0.45 });
    const rail: THREE.BufferGeometry[] = [];
    for (let x = -60; x <= 60; x += 1.6) rail.push(new THREE.BoxGeometry(0.07, 1.1, 0.07).translate(x, 0.55, 4.3));
    for (const y of [0.5, 1.1]) rail.push(new THREE.CylinderGeometry(0.035, 0.035, 120, 6).rotateZ(Math.PI / 2).translate(0, y, 4.3));
    s.mesh(mergeGeometries(rail.map((g) => g.toNonIndexed())), iron);
    // Lamp standards, lit as the light goes.
    const lampMat = new THREE.MeshStandardMaterial({ color: '#fff4d8', emissive: '#ffd890', emissiveIntensity: mix(0.15, 2.2, night) });
    const poles: THREE.BufferGeometry[] = [], globes: THREE.BufferGeometry[] = [];
    for (let x = -56; x <= 56; x += 12) {
      poles.push(new THREE.CylinderGeometry(0.07, 0.12, 5.2, 8).translate(x, 2.6, 5.4));
      poles.push(new THREE.CylinderGeometry(0.2, 0.25, 0.4, 8).translate(x, 0.2, 5.4));
      poles.push(new THREE.BoxGeometry(1.4, 0.06, 0.06).translate(x, 5.1, 5.4));
      for (const dx of [-0.65, 0.65]) globes.push(new THREE.SphereGeometry(0.24, 10, 8).translate(x + dx, 5.0, 5.4));
    }
    s.mesh(mergeGeometries(poles.map((g) => g.toNonIndexed())), iron);
    const globe = s.mesh(mergeGeometries(globes), lampMat); globe.castShadow = false;
    // Benches set back from the rail.
    const benchMat = s.material('#7b5b3c');
    const benches: THREE.BufferGeometry[] = [];
    for (const x of [-30, -44, 30, 46]) {
      benches.push(new THREE.BoxGeometry(2.4, 0.08, 0.6).translate(x, 0.45, 9), new THREE.BoxGeometry(2.4, 0.5, 0.06).translate(x, 0.75, 9.3));
      for (const dx of [-1, 1]) benches.push(new THREE.BoxGeometry(0.08, 0.45, 0.6).translate(x + dx, 0.22, 9));
    }
    s.mesh(mergeGeometries(benches.map((g) => g.toNonIndexed())), benchMat);

    // ---- Middle: the harbour water, wakes and the boats on it.
    const waterBase = new THREE.Color('#2c4a56').lerp(new THREE.Color('#1c2838'), night * 0.6).lerp(new THREE.Color('#57615f'), storm ? 0.5 : 0);
    const waterMap = canvasTexture(512, 512, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 512, 512);
      for (let i = 0; i < (storm ? 520 : 300); i++) {
        const x = random() * 512, y = random() * 512, w = 10 + random() * 40;
        c.strokeStyle = `rgba(${random() < 0.5 ? '255,255,255' : '120,140,150'},${0.25 + random() * 0.3})`; c.lineWidth = 1 + random() * (storm ? 3 : 1.5);
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + w / 2, y - 3, x + w, y); c.stroke();
      }
    }, true);
    waterMap.repeat.set(6, 4);
    const water = s.mesh(new THREE.PlaneGeometry(700, 140), new THREE.MeshStandardMaterial({ color: waterBase, map: waterMap, roughness: storm ? 0.5 : 0.18, metalness: 0.35 }), [0, WATER_Y, -66]);
    water.rotation.x = -Math.PI / 2;
    water.castShadow = false;
    // City reflections: vertical streaks of light on the water under the far shore.
    const streakMap = canvasTexture(1024, 256, (c) => {
      c.clearRect(0, 0, 1024, 256);
      const palette = ['#ffd08a', '#fff2d0', neonHex, '#9fd8ff', neonHex];
      for (let i = 0; i < 160; i++) {
        const x = random() * 1024, len = 40 + random() * 200, w = 2 + random() * 6;
        const g = c.createLinearGradient(0, 0, 0, len);
        const col = palette[Math.floor(random() * palette.length)];
        g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g; c.globalAlpha = 0.35 + random() * 0.5;
        for (let y = 0; y < len; y += 6) c.fillRect(x + Math.sin(y * 0.3 + i) * 2, y, w * (1 - y / len * 0.6), 3);
      }
    });
    const streaks = s.mesh(new THREE.PlaneGeometry(320, 60), new THREE.MeshBasicMaterial({ map: streakMap, transparent: true, opacity: night * 0.9, depthWrite: false, blending: THREE.AdditiveBlending }), [0, WATER_Y + 0.03, SHORE_Z + 31]);
    streaks.rotation.x = -Math.PI / 2;
    streaks.castShadow = streaks.receiveShadow = false;
    streaks.visible = night > 0.05;
    const foamMat = new THREE.MeshStandardMaterial({ color: '#eef4f6', transparent: true, opacity: 0.7, depthWrite: false, roughness: 0.9 });
    const wake = (x: number, z: number, len: number, dir: number) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(-dir * len, len * 0.22); shape.lineTo(-dir * len, len * 0.3); shape.lineTo(0, 0.6); shape.lineTo(-dir * len, -len * 0.3 + 0.6); shape.lineTo(-dir * len, -len * 0.22 + 0.6); shape.closePath();
      const m = s.mesh(new THREE.ShapeGeometry(shape), foamMat, [x, WATER_Y + 0.05, z]);
      m.rotation.x = -Math.PI / 2; m.castShadow = false;
    };
    const boats: THREE.Object3D[] = [];
    const boat = (kind: 'ferry' | 'junk' | 'barge', x: number, z: number, dir: number, size: number) => {
      const g = new THREE.Group();
      const add = (geo: THREE.BufferGeometry, mat: THREE.Material, at: [number, number, number]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...at); m.castShadow = true; g.add(m); return m; };
      if (kind === 'ferry') {
        add(new THREE.BoxGeometry(14, 1.4, 4.2), s.material('#1f5a34'), [0, 0.7, 0]);
        add(new THREE.BoxGeometry(12.4, 1.4, 4.0), s.material('#f1eee4', { emissive: '#ffd890', emissiveIntensity: night * 0.8 }), [0, 2.1, 0]);
        add(new THREE.BoxGeometry(12.8, 0.25, 4.3), s.material('#f1eee4'), [0, 3.4, 0]);
        add(new THREE.BoxGeometry(12, 0.9, 3.8), s.material('#2a6b3e'), [0, 3.0, 0]);
        add(new THREE.CylinderGeometry(0.4, 0.45, 1.4, 10), s.material('#f1eee4'), [0, 4.2, 0]);
        for (const e of [-1, 1]) add(new THREE.BoxGeometry(1.2, 0.8, 2), s.material('#f1eee4'), [e * 5.4, 3.9, 0]);
        wake(x - dir * 7 * size, z, 26 * size, dir);
      } else if (kind === 'junk') {
        add(new THREE.BoxGeometry(9, 1.3, 2.6), s.material('#5a3a22'), [0, 0.65, 0]);
        add(new THREE.BoxGeometry(2.2, 1.2, 2.6), s.material('#5a3a22'), [-4.2, 1.6, 0]);
        const sail = s.material('#9e2a1e', { side: THREE.DoubleSide, emissive: '#3a0a05', emissiveIntensity: 0.2 });
        for (const [mx, h, w] of [[2.4, 7, 3.2], [-0.4, 9, 4.2], [-3.4, 5, 2.4]] as const) {
          const shp = new THREE.Shape(); shp.moveTo(0, 0); shp.lineTo(w, 0); shp.quadraticCurveTo(w * 1.3, h * 0.5, w * 0.75, h); shp.lineTo(-0.2, h * 0.86); shp.closePath();
          const m = add(new THREE.ShapeGeometry(shp), sail, [mx + 0.3, 1.4, 0]); m.scale.x = -1;
          add(new THREE.CylinderGeometry(0.07, 0.09, h + 1, 6), s.material('#2a1a10'), [mx + 0.3, 1.3 + (h + 1) / 2, 0]);
        }
        wake(x - dir * 4.5 * size, z, 12 * size, dir);
      } else {
        add(new THREE.BoxGeometry(16, 1.3, 5), s.material('#3b3f44'), [0, 0.65, 0]);
        const cols = ['#b8432e', '#2f5d8a', '#d5a021', '#3d7a4a', '#8c8f93'];
        for (let i = 0; i < 6; i++) for (let k = 0; k < (random() < 0.5 ? 2 : 1); k++) add(new THREE.BoxGeometry(2.3, 1.2, 2.3), s.material(cols[Math.floor(random() * cols.length)]), [-5.5 + i * 2.3, 1.9 + k * 1.2, (random() - 0.5) * 1.6]);
        add(new THREE.BoxGeometry(2, 2.2, 2), s.material('#d9d4c4'), [6.5, 2.4, 0]);
        add(new THREE.BoxGeometry(4, 1, 3), s.material('#9a3a2a'), [10, 0.5, 0]);
        add(new THREE.BoxGeometry(1.6, 1.4, 1.6), s.material('#f1eee4'), [10.4, 1.7, 0]);
        wake(x - dir * 9 * size, z, 18 * size, dir);
      }
      g.scale.setScalar(size);
      if (dir < 0) g.rotation.y = Math.PI;
      g.position.set(x, WATER_Y - 0.15 * size, z);
      root.add(g);
      boats.push(g);
    };
    const crowded = 0.4 + mood.density * 0.8;
    if (a.traffic === 'ferries') { boat('ferry', -26, -38, 1, 1.1); if (crowded > 0.6) boat('ferry', 30, -55, -1, 0.95); }
    else if (a.traffic === 'junk') { boat('junk', 14, -36, -1, 1.5); if (crowded > 0.8) boat('ferry', -40, -58, 1, 0.9); }
    else if (a.traffic === 'barges') { boat('barge', -18, -44, 1, 1); boat('barge', 34, -60, -1, 0.9); }

    // ---- Far: the far shore, the dense towers, their crowns and neon.
    s.box([700, FAR_Y - WATER_Y + 0.5, 60], [0, (FAR_Y + WATER_Y) / 2 - 0.25, SHORE_Z - 30], s.material('#5d6064', { roughness: 0.9 }));
    s.box([300, 0.6, 1.2], [0, FAR_Y + 0.3, SHORE_Z + 0.4], s.material('#9a968c'));
    for (let i = 0; i < 7; i++) s.box([6, 2.4, 9], [-60 + i * 20 + random() * 6, FAR_Y - 0.8, SHORE_Z + 4], s.material('#6f7a72'));
    const windowMap = canvasTexture(64, 256, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 64, 256);
      for (let row = 0; row < 32; row++) for (let col = 0; col < 8; col++) { const g = 120 + Math.floor(random() * 70); c.fillStyle = `rgb(${g},${g + 6},${g + 14})`; c.fillRect(col * 8 + 1, row * 8 + 2, 6, 5); }
    }, true);
    const litWindows = canvasTexture(64, 256, (c) => {
      c.fillStyle = '#000000'; c.fillRect(0, 0, 64, 256);
      const share = 0.25 + mood.density * 0.4;
      for (let row = 0; row < 32; row++) { const band = random() < share; for (let col = 0; col < 8; col++) if (band ? random() < 0.8 : random() < 0.12) { c.fillStyle = random() < 0.7 ? '#ffdca0' : '#d2e8ff'; c.fillRect(col * 8 + 1, row * 8 + 2, 6, 5); } }
    }, true);
    const towerKinds = {
      glass: [{ c: '#6d8497', m: 0.55 }, { c: '#93a2ad', m: 0.6 }, { c: '#4f5f6e', m: 0.5 }],
      nineties: [{ c: '#b9b3a6', m: 0.1 }, { c: '#7f8a87', m: 0.3 }, { c: '#a08a6e', m: 0.2 }],
      billboards: [{ c: '#a9a196', m: 0.1 }, { c: '#8a8f8e', m: 0.15 }, { c: '#6c7372', m: 0.2 }],
    }[a.skyline];
    const bodyMats = towerKinds.map(({ c, m }) => {
      const map = windowMap.clone(); map.needsUpdate = true;
      const em = litWindows.clone(); em.needsUpdate = true;
      return s.material(new THREE.Color(c).lerp(skyLow, haze * 0.25), { map, emissive: '#ffd9a0', emissiveMap: em, emissiveIntensity: mix(0.02, 1.25, night), metalness: m, roughness: 0.4 });
    });
    const trimMat = s.material('#d6d8d6', { roughness: 0.5, metalness: 0.3 });
    const neonMat = new THREE.MeshStandardMaterial({ color: neonHex, emissive: neonHex, emissiveIntensity: mix(0.3, 2.6, night) * (0.6 + mood.cheer * 0.6), roughness: 0.4 });
    const heightScale = { glass: 0.74, nineties: 0.5, billboards: 0.46 }[a.skyline];
    const gaps = SKY.map(([x]) => x);
    type Tower = { x: number; z: number; w: number; d: number; h: number; m: number; filler: number };
    const towers: Tower[] = [];
    for (let row = 0; row < 3; row++) {
      let x = -170 + random() * 6;
      while (x < 170) {
        const w = 7 + random() * 9, d = 7 + random() * 7;
        const centre = Math.exp(-(((x + 5) / 70) ** 2));
        const h = (14 + random() * 22 + centre * (18 + random() * 22) + row * 6) * heightScale;
        const near = gaps.findIndex((g) => Math.abs(g - x) < 11);
        const skip = random() > 0.55 + mood.density * 0.45 + (a.skyline === 'glass' ? 0.1 : -0.1);
        if (!skip || near >= 0) towers.push({ x, z: SHORE_Z - 8 - row * 15 + (random() - 0.5) * 5, w, d, h: row === 0 && near >= 0 ? h * 0.8 : h, m: Math.floor(random() * bodyMats.length), filler: row === 0 ? near : -1 });
        x += w + 1.5 + random() * 5 * (1.3 - mood.density);
      }
    }
    // Bodies as instanced boxes per material; fillers in the cast slots are their own meshes so they can step aside.
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const fillerGroups = SKY.map(() => new THREE.Group());
    for (const g of fillerGroups) root.add(g);
    const matrix = new THREE.Matrix4();
    bodyMats.forEach((mat, mi) => {
      const list = towers.filter((t) => t.m === mi && t.filler < 0);
      const inst = new THREE.InstancedMesh(boxGeo, mat, Math.max(1, list.length));
      list.forEach((t, i) => inst.setMatrixAt(i, matrix.makeScale(t.w, t.h, t.d).setPosition(t.x, FAR_Y + t.h / 2, t.z)));
      inst.count = list.length;
      inst.instanceMatrix.needsUpdate = true;
      inst.castShadow = false; inst.receiveShadow = true;
      root.add(inst);
      for (const t of towers.filter((t) => t.m === mi && t.filler >= 0)) {
        const m = new THREE.Mesh(boxGeo, mat); m.scale.set(t.w, t.h, t.d); m.position.set(t.x, FAR_Y + t.h / 2, t.z); fillerGroups[t.filler].add(m);
      }
    });
    // Window texture repeats with each tower's own size: bake it into the instanced UVs by scaling per material.
    for (const mat of bodyMats) { mat.map!.repeat.set(1, 1); (mat.emissiveMap as THREE.Texture).repeat.set(1, 1); }
    // Crowns: pale caps, spires on a few, rooftop neon bands growing at night, billboards for the old harbourfront.
    const caps: THREE.BufferGeometry[] = [], neon: THREE.BufferGeometry[] = [], spires: THREE.BufferGeometry[] = [];
    const billboards: { t: Tower; text: string }[] = [];
    for (const t of towers) {
      const top = FAR_Y + t.h;
      const target = t.filler >= 0 ? null : caps;
      if (!target) continue;
      caps.push(new THREE.BoxGeometry(t.w * 0.7, 1.2, t.d * 0.7).translate(t.x, top + 0.6, t.z));
      if (random() < 0.5) neon.push(new THREE.BoxGeometry(t.w + 0.2, 0.5, t.d + 0.2).translate(t.x, top - 1.2, t.z));
      if (random() < 0.15 && a.skyline === 'glass') spires.push(new THREE.ConeGeometry(Math.min(t.w, t.d) * 0.35, 6 + random() * 8, 4).translate(t.x, top + 4 + random() * 2, t.z));
      if (a.skyline === 'billboards' && random() < 0.4 && t.z > SHORE_Z - 25) billboards.push({ t, text: ['SANYO', 'NATIONAL', 'SEIKO', 'CITIZEN', 'MANDARIN', 'CANON', 'GOLDLION', 'NOVA'][Math.floor(random() * 8)] });
    }
    if (caps.length) { const m = s.mesh(mergeGeometries(caps), trimMat); m.castShadow = false; }
    if (spires.length) { const m = s.mesh(mergeGeometries(spires.map((g) => g.toNonIndexed())), trimMat); m.castShadow = false; }
    if (neon.length) { const m = s.mesh(mergeGeometries(neon), neonMat); m.castShadow = false; }
    const signColours = [neonHex, '#ff3b3b', '#ffe04a', '#4fe3ff', '#ffffff'];
    for (const { t, text } of billboards.slice(0, 7)) {
      const col = signColours[Math.floor(random() * signColours.length)];
      const map = canvasTexture(512, 128, (c) => { c.fillStyle = '#101418'; c.fillRect(0, 0, 512, 128); c.fillStyle = col; c.font = 'bold 92px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 256, 68, 490); });
      const bw = Math.max(10, t.w * 1.3);
      const sign = s.mesh(new THREE.PlaneGeometry(bw, bw / 4), new THREE.MeshStandardMaterial({ color: '#ffffff', map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: mix(0.4, 1.8, night), roughness: 0.6 }), [t.x, FAR_Y + t.h + bw / 8 + 1, t.z + t.d / 2]);
      sign.castShadow = false;
      s.box([bw * 0.9, 0.2, 0.2], [t.x, FAR_Y + t.h + 0.6, t.z + t.d / 2 - 0.3], s.material('#3a3d40'));
    }

    // ---- Furthest: the Peak ridge and the haze.
    const ridge = (z: number, base: number, amp: number, tone: THREE.Color, peakX: number) => {
      const pts: THREE.Vector2[] = [new THREE.Vector2(-420, -5)];
      for (let x = -420; x <= 420; x += 6) {
        const y = base + amp * (0.35 * Math.sin(x * 0.011 + z) + 0.22 * Math.sin(x * 0.031 + 1.7) + 0.1 * Math.sin(x * 0.09)) + amp * 1.1 * Math.exp(-(((x - peakX) / 60) ** 2));
        pts.push(new THREE.Vector2(x, y));
      }
      pts.push(new THREE.Vector2(420, -5));
      const m = s.mesh(new THREE.ShapeGeometry(new THREE.Shape(pts)), s.material(tone, { roughness: 1 }), [0, 0, z]);
      m.castShadow = m.receiveShadow = false;
      return (x: number) => base + amp * (0.35 * Math.sin(x * 0.011 + z) + 0.22 * Math.sin(x * 0.031 + 1.7) + 0.1 * Math.sin(x * 0.09)) + amp * 1.1 * Math.exp(-(((x - peakX) / 60) ** 2));
    };
    const ridgeTone = new THREE.Color('#5f6f5f').lerp(skyLow, 0.35 + haze * 0.3).lerp(new THREE.Color('#2c3340'), night * 0.45);
    ridge(-240, 58, 34, ridgeTone.clone().lerp(skyLow, 0.35), 120);
    const heightAt = ridge(-175, 46, 30, ridgeTone, -40);
    if (a.peakTower) {
      const py = heightAt(-40) - 1.5;
      const peak = s.material('#d9d6cc', { emissive: '#ffe6b0', emissiveIntensity: night * 0.8 });
      s.box([5, 6, 5], [-40, py - 1, -173], peak);
      s.lathe([[0, 0], [9, 0.3], [11, 2.8], [10.5, 3.2], [6, 1.4], [0, 1.2]], peak, [-40, py + 2, -173]);
    }
    // Moon for the Mid-Autumn night.
    if (a.event === 'lanterns') {
      const moon = s.mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshBasicMaterial({ color: '#fff3d2' }), [50, 150, -320]);
      moon.castShadow = false;
    }
    // Haze bands: a sodium-orange glow over the far shore at night, grey smog by day, mist on the water when worn.
    const hazeColour = new THREE.Color('#c9c6bd').lerp(new THREE.Color('#ff9a4a'), night * (0.5 + mood.warmth * 0.4)).lerp(new THREE.Color('#9fa3a6'), storm ? 0.7 : 0);
    const hazeMap = canvasTexture(8, 128, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.65, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,1)');
      c.fillStyle = g; c.fillRect(0, 0, 8, 128);
    });
    const hazePlane = (z: number, h: number, opacity: number, y0 = WATER_Y) => {
      const m = s.mesh(new THREE.PlaneGeometry(900, h), new THREE.MeshBasicMaterial({ color: hazeColour, map: hazeMap, transparent: true, opacity, depthWrite: false }), [0, y0 + h / 2, z]);
      m.castShadow = m.receiveShadow = false;
      return m;
    };
    hazePlane(-160, 70, 0.35 + haze * 0.45);
    hazePlane(-122, 40, 0.15 + haze * 0.45);
    if (haze > 0.35) hazePlane(SHORE_Z + 10, 14 + haze * 14, (haze - 0.3) * 0.9);

    // ---- Events and moving light.
    const updates: ((time: number) => void)[] = [];
    // The light show: beams from the rooftops sweeping the sky at high energy after dark.
    if (night > 0.35 && mood.energy > 0.55) {
      const beamMat = new THREE.MeshBasicMaterial({ color: neonHex, transparent: true, opacity: 0.22 + mood.energy * 0.15, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      const white = beamMat.clone(); white.color.set('#e8f4ff');
      const sources = towers.filter((t) => t.filler < 0 && t.z > SHORE_Z - 20).sort((p, q) => q.h - p.h).slice(0, 7);
      sources.forEach((t, i) => {
        const pivot = new THREE.Group(); pivot.position.set(t.x, FAR_Y + t.h + 1, t.z);
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 2.6, 160, 8, 1, true).translate(0, 80, 0), i % 2 ? white : beamMat);
        beam.castShadow = false; pivot.add(beam); root.add(pivot);
        const phase = random() * 6, speed = mix(0.2, 0.9, mood.energy);
        pivot.rotation.set(-0.15, 0, (random() - 0.5) * 0.9);
        updates.push((time) => { pivot.rotation.z = Math.sin(time * speed + phase) * 0.55; pivot.rotation.x = -0.15 + Math.sin(time * speed * 0.7 + phase) * 0.12; });
      });
    }
    if (a.event === 'fireworks') {
      const burstGeo = new THREE.SphereGeometry(1, 6, 4);
      const colours = [neonHex, '#ffd24a', '#ff4b6a', '#7dfcff', '#ffffff'];
      for (let b = 0; b < 4 + Math.round(mood.energy * 3); b++) {
        const cx = (random() - 0.5) * 120, cy = 42 + random() * 14, cz = -55 - random() * 10, col = colours[b % colours.length];
        const sparks: { at: [number, number, number]; size: number }[] = [];
        for (let i = 0; i < 60; i++) { const th = random() * Math.PI * 2, ph = Math.acos(2 * random() - 1), r = 6 + random() * 3; sparks.push({ at: [cx + r * Math.sin(ph) * Math.cos(th), cy + r * Math.cos(ph), cz + r * Math.sin(ph) * Math.sin(th) * 0.4], size: 0.35 }); }
        const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
        const burst = s.scatter(burstGeo, mat, sparks); burst.castShadow = false;
        const phase = random() * 3;
        updates.push((time) => { const t = ((time * 0.5 + phase) % 3) / 3; mat.opacity = Math.max(0, 1 - t * 1.3); burst.scale.setScalar(0.6 + t * 0.6); burst.position.set(cx * (1 - (0.6 + t * 0.6)), cy * (1 - (0.6 + t * 0.6)), cz * (1 - (0.6 + t * 0.6))); });
      }
    }
    if (storm) {
      const drops: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 700; i++) drops.push({ at: [(random() - 0.5) * 90, random() * 30, 30 - random() * 70], size: 1 });
      const streak = new THREE.BoxGeometry(0.03, 2.2, 0.03).rotateZ(0.25);
      const rain = s.scatter(streak, new THREE.MeshBasicMaterial({ color: '#dfe7ee', transparent: true, opacity: 0.35, depthWrite: false }), drops);
      rain.castShadow = false;
      updates.push((time) => { rain.position.y = -((time * 18) % 6); rain.position.x = ((time * 5) % 1.5); });
      // Signal No. 8 board on the promenade.
      s.box([0.12, 3.2, 0.12], [-34, 1.6, 6.2], iron);
      const sig = new THREE.Shape(); sig.moveTo(-0.6, 0); sig.lineTo(0.6, 0); sig.lineTo(0, 1.1); sig.closePath();
      s.mesh(new THREE.ExtrudeGeometry(sig, { depth: 0.08, bevelEnabled: false }), s.material('#111214'), [-34, 3.3, 6.25]);
    }
    if (a.event === 'lanterns') {
      const lanterns: { at: [number, number, number]; size: number; color: string }[] = [];
      const cols = ['#e8322a', '#f2a218', '#f4e3a0', '#e05a9a'];
      for (let x = -56; x < 56; x += 12) {
        const pts: [number, number, number][] = [];
        for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push([x + t * 12, 5.0 - Math.sin(t * Math.PI) * 1.2, 5.4]); if (k > 0 && k < 10) lanterns.push({ at: [x + t * 12, 4.6 - Math.sin(t * Math.PI) * 1.2, 5.4], size: 0.28, color: cols[k % cols.length] }); }
        s.tube(pts, 0.02, iron).castShadow = false;
      }
      const lg = new THREE.SphereGeometry(1, 10, 8).scale(1, 1.2, 1);
      const lmesh = s.scatter(lg, new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ff8a40', emissiveIntensity: mix(0.2, 1.5, night) }), lanterns);
      lmesh.castShadow = false;
    }
    // People on the promenade.
    const people: ReturnType<typeof figure>[] = [];
    const crowd = a.event === 'fireworks' ? 6 : storm ? 0 : { empty: 0, strollers: 3, tripods: 3, anglers: 3 }[a.promenade];
    const spots = [-33, -26, 28, 35, -40, 40];
    for (let i = 0; i < crowd; i++) {
      const p = figure(s, {
        height: 1.6 + random() * 0.25, style: 'doll', pose: a.promenade === 'anglers' ? 'standing' : a.promenade === 'tripods' ? 'standing' : random() < 0.5 ? 'leaning' : 'walking',
        hair: (['short', 'long', 'cap', 'bun', 'hat'] as const)[Math.floor(random() * 5)], top: ['#d8322c', '#2b6fb8', '#f4f2ec', '#34363a', '#f2c21c', '#7b2fa8'][Math.floor(random() * 6)],
        bottom: '#2a3140', skin: ['#e0b48f', '#c99470', '#f0cfb1'][Math.floor(random() * 3)], gaze: 'ahead', mirror: random() < 0.5,
      });
      root.add(p.root);
      const x = spots[i % spots.length] + (random() - 0.5) * 2;
      p.root.position.set(x, 0, 5.2 + random() * 0.6);
      p.root.rotation.y = Math.PI + (random() - 0.5) * 0.6;
      if (a.promenade === 'anglers' && a.event !== 'fireworks') {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 4.5, 5).translate(0, 2.25, 0), iron);
        rod.position.set(x, 1.0, 4.9); rod.rotation.x = -0.9; root.add(rod);
      }
      if (a.promenade === 'tripods' && a.event !== 'fireworks') {
        for (let k = 0; k < 3; k++) { const an = (k / 3) * Math.PI * 2; const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.5, 4), iron); leg.position.set(x + 0.5 + Math.cos(an) * 0.18, 0.72, 4.8 + Math.sin(an) * 0.18); leg.rotation.set(Math.sin(an) * 0.2, 0, -Math.cos(an) * 0.2); root.add(leg); }
        const cam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.15, 0.12), iron); cam.position.set(x + 0.5, 1.5, 4.8); root.add(cam);
      }
      people.push(p);
    }

    // ---- Camera and placement.
    const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 900);
    const camPos = new THREE.Vector3(3, 9, 36), look = new THREE.Vector3(0, 6, -40);
    camera.position.copy(camPos); camera.lookAt(look); camera.updateProjectionMatrix();

    const place = (items: readonly Placeable[]) => {
      const used = { prom: 0, land: 0, water: 0, sky: 0 };
      for (const item of items) {
        const h = Math.max(item.height, 0.05), r = Math.max(item.radius, 0.05);
        item.holder.updateMatrixWorld(true);
        const box = visibleBounds(item.holder), size = box.getSize(new THREE.Vector3());
        const long = Math.max(size.x, size.z);
        // Long low hulls, and squat sailing craft whose masts make them as tall as they are long, go on the water.
        const hull = (long >= 2.4 * h && h >= 7.5 && long >= 12) || (h >= 12 && h < 30 && long >= 0.85 * h && long <= 1.3 * h);
        const kind = h >= 100 ? 'sky' : hull ? 'water' : h >= 12 ? 'land' : 'prom';
        let x: number, z: number, y: number, scale: number;
        if (kind === 'sky') {
          const slot = SKY[item.hero ? 0 : Math.min(SKY.length - 1, 1 + used.sky++)];
          [x, z] = slot; y = FAR_Y;
          scale = Math.min((item.hero ? 56 : 44) / h, 24 / r);
          fillerGroups[SKY.indexOf(slot)].visible = false;
        } else if (kind === 'water') {
          const slot = WATER[item.hero ? 0 : Math.min(WATER.length - 1, 1 + used.water++)];
          [x, z] = slot;
          scale = Math.min((item.hero ? 22 : 16) / long, (item.hero ? 20 : 15) / h, 2);
          y = WATER_Y - h * scale * 0.08;
        } else if (kind === 'land') {
          const slot = item.hero ? [0, 10] as const : LANDMARK[used.land++ % LANDMARK.length];
          [x, z] = slot; y = 0;
          scale = Math.min((item.hero ? 16 : 13) / h, 6 / r);
        } else {
          const slot = PROM[item.hero ? 0 : 1 + (used.prom++ % (PROM.length - 1))];
          [x, z] = slot; y = 0;
          scale = Math.min((item.hero ? 4.2 : 3.2) / h, (item.hero ? 3.4 : 2.6) / r);
          scale = Math.min(scale, 1.6);
        }
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x, y, z);
        item.holder.rotation.y = (random() - 0.5) * 0.3;
        item.holder.updateMatrixWorld(true);
      }
      camera.position.copy(camPos); camera.lookAt(look); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    };

    return {
      object: root, camera, background, capacity: 7, ground, keyLight: key, place,
      update: (dt: number, time: number) => {
        for (const fn of updates) fn(time);
        for (const p of people) p.update(dt, time);
        boats.forEach((b, i) => { b.position.y = WATER_Y - 0.15 * b.scale.x + Math.sin(time * 0.9 + i) * 0.08 * (1 + mood.energy * 2 + (storm ? 3 : 0)); b.rotation.z = Math.sin(time * 0.7 + i) * 0.01 * (1 + (storm ? 4 : 0)); });
        waterMap.offset.x = time * 0.004 * (1 + mood.energy);
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
