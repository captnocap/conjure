// Portable frozen cutaway pigment proxy. Source snapshot is read-only.
// Event raster + depth grouping adapted from pinned dist/thickness-exposure.js.
import { sourceGeometrySignature } from './section-rib-signature.js';
import { matchesAcceptedSourceGeometry } from './accepted-source-reference.js';
import { apertureFloat32CPU, MODEL_VERSION, ELIGIBLE_IDS } from './perforated-shell-field.js';
export class CutawayError extends Error { constructor(message) { super(message); this.name = 'CutawayError'; } }
const assert = (ok, message='Invalid cutaway input or numerical support') => { if (!ok) throw new CutawayError(message); };
assert.equal = (a,b,message) => assert(a===b,message);
export const SOURCE_SIGNATURE='45c04496a5d381879e94380282bbcd4143926b455f04b525e7271541ecbe745f';
export const CUTAWAY=Object.freeze({version:1,model:'frozen-common-cutaway-v1',subpixelGrid:2,shadowSize:2048,maxSize:720,maxColdMs:60000,capPigmentSRGB:Object.freeze([186,74,51]),backgroundSRGB:Object.freeze([229,231,222]),ambient:.32,directScale:.1511111111111111});
export const EPS=Object.freeze({bary:1e-10,depth:1e-8,parallel:1e-12,plane:1e-10});
export const CLOSED_IDS=Object.freeze([2,3,4,5,6,8,9,10,13,15,17,19,20]);
const CLOSED=new Set(CLOSED_IDS);
export const SHEET_IDS=Object.freeze([1,7,11,12,14,16,18]);
const SHEETS=new Set(SHEET_IDS);
export const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const unit=a=>{const r=Math.hypot(...a);assert(r>0);return a.map(v=>v/r)};
export const tf=(m,p)=>[0,1,2].map(i=>m[i]*p[0]+m[i+4]*p[1]+m[i+8]*p[2]+m[i+12]);
export const PLANE=Object.freeze({n:Object.freeze(unit([.36,0,1])),h:.45/Math.hypot(.36,1)});
export const srgbToLinear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
export const linearToSRGB=x=>Math.round(255*Math.max(0,Math.min(1,x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055)));
export function validateCamera(camera){
 assert(camera&&finiteVector(camera.view,16)&&finiteVector(camera.projection,16),'Invalid orthographic cutaway camera');
 const V=camera.view,P=camera.projection;
 // Captured Three inverses may have affine homogeneous roundoff at 2e-16.
 assert([3,7,11].every(i=>Math.abs(V[i])<=1e-12&&Math.abs(P[i])<=1e-12));assert(Math.abs(V[15]-1)<=1e-12&&Math.abs(P[15]-1)<=1e-12,'Cutaway requires affine orthographic matrices');
 assert([1,2,4,6,8,9].every(i=>P[i]===0));assert(P[0]>0&&P[5]>0&&P[10]<0);
 const axes=[[V[0],V[4],V[8]],[V[1],V[5],V[9]],[V[2],V[6],V[10]]];
 for(let i=0;i<3;i++)for(let j=0;j<3;j++)assert(Math.abs(dot(axes[i],axes[j])-(i===j?1:0))<1e-10);
 assert(Math.abs(dot(cross(axes[0],axes[1]),axes[2])-1)<1e-10);
 const near=(P[14]+1)/P[10],far=(P[14]-1)/P[10];assert(near>=0&&far>near);return {near,far};
}
export function rayAt(camera,size,x,y){
 const V=camera.view,P=camera.projection;
 const vx=(2*(x+.5)/size-1-P[12])/P[0],vy=(1-2*(y+.5)/size-P[13])/P[5];
 const r=[vx-V[12],vy-V[13],-V[14]];
 const O=[0,1,2].map(j=>V[j*4]*r[0]+V[j*4+1]*r[1]+V[j*4+2]*r[2]);
 return {O,D:[-V[2],-V[6],-V[10]]};
}
export function project(camera,size,p){const v=tf(camera.view,p),q=tf(camera.projection,v);return[(q[0]+1)*size/2,(1-q[1])*size/2,-v[2]];}
export function makeWorld(meshes,{perforatedIDs=new Set()}={}){
 let globalFace=0;
 return meshes.map(m=>{
  const perforated=perforatedIDs.has(m.id);
  const positions=[];for(let i=0;i<m.position.length;i+=3)positions.push(tf(m.matrix,[m.position[i],m.position[i+1],m.position[i+2]]));
  const triangles=[],n=m.index?.length??positions.length;
  for(let i=0;i<n;i+=3){const w=[0,1,2].map(j=>positions[m.index?m.index[i+j]:i+j]),normal=unit(cross(sub(w[1],w[0]),sub(w[2],w[0])));assert(normal.every(Number.isFinite));triangles.push({world:w,normal,face:i/3,globalFace:globalFace++,id:m.id,...(perforated?{local:[0,1,2].map(j=>{const k=(m.index?m.index[i+j]:i+j)*3;return [m.position[k],m.position[k+1],m.position[k+2]];})}:{})});}
  return {id:m.id,side:perforated?2:m.side,perforated,triangles,positions};
 });
}
export function collapseEvents(events,sheet=false){
 events.sort((a,b)=>a.t-b.t||a.face-b.face);const out=[];let duplicate=0,tangent=0;
 for(let i=0;i<events.length;){let j=i+1;while(j<events.length&&Math.abs(events[j].t-events[i].t)<=EPS.depth)j++;
  let positive=false,negative=false,chosen=events[i];for(let k=i;k<j;k++){positive ||=events[k].cos>0;negative ||=events[k].cos<0;if(events[k].face<chosen.face)chosen=events[k];}
  duplicate+=j-i-1;if(!sheet&&positive&&negative)tangent++;else out.push(chosen);i=j;
 }
 return {events:out,duplicate,tangent};
}
export function intervalsFromEvents(events){
 assert.equal(events.length%2,0,'Unbalanced closed ray');const intervals=[];
 for(let i=0;i<events.length;i+=2){const a=events[i],b=events[i+1];assert(a.cos<0&&b.cos>0,'Nonalternating closed ray');assert(b.t>=a.t);intervals.push([a,b]);}
 return intervals;
}
export function clipInterval(a,b,O,D,plane=PLANE){
 const base=dot(plane.n,O)-plane.h,q=dot(plane.n,D);
 if(Math.abs(q)<EPS.parallel)return base<=EPS.plane?{t:a.t,exit:b.t,face:a.face,cap:false}:null;
 const tP=-base/q,lo=q<0?Math.max(a.t,tP):a.t,hi=q>0?Math.min(b.t,tP):b.t;
 if(hi<=lo)return null;
 const cap=lo>a.t+EPS.depth;return {t:cap?lo:a.t,exit:hi,face:cap?-1:a.face,cap};
}
export function retainedSurface(e,O,D,side,cut){
 if(side===0&&e.cos>=0)return false;if(side===1&&e.cos<=0)return false;
 return !cut||dot(PLANE.n,O)+e.t*dot(PLANE.n,D)-PLANE.h<=EPS.plane;
}
export function nearer(t,id,face,oldT,oldID,oldFace){
 if(t<oldT-EPS.depth)return true;if(Math.abs(t-oldT)>EPS.depth)return false;
 // Exterior wins a coincident cap tie; then object ID and original serial.
 if(id!==oldID)return id<oldID;
 const cap=face<0,oldCap=oldFace<0;if(cap!==oldCap)return !cap;
 return face<oldFace;
}
export function solve(world,camera,size,mode,{bandRows=32,eventCapacity=131072,budgetCheck=()=>{},onBand=()=>{}}={}){
 const began=performance.now(),{near,far}=validateCamera(camera),D=rayAt(camera,size,0,0).D;
 const meshes=world.map(m=>({...m,triangles:m.triangles.map(t=>({...t,screen:t.world.map(p=>project(camera,size,p)),cos:dot(t.normal,D)}))}));
 for(const m of meshes)if(m.id!==1)for(const t of m.triangles)for(const p of t.screen)assert(p[2]>near&&p[2]<far,'Body crosses clipping range');
 const depth=new Float64Array(size*size);depth.fill(Infinity);const owner=new Uint8Array(size*size),face=new Int32Array(size*size);face.fill(-2);
 const bandSamples=size*bandRows,heads=new Int32Array(bandSamples),touched=new Int32Array(bandSamples),ts=new Float64Array(eventCapacity),cosines=new Float64Array(eventCapacity),faces=new Int32Array(eventCapacity),next=new Int32Array(eventCapacity);
 const stats={size,mode,maximumBandEvents:0,rawEvents:0,apertureRejected:0,duplicateEvents:0,tangentGroups:0,multiIntervalSamples:0,maxIntervals:0,mesh:world.map(m=>({id:m.id,rawEvents:0,retainedHits:0,capHits:0,multiIntervals:0,maximumBandEvents:0})),durationMs:0};
 for(let bandY=0;bandY<size;bandY+=bandRows){budgetCheck();const stopY=Math.min(size,bandY+bandRows);
  for(let mi=0;mi<meshes.length;mi++){
   const mesh=meshes[mi],ms=stats.mesh[mi],sheet=SHEETS.has(mesh.id)||mesh.perforated;assert(sheet||CLOSED.has(mesh.id));heads.fill(-1);let used=0,touchedCount=0;
   for(const tri of mesh.triangles){
    const[a,b,c]=tri.screen,den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(den===0||Math.abs(tri.cos)<EPS.parallel)continue;
    const x0=Math.max(0,Math.ceil(Math.min(a[0],b[0],c[0])-.5)),x1=Math.min(size-1,Math.floor(Math.max(a[0],b[0],c[0])-.5)),y0=Math.max(bandY,Math.ceil(Math.min(a[1],b[1],c[1])-.5)),y1=Math.min(stopY-1,Math.floor(Math.max(a[1],b[1],c[1])-.5));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
     const u=((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/den,v=((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/den,w=1-u-v;if(Math.min(u,v,w)<-EPS.bary)continue;
     if(tri.local&&apertureFloat32CPU([0,1,2].map(k=>u*tri.local[0][k]+v*tri.local[1][k]+w*tri.local[2][k]))){stats.apertureRejected++;continue;}
     assert(used<eventCapacity,`Event overflow mesh ${mesh.id} band ${bandY}`);const i=(y-bandY)*size+x;if(heads[i]===-1)touched[touchedCount++]=i;
     ts[used]=u*a[2]+v*b[2]+w*c[2];cosines[used]=tri.cos;faces[used]=tri.face;next[used]=heads[i];heads[i]=used++;
    }
   }
   ms.rawEvents+=used;ms.maximumBandEvents=Math.max(ms.maximumBandEvents,used);stats.maximumBandEvents=Math.max(stats.maximumBandEvents,used);stats.rawEvents+=used;
   for(let k=0;k<touchedCount;k++){
    const i=touched[k],at=bandY*size+i,x=i%size,y=bandY+Math.floor(i/size),ray=rayAt(camera,size,x,y),events=[];
    for(let j=heads[i];j!==-1;j=next[j])events.push({t:ts[j],cos:cosines[j],face:faces[j]});
    const collapsed=collapseEvents(events,sheet);stats.duplicateEvents+=collapsed.duplicate;stats.tangentGroups+=collapsed.tangent;
    const intervals=sheet?null:intervalsFromEvents(collapsed.events);if(intervals){stats.maxIntervals=Math.max(stats.maxIntervals,intervals.length);if(intervals.length>1){stats.multiIntervalSamples++;ms.multiIntervals++;}}
    const hits=[];
    if(!sheet&&mode==='candidate'){
     for(const [a,b] of intervals){const hit=clipInterval(a,b,ray.O,D);if(hit)hits.push(hit);}
    }else{
     for(const e of collapsed.events)if(retainedSurface(e,ray.O,D,mesh.side,mode!=='uncut'&&mesh.id!==1))hits.push({t:e.t,face:e.face,cap:false});
    }
    for(const hit of hits){if(hit.t<near||hit.t>far)continue;ms.retainedHits++;if(hit.cap)ms.capHits++;
     if(nearer(hit.t,mesh.id,hit.face,depth[at],owner[at],face[at])){depth[at]=hit.t;owner[at]=mesh.id;face[at]=hit.face;}
    }
   }
  }
  onBand(bandY);
 }
 stats.durationMs=performance.now()-began;return{depth,owner,face,size,mode,stats};
}
export function deriveLighting(scene){
 const V=scene.camera.view,lights=scene.metadata.spectralLights.map(l=>{const d=[l.direction[0],-l.direction[1],l.direction[2]],world=unit([0,1,2].map(j=>V[j*4]*d[0]+V[j*4+1]*d[1]+V[j*4+2]*d[2]));return {direction:world,color:l.color.map(v=>v*l.intensity)};});
 assert.equal(lights.length,2);const SV=scene.shadow.camera.view,key=unit([SV[2],SV[6],SV[10]]);assert(Math.abs(dot(lights[0].direction,key)-1)<1e-12,'Key light direction disagrees with shadow camera');return lights;
}
export function receiverSlopes(normal,shadowCamera,size){
 const V=shadowCamera.view,P=shadowCamera.projection,R=[V[0],V[4],V[8]],U=[V[1],V[5],V[9]],D=[-V[2],-V[6],-V[10]],den=dot(normal,D);
 if(Math.abs(den)<EPS.parallel)return[0,0];return[-dot(normal,R)*(2/(size*P[0]))/den,dot(normal,U)*(2/(size*P[5]))/den];
}
export function shade(world,camera,shadowCamera,view,shadow,lights,pigments,model,budgetCheck=()=>{}){
 const N=view.size,size=N/2,SZ=shadow.size,linear=new Float64Array(size*size*3),rgba=new Uint8Array(size*size*4),byID=new Map(world.map(m=>[m.id,m]));
 const groups=new Map(),D=rayAt(camera,N,0,0).D,cap=PLANE.n,capPigment=model.render.capPigmentSRGB.map(v=>srgbToLinear(v/255)),background=model.render.backgroundSRGB.map(v=>srgbToLinear(v/255));
 const stats={visibleSamples:0,capSamples:0,sheetBackSamples:0,shadowedSamples:0,floorShadowedSamples:0,byID:{},maxCapPlaneResidual:0,maxRetainedPlaneViolation:0};
 for(const m of world){stats.byID[m.id]={visible:0,caps:0,shadowed:0};for(const t of m.triangles){let n=t.normal;if(m.side===2&&dot(n,D)>0)n=n.map(v=>-v);groups.set(`${m.id}:${t.face}`,{normal:n,pigment:pigments[m.id],key:Math.max(0,dot(n,lights[0].direction)),fill:Math.max(0,dot(n,lights[1].direction)),slopes:receiverSlopes(n,shadowCamera,SZ)});}groups.set(`${m.id}:-1`,{normal:cap,pigment:capPigment,key:Math.max(0,dot(cap,lights[0].direction)),fill:Math.max(0,dot(cap,lights[1].direction)),slopes:receiverSlopes(cap,shadowCamera,SZ)});}
 for(let y=0;y<N;y++){if(y%32===0)budgetCheck();for(let x=0;x<N;x++){
  const i=y*N+x,id=view.owner[i],face=view.face[i],o=(Math.floor(y/2)*size+Math.floor(x/2))*3;if(!id){for(let ch=0;ch<3;ch++)linear[o+ch]+=background[ch]/4;continue;}
  const group=groups.get(`${id}:${face}`);assert(group);stats.visibleSamples++;stats.byID[id].visible++;if(face===-1){assert(CLOSED.has(id)&&!byID.get(id).perforated);stats.capSamples++;stats.byID[id].caps++;}
  const ray=rayAt(camera,N,x,y),p=ray.O.map((v,j)=>v+ray.D[j]*view.depth[i]),residual=dot(PLANE.n,p)-PLANE.h;
  if(view.mode!=='uncut'&&id!==1){if(face===-1)stats.maxCapPlaneResidual=Math.max(stats.maxCapPlaneResidual,Math.abs(residual));stats.maxRetainedPlaneViolation=Math.max(stats.maxRetainedPlaneViolation,residual);assert(residual<2e-8,'Visible support outside retained halfspace');}
  if(id===7&&face>=0&&dot(byID.get(id).triangles[face].normal,D)>0)stats.sheetBackSamples++;
  let visibility=1;
  if(group.key>1e-12){const q=project(shadowCamera,SZ,p),sx=Math.floor(q[0]),sy=Math.floor(q[1]);if(sx>=0&&sy>=0&&sx<SZ&&sy<SZ){const corrected=q[2]+group.slopes[0]*(sx+.5-q[0])+group.slopes[1]*(sy+.5-q[1]);if(corrected>shadow.depth[sy*SZ+sx]+.002){visibility=0;stats.shadowedSamples++;stats.byID[id].shadowed++;if(id===1)stats.floorShadowedSamples++;}}}
  for(let ch=0;ch<3;ch++)linear[o+ch]+=group.pigment[ch]*(model.render.ambient+model.render.directScale*(lights[0].color[ch]*group.key*visibility+lights[1].color[ch]*group.fill))/4;
 }}
 for(let i=0;i<size*size;i++){for(let ch=0;ch<3;ch++)rgba[i*4+ch]=linearToSRGB(linear[i*3+ch]);rgba[i*4+3]=255;}
 return {rgba,linear,stats};
}


function finiteVector(value,length) { return (Array.isArray(value)||ArrayBuffer.isView(value))&&value.length===length&&Array.from(value).every(Number.isFinite); }
export function validateCutawayInput(input) {
 assert(input&&typeof input==='object','Cutaway input is required');
 const {snapshot,shadowCamera,spectralLights,baseColors,materialVisibility}=input;
 assert(snapshot&&Number.isInteger(snapshot.size)&&snapshot.size>=1&&snapshot.size<=CUTAWAY.maxSize,'Cutaway size must be an integer from 1 to 720');
 assert(sourceGeometrySignature(snapshot)===SOURCE_SIGNATURE||matchesAcceptedSourceGeometry(snapshot),'Cutaway requires the unchanged accepted original 20-mesh source geometry');
 // Mesh identity is stable array order, matching the signature and source snapshot contract.
 validateCamera(snapshot);validateCamera(shadowCamera);
 assert(Array.isArray(spectralLights)&&spectralLights.length===2,'Cutaway requires two captured spectral lights');
 for(const light of spectralLights)assert(light&&finiteVector(light.direction,3)&&Math.abs(Math.hypot(...light.direction)-1)<1e-10&&finiteVector(light.color,3)&&light.color.every(v=>v>=0)&&Number.isFinite(light.intensity)&&light.intensity>=0,'Invalid captured spectral light');
 for(let id=1;id<=20;id++)assert(baseColors&&Array.isArray(baseColors[id])&&baseColors[id].length===3&&baseColors[id].every(v=>Number.isInteger(v)&&v>=0&&v<=255),'Cutaway requires all 20 source sRGB pigments');
 let ids=[];
 if(materialVisibility!=null){
  assert(materialVisibility.model===MODEL_VERSION&&Array.isArray(materialVisibility.objectIds)&&materialVisibility.objectIds.length>0,'Invalid cutaway material visibility');
  ids=materialVisibility.objectIds;
  assert(ids.every((id,i)=>ELIGIBLE_IDS.includes(id)&&(i===0||id>ids[i-1])),'Cutaway perforations are limited to ordered unique IDs 7 and 10');
 }
 const lights=deriveLighting({camera:snapshot,shadow:{camera:shadowCamera},metadata:{spectralLights}});
 assert(lights.every(l=>l.color.every(Number.isFinite))&&[0,1,2].every(ch=>Number.isFinite(CUTAWAY.ambient+CUTAWAY.directScale*(lights[0].color[ch]+lights[1].color[ch]))),'Captured light radiance overflows finite pigment shading');
 const pigments={};for(let id=1;id<=20;id++)pigments[id]=baseColors[id].map(v=>srgbToLinear(v/255));
 return {perforatedIDs:new Set(ids),lights,pigments};
}
// This key is validated even on a cache hit, so a mutated source cannot use old pixels.
export function cutawayInputKey(input) {
 validateCutawayInput(input);
 const s=input.snapshot;
 // Admitted tiny differences remain real rendering inputs; never alias their
 // cache keys. The exact original still produces its historical key unchanged.
 return JSON.stringify([sourceGeometrySignature(s),s.size,Array.from(s.view),Array.from(s.projection),Array.from(input.shadowCamera.view),Array.from(input.shadowCamera.projection),input.spectralLights.map(l=>[Array.from(l.direction),Array.from(l.color),l.intensity]),Array.from({length:20},(_,i)=>input.baseColors[i+1]),input.materialVisibility?.objectIds??[]]);
}
export function renderCutaway(input,{budgetCheck=()=>{},onProgress=()=>{}}={}) {
 const began=performance.now();
 const check=()=>{assert(performance.now()-began<=CUTAWAY.maxColdMs,'Cutaway exceeded the fixed 60-second render budget');budgetCheck();};
 const {perforatedIDs,lights,pigments}=validateCutawayInput(input),{snapshot,shadowCamera}=input;
 check();
 const world=makeWorld(snapshot.meshes.map((m,i)=>({...m,id:i+1})),{perforatedIDs});
 // Only this function owns geometry, solve fields and linear accumulation. The public
 // result contains finished RGBA and compact numbers; all expensive fields die here.
 const shadow=solve(world,shadowCamera,CUTAWAY.shadowSize,'candidate',{budgetCheck:check,onBand:y=>onProgress({stage:'shadow',row:y,rows:CUTAWAY.shadowSize})});
 const view=solve(world,snapshot,snapshot.size*CUTAWAY.subpixelGrid,'candidate',{budgetCheck:check,onBand:y=>onProgress({stage:'camera',row:y,rows:snapshot.size*CUTAWAY.subpixelGrid})});
 const shaded=shade(world,snapshot,shadowCamera,view,shadow,lights,pigments,{render:CUTAWAY},check);
 check();
 return {rgba:shaded.rgba,width:snapshot.size,height:snapshot.size,diagnostics:{model:CUTAWAY.model,sourceGeometrySignature:sourceGeometrySignature(snapshot),durationMs:performance.now()-began,perforatedIDs:[...perforatedIDs],camera:view.stats,shadow:shadow.stats,shading:shaded.stats}};
}
