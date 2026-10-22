import * as THREE from 'three';
import { type Placeable, choice, clamp01, defineWorld, disposeTree, mix } from '@conjure/kit';

type P = [number, number, number];
type Ctx = CanvasRenderingContext2D;

const WEATHER = {
  clear: 'A clean blue sky with a few thin streaks: hard light, long sharp shadows, far visibility.',
  cumulus: 'Tall white fair-weather clouds piled over the city, bright and generous.',
  haze: 'A pale milky sky and soft shadowless light; the skyline is only a suggestion.',
  mist: 'Low white mist lying in the valley under the deck, the road floating above it.',
  rain: 'Just after rain: a slate cloud bank moving off, a rainbow, puddles holding the sky.',
} as const;
const SKY: Record<keyof typeof WEATHER, { top: string; low: string; key: number; hemi: number; haze: number; soft: number }> = {
  clear: { top: '#7fb2e2', low: '#e6eef0', key: 2.9, hemi: 1.2, haze: 0.5, soft: 2 },
  cumulus: { top: '#6fa6dc', low: '#e9f0f0', key: 2.7, hemi: 1.3, haze: 0.5, soft: 2.5 },
  haze: { top: '#cdd8de', low: '#eff0e8', key: 1.6, hemi: 1.8, haze: 0.72, soft: 7 },
  mist: { top: '#b4c8d8', low: '#f2f3ee', key: 1.7, hemi: 1.75, haze: 0.8, soft: 5 },
  rain: { top: '#66778d', low: '#f1ecdc', key: 2.5, hemi: 1.2, haze: 0.55, soft: 3 },
};
const WORDS = {
  alive: ['STILL', 'ALIVE'],
  north: ['GONE', 'NORTH'],
  water: ['NO', 'WATER'],
  back: ['TURN', 'BACK'],
  waited: ['WE', 'WAITED'],
} as const;

function paint(w: number, h: number, draw: (ctx: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
const hex = (c: THREE.Color) => `#${c.getHexString()}`;
const blend = (a: string, b: string, t: number) => hex(new THREE.Color(a).lerp(new THREE.Color(b), clamp01(t)));
const rad = THREE.MathUtils.degToRad;
const UP = new THREE.Vector3(0, 1, 0);
const E0 = new THREE.Euler();

/** Everything repeated (leaves, posts, cars, rubble) goes into three instanced meshes. */
class Batch {
  private mats: THREE.Matrix4[] = [];
  private cols: THREE.Color[] = [];
  constructor(private geometry: THREE.BufferGeometry, private material: THREE.Material) {}
  at(p: P, size: P, color: THREE.ColorRepresentation, rot: THREE.Euler = E0, parent?: THREE.Matrix4) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(rot), new THREE.Vector3(...size));
    if (parent) m.premultiply(parent);
    this.mats.push(m);
    this.cols.push(new THREE.Color(color));
  }
  /** Stretch the unit shape from a to b. */
  span(a: P, b: P, thick: number, color: THREE.ColorRepresentation, parent?: THREE.Matrix4, deep = thick) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const dir = B.clone().sub(A), len = Math.max(dir.length(), 0.001);
    const m = new THREE.Matrix4().compose(A.add(B).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()), new THREE.Vector3(thick, len, deep));
    if (parent) m.premultiply(parent);
    this.mats.push(m);
    this.cols.push(new THREE.Color(color));
  }
  build(root: THREE.Object3D) {
    if (!this.mats.length) { this.geometry.dispose(); this.material.dispose(); return null; }
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, this.mats.length);
    this.mats.forEach((m, i) => { mesh.setMatrixAt(i, m); mesh.setColorAt(i, this.cols[i]); });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    root.add(mesh);
    return mesh;
  }
}

/** A box-girder bridge deck with parapet lips, swept along a path. */
function ribbon(points: THREE.Vector3[], width: number, depth: number, lip: number) {
  const w = width / 2;
  const section: [number, number][] = [[-w, lip], [-w + 0.35, lip], [-w + 0.35, 0], [w - 0.35, 0], [w - 0.35, lip], [w, lip], [w, -0.45], [w * 0.5, -depth], [-w * 0.5, -depth], [-w, -0.45]];
  const rings = points.map((p, i) => {
    const t = points[Math.min(i + 1, points.length - 1)].clone().sub(points[Math.max(i - 1, 0)]);
    const right = new THREE.Vector3(t.z, 0, -t.x).normalize();
    return section.map(([u, v]) => p.clone().addScaledVector(right, u).add(new THREE.Vector3(0, v, 0)));
  });
  const verts: number[] = [];
  const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) => { for (const p of [a, b, c, a, c, d]) verts.push(p.x, p.y, p.z); };
  for (let i = 0; i < rings.length - 1; i++)
    for (let j = 0; j < section.length; j++) {
      const k = (j + 1) % section.length;
      quad(rings[i][j], rings[i + 1][j], rings[i + 1][k], rings[i][k]);
    }
  for (const ring of [rings[0], rings[rings.length - 1]]) for (let j = 1; j < section.length - 1; j++) for (const p of [ring[0], ring[j], ring[j + 1]]) verts.push(p.x, p.y, p.z);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geometry.computeVertexNormals();
  return geometry;
}

// The camera stands in the lanes looking down the road and a little left, toward the city.
const HW = 10.5, CAMX = 3, CAMZ = 17, AIM = rad(14), FOV = 44;
/** A spot `deg` right of the view axis and `d` metres from the camera. */
const polar = (deg: number, d: number): [number, number] => [CAMX - Math.sin(AIM - rad(deg)) * d, CAMZ - Math.cos(AIM - rad(deg)) * d];
const SLOTS = [
  { at: polar(0, 13.5), tall: 5.4, wide: 2.6 },
  { at: polar(-15, 20), tall: 4.4, wide: 2.3 },
  { at: polar(15, 26), tall: 4.6, wide: 2.6 },
  { at: polar(15.5, 9.6), tall: 2.0, wide: 1.2 },
  { at: polar(-15.5, 10), tall: 2.0, wide: 1.2 },
];
/** True when something planted here would neither stand in a slot nor hide one from the camera. */
function clearOfCast(x: number, z: number, margin = 0.6) {
  for (const slot of SLOTS) {
    const [sx, sz] = slot.at;
    if (Math.hypot(x - sx, z - sz) < slot.wide + margin) return false;
    const dx = sx - CAMX, dz = sz - CAMZ, len = Math.hypot(dx, dz);
    const along = ((x - CAMX) * dx + (z - CAMZ) * dz) / len;
    const off = Math.abs((x - CAMX) * dz - (z - CAMZ) * dx) / len;
    if (along > 0 && along < len && off < 1.1 + margin) return false;
  }
  return true;
}

export default defineWorld({
  questions: {
    weather: choice('What is the sky doing over the dead road?', WEATHER),
    vantage: choice('Where are we standing?', {
      road: 'On the tarmac at walking height: the weeds are waist high and everything looms.',
      roof: 'On the roof of something, a little above the lanes: the usual survey of the road ahead.',
      gantry: 'High up on a sign frame, looking down the lanes like a lookout.',
    }),
    growth: choice('What has taken the road back?', {
      birch: 'White-stemmed birch saplings in every seam, light and yellow-green, the first trees to come.',
      broadleaf: 'Sturdy young oaks and sycamores, round and deep green, lifting the slabs.',
      pine: 'Dark self-seeded pines and moss, a northern stillness.',
      meadow: 'A wildflower meadow over drifted soil: tall grass and colour, hardly any road left to see.',
      creeper: 'Ivy and bramble: no trees, but every rail, post and sign wears a heavy green coat with long hanging curtains.',
    }),
    flyover: choice('What became of the flyover that crosses ahead?', {
      whole: 'It still stands whole, draped with vines, casting its shadow on the lanes.',
      gap: 'One span is gone: a clean gap of sky, a slab hanging by its reinforcing bars.',
      fallen: 'A span has dropped at one end and lies across the lanes like a ramp.',
      stub: 'Only the piers are left, a row of concrete columns holding up nothing.',
    }),
    gantry: choice('What state is the overhead sign gantry in?', {
      standing: 'Still upright, its green panels readable through the ivy.',
      leaning: 'Leaning back out of true, panels askew, one good storm from going over.',
      fallen: 'One leg has given way and the beam slants down to the tarmac.',
      none: 'Gone; the road ahead is open.',
    }),
    skyline: choice('What stands on the horizon?', {
      towers: 'City towers, green to the waist and broken at the top, glass gone.',
      stacks: 'The cooling towers and striped chimneys of a dead power station.',
      town: 'A swallowed town: roofs in the trees, a church spire, a water tower and a stopped ferris wheel.',
      bridge: 'The pylons of a great suspension bridge over a river, its deck broken in the middle.',
      hills: 'Only green hills and a line of stilled wind turbines.',
    }),
    traffic: choice('What was left on the carriageway?', {
      empty: 'Nothing. The lanes emptied out before the end.',
      queue: 'A queue of cars nose to tail, all pointing away from the city, where the traffic finally stopped.',
      pileup: 'A tangle of crashed cars shoved against each other, one on its side.',
      bus: 'A single coach slewed across the lanes with its door open.',
      convoy: 'A column of olive army trucks that was heading in, not out.',
    }),
    trace: choice('What sign is there that anyone still passes through?', {
      none: 'None at all. Nobody has been here in years.',
      words: 'Big letters painted across the lanes for someone to read from the air or the road.',
      garden: 'A tended garden in raised beds on the tarmac, a water butt, washing on a line.',
      flags: 'Strings of faded cloth flags tied from mast to mast across the road.',
      smoke: 'One thin column of smoke rising from the trees, far off.',
    }),
    words: choice('If words are painted on the road, what do they say?', {
      alive: 'STILL ALIVE: a claim, a greeting.',
      north: 'GONE NORTH: a forwarding address.',
      water: 'NO WATER: a warning to move on.',
      back: 'TURN BACK: a warning about what is ahead.',
      waited: 'WE WAITED: the saddest one.',
    }),
    life: choice('What animals have moved in?', {
      none: 'Nothing visible. Just wind in the leaves.',
      flock: 'A big loose flock of birds wheeling over the road.',
      crows: 'Crows spaced along the guardrail and the lamp arms, watching.',
      deer: 'A few deer far down the carriageway, heads up.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const wear = mood.wear, d = mood.daylight;
    const rr = (lo: number, hi: number) => mix(lo, hi, random());
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const std = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...options });
    const add = <T extends THREE.Object3D>(object: T, shadow = true) => {
      object.traverse((n) => { if ((n as THREE.Mesh).isMesh) n.castShadow = n.receiveShadow = shadow; });
      root.add(object);
      return object;
    };

    // ---- Light and colour: the day swings the sun from ahead-left round to behind-right.
    const sky = SKY[a.weather];
    const gold = clamp01((Math.abs(d - 0.5) * 2 - 0.3) / 0.55);
    const warm = (mood.warmth - 0.5) * 0.3;
    const tint = (c: string) => (warm > 0 ? blend(c, '#ffd9ae', warm) : blend(c, '#d2e2f6', -warm));
    const top = tint(blend(sky.top, d < 0.5 ? '#b9b6dd' : '#9a93c6', gold * 0.75));
    const low = tint(blend(sky.low, d < 0.5 ? '#ffe3d2' : '#ffdcae', gold * 0.85));
    const hazeColour = blend(low, top, 0.22);
    const haze = (color: string, distance: number) => blend(color, hazeColour, sky.haze * clamp01((distance - 30) / 330) ** 0.6);
    const background = new THREE.Color(low);
    root.add(new THREE.HemisphereLight(blend(top, '#ffffff', 0.6), '#7b8468', sky.hemi * (1 - gold * 0.12)));
    const key = new THREE.DirectionalLight(new THREE.Color(tint(blend('#fff6e6', d < 0.5 ? '#ffd2b4' : '#ffb672', gold))), sky.key * (1 - gold * 0.2));
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.06;
    key.shadow.bias = -0.0004;
    key.shadow.radius = sky.soft;
    root.add(key, key.target);

    // How much green: age and clutter both feed it.
    const G = clamp01(0.42 + wear * 0.42 + mood.density * 0.2);
    const autumn = clamp01((mood.warmth - 0.45) * 1.3) * 0.5;
    const leafBase = { birch: '#9dbb4f', broadleaf: '#4f8a3f', pine: '#3c6b4a', meadow: '#7fa64c', creeper: '#3f7d42' }[a.growth];
    const leaf = () => blend(blend(leafBase, '#c9a23c', autumn * random()), random() < 0.5 ? '#2f5c33' : '#b7cf6c', random() * 0.28);
    const canopy = (distance: number) => haze(blend(blend(pick(['#4f7f42', '#5f9049', '#6d9c50', '#46703d']), '#b08f3c', autumn * random() * 0.8), '#8fb565', random() * 0.2), distance);
    const concrete = blend('#bdb9ac', '#8f927f', wear * 0.4);
    const rust = '#8a4a2c';

    const blobs = new Batch(new THREE.IcosahedronGeometry(1, 1), std('#ffffff', { roughness: 1 }));
    const sticks = new Batch(new THREE.CylinderGeometry(1, 1, 1, 7), std('#ffffff'));
    const slabs = new Batch(new THREE.BoxGeometry(1, 1, 1), std('#ffffff'));
    const cones = new Batch(new THREE.ConeGeometry(1, 1, 6), std('#ffffff', { roughness: 1 }));
    const blades = new Batch(new THREE.ConeGeometry(1, 1, 3, 1, true), std('#ffffff', { roughness: 1, side: THREE.DoubleSide }));

    // ---- Sky dome.
    const skyMap = paint(2048, 512, (ctx, w, h) => {
      ctx.save(); ctx.scale(0.5, 0.5); w *= 2; h *= 2;
      const horizon = h * 0.806;
      const g = ctx.createLinearGradient(0, 0, 0, horizon);
      g.addColorStop(0, top); g.addColorStop(0.55, blend(top, low, 0.55)); g.addColorStop(1, low);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const cloud = (x: number, y: number, rx: number, ry: number, colour: string, alpha: number) => {
        ctx.globalAlpha = alpha; ctx.fillStyle = colour;
        for (const dx of [-w, 0, w]) { ctx.beginPath(); ctx.ellipse(x + dx, y, rx, ry, 0, 0, 7); ctx.fill(); }
      };
      const lit = blend('#ffffff', low, 0.25 + gold * 0.4), shade = blend(top, '#8f98ad', 0.5);
      if (a.weather === 'clear') for (let i = 0; i < 26; i++) cloud(random() * w, horizon * rr(0.25, 0.9), rr(80, 320), rr(2, 6), lit, 0.35);
      if (a.weather === 'haze' || a.weather === 'mist') for (let i = 0; i < 40; i++) cloud(random() * w, horizon * rr(0.2, 1), rr(200, 600), rr(10, 40), '#ffffff', 0.12);
      if (a.weather === 'cumulus' || a.weather === 'rain')
        for (let i = 0; i < 30; i++) {
          const x = random() * w, base = horizon * rr(0.5, 0.93), size = rr(40, 130) * (1.5 - base / horizon);
          for (let k = 0; k < 9; k++) cloud(x + rr(-1.6, 1.6) * size, base - random() * size * 0.9, size * rr(0.4, 0.9), size * rr(0.3, 0.6), k < 3 ? shade : lit, k < 3 ? 0.5 : 0.9);
          cloud(x, base + size * 0.12, size * 1.9, size * 0.16, shade, 0.5);
        }
      if (a.weather === 'rain') {
        const bank = ctx.createLinearGradient(0, 0, 0, horizon * 0.62);
        bank.addColorStop(0, blend(top, '#39414f', 0.6)); bank.addColorStop(0.8, blend(top, '#4c5565', 0.4)); bank.addColorStop(1, 'rgba(90,100,118,0)');
        ctx.globalAlpha = 0.92; ctx.fillStyle = bank; ctx.fillRect(0, 0, w, horizon * 0.62);
        for (let i = 0; i < 50; i++) cloud(random() * w, horizon * rr(0.5, 0.64), rr(90, 260), rr(14, 40), blend(top, '#4c5565', 0.4), 0.55);
      }
      ctx.globalAlpha = 1;
      const fade = ctx.createLinearGradient(0, horizon - 70, 0, horizon);
      fade.addColorStop(0, 'rgba(255,255,255,0)'); fade.addColorStop(1, low);
      ctx.fillStyle = fade; ctx.fillRect(0, horizon - 70, w, 70);
      ctx.fillStyle = haze('#6d9050', 400); ctx.fillRect(0, horizon, w, h - horizon);
      ctx.restore();
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2600, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.62), new THREE.MeshBasicMaterial({ map: skyMap, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
    dome.renderOrder = -10;
    add(dome, false);

    // ---- Cracks first: they are painted into the tarmac and planted along afterwards.
    const cracks: [number, number][][] = [];
    const crack = (x: number, z: number, heading: number, steps: number, stride: number) => {
      const line: [number, number][] = [[x, z]];
      for (let i = 0; i < steps; i++) {
        heading += rr(-0.5, 0.5);
        x += Math.sin(heading) * stride; z -= Math.cos(heading) * stride;
        if (Math.abs(x) > HW - 0.4) break;
        line.push([x, z]);
      }
      cracks.push(line);
    };
    crack(-4.4 + rr(-0.3, 0.3), 14, 0, 30, 1.8); // the long seam where two lanes have parted
    crack(2.8, -14, 0, 22, 1.9);
    for (let i = 0; i < 5 + Math.round(wear * 9); i++) crack(rr(-9, 9), rr(-34, 12), rr(-1.6, 1.6), 5 + Math.floor(random() * 8), rr(1, 2.2));

    // ---- The carriageway: painted tarmac near, a plainer run on to the horizon.
    const asphalt = tint(blend(blend('#8f8e89', '#a39f93', wear * 0.5), low, gold * 0.2));
    const moss = () => pick(['#6f9a48', '#5f8c44', '#86a852', '#7c9b5a']);
    const lineWhite = blend('#f1efe6', asphalt, wear * 0.45);
    const paintDeck = (zFar: number, zNear: number, near: boolean) => (ctx: Ctx, w: number, h: number) => {
      const sx = w / (HW * 2), sz = h / (zNear - zFar);
      const X = (x: number) => (x + HW) * sx, Z = (z: number) => (z - zFar) * sz;
      const patch = (x: number, z: number, rx: number, rz: number, colour: string, alpha: number, solid = 0.3) => {
        ctx.save(); ctx.translate(X(x), Z(z)); ctx.scale(rx * sx, rz * sz);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        g.addColorStop(0, colour); g.addColorStop(solid, colour); g.addColorStop(1, `${colour}00`);
        ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, 7); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1;
      };
      ctx.fillStyle = asphalt; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < (near ? 420 : 300); i++) { ctx.globalAlpha = 0.06; ctx.fillStyle = random() < 0.5 ? '#5d5c5b' : '#c8c5ba'; ctx.beginPath(); ctx.ellipse(X(rr(-HW, HW)), Z(rr(zFar, zNear)), rr(0.3, 2.2) * sx, rr(0.5, 5) * sz, 0, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
      for (const lane of [-6.2, -2.6, 1, 4.6]) for (const off of [-0.85, 0.85]) { ctx.fillStyle = 'rgba(52,52,58,0.08)'; ctx.fillRect(X(lane + off - 0.35), 0, 0.7 * sx, h); }
      if (near) for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(60,60,64,0.3)'; ctx.fillRect(X(rr(-8, 6)), Z(rr(zFar, zNear)), rr(1.5, 3.2) * sx, rr(2, 7) * sz); }
      // Lane markings, worn through in places.
      ctx.fillStyle = lineWhite;
      for (const x of [-8, 6.4]) for (let z = zFar; z < zNear; z += 2) if (random() > wear * 0.45) ctx.fillRect(X(x - 0.1), Z(z), 0.2 * sx, 2.05 * sz);
      for (const x of [-4.4, -0.8, 2.8]) for (let z = zNear - 2; z > zFar; z -= 12) if (random() > wear * 0.3) ctx.fillRect(X(x - 0.08), Z(z - 3), 0.16 * sx, 3 * sz);
      for (let z = 12; z > zFar; z -= 32) { ctx.fillStyle = 'rgba(40,42,44,0.75)'; ctx.fillRect(0, Z(z), w, Math.max(2, 0.12 * sz)); }
      if (near) {
        // Lane arrows, and whatever the survivors wrote.
        const stencil = (x: number, z: number, draw: () => void) => { ctx.save(); ctx.translate(X(x), Z(z)); ctx.scale(sx, sz); draw(); ctx.restore(); };
        ctx.fillStyle = lineWhite; ctx.globalAlpha = 0.85;
        for (const [x, z] of [[-6.2, -24], [-2.6, -24], [1, -24], [4.6, -24]] as const)
          stencil(x, z, () => { ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0.7, -0.8); ctx.lineTo(0.2, -0.8); ctx.lineTo(0.2, 3); ctx.lineTo(-0.2, 3); ctx.lineTo(-0.2, -0.8); ctx.lineTo(-0.7, -0.8); ctx.closePath(); ctx.fill(); });
        ctx.globalAlpha = 1;
        if (a.trace === 'words') {
          const [wx, wz] = polar(0.5, 10.4);
          const ink = { alive: '#f4f1e6', north: '#f2d24a', water: '#d8492f', back: '#d8492f', waited: '#f4f1e6' }[a.words];
          stencil(wx, wz, () => {
            ctx.rotate(-AIM); ctx.scale(0.01, 0.019);
            ctx.font = 'bold 100px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = ink; ctx.globalAlpha = 0.9;
            WORDS[a.words].forEach((word, row) => {
              ctx.save(); ctx.translate(rr(-12, 12), (row - 0.5) * 104); ctx.rotate(rr(-0.03, 0.03));
              ctx.fillText(word.split('').join(' '), 0, 0, 620);
              ctx.restore();
            });
            for (let i = 0; i < 5; i++) ctx.fillRect(rr(-280, 280), rr(-90, 90), rr(4, 9), rr(20, 70)); // drips
          });
          ctx.globalAlpha = 1;
        }
      }
      // Cracks with moss in them.
      if (near)
        for (const line of cracks) {
          const stroke = (width: number, colour: string, alpha: number) => {
            ctx.strokeStyle = colour; ctx.globalAlpha = alpha; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.beginPath();
            line.forEach(([x, z], i) => (i ? ctx.lineTo(X(x), Z(z)) : ctx.moveTo(X(x), Z(z)))); ctx.stroke(); ctx.globalAlpha = 1;
          };
          stroke(0.8 * sx * G, moss(), 0.4); stroke(0.24 * sx, '#6f8f48', 0.6 * G); stroke(0.09 * sx, '#262726', 0.95);
          for (const [x, z] of line) if (random() < G) patch(x, z, rr(0.3, 0.9), rr(0.4, 1.2), moss(), 0.75);
        }
      // Soil and moss drifting in from the edges and settling in patches.
      const drift = Math.round((near ? 150 : 260) * G);
      for (let i = 0; i < drift; i++) { const side = random() < 0.6 ? -1 : 1; patch(side * (HW - random() ** 2 * 3.2), rr(zFar, zNear), rr(0.5, 1.6), rr(0.8, 3.5), moss(), 0.8); }
      for (let i = 0; i < drift * 0.5; i++) patch(rr(-HW, HW), rr(zFar, zNear), rr(0.3, 1.3), rr(0.4, 2), moss(), 0.55);
      if (a.growth === 'meadow')
        for (let i = 0; i < (near ? 46 : 90); i++) {
          const x = rr(-HW, HW), z = rr(zFar, zNear), r = rr(1.5, 4.2);
          patch(x, z, r, r * rr(1, 2), '#8a7a55', 0.6, 0.5); patch(x, z, r * 0.85, r * rr(1, 1.8), moss(), 0.9, 0.55);
        }
      if (a.weather === 'rain')
        for (let i = 0; i < (near ? 16 : 24); i++) {
          const x = rr(-8, 8), z = rr(zFar, zNear), r = rr(0.6, 2);
          patch(x, z, r * 1.15, r * 1.6, '#55575c', 0.5, 0.75); patch(x, z, r, r * 1.4, blend(top, low, 0.6), 0.95, 0.82);
        }
    };
    const NEAR_Z = -38, FAR_Z = -250, BACK_Z = 26;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, BACK_Z - NEAR_Z), std('#ffffff', { map: paint(1024, 2048, paintDeck(NEAR_Z, BACK_Z, true)), roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, (BACK_Z + NEAR_Z) / 2);
    ground.receiveShadow = true;
    root.add(ground);
    const farDeck = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, NEAR_Z - FAR_Z), std('#ffffff', { map: paint(256, 2048, paintDeck(FAR_Z, NEAR_Z, false)), roughness: 0.95 }));
    farDeck.rotation.x = -Math.PI / 2;
    farDeck.position.set(0, 0, (NEAR_Z + FAR_Z) / 2);
    farDeck.receiveShadow = true;
    root.add(farDeck);
    slabs.at([0, -0.95, (BACK_Z + FAR_Z) / 2], [HW * 2 + 0.8, 1.86, BACK_Z - FAR_Z], concrete);
    slabs.at([HW + 0.15, 0.5, (BACK_Z + FAR_Z) / 2], [0.4, 1, BACK_Z - FAR_Z], concrete); // right-hand parapet

    // ---- Vegetation helpers.
    const tuft = (x: number, z: number, size = 1, y = 0) => {
      for (let i = 0; i < 5; i++) {
        const h = rr(0.25, 0.7) * size;
        blades.at([x + rr(-0.14, 0.14), y + h / 2, z + rr(-0.14, 0.14)], [rr(0.025, 0.05) * size, h, rr(0.025, 0.05) * size], blend(blend(leaf(), '#4f7a3a', 0.4), '#c9c57a', random() * 0.4), new THREE.Euler(rr(-0.3, 0.3), random() * 3, rr(-0.3, 0.3)));
      }
    };
    const flowerColours = mood.cheer > 0.45 ? ['#e8503a', '#f2c230', '#b06ad8', '#f4f1e6', '#ef7fa8'] : ['#f4f1e6', '#d9d2a8', '#b9a6d0'];
    const flower = (x: number, z: number) => {
      const h = rr(0.35, 0.9);
      blades.at([x, h / 2, z], [0.012, h, 0.012], '#6f8f45');
      slabs.at([x, h, z], [0.16, 0.09, 0.16], pick(flowerColours), new THREE.Euler(rr(-0.4, 0.4), random() * 3, rr(-0.4, 0.4)));
    };
    const tree = (x: number, z: number, h: number, y0 = 0, kind: string = a.growth) => {
      const lean: P = [x + rr(-0.12, 0.12) * h, y0 + h, z + rr(-0.12, 0.12) * h];
      if (kind === 'pine') {
        sticks.span([x, y0, z], lean, 0.035 * h + 0.02, '#5d4a3a');
        for (let k = 0; k < 4; k++) { const t = 0.3 + k * 0.2; cones.at([mix(x, lean[0], t + 0.08), y0 + h * (t + 0.1), mix(z, lean[2], t + 0.08)], [h * 0.3 * (1.1 - t), h * 0.34, h * 0.3 * (1.1 - t)], blend(leaf(), '#274b36', 0.3)); }
        return;
      }
      const birch = kind === 'birch';
      sticks.span([x, y0, z], lean, (birch ? 0.016 : 0.028) * h + 0.02, birch ? '#e6e2d6' : '#6b5642');
      const n = birch ? 7 : 5;
      for (let k = 0; k < n; k++) {
        const t = rr(0.55, 1.05), r = h * (birch ? rr(0.1, 0.17) : rr(0.17, 0.27));
        const px = mix(x, lean[0], t) + rr(-1, 1) * h * (birch ? 0.14 : 0.2), pz = mix(z, lean[2], t) + rr(-1, 1) * h * (birch ? 0.14 : 0.2), py = y0 + h * t;
        if (birch || k < 2) sticks.span([mix(x, lean[0], t * 0.6), y0 + h * t * 0.6, mix(z, lean[2], t * 0.6)], [px, py, pz], 0.008 * h + 0.008, birch ? '#e6e2d6' : '#6b5642');
        blobs.at([px, py, pz], [r, r * rr(0.7, 0.95), r], leaf(), new THREE.Euler(random() * 3, random() * 3, 0));
      }
    };
    const creep = (x: number, y: number, z: number, r: number, hang = 0) => {
      blobs.at([x, y, z], [r * rr(0.8, 1.3), r * rr(0.45, 0.7), r * rr(0.8, 1.3)], leaf(), new THREE.Euler(0, random() * 3, 0));
      if (hang > 0.2) { slabs.span([x, y, z], [x + rr(-0.15, 0.15), y - hang, z + rr(-0.15, 0.15)], 0.1, leaf()); blobs.at([x, y - hang, z], [0.22, 0.3, 0.22], leaf()); }
    };
    const treeless = a.growth === 'meadow' || a.growth === 'creeper';

    // Saplings and grass along every crack; the long seams have heaved their slabs up.
    const plate = blend(asphalt, '#5a5a58', 0.25);
    cracks.forEach((line, index) => {
      const main = index < 2;
      line.forEach(([x, z], step) => {
        if (random() < G * 0.9) tuft(x + rr(-0.2, 0.2), z + rr(-0.2, 0.2), rr(0.7, 1.5));
        const open = clearOfCast(x, z);
        if (main && open && step % 2 === 0 && z > -40) {
          const lift = rr(0.08, 0.2) * (0.5 + wear), turn = rr(-0.3, 0.3);
          for (const side of [-1, 1]) slabs.at([x + side * 0.8, lift * 0.75 + 0.01, z + rr(-0.3, 0.3)], [1.5, 0.13, rr(1.6, 2.6)], plate, new THREE.Euler(rr(-0.06, 0.06), turn, -side * lift));
          for (let i = 0; i < 3; i++) { const r = rr(0.1, 0.28); blobs.at([x + rr(-0.5, 0.5), r * 0.4, z + rr(-1, 1)], [r, r * 0.6, r], plate, new THREE.Euler(random(), random(), 0)); }
        }
        if (random() < (main ? 0.75 : 0.22) * G && open) {
          if (treeless) { blobs.at([x, 0.25, z], [rr(0.4, 0.9), rr(0.3, 0.6), rr(0.4, 0.9)], leaf()); if (a.growth === 'meadow') for (let i = 0; i < 4; i++) flower(x + rr(-0.8, 0.8), z + rr(-0.8, 0.8)); }
          else tree(x, z, rr(1.6, 3.4) * (0.75 + G * 0.6) * (main ? 1.3 : 1));
        }
      });
    });
    // Grass on the joints, in the gutters and anywhere the soil has settled.
    for (let z = 12; z > -120; z -= 32) for (let x = -HW; x < HW; x += 0.5) if (random() < G * 0.5) tuft(x, z + rr(-0.15, 0.15), rr(0.6, 1.1));
    for (let i = 0; i < 300 * G; i++) { const side = random() < 0.65 ? -1 : 1; tuft(side * (HW - random() ** 2 * 2.4), rr(-70, 14), rr(0.7, 1.5)); }
    const meadow = a.growth === 'meadow' ? 1 : 0.18;
    for (let i = 0; i < 420 * G * meadow; i++) { const x = rr(-HW, HW), z = rr(-60, 13); if (clearOfCast(x, z, -0.4)) { tuft(x, z, rr(0.8, 1.7)); if (random() < 0.7) flower(x + rr(-0.4, 0.4), z + rr(-0.4, 0.4)); } }
    for (let i = 0; i < 70 * G * mood.cheer; i++) { const x = rr(-HW, HW), z = rr(-40, 13); if (clearOfCast(x, z, -0.4)) flower(x, z); }
    // The road ends in a wood: the far lanes are simply trees now.
    for (let i = 0; i < 26; i++) { const z = rr(-250, -150), r = rr(4, 8); blobs.at([rr(-HW, HW), r * 0.6, z], [r, r * 0.8, r], canopy(-z), new THREE.Euler(0, random() * 3, 0)); }
    for (let i = 0; i < 10 * G; i++) { const z = rr(-140, -70); if (treeless) blobs.at([rr(-9, 9), 0.5, z], [rr(1, 2.4), rr(0.6, 1.2), rr(1, 2.4)], haze(leaf(), -z)); else tree(rr(-9, 9), z, rr(3, 6.5)); }

    // ---- Left edge: a steel guardrail that has had enough, and the lamp masts.
    const steel = blend('#aeb4b3', rust, wear * 0.55);
    const gone = Math.floor(rr(-3, 2));
    let last: P | null = null;
    for (let i = 0, z = 20; z > -74; z -= 4, i++) {
      const sag = Math.max(0, Math.sin(i * 0.55 + random() * 2)) * wear;
      const topP: P = [-HW - 0.05 - sag * 0.9 + rr(-0.05, 0.05), 0.82 - sag * 0.55, z];
      const missing = wear > 0.25 && i >= 6 + gone && i < 8 + gone + Math.round(wear * 2);
      sticks.span([-HW + 0.05, -0.1, z], missing ? [-HW - 0.5, 0.5, z + 0.2] : topP, 0.06, steel);
      if (last && !missing) slabs.span(last, topP, 0.07, steel, undefined, 0.32);
      else if (last) slabs.span(last, [last[0] - 0.4, 0.05, last[2] - 2.6], 0.07, steel, undefined, 0.32); // a loose end drooping to the deck
      last = missing ? null : topP;
      if (random() < G * (a.growth === 'creeper' ? 0.9 : 0.35)) creep(topP[0], topP[1] + 0.1, z + rr(-1.5, 1.5), rr(0.5, 1.1));
    }
    slabs.at([-HW - 0.05, 0.62, -162], [0.08, 0.32, 176], haze(steel, 150));
    const lampArms: P[] = [];
    for (const z of [-6, -34, -62, -90, -118, -146]) {
      const leanX = rr(-0.2, 0.06) * (0.3 + wear), leanZ = rr(-0.15, 0.15) * (0.3 + wear);
      const colour = haze(blend('#9aa19f', rust, wear * 0.4), -z);
      const m = new THREE.Matrix4().compose(new THREE.Vector3(-HW - 0.2, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(leanZ, 0, leanX)), new THREE.Vector3(1, 1, 1));
      sticks.span([0, 0, 0], [0, 9.2, 0], 0.11, colour, m);
      sticks.span([0, 9.1, 0], [2.4, 9.6, 0], 0.07, colour, m);
      slabs.at([2.6, 9.55, 0], [0.9, 0.16, 0.36], colour, E0, m);
      lampArms.push(new THREE.Vector3(1.4, 9.5, 0).applyMatrix4(m).toArray() as P);
      if (a.growth === 'creeper' || random() < G * 0.5) for (let y = 0.4; y < rr(2, 8) * G; y += 0.7) creep(new THREE.Vector3(0, y, 0).applyMatrix4(m).x + rr(-0.1, 0.1), y, z + rr(-0.15, 0.15), rr(0.3, 0.55));
    }
    // Ivy over the right-hand parapet.
    for (let i = 0; i < 60 * G; i++) { const z = rr(-120, 0); blobs.at([HW + rr(-0.2, 0.2), rr(0.5, 1.15), z], [rr(0.5, 1.2), rr(0.35, 0.6), rr(0.7, 1.8)], haze(leaf(), -z)); }

    // ---- The valley: a sea of treetops, a few of them tall enough to lean over the rail.
    const floorDisc = new THREE.Mesh(new THREE.CircleGeometry(2550, 48), std(haze('#5c8a48', 260), { roughness: 1 }));
    floorDisc.rotation.x = -Math.PI / 2;
    floorDisc.position.y = -9.5;
    add(floorDisc, false);
    const riverSide = (x: number, z: number) => Math.abs((x + 70) * 0.95 + (z + 120) * 0.31) < 30;
    for (let i = 0; i < 360 + mood.density * 160; i++) {
      const dist = 22 * (300 / 22) ** random(), deg = rr(-27, 27), [x, z] = polar(deg, dist);
      if (Math.abs(x) < HW + 3 || (a.skyline === 'bridge' && dist > 60 && riverSide(x, z))) continue;
      const r = 3.6 + dist * 0.03 + random() * 2.5;
      blobs.at([x, -10 + r * rr(0.5, 1.5), z], [r, r * rr(0.7, 1), r], canopy(dist), new THREE.Euler(0, random() * 3, 0));
    }
    for (const z of [-5, -17, -29, -43].slice(0, 2 + Math.round(G * 2))) {
      const x = -HW - rr(1.6, 4), topY = (z === -5 ? rr(3.5, 6) : rr(0.5, 3.5)) * (0.6 + G * 0.5);
      sticks.span([x, -10, z], [x + rr(-0.5, 0.5), topY, z + rr(-0.5, 0.5)], 0.3, '#5f4e3d');
      for (let k = 0; k < 7; k++) { const r = rr(1.6, 3); blobs.at([x + rr(-2.6, 2.2), topY + rr(-2.5, 1.5), z + rr(-3, 3)], [r, r * 0.8, r], canopy(20), new THREE.Euler(0, random() * 3, 0)); }
    }
    for (let i = 0; i < 7; i++) {
      const dist = rr(1300, 1700), [x, z] = polar(-42 + i * 14 + rr(-4, 4), dist), r = rr(330, 600);
      blobs.at([x, -12, z], [r, r * rr(0.2, 0.36), r * 0.7], haze(pick(['#62865a', '#6f9160', '#587c58']), 700));
    }
    if (a.weather === 'mist')
      for (const y of [-6, -4, -2.4, -1.2]) {
        const veil = new THREE.Mesh(new THREE.CircleGeometry(2500, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.26, depthWrite: false, toneMapped: false }));
        veil.rotation.x = -Math.PI / 2; veil.position.y = y;
        add(veil, false);
      }
    if (a.weather === 'rain') {
      const bow = paint(512, 512, (ctx) => {
        ['#d84a4a', '#f08a3c', '#f2d648', '#6cc46a', '#4a90d8', '#7a5ac8'].forEach((colour, i) => { ctx.strokeStyle = colour; ctx.globalAlpha = 0.5; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(256, 256, 236 - i * 5, 0, 7); ctx.stroke(); });
      });
      const [bx, bz] = polar(-6, 1700);
      const arc = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500), new THREE.MeshBasicMaterial({ map: bow, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.8 }));
      arc.position.set(bx, -80, bz); arc.rotation.y = AIM;
      add(arc, false);
    }

    // ---- The horizon.
    const far = (deg: number, dist: number, build: (x: number, z: number, dist: number) => void, push = 2.4) => { const [x, z] = polar(deg, dist * push); build(x, z, dist); };
    const BASE = -10;
    if (a.skyline === 'towers') {
      const facades = [0, 1, 2].map((v) => paint(128, 512, (ctx, w, h) => {
        ctx.fillStyle = ['#b7c0c2', '#c8c2b3', '#9fb1ba'][v]; ctx.fillRect(0, 0, w, h);
        const cols = 5 + v * 2, rows = 30 + v * 6;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          ctx.fillStyle = random() < 0.2 + wear * 0.35 ? '#39464c' : random() < 0.5 ? '#86a2b0' : '#a6bcc6';
          ctx.fillRect((c + 0.15) * w / cols, (r + 0.2) * h / rows, 0.7 * w / cols, 0.6 * h / rows);
        }
        for (let i = 0; i < 90; i++) { ctx.fillStyle = pick(['#5f8f4a', '#6f9c52', '#4f7f42']); ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(random() * w, h * (1 - random() ** 1.6 * (0.35 + G * 0.5)), rr(6, 20), rr(8, 30), 0, 0, 7); ctx.fill(); }
        ctx.globalAlpha = sky.haze * 0.75; ctx.fillStyle = hazeColour; ctx.fillRect(0, 0, w, h);
      }));
      const mats = facades.map((map) => std('#ffffff', { map }));
      const box = new THREE.BoxGeometry(1, 1, 1);
      for (let i = 0; i < 13; i++)
        far(-25 + i * 3.6 + rr(-1.2, 1.2), rr(210, 380), (x, z, dist) => {
          const wide = rr(20, 38), tall = rr(60, 190) * (i % 4 === 1 ? 1.15 : 0.8), turn = random() * 1.5;
          const tower = new THREE.Mesh(box, mats[i % 3]);
          tower.scale.set(wide, tall, wide * rr(0.7, 1.1)); tower.position.set(x, BASE + tall / 2, z); tower.rotation.y = turn;
          add(tower);
          const m = new THREE.Matrix4().compose(new THREE.Vector3(x, BASE + tall, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, turn, 0)), new THREE.Vector3(1, 1, 1));
          const grey = haze('#8f9a98', dist), fate = random();
          if (fate < 0.4) {
            // Stripped to the frame: bare floors on columns.
            const floors = 3 + Math.floor(random() * 4);
            for (let f = 1; f <= floors; f++) slabs.at([0, f * 4.2, 0], [wide * (1 - f * 0.06), 0.7, wide * 0.8], grey, new THREE.Euler(0, 0, f === floors ? rr(-0.2, 0.2) : 0), m);
            for (const cx of [-0.4, 0, 0.4]) for (const cz of [-0.32, 0.32]) sticks.span([cx * wide, 0, cz * wide], [cx * wide * 0.9, floors * 4.2 * rr(0.6, 1), cz * wide], 0.6, grey, m);
          } else if (fate < 0.65) {
            // Snapped: the top storeys lean off to one side.
            slabs.at([wide * 0.12, tall * 0.07, 0], [wide * 0.96, tall * 0.16, wide * 0.8], haze('#aab4b4', dist), new THREE.Euler(0, 0, rr(0.15, 0.4) * (random() < 0.5 ? -1 : 1)), m);
          } else slabs.at([0, 4, 0], [wide * 0.5, 8, wide * 0.4], grey, E0, m);
          for (let k = 0; k < 5 * G; k++) { const r = rr(4, 8); blobs.at([rr(-0.4, 0.4) * wide, r * 0.5, rr(-0.3, 0.3) * wide], [r, r * 0.8, r], canopy(dist), E0, m); }
        });
    } else if (a.skyline === 'stacks') {
      const shell = new THREE.LatheGeometry([[46, 0], [38, 22], [30, 52], [27, 72], [29, 92], [33, 108], [31.5, 108], [27.5, 92], [25.5, 72]].map(([r, y]) => new THREE.Vector2(r, y)), 28);
      [[-17, 300], [-7, 340], [4, 290]].forEach(([deg, dist], i) => far(deg, dist, (x, z) => {
        const tower = new THREE.Mesh(shell, std(haze(blend('#c2beb2', '#8f9a86', wear * 0.4), dist), { side: THREE.DoubleSide }));
        tower.position.set(x, BASE, z); tower.scale.setScalar(1 - i * 0.06);
        add(tower);
        for (let k = 0; k < 14 * G; k++) { const ang = random() * 6.3, r = rr(5, 10); blobs.at([x + Math.cos(ang) * 46, BASE + rr(4, 24), z + Math.sin(ang) * 46], [r, r * 1.2, r], canopy(dist)); }
      }));
      [[12, 310, 170], [16, 330, 140], [-23, 360, 150]].forEach(([deg, dist, tall]) => far(deg, dist, (x, z) => {
        for (let b = 0; b < 8; b++) sticks.span([x, BASE + (tall * b) / 8, z], [x, BASE + (tall * (b + 1)) / 8, z], 6.5 - b * 0.3, haze(b > 4 && b % 2 ? '#c9624a' : '#d8d4c8', dist));
      }));
      far(8, 270, (x, z, dist) => slabs.at([x, BASE + 22, z], [90, 44, 50], haze('#a9aba0', dist), new THREE.Euler(0, 0.4, 0)));
      for (let i = 0; i < 5; i++) far(-24 + i * 9, 190 + i * 14, (x, z, dist) => {
        const steelGrey = haze('#7f8a8c', dist);
        sticks.span([x - 5, BASE, z], [x, BASE + 46, z], 0.6, steelGrey); sticks.span([x + 5, BASE, z], [x, BASE + 46, z], 0.6, steelGrey);
        for (const y of [30, 38, 45]) slabs.at([x, BASE + y, z], [26 - (y - 30) * 0.7, 0.7, 0.7], steelGrey, new THREE.Euler(0, 0.5, i === 3 ? 0.3 : 0));
      });
    } else if (a.skyline === 'town') {
      for (let i = 0; i < 26; i++) far(rr(-26, 24), rr(70, 210), (x, z, dist) => {
        if (Math.abs(x) < HW + 8) return;
        const wide = rr(7, 11), long = rr(9, 15), turn = new THREE.Euler(0, random() * 3, 0), y = rr(-3, 0.5);
        const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(turn), new THREE.Vector3(1, 1, 1));
        slabs.at([0, -4, 0], [wide, 8, long], haze(pick(['#d9cfbd', '#c9b9a2', '#e2ddd0']), dist), E0, m);
        slabs.at([0, 0, 0], [wide * 0.74, wide * 0.74, long + 0.6], haze(pick(['#a35f48', '#8a5a4a', '#6f7478', '#7f8f5a']), dist), new THREE.Euler(0, 0, Math.PI / 4), m);
      }, 1);
      far(-9, 170, (x, z, dist) => {
        slabs.at([x, BASE + 14, z], [9, 28, 9], haze('#cfc8b8', dist));
        cones.at([x, BASE + 44, z], [5.5, 32, 5.5], haze('#5f6f6a', dist));
        slabs.at([x + 10, BASE + 8, z - 12], [12, 16, 26], haze('#cfc8b8', dist));
        slabs.at([x + 10, BASE + 16, z - 12], [9, 9, 26.5], haze('#7a5648', dist), new THREE.Euler(0, 0, Math.PI / 4));
      });
      far(-20, 200, (x, z, dist) => {
        const tank = add(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [5, 0.5], [8, 4], [8, 9], [5, 12], [0, 13]].map(([r, y]) => new THREE.Vector2(r, y)), 16), std(haze('#b9c7c4', dist))));
        tank.position.set(x, BASE + 26, z);
        for (const [lx, lz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) sticks.span([x + lx * 1.4, BASE, z + lz * 1.4], [x + lx * 0.8, BASE + 28, z + lz * 0.8], 0.5, haze('#8f9a98', dist));
      });
      far(9, 150, (x, z, dist) => {
        const R = 24, hub: P = [x, BASE + 30, z], iron = haze(blend('#c9c4b8', rust, wear * 0.4), dist);
        const wheel = add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.5, 6, 40), std(iron)));
        wheel.position.set(...hub); wheel.rotation.y = AIM + 0.5;
        const ax = new THREE.Vector3(Math.cos(AIM + 0.5), 0, -Math.sin(AIM + 0.5));
        for (let k = 0; k < 14; k++) {
          const ang = (k / 14) * 6.283 + 0.2, rim: P = [x + ax.x * Math.cos(ang) * R, hub[1] + Math.sin(ang) * R, z + ax.z * Math.cos(ang) * R];
          sticks.span(hub, rim, 0.18, iron);
          if (k % 5 !== 3 || wear < 0.5) blobs.at([rim[0], rim[1] - 2, rim[2]], [1.7, 1.5, 1.7], haze(pick(['#d8553f', '#e8c23a', '#4f8fc0', '#e9e4d6']), dist));
        }
        for (const s of [-1, 1]) for (const t of [-1, 1]) sticks.span([x + ax.x * 13 * s - ax.z * 5 * t, BASE, z + ax.z * 13 * s + ax.x * 5 * t], hub, 0.5, iron);
      });
    } else if (a.skyline === 'bridge') {
      const water = add(new THREE.Mesh(new THREE.PlaneGeometry(56, 900), std(blend(top, low, 0.55), { roughness: 0.25 })), false);
      water.rotation.set(-Math.PI / 2, 0, -1.26); water.position.set(-70, -9.3, -120);
      // The bridge crosses the river square to the bank, pylons either side.
      const dir = new THREE.Vector3(0.95, 0, 0.31), mid = new THREE.Vector3(-70 - 0.31 * 150, 0, -120 - 0.95 * 150 * -1).setZ(-262);
      const stone = haze('#b8b2a4', 270), cable = haze('#7c5248', 270), deckY = 12, topY = 62;
      const tops: P[] = [];
      for (const s of [-1, 1]) {
        const p = mid.clone().addScaledVector(dir, s * 62);
        for (const t of [-1, 1]) sticks.span([p.x - dir.z * 9 * t, BASE, p.z + dir.x * 9 * t], [p.x - dir.z * 6 * t, topY, p.z + dir.x * 6 * t], 3, stone);
        for (const y of [deckY - 3, 50, topY - 3]) slabs.span([p.x - dir.z * 9, y, p.z + dir.x * 9], [p.x + dir.z * 9, y, p.z - dir.x * 9], 4, stone, undefined, 3);
        tops.push([p.x, topY, p.z]);
      }
      const hangers: [P, P][] = [];
      const cableRun = (from: P, to: P, sagY: number) => {
        let prev = from;
        for (let k = 1; k <= 12; k++) {
          const t = k / 12, next: P = [mix(from[0], to[0], t), mix(from[1], to[1], t) - Math.sin(t * Math.PI) * sagY, mix(from[2], to[2], t)];
          sticks.span(prev, next, 0.7, cable);
          hangers.push([next, [next[0], deckY, next[2]]]);
          prev = next;
        }
      };
      cableRun(tops[0], tops[1], 44);
      const endA = mid.clone().addScaledVector(dir, -150), endB = mid.clone().addScaledVector(dir, 150);
      cableRun([endA.x, deckY, endA.z], tops[0], 14); cableRun(tops[1], [endB.x, deckY, endB.z], 14);
      for (let k = -15; k < 15; k++) {
        const broken = k >= -2 && k <= 1;
        const p = mid.clone().addScaledVector(dir, k * 10 + 5);
        if (!broken) slabs.at([p.x, deckY, p.z], [10.4, 2.2, 16], stone, new THREE.Euler(0, Math.atan2(-dir.z, dir.x), 0));
        else if (k === -2) slabs.at([p.x, deckY - 4, p.z], [10.4, 2.2, 16], stone, new THREE.Euler(0, Math.atan2(-dir.z, dir.x), -0.8));
      }
      for (const [from, to] of hangers) if (Math.abs(new THREE.Vector3(...from).sub(mid).dot(dir)) > 22) sticks.span(from, to, 0.18, cable);
    } else {
      for (let i = 0; i < 6; i++) far(-24 + i * 9 + rr(-2, 2), rr(250, 380), (x, z, dist) => {
        const hubY = BASE + rr(95, 125), white = haze('#eceae2', dist), state = i === 2 ? 'stump' : i === 4 ? 'two' : 'whole';
        sticks.span([x, BASE, z], [x, state === 'stump' ? BASE + 55 : hubY, z], 2.2, white);
        if (state === 'stump') return;
        slabs.at([x, hubY, z + 2], [3.4, 3.4, 9], white);
        const spin = random() * 2;
        for (let b = 0; b < (state === 'two' ? 2 : 3); b++) { const ang = spin + (b * Math.PI * 2) / 3; slabs.span([x, hubY, z + 6], [x + Math.cos(ang) * 44, hubY + Math.sin(ang) * 44, z + 6], 2.6, white, undefined, 0.6); }
      });
      for (let i = 0; i < 5; i++) { const dist = rr(700, 950), [x, z] = polar(-30 + i * 14 + rr(-4, 4), dist), r = rr(200, 340); blobs.at([x, -12, z], [r, r * rr(0.3, 0.5), r * 0.7], haze(pick(['#6f9a52', '#7ba55a', '#648f4e']), 330)); }
    }

    // ---- The flyover crossing ahead, and its slip road curling down behind it.
    const H = 17;
    const cx = (x: number) => new THREE.Vector3(x, H, -52 - x * 0.232);
    const deckMat = std(haze(concrete, 70), { side: THREE.DoubleSide });
    const tarMat = std(haze(asphalt, 70));
    const span = (from: THREE.Vector3, to: THREE.Vector3, steps = 2) => {
      const points = Array.from({ length: steps + 1 }, (_u, i) => from.clone().lerp(to, i / steps));
      add(new THREE.Mesh(ribbon(points, 11, 1.7, 0.9), deckMat));
      const mid = from.clone().lerp(to, 0.5), dx = to.clone().sub(from);
      const top = new THREE.Mesh(new THREE.BoxGeometry(dx.length(), 0.06, 10.2), tarMat);
      top.position.copy(mid).setY(mid.y + 0.04);
      top.rotation.set(0, Math.atan2(-dx.z, dx.x), Math.atan2(dx.y, Math.hypot(dx.x, dx.z)), 'YZX');
      add(top);
    };
    const rebar = (p: THREE.Vector3, toward: number) => { for (let i = 0; i < 9; i++) { const y = p.y - rr(0.2, 1.5), z = p.z + rr(-4.5, 4.5); sticks.span([p.x, y, z], [p.x + toward * rr(0.8, 2.6), y - rr(0.2, 1.6), z + rr(-0.5, 0.5)], 0.045, rust); } };
    const pierXs = [-92, -66, -40, -14, 14, 40, 66];
    for (const x of pierXs) {
      const p = cx(x), colour = haze(concrete, 70), topY = a.flyover === 'stub' ? H - 1.2 - rr(0, 3) * wear : H - 1.7;
      sticks.span([p.x, BASE, p.z], [p.x, topY - 1.2, p.z], 1.25, colour);
      slabs.at([p.x, topY - 0.6, p.z], [2.6, 1.3, 9.5], colour, new THREE.Euler(0, 0.23, 0));
      if (a.flyover === 'stub') for (let i = 0; i < 5; i++) sticks.span([p.x + rr(-1, 1), topY, p.z + rr(-4, 4)], [p.x + rr(-1.4, 1.4), topY + rr(0.5, 1.8), p.z + rr(-4, 4)], 0.05, rust);
      if (a.flyover === 'stub' && G > 0.4 && !treeless) tree(p.x, p.z + rr(-3, 3), rr(2, 4), topY);
      for (let y = BASE + 6; y < topY - 2 && random() < G + 0.3; y += rr(0.8, 1.6)) creep(p.x + rr(-0.5, 0.5), y, p.z + 1.25, rr(0.7, 1.2));
    }
    const vines = (from: THREE.Vector3, to: THREE.Vector3) => {
      const n = from.distanceTo(to) * 0.5 * G * (a.growth === 'creeper' ? 1.6 : 1);
      for (let i = 0; i < n; i++) { const p = from.clone().lerp(to, random()); creep(p.x, p.y + 0.85, p.z + 5.5, rr(0.5, 1), random() < 0.75 ? rr(1, 5.5) * G : 0); }
      if (!treeless && G > 0.45) for (let i = 0; i < 2; i++) { const p = from.clone().lerp(to, random()); tree(p.x, p.z + rr(-3, 3), rr(2.5, 4.5), p.y); }
    };
    if (a.flyover === 'whole') { span(cx(-100), cx(74), 6); vines(cx(-60), cx(30)); }
    if (a.flyover === 'gap') {
      span(cx(-100), cx(-41), 3); span(cx(-13), cx(74), 4);
      rebar(cx(-41), 1); rebar(cx(-13), -1);
      span(cx(-13.4).setY(H - 0.6), new THREE.Vector3(-20, H - 12, cx(-20).z), 1); // the hanging slab
      for (let i = 0; i < 6; i++) sticks.span([-13.6, H - rr(0.1, 1.2), cx(-13).z + rr(-4.5, 4.5)], [-14.6, H - rr(1.5, 2.4), cx(-14).z + rr(-4.5, 4.5)], 0.05, rust);
      vines(cx(-90), cx(-44)); vines(cx(-10), cx(30));
    }
    if (a.flyover === 'fallen') {
      span(cx(-100), cx(-15), 4); span(cx(15), cx(74), 3);
      rebar(cx(-15), 1); rebar(cx(15), -1);
      span(cx(-13).setY(H - 2.4), new THREE.Vector3(9.5, 1.5, cx(9.5).z), 1); // the dropped span, one end still on its pier
      for (let i = 0; i < 16; i++) { const r = rr(0.3, 1); blobs.at([rr(3, 12), r * 0.5, cx(8).z + rr(-7, 7)], [r, r * 0.6, r], haze(concrete, 70), new THREE.Euler(random(), random(), random())); }
      vines(cx(-90), cx(-18));
    }
    // The slip road: leaves the flyover on the far side and comes down to join the lanes far ahead.
    const slip = new THREE.CatmullRomCurve3([new THREE.Vector3(-31, H, -47), new THREE.Vector3(-36, H - 2, -74), new THREE.Vector3(-31, 6, -104), new THREE.Vector3(-20, 2.5, -134), new THREE.Vector3(-12.5, 0.2, -168)]);
    const slipPoints = slip.getPoints(22).slice(a.flyover === 'stub' ? 6 : 0);
    add(new THREE.Mesh(ribbon(slipPoints, 7.5, 1.4, 0.9), std(haze(concrete, 110), { side: THREE.DoubleSide })));
    for (const i of [2, 6, 10, 14]) { const p = slip.getPoint(i / 22 + 0.02); sticks.span([p.x, BASE, p.z], [p.x, p.y - 1.3, p.z], 0.9, haze(concrete, 110)); for (let k = 0; k < 3 * G; k++) creep(p.x + rr(-3, 3), p.y + 0.8, p.z + rr(-3, 3), rr(0.8, 1.5), rr(0, 4) * G); }
    if (a.flyover === 'stub') rebar(slipPoints[0].clone(), 0.2);

    // ---- The sign gantry.
    if (a.gantry !== 'none') {
      const GZ = -16, iron = blend('#9ca5a6', rust, wear * 0.6), TOP = 7.2;
      const signMap = (lines: string[], arrow: boolean) => paint(512, 256, (ctx, w, h) => {
        ctx.fillStyle = blend('#2f7a54', '#5f8f6a', wear * 0.5); ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#eef0e6'; ctx.lineWidth = 8; ctx.strokeRect(10, 10, w - 20, h - 20);
        ctx.fillStyle = '#eef0e6'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
        lines.forEach((line, i) => { ctx.font = `bold ${i ? 54 : 62}px sans-serif`; ctx.globalAlpha = i === 1 && wear > 0.5 ? 0.45 : 0.95; ctx.fillText(line, 34, 70 + i * 74, arrow ? 360 : 440); });
        ctx.globalAlpha = 1;
        if (arrow) { ctx.beginPath(); ctx.moveTo(450, 40); ctx.lineTo(490, 110); ctx.lineTo(464, 110); ctx.lineTo(464, 210); ctx.lineTo(436, 210); ctx.lineTo(436, 110); ctx.lineTo(410, 110); ctx.closePath(); ctx.fill(); }
        for (let i = 0; i < 9 * wear; i++) { ctx.fillStyle = 'rgba(122,74,44,0.45)'; ctx.fillRect(random() * w, rr(0, h * 0.5), rr(3, 9), rr(40, 160)); }
        for (let i = 0; i < 130 * G; i++) { ctx.fillStyle = moss(); ctx.globalAlpha = 0.9; ctx.beginPath(); const edge = random() < 0.5; ctx.ellipse(edge ? (random() < 0.5 ? rr(0, 90) : w - rr(0, 90)) : random() * w, edge ? random() * h : h - random() ** 2 * h * 0.7, rr(8, 26), rr(8, 22), 0, 0, 7); ctx.fill(); }
      });
      const frame = new THREE.Matrix4(), beam = new THREE.Matrix4();
      if (a.gantry === 'standing') frame.makeTranslation(0, 0, GZ);
      if (a.gantry === 'leaning') frame.compose(new THREE.Vector3(0, 0, GZ), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.3, 0.05, -0.09)), new THREE.Vector3(1, 1, 1));
      if (a.gantry === 'fallen') { frame.makeTranslation(0, 0, GZ); beam.makeTranslation(-HW, TOP, 0).multiply(new THREE.Matrix4().makeRotationZ(-0.335)).multiply(new THREE.Matrix4().makeRotationY(0.12)).multiply(new THREE.Matrix4().makeTranslation(HW, -TOP, 0)); }
      const beamM = frame.clone().multiply(beam);
      const leg = (x: number, m: THREE.Matrix4) => { for (const z of [-0.45, 0.45]) sticks.span([x, 0, z], [x, TOP + 0.9, z], 0.11, iron, m); for (let y = 0.6; y < TOP; y += 1.3) sticks.span([x, y, -0.45], [x, y + 1.3, 0.45], 0.045, iron, m); };
      leg(-HW - 0.2, frame);
      if (a.gantry !== 'fallen') leg(HW + 0.2, frame);
      else { const down = frame.clone().multiply(new THREE.Matrix4().makeTranslation(HW + 0.2, 0.3, 0)).multiply(new THREE.Matrix4().makeRotationX(-1.45)).multiply(new THREE.Matrix4().makeTranslation(-HW - 0.2, 0, 0)); leg(HW + 0.2, down); }
      for (const y of [TOP - 0.9, TOP + 0.7]) for (const z of [-0.45, 0.45]) sticks.span([-HW - 0.2, y, z], [HW + 0.2, y, z], 0.085, iron, beamM);
      for (let x = -HW, i = 0; x < HW; x += 1.6, i++) sticks.span([x, i % 2 ? TOP - 0.9 : TOP + 0.7, 0.45], [x + 1.6, i % 2 ? TOP + 0.7 : TOP - 0.9, 0.45], 0.04, iron, beamM);
      const panels: [number, number, number, string[], boolean][] = [[4.3, 7.4, 3.3, [pick(['M4  THE NORTH', 'A12  CITY CENTRE', 'E40  HARBOUR']), pick(['Northfield', 'Ring Road', 'Airport', 'Riverside'])], true], [-5.4, 4.4, 2.6, [pick(['EXIT 14', 'EXIT 7', 'EXIT 22']), pick(['Hospital', 'Stadium', 'Old Town', 'Services'])], false]];
      for (const [x, w, h, lines, arrow] of panels) {
        if (a.gantry !== 'standing' && !arrow && wear > 0.6) continue; // the small one has dropped off
        const panel = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), [std(iron), std(iron), std(iron), std(iron), std('#ffffff', { map: signMap(lines, arrow), roughness: 0.7 }), std(iron)]);
        panel.matrixAutoUpdate = false;
        panel.matrix.copy(beamM).multiply(new THREE.Matrix4().compose(new THREE.Vector3(x, TOP + 0.45, 0.62), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, a.gantry === 'standing' ? 0 : rr(-0.12, 0.12))), new THREE.Vector3(1, 1, 1)));
        add(panel);
      }
      const ivy = (local: P, m: THREE.Matrix4, r: number, hang: number) => { const p = new THREE.Vector3(...local).applyMatrix4(m); if (p.y > 0.2) creep(p.x, p.y, p.z, r, Math.min(hang, p.y - 0.3)); };
      const heavy = a.growth === 'creeper' ? 2 : 1;
      for (let i = 0; i < 16 * G * heavy; i++) ivy([-HW - 0.2 + rr(-0.2, 0.2), rr(0.3, TOP), rr(-0.3, 0.5)], frame, rr(0.4, 0.8), 0);
      for (let i = 0; i < 22 * G * heavy; i++) ivy([rr(-HW, i % 3 ? -1 : HW), TOP + rr(-0.9, 0.9), 0.5], beamM, rr(0.4, 0.9), random() < 0.5 ? rr(0.8, 3.2) * G : 0);
    }

    // ---- What was left on the carriageway.
    const carColours = ['#a14a3a', '#7d8f9a', '#d9d5c8', '#4a5f7a', '#c9a23c', '#5c6b5a', '#8f8f8a', '#6a3a3a'];
    const car = (x: number, z: number, turn: number, roll = 0) => {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, roll ? 0.85 : 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, turn, roll)), new THREE.Vector3(1, 1, 1));
      const paintC = haze(blend(pick(carColours), rust, wear * rr(0.3, 0.8)), CAMZ - z), kind = random();
      const long = kind < 0.25 ? 4.9 : 4.3, cabin = kind < 0.25 ? 2.9 : 2.2;
      slabs.at([0, 0.62, 0], [1.75, 0.62, long], paintC, E0, m);
      slabs.at([0, 1.15, kind < 0.25 ? -0.5 : -0.2], [1.58, 0.56, cabin], haze('#2f3b40', CAMZ - z), E0, m);
      slabs.at([0, 1.46, kind < 0.25 ? -0.5 : -0.2], [1.6, 0.08, cabin + 0.05], random() < G ? haze(moss(), CAMZ - z) : paintC, E0, m);
      for (const sx of [-0.86, 0.86]) for (const sz of [-long * 0.31, long * 0.31]) sticks.at([sx, 0.28, sz], [0.33, 0.22, 0.26], '#26272a', new THREE.Euler(0, 0, Math.PI / 2), m);
      if (random() < G * 0.5) blobs.at([rr(-0.5, 0.5), 0.3, long * 0.5 * (random() < 0.5 ? -1 : 1)], [rr(0.5, 1), rr(0.4, 0.8), rr(0.5, 1)], leaf(), E0, m);
    };
    const truck = (x: number, z: number, turn: number) => {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, turn, 0)), new THREE.Vector3(1, 1, 1));
      const olive = haze(blend('#5f6b45', rust, wear * 0.3), CAMZ - z);
      slabs.at([0, 1.5, -2.6], [2.4, 1.8, 2], olive, E0, m);
      slabs.at([0, 1.9, -3.4], [2.1, 0.7, 0.5], haze('#2f3b40', CAMZ - z), E0, m);
      slabs.at([0, 1.0, 1], [2.4, 0.5, 5.2], olive, E0, m);
      slabs.at([0, 2.1, 1], [2.45, 1.8, 5.1], haze(blend('#7c8160', '#a9a58a', wear * 0.5), CAMZ - z), E0, m);
      for (const sx of [-1.1, 1.1]) for (const sz of [-2.6, 0.6, 2.4]) sticks.at([sx, 0.5, sz], [0.52, 0.34, 0.52], '#26272a', new THREE.Euler(0, 0, Math.PI / 2), m);
    };
    const blocked = (z: number) => (a.flyover === 'fallen' && z < -44 && z > -64) || (a.gantry === 'fallen' && z < -12 && z > -21);
    if (a.traffic === 'queue')
      for (const lane of [-2.6, 1, 4.6, 8.2])
        for (let z = lane > 0 ? -21 : -30, n = 0; z > -118 && n < 12; z -= rr(5.4, 7.5), n++) { if (!blocked(z) && random() < 0.93) car(lane + rr(-0.3, 0.3), z, Math.PI + rr(-0.06, 0.06) + (random() < 0.12 ? rr(-0.5, 0.5) : 0)); }
    if (a.traffic === 'pileup') {
      const [px, pz] = polar(13, 40);
      for (let i = 0; i < 6; i++) car(px + rr(-4.5, 4.5), pz + rr(-7, 5), random() * 6.3, i === 0 ? Math.PI / 2 : 0);
      car(-6.4, -30, 2.2); car(7.9, -58, 0.4);
    }
    if (a.traffic === 'bus') {
      const [bx, bz] = polar(11, 39);
      const m = new THREE.Matrix4().compose(new THREE.Vector3(bx, 0, bz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 1.05, 0)), new THREE.Vector3(1, 1, 1));
      const livery = blend(mood.cheer > 0.5 ? '#e0b83c' : '#d9d5c8', rust, wear * 0.3);
      slabs.at([0, 1.75, 0], [2.5, 2.7, 11.5], livery, E0, m);
      slabs.at([0, 2.25, 0], [2.56, 0.95, 10.6], '#2f3b40', E0, m);
      slabs.at([0, 0.9, 0], [2.54, 0.25, 11.5], blend('#a14a3a', rust, wear * 0.4), E0, m);
      slabs.at([1.6, 1.4, -4.2], [0.75, 2, 0.08], livery, new THREE.Euler(0, 0.5, 0), m); // the open door
      for (const sx of [-1.15, 1.15]) for (const sz of [-3.8, 3.4]) sticks.at([sx, 0.5, sz], [0.5, 0.32, 0.5], '#26272a', new THREE.Euler(0, 0, Math.PI / 2), m);
      for (let i = 0; i < 8 * G; i++) blobs.at([rr(-1, 1), 3.15, rr(-5, 5)], [rr(0.4, 1), 0.25, rr(0.5, 1.4)], leaf(), E0, m);
      car(7.6, -52, 3.3);
    }
    if (a.traffic === 'convoy') for (let z = -22, n = 0; n < 6; z -= rr(11, 14), n++) if (!blocked(z)) truck(4.6 + rr(-0.3, 0.3), z, rr(-0.05, 0.05) + (n === 2 ? 0.4 : 0));

    // ---- Signs that someone still passes through.
    const animated: ((dt: number, time: number) => void)[] = [];
    if (a.trace === 'garden') {
      const [gx, gz] = polar(17.5, 20.5);
      for (let i = 0; i < 3; i++) {
        const bx = gx - 1.5 + i * 1.5, bz = gz + rr(-0.3, 0.3);
        slabs.at([bx, 0.22, bz], [1.15, 0.44, 3.6], pick(['#8f7350', '#a08460', '#7c6548']));
        slabs.at([bx, 0.43, bz], [0.98, 0.06, 3.4], '#4a3a2c');
        for (let k = 0; k < 9; k++) { const tall = i === 1; blobs.at([bx + rr(-0.25, 0.25), tall ? 0.95 : 0.6, bz - 1.5 + k * 0.38], [0.2, tall ? 0.5 : 0.18, 0.2], pick(['#5f9c3f', '#7cb04a', '#4f8a3a'])); if (tall) blobs.at([bx + rr(-0.2, 0.2), rr(0.8, 1.3), bz - 1.5 + k * 0.38], [0.07, 0.07, 0.07], '#d8402f'); }
      }
      sticks.span([gx + 2.9, 0, gz - 1.2], [gx + 2.9, 0.95, gz - 1.2], 0.3, '#3f6f9a');
      const poleA: P = [gx - 2.4, 2.1, gz - 2.6], poleB: P = [gx + 3, 2.1, gz - 3.4];
      for (const p of [poleA, poleB]) sticks.span([p[0], 0, p[2]], p, 0.04, '#8a8a84');
      for (let k = 0; k <= 10; k++) {
        const t = k / 10, p: P = [mix(poleA[0], poleB[0], t), 2.1 - Math.sin(t * Math.PI) * 0.3, mix(poleA[2], poleB[2], t)];
        if (k) { const u = (k - 1) / 10; sticks.span([mix(poleA[0], poleB[0], u), 2.1 - Math.sin(u * Math.PI) * 0.3, mix(poleA[2], poleB[2], u)], p, 0.012, '#d9d5c8'); }
        if (k > 0 && k < 10 && random() < 0.75) { const drop = rr(0.5, 1); slabs.at([p[0], p[1] - drop / 2, p[2]], [rr(0.35, 0.5), drop, 0.03], pick(['#e9e4d6', '#c9584a', '#5a86b0', '#e0c05a', '#8fa9a0']), new THREE.Euler(rr(-0.1, 0.1), 0.1, 0)); }
      }
    }
    if (a.trace === 'flags') {
      const [ax, az] = polar(20, 30), anchors: [P, P][] = [[lampArms[0], [ax, 5.2, az]], [lampArms[0], [polar(4, 44)[0], 6.5, polar(4, 44)[1]]], [lampArms[1], [polar(4, 44)[0], 6.5, polar(4, 44)[1]]]];
      sticks.span([ax, 0, az], [ax, 5.3, az], 0.05, '#8a8a84');
      sticks.span([polar(4, 44)[0], 0, polar(4, 44)[1]], [polar(4, 44)[0], 6.6, polar(4, 44)[1]], 0.05, '#8a8a84');
      const cloth = ['#d8553f', '#e8c23a', '#4f8fc0', '#e9e4d6', '#5fa06a', '#c77ab0'].map((c) => blend(c, '#d9d5c8', wear * 0.5));
      for (const [from, to] of anchors) {
        const n = Math.round(new THREE.Vector3(...from).distanceTo(new THREE.Vector3(...to)) / 0.75);
        let prev = from;
        for (let k = 1; k <= n; k++) {
          const t = k / n, p: P = [mix(from[0], to[0], t), mix(from[1], to[1], t) - Math.sin(t * Math.PI) * 1.6, mix(from[2], to[2], t)];
          sticks.span(prev, p, 0.012, '#cfcabb');
          if (random() > wear * 0.35) slabs.at([p[0], p[1] - 0.28, p[2]], [0.42, 0.55, 0.03], cloth[k % cloth.length], new THREE.Euler(rr(-0.2, 0.2), AIM + rr(-0.3, 0.3), rr(-0.15, 0.15)));
          prev = p;
        }
      }
    }
    if (a.trace === 'smoke') {
      const [sx, sz] = polar(-13, 150);
      const column = new THREE.Group();
      const puffGeo = new THREE.IcosahedronGeometry(1, 1), puffMat = new THREE.MeshBasicMaterial({ color: blend('#8f9296', low, 0.3), transparent: true, opacity: 0.5, depthWrite: false });
      for (let k = 0; k < 16; k++) {
        const puff = new THREE.Mesh(puffGeo, puffMat);
        puff.position.set(k * k * 0.16 + rr(-1, 1), k * 5.2, rr(-1, 1)); puff.scale.setScalar(1.6 + k * 0.55);
        column.add(puff);
      }
      column.position.set(sx, -4, sz);
      root.add(column);
      const speed = mix(0.15, 0.9, mood.energy);
      animated.push((_dt, time) => column.children.forEach((puff, k) => { puff.position.x = k * k * 0.16 + Math.sin(time * speed + k * 0.7) * (0.4 + k * 0.12); }));
    }

    // ---- Animals.
    if (a.life === 'crows') {
      const perch = (x: number, y: number, z: number) => { const turn = rr(-0.6, 0.6); blobs.at([x, y + 0.2, z], [0.13, 0.17, 0.26], '#1f2126', new THREE.Euler(-0.5, turn, 0)); blobs.at([x, y + 0.4, z + 0.16], [0.09, 0.09, 0.11], '#1f2126'); cones.at([x, y + 0.39, z + 0.3], [0.03, 0.12, 0.03], '#3a3a3a', new THREE.Euler(Math.PI / 2, 0, 0)); };
      for (let i = 0; i < 9; i++) perch(-HW - 0.05 - wear * 0.2, 0.84, -6 - i * rr(1.4, 2.6) - i * 1.2);
      for (const arm of lampArms.slice(0, 2)) { perch(arm[0], arm[1] + 0.08, arm[2]); perch(arm[0] + 0.7, arm[1] + 0.2, arm[2]); }
      if (a.gantry === 'standing') for (let i = 0; i < 4; i++) perch(rr(-9, 0), 7.2 + 0.78, -16 + 0.45);
    }
    if (a.life === 'deer') {
      const deer = (x: number, z: number, turn: number, grazing: boolean, s = 1) => {
        const m = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, turn, 0)), new THREE.Vector3(s, s, s));
        const coat = haze(pick(['#9a6a44', '#a87850', '#8c6040']), CAMZ - z);
        blobs.at([0, 1.05, 0], [0.3, 0.33, 0.68], coat, E0, m);
        for (const lx of [-0.16, 0.16]) for (const lz of [-0.45, 0.42]) sticks.span([lx, 0.95, lz], [lx, 0, lz + rr(-0.08, 0.08)], 0.045, coat, m);
        const head: P = grazing ? [0, 0.35, 1.05] : [0, 1.85, 0.75];
        sticks.span([0, 1.15, 0.5], head, 0.1, coat, m);
        blobs.at(head, [0.11, 0.12, 0.2], coat, new THREE.Euler(grazing ? 0.9 : 0.2, 0, 0), m);
        blobs.at([0, 1.2, -0.68], [0.09, 0.12, 0.06], '#f1ece0', E0, m);
      };
      const [dx, dz] = polar(8, 35);
      deer(dx, dz, 0.7, false, 1.25); deer(dx - 3.2, dz - 4, 2.4, true); deer(dx + 2.6, dz - 7, -0.4, false, 0.85); deer(dx - 1, dz - 12, 1.4, true, 0.9);
    }
    if (a.life === 'flock') {
      const flock = new THREE.Group();
      const wing = new THREE.BufferGeometry();
      wing.setAttribute('position', new THREE.Float32BufferAttribute([-0.7, 0.18, 0, 0, 0, 0.12, 0, 0, -0.2, 0.7, 0.18, 0, 0, 0, -0.2, 0, 0, 0.12], 3));
      wing.computeVertexNormals();
      const birds = new THREE.InstancedMesh(wing, new THREE.MeshBasicMaterial({ color: '#2c3038', side: THREE.DoubleSide }), 70);
      const m = new THREE.Matrix4();
      for (let i = 0; i < 70; i++) {
        const ang = random() * 6.3, r = rr(6, 26);
        m.compose(new THREE.Vector3(Math.cos(ang) * r, rr(-5, 6), Math.sin(ang) * r * 0.6), new THREE.Quaternion().setFromEuler(new THREE.Euler(rr(-0.3, 0.3), -ang, rr(-0.5, 0.5))), new THREE.Vector3(1, 1, 1).multiplyScalar(rr(0.8, 1.3)));
        birds.setMatrixAt(i, m);
      }
      birds.frustumCulled = false;
      flock.add(birds);
      const [fx, fz] = polar(-9, 62);
      flock.position.set(fx, 17, fz);
      root.add(flock);
      const speed = mix(0.08, 0.6, mood.energy);
      animated.push((dt) => { flock.rotation.y += dt * speed; });
    }

    blobs.build(root); sticks.build(root); slabs.build(root); cones.build(root); blades.build(root);

    // ---- Camera, and where the cast stands: in the open lanes, with the ruin behind them.
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 6000);
    const view = { road: { y: 1.75, down: 1.5 }, roof: { y: 3.4, down: 6 }, gantry: { y: 5.6, down: 11 } }[a.vantage];
    const place = (items: readonly Placeable[]) => {
      const [hero, ...rest] = items;
      const ordered = [...rest].sort((p, q) => q.radius - p.radius);
      let heroTop = 3;
      [hero, ...ordered].forEach((item, index) => {
        if (!item) return;
        const slot = SLOTS[index % SLOTS.length], [x, z] = slot.at;
        const fit = Math.min(slot.tall / Math.max(item.height, 0.05), slot.wide / Math.max(item.radius, 0.05));
        // A street keeps true sizes where it can; only the small things are brought up to be seen.
        const natural = Math.max(item.height, item.radius * 2);
        const scale = Math.min(fit, Math.max(1.3, (index === 0 ? 2.2 : 1.5) / natural));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x, 0, z);
        item.holder.rotation.y = Math.atan2(CAMX - x, CAMZ - z) + (index % 2 ? 0.45 : -0.4) + (random() - 0.5) * 0.3;
        item.holder.updateMatrixWorld(true);
        if (index === 0) heroTop = item.height * scale;
      });
      camera.position.set(CAMX, view.y, CAMZ);
      const [lx, lz] = polar(0, 30);
      camera.lookAt(lx, view.y - Math.tan(rad(view.down)) * 30 + Math.max(0, heroTop - 4.4) * 0.35, lz);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      const azimuth = rad(mix(-100, 68, d)), elevation = rad(mix(60, 15, gold));
      key.target.position.set(-1, 0, -10);
      key.position.set(-1 + Math.sin(azimuth) * Math.cos(elevation) * 90, Math.sin(elevation) * 90, -10 + Math.cos(azimuth) * Math.cos(elevation) * 90);
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -52; shadow.right = shadow.top = 52;
      shadow.near = 1; shadow.far = 220;
      shadow.updateProjectionMatrix();
    };
    place([]);

    return {
      object: root, camera, background, capacity: SLOTS.length, ground, keyLight: key, place,
      update: animated.length ? (dt, time) => { for (const step of animated) step(dt, time); } : undefined,
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
