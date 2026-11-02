import * as T from 'three';
import { ribbedClayConfig, RIBBED_CLAY_ID, RIBBED_CLAY_MODEL_VERSION, RIBBED_CLAY_MODEL_SHA256, RIBBED_CLAY_MAX_V } from './ribbed-clay-config.js';

export const ribbedClayDefinition=Object.freeze({
 id:RIBBED_CLAY_ID,name:'Ribbed clay',baseColor:'#b89579',
 linearPigment:Object.freeze([0.48,0.30,0.19]),metalness:0,roughness:0.82,ior:1.5,transmission:0,
 description:'Broad joined clay courses over the original backing; Vase only',
});

// These four literal shader blocks and the physical hook below preserve the
// frozen proof byte-for-byte. Controls are private constants, never UI inputs.
const field=`
varying vec2 vClayQ;varying float vClayAO;varying float vClayLightAO;
uniform float clayMaxV;uniform float clayRelief;uniform int clayDiagnostic;
struct ClaySample {float h;vec2 g;};
vec2 clayBoundary(float k,float u){
 return 0.18*vec2(k+0.055*sin(2.0*u+1.7*k)+0.028*cos(5.0*u-0.9*k)+0.020*sin(7.0*u+0.37*k),
 0.110*cos(2.0*u+1.7*k)-0.140*sin(5.0*u-0.9*k)+0.140*cos(7.0*u+0.37*k));
}
vec2 claySmooth(float a,float b,float x){float t=clamp((x-a)/(b-a),0.0,1.0);return vec2(t*t*(3.0-2.0*t),6.0*t*(1.0-t)/(b-a));}
ClaySample clayField(vec2 q){
 ClaySample s;s.h=0.0;s.g=vec2(0.0);
 if(q.y<=0.0||q.y>=clayMaxV)return s;
 float base=floor(q.y/0.18),row=0.0;vec2 low=vec2(-1e10,0.0),high=vec2(1e10,0.0);
 for(int j=-1;j<=2;j++){float k=base+float(j);vec2 b=clayBoundary(k,q.x);if(b.x<=q.y&&b.x>low.x){low=b;row=k;}if(b.x>q.y&&b.x<high.x)high=b;}
 float width=high.x-low.x,t=(q.y-low.x)/width,c=0.44+0.035*sin(1.13*row),den=t<c?c:1.0-c;
 float z=(t-c)/den,z2=z*z,z3=z2*z,z4=z2*z2,cap=1.0-z4,shape=cap*cap;
 vec2 dt=vec2(-mix(low.y,high.y,t),1.0)/width;
 float A=0.024*(1.0+0.14*sin(1.31*row)+0.07*cos(3.0*q.x+0.77*row));
 vec2 dA=vec2(-0.00504*sin(3.0*q.x+0.77*row),0.0);
 vec2 bottom=claySmooth(0.0,0.065,q.y),top=claySmooth(0.025,0.09,clayMaxV-q.y);
 float fade=bottom.x*top.x,df=bottom.y*top.x-bottom.x*top.y;
 s.h=A*shape*fade;
 s.g=(dA*shape+A*(-8.0*z3*cap/den)*dt)*fade+vec2(0.0,A*shape*df);
 return s;
}
vec3 clayN,clayGU,clayGV;vec2 clayDx,clayDy,clayQ;bool clayFrame;ClaySample clayCurrent;
float clayVisibility(vec2 q,float height,vec2 velocity,float slope){
 float excess=0.0;
 for(int j=1;j<=16;j++){float t=0.01*float(j);excess=max(excess,clayField(q+t*velocity).h-height-t*slope);}
 return 1.0-smoothstep(0.0003,0.001,excess);
}
`;
const setup=`
clayN=normal;clayDx=dFdx(vClayQ);clayDy=dFdy(vClayQ);
vec3 clayPx=dFdx(-vViewPosition),clayPy=dFdy(-vViewPosition);
float clayJ=clayDx.x*clayDy.y-clayDx.y*clayDy.x,clayDen=length(clayDx)*length(clayDy);
clayFrame=gl_FrontFacing&&!any(isnan(vClayQ))&&!any(isinf(vClayQ))&&!isnan(clayJ)&&!isinf(clayJ)&&abs(clayJ)>1e-20&&clayDen>0.0&&abs(clayJ)/clayDen>1e-8;
clayGU=vec3(0.0);clayGV=vec3(0.0);
if(clayFrame){vec3 u=(clayPx*clayDy.y-clayPy*clayDx.y)/clayJ,v=(-clayPx*clayDy.x+clayPy*clayDx.x)/clayJ;
 float determinant=dot(u,cross(v,clayN));clayFrame=!isnan(determinant)&&!isinf(determinant)&&abs(determinant)>1e-12;
 if(clayFrame){clayGU=cross(v,clayN)/determinant;clayGV=cross(clayN,u)/determinant;}}
`;
const direct=`
void clayDirect(IncidentLight light,vec3 position,vec3 n,vec3 view,vec3 clearcoatN,PhysicalMaterial material,inout ReflectedLight result){
 if(clayFrame&&clayRelief>0.0){float macroNL=dot(clayN,light.direction);if(macroNL<=0.0)return;
 light.color*=clayVisibility(clayQ,clayCurrent.h,vec2(dot(clayGU,light.direction),dot(clayGV,light.direction)),macroNL);}
 RE_Direct_Physical(light,position,n,view,clearcoatN,material,result);
}
`;
function once(source,token){
 if(typeof source!=='string'||source.split(token).length!==2)throw new Error('Unexpected Three shader structure for Ribbed clay: '+token);
}
function assertShader(shader){
 if(T.REVISION!=='180')throw new Error('Unsupported Three revision for Ribbed clay: '+T.REVISION);
 if(!shader||!shader.uniforms||typeof shader.uniforms!=='object')throw new Error('Unexpected Three shader structure for Ribbed clay: uniforms');
 for(const token of ['#include <common>','#include <begin_vertex>'])once(shader.vertexShader,token);
 for(const token of ['#include <common>','#include <lights_physical_pars_fragment>','#include <normal_fragment_begin>','#include <normal_fragment_maps>','#include <lights_physical_fragment>','#include <lights_fragment_begin>','#include <lights_fragment_maps>','#include <lights_fragment_end>','#include <aomap_fragment>','#include <opaque_fragment>','#include <tonemapping_fragment>','#include <colorspace_fragment>'])once(shader.fragmentShader,token);
 let previous=-1;
 for(const token of ['#include <normal_fragment_begin>','#include <normal_fragment_maps>','#include <lights_physical_fragment>','#include <lights_fragment_begin>','#include <lights_fragment_maps>','#include <lights_fragment_end>','#include <aomap_fragment>','#include <opaque_fragment>','#include <tonemapping_fragment>','#include <colorspace_fragment>']){
  const position=shader.fragmentShader.indexOf(token);
  if(position<=previous)throw new Error('Unexpected Three shader structure for Ribbed clay: ordering '+token);
  previous=position;
 }
 once(T.ShaderChunk.lights_physical_pars_fragment,'void RE_Direct_Physical(');
 once(T.ShaderChunk.lights_fragment_begin,'#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )');
 once(T.ShaderChunk.lights_fragment_begin,'getDirectionalLightInfo( directionalLight, directLight );');
 // All supported stock direct light call sites must use the literal hook.
 if(T.ShaderChunk.lights_fragment_begin.split('RE_Direct( directLight,').length!==4)
  throw new Error('Unexpected Three shader structure for Ribbed clay: direct-light calls');
 once(T.ShaderChunk.lights_fragment_end,'RE_IndirectDiffuse( irradiance,');
 once(T.ShaderChunk.lights_fragment_end,'RE_IndirectSpecular( radiance, iblIrradiance,');
 once(T.ShaderChunk.aomap_fragment,'reflectedLight.indirectDiffuse *= ambientOcclusion;');
 once(T.ShaderChunk.aomap_fragment,'computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness )');
}

export function createRibbedClayMaterial(environment,{side=T.DoubleSide,albedo=false}={}){
 if(![T.FrontSide,T.BackSide,T.DoubleSide].includes(side))throw new RangeError('Invalid material side');
 if(typeof albedo!=='boolean')throw new TypeError('Invalid Ribbed clay albedo option');
 if(T.REVISION!=='180')throw new Error('Unsupported Three revision for Ribbed clay: '+T.REVISION);
 side=T.DoubleSide;
 const d=ribbedClayConfig.model.appearance;
 const m=new T.MeshPhysicalMaterial({color:new T.Color().setRGB(...d.linearPigment),metalness:d.metalness,roughness:d.roughness,ior:d.ior,envMap:albedo?null:environment,envMapIntensity:albedo?0:d.envMapIntensity,side,transparent:false,opacity:1,depthWrite:true,clearcoat:0,sheen:0,transmission:0,anisotropy:0,specularIntensity:1});
 m.name='Atelier Ribbed clay'+(albedo?' albedo':'');
 m.userData={materialId:RIBBED_CLAY_ID,physicalSurface:true,bakedGeometry:true,normalReliefOnly:true,scope:'original-vase-only',modelVersion:RIBBED_CLAY_MODEL_VERSION,modelSHA256:RIBBED_CLAY_MODEL_SHA256,...(albedo?{albedoSurface:true}:{})};
 m.defaultAttributeValues={clayCoord:[0,0],materialAO:[1],materialLightAO:[-1]};
 m.toneMapped=!albedo;m.fog=!albedo;
 m.onBeforeCompile=shader=>{
  assertShader(shader);
  // Work on local strings/uniforms; a rejected hook leaves the caller unchanged.
  const s={vertexShader:shader.vertexShader,fragmentShader:shader.fragmentShader,uniforms:{}};
  const maxV=RIBBED_CLAY_MAX_V,flat=false,diagnostic=false;
  Object.assign(s.uniforms,{clayMaxV:{value:maxV},clayRelief:{value:flat?0:1},clayDiagnostic:{value:diagnostic?1:0}});
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 clayCoord;attribute float materialAO;attribute float materialLightAO;varying vec2 vClayQ;varying float vClayAO;varying float vClayLightAO;').replace('#include <begin_vertex>','#include <begin_vertex>\nvClayQ=clayCoord;vClayAO=materialAO;vClayLightAO=materialLightAO;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\n'+field).replace('#include <lights_physical_pars_fragment>','#include <lights_physical_pars_fragment>\n'+direct).replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n'+setup);
  const begin=T.ShaderChunk.lights_fragment_begin.replaceAll('RE_Direct( directLight,','clayDirect( directLight,');
  const open=`ReflectedLight claySum=ReflectedLight(vec3(0),vec3(0),vec3(0),vec3(0));
  for(int clayIndex=0;clayIndex<4;clayIndex++){
   vec2 offset=vec2(float(clayIndex%2),float(clayIndex/2))*0.5-0.25;
   clayQ=vClayQ+offset.x*clayDx+offset.y*clayDy;clayCurrent=clayField(clayQ);
   vec3 normal=clayFrame?normalize(clayN-clayRelief*(clayCurrent.g.x*clayGU+clayCurrent.g.y*clayGV)):clayN;
   ReflectedLight reflectedLight=ReflectedLight(vec3(0),vec3(0),vec3(0),vec3(0));`;
  const close=`
   float clayAO=clamp(vClayLightAO<0.0?vClayAO:vClayLightAO,0.0,1.0);
   reflectedLight.indirectDiffuse*=clayAO;
   reflectedLight.indirectSpecular*=computeSpecularOcclusion(saturate(dot(geometryNormal,geometryViewDir)),clayAO,material.roughness);
   claySum.directDiffuse+=reflectedLight.directDiffuse*0.25;
   claySum.directSpecular+=reflectedLight.directSpecular*0.25;
   claySum.indirectDiffuse+=reflectedLight.indirectDiffuse*0.25;
   claySum.indirectSpecular+=reflectedLight.indirectSpecular*0.25;
  }reflectedLight=claySum;`;
  s.fragmentShader=s.fragmentShader.replace('#include <lights_fragment_begin>',open+begin).replace('#include <lights_fragment_end>',T.ShaderChunk.lights_fragment_end+'\n'+T.ShaderChunk.aomap_fragment+'\n'+close).replace('#include <aomap_fragment>','');
  s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>','if(clayDiagnostic==1)outgoingLight=vec3(gl_FrontFacing&&!clayFrame?1.0:0.0,clayFrame?1.0:0.0,gl_FrontFacing?0.0:1.0);\n#include <opaque_fragment>');
  if(albedo){
   // Literal linear pigment data, without relief, lighting, AO, tone mapping,
   // color encoding, fog, dithering or material-space patterns.
   s.vertexShader=shader.vertexShader;
   s.fragmentShader='void main(){gl_FragColor=vec4(0.48,0.30,0.19,1.0);}';
  }
  shader.vertexShader=s.vertexShader;
  shader.fragmentShader=s.fragmentShader;
  if(!albedo)Object.assign(shader.uniforms,s.uniforms);
 };
 m.customProgramCacheKey=()=>`atelier-ribbed-clay-v${RIBBED_CLAY_MODEL_VERSION}:${RIBBED_CLAY_MODEL_SHA256}:three-r180:${side}:${albedo?'albedo-linear':'physical'}`;
 return m;
}
