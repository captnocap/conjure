import * as THREE from 'three';
import { type Placeable, choice, clamp01, defineWorld, disposeTree, mix, score, visibleBounds } from '@conjure/kit';

const HOURS = {
  blue: 'The blue hour just before sunrise: a cold lilac sky with a thin peach band along the horizon and no sun yet.',
  first: 'First light: the sun\'s rim just breaking the horizon, everything rose and gold.',
  golden: 'Early golden morning: the sun a hand above the horizon in a pale clear blue.',
} as const;
const SKIES: Record<keyof typeof HOURS, { zenith: string; mid: string; horizon: string; glow: string; key: string; rise: number }> = {
  blue: { zenith: '#8c9cc6', mid: '#c4c8de', horizon: '#f3c6b4', glow: '#ffd8b8', key: '#cfd6ff', rise: -4.5 },
  first: { zenith: '#9ab2da', mid: '#ecd6d6', horizon: '#ffc49a', glow: '#fff0c4', key: '#ffd9b0', rise: 1.0 },
  golden: { zenith: '#9fc3ea', mid: '#e2ecf3', horizon: '#ffe3b6', glow: '#fff7dc', key: '#fff0d2', rise: 8.5 },
};
const LANDS = {
  patchwork: 'Hedged fields in greens and gold, a quilt of small farms.',
  paddies: 'Flooded rice paddies, pale mirrors edged in green.',
  desert: 'Ochre desert and dry farmland, sand and rust.',
  snow: 'Snow-covered fields ruled with dark hedges and walls.',
  tulips: 'Flower fields in bright ruled stripes of red, yellow and violet.',
} as const;
const LAND_COLOURS: Record<keyof typeof LANDS, { fields: string[]; hedge: string; strips: number }> = {
  patchwork: { fields: ['#7fa85a', '#9cbd62', '#5f8f4e', '#c9b85a', '#d9c27a', '#8a6a44', '#a8c070', '#6a9a58'], hedge: '#3f5e38', strips: 0.25 },
  paddies: { fields: ['#a9c4c0', '#8fb8a0', '#c9dcd8', '#7aa890', '#b8d0b0', '#d6e4e2'], hedge: '#4f7a54', strips: 0.1 },
  desert: { fields: ['#d9a86a', '#c98a52', '#e3bd84', '#b8734a', '#d0986a', '#a8935a'], hedge: '#9a6a44', strips: 0.12 },
  snow: { fields: ['#f1f4f6', '#e3e9ee', '#f7f8f8', '#d9e2e8', '#eceff0'], hedge: '#5a5a58', strips: 0.1 },
  tulips: { fields: ['#e03a4a', '#f4c81e', '#f08a1e', '#b84ac8', '#f6f1e2', '#5aa85a', '#e86a9a'], hedge: '#3f6a48', strips: 0.9 },
};

/** Earth radius and the height of the cast above the ground, in scene units: chosen so the horizon dips and visibly curves. */
const EARTH = 1490, HEIGHT = 60, FOG = 9;
const LAND_TILE = 96, FOG_TILE = 180;

export default defineWorld({
  questions: {
    hour: choice('How far has the dawn got?', HOURS),
    land: choice('What is the land far below?', LANDS),
    fog: score('How much of the land is hidden by fog?', ['Clear air: the whole patchwork shows', 'Fog pooled in the valleys', 'An unbroken white sea of cloud']),
    horizon: choice('What stands on the horizon?', {
      bare: 'Nothing: the plain runs out to the bare curve of the earth.',
      range: 'A jagged mountain range, its snow catching the first pink light.',
      cumulus: 'A wall of towering cumulus building in the distance.',
    }),
    sky: choice('What is overhead?', {
      clear: 'A perfectly clear sky.',
      cirrus: 'Long streaks of high cirrus lit from beneath.',
      mackerel: 'A mackerel sky: rows of small rippled clouds.',
    }),
    company: choice('Who else is up here?', {
      none: 'Nobody: an empty sky.',
      few: 'A few other balloons, far off and small.',
      fiesta: 'A whole dawn mass ascension, dozens of distant balloons at every height.',
    }),
    below: choice('What can be picked out on the ground, if it shows?', {
      nothing: 'Nothing in particular.',
      river: 'A winding river catching the light.',
      village: 'A village, its church spire poking up through the fog.',
      launch: 'The launch field: a white van, a spare envelope laid out and a knot of tiny people looking up.',
    }),
    view: choice('Where are we looking from?', {
      level: 'Level with the floating things, looking across to the horizon.',
      down: 'From above, looking down past them into the drop.',
      basket: 'From inside a balloon basket: wicker rim and ropes at the edge of the frame.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const sky = SKIES[a.hour];
    const shade = (hex: string) => new THREE.Color(hex).offsetHSL((mood.warmth - 0.5) * -0.04, (mood.cheer - 0.5) * 0.25, (mood.cheer - 0.5) * 0.04);
    const zenith = shade(sky.zenith), mid = shade(sky.mid), horizonTone = shade(sky.horizon).lerp(new THREE.Color('#b9a48e'), mood.wear * 0.35), glow = shade(sky.glow);
    const dip = Math.acos(EARTH / (EARTH + HEIGHT));
    const centre = new THREE.Vector3(0, -HEIGHT - EARTH, 0);
    const onGlobe = (x: number, z: number, lift = 0) => Math.sqrt(Math.max(0, (EARTH + lift) ** 2 - x * x - z * z)) + centre.y;
    const solid = (geometry: THREE.BufferGeometry, material: THREE.Material) => { const mesh = new THREE.Mesh(geometry, material); root.add(mesh); return mesh; };

    // The sun, low ahead of the camera, and the dome of sky graded up from the horizon.
    const sunTurn = mix(-0.55, 0.55, mood.daylight) + (random() - 0.5) * 0.1;
    const sunLift = -dip + THREE.MathUtils.degToRad(sky.rise);
    const sunDir = new THREE.Vector3(Math.sin(sunTurn) * Math.cos(sunLift), Math.sin(sunLift), -Math.cos(sunTurn) * Math.cos(sunLift));
    const dome = new THREE.SphereGeometry(1300, 48, 32);
    {
      const position = dome.attributes.position, colours = new Float32Array(position.count * 3), tint = new THREE.Color(), dir = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) {
        dir.fromBufferAttribute(position, i).normalize();
        const t = clamp01((Math.asin(dir.y) + dip) / (Math.PI / 2 + dip));
        if (t < 0.1) tint.copy(horizonTone).lerp(mid, t / 0.1); else tint.copy(mid).lerp(zenith, Math.pow((t - 0.1) / 0.9, 0.65));
        const angle = dir.angleTo(sunDir);
        tint.lerp(glow, Math.exp(-((angle / 0.5) ** 2)) * 0.85);
        colours.set([tint.r, tint.g, tint.b], i * 3);
      }
      dome.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    }
    solid(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
    const sun = solid(new THREE.SphereGeometry(26, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.6, 3.6), fog: false }));
    sun.position.copy(sunDir).multiplyScalar(1100);
    const flare = document.createElement('canvas');
    flare.width = flare.height = 128;
    const fl = flare.getContext('2d')!;
    const radial = fl.createRadialGradient(64, 64, 2, 64, 64, 64);
    radial.addColorStop(0, 'rgba(255,246,216,0.6)'); radial.addColorStop(0.12, 'rgba(255,230,190,0.3)'); radial.addColorStop(0.45, 'rgba(255,214,170,0.08)'); radial.addColorStop(1, 'rgba(255,200,150,0)');
    fl.fillStyle = radial; fl.fillRect(0, 0, 128, 128);
    const halo = solid(new THREE.PlaneGeometry(420, 420), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(flare), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    halo.position.copy(sunDir).multiplyScalar(1080);

    // Lights: the low sun raised and pulled round so faces toward the camera still read.
    root.add(new THREE.HemisphereLight(zenith.clone().lerp(new THREE.Color('#ffffff'), 0.6), horizonTone.clone().lerp(new THREE.Color('#8a8a92'), 0.4), 1.35));
    const key = new THREE.DirectionalLight(shade(sky.key), a.hour === 'blue' ? 1.7 : 2.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.normalBias = 0.03;
    key.shadow.bias = -0.0003;
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight('#dfe6ff', 0.55);
    root.add(fill, fill.target);
    const lightDir = new THREE.Vector3(Math.sin(sunTurn) * 0.8, 0.5, -Math.cos(sunTurn) * 0.35 + 0.6).normalize();

    // The land: a cap of the globe painted as a seamless tile of small fields.
    const land = LAND_COLOURS[a.land];
    const S = 1024;
    const fields = document.createElement('canvas');
    fields.width = fields.height = S;
    const g = fields.getContext('2d')!;
    const cells = 22, cell = S / cells;
    const jitter = Array.from({ length: cells * cells }, () => [(random() - 0.5) * cell * 0.7, (random() - 0.5) * cell * 0.7]);
    const corner = (i: number, j: number): [number, number] => { const [dx, dy] = jitter[((j + cells) % cells) * cells + ((i + cells) % cells)]; return [i * cell + dx, j * cell + dy]; };
    const field = (hex: string) => { const c = new THREE.Color(hex); c.offsetHSL(0, (mood.cheer - 0.5) * 0.3, (random() - 0.5) * 0.07); c.lerp(new THREE.Color('#8a7a5a'), mood.wear * 0.3); return `#${c.getHexString()}`; };
    for (let j = -1; j <= cells; j++)
      for (let i = -1; i <= cells; i++) {
        const quad = [corner(i, j), corner(i + 1, j), corner(i + 1, j + 1), corner(i, j + 1)];
        const strips = random() < land.strips ? 3 + Math.floor(random() * 5) : 1, along = random() < 0.5;
        for (let k = 0; k < strips; k++) {
          const f0 = k / strips, f1 = (k + 1) / strips;
          const lerp2 = (p: [number, number], q: [number, number], f: number): [number, number] => [mix(p[0], q[0], f), mix(p[1], q[1], f)];
          const strip = along ? [lerp2(quad[0], quad[1], f0), lerp2(quad[0], quad[1], f1), lerp2(quad[3], quad[2], f1), lerp2(quad[3], quad[2], f0)] : [lerp2(quad[0], quad[3], f0), lerp2(quad[1], quad[2], f0), lerp2(quad[1], quad[2], f1), lerp2(quad[0], quad[3], f1)];
          g.fillStyle = field(land.fields[Math.floor(random() * land.fields.length)]);
          g.beginPath(); strip.forEach(([x, y], n) => (n ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
        }
        g.strokeStyle = land.hedge; g.lineWidth = a.land === 'desert' ? 1.2 : 2.6;
        g.beginPath(); quad.forEach(([x, y], n) => (n ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
      }
    // Copses, farmsteads and a pale road, each drawn with its wrapped copies so the tile stays seamless.
    const wrapped = (draw: (ox: number, oy: number) => void) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) draw(ox, oy); };
    for (let i = 0; i < 26 + mood.density * 30; i++) { const x = random() * S, y = random() * S, r = 5 + random() * 15; g.fillStyle = a.land === 'desert' ? '#8a7a4a' : a.land === 'snow' ? '#4a544a' : '#2f5236'; wrapped((ox, oy) => { g.beginPath(); g.ellipse(x + ox, y + oy, r, r * 0.7, x, 0, 7); g.fill(); }); }
    for (let i = 0; i < 20; i++) { const x = random() * S, y = random() * S; wrapped((ox, oy) => { g.fillStyle = '#f2ece0'; g.fillRect(x + ox, y + oy, 6, 4); g.fillStyle = '#a8523a'; g.fillRect(x + ox + 7, y + oy + 2, 5, 5); }); }
    g.strokeStyle = a.land === 'snow' ? '#b9bfc4' : '#e6dcc0'; g.lineWidth = 3;
    const bend = random() * 6;
    g.beginPath(); for (let x = -8; x <= S + 8; x += 8) g.lineTo(x, S * 0.37 + Math.sin(x / S * Math.PI * 2 + bend) * 60 + Math.sin(x / S * Math.PI * 6) * 18); g.stroke();
    const landMap = new THREE.CanvasTexture(fields);
    landMap.colorSpace = THREE.SRGBColorSpace;
    landMap.wrapS = landMap.wrapT = THREE.RepeatWrapping;
    landMap.anisotropy = 8;
    const cap = (radius: number, tile: number) => {
      const geometry = new THREE.SphereGeometry(radius, 120, 44, 0, Math.PI * 2, 0, 0.42);
      const position = geometry.attributes.position, uv = geometry.attributes.uv;
      for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) / tile, position.getZ(i) / tile);
      return geometry;
    };
    const earth = solid(cap(EARTH, LAND_TILE), new THREE.MeshStandardMaterial({ map: landMap, roughness: a.land === 'paddies' ? 0.45 : 1, metalness: a.land === 'paddies' ? 0.25 : 0 }));
    earth.position.copy(centre);
    earth.receiveShadow = true;

    // What can be picked out below sits ahead of the camera, where the ground is in view.
    const spot = { x: (random() < 0.5 ? -1 : 1) * mix(14, 34, random()), z: -mix(95, 125, random()) };
    const tiny = (size: [number, number, number], x: number, z: number, hex: string, lift = 0) => { const mesh = solid(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color: shade(hex), roughness: 0.9 })); mesh.position.set(x, onGlobe(x, z, lift) + size[1] / 2, z); mesh.rotation.y = random() * 3; return mesh; };
    if (a.below === 'river') {
      const p1 = random() * 6, p2 = random() * 6, steps = 90, vertices: number[] = [], index: number[] = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, z = mix(-20, -400, t), x = spot.x + 46 * Math.sin(t * 7 + p1) + 20 * Math.sin(t * 17 + p2), wide = mix(2.2, 4.5, t);
        vertices.push(x - wide, onGlobe(x - wide, z, 0.25), z, x + wide, onGlobe(x + wide, z, 0.25), z);
        if (i < steps) index.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
      }
      const ribbon = new THREE.BufferGeometry();
      ribbon.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      ribbon.setIndex(index);
      solid(ribbon, new THREE.MeshBasicMaterial({ color: mid.clone().lerp(glow, 0.5), side: THREE.DoubleSide }));
    } else if (a.below === 'village') {
      for (let i = 0; i < 34 + mood.density * 20; i++) { const t = random() * 7, d = Math.sqrt(random()) * 13; tiny([1.3 + random(), 1 + random() * 0.6, 1.1 + random() * 0.6], spot.x + Math.cos(t) * d, spot.z + Math.sin(t) * d * 0.8, ['#efe8d8', '#b05a3e', '#d9c9a8', '#8a5a44'][Math.floor(random() * 4)]); }
      tiny([2.2, FOG + 1.5, 2.2], spot.x, spot.z, '#d9d2c2').rotation.y = 0;
      const spire = solid(new THREE.ConeGeometry(1.7, 6.5, 4), new THREE.MeshStandardMaterial({ color: shade('#5a626e'), roughness: 0.8 }));
      spire.position.set(spot.x, onGlobe(spot.x, spot.z) + FOG + 4.6, spot.z); spire.rotation.y = Math.PI / 4;
    } else if (a.below === 'launch') {
      const green = solid(new THREE.CylinderGeometry(11, 11, 0.3, 32), new THREE.MeshStandardMaterial({ color: shade('#a9cf72'), roughness: 1 }));
      green.position.set(spot.x, onGlobe(spot.x, spot.z, 0.1), spot.z);
      tiny([3.4, 1.5, 1.6], spot.x - 4, spot.z + 2, '#f6f6f2', 0.2);
      const spare = solid(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshStandardMaterial({ color: shade('#e0413a'), roughness: 0.8 }));
      spare.scale.set(6.5, 0.5, 4); spare.position.set(spot.x + 3, onGlobe(spot.x, spot.z, 0.4), spot.z - 2); spare.rotation.y = random() * 3;
      for (let i = 0; i < 16; i++) tiny([0.4, 1.1, 0.4], spot.x - 3 + random() * 5, spot.z + 4 + random() * 4, ['#e03a2e', '#2f72c8', '#f4c81e', '#f2f0ea', '#30343c'][Math.floor(random() * 5)], 0.2);
    }

    // Fog: a cut-out shell of soft-edged pools, with a few real swells standing proud of it.
    const fogCanvas = document.createElement('canvas');
    fogCanvas.width = fogCanvas.height = S;
    const f = fogCanvas.getContext('2d')!;
    const fogTone = new THREE.Color('#ffffff').lerp(horizonTone, 0.18), fogShade = mid.clone().lerp(zenith, 0.6).lerp(new THREE.Color('#ffffff'), 0.25);
    const full = a.fog > 0.86;
    const pools: [number, number, number][] = [];
    if (full) { f.fillStyle = `#${fogTone.getHexString()}`; f.fillRect(0, 0, S, S); }
    const poolCount = Math.round(mix(5, 150, Math.pow(a.fog, 1.2)));
    const keepClear = a.below === 'nothing' ? null : [((spot.x / FOG_TILE) % 1 + 1) % 1 * S, ((spot.z / FOG_TILE) % 1 + 1) % 1 * S];
    for (let i = 0; i < poolCount; i++) {
      const x = random() * S, y = random() * S, r = mix(40, 130, random()) * mix(0.8, 1.25, a.fog);
      if (!full && keepClear && Math.hypot(((x - keepClear[0] + S * 1.5) % S) - S / 2, ((y - keepClear[1] + S * 1.5) % S) - S / 2) < r + (a.below === 'village' ? 0 : 90)) continue;
      pools.push([x, y, r]);
      wrapped((ox, oy) => {
        const soft = f.createRadialGradient(x + ox, y + oy, r * 0.25, x + ox, y + oy, r);
        soft.addColorStop(0, `rgba(${fogTone.r * 255 | 0},${fogTone.g * 255 | 0},${fogTone.b * 255 | 0},1)`); soft.addColorStop(1, `rgba(${fogTone.r * 255 | 0},${fogTone.g * 255 | 0},${fogTone.b * 255 | 0},0)`);
        f.fillStyle = soft; f.beginPath(); f.ellipse(x + ox, y + oy, r, r, 0, 0, 7); f.fill();
      });
    }
    f.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 70; i++) {
      const x = random() * S, y = random() * S, r = 30 + random() * 80;
      wrapped((ox, oy) => { const soft = f.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); soft.addColorStop(0, `rgba(${fogShade.r * 255 | 0},${fogShade.g * 255 | 0},${fogShade.b * 255 | 0},0.5)`); soft.addColorStop(1, `rgba(${fogShade.r * 255 | 0},${fogShade.g * 255 | 0},${fogShade.b * 255 | 0},0)`); f.fillStyle = soft; f.fillRect(x + ox - r, y + oy - r, r * 2, r * 2); });
    }
    const fogMap = new THREE.CanvasTexture(fogCanvas);
    fogMap.colorSpace = THREE.SRGBColorSpace;
    fogMap.wrapS = fogMap.wrapT = THREE.RepeatWrapping;
    const fogShell = solid(cap(EARTH + FOG, FOG_TILE), new THREE.MeshStandardMaterial({ map: fogMap, alphaTest: 0.42, roughness: 1 }));
    fogShell.position.copy(centre);
    const swells = pools.slice(0, 26), copies = [-1, 0, 1];
    const puffs = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 8), new THREE.MeshStandardMaterial({ color: fogTone, roughness: 1 }), Math.max(1, swells.length * 9));
    const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), scaleBy = new THREE.Vector3(), at = new THREE.Vector3();
    let puffIndex = 0;
    for (const [px, py, pr] of swells) for (const cx of copies) for (const cz of copies) {
      const x = (px / S + cx) * FOG_TILE, z = (py / S + cz) * FOG_TILE, wide = pr / S * FOG_TILE * 0.62;
      at.set(x, onGlobe(x, z, FOG - wide * 0.02), z); scaleBy.set(wide, wide * 0.16, wide);
      puffs.setMatrixAt(puffIndex++, matrix.compose(at, turn, scaleBy));
    }
    puffs.count = puffIndex;
    if (puffIndex) root.add(puffs);

    // Haze: a see-through shell that thickens toward the horizon so the land melts into the sky.
    const hazeGeometry = new THREE.SphereGeometry(EARTH + FOG + 5, 96, 40, 0, Math.PI * 2, 0, 0.42);
    {
      const position = hazeGeometry.attributes.position, colours = new Float32Array(position.count * 4);
      for (let i = 0; i < position.count; i++) {
        const theta = Math.acos(clamp01(position.getY(i) / (EARTH + FOG + 5)));
        colours.set([horizonTone.r, horizonTone.g, horizonTone.b, Math.pow(clamp01((theta / dip - 0.12) / 0.8), 1.25) * mix(0.9, 1, mood.wear)], i * 4);
      }
      hazeGeometry.setAttribute('color', new THREE.BufferAttribute(colours, 4));
    }
    const haze = solid(hazeGeometry, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
    haze.position.copy(centre);

    // The horizon and the high sky.
    const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, items: { p: THREE.Vector3; s: THREE.Vector3; turn?: number; colour?: THREE.Color }[]) => {
      const mesh = new THREE.InstancedMesh(geometry, material, Math.max(items.length, 1));
      items.forEach((item, index) => { mesh.setMatrixAt(index, matrix.compose(item.p, turn.setFromAxisAngle(new THREE.Vector3(0, 1, 0), item.turn ?? 0), item.s)); if (item.colour) mesh.setColorAt(index, item.colour); });
      mesh.count = items.length;
      turn.identity();
      root.add(mesh);
      return mesh;
    };
    if (a.horizon === 'range') {
      const peak = new THREE.ConeGeometry(1, 1, 6, 4);
      const position = peak.attributes.position, colours = new Float32Array(position.count * 3);
      const rock = shade('#8e86a6'), snow = new THREE.Color('#fff1ea').lerp(glow, 0.3);
      for (let i = 0; i < position.count; i++) { const c = position.getY(i) > 0.02 ? snow : rock; colours.set([c.r, c.g, c.b], i * 3); }
      peak.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      const peaks = Array.from({ length: 70 }, () => {
        const az = (random() - 0.5) * 3.6, d = mix(300, 400, random()), tall = mix(34, 92, random() * random() + 0.15), x = Math.sin(az) * d, z = -Math.cos(az) * d;
        return { p: new THREE.Vector3(x, onGlobe(x, z) + tall * 0.42, z), s: new THREE.Vector3(mix(26, 58, random()), tall, mix(26, 58, random())), turn: random() * 6 };
      });
      instanced(peak, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }), peaks);
    } else if (a.horizon === 'cumulus') {
      const towers: { p: THREE.Vector3; s: THREE.Vector3 }[] = [];
      for (let k = 0; k < 9; k++) {
        const az = (random() - 0.5) * 3.2, d = mix(330, 420, random()), tall = mix(60, 170, random());
        for (let i = 0; i < 9; i++) { const up = i / 8, r = mix(46, 20, up) * mix(0.8, 1.3, random()), x = Math.sin(az) * d + (random() - 0.5) * 60 * (1 - up * 0.5), z = -Math.cos(az) * d + (random() - 0.5) * 30; towers.push({ p: new THREE.Vector3(x, onGlobe(x, z) + 14 + up * tall, z), s: new THREE.Vector3(r, r * 0.8, r) }); }
      }
      instanced(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshStandardMaterial({ color: new THREE.Color('#ffffff').lerp(glow, 0.3), roughness: 1 }), towers);
    }
    if (a.sky === 'cirrus') {
      const wisp = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').lerp(glow, 0.5).lerp(shade('#ffb9a8'), 0.3), transparent: true, opacity: 0.7, depthWrite: false, fog: false });
      const slant = (random() - 0.5) * 0.8;
      instanced(new THREE.SphereGeometry(1, 12, 6), wisp, Array.from({ length: 16 + Math.round(mood.density * 10) }, () => ({ p: new THREE.Vector3((random() - 0.5) * 900, mix(90, 260, random()), -mix(250, 800, random())), s: new THREE.Vector3(mix(90, 220, random()), mix(1.5, 4, random()), mix(8, 22, random())), turn: slant + (random() - 0.5) * 0.25 })));
    } else if (a.sky === 'mackerel') {
      const ripple = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').lerp(glow, 0.45), transparent: true, opacity: 0.5, depthWrite: false, fog: false });
      const rows: { p: THREE.Vector3; s: THREE.Vector3; turn: number }[] = [];
      for (let r = 0; r < 14; r++) for (let c = 0; c < 22; c++) if (random() < 0.85) rows.push({ p: new THREE.Vector3((c - 10.5) * 42 + (random() - 0.5) * 14 + (r % 2) * 20, 190 + (random() - 0.5) * 6, -160 - r * 46 + (random() - 0.5) * 10), s: new THREE.Vector3(mix(14, 30, random()), 2.5, mix(6, 11, random())), turn: 0.3 + (random() - 0.5) * 0.3 });
      instanced(new THREE.SphereGeometry(1, 10, 6), ripple, rows);
    }

    // Other balloons, far off.
    const others = a.company === 'none' ? 0 : a.company === 'few' ? 3 + Math.floor(random() * 3) : 22 + Math.round(mood.density * 26);
    const drifters: { p: THREE.Vector3; s: THREE.Vector3; colour: THREE.Color }[] = [];
    if (others) {
      const teardrop = new THREE.LatheGeometry([[0.1, 0], [0.26, 0.2], [0.44, 0.45], [0.5, 0.66], [0.44, 0.86], [0.26, 0.97], [0.02, 1]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
      const bright = ['#e63946', '#f4a21c', '#f7dc3a', '#3aa655', '#2f7fd1', '#7b47b5', '#f6f1e2', '#e8336d'];
      for (let i = 0; i < others; i++) {
        const far = mix(60, 330, Math.pow(random(), 0.8)), az = (random() - 0.5) * 2.2, size = mix(6.5, 9, random());
        drifters.push({ p: new THREE.Vector3(Math.sin(az) * far * 1.25, mix(-34, 26, random()), -Math.cos(az) * far - 30), s: new THREE.Vector3(size, size, size), colour: shade(bright[Math.floor(random() * bright.length)]) });
      }
      instanced(teardrop, new THREE.MeshStandardMaterial({ roughness: 0.75 }), drifters);
      instanced(new THREE.BoxGeometry(0.1, 0.09, 0.1), new THREE.MeshStandardMaterial({ color: '#7d5329', roughness: 0.9 }), drifters.map((one) => ({ p: one.p.clone().add(new THREE.Vector3(0, -one.s.y * 0.14, 0)), s: one.s })));
    }

    // A basket rim that rides with the camera, for the view from on board.
    let basket: THREE.Group | null = null;
    if (a.view === 'basket') {
      basket = new THREE.Group();
      const weave = document.createElement('canvas');
      weave.width = weave.height = 128;
      const w2 = weave.getContext('2d')!;
      w2.fillStyle = '#8a5d30'; w2.fillRect(0, 0, 128, 128);
      for (let y = 0; y < 16; y++) for (let x = -1; x < 9; x++) { w2.fillStyle = (x + y) % 2 ? '#b98a4e' : '#754c24'; w2.fillRect(x * 16 + (y % 2) * 8, y * 8 + 1, 14, 6); }
      const weaveMap = new THREE.CanvasTexture(weave);
      weaveMap.colorSpace = THREE.SRGBColorSpace; weaveMap.wrapS = weaveMap.wrapT = THREE.RepeatWrapping; weaveMap.repeat.set(14, 2);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.9, 0.2), new THREE.MeshStandardMaterial({ map: weaveMap, roughness: 0.9 }));
      wall.position.set(0, -2.0, -4);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 5.3, 10), new THREE.MeshStandardMaterial({ color: '#5a3a22', roughness: 0.75 }));
      rim.rotation.z = Math.PI / 2; rim.position.set(0, -1.54, -4);
      basket.add(wall, rim);
      // One cane upright and its load ropes at the left edge, a single rope at the right: a corner of the basket, not a frame.
      const cane = new THREE.MeshStandardMaterial({ color: '#6b4426', roughness: 0.8 }), hemp = new THREE.MeshStandardMaterial({ color: '#c9b98a', roughness: 0.9 });
      const strut = (x0: number, x1: number, radius: number, material: THREE.Material, z = -4) => {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 4.6, 8), material);
        mesh.position.set((x0 + x1) / 2, 0.6, z); mesh.rotation.z = -Math.atan2(x1 - x0, 4.6);
        basket!.add(mesh);
      };
      const near = random() < 0.5 ? -1 : 1;
      strut(near * 1.78, near * 1.55, 0.05, cane);
      strut(near * 1.86, near * 1.2, 0.012, hemp, -3.9);
      strut(-near * 1.84, -near * 1.7, 0.014, hemp, -3.9);
      root.add(basket);
    }

    const camera = new THREE.PerspectiveCamera(50, 1, 0.3, 4000);
    const pitch = THREE.MathUtils.degToRad({ level: 6, down: 29, basket: 9 }[a.view]);
    const yaw = (random() - 0.5) * 0.3;
    const toCamera = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    const SLOTS: [number, number, number][] = [[-0.4, -0.6, 2.5], [5.6, 2.1, -6], [-6, 2.9, -10], [3.2, -3.3, -13], [-9.5, -1.4, -17], [9.5, 4.6, -20], [-1.5, 5.6, -24]];
    const floating: { holder: THREE.Group; y: number; phase: number }[] = [];

    const place = (items: readonly Placeable[]) => {
      floating.length = 0;
      const boxes: THREE.Box3[] = [];
      items.forEach((item, index) => {
        const natural = Math.max(item.height, item.radius * 2, 0.05);
        // True sizes are compressed: a lantern and a balloon share the sky, the bigger still a little bigger.
        const bias = 0.72 + 0.28 * clamp01((Math.log10(natural) + 0.3) / 1.7);
        const scale = (item.hero ? 5.2 * Math.sqrt(bias) : 3.9 * bias) / natural;
        const [x, y, z] = SLOTS[index % SLOTS.length];
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x + (random() - 0.5) * 1.2, y - item.height * scale / 2 + (random() - 0.5) * 0.8, z + (random() - 0.5) * 1.5);
        item.holder.rotation.set(0, yaw + (random() - 0.5) * 0.7, 0);
        item.holder.updateMatrixWorld(true);
        const box = visibleBounds(item.holder);
        if (!box.isEmpty()) boxes.push(box);
        floating.push({ holder: item.holder, y: item.holder.position.y, phase: random() * 6 });
      });
      const bounds = boxes.reduce((sum, box) => sum.union(box), new THREE.Box3());
      if (bounds.isEmpty()) bounds.set(new THREE.Vector3(-3, -3, -3), new THREE.Vector3(3, 3, 3));
      const focus = bounds.getCenter(new THREE.Vector3());
      const point = new THREE.Vector3();
      const fits = () => boxes.every((box) => [box.min.x, box.max.x].every((x) => [box.min.y, box.max.y].every((y) => [box.min.z, box.max.z].every((z) => { point.set(x, y, z).project(camera); return Math.abs(point.x) < 0.8 && point.y < 0.84 && point.y > (basket ? -0.6 : -0.76) && point.z < 1; }))));
      for (let distance = 9; distance < 120; distance *= 1.05) {
        camera.position.copy(focus).addScaledVector(toCamera, distance);
        camera.lookAt(focus);
        camera.updateMatrixWorld(true);
        if (fits()) break;
      }
      if (basket) { basket.position.copy(camera.position); basket.quaternion.copy(camera.quaternion); }
      halo.lookAt(camera.position);
      const span = Math.max(bounds.getSize(new THREE.Vector3()).length(), 6);
      key.target.position.copy(focus);
      key.position.copy(focus).addScaledVector(lightDir, span * 1.6);
      fill.target.position.copy(focus);
      fill.position.copy(focus).add(new THREE.Vector3(-Math.sin(sunTurn) * 6, 2, 9));
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -span * 0.7;
      shadow.right = shadow.top = span * 0.7;
      shadow.near = 0.1; shadow.far = span * 4;
      shadow.updateProjectionMatrix();
    };

    const drift = mix(0.2, 1, mood.energy);
    return {
      object: root, camera, background: horizonTone.clone().lerp(mid, 0.5), capacity: SLOTS.length, ground: earth, keyLight: key, place,
      update(dt, time) {
        for (const one of floating) one.holder.position.y = one.y + Math.sin(time * 0.45 * drift + one.phase) * 0.09 * (0.5 + drift);
        fogMap.offset.x += dt * 0.0012 * drift;
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
