import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Placeable, type World, choice, defineWorld, disposeTree, mix } from '@conjure/kit';
import { type P3, glowMaterial, grime, paintTexture, painted, put, write } from './lib';
import { intermission, leader, monster, theEnd, western } from './pictures';

const smooth = (t: number) => t * t * (3 - 2 * t);
const SX = 0, SZ = -46; // foot of the screen
const CRESTS = [20, 27, 34, 41, 48, 55];
const RAMP = 0.42;
/** Height of the humped parking ramps at a point: a gentle rise toward the screen, then a short drop. */
function rampAt(x: number, z: number) {
  const r = Math.hypot(x - SX, z - SZ);
  let h = 0;
  for (const c of CRESTS) {
    const d = r - c;
    if (d > -1.2 && d <= 0) h = Math.max(h, RAMP * smooth((d + 1.2) / 1.2));
    else if (d > 0 && d < 2.4) h = Math.max(h, RAMP * (1 - smooth(d / 2.4)));
  }
  return h;
}
// Standing places: x, z, tallest and widest a thing may be there. Nearest first.
const SLOTS: readonly (readonly [number, number, number, number])[] = [
  [-1.7, 5.2, 4.3, 2.0], [3.1, 3.2, 4.6, 2.0], [-5.4, -0.8, 5.2, 2.2], [6.6, -3, 5.6, 2.4], [-9, -9, 6.5, 2.8], [10, -11, 7, 3],
];

export default defineWorld({
  questions: {
    playing: choice('What is on the big screen?', {
      western: 'A western: a rider crossing a huge setting sun.',
      monster: 'A monster movie: a giant lizard over a city under a green sky.',
      intermission: 'The intermission countdown with dancing snacks.',
      leader: 'Countdown film leader, the show about to begin.',
      the_end: 'The End.',
      blank: 'Nothing yet, or nothing ever again: a bare pale screen.',
    }),
    sky: choice('What is the sky doing?', {
      blue_hour: 'Blue hour: deep periwinkle overhead, a peach band on the horizon.',
      sunset: 'The last of a red and gold sunset behind the trees.',
      haze: 'Flat sodium-lit summer haze, no stars, the highway glowing orange.',
      stars: 'Clear and violet with the first stars and a thin moon.',
    }),
    era: choice('What state is the drive-in in?', {
      heyday: 'Its heyday: fresh paint, every ramp taken, pennants up.',
      ordinary: 'An ordinary summer night, a decent crowd, nothing special.',
      last_season: 'Its last season: weeds in the gravel, speakers missing, a thin loyal crowd.',
      abandoned: 'Closed for years: empty ramps, leaning posts, panels gone from the screen.',
    }),
    edge: choice('What stands at the edge of the lot?', {
      snack_bar: 'A low glowing snack bar with a neon-trimmed canopy.',
      playground: 'A swing set and slide under the screen for the kids.',
      ticket_booth: 'The ticket booth and entrance arch off to one side.',
      nothing: 'Only the fence.',
    }),
    overhead: choice('What is strung over the lot?', {
      nothing: 'Nothing.',
      bulbs: 'Sagging strings of coloured bulbs between tall poles.',
      pennants: 'Lines of plastic pennants, the used-car-lot kind.',
    }),
    ground: choice('What is the lot surfaced with?', {
      gravel: 'Pale crushed gravel.',
      asphalt: 'Old patched asphalt, darker, with faded painted arcs.',
      grass: 'Mown field grass worn to dirt in the wheel tracks.',
    }),
    vantage: choice('Where are we watching from?', {
      back_row: 'The middle of the back row, low, square on to the screen.',
      side_aisle: 'A side aisle, looking across the ramps at an angle.',
      car_roof: 'Sitting up on a car roof, a little above everything.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const add = <T extends THREE.Object3D>(object: T, at: P3 = [0, 0, 0], shadows = false): T => {
      object.position.set(...at);
      if (shadows) object.traverse((node) => { const mesh = node as THREE.Mesh; if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = true; });
      root.add(object);
      return object;
    };
    const matt = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.9, ...options });
    const eraIndex = { heyday: 0, ordinary: 1, last_season: 2, abandoned: 3 }[a.era];
    const decay = Math.min(1, [0, 0.12, 0.55, 1][eraIndex] * 0.75 + mood.wear * 0.3);
    const dead = a.era === 'abandoned';

    // Sky: a painted backdrop far behind everything, light enough to print as dusk rather than night.
    const skies = {
      blue_hour: ['#5a6cab', '#8f97cc', '#f0b79a', '#ffd9a8'],
      sunset: ['#6a6aa6', '#c98aa2', '#f39a5c', '#ffd27a'],
      haze: ['#8a8798', '#b3a59c', '#e3a56c', '#f6c07a'],
      stars: ['#4c4f9a', '#7d79c4', '#d9a9c2', '#f3cdb6'],
    }[a.sky].map((hex) => new THREE.Color(hex).lerp(new THREE.Color(mood.warmth > 0.5 ? '#f2a36a' : '#7fa0e0'), Math.abs(mood.warmth - 0.5) * 0.25));
    const css = (c: THREE.Color) => `#${c.getHexString()}`;
    const sky = paintTexture(1024, 512, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, css(skies[0])); g.addColorStop(0.5, css(skies[1])); g.addColorStop(0.72, css(skies[2])); g.addColorStop(0.8, css(skies[3])); g.addColorStop(1, css(skies[3]));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      if (a.sky === 'stars' || a.sky === 'blue_hour') for (let i = 0; i < (a.sky === 'stars' ? 220 : 40); i++) { ctx.fillStyle = `rgba(255,255,240,${0.4 + random() * 0.6})`; const y = random() * random() * h * 0.6; ctx.fillRect(random() * w, y, 1.6, 1.6); }
      if (a.sky === 'stars') { ctx.fillStyle = '#fff6da'; ctx.beginPath(); ctx.arc(w * 0.72, h * 0.2, 13, 0, 7); ctx.fill(); ctx.fillStyle = css(skies[0]); ctx.beginPath(); ctx.arc(w * 0.727, h * 0.193, 12, 0, 7); ctx.fill(); }
      const bands = a.sky === 'haze' ? 3 : 9;
      for (let i = 0; i < bands; i++) { ctx.fillStyle = a.sky === 'sunset' ? `rgba(120,60,90,${0.18 + random() * 0.2})` : `rgba(255,235,225,${0.12 + random() * 0.14})`; ctx.beginPath(); ctx.ellipse(random() * w, h * (0.42 + random() * 0.3), w * (0.08 + random() * 0.16), h * (0.008 + random() * 0.014), 0, 0, 7); ctx.fill(); }
      // Highway glow rising behind the trees.
      const glow = ctx.createRadialGradient(w * 0.62, h * 0.8, 0, w * 0.62, h * 0.8, w * 0.3);
      glow.addColorStop(0, `rgba(255,190,110,${a.sky === 'haze' ? 0.75 : 0.45})`); glow.addColorStop(1, 'rgba(255,190,110,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, h * 0.4, w, h * 0.6);
    });
    const backdrop = add(new THREE.Mesh(new THREE.PlaneGeometry(420, 140), new THREE.MeshBasicMaterial({ map: sky, fog: false })), [0, 42, -150]);
    backdrop.renderOrder = -1;
    const background = skies[1].clone();

    // Ground.
    const groundColour = { gravel: '#a39f9e', asphalt: '#6f6d74', grass: '#7f9166' }[a.ground];
    const surface = paintTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = groundColour; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) { const v = random(); ctx.fillStyle = v < 0.5 ? 'rgba(255,255,255,0.13)' : 'rgba(30,30,40,0.14)'; const sz = a.ground === 'asphalt' ? 1.2 : 2.2; ctx.fillRect(random() * w, random() * h, sz, sz); }
      if (a.ground === 'asphalt') for (let i = 0; i < 6; i++) { ctx.strokeStyle = 'rgba(30,30,34,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); let x = random() * w, y = random() * h; ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (random() - 0.5) * 50; y += (random() - 0.5) * 50; ctx.lineTo(x, y); } ctx.stroke(); }
      if (a.ground === 'grass') for (let i = 0; i < 500; i++) { ctx.strokeStyle = random() < 0.5 ? 'rgba(60,90,50,0.35)' : 'rgba(170,180,110,0.3)'; ctx.beginPath(); const x = random() * w, y = random() * h; ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 4, y - 5); ctx.stroke(); }
    });
    surface.wrapS = surface.wrapT = THREE.RepeatWrapping;
    surface.repeat.set(28, 28);
    const groundMat = new THREE.MeshStandardMaterial({ map: surface, roughness: 1 });
    const ground = add(new THREE.Mesh(new THREE.PlaneGeometry(260, 220), groundMat), [0, 0, -40]);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;

    // Ramps: humped arcs centred on the screen.
    const rampMap = surface.clone();
    rampMap.repeat.set(14, 1.2); rampMap.needsUpdate = true;
    const rampMat = new THREE.MeshStandardMaterial({ map: rampMap, roughness: 1, color: a.ground === 'grass' ? '#d9d2b0' : '#ffffff' });
    const profile: [number, number][] = [[-1.25, 0], [-0.8, RAMP * 0.5], [-0.35, RAMP * 0.93], [0, RAMP], [0.6, RAMP * 0.85], [1.4, RAMP * 0.4], [2.45, 0]].map(([d, h]) => [d, h + 0.015]) as [number, number][];
    const spanOf = (c: number) => Math.min(1.25, Math.asin(Math.min(1, 31 / c)));
    for (const c of CRESTS) {
      const span = spanOf(c), steps = 56;
      const positions: number[] = [], uvs: number[] = [], index: number[] = [];
      for (let i = 0; i <= steps; i++) {
        const t = mix(-span, span, i / steps);
        profile.forEach(([d, h], k) => { positions.push(SX + Math.sin(t) * (c + d), h, SZ + Math.cos(t) * (c + d)); uvs.push(i / steps, k / (profile.length - 1)); });
      }
      const n = profile.length;
      for (let i = 0; i < steps; i++) for (let k = 0; k < n - 1; k++) { const p = i * n + k; index.push(p, p + 1, p + n, p + 1, p + n + 1, p + n); }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      const ramp = add(new THREE.Mesh(geometry, rampMat));
      ramp.receiveShadow = true;
    }
    if (a.ground === 'asphalt') for (const c of CRESTS) {
      const span = spanOf(c);
      const line = add(new THREE.Mesh(new THREE.RingGeometry(c + 2.5, c + 2.62, 64, 1, Math.PI / 2 - span, span * 2), matt('#d9d4c0')), [SX, 0.012, SZ]);
      line.rotation.x = -Math.PI / 2;
    }

    // Speaker posts and parked cars along the crests.
    const clear = (x: number, z: number, margin: number) => SLOTS.every(([sx, sz, , sr]) => Math.hypot(x - sx, z - sz) > sr + margin);
    const posts: { x: number; z: number; lean: number; turn: number; left: boolean; right: boolean }[] = [];
    const cars: { x: number; z: number; turn: number; colour: THREE.Color; lights: boolean }[] = [];
    const fill = dead ? 0.03 : mix(0.2, 0.92, mood.density) * [1, 0.85, 0.5, 0][eraIndex];
    const paints = ['#7d8f4e', '#d4a63c', '#9cc3dc', '#7c2634', '#eeeadf', '#6b4630', '#c5372c', '#3f6f86', '#e9dfc2', '#2f3a4a', '#d98a4a', '#8fb79e'];
    for (const c of CRESTS) {
      const span = spanOf(c), stride = 5.4 / c;
      for (let t = -span + stride * 0.5; t < span; t += stride) {
        const x = SX + Math.sin(t) * (c + 0.5), z = SZ + Math.cos(t) * (c + 0.5);
        if (Math.abs(t) < stride * 0.4 && c < 50) continue; // centre aisle
        if (random() < decay * 0.3 || !clear(x, z, 0.6)) continue;
        posts.push({ x, z, lean: (random() - 0.5) * decay * 0.5, turn: t + (random() - 0.5) * 0.2, left: random() > decay * 0.6, right: random() > decay * 0.6 });
        const ct = t + stride * 0.5, cx = SX + Math.sin(ct) * (c - 1.4), cz = SZ + Math.cos(ct) * (c - 1.4);
        const inView = c >= 48 && Math.abs(cx) < (c === 55 ? 8.5 : 4);
        if (ct < span && random() < fill && clear(cx, cz, 3.2) && !inView) cars.push({ x: cx, z: cz, turn: ct + (random() - 0.5) * 0.08, colour: new THREE.Color(paints[Math.floor(random() * paints.length)]).lerp(new THREE.Color('#8f887c'), decay * 0.4), lights: random() < mix(0.05, 0.3, mood.energy) });
      }
    }
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    const instanced = <T extends { x: number; z: number }>(geometry: THREE.BufferGeometry, material: THREE.Material, list: readonly T[], pose: (item: T) => [number, number, number], colour?: (item: T) => THREE.Color, shadow = true) => {
      const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, list.length));
      mesh.count = list.length;
      list.forEach((item, i) => {
        const [rx, ry, rz] = pose(item);
        m.compose(v.set(item.x, rampAt(item.x, item.z), item.z), q.setFromEuler(e.set(rx, ry, rz, 'YXZ')), one);
        mesh.setMatrixAt(i, m);
        if (colour) mesh.setColorAt(i, colour(item));
      });
      mesh.castShadow = shadow; mesh.receiveShadow = shadow;
      mesh.frustumCulled = false;
      root.add(mesh);
      return mesh;
    };
    const box = (w: number, h: number, d: number, x: number, y: number, z: number) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
    const pole = mergeGeometries([new THREE.CylinderGeometry(0.035, 0.04, 1.2, 8).translate(0, 0.6, 0), box(0.5, 0.06, 0.06, 0, 1.2, 0), box(0.14, 0.12, 0.1, 0, 1.24, 0), new THREE.CylinderGeometry(0.16, 0.19, 0.1, 10).translate(0, 0.05, 0)])!;
    const postMat = matt(new THREE.Color('#8d9396').lerp(new THREE.Color('#7a4a2e'), decay * 0.5), { metalness: 0.4, roughness: 0.6 });
    instanced(pole, postMat, posts, (p) => [0, p.turn, p.lean]);
    const speakerGeometry = (side: number) => mergeGeometries([box(0.13, 0.18, 0.08, side * 0.21, 1.1, 0.05), box(0.02, 0.02, 0.02, side * 0.21, 1.2, 0.03)])!;
    const speakerMat = matt('#b9bdbd', { metalness: 0.6, roughness: 0.4 });
    instanced(speakerGeometry(-1), speakerMat, posts.filter((p) => p.left), (p) => [0, p.turn, p.lean]);
    instanced(speakerGeometry(1), speakerMat, posts.filter((p) => p.right), (p) => [0, p.turn, p.lean]);
    if (!dead) instanced(new THREE.SphereGeometry(0.05, 8, 6).translate(0, 1.36, 0), new THREE.MeshBasicMaterial({ color: mood.warmth > 0.4 ? '#ffc56e' : '#cfe4ff' }), posts.filter(() => random() > decay * 0.7), (p) => [0, p.turn, p.lean], undefined, false);

    // Cars: rears toward us, noses up the ramp toward the screen.
    const carBody = mergeGeometries([box(1.85, 0.55, 4.7, 0, 0.62, 0), box(1.6, 0.5, 2.4, 0, 1.12, 0.35), box(1.95, 0.12, 0.14, 0, 0.42, 2.38), box(1.95, 0.12, 0.14, 0, 0.42, -2.38)])!;
    const pose = (c: { turn: number }): [number, number, number] => [0.05, c.turn, 0];
    instanced(carBody, matt('#ffffff', { metalness: 0.3, roughness: 0.45 }), cars, pose, (c) => c.colour);
    instanced(mergeGeometries([box(1.5, 0.34, 0.03, 0, 1.14, 1.56), box(1.5, 0.34, 0.03, 0, 1.14, -0.86), box(1.62, 0.3, 1.9, 0, 1.15, 0.35)])!, matt('#3a4658', { roughness: 0.2, metalness: 0.4 }), cars, pose);
    const wheel = (x: number, z: number) => new THREE.CylinderGeometry(0.33, 0.33, 0.22, 12).rotateZ(Math.PI / 2).translate(x, 0.33, z);
    instanced(mergeGeometries([wheel(-0.85, 1.45), wheel(0.85, 1.45), wheel(-0.85, -1.5), wheel(0.85, -1.5)])!, matt('#1a1b1e'), cars, pose);
    const tail = mergeGeometries([box(0.3, 0.14, 0.04, -0.72, 0.72, 2.36), box(0.3, 0.14, 0.04, 0.72, 0.72, 2.36)])!;
    instanced(tail, matt('#8a1c18', { emissive: '#ff2a1a', emissiveIntensity: 0.25 }), cars.filter((c) => !c.lights), pose, undefined, false);
    instanced(tail.clone(), new THREE.MeshBasicMaterial({ color: '#ff4a32' }), cars.filter((c) => c.lights), pose, undefined, false);

    // The screen.
    const SW = 25, SH = 11.2, lift = 5.2, screenTop = lift + SH;
    const showing = a.playing !== 'blank' && !dead;
    const cols = 14, rows = 6;
    const lost = [0, 0, 0.07, 0.34][eraIndex] + (mood.wear > 0.8 ? 0.04 : 0);
    const picture = paintTexture(1024, 1024 * (SH / SW), (ctx, w, h) => {
      if (!showing) { ctx.fillStyle = dead ? '#cfcabb' : '#f1efe6'; ctx.fillRect(0, 0, w, h); }
      else if (a.playing === 'western') western(ctx, w, h, random);
      else if (a.playing === 'monster') monster(ctx, w, h, random);
      else if (a.playing === 'intermission') intermission(ctx, w, h, random);
      else if (a.playing === 'leader') leader(ctx, w, h, random);
      else theEnd(ctx, w, h);
      if (showing) { ctx.fillStyle = 'rgba(245,243,235,0.16)'; ctx.fillRect(0, 0, w, h); }
      grime(ctx, w, h, decay * (showing ? 0.5 : 1), random, '96,84,60');
      // Lost panels show dusk sky and frame through the holes.
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) if (random() < lost * (1.5 - r / rows)) {
        const x = (c / cols) * w, y = (r / rows) * h, pw = w / cols, ph = h / rows;
        ctx.fillStyle = css(skies[2].clone().lerp(skies[1], 0.5).multiplyScalar(0.8)); ctx.fillRect(x, y, pw, ph);
        ctx.strokeStyle = '#4d4a48'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + pw, y + ph); ctx.moveTo(x + pw * 0.5, y); ctx.lineTo(x + pw * 0.5, y + ph); ctx.stroke();
      }
    });
    const glow = showing ? 0.92 : dead ? 0.1 : 0.32;
    const face = new THREE.MeshStandardMaterial({ map: picture, emissive: '#ffffff', emissiveMap: picture, emissiveIntensity: glow, roughness: 0.95 });
    add(new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), face), [SX, lift + SH / 2, SZ]);
    const white = matt(new THREE.Color('#ece9de').lerp(new THREE.Color('#9a9484'), decay * 0.6));
    const frame = matt(new THREE.Color('#6f7879').lerp(new THREE.Color('#6a4a36'), decay * 0.6), { metalness: 0.3 });
    add(new THREE.Mesh(mergeGeometries([box(SW + 1, 0.5, 0.3, 0, screenTop + 0.25, -0.1), box(SW + 1, 0.5, 0.3, 0, lift - 0.25, -0.1), box(0.5, SH + 1, 0.3, -SW / 2 - 0.25, lift + SH / 2, -0.1), box(0.5, SH + 1, 0.3, SW / 2 + 0.25, lift + SH / 2, -0.1)])!, white), [SX, 0, SZ], true);
    const legs: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 8; i++) {
      const x = -SW / 2 + 0.5 + (i / 7) * (SW - 1);
      legs.push(box(0.28, screenTop, 0.28, x, screenTop / 2, -0.4));
      const brace = new THREE.BoxGeometry(0.22, Math.hypot(screenTop - 1, 7), 0.22);
      brace.rotateX(Math.atan2(7, screenTop - 1));
      legs.push(brace.translate(x, (screenTop - 1) / 2, -3.9));
      if (i < 7) { const cross = new THREE.BoxGeometry(Math.hypot((SW - 1) / 7, lift - 0.6), 0.1, 0.1); cross.rotateZ((i % 2 ? 1 : -1) * Math.atan2(lift - 0.6, (SW - 1) / 7)); legs.push(cross.translate(x + (SW - 1) / 14, lift / 2, -0.4)); }
    }
    add(new THREE.Mesh(mergeGeometries(legs)!, frame), [SX, 0, SZ], true);

    // A faint throw of light from the booth behind us to the screen.
    if (showing) {
      const tint = { western: '#ffd9a0', monster: '#c6ffb0', intermission: '#cfd8ff', leader: '#f2f2f2', the_end: '#f2f2f2', blank: '#ffffff' }[a.playing];
      const length = 58;
      const throwGeometry = new THREE.CylinderGeometry(SW * 0.5 * Math.SQRT2 * 0.98, 0.3, length, 4, 1, true);
      throwGeometry.rotateY(Math.PI / 4);
      throwGeometry.rotateX(-Math.PI / 2);
      const beam = add(new THREE.Mesh(throwGeometry, glowMaterial(tint, 0.045)), [SX, (lift + SH / 2 + 3.4) / 2, SZ + length / 2 + 0.3]);
      beam.scale.y = SH / SW;
      beam.rotation.x = Math.atan2(lift + SH / 2 - 3.4, length);
    }

    // Tree line, then the raised highway beyond it.
    const trees = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), matt('#ffffff', { flatShading: true }), 120);
    const leaf = new THREE.Color('#3f5f5c'), leaf2 = new THREE.Color('#566f52'), tmp = new THREE.Color();
    for (let i = 0; i < 120; i++) {
      const sideRow = i >= 76;
      const x = sideRow ? (i % 2 ? 1 : -1) * (39 + random() * 8) : -95 + (i / 76) * 190 + (random() - 0.5) * 3;
      const z = sideRow ? -52 + ((i - 76) / 44) * 70 : -62 - random() * 7;
      const h = 4 + random() * 4.5, w = 2.6 + random() * 2.6;
      m.compose(v.set(x, h * 0.9, z), q.identity(), new THREE.Vector3(w, h, w));
      trees.setMatrixAt(i, m);
      trees.setColorAt(i, tmp.copy(leaf).lerp(leaf2, random()).lerp(skies[1], 0.18));
    }
    root.add(trees);
    const HY = 12.5, HZ = -84;
    add(new THREE.Mesh(mergeGeometries([box(240, 0.9, 5, 0, HY - 0.45, 0), box(240, 0.5, 0.2, 0, HY + 0.25, 2.5), ...Array.from({ length: 13 }, (_unused, i) => box(1.4, HY, 1.4, -108 + i * 18, HY / 2, 0))])!, matt(tmp.set('#6e7088').lerp(skies[1], 0.3).clone())), [0, 0, HZ]);
    const lampCount = 12;
    const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.55, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffc87a' }), lampCount);
    const masts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < lampCount; i++) { const x = -99 + i * 18; m.makeTranslation(x, HY + 7, HZ + 1.6); lamps.setMatrixAt(i, m); masts.push(box(0.22, 7, 0.22, x, HY + 3.5, 2.4)); }
    root.add(lamps);
    add(new THREE.Mesh(mergeGeometries(masts)!, matt('#5d5f74')), [0, 0, HZ]);
    const traffic = Math.round(mix(6, 26, mood.energy));
    const headlights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 6, 5), new THREE.MeshBasicMaterial({ color: '#ffffff' }), traffic);
    const lane = Array.from({ length: traffic }, (_unused, i) => ({ x: -110 + random() * 220, toward: i % 2 === 0, speed: 14 + random() * 10 }));
    const moveTraffic = (time: number) => {
      lane.forEach((car, i) => {
        const x = ((car.x + (car.toward ? 1 : -1) * time * car.speed + 110) % 220 + 220) % 220 - 110;
        m.makeTranslation(x, HY + 0.75, HZ + (car.toward ? 1.4 : -0.4));
        headlights.setMatrixAt(i, m);
      });
      headlights.instanceMatrix.needsUpdate = true;
    };
    lane.forEach((car, i) => headlights.setColorAt(i, tmp.set(car.toward ? '#fff4d0' : '#ff5a40')));
    moveTraffic(0);
    headlights.frustumCulled = false;
    root.add(headlights);

    // Perimeter fence down both sides, closing behind the screen.
    const fenceColour = new THREE.Color({ gravel: '#b9b3a2', asphalt: '#9aa3a0', grass: '#b7a98a' }[a.ground]).lerp(new THREE.Color('#7b6a58'), decay * 0.6);
    const fence: THREE.BufferGeometry[] = [];
    for (const side of [-1, 1]) for (let i = 0; i < 26; i++) {
      if (random() < decay * 0.22) continue;
      const panel = new THREE.BoxGeometry(0.12, 2.5 + random() * 0.15, 3.4);
      panel.rotateZ((random() - 0.5) * decay * 0.3);
      fence.push(panel.translate(side * 34, 1.25, 24 - i * 3.5));
    }
    add(new THREE.Mesh(mergeGeometries(fence)!, matt(fenceColour)), [0, 0, 0], true);

    // Edge of the lot.
    const neonOn = !dead;
    if (a.edge === 'snack_bar') {
      const bx = 17, bz = -17;
      const g = add(new THREE.Group(), [bx, 0, bz]);
      put(g, new THREE.Mesh(new THREE.BoxGeometry(9, 2.8, 5), matt(new THREE.Color('#e6dcc0').lerp(new THREE.Color('#8f8878'), decay * 0.6))), [0, 1.4, 0]);
      put(g, new THREE.Mesh(new THREE.BoxGeometry(10, 0.25, 7.6), matt('#d8d2c2')), [0, 2.95, 1]);
      put(g, new THREE.Mesh(new THREE.BoxGeometry(10.05, 0.4, 0.12), matt(mood.cheer > 0.5 ? '#c5372c' : '#2c6f78')), [0, 2.95, 4.8]);
      const hatch = painted(6, 1.2, (ctx, w, h) => {
        if (!neonOn) { ctx.fillStyle = '#4a4744'; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 6; i++) { ctx.fillStyle = '#6f6a60'; ctx.fillRect((i / 6) * w + 2, 0, w / 6 - 4, h); } return; }
        const gr = ctx.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffe7ad'); gr.addColorStop(1, '#f2a652'); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 9; i++) { ctx.fillStyle = 'rgba(70,40,20,0.75)'; const x = random() * w; ctx.fillRect(x, h * 0.45, w * 0.02, h * 0.55); ctx.beginPath(); ctx.arc(x + w * 0.01, h * 0.38, h * 0.11, 0, 7); ctx.fill(); }
      }, { px: 256, glow: neonOn ? 1 : 0 });
      put(g, hatch, [-0.8, 1.6, 2.52]);
      const neon = new THREE.MeshBasicMaterial({ color: neonOn ? (mood.warmth > 0.5 ? '#ff6a4a' : '#59e6e0') : '#77756e' });
      for (const y of [2.8, 3.12]) put(g, new THREE.Mesh(new THREE.BoxGeometry(10.1, 0.07, 0.07), neon), [0, y, 4.88]);
      const sign = painted(5, 0.9, (ctx, w, h) => { ctx.clearRect(0, 0, w, h); write(ctx, 'SNACK BAR', w / 2, h * 0.55, h * 0.85, neonOn ? '#ffe08a' : '#8d8778', { outline: '#3a2218', max: w * 0.96 }); }, { px: 512, cutout: true, glow: neonOn ? 0.9 : 0 });
      put(g, sign, [0, 3.75, 3.6]);
      for (const x of [-4.7, 4.7]) put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.9, 6), matt('#b9bdbd')), [x, 1.45, 4.6]);
      g.rotation.y = -0.5;
    }
    if (a.edge === 'playground') {
      const pipe = matt(mood.cheer > 0.5 ? '#d8433a' : '#7f98a8', { metalness: 0.3 });
      const g = add(new THREE.Group(), [-6, 0, SZ + 7]);
      const bits: THREE.BufferGeometry[] = [];
      const rodG = (from: P3, to: P3, r: number) => { const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to), d = B.clone().sub(A); const c = new THREE.CylinderGeometry(r, r, d.length(), 6); c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); return c.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2); };
      for (const x of [-2.2, 2.2]) for (const z of [-1, 1]) bits.push(rodG([x, 0, z * 1.1], [x, 3, 0], 0.07));
      bits.push(rodG([-2.2, 3, 0], [2.2, 3, 0], 0.07));
      for (const x of [-1, 0.3, 1.5]) { bits.push(rodG([x - 0.25, 3, 0], [x - 0.25, 0.7, 0.3], 0.02), rodG([x + 0.25, 3, 0], [x + 0.25, 0.7, 0.3], 0.02), box(0.6, 0.06, 0.25, x, 0.7, 0.3)); }
      bits.push(rodG([6, 0, 0], [6, 3.2, 0], 0.08), rodG([7, 0, 0], [7, 3.2, 0], 0.08));
      const chute = new THREE.BoxGeometry(0.9, 0.08, 5.4); chute.rotateX(0.62); bits.push(chute.translate(6.5, 1.6, 2.2));
      put(g, new THREE.Mesh(mergeGeometries(bits)!, pipe));
    }
    if (a.edge === 'ticket_booth') {
      const g = add(new THREE.Group(), [-20, 0, -8]);
      const paintCol = matt(new THREE.Color(mood.cheer > 0.5 ? '#f1e6bd' : '#cfd6d2').lerp(new THREE.Color('#8f8878'), decay * 0.6));
      put(g, new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 2.2), paintCol), [0, 1.3, 0]);
      put(g, new THREE.Mesh(new THREE.ConeGeometry(2.1, 1, 4), matt(mood.cheer > 0.5 ? '#c5372c' : '#56707a')), [0, 3.1, 0]).rotation.y = Math.PI / 4;
      const win = painted(1.4, 0.9, (ctx, w, h) => { ctx.fillStyle = neonOn ? '#ffdf9c' : '#3c3b3a'; ctx.fillRect(0, 0, w, h); if (neonOn) { ctx.fillStyle = 'rgba(70,40,20,0.8)'; ctx.fillRect(w * 0.42, h * 0.5, w * 0.16, h * 0.5); ctx.beginPath(); ctx.arc(w * 0.5, h * 0.4, h * 0.16, 0, 7); ctx.fill(); } }, { px: 128, glow: neonOn ? 1 : 0 });
      win.rotation.y = Math.PI / 2;
      put(g, win, [1.11, 1.6, 0]);
      for (const z of [-5.5, 5.5]) put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 6, 8), matt('#b9bdbd')), [1.5, 3, z]);
      const arch = painted(11.4, 1.3, (ctx, w, h) => { ctx.fillStyle = mood.cheer > 0.5 ? '#c5372c' : '#3d5f6a'; ctx.fillRect(0, 0, w, h); write(ctx, dead ? 'CL SED' : 'ENTRANCE', w / 2, h * 0.55, h * 0.72, '#fbf3d6', { max: w * 0.8 }); grime(ctx, w, h, decay, random); }, { px: 512, glow: neonOn ? 0.4 : 0 });
      arch.rotation.y = Math.PI / 2;
      put(g, arch, [1.5, 5.6, 0]);
      g.rotation.y = 0.35;
    }

    // Overhead lines from tall poles at the sides to the top of the screen frame.
    if (a.overhead !== 'nothing') {
      const dots: { x: number; y: number; z: number; colour: THREE.Color }[] = [];
      const lines: THREE.BufferGeometry[] = [];
      const hues = a.overhead === 'bulbs' ? ['#ff6a52', '#ffd447', '#59e6e0', '#8be36a', '#ff9fd6'] : ['#e8474a', '#f4f1e6', '#3f7fd0', '#f2c230'];
      for (const side of [-1, 1]) for (const zEnd of [8, -12]) {
        const A = new THREE.Vector3(side * 24, 9, zEnd), B = new THREE.Vector3(side * 5, screenTop + 0.4, SZ + 0.6);
        lines.push(box(0.2, 9, 0.2, A.x, 4.5, A.z));
        const n = 44;
        for (let i = 1; i < n; i++) {
          const t = i / n;
          if (random() < decay * 0.5) continue;
          dots.push({ x: mix(A.x, B.x, t), y: mix(A.y, B.y, t) - Math.sin(t * Math.PI) * 3.4, z: mix(A.z, B.z, t), colour: new THREE.Color(hues[Math.floor(random() * hues.length)]) });
        }
      }
      add(new THREE.Mesh(mergeGeometries(lines)!, matt('#6d6f78')));
      const bulbShape = a.overhead === 'bulbs' ? new THREE.SphereGeometry(0.16, 6, 5) : new THREE.ConeGeometry(0.22, 0.5, 3).rotateX(Math.PI).translate(0, -0.25, 0);
      const string = new THREE.InstancedMesh(bulbShape, a.overhead === 'bulbs' && !dead ? new THREE.MeshBasicMaterial({ color: '#ffffff' }) : matt('#ffffff', { side: THREE.DoubleSide }), Math.max(1, dots.length));
      string.count = dots.length;
      dots.forEach((dot, i) => { m.makeTranslation(dot.x, dot.y, dot.z); string.setMatrixAt(i, m); string.setColorAt(i, dot.colour); });
      string.frustumCulled = false;
      root.add(string);
    }

    // Foreground dressing: weeds as the place declines, litter as it fills.
    const tuftCount = Math.round(decay * 260);
    if (tuftCount) {
      const BLADES = 5;
      const tufts = new THREE.InstancedMesh(new THREE.ConeGeometry(0.035, 1, 3).translate(0, 0.5, 0), matt('#ffffff'), tuftCount * BLADES);
      for (let i = 0; i < tuftCount; i++) {
        const x = (random() - 0.5) * 44, z = 12 - random() * random() * 50;
        const tall = 0.2 + random() * 0.55 * decay;
        const colour = random() < 0.5 ? '#8c8a55' : '#667c4c';
        for (let b = 0; b < BLADES; b++) {
          const bx = x + (random() - 0.5) * 0.16, bz = z + (random() - 0.5) * 0.16;
          m.compose(v.set(bx, rampAt(bx, bz), bz), q.setFromEuler(e.set((random() - 0.5) * 0.9, random() * 3, (random() - 0.5) * 0.9)), new THREE.Vector3(1, tall * (0.6 + random() * 0.6), 1));
          tufts.setMatrixAt(i * BLADES + b, m);
          tufts.setColorAt(i * BLADES + b, tmp.set(colour));
        }
      }
      tufts.castShadow = true;
      root.add(tufts);
    }
    const litterCount = dead ? 6 : Math.round(mix(4, 46, mood.density) * (0.4 + decay));
    const litter = new THREE.InstancedMesh(new THREE.BoxGeometry(0.11, 0.16, 0.08), matt('#ffffff'), litterCount);
    for (let i = 0; i < litterCount; i++) {
      const x = (random() - 0.5) * 30, z = 11 - random() * 30;
      m.compose(v.set(x, rampAt(x, z) + 0.05, z), q.setFromEuler(e.set(random() < 0.6 ? Math.PI / 2 : 0, random() * 3, random() * 3)), one);
      litter.setMatrixAt(i, m);
      litter.setColorAt(i, tmp.set(['#f4f1e6', '#d2392f', '#f3c744', '#cfc8b4'][Math.floor(random() * 4)]));
    }
    litter.castShadow = true;
    root.add(litter);
    if (dead) {
      const board = painted(2.4, 1.5, (ctx, w, h) => { ctx.fillStyle = '#f4efe0'; ctx.fillRect(0, 0, w, h); write(ctx, 'FOR SALE', w / 2, h * 0.3, h * 0.3, '#b02a22', { max: w * 0.9 }); write(ctx, `${8 + Math.floor(random() * 9)} ACRES`, w / 2, h * 0.62, h * 0.22, '#222', { max: w * 0.9 }); write(ctx, 'WILL BUILD TO SUIT', w / 2, h * 0.86, h * 0.11, '#222', { max: w * 0.9 }); grime(ctx, w, h, 0.6, random); }, { px: 256 });
      const stand = add(new THREE.Group(), [8.6, 0, 4.5], true);
      put(stand, board, [0, 2.1, 0.06]);
      for (const x of [-0.9, 0.9]) put(stand, new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.9, 0.1), matt('#8a7458')), [x, 1.45, 0]);
      stand.rotation.set(0, -0.4, 0.06);
    }

    // Light: a soft dusk key from behind our left shoulder, sky fill, and the screen's own colour as a rim.
    const hemi = new THREE.HemisphereLight(skies[1].clone().lerp(new THREE.Color('#ffffff'), 0.45), new THREE.Color('#7b7168'), 1.5);
    const key = new THREE.DirectionalLight(skies[3].clone().lerp(new THREE.Color('#ffffff'), 0.5), mix(1.5, 2.3, 1 - Math.abs(mood.daylight - 0.5) * 2));
    key.position.set(mix(-22, 22, mood.daylight), 24, 26);
    key.target.position.set(0, 0, -4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.04;
    key.shadow.bias = -0.0004;
    const rimTint = { western: '#ffc98a', monster: '#b9f0b0', intermission: '#b8c6ff', leader: '#e6e6e6', the_end: '#e6e6e6', blank: '#e9e6da' }[a.playing];
    const rim = new THREE.DirectionalLight(rimTint, showing ? 0.9 : 0.25);
    rim.position.set(SX, lift + SH / 2, SZ);
    rim.target.position.set(0, 1, 4);
    root.add(hemi, key, key.target, rim, rim.target);

    // Camera: low in the back rows.
    const camera = new THREE.PerspectiveCamera(39, 1, 0.3, 500);
    const view = { back_row: [0, 2.0, 17.5, 0], side_aisle: [-7.5, 2.3, 17, -3.5], car_roof: [1.5, 4.1, 19, 0.5] }[a.vantage];
    camera.position.set(view[0] + (random() - 0.5) * 0.8, view[1], view[2]);
    const aim = new THREE.Vector3(view[3], a.vantage === 'car_roof' ? 4.6 : 5.6, -30);
    camera.lookAt(aim);

    const flicker = mix(0.02, 0.1, mood.energy);
    const world: World = {
      object: root, camera, background, capacity: SLOTS.length, ground, keyLight: key,
      place(items: readonly Placeable[]) {
        items.forEach((item, i) => {
          const [x, z, maxHeight, maxRadius] = SLOTS[i % SLOTS.length];
          let scale = Math.min(1, maxHeight / Math.max(item.height, 0.05), maxRadius / Math.max(item.radius, 0.05));
          if (item.height * scale < 1.5) scale = Math.min(maxRadius / Math.max(item.radius, 0.05), 1.5 / Math.max(item.height, 0.05));
          item.holder.scale.setScalar(scale);
          item.holder.position.set(x, rampAt(x, z), z);
          item.holder.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - z) * 0.7 + (context.random() - 0.5) * 0.5;
          item.holder.updateMatrixWorld(true);
        });
        camera.lookAt(aim);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        const shadow = key.shadow.camera;
        shadow.left = -22; shadow.right = 22; shadow.bottom = -22; shadow.top = 22;
        shadow.near = 1; shadow.far = 90;
        shadow.updateProjectionMatrix();
      },
      update(_dt, time) {
        if (showing) face.emissiveIntensity = glow * (1 + Math.sin(time * 23) * flicker * 0.4 + Math.sin(time * 7.3) * flicker);
        moveTraffic(time);
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
    return world;
  },
});
