import * as THREE from 'three';

// Uniform pigment is linear RGB. baseColor is its rounded sRGB display swatch.
export const tiledSurfaceDefinition = Object.freeze({
  id: 'tiled-surface', name: 'Tiled surface', baseColor: '#1d1d1d',
  linearPigment: Object.freeze([.012, .012, .012]),
  metalness: 0, roughness: .63, ior: 1.5, transmission: 0,
  description: 'Dark abstract plate relief with stock dielectric reflection',
});

const vertexInputs = /* glsl */ `
varying vec3 vTilePosition;
varying float vTileLightAO;
attribute float materialLightAO;
varying float vTileAO;
attribute float materialAO;
`;
const vertexBody = /* glsl */ `
vTilePosition=position;vTileLightAO=materialLightAO;
vTileAO=materialAO;
`;
const field = /* glsl */ `
// Frozen abstract plate field. Object-space coordinates and relief units are inherited.
varying vec3 vTilePosition;
varying float vTileLightAO;
uniform float tileRelief;
uniform float tileRoughnessVariation;
uniform float tileTopology;
uniform vec3 tilePigment;
float tileHash(vec3 p) { p=fract(p*0.1031); p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z); }
// Locate a point in a jittered, monotone 1D partition. Adjacent boundaries
// stay >= .56 nominal intervals apart. Four neighbors suffice in the fixed
// scene's bounded coordinate domain: -1 supersedes -2 and +2 brackets above.
vec3 tileInterval(float x, vec3 seed) {
  float id=floor(x), lo=-1e4, hi=1e4, lowid=0.;
  for(int k=-1;k<=2;k++) {
    float j=id+float(k);
    float b=j+0.22*(2.*tileHash(seed+vec3(j,13.7,29.3))-1.);
    if(b<=x && b>lo){lo=b;lowid=j;}
    if(b>x && b<hi)hi=b;
  }
  return vec3(x-lo,hi-x,lowid);
}
void tileField(vec3 p, float fp, out float height,out float fissure,out float rough) {
  if(tileTopology>.5) p=mat3(.7071,.4082,.5774,-.7071,.4082,.5774,0.,-.8165,.5774)*p;
  // Irregular, gently bent transverse plate boundaries. Their order is bounded;
  // the sinusoidal bend is structural, not within-face grain.
  float base=floor(p.y/.205), lo=-1e4,hi=1e4,row=0.;
  // Maximum bend/jitter .07905 is below half the .205 row spacing.
  for(int k=-1;k<=2;k++) {
    float j=base+float(k),r=tileHash(vec3(j,7.3,19.1));
    float b=.205*(j+.21*(2.*r-1.))
      +.027*sin(p.x*9.7+p.z*8.3+r*6.28)
      +.009*sin(p.x*27.1-p.z*25.7+r*12.3);
    if(b<=p.y && b>lo){lo=b;row=j;}
    if(b>p.y && b<hi)hi=b;
  }
  vec3 iy=vec3((p.y-lo)/.205,(hi-p.y)/.205,row);
  vec3 q=p;
  q.x+=.042*sin(p.y*2.9+p.z*3.1)+.025*sin(p.z*12.7+p.y*.7);
  q.z+=.043*sin(p.y*1.9+p.x*2.7)+.022*sin(p.x*11.3-p.y*.8);
  // Longitudinal divisions end at transverse fissures and persist for a few
  // plate rows. Staggering avoids an unbroken brick-grid seam.
  float run=floor(row/3.);
  vec3 ix=tileInterval(q.x/.34+.24*sin(row*.8),vec3(run*3.1,7.4,9.2));
  vec3 iz=tileInterval(q.z/.37+.27*sin(row*1.1),vec3(run*2.8,3.7,5.2));
  float crossDistance=min(iy.x,iy.y)*.205;
  float longDistance=min(min(ix.x,ix.y)*.34,min(iz.x,iz.y)*.37);
  float resolved=1.-smoothstep(.045,.12,fp);
  float crossFace=smoothstep(.003,.021,crossDistance);
  float longFace=smoothstep(.001,.011,longDistance);
  float phase=iy.x/max(iy.x+iy.y,.0001);
  float crown=pow(max(sin(3.14159265*phase),0.),2.);
  float face=tileHash(vec3(ix.z,iy.z,iz.z));
  height=tileRelief*resolved*(-.009*(1.-crossFace)+crossFace*(-.003*(1.-longFace)+.006*(.75+.5*face)*crown*longFace));
  fissure=(1.-crossFace*longFace)*resolved;
  rough=mix(.63,mix(.63,.89,fissure),tileRoughnessVariation);
}

// A square screen pixel maps to a generally skewed object-space parallelogram.
// Opposite boundary quadrature approximates the derivative of the continuous
// fixed-footprint box average, not the exact derivative of the separate 2x2
// interior midpoint estimate. Two samples integrate each boundary; four
// interior samples average fissure/roughness. This is finite quadrature,
// not filtered BRDF closure or screen-space image filtering.
vec2 tileHeightDerivative;
void tileSurface(out float height, out float fissure, out float rough) {
  vec3 p=vTilePosition, px=dFdx(p), py=dFdy(p);
  float fp=max(length(px),length(py));
  float h,f,r,hp,hm,unused;
  height=0.;fissure=0.;rough=0.;tileHeightDerivative=vec2(0.);
  for(int i=0;i<2;i++) {
    float t=(float(i)+.5)/2.-.5;
    tileField(p+.5*px+t*py,fp,hp,f,r);
    tileField(p-.5*px+t*py,fp,hm,f,r);
    tileHeightDerivative.x+=(hp-hm)*.5;
    tileField(p+.5*py+t*px,fp,hp,f,r);
    tileField(p-.5*py+t*px,fp,hm,f,r);
    tileHeightDerivative.y+=(hp-hm)*.5;
    for(int j=0;j<2;j++) {
      float u=(float(j)+.5)/2.-.5;
      tileField(p+t*px+u*py,fp,h,f,r);
      height+=h*.25;fissure+=f*.25;rough+=r*.25;
    }
  }
}
`;
const bump = /* glsl */ `
vec3 tileBump(vec3 n, vec3 positionInView, float height) {
  vec3 dx = dFdx(positionInView), dy = dFdy(positionInView);
  vec3 r1 = cross(dy, n), r2 = cross(n, dx);
  // Three reverses raster winding and native bumpScale for BackSide.
  // Procedural height bypasses bumpScale; preserve its orientation explicitly.
  float reliefFaceSign=1.0;
  #ifdef DOUBLE_SIDED
    reliefFaceSign=gl_FrontFacing ? 1.0 : -1.0;
  #endif
  #ifdef FLIP_SIDED
    reliefFaceSign=-1.0;
  #endif
  float determinant = dot(dx, r1) * reliefFaceSign;
  vec3 gradient = sign(determinant) * (tileHeightDerivative.x * r1 + tileHeightDerivative.y * r2);
  return normalize(max(abs(determinant), 1e-9) * n - gradient);
}
`;

export function createTiledSurfaceMaterial(environment, { side = THREE.FrontSide, albedo = false } = {}) {
  if (![THREE.FrontSide, THREE.BackSide, THREE.DoubleSide].includes(side)) throw new RangeError('Invalid material side');
  const d = tiledSurfaceDefinition;
  const color = new THREE.Color().setRGB(...d.linearPigment, THREE.LinearSRGBColorSpace);
  if (albedo) {
    // No optical material, field evaluation, AO, environment, or texture allocation.
    const material = new THREE.MeshBasicMaterial({ color, side, toneMapped: false, fog: false,
      transparent: false, opacity: 1, depthWrite: true });
    material.name = 'Atelier Tiled surface pigment';
    material.userData = { materialId: d.id, albedoSurface: true, uniformPigment: true };
    material.customProgramCacheKey = () => `atelier-tiled-surface-v1:albedo:${side}`;
    return material;
  }
  const material = new THREE.MeshPhysicalMaterial({ color, metalness: 0,
    roughness: d.roughness, ior: d.ior, specularIntensity: 1, specularColor: '#ffffff',
    clearcoat: 0, transmission: 0, anisotropy: 0, iridescence: 0, sheen: 0,
    // Frozen native evidence applies this effective shader intensity. Its .48
    // outer metadata is overridden by uniform 1; see environment audit.
    envMap: environment ?? null, envMapIntensity: 1, side,
    transparent: false, opacity: 1, depthWrite: true });
  material.name = 'Atelier Tiled surface';
  material.defaultAttributeValues = { materialAO: [1], materialLightAO: [-1] };
  material.userData = { materialId: d.id, physicalSurface: true, bakedGeometry: true,
    normalReliefOnly: true, uniformPigment: true,
    metric: 'object-space-pattern-view-space-relief' };
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, {
      tileRelief: { value: 1 }, tileRoughnessVariation: { value: 1 },
      tileTopology: { value: 0 }, tilePigment: { value: new THREE.Vector3(...d.linearPigment) },
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${vertexInputs}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${vertexBody}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${field}\n${bump}\nvarying float vTileAO;`)
      .replace('#include <color_fragment>', '#include <color_fragment>\nfloat tileHeight,tileFissure,tileRough;tileSurface(tileHeight,tileFissure,tileRough);diffuseColor.rgb=tilePigment;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=tileRough;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal=tileBump(normal,-vViewPosition,tileHeight);')
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
float tileAO=clamp(vTileLightAO<0.0?vTileAO:vTileLightAO,0.,1.);reflectedLight.indirectDiffuse*=tileAO;reflectedLight.indirectSpecular*=computeSpecularOcclusion(saturate(dot(geometryNormal,geometryViewDir)),tileAO,material.roughness);`);
  };
  material.customProgramCacheKey = () => `atelier-tiled-surface-v2:physical:${side}`;
  // Three Material.dispose does not own or dispose the supplied environment.
  return material;
}
