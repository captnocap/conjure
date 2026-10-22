import * as THREE from 'three';
import { type Placeable, choice, defineWorld, disposeTree, mix } from '@conjure/kit';

const SURFACES = {
  ocean: 'Open blue ocean with a few green island chains.',
  continents: 'Green and tan continents with coastlines, mountains and inland deserts.',
  storm: 'Ocean under one enormous spiral cyclone.',
  ice: 'A polar ice cap: white sheets split by dark leads of open water.',
  desert: 'An ochre desert coast against teal sea, dry and ancient.',
} as const;
const CLOUDS = {
  wisps: 'Almost clear: a few thin wisps.',
  fronts: 'Long curling weather fronts.',
  popcorn: 'A speckle of small puffy cells, like popcorn.',
  overcast: 'Thick cloud cover with only a few gaps.',
} as const;
const LIGHTS = {
  web: 'Megacities: dense golden webs joined by threads of highway.',
  coast: 'Sparse strings of light tracing the coasts.',
  wild: 'No lights at all: an uninhabited or abandoned night.',
  fires: 'Scattered orange fires and blue-white lightning in the clouds.',
} as const;
const LIMBS = {
  thin: 'A thin crisp blue line, shockingly fragile.',
  layered: 'Stacked sunrise bands: orange, gold, then blue.',
  airglow: 'A faint green airglow layer floating above the blue.',
  hazy: 'A thick soft hazy glow.',
} as const;
const BACKDROPS = {
  indigo: 'Deep indigo space, dark but not black, with stars.',
  dusk: 'A mid-tone violet twilight, gentle and dreamlike.',
  paper: 'A pale chart-paper sky, like a mission diagram or an old print.',
  black: 'True hard black, as the camera really sees it.',
} as const;
const VANTAGES = {
  low: 'Low orbit: the horizon a clear curve across the upper frame.',
  skimming: 'Skimming very low: the surface streams past, the horizon nearly flat.',
  high: 'Higher up: the planet a great dome with space on both sides.',
} as const;
const COMPANY = {
  nothing: 'Nothing else: only the planet and the dark.',
  truss: 'A station truss and solar array crossing the top corner, close and huge.',
  hatch: 'The white rim of an open hatch and a handrail in the bottom corner.',
  moon: 'A small moon hanging above the limb.',
  meteors: 'Meteors burning up as short bright streaks in the air below.',
  debris: 'A glitter of small debris and ice flecks drifting past.',
} as const;

const R = 60;
const FOV = 42;

const PLANET_VERTEX = /* glsl */ `
  varying vec3 vN; varying vec3 vP; varying vec2 vUv;
  void main() {
    vUv = uv;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vP = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }`;
const PLANET_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap; uniform sampler2D uLights;
  uniform vec3 uSun; uniform vec3 uWarm; uniform vec3 uHaze; uniform vec3 uNight;
  uniform float uLift; uniform float uCity;
  varying vec3 vN; varying vec3 vP; varying vec2 vUv;
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vP);
    float ndl = dot(N, uSun);
    float day = smoothstep(-0.06, 0.14, ndl);
    vec3 albedo = texture2D(uMap, vUv).rgb;
    float bright = dot(albedo, vec3(0.3, 0.5, 0.2));
    vec3 color = albedo * day * (0.82 + 0.3 * smoothstep(0.0, 0.7, ndl));
    color += uWarm * bright * exp(-pow((ndl - 0.03) / 0.06, 2.0)) * 0.5;
    color += (1.0 - day) * (uNight + albedo * uLift);
    color += texture2D(uLights, vUv).rgb * uCity * (1.0 - smoothstep(-0.2, -0.02, ndl));
    float rim = pow(1.0 - max(dot(N, V), 0.0), 2.6);
    color = mix(color, uHaze * (0.2 + 0.8 * day) + uNight * 2.0, rim * 0.62);
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
const AIR_FRAGMENT = /* glsl */ `
  uniform vec3 uSun; uniform vec3 uWarm; uniform vec3 uHaze; uniform vec3 uOuter; uniform vec3 uNight;
  uniform float uGraze; uniform float uStrength; uniform float uBands;
  varying vec3 vN; varying vec3 vP; varying vec2 vUv;
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vP);
    float ndv = max(dot(N, V), 0.0);
    float ndl = dot(N, uSun);
    float day = smoothstep(-0.3, 0.2, ndl);
    float height = 1.0 - clamp(ndv / uGraze, 0.0, 1.0);
    float outer = pow(smoothstep(0.0, uGraze, ndv), 1.4);
    float inner = 1.0 - smoothstep(uGraze, uGraze + 0.4, ndv);
    float alpha = outer * (0.1 + 0.9 * inner) * uStrength;
    vec3 color = mix(uHaze, uOuter, smoothstep(0.15, 0.85, height));
    float sunrise = exp(-pow(ndl / 0.3, 2.0));
    color = mix(color, uWarm, uBands * sunrise * (1.0 - smoothstep(0.0, 0.55, height)));
    color = mix(uNight * 3.0 + uOuter * 0.25, color, 0.12 + 0.88 * day);
    gl_FragColor = vec4(color * 1.25, alpha * (0.35 + 0.65 * day));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

export default defineWorld({
  questions: {
    surface: choice('What lies below?', SURFACES),
    clouds: choice('What is the weather doing down there?', CLOUDS),
    lights: choice('What shows on the night side?', LIGHTS),
    limb: choice('What does the atmosphere on the horizon look like?', LIMBS),
    backdrop: choice('How is space itself rendered?', BACKDROPS),
    vantage: choice('How high is the orbit?', VANTAGES),
    company: choice('What else shares the frame besides the cast?', COMPANY),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const jitter = (amount: number) => (random() - 0.5) * amount;
    const paper = a.backdrop === 'paper';
    const background = new THREE.Color({ indigo: '#1b2348', dusk: '#474672', paper: '#e2ded2', black: '#06070d' }[a.backdrop]);

    // Camera sits where the far horizon is the top of the planet, at the world origin.
    const alpha = THREE.MathUtils.degToRad({ low: 38, skimming: 56, high: 25 }[a.vantage]);
    const pitch = THREE.MathUtils.degToRad({ low: 6.5, skimming: 4, high: 9.5 }[a.vantage]);
    const centre = new THREE.Vector3(0, -R, 0);
    const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 900);
    camera.position.set(0, 0, R / Math.tan(alpha));
    camera.rotation.set(-pitch, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const reachAngle = Math.PI / 2 - alpha;
    const onGlobe = (theta: number, lambda: number) => new THREE.Vector3(Math.sin(lambda), Math.cos(lambda) * Math.cos(theta), Math.cos(lambda) * Math.sin(theta));

    // The sun grazes in from one side so the day-night line crosses the view.
    const fromLeft = mood.daylight <= 0.6;
    const view = (sx: number, sy: number) => new THREE.Vector3(sx, sy, 0.5).unproject(camera).sub(camera.position).normalize();
    /** How far along a sight line the planet (plus a margin) is met, or Infinity above the limb. */
    const meets = (ray: THREE.Vector3, margin: number) => {
      const offset = camera.position.clone().sub(centre);
      const b = ray.dot(offset), discriminant = b * b - (offset.lengthSq() - (R + margin) ** 2);
      return discriminant > 0 ? -b - Math.sqrt(discriminant) : Infinity;
    };
    // The line is pinned to a point on screen, so every vantage shows both day and night.
    const lineAt = view(fromLeft ? mix(-0.2, 0.5, mood.daylight / 0.6) : mix(-0.5, 0.15, (mood.daylight - 0.6) / 0.4), -0.3);
    const n0 = camera.position.clone().addScaledVector(lineAt, meets(lineAt, 0)).sub(centre).normalize();
    const sigma = fromLeft ? 1 : -1;
    const sun = new THREE.Vector3(-sigma, (sigma * n0.x - 0.3 * n0.z) / n0.y, 0.3).normalize();
    const warm = new THREE.Color().setHSL(mix(0.1, 0.035, mood.warmth), 0.95, mix(0.6, 0.52, mood.warmth));

    root.add(new THREE.HemisphereLight('#aebcf0', '#3f6fc8', paper ? 1.5 : 1.05));
    const key = new THREE.DirectionalLight(new THREE.Color().setHSL(mix(0.13, 0.07, mood.warmth), 0.75, 0.86), 3.4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.04;
    key.shadow.bias = -0.0004;
    root.add(key, key.target);
    const earthshine = new THREE.DirectionalLight('#6fa2ff', 0.85);
    earthshine.position.set(0, -R, 20);
    root.add(earthshine, earthshine.target);
    const glint = new THREE.PointLight(warm.clone().lerp(new THREE.Color('#ffffff'), 0.35), 0, 0, 2);
    root.add(glint);

    // ---- Planet surface, painted over the cap of the globe the camera can see. ----
    const perm = Array.from({ length: 256 }, () => Math.floor(random() * 256));
    const values = Array.from({ length: 256 }, () => random());
    const lattice = (x: number, y: number, z: number) => values[perm[(perm[(perm[x & 255] + y) & 255] + z) & 255]];
    const noise = (x: number, y: number, z: number) => {
      const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
      let fx = x - ix, fy = y - iy, fz = z - iz;
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
      const a00 = lattice(ix, iy, iz) + (lattice(ix + 1, iy, iz) - lattice(ix, iy, iz)) * fx;
      const a10 = lattice(ix, iy + 1, iz) + (lattice(ix + 1, iy + 1, iz) - lattice(ix, iy + 1, iz)) * fx;
      const a01 = lattice(ix, iy, iz + 1) + (lattice(ix + 1, iy, iz + 1) - lattice(ix, iy, iz + 1)) * fx;
      const a11 = lattice(ix, iy + 1, iz + 1) + (lattice(ix + 1, iy + 1, iz + 1) - lattice(ix, iy + 1, iz + 1)) * fx;
      const b0 = a00 + (a10 - a00) * fy, b1 = a01 + (a11 - a01) * fy;
      return b0 + (b1 - b0) * fz;
    };
    const fbm = (x: number, y: number, z: number, octaves: number) => {
      let sum = 0, weight = 0.5, total = 0;
      for (let o = 0; o < octaves; o++) { sum += noise(x, y, z) * weight; total += weight; x *= 2.03; y *= 2.03; z *= 2.03; weight *= 0.5; }
      return sum / total;
    };
    const capAngle = Math.min(reachAngle + 0.1, 1.45);
    const spread = 1;
    const landLevel = { ocean: 0.6, continents: 0.5, storm: 0.63, ice: 0.3, desert: 0.47 }[a.surface];
    const landScale = a.surface === 'ocean' ? 5.5 : 3.4;
    const elevation = (x: number, y: number, z: number) => fbm(x * landScale + 11, y * landScale + 5, z * landScale + 3, 5);
    const cover = { wisps: 0.62, fronts: 0.54, popcorn: 0.55, overcast: 0.43 }[a.clouds] - (a.surface === 'storm' ? 0.03 : 0);
    // The map is unrolled evenly by angle from the cap's centre, so detail holds out to the horizon.
    const unfold = (px: number, pz: number): [number, number, number] => {
      const rho = Math.hypot(px, pz), angle = Math.min(rho, 1.2) * capAngle;
      const lateral = rho > 1e-6 ? Math.sin(angle) / rho : 0;
      return [px * lateral, Math.cos(angle), pz * lateral];
    };
    const SIZE = 1280;
    const dayCanvas = document.createElement('canvas');
    dayCanvas.width = dayCanvas.height = SIZE;
    const dayContext = dayCanvas.getContext('2d')!;
    const image = dayContext.createImageData(SIZE, SIZE);
    const pixels = image.data;
    const warp = { wisps: 0.3, fronts: 0.9, popcorn: 0.05, overcast: 0.18 }[a.clouds];
    const stormX = jitter(0.3), stormZ = 0.15 + jitter(0.2);
    for (let row = 0; row < SIZE; row++) {
      const pz = -((1 - row / (SIZE - 1)) * 2 - 1);
      for (let column = 0; column < SIZE; column++) {
        const px = column / (SIZE - 1) * 2 - 1;
        const index = (row * SIZE + column) * 4;
        pixels[index + 3] = 255;
        const [x, y, z] = unfold(px, pz);
        const height = elevation(x, y, z);
        let r: number, g: number, b: number;
        if (a.surface === 'ice') {
          const lead = fbm(x * 9 + 40, y * 9, z * 9, 3);
          const crack = Math.abs(lead - 0.5) < 0.025 || height < landLevel + 0.08;
          const shade = 0.86 + height * 0.2;
          r = crack ? 24 : 205 * shade; g = crack ? 54 : 222 * shade; b = crack ? 98 : 236 * shade;
        } else if (height > landLevel) {
          const up = Math.min(1, (height - landLevel) / 0.22);
          if (a.surface === 'desert') { r = mix(204, 150, up); g = mix(160, 88, up); b = mix(100, 58, up); }
          else if (up < 0.45) { r = mix(74, 118, up / 0.45); g = mix(128, 132, up / 0.45); b = mix(62, 70, up / 0.45); }
          else if (up < 0.85) { r = mix(118, 182, (up - 0.45) / 0.4); g = mix(132, 156, (up - 0.45) / 0.4); b = mix(70, 104, (up - 0.45) / 0.4); }
          else { r = g = b = mix(190, 244, (up - 0.85) / 0.15); }
        } else {
          const depth = Math.min(1, (landLevel - height) / 0.14);
          const teal = a.surface === 'desert' ? 1 : 0;
          r = mix(52, 16, depth); g = mix(132 + teal * 24, 56 + teal * 22, depth); b = mix(196 - teal * 30, 128 - teal * 18, depth);
        }
        // Clouds: warped noise, with a spiral arm pattern stirred in for the cyclone.
        const wx = x + (fbm(x * 3 + 7, y * 3, z * 3, 3) - 0.5) * warp;
        const wz = z + (fbm(x * 3, y * 3 + 9, z * 3, 3) - 0.5) * warp;
        const frequency = a.clouds === 'popcorn' ? 26 : a.clouds === 'fronts' ? 5 : 8;
        let cloud = fbm(wx * frequency + 3, y * frequency, wz * (a.clouds === 'fronts' ? frequency * 2.2 : frequency) + 17, a.clouds === 'popcorn' ? 3 : 5);
        if (a.clouds === 'popcorn') cloud = cloud * 0.75 + fbm(x * 4, y * 4, z * 4 + 31, 2) * 0.25;
        if (a.surface === 'storm') {
          const dx = x - stormX, dz = z - stormZ, distance = Math.hypot(dx, dz);
          if (distance < 0.5) {
            const arms = 0.5 + 0.5 * Math.sin(Math.atan2(dz, dx) * 2 - Math.log(distance + 0.02) * 4.2);
            const fall = 1 - distance / 0.5;
            cloud += fall * (0.1 + 0.34 * arms) * (distance < 0.022 ? -1.5 : 1);
          }
        }
        const amount = Math.min(1, Math.max(0, (cloud - cover) / 0.11));
        const white = 238 + amount * 17;
        r = r + (white - r) * amount * 0.96; g = g + (white - g) * amount * 0.96; b = b + (white - b) * amount * 0.96;
        pixels[index] = r; pixels[index + 1] = g; pixels[index + 2] = b;
      }
    }
    dayContext.putImageData(image, 0, 0);
    const dayMap = new THREE.CanvasTexture(dayCanvas);
    dayMap.colorSpace = THREE.SRGBColorSpace;
    dayMap.anisotropy = 8;

    // Night lights: cities are only placed where the land is.
    const nightCanvas = document.createElement('canvas');
    nightCanvas.width = nightCanvas.height = SIZE;
    const night = nightCanvas.getContext('2d')!;
    night.fillStyle = '#000000';
    night.fillRect(0, 0, SIZE, SIZE);
    const towns: [number, number, number][] = [];
    if (a.lights !== 'wild') {
      const tries = Math.round({ web: 1500, coast: 1100, fires: 420, wild: 0 }[a.lights] * mix(0.6, 1.4, mood.density));
      for (let i = 0; i < tries; i++) {
        const u = random(), v = random();
        if (Math.hypot(u * 2 - 1, v * 2 - 1) > 1) continue;
        const [x, y, z] = unfold(u * 2 - 1, -((1 - v) * 2 - 1));
        const height = elevation(x, y, z);
        const land = a.surface === 'ice' ? height - landLevel - 0.08 : height - landLevel;
        if (land < 0 || land > (a.lights === 'coast' ? 0.03 : a.lights === 'web' ? 0.12 : 0.2)) continue;
        const size = a.lights === 'web' ? 4 + random() ** 3 * 34 : a.lights === 'coast' ? 2 + random() ** 2 * 9 : 2 + random() * 7;
        towns.push([u * SIZE, v * SIZE, size]);
        const dots = Math.round(size * (a.lights === 'fires' ? 1.2 : 4));
        for (let k = 0; k < dots; k++) {
          const radius = size * Math.sqrt(random()) * (0.4 + random()), angle = random() * 7;
          night.fillStyle = a.lights === 'fires' ? `rgba(255,${90 + random() * 80},30,${0.5 + random() * 0.5})` : `rgba(255,${196 + random() * 44},${110 + random() * 70},${0.45 + random() * 0.55})`;
          night.fillRect(u * SIZE + Math.cos(angle) * radius, v * SIZE + Math.sin(angle) * radius, 1.6 + random() * 1.6, 1.6 + random() * 1.6);
        }
        if (size > 14) { const core = night.createRadialGradient(u * SIZE, v * SIZE, 0, u * SIZE, v * SIZE, size * 0.7); core.addColorStop(0, 'rgba(255,225,160,0.85)'); core.addColorStop(1, 'rgba(255,200,120,0)'); night.fillStyle = core; night.fillRect(u * SIZE - size, v * SIZE - size, size * 2, size * 2); }
      }
      if (a.lights === 'web') {
        night.strokeStyle = 'rgba(255,205,130,0.4)';
        night.lineWidth = 1.3;
        for (const [x, y, size] of towns) {
          if (size < 9) continue;
          for (const [ox, oy, other] of towns) {
            const gap = Math.hypot(ox - x, oy - y);
            if (other >= size || gap > 110 || gap < 8) continue;
            night.beginPath(); night.moveTo(x, y); night.quadraticCurveTo((x + ox) / 2 + jitter(18), (y + oy) / 2 + jitter(18), ox, oy); night.stroke();
          }
        }
      }
      if (a.lights === 'fires') for (let i = 0; i < 26; i++) {
        const x = random() * SIZE, y = random() * SIZE, size = 8 + random() * 22;
        const flash = night.createRadialGradient(x, y, 0, x, y, size);
        flash.addColorStop(0, 'rgba(200,220,255,0.9)'); flash.addColorStop(1, 'rgba(140,170,255,0)');
        night.fillStyle = flash; night.fillRect(x - size, y - size, size * 2, size * 2);
      }
    }
    const nightMap = new THREE.CanvasTexture(nightCanvas);
    nightMap.colorSpace = THREE.SRGBColorSpace;
    nightMap.anisotropy = 8;

    const haze = new THREE.Color(a.limb === 'hazy' ? '#a8d4ff' : '#6fbcff');
    const nightTint = new THREE.Color(paper ? '#39507a' : a.backdrop === 'dusk' ? '#1c2a52' : a.backdrop === 'black' ? '#04070f' : '#0c1630');
    const shared = { uSun: { value: sun }, uWarm: { value: warm }, uHaze: { value: haze }, uNight: { value: nightTint } };
    const cap = (radius: number) => {
      const geometry = new THREE.SphereGeometry(radius, 128, 64, 0, Math.PI * 2, 0, capAngle);
      const { position, uv } = geometry.attributes;
      for (let i = 0; i < uv.count; i++) {
        const x = position.getX(i), z = position.getZ(i), flat = Math.hypot(x, z);
        const rho = Math.acos(THREE.MathUtils.clamp(position.getY(i) / radius, -1, 1)) / capAngle;
        uv.setXY(i, 0.5 + (flat > 1e-6 ? x / flat : 0) * rho / 2, 0.5 - (flat > 1e-6 ? z / flat : 0) * rho / 2);
      }
      return geometry;
    };
    const planet = new THREE.Mesh(cap(R), new THREE.ShaderMaterial({
      vertexShader: PLANET_VERTEX, fragmentShader: PLANET_FRAGMENT,
      uniforms: { ...shared, uMap: { value: dayMap }, uLights: { value: nightMap }, uLift: { value: paper ? 0.3 : a.backdrop === 'dusk' ? 0.15 : a.backdrop === 'black' ? 0.04 : 0.09 }, uCity: { value: mix(1.5, 3.2, mood.cheer) } },
    }));
    const globe = new THREE.Group();
    globe.position.copy(centre);
    globe.rotation.x = reachAngle;
    globe.add(planet);
    root.add(globe);

    // The atmosphere: a thin shell that only shows where the view grazes it.
    const air = (thickness: number, strength: number, outer: string, bands: number, inner = haze) => {
      const radius = R * (1 + thickness);
      const shell = new THREE.Mesh(cap(radius), new THREE.ShaderMaterial({
        vertexShader: PLANET_VERTEX, fragmentShader: AIR_FRAGMENT, transparent: true, depthWrite: false,
        uniforms: { ...shared, uHaze: { value: inner }, uOuter: { value: new THREE.Color(outer) }, uGraze: { value: Math.sqrt(1 - 1 / (1 + thickness) ** 2) }, uStrength: { value: strength }, uBands: { value: bands } },
      }));
      globe.add(shell);
    };
    if (a.limb === 'thin') air(0.016, 1.15, '#3f86ff', 0.35);
    if (a.limb === 'layered') { air(0.03, 1.1, '#2f6cf0', 1); air(0.012, 0.9, '#ffd070', 1, warm.clone().lerp(new THREE.Color('#ffe9a0'), 0.4)); }
    if (a.limb === 'airglow') { air(0.02, 1.05, '#3f86ff', 0.3); air(0.042, 0.4, '#3cff8a', 0, new THREE.Color('#2fe070')); }
    if (a.limb === 'hazy') air(0.06, 1.0, '#5fa0ff', 0.5);

    // Stars sit far behind everything; on paper they print as ink dots.
    const starCount = Math.round(mix(60, 300, mood.density) * (a.backdrop === 'dusk' ? 0.6 : 1));
    const stars = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), starCount);
    const matrix = new THREE.Matrix4();
    const tint = new THREE.Color();
    for (let i = 0; i < starCount; i++) {
      const at = camera.position.clone().addScaledVector(view(jitter(2.3), -0.3 + random() * 1.4), 520 + random() * 200);
      const size = (0.45 + random() ** 3 * 1.5) * (paper ? 1.2 : 1);
      matrix.makeScale(size, size, size).setPosition(at);
      stars.setMatrixAt(i, matrix);
      stars.setColorAt(i, paper ? tint.set('#4a5270') : tint.setHSL(random() < 0.5 ? 0.6 : 0.1, 0.5, 0.82 + random() * 0.18));
    }
    stars.frustumCulled = false;
    root.add(stars);

    // ---- Company: whatever else shares the frame. ----
    const dressing = new THREE.Group();
    dressing.position.copy(camera.position);
    dressing.quaternion.copy(camera.quaternion);
    root.add(dressing);
    const solid = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = dressing) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const white = new THREE.MeshStandardMaterial({ color: '#e9e7df', roughness: 0.8 });
    const steel = new THREE.MeshStandardMaterial({ color: '#b4b9be', metalness: 0.7, roughness: 0.4 });
    const gold = new THREE.MeshStandardMaterial({ color: '#d3a534', metalness: 0.8, roughness: 0.3 });
    const meteors: THREE.Mesh[] = [];
    let drifters: THREE.InstancedMesh | null = null;
    if (a.company === 'truss') {
      const truss = new THREE.Group();
      truss.position.set(8.4, 8.2, -27);
      truss.rotation.set(0.25, -0.35, -0.6);
      dressing.add(truss);
      const length = 20, width = 1.1;
      for (const y of [-1, 1]) for (const z of [-1, 1]) solid(new THREE.BoxGeometry(length, 0.14, 0.14), steel, truss).position.set(0, y * width / 2, z * width / 2);
      for (let i = 0; i <= 12; i++) {
        const x = -length / 2 + i * (length / 12);
        solid(new THREE.BoxGeometry(0.1, width, 0.1), steel, truss).position.set(x, 0, width / 2);
        solid(new THREE.BoxGeometry(0.1, width, 0.1), steel, truss).position.set(x, 0, -width / 2);
        if (i < 12) { const brace = solid(new THREE.BoxGeometry(0.08, Math.hypot(width, length / 12), 0.08), steel, truss); brace.position.set(x + length / 24, 0, width / 2); brace.rotation.z = (i % 2 ? 1 : -1) * Math.atan2(length / 12, width); }
      }
      const cellCanvas = document.createElement('canvas');
      cellCanvas.width = 256; cellCanvas.height = 128;
      const c = cellCanvas.getContext('2d')!;
      c.fillStyle = '#b8842c'; c.fillRect(0, 0, 256, 128);
      for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { c.fillStyle = (x + y) % 5 ? '#1b2f72' : '#243a86'; c.fillRect(x * 16 + 1.5, y * 32 + 2, 13, 28); }
      const cellMap = new THREE.CanvasTexture(cellCanvas);
      cellMap.colorSpace = THREE.SRGBColorSpace;
      const cells = new THREE.MeshStandardMaterial({ map: cellMap, metalness: 0.4, roughness: 0.4, emissive: '#16308a', emissiveIntensity: 0.25, side: THREE.DoubleSide });
      for (const [x, tilt] of [[-5.2, 0.5], [-1.6, 0.42]] as const) {
        const wing = solid(new THREE.BoxGeometry(2.6, 9.5, 0.06), cells, truss);
        wing.position.set(x, -5.6, 0.2);
        wing.rotation.set(tilt, 0.2, 0);
        solid(new THREE.BoxGeometry(0.12, 1.2, 0.12), steel, truss).position.set(x, -0.9, 0);
      }
      const radiator = solid(new THREE.BoxGeometry(3.2, 0.06, 4.4), white, truss);
      radiator.position.set(3.6, 0.4, -2.9);
      radiator.rotation.x = 0.4;
    }
    if (a.company === 'hatch') {
      const rim = solid(new THREE.TorusGeometry(10.5, 1.5, 14, 80), white);
      rim.position.set(14.2, -14.8, -26);
      rim.rotation.set(0.25, -0.3, 0);
      const rail = solid(new THREE.TorusGeometry(9.1, 0.11, 8, 80, 1.2), gold);
      rail.position.set(14.0, -14.6, -24.8);
      rail.rotation.set(0.25, -0.3, 1.95);
      for (let i = 0; i < 7; i++) {
        const angle = 1.9 + i * 0.2;
        const bolt = solid(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 8), steel, rim);
        bolt.position.set(Math.cos(angle) * 10.5, Math.sin(angle) * 10.5, 1.5);
        bolt.rotation.x = Math.PI / 2;
      }
    }
    if (a.company === 'moon') {
      const moon = solid(new THREE.SphereGeometry(13, 40, 24), new THREE.MeshStandardMaterial({ color: '#cfccc4', roughness: 1 }), root);
      moon.castShadow = moon.receiveShadow = false;
      moon.position.copy(camera.position).addScaledVector(view(fromLeft ? 0.55 : -0.55, 0.62), 430);
      for (let i = 0; i < 14; i++) {
        const spot = solid(new THREE.SphereGeometry(1.5 + random() * 3, 12, 8), new THREE.MeshStandardMaterial({ color: '#a9a69f', roughness: 1 }), moon);
        spot.castShadow = false;
        spot.position.setFromSphericalCoords(12.2, 0.5 + random() * 2.1, random() * 6.3);
        spot.scale.z = 0.5;
        spot.lookAt(moon.position);
      }
    }
    if (a.company === 'meteors') {
      const streak = new THREE.MeshBasicMaterial({ color: '#ffe6b0' });
      for (let i = 0; i < 40 && meteors.length < Math.round(mix(3, 9, mood.energy)); i++) {
        const normal = onGlobe(reachAngle * (0.15 + random() * 0.7), jitter(0.9));
        if (normal.dot(sun) > -0.05) continue;
        const meteor = solid(new THREE.CylinderGeometry(0.02, 0.14, 3 + random() * 4, 6), streak, root);
        meteor.castShadow = false;
        meteor.position.copy(centre).addScaledVector(normal, R * 1.006);
        const along = new THREE.Vector3(jitter(1), 0, jitter(1)).cross(normal).normalize();
        meteor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), along);
        meteors.push(meteor);
      }
    }
    const fleckCount = Math.round((a.company === 'debris' ? 150 : 14) * mix(0.5, 1.5, mood.density) * mix(0.7, 1.4, mood.wear));
    drifters = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#f2f4f6', metalness: 0.5, roughness: 0.3, emissive: '#aebcd0', emissiveIntensity: 0.35 }), fleckCount);
    for (let i = 0; i < fleckCount; i++) {
      const at = camera.position.clone().addScaledVector(view(jitter(2), jitter(2)), 14 + random() * 34);
      if (at.distanceTo(centre) < R + 1.5) at.sub(centre).setLength(R + 1.5 + random() * 3).add(centre);
      const size = 0.03 + random() ** 2 * 0.13;
      matrix.makeRotationFromEuler(new THREE.Euler(random() * 6, random() * 6, 0)).scale(new THREE.Vector3(size, size * (0.3 + random()), size)).setPosition(at);
      drifters.setMatrixAt(i, matrix);
    }
    drifters.frustumCulled = false;
    root.add(drifters);

    // ---- The cast: a loose arc rising from the near hero up along the limb. ----
    // [screen x, screen y, share of the frame, preferred distance]
    const slots: readonly (readonly [number, number, number, number])[] = [
      [-0.3, -0.36, 0.36, 30],
      [0.38, -0.08, 0.22, 46],
      [-0.56, 0.36, 0.18, 62],
      [0.1, 0.56, 0.16, 70],
      [0.7, 0.3, 0.15, 64],
      [-0.02, 0.1, 0.13, 58],
    ];
    const span = 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const placed: { holder: THREE.Object3D; base: THREE.Vector3; phase: number; turn: number }[] = [];
    const flip = fromLeft ? 1 : -1;

    const place = (items: readonly Placeable[]) => {
      placed.length = 0;
      const middle = new THREE.Vector3();
      let reach = 8;
      items.forEach((item, index) => {
        const [sx, sy, share, want] = slots[index % slots.length];
        const ray = view(sx * flip + jitter(0.06), sy + jitter(0.05));
        // Stay clear of the surface: stop short of where this sight line meets the planet.
        const hit = meets(ray, 1);
        const distance = Math.min(want, hit / (1 + 0.8 * share * span));
        const size = share * span * distance * (index >= slots.length ? 0.7 : 1);
        const natural = Math.max(item.height, item.radius * 2, 0.05);
        const scale = size / natural;
        const holder = item.holder;
        holder.scale.setScalar(scale);
        holder.rotation.set(jitter(0.3), flip * -0.35 + jitter(0.7), jitter(0.35));
        const up = new THREE.Vector3(0, 1, 0).applyEuler(holder.rotation);
        const at = camera.position.clone().addScaledVector(ray, distance);
        holder.position.copy(at).addScaledVector(up, -item.height * scale * 0.5);
        holder.updateMatrixWorld(true);
        placed.push({ holder, base: holder.position.clone(), phase: random() * 6, turn: jitter(1) });
        middle.add(at);
        reach = Math.max(reach, size);
        if (item.hero) {
          // The nearest thing catches the first light.
          glint.position.copy(at).addScaledVector(sun, size * 1.1).addScaledVector(ray, -size * 0.6);
          glint.intensity = 1.6 * (size * 1.25) ** 2;
          glint.distance = size * 4;
        }
      });
      if (items.length) middle.divideScalar(items.length);
      else middle.set(0, 2, 30);
      let radius = reach;
      for (const { base } of placed) radius = Math.max(radius, base.distanceTo(middle) + reach);
      key.target.position.copy(middle);
      key.position.copy(middle).addScaledVector(sun, radius * 3);
      earthshine.target.position.copy(middle);
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -radius;
      shadow.right = shadow.top = radius;
      shadow.near = 1;
      shadow.far = radius * 6;
      shadow.updateProjectionMatrix();
    };

    const pace = mix(0.1, 1, mood.energy);
    return {
      object: root,
      camera,
      background,
      capacity: slots.length,
      ground: planet,
      keyLight: key,
      place,
      update(dt, time) {
        for (const item of placed) {
          item.holder.position.copy(item.base);
          item.holder.position.y += Math.sin(time * 0.35 * pace + item.phase) * 0.25;
          item.holder.rotation.z += dt * 0.03 * pace * item.turn;
        }
        meteors.forEach((meteor, index) => { meteor.visible = Math.sin(time * (1.3 + index * 0.37) * (0.5 + pace) + index * 2.1) > -0.2; });
        if (drifters) drifters.rotation.z = Math.sin(time * 0.05 * pace) * 0.01;
      },
      dispose() {
        key.shadow.map?.dispose();
        dayMap.dispose();
        nightMap.dispose();
        disposeTree(root);
      },
    };
  },
});
