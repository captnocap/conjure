import * as THREE from "./vendor/three.module.min.js";

// Three different tissue-inspired solids for the unchanged still life. Pattern
// scale is artistic: neither a medical model nor a measured spectral BSSRDF.
export const softTissueDefinitions = Object.freeze([
  Object.freeze({
    id: "skin",
    name: "Skin",
    baseColor: "#c99176",
    metalness: 0,
    roughness: 0.49,
    transmission: 0,
    ior: 1.4,
    clearcoat: 0.12,
    clearcoatRoughness: 0.3,
    description: "Warm dermal body, layered mottling and fine recessed pores",
  }),
  Object.freeze({
    id: "adipose",
    name: "Fatty tissue",
    baseColor: "#ead5a0",
    metalness: 0,
    roughness: 0.34,
    transmission: 0,
    ior: 1.44,
    clearcoat: 0.24,
    clearcoatRoughness: 0.22,
    description: "Packed rounded lobules, pale septa and a soft waxy body",
  }),
  Object.freeze({
    id: "muscle",
    name: "Aligned muscle",
    baseColor: "#a95c52",
    metalness: 0,
    roughness: 0.36,
    transmission: 0,
    ior: 1.4,
    anisotropy: 0.68,
    clearcoat: 0.25,
    clearcoatRoughness: 0.2,
    description:
      "Continuous longitudinal fascicles, fine cross-striation and moist directional sheen",
  }),
]);
const byId = new Map(softTissueDefinitions.map((d) => [d.id, d]));
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
varying vec3 vTissueViewX;
varying vec3 vTissueViewY;
varying vec3 vTissueViewZ;
`;
const fragmentInputs = /* glsl */ `
varying vec3 vMaterialPosition;
varying vec3 vMaterialBaked;
varying float vMaterialLightAO;
varying vec3 vMaterialConvexEdge;
varying vec3 vMaterialConcaveEdge;
varying vec3 vTissueViewX;
varying vec3 vTissueViewY;
varying vec3 vTissueViewZ;
float tissueHash(vec3 p) {
  p=fract(p*0.1031); p+=dot(p,p.yzx+33.33);
  return fract((p.x+p.y)*p.z);
}
float tissueNoise(vec3 p) {
  vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(tissueHash(i),tissueHash(i+vec3(1,0,0)),f.x),
    mix(tissueHash(i+vec3(0,1,0)),tissueHash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(tissueHash(i+vec3(0,0,1)),tissueHash(i+vec3(1,0,1)),f.x),
    mix(tissueHash(i+vec3(0,1,1)),tissueHash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float tissueFiltered(vec3 p) {
  float footprint=max(length(dFdx(p)),length(dFdy(p)));
  return mix(tissueNoise(p),0.5,smoothstep(0.35,1.35,footprint));
}
float tissueFbm(vec3 p) {
  return 0.58*tissueFiltered(p)+0.28*tissueFiltered(p*2.03+17.1)+0.14*tissueFiltered(p*4.17+9.2);
}
// Bounded feature jitter. Searching adjacent cells gives a continuous volume;
// no UVs, triplanar charts, screen coordinates, clocks or random seeds.
vec3 tissueCells(vec3 p) {
  vec3 cell=floor(p),f=fract(p);float first=20.0,second=20.0,tag=0.0;
  for(int z=-1;z<=1;z++) for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++) {
    vec3 o=vec3(float(x),float(y),float(z)),key=cell+o;
    vec3 jitter=vec3(tissueHash(key+1.3),tissueHash(key+8.9),tissueHash(key+19.7));
    vec3 delta=o+0.28+0.44*jitter-f;float d=dot(delta,delta);
    if(d<first){second=first;first=d;tag=tissueHash(key+37.3);}else second=min(second,d);
  }
  return vec3(sqrt(first),sqrt(second)-sqrt(first),tag);
}
vec2 tissueColumns(vec2 p) {
  vec2 cell=floor(p),f=fract(p);float first=20.0,second=20.0;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++) {
    vec2 o=vec2(float(x),float(y)),key=cell+o;
    vec2 jitter=vec2(tissueHash(vec3(key,1.3)),tissueHash(vec3(key,8.9)));
    vec2 delta=o+0.23+0.54*jitter-f;float d=dot(delta,delta);
    if(d<first){second=first;first=d;}else second=min(second,d);
  }
  return vec2(sqrt(first),sqrt(second)-sqrt(first));
}
// Analytic invertible shear: determinant = 1. Fibers keep q.x/q.z constant.
vec3 tissueMuscleCoordinates(vec3 p,out vec3 fiber) {
  float dx=0.098*cos(1.4*p.y)+0.080*cos(4.0*p.y+0.5);
  float dz=0.066*cos(1.1*p.y+0.7)+0.074*cos(3.7*p.y);
  fiber=normalize(vec3(-dx,1.0,-dz));
  return p+vec3(0.07*sin(1.4*p.y)+0.02*sin(4.0*p.y+0.5),0.0,
    0.06*sin(1.1*p.y+0.7)+0.02*sin(3.7*p.y));
}
vec3 tissueBump(vec3 n,vec3 positionInView,float height) {
  vec3 dx=dFdx(positionInView),dy=dFdy(positionInView);
  vec3 r1=cross(dy,n),r2=cross(n,dx);
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
`;
const fieldSetup = /* glsl */ `
vec3 tissueP=vMaterialPosition;
float convexDistance=min(vMaterialConvexEdge.x,min(vMaterialConvexEdge.y,vMaterialConvexEdge.z));
float concaveDistance=min(vMaterialConcaveEdge.x,min(vMaterialConcaveEdge.y,vMaterialConcaveEdge.z));
float tissueConvex=max(1.0-exp(-max(vMaterialBaked.x,0.0)*0.2),exp(-max(convexDistance,0.0)*65.0));
float tissueConcave=max(1.0-exp(-max(vMaterialBaked.y,0.0)*0.24),exp(-max(concaveDistance,0.0)*45.0));
float atelierAO=clamp(vMaterialBaked.z,0.0,1.0);
float tissuePool=clamp(tissueConcave*0.72+(1.0-atelierAO)*0.42,0.0,1.0);
float tissueHeight=0.0;
float tissueRoughness=roughness;
float tissueCoatRoughness=0.24;
vec3 tissueFiberView=normalize(vTissueViewY);
`;
const surfaces = {
  skin: /* glsl */ `
    float dermal=tissueFbm(tissueP*3.4+8.7);
    float mottling=tissueFbm(tissueP*12.0+23.1);
    float fine=tissueFiltered(tissueP*135.0+9.1);
    vec3 poreP=tissueP*43.0;
    vec3 poreCell=tissueCells(poreP);
    float poreAA=max(0.025,fwidth(poreCell.x)*0.55);
    float poreVisibility=1.0-smoothstep(0.38,1.3,max(length(dFdx(poreP)),length(dFdy(poreP))));
    float pores=(1.0-smoothstep(0.11-poreAA,0.24+poreAA,poreCell.x))*poreVisibility;
    float skinCrease=(1.0-smoothstep(0.018,0.085+fwidth(poreCell.y),poreCell.y))*poreVisibility;
    // Pigment layers only, in linear RGB. No light/AO is baked into albedo.
    diffuseColor.rgb*=0.88+0.23*dermal;
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.47,0.155,0.115),smoothstep(0.38,0.72,mottling)*0.24);
    diffuseColor.rgb*=1.0-0.13*pores-0.025*skinCrease;
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.66,0.40,0.27),tissueConvex*0.10);
    tissueRoughness=0.43+0.11*mottling+0.045*pores+0.035*tissuePool;
    tissueHeight=-0.0018*pores-0.00035*skinCrease+0.00055*(fine-0.5)+0.00075*(mottling-0.5);
    tissueCoatRoughness=0.27+0.075*mottling+0.045*pores;
  `,
  adipose: /* glsl */ `
    float body=tissueFbm(tissueP*2.6+6.1);
    // Successive shears break the visible lattice while keeping the volume
    // continuous and invertible, including across object surface charts.
    vec3 lobuleP=tissueP*6.6;
    lobuleP.x+=0.42*sin(lobuleP.y*0.91)+0.23*sin(lobuleP.z*1.31);
    lobuleP.y+=0.38*sin(lobuleP.z*0.87)+0.19*sin(lobuleP.x*1.13);
    lobuleP.z+=0.41*sin(lobuleP.x*0.79)+0.22*sin(lobuleP.y*1.21);
    vec3 lobule=tissueCells(lobuleP);
    float footprint=max(length(dFdx(lobuleP)),length(dFdy(lobuleP)));
    float resolved=1.0-smoothstep(0.45,1.4,footprint);
    float septa=(1.0-smoothstep(0.035,0.14+fwidth(lobule.y)*0.65,lobule.y))*resolved;
    float dome=exp(-2.6*lobule.x*lobule.x)*resolved;
    float fine=tissueFiltered(tissueP*95.0+2.7);
    diffuseColor.rgb*=0.87+0.13*body+0.10*dome;
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.76,0.60,0.38),septa*0.28);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.91,0.80,0.59),tissueConvex*0.14);
    tissueRoughness=0.29+0.07*body+0.11*septa+0.045*tissuePool;
    tissueHeight=0.008*(dome-0.4)-0.0018*septa+0.00045*(fine-0.5);
    tissueCoatRoughness=0.19+0.13*septa+0.04*tissuePool;
  `,
  muscle: /* glsl */ `
    vec3 fiber;
    vec3 q=tissueMuscleCoordinates(tissueP,fiber);
    vec2 fascicle=tissueColumns(q.xz*17.0);
    float fascicleFootprint=max(length(dFdx(q.xz*17.0)),length(dFdy(q.xz*17.0)));
    float fascicleResolved=1.0-smoothstep(0.45,1.4,fascicleFootprint);
    float sheath=(1.0-smoothstep(0.012,0.06+fwidth(fascicle.y)*0.45,fascicle.y))*fascicleResolved;
    float fiberNoise=tissueFiltered(q*vec3(28.0,0.65,28.0)+31.2);
    float bundle=tissueFiltered(q*vec3(7.0,0.4,7.0)+7.1);
    float phase=q.y*72.0+0.18*tissueNoise(q*vec3(13.0,0.4,13.0));
    float striae=(0.5+0.5*cos(6.28318530718*phase));
    striae=mix(striae,0.5,smoothstep(0.10,0.48,fwidth(phase)));
    diffuseColor.rgb*=0.62+0.21*bundle+0.34*fiberNoise;
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.51,0.27,0.205),sheath*0.14);
    diffuseColor.rgb*=0.965+0.07*striae;
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.46,0.215,0.17),tissueConvex*0.10);
    tissueRoughness=0.28+0.11*fiberNoise+0.07*sheath+0.06*tissuePool;
    tissueHeight=0.006*(fiberNoise-0.5)-0.00055*sheath+0.0008*(bundle-0.5)+0.00025*(striae-0.5);
    tissueCoatRoughness=0.16+0.07*sheath+0.055*tissuePool;
    tissueFiberView=normalize(vTissueViewX*fiber.x+vTissueViewY*fiber.y+vTissueViewZ*fiber.z);
  `,
};
const musclePhysical = /* glsl */ `
#ifdef USE_ANISOTROPY
  vec3 tissueProjected=tissueFiberView-normal*dot(tissueFiberView,normal);
  float tissueProjectionSq=dot(tissueProjected,tissueProjected);
  vec3 tissueFallbackAxis=abs(normal.y)<0.9?vec3(0,1,0):vec3(1,0,0);
  vec3 tissueFallback=normalize(cross(normal,tissueFallbackAxis));
  material.anisotropyT=tissueProjectionSq>1e-8?tissueProjected*inversesqrt(max(tissueProjectionSq,1e-8)):tissueFallback;
  material.anisotropyB=normalize(cross(normal,material.anisotropyT));
  material.anisotropy=0.68*smoothstep(0.025,0.72,tissueProjectionSq);
  material.roughness=clamp(material.roughness+0.09*(1.0-tissueProjectionSq),0.0525,1.0);
  material.alphaT=mix(pow2(material.roughness),1.0,pow2(material.anisotropy));
#endif
`;
function bodyWrap(id) {
  const d =
    id === "skin"
      ? { width: "0.40", weight: "vec3(0.46,0.24,0.13)" }
      : id === "adipose"
        ? { width: "0.48", weight: "vec3(0.38,0.34,0.23)" }
        : { width: "0.22", weight: "vec3(0.20,0.075,0.055)" };
  return /* glsl */ `
  // Shadow-aware local diffuse approximation. The normalized wrapped cosine
  // redistributes response; no emission, thickness ray, screen blur or BSSRDF.
  void RE_Direct_AtelierTissue(const in IncidentLight directLight,const in vec3 geometryPosition,
    const in vec3 geometryNormal,const in vec3 geometryViewDir,const in vec3 geometryClearcoatNormal,
    const in PhysicalMaterial material,inout ReflectedLight reflectedLight) {
    RE_Direct_Physical(directLight,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,reflectedLight);
    float raw=dot(geometryNormal,directLight.direction);
    float wrap=max(raw+${d.width},0.0)/pow(1.0+${d.width},2.0);
    reflectedLight.directDiffuse+=directLight.color*BRDF_Lambert(material.diffuseColor)*${d.weight}*(wrap-max(raw,0.0));
  }
  #undef RE_Direct
  #define RE_Direct RE_Direct_AtelierTissue
  `;
}
export function injectSoftTissueShader(shader, id, albedo = false) {
  if (!byId.has(id))
    throw new RangeError(`Unknown soft tissue material: ${id}`);
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", `#include <common>\n${vertexInputs}`)
    .replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vMaterialPosition=position;
      vMaterialBaked = vec3(materialConvex, materialConcave, materialAO);
      vMaterialLightAO = materialLightAO;
      vMaterialConvexEdge=materialConvexEdge;
      vMaterialConcaveEdge=materialConcaveEdge;
      vTissueViewX=mat3(modelViewMatrix)*vec3(1,0,0);
      vTissueViewY=mat3(modelViewMatrix)*vec3(0,1,0);
      vTissueViewZ=mat3(modelViewMatrix)*vec3(0,0,1);`,
    );
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", `#include <common>\n${fragmentInputs}`)
    .replace(
      "#include <color_fragment>",
      `#include <color_fragment>\n${fieldSetup}\n${surfaces[id]}`,
    );
  if (albedo) {
    // Exact procedural linear pigment, with optics removed. This does not
    // pretend to be backlit/absorbed/transmitted light or a skin color measure.
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <opaque_fragment>",
        "gl_FragColor = vec4(diffuseColor.rgb, diffuseColor.a);",
      )
      .replace("#include <colorspace_fragment>", "");
    return;
  }
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <roughnessmap_fragment>",
      "#include <roughnessmap_fragment>\nroughnessFactor=clamp(tissueRoughness,0.0525,1.0);",
    )
    .replace(
      "#include <normal_fragment_maps>",
      "#include <normal_fragment_maps>\nnormal=tissueBump(normal,-vViewPosition,tissueHeight);",
    )
    .replace(
      "#include <clearcoat_normal_fragment_maps>",
      "#include <clearcoat_normal_fragment_maps>\nclearcoatNormal=tissueBump(clearcoatNormal,-vViewPosition,tissueHeight*0.55);",
    )
    .replace(
      "#include <lights_physical_pars_fragment>",
      `#include <lights_physical_pars_fragment>\n${bodyWrap(id)}`,
    )
    .replace(
      "#include <lights_physical_fragment>",
      `#include <lights_physical_fragment>
      #ifdef USE_CLEARCOAT
        material.clearcoatRoughness=clamp(tissueCoatRoughness,0.0525,1.0);
      #endif
      ${id === "muscle" ? musclePhysical : ""}`,
    )
    .replace(
      "#include <aomap_fragment>",
      `#include <aomap_fragment>
      // Ambient light visibility is independent of geometric wear/appearance AO.
      // Negative fallback preserves callers with only the legacy materialAO.
      float atelierLightAO = vMaterialLightAO < 0.0 ? atelierAO : clamp(vMaterialLightAO, 0.0, 1.0);
      reflectedLight.indirectDiffuse *= atelierLightAO;
      reflectedLight.indirectSpecular*=computeSpecularOcclusion(saturate(dot(geometryNormal,geometryViewDir)),atelierLightAO,material.roughness);
      #ifdef USE_CLEARCOAT
        clearcoatSpecularIndirect*=mix(1.0,atelierLightAO,0.65);
      #endif`,
    );
}
export function createSoftTissueMaterial(
  id,
  environment,
  { side = THREE.FrontSide, albedo = false } = {},
) {
  const d = byId.get(id);
  if (!d) throw new RangeError(`Unknown soft tissue material: ${id}`);
  if (![THREE.FrontSide, THREE.BackSide, THREE.DoubleSide].includes(side))
    throw new RangeError("Invalid material side");
  const material = new THREE.MeshPhysicalMaterial({
    color: d.baseColor,
    metalness: 0,
    roughness: d.roughness,
    transmission: 0,
    ior: d.ior,
    anisotropy: albedo ? 0 : d.anisotropy || 0,
    clearcoat: albedo ? 0 : d.clearcoat,
    clearcoatRoughness: d.clearcoatRoughness,
    envMap: albedo ? null : environment,
    envMapIntensity: 0.48,
    side,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  });
  material.name = `Atelier ${d.name}${albedo ? " albedo" : ""}`;
  material.toneMapped = !albedo;
  material.fog = !albedo;
  material.userData = {
    materialId: id,
    physicalSurface: true,
    bakedGeometry: true,
    tissueApproximation: "procedural-pigment-local-diffuse-wrap",
    ...(albedo ? { albedoSurface: true } : {}),
  };
  material.defaultAttributeValues = {
    materialConvex: [0],
    materialConcave: [0],
    materialAO: [1],
    materialLightAO: [-1], // Legacy fallback: use materialAO when the new input is absent.
    materialConvexEdge: [1e4, 1e4, 1e4],
    materialConcaveEdge: [1e4, 1e4, 1e4],
  };
  material.onBeforeCompile = (shader) =>
    injectSoftTissueShader(shader, id, albedo);
  material.customProgramCacheKey = () =>
    `atelier-soft-tissue-v3:${id}:${side}:${albedo ? "albedo" : "physical"}`;
  return material;
}

// Independent CPU coordinate oracle used by the finite-difference tests.
export function muscleCoordinates([x, y, z]) {
  const dx = 0.098 * Math.cos(1.4 * y) + 0.08 * Math.cos(4 * y + 0.5);
  const dz = 0.066 * Math.cos(1.1 * y + 0.7) + 0.074 * Math.cos(3.7 * y);
  const length = Math.hypot(dx, 1, dz);
  return {
    q: [
      x + 0.07 * Math.sin(1.4 * y) + 0.02 * Math.sin(4 * y + 0.5),
      y,
      z + 0.06 * Math.sin(1.1 * y + 0.7) + 0.02 * Math.sin(3.7 * y),
    ],
    fiber: [-dx / length, 1 / length, -dz / length],
    determinant: 1,
  };
}
export function muscleInverse([u, y, v]) {
  return [
    u - 0.07 * Math.sin(1.4 * y) - 0.02 * Math.sin(4 * y + 0.5),
    y,
    v - 0.06 * Math.sin(1.1 * y + 0.7) - 0.02 * Math.sin(3.7 * y),
  ];
}
