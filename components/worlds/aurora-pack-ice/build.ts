import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Placeable, type World, choice, defineWorld, disposeTree, mix, score } from '@conjure/kit';

type XZ = [number, number];

const AURORAS = {
  green: 'Classic vivid green, pale at the hem.',
  mixed: 'Green below rising through teal into violet, the full display.',
  violet: 'Violet and magenta, strange and electric.',
  crown: 'Green curtains crowned with deep red, the rare storm aurora.',
  teal: 'Cold teal and blue, like light seen through ice.',
  none: 'No aurora tonight: only the deep blue dusk and the stars.',
} as const;
const PALETTES: Record<Exclude<keyof typeof AURORAS, 'none'>, [string, string, string, string]> = {
  green: ['#d6ffb8', '#35f56c', '#16d67e', '#12a88c'],
  mixed: ['#ccffc4', '#34f070', '#2fc4c0', '#a04cf4'],
  violet: ['#f0d0ff', '#b45cff', '#8448f0', '#ff4cc0'],
  crown: ['#ccffbc', '#3cec64', '#f4603c', '#d81c3c'],
  teal: ['#c8fff0', '#1ce8c8', '#1c9cf0', '#5460f0'],
};
const FORMS = {
  curtains: 'Tall folded curtains hanging in ranks, rippling.',
  arc: 'One quiet smooth arch from horizon to horizon.',
  corona: 'A corona: rays fanning down from a point high overhead.',
  glow: 'Only a faint diffuse glow low in the sky.',
  bands: 'Several thin parallel bands stacked up the sky.',
} as const;
/** Where the cast stands: x, z, y, tallest, widest. The third is afloat in the lead. */
const SLOTS: readonly (readonly [number, number, number, number, number])[] = [
  [-1.6, 0, 0, 4.2, 2.7], [3.35, -1.6, -0.34, 2.6, 1.55], [-5.6, -6, 0, 3.4, 1.7], [0.95, 3.5, 0, 1.3, 0.8], [7.0, -8.6, 0, 3.4, 1.6],
];
const HERO_FLOE: XZ[] = [[2.6, 13.5], [2.4, 4], [1.7, -1.5], [0.8, -6], [-1, -9.5], [-6, -10.6], [-10.5, -7.5], [-12.6, -1], [-11.5, 7], [-9, 13.5]];
const SIDE_FLOE: XZ[] = [[6.2, 13.5], [5.6, 4], [5.0, -1.5], [4.3, -6.5], [4.8, -11.5], [9, -13.6], [15, -12], [17.5, -4], [16, 6], [13, 13.5]];
const CAMERA: [number, number, number] = [0, 2.6, 12.5];

export default defineWorld({
  questions: {
    aurora: choice('What colour is the aurora?', AURORAS),
    form: choice('If there is an aurora, what shape does it take?', FORMS),
    reach: score('How much of the sky does the aurora fill?', ['A thin trace low over the ridges', 'A good part of the sky', 'The whole sky, ridge to zenith']),
    ice: choice('What state is the pack in?', {
      tight: 'Jammed tight: big floes shouldered together, only narrow black cracks between.',
      open: 'Loose and drifting: wide dark leads of open water between the floes.',
      young: 'Freezing over: the leads skinned with grey new ice and round pancake ice.',
      ridged: 'Under pressure: rubble fields and ridges of upended blocks everywhere.',
    }),
    horizon: choice('What stands on the horizon?', {
      ridges: 'A long jagged line of pressure ridges.',
      bergs: 'Flat-topped icebergs frozen into the pack.',
      mountains: 'A far range of dark peaks with white shoulders.',
      empty: 'Nothing: the ice simply runs out under a dark band of water-sky.',
    }),
    moon: choice('What else is in the sky?', {
      stars: 'Stars only.',
      crescent: 'A thin crescent moon.',
      full: 'A full moon low down, wearing a wide pale halo.',
      planet: 'One very bright planet near the horizon.',
    }),
    marks: choice('What marks the floe the scene stands on?', {
      clean: 'Nothing. Untouched wind-packed snow.',
      sastrugi: 'Sastrugi: long wind-cut ridges of hard snow all running one way.',
      tracks: 'A sledge track running away toward the horizon.',
      flags: 'A line of bamboo marker flags leading off into the distance.',
      seal: 'A seal hauled out beside its breathing hole.',
      pools: 'Turquoise melt pools standing on rotten ice.',
    }),
    air: choice('What is the air doing?', {
      clear: 'Perfectly clear and still.',
      smoke: 'Frost smoke rising off the open leads and lying in a band along the horizon.',
      dust: 'Diamond dust: tiny ice crystals glittering in the air.',
      drift: 'Low snakes of blowing snow streaming across the surface.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const palette = a.aurora === 'none' ? null : PALETTES[a.aurora].map((tone) => new THREE.Color(tone));
    const glow = palette ? palette[1].clone().lerp(palette[3], 0.4) : new THREE.Color('#86a8ee');
    const css = (tone: THREE.Color) => `#${tone.getHexString()}`;
    const table = Array.from({ length: 256 }, () => random());
    const noise = (x: number) => { const i = Math.floor(x), f = x - i, t = f * f * (3 - 2 * f); return table[i & 255] * (1 - t) + table[(i + 1) & 255] * t; };

    // ----- sky: a painted mid-tone dusk, never black -----
    const bright = mix(0.86, 1.12, mood.cheer);
    const top = new THREE.Color('#33468f').multiplyScalar(bright), middle = new THREE.Color('#4f70ba').multiplyScalar(bright);
    const low = new THREE.Color('#86aede').lerp(glow, 0.18), rim = new THREE.Color('#c4e4ea').lerp(new THREE.Color('#f6cfb4'), mood.warmth * 0.75);
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const c = canvas.getContext('2d')!;
    const HORIZON = 0.853;
    const sky = c.createLinearGradient(0, 0, 0, 512);
    sky.addColorStop(0.05, css(top)); sky.addColorStop(0.45, css(middle)); sky.addColorStop(0.74, css(low)); sky.addColorStop(HORIZON - 0.01, css(rim)); sky.addColorStop(1, css(rim));
    c.fillStyle = sky; c.fillRect(0, 0, 1024, 512);
    if (a.horizon === 'empty') { const band = c.createLinearGradient(0, 512 * (HORIZON - 0.07), 0, 512 * HORIZON); band.addColorStop(0, 'rgba(40,52,96,0)'); band.addColorStop(0.7, 'rgba(40,52,96,0.38)'); band.addColorStop(1, 'rgba(40,52,96,0.15)'); c.fillStyle = band; c.fillRect(0, 512 * (HORIZON - 0.07), 1024, 512 * 0.07); }
    const stars = Math.round(mix(160, 620, mood.density) * (a.moon === 'full' ? 0.5 : 1));
    for (let i = 0; i < stars; i++) {
      const y = random() ** 1.3 * 0.76, size = random() < 0.06 ? 2.4 : random() < 0.3 ? 1.6 : 1;
      c.fillStyle = `rgba(${235 + random() * 20},${240 + random() * 15},255,${(0.35 + random() * 0.65) * (1 - y * 0.6)})`;
      c.fillRect(random() * 1024, y * 512, size, size);
    }
    const moonX = 1024 * (0.5 + (mood.daylight - 0.5) * 0.36 + 0.07), moonY = 512 * (a.moon === 'crescent' ? 0.34 : 0.6);
    if (a.moon === 'full') {
      for (const [r, alpha] of [[150, 0.05], [40, 0.25]] as const) { const halo = c.createRadialGradient(moonX, moonY, 0, moonX, moonY, r); halo.addColorStop(0, `rgba(240,246,255,${alpha * 2})`); halo.addColorStop(1, 'rgba(240,246,255,0)'); c.fillStyle = halo; c.fillRect(moonX - r, moonY - r, r * 2, r * 2); }
      c.strokeStyle = 'rgba(236,244,255,0.35)'; c.lineWidth = 3; c.beginPath(); c.ellipse(moonX, moonY, 66, 92, 0, 0, 7); c.stroke();
      c.fillStyle = '#f6f8ff'; c.beginPath(); c.ellipse(moonX, moonY, 11, 15.5, 0, 0, 7); c.fill();
    } else if (a.moon === 'crescent') {
      c.fillStyle = '#f4f7ff'; c.beginPath(); c.ellipse(moonX, moonY, 9, 12.5, 0, 0, 7); c.fill();
      c.fillStyle = css(top.clone().lerp(middle, 0.6)); c.beginPath(); c.ellipse(moonX + 5, moonY - 2, 8.5, 12, 0, 0, 7); c.fill();
    } else if (a.moon === 'planet') {
      const px = 1024 * (0.5 - (mood.daylight - 0.5) * 0.3 - 0.08), py = 512 * 0.7;
      const flare = c.createRadialGradient(px, py, 0, px, py, 16); flare.addColorStop(0, 'rgba(255,250,230,1)'); flare.addColorStop(0.25, 'rgba(255,246,220,0.5)'); flare.addColorStop(1, 'rgba(255,246,220,0)'); c.fillStyle = flare; c.fillRect(px - 16, py - 22, 32, 44);
    }
    const horizonGlow = c.createRadialGradient(512, 512 * HORIZON, 0, 512, 512 * HORIZON, 330);
    horizonGlow.addColorStop(0, `rgba(${Math.round(glow.r * 255)},${Math.round(glow.g * 255)},${Math.round(glow.b * 255)},${palette ? 0.3 : 0.12})`); horizonGlow.addColorStop(1, 'rgba(0,0,0,0)');
    c.save(); c.translate(0, 512 * HORIZON); c.scale(1, 0.45); c.translate(0, -512 * HORIZON); c.fillStyle = horizonGlow; c.fillRect(0, 0, 1024, 1024); c.restore();
    const skyMap = new THREE.CanvasTexture(canvas);
    skyMap.colorSpace = THREE.SRGBColorSpace;
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(280, 120), new THREE.MeshBasicMaterial({ map: skyMap, fog: false }));
    backdrop.position.set(0, 45, -165);
    root.add(backdrop);

    // ----- aurora: translucent ribbons of light with vertical rays -----
    const ribbons: { position: THREE.BufferAttribute; base: Float32Array; phase: number; speed: number; sway: number }[] = [];
    const light = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false });
    const agitation = mix(0.4, 1.5, mood.energy);
    const ribbon = (path: (u: number) => [number, number], hem: (u: number) => number, height: (u: number) => number, strength: number, sway: number, order: number) => {
      if (!palette) return;
      const COLUMNS = 130, ROWS = 8, seed = random() * 100;
      const positions = new Float32Array((COLUMNS + 1) * (ROWS + 1) * 3), colours = new Float32Array((COLUMNS + 1) * (ROWS + 1) * 4);
      const tint = new THREE.Color();
      for (let column = 0; column <= COLUMNS; column++) {
        const u = column / COLUMNS, [x, z] = path(u);
        const ray = 0.3 + 0.7 * noise(u * 90 + seed) ** 1.4, edge = Math.min(1, Math.min(u, 1 - u) * 6), tall = height(u) * (0.55 + 0.45 * noise(u * 9 + seed * 2)), foot = hem(u) + Math.sin(u * 33 + seed) * 0.9 + noise(u * 14 + seed * 3) * 2.2;
        for (let row = 0; row <= ROWS; row++) {
          const v = row / ROWS, at = column * (ROWS + 1) + row;
          positions.set([x, foot + tall * v ** 1.2, z], at * 3);
          if (v < 0.12) tint.copy(palette[0]).lerp(palette[1], v / 0.12);
          else if (v < 0.5) tint.copy(palette[1]).lerp(palette[2], (v - 0.12) / 0.38);
          else tint.copy(palette[2]).lerp(palette[3], (v - 0.5) / 0.5);
          const alpha = Math.min(1, v * 12) * (1 - v) ** 1.1 * 1.45 * ray * edge * strength;
          colours.set([tint.r, tint.g, tint.b, row === ROWS ? 0 : Math.min(0.95, alpha)], at * 4);
        }
      }
      const index: number[] = [];
      for (let column = 0; column < COLUMNS; column++) for (let row = 0; row < ROWS; row++) { const p = column * (ROWS + 1) + row, q = p + ROWS + 1; index.push(p, q, p + 1, q, q + 1, p + 1); }
      const geometry = new THREE.BufferGeometry();
      const position = new THREE.BufferAttribute(positions, 3);
      geometry.setAttribute('position', position);
      geometry.setAttribute('color', new THREE.BufferAttribute(colours, 4));
      geometry.setIndex(index);
      const mesh = new THREE.Mesh(geometry, light);
      mesh.renderOrder = 2 + order;
      mesh.frustumCulled = false;
      root.add(mesh);
      ribbons.push({ position, base: positions.slice(), phase: random() * 6, speed: 0.4 + random() * 0.5, sway });
    };
    const fill = a.reach, power = mix(0.7, 1, mood.cheer);
    if (a.form === 'curtains') {
      const count = 2 + Math.round(fill * 2);
      for (let k = 0; k < count; k++) {
        const phase = random() * 6, depth = -78 - k * 13, folds = mix(3, 7, random()) * agitation;
        ribbon((u) => [(u - 0.5) * 170, depth + Math.sin(u * 10 + phase) * folds + Math.sin(u * 27 + phase * 2) * folds * 0.3], (u) => 9 + k * 7 + fill * 5 + Math.sin(u * 6 + phase) * 2.5, () => mix(15, 30, fill) * (1 - k * 0.1), power * (1 - k * 0.12), 4 * agitation, k);
      }
    } else if (a.form === 'arc') {
      const count = 1 + Math.round(fill * 1.6);
      for (let k = 0; k < count; k++) ribbon((u) => [(u - 0.5) * 180, -92 - k * 6], (u) => 15 + k * 11 + fill * 9 - ((u - 0.5) * 2) ** 2 * (13 + k * 4), () => 8 + fill * 7 - k * 1.5, power * (1 - k * 0.25), 1.2 * agitation, k);
    } else if (a.form === 'glow') {
      ribbon((u) => [(u - 0.5) * 200, -100], () => 5, () => 22 + fill * 26, power * 0.42, 0.6, 0);
      ribbon((u) => [(u - 0.5) * 200, -110], () => 9, () => 14 + fill * 16, power * 0.3, 0.6, 1);
    } else if (a.form === 'bands') {
      const count = 3 + Math.round(fill * 3);
      for (let k = 0; k < count; k++) { const phase = random() * 6; ribbon((u) => [(u - 0.5) * 180, -84 - k * 7 + Math.sin(u * 5 + phase) * 2], (u) => 8.5 + k * mix(5, 7.5, fill) + Math.sin(u * 4 + phase) * 1.6 - ((u - 0.5) * 2) ** 2 * 3, () => 5.5, power * (1 - k * 0.08), 1.5 * agitation, k); }
    } else if (palette) {
      // Corona: rays streaming from a point near the zenith of the frame.
      const centre = new THREE.Vector3((random() - 0.5) * 14, mix(34, 46, fill), -86);
      const rays = Math.round(mix(26, 64, fill));
      const positions: number[] = [], colours: number[] = [], index: number[] = [];
      const tint = new THREE.Color(), STEPS = 6;
      for (let i = 0; i < rays; i++) {
        const spread = mix(1.0, 1.9, fill), angle = -Math.PI / 2 + (i / (rays - 1) - 0.5) * 2 * spread + (random() - 0.5) * 0.06;
        const reach = mix(16, 46, random() ** 0.7) * mix(0.7, 1.15, fill), half = mix(0.012, 0.04, random()), shine = (0.45 + random() * 0.55) * power, start = positions.length / 3;
        for (let step = 0; step <= STEPS; step++) {
          const v = step / STEPS, r = 2.5 + reach * v;
          for (const side of [-1, 1]) { positions.push(centre.x + Math.cos(angle + side * half) * r * 1.25, centre.y + Math.sin(angle + side * half) * r, centre.z); tint.copy(palette[3]).lerp(palette[1], Math.min(1, v * 1.6)).lerp(palette[0], Math.max(0, v - 0.75) * 2); colours.push(tint.r, tint.g, tint.b, Math.min(1, v * 5) * (1 - v) ** 0.8 * shine); }
          if (step < STEPS) { const p = start + step * 2; index.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 4));
      geometry.setIndex(index);
      const mesh = new THREE.Mesh(geometry, light);
      mesh.renderOrder = 2; mesh.frustumCulled = false;
      root.add(mesh);
      ribbon((u) => [(u - 0.5) * 190, -104], () => 6, () => 12 + fill * 10, power * 0.35, 0.8, 1);
    }

    // ----- sea and ice -----
    const young = a.ice === 'young';
    const waterTone = young ? new THREE.Color('#4a6384') : new THREE.Color('#102540');
    const water = new THREE.Mesh(new THREE.PlaneGeometry(420, 340).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: waterTone, roughness: young ? 0.55 : 0.12, metalness: young ? 0.05 : 0.35, emissive: glow, emissiveIntensity: young ? 0.05 : 0.07 }));
    water.position.set(0, -0.38, -70);
    water.receiveShadow = true;
    root.add(water);

    const snowTone = new THREE.Color('#b6cdea').lerp(new THREE.Color('#a3b1bd'), mood.wear * 0.4).lerp(new THREE.Color('#f1e4dc'), mood.warmth * 0.25);
    const sideTone = new THREE.Color('#5c98cc');
    const slab = (outline: XZ[], thick: number, tone: THREE.Color) => {
      const shape = new THREE.Shape();
      outline.forEach(([x, z], i) => (i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)));
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, -thick, 0);
      const normal = geometry.getAttribute('normal'), colours = new Float32Array(normal.count * 3);
      for (let i = 0; i < normal.count; i++) { const face = normal.getY(i) > 0.5 ? tone : sideTone; colours.set([face.r, face.g, face.b], i * 3); }
      geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      return geometry;
    };
    const rough = (outline: XZ[], by: number): XZ[] => outline.map(([x, z]) => [x + (random() - 0.5) * by, z + (random() - 0.5) * by]);
    const iceMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true, emissive: glow, emissiveIntensity: mix(0.04, 0.1, mood.cheer) });
    const hero = new THREE.Mesh(slab(rough(HERO_FLOE, 0.5), 0.55, snowTone), iceMaterial);
    hero.receiveShadow = true;
    root.add(hero);

    const gap = { tight: 0.35, open: 2.2, young: 1.3, ridged: 0.5 }[a.ice];
    const circles: [number, number, number][] = [];
    const blocked = (x: number, z: number, r: number) => {
      for (const [x0, x1, z0, z1] of [[-13.6, 3.2, -12.2, 14], [2.2, 18.6, -14.8, 14]]) { const dx = Math.max(x0 - x, 0, x - x1), dz = Math.max(z0 - z, 0, z - z1); if (Math.hypot(dx, dz) < r + gap * 0.5 + 0.5) return true; }
      return circles.some(([cx, cz, cr]) => Math.hypot(cx - x, cz - z) < cr + r + gap);
    };
    const pieces: THREE.BufferGeometry[] = [slab(rough(SIDE_FLOE, 0.6), 0.55, snowTone.clone().multiplyScalar(0.97))];
    for (const [tries, rMin, rMax] of [[70, 7, 13], [200, 3.5, 7], [520, 1.6, 3.5], [900, 0.6, 1.6]] as const) for (let i = 0; i < tries; i++) {
      const r = mix(rMin, rMax, random()), x = (random() - 0.5) * 150, z = mix(-92, 12, random());
      if (blocked(x, z, r)) continue;
      circles.push([x, z, r]);
      const corners = 6 + Math.floor(random() * 5), spin = random() * 6.283;
      pieces.push(slab(Array.from({ length: corners }, (_unused, k) => { const angle = spin + k / corners * 6.283, reach = r * mix(0.82, 1.04, random()); return [x + Math.cos(angle) * reach, z + Math.sin(angle) * reach] as XZ; }), 0.5, snowTone.clone().multiplyScalar(mix(0.9, 1.02, random()))));
    }
    // Beyond the middle distance the pack closes into one sheet.
    pieces.push(slab([[-210, -66], [210, -66], [210, -160], [-210, -160]], 0.5, snowTone.clone().multiplyScalar(0.96)));
    const pack = new THREE.Mesh(mergeGeometries(pieces), iceMaterial);
    for (const piece of pieces) piece.dispose();
    pack.receiveShadow = true;
    root.add(pack);

    // Blocks: rubble, ridges, the horizon line. One draw call.
    const blocks: THREE.Matrix4[] = [], tints: THREE.Color[] = [];
    const block = (x: number, y: number, z: number, sx: number, sy: number, sz: number, tilt = 1) => {
      blocks.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler((random() - 0.5) * 1.2 * tilt, random() * 6.283, (random() - 0.5) * 1.2 * tilt)), new THREE.Vector3(sx, sy, sz)));
      tints.push(new THREE.Color('#cbdff3').lerp(new THREE.Color('#5c9fd2'), random() ** 1.5 * 0.85));
    };
    const ridge = (from: XZ, to: XZ, height: number, count: number, width: number) => {
      for (let i = 0; i < count; i++) {
        const t = random(), swell = 0.35 + 0.65 * noise(t * 9 + from[0]);
        const x = mix(from[0], to[0], t) + (random() - 0.5) * width, z = mix(from[1], to[1], t) + (random() - 0.5) * width, size = height * swell * mix(0.5, 1.1, random());
        block(x, size * 0.3 * random(), z, size * mix(0.8, 1.7, random()), size * mix(0.3, 0.7, random()), size * mix(0.7, 1.3, random()));
      }
    };
    const pressure = a.ice === 'ridged' ? 1 : a.ice === 'tight' ? 0.5 : 0.25;
    ridge([-11, -9], [-1.5, -9.8], mix(0.5, 1.4, pressure), Math.round(mix(14, 60, pressure)), 0.9);
    ridge([-12.4, 6], [-12.2, -4], mix(0.4, 1.0, pressure), Math.round(mix(6, 30, pressure)), 0.7);
    ridge([-60, -30], [60, -36], mix(1.0, 3.2, pressure), Math.round(mix(40, 150, pressure)), 5);
    if (a.ice === 'ridged') { ridge([5.4, 8], [4.6, -10], 0.9, 46, 0.6); ridge([-40, -16], [-14, -20], 2.0, 60, 3); ridge([18, -18], [50, -14], 2.2, 60, 3); for (const [cx, cz, cr] of circles.slice(0, 40)) if (cz > -60 && random() < 0.6) ridge([cx - cr * 0.8, cz], [cx + cr * 0.8, cz + (random() - 0.5) * cr], mix(0.6, 1.8, random()), 14, 1.2); }
    if (a.horizon === 'ridges') { ridge([-190, -104], [190, -110], 9, 230, 9); ridge([-190, -128], [190, -134], 15, 170, 8); }
    else ridge([-190, -112], [190, -118], 4.5, 150, 8);
    const ice = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5, flatShading: true, emissive: glow, emissiveIntensity: 0.08 }), blocks.length);
    blocks.forEach((matrix, i) => { ice.setMatrixAt(i, matrix); ice.setColorAt(i, tints[i]); });
    ice.castShadow = ice.receiveShadow = true;
    root.add(ice);

    const solid = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, shadow = true) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = shadow; mesh.receiveShadow = true;
      root.add(mesh);
      return mesh;
    };
    if (a.horizon === 'bergs') {
      const berg = new THREE.MeshStandardMaterial({ color: '#b9d0ea', roughness: 0.7, flatShading: true, emissive: glow, emissiveIntensity: 0.06 });
      const count = 3 + Math.round(mood.density * 3);
      for (let i = 0; i < count; i++) {
        const x = (i / (count - 1) - 0.5) * 230 + (random() - 0.5) * 20, wide = mix(16, 44, random()), tall = mix(9, 21, random());
        const outline = Array.from({ length: 9 }, (_unused, k) => { const angle = k / 9 * 6.283; return [Math.cos(angle) * wide * mix(0.8, 1.05, random()), Math.sin(angle) * wide * 0.5 * mix(0.8, 1.05, random())] as XZ; });
        const shape = new THREE.Shape();
        outline.forEach(([px, pz], k) => (k ? shape.lineTo(px, -pz) : shape.moveTo(px, -pz)));
        solid(new THREE.ExtrudeGeometry(shape, { depth: tall, bevelEnabled: true, bevelSize: 1.4, bevelThickness: 1.2, bevelSegments: 1 }).rotateX(-Math.PI / 2), berg, x, -1, mix(-112, -138, random()), false);
      }
    } else if (a.horizon === 'mountains') {
      const rock = new THREE.MeshStandardMaterial({ color: new THREE.Color('#3c4a80').lerp(low, 0.25), roughness: 1, flatShading: true });
      const cap = new THREE.MeshStandardMaterial({ color: '#dfeaf8', roughness: 0.8, flatShading: true, emissive: glow, emissiveIntensity: 0.1 });
      for (let i = 0; i < 15; i++) {
        const x = (i / 14 - 0.5) * 300 + (random() - 0.5) * 12, tall = mix(14, 38, noise(i * 0.9 + 3)) * mix(0.8, 1.15, random()), wide = tall * mix(0.9, 1.5, random()), z = mix(-146, -156, random()), spin = random() * 3;
        solid(new THREE.ConeGeometry(wide, tall, 5), rock, x, tall / 2 - 1, z, false).rotation.y = spin;
        solid(new THREE.ConeGeometry(wide * 0.47, tall * 0.45, 5), cap, x, tall * 0.775 - 0.9, z, false).rotation.y = spin;
      }
    }

    // New ice: pancakes with raised rims crowding the lead.
    if (young) {
      const cakes: THREE.Matrix4[] = [];
      for (let i = 0; i < 150; i++) {
        const z = mix(-13, 12, random()), t = (z + 13) / 25, x = mix(1.2, 3.0, t) + random() * mix(3.4, 2.8, t), r = mix(0.22, 0.75, random() ** 1.5);
        cakes.push(new THREE.Matrix4().compose(new THREE.Vector3(x, -0.36, z), new THREE.Quaternion(), new THREE.Vector3(r, 1, r * mix(0.8, 1, random()))));
      }
      const pancake = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 0.92, 0.07, 9), new THREE.MeshStandardMaterial({ color: '#c3d6e8', roughness: 0.8, flatShading: true, emissive: glow, emissiveIntensity: 0.08 }), cakes.length);
      cakes.forEach((matrix, i) => pancake.setMatrixAt(i, matrix));
      pancake.receiveShadow = true;
      root.add(pancake);
    }

    // ----- what marks the hero floe -----
    const snow = new THREE.MeshStandardMaterial({ color: snowTone.clone().lerp(new THREE.Color('#ffffff'), 0.3), roughness: 1, emissive: glow, emissiveIntensity: 0.08 });
    const drifts: THREE.Matrix4[] = [];
    const driftCount = a.marks === 'sastrugi' ? 70 : Math.round(mix(6, 18, mood.density));
    for (let i = 0; i < driftCount; i++) {
      const x = mix(-11, 1.2, random()), z = mix(-8.5, 9, random());
      if (SLOTS.some(([sx, sz, , , sr]) => Math.hypot(sx - x, sz - z) < sr * 0.8)) continue;
      const long = a.marks === 'sastrugi' ? mix(0.8, 2.4, random()) : mix(0.5, 1.2, random());
      drifts.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.55 + (random() - 0.5) * 0.15, 0)), new THREE.Vector3(long, a.marks === 'sastrugi' ? mix(0.08, 0.2, random()) : 0.06, long * 0.22)));
    }
    if (drifts.length) {
      const mounds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), snow, drifts.length);
      drifts.forEach((matrix, i) => mounds.setMatrixAt(i, matrix));
      mounds.castShadow = mounds.receiveShadow = true;
      root.add(mounds);
    }
    const flagCloth: THREE.Mesh[] = [];
    if (a.marks === 'tracks' || a.marks === 'flags') {
      const trail = (t: number): XZ => [mix(-3.9, -8.6, t) + Math.sin(t * 5) * 0.4, mix(1.6, -9.6, t)];
      if (a.marks === 'tracks') {
        const rut = new THREE.MeshStandardMaterial({ color: snowTone.clone().multiplyScalar(0.72), roughness: 1 });
        for (let i = 0; i < 44; i++) {
          const [x0, z0] = trail(i / 44), [x1, z1] = trail((i + 1) / 44), bearing = Math.atan2(x1 - x0, z1 - z0), run = Math.hypot(x1 - x0, z1 - z0) + 0.03;
          for (const side of [-0.28, 0.28]) solid(new THREE.BoxGeometry(0.09, 0.012, run), rut, (x0 + x1) / 2 + Math.cos(bearing) * side, 0.006, (z0 + z1) / 2 - Math.sin(bearing) * side, false).rotation.y = bearing;
        }
      } else {
        const cane = new THREE.MeshStandardMaterial({ color: '#c9a85e', roughness: 0.8 });
        const cloth = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.45 ? '#f0641e' : '#1b1d22', emissive: mood.cheer > 0.45 ? '#f0641e' : '#000000', emissiveIntensity: 0.3, side: THREE.DoubleSide, roughness: 0.9 });
        for (let i = 0; i < 6; i++) {
          const t = i / 5, [x, z] = [mix(-4.2, -9.4, t), mix(2.2, -9.4, t)];
          solid(new THREE.CylinderGeometry(0.02, 0.025, 2.3, 6), cane, x, 1.15, z).rotation.z = (random() - 0.5) * 0.14;
          flagCloth.push(solid(new THREE.PlaneGeometry(0.46, 0.3).translate(0.23, 0, 0), cloth, x, 2.1, z));
        }
      }
    } else if (a.marks === 'seal') {
      const hide = new THREE.MeshStandardMaterial({ color: '#59616d', roughness: 0.5 });
      const sx = -6.6, sz = 2.2;
      solid(new THREE.CylinderGeometry(0.42, 0.42, 0.02, 16), new THREE.MeshStandardMaterial({ color: '#0d2031', roughness: 0.1 }), sx - 1.0, 0.012, sz + 0.5, false);
      solid(new THREE.TorusGeometry(0.46, 0.07, 6, 18).rotateX(Math.PI / 2), snow, sx - 1.0, 0.01, sz + 0.5, false);
      const bodyMesh = solid(new THREE.SphereGeometry(1, 16, 10), hide, sx, 0.26, sz);
      bodyMesh.scale.set(0.34, 0.27, 0.86); bodyMesh.rotation.y = 0.9;
      solid(new THREE.SphereGeometry(0.19, 12, 8), hide, sx - 0.68, 0.34, sz - 0.5);
      const flipper = solid(new THREE.SphereGeometry(1, 8, 6), hide, sx + 0.75, 0.1, sz + 0.62);
      flipper.scale.set(0.12, 0.04, 0.3); flipper.rotation.y = 0.6;
    } else if (a.marks === 'pools') {
      const pool = new THREE.MeshStandardMaterial({ color: '#46bdd6', roughness: 0.08, emissive: '#2aa6c4', emissiveIntensity: 0.45 });
      for (let i = 0; i < 9; i++) {
        const x = mix(-10.5, 0.8, random()), z = mix(-8, 8.5, random());
        if (SLOTS.some(([sx, sz, , , sr]) => Math.hypot(sx - x, sz - z) < sr + 0.9)) continue;
        const puddle = solid(new THREE.CircleGeometry(mix(0.6, 1.5, random()), 14).rotateX(-Math.PI / 2), pool, x, 0.008, z, false);
        puddle.scale.set(1, 1, mix(0.5, 0.9, random())); puddle.rotation.y = random() * 3;
      }
    }

    // ----- air -----
    const haze = new THREE.Mesh(new THREE.PlaneGeometry(420, 22), new THREE.MeshBasicMaterial({ color: rim, transparent: true, opacity: a.air === 'smoke' ? 0.55 : 0.2, depthWrite: false, fog: false }));
    haze.position.set(0, 7, -100);
    haze.renderOrder = 1;
    root.add(haze);
    const hazeFade = haze.geometry.getAttribute('position');
    const hazeAlpha = new Float32Array(hazeFade.count * 4);
    for (let i = 0; i < hazeFade.count; i++) hazeAlpha.set([1, 1, 1, hazeFade.getY(i) > 0 ? 0 : 1], i * 4);
    haze.geometry.setAttribute('color', new THREE.BufferAttribute(hazeAlpha, 4));
    (haze.material as THREE.MeshBasicMaterial).vertexColors = true;
    const plumes: THREE.Mesh[] = [], streaks: THREE.Mesh[] = [];
    let sparkle: THREE.InstancedMesh | null = null;
    if (a.air === 'smoke') {
      const vapour = new THREE.MeshBasicMaterial({ color: '#e6f0f8', transparent: true, opacity: 0.14, depthWrite: false });
      for (let i = 0; i < 26; i++) {
        const near = i < 9, x = near ? mix(2.2, 5.6, random()) : (random() - 0.5) * 110, z = near ? mix(-12, 3, random()) : mix(-70, -18, random());
        const plume = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), vapour);
        plume.position.set(x, near ? 0.5 : 1.2, z); plume.scale.set(near ? mix(0.8, 1.6, random()) : mix(3, 9, random()), near ? mix(0.6, 1.5, random()) : mix(1.5, 4, random()), near ? 1 : 3);
        plume.userData.phase = random() * 6; plume.userData.y = plume.position.y; plume.userData.sy = plume.scale.y;
        root.add(plume); plumes.push(plume);
      }
    } else if (a.air === 'dust') {
      const count = Math.round(mix(160, 420, mood.density));
      sparkle = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), count);
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < count; i++) { const size = mix(0.006, 0.016, random()); sparkle.setMatrixAt(i, matrix.makeScale(size, size * 1.6, size).setPosition((random() - 0.5) * 16, random() ** 0.8 * 8, mix(-10, 6, random()))); }
      root.add(sparkle);
    } else if (a.air === 'drift') {
      const blow = new THREE.MeshBasicMaterial({ color: '#f4f9fd', transparent: true, opacity: 0.4, depthWrite: false });
      for (let i = 0; i < Math.round(mix(26, 60, mood.energy)); i++) {
        const streak = new THREE.Mesh(new THREE.PlaneGeometry(mix(2, 6, random()), mix(0.08, 0.3, random())).rotateX(-Math.PI / 2), blow);
        streak.position.set((random() - 0.5) * 30, 0.03 + random() * 0.16, mix(-12, 9, random()));
        streak.userData.speed = mix(0.6, 1.6, random());
        root.add(streak); streaks.push(streak);
      }
    }

    // ----- light -----
    root.add(new THREE.HemisphereLight(new THREE.Color('#a9c2ff').lerp(glow, 0.2), '#4a6388', mix(0.85, 1.1, mood.cheer)));
    const key = new THREE.DirectionalLight(new THREE.Color('#dde8ff').lerp(new THREE.Color('#ffe4c8'), mood.warmth * 0.6).lerp(glow, 0.12), 1.7);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.04; key.shadow.bias = -0.0004;
    key.position.set(mix(-16, 16, mood.daylight), 17, 15);
    key.target.position.set(0, 0, -3);
    const shadow = key.shadow.camera;
    shadow.left = shadow.bottom = -17; shadow.right = shadow.top = 17; shadow.near = 1; shadow.far = 70;
    root.add(key, key.target);
    const back = new THREE.DirectionalLight(glow, palette ? 1.3 : 0.5);
    back.position.set(-6, 14, -30);
    root.add(back);

    const camera = new THREE.PerspectiveCamera(44, 1, 0.5, 400);
    camera.position.set(...CAMERA);
    camera.lookAt(-0.5, 3.75, 0);

    const world: World = {
      object: root, camera, background: middle.clone(), capacity: SLOTS.length, ground: hero, keyLight: key,
      place(items: readonly Placeable[]) {
        items.forEach((item, index) => {
          const [x, z, y, tallest, widest] = SLOTS[index % SLOTS.length];
          const scale = Math.min(tallest / Math.max(item.height, 0.05), widest / Math.max(item.radius, 0.05));
          item.holder.scale.setScalar(scale);
          item.holder.position.set(x, y, z);
          item.holder.rotation.y = Math.atan2(CAMERA[0] - x, CAMERA[2] - z) * 0.7 + (index === 0 ? 0.3 : -0.25) + (random() - 0.5) * 0.3;
          item.holder.updateMatrixWorld(true);
        });
        camera.updateMatrixWorld(true);
        shadow.updateProjectionMatrix();
      },
      update(_dt, time) {
        for (const item of ribbons) {
          const { position, base } = item;
          for (let i = 0; i < position.count; i++) {
            const x = base[i * 3], lift = (base[i * 3 + 1] - 5) / 30;
            position.setZ(i, base[i * 3 + 2] + Math.sin(x * 0.07 + time * item.speed * agitation + item.phase) * item.sway * (0.4 + lift));
            position.setX(i, x + Math.sin(x * 0.045 + time * item.speed * 0.6 + item.phase * 2) * item.sway * 0.5 * lift);
          }
          position.needsUpdate = true;
        }
        for (const plume of plumes) { const t = (time * 0.12 + plume.userData.phase) % 1; plume.position.y = plume.userData.y + t * 1.6; plume.scale.y = plume.userData.sy * (1 + t * 0.8); }
        for (const streak of streaks) { streak.position.x += streak.userData.speed * mix(0.01, 0.08, mood.energy); if (streak.position.x > 16) streak.position.x = -16; }
        if (sparkle) sparkle.rotation.y = Math.sin(time * 0.2) * 0.05;
        for (const [i, flag] of flagCloth.entries()) flag.rotation.y = Math.sin(time * mix(1, 5, mood.energy) + i) * 0.3 - 0.4;
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
    return world;
  },
});
