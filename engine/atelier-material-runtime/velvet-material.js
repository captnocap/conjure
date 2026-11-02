import * as THREE from "three";

// A short-pile surface approximation, using Three r180's Charlie distribution
// and Neubelt visibility. Not measured velvet, fiber geometry, or volume SSS.
export const velvetDefinition = Object.freeze({
  id: "velvet",
  name: "Velvet",
  baseColor: "#174b53",
  metalness: 0,
  roughness: 0.94,
  transmission: 0,
  ior: 1.46,
  sheen: 0.88,
  sheenColor: "#70b4bd",
  sheenRoughness: 0.68,
  description: "Deep dyed pile and a broad, soft grazing fiber sheen",
});

const vertexInputs = /* glsl */ `
attribute float materialConvex;
attribute float materialConcave;
attribute float materialAO;
attribute float materialLightAO;
attribute vec3 materialConvexEdge;
attribute vec3 materialConcaveEdge;
varying vec3 vVelvetPosition;
varying vec3 vVelvetNormal;
varying vec3 vVelvetBaked;
varying float vVelvetLightAO;
varying vec3 vVelvetConvexEdge;
varying vec3 vVelvetConcaveEdge;
`;

const fragmentInputs = /* glsl */ `
varying vec3 vVelvetPosition;
varying vec3 vVelvetNormal;
varying vec3 vVelvetBaked;
varying float vVelvetLightAO;
varying vec3 vVelvetConvexEdge;
varying vec3 vVelvetConcaveEdge;
float velvetHash(vec3 p) {
  p=fract(p*0.1031); p+=dot(p,p.yzx+33.33);
  return fract((p.x+p.y)*p.z);
}
float velvetNoise(vec3 p) {
  vec3 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(velvetHash(i),velvetHash(i+vec3(1,0,0)),f.x),
    mix(velvetHash(i+vec3(0,1,0)),velvetHash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(velvetHash(i+vec3(0,0,1)),velvetHash(i+vec3(1,0,1)),f.x),
    mix(velvetHash(i+vec3(0,1,1)),velvetHash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float velvetFiltered(vec3 p) {
  float footprint=max(length(dFdx(p)),length(dFdy(p)));
  // Unresolved pile converges to its mean; no screen-space grain or sparkle.
  return mix(velvetNoise(p),0.5,smoothstep(0.35,1.25,footprint));
}
vec3 velvetBump(vec3 n,vec3 viewPosition,float height,float faceSign) {
  vec3 dx=dFdx(viewPosition),dy=dFdy(viewPosition);
  vec3 r1=cross(dy,n),r2=cross(n,dx);
  // Match Three's perturbNormalArb handedness on back faces and mirrored meshes.
  float determinant=dot(dx,r1)*faceSign;
  vec3 gradient=sign(determinant)*(dFdx(height)*r1+dFdy(height)*r2);
  return normalize(max(abs(determinant),1e-9)*n-gradient);
}
`;

const surfaceBody = /* glsl */ `
vec3 velvetP=vVelvetPosition;
float velvetGeometryAO=clamp(vVelvetBaked.z,0.0,1.0);
float velvetConvexDistance=min(vVelvetConvexEdge.x,min(vVelvetConvexEdge.y,vVelvetConvexEdge.z));
float velvetConcaveDistance=min(vVelvetConcaveEdge.x,min(vVelvetConcaveEdge.y,vVelvetConcaveEdge.z));
float velvetConvex=max(1.0-exp(-max(vVelvetBaked.x,0.0)*0.2),exp(-max(velvetConvexDistance,0.0)*65.0));
float velvetConcave=max(1.0-exp(-max(vVelvetBaked.y,0.0)*0.24),exp(-max(velvetConcaveDistance,0.0)*45.0));
float velvetCompression=clamp(velvetConcave*0.7+(1.0-velvetGeometryAO)*0.3,0.0,1.0);
vec3 velvetObjectNormal=normalize(vVelvetNormal);
float velvetDirectionWeight=smoothstep(0.02,0.6,clamp(1.0-velvetObjectNormal.y*velvetObjectNormal.y,0.0,1.0));
// The object-Y pile has no preferred surface direction on an end face. Fade
// its elongated texture to isotropic grain there without inventing a tangent.
float velvetNap=mix(velvetFiltered(velvetP*35.0+vec3(6.1,2.3,13.7)),
  velvetFiltered(velvetP*vec3(35.0,8.0,35.0)+vec3(6.1,2.3,13.7)),velvetDirectionWeight);
float velvetPile=mix(velvetFiltered(velvetP*150.0+vec3(11.4,7.2,3.8)),
  velvetFiltered(velvetP*vec3(150.0,28.0,150.0)+vec3(11.4,7.2,3.8)),velvetDirectionWeight);
float velvetDye=velvetFiltered(velvetP*3.8+vec3(3.1,17.3,9.2));
// Pigment fields only. The optical sheen is not baked into albedo.
diffuseColor.rgb*=0.97+0.06*velvetDye;
float velvetRoughness=clamp(roughness+0.025*(velvetNap-0.5),0.88,1.0);
float velvetHeight=(0.00065*(velvetNap-0.5)+0.00025*(velvetPile-0.5))*(1.0-0.35*velvetCompression);
float velvetSheenStrength=(0.94+0.12*velvetNap)*(1.0-0.24*velvetCompression)*(1.0+0.025*velvetConvex);
float velvetSheenBaseRoughness=${velvetDefinition.sheenRoughness};
#ifdef USE_SHEEN
  velvetSheenBaseRoughness=sheenRoughness;
#endif
float velvetSheenRoughness=clamp(velvetSheenBaseRoughness+0.035*(velvetPile-0.5)-0.07*velvetCompression,0.5,0.8);
`;

export function injectVelvetShader(shader, albedo = false) {
  shader.vertexShader=shader.vertexShader
    .replace("#include <common>",`#include <common>\n${vertexInputs}`)
    .replace("#include <begin_vertex>",`#include <begin_vertex>
      vVelvetPosition=position;
      vVelvetNormal=normal;
      vVelvetBaked=vec3(materialConvex,materialConcave,materialAO);
      vVelvetLightAO=materialLightAO;
      vVelvetConvexEdge=materialConvexEdge;
      vVelvetConcaveEdge=materialConcaveEdge;`);
  shader.fragmentShader=shader.fragmentShader
    .replace("#include <common>",`#include <common>\n${fragmentInputs}`)
    .replace("#include <color_fragment>",`#include <color_fragment>\n${surfaceBody}`);
  if(albedo){
    shader.fragmentShader=shader.fragmentShader
      .replace("#include <opaque_fragment>","gl_FragColor=vec4(diffuseColor.rgb,diffuseColor.a);")
      .replace("#include <colorspace_fragment>","");
    return;
  }
  shader.fragmentShader=shader.fragmentShader
    .replace("#include <roughnessmap_fragment>","#include <roughnessmap_fragment>\nroughnessFactor=velvetRoughness;")
    .replace("#include <normal_fragment_maps>",`#include <normal_fragment_maps>
      float velvetFaceSign=1.0;
      #ifdef DOUBLE_SIDED
        velvetFaceSign=faceDirection;
      #endif
      // Three negates bumpScale for BackSide. Our procedural height bypasses
      // that uniform, so reproduce its orientation explicitly.
      #ifdef FLIP_SIDED
        velvetFaceSign=-1.0;
      #endif
      normal=velvetBump(normal,-vViewPosition,velvetHeight,velvetFaceSign);`)
    .replace("#include <lights_physical_fragment>",`#include <lights_physical_fragment>
      #ifdef USE_SHEEN
        material.sheenColor*=velvetSheenStrength;
        material.sheenRoughness=velvetSheenRoughness;
      #endif`)
    .replace("#include <aomap_fragment>",`#include <aomap_fragment>
      // Light visibility is independent of the frozen appearance bake.
      float velvetLightAO=vVelvetLightAO<0.0?velvetGeometryAO:clamp(vVelvetLightAO,0.0,1.0);
      reflectedLight.indirectDiffuse*=velvetLightAO;
      reflectedLight.indirectSpecular*=computeSpecularOcclusion(saturate(dot(geometryNormal,geometryViewDir)),velvetLightAO,material.roughness);
      #ifdef USE_SHEEN
        sheenSpecularIndirect*=velvetLightAO;
      #endif`);
}

export function createVelvetMaterial(environment,{side=THREE.FrontSide,albedo=false}={}) {
  if(![THREE.FrontSide,THREE.BackSide,THREE.DoubleSide].includes(side)) throw new RangeError("Invalid material side");
  const d=velvetDefinition;
  const material=new THREE.MeshPhysicalMaterial({
    color:d.baseColor,metalness:0,roughness:d.roughness,ior:d.ior,
    sheen:albedo?0:d.sheen,sheenColor:d.sheenColor,sheenRoughness:d.sheenRoughness,
    clearcoat:0,anisotropy:0,transmission:0,
    envMap:albedo?null:environment,envMapIntensity:albedo?0:0.48,
    side,transparent:false,opacity:1,depthWrite:true,
  });
  material.name=`Atelier ${d.name}${albedo?" albedo":""}`;
  material.toneMapped=!albedo;material.fog=!albedo;
  material.userData={materialId:d.id,physicalSurface:true,bakedGeometry:true,
    velvetApproximation:"charlie-sheen-filtered-short-pile",...(albedo?{albedoSurface:true}:{})};
  material.defaultAttributeValues={materialConvex:[0],materialConcave:[0],materialAO:[1],materialLightAO:[-1],
    materialConvexEdge:[1e4,1e4,1e4],materialConcaveEdge:[1e4,1e4,1e4]};
  material.onBeforeCompile=shader=>injectVelvetShader(shader,albedo);
  material.customProgramCacheKey=()=>`atelier-velvet-v1:${side}:${albedo?"albedo":"physical"}`;
  return material;
}
