import * as T from './vendor/three.module.min.js';
import { SHINGLE_RELIEF_ID, SHINGLE_MAX_V } from './shingle-relief-config.js';

export const shingleReliefDefinition=Object.freeze({
 id:SHINGLE_RELIEF_ID,name:'Shingle relief',baseColor:'#888888',metalness:0,
 roughness:0.6,ior:1.5,transmission:0,description:'Coarse plate relief and one-sided recesses; Vase only',
});
// Frozen finite-plate field. Uniform pigment, local direct-light visibility,
// and sixteen complete radiance samples; no displaced or transparent geometry.
const field="const vec3 shDomain[6]=vec3[6](vec3(1.0,0.0,0.48999999999999999),vec3(-1.0,0.0,0.48999999999999999),vec3(0.0,1.0,0.0),vec3(0.0,-1.0,1.4285714285714286),vec3(-0.62469504755442429,-0.78086880944303028,1.2966884344236835),vec3(0.62469504755442429,-0.78086880944303028,1.2966884344236835));\nconst vec3 shPlanes[7]=vec3[7](vec3(0.0,0.054599999999999996,0.012),vec3(0.16,0.054599999999999996,0.086399999999999991),vec3(-0.16,0.054599999999999996,0.086399999999999991),vec3(0.0,0.4546,0.0),vec3(0.0,-0.30539999999999995,0.50828571428571423),vec3(-0.2248902171195927,-0.22651277139949089,0.46080783639252598),vec3(0.2248902171195927,-0.22651277139949089,0.46080783639252598));\n// Frozen convex finite-plate oracle translation; qU is never wrapped.\nstruct ShSample { float h; vec2 g; vec3 owner; };\nShSample shField(vec2 q, float maxV) {\n  ShSample s; s.h=0.0; s.g=vec2(0.0); s.owner=vec3(-1.0);\n  if(q.y<0.0 || q.y>maxV) return s;\n  for(int j=0;j<2;j++) {\n    float row=floor(q.y)-1.0+float(j);\n    float stagger=0.5*mod(row,2.0);\n    float col=floor(q.x-stagger+0.5);\n    vec3 local=vec3(q.x-col-stagger,q.y-row,1.0);\n    bool inside=row>=0.0;\n    for(int k=0;k<6;k++) inside=inside && dot(shDomain[k],local)>=0.0;\n    if(inside) {\n      float h=dot(shPlanes[0],local); int plane=0;\n      for(int k=1;k<7;k++) {float v=dot(shPlanes[k],local); if(v<h){h=v;plane=k;}}\n      if(h>s.h){s.h=h;s.g=shPlanes[plane].xy;s.owner=vec3(row,mod(col,18.0),float(plane));}\n    }\n  }\n  return s;\n}\nvoid shClip(inout float lo,inout float hi,float a,float b) {\n  if(abs(b)>1e-14) {float t=-a/b;if(b>0.0)lo=max(lo,t);else hi=min(hi,t);}\n  else if(a<0.0) hi=-1.0;\n}\nfloat shFirstHit(vec2 q,float h,vec2 direction,float slope,float maxV) {\n  vec2 low=min(q,q+0.75*direction);\n  float r0=ceil(low.y-1.4285714285714286);\n  float first=1e20;\n  for(int dr=0;dr<3;dr++) {\n    float row=r0+float(dr),stagger=0.5*mod(row,2.0);\n    float c0=ceil(low.x-0.49-stagger);\n    for(int dc=0;dc<2;dc++) {\n      vec2 local=vec2(q.x-c0-float(dc)-stagger,q.y-row);\n      float lo=0.0,hi=0.75;\n      for(int k=0;k<6;k++) shClip(lo,hi,dot(shDomain[k],vec3(local,1.0)),dot(shDomain[k].xy,direction));\n      shClip(lo,hi,q.y,direction.y); shClip(lo,hi,maxV-q.y,-direction.y);\n      bool relevant=row>=0.0 && lo<=hi && hi>=0.0;\n      for(int k=0;k<7;k++) shClip(lo,hi,dot(shPlanes[k],vec3(local,1.0))-h-1e-5,dot(shPlanes[k].xy,direction)-slope);\n      if(relevant && lo<=hi && hi>=1e-10) first=min(first,max(lo,0.0));\n    }\n  }\n  return first;\n}\nfloat shVisibility(vec2 q,float h,vec2 direction,float slope,float maxV) {\n  return smoothstep(0.55,0.75,shFirstHit(q,h,direction,slope,maxV));\n}\n";
const inputs=`varying vec2 vShQ;varying float vShAO;varying float vShLightAO;
uniform float shMaxV;uniform float shRelief;uniform float shLocalVisibility;
vec3 shN,shGU,shGV;vec2 shDx,shDy,shQ;bool shFrame;ShSample shCurrent;
`;
const setup=`
shN=normal;shDx=dFdx(vShQ);shDy=dFdy(vShQ);
vec3 shPx=dFdx(-vViewPosition),shPy=dFdy(-vViewPosition);
float shJ=shDx.x*shDy.y-shDx.y*shDy.x;
float shDen=length(shDx)*length(shDy);
shFrame=gl_FrontFacing && !isnan(shJ) && !isinf(shJ) && shDen>0.0 && abs(shJ)/shDen>1e-6;
shGU=vec3(0.0);shGV=vec3(0.0);
if(shFrame){
 vec3 u=(shPx*shDy.y-shPy*shDx.y)/shJ,v=(-shPx*shDy.x+shPy*shDx.x)/shJ;
 float determinant=dot(u,cross(v,shN));
 shFrame=!isnan(determinant) && !isinf(determinant) && abs(determinant)>1e-12;
 if(shFrame){shGU=cross(v,shN)/determinant;shGV=cross(shN,u)/determinant;}
}
`;
const direct=`
void shDirect(IncidentLight light,vec3 position,vec3 n,vec3 view,vec3 clearcoatN,PhysicalMaterial material,inout ReflectedLight result) {
 if(shFrame && shRelief>0.0 && shQ.y>=0.0 && shQ.y<=shMaxV){
  float macroNL=dot(shN,light.direction);
  if(macroNL<=0.0)return;
  if(shLocalVisibility>0.0){
   vec2 velocity=vec2(dot(shGU,light.direction),dot(shGV,light.direction));
   float rate=length(velocity);
   if(rate>1e-12) light.color*=shVisibility(shQ,shCurrent.h,velocity/rate,macroNL/(0.22*rate),shMaxV);
  }
 }
 RE_Direct_Physical(light,position,n,view,clearcoatN,material,result);
}
`;
export function createShingleReliefMaterial(environment,{side=T.DoubleSide,albedo=false}={}){
 if(![T.FrontSide,T.BackSide,T.DoubleSide].includes(side)) throw new RangeError('Invalid material side');
 // The admitted vase is double-sided; inward-facing polygons use flat backing.
 side=T.DoubleSide;
 const maxV=SHINGLE_MAX_V,mode='candidate';
 const m=new T.MeshPhysicalMaterial({color:'#888888',metalness:0,roughness:0.6,ior:1.5,anisotropy:0,sheen:0,clearcoat:0,transmission:0,envMap:albedo?null:environment,envMapIntensity:albedo?0:0.48,side,transparent:false,opacity:1,depthWrite:true});
 m.name='Atelier Shingle relief'+(albedo?' albedo':'');
 m.userData={materialId:SHINGLE_RELIEF_ID,physicalSurface:true,bakedGeometry:true,normalReliefOnly:true,scope:'original-vase-only',...(albedo?{albedoSurface:true}:{})};
 m.defaultAttributeValues={shingleCoord:[0,0],materialAO:[1],materialLightAO:[-1]};
 m.toneMapped=!albedo;m.fog=!albedo;
 m.onBeforeCompile=s=>{
  const once=(source,token)=>{if(source.split(token).length!==2)throw new Error('Unexpected Three shader structure for Shingle relief: '+token);};
  for(const token of ['#include <common>','#include <begin_vertex>'])once(s.vertexShader,token);
  for(const token of ['#include <common>','#include <opaque_fragment>','#include <colorspace_fragment>'])once(s.fragmentShader,token);
  if(!albedo){
   for(const token of ['#include <lights_physical_pars_fragment>','#include <normal_fragment_maps>','#include <lights_fragment_begin>','#include <lights_fragment_end>','#include <aomap_fragment>'])once(s.fragmentShader,token);
   if(T.ShaderChunk.lights_fragment_begin.split('RE_Direct( directLight,').length!==4)throw new Error('Unsupported Three direct-light structure for Shingle relief');
  }
  Object.assign(s.uniforms,{shMaxV:{value:maxV},shRelief:{value:mode==='flat'?0:1},shLocalVisibility:{value:mode==='candidate'?1:0}});
  s.vertexShader=s.vertexShader.replace('#include <common>',`#include <common>\nattribute vec2 shingleCoord;attribute float materialAO;attribute float materialLightAO;varying vec2 vShQ;varying float vShAO;varying float vShLightAO;`).replace('#include <begin_vertex>','#include <begin_vertex>\nvShQ=shingleCoord;vShAO=materialAO;vShLightAO=materialLightAO;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\n'+field+inputs);
  if(albedo){s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>','gl_FragColor=vec4(diffuseColor.rgb,diffuseColor.a);').replace('#include <colorspace_fragment>','');return;}
  s.fragmentShader=s.fragmentShader.replace('#include <lights_physical_pars_fragment>','#include <lights_physical_pars_fragment>\n'+direct).replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n'+setup);
  const begin=T.ShaderChunk.lights_fragment_begin.replaceAll('RE_Direct( directLight,','shDirect( directLight,');
  const open=`ReflectedLight shSum=ReflectedLight(vec3(0),vec3(0),vec3(0),vec3(0));
  for(int shIndex=0;shIndex<16;shIndex++){
   vec2 offset=(vec2(float(shIndex%4),float(shIndex/4))+0.5)/4.0-0.5;
   shQ=vShQ+offset.x*shDx+offset.y*shDy;shCurrent=shField(shQ,shMaxV);
   vec3 normal=shFrame?normalize(shN-0.22*shRelief*(shCurrent.g.x*shGU+shCurrent.g.y*shGV)):shN;
   ReflectedLight reflectedLight=ReflectedLight(vec3(0),vec3(0),vec3(0),vec3(0));
  `;
  const close=`
   float shAO=clamp(vShLightAO<0.0?vShAO:vShLightAO,0.0,1.0);
   reflectedLight.indirectDiffuse*=shAO;
   reflectedLight.indirectSpecular*=computeSpecularOcclusion(saturate(dot(geometryNormal,geometryViewDir)),shAO,material.roughness);
   shSum.directDiffuse+=reflectedLight.directDiffuse/16.0;
   shSum.directSpecular+=reflectedLight.directSpecular/16.0;
   shSum.indirectDiffuse+=reflectedLight.indirectDiffuse/16.0;
   shSum.indirectSpecular+=reflectedLight.indirectSpecular/16.0;
  } reflectedLight=shSum;`;
  s.fragmentShader=s.fragmentShader.replace('#include <lights_fragment_begin>',open+begin).replace('#include <lights_fragment_end>',T.ShaderChunk.lights_fragment_end+'\n'+T.ShaderChunk.aomap_fragment+'\n'+close).replace('#include <aomap_fragment>','');
 };
 m.customProgramCacheKey=()=>`atelier-shingle-relief-v1:${side}:${albedo}`;
 return m;
}
