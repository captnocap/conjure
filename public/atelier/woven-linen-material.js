import * as THREE from './vendor/three.module.min.js';
import {getWovenQuadratureTexture} from './woven-linen-quadrature.js';

// Dense plain-weave surface approximation. Responses are mixed as radiance, never
// as a tangent. No global ShaderChunk mutations and no geometry displacement.
export const wovenLinenDefinition=Object.freeze({id:'woven-linen',name:'Woven linen',baseColor:'#bca98b',metalness:0,roughness:0.65,ior:1.46,anisotropy:0.45,transmission:0,sheen:0,clearcoat:0,description:'Interlaced yarns, recessed crossings and soft directional catches'});
const vertexInputs=`attribute vec2 wovenCoord; attribute float wovenPolar; attribute vec2 wovenPeriod; attribute float materialAO; attribute float materialLightAO;
varying vec2 vWovenCoord; varying float vWovenPolar; varying vec2 vWovenPeriod; varying float vWovenAO; varying float vWovenLightAO;`;
const inputs=`varying vec2 vWovenCoord; varying float vWovenPolar; varying vec2 vWovenPeriod; varying float vWovenAO; varying float vWovenLightAO;
uniform float wovenHemiRelief;uniform sampler2D wovenQuadrature; uniform float wovenHeightScaleMode; uniform float wovenReference; uniform float wovenRelief; uniform float wovenVisibility; uniform float wovenAnisotropy; uniform float wovenForceAggregate; uniform float wovenDyeMix; uniform vec3 wovenWeftDye; uniform float wovenDebug;
vec3 wovenU, wovenV, wovenN, wovenBaseDye,wovenGradientU,wovenGradientV;vec3 wovenMomentWarp,wovenMomentWeft,wovenMomentBacking,wovenMomentArea; vec2 wovenQdx,wovenQdy,wovenLightRay;float wovenLightNL,wovenLightSlope; float wovenScale, wovenDetail, wovenFace, wovenDirection, wovenFiberDetail,wovenFilter,wovenSevere;
struct WovenSample {float h; vec2 g; float yarn;};
WovenSample wovenStoredAt(int i){vec4 a=texelFetch(wovenQuadrature,ivec2(i,0),0),b=texelFetch(wovenQuadrature,ivec2(i,1),0);WovenSample s;s.g=a.zw;s.h=b.x;s.yarn=b.y;return s;}

const vec2 wovenPixelOffsets[16]=vec2[16](vec2(-0.46875000,-0.46875000),vec2(-0.40625000,0.03125000),vec2(-0.34375000,-0.21875000),vec2(-0.28125000,0.28125000),vec2(-0.21875000,-0.34375000),vec2(-0.15625000,0.15625000),vec2(-0.09375000,-0.09375000),vec2(-0.03125000,0.40625000),vec2(0.03125000,-0.40625000),vec2(0.09375000,0.09375000),vec2(0.15625000,-0.15625000),vec2(0.21875000,0.34375000),vec2(0.28125000,-0.28125000),vec2(0.34375000,0.21875000),vec2(0.40625000,-0.03125000),vec2(0.46875000,0.46875000));
// Warp runs V; weft runs U. Every modulation closes at the complete 2x2 repeat.
vec3 wovenHeights(vec2 q) {
 vec2 ij=floor(q+0.5); vec2 d=q-ij;
 float swayU=0.017*sin(PI*(q.y+ij.x)); float swayV=0.017*sin(PI*(q.x+ij.y));
 vec2 width=vec2(0.42)+0.015*sin(PI*ij+vec2(0.8,0.8));
 vec2 r=(d-vec2(swayU,swayV))/width;
 vec2 caps=0.072*sqrt(max(vec2(0.0),vec2(1.0)-r*r));
 vec2 crimp=vec2(0.066*cos(PI*(q.y+ij.x)),-0.066*cos(PI*(q.x+ij.y)));
 vec2 h=crimp+caps; if(abs(r.x)>=1.0)h.x=-1.0; if(abs(r.y)>=1.0)h.y=-1.0;
 return vec3(h,-0.095);
}
WovenSample wovenAt(vec2 q) {
 vec2 ij=floor(q+0.5),d=q-ij;
 vec2 phase=PI*(q.yx+ij),sn=sin(phase),cs=cos(phase);
 vec2 width=vec2(0.42)+0.015*sin(PI*ij+vec2(0.8));
 vec2 r=(d-0.017*sn)/width;
 vec2 root=sqrt(max(vec2(0.0),vec2(1.0)-r*r));
 vec2 h=0.072*root+vec2(0.066,-0.066)*cs;
 if(abs(r.x)>=1.0)h.x=-1.0;if(abs(r.y)>=1.0)h.y=-1.0;
 WovenSample s;s.yarn=h.x>h.y?0.0:1.0;s.h=max(h.x,h.y);s.g=vec2(0.0);
 if(s.h< -0.095){s.yarn=2.0;s.h=-0.095;}
 else{
  // Analytic derivatives of the same elliptical upper caps and centerlines.
  // The bounded shoulder slope is unchanged from the finite-difference oracle.
  vec2 capSlope=-0.072*r/max(root,vec2(1e-5))/width;
  s.g=s.yarn<0.5?vec2(capSlope.x,-0.066*PI*sn.x-capSlope.x*0.017*PI*cs.x):vec2(0.066*PI*sn.y-capSlope.y*0.017*PI*cs.y,capSlope.y);
  s.g=clamp(s.g,vec2(-0.72),vec2(0.72));
 }
 if(s.yarn<1.5&&wovenFiberDetail>0.0){vec2 f=s.yarn<0.5?q:q.yx;float phase=2.0*PI*(7.0*f.x+0.16*sin(PI*f.y));
 vec2 fiber=0.0018*cos(phase)*2.0*PI*vec2(7.0,0.16*PI*cos(PI*f.y));
 s.g+=wovenFiberDetail*(s.yarn<0.5?fiber:fiber.yx);}
 return s;
}
vec3 wovenNormal(WovenSample s) {
 return normalize(wovenN-s.g.x*wovenGradientU-s.g.y*wovenGradientV);
}
vec3 wovenYarn(WovenSample s,vec3 n) {
 vec3 t=s.yarn<0.5?wovenV:wovenU;
 t-=n*dot(n,t); return normalize(t);
}
float wovenShadow(vec2 q,WovenSample s,vec3 L) {
 if(wovenLightNL<=0.001)return 0.0;
 if(wovenLightSlope>1e4)return 1.0;
 vec2 dir=wovenLightRay;float slope=wovenLightSlope;
 float vis=1.0;
 for(int i=1;i<=4;i++) {float t=float(i)*0.19; vec3 hs=wovenHeights(q+dir*t); float top=max(hs.x,max(hs.y,hs.z));
  vis=min(vis,smoothstep(-0.009,0.009,s.h+t*slope-top));}
 return mix(1.0,vis,wovenVisibility*wovenRelief*wovenDirection);
}
// Area fractions measured over 2048x2048 samples of the complete repeat.
// The fixed quadrature contains 60 warp, 62 weft and 6 backing points. Each
// population gets its own normalized measure; neither family nor gaps disappear.
float wovenQuadratureWeight(vec2 q){vec3 h=wovenHeights(q);float yarn=max(h.x,h.y)<h.z?2.0:(h.x>h.y?0.0:1.0);return yarn<0.5?0.48683453/60.0:(yarn<1.5?0.48644685/62.0:0.02671862/6.0);}
vec3 wovenDye(WovenSample s,vec3 dye){return s.yarn>0.5&&s.yarn<1.5?mix(dye,wovenWeftDye,wovenDyeMix):dye;}
float wovenWeftCoverage(vec2 q){vec3 h=wovenHeights(q);return h.y>h.x&&h.y>=h.z?1.0:0.0;}
vec3 wovenPixelDye(vec3 dye){
 if(wovenDyeMix==0.0)return dye;
 vec2 dx=dFdx(vWovenCoord),dy=dFdy(vWovenCoord);float fp=max(length(dx),length(dy));
 float pixelFilter=smoothstep(0.025,0.065,fp),coverage=(1.0-pixelFilter)*wovenWeftCoverage(vWovenCoord);
 if(pixelFilter>0.001)for(int i=0;i<16;i++){
  vec2 offset=wovenPixelOffsets[i];
  coverage+=pixelFilter/16.0*wovenWeftCoverage(vWovenCoord+offset.x*dx+offset.y*dy);
 }
 coverage=mix(coverage,0.48644685,smoothstep(0.4,1.0,fp));
 return mix(dye,wovenWeftDye,coverage*wovenDyeMix);
}

`;
const physical=`

#if NUM_HEMI_LIGHTS > 0
void wovenAddMoment(WovenSample s,float weight){
 vec3 n=wovenNormal(s);
 if(s.yarn<0.5){wovenMomentWarp+=weight*n;wovenMomentArea.x+=weight;}
 else if(s.yarn<1.5){wovenMomentWeft+=weight*n;wovenMomentArea.y+=weight;}
 else{wovenMomentBacking+=weight*n;wovenMomentArea.z+=weight;}
}
void wovenPrepareHemisphere(){
 wovenMomentWarp=vec3(0);wovenMomentWeft=vec3(0);wovenMomentBacking=vec3(0);wovenMomentArea=vec3(0);
 if(wovenRelief==0.0||wovenHemiRelief==0.0)return;
 if(wovenDetail>0.001){
  if(wovenFilter<0.999)wovenAddMoment(wovenAt(vWovenCoord),wovenDetail*(1.0-wovenFilter));
  if(wovenFilter>0.001)for(int i=0;i<16;i++){
   vec2 offset=wovenPixelOffsets[i];wovenAddMoment(wovenAt(vWovenCoord+offset.x*wovenQdx+offset.y*wovenQdy),wovenDetail*wovenFilter/16.0);
  }
 }
 if(wovenDetail<0.999){
  if(wovenReference<0.5)for(int i=0;i<24;i++)wovenAddMoment(wovenStoredAt(i),(1.0-wovenDetail)*texelFetch(wovenQuadrature,ivec2(i,1),0).z);
  else for(int i=0;i<512;i++)wovenAddMoment(wovenStoredAt(152+i),(1.0-wovenDetail)*texelFetch(wovenQuadrature,ivec2(152+i,1),0).z);
 }
}
vec3 wovenHemisphereIrradiance(HemisphereLight hemi,vec3 averageDye){
 if(wovenRelief==0.0||wovenHemiRelief==0.0)return getHemisphereLightIrradiance(hemi,wovenN);
 vec3 weft=mix(wovenBaseDye,wovenWeftDye,wovenDyeMix);
 vec3 colorArea=wovenBaseDye*(wovenMomentArea.x+wovenMomentArea.z)+weft*wovenMomentArea.y;
 vec3 projectedColor=wovenBaseDye*dot(wovenMomentWarp+wovenMomentBacking,hemi.direction)+weft*dot(wovenMomentWeft,hemi.direction);
 // Three's hemisphere response is affine in the normal. These moments retain
 // that integral exactly for the chosen quadrature, including dye covariance.
 // Do not normalize the summed normals: that would add diffuse energy.
 vec3 body=0.5*(hemi.skyColor+hemi.groundColor)*colorArea+0.5*(hemi.skyColor-hemi.groundColor)*projectedColor;
 return mix(getHemisphereLightIrradiance(hemi,wovenN),body/max(averageDye,vec3(1e-7)),wovenHemiRelief);
}
#endif
PhysicalMaterial wovenMaterial(PhysicalMaterial material,WovenSample s,vec3 n) {
 PhysicalMaterial m=material; m.diffuseColor=wovenDye(s,wovenBaseDye);
 m.anisotropy=wovenAnisotropy*wovenDirection*(s.yarn<1.5?1.0:0.0);
 m.alphaT=mix(pow2(m.roughness),1.0,pow2(m.anisotropy));
 m.anisotropyB=wovenYarn(s,n); m.anisotropyT=normalize(cross(m.anisotropyB,n)); return m;
}
void wovenDirectSample(vec2 q,float w,IncidentLight light,vec3 V,PhysicalMaterial material,inout ReflectedLight reflectedLight) {
 WovenSample s=wovenAt(q); vec3 n=wovenNormal(s); PhysicalMaterial m=wovenMaterial(material,s,n);
 float visibility=wovenShadow(q,s,light.direction); vec3 irradiance=saturate(dot(n,light.direction))*light.color*w*visibility;
 reflectedLight.directSpecular+=irradiance*BRDF_GGX(light.direction,V,n,m);
 reflectedLight.directDiffuse+=irradiance*BRDF_Lambert(m.diffuseColor);
}
void wovenDirectStored(int index,float blendWeight,IncidentLight light,vec3 V,PhysicalMaterial material,inout ReflectedLight reflectedLight){
 vec4 a=texelFetch(wovenQuadrature,ivec2(index,0),0),b=texelFetch(wovenQuadrature,ivec2(index,1),0);
 WovenSample s;s.g=a.zw;s.h=b.x;s.yarn=b.y;vec3 n=wovenNormal(s);PhysicalMaterial m=wovenMaterial(material,s,n);
 vec3 irradiance=saturate(dot(n,light.direction))*light.color*blendWeight*b.z*wovenShadow(a.xy,s,light.direction);
 reflectedLight.directSpecular+=irradiance*BRDF_GGX(light.direction,V,n,m);reflectedLight.directDiffuse+=irradiance*BRDF_Lambert(m.diffuseColor);
}
void RE_Direct_Woven(const in IncidentLight light,const in vec3 position,const in vec3 normal,const in vec3 V,const in vec3 clearcoatNormal,const in PhysicalMaterial material,inout ReflectedLight reflectedLight) {
 if(all(lessThanEqual(light.color,vec3(0.0))))return;
 if(wovenDirection<0.00001||(wovenRelief==0.0&&wovenAnisotropy==0.0&&wovenDyeMix==0.0)){
  PhysicalMaterial m=material;m.anisotropy=0.0;m.alphaT=pow2(m.roughness);m.anisotropyB=normalize(wovenV);m.anisotropyT=normalize(cross(m.anisotropyB,wovenN));
  RE_Direct_Physical(light,position,wovenN,V,clearcoatNormal,m,reflectedLight);return;
 }
 float determinant=dot(wovenU,cross(wovenV,wovenN));
 vec2 ray=vec2(dot(light.direction,cross(wovenV,wovenN)),dot(light.direction,cross(wovenN,wovenU)))/max(abs(determinant),1e-12)*sign(determinant)*wovenScale;
 float rayLength=length(ray);wovenLightNL=dot(wovenN,light.direction);
 if(wovenLightNL<=0.001||all(lessThanEqual(light.color,vec3(0.0))))return;
 wovenLightRay=ray/max(rayLength,1e-12);wovenLightSlope=rayLength<1e-5?1e5:wovenLightNL/rayLength;
 if(wovenDetail>0.001){
  if(wovenFilter<0.999)wovenDirectSample(vWovenCoord,wovenDetail*(1.0-wovenFilter),light,V,material,reflectedLight);
  if(wovenFilter>0.001)for(int i=0;i<16;i++){
   vec2 offset=wovenPixelOffsets[i];
   wovenDirectSample(vWovenCoord+offset.x*wovenQdx+offset.y*wovenQdy,wovenDetail*wovenFilter/16.0,light,V,material,reflectedLight);
  }
 }
 if(wovenDetail<0.999){
  // Adaptive positive cubature. Expensive visibility integration is retained
  // only for grazing q-space light directions. The transition is continuous.
  float stress=max(1.0-smoothstep(0.25,0.35,wovenLightSlope),step(0.5,wovenReference));
  float low=1.0-stress;
  if(low>0.001)for(int i=0;i<24;i++)wovenDirectStored(i,(1.0-wovenDetail)*low,light,V,material,reflectedLight);
  if(stress>0.001)for(int i=0;i<512;i++)wovenDirectStored(152+i,(1.0-wovenDetail)*stress,light,V,material,reflectedLight);
 }
}
#undef RE_Direct
#define RE_Direct RE_Direct_Woven
`;
const setup=`
 wovenN=normal; wovenFace=1.0;
 #ifdef DOUBLE_SIDED
 wovenFace=faceDirection;
 #endif
 #ifdef FLIP_SIDED
 wovenFace=-1.0;
 #endif
 vec3 pdx=dFdx(-vViewPosition),pdy=dFdy(-vViewPosition); vec2 qdx=dFdx(vWovenCoord),qdy=dFdy(vWovenCoord);
 float jac=qdx.x*qdy.y-qdx.y*qdy.x;
 float relativeJac=abs(jac)/max(length(qdx)*length(qdy),1e-12);
 bool valid=relativeJac>0.0001&&abs(jac)>1e-12;
 if(valid){wovenU=(pdx*qdy.y-pdy*qdx.y)/jac;wovenV=(-pdx*qdy.x+pdy*qdx.x)/jac;}
 else{wovenU=normalize(abs(normal.z)<0.9?cross(normal,vec3(0,0,1)):cross(normal,vec3(0,1,0)));wovenV=cross(normal,wovenU);}
 float uLength=length(wovenU),vLength=length(wovenV);
 float geometricScale=sqrt(max(uLength*vLength,1e-12));
 float narrowScale=length(cross(wovenU,wovenV))/max(max(uLength,vLength),1e-12);
 wovenScale=mix(geometricScale,narrowScale,wovenHeightScaleMode);
 float stretch=max(uLength/max(vLength,1e-12),vLength/max(uLength,1e-12));
 float shear=abs(dot(wovenU,wovenV))/max(uLength*vLength,1e-12);
 wovenSevere=max(smoothstep(2.75,4.0,stretch),smoothstep(0.5,0.7,shear));
 wovenDirection=valid?clamp(vWovenPolar,0.0,1.0):0.0;
 float gradientDet=dot(wovenU,cross(wovenV,wovenN));float gradientScale=wovenFace*wovenRelief*wovenDirection*wovenScale*sign(gradientDet)/max(abs(gradientDet),1e-12);
 wovenGradientU=cross(wovenV,wovenN)*gradientScale;wovenGradientV=cross(wovenN,wovenU)*gradientScale;
 wovenQdx=qdx;wovenQdy=qdy;float fp=max(length(qdx),length(qdy));
 wovenFilter=smoothstep(0.025,0.065,fp);
 wovenFiberDetail=(1.0-smoothstep(0.025,0.12,fp))*wovenDirection;
 wovenDetail=(1.0-smoothstep(0.4,1.0,fp))*wovenDirection;
 if(wovenForceAggregate>=0.0)wovenDetail=clamp(1.0-wovenForceAggregate,0.0,1.0)*wovenDirection;
`;
const environment=`
#if defined(USE_ENVMAP) && defined(ENVMAP_TYPE_CUBE_UV)
vec3 wovenEnvironmentSample(vec2 q,vec3 V,PhysicalMaterial material) {
 WovenSample s=wovenAt(q);vec3 n=wovenNormal(s);
 if(s.yarn>1.5)return getIBLRadiance(V,n,material.roughness);
 return getIBLAnisotropyRadiance(V,n,material.roughness,wovenYarn(s,n),wovenAnisotropy*wovenDirection);
}
vec3 wovenEnvironmentStored(int i,vec3 V,PhysicalMaterial material){
 WovenSample s=wovenStoredAt(i);vec3 n=wovenNormal(s);float w=texelFetch(wovenQuadrature,ivec2(i,1),0).z;
 if(s.yarn>1.5)return w*getIBLRadiance(V,n,material.roughness);
 return w*getIBLAnisotropyRadiance(V,n,material.roughness,wovenYarn(s,n),wovenAnisotropy*wovenDirection);
}
vec3 wovenEnvironment(vec3 V,PhysicalMaterial material) {
 if(envMapIntensity<=0.0)return vec3(0.0);
 if(wovenDirection<0.00001||(wovenRelief==0.0&&wovenAnisotropy==0.0&&wovenDyeMix==0.0))return getIBLRadiance(V,wovenN,material.roughness);
 vec3 r=vec3(0.0);
 if(wovenDetail>0.001){
  if(wovenFilter<0.999)r+=wovenDetail*(1.0-wovenFilter)*wovenEnvironmentSample(vWovenCoord,V,material);
  if(wovenFilter>0.001)for(int i=0;i<16;i++){
   vec2 offset=wovenPixelOffsets[i];
   r+=wovenDetail*wovenFilter/16.0*wovenEnvironmentSample(vWovenCoord+offset.x*wovenQdx+offset.y*wovenQdy,V,material);
  }
 }
 if(wovenDetail<0.999){
  float stress=step(0.5,wovenReference);
  if(stress<0.999)for(int i=0;i<24;i++)r+=(1.0-wovenDetail)*(1.0-stress)*wovenEnvironmentStored(i,V,material);
  if(stress>0.001)for(int i=0;i<512;i++)r+=(1.0-wovenDetail)*stress*wovenEnvironmentStored(152+i,V,material);
 }
 return r;
}
#endif
`;
const wovenLightsBegin=THREE.ShaderChunk.lights_fragment_begin.replace('irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );','irradiance += wovenHemisphereIrradiance(hemisphereLights[i],material.diffuseColor);');
const maps=THREE.ShaderChunk.lights_fragment_maps.replace('radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );','radiance += wovenEnvironment(geometryViewDir,material);');
export function injectWovenLinenShader(shader,albedo=false){
 Object.assign(shader.uniforms,{wovenHemiRelief:{value:1},wovenQuadrature:{value:albedo?null:getWovenQuadratureTexture()},wovenHeightScaleMode:{value:1},wovenReference:{value:0},wovenRelief:{value:1},wovenVisibility:{value:1},wovenAnisotropy:{value:0.45},wovenForceAggregate:{value:-1},wovenDyeMix:{value:0},wovenWeftDye:{value:new THREE.Color('#bca98b')},wovenDebug:{value:0}});
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+vertexInputs).replace('#include <begin_vertex>','#include <begin_vertex>\nvWovenCoord=wovenCoord;vWovenPolar=wovenPolar;vWovenPeriod=wovenPeriod;vWovenAO=materialAO;vWovenLightAO=materialLightAO;');
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+inputs);
 if(albedo){shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=wovenPixelDye(diffuseColor.rgb);').replace('#include <opaque_fragment>','gl_FragColor=vec4(diffuseColor.rgb,diffuseColor.a);').replace('#include <colorspace_fragment>','');return;}
 shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_pars_fragment>','#include <lights_physical_pars_fragment>\n'+physical+environment).replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n'+setup).replace('#include <lights_physical_fragment>',`#include <lights_physical_fragment>
 wovenBaseDye=material.diffuseColor;material.diffuseColor=wovenPixelDye(wovenBaseDye);
 #if NUM_HEMI_LIGHTS > 0
 wovenPrepareHemisphere();
 #endif`).replace('#include <lights_fragment_begin>',wovenLightsBegin).replace('#include <lights_fragment_maps>',maps).replace('#include <aomap_fragment>',`#include <aomap_fragment>
 float aoW=vWovenLightAO<0.0?clamp(vWovenAO,0.0,1.0):clamp(vWovenLightAO,0.0,1.0);
 reflectedLight.indirectDiffuse*=aoW; reflectedLight.indirectSpecular*=computeSpecularOcclusion(saturate(dot(geometryNormal,geometryViewDir)),aoW,material.roughness);`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`#include <opaque_fragment>
 if(wovenDebug>0.5&&wovenDebug<1.5){WovenSample s=wovenAt(vWovenCoord);gl_FragColor=vec4(s.yarn<0.5?vec3(1,0,0):(s.yarn<1.5?vec3(0,1,0):vec3(0,0,1)),1);}
 if(wovenDebug>1.5&&wovenDebug<2.5){gl_FragColor=vec4(vec3(wovenDetail),1);}
 if(wovenDebug>2.5){gl_FragColor=vec4(wovenNormal(wovenAt(vWovenCoord))*0.5+0.5,1);}`);
}
export function createWovenLinenMaterial(environment,{side=THREE.FrontSide,albedo=false}={}){
 if(![0,1,2].includes(side))throw new RangeError('Invalid material side');const d=wovenLinenDefinition;
 const material=new THREE.MeshPhysicalMaterial({color:d.baseColor,metalness:0,roughness:d.roughness,ior:d.ior,anisotropy:albedo?0:d.anisotropy,sheen:0,clearcoat:0,transmission:0,envMap:albedo?null:environment,envMapIntensity:albedo?0:0.48,side,transparent:false,opacity:1,depthWrite:true});
 material.name=`Atelier Woven linen${albedo?' albedo':''}`;material.toneMapped=!albedo;material.fog=!albedo;
 material.defaultAttributeValues={wovenCoord:[0,0],wovenPolar:[0],wovenPeriod:[0,0],materialAO:[1],materialLightAO:[-1]};
 material.userData={materialId:d.id,physicalSurface:true,bakedGeometry:true,wovenApproximation:"bounded-yarn-relief-positive-quadrature",...(albedo?{albedoSurface:true}:{})};
 material.onBeforeCompile=s=>injectWovenLinenShader(s,albedo);material.customProgramCacheKey=()=>`atelier-woven-linen-v1:${side}:${albedo}`;return material;
}
