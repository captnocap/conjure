// Solid wood. Independent of the image treatment and mesh UVs.
// Object Y is the trunk axis. Every color/pore/ring is a sample of one volume.
export const woodDefinition = Object.freeze({
  id: "wood",
  name: "Solid wood",
  baseColor: "#b98453",
  metalness: 0,
  roughness: 0.53,
  anisotropy: 0.34,
  clearcoat: 0.12,
  clearcoatRoughness: 0.38,
  description:
    "Continuous growth rings, end grain, flowing pores and satin fibers",
});

export const woodVertexInputs = `
varying vec3 vWoodViewX;
varying vec3 vWoodViewY;
varying vec3 vWoodViewZ;
`;
export const woodVertexBody = `
vWoodViewX = mat3(modelViewMatrix) * vec3(1.0, 0.0, 0.0);
vWoodViewY = mat3(modelViewMatrix) * vec3(0.0, 1.0, 0.0);
vWoodViewZ = mat3(modelViewMatrix) * vec3(0.0, 0.0, 1.0);
`;

export const woodFragmentInputs = /* glsl */ `
${woodVertexInputs}
// A positive bounded transverse scale followed by two triangular shears.
// det d(q)/d(p) = 1/s(y)^2 > 0. There are no folded rings or chart seams.
vec3 atelierWoodCoordinates(vec3 p, out vec3 fiber) {
  float y = p.y;
  float s = 1.0 + 0.045*sin(0.83*y+0.6) + 0.022*sin(2.13*y-1.1);
  float ds = 0.03735*cos(0.83*y+0.6) + 0.04686*cos(2.13*y-1.1);
  float cx = 0.10 + 0.055*sin(0.63*y) + 0.025*sin(1.91*y+0.8);
  float cz = -0.12 + 0.047*sin(0.51*y+0.5) + 0.019*sin(2.21*y);
  float dx = 0.03465*cos(0.63*y) + 0.04775*cos(1.91*y+0.8);
  float dz = 0.02397*cos(0.51*y+0.5) + 0.04199*cos(2.21*y);
  float u = (p.x-cx)/s, v = (p.z-cz)/s;
  vec3 gu = vec3(1.0, -dx-u*ds, 0.0)/s;
  vec3 gv = vec3(0.0, -dz-v*ds, 1.0)/s;
  float aPhase = 2.2*v + 0.4*sin(0.73*y);
  float a = u + 0.032*sin(aPhase);
  vec3 ga = gu + 0.032*cos(aPhase)*(2.2*gv + vec3(0.0,0.292*cos(0.73*y),0.0));
  float bPhase = 2.6*a + 0.3*sin(0.57*y);
  float b = v + 0.025*sin(bPhase);
  vec3 gb = gv + 0.025*cos(bPhase)*(2.6*ga + vec3(0.0,0.171*cos(0.57*y),0.0));
  // Fiber is tangent to both material coordinates, hence to every growth ring.
  fiber = normalize(cross(gb, ga));
  return vec3(a,y,b);
}
float atelierWoodAge(vec3 q) {
  // Smooth pith; strictly increasing radius-to-growth-time mapping.
  float r = sqrt(dot(q.xz,q.xz)+0.000025);
  return 10.5*r + 0.22*sin(3.1*r) + 0.10*sin(8.5*r);
}
float atelierWoodLatewood(float age) {
  float pulse = pow(0.5+0.5*cos(6.28318530718*age),8.0);
  // Average of cos^16 over a period. Unresolved rings converge to their mean.
  return mix(pulse,0.196380615234375,smoothstep(0.12,0.60,fwidth(age)));
}
float atelierWoodPores(vec3 q, float latewood) {
  vec2 p = q.xz*48.0, cell = floor(p), f = fract(p);
  float aa = max(0.035,max(length(dFdx(p)),length(dFdy(p)))*0.7);
  float pores = 0.0;
  for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++) {
    vec2 offset = vec2(float(i),float(j)), key = cell+offset;
    float live = step(0.48,atelierHash(vec3(key,13.1)));
    vec2 center = offset + 0.15 + 0.7*vec2(atelierHash(vec3(key,4.7)),atelierHash(vec3(key,8.9)));
    float radius = 0.085 + 0.065*atelierHash(vec3(key,2.4));
    float aperture = 0.60+0.40*atelierNoise(vec3(key*0.37,q.y*1.6));
    float distanceToPore = length(center-f)-radius*aperture;
    pores += live*(1.0-smoothstep(-aa,aa,distanceToPore));
  }
  // Keep finite pores on both early/late wood; increase earlywood prominence.
  float visibility = 1.0-smoothstep(0.4,1.4,max(length(dFdx(p)),length(dFdy(p))));
  return clamp(pores,0.0,1.0)*(0.38+0.62*(1.0-latewood))*visibility;
}
`;

export const woodSurfaceBody = /* glsl */ `
vec3 atelierWoodFiber;
vec3 atelierWoodQ = atelierWoodCoordinates(atelierP,atelierWoodFiber);
float atelierWoodGrowth = atelierWoodAge(atelierWoodQ);
float atelierWoodLate = atelierWoodLatewood(atelierWoodGrowth);
float atelierWoodPore = atelierWoodPores(atelierWoodQ,atelierWoodLate);
float atelierWoodCloud = atelierNoise(atelierWoodQ*vec3(1.3,0.22,1.3));
float atelierWoodFine = atelierGrain(atelierWoodQ*vec3(155.0,3.0,155.0));
// Linear pigment only. The albedo capture shares this exact code.
diffuseColor.rgb *= 0.88+0.20*atelierWoodCloud;
diffuseColor.rgb = mix(diffuseColor.rgb,vec3(0.105,0.043,0.014),0.78*atelierWoodLate);
diffuseColor.rgb *= (0.95+0.10*atelierWoodFine)*(1.0-0.48*atelierWoodPore);
atelierMetalness = 0.0;
atelierRoughness = 0.49+0.06*(1.0-atelierWoodLate)+0.08*atelierWoodPore;
atelierHeight = 0.0018*(atelierWoodLate-0.196380615234375)-0.003*atelierWoodPore+0.0006*(atelierWoodFine-0.5);
// Forward transform handles nonuniformly scaled objects without UV tangents.
vec3 atelierWoodFiberView = normalize(vWoodViewX*atelierWoodFiber.x+vWoodViewY*atelierWoodFiber.y+vWoodViewZ*atelierWoodFiber.z);
`;

// Patch after Three has built its physical material. Its dielectric GGX remains
// intact: this approximates satin fiber response, not a measured wood BSDF.
export const woodPhysicalBody = /* glsl */ `
#ifdef USE_ANISOTROPY
  vec3 woodProjected = atelierWoodFiberView-normal*dot(atelierWoodFiberView,normal);
  float woodProjectionSq = dot(woodProjected,woodProjected);
  vec3 woodFallbackAxis = abs(normal.y)<0.9 ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0);
  vec3 woodFallback = normalize(cross(normal,woodFallbackAxis));
  material.anisotropyT = woodProjectionSq>1e-8 ? woodProjected*inversesqrt(max(woodProjectionSq,1e-8)) : woodFallback;
  material.anisotropyB = normalize(cross(normal,material.anisotropyT));
  // Endgrain has no preferred surface fiber direction, so anisotropy fades.
  material.anisotropy = 0.34*smoothstep(0.02,0.75,woodProjectionSq);
  material.roughness = clamp(material.roughness+0.075*(1.0-woodProjectionSq),0.0525,1.0);
  material.alphaT = mix(pow2(material.roughness),1.0,pow2(material.anisotropy));
#endif
`;

const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalize = (v) => {
  const d = Math.hypot(...v);
  return v.map((x) => x / d);
};
const fract = (x) => x - Math.floor(x);
export function woodHash(p) {
  let [x, y, z] = p.map((v) => fract(v * 0.1031));
  const d = x * (y + 33.33) + y * (z + 33.33) + z * (x + 33.33);
  x += d;
  y += d;
  z += d;
  return fract((x + y) * z);
}
export function woodNoise(p) {
  const i = p.map(Math.floor),
    f = p.map((x) => {
      const v = fract(x);
      return v * v * (3 - 2 * v);
    }),
    h = (x, y, z) => woodHash([i[0] + x, i[1] + y, i[2] + z]);
  return mix(
    mix(
      mix(h(0, 0, 0), h(1, 0, 0), f[0]),
      mix(h(0, 1, 0), h(1, 1, 0), f[0]),
      f[1],
    ),
    mix(
      mix(h(0, 0, 1), h(1, 0, 1), f[0]),
      mix(h(0, 1, 1), h(1, 1, 1), f[0]),
      f[1],
    ),
    f[2],
  );
}

export function woodCoordinates(p) {
  const [x, y, z] = p,
    s = 1 + 0.045 * Math.sin(0.83 * y + 0.6) + 0.022 * Math.sin(2.13 * y - 1.1),
    ds =
      0.03735 * Math.cos(0.83 * y + 0.6) + 0.04686 * Math.cos(2.13 * y - 1.1),
    cx = 0.1 + 0.055 * Math.sin(0.63 * y) + 0.025 * Math.sin(1.91 * y + 0.8),
    cz = -0.12 + 0.047 * Math.sin(0.51 * y + 0.5) + 0.019 * Math.sin(2.21 * y),
    dx = 0.03465 * Math.cos(0.63 * y) + 0.04775 * Math.cos(1.91 * y + 0.8),
    dz = 0.02397 * Math.cos(0.51 * y + 0.5) + 0.04199 * Math.cos(2.21 * y),
    u = (x - cx) / s,
    v = (z - cz) / s,
    gu = [1 / s, (-dx - u * ds) / s, 0],
    gv = [0, (-dz - v * ds) / s, 1 / s],
    ap = 2.2 * v + 0.4 * Math.sin(0.73 * y),
    a = u + 0.032 * Math.sin(ap),
    ga = gu.map(
      (c, i) =>
        c +
        0.032 *
          Math.cos(ap) *
          (2.2 * gv[i] + (i === 1 ? 0.292 * Math.cos(0.73 * y) : 0)),
    ),
    bp = 2.6 * a + 0.3 * Math.sin(0.57 * y),
    b = v + 0.025 * Math.sin(bp),
    gb = gv.map(
      (c, i) =>
        c +
        0.025 *
          Math.cos(bp) *
          (2.6 * ga[i] + (i === 1 ? 0.171 * Math.cos(0.57 * y) : 0)),
    );
  return {
    q: [a, y, b],
    fiber: normalize(cross(gb, ga)),
    ga,
    gb,
    scale: s,
    determinant: 1 / (s * s),
  };
}
export function woodInverse([a, y, b]) {
  const v = b - 0.025 * Math.sin(2.6 * a + 0.3 * Math.sin(0.57 * y)),
    u = a - 0.032 * Math.sin(2.2 * v + 0.4 * Math.sin(0.73 * y)),
    s = 1 + 0.045 * Math.sin(0.83 * y + 0.6) + 0.022 * Math.sin(2.13 * y - 1.1),
    cx = 0.1 + 0.055 * Math.sin(0.63 * y) + 0.025 * Math.sin(1.91 * y + 0.8),
    cz = -0.12 + 0.047 * Math.sin(0.51 * y + 0.5) + 0.019 * Math.sin(2.21 * y);
  return [u * s + cx, y, v * s + cz];
}
export function woodAge(q) {
  const r = Math.sqrt(q[0] * q[0] + q[2] * q[2] + 0.000025);
  return 10.5 * r + 0.22 * Math.sin(3.1 * r) + 0.1 * Math.sin(8.5 * r);
}
const srgbToLinear = (x) =>
  x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
const base = [185, 132, 83].map((x) => srgbToLinear(x / 255));
export function sampleWood(
  p,
  { ageFootprint = 0, poreFootprint = 0, fineFootprint = 0 } = {},
) {
  const { q, fiber } = woodCoordinates(p),
    age = woodAge(q),
    late = mix(
      (0.5 + 0.5 * Math.cos(TAU * age)) ** 8,
      0.196380615234375,
      smoothstep(0.12, 0.6, ageFootprint),
    ),
    cell = [Math.floor(q[0] * 48), Math.floor(q[2] * 48)],
    f = [fract(q[0] * 48), fract(q[2] * 48)],
    aa = Math.max(0.035, poreFootprint * 0.7);
  let pores = 0;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const key = [cell[0] + i, cell[1] + j];
      if (woodHash([...key, 13.1]) < 0.48) continue;
      const center = [
          i + 0.15 + 0.7 * woodHash([...key, 4.7]),
          j + 0.15 + 0.7 * woodHash([...key, 8.9]),
        ],
        r = 0.085 + 0.065 * woodHash([...key, 2.4]),
        ap = 0.6 + 0.4 * woodNoise([key[0] * 0.37, key[1] * 0.37, q[1] * 1.6]);
      pores +=
        1 -
        smoothstep(
          -aa,
          aa,
          Math.hypot(center[0] - f[0], center[1] - f[1]) - r * ap,
        );
    }
  pores =
    clamp(pores) *
    (0.38 + 0.62 * (1 - late)) *
    (1 - smoothstep(0.4, 1.4, poreFootprint));
  const cloud = woodNoise([q[0] * 1.3, q[1] * 0.22, q[2] * 1.3]),
    fine = mix(
      woodNoise([q[0] * 155, q[1] * 3, q[2] * 155]),
      0.5,
      smoothstep(0.35, 1.4, fineFootprint),
    ),
    dark = [0.105, 0.043, 0.014],
    albedo = base.map(
      (x, i) =>
        mix(x * (0.88 + 0.2 * cloud), dark[i], 0.78 * late) *
        (0.95 + 0.1 * fine) *
        (1 - 0.48 * pores),
    );
  return {
    q,
    fiber,
    age,
    late,
    pores,
    albedo,
    roughness: 0.49 + 0.06 * (1 - late) + 0.08 * pores,
    height:
      0.0018 * (late - 0.196380615234375) -
      0.003 * pores +
      0.0006 * (fine - 0.5),
  };
}
