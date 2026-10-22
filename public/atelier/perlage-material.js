import * as T from './vendor/three.module.min.js';

export const perlageDefinition = Object.freeze({
  id: 'perlage-metal', name: 'Circular-grained metal', baseColor: '#bcc6ce',
  metalness: 1, roughness: 0.3, anisotropy: 0.86, transmission: 0,
  description: 'Overlapping circular reflection fields; small plant parts use smooth metal',
});

export const fieldGLSL = /* glsl */ `
uniform float perlageConstantDirection;
varying float vPerlageEnabled;
varying float vPerlagePeriodicV;
varying float vPerlageChartValid;
varying vec2 vPerlageUV;
// q is an approximate manufacturing chart, not geodesic surface distance.
vec3 perlageField(vec2 q) {
  q.x = mod(q.x, 8.0);
  if (vPerlagePeriodicV > 0.5) q.y = mod(q.y, 4.0);
  vec2 bestDelta = vec2(0.0);
  float bestOrder = -1.0;
  float baseRow = floor(q.y);
  for (int j=-1; j<=1; j++) {
    float row = baseRow+float(j);
    float stagger = 0.5*mod(row,2.0);
    float baseColumn = floor(q.x-stagger);
    for (int i=-1; i<=1; i++) {
      float column = baseColumn+float(i);
      vec2 delta = q-vec2(column+0.5+stagger,row+0.5);
      float orderRow = vPerlagePeriodicV > 0.5 ? mod(row,4.0) : row;
      float order = orderRow*8.0+mod(column,8.0);
      if ((vPerlagePeriodicV > 0.5 || (row>=0.0 && row<4.0)) && dot(delta,delta)<=0.6084 && order>bestOrder) {
        bestDelta=delta;
        bestOrder=order;
      }
    }
  }
  float radius=length(bestDelta);
  vec2 direction=vec2(-bestDelta.y,bestDelta.x)/max(radius,1e-12);
  direction=mix(direction,vec2(0.0,1.0),perlageConstantDirection);
  return vec3(direction,bestOrder>=0.0?smoothstep(0.06,0.14,radius):0.0);
}
`;

export const physicalGLSL = /* glsl */ `
#ifdef USE_ANISOTROPY
  if (vPerlageEnabled < 0.5) {
    // Explicit small-geometry material policy. No contact lookup, direction or
    // center attenuation is sampled; this is not a physically averaged BRDF.
    vec3 perlageIsotropicAxis=abs(normal.y)<0.9?vec3(0.0,1.0,0.0):vec3(1.0,0.0,0.0);
    material.anisotropyT=normalize(cross(normal,perlageIsotropicAxis));
    material.anisotropyB=normalize(cross(normal,material.anisotropyT));
    material.anisotropy=0.0;
    material.alphaT=pow2(material.roughness);
  } else {
  vec2 perlageQ=vPerlageUV*vec2(8.0,4.0);
  vec3 perlageF=perlageField(perlageQ);
  // Differentiate the unwrapped chart, never fract/mod coordinates.
  vec2 perlageDx=dFdx(perlageQ),perlageDy=dFdy(perlageQ);
  vec3 perlagePx=dFdx(-vViewPosition),perlagePy=dFdy(-vViewPosition);
  float perlageDet=perlageDx.x*perlageDy.y-perlageDx.y*perlageDy.x;
  float perlageScale=max(length(perlageDx)*length(perlageDy),1e-30);
  float perlageValid=(vPerlageChartValid>0.999999 && abs(perlageDet)>1e-6*perlageScale)?1.0:0.0;
  // The common determinant affects only sign/scale of an unoriented line.
  vec3 perlageU=perlagePx*perlageDy.y-perlagePy*perlageDx.y;
  vec3 perlageV=perlagePy*perlageDx.x-perlagePx*perlageDy.x;
  vec3 perlageGroove=perlageU*perlageF.x+perlageV*perlageF.y;
  perlageGroove-=normal*dot(perlageGroove,normal);
  float perlageGrooveSq=dot(perlageGroove,perlageGroove);
  float perlageFloor=1e-12*max(dot(perlageU,perlageU)+dot(perlageV,perlageV),1e-30);
  // A finite fallback frame is only numerical scaffolding for isotropic metal.
  // Never give an invented direction nonzero BRDF anisotropy.
  perlageValid*=perlageGrooveSq>perlageFloor?1.0:0.0;
  vec3 perlageFallback=abs(normal.y)<0.9?vec3(0.0,1.0,0.0):vec3(1.0,0.0,0.0);
  perlageGroove=perlageGrooveSq>perlageFloor
    ?perlageGroove*inversesqrt(max(perlageGrooveSq,perlageFloor))
    :normalize(cross(normal,perlageFallback));
  // r180/KHR convention: broaden across the circular scratch, not along it.
  material.anisotropyT=normalize(cross(perlageGroove,normal));
  material.anisotropyB=normalize(cross(normal,material.anisotropyT));
  material.anisotropy*=perlageF.z*perlageValid;
  material.alphaT=mix(pow2(material.roughness),1.0,pow2(material.anisotropy));
  }
#endif
`;

export function createPerlageMaterial(environment,{side=T.FrontSide,constantDirection=false,albedo=false}={}) {
  const material=new T.MeshPhysicalMaterial({color:'#bcc6ce',metalness:1,roughness:0.3,anisotropy:0.86,anisotropyRotation:0,envMap:environment,envMapIntensity:1.05,side});
  material.name=`Circular-grained metal${albedo?' albedo':''}`;
  material.userData={materialId:'perlage-metal',circularReflectionField:true,albedoSurface:albedo};
  material.defaultAttributeValues={...material.defaultAttributeValues,perlageEnabled:[0],perlageChartValid:[0],perlagePeriodicV:[0],perlageCoord:[0,0]};
  material.defaultAttributeValues={...material.defaultAttributeValues,materialAO:[1],materialLightAO:[-1]};
  if(albedo){material.toneMapped=false;material.fog=false;}
  material.onBeforeCompile=shader=>{
    shader.uniforms.perlageConstantDirection={value:constantDirection?1:0};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float perlageEnabled;\nattribute float perlageChartValid;\nattribute float perlagePeriodicV;\nattribute vec2 perlageCoord;\nvarying float vPerlageEnabled;\nvarying float vPerlageChartValid;\nvarying float vPerlagePeriodicV;\nvarying vec2 vPerlageUV;').replace('#include <begin_vertex>','#include <begin_vertex>\nvPerlageEnabled=perlageEnabled;\nvPerlageChartValid=perlageChartValid;\nvPerlagePeriodicV=perlagePeriodicV;\nvPerlageUV=perlageChartValid>0.5?perlageCoord:vec2(0.0);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\n${fieldGLSL}`).replace('#include <lights_physical_fragment>',`#include <lights_physical_fragment>\n${physicalGLSL}`);
    if(albedo)shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','gl_FragColor=vec4(diffuseColor.rgb,diffuseColor.a);').replace('#include <colorspace_fragment>','');
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nattribute float materialAO;\nattribute float materialLightAO;\nvarying vec2 vPerlageAO;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvPerlageAO=vec2(materialAO,materialLightAO);');
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>','#include <common>\nvarying vec2 vPerlageAO;')
      .replace('#include <aomap_fragment>',`#include <aomap_fragment>
// Shared ambient visibility affects indirect light only, not the contact field.
float perlageLightAO=clamp(vPerlageAO.y<0.0?vPerlageAO.x:vPerlageAO.y,0.0,1.0);
reflectedLight.indirectDiffuse*=perlageLightAO;
reflectedLight.indirectSpecular*=computeSpecularOcclusion(saturate(dot(geometryNormal,geometryViewDir)),perlageLightAO,material.roughness);`);
  };
  material.customProgramCacheKey=()=>`atelier-perlage-v2-ao:${constantDirection}:${albedo}`;
  return material;
}

export function fieldCPU(uv,constantDirection=false,periodicV=false) {
  const q=[((uv[0]*8)%8+8)%8,(periodicV?((uv[1]*4)%4+4)%4:uv[1]*4)];let bestOrder=-1,delta=[0,0],winner=null;
  for(let j=-1;j<=1;j++){const row=Math.floor(q[1])+j,stagger=0.5*((row%2+2)%2),baseColumn=Math.floor(q[0]-stagger);
    for(let i=-1;i<=1;i++){const column=baseColumn+i,d=[q[0]-column-.5-stagger,q[1]-row-.5],order=(periodicV?((row%4+4)%4):row)*8+((column%8+8)%8);
      if((periodicV||(row>=0&&row<4))&&d[0]*d[0]+d[1]*d[1]<=.6084&&order>bestOrder){bestOrder=order;delta=d;winner=[column,row];}
    }
  }
  const r=Math.hypot(...delta),t=Math.max(0,Math.min(1,(r-.06)/.08));
  return {direction:constantDirection?[0,1]:[-delta[1]/Math.max(r,1e-12),delta[0]/Math.max(r,1e-12)],attenuation:bestOrder>=0?t*t*(3-2*t):0,winner,delta,order:bestOrder};
}
