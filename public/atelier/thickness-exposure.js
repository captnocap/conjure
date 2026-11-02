import { prepareConjureThickness } from './thickness-conjure.js';
// Frozen geometric thickness exposure; dependency-free worker core.
// Four fixed subpixels; separate closed/sheet sums; transmission-average film.
// Caller owns cancellation via Worker.terminate and immutable capture association.
export const THICKNESS_MODEL = Object.freeze({
  version: 1, subpixelGrid: 2, closedCoefficient: 1,
  sheetCoefficient: 0.025, sheetCosineFloor: 0.1, exposure: 1.2,
  floorID: 1,
  closedIDs: Object.freeze([2,3,4,5,6,8,9,10,13,15,17,19,20]),
  sheetIDs: Object.freeze([7,11,12,14,16,18]),
  eventRules: Object.freeze({projectedBarycentricTolerance: 1e-10,
    coincidentDepthWorldTolerance: 1e-8, parallelCosineTolerance: 1e-12}),
});
export const THICKNESS_LIMITS = Object.freeze({
  maxSize: 720, maxMeshes: 20, maxVertices: 24000, maxTriangles: 24000,
  bandRows: 32, eventCapacity: 131072,
  maxRetainedBytes: 16588800, maxScratchTypedBytes: 4297728,
});
const MODEL = THICKNESS_MODEL;
function check(value, message = 'Unsupported thickness geometry') {
  if (!value) throw Error(message);
}
function equal(a, b, message) { check(a === b, message); }
function finiteArray(value, length) {
  return value && typeof value.length === 'number' && value.length === length &&
    Array.from(value).every(Number.isFinite);
}
function validateSnapshot(snapshot) {
  check(snapshot?.version === 1, 'Unsupported geometry snapshot version');
  validateSize(snapshot.size);
  const v = snapshot.view, p = snapshot.projection;
  check(finiteArray(v,16) && finiteArray(p,16), 'Invalid camera matrices');
  check(v[3] === 0 && v[7] === 0 && v[11] === 0 && Math.abs(v[15] - 1) <= 1e-12, 'Rigid affine camera required');
  const axes = [[v[0],v[4],v[8]], [v[1],v[5],v[9]], [v[2],v[6],v[10]]];
  for (let i=0;i<3;i++) {
    check(Math.abs(dot(axes[i],axes[i])-1) < 1e-10, 'Unit camera basis required');
    for (let j=i+1;j<3;j++) check(Math.abs(dot(axes[i],axes[j])) < 1e-10, 'Orthogonal camera basis required');
  }
  check(Math.abs(dot(cross(axes[0],axes[1]),axes[2])-1) < 1e-10, 'Right-handed camera required');
  check([1,2,3,4,6,7,8,9,11].every(i=>p[i]===0) && p[15]===1 && p[0]>0 && p[5]>0 && p[10]<0,
    'Standard orthographic projection required');
  const near=(p[14]+1)/p[10], far=(p[14]-1)/p[10];
  check(Number.isFinite(near) && Number.isFinite(far) && near>=0 && far>near, 'Invalid orthographic clipping planes');
  check(Array.isArray(snapshot.meshes) && snapshot.meshes.length <= THICKNESS_LIMITS.maxMeshes, 'Thickness mesh budget exceeded');
  let vertices=0, triangles=0;
  const usedIDs = new Set();
  for (let j=0;j<snapshot.meshes.length;j++) {
    const m=snapshot.meshes[j], id=m?.id ?? j+1;
    check(Number.isInteger(id) && id>=1 && id<=20 && !usedIDs.has(id), 'Invalid or duplicate geometry identity');
    usedIDs.add(id);
    check((m.position instanceof Float32Array || m.position instanceof Float64Array) && m.position.length%3===0, 'Invalid vertex buffer');
    const count=m.position.length/3; vertices+=count;
    check(vertices<=THICKNESS_LIMITS.maxVertices, 'Thickness vertex budget exceeded');
    check(m.position.every(Number.isFinite), 'Non-finite geometry vertex');
    check(finiteArray(m.matrix,16) && m.matrix[3]===0 && m.matrix[7]===0 && m.matrix[11]===0 && m.matrix[15]===1, 'Affine mesh transform required');
    check(m.drawRange?.start===0 && m.drawRange?.count===Infinity, 'Complete geometry draw range required');
    check(m.index===null || m.index===undefined || m.index instanceof Uint16Array || m.index instanceof Uint32Array || m.index instanceof Uint8Array, 'Invalid index buffer');
    const entries=m.index?.length ?? count;
    check(entries%3===0, 'Incomplete geometry triangle');
    triangles+=entries/3;
    check(triangles<=THICKNESS_LIMITS.maxTriangles, 'Thickness triangle budget exceeded');
    if (m.index) check(m.index.every(i=>i<count), 'Geometry index out of range');
  }
  return {near,far,vertices,triangles};
}
function validateSize(size) {
  check(Number.isInteger(size) && size>0 && size<=THICKNESS_LIMITS.maxSize, 'Thickness size must be an integer from 1 to 720');
}
export function validateThicknessTotal(total,size) {
  validateSize(size);
  check(total instanceof Float64Array && total.length===size*size*4, 'Invalid thickness field shape');
  for (let i=0;i<total.length;i++) check(Number.isFinite(total[i]) && total[i]>=0, 'Non-finite or negative thickness field');
  return total;
}

// Matrix inverse evaluation order follows the pinned Three Matrix4 arithmetic.
// General arithmetic is retained to preserve the frozen camera's last bits.
function invertMatrix(source) {
  const t=Array.from(source),e=t[0],s=t[1],i=t[2],r=t[3],n=t[4],a=t[5],o=t[6],h=t[7],l=t[8],c=t[9],u=t[10],d=t[11],p=t[12],m=t[13],y=t[14],g=t[15],f=c*y*h-m*u*h+m*o*d-a*y*d-c*o*g+a*u*g,x=p*u*h-l*y*h-p*o*d+n*y*d+l*o*g-n*u*g,b=l*m*h-p*c*h+p*a*d-n*m*d-l*a*g+n*c*g,v=p*c*o-l*m*o-p*a*u+n*m*u+l*a*y-n*c*y,w=e*f+s*x+i*b+r*v;
  check(w!==0 && Number.isFinite(w), 'Singular camera matrix');
  const M=1/w;
  t[0]=f*M;t[1]=(m*u*r-c*y*r-m*i*d+s*y*d+c*i*g-s*u*g)*M;t[2]=(a*y*r-m*o*r+m*i*h-s*y*h-a*i*g+s*o*g)*M;t[3]=(c*o*r-a*u*r-c*i*h+s*u*h+a*i*d-s*o*d)*M;t[4]=x*M;t[5]=(l*y*r-p*u*r+p*i*d-e*y*d-l*i*g+e*u*g)*M;t[6]=(p*o*r-n*y*r-p*i*h+e*y*h+n*i*g-e*o*g)*M;t[7]=(n*u*r-l*o*r+l*i*h-e*u*h-n*i*d+e*o*d)*M;t[8]=b*M;t[9]=(p*c*r-l*m*r-p*s*d+e*m*d+l*s*g-e*c*g)*M;t[10]=(n*m*r-p*a*r+p*s*h-e*m*h-n*s*g+e*a*g)*M;t[11]=(l*a*r-n*c*r-l*s*h+e*c*h+n*s*d-e*a*d)*M;t[12]=v*M;t[13]=(l*m*i-p*c*i+p*s*u-e*m*u-l*s*y+e*c*y)*M;t[14]=(p*a*i-n*m*i-p*s*o+e*m*o+n*s*y-e*a*y)*M;t[15]=(n*c*i-l*a*i+l*s*o-e*c*o-n*s*u+e*a*u)*M;
  return t;
}
function multiplyMatrices(a,b) {
  const out=new Array(16);
  for (let col=0;col<4;col++) for (let row=0;row<4;row++) {
    const c=col*4;
    out[c+row]=a[row]*b[c]+a[4+row]*b[c+1]+a[8+row]*b[c+2]+a[12+row]*b[c+3];
  }
  return out;
}

const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length=a=>Math.hypot(...a);
const unit=a=>a.map(v=>v/length(a));
function transform(m,p){const w=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15];return [0,1,2].map(i=>(m[i]*p[0]+m[4+i]*p[1]+m[8+i]*p[2]+m[12+i])/w);}
function getGeometry(snapshot,worldFromClip){
 const {size,view,projection}=snapshot,side=size*2;
 equal(projection[3],0);equal(projection[7],0);equal(projection[11],0);equal(projection[15],1,'Proof supports captured orthographic projection only');
 const near=transform(worldFromClip,[0,0,-1]),far=transform(worldFromClip,[0,0,1]);
 const D=unit(sub(far,near));check(Math.abs(dot(D,[-view[2],-view[6],-view[10]])-1)<1e-12);
 const meshes=snapshot.meshes.map((m,j)=>{
  const positions=[];
  for(let i=0;i<m.position.length;i+=3)positions.push(transform(m.matrix,Array.from(m.position.slice(i,i+3))));
  const projected=positions.map(p=>{const v=transform(view,p),n=transform(projection,v);return [(n[0]+1)*side/2,(1-n[1])*side/2,-v[2]];});
  const triangles=[];const idx=m.index;const count=idx?.length??positions.length;
  equal(m.drawRange.start,0);equal(m.drawRange.count,Infinity);
  for(let k=0;k<count;k+=3){const ids=[0,1,2].map(i=>idx?idx[k+i]:k+i),world=ids.map(i=>positions[i]),screen=ids.map(i=>projected[i]);const normal=unit(cross(sub(world[1],world[0]),sub(world[2],world[0])));check(normal.every(Number.isFinite),'Degenerate original triangle');
   triangles.push({face:k/3,ids,world,screen,normal,cos:dot(normal,D)});
  }
  return {id:m.id ?? j+1,positions,projected,triangles};
 });return {side,D,near,far,meshes,worldFromClip,view,projection,size};
}
function sampleOrigin(geometry,x,y){return transform(geometry.worldFromClip,[2*x/geometry.side-1,1-2*y/geometry.side,-1]);}
function collapseEvents(events,sheet=false){
 events.sort((a,b)=>a.t-b.t||a.face-b.face);const result=[];let duplicate=0,tangent=0;
 for(let i=0;i<events.length;){let j=i+1;while(j<events.length&&Math.abs(events[j].t-events[i].t)<=MODEL.eventRules.coincidentDepthWorldTolerance)j++;
  const group=events.slice(i,j),pos=group.filter(e=>e.cos>0),neg=group.filter(e=>e.cos<0);duplicate+=group.length-1;
  if(!sheet&&pos.length&&neg.length){tangent++;}
  else {group.sort((a,b)=>a.face-b.face);result.push(group[0]);}i=j;
 }return {events:result,duplicate,tangent};
}
function integrateEvents(events,sheet=false){
 const c=collapseEvents(events,sheet);let tau=0,intervals=[];
 if(sheet){for(const e of c.events)tau+=MODEL.sheetCoefficient/Math.max(Math.abs(e.cos),MODEL.sheetCosineFloor);}
 else{equal(c.events.length%2,0,'Unbalanced closed ray');for(let j=0;j<c.events.length;j+=2){const a=c.events[j],b=c.events[j+1];check(a.cos<0&&b.cos>0,'Nonalternating closed ray');check(b.t>=a.t,'Negative interval');intervals.push([a.t,b.t]);tau+=b.t-a.t;}}
 check(Number.isFinite(tau)&&tau>=0);return {tau,intervals,...c};
}

function solveBanded(geometry, { bandRows = 32, eventCapacity = 131072, onMeshBand, onBand } = {}) {
  check(Number.isInteger(bandRows) && bandRows > 0 && bandRows % 2 === 0);
  check(Number.isInteger(eventCapacity) && eventCapacity > 0);
  const n = geometry.side, bandSamples = n * bandRows;
  const total = new Float64Array(n * n);
  const closed = new Float64Array(bandSamples), sheet = new Float64Array(bandSamples);
  const coverage = new Uint8Array(bandSamples), heads = new Int32Array(bandSamples);
  const touched = new Int32Array(bandSamples);
  const ts = new Float64Array(eventCapacity), cosines = new Float64Array(eventCapacity);
  const faces = new Int32Array(eventCapacity), next = new Int32Array(eventCapacity);
  const diagnosticTau = onMeshBand ? new Float64Array(bandSamples) : null;
  const activeMeshes = geometry.meshes.filter(mesh => mesh.id !== 1);
  const stats = activeMeshes.map(mesh => ({
    id: mesh.id, triangles: mesh.triangles.length, rawEvents: 0, touchedSamples: 0,
    collapsedDuplicateEvents: 0, tangentGroups: 0, maximumEvents: 0,
    maximumRawSampleEvents: 0, maximumIntervals: 0, multiIntervalSamples: 0, maxTau: 0,
  }));
  let maximumBandEvents = 0, multipleContributorSamples = 0, exposedSamples = 0;
  let closedMax = 0, sheetMax = 0;
  const began = performance.now();
  for (let bandY = 0; bandY < n; bandY += bandRows) {
    const stopY = Math.min(n, bandY + bandRows), count = n * (stopY - bandY);
    closed.fill(0); sheet.fill(0); coverage.fill(0);
    for (let m = 0; m < activeMeshes.length; m++) {
      const mesh = activeMeshes[m], summary = stats[m];
      const isSheet = MODEL.sheetIDs.includes(mesh.id), target = isSheet ? sheet : closed;
      check(isSheet || MODEL.closedIDs.includes(mesh.id));
      heads.fill(-1); diagnosticTau?.fill(0);
      let used = 0, touchedCount = 0;
      for (const tri of mesh.triangles) {
        const [a, b, c] = tri.screen;
        const den = (b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
        if (den === 0 || Math.abs(tri.cos) < MODEL.eventRules.parallelCosineTolerance) continue;
        const x0 = Math.max(0, Math.ceil(Math.min(a[0],b[0],c[0])-.5));
        const x1 = Math.min(n-1, Math.floor(Math.max(a[0],b[0],c[0])-.5));
        const y0 = Math.max(bandY, Math.ceil(Math.min(a[1],b[1],c[1])-.5));
        const y1 = Math.min(stopY-1, Math.floor(Math.max(a[1],b[1],c[1])-.5));
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const u = ((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/den;
          const v = ((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/den, w = 1-u-v;
          if (Math.min(u,v,w) < -MODEL.eventRules.projectedBarycentricTolerance) continue;
          if (used === eventCapacity) throw Error(`Event budget exceeded: mesh ${mesh.id}, rows ${bandY}:${stopY}`);
          const i = (y-bandY)*n+x;
          if (heads[i] === -1) touched[touchedCount++] = i;
          ts[used] = u*a[2]+v*b[2]+w*c[2]; cosines[used] = tri.cos;
          faces[used] = tri.face; next[used] = heads[i]; heads[i] = used++;
        }
      }
      maximumBandEvents = Math.max(maximumBandEvents, used);
      summary.rawEvents += used; summary.touchedSamples += touchedCount;
      for (let k = 0; k < touchedCount; k++) {
        const i = touched[k], events = [];
        for (let j = heads[i]; j !== -1; j = next[j]) events.push({ t: ts[j], cos: cosines[j], face: faces[j] });
        summary.maximumRawSampleEvents = Math.max(summary.maximumRawSampleEvents, events.length);
        const r = integrateEvents(events, isSheet);
        target[i] += r.tau;
        if (diagnosticTau) diagnosticTau[i] = r.tau;
        if (r.tau > 0) coverage[i]++;
        summary.maxTau = Math.max(summary.maxTau, r.tau);
        summary.collapsedDuplicateEvents += r.duplicate; summary.tangentGroups += r.tangent;
        summary.maximumEvents = Math.max(summary.maximumEvents, r.events.length);
        summary.maximumIntervals = Math.max(summary.maximumIntervals, r.intervals.length);
        if (r.intervals.length > 1) summary.multiIntervalSamples++;
      }
      if (onMeshBand) onMeshBand(mesh.id, bandY, count, diagnosticTau);
    }
    for (let i = 0; i < count; i++) {
      total[bandY*n+i] = closed[i] + sheet[i];
      closedMax = Math.max(closedMax, closed[i]); sheetMax = Math.max(sheetMax, sheet[i]);
      if (coverage[i] > 1) multipleContributorSamples++;
      if (total[bandY*n+i] > 0) exposedSamples++;
    }
    if (onBand) onBand(bandY, count, closed, sheet);
  }
  return {
    total, stats,
    fields: { closedMax, sheetMax, multipleContributorSamples, exposedSamples },
    elapsedMs: performance.now() - began,
    memory: {
      retainedBytes: total.byteLength,
      scratchTypedBytes: closed.byteLength + sheet.byteLength + coverage.byteLength + heads.byteLength + touched.byteLength + ts.byteLength + cosines.byteLength + faces.byteLength + next.byteLength,
      diagnosticScratchBytes: diagnosticTau?.byteLength ?? 0,
      bandRows, eventCapacity, maximumBandEvents,
      note: 'Excludes transformed geometry objects, source capture, per-sample event objects, validation hooks and JS/runtime overhead. No per-mesh full-resolution arrays retained.',
    },
  };
}


export function filmThickness(total, size, exposure = MODEL.exposure) {
  validateSize(size);
  check(Number.isFinite(exposure) && exposure >= 0, "Invalid thickness exposure");
  if (total === null && exposure === 0) {
    const black = new Uint8ClampedArray(size*size*4);
    for (let i=3;i<black.length;i+=4) black[i]=255;
    return black;
  }
  validateThicknessTotal(total, size);
  const n = size * 2, out = new Uint8ClampedArray(size*size*4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let transmission = 0;
    for (const [dx,dy] of [[0,0],[1,0],[0,1],[1,1]]) transmission += Math.exp(-exposure*total[(2*y+dy)*n+2*x+dx]);
    const v = 255*(1-transmission/4), j = (y*size+x)*4;
    out[j] = out[j+1] = out[j+2] = v; out[j+3] = 255;
  }
  return out;
}

export function prepareThickness(snapshot) {
  if (snapshot?.source === 'conjure') return prepareConjureThickness(snapshot);
  const sourceStats=validateSnapshot(snapshot);
  const worldFromClip=multiplyMatrices(invertMatrix(snapshot.view),invertMatrix(snapshot.projection));
  const geometry=getGeometry(snapshot,worldFromClip);
  for (const mesh of geometry.meshes) if (mesh.id!==1) for (const p of mesh.projected)
    check(p.every(Number.isFinite) && p[2]>sourceStats.near && p[2]<sourceStats.far, 'Whole thickness body must lie inside camera clipping planes');
  const result=solveBanded(geometry, {bandRows:THICKNESS_LIMITS.bandRows,eventCapacity:THICKNESS_LIMITS.eventCapacity});
  validateThicknessTotal(result.total,snapshot.size);
  return {size:snapshot.size,total:result.total,stats:result.stats,fields:result.fields,memory:result.memory,sourceStats};
}
