import * as THREE from 'three';

/**
 * Local plasma helpers: a tube with a parameter along its length, a self-lit shader that grades,
 * shimmers and rim-fades, and seeded value noise. Copied per component; nothing imports across folders.
 */

export interface StrandOptions {
  /** Radius at t = 0 (start) … 1 (end). */
  radius: (t: number) => number;
  rings?: number;
  sides?: number;
  /** Multiplier on the radius per surface point, for ragged or flattened strands. */
  rough?: (t: number, angle: number) => number;
}

/** A tube along a smooth curve through `points`; uv.x runs 0 at the start to 1 at the end. */
export function strand(points: readonly THREE.Vector3[], options: StrandOptions): THREE.BufferGeometry {
  const rings = options.rings ?? 48, sides = options.sides ?? 12;
  const curve = new THREE.CatmullRomCurve3(points.map((point) => point.clone()), false, 'centripetal');
  const frames = curve.computeFrenetFrames(rings, false);
  const count = (rings + 1) * (sides + 1);
  const positions = new Float32Array(count * 3), normals = new Float32Array(count * 3), uvs = new Float32Array(count * 2);
  const indices: number[] = [];
  const centre = new THREE.Vector3(), direction = new THREE.Vector3();
  let v = 0;
  for (let ring = 0; ring <= rings; ring++) {
    const t = ring / rings;
    curve.getPointAt(t, centre);
    const N = frames.normals[ring], B = frames.binormals[ring];
    const r = Math.max(options.radius(t), 1e-4);
    for (let side = 0; side <= sides; side++, v++) {
      const angle = (side / sides) * Math.PI * 2;
      const cos = -Math.cos(angle), sin = Math.sin(angle);
      direction.set(cos * N.x + sin * B.x, cos * N.y + sin * B.y, cos * N.z + sin * B.z).normalize();
      const k = options.rough ? Math.max(options.rough(t, angle), 0.05) : 1;
      positions[v * 3] = centre.x + direction.x * r * k;
      positions[v * 3 + 1] = centre.y + direction.y * r * k;
      positions[v * 3 + 2] = centre.z + direction.z * r * k;
      normals[v * 3] = direction.x; normals[v * 3 + 1] = direction.y; normals[v * 3 + 2] = direction.z;
      uvs[v * 2] = t; uvs[v * 2 + 1] = side / sides;
    }
  }
  for (let ring = 1; ring <= rings; ring++)
    for (let side = 1; side <= sides; side++) {
      const a = (sides + 1) * (ring - 1) + (side - 1), b = (sides + 1) * ring + (side - 1), c = (sides + 1) * ring + side, d = (sides + 1) * (ring - 1) + side;
      indices.push(a, b, d, b, c, d);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  if (options.rough) geometry.computeVertexNormals();
  return geometry;
}

export interface PlasmaOptions {
  /** Colour at t = 0, or at both ends of an arch. */
  base: THREE.ColorRepresentation;
  /** Colour at t = 1, or at the middle of an arch. */
  crown: THREE.ColorRepresentation;
  /** 0 grades along the strand; 1 puts the base colour at both ends and the crown colour in the middle. */
  arch?: number;
  gamma?: number;
  /** Brightness multiplier on the base colour before tone mapping: above 1 pushes pale tones to white. */
  glow?: number;
  opacity?: number;
  /** 0 draws the surface; 1 draws only the limb, a bright outline around a see-through middle. */
  rim?: number;
  rimPower?: number;
  /** Fade the alpha to nothing over this fraction of the parameter at the start and at the end. */
  fade?: readonly [number, number];
  /** Use uv.y as the parameter: on a sphere, 0 at the bottom pole and 1 at the top. */
  vertical?: boolean;
  /** Travelling brightness wave: amount, count along the strand, cycles per second. */
  shimmer?: number;
  waves?: number;
  speed?: number;
  phase?: number;
  side?: THREE.Side;
  depthWrite?: boolean;
}

/** A self-lit material for plasma: graded, shimmering, optionally see-through except at its edges. */
export function plasmaPaint(options: PlasmaOptions): THREE.ShaderMaterial {
  const opacity = options.opacity ?? 1;
  const seeThrough = opacity < 1 || (options.rim ?? 0) > 0 || !!options.fade;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      base: { value: new THREE.Color(options.base) },
      crown: { value: new THREE.Color(options.crown) },
      arch: { value: options.arch ?? 0 },
      gamma: { value: options.gamma ?? 1 },
      glow: { value: options.glow ?? 1 },
      opacity: { value: opacity },
      rim: { value: options.rim ?? 0 },
      rimPower: { value: options.rimPower ?? 2 },
      fade: { value: new THREE.Vector2(options.fade?.[0] ?? 0, options.fade?.[1] ?? 0) },
      vertical: { value: options.vertical ? 1 : 0 },
      shimmer: { value: options.shimmer ?? 0 },
      waves: { value: options.waves ?? 3 },
      speed: { value: options.speed ?? 0.3 },
      phase: { value: options.phase ?? 0 },
      time: { value: 0 },
    },
    vertexShader: [
      'uniform float vertical;',
      'varying float vT; varying vec3 vFacing;',
      'void main() {',
      '  vT = mix(uv.x, uv.y, vertical);',
      '  vFacing = normalize(normalMatrix * normal);',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
      '}',
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 base; uniform vec3 crown; uniform float arch; uniform float gamma; uniform float glow; uniform float opacity;',
      'uniform float rim; uniform float rimPower; uniform vec2 fade; uniform float shimmer; uniform float waves; uniform float speed; uniform float phase; uniform float time;',
      'varying float vT; varying vec3 vFacing;',
      'void main() {',
      '  float g = mix(vT, 1.0 - abs(vT * 2.0 - 1.0), arch);',
      '  g = pow(clamp(g, 0.0, 1.0), gamma);',
      '  vec3 tone = mix(base * glow, crown, g);',
      '  float wave = sin((vT * waves - time * speed) * 6.2831853 + phase);',
      '  tone *= 1.0 + shimmer * wave;',
      '  float facing = clamp(abs(normalize(vFacing).z), 0.0, 1.0);',
      '  float alpha = opacity * mix(1.0, pow(1.0 - facing, rimPower), rim);',
      '  if (fade.x > 0.0) alpha *= smoothstep(0.0, fade.x, vT);',
      '  if (fade.y > 0.0) alpha *= smoothstep(0.0, fade.y, 1.0 - vT);',
      '  gl_FragColor = vec4(tone, alpha);',
      '  #include <tonemapping_fragment>',
      '  #include <colorspace_fragment>',
      '}',
    ].join('\n'),
    transparent: seeThrough,
    depthWrite: options.depthWrite ?? !seeThrough,
    side: options.side ?? THREE.FrontSide,
  });
  material.opacity = opacity;
  return material;
}

/** Advance the clock of every plasma material. */
export function tick(materials: readonly THREE.ShaderMaterial[], time: number) {
  for (const material of materials) material.uniforms.time.value = time;
}

export type Noise = (x: number, y: number, z: number, octaves?: number) => number;

/** Seeded fractal value noise in roughly [-1, 1]. */
export function makeNoise(seed: number): Noise {
  const hash = (x: number, y: number, z: number) => {
    let n = (Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1440662683) ^ seed) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const ease = (t: number) => t * t * (3 - 2 * t);
  const value = (x: number, y: number, z: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const u = ease(x - xi), v = ease(y - yi), w = ease(z - zi);
    const at = (a: number, b: number, c: number) => hash(xi + a, yi + b, zi + c);
    const x00 = at(0, 0, 0) + (at(1, 0, 0) - at(0, 0, 0)) * u;
    const x10 = at(0, 1, 0) + (at(1, 1, 0) - at(0, 1, 0)) * u;
    const x01 = at(0, 0, 1) + (at(1, 0, 1) - at(0, 0, 1)) * u;
    const x11 = at(0, 1, 1) + (at(1, 1, 1) - at(0, 1, 1)) * u;
    const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
    return (y0 + (y1 - y0) * w) * 2 - 1;
  };
  return (x, y, z, octaves = 3) => {
    let sum = 0, gain = 0.5, total = 0, scale = 1;
    for (let octave = 0; octave < octaves; octave++) {
      sum += value(x * scale + octave * 17.3, y * scale - octave * 9.1, z * scale + octave * 4.7) * gain;
      total += gain;
      gain *= 0.5;
      scale *= 2.03;
    }
    return sum / total;
  };
}

export const vec = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
