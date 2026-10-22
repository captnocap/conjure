import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { type Placeable, type World, choice, defineWorld, disposeTree, mix } from '@conjure/kit';

const SKIES = {
  dawn: { zen: '#789fd4', mid: '#cdc3e0', hor: '#fde2c2', glow: '#ffcf8a', key: '#ffe3c0', elevation: 12, stars: 0 },
  dusk: { zen: '#584b98', mid: '#ad7abb', hor: '#f8b288', glow: '#ff9858', key: '#ffc9a2', elevation: 9, stars: 0 },
  blue: { zen: '#4d60a0', mid: '#838bc2', hor: '#e6b6c8', glow: '#f4c9d2', key: '#d2d6ff', elevation: 20, stars: 1 },
  noon: { zen: '#5f9be0', mid: '#a9cbf0', hor: '#eff5f9', glow: '#ffffff', key: '#fff8ea', elevation: 56, stars: 0 },
  storm: { zen: '#687080', mid: '#8a909e', hor: '#f1dda4', glow: '#ffe89c', key: '#f4e4c0', elevation: 14, stars: 0 },
  pink: { zen: '#b08fd0', mid: '#ee9fbd', hor: '#ffd6bd', glow: '#ffe7b4', key: '#ffd4c6', elevation: 10, stars: 0 },
} as const;

const GROUND_Y = -0.012;
const SPAN = 192;
const MASK = 256;

const groundShader = {
  name: 'SaltMirror',
  uniforms: {
    color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
    tMask: { value: null }, crust: { value: new THREE.Color() }, ridge: { value: new THREE.Color() }, tint: { value: new THREE.Color() }, stainColor: { value: new THREE.Color() },
    origin: { value: new THREE.Vector2() }, span: { value: SPAN }, ripple: { value: 0 }, time: { value: 0 }, cell: { value: 1 }, stain: { value: 0 },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec3 vWorld;
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorld = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    uniform sampler2D tMask;
    uniform vec3 crust;
    uniform vec3 ridge;
    uniform vec3 tint;
    uniform vec3 stainColor;
    uniform vec2 origin;
    uniform float span;
    uniform float ripple;
    uniform float time;
    uniform float cell;
    uniform float stain;
    varying vec4 vUv;
    varying vec3 vWorld;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    float hexDist(vec2 p) { p = abs(p); return max(dot(p, vec2(0.5, 0.8660254)), p.x); }
    void main() {
      vec2 p = vWorld.xz;
      float dist = distance(cameraPosition, vWorld);
      // Polygons, warped so no two are alike.
      vec2 q = (p + (vec2(vnoise(p * 0.4), vnoise(p * 0.4 + 17.3)) - 0.5) * 1.1 * cell) / cell;
      vec2 r = vec2(1.0, 1.7320508), h = r * 0.5;
      vec2 a = mod(q, r) - h, b = mod(q - h, r) - h;
      vec2 gv = dot(a, a) < dot(b, b) ? a : b;
      vec2 id = q - gv;
      float edge = 0.5 - hexDist(gv);
      float soft = max(fwidth(edge) * 1.5, 0.012);
      float fade = 1.0 - smoothstep(28.0, 120.0, dist);
      float line = (1.0 - smoothstep(0.016, 0.016 + soft, edge)) * fade;
      float band = (1.0 - smoothstep(0.03, 0.17, edge)) * fade;
      float tone = hash(floor(id * 3.0 + 0.5));
      // Where the water lies.
      vec2 muv = vec2((p.x - origin.x) / span + 0.5, (origin.y - p.y) / span);
      float m = texture2D(tMask, muv).r;
      float wet = smoothstep(0.4, 0.6, m + (tone - 0.5) * 0.3 * fade);
      // The mirror.
      vec4 coord = vUv;
      float rip = ripple / (1.0 + dist * 0.03);
      coord.xy += (vec2(vnoise(p * 2.3 + time), vnoise(p * 2.3 + 31.0 - time)) - 0.5) * rip * coord.w;
      vec3 refl = texture2DProj(tDiffuse, coord).rgb;
      refl = mix(refl, tint, 0.08);
      // Looking steeply down, the bed shows through the film; at a glancing angle it is all sky.
      float glance = pow(1.0 - clamp(normalize(cameraPosition - vWorld).y, 0.0, 1.0), 4.0);
      vec3 bed = crust * (0.56 + 0.06 * tone) * (1.0 - band * 0.12);
      bed = mix(bed, ridge * 0.8, line * 0.7);
      refl = mix(bed, refl, mix(0.5, 1.0, glance));
      // The crust.
      vec3 dry = crust * mix(0.95, 0.9 + 0.1 * tone, fade);
      dry = mix(dry, stainColor, stain * smoothstep(0.35, 0.8, vnoise(p * 0.13)) * 0.55);
      dry *= 1.0 - band * 0.16;
      dry = mix(dry, ridge, line);
      // Damp rim between the two.
      float rim = wet * (1.0 - wet) * 4.0;
      vec3 col = mix(dry, refl, wet);
      col = mix(col, col * 0.86, rim * 0.6);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

export default defineWorld({
  questions: {
    sky: choice('What hour and sky is it?', {
      dawn: 'Dawn: powder blue overhead paling to peach and gold at the rim.',
      dusk: 'Violet dusk: purple above, a band of orange where the sun went.',
      blue: 'Blue hour: cool lilac half-light, the first stars, pink only at the very edge.',
      noon: 'High noon: blinding white-blue, no shadows to speak of, snow-blind glare.',
      storm: 'Storm light: a slate lid of cloud with one bright yellow gap along the horizon.',
      pink: 'A flamingo-pink and lilac sky, soft as sherbet all the way round.',
    }),
    water: choice('How wet is the flat?', {
      mirror: 'Flooded edge to edge: a perfect unbroken mirror, sky above and below.',
      patchy: 'Dry polygons of crust underfoot giving way to mirror a few steps out.',
      dry: 'Dry season: white hexagonal crust to the horizon, only a few distant sheets of glare.',
      rippled: 'Flooded but wind-ruffled, the reflection smeared and trembling.',
    }),
    horizon: choice('What is on the far horizon?', {
      range: 'A low range of volcanic cones, hazed violet, doubled in the water.',
      cone: 'One great solitary volcano with mineral-streaked flanks and a dusting of snow.',
      island: 'A rocky island bristling with giant cactus, floating like a ship.',
      nothing: 'Nothing whatsoever: the horizon is gone and the world is one colour.',
    }),
    clouds: choice('What clouds are there?', {
      clear: 'None: a clean empty dome.',
      cirrus: 'High brushed streaks of cirrus catching the light.',
      cumulus: 'A flotilla of small flat-bottomed cumulus low on the horizon, each one doubled.',
      lid: 'A heavy grey lid over most of the sky.',
    }),
    orb: choice('Where is the light coming from?', {
      side: 'From out of frame to one side: long raking light, everything modelled.',
      sun: 'The sun itself sits on the horizon in view: things are back-lit silhouettes.',
      moon: 'A pale moon hangs in view; the sun is gone or not yet up.',
    }),
    traces: choice('What marks the foreground?', {
      none: 'Nothing: untouched.',
      tracks: 'Two tyre tracks running out toward the horizon and converging.',
      footprints: 'A single line of footprints walking away, then stopping.',
      stakes: 'A line of route-marker stakes with rags of tape, receding.',
    }),
    view: choice('Where is the camera?', {
      low: 'Almost in the water: the horizon dead centre, top and bottom symmetrical.',
      standing: 'At eye level, the horizon a little above the middle.',
      high: 'Up on a roof rack looking slightly down, more ground than sky.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const sky = SKIES[a.sky];
    const root = new THREE.Group();
    const rig = new THREE.Group();
    root.add(rig);
    const warm = new THREE.Color(mood.warmth > 0.5 ? '#ffb080' : '#9fc0ff');
    const tone = (hex: string, amount = 0.14) => {
      const colour = new THREE.Color(hex).lerp(warm, Math.abs(mood.warmth - 0.5) * 2 * amount);
      const hsl = { h: 0, s: 0, l: 0 };
      colour.getHSL(hsl);
      return colour.setHSL(hsl.h, Math.min(1, hsl.s * mix(0.7, 1.2, mood.cheer)), hsl.l);
    };
    const zen = tone(sky.zen), mid = tone(sky.mid), hor = tone(sky.hor), glow = tone(sky.glow);
    const css = (colour: THREE.Color, alpha = 1) => `rgba(${Math.round(colour.r ** (1 / 2.2) * 255)},${Math.round(colour.g ** (1 / 2.2) * 255)},${Math.round(colour.b ** (1 / 2.2) * 255)},${alpha})`;
    const hex = (colour: THREE.Color) => `#${colour.getHexString()}`;

    // Where the light is. Azimuth is measured from straight ahead, positive to the right.
    const side = mood.daylight < 0.5 ? -1 : 1;
    const inView = a.orb === 'sun';
    const azimuth = side * THREE.MathUtils.degToRad(inView ? mix(8, 15, random()) : mix(48, 68, random()));
    const elevation = THREE.MathUtils.degToRad(inView ? 3.2 : a.orb === 'moon' ? Math.max(8, sky.elevation * 0.8) : sky.elevation);
    const sunDir = new THREE.Vector3(Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), -Math.cos(azimuth) * Math.cos(elevation));

    // Sky dome, painted as a panorama: canvas x is compass bearing, y runs zenith to horizon to nadir.
    const SW = 2048, SH = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = SW; canvas.height = SH;
    const ctx = canvas.getContext('2d')!;
    const lid = a.clouds === 'lid' || a.sky === 'storm';
    const gradient = ctx.createLinearGradient(0, 0, 0, SH / 2);
    const lidTone = zen.clone().lerp(new THREE.Color('#6d7280'), 0.45);
    gradient.addColorStop(0, hex(lid ? lidTone : zen.clone().multiplyScalar(0.9)));
    gradient.addColorStop(0.7, hex(lid ? lidTone : zen));
    gradient.addColorStop(lid ? 0.91 : 0.89, hex(lid ? lidTone.clone().lerp(mid, 0.3) : mid));
    gradient.addColorStop(lid ? 0.96 : 0.978, hex(hor));
    gradient.addColorStop(1, hex(hor.clone().lerp(new THREE.Color('#ffffff'), 0.12)));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SW, SH / 2);
    ctx.fillStyle = hex(hor.clone().lerp(new THREE.Color('#ffffff'), 0.12));
    ctx.fillRect(0, SH / 2, SW, SH / 2);
    const skyX = (bearing: number) => (((0.75 - bearing / (Math.PI * 2)) % 1) + 1) % 1 * SW;
    const skyY = (height: number) => SH * (0.5 - height / Math.PI);
    const wrapped = (x: number, draw: (x: number) => void) => { for (const shift of [-SW, 0, SW]) draw(x + shift); };
    // Stars, for the blue hour.
    if (sky.stars && !lid) for (let i = 0; i < 420; i++) {
      const y = random() ** 0.7 * SH * 0.47;
      ctx.fillStyle = `rgba(255,255,255,${mix(0.25, 0.9, random()) * (1 - y / (SH * 0.5))})`;
      ctx.fillRect(random() * SW, y, 1.6, 1.6);
    }
    // Glow where the sun is or was.
    const sx = skyX(azimuth), sy = skyY(a.orb === 'moon' ? -0.03 : elevation);
    wrapped(sx, (x) => {
      const halo = ctx.createRadialGradient(x, sy, 0, x, sy, SH * (a.sky === 'noon' ? 0.2 : 0.3));
      halo.addColorStop(0, css(glow, a.sky === 'noon' ? 0.5 : 0.85));
      halo.addColorStop(0.35, css(glow, 0.35));
      halo.addColorStop(1, css(glow, 0));
      ctx.save();
      ctx.translate(x, sy);
      ctx.scale(a.sky === 'noon' ? 1 : 2.4, 1);
      ctx.translate(-x, -sy);
      ctx.fillStyle = halo;
      ctx.fillRect(x - SH, 0, SH * 2, SH / 2);
      ctx.restore();
    });
    // Cirrus, or the torn underside of the lid.
    const wisp = (bearing: number, height: number, length: number, thick: number, colour: THREE.Color, alpha: number) => wrapped(skyX(bearing), (x) => {
      const y = skyY(height);
      const brush = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      brush.addColorStop(0, css(colour, alpha));
      brush.addColorStop(1, css(colour, 0));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((random() - 0.5) * 0.12);
      ctx.scale(length, thick);
      ctx.fillStyle = brush;
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, 6.3); ctx.fill();
      ctx.restore();
    });
    const litCloud = hor.clone().lerp(new THREE.Color('#ffffff'), 0.5), shadeCloud = zen.clone().lerp(new THREE.Color('#4d4a66'), 0.45);
    if (a.clouds === 'cirrus') for (let i = 0; i < 46 + mood.density * 40; i++) {
      const height = mix(0.07, 0.75, random() ** 1.6);
      wisp(random() * 6.3, height, mix(40, 170, random()), mix(2.5, 8, random()), random() < 0.75 ? litCloud : glow, mix(0.25, 0.6, random()));
    }
    if (lid) {
      for (let i = 0; i < 150; i++) wisp(random() * 6.3, mix(0.1, 0.9, random() ** 1.3), mix(60, 220, random()), mix(8, 26, random()), random() < 0.6 ? shadeCloud : lidTone.clone().lerp(new THREE.Color('#ffffff'), 0.25), mix(0.15, 0.4, random()));
      for (let i = 0; i < 70; i++) wisp(random() * 6.3, mix(0.075, 0.13, random()), mix(50, 160, random()), mix(3, 7, random()), shadeCloud, mix(0.4, 0.75, random()));
    }
    // Sun disc or moon.
    if (inView) wrapped(sx, (x) => { ctx.fillStyle = css(new THREE.Color('#fffbea')); ctx.beginPath(); ctx.arc(x, skyY(elevation), 7, 0, 6.3); ctx.fill(); });
    if (a.orb === 'moon') {
      const mx = skyX(-side * THREE.MathUtils.degToRad(mix(6, 13, random()))), my = skyY(THREE.MathUtils.degToRad(mix(11, 16, random())));
      wrapped(mx, (x) => {
        const haze = ctx.createRadialGradient(x, my, 0, x, my, 60);
        haze.addColorStop(0, 'rgba(255,255,255,0.28)'); haze.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = haze; ctx.fillRect(x - 60, my - 60, 120, 120);
        ctx.fillStyle = '#fdfaf0'; ctx.beginPath(); ctx.arc(x, my, 6.5, 0, 6.3); ctx.fill();
        ctx.fillStyle = 'rgba(190,190,205,0.35)'; ctx.beginPath(); ctx.arc(x - 1.5, my - 1, 2, 0, 6.3); ctx.arc(x + 2, my + 2, 1.5, 0, 6.3); ctx.fill();
      });
    }
    const skyMap = new THREE.CanvasTexture(canvas);
    skyMap.colorSpace = THREE.SRGBColorSpace;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2600, 48, 24), new THREE.MeshBasicMaterial({ map: skyMap, side: THREE.BackSide, depthWrite: false, fog: false }));
    dome.renderOrder = -10;
    dome.frustumCulled = false;
    rig.add(dome);

    // Light.
    const dim = a.orb === 'moon' ? 0.55 : inView ? 0.8 : 1;
    const hemi = new THREE.HemisphereLight(zen.clone().lerp(new THREE.Color('#ffffff'), 0.55), hor.clone().lerp(new THREE.Color('#ffffff'), 0.6), a.sky === 'noon' ? 1.5 : 1.75);
    const key = new THREE.DirectionalLight(tone(a.orb === 'moon' ? '#d9defa' : sky.key, 0.2), (a.sky === 'noon' ? 3.1 : 2.6) * dim);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.04;
    key.shadow.bias = -0.0004;
    const fill = new THREE.DirectionalLight(mid.clone().lerp(new THREE.Color('#ffffff'), 0.4), inView ? 1.15 : 0.6);
    rig.add(hemi, key, key.target, fill);

    // The ground: a mirror with dry crust painted through it by a wetness map.
    const mask = new Uint8Array(MASK * MASK * 4);
    const lattice = (size: number) => { const grid = Array.from({ length: (size + 1) * (size + 1) }, () => random()); return (u: number, v: number) => {
      const x = u * size, y = v * size, ix = Math.min(size - 1, Math.floor(x)), iy = Math.min(size - 1, Math.floor(y));
      const fx = x - ix, fy = y - iy, sx2 = fx * fx * (3 - 2 * fx), sy2 = fy * fy * (3 - 2 * fy);
      const at = (i: number, j: number) => grid[j * (size + 1) + i];
      return mix(mix(at(ix, iy), at(ix + 1, iy), sx2), mix(at(ix, iy + 1), at(ix + 1, iy + 1), sx2), sy2);
    }; };
    const coarse = lattice(7), fine = lattice(19);
    const farWet = a.water === 'dry' ? 0 : 1;
    for (let j = 0; j < MASK; j++) for (let i = 0; i < MASK; i++) {
      const u = i / (MASK - 1), v = j / (MASK - 1), depth = v * SPAN;
      const n = coarse(u, v) * 0.65 + fine(u, v) * 0.35;
      let wet: number;
      if (a.water === 'mirror') wet = n > mix(0.8, 0.7, mood.wear) && depth > 5 ? 0.2 : 1;
      else if (a.water === 'rippled') wet = 1;
      else if (a.water === 'patchy') wet = n + THREE.MathUtils.clamp((depth - mix(7, 15, mood.wear)) / 34, -0.42, 0.55);
      else wet = depth > 50 && n > 0.7 ? 0.85 : 0.08;
      const border = Math.min(u, 1 - u, 1 - v) * 9;
      wet = mix(farWet, wet, Math.min(1, border));
      mask[(j * MASK + i) * 4] = Math.round(THREE.MathUtils.clamp(wet, 0, 1) * 255);
      mask[(j * MASK + i) * 4 + 3] = 255;
    }
    const maskMap = new THREE.DataTexture(mask, MASK, MASK, THREE.RGBAFormat);
    maskMap.magFilter = maskMap.minFilter = THREE.LinearFilter;
    maskMap.needsUpdate = true;
    const ground = new Reflector(new THREE.PlaneGeometry(5600, 5600), { textureWidth: 1024, textureHeight: 1024, clipBias: 0.003, shader: groundShader, multisample: 4 });
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = GROUND_Y;
    const uniforms = (ground.material as THREE.ShaderMaterial).uniforms;
    uniforms.tMask.value = maskMap;
    const skyLight = zen.clone().lerp(hor, 0.5);
    uniforms.crust.value = new THREE.Color('#f3f1ea').lerp(skyLight, a.sky === 'noon' ? 0.1 : 0.34).multiplyScalar(a.orb === 'moon' ? 0.86 : 0.97);
    uniforms.ridge.value = new THREE.Color('#ffffff').lerp(hor, 0.18);
    uniforms.tint.value = zen.clone().lerp(new THREE.Color('#58607a'), 0.5);
    uniforms.stainColor.value = new THREE.Color('#b9a688').lerp(skyLight, 0.3);
    uniforms.stain.value = mood.wear;
    uniforms.cell.value = mix(0.75, 1.15, random());
    uniforms.ripple.value = a.water === 'rippled' ? mix(0.025, 0.07, mood.energy) : mix(0.0, 0.006, mood.energy);
    rig.add(ground);

    // Far horizon.
    const haze = hor.clone().lerp(mid, 0.5);
    const cone = (bearing: number, depth: number, radius: number, height: number, snow: boolean, mineral: boolean) => {
      const geometry = new THREE.CylinderGeometry(radius * 0.08, radius, height, 28, 9, true);
      const position = geometry.attributes.position;
      const colours = new Float32Array(position.count * 3);
      const p1 = random() * 6.3, p2 = random() * 6.3;
      const rock = new THREE.Color(mineral ? '#7a4f45' : '#5d5068'), ochre = new THREE.Color('#b9824f'), white = new THREE.Color('#f6f4f2');
      const paint = new THREE.Color();
      for (let i = 0; i < position.count; i++) {
        const t = Math.min(1, Math.max(0, position.getY(i) / height + 0.5)), angle = Math.atan2(position.getZ(i), position.getX(i));
        const flare = (1 - t) ** 1.7 * 0.92 + 0.08;
        const ridges = 1 + (0.1 * Math.sin(angle * 5 + p1) + 0.06 * Math.sin(angle * 11 + p2)) * (1 - t * 0.5);
        const crater = t > 0.99 ? 0.92 + 0.06 * Math.sin(angle * 3 + p1) : 1;
        position.setXYZ(i, Math.cos(angle) * radius * flare * ridges, (t - 0.5) * height * crater, Math.sin(angle) * radius * flare * ridges);
        paint.copy(rock);
        if (mineral) paint.lerp(ochre, Math.max(0, Math.sin(t * 9 + angle * 2 + p2)) * 0.6);
        if (snow && t > 0.62 + 0.1 * Math.sin(angle * 7 + p1)) paint.lerp(white, 0.85);
        paint.lerp(haze, mix(0.6, 0.3, t) * (depth > 600 ? 1 : 0.6));
        colours.set([paint.r, paint.g, paint.b], i * 3);
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, emissive: haze, emissiveIntensity: 0.1 }));
      mesh.position.set(Math.sin(bearing) * depth, height / 2 - 0.5, -Math.cos(bearing) * depth);
      rig.add(mesh);
    };
    if (a.horizon === 'range') {
      const count = 8 + Math.round(random() * 3);
      const lead = Math.floor(random() * count);
      for (let i = 0; i < count; i++) {
        const bearing = mix(-0.62, 0.62, (i + random() * 0.6) / count);
        const big = i === lead;
        cone(bearing, mix(1000, 1350, random()), big ? mix(260, 330, random()) : mix(120, 240, random()), big ? mix(125, 150, random()) : mix(42, 96, random()), big || random() < 0.25, false);
      }
      // Low foothills tying the cones together.
      for (let i = 0; i < 9; i++) cone(mix(-0.7, 0.7, random()), mix(1250, 1400, random()), mix(220, 420, random()), mix(18, 34, random()), false, false);
    } else if (a.horizon === 'cone') {
      const bearing = -side * mix(0.16, 0.3, random()) * (random() < 0.5 ? 1 : -1);
      cone(bearing, 1150, 430, mix(205, 240, random()), true, true);
      cone(bearing + 0.33, 1300, 210, 62, false, true);
      cone(bearing - 0.28, 1350, 260, 48, false, false);
    } else if (a.horizon === 'island') {
      const bearing = mix(0.12, 0.3, random()) * (random() < 0.5 ? 1 : -1), depth = mix(240, 320, random());
      const cx = Math.sin(bearing) * depth, cz = -Math.cos(bearing) * depth;
      const rockPaint = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6a5a52').lerp(haze, 0.28), roughness: 1, flatShading: true });
      for (let i = 0; i < 7; i++) {
        const lump = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), rockPaint);
        lump.scale.set(mix(18, 44, random()), mix(7, 17, random()), mix(14, 28, random()));
        lump.position.set(cx + (i - 3) * 17 + (random() - 0.5) * 10, 0, cz + (random() - 0.5) * 14);
        lump.rotation.y = random() * 3;
        rig.add(lump);
      }
      const cactusPaint = new THREE.MeshStandardMaterial({ color: new THREE.Color('#4d5a44').lerp(haze, 0.22), roughness: 1 });
      const columns = Math.round(mix(16, 34, mood.density));
      const cacti = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.5, 1, 3, 7).translate(0, 1, 0), cactusPaint, columns * 2);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < columns; i++) {
        const x = cx + (random() - 0.5) * 120, z = cz + (random() - 0.5) * 22, tall = mix(4, 10, random());
        const baseY = Math.max(2, 14 - Math.abs(x - cx) * 0.16) * mix(0.6, 1, random());
        dummy.position.set(x, baseY, z); dummy.rotation.set(0, 0, (random() - 0.5) * 0.08); dummy.scale.set(mix(0.9, 1.4, random()), tall / 2, 1.1); dummy.updateMatrix();
        cacti.setMatrixAt(i * 2, dummy.matrix);
        const arm = random() < 0.6;
        dummy.position.set(x + (random() < 0.5 ? -1.3 : 1.3), baseY + tall * mix(0.35, 0.55, random()), z); dummy.scale.set(arm ? 0.7 : 0.001, arm ? tall * 0.2 : 0.001, 0.7); dummy.updateMatrix();
        cacti.setMatrixAt(i * 2 + 1, dummy.matrix);
      }
      rig.add(cacti);
      for (let i = 0; i < 5; i++) cone(mix(-0.65, 0.65, random()), mix(1250, 1400, random()), mix(200, 380, random()), mix(16, 30, random()), false, false);
    }

    // Cumulus low on the horizon: real volumes, so the water doubles them.
    if (a.clouds === 'cumulus') {
      const puffs: { x: number; y: number; z: number; sx: number; sy: number; sz: number }[] = [];
      const fleets = Math.round(mix(7, 15, mood.density));
      for (let f = 0; f < fleets; f++) {
        const bearing = mix(-0.75, 0.75, random()), depth = mix(900, 1700, random()), base = mix(150, 250, random()) * depth / 1200, width = mix(70, 190, random());
        const cx = Math.sin(bearing) * depth, cz = -Math.cos(bearing) * depth;
        for (let i = 0; i < 7; i++) {
          const offset = (random() - 0.5) * width * 1.6, size = width * mix(0.28, 0.5, random()) * (1 - Math.abs(offset) / width * 0.45);
          puffs.push({ x: cx + offset, y: base + size * 0.42, z: cz + (random() - 0.5) * 40, sx: size * 1.3, sy: size * 0.62, sz: size });
        }
        puffs.push({ x: cx, y: base, z: cz, sx: width * 0.95, sy: width * 0.07, sz: width * 0.5 });
      }
      const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: litCloud.clone().lerp(new THREE.Color('#ffffff'), 0.4), roughness: 1, emissive: mid, emissiveIntensity: 0.22 }), puffs.length);
      const dummy = new THREE.Object3D();
      puffs.forEach((puff, i) => { dummy.position.set(puff.x, puff.y, puff.z); dummy.scale.set(puff.sx, puff.sy, puff.sz); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
      rig.add(mesh);
    }

    // Marks in the foreground. Rig space: the camera stands at the origin looking down -z.
    const markTone = zen.clone().lerp(new THREE.Color('#3f3d52'), 0.6);
    const markPaint = new THREE.MeshBasicMaterial({ color: markTone, transparent: true, opacity: 0.42, depthWrite: false });
    const markY = GROUND_Y + 0.006;
    if (a.traces === 'tracks') {
      const bend = (random() - 0.5) * 0.5, start = mix(0.9, 1.7, random()) * (random() < 0.5 ? 1 : -1), drift = -start * mix(0.004, 0.012, random());
      for (const wheel of [-0.75, 0.75]) {
        const vertices: number[] = [], index: number[] = [];
        const steps = 90;
        for (let i = 0; i <= steps; i++) {
          const depth = 0.6 + (i / steps) ** 2.2 * 900;
          const x = start + drift * depth + Math.sin(depth * 0.008 + bend) * depth * 0.05 + wheel;
          const wide = 0.13 + (random() - 0.5) * 0.03;
          vertices.push(x - wide, markY, -depth, x + wide, markY, -depth);
          if (i < steps) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(index);
        const track = new THREE.Mesh(geometry, markPaint);
        track.material.side = THREE.DoubleSide;
        track.frustumCulled = false;
        rig.add(track);
      }
    } else if (a.traces === 'footprints') {
      const steps = Math.round(mix(38, 90, random()));
      const prints = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2), markPaint, steps);
      const dummy = new THREE.Object3D();
      const heading = (random() - 0.5) * 0.5, x0 = (random() < 0.5 ? -1 : 1) * mix(0.5, 1.1, random());
      for (let i = 0; i < steps; i++) {
        const depth = 1.4 + i * 0.72;
        dummy.position.set(x0 + Math.sin(heading) * depth + (i % 2 ? 0.14 : -0.14) + Math.sin(i * 0.3) * 0.12, markY, -depth);
        dummy.rotation.set(0, -heading + (i % 2 ? -0.12 : 0.12), 0);
        dummy.scale.set(0.085, 1, 0.2);
        dummy.updateMatrix();
        prints.setMatrixAt(i, dummy.matrix);
      }
      prints.frustumCulled = false;
      rig.add(prints);
    } else if (a.traces === 'stakes') {
      const count = 26;
      const wood = new THREE.MeshStandardMaterial({ color: '#6b5236', roughness: 1 });
      const stakes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.045, 1, 6).translate(0, 0.5, 0), wood, count);
      const tapes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.02, 0.09, 0.34).translate(0, 0, 0.17), new THREE.MeshStandardMaterial({ color: mood.cheer > 0.4 ? '#f0542c' : '#c9c2b0', roughness: 0.9 }), count);
      const dummy = new THREE.Object3D();
      const x0 = (random() < 0.5 ? -1 : 1) * mix(1.6, 2.6, random()), drift = -x0 * 0.01;
      for (let i = 0; i < count; i++) {
        const depth = 9 + i * mix(9, 11, random()) + i * i * 0.5, tall = mix(0.8, 1.2, random());
        const x = x0 + drift * depth;
        dummy.position.set(x, GROUND_Y, -depth); dummy.rotation.set((random() - 0.5) * 0.2, 0, (random() - 0.5) * 0.25 * (0.4 + mood.wear)); dummy.scale.set(1, tall, 1); dummy.updateMatrix();
        stakes.setMatrixAt(i, dummy.matrix);
        dummy.position.set(x, GROUND_Y + tall * 0.92, -depth); dummy.rotation.set(0, random() * 0.6 + azimuth, 0.2); dummy.scale.set(1, 1, mix(0.7, 1.3, random())); dummy.updateMatrix();
        tapes.setMatrixAt(i, dummy.matrix);
      }
      stakes.castShadow = tapes.castShadow = true;
      stakes.frustumCulled = tapes.frustumCulled = false;
      rig.add(stakes, tapes);
    }

    // Camera.
    const FOV = 46, half = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const eye = { low: 0.42, standing: 1.55, high: 4.3 }[a.view], horizonAt = { low: 0.03, standing: 0.14, high: 0.36 }[a.view];
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.4, 7000);
    const pitch = Math.atan(horizonAt * half);

    // Soft contact shadows, since the mirror itself takes none.
    const blobCanvas = document.createElement('canvas');
    blobCanvas.width = blobCanvas.height = 64;
    const blobCtx = blobCanvas.getContext('2d')!;
    const blobFill = blobCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    blobFill.addColorStop(0, 'rgba(255,255,255,1)'); blobFill.addColorStop(0.55, 'rgba(255,255,255,0.75)'); blobFill.addColorStop(1, 'rgba(255,255,255,0)');
    blobCtx.fillStyle = blobFill; blobCtx.fillRect(0, 0, 64, 64);
    const blobMap = new THREE.CanvasTexture(blobCanvas);
    const blobPaint = new THREE.MeshBasicMaterial({ map: blobMap, color: zen.clone().lerp(new THREE.Color('#1f1d2e'), 0.72), transparent: true, opacity: a.sky === 'noon' ? 0.5 : 0.4, depthWrite: false });
    const blobGeometry = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
    const blobs = new THREE.Group();
    root.add(blobs);

    const world: World = {
      object: root, camera, background: hor.clone(), capacity: 6, ground, keyLight: key,
      place(items: readonly Placeable[]) {
        blobs.clear();
        const natural = (item: Placeable) => Math.max(item.height, item.radius * 2);
        const giant = (item: Placeable) => natural(item) > 80;
        const shown = (item: Placeable) => { const size = natural(item); return size <= 8 ? 1 : (8 * (size / 8) ** 0.45) / size; };
        const fit = (item: Placeable, scale: number, tall: number, wide: number) => Math.max(item.height * scale / (tall * 2 * half), item.radius * 2 * scale / (wide * 2 * half));
        const hero = items[0];
        // How far away the hero stands decides where the camera is, so the hero is the scene's centre.
        const heroGiant = hero ? giant(hero) : false;
        const heroDepth = hero && !heroGiant ? THREE.MathUtils.clamp(fit(hero, shown(hero), 0.36, 0.56) + hero.radius * shown(hero) * 0.5, 4.5, 60) : 12;
        camera.position.set(0, eye, heroDepth);
        rig.position.set(0, 0, heroDepth);
        uniforms.origin.value.set(0, heroDepth);
        const nearSlots = [[-0.16, 1], [0.5, 2.0], [-0.64, 2.9], [0.22, 4.4], [0.8, 3.4], [-0.36, 5.8]] as const;
        const farSlots = [[0.3, 0.3], [-0.42, 0.22], [0.02, 0.18], [0.62, 0.15], [-0.7, 0.14], [0.45, 0.12]] as const;
        let nearIndex = 0, farIndex = 0;
        let shadowReach = 14;
        items.forEach((item, index) => {
          const holder = item.holder;
          if (giant(item)) {
            // Too big to stand beside: it goes out to the horizon and looms there, doubled in the water.
            const [bearing, tall] = item.hero ? ([items.length > 1 ? 0.12 : 0.04, 0.4] as const) : farSlots[farIndex++ % farSlots.length];
            const depth = item.hero ? 620 : mix(700, 880, context.random());
            const scale = Math.min(tall * 2 * half * depth / item.height, 0.7 * 2 * half * depth / (item.radius * 2));
            holder.scale.setScalar(scale);
            holder.position.set(bearing * half * depth, 0, heroDepth - depth);
            holder.rotation.y = (context.random() - 0.5) * 0.6;
            return;
          }
          const scale = shown(item);
          const slot = nearSlots[(item.hero ? 0 : Math.max(1, ++nearIndex)) % nearSlots.length];
          const alone = items.filter((other) => !giant(other)).length === 1;
          const depth = item.hero ? heroDepth : Math.max(fit(item, scale, 0.2, 0.3), heroDepth * slot[1] * mix(0.9, 1.15, context.random()));
          const bearing = item.hero ? (alone ? -0.06 : slot[0]) : slot[0] + (context.random() - 0.5) * 0.1;
          const x = bearing * half * depth * 0.92, z = heroDepth - depth;
          holder.scale.setScalar(scale);
          holder.position.set(x, 0, z);
          // Three-quarter on to the camera, never square.
          holder.rotation.y = Math.atan2(-x, heroDepth - z) + (index % 2 ? -1 : 1) * mix(0.3, 0.6, context.random());
          shadowReach = Math.max(shadowReach, depth < 90 ? Math.hypot(x, depth) + item.radius * scale : 0);
          const radius = Math.max(0.3, item.radius * scale), length = radius * 1.15 + Math.min(item.height * scale * 0.5 / Math.tan(elevation), radius * 2.6);
          const blob = new THREE.Mesh(blobGeometry, blobPaint);
          const away = new THREE.Vector2(-sunDir.x, -sunDir.z).normalize();
          blob.scale.set(radius * 1.2, 1, length);
          blob.rotation.y = Math.atan2(away.x, away.y);
          blob.position.set(x + away.x * (length - radius) * 0.75, GROUND_Y + 0.004 + index * 0.0005, z + away.y * (length - radius) * 0.75);
          blob.renderOrder = 1;
          blobs.add(blob);
        });
        camera.rotation.set(-pitch, 0, 0);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        const centre = new THREE.Vector3(0, 0, heroDepth - Math.min(shadowReach, 60) * 0.5);
        key.target.position.copy(centre);
        key.target.updateMatrixWorld();
        key.position.copy(centre).addScaledVector(sunDir, 160);
        fill.position.copy(centre).add(new THREE.Vector3(-sunDir.x, 0.35, 0.8).normalize().multiplyScalar(60));
        const shadow = key.shadow.camera;
        const reach = Math.min(shadowReach, 60) * 0.75 + 6;
        shadow.left = shadow.bottom = -reach;
        shadow.right = shadow.top = reach;
        shadow.near = 1; shadow.far = 400;
        shadow.updateProjectionMatrix();
      },
      update(_dt, time) { uniforms.time.value = time * mix(0.15, 1.6, mood.energy); },
      dispose() {
        key.shadow.map?.dispose();
        ground.dispose();
        skyMap.dispose(); maskMap.dispose(); blobMap.dispose(); blobGeometry.dispose(); blobPaint.dispose();
        disposeTree(root);
      },
    };
    // Frame an empty flat sensibly before anything is placed.
    world.place([]);
    return world;
  },
});
