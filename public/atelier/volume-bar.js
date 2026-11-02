// Portable frozen volume-bar proxy. No graph generation, recorder, PBR or canvas.
import { decodeVolumeBarBake, VOLUME_BAR_BAKE_META } from './volume-bar-bake.js';
import { sourceGeometrySignature } from './volume-bar-signature.js';
import { matchesAcceptedSourceGeometry } from './accepted-source-reference.js';
import { rasterSectionRibDepth } from './volume-bar-depth.js';
import { prepareConjureProxy, validateConjureProxyField, renderConjureProxy } from './conjure-proxies.js';
export const VOLUME_BAR = Object.freeze({version:1,model:'volume-bar-v1',supersample:2,shadowSize:2048,background:Object.freeze([229,231,222])});
// Private to this module: callers cannot mutate the decoded accepted geometry.
let acceptedBake;
const getBake = () => acceptedBake ||= decodeVolumeBarBake();
const linear = x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4;
const srgb = x => Math.round(255 * Math.max(0, Math.min(1, x <= .0031308 ? 12.92 * x : 1.055 * x ** (1/2.4) - .055)));
const sizeOK = n => Number.isInteger(n) && n >= 1 && n <= 720;
const dot = (a,b) => a.reduce((sum,value,i) => sum + value * b[i], 0);
const norm = a => { const d = Math.hypot(...a); return a.map(v => v / d); };
const tf = (m,p) => [0,1,2].map(i => m[i]*p[0] + m[4+i]*p[1] + m[8+i]*p[2] + m[12+i]);
const finiteArray = (a,n) => (Array.isArray(a) || ArrayBuffer.isView(a)) && a.length === n && Array.from(a).every(Number.isFinite);
const equalKeys = (o, keys) => o && typeof o === 'object' && Object.keys(o).length === keys.length && keys.every(k => Object.hasOwn(o,k));

export function validateVolumeBarGeometry(snapshot) {
  if(!Array.isArray(snapshot?.meshes)||snapshot.meshes.length!==VOLUME_BAR_BAKE_META.sourceMeshLayout.length||snapshot.meshes.some((m,i)=>{
    const expected=VOLUME_BAR_BAKE_META.sourceMeshLayout[i];return !m||m.position?.length!==expected.positionLength||(m.index?.length||0)!==expected.indexLength||(m.index?.constructor.name||null)!==expected.indexType;
  }))throw Error('Volume-bar bake does not match this source mesh layout');
  if (sourceGeometrySignature(snapshot) !== VOLUME_BAR_BAKE_META.sourceGeometrySignature && !matchesAcceptedSourceGeometry(snapshot))
    throw Error('Volume-bar bake does not match this source geometry; regenerate and review the bake before using this scene');
  return snapshot;
}
function validateCamera(snapshot) {
  if (!sizeOK(snapshot?.size) || !finiteArray(snapshot.view,16) || !finiteArray(snapshot.projection,16)) throw Error('Invalid volume-bar camera');
  const V = snapshot.view, P = snapshot.projection;
  if (Array.from(V).some(v=>Math.abs(v)>1e9) || Array.from(P).some(v=>Math.abs(v)>1e9) || P[0]<1e-12 || P[5]<1e-12) throw Error('Volume-bar camera exceeds supported numeric range');
  // This raster is deliberately restricted to a rigid orthographic camera.
  if ([3,7,11].some(i => Math.abs(V[i]) > 1e-12 || Math.abs(P[i]) > 1e-12) || Math.abs(V[15]-1)>1e-12 || Math.abs(P[15]-1)>1e-12 || P[0] <= 0 || P[5] <= 0 || P[10] === 0 ||
      [1,2,4,6,8,9].some(i => P[i] !== 0)) throw Error('Volume bars require a rigid orthographic camera');
  for (let i=0;i<3;i++) for (let j=0;j<3;j++) {
    let d=0; for (let k=0;k<3;k++) d += V[i*4+k]*V[j*4+k];
    if (Math.abs(d-(i===j?1:0))>1e-10) throw Error('Volume-bar view matrix is not rigid');
  }
}
function copyLighting(lighting) {
  if (!equalKeys(lighting,['directional','shadowMatrix']) || !Array.isArray(lighting.directional) || lighting.directional.length !== 2 || !finiteArray(lighting.shadowMatrix,16)) throw Error('Invalid volume-bar lighting');
  const directional = lighting.directional.map(l => {
    if (!equalKeys(l,['direction','color']) || !finiteArray(l.direction,3) || !finiteArray(l.color,3) || Math.abs(Math.hypot(...l.direction)-1)>1e-10 || l.color.some(v=>v<0 || v>100)) throw Error('Invalid volume-bar directional light');
    return { direction: Array.from(l.direction), color: Array.from(l.color) };
  });
  const M=Array.from(lighting.shadowMatrix);
  if ([3,7,11].some(i=>Math.abs(M[i])>1e-12) || Math.abs(M[15]-1)>1e-12) throw Error('Invalid volume-bar shadow matrix');
  const axes=[0,1,2].map(i=>[M[i],M[i+4],M[i+8]]),lengths=axes.map(a=>Math.hypot(...a));
  if(lengths.some(v=>v<1e-12||v>1e6)||axes.some((a,i)=>axes.some((b,j)=>i!==j&&Math.abs(dot(a,b)/(lengths[i]*lengths[j]))>1e-10)))throw Error('Invalid volume-bar shadow basis');
  return { directional, shadowMatrix:M };
}
function projectVertices(vertices,project) {
  const out = new Float64Array(vertices.length);
  for(let i=0;i<vertices.length;i+=3) {
    const q=project([vertices[i],vertices[i+1],vertices[i+2]]);
    if(q.some(v=>!Number.isFinite(v)||Math.abs(v)>1e12))throw Error('Volume-bar projection exceeds supported numeric range');
    out.set(q,i);
  }
  return out;
}
function cull(geometry, direction) {
  const { triangles, groups, groupNormals, groupIds, sides } = geometry;
  const keep = [];
  for (let ti = 0; ti < triangles.length/3; ti++) {
    const g = groups[ti], d = dot(groupNormals.subarray(g*3, g*3+3), direction), side = sides[ti];
    if (side === 2 || (side === 0 ? d > 0 : d < 0)) {
      keep.push(ti);
    }
  }
  const filtered = new Uint32Array(keep.length*3);
  keep.forEach((ti, serial) => filtered.set(triangles.subarray(ti*3, ti*3+3), serial*3));
  // Strictly increasing mapping keeps the original tie-breaking order.
  return { triangles: filtered, originalTriangle: Uint16Array.from(keep) };
}

// Mutable inputs are validated/copied before preparation; only the compact field survives.
export function prepareVolumeBar(snapshot, lighting, materialColor) {
  if (snapshot?.source === 'conjure') return prepareConjureProxy(snapshot, lighting, materialColor, 'interior-lattice');
  validateVolumeBarGeometry(snapshot); validateCamera(snapshot);
  if(typeof materialColor !== 'function')throw Error('Volume bars require original object pigments');
  const light=copyLighting(lighting),V=Array.from(snapshot.view),P=Array.from(snapshot.projection),M=light.shadowMatrix,directional=light.directional;
  const geometry=getBake(),{vertices,triangles,groups:triangleGroups,groupNormals,groupIds,groupSides}=geometry;
  const T=triangles.length/3,G=groupIds.length,size=snapshot.size,N=size*2,SZ=2048,cameraDir=norm([V[2],V[6],V[10]]);
  const pigments = new Map();
  for (let id = 1; id <= 20; id++) {
    const p = materialColor(id);
    if(!finiteArray(p,3)||Array.from(p).some(v=>v<0||v>255))throw Error('Invalid volume-bar object pigment');
    pigments.set(id, Array.from(p, v => linear(v/255)));
  }
  const cameraProject = p => { const v = tf(V, p), q = tf(P, v); return [(q[0]+1)*N/2, (1-q[1])*N/2, -v[2]]; };
  const shadowProject = p => { const q = tf(M, p); return [q[0]*SZ, q[1]*SZ, q[2]]; };
  const cameraStream = cull(geometry, cameraDir);
  const shadowStream = cull(geometry, directional[0].direction);
  const projectedShadow = projectVertices(vertices, shadowProject);
  const shadow = rasterSectionRibDepth(shadowStream.triangles, projectedShadow, SZ, 1e-13, false);
  const projectedView = projectVertices(vertices, cameraProject);
  const view = rasterSectionRibDepth(cameraStream.triangles, projectedView, N, 1e-9);
  // Map the filtered serial on lookup; no second camera-owner buffer is retained.
  const groups = new Float64Array(G*5);
  const colors = Float64Array.from(directional.flatMap(l => l.color));
  for (let g = 0; g < G; g++) {
    let n = Array.from(groupNormals.subarray(g*3, g*3+3));
    if (groupSides[g] === 1 || (groupSides[g] === 2 && dot(n, cameraDir) < 0)) n = n.map(v => -v);
    groups.set(pigments.get(groupIds[g]), g*5);
    groups[g*5+3] = Math.max(0, dot(n, directional[0].direction));
    groups[g*5+4] = Math.max(0, dot(n, directional[1].direction));
  }
  const slopes = new Float64Array(T*2);
  for (let ti = 0; ti < T; ti++) {
    const ia = triangles[ti*3]*3, ib = triangles[ti*3+1]*3, ic = triangles[ti*3+2]*3;
    const a = projectedShadow.subarray(ia, ia+3), b = projectedShadow.subarray(ib, ib+3), c = projectedShadow.subarray(ic, ic+3);
    const den = (b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]);
    slopes[ti*2] = Math.abs(den)>1e-16 ? ((b[2]-a[2])*(c[1]-a[1])-(c[2]-a[2])*(b[1]-a[1]))/den : 0;
    slopes[ti*2+1] = Math.abs(den)>1e-16 ? ((b[0]-a[0])*(c[2]-a[2])-(c[0]-a[0])*(b[2]-a[2]))/den : 0;
  }
  const samples = new Uint16Array(N*N), bias = .002*Math.hypot(M[2], M[6], M[10]);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const at = y*N+x, serial = view.owner[at]; if (serial === 65535) continue;
    const ti = cameraStream.originalTriangle[serial];
    const g = triangleGroups[ti], d = groups[g*5+3], id = groupIds[g]; let visible = 1;
    if (directional[0].color.some(c => (.68/4.5)*c*d > 1e-10)) {
      const camera = [((x+.5)/N*2-1-P[12])/P[0], (1-(y+.5)/N*2-P[13])/P[5], -view.depth[at]];
      const rel = camera.map((v, j) => v-V[12+j]);
      const world = [0, 1, 2].map(j => V[j*4]*rel[0]+V[j*4+1]*rel[1]+V[j*4+2]*rel[2]);
      const q = shadowProject(world), sx = Math.floor(q[0]), sy = Math.floor(q[1]);
      if (sx >= 0 && sy >= 0 && sx < SZ && sy < SZ) {
        const corrected = q[2]+slopes[ti*2]*(sx+.5-q[0])+slopes[ti*2+1]*(sy+.5-q[1]);
        if (corrected > shadow.depth[sy*SZ+sx]+bias) { visible = 0; }
      }
    }
    samples[at] = g*2+visible+1;
  }
  return {version:1,model:VOLUME_BAR.model,size,samples,groups,colors};
}

const planKeys=['version','model','size','samples','groups','colors'];
export function validateVolumeBarField(plan) {
  if (plan?.model === 'conjure-interior-lattice-v1') return validateConjureProxyField(plan, 'interior-lattice');
  const G=VOLUME_BAR_BAKE_META.groupCount;
  if(!equalKeys(plan,planKeys)||plan.version!==1||plan.model!==VOLUME_BAR.model||!sizeOK(plan.size)||
    !(plan.samples instanceof Uint16Array)||plan.samples.length!==4*plan.size*plan.size||
    !(plan.groups instanceof Float64Array)||plan.groups.length!==G*5||!(plan.colors instanceof Float64Array)||plan.colors.length!==6)throw Error('Invalid volume-bar field');
  const arrays=[plan.samples,plan.groups,plan.colors];
  if(arrays.some(a=>!(a.buffer instanceof ArrayBuffer)||a.byteOffset!==0||a.byteLength!==a.buffer.byteLength)||new Set(arrays.map(a=>a.buffer)).size!==3)throw Error('Invalid volume-bar field buffer ownership');
  if(plan.samples.some(v=>v>G*2)||plan.groups.some((v,i)=>!Number.isFinite(v)||v<0||v>(i%5<3?1:1+1e-10))||plan.colors.some(v=>!Number.isFinite(v)||v<0||v>100))throw Error('Invalid volume-bar field values');
  return plan;
}
export function renderVolumeBar(plan) {
  if (plan?.model === 'conjure-interior-lattice-v1') return renderConjureProxy(plan);
  const ambient=.32,directScale=.68/4.5;validateVolumeBarField(plan);
  const {size,samples,groups,colors}=plan,G=groups.length/5,N=size*2,lookup=new Uint8Array((G*2+1)*3);
  lookup.set(VOLUME_BAR.background);
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
export function prepareVolumeBarFrame(frame) {
  if(frame.volumeBarPlan)return validateVolumeBarField(frame.volumeBarPlan);
  if(typeof frame.prepare!=='function')throw Error('Volume bars need the frame preparation cache');
  return frame.prepare('volume-bar',()=>{const snapshot=frame.geometrySnapshot?.();if(snapshot?.size!==frame.w)throw Error('Volume bars need the original scene geometry');return prepareVolumeBar(snapshot,frame.sectionRibLighting,frame.materialColor);});
}
export function drawVolumeBar(p,frame) {
  const rgba=renderVolumeBar(prepareVolumeBarFrame(frame));
  p.loadPixels();if(p.pixels.length!==rgba.length)throw Error('Volume bars require pixel density 1');p.pixels.set(rgba);p.updatePixels();
}
