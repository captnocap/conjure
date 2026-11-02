import { getSectionRibBake, BAKED_SECTION_RIB_META } from './section-rib-bake.js';
import { sourceGeometrySignature } from './section-rib-signature.js';
import { matchesAcceptedSourceGeometry } from './accepted-source-reference.js';
import { prepareConjureProxy, validateConjureProxyField, renderConjureProxy } from './conjure-proxies.js';

export const SECTION_RIB = Object.freeze({ version: 1, model: 'section-rib-v1', supersample: 2, shadowSize: 2048, background: Object.freeze([229,231,222]), defaultStrength: .6 });
const linear = x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4;
const srgb = x => Math.round(255 * Math.max(0, Math.min(1, x <= .0031308 ? 12.92 * x : 1.055 * x ** (1/2.4) - .055)));
const sizeOK = n => Number.isInteger(n) && n >= 1 && n <= 720;
const dot = (a,b) => a.reduce((sum,value,i) => sum + value * b[i], 0);
const norm = a => { const d = Math.hypot(...a); return a.map(v => v / d); };
const tf = (m,p) => [0,1,2].map(i => m[i]*p[0] + m[4+i]*p[1] + m[8+i]*p[2] + m[12+i]);
const finiteArray = (a,n) => (Array.isArray(a) || ArrayBuffer.isView(a)) && a.length === n && Array.from(a).every(Number.isFinite);
const equalKeys = (o, keys) => o && typeof o === 'object' && Object.keys(o).length === keys.length && keys.every(k => Object.hasOwn(o,k));

export function validateSectionRibGeometry(snapshot) {
  if(!Array.isArray(snapshot?.meshes)||snapshot.meshes.length!==BAKED_SECTION_RIB_META.sourceMeshLayout.length||snapshot.meshes.some((m,i)=>{
    const expected=BAKED_SECTION_RIB_META.sourceMeshLayout[i];return !m||m.position?.length!==expected.positionLength||(m.index?.length||0)!==expected.indexLength||(m.index?.constructor.name||null)!==expected.indexType;
  }))throw Error('Section-rib bake does not match this source mesh layout');
  if (sourceGeometrySignature(snapshot) !== BAKED_SECTION_RIB_META.sourceGeometrySignature && !matchesAcceptedSourceGeometry(snapshot))
    throw Error('Section-rib bake does not match this source geometry; regenerate and review the bake before using this scene');
  return snapshot;
}
function validateCamera(snapshot) {
  if (!sizeOK(snapshot?.size) || !finiteArray(snapshot.view,16) || !finiteArray(snapshot.projection,16)) throw Error('Invalid section-rib camera');
  const V = snapshot.view, P = snapshot.projection;
  if (Array.from(V).some(v=>Math.abs(v)>1e9) || Array.from(P).some(v=>Math.abs(v)>1e9) || P[0]<1e-12 || P[5]<1e-12) throw Error('Section-rib camera exceeds supported numeric range');
  // This raster is deliberately restricted to a rigid orthographic camera.
  if ([3,7,11].some(i => Math.abs(V[i]) > 1e-12 || Math.abs(P[i]) > 1e-12) || Math.abs(V[15]-1)>1e-12 || Math.abs(P[15]-1)>1e-12 || P[0] <= 0 || P[5] <= 0 || P[10] === 0 ||
      [1,2,4,6,8,9].some(i => P[i] !== 0)) throw Error('Section ribs require a rigid orthographic camera');
  for (let i=0;i<3;i++) for (let j=0;j<3;j++) {
    let d=0; for (let k=0;k<3;k++) d += V[i*4+k]*V[j*4+k];
    if (Math.abs(d-(i===j?1:0))>1e-10) throw Error('Section-rib view matrix is not rigid');
  }
}
function copyLighting(lighting) {
  if (!equalKeys(lighting,['directional','shadowMatrix']) || !Array.isArray(lighting.directional) || lighting.directional.length !== 2 || !finiteArray(lighting.shadowMatrix,16)) throw Error('Invalid section-rib lighting');
  const directional = lighting.directional.map(l => {
    if (!equalKeys(l,['direction','color']) || !finiteArray(l.direction,3) || !finiteArray(l.color,3) || Math.abs(Math.hypot(...l.direction)-1)>1e-10 || l.color.some(v=>v<0 || v>100)) throw Error('Invalid section-rib directional light');
    return { direction: Array.from(l.direction), color: Array.from(l.color) };
  });
  const M=Array.from(lighting.shadowMatrix);
  if ([3,7,11].some(i=>Math.abs(M[i])>1e-12) || Math.abs(M[15]-1)>1e-12) throw Error('Invalid section-rib shadow matrix');
  const axes=[0,1,2].map(i=>[M[i],M[i+4],M[i+8]]),lengths=axes.map(a=>Math.hypot(...a));
  if(lengths.some(v=>v<1e-12||v>1e6)||axes.some((a,i)=>axes.some((b,j)=>i!==j&&Math.abs(dot(a,b)/(lengths[i]*lengths[j]))>1e-10)))throw Error('Invalid section-rib shadow basis');
  return { directional, shadowMatrix:M };
}
function projectVertices(vertices,project) {
  const out = new Float64Array(vertices.length);
  for(let i=0;i<vertices.length;i+=3) {
    const q=project([vertices[i],vertices[i+1],vertices[i+2]]);
    if(q.some(v=>!Number.isFinite(v)||Math.abs(v)>1e12))throw Error('Section-rib projection exceeds supported numeric range');
    out.set(q,i);
  }
  return out;
}
// Serial order is exactly bake order. At a tie, a later serial can never win.
// Shadow ownership is unnecessary, so its allocation is omitted.
export function rasterSectionRibDepth(triangles, projected, size, tie, withOwner=true) {
  const depth=new Float64Array(size*size);depth.fill(Infinity);
  const owner=withOwner?new Uint16Array(size*size):null;
  if(owner)owner.fill(65535);
  for(let ti=0;ti<triangles.length/3;ti++) {
    const ia=triangles[ti*3]*3,ib=triangles[ti*3+1]*3,ic=triangles[ti*3+2]*3;
    const ax=projected[ia],ay=projected[ia+1],az=projected[ia+2],bx=projected[ib],by=projected[ib+1],bz=projected[ib+2],cx=projected[ic],cy=projected[ic+1],cz=projected[ic+2];
    const den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(den)<1e-12)continue;
    const x0=Math.max(0,Math.ceil(Math.min(ax,bx,cx)-.5)),x1=Math.min(size-1,Math.floor(Math.max(ax,bx,cx)-.5)),y0=Math.max(0,Math.ceil(Math.min(ay,by,cy)-.5)),y1=Math.min(size-1,Math.floor(Math.max(ay,by,cy)-.5));
    const du=(by-cy)/den,dv=(cy-ay)/den;
    for(let y=y0;y<=y1;y++) {
      let u=((by-cy)*(x0+.5-cx)+(cx-bx)*(y+.5-cy))/den,v=((cy-ay)*(x0+.5-cx)+(ax-cx)*(y+.5-cy))/den;
      for(let x=x0;x<=x1;x++,u+=du,v+=dv) {
        if(u< -1e-10 || v< -1e-10 || u+v>1+1e-10)continue;
        const d=u*az+v*bz+(1-u-v)*cz,at=y*size+x;
        if(d<depth[at]-tie){depth[at]=d;if(owner)owner[at]=ti;}
      }
    }
  }
  return {depth,owner};
}

// Only the compact shading ownership and group radiometry survive preparation.
// Every mutable input is validated and copied or reduced before returning.
export function prepareSectionRib(snapshot, lighting, materialColor) {
  if (snapshot?.source === 'conjure') return prepareConjureProxy(snapshot, lighting, materialColor, 'section-ribs');
  validateSectionRibGeometry(snapshot);validateCamera(snapshot);
  const light=copyLighting(lighting);
  const V=Array.from(snapshot.view),P=Array.from(snapshot.projection),size=snapshot.size;
  if(typeof materialColor!=='function')throw Error('Section ribs require original object pigments');
  const pigments = new Map();
  for(let id=1;id<=20;id++){const p=materialColor(id);if(!finiteArray(p,3)||Array.from(p).some(v=>v<0||v>255))throw Error('Invalid section-rib object pigment');pigments.set(id,Array.from(p,v=>linear(v/255)));}
  const bake=getSectionRibBake(),M=light.shadowMatrix,N=size*2,SZ=2048;
  const cameraProject=p=>{const v=tf(V,p),q=tf(P,v);return[(q[0]+1)*N/2,(1-q[1])*N/2,-v[2]];};
  const shadowProject=p=>{const q=tf(M,p);return[q[0]*SZ,q[1]*SZ,q[2]];};
  const projectedShadow=projectVertices(bake.vertices,shadowProject);
  const shadow=rasterSectionRibDepth(bake.triangles,projectedShadow,SZ,1e-13,false);
  const projectedView=projectVertices(bake.vertices,cameraProject);
  const view=rasterSectionRibDepth(bake.triangles,projectedView,N,1e-9);
  const G=bake.groupIds.length,groups=new Float64Array(G*5),cameraDir=norm([V[2],V[6],V[10]]),colors=Float64Array.from(light.directional.flatMap(l=>l.color));
  for(let g=0;g<G;g++){
    const ni=bake.groupNormals[g]*3;let n=Array.from(bake.normals.subarray(ni,ni+3));if(dot(n,cameraDir)<0)n=n.map(v=>-v);
    groups.set(pigments.get(bake.groupIds[g]),g*5);groups[g*5+3]=Math.max(0,dot(n,light.directional[0].direction));groups[g*5+4]=Math.max(0,dot(n,light.directional[1].direction));
  }
  if(G*2+1>65535)throw Error('Section-rib shading palette exceeds fixed ownership capacity');
  const slopes=new Float64Array(bake.triangles.length/3*2);
  for(let ti=0;ti<bake.triangles.length/3;ti++){
    const ia=bake.triangles[ti*3]*3,ib=bake.triangles[ti*3+1]*3,ic=bake.triangles[ti*3+2]*3;
    const a=projectedShadow.subarray(ia,ia+3),b=projectedShadow.subarray(ib,ib+3),c=projectedShadow.subarray(ic,ic+3),den=(b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]);
    slopes[ti*2]=Math.abs(den)>1e-16?((b[2]-a[2])*(c[1]-a[1])-(c[2]-a[2])*(b[1]-a[1]))/den:0;
    slopes[ti*2+1]=Math.abs(den)>1e-16?((b[0]-a[0])*(c[2]-a[2])-(c[0]-a[0])*(b[2]-a[2]))/den:0;
  }
  const samples=new Uint16Array(N*N),bias=.002*Math.hypot(M[2],M[6],M[10]);let shadowed=0;
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const at=y*N+x,ti=view.owner[at];if(ti===65535)continue;
    const g=bake.groups[ti],d=groups[g*5+3];let visible=1;
    // Eligibility is fixed at the accepted default, independent of contrast.
    if(light.directional[0].color.some(c=>(.68/4.5)*c*d>1e-10)){
      const camera=[((x+.5)/N*2-1-P[12])/P[0],(1-(y+.5)/N*2-P[13])/P[5],-view.depth[at]],rel=camera.map((v,j)=>v-V[12+j]),world=[0,1,2].map(j=>V[j*4]*rel[0]+V[j*4+1]*rel[1]+V[j*4+2]*rel[2]),q=shadowProject(world),sx=Math.floor(q[0]),sy=Math.floor(q[1]);
      if(sx>=0&&sy>=0&&sx<SZ&&sy<SZ){const corrected=q[2]+slopes[ti*2]*(sx+.5-q[0])+slopes[ti*2+1]*(sy+.5-q[1]);if(corrected>shadow.depth[sy*SZ+sx]+bias){visible=0;shadowed++;}}
    }
    samples[at]=g*2+visible+1;
  }
  return { version:1,model:SECTION_RIB.model,size,samples,groups,colors };
}

const planKeys=['version','model','size','samples','groups','colors'];
export function validateSectionRibField(plan) {
  if (plan?.model === 'conjure-section-ribs-v1') return validateConjureProxyField(plan, 'section-ribs');
  const G=BAKED_SECTION_RIB_META.groupCount;
  if(!equalKeys(plan,planKeys)||plan.version!==1||plan.model!==SECTION_RIB.model||!sizeOK(plan.size)||
    !(plan.samples instanceof Uint16Array)||plan.samples.length!==4*plan.size*plan.size||
    !(plan.groups instanceof Float64Array)||plan.groups.length!==G*5||!(plan.colors instanceof Float64Array)||plan.colors.length!==6)throw Error('Invalid section-rib field');
  const arrays=[plan.samples,plan.groups,plan.colors];
  if(arrays.some(a=>!(a.buffer instanceof ArrayBuffer)||a.byteOffset!==0||a.byteLength!==a.buffer.byteLength)||new Set(arrays.map(a=>a.buffer)).size!==3)throw Error('Invalid section-rib field buffer ownership');
  if(plan.samples.some(v=>v>G*2)||plan.groups.some((v,i)=>!Number.isFinite(v)||v<0||v>(i%5<3?1:1+1e-10))||plan.colors.some(v=>!Number.isFinite(v)||v<0||v>100))throw Error('Invalid section-rib field values');
  return plan;
}
export function sectionRibContrast(strength) {
  if(!Number.isFinite(strength)||strength<0||strength>1)throw Error('Invalid section-rib face contrast');
  // Explicit default preserves the accepted arithmetic and output bytes.
  return strength===.6?{ambient:.32,directScale:.68/4.5}:{ambient:Math.max(0,Math.min(1,.32+.8*(.6-strength))),directScale:(.68+.8*(strength-.6))/4.5};
}
export function renderSectionRib(plan,strength=.6) {
  if (plan?.model === 'conjure-section-ribs-v1') return renderConjureProxy(plan, strength);
  const {ambient,directScale}=sectionRibContrast(strength);validateSectionRibField(plan);
  const {size,samples,groups,colors}=plan,G=groups.length/5,N=size*2,lookup=new Uint8Array((G*2+1)*3);
  lookup.set(SECTION_RIB.background);
  for(let g=0;g<G;g++)for(let visible=0;visible<=1;visible++)for(let ch=0;ch<3;ch++){
    const key=directScale*colors[ch]*groups[g*5+3],fill=directScale*colors[ch+3]*groups[g*5+4];
    lookup[(g*2+visible+1)*3+ch]=srgb(groups[g*5+ch]*(ambient+key*visible+fill));
  }
  const out=new Uint8ClampedArray(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const s=y*2*N+x*2,a=samples[s]*3,b=samples[s+1]*3,c=samples[s+N]*3,d=samples[s+N+1]*3,o=(y*size+x)*4;
    for(let ch=0;ch<3;ch++)out[o+ch]=Math.round((lookup[a+ch]+lookup[b+ch]+lookup[c+ch]+lookup[d+ch])/4);out[o+3]=255;
  }
  return out;
}
export function prepareSectionRibFrame(frame) {
  if(frame.sectionRibPlan)return validateSectionRibField(frame.sectionRibPlan);
  if(typeof frame.prepare!=='function')throw Error('Section ribs need the frame preparation cache');
  return frame.prepare('section-rib',()=>{const snapshot=frame.geometrySnapshot?.();if(snapshot?.size!==frame.w)throw Error('Section ribs need the original scene geometry');return prepareSectionRib(snapshot,frame.sectionRibLighting,frame.materialColor);});
}
export function drawSectionRib(p,frame) {
  sectionRibContrast(frame.intensity);
  const rgba=renderSectionRib(prepareSectionRibFrame(frame),frame.intensity);
  p.loadPixels();if(p.pixels.length!==rgba.length)throw Error('Section ribs require pixel density 1');p.pixels.set(rgba);p.updatePixels();
}
