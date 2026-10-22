import * as THREE from 'three';
import { type Placeable, choice, defineWorld, disposeTree, mix } from '@conjure/kit';
import { plasmaPaint, strand } from './plasma';

const STARS = {
  yellow: 'A yellow dwarf like the Sun: white-gold at your feet, deepening to orange at the horizon.',
  white: 'A hotter blue-white star: dazzling white surface, violet limb, blue-white loops.',
  red: 'A red dwarf: an ember-orange surface, a crimson limb and blood-red loops.',
} as const;
const STAR: Record<keyof typeof STARS, { hot: string; mid: string; limb: string; chromo: string; loopBase: string; loopCrown: string; light: string }> = {
  yellow: { hot: '#fffbf0', mid: '#ffdc84', limb: '#e8861a', chromo: '#ff5c6c', loopBase: '#fffbe6', loopCrown: '#ff6a10', light: '#ffe2b0' },
  white: { hot: '#fffdf6', mid: '#eef1ff', limb: '#8292e2', chromo: '#b86cff', loopBase: '#f4f8ff', loopCrown: '#2f6cff', light: '#eef4ff' },
  red: { hot: '#ffdcb6', mid: '#ff9a52', limb: '#b8360e', chromo: '#ff2a3c', loopBase: '#ffe6cc', loopCrown: '#c8200a', light: '#ffc89a' },
};
const GLARES = {
  washed: 'Blinding: the sky washed almost white by the glare.',
  pearl: 'A pale pearly sky with long coronal streamers fanning up from the limb.',
  amber: 'A warm amber haze, like looking through smoked gold.',
  dusk: 'A darker violet-grey sky, as if through a filter, the corona glowing against it.',
} as const;
const GLARE: Record<keyof typeof GLARES, { top: string; horizon: string; corona: string; streamers: number; strength: number }> = {
  washed: { top: '#f1ece2', horizon: '#fffdf7', corona: '#ffffff', streamers: 0.25, strength: 1.0 },
  pearl: { top: '#d5d9e0', horizon: '#f4f1ea', corona: '#fffaf0', streamers: 1.0, strength: 0.85 },
  amber: { top: '#e6c9a2', horizon: '#fff0d2', corona: '#fff6e2', streamers: 0.45, strength: 0.9 },
  dusk: { top: '#615a7c', horizon: '#b9a8bc', corona: '#fff0d8', streamers: 0.8, strength: 1.0 },
};

const R = 300;
const FOV = 52;

const SURFACE_VERTEX = /* glsl */ `
  varying vec3 vP; varying vec3 vN;
  void main() {
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vP = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }`;
const SURFACE_FRAGMENT = /* glsl */ `
  uniform vec3 uHot; uniform vec3 uMid; uniform vec3 uLimb;
  uniform float uTime; uniform float uScale; uniform float uPlage; uniform float uSeed;
  varying vec3 vP; varying vec3 vN;
  vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
    return fract(sin(p + uSeed) * 43758.5453);
  }
  vec3 worley(vec3 p, float t) {
    vec3 i = floor(p); vec3 f = fract(p);
    float d1 = 8.0, d2 = 8.0, id = 0.0;
    for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
      vec3 g = vec3(float(x), float(y), float(z));
      vec3 o = hash3(i + g);
      o = 0.5 + 0.42 * sin(t + 6.2831 * o);
      vec3 r = g + o - f;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; id = hash3(i + g + 7.0).x; } else if (d < d2) { d2 = d; }
    }
    return vec3(sqrt(d1), sqrt(d2), id);
  }
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vP);
    float mu = clamp(dot(N, V), 0.0, 1.0);
    float dist = length(cameraPosition - vP);
    float detail = 1.0 - smoothstep(30.0, 120.0, dist);
    vec3 w = worley(vP * uScale, uTime * 0.35);
    float lanes = smoothstep(0.0, 0.35, w.y - w.x);
    float cellLight = mix(0.84, 1.08, w.z) * (0.94 + 0.1 * (1.0 - w.x));
    vec3 sup = worley(vP * uScale * 0.09 + 17.0, uTime * 0.03);
    float mottle = 0.93 + 0.07 * smoothstep(0.0, 0.5, sup.x);
    vec3 blot = worley(vP * uScale * 0.025 + 41.0, 0.0);
    float plage = smoothstep(0.6, 0.15, sup.x) * smoothstep(0.55, 0.2, blot.x) * step(0.35, sup.z) * uPlage;
    vec3 base = mix(uLimb, uMid, smoothstep(0.0, 0.3, mu));
    base = mix(base, uHot, smoothstep(0.22, 0.8, mu));
    vec3 lane = mix(base, uLimb, 0.38) * 0.93;
    vec3 colour = mix(lane, base * cellLight, mix(1.0, lanes, 0.15 + 0.7 * detail));
    colour *= mottle;
    colour = mix(colour, uHot * 1.08, clamp(plage, 0.0, 1.0) * 0.65);
    colour *= mix(0.8, 1.0, pow(mu, 0.35));
    gl_FragColor = vec4(colour, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
const RIM_FRAGMENT = /* glsl */ `
  uniform vec3 uColour; uniform float uPower; uniform float uStrength;
  varying vec3 vP; varying vec3 vN;
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vP);
    float graze = 1.0 - clamp(abs(dot(N, V)), 0.0, 1.0);
    gl_FragColor = vec4(uColour, pow(graze, uPower) * uStrength);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
const SKY_VERTEX = /* glsl */ `
  varying vec3 vP;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vP = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }`;
const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uCorona; uniform vec3 uCentre;
  uniform float uLimb; uniform float uStreamers; uniform float uStrength; uniform float uSeed; uniform float uTime;
  varying vec3 vP;
  void main() {
    vec3 dir = normalize(vP - cameraPosition);
    vec3 toStar = normalize(uCentre - cameraPosition);
    float angle = acos(clamp(dot(dir, toStar), -1.0, 1.0));
    float e = max(angle - uLimb, 0.0);
    vec3 side = normalize(cross(toStar, vec3(1.0, 0.0, 0.0)));
    vec3 other = cross(toStar, side);
    float az = atan(dot(dir, other), dot(dir, side));
    float rays = 0.5 + 0.5 * sin(az * 13.0 + uSeed + sin(az * 5.0 + uSeed * 2.0) * 1.5);
    rays *= 0.6 + 0.4 * sin(az * 29.0 - uSeed * 1.3);
    // Helmet streamers: broad petals at the limb, tapering as they rise.
    float streamers = pow(rays, 2.5 + e * 10.0) * exp(-e / 0.35) * uStreamers;
    float corona = exp(-e / 0.025) * 0.9 + exp(-e / 0.12) * 0.5 + exp(-e / 0.45) * 0.2 + streamers * 0.45;
    vec3 colour = mix(uTop, uHorizon, exp(-e / 0.6));
    colour = mix(colour, uCorona, clamp(corona * uStrength, 0.0, 1.0));
    gl_FragColor = vec4(colour, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

export default defineWorld({
  questions: {
    activity: choice('How active is the star?', {
      quiet: 'Quiet minimum: a calm boiling surface and a few faint low loops.',
      looping: 'Active: arcades of bright plasma loops arching over the horizon.',
      storm: 'A flaring storm: blazing loops, a white flash and an eruption tearing away from the limb.',
    }),
    star: choice('What colour is the star?', STARS),
    glare: choice('What is the sky like above the limb?', GLARES),
    vantage: choice('How close is the pass?', {
      skimming: 'Skimming so low the horizon is a long gentle curve and the loops tower overhead.',
      diving: 'Diving in, looking down at the boiling surface, the horizon bending across the top.',
      distant: 'A little further out: the limb a great dome, half the view open sky.',
    }),
    below: choice('What lies on the surface right beneath us?', {
      granules: 'Only the boiling granules, cell after cell to the horizon.',
      sunspots: 'A dark sunspot group, black cores in brown fringes.',
      filament: 'A long dark filament snaking across the fire toward the horizon.',
      plage: 'Bright white plage, a glittering network of hot magnetic patches.',
    }),
    passing: choice('What else is passing through?', {
      nothing: 'Nothing: only the star and what we brought.',
      comet: 'A sungrazing comet diving toward the limb, its tail streaming back.',
      probe: 'A tiny spacecraft far off, a glint on its shield.',
      debris: 'A glitter of dust and ice motes streaming past.',
      planet: 'A small dark planet crossing in silhouette against the corona.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * amount;
    const root = new THREE.Group();
    const star = STAR[a.star];
    const glare = GLARE[a.glare];
    const tintSky = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color(star.mid), 0.12);
    const background = tintSky(glare.top);

    // ---- The camera skims over the top of the star, pitched down at the limb. ----
    const alt = { skimming: 0.08, diving: 0.15, distant: 0.42 }[a.vantage] * R;
    const pitch = THREE.MathUtils.degToRad({ skimming: 30, diving: 42, distant: 40 }[a.vantage]);
    const centre = new THREE.Vector3(0, -R, 0);
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 6000);
    camera.position.set(0, alt, 0);
    camera.rotation.set(-pitch, 0, THREE.MathUtils.degToRad(jitter(5)), 'YXZ');
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const d = R + alt;
    const horizonAngle = Math.acos(R / d);
    const up = new THREE.Vector3(0, 1, 0);
    const onStar = (theta: number, phi: number, lift = 0) => new THREE.Vector3(Math.sin(theta) * Math.sin(phi), Math.cos(theta), -Math.sin(theta) * Math.cos(phi)).multiplyScalar(R + lift).add(centre);
    const view = (sx: number, sy: number) => new THREE.Vector3(sx, sy, 0.5).unproject(camera).sub(camera.position).normalize();
    /** Where a sight line meets the star (plus a margin), or Infinity above the limb. */
    const meets = (ray: THREE.Vector3, margin: number) => {
      const offset = camera.position.clone().sub(centre);
      const b = ray.dot(offset), discriminant = b * b - (offset.lengthSq() - (R + margin) ** 2);
      return discriminant > 0 ? -b - Math.sqrt(discriminant) : Infinity;
    };

    // ---- Light: the star blazes from below; the glare fills from above. ----
    root.add(new THREE.HemisphereLight(tintSky(glare.horizon), new THREE.Color(star.mid), 1.25));
    const key = new THREE.DirectionalLight(new THREE.Color(star.light).lerp(new THREE.Color('#ff9a40'), mood.warmth * 0.25), 2.4);
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight('#ffffff', 0.55);
    fill.position.copy(camera.position);
    root.add(fill, fill.target);

    // ---- The sky dome: glare, corona and streamers, brightest at the limb. ----
    const skyMaterial = new THREE.ShaderMaterial({
      vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, side: THREE.BackSide, depthWrite: false,
      uniforms: {
        uTop: { value: background }, uHorizon: { value: tintSky(glare.horizon) }, uCorona: { value: new THREE.Color(glare.corona).lerp(new THREE.Color(star.mid), 0.1) },
        uCentre: { value: centre }, uLimb: { value: Math.asin(R / d) }, uStreamers: { value: glare.streamers * (a.activity === 'storm' ? 1.4 : a.activity === 'quiet' ? 0.6 : 1) },
        uStrength: { value: glare.strength * mix(0.85, 1.1, mood.cheer) }, uSeed: { value: random() * 10 }, uTime: { value: 0 },
      },
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 64, 32), skyMaterial);
    sky.position.copy(camera.position);
    sky.renderOrder = -10;
    sky.frustumCulled = false;
    root.add(sky);

    // ---- The photosphere: a cap of the star, boiling granules, darkening to its limb. ----
    const capAngle = Math.min(horizonAngle + 0.06, Math.PI / 2);
    const surfaceMaterial = new THREE.ShaderMaterial({
      vertexShader: SURFACE_VERTEX, fragmentShader: SURFACE_FRAGMENT,
      uniforms: {
        uHot: { value: new THREE.Color(star.hot) }, uMid: { value: new THREE.Color(star.mid) }, uLimb: { value: new THREE.Color(star.limb).lerp(new THREE.Color('#ff7020'), mood.warmth * 0.15) },
        uTime: { value: 0 }, uScale: { value: 1.5 }, uPlage: { value: a.below === 'plage' ? 1.2 : a.activity === 'quiet' ? 0.2 : 0.5 }, uSeed: { value: random() * 50 },
      },
    });
    const surface = new THREE.Mesh(new THREE.SphereGeometry(R, 320, 140, 0, Math.PI * 2, 0, capAngle), surfaceMaterial);
    surface.position.copy(centre);
    surface.receiveShadow = true;
    root.add(surface);
    // The chromosphere: a thin coloured rim along the limb, and a fringe of spicules.
    const rim = (radius: number, colour: string, power: number, strength: number) => {
      const shell = new THREE.Mesh(new THREE.SphereGeometry(radius, 256, 96, 0, Math.PI * 2, 0, Math.min(capAngle + 0.04, Math.PI / 2)), new THREE.ShaderMaterial({
        vertexShader: SURFACE_VERTEX, fragmentShader: RIM_FRAGMENT, transparent: true, depthWrite: false,
        uniforms: { uColour: { value: new THREE.Color(colour) }, uPower: { value: power }, uStrength: { value: strength } },
      }));
      shell.position.copy(centre);
      root.add(shell);
    };
    rim(R * 1.004, star.chromo, 10, 0.9);
    rim(R * 1.03, glare.corona, 5, 0.55);
    const spiculeCount = Math.round(mix(500, 1100, mood.density));
    const spicules = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color(star.chromo).lerp(new THREE.Color(star.hot), 0.35) }), spiculeCount);
    const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3();
    for (let i = 0; i < spiculeCount; i++) {
      const phi = jitter(1.4), theta = horizonAngle + mix(-0.012, 0.006, random());
      const base = onStar(theta, phi);
      const normal = base.clone().sub(centre).normalize();
      const h = mix(0.8, 3.2, random() ** 2) * (a.activity === 'storm' ? 1.3 : 1);
      quaternion.setFromUnitVectors(up, normal.clone().add(new THREE.Vector3(jitter(0.3), 0, jitter(0.3))).normalize());
      spicules.setMatrixAt(i, matrix.compose(base.addScaledVector(normal, h / 2), quaternion, scale.set(0.18, h, 0.18)));
    }
    spicules.frustumCulled = false;
    root.add(spicules);

    // ---- Plasma loops rising over the horizon. ----
    const plasma: THREE.ShaderMaterial[] = [];
    const paint = (options: Parameters<typeof plasmaPaint>[0]) => {
      const material = plasmaPaint(options);
      plasma.push(material);
      return material;
    };
    const energy = mood.energy;
    const loop = (phi: number, theta: number, width: number, height: number, thickness: number, opacity: number, lean = 0) => {
      const middle = onStar(theta, phi);
      const normal = middle.clone().sub(centre).normalize();
      const along = new THREE.Vector3(Math.cos(phi), 0, Math.sin(phi)).applyAxisAngle(normal, jitter(0.6));
      const toward = normal.clone().cross(along).normalize();
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 20; i++) {
        const t = i / 20, arc = Math.sin(Math.PI * t);
        const p = middle.clone().addScaledVector(along, (t - 0.5) * width);
        p.sub(centre).setLength(R).add(centre);
        p.addScaledVector(normal, arc * height).addScaledVector(toward, arc * lean * height);
        points.push(p);
      }
      const mesh = new THREE.Mesh(strand(points, { radius: (t) => thickness * (0.75 + 0.25 * Math.sin(Math.PI * t)), rings: 40, sides: 8 }), paint({
        base: star.loopBase, crown: star.loopCrown, arch: 1, gamma: 0.55, glow: 1.15, opacity, depthWrite: opacity >= 1,
        shimmer: mix(0.08, 0.3, energy), waves: 2, speed: mix(0.1, 0.8, energy), phase: random() * 6.28,
      }));
      root.add(mesh);
      return { middle, normal, along, toward };
    };
    const scaleLoops = a.vantage === 'distant' ? 1.6 : 1;
    const regions = { quiet: 2, looping: 3, storm: 4 }[a.activity];
    const flareSites: { middle: THREE.Vector3; normal: THREE.Vector3; size: number }[] = [];
    for (let r = 0; r < regions; r++) {
      const phi = mix(-0.5, 0.5, (r + 0.5) / regions) + jitter(0.18);
      const theta = horizonAngle + mix(-0.03, 0.02, random());
      const size = R * mix(0.06, 0.12, random()) * scaleLoops * (a.activity === 'quiet' ? 0.45 : a.activity === 'storm' ? 1.15 : 1);
      const count = a.activity === 'quiet' ? 2 : 4 + Math.floor(random() * 4);
      let site = null as ReturnType<typeof loop> | null;
      for (let k = 0; k < count; k++) {
        const nest = 1 - k * 0.14;
        site = loop(phi + jitter(0.03), theta + jitter(0.006), size * nest * mix(0.9, 1.2, random()), size * nest * mix(0.5, 0.85, random()), size * 0.05, a.activity === 'quiet' ? 0.55 : k % 3 === 2 ? 0.7 : 1, jitter(0.6));
      }
      if (site) flareSites.push({ middle: site.middle, normal: site.normal, size });
    }
    if (a.activity === 'storm' && flareSites.length) {
      // The flare: a white flash on one arcade, and an eruption tearing off the limb beside it.
      const site = flareSites[Math.floor(random() * flareSites.length)];
      const flash = new THREE.Mesh(new THREE.SphereGeometry(site.size * 0.45, 24, 16), new THREE.ShaderMaterial({
        vertexShader: SURFACE_VERTEX, transparent: true, depthWrite: false,
        fragmentShader: 'varying vec3 vP; varying vec3 vN; void main() { float facing = abs(dot(normalize(vN), normalize(cameraPosition - vP))); gl_FragColor = vec4(1.0, 1.0, 0.97, pow(facing, 1.5) * 0.95); }',
      }));
      flash.position.copy(site.middle).addScaledVector(site.normal, site.size * 0.2);
      root.add(flash);
      const eruption = flareSites[(flareSites.indexOf(site) + 1) % flareSites.length];
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(eruption.size * 1.1, 40, 24), paint({ base: glare.corona, crown: star.loopCrown, vertical: true, gamma: 0.8, opacity: 0.8, rim: 1, rimPower: 1.6, depthWrite: false, side: THREE.DoubleSide }));
      bulb.position.copy(eruption.middle).addScaledVector(eruption.normal, eruption.size * 1.6);
      bulb.scale.set(1, 1.35, 1);
      bulb.quaternion.setFromUnitVectors(up, eruption.normal);
      root.add(bulb);
      // A twisted bright rope inside the bulb.
      const rope: THREE.Vector3[] = [];
      const east = new THREE.Vector3(1, 0, 0).projectOnPlane(eruption.normal).normalize();
      for (let i = 0; i <= 24; i++) {
        const t = i / 24, angle = Math.PI * t;
        rope.push(eruption.middle.clone().addScaledVector(east, -Math.cos(angle) * eruption.size * 0.5).addScaledVector(eruption.normal, Math.sin(angle) * eruption.size * 1.7));
      }
      root.add(new THREE.Mesh(strand(rope, { radius: () => eruption.size * 0.06, rings: 48, sides: 8 }), paint({ base: '#ffffff', crown: star.loopCrown, arch: 1, gamma: 0.7, glow: 1.2, shimmer: 0.3, waves: 4, speed: 1 })));
    }

    // ---- What lies right beneath us. ----
    const decal = (canvas: HTMLCanvasElement, at: THREE.Vector3, size: number, spin: number) => {
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const normal = at.clone().sub(centre).normalize();
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(size, 40), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
      mesh.position.copy(at).sub(centre).setLength(R + 0.08).add(centre);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      mesh.rotateZ(spin);
      root.add(mesh);
    };
    const spotCanvas = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const g = canvas.getContext('2d')!;
      const pen = g.createRadialGradient(128, 128, 30, 128, 128, 126);
      pen.addColorStop(0, 'rgba(90,40,14,0.95)');
      pen.addColorStop(0.8, 'rgba(150,80,30,0.85)');
      pen.addColorStop(1, 'rgba(180,110,50,0)');
      g.fillStyle = pen;
      g.fillRect(0, 0, 256, 256);
      g.lineCap = 'round';
      for (let i = 0; i < 220; i++) {
        const angle = (i / 220) * Math.PI * 2 + jitter(0.03);
        const inner = mix(38, 50, random()), outer = mix(84, 112, random());
        g.strokeStyle = random() < 0.5 ? 'rgba(70,30,10,0.35)' : 'rgba(210,140,70,0.3)';
        g.lineWidth = mix(0.8, 1.8, random());
        g.beginPath();
        g.moveTo(128 + Math.cos(angle) * inner, 128 + Math.sin(angle) * inner);
        g.lineTo(128 + Math.cos(angle + jitter(0.05)) * outer, 128 + Math.sin(angle + jitter(0.05)) * outer);
        g.stroke();
      }
      const umbra = g.createRadialGradient(128, 128, 4, 128, 128, 46);
      umbra.addColorStop(0, 'rgba(18,8,4,1)');
      umbra.addColorStop(0.8, 'rgba(40,16,6,1)');
      umbra.addColorStop(1, 'rgba(60,24,8,0)');
      g.fillStyle = umbra;
      g.beginPath();
      g.ellipse(128, 128, 48, 44, random(), 0, Math.PI * 2);
      g.fill();
      return canvas;
    };
    const ground = (sx: number, sy: number) => {
      const ray = view(sx, sy);
      const hit = meets(ray, 0);
      return Number.isFinite(hit) ? camera.position.clone().addScaledVector(ray, hit) : null;
    };
    const spotsAt = (sx: number, sy: number, count: number, size: number) => {
      const anchor = ground(sx, sy);
      if (!anchor) return;
      const normal = anchor.clone().sub(centre).normalize();
      const east = new THREE.Vector3(1, 0, 0).projectOnPlane(normal).normalize();
      const north = normal.clone().cross(east);
      for (let i = 0; i < count; i++) {
        const at = anchor.clone().addScaledVector(east, (i - (count - 1) / 2) * size * 2.6 + jitter(size)).addScaledVector(north, jitter(size * 1.4));
        decal(spotCanvas(), at, size * (i === 0 ? 1.3 : mix(0.5, 1, random())), random() * 6);
      }
    };
    const near = a.vantage === 'distant' ? 6 : a.vantage === 'diving' ? 3.4 : 2.4;
    if (a.below === 'sunspots') spotsAt(jitter(0.4), -0.72, 2 + Math.floor(random() * 3), near);
    if (a.activity !== 'quiet') spotsAt(jitter(0.8), a.vantage === 'distant' ? -0.5 : -0.15, 2, near * 1.6);
    if (a.below === 'filament') {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        const p = ground(mix(-0.7, 0.3, t) + Math.sin(t * 9 + 1) * 0.14 * (1 - t * 0.5), mix(-0.95, -0.05, t ** 0.8));
        if (p) points.push(p.sub(centre).setLength(R + 0.25).add(centre));
      }
      if (points.length > 3) {
        // A dark ribbon lying flat on the surface.
        const path = new THREE.CatmullRomCurve3(points);
        const steps = 90, positions: number[] = [], indices: number[] = [];
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const p = path.getPointAt(t), tangent = path.getTangentAt(t);
          const normal = p.clone().sub(centre).normalize();
          const side = tangent.clone().cross(normal).normalize();
          const width = near * 0.45 * (0.4 + Math.sin(Math.PI * t)) * (1 + 0.3 * Math.sin(t * 23));
          for (const k of [-1, 1]) positions.push(...p.clone().addScaledVector(side, k * width).sub(centre).setLength(R + 0.2).add(centre).toArray());
          if (i < steps) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        root.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: new THREE.Color(star.limb).lerp(new THREE.Color('#240a04'), 0.82), side: THREE.DoubleSide, transparent: true, opacity: 0.92, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })));
      }
    }

    // ---- Whatever else passes through. ----
    const dressing = new THREE.Group();
    root.add(dressing);
    let debris: THREE.InstancedMesh | null = null;
    const debrisData: { at: THREE.Vector3; size: number; spin: number }[] = [];
    if (a.passing === 'comet') {
      const head = camera.position.clone().addScaledVector(view(0.5, 0.55), 420);
      const towards = onStar(horizonAngle, -0.2).sub(head).normalize();
      const nucleus = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff4d0' }));
      nucleus.position.copy(head);
      dressing.add(nucleus);
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 256;
      const g = canvas.getContext('2d')!;
      const fade = g.createLinearGradient(0, 256, 0, 0);
      fade.addColorStop(0, 'rgba(255,240,200,1)');
      fade.addColorStop(0.35, 'rgba(255,170,60,0.75)');
      fade.addColorStop(1, 'rgba(230,110,30,0)');
      g.fillStyle = fade;
      g.beginPath();
      g.moveTo(30, 256); g.lineTo(34, 256); g.lineTo(64, 0); g.lineTo(0, 0);
      g.fill();
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const tail = new THREE.Mesh(new THREE.PlaneGeometry(60, 260), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      tail.position.copy(head).addScaledVector(towards, -128);
      // The plane's +y runs back along the tail; its face turns toward us.
      const tailUp = towards.clone().negate();
      const facing = camera.position.clone().sub(tail.position).normalize();
      const right = tailUp.clone().cross(facing).normalize();
      tail.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, tailUp, right.clone().cross(tailUp).normalize()));
      dressing.add(tail);
    } else if (a.passing === 'probe') {
      const probe = new THREE.Group();
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.3, 32), new THREE.MeshStandardMaterial({ color: '#f2f0ea', roughness: 0.6 }));
      shield.rotation.x = Math.PI / 2 - 0.5;
      probe.add(shield);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.8, 6), new THREE.MeshStandardMaterial({ color: '#d4a63a', metalness: 0.7, roughness: 0.35 }));
      body.rotation.x = Math.PI / 2 - 0.5;
      body.position.set(0, 0.6, -1.2);
      probe.add(body);
      const glint = new THREE.MeshBasicMaterial({ color: '#ffffff' });
      for (const [sx, sy] of [[1, 0.05], [0.05, 1]] as const) {
        const ray = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), glint);
        ray.scale.set(sx * 4, sy * 4, 0.1);
        ray.position.set(1.8, 1.2, 0.4);
        probe.add(ray);
      }
      probe.position.copy(camera.position).addScaledVector(view(0.62, 0.55), 160);
      probe.lookAt(centre);
      dressing.add(probe);
    } else if (a.passing === 'planet') {
      const planet = new THREE.Mesh(new THREE.SphereGeometry(30, 40, 24), new THREE.MeshStandardMaterial({ color: '#2b2622', roughness: 1 }));
      planet.position.copy(camera.position).addScaledVector(view(-0.5, 0.55), 900);
      dressing.add(planet);
    } else if (a.passing === 'debris') {
      const count = Math.round(mix(80, 200, mood.density));
      debris = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#fff6e0', emissive: star.mid, emissiveIntensity: 0.6, roughness: 0.4 }), count);
      for (let i = 0; i < count; i++) {
        const ray = view(jitter(2), jitter(2));
        const reach = Math.min(mix(15, 140, random()), meets(ray, 2) * 0.9);
        debrisData.push({ at: camera.position.clone().addScaledVector(ray, reach), size: mix(0.08, 0.35, random() ** 2), spin: random() * 6 });
      }
      debris.frustumCulled = false;
      dressing.add(debris);
    }
    const placeDebris = (time: number) => {
      if (!debris) return;
      debrisData.forEach((p, i) => {
        quaternion.setFromEuler(new THREE.Euler(p.spin + time * 0.6, p.spin * 2 + time * 0.4, 0));
        debris!.setMatrixAt(i, matrix.compose(p.at.clone().add(new THREE.Vector3(Math.sin(time * 0.2 + p.spin) * 0.6, 0, -((time * mix(0.5, 4, energy) + p.spin * 10) % 20))), quaternion, scale.setScalar(p.size)));
      });
      debris.instanceMatrix.needsUpdate = true;
    };
    placeDebris(0);

    // ---- The cast floats on an arc over the fire, rising from near and low to far and high. ----
    // [screen x, screen y, share of the view, preferred distance]
    const slots: readonly (readonly [number, number, number, number])[] = [
      [-0.26, -0.28, 0.4, 42],
      [0.4, -0.02, 0.26, 62],
      [-0.6, 0.2, 0.2, 78],
      [0.14, 0.34, 0.17, 92],
      [0.7, 0.36, 0.15, 88],
      [-0.08, 0.06, 0.13, 70],
    ];
    const span = 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const flip = random() < 0.5 ? 1 : -1;
    const placed: { holder: THREE.Object3D; base: THREE.Vector3; phase: number; turn: number }[] = [];
    const place = (items: readonly Placeable[]) => {
      placed.length = 0;
      const middle = new THREE.Vector3();
      let reach = 8;
      items.forEach((item, index) => {
        const [sx, sy, share, want] = slots[index % slots.length];
        const ray = view(sx * flip + jitter(0.05), sy + jitter(0.04));
        const hit = meets(ray, 1.5);
        const distance = Math.min(want * (a.vantage === 'distant' ? 1.6 : 1), hit / (1 + 0.9 * share * span));
        const size = share * span * distance * (index >= slots.length ? 0.7 : 1);
        const natural = Math.max(item.height, item.radius * 2, 0.05);
        const scaleBy = size / natural;
        const holder = item.holder;
        holder.scale.setScalar(scaleBy);
        holder.rotation.set(jitter(0.2), jitter(0.8), jitter(0.25));
        const lift = new THREE.Vector3(0, 1, 0).applyEuler(holder.rotation);
        const at = camera.position.clone().addScaledVector(ray, distance);
        holder.position.copy(at).addScaledVector(lift, -item.height * scaleBy * 0.5);
        holder.updateMatrixWorld(true);
        placed.push({ holder, base: holder.position.clone(), phase: random() * 6, turn: jitter(1) });
        middle.add(at);
        reach = Math.max(reach, size);
      });
      if (items.length) middle.divideScalar(items.length);
      else middle.copy(camera.position).addScaledVector(view(0, 0), 60);
      let radius = reach;
      for (const { base } of placed) radius = Math.max(radius, base.distanceTo(middle) + reach);
      // The key light comes up from the star, a little toward us so the faces we see are lit.
      const toLight = centre.clone().sub(middle).normalize().add(camera.position.clone().sub(middle).normalize().multiplyScalar(0.8)).normalize();
      key.target.position.copy(middle);
      key.position.copy(middle).addScaledVector(toLight, radius * 3);
      fill.target.position.copy(middle);
    };

    const pace = mix(0.1, 1, energy);
    return {
      object: root,
      camera,
      background,
      capacity: slots.length,
      ground: surface,
      keyLight: key,
      place,
      update(_dt, time) {
        surfaceMaterial.uniforms.uTime.value = time * mix(0.15, 1.2, energy);
        for (const material of plasma) material.uniforms.time.value = time;
        for (const item of placed) {
          item.holder.position.copy(item.base);
          item.holder.position.y += Math.sin(time * 0.3 * pace + item.phase) * 0.4;
          item.holder.rotation.y += 0.0006 * pace * item.turn;
        }
        placeDebris(time);
      },
      dispose() {
        disposeTree(root);
      },
    };
  },
});
