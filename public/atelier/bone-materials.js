import * as THREE from "./vendor/three.module.min.js";

// Visual material studies on the unchanged still life, not anatomical geometry.
// Cortical: an aligned osteonal volume. Cancellous: a warped connected implicit
// sheet/strut field. Recesses use bump + local visibility, never actual holes.
// Histological structural cues are deliberately enlarged to read at this scale.
export const boneDefinitions = Object.freeze([
  Object.freeze({
    id: "cortical-bone",
    name: "Cortical bone",
    baseColor: "#e5d7b9",
    metalness: 0,
    roughness: 0.61,
    transmission: 0,
    ior: 1.53,
    description:
      "Dense ivory matrix, aligned osteons, fine lamellae and narrow canals",
  }),
  Object.freeze({
    id: "cancellous-bone",
    name: "Cancellous bone",
    baseColor: "#e3d2ad",
    metalness: 0,
    roughness: 0.82,
    transmission: 0,
    ior: 1.53,
    description:
      "Connected trabecular web and deep shaded pores; surface approximation",
  }),
]);
const definitionsById = new Map(boneDefinitions.map((d) => [d.id, d]));

const vertexInputs = /* glsl */ `
attribute float materialConvex;
attribute float materialConcave;
attribute float materialAO;
attribute float materialLightAO;
attribute vec3 materialConvexEdge;
attribute vec3 materialConcaveEdge;
varying vec3 vMaterialPosition;
varying vec3 vMaterialBaked;
varying float vMaterialLightAO;
varying vec3 vMaterialConvexEdge;
varying vec3 vMaterialConcaveEdge;
`;
const fragmentInputs = /* glsl */ `
varying vec3 vMaterialPosition;
varying vec3 vMaterialBaked;
varying float vMaterialLightAO;
varying vec3 vMaterialConvexEdge;
varying vec3 vMaterialConcaveEdge;
float boneHash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float boneNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(mix(boneHash(i),boneHash(i+vec3(1,0,0)),f.x),
                 mix(boneHash(i+vec3(0,1,0)),boneHash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(boneHash(i+vec3(0,0,1)),boneHash(i+vec3(1,0,1)),f.x),
                 mix(boneHash(i+vec3(0,1,1)),boneHash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float boneGrain(vec3 p) {
  float footprint = max(length(dFdx(p)),length(dFdy(p)));
  return mix(boneNoise(p),0.5,smoothstep(0.35,1.4,footprint));
}
vec3 boneBump(vec3 n, vec3 p, float height) {
  vec3 dx=dFdx(p),dy=dFdy(p),r1=cross(dy,n),r2=cross(n,dx);
  // Three reverses raster winding and native bumpScale for BackSide.
  // Procedural height bypasses bumpScale; preserve its orientation explicitly.
  float reliefFaceSign=1.0;
  #ifdef DOUBLE_SIDED
    reliefFaceSign=gl_FrontFacing ? 1.0 : -1.0;
  #endif
  #ifdef FLIP_SIDED
    reliefFaceSign=-1.0;
  #endif
  float determinant=dot(dx,r1)*reliefFaceSign;
  vec3 gradient=sign(determinant)*(dFdx(height)*r1+dFdy(height)*r2);
  return normalize(max(abs(determinant),1e-9)*n-gradient);
}
// Continuous triangular shear keeps fibers aligned along object Y. All faces
// sample the same volume; there are no triplanar weights, UV seams or view axes.
vec3 boneCoordinates(vec3 p) {
  float x=p.x+0.018*sin(2.7*p.y)+0.008*sin(7.1*p.y+0.6);
  float z=p.z+0.021*sin(2.1*p.y+0.7)+0.009*sin(5.3*p.y+2.6);
  return vec3(x,p.y,z);
}
// Nearest two osteonal axes. Voronoi boundaries act as cement lines while
// concentric distance shells are lamellae. Canal depth is a shading quantity.
vec3 boneOsteon(vec3 q) {
  vec2 p=q.xz*7.8,cell=floor(p),f=fract(p);
  float first=8.0,second=8.0;
  for (int j=-1;j<=1;j++) for(int i=-1;i<=1;i++) {
    vec2 offset=vec2(float(i),float(j)),key=cell+offset;
    vec2 center=offset+0.19+0.62*vec2(boneHash(vec3(key,3.4)),boneHash(vec3(key,7.9)));
    float distanceToAxis=length(center-f);
    if(distanceToAxis<first) {second=first;first=distanceToAxis;}
    else second=min(second,distanceToAxis);
  }
  float footprint=fwidth(first);
  float aa=clamp(footprint,0.004,0.055);
  float coordinateFootprint=max(length(dFdx(p)),length(dFdy(p)));
  float resolved=1.0-smoothstep(0.08,0.28,coordinateFootprint);
  float canal=mix(0.012,1.0-smoothstep(0.040-aa,0.077+aa,first),resolved);
  float lamella=0.5+0.5*cos(first*68.0);
  lamella=mix(lamella,0.5,max(1.0-resolved,smoothstep(0.7,3.14,fwidth(first*68.0))));
  float cement=mix(0.055,1.0-smoothstep(0.008,0.027+min(fwidth(second-first),0.04),second-first),resolved);
  return vec3(canal,lamella,cement);
}
// A warped 3D cellular scaffold: nearest-cell boundaries form connected plates,
// and multiple-boundary junctions form thicker struts. Every surface is a cut of
// one volume, with different pore sizes through depth, rather than 2D dot noise.
vec3 boneTrabecularCoordinates(vec3 p) {
  vec3 q=p*vec3(8.4,6.8,8.4);
  q += 0.38*vec3(sin(3.8*p.y+2.3*p.z+0.6),
                 sin(3.2*p.z+2.8*p.x+2.1),
                 sin(3.6*p.x+2.0*p.y+4.0));
  q += 0.15*vec3(sin(7.1*p.z+3.1*p.y),
                 sin(6.3*p.x-2.6*p.z),
                 sin(5.8*p.y+3.5*p.x));
  // Tilt the cell volume so principal mesh faces do not expose a grid slice.
  vec3 r=vec3(0.825335615*q.x+0.564642473*q.z,q.y,-0.564642473*q.x+0.825335615*q.z);
  return vec3(r.x,0.921060994*r.y-0.389418342*r.z,0.389418342*r.y+0.921060994*r.z);
}
float boneTrabecularField(vec3 q) {
  vec3 cell=floor(q),f=fract(q);
  float first=8.0,second=8.0;
  for(int k=-1;k<=1;k++) for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++) {
    vec3 offset=vec3(float(i),float(j),float(k)),key=cell+offset;
    vec3 center=offset+0.13+0.74*vec3(boneHash(key+3.1),boneHash(key+11.7),boneHash(key+23.4));
    float distanceToCenter=length(center-f);
    if(distanceToCenter<first) {second=first;first=distanceToCenter;}
    else second=min(second,distanceToCenter);
  }
  return second-first;
}
`;
const fieldSetup = /* glsl */ `
vec3 boneP=vMaterialPosition;
float boneConvexDistance=min(vMaterialConvexEdge.x,min(vMaterialConvexEdge.y,vMaterialConvexEdge.z));
float boneConcaveDistance=min(vMaterialConcaveEdge.x,min(vMaterialConcaveEdge.y,vMaterialConcaveEdge.z));
float boneConvex=max(1.0-exp(-max(vMaterialBaked.x,0.0)*0.2),exp(-max(boneConvexDistance,0.0)*65.0));
float boneConcave=max(1.0-exp(-max(vMaterialBaked.y,0.0)*0.24),exp(-max(boneConcaveDistance,0.0)*45.0));
float atelierAO=clamp(vMaterialBaked.z,0.0,1.0);
float boneHeight=0.0;
float boneRoughness=roughness;
float boneLocalVisibility=1.0;
`;
const corticalSurface = /* glsl */ `
vec3 boneQ=boneCoordinates(boneP);
vec3 boneOsteonal=boneOsteon(boneQ);
float boneCanal=boneOsteonal.x,boneLamella=boneOsteonal.y,boneCement=boneOsteonal.z;
float boneMineral=boneGrain(boneQ*vec3(2.4,0.42,2.4)+3.7);
float boneFiber=boneGrain(boneQ*vec3(175.0,4.5,175.0));
// Pigment/mineral variation only, deliberately no canal shadow in albedo.
diffuseColor.rgb *= 0.93+0.10*boneMineral;
diffuseColor.rgb *= 0.97+0.06*boneLamella-0.037*boneCement;
diffuseColor.rgb *= 0.985+0.03*boneFiber;
boneRoughness=0.58+0.065*boneFiber+0.065*boneCanal+0.035*boneConcave-0.035*boneConvex;
boneHeight=0.00048*(boneLamella-0.5)+0.00038*(boneFiber-0.5)-0.0036*boneCanal-0.00065*boneCement;
boneLocalVisibility=1.0-0.52*boneCanal;
`;
const cancellousSurface = /* glsl */ `
vec3 boneQ=boneTrabecularCoordinates(boneP);
float boneField=boneTrabecularField(boneQ);
float boneWidth=0.065+0.09*boneNoise(boneP*3.1+7.3);
float boneDistance=boneField;
float boneAA=clamp(fwidth(boneField)*0.42,0.007,0.05);
float bonePore=smoothstep(boneWidth-boneAA,boneWidth+0.24+boneAA,boneDistance);
float boneResolution=1.0-smoothstep(0.45,1.6,max(length(dFdx(boneQ)),length(dFdy(boneQ))));
bonePore=mix(0.30,bonePore,boneResolution);
float boneMineral=boneGrain(boneP*vec3(4.2,3.1,4.2)+4.6);
float boneFine=boneGrain(boneP*145.0+8.1);
// The pore interior is shaded later, not painted into the mineral reflectance.
diffuseColor.rgb *= 0.88+0.17*boneMineral;
diffuseColor.rgb *= 0.98+0.04*boneFine;
boneRoughness=0.75+0.17*bonePore+0.045*boneFine+0.03*boneConcave-0.025*boneConvex;
boneHeight=-0.029*bonePore+0.0010*(boneFine-0.5)*boneResolution;
boneLocalVisibility=mix(1.0,0.20,pow(bonePore,0.85));
`;

function injectBoneShader(shader, id, albedo) {
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", `#include <common>\n${vertexInputs}`)
    .replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vMaterialPosition = position;
      vMaterialBaked = vec3(materialConvex, materialConcave, materialAO);
      vMaterialLightAO = materialLightAO;
      vMaterialConvexEdge = materialConvexEdge;
      vMaterialConcaveEdge = materialConcaveEdge;`,
    );
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", `#include <common>\n${fragmentInputs}`)
    .replace(
      "#include <color_fragment>",
      `#include <color_fragment>\n${fieldSetup}\n${id === "cortical-bone" ? corticalSurface : cancellousSurface}`,
    )
    .replace(
      "#include <roughnessmap_fragment>",
      "#include <roughnessmap_fragment>\nroughnessFactor=clamp(boneRoughness,0.0525,1.0);",
    )
    .replace(
      "#include <normal_fragment_maps>",
      "#include <normal_fragment_maps>\nnormal=boneBump(normal,-vViewPosition,boneHeight);",
    )
    .replace(
      "#include <aomap_fragment>",
      `#include <aomap_fragment>
      // Ambient light visibility is independent of geometric wear/appearance AO.
      // Negative fallback preserves callers with only the legacy materialAO.
      float atelierLightAO = vMaterialLightAO < 0.0 ? atelierAO : clamp(vMaterialLightAO, 0.0, 1.0);
      reflectedLight.indirectDiffuse *= atelierLightAO;
      reflectedLight.indirectSpecular *= computeSpecularOcclusion(saturate(dot(geometryNormal,geometryViewDir)),atelierLightAO,material.roughness);
      // Local pore visibility approximates unresolved recess self-occlusion.
      // It is separate from reflectance and from the real baked geometry AO.
      reflectedLight.directDiffuse *= mix(0.16,1.0,boneLocalVisibility);
      reflectedLight.indirectDiffuse *= boneLocalVisibility;
      reflectedLight.directSpecular *= mix(0.12,1.0,boneLocalVisibility);
      reflectedLight.indirectSpecular *= boneLocalVisibility;`,
    );
  if (albedo)
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <opaque_fragment>",
        "gl_FragColor = vec4(diffuseColor.rgb, diffuseColor.a);",
      )
      .replace("#include <colorspace_fragment>", "");
}

/** Independent physical or linear-pigment material; caller owns lifetime/cache. */
export function createBoneMaterial(
  id,
  environment,
  { side = THREE.FrontSide, albedo = false } = {},
) {
  const definition = definitionsById.get(id);
  if (!definition) throw new RangeError(`Unknown bone material: ${id}`);
  if (![THREE.FrontSide, THREE.BackSide, THREE.DoubleSide].includes(side))
    throw new RangeError("Invalid material side");
  const material = new THREE.MeshPhysicalMaterial({
    color: definition.baseColor,
    metalness: 0,
    roughness: definition.roughness,
    transmission: 0,
    ior: definition.ior,
    clearcoat: 0,
    envMap: environment,
    envMapIntensity: 0.48,
    side,
  });
  material.name = `Atelier ${definition.name}${albedo ? " albedo" : ""}`;
  material.toneMapped = !albedo;
  material.fog = !albedo;
  material.userData = {
    materialId: id,
    physicalSurface: true,
    bakedGeometry: true,
    ...(albedo ? { albedoSurface: true } : {}),
    surfaceApproximation:
      id === "cancellous-bone"
        ? "connected porous relief; no geometry holes"
        : "enlarged osteonal relief",
  };
  material.defaultAttributeValues = {
    materialConvex: [0],
    materialConcave: [0],
    materialAO: [1],
    materialLightAO: [-1], // Legacy fallback: use materialAO when the new input is absent.
    materialConvexEdge: [1e4, 1e4, 1e4],
    materialConcaveEdge: [1e4, 1e4, 1e4],
  };
  material.onBeforeCompile = (shader) => injectBoneShader(shader, id, albedo);
  material.customProgramCacheKey = () =>
    `atelier-bone-v3:${id}:${albedo ? "albedo" : "physical"}`;
  return material;
}

// Small CPU field mirrors used for deterministic and continuity regression tests.
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const fract = (v) => v - Math.floor(v);
const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export function boneHash(p) {
  let [x, y, z] = p.map((v) => fract(v * 0.1031));
  const d = x * (y + 33.33) + y * (z + 33.33) + z * (x + 33.33);
  x += d;
  y += d;
  z += d;
  return fract((x + y) * z);
}
export function boneNoise(p) {
  const i = p.map(Math.floor),
    f = p.map((v) => {
      v = fract(v);
      return v * v * (3 - 2 * v);
    });
  const h = (x, y, z) => boneHash([i[0] + x, i[1] + y, i[2] + z]);
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
export function boneCoordinates([x, y, z]) {
  return [
    x + 0.018 * Math.sin(2.7 * y) + 0.008 * Math.sin(7.1 * y + 0.6),
    y,
    z + 0.021 * Math.sin(2.1 * y + 0.7) + 0.009 * Math.sin(5.3 * y + 2.6),
  ];
}
export function boneTrabecularCoordinates([x, y, z]) {
  const q = [
    8.4 * x +
      0.38 * Math.sin(3.8 * y + 2.3 * z + 0.6) +
      0.15 * Math.sin(7.1 * z + 3.1 * y),
    6.8 * y +
      0.38 * Math.sin(3.2 * z + 2.8 * x + 2.1) +
      0.15 * Math.sin(6.3 * x - 2.6 * z),
    8.4 * z +
      0.38 * Math.sin(3.6 * x + 2 * y + 4) +
      0.15 * Math.sin(5.8 * y + 3.5 * x),
  ];
  const r = [
    0.825335615 * q[0] + 0.564642473 * q[2],
    q[1],
    -0.564642473 * q[0] + 0.825335615 * q[2],
  ];
  return [
    r[0],
    0.921060994 * r[1] - 0.389418342 * r[2],
    0.389418342 * r[1] + 0.921060994 * r[2],
  ];
}
export function boneTrabecularField(q) {
  const cell = q.map(Math.floor),
    f = q.map(fract);
  let first = 8,
    second = 8;
  for (let k = -1; k <= 1; k++)
    for (let j = -1; j <= 1; j++)
      for (let i = -1; i <= 1; i++) {
        const offset = [i, j, k],
          key = cell.map((v, c) => v + offset[c]);
        const center = offset.map(
          (v, c) =>
            v +
            0.13 +
            0.74 * boneHash(key.map((u) => u + [3.1, 11.7, 23.4][c])),
        );
        const d = Math.hypot(...center.map((v, c) => v - f[c]));
        if (d < first) {
          second = first;
          first = d;
        } else second = Math.min(second, d);
      }
  return second - first;
}
export function sampleBone(
  id,
  p,
  { footprint = 0, convex = 0, concave = 0, ao = 1 } = {},
) {
  const definition = definitionsById.get(id);
  if (!definition) throw new RangeError(`Unknown bone material: ${id}`);
  const grain = (q) => mix(boneNoise(q), 0.5, smoothstep(0.35, 1.4, footprint));
  const base = new THREE.Color(definition.baseColor).toArray();
  if (id === "cortical-bone") {
    const q = boneCoordinates(p),
      px = q[0] * 7.8,
      pz = q[2] * 7.8,
      cell = [Math.floor(px), Math.floor(pz)],
      f = [fract(px), fract(pz)];
    let first = 8,
      second = 8;
    for (let j = -1; j <= 1; j++)
      for (let i = -1; i <= 1; i++) {
        const key = [cell[0] + i, cell[1] + j],
          center = [
            i + 0.19 + 0.62 * boneHash([...key, 3.4]),
            j + 0.19 + 0.62 * boneHash([...key, 7.9]),
          ];
        const d = Math.hypot(center[0] - f[0], center[1] - f[1]);
        if (d < first) {
          second = first;
          first = d;
        } else second = Math.min(second, d);
      }
    const aa = clamp(footprint, 0.004, 0.055),
      resolved = 1 - smoothstep(0.08, 0.28, footprint),
      canal = mix(
        0.012,
        1 - smoothstep(0.04 - aa, 0.077 + aa, first),
        resolved,
      ),
      lamella = mix(
        0.5 + 0.5 * Math.cos(first * 68),
        0.5,
        Math.max(1 - resolved, smoothstep(0.7, 3.14, footprint * 68)),
      ),
      cement = mix(
        0.055,
        1 -
          smoothstep(0.008, 0.027 + Math.min(footprint, 0.04), second - first),
        resolved,
      );
    const mineral = grain([
        q[0] * 2.4 + 3.7,
        q[1] * 0.42 + 3.7,
        q[2] * 2.4 + 3.7,
      ]),
      fiber = grain([q[0] * 175, q[1] * 4.5, q[2] * 175]);
    const albedo = base.map(
      (v) =>
        v *
        (0.93 + 0.1 * mineral) *
        (0.97 + 0.06 * lamella - 0.037 * cement) *
        (0.985 + 0.03 * fiber),
    );
    return {
      q,
      canal,
      lamella,
      cement,
      albedo,
      roughness: clamp(
        0.58 + 0.065 * fiber + 0.065 * canal + 0.035 * concave - 0.035 * convex,
        0.0525,
        1,
      ),
      height:
        0.00048 * (lamella - 0.5) +
        0.00038 * (fiber - 0.5) -
        0.0036 * canal -
        0.00065 * cement,
      visibility: 1 - 0.52 * canal,
      ao,
    };
  }
  const q = boneTrabecularCoordinates(p),
    field = boneTrabecularField(q),
    width = 0.065 + 0.09 * boneNoise(p.map((v) => v * 3.1 + 7.3)),
    aa = clamp(footprint * 0.42, 0.007, 0.05),
    resolution = 1 - smoothstep(0.45, 1.6, footprint);
  const pore = mix(
    0.3,
    smoothstep(width - aa, width + 0.24 + aa, field),
    resolution,
  );
  const mineral = grain([p[0] * 4.2 + 4.6, p[1] * 3.1 + 4.6, p[2] * 4.2 + 4.6]),
    fine = grain(p.map((v) => v * 145 + 8.1));
  return {
    q,
    field,
    pore,
    albedo: base.map((v) => v * (0.88 + 0.17 * mineral) * (0.98 + 0.04 * fine)),
    roughness: clamp(
      0.75 + 0.17 * pore + 0.045 * fine + 0.03 * concave - 0.025 * convex,
      0.0525,
      1,
    ),
    height: -0.029 * pore + 0.001 * (fine - 0.5) * resolution,
    visibility: mix(1, 0.2, pore ** 0.85),
    ao,
  };
}
