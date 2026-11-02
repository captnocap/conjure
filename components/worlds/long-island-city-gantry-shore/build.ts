import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Placeable, Sculpture, choice, defineWorld, disposeTree, figure, mix, visibleBounds } from '@conjure/kit';

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
const flat = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);
const Y = new THREE.Vector3(0, 1, 0);
const barGeo = (a: THREE.Vector3, b: THREE.Vector3, w: number) => {
  const dir = b.clone().sub(a), len = dir.length();
  return new THREE.BoxGeometry(w, len, w).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y, dir.normalize())).translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
};
const smooth = (t: number) => t * t * (3 - 2 * t);

const WATER_Y = -1.3, EDGE_Z = 2, SHORE_Z = -480;
// Cast spots: the lawn hero, two along the railing, a lamp spot at the pier edge, a vehicle on Center Boulevard.
const HERO = [1, 11.5] as const;
const RAIL = [[7.5, 4.8], [-3, 4.8]] as const;
const LAMP = [-6.5, 3.2] as const;
const ROAD = [12.8, 8.5] as const;
const SHORE = [[15, -7], [-6, -10]] as const;
const RIVER = [[34, -250], [-90, -340], [170, -360]] as const;

type Tower = { x: number; z: number; w: number; d: number; h: number; c: THREE.Color; top?: number };

export default defineWorld({
  questions: {
    era: choice('Which skyline stands across the river?', {
      deco: '1931: the Art Deco city, low brick and limestone blocks with the brand-new Empire State and Chrysler rising alone, smokestacks on the waterfront.',
      grit: 'The 1970s: a dense, grimy wall of boxy office slabs in brown and grey, the Citicorp wedge and the Pan Am slab, a city near broke.',
      today: 'Today: glass towers and the impossibly thin pencil supertalls of Billionaires\' Row standing over Midtown.',
    }),
    weather: choice('What is the weather on the river?', {
      clear: 'Clear air, the far towers sharp.',
      haze: 'Thick summer haze, the far towers fading into warm white.',
      snow: 'Snow falling, the lawn white, the city soft and grey.',
      fog: 'Fog rolling down the river and swallowing the towers, only the tallest tops showing.',
      storm: 'A thunderstorm over Manhattan: slate sky, lightning over the towers, rain on the pier.',
    }),
    season: choice('What time of year is it?', {
      summer: 'Summer: deep green lawn and trees in full leaf.',
      autumn: 'Autumn: the trees gone orange and gold, leaves on the planks.',
      winter: 'Winter: bare trees and pale, tired grass.',
      spring: 'Spring: fresh green and trees in pink blossom.',
    }),
    river: choice('What is floating past on the river?', {
      tug: 'A red tugboat pushing a long scow barge downriver.',
      ferry: 'A white NYC Ferry catamaran crossing with its wake.',
      nothing: 'Nothing: the river empty and flat.',
    }),
    people: choice('Who else is on the pier?', {
      empty: 'Nobody else: the pier to yourself.',
      commuters: 'Commuters hurrying along toward the ferry landing.',
      dates: 'Couples on a first date leaning together at the railing.',
      lone: 'One person alone at the far railing, looking across at the city they never quite reached.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const root = s.root;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const night = Math.min(1, Math.max(0, (lowSun - 0.25) / 0.75));
    const dusk = mood.daylight > 0.5;
    const storm = a.weather === 'storm', fogged = a.weather === 'fog', snowing = a.weather === 'snow';
    const grime = mood.wear;
    const era = a.era;

    // ---- Sky and haze colours.
    let skyTop = new THREE.Color('#8fb4d6'), skyLow = new THREE.Color('#e3eaee');
    const sunset = new THREE.Color(dusk ? '#f39a5a' : '#f2b9a4');
    skyTop.lerp(new THREE.Color(dusk ? '#56628f' : '#7182b4'), night * 0.85);
    skyLow.lerp(sunset, night * (0.55 + mood.warmth * 0.35));
    if (storm) { skyTop = new THREE.Color('#4d5662'); skyLow = new THREE.Color('#8a9198').lerp(sunset, night * 0.2); }
    if (fogged) { skyTop = new THREE.Color('#c3c8cb'); skyLow = new THREE.Color('#d9dcdd'); }
    if (snowing) { skyTop = new THREE.Color('#aab3bc'); skyLow = new THREE.Color('#dde1e4'); }
    if (a.weather === 'haze') skyLow.lerp(new THREE.Color('#f1e6cf'), 0.6);
    const haze = skyLow.clone().lerp(new THREE.Color('#a88f70'), grime * 0.45 + (era === 'grit' ? 0.15 : 0));
    const hazeAmount = { clear: 0.35, haze: 0.75, snow: 0.7, fog: 0.85, storm: 0.6 }[a.weather] + grime * 0.15;
    const background = skyTop.clone().lerp(skyLow, 0.6);
    const skyMap = canvasTexture(16, 256, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, `#${skyTop.getHexString()}`); g.addColorStop(0.72, `#${skyLow.getHexString()}`); g.addColorStop(1, `#${haze.getHexString()}`);
      c.fillStyle = g; c.fillRect(0, 0, 16, 256);
    });
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(16000, 4400), new THREE.MeshBasicMaterial({ map: skyMap, fog: false }));
    sky.position.set(0, 1400, -5600);
    root.add(sky);
    if (night > 0.4 && !storm && !fogged && !snowing) {
      const sun = new THREE.Mesh(new THREE.CircleGeometry(90, 32), new THREE.MeshBasicMaterial({ color: dusk ? '#ffcf8a' : '#ffe2c8', transparent: true, opacity: 0.85 }));
      sun.position.set(dusk ? 900 : -1500, 180 + (1 - night) * 300, -5500);
      root.add(sun);
    }

    // ---- Lights: a sky fill and a low key from the camera side, so the cast on the lawn reads.
    root.add(new THREE.HemisphereLight(skyTop.clone().lerp(new THREE.Color('#ffffff'), 0.45), '#4a4a44', 1.35 - night * 0.35));
    const key = new THREE.DirectionalLight(new THREE.Color().setHSL(mix(0.6, 0.07, mood.warmth) - lowSun * 0.02, 0.3 + lowSun * 0.35, 0.84 - night * 0.08), storm ? 1.5 : 2.5 - night * 0.6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.04;
    const side = dusk ? 1 : -1;
    key.position.set(side * (30 + lowSun * 30), 20 + (1 - lowSun) * 50, 45);
    key.target.position.set(0, 0, 4);
    const sh = key.shadow.camera;
    sh.left = -60; sh.right = 60; sh.top = 60; sh.bottom = -60; sh.near = 1; sh.far = 260;
    root.add(key, key.target);
    const glow = new THREE.DirectionalLight(new THREE.Color('#ffb070'), night * 0.5);
    glow.position.set(0, 20, -100);
    root.add(glow);

    // ---- Near ground: lawn, pier planks, cobbled Center Boulevard, the bulkhead and railing.
    const lawnTone = { summer: '#5f8a45', autumn: '#7d8a48', winter: '#9a9572', spring: '#70a050' }[a.season];
    const lawnMap = canvasTexture(256, 256, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 1400; i++) { const t = 200 + Math.floor(random() * 55); c.fillStyle = `rgb(${t},${t},${t})`; c.fillRect(random() * 256, random() * 256, 2, 3); }
    }, true);
    lawnMap.repeat.set(20, 8);
    const lawn = s.material(snowing ? '#eef1f3' : lawnTone, { map: lawnMap, roughness: 1 });
    const ground = s.box([160, 1.2, 45], [0, -0.6, 35.5], lawn);
    ground.castShadow = false;
    const planksMap = canvasTexture(256, 256, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 16; i++) { const t = 190 + Math.floor(random() * 60); c.fillStyle = `rgb(${t},${t - 8},${t - 18})`; c.fillRect(i * 16 + 1, 0, 14, 256); }
      for (let i = 0; i < Math.round(grime * 60); i++) { c.fillStyle = `rgba(40,30,25,${0.1 + random() * 0.2})`; c.beginPath(); c.ellipse(random() * 256, random() * 256, 4 + random() * 14, 3 + random() * 8, 0, 0, 7); c.fill(); }
    }, true);
    planksMap.repeat.set(40, 3);
    const deck = s.material(snowing ? '#d9dcdf' : '#9a7a58', { map: planksMap, roughness: storm ? 0.35 : 0.85 });
    s.box([160, 0.5, 11.2], [0, -0.2, EDGE_Z + 5.6], deck).castShadow = false;
    // Pier extension under the gantries, and a short landing pier on the right.
    s.box([20, 0.5, 13], [21, -0.23, EDGE_Z - 6.4], deck).castShadow = false;
    s.box([34, 0.5, 18], [-18.5, -0.23, EDGE_Z - 8.9], deck).castShadow = false;
    const cobbleMap = canvasTexture(256, 256, (c) => {
      c.fillStyle = '#5a5650'; c.fillRect(0, 0, 256, 256);
      for (let row = 0; row < 16; row++) for (let col = 0; col < 12; col++) { const t = 120 + Math.floor(random() * 60); c.fillStyle = `rgb(${t},${t - 4},${t - 10})`; c.beginPath(); c.ellipse(col * 22 + (row % 2) * 11 + 10, row * 16 + 8, 9, 6.5, 0, 0, 7); c.fill(); }
    }, true);
    cobbleMap.repeat.set(2, 10);
    s.box([6.5, 0.3, 58], [12.75, 0.08, 31], s.material(snowing ? '#c8cbcd' : '#ffffff', { map: cobbleMap, roughness: storm ? 0.3 : 0.9 })).castShadow = false;
    const kerb = s.material('#b3ada2', { roughness: 0.9 });
    s.mesh(mergeGeometries([new THREE.BoxGeometry(0.3, 0.3, 58).translate(9.4, 0.14, 31), new THREE.BoxGeometry(0.3, 0.3, 58).translate(16.1, 0.14, 31)]), kerb);
    // Old rail tracks running from the gantries inland across the planks and lawn.
    const steelDark = s.material(new THREE.Color('#1d1f22').lerp(new THREE.Color('#6a3a1e'), grime * 0.5), { metalness: 0.4, roughness: 0.6 });
    const tracks: THREE.BufferGeometry[] = [];
    for (const x0 of [-25, -12]) for (const dx of [-0.72, 0.72]) tracks.push(new THREE.BoxGeometry(0.1, 0.08, 52).translate(x0 + dx, 0.06, 16));
    s.mesh(mergeGeometries(tracks), steelDark).castShadow = false;
    // Bulkhead face down to the water, with wear-driven graffiti.
    const tags = canvasTexture(1024, 64, (c) => {
      c.fillStyle = '#8f8a80'; c.fillRect(0, 0, 1024, 64);
      for (let i = 0; i < Math.round(grime * 26); i++) {
        c.strokeStyle = ['#d6198a', '#1f5fd1', '#111', '#f4d40c', '#f4f2ec', '#2f9e44'][Math.floor(random() * 6)]; c.lineWidth = 3 + random() * 4; c.lineCap = 'round';
        const x = random() * 1000; c.beginPath(); c.moveTo(x, 40);
        for (let k = 0; k < 5; k++) c.quadraticCurveTo(x + k * 8 + 4, 10 + random() * 40, x + k * 8 + 8, 30 + random() * 20);
        c.stroke();
      }
    }, true);
    s.box([160, Math.abs(WATER_Y) + 1.5, 0.6], [0, (WATER_Y - 1.5) / 2, EDGE_Z - 0.2], s.material('#ffffff', { map: tags, roughness: 0.9 })).castShadow = false;
    // Iron railing along the pier edge, with a gap where the gantry pier runs out.
    const iron = s.material('#25282b', { metalness: 0.5, roughness: 0.5 });
    const rail: THREE.BufferGeometry[] = [];
    for (const [from, to] of [[-80, -35.5], [-1.5, 10.5], [31.5, 80]] as const) {
      for (let x = from; x <= to; x += 1.8) rail.push(new THREE.BoxGeometry(0.06, 1.1, 0.06).translate(x, 0.55, EDGE_Z + 0.25));
      for (const y of [0.35, 1.08]) rail.push(new THREE.CylinderGeometry(0.035, 0.035, to - from, 6).rotateZ(Math.PI / 2).translate((from + to) / 2, y, EDGE_Z + 0.25));
    }
    for (let x = 11; x <= 31; x += 1.8) rail.push(new THREE.BoxGeometry(0.06, 1.1, 0.06).translate(x, 0.55, EDGE_Z - 12.6));
    for (const y of [0.35, 1.08]) rail.push(new THREE.CylinderGeometry(0.035, 0.035, 20, 6).rotateZ(Math.PI / 2).translate(21, y, EDGE_Z - 12.6));
    s.mesh(mergeGeometries(rail.map(flat)), iron);
    // Lamp standards with lantern heads, lit as the light goes.
    const lampMat = new THREE.MeshStandardMaterial({ color: '#fff4d8', emissive: '#ffd890', emissiveIntensity: mix(0.1, 2.4, night) });
    const poles: THREE.BufferGeometry[] = [], heads: THREE.BufferGeometry[] = [];
    for (const x of [-52, -40, 22, 34, 46, 58]) {
      poles.push(new THREE.CylinderGeometry(0.07, 0.13, 4.6, 8).translate(x, 2.3, EDGE_Z + 1), new THREE.CylinderGeometry(0.2, 0.25, 0.5, 8).translate(x, 0.25, EDGE_Z + 1), new THREE.ConeGeometry(0.32, 0.3, 8).translate(x, 5.25, EDGE_Z + 1));
      heads.push(new THREE.CylinderGeometry(0.22, 0.16, 0.55, 8).translate(x, 4.85, EDGE_Z + 1));
    }
    s.mesh(mergeGeometries(poles.map(flat)), iron);
    s.mesh(mergeGeometries(heads), lampMat).castShadow = false;
    // Benches set back on the lawn edge, and lounge chairs Gantry Plaza is known for.
    const wood = s.material('#7b5b3c');
    const benches: THREE.BufferGeometry[] = [];
    for (const x of [-30, -20, 30, 40]) {
      benches.push(new THREE.BoxGeometry(2.2, 0.08, 0.55).translate(x, 0.45, 13.6), new THREE.BoxGeometry(2.2, 0.5, 0.06).translate(x, 0.75, 13.95));
      for (const dx of [-0.95, 0.95]) benches.push(new THREE.BoxGeometry(0.08, 0.45, 0.55).translate(x + dx, 0.22, 13.6));
    }
    s.mesh(mergeGeometries(benches.map(flat)), wood);

    // ---- Trees on the lawn, by season.
    const trunks: THREE.BufferGeometry[] = [], crowns: { at: [number, number, number]; size: number; color: THREE.ColorRepresentation }[] = [];
    const leaf = { summer: ['#3d6b34', '#4c7a3a', '#2f5a2c'], autumn: ['#d08a2a', '#b8562a', '#e0b03a'], winter: [], spring: ['#f2b8c8', '#e9a3bb', '#8fbf6a'] }[a.season];
    const treeSpots: [number, number][] = [[-44, 24], [-36, 34], [-14, 30], [-4, 40], [28, 28], [36, 38], [48, 24], [-56, 30], [8, 44]];
    for (const [x, z] of treeSpots) {
      const h = 5 + random() * 3;
      trunks.push(new THREE.CylinderGeometry(0.15, 0.25, h, 7).translate(x, h / 2, z));
      if (leaf.length) for (let k = 0; k < 5; k++) crowns.push({ at: [x + (random() - 0.5) * 2.6, h + (random() - 0.3) * 1.8, z + (random() - 0.5) * 2.6], size: 1.4 + random() * 1.1, color: snowing ? '#e9ecee' : leaf[Math.floor(random() * leaf.length)] });
      else for (let k = 0; k < 5; k++) { const an = random() * 6.28; trunks.push(barGeo(new THREE.Vector3(x, h * 0.6, z), new THREE.Vector3(x + Math.cos(an) * 2, h + random() * 1.5, z + Math.sin(an) * 2), 0.08)); }
    }
    s.mesh(mergeGeometries(trunks.map(flat)), s.material('#4a3a2c'));
    if (crowns.length) s.scatter(new THREE.IcosahedronGeometry(1, 1), s.material('#ffffff', { roughness: 0.9 }), crowns);

    // ---- The two black gantries with LONG ISLAND across their tops.
    const gantry: THREE.BufferGeometry[] = [];
    const GH = 17.5;
    for (const x0 of [-25, -12]) {
      for (const dx of [-3.8, 3.8]) for (const z of [-1.5, -12.5]) gantry.push(new THREE.BoxGeometry(0.9, GH, 0.9).translate(x0 + dx, GH / 2, z));
      for (const z of [-1.5, -12.5]) {
        gantry.push(new THREE.BoxGeometry(8.6, 1.2, 0.9).translate(x0, GH - 0.6, z), new THREE.BoxGeometry(8.6, 0.6, 0.6).translate(x0, GH - 6, z));
        gantry.push(barGeo(new THREE.Vector3(x0 - 3.8, GH - 6, z), new THREE.Vector3(x0 + 3.8, GH - 1, z), 0.35), barGeo(new THREE.Vector3(x0 + 3.8, GH - 6, z), new THREE.Vector3(x0 - 3.8, GH - 1, z), 0.35));
      }
      for (const dx of [-3.8, 3.8]) {
        gantry.push(new THREE.BoxGeometry(0.7, 1.6, 11.8).translate(x0 + dx, GH - 0.8, -7));
        for (let y = 3; y < GH - 2; y += 4.5) { gantry.push(new THREE.BoxGeometry(0.4, 0.4, 11).translate(x0 + dx, y, -7)); gantry.push(barGeo(new THREE.Vector3(x0 + dx, y, -1.5), new THREE.Vector3(x0 + dx, y + 4.5, -12.5), 0.25)); }
      }
      // Machinery house, hoist sheaves and the float bridge running out into the slip.
      gantry.push(new THREE.BoxGeometry(6, 3.2, 7).translate(x0, GH + 1.6, -7), new THREE.BoxGeometry(6.6, 0.4, 7.6).translate(x0, GH + 3.4, -7));
      gantry.push(new THREE.BoxGeometry(7, 0.8, 26).rotateX(0.04).translate(x0, WATER_Y + 1.1, -25));
      for (const dx of [-3.5, 3.5]) gantry.push(new THREE.BoxGeometry(0.3, 1.4, 26).rotateX(0.04).translate(x0 + dx, WATER_Y + 1.9, -25));
      for (const dx of [-3.4, 3.4]) gantry.push(barGeo(new THREE.Vector3(x0 + dx, GH - 3, -12.5), new THREE.Vector3(x0 + dx, WATER_Y + 2.6, -34), 0.12));
    }
    s.mesh(mergeGeometries(gantry.map(flat)), steelDark);
    const boardMap = canvasTexture(1024, 128, (c) => {
      c.fillStyle = '#16181a'; c.fillRect(0, 0, 1024, 128);
      c.fillStyle = '#f2efe6'; c.font = 'bold 96px "Liberation Sans", Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('LONG ISLAND', 512, 68, 1000);
      if (grime > 0.5) for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(110,60,30,${0.2 + random() * 0.3})`; c.fillRect(random() * 1024, random() * 128, 3 + random() * 12, 10 + random() * 40); }
    });
    s.mesh(new THREE.PlaneGeometry(24, 3).translate(-18.5, GH + 1.9, -0.9), s.material('#ffffff', { map: boardMap, roughness: 0.8 })).castShadow = false;
    s.mesh(new THREE.BoxGeometry(24.4, 3.4, 0.3).translate(-18.5, GH + 1.9, -1.15), steelDark);

    // ---- The river.
    const waterBase = skyTop.clone().lerp(new THREE.Color('#2e4048'), 0.55).lerp(new THREE.Color('#3b3a36'), grime * 0.3).lerp(new THREE.Color('#5a6266'), storm ? 0.4 : 0);
    const waterMap = canvasTexture(512, 512, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 512, 512);
      for (let i = 0; i < (storm ? 600 : 320); i++) {
        const x = random() * 512, y = random() * 512, w = 10 + random() * 40;
        c.strokeStyle = `rgba(${random() < 0.5 ? '255,255,255' : '120,140,150'},${0.25 + random() * 0.3})`; c.lineWidth = 1 + random() * (storm ? 3 : 1.5);
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + w / 2, y - 3, x + w, y); c.stroke();
      }
    }, true);
    waterMap.repeat.set(30, 14);
    const water = s.mesh(new THREE.PlaneGeometry(9000, 3200).rotateX(-Math.PI / 2).translate(0, WATER_Y, -1600 + EDGE_Z), new THREE.MeshStandardMaterial({ color: waterBase, map: waterMap, roughness: storm ? 0.45 : 0.2, metalness: 0.35 }));
    water.castShadow = false;

    // ---- Manhattan: the far shore, the generic blocks, then the landmarks.
    const towers: Tower[] = [];
    const palette = {
      deco: ['#b9a58c', '#a28a72', '#c9bba3', '#9b7e68', '#b0a28e'],
      grit: ['#8a8378', '#6f6a62', '#9a9488', '#5e5a55', '#7b6c5c'],
      today: ['#7d8fa0', '#9aa8b4', '#5e6f80', '#b9c2c8', '#6f8090'],
    }[era];
    const fade = (z: number) => Math.min(0.92, (Math.abs(z) - 450) / 2600 * (0.5 + hazeAmount) + (fogged ? 0.25 : 0));
    // Landmark positions, with their true heights, to keep the blocks in front of them lower.
    const ESB = { x: -400, z: -1950, h: era === 'deco' ? 381 : 443 }, CHR = { x: -80, z: -1120, h: 319 }, UN = { x: 60, z: -520, h: 154 };
    const marks = [ESB, CHR, ...(era !== 'deco' ? [UN] : [])];
    const pencils = era === 'today' ? [
      { x: 330, z: -1550, w: 28, h: 426, name: '432' }, { x: 700, z: -2350, w: 34, h: 472, name: 'cpt' },
      { x: 610, z: -2300, w: 18, h: 435, name: '111' }, { x: -190, z: -1220, w: 40, h: 427, name: 'van' },
    ] : [];
    const tallMarks = [...marks, ...pencils];
    const heightScale = { deco: 0.55, grit: 0.85, today: 1 }[era];
    for (let z = SHORE_Z - 30; z > -3100; z -= 40 + (Math.abs(z) - 480) * 0.05) {
      const half = (Math.abs(z) + 40) * 0.5 + 80;
      let x = -half + random() * 20;
      while (x < half) {
        const w = 20 + random() * 30 + Math.abs(z) * 0.012, d = 18 + random() * 22;
        const midtown = Math.exp(-(((x + 150) / 900) ** 2)) * Math.min(1, (Math.abs(z) - 450) / 600);
        let h = (16 + random() * 40 + midtown * (40 + random() * (era === 'deco' ? 90 : 180))) * heightScale;
        if (random() < 0.06 * (era === 'deco' ? 0.4 : 1)) h *= 1.6;
        const skip = random() > 0.5 + mood.density * 0.4 + (era === 'grit' ? 0.12 : 0) - (era === 'deco' ? 0.1 : 0);
        // Keep the view of the landmarks open.
        for (const m of tallMarks) {
          if (Math.abs(z) >= Math.abs(m.z) - 20) continue;
          const sightX = m.x * (Math.abs(z) / Math.abs(m.z));
          if (Math.abs(x - sightX) < 55 + w / 2) h = Math.min(h, m.h * (Math.abs(z) + 30) / (Math.abs(m.z) + 30) * 0.45);
          if (Math.abs(x - m.x) < 70 && Math.abs(z - m.z) < 70) h = Math.min(h, 25);
        }
        if (Math.abs(x - UN.x) < 140 && z > UN.z - 70 && era !== 'deco') h = Math.min(h, 24);
        if (!skip || midtown > 0.6) {
          const c = new THREE.Color(palette[Math.floor(random() * palette.length)]).lerp(haze, fade(z));
          towers.push({ x, z: z + (random() - 0.5) * 12, w, d, h, c, top: era === 'deco' && h > 60 && random() < 0.6 ? 0.55 + random() * 0.2 : undefined });
        }
        x += w + 2 + random() * 14 * (1.3 - mood.density);
      }
    }
    // Waterfront in 1931: smokestacks and low sheds where the UN would later rise.
    if (era === 'deco') for (let i = 0; i < 6; i++) towers.push({ x: -180 + i * 50 + random() * 20, z: SHORE_Z - 20, w: 8, d: 8, h: 40 + random() * 30, c: new THREE.Color('#6b5444').lerp(haze, fade(SHORE_Z)) });
    const boxGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const facade = canvasTexture(64, 256, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 64, 256);
      for (let row = 0; row < 40; row++) for (let col = 0; col < 6; col++) { const t = 150 + Math.floor(random() * 50); c.fillStyle = `rgb(${t},${t + 4},${t + 10})`; c.fillRect(col * 10 + 3, row * 6 + 2, 6, 3); }
    });
    const towerMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: facade, roughness: era === 'today' ? 0.45 : 0.85, metalness: era === 'today' ? 0.35 : 0.05 });
    const count = towers.length + towers.filter((t) => t.top).length;
    const blocks = new THREE.InstancedMesh(boxGeo, towerMat, count);
    let bi = 0;
    const m4 = new THREE.Matrix4();
    for (const t of towers) {
      const body = t.top ? t.h * t.top : t.h;
      blocks.setMatrixAt(bi, m4.makeScale(t.w, body, t.d).setPosition(t.x, 1.5, t.z)); blocks.setColorAt(bi++, t.c);
      if (t.top) { blocks.setMatrixAt(bi, m4.makeScale(t.w * 0.6, t.h - body, t.d * 0.6).setPosition(t.x, 1.5 + body, t.z)); blocks.setColorAt(bi++, t.c.clone().offsetHSL(0, 0, 0.03)); }
    }
    blocks.instanceMatrix.needsUpdate = true;
    if (blocks.instanceColor) blocks.instanceColor.needsUpdate = true;
    blocks.castShadow = false; blocks.receiveShadow = false;
    root.add(blocks);
    // Shore: land under the towers and the FDR Drive wall.
    s.box([9000, 4, 3000], [0, -0.5, SHORE_Z - 1500], s.material(new THREE.Color('#6b6a66').lerp(haze, 0.4), { roughness: 1 })).castShadow = false;
    s.box([3000, 3, 6], [0, 0, SHORE_Z + 2], s.material(new THREE.Color('#9a958a').lerp(haze, 0.35))).castShadow = false;

    // Landmarks as hazed silhouettes with their own lit crowns.
    const landmark = (geos: THREE.BufferGeometry[], hex: string, z: number, opts: THREE.MeshStandardMaterialParameters = {}) => {
      const m = new THREE.Mesh(mergeGeometries(geos.map(flat)), new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).lerp(haze, fade(z) * 0.5), roughness: 0.7, ...opts }));
      m.castShadow = m.receiveShadow = false;
      root.add(m);
      return m;
    };
    const crownGlow = mix(0, 1.8, night);
    {
      const { x, z } = ESB;
      const g = [
        new THREE.BoxGeometry(120, 22, 56).translate(x, 11, z), new THREE.BoxGeometry(92, 90, 50).translate(x, 67, z),
        new THREE.BoxGeometry(56, 160, 30).translate(x, 192, z), new THREE.BoxGeometry(42, 160, 42).translate(x, 192, z),
        new THREE.BoxGeometry(36, 18, 30).translate(x, 281, z), new THREE.BoxGeometry(28, 16, 24).translate(x, 298, z), new THREE.BoxGeometry(20, 16, 18).translate(x, 314, z),
      ];
      landmark(g, era === 'grit' ? '#a39a8a' : '#cfc5b3', z);
      const top = [new THREE.CylinderGeometry(6.5, 9, 40, 8).translate(x, 342, z), new THREE.CylinderGeometry(4.5, 5.8, 14, 8).translate(x, 369, z), new THREE.CylinderGeometry(1.8, 4.4, 8, 8).translate(x, 380, z)];
      if (era !== 'deco') top.push(new THREE.CylinderGeometry(0.6, 2.2, 62, 6).translate(x, 415, z));
      landmark(top, '#d8d2c4', z, { emissive: era === 'today' ? '#ffd27a' : '#fff1d6', emissiveIntensity: crownGlow });
    }
    {
      const { x, z } = CHR;
      const g = [new THREE.BoxGeometry(60, 60, 50).translate(x, 30, z), new THREE.BoxGeometry(48, 60, 40).translate(x, 90, z), new THREE.BoxGeometry(38, 118, 34).translate(x, 179, z)];
      landmark(g, '#dcd8cf', z);
      const crown: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 7; i++) crown.push(new THREE.CylinderGeometry((26 - i * 3.3) / 2 * 0.95, (28 - i * 3.3) / 2, 7, 4, 1).rotateY(Math.PI / 4).translate(x, 241 + i * 6.3, z), new THREE.SphereGeometry((26 - i * 3.3) / 2, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.8, 1).translate(x, 244 + i * 6.3, z));
      crown.push(new THREE.CylinderGeometry(0.3, 2.4, 40, 6).translate(x, 300, z));
      landmark(crown, '#e4e8ec', z, { metalness: 0.5, roughness: 0.3, emissive: '#f4f6ff', emissiveIntensity: era === 'grit' ? 0 : crownGlow * 0.8 });
    }
    if (era !== 'deco') {
      const { x, z } = UN;
      landmark([new THREE.BoxGeometry(87, UN.h, 22).translate(x, UN.h / 2, z)], '#5f8a8e', z, { metalness: 0.4, roughness: 0.25 });
      landmark([new THREE.BoxGeometry(2, UN.h, 22.4).translate(x - 44, UN.h / 2, z), new THREE.BoxGeometry(2, UN.h, 22.4).translate(x + 44, UN.h / 2, z), new THREE.BoxGeometry(88, 4, 22.4).translate(x, UN.h, z)], '#e9e6de', z);
      landmark([new THREE.CylinderGeometry(42, 46, 18, 24, 1, false, 0, Math.PI).scale(1, 1, 0.5).translate(x + 90, 9, z + 35), new THREE.BoxGeometry(110, 10, 20).translate(x + 70, 5, z + 40)], '#d8d4ca', z);
    }
    if (era === 'grit') {
      // Citicorp's slanted crown and the broad Pan Am slab behind Grand Central.
      const wedge = new THREE.Shape(); wedge.moveTo(-23, 0); wedge.lineTo(23, 0); wedge.lineTo(-23, 40); wedge.closePath();
      landmark([new THREE.BoxGeometry(46, 230, 46).translate(150, 115, -1300), new THREE.ExtrudeGeometry(wedge, { depth: 46, bevelEnabled: false }).translate(150, 230, -1323)], '#c9c6bf', -1300);
      landmark([new THREE.BoxGeometry(90, 246, 30).translate(-260, 123, -1250)], '#8f8a80', -1250);
    }
    for (const p of pencils) {
      const geos = p.name === 'van'
        ? [new THREE.CylinderGeometry(p.w * 0.35, p.w, p.h, 4).rotateY(Math.PI / 4).translate(p.x, p.h / 2, p.z)]
        : [new THREE.BoxGeometry(p.w, p.h, p.w * (p.name === '111' ? 0.7 : 1)).translate(p.x, p.h / 2, p.z)];
      landmark(geos, p.name === '432' ? '#d8d6d0' : p.name === '111' ? '#b89a7a' : '#8ea2b2', p.z, { metalness: 0.3, roughness: 0.4 });
    }

    // ---- Lit windows: emissive quads on the faces toward us, multiplying as daylight falls.
    const litShare = (0.02 + 0.5 * smooth(night)) * (0.6 + mood.density * 0.6) * (storm ? 1.1 : 1);
    const windows: THREE.Matrix4[] = [], winColours: THREE.Color[] = [];
    const warmWin = new THREE.Color('#ffd590'), coolWin = new THREE.Color('#dce9ff');
    const addWindows = (x: number, z: number, w: number, h: number, share: number) => {
      const cell = Math.max(5, Math.abs(z) / 110);
      const cols = Math.max(1, Math.floor(w / cell)), rows = Math.max(1, Math.floor((h - 4) / cell));
      for (let r = 0; r < rows; r++) {
        let on = random() < share;
        for (let col = 0; col < cols; col++) {
          if (random() < 0.3) on = random() < share;
          if (!on || windows.length > 8000) continue;
          windows.push(new THREE.Matrix4().makeScale(cell * 0.62, cell * 0.5, 1).setPosition(x - w / 2 + (col + 0.5) * (w / cols), 4 + (r + 0.5) * cell, z + 0.3));
          winColours.push((random() < 0.75 ? warmWin : coolWin).clone().multiplyScalar(0.75 + random() * 0.25).lerp(haze, fade(z) * 0.55));
        }
      }
    };
    for (const t of towers) addWindows(t.x, t.z + t.d / 2, t.w, t.top ? t.h * t.top : t.h, litShare);
    addWindows(ESB.x, ESB.z + 21, 42, 272, litShare);
    addWindows(CHR.x, CHR.z + 17, 38, 236, litShare);
    if (era !== 'deco') addWindows(UN.x, UN.z + 11, 84, UN.h, litShare * 1.2);
    for (const p of pencils) addWindows(p.x, p.z + p.w / 2, p.w, p.h * 0.95, litShare * 0.7);
    if (windows.length) {
      const winMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false }), windows.length);
      windows.forEach((m, i) => { winMesh.setMatrixAt(i, m); winMesh.setColorAt(i, winColours[i]); });
      winMesh.instanceMatrix.needsUpdate = true;
      if (winMesh.instanceColor) winMesh.instanceColor.needsUpdate = true;
      winMesh.castShadow = false;
      root.add(winMesh);
    }
    // City light streaks on the water after dark.
    if (night > 0.15) {
      const streakMap = canvasTexture(1024, 256, (c) => {
        c.clearRect(0, 0, 1024, 256);
        for (let i = 0; i < 200; i++) {
          const x = random() * 1024, len = 60 + random() * 190, w = 2 + random() * 5;
          const g = c.createLinearGradient(0, 0, 0, len);
          g.addColorStop(0, random() < 0.75 ? '#ffd08a' : '#e6f0ff'); g.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = g; c.globalAlpha = 0.3 + random() * 0.5;
          for (let y = 0; y < len; y += 5) c.fillRect(x + Math.sin(y * 0.3 + i) * 2, y, w * (1 - y / len * 0.6), 3);
        }
      });
      const streaks = s.mesh(new THREE.PlaneGeometry(1400, 420).rotateX(-Math.PI / 2).translate(0, WATER_Y + 0.05, SHORE_Z + 220), new THREE.MeshBasicMaterial({ map: streakMap, transparent: true, opacity: night * 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
      streaks.castShadow = streaks.receiveShadow = false;
    }

    // ---- Haze bands and weather over the river.
    const hazeMap = canvasTexture(8, 128, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,1)');
      c.fillStyle = g; c.fillRect(0, 0, 8, 128);
    });
    const hazePlane = (z: number, h: number, opacity: number) => {
      const m = s.mesh(new THREE.PlaneGeometry(8000, h).translate(0, WATER_Y + h / 2, z), new THREE.MeshBasicMaterial({ color: haze, map: hazeMap, transparent: true, opacity: Math.min(0.95, opacity), depthWrite: false, fog: false }));
      m.castShadow = m.receiveShadow = false;
      return m;
    };
    hazePlane(-2900, 900, 0.25 + hazeAmount * 0.4);
    if (fogged) { hazePlane(-430, 160, 0.75); hazePlane(-1000, 640, 0.9); }
    if (a.weather === 'haze') hazePlane(-900, 300, 0.4);

    const updates: ((time: number) => void)[] = [];
    if (storm) {
      const bolt = new THREE.MeshBasicMaterial({ color: '#dfe6ff', transparent: true, opacity: 0.95, depthWrite: false, fog: false });
      const pts = [new THREE.Vector3(-380 + random() * 500, 900, -1600)];
      for (let i = 0; i < 10; i++) pts.push(pts[pts.length - 1].clone().add(new THREE.Vector3((random() - 0.5) * 120, -70 - random() * 25, 0)));
      const zig = s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 4, 5), bolt);
      zig.castShadow = false;
      updates.push((time) => { zig.visible = Math.sin(time * (2 + mood.energy * 7)) > 0.1; });
    }
    if (storm || snowing) {
      const drops: THREE.Matrix4[] = [];
      for (let i = 0; i < 900; i++) drops.push(new THREE.Matrix4().makeScale(storm ? 0.03 : 0.07, storm ? 1.3 : 0.07, storm ? 0.03 : 0.07).setPosition((random() - 0.5) * 70, random() * 24, 34 - random() * 50));
      const fall = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: storm ? '#cfd8e2' : '#ffffff', transparent: true, opacity: storm ? 0.4 : 0.85, depthWrite: false }), drops.length);
      drops.forEach((m, i) => fall.setMatrixAt(i, m));
      fall.instanceMatrix.needsUpdate = true;
      fall.castShadow = false;
      root.add(fall);
      updates.push((time) => { fall.position.y = -((time * (storm ? 14 : 1.4) * (0.5 + mood.energy)) % 8); fall.position.x = storm ? (time * 3) % 2 : Math.sin(time * 0.4) * 0.8; });
    }

    // ---- What floats past.
    const boats: THREE.Object3D[] = [];
    const boat = new THREE.Group();
    const piece = (geo: THREE.BufferGeometry, mat: THREE.Material, at: [number, number, number]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...at); m.castShadow = true; boat.add(m); return m; };
    const foam = new THREE.MeshStandardMaterial({ color: '#eef4f6', transparent: true, opacity: 0.6, depthWrite: false });
    if (a.river === 'tug') {
      const red = s.material('#a82a22'), white = s.material('#f1eee4'), black = s.material('#1c1d1f');
      piece(new THREE.BoxGeometry(24, 2.2, 7), black, [0, 0.8, 0]);
      piece(new THREE.BoxGeometry(23, 1.2, 6.6), red, [0, 2.3, 0]);
      piece(new THREE.BoxGeometry(9, 3, 5.2), white, [-2, 4.3, 0]);
      piece(new THREE.BoxGeometry(5, 2.4, 4.6), white, [-1.5, 7, 0]);
      piece(new THREE.CylinderGeometry(0.8, 0.9, 3.2, 10), black, [-5, 7, 0]);
      piece(new THREE.BoxGeometry(1.2, 1.4, 7.4), s.material('#3a2a20'), [12, 1.6, 0]);
      // The scow it pushes, heaped with sand or scrap.
      piece(new THREE.BoxGeometry(60, 3, 16), s.material('#5c4a3e'), [42, 0.8, 0]);
      piece(new THREE.CylinderGeometry(2, 9, 5, 7).scale(3, 1, 0.8), s.material(grime > 0.5 ? '#6b5f55' : '#c9b48e'), [42, 4.5, 0]);
      boat.position.set(-40, WATER_Y, -150);
      boat.rotation.y = Math.PI;
      const wake = s.mesh(new THREE.PlaneGeometry(40, 18).rotateX(-Math.PI / 2).translate(-10, WATER_Y + 0.06, -150), foam);
      wake.castShadow = false;
    } else if (a.river === 'ferry') {
      const white = s.material('#f3f2ee'), blue = s.material('#1f4f8a'), orange = s.material('#ee7a12'), glass = s.material('#33424e', { roughness: 0.2 });
      for (const z of [-3.2, 3.2]) piece(new THREE.BoxGeometry(26, 2, 2.6), white, [0, 0.8, z]);
      piece(new THREE.BoxGeometry(24, 0.6, 9.2), blue, [0, 2.1, 0]);
      piece(new THREE.BoxGeometry(18, 2.6, 8.4), white, [-1, 3.7, 0]);
      piece(new THREE.BoxGeometry(18.1, 1.1, 8.5), glass, [-1, 3.9, 0]);
      piece(new THREE.BoxGeometry(6, 2, 6), white, [1, 6, 0]);
      piece(new THREE.BoxGeometry(24.2, 0.35, 9.3), orange, [0, 1.6, 0]);
      boat.position.set(40, WATER_Y, -120);
      boat.rotation.y = -0.2;
      const wake = s.mesh(new THREE.PlaneGeometry(70, 10).rotateX(-Math.PI / 2).translate(85, WATER_Y + 0.06, -110), foam);
      wake.castShadow = false;
    }
    if (boat.children.length) { root.add(boat); boats.push(boat); }

    // ---- Set-dressing people along the pier.
    const people: ReturnType<typeof figure>[] = [];
    const outfit = () => ({ top: ['#a33a3a', '#2b5f8a', '#e8e2d0', '#34363a', '#c7a03a', '#5b7a5a'][Math.floor(random() * 6)], bottom: ['#2a3140', '#3d4652', '#5a4a3a'][Math.floor(random() * 3)], skin: ['#e0b48f', '#c99470', '#8d5a3a', '#f0cfb1'][Math.floor(random() * 4)] });
    const spots: { x: number; z: number; pose: 'walking' | 'leaning' | 'standing'; turn: number }[] = [];
    if (a.people === 'commuters') for (let i = 0; i < 2 + Math.round(mood.density * 2); i++) spots.push({ x: 10 + random() * 4, z: 5.5 + i * 2.2 + random(), pose: 'walking', turn: -Math.PI / 2 + (random() - 0.5) * 0.4 });
    else if (a.people === 'dates') { spots.push({ x: 22, z: -9.9, pose: 'leaning', turn: Math.PI }, { x: 22.7, z: -9.9, pose: 'leaning', turn: Math.PI }); }
    else if (a.people === 'lone') spots.push({ x: 26, z: -9.9, pose: 'leaning', turn: Math.PI });
    for (const spot of spots) {
      const p = figure(s, { height: 1.62 + random() * 0.25, style: 'doll', pose: spot.pose, hair: (['short', 'long', 'cap', 'bun', 'hat'] as const)[Math.floor(random() * 5)], ...outfit(), mirror: random() < 0.5 });
      root.add(p.root);
      p.root.position.set(spot.x, 0, spot.z);
      p.root.rotation.y = spot.turn + (random() - 0.5) * 0.3;
      people.push(p);
    }

    // ---- Camera and placement.
    const camera = new THREE.PerspectiveCamera(56, 1, 0.5, 9000);
    const camPos = new THREE.Vector3(5, 5.4, 27), look = new THREE.Vector3(2, 36, -400);
    camera.position.copy(camPos); camera.lookAt(look); camera.updateProjectionMatrix();

    const place = (items: readonly Placeable[]) => {
      const used = { rail: 0, shore: 0, river: 0 };
      let lampTaken = false, roadTaken = false;
      for (const item of items) {
        const h = Math.max(item.height, 0.05), r = Math.max(item.radius, 0.05);
        item.holder.updateMatrixWorld(true);
        const size = visibleBounds(item.holder).getSize(new THREE.Vector3());
        const long = Math.max(size.x, size.z);
        const kind = h > 60 ? 'river' : h >= 10 ? 'shore' : (long >= 2 * h && long >= 3 && long <= 20 && !roadTaken) ? 'road' : (!item.hero && h >= 2.4 && r <= h * 0.22 && !lampTaken) ? 'lamp' : 'lawn';
        let x: number, z: number, y = 0, scale: number, turn = (random() - 0.5) * 0.3;
        if (kind === 'river') {
          [x, z] = RIVER[item.hero ? 0 : Math.min(RIVER.length - 1, 1 + used.river++)];
          scale = Math.min((item.hero ? 120 : 95) / h, (item.hero ? 55 : 42) / r);
          y = WATER_Y;
        } else if (kind === 'shore') {
          if (item.hero) { [x, z] = [HERO[0] + 2, 6]; scale = Math.min(10 / h, 8 / r, 1); }
          else { [x, z] = SHORE[used.shore++ % SHORE.length]; scale = Math.min(14 / h, 8 / r, 1); turn = -0.35; }
        } else if (kind === 'road') {
          if (item.hero) { [x, z] = HERO; } else { [x, z] = ROAD; roadTaken = true; turn = -0.6; }
          scale = Math.min(Math.max(Math.min(5.5 / long, 2.6 / h), 0.6), 1.4);
        } else if (kind === 'lamp') {
          [x, z] = LAMP; lampTaken = true;
          scale = Math.min(Math.max(5 / h, 0.6), 1.3);
        } else if (item.hero) {
          [x, z] = HERO;
          scale = Math.min(Math.max(Math.min(4.5 / h, 3.2 / r), 0.5), 1.6);
        } else {
          [x, z] = RAIL[used.rail++ % RAIL.length];
          scale = Math.min(Math.max(Math.min(2.2 / h, 1.4 / r), 0.5), 1.3);
          if (used.rail > RAIL.length) { x += (used.rail - RAIL.length) * 3; z += 3; }
        }
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x, y, z);
        item.holder.rotation.y = turn;
        item.holder.updateMatrixWorld(true);
      }
      camera.position.copy(camPos); camera.lookAt(look); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    };

    return {
      object: root, camera, background, capacity: 7, ground, keyLight: key, place,
      update: (dt: number, time: number) => {
        for (const fn of updates) fn(time);
        for (const p of people) p.update(dt, time);
        for (const [i, b] of boats.entries()) { b.position.y = WATER_Y + Math.sin(time * 0.8 + i) * 0.12 * (1 + mood.energy + (storm ? 3 : 0)); }
        waterMap.offset.x = time * 0.003 * (1 + mood.energy);
        lampMat.emissiveIntensity = mix(0.1, 2.4, night) * (1 + Math.sin(time * 13) * 0.02 * mood.energy);
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
