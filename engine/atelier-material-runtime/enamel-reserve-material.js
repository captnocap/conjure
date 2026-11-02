import * as T from 'three';
import { ENAMEL_RESERVE_ID, ENAMEL_MODEL_VERSION, ENAMEL_MODEL_SHA256, ENAMEL_COVERAGE_GLSL } from './enamel-reserve-config.js';

export const enamelReserveDefinition=Object.freeze({
 id:ENAMEL_RESERVE_ID,name:'Enamel reserve',baseColor:'#19697c',
 linearPigment:Object.freeze([.01,.14,.20]),metalness:0,roughness:.28,ior:1.5,transmission:0,
 description:'Coarse flush enamel cells and connected reflective metal reserve; Vase only',
});

const inputs='attribute vec2 enCoord;attribute float materialAO;attribute float materialLightAO;varying vec2 vEnQ;varying float vEnAO;varying float vEnLightAO;';
const varying='varying vec2 vEnQ;varying float vEnAO;varying float vEnLightAO;';
const coverage=`
vec2 enDx=dFdx(vEnQ),enDy=dFdy(vEnQ);bool enValid=true;
float enFill=gl_FrontFacing?enCoverage(vEnQ,enDx,enDy,enValid):0.0;
`;
const ao=`float enAO=clamp(vEnLightAO<0.0?vEnAO:vEnLightAO,0.0,1.0);
reflectedLight.indirectDiffuse*=enAO;
reflectedLight.indirectSpecular*=computeSpecularOcclusion(saturate(dot(geometryNormal,geometryViewDir)),enAO,material.roughness);`;
const start=`${coverage}ReflectedLight enSum=ReflectedLight(vec3(0.0),vec3(0.0),vec3(0.0),vec3(0.0));
for(int enIndex=0;enIndex<2;enIndex++){
 vec4 diffuseColor=vec4(enIndex==0?vec3(.7,.72,.74):vec3(.01,.14,.20),1.0);
 float metalnessFactor=enIndex==0?1.0:0.0;
 ReflectedLight reflectedLight=ReflectedLight(vec3(0.0),vec3(0.0),vec3(0.0),vec3(0.0));
`;
const end=`
${ao}
float enWeight=enIndex==0?1.0-enFill:enFill;
enSum.directDiffuse+=reflectedLight.directDiffuse*enWeight;
enSum.directSpecular+=reflectedLight.directSpecular*enWeight;
enSum.indirectDiffuse+=reflectedLight.indirectDiffuse*enWeight;
enSum.indirectSpecular+=reflectedLight.indirectSpecular*enWeight;
}
reflectedLight=enSum;
`;
const invalidOutput='if(!enValid)outgoingLight=vec3(1000.0,0.0,1000.0);';

function once(source,token){
 if(typeof source!=='string'||source.split(token).length!==2)throw new Error('Unexpected Three shader structure for Enamel reserve: '+token);
}
function assertShader(shader){
 if(T.REVISION!=='180')throw new Error('Unsupported Three revision for Enamel reserve: '+T.REVISION);
 if(!shader||!shader.uniforms)throw new Error('Unexpected Three shader structure for Enamel reserve: uniforms');
 for(const token of ['#include <common>','#include <begin_vertex>'])once(shader.vertexShader,token);
 for(const token of ['#include <common>','#include <normal_fragment_begin>','#include <normal_fragment_maps>','#include <lights_physical_fragment>','#include <lights_fragment_begin>','#include <lights_fragment_maps>','#include <lights_fragment_end>','#include <aomap_fragment>','#include <opaque_fragment>','#include <tonemapping_fragment>','#include <colorspace_fragment>'])once(shader.fragmentShader,token);
 let previous=-1;
 for(const token of ['#include <normal_fragment_maps>','#include <lights_physical_fragment>','#include <lights_fragment_begin>','#include <lights_fragment_maps>','#include <lights_fragment_end>','#include <aomap_fragment>','#include <opaque_fragment>','#include <tonemapping_fragment>','#include <colorspace_fragment>']){
  const position=shader.fragmentShader.indexOf(token);
  if(position<=previous)throw new Error('Unexpected Three shader structure for Enamel reserve: ordering '+token);
  previous=position;
 }
 once(T.ShaderChunk.lights_physical_fragment,'PhysicalMaterial material;');
 once(T.ShaderChunk.lights_physical_fragment,'material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );');
 once(T.ShaderChunk.aomap_fragment,'reflectedLight.indirectDiffuse *= ambientOcclusion;');
 once(T.ShaderChunk.aomap_fragment,'computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness )');
}

export function createEnamelReserveMaterial(environment,{side=T.DoubleSide,albedo=false}={}){
 if(![T.FrontSide,T.BackSide,T.DoubleSide].includes(side))throw new RangeError('Invalid material side');
 if(typeof albedo!=='boolean')throw new TypeError('Invalid Enamel reserve albedo option');
 if(T.REVISION!=='180')throw new Error('Unsupported Three revision for Enamel reserve: '+T.REVISION);
 // The admitted mesh is always double-sided. Reverse-facing polygons are
 // uniform conductor, with the original normal and the same visibility hook.
 side=T.DoubleSide;
 const m=new T.MeshPhysicalMaterial({color:new T.Color().setRGB(.01,.14,.20),metalness:0,roughness:.28,ior:1.5,envMap:albedo?null:environment,envMapIntensity:albedo?0:1,side,transparent:false,opacity:1,depthWrite:true,clearcoat:0,sheen:0,transmission:0,anisotropy:0});
 m.name='Atelier Enamel reserve'+(albedo?' albedo':'');
 m.userData={materialId:ENAMEL_RESERVE_ID,physicalSurface:true,bakedGeometry:true,scope:'original-vase-only',modelVersion:ENAMEL_MODEL_VERSION,modelSHA256:ENAMEL_MODEL_SHA256,...(albedo?{albedoSurface:true}:{})};
 // Missing/constant chart coordinates deliberately produce an invalid
 // derivative and the visible sentinel. They never silently select metal.
 m.defaultAttributeValues={enCoord:[0,0],materialAO:[1],materialLightAO:[-1]};
 m.toneMapped=!albedo;m.fog=!albedo;
 m.onBeforeCompile=shader=>{
  // Validate every affected anchor before modifying either stage. No global
  // ShaderChunk is changed, and the shared environment is only borrowed.
  assertShader(shader);
  const vertex=shader.vertexShader.replace('#include <common>','#include <common>\n'+inputs).replace('#include <begin_vertex>','#include <begin_vertex>\nvEnQ=enCoord;vEnAO=materialAO;vEnLightAO=materialLightAO;');
  let fragment;
  if(albedo){
   // Material-color data: same frozen coverage and linear endpoint colors.
   // This stage has no lighting, normal perturbation, AO, tone mapping,
   // color encoding, fog, dithering, or post-processing path.
   fragment=`#include <common>\n${varying}${ENAMEL_COVERAGE_GLSL}
void main(){
${coverage}
vec3 outgoingLight=mix(vec3(.7,.72,.74),vec3(.01,.14,.20),enFill);
${invalidOutput}
gl_FragColor=vec4(outgoingLight,1.0);
}`;
  }else{
   fragment=shader.fragmentShader.replace('#include <common>','#include <common>\n'+varying+ENAMEL_COVERAGE_GLSL)
    .replace('#include <lights_physical_fragment>',start+T.ShaderChunk.lights_physical_fragment)
    .replace('#include <aomap_fragment>',T.ShaderChunk.aomap_fragment+'\n'+end)
    .replace('#include <opaque_fragment>','\n'+invalidOutput+'\n#include <opaque_fragment>');
  }
  shader.vertexShader=vertex;
  shader.fragmentShader=fragment;
 };
 m.customProgramCacheKey=()=>`atelier-enamel-reserve-v${ENAMEL_MODEL_VERSION}:${ENAMEL_MODEL_SHA256}:three-r180:${side}:${albedo?'albedo-linear':'physical'}`;
 return m;
}
