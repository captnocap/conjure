import * as THREE from 'three';
import { type Placeable, choice, clamp01, defineWorld, disposeTree, mix, score } from '@conjure/kit';
import { Batch, type P3, vary } from './sav';

const PITCH = THREE.MathUtils.degToRad(17);
const EXTENT = 15; // half the width of the frame, metres
const X = 25, Z_FAR = -32, Z_NEAR = 20;
/** [x, z, size]: the hero in the open middle, the rest far apart toward the corners. */
const SLOTS = [[1.5, 2.5, 1.25], [-9.3, -6, 1], [9.8, -7.5, 0.95], [-8.4, 8, 0.82], [8.8, 7, 0.8]] as const;

export default defineWorld({
  questions: {
    season: choice('What state is the grass in?', {
      dry: 'Late dry season: tawny gold stems, bare red patches, everything waiting for rain.',
      green: 'Just after the rains: a short bright green flush over the whole plain.',
      burnt: 'Recently burned: wide black scars through the gold with a haze of new green at their edges.',
      drought: 'Deep drought: grass grazed to nothing, pale cracked dust from here to the hills.',
    }),
    horizon: choice('What stands on the horizon?', {
      hills: 'A long low line of blue hills, layer behind layer.',
      mountain: 'One immense snow-capped volcano floating above the haze, like Kilimanjaro.',
      escarpment: 'The flat-topped wall of a rift escarpment running the whole width of the view.',
      kopjes: 'Low hills, with rounded granite kopjes rising out of the plain in front of them.',
      flat: 'Nothing at all: the plain runs to a shimmering ruled line.',
    }),
    sky: choice('What is the sky doing?', {
      clear: 'Clear and enormous, gold at the horizon fading up to pale blue.',
      haze: 'Thick with dust and smoke, the sun a flat red coin you can look straight at.',
      storm: 'A dark anvil of storm cloud building on one side, trailing a curtain of rain that has not arrived yet.',
      cirrus: 'High combed streaks of cloud catching pink and apricot light.',
    }),
    trails: choice('What marks cross the ground?', {
      trail: 'A single red earth game trail winding away to the horizon.',
      network: 'Several trails converging on a muddy waterhole.',
      track: 'The twin ruts of a vehicle track, grass growing down the middle.',
      none: 'No path of any kind, untouched grass.',
    }),
    herds: choice('What moves in the far distance?', {
      none: 'Nothing. The plain is empty.',
      file: 'A long thin line of wildebeest walking nose to tail across the middle distance.',
      scattered: 'Zebra and gazelle scattered grazing, small as punctuation.',
      cattle: "A herder's string of pale cattle being walked home by a figure in red.",
    }),
    trees: score('How many thorn trees stand on the plain?', ['A treeless sea of grass', 'A few scattered flat crowns', 'Open acacia woodland']),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const dusk = mood.daylight >= 0.5, side = dusk ? 1 : -1;
    const lift = Math.sin(Math.PI * mood.daylight); // 0 at the ends of the day, 1 at noon
    const gold = mix(0.35, 1, mood.warmth) * (1 - lift * 0.45);

    // Palette.
    const grass = new THREE.Color({ dry: '#d7b96c', green: '#a3b45e', burnt: '#d3b566', drought: '#d9ccb0' }[a.season]).lerp(new THREE.Color('#e0a94e'), gold * 0.22).lerp(new THREE.Color('#b9b3a0'), mood.wear * 0.2 + (1 - mood.cheer) * 0.12);
    const earth = new THREE.Color('#b05c38').lerp(new THREE.Color('#9c7a62'), mood.wear * 0.3);
    const haze = new THREE.Color({ clear: '#f1e2bd', haze: '#ecc79a', storm: '#e6dcc4', cirrus: '#f3dcc0' }[a.sky]).lerp(new THREE.Color('#f6c98a'), gold * 0.3);
    const skyTop = new THREE.Color({ clear: '#cddfe8', haze: '#e4d3b8', storm: '#c7d0d6', cirrus: '#d6e0e6' }[a.sky]).lerp(new THREE.Color('#e9dcc8'), gold * 0.25);
    const css = (c: THREE.Color, alpha = 1) => `rgba(${Math.round(c.r ** (1 / 2.2) * 255)},${Math.round(c.g ** (1 / 2.2) * 255)},${Math.round(c.b ** (1 / 2.2) * 255)},${alpha})`;
    const far = (z: number) => clamp01((2 - z) / 32); // 0 near the viewer, 1 at the horizon

    // Lights: a low sun from one side and slightly behind, so shadows run long toward the viewer.
    root.add(new THREE.HemisphereLight(new THREE.Color('#fff3dc').lerp(skyTop, 0.4), '#a58a66', 0.68));
    const key = new THREE.DirectionalLight(new THREE.Color().setHSL(mix(0.11, 0.07, gold), 0.85, mix(0.72, 0.9, lift)), mix(5.2, 3.4, lift));
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.05;
    key.shadow.bias = -0.0004;
    key.shadow.radius = 4;
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight('#dfe8f4', 0.45);
    fill.position.set(-side * 6, 6, 14);
    root.add(fill);

    // Paths, as polylines in world metres, shared by the painted ground and the 3D grass.
    const main: [number, number][] = [[-3, 20], [-1.6, 12], [-4.2, 4], [-3, -4], [0.5, -12], [-1.5, -22], [2, -32]];
    const wobble = (pts: [number, number][]) => pts.map(([x, z], i) => [x + (i ? (random() - 0.5) * 1.2 : 0), z] as [number, number]);
    const smooth = (pts: [number, number][]) => new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z))).getPoints(60).map((p) => [p.x, p.z] as [number, number]);
    const paths: { pts: [number, number][]; width: number }[] = [];
    const hole: [number, number] = [3.4 + (random() - 0.5), -12.5];
    if (a.trails === 'trail') paths.push({ pts: smooth(wobble(main)), width: 0.6 });
    else if (a.trails === 'track') { const c = smooth(wobble(main)); for (const s of [-0.55, 0.55]) paths.push({ pts: c.map(([x, z]) => [x + s, z]), width: 0.36 }); }
    else if (a.trails === 'network') {
      paths.push({ pts: smooth([[-3, 20], [-1.6, 12], [-4.2, 4], [-2.5, -4], [hole[0] - 1.5, hole[1] + 1.5]]), width: 0.55 });
      paths.push({ pts: smooth([[hole[0] + 1.5, hole[1] - 0.5], [9, -17], [15, -24], [22, -30]]), width: 0.5 });
      paths.push({ pts: smooth([[hole[0] - 2, hole[1]], [-5, -14], [-14, -17], [-25, -19]]), width: 0.5 });
      paths.push({ pts: smooth([[hole[0], hole[1] - 1.5], [1, -20], [-2, -32]]), width: 0.45 });
      paths.push({ pts: smooth([[hole[0] + 2, hole[1] + 1], [14, -3], [25, 0]]), width: 0.45 });
    }
    const onPath = (x: number, z: number, pad: number) => paths.some((path) => path.pts.some(([px, pz]) => Math.hypot(px - x, pz - z) < path.width + pad));
    const scars = a.season === 'burnt' ? Array.from({ length: 5 }, () => ({ x: (random() - 0.5) * 40, z: mix(-26, 12, random()), rx: mix(4, 9, random()), rz: mix(1.6, 3.5, random()) })) : [];
    const scarred = (x: number, z: number) => Math.min(9, ...scars.map((s) => Math.hypot((x - s.x) / s.rx, (z - s.z) / s.rz)));

    // Painted ground.
    const SIZE = 1024, canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext('2d')!;
    const cx = (x: number) => ((x + X) / (2 * X)) * SIZE, cz = (z: number) => ((z - Z_FAR) / (Z_NEAR - Z_FAR)) * SIZE, cs = SIZE / (2 * X);
    const fade = ctx.createLinearGradient(0, 0, 0, SIZE);
    fade.addColorStop(0, css(grass.clone().lerp(haze, 0.6)));
    fade.addColorStop(0.45, css(grass.clone().lerp(haze, 0.22)));
    fade.addColorStop(1, css(grass));
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 900; i++) {
      const x = (random() - 0.5) * 2 * X, z = mix(Z_FAR, Z_NEAR, random()), f = far(z);
      const tone = random() < 0.12 && a.season !== 'green' ? earth.clone().lerp(grass, 0.45) : vary(grass, random, 0.16);
      ctx.fillStyle = css(tone.lerp(haze, f * 0.5), mix(0.5, 0.25, f));
      ctx.beginPath();
      ctx.ellipse(cx(x), cz(z), mix(1.6, 0.5, random()) * cs * mix(1.3, 0.8, f), mix(0.5, 0.16, random()) * cs, 0, 0, 6.3);
      ctx.fill();
    }
    for (const s of scars) {
      for (let k = 0; k < 2; k++) {
        ctx.fillStyle = k ? css(new THREE.Color('#2a2420').lerp(haze, far(s.z) * 0.45), 0.92) : css(new THREE.Color('#7fa04a').lerp(haze, far(s.z) * 0.4), 0.6);
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) { const t = (i / 40) * 6.283, r = (k ? 1 : 1.18) * (1 + 0.16 * Math.sin(t * 5 + s.x) + 0.1 * Math.sin(t * 9 + s.z)); ctx.lineTo(cx(s.x + Math.cos(t) * s.rx * r), cz(s.z + Math.sin(t) * s.rz * r)); }
        ctx.fill();
      }
    }
    if (a.season === 'drought') {
      ctx.strokeStyle = css(new THREE.Color('#a08a70'), 0.5);
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 260; i++) { let x = cx((random() - 0.5) * 2 * X), z = cz(mix(-18, Z_NEAR, random())); ctx.beginPath(); ctx.moveTo(x, z); for (let k = 0; k < 4; k++) { x += (random() - 0.5) * 34; z += (random() - 0.5) * 14; ctx.lineTo(x, z); } ctx.stroke(); }
    }
    ctx.lineCap = ctx.lineJoin = 'round';
    for (const pass of [0, 1])
      for (const path of paths) {
        for (let i = 1; i < path.pts.length; i++) {
          const [x0, z0] = path.pts[i - 1], [x1, z1] = path.pts[i], f = far(z1);
          ctx.strokeStyle = pass ? css(earth.clone().lerp(haze, f * 0.55)) : css(earth.clone().lerp(grass, 0.55).lerp(haze, f * 0.5), 0.75);
          ctx.lineWidth = path.width * 2 * cs * (pass ? 1 : 1.9) * mix(1, 0.6, f);
          ctx.beginPath(); ctx.moveTo(cx(x0), cz(z0)); ctx.lineTo(cx(x1), cz(z1)); ctx.stroke();
        }
      }
    if (a.trails === 'network') {
      const ring = (rx: number, rz: number, colour: string) => { ctx.fillStyle = colour; ctx.beginPath(); ctx.ellipse(cx(hole[0]), cz(hole[1]), rx * cs, rz * cs, 0, 0, 6.3); ctx.fill(); };
      ring(4.4, 2.3, css(earth.clone().lerp(grass, 0.3), 0.9));
      ring(3.5, 1.75, css(new THREE.Color('#6d4a34')));
      ring(2.7, 1.25, css(a.season === 'drought' ? new THREE.Color('#8a6a4c') : skyTop.clone().lerp(new THREE.Color('#8fb0c4'), 0.5)));
      if (a.season !== 'drought') ring(1.2, 0.4, css(haze, 0.7));
    }
    const groundMap = new THREE.CanvasTexture(canvas);
    groundMap.colorSpace = THREE.SRGBColorSpace;
    groundMap.anisotropy = 8;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(2 * X, Z_NEAR - Z_FAR), new THREE.MeshStandardMaterial({ map: groundMap, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, (Z_NEAR + Z_FAR) / 2);
    ground.receiveShadow = true;
    root.add(ground);

    // Standing grass: thousands of blades in one draw call, thinning and paling with distance.
    const clear = (x: number, z: number, pad: number) => SLOTS.every(([sx, sz, size]) => Math.hypot(x - sx, z - sz) > pad * size);
    const tufts = Math.round(mix(900, 2300, mood.density) * { dry: 1, green: 0.8, burnt: 0.9, drought: 0.3 }[a.season]);
    const blade = new THREE.ConeGeometry(0.5, 1, 4);
    blade.translate(0, 0.5, 0);
    const field = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ roughness: 1 }), tufts + 40);
    const dummy = new THREE.Object3D();
    let placed = 0;
    for (let i = 0; i < tufts + 40; i++) {
      const front = i >= tufts; // a fringe of tall stems right under the lens
      const x = (random() - 0.5) * 2 * (front ? 17 : 23), z = front ? mix(14.5, 17.5, random()) : mix(-29, 15, random() ** 0.8);
      if (!front && (onPath(x, z, 0.25) || !clear(x, z, 1.5))) continue;
      if (a.trails === 'network' && Math.hypot((x - hole[0]) / 3.8, (z - hole[1]) / 2) < 1) continue;
      const f = far(z), burn = scarred(x, z);
      const h = (front ? mix(1.3, 2.4, random()) : mix(0.35, 0.95, random()) * (a.season === 'green' ? 0.6 : 1) * (burn < 1 ? 0.3 : 1)) * mix(1, 0.6, f);
      dummy.position.set(x, 0, z);
      dummy.rotation.set((random() - 0.5) * 0.5, random() * 3, (random() - 0.5) * 0.5);
      dummy.scale.set(mix(0.1, 0.2, random()) * (front ? 1.6 : 1), h, mix(0.1, 0.2, random()));
      dummy.updateMatrix();
      field.setMatrixAt(placed, dummy.matrix);
      const tone = burn < 1 ? new THREE.Color(burn < 0.75 ? '#3a342c' : '#7aa046') : vary(grass, random, 0.14).offsetHSL(0, 0, front ? -0.1 : 0.02);
      field.setColorAt(placed++, tone.lerp(haze, f * 0.5));
    }
    field.count = placed;
    field.instanceMatrix.needsUpdate = true;
    if (field.instanceColor) field.instanceColor.needsUpdate = true;
    field.castShadow = false;
    field.receiveShadow = true;
    root.add(field);

    // Set dressing in two merged meshes: smooth (trunks, animals) and faceted (crowns, rock).
    const smoothB = new Batch(), facet = new Batch();
    const acacia = (x: number, z: number, size: number) => {
      const f = far(z), bark = new THREE.Color('#5a493b').lerp(haze, f * 0.55), leaf = new THREE.Color(a.season === 'drought' ? '#8f8a62' : a.season === 'green' ? '#55803c' : '#74803f').lerp(haze, f * 0.55);
      const H = mix(5, 7.5, random()) * size, R = mix(3, 5, random()) * size, fork = H * mix(0.38, 0.5, random()), lx = (random() - 0.5) * size;
      smoothB.shaped([[x, -0.1, z], [x + lx * 0.4, fork * 0.5, z], [x + lx, fork, z]], (t) => mix(0.3, 0.2, t) * size, bark, 6);
      const n = 5 + Math.floor(random() * 2);
      for (let i = 0; i < n; i++) { const t = (i / n) * 6.283 + random() * 0.5, r = R * mix(0.5, 0.78, random()); smoothB.rod([x + lx, fork, z], [x + lx + Math.cos(t) * r, H - 0.75 * size, z + Math.sin(t) * r * 0.8], 0.15 * size, 0.05 * size, bark, 5); }
      const clumps = Math.round(8 + R * 2);
      for (let i = 0; i < clumps; i++) {
        const t = i * 2.4 + random(), d = R * Math.sqrt((i + 0.5) / clumps), r = (R * 0.2 + 0.5 * size) * mix(0.8, 1.2, random());
        facet.blob([r, r * 0.32, r], [x + lx + Math.cos(t) * d, H - 0.5 * size + random() * 0.25 * size, z + Math.sin(t) * d * 0.85], vary(leaf, random, 0.07), [0, random() * 3, 0], 1);
      }
    };
    const want = Math.round(mix(0, 15, a.trees) + (a.trees > 0.15 ? random() * 2 : 0));
    const stands: [number, number][] = [];
    for (let i = 0, guard = 0; i < want && guard < 400; guard++) {
      const deep = random() < 0.7, x = (random() - 0.5) * (deep ? 40 : 34), z = deep ? mix(-28, -13, random()) : mix(-12, 4, random());
      if (!clear(x, z, 6.5) || onPath(x, z, 1.5) || stands.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 5.5) || (a.trails === 'network' && Math.hypot(x - hole[0], z - hole[1]) < 5)) continue;
      if (!deep && Math.abs(x) < 6) continue; // keep the middle open
      stands.push([x, z]); i++;
      acacia(x, z, mix(0.95, 0.42, far(z)));
    }

    // The horizon.
    const ridge = (z: number, height: number, tone: THREE.Color, rough: number, profile?: (u: number) => number) => {
      const shape = new THREE.Shape(), ph = random() * 20;
      shape.moveTo(-X - 4, -1);
      for (let i = 0; i <= 90; i++) {
        const u = i / 90, x = mix(-X - 4, X + 4, u);
        const y = profile ? profile(u) : 0.45 + 0.3 * Math.sin(u * 7 + ph) + 0.18 * Math.sin(u * 17 + ph * 2) + rough * 0.12 * Math.sin(u * 43 + ph * 3);
        shape.lineTo(x, Math.max(0.05, y) * height);
      }
      shape.lineTo(X + 4, -1);
      const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: tone, toneMapped: false }));
      mesh.position.z = z;
      root.add(mesh);
    };
    const blue = new THREE.Color('#8fa9c4').lerp(new THREE.Color('#b59fb0'), gold * 0.35).lerp(haze, a.sky === 'haze' ? 0.45 : 0.12);
    if (a.horizon === 'flat') {
      ridge(Z_FAR - 0.5, 0.5, haze.clone().lerp(blue, 0.35), 0, () => 0.8);
      ridge(Z_FAR - 0.2, 0.22, new THREE.Color('#e9f0f2'), 0, (u) => 0.6 + 0.4 * Math.sin(u * 60));
    } else if (a.horizon === 'escarpment') {
      ridge(Z_FAR - 3, 4.6, blue.clone().lerp(haze, 0.35), 1, (u) => 0.92 + 0.03 * Math.sin(u * 30) - 0.5 * clamp01(1 - Math.abs(u - 0.78) * 14) - 0.2 * clamp01(1 - Math.abs(u - 0.3) * 20));
      ridge(Z_FAR - 1, 2.2, blue.clone().lerp(new THREE.Color('#7f8f86'), 0.4), 1, (u) => 0.5 + 0.25 * Math.abs(Math.sin(u * 24)) + 0.1 * Math.sin(u * 9));
    } else {
      ridge(Z_FAR - 4, 4.4, blue.clone().lerp(haze, 0.55), 0);
      ridge(Z_FAR - 2.5, 3.2, blue.clone().lerp(haze, 0.25), 0.5);
      ridge(Z_FAR - 1, 2.0, blue.clone().lerp(new THREE.Color('#6f8d9c'), 0.35), 1);
      if (a.horizon === 'mountain') {
        const mx = -side * mix(4, 9, random()), w = 17, h = 12.5;
        const cone = (u: number) => { const x = mix(-X - 4, X + 4, u) - mx, t = Math.abs(x) / w; return t > 1 ? 0 : (1 - t) ** 1.25 * (Math.abs(x) < 2.6 ? 0.8 + 0.02 * Math.sin(x * 5) : 1) * (Math.abs(x) < 2.6 ? 1 : 0.8 / ((1 - 2.6 / w) ** 1.25)); };
        ridge(Z_FAR - 6, h, blue.clone().lerp(haze, 0.62), 0, cone);
        const snow = new THREE.Shape();
        snow.moveTo(mx - 4.3, h * 0.62);
        for (const [dx, dy] of [[-2.6, 0.8], [2.6, 0.8], [4.6, 0.6], [3.6, 0.63], [2.9, 0.55], [1.8, 0.66], [0.9, 0.58], [-0.2, 0.67], [-1.4, 0.56], [-2.4, 0.66], [-3.3, 0.57]]) snow.lineTo(mx + dx, h * dy);
        const cap = new THREE.Mesh(new THREE.ShapeGeometry(snow), new THREE.MeshBasicMaterial({ color: '#fbf8f0', toneMapped: false }));
        cap.position.z = Z_FAR - 5.9;
        root.add(cap);
      }
      if (a.horizon === 'kopjes') {
        const rock = new THREE.Color('#a39384').lerp(new THREE.Color('#c08a66'), gold * 0.3);
        for (const [kx, kz, ks] of [[-15 - random() * 3, -19, 1], [13 + random() * 4, -23, 0.75], [-2 + random() * 3, -26, 0.55]] as const) {
          if (!clear(kx, kz, 6)) continue;
          const tone = rock.clone().lerp(haze, far(kz) * 0.45);
          for (let i = 0; i < 9; i++) { const t = random() * 6.283, d = i ? mix(0.8, 3.4, random()) * ks : 0, s = (i ? mix(0.9, 1.9, random()) : 2.4) * ks; facet.blob([s * mix(0.9, 1.4, random()), s * mix(0.7, 1.1, random()), s], [kx + Math.cos(t) * d, s * 0.55 + (d < 1.6 * ks ? 1.6 * ks : 0), kz + Math.sin(t) * d * 0.6], vary(tone, random, 0.06), [random() * 0.4, random() * 3, random() * 0.4], 1); }
        }
      }
    }

    // Far-off animals.
    const beast = (x: number, z: number, s: number, tone: THREE.Color, heading: number, grazing = false) => {
      const c = Math.cos(heading), n = Math.sin(heading), at = (dx: number, y: number, dz = 0): P3 => [x + (dx * c + dz * n) * s, y * s, z + (-dx * n + dz * c) * s];
      smoothB.ball([0.62 * s, 0.34 * s, 0.26 * s], at(0, 1.05), tone, [0, heading, 0], 7);
      smoothB.ball([0.26 * s, 0.3 * s, 0.22 * s], at(0.38, 1.22), tone, undefined, 6);
      smoothB.rod(at(0.5, 1.2), at(0.85, grazing ? 0.45 : 1.25), 0.14 * s, 0.09 * s, tone, 5);
      for (const [dx, dz] of [[0.42, 0.12], [0.42, -0.12], [-0.45, 0.12], [-0.45, -0.12]]) smoothB.rod(at(dx, 0.85, dz), at(dx + (random() - 0.5) * 0.3, 0, dz), 0.07 * s, 0.045 * s, tone, 4);
    };
    if (a.herds === 'file') {
      const n = Math.round(mix(22, 46, mood.density)), z0 = mix(-21, -17, random()), dir = random() < 0.5 ? 1 : -1;
      for (let i = 0; i < n; i++) { const x = mix(-23, 23, i / (n - 1)) + (random() - 0.5) * 0.5, z = z0 + Math.sin(x * 0.22) * 1.6 + (random() - 0.5) * 0.4; if (clear(x, z, 4.2)) beast(x, z, mix(0.62, 0.74, random()), new THREE.Color('#3a332e').lerp(haze, far(z) * 0.4), dir > 0 ? 0 : Math.PI); }
    } else if (a.herds === 'scattered') {
      const n = Math.round(mix(14, 30, mood.density));
      for (let i = 0; i < n; i++) { const x = (random() - 0.5) * 44, z = mix(-26, -11, random()); if (!clear(x, z, 4.5) || onPath(x, z, 0.6)) continue; const zebra = random() < 0.45; beast(x, z, mix(1, 0.55, far(z)) * (zebra ? 0.9 : 0.6), new THREE.Color(zebra ? '#cfcac0' : '#c49a5e').lerp(haze, far(z) * 0.45), random() * 6.283, random() < 0.7); if (zebra) smoothB.ball([0.2, 0.26, 0.18], [x, 1.0 * mix(1, 0.55, far(z)) * 0.9, z], '#3a3632', undefined, 5); }
    } else if (a.herds === 'cattle') {
      const n = Math.round(mix(7, 14, mood.density)), z0 = mix(-17, -14, random());
      const coats = ['#e8e0d0', '#8a4a2c', '#2f2824', '#cdb48c'];
      let last = 0;
      for (let i = 0; i < n; i++) { const x = -18 + i * 1.7 + (random() - 0.5) * 0.5, z = z0 + Math.sin(i * 0.6) * 0.8; last = x; if (clear(x, z, 4.2)) beast(x, z, 0.72, new THREE.Color(coats[Math.floor(random() * coats.length)]).lerp(haze, far(z) * 0.4), Math.PI); }
      const hx = last + 2.2, s = 0.75;
      if (clear(hx, z0, 4)) {
        smoothB.shaped([[hx, 0.75 * s, z0], [hx, 1.2 * s, z0], [hx, 1.55 * s, z0]], (t) => mix(0.26, 0.17, t) * s, '#b8262c', 6);
        smoothB.ball([0.11 * s, 0.12 * s, 0.11 * s], [hx, 1.72 * s, z0], '#3d281e', undefined, 6);
        for (const d of [-0.08, 0.08]) smoothB.rod([hx + d * s, 0.8 * s, z0], [hx + d * 1.4 * s, 0, z0], 0.05 * s, 0.04 * s, '#3d281e', 4);
        smoothB.rod([hx - 0.3 * s, 0, z0 + 0.1], [hx - 0.22 * s, 2.0 * s, z0], 0.016, 0.014, '#6d5238', 4);
      }
    }
    // A few stones and old bones on the near ground for scale.
    for (let i = 0; i < 14; i++) { const x = (random() - 0.5) * 30, z = mix(-8, 14, random()); if (!clear(x, z, 3.2) || onPath(x, z, 0.3)) continue; const s = mix(0.15, 0.42, random()); facet.blob([s * 1.3, s * 0.7, s], [x, s * 0.3, z], vary('#9b8c7c', random, 0.08), [random(), random() * 3, 0], 0); }

    if (!smoothB.empty) root.add(smoothB.mesh({ roughness: 0.95 }));
    if (!facet.empty) root.add(facet.mesh({ roughness: 0.95, flatShading: true }));

    // Sky: one painted sheet that fills the frame behind everything and is skipped by the solid passes.
    const SKY = 512, sheet = document.createElement('canvas');
    sheet.width = sheet.height = SKY;
    const sky = sheet.getContext('2d')!;
    const horizonY = SKY * 0.57; // where the plain ends in the frame
    const g = sky.createLinearGradient(0, 0, 0, horizonY);
    g.addColorStop(0, css(skyTop));
    g.addColorStop(0.55, css(skyTop.clone().lerp(haze, 0.55)));
    g.addColorStop(1, css(haze.clone().lerp(new THREE.Color('#f7c787'), gold * 0.45)));
    sky.fillStyle = g;
    sky.fillRect(0, 0, SKY, SKY);
    const sunX = SKY * (0.5 + side * mix(0.36, 0.2, lift)), sunY = horizonY - SKY * mix(0.075, 0.36, lift), sunR = SKY * 0.034;
    const sunTone = a.sky === 'haze' ? new THREE.Color('#e0502c') : new THREE.Color('#fff6d8').lerp(new THREE.Color('#ffc46a'), gold * 0.7);
    if (a.sky !== 'haze') {
      const halo = sky.createRadialGradient(sunX, sunY, sunR * 0.6, sunX, sunY, sunR * 7);
      halo.addColorStop(0, css(new THREE.Color('#fff1c4'), 0.85));
      halo.addColorStop(1, css(new THREE.Color('#fff1c4'), 0));
      sky.fillStyle = halo;
      sky.fillRect(0, 0, SKY, SKY);
    }
    sky.fillStyle = css(sunTone);
    sky.beginPath(); sky.arc(sunX, sunY, sunR, 0, 6.3); sky.fill();
    if (a.sky === 'haze') for (let i = 0; i < 9; i++) { sky.fillStyle = css(haze.clone().lerp(new THREE.Color('#b98a6a'), 0.4), 0.22); sky.fillRect(0, horizonY - SKY * (0.02 + i * 0.045) - random() * 8, SKY, 5 + random() * 10); }
    if (a.sky === 'cirrus') {
      sky.lineCap = 'round';
      for (let i = 0; i < 26; i++) {
        const y = mix(SKY * 0.05, horizonY - SKY * 0.12, random()), x = random() * SKY, len = mix(60, 190, random());
        sky.strokeStyle = css(new THREE.Color('#fff7ee').lerp(new THREE.Color('#f5b48e'), gold * (0.3 + 0.5 * (y / horizonY))), 0.65);
        sky.lineWidth = mix(1.5, 5, random());
        sky.beginPath(); sky.moveTo(x, y); sky.quadraticCurveTo(x + len * 0.5, y - mix(4, 16, random()), x + len, y - mix(8, 30, random())); sky.stroke();
      }
    }
    if (a.sky === 'storm') {
      const sx = SKY * (0.5 - side * 0.27), base = horizonY - SKY * 0.2;
      const rain = sky.createLinearGradient(0, base, 0, horizonY);
      rain.addColorStop(0, css(new THREE.Color('#77828c'), 0.75)); rain.addColorStop(1, css(new THREE.Color('#77828c'), 0.12));
      sky.fillStyle = rain;
      sky.beginPath(); sky.moveTo(sx - 70, base); sky.lineTo(sx + 60, base); sky.lineTo(sx + 60 - side * 46, horizonY); sky.lineTo(sx - 70 - side * 46, horizonY); sky.fill();
      for (let i = 0; i < 60; i++) {
        const t = random(), u = random(), x = sx + (t - 0.5) * 260 * (0.45 + u * 0.75), y = base - u * SKY * 0.3, r = mix(30, 14, u) * mix(0.8, 1.4, random());
        sky.fillStyle = css(new THREE.Color('#6f7a86').lerp(new THREE.Color('#e9e3d8'), u * 0.85 + (t - 0.5) * side * 0.25), 0.9);
        sky.beginPath(); sky.arc(x, y, r, 0, 6.3); sky.fill();
      }
      sky.fillStyle = css(new THREE.Color('#5d6873'), 0.9);
      sky.beginPath(); sky.ellipse(sx, base + 3, 128, 13, 0, 0, 6.3); sky.fill();
    }
    const skyMap = new THREE.CanvasTexture(sheet);
    skyMap.colorSpace = THREE.SRGBColorSpace;
    const dome = new THREE.Mesh(new THREE.PlaneGeometry(EXTENT * 2.04, EXTENT * 2.04), new THREE.MeshBasicMaterial({ map: skyMap, depthWrite: false, toneMapped: false, fog: false }));
    dome.renderOrder = -10;
    root.add(dome);

    // Camera: a fixed wide frame, low enough that the sky takes the top half.
    const camera = new THREE.OrthographicCamera(-EXTENT, EXTENT, EXTENT, -EXTENT, 0.1, 400);
    const toCamera = new THREE.Vector3(0, Math.sin(PITCH), Math.cos(PITCH));
    camera.position.copy(toCamera).multiplyScalar(120);
    camera.lookAt(0, 0, 0);
    camera.translateY(EXTENT - 5); // the frame's bottom edge sits 5 m below the origin's row
    camera.updateMatrixWorld(true);
    dome.quaternion.copy(camera.quaternion);
    dome.position.copy(camera.position).addScaledVector(toCamera, -330);

    const sun = new THREE.Vector3(side * 0.86, mix(0.27, 0.62, lift), -0.42).normalize();
    key.target.position.set(0, 0, -5);
    key.position.copy(key.target.position).addScaledVector(sun, 70);
    const shadow = key.shadow.camera;
    shadow.left = shadow.bottom = -30;
    shadow.right = shadow.top = 30;
    shadow.near = 1;
    shadow.far = 160;
    shadow.updateProjectionMatrix();

    const place = (items: readonly Placeable[]) => {
      items.forEach((item, index) => {
        const [x, z, size] = SLOTS[index % SLOTS.length];
        const natural = Math.max(item.height, item.radius * 2, 0.1);
        // Sizes are compressed, not equalised: a kraal still dwarfs a termite mound, but both read.
        let scale = ((2.4 * natural ** 0.5) / natural) * size;
        scale = Math.min(scale, (item.hero ? 5 : 3.7) / Math.max(item.radius, 0.05), (item.hero ? 9.5 : 7.5) / Math.max(item.height, 0.05));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x + (random() - 0.5) * 0.8, 0, z + (random() - 0.5) * 0.8);
        item.holder.rotation.y = side * -0.2 + (random() - 0.5) * 0.5;
        item.holder.updateMatrixWorld(true);
      });
    };

    return {
      object: root,
      camera,
      background: skyTop,
      capacity: SLOTS.length,
      ground,
      keyLight: key,
      place,
      dispose() {
        key.shadow.map?.dispose();
        disposeTree(root);
      },
    };
  },
});
