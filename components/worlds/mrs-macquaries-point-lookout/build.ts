import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Placeable, type World, Sculpture, choice, defineWorld, disposeTree, figure, mix, noul, paint, paintHex, visibleBounds } from '@conjure/kit';

type P3 = [number, number, number];

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

const beam = (a: P3, b: P3, t: number) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const dir = B.clone().sub(A);
  const g = new THREE.BoxGeometry(t, Math.max(dir.length(), 0.01), t);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return g;
};

/** A box whose side faces repeat a window texture every `cell` metres, roof left plain. */
const towerBox = (w: number, h: number, d: number, at: P3, cell: number, colour: THREE.Color) => {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // Six faces of six vertices: +x, -x, +y, -y, +z, -z.
  for (let f = 0; f < 6; f++) for (let v = 0; v < 6; v++) {
    const i = f * 6 + v;
    const across = f < 2 ? d : w;
    if (f === 2 || f === 3) uv.setXY(i, 0.02, 0.02);
    else uv.setXY(i, uv.getX(i) * across / cell, uv.getY(i) * h / cell);
  }
  const colours = new Float32Array(uv.count * 3);
  for (let i = 0; i < uv.count; i++) colours.set([colour.r, colour.g, colour.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  g.translate(at[0], at[1] + h / 2, at[2]);
  return g;
};

/** The Opera House shell formula, used for the small filler on Bennelong Point. */
const shellPoint = (H: number, L: number, W: number, side: number, u: number, v: number, target: THREE.Vector3) => {
  const zt = L * 1.2;
  const ridgeY = H * Math.sin(u * 1.35) / Math.sin(1.35);
  const ridgeZ = zt * Math.pow(u, 1.3);
  const width = W * Math.pow(u, 0.95);
  return target.set(side * width * (2 * v - v * v), ridgeY * (1 - v), ridgeZ + (L * u - ridgeZ) * v);
};

const WATER_Y = -2.2, FORE_Y = 1.2, CITY_Y = 0.6;
const HERO_FORE: [number, number] = [-10, -80];
const LAND = [[-30, -76], [12, -72]] as const;
const LEDGE: [number, number, number, number][] = [
  // x, z, lift, size: the hero spot in the light, two people spots, a seat on the rock, a bin or post by the path, a spare.
  [3.2, 13.5, 0, 1], [-1.4, 12.6, 0, 0.85], [8.2, 13.8, 0, 0.85], [0.6, 9.4, 0.55, 0.7], [8.8, 17.6, 0, 0.75], [-2.2, 17.2, 0, 0.8],
];
const WATER = [[-14, -32], [26, -52], [-46, -50]] as const;
const SKY = [[30, -262], [-40, -266], [-100, -270]] as const;
const BRIDGE_AT: P3 = [70, 0, -190];
const BRIDGE_YAW = 0.32;

export default defineWorld({
  questions: {
    air: choice('What is the air like over the harbour?', {
      crystal: 'Crystal clear: hard blue sky, every window on the far shore sharp.',
      seafog: 'Sea fog rolling in through the bridge, the city towers fading into white.',
      smoke: 'Bushfire smoke: an orange-brown sky, the sun a red disc, the far shore drowned in haze.',
      southerly: 'A southerly buster storm sweeping in: a dark roll of cloud, slanting rain, whitecaps on the water.',
    }),
    occasion: choice('What is the occasion?', {
      weekday: 'An ordinary weekday: joggers, commuter ferries, the city at work.',
      nye: 'New Year\'s Eve: fireworks bursting over the bridge and a waterfall of sparks pouring off its deck.',
      vivid: 'Vivid festival: coloured projections on the sails of the Opera House and beams of light over the city.',
      yachts: 'A yacht race: a fleet of sailing boats with bright spinnakers ballooning across the harbour.',
      anzac: 'Anzac dawn: a grey warship at anchor, a flag at half-mast on the point, quiet and solemn.',
    }),
    leadColour: paint('If there are fireworks, projections or spinnakers, what colour leads them?', ['red', 'magenta', 'gold', 'turquoise', 'blue', 'purple', 'orange', 'lime', 'white']),
    water: choice('What else moves on the water?', {
      ferries: 'Green-and-cream ferries crossing with long white wakes.',
      sailing: 'Small white yachts and a few kayaks dotted about.',
      tug: 'A working tug and a water taxi cutting across.',
      empty: 'Nothing: the water empty and glassy.',
    }),
    jacaranda: noul('Is it jacaranda season, purple blossom on the trees around the harbour?'),
    lawn: choice('Who is on the grass of the point?', {
      empty: 'Nobody: the mown grass empty.',
      picnic: 'Picnic rugs laid out with a couple of people sitting on them.',
      joggers: 'Joggers and a cyclist going by on the path.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const root = s.root;
    const { mood, random } = context;
    const anzac = a.occasion === 'anzac';
    // Anzac dawn pulls the light toward first light whatever the mood says.
    const daylight = anzac ? Math.min(mood.daylight, 0.12) : mood.daylight;
    const lowSun = Math.abs(daylight - 0.5) * 2;
    const night = Math.min(1, Math.max(0, (lowSun - 0.3) / 0.7)) * (a.occasion === 'nye' || a.occasion === 'vivid' ? 1 : 0.85);
    const eveningLights = a.occasion === 'nye' || a.occasion === 'vivid' ? Math.max(0.55, night) : night;
    const smoke = a.air === 'smoke', fog = a.air === 'seafog', storm = a.air === 'southerly';
    const lead = paintHex(a.leadColour);
    const updates: ((time: number, dt: number) => void)[] = [];
    const energy = 0.2 + mood.energy;

    // ----- sky and haze -----
    const noonSky = new THREE.Color('#bcd7ee');
    const dawnSky = new THREE.Color('#f0c9a8').lerp(new THREE.Color('#e8a98a'), mood.warmth * 0.4);
    const duskSky = new THREE.Color('#b494b4').lerp(new THREE.Color('#e49a72'), mood.warmth * 0.6);
    let sky = noonSky.clone().lerp(daylight < 0.5 ? dawnSky : duskSky, Math.pow(lowSun, 1.2));
    sky.lerp(new THREE.Color('#8e8478'), night * 0.35);
    if (smoke) sky = sky.lerp(new THREE.Color('#c9884e'), 0.75);
    if (fog) sky = sky.lerp(new THREE.Color('#e4e6e3'), 0.7);
    if (storm) sky = sky.lerp(new THREE.Color('#7f8a93'), 0.65);
    // Wear dusts the far line toward bushfire orange.
    sky.lerp(new THREE.Color('#d39a62'), mood.wear * 0.3);
    const background = sky.clone();
    const haze = sky.clone().lerp(new THREE.Color('#ffffff'), fog ? 0.35 : 0.12);
    const hazeFar = fog ? 0.85 : smoke ? 0.78 : storm ? 0.55 : 0.32 + mood.wear * 0.25;
    const hazed = (colour: THREE.ColorRepresentation, amount: number) => new THREE.Color(colour).lerp(haze, Math.min(0.94, amount));
    // A gradient backdrop behind everything.
    const skyMap = canvasTexture(8, 256, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 256);
      const top = sky.clone().lerp(new THREE.Color(smoke ? '#8a5a3a' : storm ? '#4e5a64' : '#7aa8d8'), smoke || storm ? 0.4 : (1 - lowSun) * 0.45 + 0.05);
      g.addColorStop(0, top.getStyle()); g.addColorStop(0.75, sky.getStyle()); g.addColorStop(1, haze.getStyle());
      c.fillStyle = g; c.fillRect(0, 0, 8, 256);
    });
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2400, 700), new THREE.MeshBasicMaterial({ map: skyMap, depthWrite: false, fog: false }));
    backdrop.position.set(0, 200, -620);
    root.add(backdrop);
    // The sun or a red smoke-sun.
    if (smoke || lowSun > 0.55) {
      const sunColour = smoke ? '#d8371f' : daylight < 0.5 ? '#ffd9a0' : '#ffb070';
      const sun = new THREE.Mesh(new THREE.CircleGeometry(smoke ? 16 : 14, 32), new THREE.MeshBasicMaterial({ color: sunColour, transparent: true, opacity: smoke ? 0.95 : 0.85, depthWrite: false }));
      // Mornings rise over the water to the right; evenings set behind the bridge and the city.
      sun.position.set(daylight < 0.5 ? 260 : 120, smoke ? 120 : mix(150, 40, lowSun), -600);
      root.add(sun);
    }

    // ----- water -----
    const waterBase = new THREE.Color('#2f6f9a').lerp(sky, 0.3 + (storm ? 0.3 : 0)).lerp(new THREE.Color('#1d3a52'), night * 0.5);
    if (smoke) waterBase.lerp(new THREE.Color('#7a5034'), 0.4);
    const waterMap = canvasTexture(256, 256, (c) => {
      c.fillStyle = waterBase.getStyle(); c.fillRect(0, 0, 256, 256);
      for (let k = 0; k < 500; k++) {
        const lighter = random() < 0.55;
        c.fillStyle = lighter ? `rgba(255,255,255,${0.05 + random() * 0.1})` : `rgba(0,20,40,${0.06 + random() * 0.08})`;
        c.fillRect(random() * 256, random() * 256, 8 + random() * 26, 1.5);
      }
    }, true);
    waterMap.repeat.set(30, 30);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1000), new THREE.MeshStandardMaterial({ map: waterMap, roughness: storm ? 0.5 : 0.25, metalness: 0.15 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, WATER_Y, -300);
    water.receiveShadow = true;
    root.add(water);
    updates.push((time) => { waterMap.offset.x = time * 0.003 * energy; });
    if (storm) {
      const caps: { at: P3; size: number }[] = [];
      for (let k = 0; k < 260; k++) caps.push({ at: [(random() - 0.5) * 220, WATER_Y + 0.05, 4 - random() * 160], size: 0.6 + random() * 1.4 });
      s.scatter(new THREE.BoxGeometry(1.4, 0.05, 0.35), new THREE.MeshBasicMaterial({ color: '#eef2f2' }), caps).castShadow = false;
    }

    // ----- the near point: sandstone shelf, sea wall, mown grass, the path -----
    const wear = mood.wear;
    const sandstone = new THREE.Color('#d6a463').lerp(new THREE.Color('#8f7d66'), wear * 0.45);
    const layered = canvasTexture(128, 256, (c) => {
      let y = 0;
      while (y < 256) {
        const h = 6 + random() * 26;
        c.fillStyle = sandstone.clone().offsetHSL((random() - 0.5) * 0.02, (random() - 0.5) * 0.08, (random() - 0.5) * 0.1).getStyle();
        c.fillRect(0, y, 128, h); y += h;
      }
      for (let k = 0; k < 5; k++) { c.strokeStyle = `rgba(130,52,22,${0.3 + random() * 0.3})`; c.lineWidth = 2 + random() * 3; const y0 = random() * 256; c.beginPath(); for (let x = -8; x <= 136; x += 8) c.lineTo(x, y0 + Math.sin(x / 20 + k) * 10); c.stroke(); }
      c.fillStyle = `rgba(60,58,50,${wear * 0.35})`; for (let k = 0; k < 300 * wear; k++) c.fillRect(random() * 128, random() * 256, 3, 3);
    }, true);
    const stone = new THREE.MeshStandardMaterial({ map: layered, roughness: 0.92 });
    const rocks: THREE.BufferGeometry[] = [];
    const rock = (size: P3, at: P3) => {
      const g = new RoundedBoxGeometry(size[0], size[1], size[2], 3, Math.min(...size) * 0.3).toNonIndexed();
      g.translate(...at);
      const pos = g.attributes.position as THREE.BufferAttribute;
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        pos.setXYZ(i, x + Math.sin(y * 2.1 + z * 1.3) * 0.12, y + Math.sin(x * 1.7 + z * 0.9) * 0.06, z + Math.sin(x * 1.3 + y * 2.7) * 0.12);
        uv.setXY(i, (x + z) * 0.12, y * 0.16);
      }
      rocks.push(g);
    };
    // The shelf stepping down to the water and boulders along it.
    rock([90, 1.6, 6], [0, -0.85, 9.5]);
    rock([90, 1.8, 4.5], [0, -2.0, 5]);
    for (let k = 0; k < 16; k++) rock([2 + random() * 3.5, 0.8 + random() * 0.8, 1.6 + random() * 2], [-30 + k * 4 + random() * 2, -0.1 - random() * 0.4, 7.5 + random() * 3]);
    rock([2.6, 1.1, 2.0], [0.6, 0.0, 9.4]);
    s.mesh(mergeGeometries(rocks), stone);
    // The low sea wall of dressed blocks along the water's edge, with a coping.
    const wallMap = canvasTexture(256, 64, (c) => {
      c.fillStyle = sandstone.clone().multiplyScalar(0.78).getStyle(); c.fillRect(0, 0, 256, 64);
      for (let row = 0; row < 2; row++) for (let col = 0; col < 5; col++) {
        c.fillStyle = sandstone.clone().offsetHSL(0, (random() - 0.5) * 0.05, (random() - 0.5) * 0.08).getStyle();
        c.fillRect(col * 56 + (row % 2) * 28 - 28 + 1, row * 32 + 1, 54, 30);
        c.fillRect(col * 56 + (row % 2) * 28 + 28 + 1, row * 32 + 1, 54, 30);
      }
      const g = c.createLinearGradient(0, 64, 0, 30); g.addColorStop(0, 'rgba(40,50,40,0.5)'); g.addColorStop(1, 'rgba(40,50,40,0)'); c.fillStyle = g; c.fillRect(0, 30, 256, 34);
    }, true);
    wallMap.repeat.set(40, 1);
    s.box([160, 2.6, 0.9], [0, WATER_Y + 1.3, 2.6], new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.9 }));
    s.box([160, 0.25, 1.1], [0, WATER_Y + 2.72, 2.6], s.material(sandstone.clone().lerp(new THREE.Color('#ffffff'), 0.15)));
    // Mown grass in stripes, the path of pale paving.
    const grassColour = new THREE.Color('#6f9a3e').lerp(new THREE.Color('#a4a060'), wear * 0.5 + (smoke ? 0.2 : 0));
    const grassMap = canvasTexture(128, 128, (c) => {
      for (let k = 0; k < 8; k++) { c.fillStyle = grassColour.clone().offsetHSL(0, 0, k % 2 ? 0.04 : -0.03).getStyle(); c.fillRect(k * 16, 0, 16, 128); }
      for (let k = 0; k < 700; k++) { c.fillStyle = `rgba(30,50,10,${random() * 0.25})`; c.fillRect(random() * 128, random() * 128, 1, 3); }
    }, true);
    grassMap.repeat.set(12, 6);
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(200, 60), new THREE.MeshStandardMaterial({ map: grassMap, roughness: 0.95 }));
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(0, -0.02, 42);
    grass.receiveShadow = true;
    const ground = new THREE.Group();
    ground.add(grass);
    root.add(ground);
    const path = s.box([200, 0.06, 2.4], [0, 0.0, 16], s.material('#d9cdb4', { roughness: 0.9 }));
    void path;

    // ----- the Moreton Bay fig, framing the view from the left -----
    const bark = s.material(new THREE.Color('#857767').lerp(new THREE.Color('#5d564c'), wear * 0.4), { roughness: 0.95 });
    const leafColour = new THREE.Color('#2e5a2c').lerp(new THREE.Color('#556b3a'), wear * 0.3);
    const fx = -6.5, fz = 14.5;
    s.lathe([[2.6, 0], [1.6, 0.6], [1.2, 1.6], [1.05, 3.2], [1.2, 4.4], [0, 4.6]], bark, [fx, -0.2, fz]);
    for (let k = 0; k < 9; k++) {
      const t = (k / 9) * Math.PI * 2 + random() * 0.4;
      s.tube([[fx + Math.cos(t) * 0.8, 2.2, fz + Math.sin(t) * 0.8], [fx + Math.cos(t) * 1.9, 0.7, fz + Math.sin(t) * 1.9], [fx + Math.cos(t) * (3 + random() * 1.5), 0.05, fz + Math.sin(t) * (3 + random() * 1.5)]], 0.28, bark);
    }
    const limbs: P3[][] = [
      [[fx, 4, fz], [fx + 2.5, 6.6, fz - 0.5], [fx + 5, 8.4, fz - 1.6], [fx + 6.5, 10.2, fz - 2.4]],
      [[fx, 4, fz], [fx - 1.5, 6.6, fz + 0.5], [fx - 3.5, 8.6, fz - 0.4]],
      [[fx, 4.2, fz], [fx + 0.8, 7.5, fz - 1.5], [fx + 2.6, 10, fz - 2.6]],
      [[fx + 2.5, 6.6, fz - 0.5], [fx + 3.2, 9.2, fz + 1.2], [fx + 3.6, 11, fz + 1.4]],
    ];
    for (const limb of limbs) s.tube(limb, 0.45, bark);
    // Aerial roots hanging from the limbs.
    const crown: { at: P3; size: number; color: string }[] = [];
    for (let k = 0; k < 40; k++) {
      const x = fx - 7 + random() * 12, y = 10 + random() * 4.5 - Math.max(0, x - fx - 4) * 0.3, z = fz - 4 + random() * 6;
      crown.push({ at: [x, y, z], size: 1.2 + random() * 1.1, color: leafColour.clone().offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.08).getStyle() });
    }
    s.scatter(new THREE.IcosahedronGeometry(1, 1), s.material('#ffffff', { roughness: 0.85, flatShading: true }), crown);
    // Jacarandas on the point and purple dots on the far shore.
    const blossom = '#8f6fd0';
    if (a.jacaranda) {
      for (const [x, z] of [[22, 30], [-24, 34], [34, 24]] as const) {
        s.cylinder(0.25, 0.4, 4, [x, 2, z], bark, 8);
        const puffs: { at: P3; size: number; color: string }[] = [];
        for (let k = 0; k < 12; k++) puffs.push({ at: [x + (random() - 0.5) * 6, 5 + random() * 2.5, z + (random() - 0.5) * 5], size: 1.4 + random(), color: new THREE.Color(blossom).offsetHSL(0, 0, (random() - 0.5) * 0.1).getStyle() });
        s.scatter(new THREE.IcosahedronGeometry(1, 1), s.material('#ffffff', { roughness: 0.8, flatShading: true }), puffs);
      }
      const fallen: { at: P3; size: number }[] = [];
      for (let k = 0; k < 140; k++) fallen.push({ at: [(random() - 0.5) * 40, 0.02, 14 + random() * 20], size: 0.12 + random() * 0.12 });
      s.scatter(new THREE.CircleGeometry(1, 5).rotateX(-Math.PI / 2), s.material(blossom, { side: THREE.DoubleSide }), fallen).castShadow = false;
    }

    // ----- Bennelong Point forecourt and its filler sails -----
    const foreStone = s.material(sandstone.clone().lerp(new THREE.Color('#c9b08c'), 0.4), { roughness: 0.9 });
    const fore = new THREE.Shape();
    const fp: [number, number][] = [[-36, -60], [12, -58], [20, -74], [14, -104], [-28, -108], [-42, -86]];
    fore.moveTo(fp[0][0], -fp[0][1]);
    for (const [x, z] of fp.slice(1)) fore.lineTo(x, -z);
    const foreGeo = new THREE.ExtrudeGeometry(fore, { depth: FORE_Y - WATER_Y + 1, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, WATER_Y - 1, 0);
    s.mesh(foreGeo, foreStone);
    // The headland behind it (the Botanic Garden edge) with trees, and Circular Quay's wharves to the left.
    const treeCol = hazed('#3b5e34', 0.25 + hazeFar * 0.2);
    const gardenTrees: { at: P3; size: number; color: string }[] = [];
    for (let k = 0; k < 40; k++) gardenTrees.push({ at: [-130 + random() * 80, 1 + random() * 3, -60 - random() * 70], size: 4 + random() * 4, color: (a.jacaranda && k % 5 === 0 ? hazed(blossom, 0.3) : treeCol).getStyle() });
    s.scatter(new THREE.IcosahedronGeometry(1, 1), s.material('#ffffff', { roughness: 0.9, flatShading: true }), gardenTrees);
    s.box([90, 3, 80], [-100, WATER_Y + 1.6, -95], s.material(hazed('#6f7d4e', 0.3)));
    const vivid = a.occasion === 'vivid';
    const fillerShells = new THREE.Group();
    root.add(fillerShells);
    const shellMat = new THREE.MeshStandardMaterial({
      color: '#f2ede0', roughness: 0.35, side: THREE.DoubleSide,
      emissive: vivid ? lead : '#ffe3b8', emissiveIntensity: vivid ? mix(0.7, 1.6, eveningLights) : mix(0, 0.5, eveningLights),
    });
    const podium = s.material(hazed('#b39478', 0.12), { roughness: 0.85 });
    fillerShells.add(s.box([40, 4, 30], [0, 2, 0], podium));
    for (const [cx, heights] of [[-8, [10, 15, 20]], [9, [8, 12, 16]]] as const) {
      let zb = -12;
      heights.forEach((H) => {
        const L = H * 0.85, W = H * 0.38;
        for (const side of [-1, 1]) {
          const mesh = s.surface((u, v, t) => shellPoint(H, L, W, side, u, v, t), shellMat, { segments: [18, 8], at: [cx, 4, zb] });
          s.root.remove(mesh); fillerShells.add(mesh);
        }
        zb += L * 0.68;
      });
    }
    fillerShells.position.set(HERO_FORE[0], FORE_Y, HERO_FORE[1]);
    fillerShells.rotation.y = 0.9;
    fillerShells.scale.setScalar(1);

    // ----- the far line: the city towers, Sydney Tower's spindle, the North Shore -----
    const windowMap = canvasTexture(64, 64, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 64, 64);
      c.fillStyle = '#8c98a2';
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) c.fillRect(x * 16 + 2, y * 16 + 3, 12, 9);
    }, true);
    const glowMap = canvasTexture(64, 64, (c) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (random() < 0.6) { c.fillStyle = random() < 0.8 ? '#ffd394' : '#cfe4ff'; c.fillRect(x * 16 + 2, y * 16 + 3, 12, 9); }
    }, true);
    const towerMat = new THREE.MeshStandardMaterial({ map: windowMap, vertexColors: true, emissive: '#ffd394', emissiveMap: glowMap, emissiveIntensity: mix(0, 1.1, eveningLights) * (1 - hazeFar * 0.4), roughness: 0.45, metalness: 0.15 });
    const towers: THREE.BufferGeometry[] = [];
    const cityPalette = ['#7d8e9c', '#5f7384', '#a7a49a', '#8c98a2', '#c9ccd1', '#4f6070', '#b8ae98'];
    const fillerTowers = new THREE.Group();
    root.add(fillerTowers);
    for (let k = 0; k < 52; k++) {
      const x = -190 + k * 4.6 + (random() - 0.5) * 3;
      if (x > 46) break;
      const centre = Math.exp(-((x - 5) ** 2) / 3000);
      const h = 16 + random() * 26 + centre * (30 + 30 * random());
      const w = 6 + random() * 7, d = 6 + random() * 7;
      const z = -255 - random() * 18;
      const colour = hazed(cityPalette[Math.floor(random() * cityPalette.length)], hazeFar * 0.7);
      towers.push(towerBox(w, h, d, [x, CITY_Y, z], 2.6, colour));
    }
    // A lower line of older buildings along the Quay in front.
    for (let k = 0; k < 30; k++) {
      const x = -170 + k * 6 + (random() - 0.5) * 3;
      const h = 5 + random() * 9, w = 5 + random() * 4;
      towers.push(towerBox(w, h, 6, [x, CITY_Y, -228 - random() * 8], 2.2, hazed(['#d6c6a8', '#c7b79c', '#e0d6c2'][k % 3], hazeFar * 0.7)));
    }
    s.mesh(mergeGeometries(towers), towerMat);
    // North Shore: low hazy hills behind the bridge with a cluster of towers.
    const hillColour = hazed('#4f6a48', hazeFar * 0.95);
    for (let k = 0; k < 7; k++) s.ball([60 + random() * 40, 14 + random() * 10, 30], [40 + k * 55, CITY_Y - 4, -330 - random() * 30], s.material(hillColour, { roughness: 1 }), 16);
    const north: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 12; k++) north.push(towerBox(6 + random() * 5, 10 + random() * 22, 7, [120 + k * 6 + random() * 3, CITY_Y + 2, -300 - random() * 10], 2.6, hazed('#b9bec2', hazeFar * 0.95)));
    s.mesh(mergeGeometries(north), towerMat);
    // Sydney Tower's spindle: a set piece that steps aside if a very tall landmark joins the line.
    const spindle = new THREE.Group();
    root.add(spindle);
    const spindleGold = s.material(hazed('#d4a537', hazeFar * 0.5), { metalness: 0.5, roughness: 0.35, emissive: '#ffb64a', emissiveIntensity: mix(0, 0.8, eveningLights) });
    const spindleGrey = s.material(hazed('#c8c5bd', hazeFar * 0.75));
    for (const m of [
      s.cylinder(1.1, 1.3, 70, [0, 35, 0], spindleGrey, 10),
      s.cylinder(1.1, 6, 6, [0, 25, 0], spindleGrey, 12),
      s.cylinder(4.6, 3.2, 2.2, [0, 71, 0], spindleGold, 20),
      s.cylinder(4.9, 4.9, 4.6, [0, 74.4, 0], spindleGold, 20),
      s.cylinder(4.4, 4.6, 1.6, [0, 77.5, 0], spindleGold, 20),
      s.cylinder(0.25, 0.7, 14, [0, 85, 0], spindleGrey, 8),
    ]) { s.root.remove(m); spindle.add(m); }
    spindle.position.set(SKY[0][0], CITY_Y, SKY[0][1]);

    // ----- the Harbour Bridge, the set's own arch -----
    const setBridge = new THREE.Group();
    root.add(setBridge);
    const steelCol = hazed('#8d959a', hazeFar * 0.55);
    const steel = s.material(steelCol, { roughness: 0.6, metalness: 0.3 });
    const HALF = 58, TOP = 31, BOT = 26, DECK = 11;
    const topY = (x: number) => TOP - 17 * (x / HALF) ** 2, botY = (x: number) => BOT - 25 * (x / HALF) ** 2;
    const parts: THREE.BufferGeometry[] = [];
    for (const z of [-3.5, 3.5]) for (let i = 0; i < 16; i++) {
      const x0 = -HALF + (i / 16) * HALF * 2, x1 = -HALF + ((i + 1) / 16) * HALF * 2;
      parts.push(beam([x0, topY(x0), z], [x1, topY(x1), z], 0.8), beam([x0, botY(x0), z], [x1, botY(x1), z], 1.0));
      parts.push(beam([i % 2 ? x0 : x1, botY(i % 2 ? x0 : x1), z], [i % 2 ? x1 : x0, topY(i % 2 ? x1 : x0), z], 0.45));
      parts.push(beam([x0, botY(x0), z], [x0, topY(x0), z], 0.45));
      if (botY(x0) > DECK + 1) parts.push(beam([x0, DECK, z], [x0, botY(x0), z], 0.3));
    }
    for (let i = 0; i <= 16; i++) { const x = -HALF + (i / 16) * HALF * 2; parts.push(beam([x, topY(x), -3.5], [x, topY(x), 3.5], 0.35)); }
    const bridgeSteel = s.mesh(mergeGeometries(parts), steel);
    s.root.remove(bridgeSteel); setBridge.add(bridgeSteel);
    const deck = s.box([HALF * 2 + 60, 1.2, 10], [0, DECK - 0.6, 0], s.material(hazed('#5d6266', hazeFar * 0.5)));
    s.root.remove(deck); setBridge.add(deck);
    const pylonMat = s.material(hazed('#bba98a', hazeFar * 0.5), { roughness: 0.9 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const p = s.box([9, 21, 5], [sx * (HALF + 5), 10.5, sz * 7.5], pylonMat);
      s.root.remove(p); setBridge.add(p);
    }
    // Deck lamps and arch lights glowing toward night.
    const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd27a').multiplyScalar(0.4 + eveningLights * 0.8) });
    const lamps: { at: P3; size: number }[] = [];
    for (let x = -HALF - 25; x <= HALF + 25; x += 4) for (const z of [-5, 5]) lamps.push({ at: [x, DECK + 0.8, z], size: 1 });
    for (let i = 0; i <= 32; i++) { const x = -HALF + (i / 32) * HALF * 2; lamps.push({ at: [x, topY(x) + 0.6, -3.5], size: 0.8 }); }
    if (eveningLights > 0.25) { const lampMesh = s.scatter(new THREE.SphereGeometry(0.35, 6, 4), lampMat, lamps); lampMesh.castShadow = false; s.root.remove(lampMesh); setBridge.add(lampMesh); }
    setBridge.position.set(...BRIDGE_AT);
    setBridge.rotation.y = BRIDGE_YAW;
    // Flags on the summit.
    const flagPole = s.cylinder(0.12, 0.12, 5, [0, TOP + 2.5, 0], steel, 6); s.root.remove(flagPole); setBridge.add(flagPole);
    const flag = s.box([3.2, 1.6, 0.05], [1.7, TOP + 4.2, 0], s.material('#1b2a6b')); s.root.remove(flag); setBridge.add(flag);

    // ----- the occasion -----
    const glints: THREE.Material[] = [];
    if (a.occasion === 'nye') {
      const burstColours = [lead, '#ffd34a', '#ff4fa3', '#62d9ff', '#ffffff'];
      const rays = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 1, 0.35), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false }), 9 * 40);
      const m = new THREE.Matrix4();
      let r = 0;
      for (let b = 0; b < 9; b++) {
        const c = new THREE.Vector3(BRIDGE_AT[0] - 80 + random() * 150, 45 + random() * 45, BRIDGE_AT[2] + 20 - random() * 40);
        const colour = new THREE.Color(burstColours[b % burstColours.length]);
        const radius = 9 + random() * 8;
        for (let k = 0; k < 40; k++) {
          const dir = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
          m.compose(c.clone().addScaledVector(dir, radius * 0.55), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir), new THREE.Vector3(1, radius * 0.7, 1));
          rays.setMatrixAt(r, m); rays.setColorAt(r, colour); r++;
        }
      }
      root.add(rays);
      glints.push(rays.material as THREE.Material);
      // The waterfall pouring off the deck.
      const fall = new THREE.InstancedMesh(new THREE.BoxGeometry(0.25, 1, 0.25), new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.85, depthWrite: false }), 200);
      for (let k = 0; k < 200; k++) {
        const x = -HALF + random() * HALF * 2, len = 4 + random() * (DECK - 4 - WATER_Y);
        m.compose(new THREE.Vector3(x, DECK - 1.2 - len / 2, 5.4), new THREE.Quaternion(), new THREE.Vector3(1, len, 1));
        fall.setMatrixAt(k, m);
      }
      setBridge.add(fall);
      glints.push(fall.material as THREE.Material);
    }
    if (vivid) {
      const beams: THREE.Mesh[] = [];
      for (let k = 0; k < 6; k++) {
        const beamMesh = new THREE.Mesh(new THREE.CylinderGeometry(3, 0.6, 220, 10, 1, true), new THREE.MeshBasicMaterial({ color: k % 2 ? lead : '#ffffff', transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
        beamMesh.position.set(-150 + k * 32, CITY_Y + 100, -262);
        beamMesh.rotation.z = (random() - 0.5) * 0.5;
        root.add(beamMesh);
        beams.push(beamMesh);
      }
      updates.push((time) => beams.forEach((b, i) => { b.rotation.z = Math.sin(time * 0.3 * energy + i) * 0.35; }));
    }
    const boats: THREE.Object3D[] = [];
    const sailBoat = (x: number, z: number, size: number, sailColour: string | null) => {
      const g = new THREE.Group();
      g.position.set(x, WATER_Y, z);
      g.rotation.y = random() * Math.PI * 2;
      root.add(g);
      const hullMesh = s.box([1.4 * size, 0.6 * size, 4.4 * size], [0, 0.2 * size, 0], s.material('#f4f2ec'));
      const mast = s.rod([0, 0.5 * size, 0.3 * size], [0, 7 * size, 0.3 * size], 0.05 * size, s.material('#c9ccd1'));
      const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(0, 6.2 * size); shape.lineTo(2.6 * size, 0); shape.closePath();
      const main = s.mesh(new THREE.ShapeGeometry(shape), s.material('#f7f6f0', { side: THREE.DoubleSide }), [0, 0.8 * size, 0.3 * size]);
      main.rotation.y = Math.PI / 2;
      const parts2: THREE.Object3D[] = [hullMesh, mast, main];
      if (sailColour) {
        const spin = s.ball([1.9 * size, 2.4 * size, 1.2 * size], [0, 4 * size, -2.6 * size], s.material(sailColour, { side: THREE.DoubleSide, roughness: 0.6 }), 16);
        parts2.push(spin);
      }
      for (const p of parts2) { s.root.remove(p); g.add(p); }
      boats.push(g);
    };
    if (a.occasion === 'yachts') {
      const spinColours = [lead, '#f4f2ec', '#1f5fd1', '#f4d40c', '#c8102e', '#2ec4c4'];
      for (let k = 0; k < 14; k++) sailBoat(-90 + random() * 170, -20 - random() * 120, 1, spinColours[k % spinColours.length]);
    }
    if (anzac) {
      const grey = s.material(hazed('#6c7378', 0.2), { roughness: 0.7 });
      const ship = new THREE.Group();
      for (const m of [s.box([8, 4, 60], [0, 1, 0], grey), s.box([6, 6, 16], [0, 6, 2], grey), s.box([3, 8, 4], [0, 12, 0], grey), s.box([2.5, 3, 10], [0, 4, 20], grey), s.rod([0, 14, -2], [0, 24, -2], 0.3, grey)]) { s.root.remove(m); ship.add(m); }
      ship.position.set(-55, WATER_Y, -120); ship.rotation.y = 1.25;
      root.add(ship);
      // A flagpole on the point with the flag at half-mast.
      s.cylinder(0.08, 0.1, 9, [12, 4.5, 21], s.material('#f4f2ec'), 8);
      s.box([1.8, 0.9, 0.03], [12.95, 5.2, 21], s.material('#1b2a6b'));
    }
    // What else is on the water.
    const ferry = (x: number, z: number, turn: number) => {
      const g = new THREE.Group();
      g.position.set(x, WATER_Y, z); g.rotation.y = turn;
      const green = s.material('#2b5a36'), cream = s.material('#efe3c4');
      const windowsLit = new THREE.MeshStandardMaterial({ color: '#efe3c4', emissive: '#ffd394', emissiveIntensity: mix(0, 0.9, eveningLights) });
      for (const m of [s.box([16, 1.6, 4], [0, 0.6, 0], green), s.box([13, 1.4, 3.6], [0, 2.1, 0], windowsLit), s.box([10, 1.2, 3.4], [0, 3.4, 0], cream), s.cylinder(0.6, 0.6, 1.2, [0, 4.6, 0], cream, 10)]) { s.root.remove(m); g.add(m); }
      const wake = new THREE.Mesh(new THREE.PlaneGeometry(40, 3.5), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }));
      wake.rotation.x = -Math.PI / 2; wake.position.set(-26, 0.08, 0);
      g.add(wake);
      root.add(g);
      boats.push(g);
    };
    const waterFillers: (THREE.Object3D | null)[] = [null, null, null];
    if (a.water === 'ferries') { ferry(WATER[0][0], WATER[0][1], 0.3); waterFillers[0] = boats[boats.length - 1]; ferry(WATER[1][0] + 30, WATER[1][1] - 40, -0.2); }
    if (a.water === 'sailing') { for (let k = 0; k < 6; k++) sailBoat(-70 + random() * 130, -14 - random() * 90, 0.8, null); }
    if (a.water === 'tug') {
      const g = new THREE.Group();
      g.position.set(WATER[0][0], WATER_Y, WATER[0][1]); g.rotation.y = 0.5;
      for (const m of [s.box([5, 1.6, 12], [0, 0.6, 0], s.material('#c8102e')), s.box([3.6, 2.4, 4], [0, 2.6, 1], s.material('#f4f2ec')), s.cylinder(0.5, 0.5, 2, [0, 4.2, -1.5], s.material('#1d1d1f'), 8)]) { s.root.remove(m); g.add(m); }
      root.add(g); boats.push(g); waterFillers[0] = g;
      const taxi = new THREE.Group();
      taxi.position.set(28, WATER_Y, -24); taxi.rotation.y = -0.9;
      for (const m of [s.box([2.4, 1, 7], [0, 0.4, 0], s.material('#f4d40c')), s.box([2, 1.2, 3], [0, 1.4, -0.5], s.material('#f4f2ec'))]) { s.root.remove(m); taxi.add(m); }
      root.add(taxi); boats.push(taxi);
    }

    // ----- weather -----
    const veils: THREE.Mesh[] = [];
    const puff = canvasTexture(128, 128, (c) => {
      const g = c.createRadialGradient(64, 64, 6, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    });
    if (fog) {
      const fogMat = new THREE.MeshBasicMaterial({ map: puff, transparent: true, opacity: 0.85, depthWrite: false, color: '#f1f2ef' });
      for (let k = 0; k < 20; k++) {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(90 + random() * 70, 22 + random() * 14), fogMat);
        mesh.position.set(-60 + random() * 200, WATER_Y + 6 + random() * 14, -150 - random() * 110);
        root.add(mesh); veils.push(mesh);
      }
    }
    if (storm) {
      const roll = new THREE.MeshBasicMaterial({ map: puff, transparent: true, opacity: 0.9, depthWrite: false, color: '#3e4850' });
      for (let k = 0; k < 16; k++) {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(140 + random() * 60, 40 + random() * 20), roll);
        mesh.position.set(-260 + k * 34, 110 + random() * 30, -380 + random() * 40);
        root.add(mesh); veils.push(mesh);
      }
      const rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 1.4, 0.03), new THREE.MeshBasicMaterial({ color: '#dfe6ea', transparent: true, opacity: 0.4, depthWrite: false }), 700);
      const m = new THREE.Matrix4();
      for (let k = 0; k < 700; k++) { m.makeRotationZ(0.25).setPosition((random() - 0.5) * 40, random() * 16, 6 + random() * 24); rain.setMatrixAt(k, m); }
      root.add(rain);
      updates.push((time) => { rain.position.y = -((time * 12 * energy) % 4); });
    }
    if (smoke) {
      const smokeMat = new THREE.MeshBasicMaterial({ map: puff, transparent: true, opacity: 0.55, depthWrite: false, color: '#c27a45' });
      for (let k = 0; k < 10; k++) {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(200, 60), smokeMat);
        mesh.position.set(-200 + k * 50, 30 + random() * 50, -300 - random() * 60);
        root.add(mesh); veils.push(mesh);
      }
    }
    updates.push((time) => veils.forEach((v, i) => { v.position.x += Math.sin(time * 0.05 + i) * 0.03 * energy; }));
    updates.push((time) => {
      for (const [i, mat] of glints.entries()) (mat as THREE.MeshBasicMaterial).opacity = 0.5 + 0.45 * Math.abs(Math.sin(time * (1.2 + i * 0.4) * energy));
      boats.forEach((b, i) => { b.position.y = WATER_Y + Math.sin(time * 0.9 + i) * 0.08 * (1 + (storm ? 4 : 0)); });
    });

    // ----- people on the grass -----
    const people: ReturnType<typeof figure>[] = [];
    const skins = ['#e0b48f', '#c99470', '#f0cfb1', '#8a5a3a'];
    if (a.lawn === 'picnic') {
      const rugs = ['#c8102e', '#1f5fd1', '#f0a215'];
      for (let k = 0; k < 2; k++) {
        const x = k ? 11.6 : -3.6, z = k ? 14.9 : 14.6;
        s.box([2.4, 0.02, 1.8], [x, 0.01, z], s.material(rugs[k % rugs.length], { roughness: 0.9 })).rotation.y = random();
        s.box([0.5, 0.35, 0.35], [x + 0.7, 0.18, z - 0.4], s.material('#b48a52'));
        const p = figure(s, { height: 1.65, pose: 'sitting', style: 'doll', hair: (['long', 'short', 'hat'] as const)[k % 3], top: ['#f4f2ec', '#f4a3c0', '#7ec3ef'][k % 3], bottom: '#2a3140', skin: skins[k % 4], gaze: 'ahead' });
        root.add(p.root);
        p.root.position.set(x - 0.4, 0.02 - 0.02, z);
        p.root.rotation.y = Math.PI + 0.3;
        people.push(p);
      }
    }
    if (a.lawn === 'joggers') {
      for (let k = 0; k < 2; k++) {
        const p = figure(s, { height: 1.7, pose: 'running', style: 'doll', hair: (['cap', 'bun'] as const)[k], top: ['#f0a215', '#d6198a'][k], bottom: '#1d1d1f', skin: skins[k + 1], gaze: 'ahead', mirror: k === 1 });
        root.add(p.root);
        p.root.position.set(-1 + k * 9.5, 0.03, 16 + (k ? 0.5 : -0.4));
        p.root.rotation.y = k ? -Math.PI / 2 : Math.PI / 2;
        people.push(p);
      }
    }

    // ----- light -----
    const hemi = new THREE.HemisphereLight(sky.clone().lerp(new THREE.Color('#ffffff'), 0.35), new THREE.Color('#5c5a4c'), mix(1.4, 0.9, lowSun) * (storm ? 0.85 : 1));
    const sunColour = new THREE.Color().setHSL(mix(0.13, 0.06, Math.max(mood.warmth, lowSun * 0.8)), mix(0.25, 0.7, lowSun), mix(0.93, 0.72, lowSun));
    if (smoke) sunColour.lerp(new THREE.Color('#ff9a5a'), 0.5);
    const key = new THREE.DirectionalLight(sunColour, mix(2.7, 1.7, lowSun) * (storm || fog ? 0.6 : 1) * (smoke ? 0.75 : 1));
    // Mornings come over the water behind and to the right of us; evenings set behind the city.
    const noon = 1 - lowSun;
    key.position.set(daylight < 0.5 ? 40 : -30, mix(12, 60, noon), daylight < 0.5 ? mix(60, 20, noon) : mix(-60, 10, noon));
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.04;
    key.shadow.bias = -0.0004;
    const fill = new THREE.DirectionalLight(sky, 0.45);
    fill.position.set(-20, 10, 30);
    root.add(hemi, key, key.target, fill);

    // ----- camera and placement -----
    const camera = new THREE.PerspectiveCamera(46, 1, 0.3, 1400);
    const camPos = new THREE.Vector3(5, 6.5, 32), aim = new THREE.Vector3(-6, -2, -110);

    const big = (item: Placeable) => item.height > 12 || item.radius > 12;
    const world: World = {
      object: root, camera, background, capacity: 7, ground, keyLight: key,
      place(items: readonly Placeable[]) {
        const used = { ledge: 0, land: 0, water: 0, sky: 0 };
        let bridged = false;
        for (const item of items) {
          const h = Math.max(item.height, 0.05), r = Math.max(item.radius, 0.05);
          item.holder.updateMatrixWorld(true);
          const size = visibleBounds(item.holder).getSize(new THREE.Vector3());
          const long = Math.max(size.x, size.z);
          const hull = long >= 2.4 * h && h >= 2.5 && long >= 8 && h < 40;
          const spanning = h >= 40 && r >= 1.6 * h;
          let x: number, y: number, z: number, scale: number, turn = (random() - 0.5) * 0.3;
          if (spanning && !bridged) {
            bridged = true;
            setBridge.visible = false;
            scale = (HALF * 2 + 40) / long;
            [x, y, z] = BRIDGE_AT;
            turn = BRIDGE_YAW + (size.z > size.x * 1.2 ? Math.PI / 2 : 0);
          } else if (h >= 100 && r < h * 0.5 && used.sky < SKY.length) {
            const slot = SKY[used.sky++];
            if (slot === SKY[0]) spindle.visible = false;
            [x, z] = slot; y = CITY_Y;
            scale = Math.min((item.hero ? 100 : 80) / h, 26 / r);
          } else if (hull && used.water < WATER.length) {
            const index = used.water++;
            const slot = WATER[index];
            if (waterFillers[index]) waterFillers[index]!.visible = false;
            [x, z] = slot;
            scale = Math.min((item.hero ? 30 : 22) / long, (item.hero ? 14 : 10) / h, 1.2);
            y = WATER_Y - h * scale * 0.06;
            turn = 0.3 + (random() - 0.5) * 0.4;
          } else if (big(item)) {
            fillerShells.visible = false;
            const slot = item.hero || used.land >= LAND.length ? HERO_FORE : LAND[used.land++];
            [x, z] = slot; y = FORE_Y;
            scale = item.hero ? Math.min(30 / h, 26 / r) : Math.min(18 / h, 13 / r);
            turn = (random() - 0.5) * 0.4;
          } else {
            // The best-lit spot goes to the hero; the rest fill the people, seat and path spots.
            const index = item.hero ? 0 : 1 + (used.ledge++ % (LEDGE.length - 1));
            const [sx, sz, lift, factor] = LEDGE[index];
            x = sx; z = sz; y = lift;
            const fit = Math.min((item.hero ? 3.4 : 2.4) * factor / h, (item.hero ? 2.6 : 1.8) * factor / r);
            scale = Math.min(1.35, Math.max(0.5, fit));
            if (h * scale > 4.5) scale = 4.5 / h;
            turn = Math.atan2(camPos.x - x, camPos.z - z) * 0.7 + (random() - 0.5) * 0.5;
          }
          item.holder.scale.setScalar(scale);
          item.holder.position.set(x, y!, z);
          item.holder.rotation.y = turn;
          item.holder.updateMatrixWorld(true);
        }
        camera.position.copy(camPos);
        camera.lookAt(aim);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld(true);
        key.target.position.set(2, 0, 8);
        const toSun = key.position.clone().normalize();
        key.position.copy(key.target.position).addScaledVector(toSun, 80);
        const shadow = key.shadow.camera;
        shadow.left = -34; shadow.right = 34; shadow.bottom = -34; shadow.top = 34;
        shadow.near = 1; shadow.far = 220;
        shadow.updateProjectionMatrix();
      },
      update(dt, time) {
        for (const fn of updates) fn(time, dt);
        for (const p of people) p.update(dt, time);
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
    return world;
  },
});
