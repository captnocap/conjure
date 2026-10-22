import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Placeable, type World, choice, defineWorld, disposeTree, mix, score } from '@conjure/kit';

type P3 = readonly [number, number, number];
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hex = (colour: THREE.Color) => `#${colour.getHexString()}`;

const SANDS = {
  gold: 'Classic golden sand.',
  apricot: 'Deep apricot-red sand, the old iron-stained dunes.',
  cream: 'Pale cream, almost white where the light hits it.',
  rose: 'Dusky rose-pink sand.',
  ash: 'Pale grey sand, like ash or bone.',
} as const;
const SAND: Record<keyof typeof SANDS, string> = { gold: '#e2b872', apricot: '#d98a52', cream: '#ead6ac', rose: '#d9a088', ash: '#cdc6b8' };

/** A dune is a crest line with a height along it: a gentle windward back on one side, a slip face on the other. */
interface Ridge { pts: [number, number, number][]; slip: 1 | -1; back: number; backMax: number; face?: number }
interface Sheet { p: number[]; c: number[]; uv: number[]; i: number[] }

/** Standing places on the corridor floor: x, z, tallest and widest a thing may be there. */
const SLOTS: readonly (readonly [number, number, number, number])[] = [[1.5, -7, 9, 6.5], [-15, -25, 10, 7], [15, -37, 13, 9], [-5, -62, 17, 12]];

export default defineWorld({
  questions: {
    dunes: choice('What kind of dunes make up the sea?', {
      transverse: 'Long parallel wave-ridges lying across the view, row behind row like a swell.',
      seif: 'Long sabre ridges running away toward the horizon, with the corridor straight down the middle.',
      star: 'Scattered star dunes: great pyramids of sand with arms radiating from each peak.',
      barchanoid: 'Chains of linked crescents, scalloped like fish scales.',
    }),
    sand: choice('What colour is the sand?', SANDS),
    size: score('How big are the dunes?', ['Low rolling dunes', 'Great dunes', 'Mountains of sand that dwarf everything']),
    vantage: choice('Where are we standing?', {
      crest: 'High on a knife-edge crest that curves away below us and runs down to the corridor.',
      saddle: 'On a low saddle of sand only a little above the corridor, close to whatever stands there.',
      foot: 'Down on the corridor floor, with the dunes towering over us.',
    }),
    corridor: choice('What is the flat corridor between the dunes?', {
      gravel: 'A dark pan of wind-polished gravel.',
      pan: 'A pale clay pan cracked into plates.',
      salt: 'An old lake bed, white with salt.',
      sand: 'A sheet of rippled sand, barely flatter than the dunes.',
    }),
    air: choice('What is the air like?', {
      clear: 'Hard and clear: every far crest sharp, the sky deep.',
      haze: 'Milky with haze: the dunes fade to nothing a few ridges away.',
      wind: 'A sand-laden wind: every crest is smoking and the horizon has gone ochre.',
      afterglow: 'Still, with long thin streaks of cloud lit from below along the horizon.',
    }),
    others: choice('What sign of other people is there?', {
      none: 'None. Nobody has ever been here.',
      caravan: 'A caravan of camels in silhouette, far off along a crest.',
      footprints: 'A single line of footprints leading away from us, down and across the corridor.',
      fire: 'One small fire burning far down the corridor, with a low dark tent beside it.',
      markers: 'A line of oil-drum markers showing where a track once ran.',
      tracks: 'Twin tyre tracks wandering down the corridor and out of sight.',
    }),
    buried: score('How much has the sand taken of whatever stands here?', ['It stands clear on the surface', 'Drifts have built against it', 'Half swallowed']),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const terrain = new THREE.Group();
    root.add(terrain);

    // Light and colour: warm scenes are an amber late afternoon, cold ones a moonlit dusk.
    const day = smooth(0.3, 0.55, mood.warmth);
    const blend = (cold: string, warm: string) => new THREE.Color(cold).lerp(new THREE.Color(warm), day);
    const grey = new THREE.Color('#a8a4a0');
    const mute = (colour: THREE.Color) => colour.lerp(grey, (1 - mood.cheer) * 0.18);
    const rawSand = new THREE.Color(SAND[a.sand]).lerp(new THREE.Color('#e8944a'), Math.max(0, mood.warmth - 0.5) * 0.35);
    const sand = mute(rawSand.clone().lerp(new THREE.Color('#a59ac2'), (1 - day) * 0.42));
    const shade = sand.clone().multiplyScalar(0.62).lerp(blend('#4e4a80', '#6a4f6a'), 0.25);
    let top = blend('#39447a', '#5d8dc4'), middle = blend('#8c88b6', '#e7c08e'), low = blend('#e4bcb6', '#f6dcaa');
    let hazeLength = 900;
    if (a.air === 'haze') { top.lerp(low, 0.55); middle.lerp(low, 0.6); hazeLength = 300; }
    else if (a.air === 'wind') { const murk = sand.clone().lerp(new THREE.Color('#d9b98c'), 0.4); top.lerp(murk, 0.72); middle.lerp(murk, 0.8); low.lerp(murk, 0.7); hazeLength = 210; }
    else if (a.air === 'afterglow') { low = blend('#f0b49a', '#fbc98a'); hazeLength = 650; }
    top = mute(top); middle = mute(middle); low = mute(low);
    const haze = low.clone();
    const side = mood.daylight < 0.5 ? 1 : -1;
    const height = 1 - Math.abs(mood.daylight - 0.5) * 2;

    // The stage's room environment would flood every hollow and wash the shadows out, so the terrain opts out of it
    // (a black environment of its own, never reflected) and is lit by this sun and sky alone.
    const pixel = document.createElement('canvas');
    pixel.width = pixel.height = 2;
    pixel.getContext('2d')!.fillRect(0, 0, 2, 2);
    const noRoom = new THREE.CubeTexture([pixel, pixel, pixel, pixel, pixel, pixel]);
    noRoom.needsUpdate = true;
    const matte = (options: THREE.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({ envMap: noRoom, reflectivity: 0, ...options });
    const sunward = new THREE.Vector3(side * 0.82, mix(0.24, 0.6, height), -0.42).normalize();
    const skyPower = mix(2.25, 1.6, day);
    const sunPower = Math.min(6.5, Math.max(2.4, (Math.PI - skyPower) / sunward.y)) * (a.air === 'wind' ? 0.75 : 1);
    root.add(new THREE.HemisphereLight(blend('#9aa6e0', '#c2d4f2'), blend('#6f6a8c', '#c8a070'), skyPower));
    const key = new THREE.DirectionalLight(blend('#c9d4ff', '#ffcf94'), sunPower);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.06;
    key.shadow.bias = -0.0004;
    key.target.position.set(0, 0, -16);
    key.position.copy(key.target.position).addScaledVector(sunward, 170);
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight(blend('#b8b4e0', '#f2dcc0'), 0.25);
    fill.position.set(-side * 30, 26, 70);
    root.add(fill);

    // Where we stand.
    const big = mix(0.8, 1.6, a.size);
    const near = mix(0.85, 1.2, a.size);
    const foreground: Ridge = {
      crest: { pts: [[-3, 48, 8.6], [-1.5, 31, 8.1], [1, 20, 7.2], [6, 10, 5.6], [13, 3, 3.2], [22, -1, 0.4]], slip: -1, back: 3.4, backMax: 34 },
      saddle: { pts: [[3, 48, 4.4], [1.5, 31, 4.0], [-1, 20, 3.7], [-6, 10, 3.0], [-13, 3, 1.8], [-22, -1, 0.3]], slip: 1, back: 4.2, backMax: 30 },
      foot: { pts: [[-26, 27, 0.15], [-12, 23, 1.2], [0, 21, 1.5], [12, 17, 1.1], [26, 11, 0.15]], slip: -1, back: 5, backMax: 9 },
    }[a.vantage] as Ridge;
    for (const point of foreground.pts) point[2] *= near;
    const eye = { crest: new THREE.Vector3(-0.6, 8.1 * near + 1.9, 30), saddle: new THREE.Vector3(0.6, 4.0 * near + 1.9, 30), foot: new THREE.Vector3(0, 2.4, 32) }[a.vantage];
    const aim = { crest: new THREE.Vector3(3, 4.2, -16), saddle: new THREE.Vector3(-3, 4.6, -16), foot: new THREE.Vector3(0, 6.6, -16) }[a.vantage];
    const hazed = (colour: THREE.Color, x: number, z: number) => colour.clone().lerp(haze, Math.min(0.86, 1 - Math.exp(-Math.hypot(x - eye.x, z - eye.z) / hazeLength)));

    // Sky: a painted backdrop with the sun or moon, stars when it is cold, and streaks of cloud.
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 1024; skyCanvas.height = 512;
    const sky = skyCanvas.getContext('2d')!;
    const wash = sky.createLinearGradient(0, 512, 0, 0);
    wash.addColorStop(0, hex(low)); wash.addColorStop(0.1, hex(low)); wash.addColorStop(0.3, hex(middle)); wash.addColorStop(0.72, hex(top)); wash.addColorStop(1, hex(top));
    sky.fillStyle = wash;
    sky.fillRect(0, 0, 1024, 512);
    if (a.air !== 'wind') for (let i = 0; i < 170 * (1 - day); i++) { sky.fillStyle = `rgba(255,250,235,${0.3 + random() * 0.6})`; const r = random() < 0.1 ? 1.6 : 0.9; sky.beginPath(); sky.arc(random() * 1024, random() * 300, r, 0, 7); sky.fill(); }
    const orbX = 512 + side * mix(70, 110, random()), orbY = 512 - mix(88, 150, height) - (a.vantage === 'foot' ? 40 : 0);
    const orbRadius = mix(15, 10, day);
    const glow = sky.createRadialGradient(orbX, orbY, orbRadius * 0.6, orbX, orbY, orbRadius * mix(3.5, 7, day));
    const orbColour = blend('#f6f2e4', '#fff1c2');
    glow.addColorStop(0, `rgba(${Math.round(orbColour.r * 255)},${Math.round(orbColour.g * 255)},${Math.round(orbColour.b * 255)},${a.air === 'wind' ? 0.35 : 0.6})`);
    glow.addColorStop(1, 'rgba(255,240,210,0)');
    sky.fillStyle = glow;
    sky.fillRect(orbX - 120, orbY - 120, 240, 240);
    sky.fillStyle = a.air === 'wind' ? hex(orbColour.clone().lerp(low, 0.45)) : hex(orbColour);
    sky.beginPath(); sky.arc(orbX, orbY, orbRadius, 0, 7); sky.fill();
    if (day < 0.5 && a.air !== 'wind') for (let i = 0; i < 6; i++) { sky.fillStyle = 'rgba(150,150,178,0.28)'; sky.beginPath(); sky.arc(orbX + (random() - 0.5) * orbRadius * 1.3, orbY + (random() - 0.5) * orbRadius * 1.3, orbRadius * (0.1 + random() * 0.2), 0, 7); sky.fill(); }
    const streaks = a.air === 'afterglow' ? 9 : a.air === 'clear' ? 2 : 0;
    for (let i = 0; i < streaks; i++) {
      const tone = blend('#f4c0c8', '#ffb070').lerp(new THREE.Color('#ffffff'), random() * 0.4);
      sky.fillStyle = `rgba(${Math.round(tone.r * 255)},${Math.round(tone.g * 255)},${Math.round(tone.b * 255)},${0.35 + random() * 0.4})`;
      sky.beginPath(); sky.ellipse(200 + random() * 620, 512 - (70 + random() * 150), 50 + random() * 130, 2 + random() * 4.5, -0.03, 0, 7); sky.fill();
    }
    const skyMap = new THREE.CanvasTexture(skyCanvas);
    skyMap.colorSpace = THREE.SRGBColorSpace;
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2000, 1000), new THREE.MeshBasicMaterial({ map: skyMap, fog: false, depthWrite: false }));
    backdrop.position.set(0, 500 - 96, -640);
    backdrop.renderOrder = -1;
    root.add(backdrop);

    // The corridor floor.
    const floorColour = mute({ gravel: new THREE.Color('#7d7166').lerp(sand, 0.2), pan: new THREE.Color('#c9b999').lerp(sand, 0.25), salt: new THREE.Color('#e3e0d6').lerp(sand, 0.1), sand: sand.clone().multiplyScalar(0.93) }[a.corridor]);
    const tile = document.createElement('canvas');
    tile.width = tile.height = 512;
    const paint = tile.getContext('2d')!;
    paint.fillStyle = '#ffffff'; paint.fillRect(0, 0, 512, 512);
    if (a.corridor === 'gravel') for (let i = 0; i < 2600; i++) { const v = Math.round(120 + random() * 135); paint.fillStyle = `rgb(${v},${v},${v})`; const r = 1 + random() * 3.2; paint.beginPath(); paint.ellipse(random() * 512, random() * 512, r, r * 0.6, 0, 0, 7); paint.fill(); }
    else if (a.corridor === 'sand') for (let row = 0; row < 18; row++) for (const [offset, tone, alpha] of [[0, '#9a9a9a', 0.5], [9, '#ffffff', 0.5]] as const) {
      paint.strokeStyle = tone; paint.globalAlpha = alpha; paint.lineWidth = 7; paint.beginPath();
      for (let x = 0; x <= 512; x += 8) { const y = row * 28.44 + offset + 6 * Math.sin((x / 512) * Math.PI * 2 * 3 + row * 1.7); if (x) paint.lineTo(x, y); else paint.moveTo(x, y); }
      paint.stroke();
    } else {
      paint.strokeStyle = a.corridor === 'salt' ? '#b5b5b5' : '#8f8f8f'; paint.lineWidth = a.corridor === 'salt' ? 4 : 2.2; paint.lineJoin = 'round';
      const N = 7, cell = 512 / N;
      const knots = Array.from({ length: N * N }, () => [(random() - 0.5) * cell * 0.7, (random() - 0.5) * cell * 0.7]);
      const knot = (i: number, j: number) => { const [dx, dy] = knots[((i % N) + N) % N + (((j % N) + N) % N) * N]; return [i * cell + dx, j * cell + dy]; };
      for (let i = -1; i <= N; i++) for (let j = -1; j <= N; j++) for (const [di, dj] of [[1, 0], [0, 1]]) {
        const [x0, y0] = knot(i, j), [x1, y1] = knot(i + di, j + dj), bend = (((i * 7 + j * 13 + di) % 5) - 2) * 5;
        paint.beginPath(); paint.moveTo(x0, y0); paint.lineTo((x0 + x1) / 2 + bend * dj, (y0 + y1) / 2 + bend * di); paint.lineTo(x1, y1); paint.stroke();
      }
    }
    const floorMap = new THREE.CanvasTexture(tile);
    floorMap.colorSpace = THREE.SRGBColorSpace;
    floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping;
    floorMap.repeat.set(110, 110);
    floorMap.anisotropy = 8;
    const floorGeometry = new THREE.PlaneGeometry(1800, 1800, 60, 60);
    floorGeometry.rotateX(-Math.PI / 2);
    floorGeometry.translate(0, 0, -520);
    {
      const p = floorGeometry.attributes.position, colours: number[] = [];
      for (let i = 0; i < p.count; i++) { const c = hazed(floorColour, p.getX(i), p.getZ(i)); colours.push(c.r, c.g, c.b); }
      floorGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    }
    const floor = new THREE.Mesh(floorGeometry, matte({ map: floorMap, vertexColors: true }));
    floor.receiveShadow = true;
    terrain.add(floor);

    // Dunes as sheets hung from their crest lines.
    const emit = (sheet: Sheet, frames: { x: number; z: number; h: number; nx: number; nz: number }[], cols: number, point: (f: { x: number; z: number; h: number; nx: number; nz: number }, k: number) => P3, tone: (x: number, z: number) => THREE.Color) => {
      const base = sheet.p.length / 3, rows = frames.length - 1;
      for (const f of frames) for (let j = 0; j <= cols; j++) {
        const [x, y, z] = point(f, j / cols), c = tone(x, z);
        sheet.p.push(x, y, z); sheet.c.push(c.r, c.g, c.b); sheet.uv.push(x / 9, z / 9);
      }
      const m = Math.floor(rows / 2), at = (i: number, j: number, axis: number) => sheet.p[(base + i * (cols + 1) + j) * 3 + axis];
      const up = (at(m + 1, 0, 2) - at(m, 0, 2)) * (at(m, 1, 0) - at(m, 0, 0)) - (at(m + 1, 0, 0) - at(m, 0, 0)) * (at(m, 1, 2) - at(m, 0, 2)) > 0;
      for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
        const p = base + i * (cols + 1) + j, q = p + cols + 1;
        if (up) sheet.i.push(p, q, p + 1, q, q + 1, p + 1); else sheet.i.push(p, p + 1, q, q, p + 1, q + 1);
      }
    };
    const sample = (ridge: Ridge, detail: number) => {
      const curve = new THREE.CatmullRomCurve3(ridge.pts.map(([x, z, h]) => new THREE.Vector3(x, h, z)));
      const count = Math.max(6, Math.round(ridge.pts.length * detail));
      return Array.from({ length: count + 1 }, (_unused, i) => {
        const p = curve.getPoint(i / count), tangent = curve.getTangent(i / count), length = Math.hypot(tangent.x, tangent.z) || 1;
        return { x: p.x, z: p.z, h: Math.max(p.y, 0), nx: (-tangent.z / length) * ridge.slip, nz: (tangent.x / length) * ridge.slip };
      });
    };
    /**
     * Far dunes are cut into runs and sorted into bands by distance. Each band is its own pair of meshes whose colour
     * is dimmed and whose glow is raised by the same share, so haze lifts shaded faces toward the sky instead of
     * leaving them as black cut-outs.
     */
    const hang = (ridges: Ridge[], detail: number, backCols: number, banded: boolean) => {
      const bands = new Map<number, { back: Sheet; face: Sheet }>();
      const crests: THREE.Vector3[][] = [];
      for (const ridge of ridges) {
        const frames = sample(ridge, detail);
        const run = banded ? 6 : frames.length;
        for (let start = 0; start < frames.length - 1; start += run) {
          const piece = frames.slice(start, Math.min(frames.length, start + run + 1));
          const centre = piece[Math.floor(piece.length / 2)];
          const band = banded ? Math.round(Math.min(0.86, 1 - Math.exp(-Math.hypot(centre.x - eye.x, centre.z - eye.z) / hazeLength)) * 9) : 0;
          if (!bands.has(band)) bands.set(band, { back: { p: [], c: [], uv: [], i: [] }, face: { p: [], c: [], uv: [], i: [] } });
          const tone = (colour: THREE.Color) => { const dimmed = colour.clone().multiplyScalar(1 - band / 9); return banded ? () => dimmed : (x: number, z: number) => hazed(colour, x, z); };
          emit(bands.get(band)!.back, piece, backCols, (f, k) => { const u = 1 - k, w = Math.min(f.h * ridge.back, ridge.backMax); return [f.x - f.nx * w * u, f.h * (1 - u) ** 1.25 - 0.06 * u, f.z - f.nz * w * u]; }, tone(sand));
          emit(bands.get(band)!.face, piece, 2, (f, k) => { const w = f.h * (ridge.face ?? 1.54); return [f.x + f.nx * w * k, f.h * (1 - k) - 0.06 * k, f.z + f.nz * w * k]; }, tone(shade));
        }
        crests.push(frames.filter((f) => f.h > 0.5).map((f) => new THREE.Vector3(f.x, f.h, f.z)));
      }
      const geometry = (sheet: Sheet) => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(sheet.p, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(sheet.c, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(sheet.uv, 2));
        g.setIndex(sheet.i);
        g.computeVertexNormals();
        return g;
      };
      return { parts: [...bands].map(([band, sheets]) => ({ share: band / 9, back: geometry(sheets.back), face: geometry(sheets.face) })), crests };
    };

    // Wind ripples for the dune we stand on.
    const rippleCanvas = document.createElement('canvas');
    rippleCanvas.width = rippleCanvas.height = 512;
    const rg = rippleCanvas.getContext('2d')!;
    rg.fillStyle = '#f2f2f2'; rg.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 22; row++) for (const [offset, tone, alpha] of [[0, '#8c8c8c', 0.5], [8, '#ffffff', 0.7]] as const) {
      rg.strokeStyle = tone; rg.globalAlpha = alpha * mix(0.6, 1, mood.energy); rg.lineWidth = 6; rg.beginPath();
      const phase = random() * 6.28;
      for (let x = 0; x <= 512; x += 8) { const y = row * 23.27 + offset + 5 * Math.sin((x / 512) * Math.PI * 2 * (2 + (row % 3)) + phase); if (x) rg.lineTo(x, y); else rg.moveTo(x, y); }
      rg.stroke();
    }
    const rippleMap = new THREE.CanvasTexture(rippleCanvas);
    rippleMap.colorSpace = THREE.SRGBColorSpace;
    rippleMap.wrapS = rippleMap.wrapT = THREE.RepeatWrapping;
    rippleMap.rotation = 0.5;
    rippleMap.anisotropy = 8;
    const faceMaterial = matte({ vertexColors: true });
    const nearBackMaterial = matte({ vertexColors: true, map: rippleMap, bumpMap: rippleMap, bumpScale: 2 });

    const here = hang([foreground], 9, 12, false);
    const nearBack = new THREE.Mesh(here.parts[0].back, nearBackMaterial), nearFace = new THREE.Mesh(here.parts[0].face, faceMaterial);
    for (const mesh of [nearBack, nearFace]) { mesh.castShadow = mesh.receiveShadow = true; terrain.add(mesh); }

    // The sea beyond.
    const far: Ridge[] = [];
    const wobble = (x: number, period: number, phase: number) => Math.sin(x / period + phase);
    if (a.dunes === 'transverse' || a.dunes === 'barchanoid') {
      const lean = (random() - 0.5) * 0.5;
      for (let row = 0; row < 8; row++) {
        const z0 = -68 - row * 40 * (1 + row * 0.22), reach = 190 + row * 95, phase = random() * 6.28, phase2 = random() * 6.28;
        const pts: [number, number, number][] = [];
        const step = a.dunes === 'barchanoid' ? 14 : 24;
        for (let x = -reach; x <= reach; x += step) {
          const edge = smooth(reach, reach * 0.8, Math.abs(x));
          const scallop = a.dunes === 'barchanoid' ? Math.abs(Math.sin(x / 34 + phase)) : 1;
          const z = z0 + lean * x + (a.dunes === 'barchanoid' ? 20 * scallop : 16 * wobble(x, 85, phase));
          const h = big * (11 + row * 4) * (a.dunes === 'barchanoid' ? 0.35 + 0.75 * scallop : 0.72 + 0.34 * wobble(x, 95, phase2)) * edge;
          pts.push([x, z, Math.max(0.2, h)]);
        }
        far.push({ pts, slip: 1, back: 3.2, backMax: 60 + row * 12 });
      }
    } else if (a.dunes === 'seif') {
      for (const sign of [-1, 1]) for (let lane = 0; lane < 4; lane++) {
        const x0 = sign * (64 + lane * 62 * (1 + lane * 0.25)) * mix(0.9, 1.1, random()), phase = random() * 6.28, phase2 = random() * 6.28;
        const pts: [number, number, number][] = [];
        for (let z = 60 - lane * 30; z >= -640; z -= 32) {
          const t = (60 - z) / 700;
          pts.push([x0 * (1 + t * 0.5) + 11 * wobble(z, 62, phase), z, big * (13 + lane * 6) * (0.75 + 0.32 * wobble(z, 48, phase2)) * smooth(0, 0.08, t) * smooth(1, 0.9, t) + 0.2]);
        }
        far.push({ pts, slip: 1, back: 2.4, backMax: 30 + lane * 10 });
      }
      for (let row = 0; row < 3; row++) far.push({ pts: Array.from({ length: 13 }, (_unused, i) => { const x = -420 + i * 70; return [x, -560 - row * 90 + 20 * wobble(x, 90, row), big * (30 + row * 12) * (0.7 + 0.3 * wobble(x, 130, row * 2))] as [number, number, number]; }), slip: 1, back: 3, backMax: 90 });
    } else {
      const spots: [number, number][] = [[-105, -150], [112, -175], [-10, -230], [-170, -240], [160, -300], [40, -380], [-120, -400], [250, -470], [-280, -480], [-20, -560], [140, -600], [-200, -640]];
      for (const [sx, sz] of spots) {
        const x = sx + (random() - 0.5) * 40, z = sz + (random() - 0.5) * 30, peak = big * mix(17, 30, random()) * (1 + -sz / 1100), arms = 3 + Math.floor(random() * 2), turn = random() * 6.28;
        for (let arm = 0; arm < arms; arm++) {
          const angle = turn + (arm / arms) * 6.28 + (random() - 0.5) * 0.5, length = peak * mix(1.9, 2.7, random()), bend = (random() - 0.5) * 0.9;
          const pts: [number, number, number][] = [];
          for (let k = 0; k <= 8; k++) { const t = k / 8, d = length * t, ang = angle + bend * t; pts.push([x + Math.cos(ang) * d, z + Math.sin(ang) * d, Math.max(0.2, peak * (1 - t) ** 1.35)]); }
          // Keep the standing ground clear: an arm that would cross it is left out.
          if (pts.some(([px, pz]) => Math.abs(px) < 62 && pz > -112)) continue;
          far.push({ pts, slip: arm % 2 ? 1 : -1, back: 1.9, backMax: 90, face: 1.6 });
        }
      }
    }
    // A middle-distance crest for whoever is passing.
    const passage: Ridge = { pts: [[-78, -74, 0.2], [-62, -80, 5.5], [-44, -86, 7.5], [-26, -90, 6.8], [-10, -95, 4.5], [6, -99, 0.2]], slip: 1, back: 3, backMax: 22 };
    if (a.others === 'caravan') far.push(passage);
    const beyond = hang(far, a.dunes === 'barchanoid' ? 2 : 3, 4, true);
    for (const part of beyond.parts) {
      const material = matte({ vertexColors: true, emissive: haze.clone().multiplyScalar(part.share) });
      for (const geometry of [part.back, part.face]) { const mesh = new THREE.Mesh(geometry, material); mesh.receiveShadow = true; terrain.add(mesh); }
    }

    // Sand smoking off the crests.
    const blowing = a.air === 'wind' ? 1 : mood.energy * 0.75;
    const plumeColour = sand.clone().lerp(new THREE.Color('#fff4dc'), 0.35);
    const veil = (crests: THREE.Vector3[][], reach: number, lift: number, opacity: number) => {
      const positions: number[] = [], index: number[] = [];
      for (const crest of crests) {
        const base = positions.length / 3;
        crest.forEach((c, i) => {
          for (let row = 0; row < 3; row++) { const t = row / 2, gust = 0.75 + 0.25 * Math.sin(i * 0.33 + crest[0].x); positions.push(c.x - side * reach * t * gust * 0.5, c.y + lift * t * gust - lift * 0.4 * t * t, c.z + reach * t * gust); }
          if (i < crest.length - 1) for (let row = 0; row < 2; row++) { const p = base + i * 3 + row; index.push(p, p + 1, p + 3, p + 1, p + 4, p + 3); }
        });
      }
      if (!index.length) return;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: plumeColour, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, roughness: 1 }));
      root.add(mesh);
    };
    if (blowing > 0.55) {
      veil(beyond.crests, 9 * blowing * big, 3.5 * big, 0.2 * blowing);
    }
    const crestLine = (here.crests[0] ?? []).filter((c) => Math.hypot(c.x - eye.x, c.z - eye.z) > 9);
    const grainCount = crestLine.length ? Math.round(mix(40, 420, blowing)) : 0;
    const grains = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(1, 0), matte({ color: sand }), Math.max(1, grainCount));
    grains.count = grainCount;
    grains.frustumCulled = false;
    const seeds = Array.from({ length: grainCount }, () => ({ crest: crestLine[Math.floor(random() * crestLine.length)], phase: random(), speed: 0.3 + random() * 0.5, lift: random(), size: 0.02 + random() * 0.035 }));
    const matrix = new THREE.Matrix4();
    const blow = (time: number) => {
      seeds.forEach((seed, i) => {
        const t = (seed.phase + time * seed.speed * mix(0.3, 1, blowing)) % 1, size = seed.size * (1 - t * 0.5);
        matrix.makeScale(size, size, size).setPosition(seed.crest.x - 3.2 * t * mix(0.5, 1.2, blowing), seed.crest.y + 0.05 + seed.lift * 0.8 * t - 1.3 * t * t, seed.crest.z + (seed.lift - 0.5) * t);
        grains.setMatrixAt(i, matrix);
      });
      grains.instanceMatrix.needsUpdate = true;
    };
    blow(0);
    root.add(grains);

    // Stones and scrub on the corridor floor.
    const dummy = new THREE.Object3D();
    const strew = (geometry: THREE.BufferGeometry, material: THREE.Material, count: number, place: (i: number) => { at: P3; scale: P3; turn?: number; tone?: THREE.Color } | null) => {
      const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, count));
      let n = 0;
      for (let i = 0; i < count; i++) {
        const item = place(i);
        if (!item) continue;
        dummy.position.set(...item.at); dummy.scale.set(...item.scale); dummy.rotation.set(0, item.turn ?? 0, 0); dummy.updateMatrix();
        mesh.setMatrixAt(n, dummy.matrix);
        if (item.tone) mesh.setColorAt(n, item.tone);
        n++;
      }
      mesh.count = n;
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
      return mesh;
    };
    const stoneTone = new THREE.Color(a.corridor === 'salt' ? '#9a958c' : '#5c5249');
    strew(new THREE.DodecahedronGeometry(1, 0), matte({ flatShading: true }), Math.round(mix(60, 420, mood.density)), () => {
      const x = (random() - 0.5) * 110, z = 6 - random() ** 1.4 * 150, size = 0.08 + random() ** 3 * 0.5;
      return { at: [x, size * 0.3, z], scale: [size, size * 0.6, size], turn: random() * 6, tone: hazed(stoneTone, x, z) };
    });
    const scrubTone = blend('#5f6470', '#7a7448');
    strew(new THREE.ConeGeometry(0.5, 1, 5), matte(), Math.round(mood.density * 46), () => {
      const x = (random() - 0.5) * 120, z = -2 - random() * 150, size = 0.4 + random() * 0.7;
      return { at: [x, size * 0.3, z], scale: [size * 1.3, size * 0.7, size * 1.3], turn: random() * 6, tone: hazed(scrubTone, x, z) };
    });

    // Signs of other people.
    const dark = new THREE.MeshStandardMaterial({ color: blend('#262436', '#2c2420'), roughness: 1 });
    const ball = (rx: number, ry: number, rz: number, x: number, y: number, z: number) => { const g = new THREE.SphereGeometry(1, 10, 8).toNonIndexed(); g.scale(rx, ry, rz); g.translate(x, y, z); return g; };
    const stick = (from: P3, to: P3, radius: number) => {
      const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to), along = end.clone().sub(start);
      const g = new THREE.CylinderGeometry(radius, radius, along.length(), 6).toNonIndexed();
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), along.clone().normalize()));
      g.translate(...(start.add(end).multiplyScalar(0.5).toArray() as [number, number, number]));
      return g;
    };
    let ember: THREE.MeshStandardMaterial | null = null;
    const walkers: { mesh: THREE.Mesh; y: number; phase: number }[] = [];
    if (a.others === 'caravan') {
      const frames = sample(passage, 8).filter((f) => f.h > 2.5);
      const count = 5 + Math.round(mood.density * 4), grow = 1.7;
      for (let i = 0; i <= count; i++) {
        const f = frames[Math.min(frames.length - 1, Math.round(((i + 0.5) / (count + 1)) * (frames.length - 1)))];
        const next = frames[Math.min(frames.length - 1, frames.indexOf(f) + 1)], heading = Math.atan2(next.x - f.x || 1, next.z - f.z);
        const parts = i === count
          ? [ball(0.2, 0.66, 0.2, 0, 0.7, 0), ball(0.14, 0.15, 0.14, 0, 1.5, 0), stick([0.3, 0, 0.2], [0.26, 1.8, 0.15], 0.025)]
          : [ball(0.37, 0.42, 0.86, 0, 1.55, 0), ball(0.3, 0.36, 0.44, 0, 2.0, -0.06), ball(0.42, 0.42, 0.5, 0, 2.05, -0.06), stick([0, 1.5, 0.75], [0, 2.4, 1.5], 0.13), ball(0.12, 0.13, 0.24, 0, 2.45, 1.66),
            ...[[0.2, 0.56, 0.25], [-0.2, 0.56, -0.25], [0.2, -0.62, -0.25], [-0.2, -0.62, 0.25]].map(([x, z, swing]) => stick([x, 1.3, z], [x, 0, z + swing], 0.07))];
        const merged = mergeGeometries(parts)!;
        for (const part of parts) part.dispose();
        const mesh = new THREE.Mesh(merged, dark);
        mesh.position.set(f.x, f.h - 0.1, f.z);
        mesh.rotation.y = heading;
        mesh.scale.setScalar(grow);
        mesh.castShadow = true;
        root.add(mesh);
        walkers.push({ mesh, y: mesh.position.y, phase: random() * 6.28 });
      }
    } else if (a.others === 'footprints') {
      const prints = (here.crests[0] ?? []).filter((c) => c.z < eye.z - 3).map((c, i) => ({ x: c.x + (i % 2 ? 0.22 : -0.22), y: c.y - 0.1, z: c.z }));
      const last = prints.at(-1) ?? { x: 4, y: 0, z: 10 };
      for (let d = 0; d < 150; d += 0.8) prints.push({ x: last.x - d * 0.2 + Math.sin(d / 14) * 3 + (Math.round(d / 0.8) % 2 ? 0.2 : -0.2), y: 0.02, z: last.z - d });
      strew(new THREE.SphereGeometry(1, 6, 4), matte(), prints.length, (i) => ({ at: [prints[i].x, prints[i].y, prints[i].z], scale: [0.11, 0.05, 0.16], tone: hazed(sand.clone().multiplyScalar(0.5), prints[i].x, prints[i].z) })).castShadow = false;
    } else if (a.others === 'fire') {
      const fx = -17 * side, fz = -74;
      ember = new THREE.MeshStandardMaterial({ color: '#ffb056', emissive: '#ff7a1c', emissiveIntensity: 3 });
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), ember);
      flame.position.set(fx, 0.5, fz);
      flame.scale.y = 1.5;
      const halo = new THREE.Mesh(new THREE.SphereGeometry(3.2, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffb466', transparent: true, opacity: 0.22, depthWrite: false }));
      halo.position.copy(flame.position);
      const smoke = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 0.25, 22, 8, 1, true), new THREE.MeshStandardMaterial({ color: haze.clone().lerp(new THREE.Color('#8a8690'), 0.4), transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
      smoke.position.set(fx - side * 2.5, 11.5, fz);
      smoke.rotation.z = side * 0.22;
      const tentGeometry = new THREE.PlaneGeometry(9, 5.5, 6, 3);
      { const p = tentGeometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, 2.4 - Math.abs(p.getX(i)) * 0.22 - Math.abs(p.getY(i)) * 0.5 + 0.35 * Math.cos(p.getX(i) * 2.1)); }
      tentGeometry.rotateX(-Math.PI / 2);
      tentGeometry.computeVertexNormals();
      const tent = new THREE.Mesh(tentGeometry, new THREE.MeshStandardMaterial({ color: dark.color, roughness: 1, side: THREE.DoubleSide }));
      tent.position.set(fx + side * 8, 0, fz - 3);
      tent.castShadow = true;
      root.add(flame, halo, smoke, tent);
    } else if (a.others === 'markers') {
      const drumTone = new THREE.Color('#6a3a2a');
      strew(new THREE.CylinderGeometry(0.42, 0.42, 1.2, 10), new THREE.MeshStandardMaterial({ roughness: 0.9 }), 22, (i) => {
        const z = 14 - i * 17, x = 10 * side + Math.sin(i * 0.5) * 5 - i * 0.6 * side, sunk = random() * 0.5;
        return { at: [x, 0.6 - sunk, z], scale: [1, 1, 1], turn: random() * 3, tone: hazed(i % 3 ? drumTone : new THREE.Color('#d9d2c0'), x, z) };
      });
    } else if (a.others === 'tracks') {
      const positions: number[] = [], colours: number[] = [], index: number[] = [];
      const rut = sand.clone().multiplyScalar(0.45).lerp(floorColour, 0.4);
      for (const offset of [-0.95, 0.95]) {
        const base = positions.length / 3;
        for (let i = 0; i <= 120; i++) {
          const z = 18 - i * 3.6, x = 7 * side + Math.sin(i / 9) * 6 + Math.sin(i / 23) * 12 - side * i * 0.08 + offset;
          for (const half of [-0.28, 0.28]) { const c = hazed(rut, x, z); positions.push(x + half, 0.03, z); colours.push(c.r, c.g, c.b); }
          if (i < 120) { const p = base + i * 2; index.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      const ruts = new THREE.Mesh(geometry, matte({ vertexColors: true, side: THREE.DoubleSide }));
      ruts.receiveShadow = true;
      terrain.add(ruts);
    }

    const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 1400);
    camera.position.copy(eye);
    camera.lookAt(aim);
    const drifts = new THREE.Group();
    root.add(drifts);
    const driftMaterial = matte({ color: sand });
    const driftGeometry = new THREE.SphereGeometry(1, 18, 10);
    const caster = new THREE.Raycaster();
    const groundAt = (x: number, z: number) => {
      caster.set(new THREE.Vector3(x, 400, z), new THREE.Vector3(0, -1, 0));
      const hit = caster.intersectObjects([nearBack, nearFace], false)[0];
      return Math.max(0, hit ? hit.point.y : 0);
    };
    const forward = new THREE.Vector3(aim.x - eye.x, 0, aim.z - eye.z).normalize();

    const world: World = {
      object: root, camera, background: haze, capacity: SLOTS.length, ground: terrain, keyLight: key,
      place(items: readonly Placeable[]) {
        drifts.clear();
        root.updateMatrixWorld(true);
        items.forEach((item, index) => {
          const [sx, sz, tall, wide] = SLOTS[index % SLOTS.length];
          const fit = Math.min(tall / Math.max(item.height, 0.01), wide / Math.max(item.radius, 0.01));
          const scale = Math.min(fit, item.hero ? 2.2 : 3);
          const high = item.height * scale, reach = item.radius * scale, bulk = Math.max(high, reach * 1.2);
          let x = a.vantage === 'saddle' ? -sx : sx, z = sz;
          // Something small would be lost on the corridor floor, so it stands close to us instead.
          if (item.hero && bulk < 5) {
            const distance = Math.min(26, Math.max(7, bulk / 0.2));
            x = eye.x + forward.x * distance + side * -0.12 * distance;
            z = eye.z + forward.z * distance;
          }
          const y = groundAt(x, z);
          item.holder.scale.setScalar(scale);
          item.holder.position.set(x, y - a.buried * 0.22 * high - (y > 0.3 ? reach * 0.12 : 0), z);
          item.holder.rotation.y = Math.atan2(eye.x - x, eye.z - z) * 0.7 + (context.random() - 0.5) * 0.5;
          if (a.buried > 0.25) for (let i = 0; i < 3; i++) {
            const angle = Math.PI * (0.5 + side * 0.5) + (context.random() - 0.5) * 1.6, size = reach * mix(0.35, 0.6, context.random()) * a.buried;
            const heap = new THREE.Mesh(driftGeometry, driftMaterial);
            heap.scale.set(size * 1.5, size * 0.42, size);
            heap.position.set(x + Math.cos(angle) * reach * 0.8, y - size * 0.06, z + Math.sin(angle) * reach * 0.8);
            heap.rotation.y = context.random() * 3;
            heap.castShadow = heap.receiveShadow = true;
            drifts.add(heap);
          }
        });
        camera.lookAt(aim);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        const shadow = key.shadow.camera;
        shadow.left = -75; shadow.right = 75; shadow.bottom = -75; shadow.top = 75;
        shadow.near = 20; shadow.far = 420;
        shadow.updateProjectionMatrix();
      },
      update(_dt, time) {
        if (grainCount) blow(time);
        if (ember) ember.emissiveIntensity = 2.6 + Math.sin(time * 6.1) * 0.7 + Math.sin(time * 13.7) * 0.3;
        for (const walker of walkers) walker.mesh.position.y = walker.y + Math.abs(Math.sin(time * mix(1, 3, mood.energy) + walker.phase)) * 0.08;
      },
      dispose() {
        key.shadow.map?.dispose();
        driftGeometry.dispose();
        driftMaterial.dispose();
        disposeTree(root);
      },
    };
    return world;
  },
});
