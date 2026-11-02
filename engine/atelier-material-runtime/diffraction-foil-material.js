import * as THREE from 'three';
import {defaults,spectrumAt} from './diffraction-foil-model.js';
export const foilDefinition=Object.freeze({id:'diffraction-foil',name:'Diffraction foil',description:'Directional-light spectral glints and neutral studio reflection',baseColor:'#e7e7e7',metalness:1,roughness:.24,pitch:defaults.pitch,sigmaT:defaults.sigmaT,sigmaG:defaults.sigmaG,budget:defaults.budget});
// A returned LUT belongs to its caller. No process-global GPU texture exists.
// Signed scene-linear RGB is retained through lighting until stock ACES/sRGB.
export function getFoilLut(){
 const width=2048,data=new Uint16Array(width*4);
 for(let i=0;i<width;i++){const rgb=spectrumAt(-2+4*i/(width-1),0).map(v=>v*Math.sqrt(2*Math.PI)*defaults.sigmaG);for(let c=0;c<3;c++)data[i*4+c]=THREE.DataUtils.toHalfFloat(rgb[c]);data[i*4+3]=THREE.DataUtils.toHalfFloat(1);}
 const lut=new THREE.DataTexture(data,width,1,THREE.RGBAFormat,THREE.HalfFloatType);lut.minFilter=lut.magFilter=THREE.LinearFilter;lut.colorSpace=THREE.LinearSRGBColorSpace;lut.needsUpdate=true;lut.name='Foil D65 spectral angular kernel';return lut;
}
export function createFoilResources(){const texture=getFoilLut();let disposed=false;return {get lut(){if(disposed)throw new Error('Foil resources disposed');return texture;},get disposed(){return disposed;},dispose(){if(!disposed){disposed=true;texture.dispose();}}};}
const vin=`attribute float materialAO;attribute float materialLightAO;varying vec3 vFoilObjectNormal,vFoilViewY,vFoilViewObjectNormal;varying float vFoilAO,vFoilLightAO;`;
const fin=`varying vec3 vFoilObjectNormal,vFoilViewY,vFoilViewObjectNormal;varying float vFoilAO,vFoilLightAO;
uniform sampler2D foilLut;uniform float foilStrength;uniform float foilSigmaG;vec3 foilG,foilT;float foilBudget;`;
const setup=`
float foilNormalLength=max(length(vFoilObjectNormal),1e-8);
vec3 foilObjectNormal=vFoilObjectNormal/foilNormalLength;
float foilProjectionSq=max(1.0-pow2(foilObjectNormal.y),0.0);
vec3 foilGrooveView=vFoilViewY-vFoilViewObjectNormal*(foilObjectNormal.y/foilNormalLength);
vec3 foilProjected=foilGrooveView-normal*dot(foilGrooveView,normal);
float foilViewProjectionSq=dot(foilProjected,foilProjected);
float foilFloor=1e-12*max(dot(vFoilViewY,vFoilViewY),1e-30);
vec3 foilFallback=abs(normal.y)<.9?vec3(0,1,0):vec3(1,0,0);
foilG=foilViewProjectionSq>foilFloor?foilProjected*inversesqrt(max(foilViewProjectionSq,foilFloor)):normalize(cross(normal,foilFallback));
foilT=normalize(cross(foilG,normal));
foilBudget=foilStrength*smoothstep(.02,.75,foilProjectionSq);
`;
const physical=`
void RE_Direct_Foil(const in IncidentLight light,const in vec3 position,const in vec3 normal,const in vec3 V,const in vec3 clearcoatNormal,const in PhysicalMaterial material,inout ReflectedLight reflectedLight){
ReflectedLight zero=ReflectedLight(vec3(0),vec3(0),vec3(0),vec3(0));
RE_Direct_Physical(light,position,normal,V,clearcoatNormal,material,zero);
reflectedLight.directDiffuse+=(1.0-foilBudget)*zero.directDiffuse;
reflectedLight.directSpecular+=(1.0-foilBudget)*zero.directSpecular;
float nl=dot(normal,light.direction);if(nl<=0.0||dot(normal,V)<=0.0||foilBudget<=0.0)return;
// L+V deliberately unnormalized; source color remains the authored linear RGB.
vec3 sumLV=light.direction+V;float st=dot(sumLV,foilT),sg=dot(sumLV,foilG);
float u=((st+2.0)/4.0*2047.0+.5)/2048.0;
vec3 across=texture2D(foilLut,vec2(u,.5)).rgb;
float along=exp(-.5*pow2(sg/foilSigmaG))/(2.50662827463*foilSigmaG);
reflectedLight.directSpecular+=foilBudget*nl*light.color*across*along;
}
#undef RE_Direct
#define RE_Direct RE_Direct_Foil
`;
export function createFoilMaterial(environment,{side=THREE.FrontSide,albedo=false,strength=defaults.budget,resources=null}={}){
 if(![0,1,2].includes(side)||!Number.isFinite(strength)||strength<0||strength>1)throw new RangeError('Invalid foil options');
 const m=new THREE.MeshPhysicalMaterial({color:foilDefinition.baseColor,metalness:1,roughness:foilDefinition.roughness,envMap:albedo?null:environment,envMapIntensity:albedo?0:1.05,side,transparent:false,opacity:1,depthWrite:true});
 const owned=!resources&&!albedo,resource=albedo?null:(resources||createFoilResources());if(resource?.disposed)throw new Error('Foil resources disposed');if(owned)m.addEventListener('dispose',()=>resource.dispose());
 m.name=`Atelier Diffraction foil${albedo?' albedo':''}`;m.toneMapped=!albedo;m.fog=!albedo;m.defaultAttributeValues={materialAO:[1],materialLightAO:[-1]};
 m.userData={materialId:foilDefinition.id,physicalSurface:true,albedoSurface:albedo,diffractionScope:'direct-only',model:'reciprocal fixed projected Gaussian orders; D65 times linear source RGB'};
 m.onBeforeCompile=shader=>{
 Object.assign(shader.uniforms,{foilLut:{value:resource?.lut||null},foilStrength:{value:strength},foilSigmaG:{value:defaults.sigmaG}});
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+vin).replace('#include <begin_vertex>','#include <begin_vertex>\nvFoilObjectNormal=normal;vFoilViewY=mat3(modelViewMatrix)*vec3(0,1,0);vFoilViewObjectNormal=mat3(modelViewMatrix)*normal;vFoilAO=materialAO;vFoilLightAO=materialLightAO;');
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+fin);
 if(albedo){shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','gl_FragColor=vec4(diffuseColor.rgb,diffuseColor.a);').replace('#include <colorspace_fragment>','');return;}
 shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n'+setup).replace('#include <lights_physical_pars_fragment>','#include <lights_physical_pars_fragment>\n'+physical).replace('#include <aomap_fragment>',`#include <aomap_fragment>
 float foilAO=vFoilLightAO<0.0?clamp(vFoilAO,0.0,1.0):clamp(vFoilLightAO,0.0,1.0);
 reflectedLight.indirectDiffuse*=(1.0-foilBudget)*foilAO;
 reflectedLight.indirectSpecular*=(1.0-foilBudget);
 reflectedLight.indirectSpecular*=computeSpecularOcclusion(saturate(dot(geometryNormal,geometryViewDir)),foilAO,material.roughness);`);
 };
 m.customProgramCacheKey=()=>`atelier-diffraction-foil-direct-v1:${side}:${albedo}`;return m;
}
