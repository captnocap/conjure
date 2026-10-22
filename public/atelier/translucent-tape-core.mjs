/* Finite translucent tape, authored after Mark Khaisman; cut reserves also
 * informed by Max Zorn. Display-RGB transmission is an artistic approximation.
 * Input color controls placement and reserves only, never deposited opacity. */
import {insidePolygon, polygonBounds, rasterizeConvex} from './tape-coverage.mjs';
export const TAPE_SETTINGS=Object.freeze({
  stock:Object.freeze([.83,.76,.59]),backing:Object.freeze([250,247,230]),
  nominalWidth:27,maxSize:720,maxPieces:480,maxDepth:8,
  maxProposals:2880,maxCorrectionProposals:720,maxCoarseVisits:12000000,
  maxFineVisits:40000000,maxRetainedSamples:2500000,
  maxGeometryTriangles:1024,maxGeometryPlaneTests:262144,maxPreprocessVisits:100000000,
  maxEstimatedWorkingBytes:192*1024*1024,
  schedule:Object.freeze([
    Object.freeze({centers:360,lengths:Object.freeze([128,94]),angleBase:0}),
    Object.freeze({centers:360,lengths:Object.freeze([112,78]),angleBase:90}),
    Object.freeze({centers:360,lengths:Object.freeze([88,62]),angleBase:28}),
    Object.freeze({centers:360,lengths:Object.freeze([70,48]),angleBase:-28})]),
});
const P=TAPE_SETTINGS;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const norm=v=>{const n=Math.hypot(...v);return n?v.map(x=>x/n):[0,0,0];};
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const stair=id=>id>=4&&id<=6;
const random=seed=>{let state=seed;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};};
function requireArray(v,length,name){if(!v||v.length!==length)throw new TypeError(name+' length must be '+length);}
function validateSource(source){
  if(!source||!Number.isInteger(source.size)||source.size<1||source.size>P.maxSize)throw new RangeError('size must be an integer from 1 to 720');
  if(!Number.isInteger(source.seed)||source.seed<0||source.seed>0xffffffff)throw new RangeError('seed must be an unsigned 32-bit integer');
  const n=source.size**2;requireArray(source.owners,n,'owners');requireArray(source.color,n*4,'color');
  for(let i=0;i<n;i++){if(!Number.isInteger(source.owners[i])||source.owners[i]<0||source.owners[i]>255)throw new TypeError('owners must contain byte IDs');for(let c=0;c<4;c++){const v=source.color[i*4+c];if(!Number.isFinite(v)||v<0||v>255)throw new TypeError('color must contain finite byte-range values');}}
  if(source.normal){requireArray(source.normal,n*4,'normal');for(const v of source.normal)if(!Number.isFinite(v)||v<0||v>255)throw new TypeError('normal must contain finite byte-range values');}
  if(source.positions){requireArray(source.positions,n*3,'positions');for(const v of source.positions)if(!Number.isFinite(v))throw new TypeError('positions must be finite');}
  if(source.worldFromClip&& (source.worldFromClip.length!==16||!Array.from(source.worldFromClip).every(Number.isFinite)))throw new TypeError('worldFromClip must be a finite 4×4 matrix');
}
function visit(stats,key,count,limit){if(count<0||stats[key]+count>limit)throw new RangeError('Tape work budget exceeded: '+key);stats[key]+=count;}
function connected(mask,w,stats){
  const seen=new Uint8Array(mask.length),queue=new Int32Array(mask.length),result=[];
  if(stats)visit(stats,'preprocessVisits',mask.length,P.maxPreprocessVisits);
  for(let i=0;i<mask.length;i++)if(mask[i]&&!seen[i]){
    let h=0,t=1;queue[0]=i;seen[i]=1;const pixels=[];
    while(h<t){const k=queue[h++],x=k%w;pixels.push(k);
      for(const j of [x?k-1:-1,x<w-1?k+1:-1,k>=w?k-w:-1,k+w<mask.length?k+w:-1])if(j>=0&&mask[j]&&!seen[j]){seen[j]=1;queue[t++]=j;}}
    if(stats)visit(stats,'preprocessVisits',pixels.length*5,P.maxPreprocessVisits);
    result.push(pixels);
  }
  return result;
}
// Exact separable squared Euclidean distance transform, as used by the proof.
function edtLine(source,dest,n,v,z){let k=0;v[0]=0;z[0]=-Infinity;z[1]=Infinity;
  for(let q=1;q<n;q++){let s;do{const p=v[k];s=(source[q]+q*q-source[p]-p*p)/(2*(q-p));if(s<=z[k])k--;else break;}while(k>=0);
    if(k<0){k=0;v[0]=q;z[0]=-Infinity;z[1]=Infinity;}else{k++;v[k]=q;z[k]=s;z[k+1]=Infinity;}}
  k=0;for(let q=0;q<n;q++){while(z[k+1]<q)k++;dest[q]=(q-v[k])**2+source[v[k]];}}
function boundaryDistance(labels,w){
  const n=w*w,a=new Float32Array(n),b=new Float32Array(n),src=new Float64Array(w),dest=new Float64Array(w),v=new Int32Array(w),z=new Float64Array(w+1);
  for(let y=0;y<w;y++)for(let x=0;x<w;x++){const i=y*w+x,id=labels[i];a[i]=!x||!y||x===w-1||y===w-1||labels[i-1]!==id||labels[i+1]!==id||labels[i-w]!==id||labels[i+w]!==id?0:1e12;}
  for(let y=0;y<w;y++){for(let x=0;x<w;x++)src[x]=a[y*w+x];edtLine(src,dest,w,v,z);for(let x=0;x<w;x++)b[y*w+x]=dest[x];}
  for(let x=0;x<w;x++){for(let y=0;y<w;y++)src[y]=b[y*w+x];edtLine(src,dest,w,v,z);for(let y=0;y<w;y++)a[y*w+x]=Math.sqrt(dest[y])+.5;}
  return a;
}
function hull(points){points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cross2=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);const half=ps=>{const h=[];for(const p of ps){while(h.length>1&&cross2(h.at(-2),h.at(-1),p)<=0)h.pop();h.push(p);}return h;};const a=half(points),b=half([...points].reverse());return [...a.slice(0,-1),...b.slice(0,-1)];}
function coherentReserve(owner,lum,N,scale,stats){
  visit(stats,'preprocessVisits',N*N*4,P.maxPreprocessVisits);
  const distance=boundaryDistance(owner,N),bright=new Uint8Array(N*N);
  for(let i=0;i<bright.length;i++)bright[i]=owner[i]===7&&lum[i]>244&&distance[i]>=13.5*scale?1:0;
  const groups=connected(bright,N,stats).sort((a,b)=>b.length-a.length),component=groups[0]||[];
  // A pixel component is converted to a single convex clear cut. Empty evidence
  // produces no invented reserve in small fixtures or changed material captures.
  // Row extrema have exactly the same convex hull as all four pixel corners,
  // while keeping hull input below 4*size points even for a full-frame reserve.
  const left=new Int32Array(N).fill(N),right=new Int32Array(N).fill(-1);
  for(const i of component){const x=i%N,y=Math.floor(i/N);left[y]=Math.min(left[y],x);right[y]=Math.max(right[y],x);}
  const points=[];for(let y=0;y<N;y++)if(right[y]>=0)points.push([left[y],y],[left[y],y+1],[right[y]+1,y],[right[y]+1,y+1]);
  const polygon=points.length?hull(points):[];
  const mask=new Uint8Array(N*N);let count=0;
  for(let i=0;i<mask.length;i++)if(owner[i]===7&&insidePolygon(i%N+.5,Math.floor(i/N)+.5,polygon)){mask[i]=1;count++;}
  return {mask,polygon,count,sourceComponent:component.length};
}
function materialsMatch(source,a,b){
  const ka=source.materialKeys?.[a],kb=source.materialKeys?.[b],ca=source.baseColors?.[a],cb=source.baseColors?.[b];
  return typeof ka==='string'&&ka===kb&&ca?.length===3&&cb?.length===3&&ca.every((v,i)=>Number.isFinite(v)&&v===cb[i]);
}
export function buildTapeDomains(source,stats=null){
  validateSource(source);if(stats)visit(stats,'preprocessVisits',source.size**2*13,P.maxPreprocessVisits);
  const N=source.size,n=N*N,labels=new Uint32Array(n),report={sharedPlanes:[],domains:[],domainCount:0,domainsTruncated:0,planeSamples:0,maxPlaneResidual:0,minNormalDot:1};
  const meshes=source.geometry?.meshes,matrix=source.worldFromClip;
  if(!meshes||!matrix||!source.normal||!source.positions)return {labels,report};
  const planes=[];let triangles=0,planeTests=0;
  for(const id of [4,5,6]){
    const m=meshes[id-1];if(!m)continue;const v=m.position,ix=m.index,a=m.matrix;
    if(!v||v.length%3||!a||a.length!==16||!Array.from(a).every(Number.isFinite))throw new TypeError('Malformed stair geometry');
    const count=ix!=null?ix.length:v.length/3;if(count%3)throw new TypeError('Incomplete geometry triangle');
    const start=m.drawRange?.start??0,drawCount=m.drawRange?.count??Infinity;
    if(!Number.isInteger(start)||start<0||start>count||(drawCount!==Infinity&&(!Number.isInteger(drawCount)||drawCount<0)))throw new TypeError('Invalid geometry draw range');
    const end=Math.min(count,start+drawCount);triangles+=Math.floor((end-start)/3);
    if(triangles>P.maxGeometryTriangles)throw new RangeError('Tape geometry triangle budget exceeded');
    const world=k=>{if(!Number.isInteger(k)||k<0||k*3+2>=v.length)throw new TypeError('Invalid geometry index');const x=v[k*3],y=v[k*3+1],z=v[k*3+2];if(![x,y,z].every(Number.isFinite))throw new TypeError('Non-finite geometry vertex');return [a[0]*x+a[4]*y+a[8]*z+a[12],a[1]*x+a[5]*y+a[9]*z+a[13],a[2]*x+a[6]*y+a[10]*z+a[14]];};
    for(let t=start;t+2<end;t+=3){const a=world(ix?ix[t]:t),b=world(ix?ix[t+1]:t+1),c=world(ix?ix[t+2]:t+2),normal=norm(cross(sub(b,a),sub(c,a)));if(!normal.some(Boolean))continue;const offset=dot(normal,a);
      let p=planes.find(p=>{if(++planeTests>P.maxGeometryPlaneTests)throw new RangeError('Tape geometry plane-test budget exceeded');return dot(p.normal,normal)>1-1e-10&&Math.abs(p.offset-offset)<1e-6&&p.owners.every(other=>materialsMatch(source,id,other));});
      if(!p){p={normal,offset,owners:[]};planes.push(p);}if(!p.owners.includes(id))p.owners.push(id);
    }
  }
  // Only the fixed three box subjects are candidates; missing geometry/material
  // evidence conservatively keeps owner boundaries. Captured pixels alone never
  // declare two subjects coplanar.
  const shared=planes.filter(p=>p.owners.length>1),right=norm(Array.from(matrix).slice(0,3)),up=norm(Array.from(matrix).slice(4,7)),forward=norm(Array.from(matrix).slice(8,11)).map(x=>-x);
  if(shared.length>64)throw new RangeError('Too many shared stair planes');
  for(const p of shared)p.viewNormal=[dot(p.normal,right),dot(p.normal,up),dot(p.normal,forward)];report.sharedPlanes=shared;
  const pixelPlane=new Int16Array(n).fill(-1);
  if(stats){visit(stats,'preprocessVisits',n*(shared.length+2),P.maxPreprocessVisits);stats.geometryTriangles=triangles;stats.geometryPlaneTests=planeTests;}
  for(let i=0;i<n;i++)if(stair(source.owners[i])){
    const position=[source.positions[i*3],source.positions[i*3+1],source.positions[i*3+2]];
    if(!position.every(Number.isFinite))throw new TypeError('Non-finite stair world position');
    const normal=norm([0,1,2].map(c=>source.normal[i*4+c]/255*2-1));
    for(let k=0;k<shared.length;k++){const p=shared[k],residual=Math.abs(dot(p.normal,position)-p.offset),nd=dot(p.viewNormal,normal);
      if(p.owners.includes(source.owners[i])&&residual<=2e-5&&nd>=.9999){pixelPlane[i]=k;report.planeSamples++;report.maxPlaneResidual=Math.max(report.maxPlaneResidual,residual);report.minNormalDot=Math.min(report.minNormalDot,nd);break;}}
  }
  const queue=new Int32Array(n);
  for(let i=0;i<n;i++)if(pixelPlane[i]>=0&&!labels[i]){
    const label=++report.domainCount,p=pixelPlane[i];let h=0,t=1;queue[0]=i;labels[i]=label;const owners=new Set();
    while(h<t){const k=queue[h++],x=k%N;owners.add(source.owners[k]);for(const j of [x?k-1:-1,x<N-1?k+1:-1,k>=N?k-N:-1,k+N<n?k+N:-1])if(j>=0&&!labels[j]&&pixelPlane[j]===p){labels[j]=label;queue[t++]=j;}}
    if(report.domains.length<128)report.domains.push({label,plane:p,pixels:t,owners:[...owners].sort()});else report.domainsTruncated++;
  }
  return {labels,report};
}
function candidate(cx,cy,id,L,angle,w,cut1,cut2,N){const a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),polygon=[[-L/2+cut1,-w/2],[L/2-cut2,-w/2],[L/2,w/2],[-L/2,w/2]].map(([x,y])=>[cx+x*c-y*s,cy+x*s+y*c]);return {owner:id,center:[cx,cy],nominalLength:L,nominalWidth:w,angle,polygon,bounds:polygonBounds(polygon,N)};}
function runsFromPixels(pixels,alpha,bounds,N){const [x0,y0,x1]=bounds,w=x1-x0,runs=[];let run;
  pixels.sort((a,b)=>a-b);for(const j of pixels){const x=x0+j%w,y=y0+Math.floor(j/w),a=alpha[j];if(run&&run[0]===y&&run[1]+run[2]===x&&run[3]===a)run[2]++;else{run=[y,x,1,a];runs.push(run);}}
  return {runs:Uint32Array.from(runs.flat()),sampleCount:pixels.length};
}
function forSamples(piece,N,fn){
  const runs=piece.runs;
  if(ArrayBuffer.isView(runs)){for(let r=0;r<runs.length;r+=4){const start=runs[r]*N+runs[r+1];for(let dx=0;dx<runs[r+2];dx++)fn(start+dx,runs[r+3]);}}
  else for(const [y,x,len,a] of runs)for(let dx=0;dx<len;dx++)fn(y*N+x+dx,a);
}
function pieceBytes(p){return 256+p.runs.byteLength;}
export function planTranslucentTape(source,options={}){
  validateSource(source);
  // Coverage injection is a test seam, not a runtime dependency. Production uses
  // the pure area kernel; a native oracle can independently compare the planner.
  const rasterizer=options.rasterizer||rasterizeConvex;
  if(typeof rasterizer!=='function')throw new TypeError('rasterizer must be a function');
  const N=source.size,n=N*N,scale=N/720,G=Math.min(180,N),S=N/G,owner=source.owners;
  const stats={proposals:0,correctionProposals:0,coarseCellVisits:0,fineCandidatePixelVisits:0,preprocessVisits:n*13,geometryTriangles:0,coarseRejected:0,depthRejected:0,fragmentRejected:0,budgetRejected:0,acceptedCandidates:0,retainedPieces:0,discardedFragments:0,discardedFragmentPixels:0,retainedSamples:0,recutCandidates:0,recutFallbacks:0,coverageRejected:0,baselineCandidates:0,baselinePieces:0,passes:[],stopped:null};
  const lum=new Float32Array(n),clear=new Uint8Array(n),guideOwners=new Uint8Array(G*G),guide=new Float32Array(G*G),cover=new Float32Array(G*G),depth=new Uint8Array(n);let inventory=[];
  for(let i=0;i<n;i++){lum[i]=source.color[i*4]*.2126+source.color[i*4+1]*.7152+source.color[i*4+2]*.0722;clear[i]=owner[i]<2||([7,8,10].includes(owner[i])&&lum[i]>244)?1:0;}
  const cellStart=x=>Math.floor(x*N/G),cellEnd=x=>Math.floor((x+1)*N/G),cellCenter=x=>(cellStart(x)+cellEnd(x))/2;
  const qAt=(x,y)=>Math.floor(((y+1)*G-1)/N)*G+Math.floor(((x+1)*G-1)/N);
  const cellArea=q=>(cellEnd(q%G)-cellStart(q%G))*(cellEnd(Math.floor(q/G))-cellStart(Math.floor(q/G)));
  const smoothLo=Math.floor(-5*scale),smoothHi=Math.ceil(6*scale);
  for(let gy=0;gy<G;gy++)for(let gx=0;gx<G;gx++){
    const hist=new Uint16Array(256);let best=0;
    for(let y=cellStart(gy);y<cellEnd(gy);y++)for(let x=cellStart(gx);x<cellEnd(gx);x++){const i=y*N+x;if(!clear[i]){hist[owner[i]]++;if(hist[owner[i]]>hist[best])best=owner[i];}}
    if(!best)continue;const q=gy*G+gx;guideOwners[q]=best;let value=0,count=0;
    for(let dy=smoothLo;dy<=smoothHi;dy++)for(let dx=smoothLo;dx<=smoothHi;dx++){
      const x=Math.floor(cellCenter(gx))+dx,y=Math.floor(cellCenter(gy))+dy;stats.preprocessVisits++;if(x<0||y<0||x>=N||y>=N)continue;const i=y*N+x;if(owner[i]===best&&!clear[i]){value+=lum[i];count++;}}
    guide[q]=clamp(.42+(238-value/Math.max(1,count))/28,.38,7.15);
  }
  function coarse(c){let gain=0,cells=0;const b=c.bounds;
    for(let y=Math.floor(b[1]/S);y<Math.min(G,Math.ceil(b[3]/S));y++)for(let x=Math.floor(b[0]/S);x<Math.min(G,Math.ceil(b[2]/S));x++){
      visit(stats,'coarseCellVisits',1,P.maxCoarseVisits);const q=y*G+x;if(guideOwners[q]!==c.owner||!insidePolygon(cellCenter(x),cellCenter(y),c.polygon))continue;cells++;gain+=2*(guide[q]-cover[q])-1;}
    return {gain,cells,score:gain/Math.sqrt(Math.max(12,cells))};
  }
  function raster(c,correction=false,labels=null){
    const b=c.bounds,[x0,y0,x1,y1]=b,w=x1-x0,h=y1-y0;visit(stats,'fineCandidatePixelVisits',w*h,P.maxFineVisits);
    if(!w||!h)return {alpha:new Uint8Array(0),components:[]};
    const rawAlpha=rasterizer(c.polygon,b);requireArray(rawAlpha,w*h,'raster alpha');
    const alpha=new Uint8Array(w*h),seedDomains=new Set();
    if(correction&&stair(c.owner)&&labels)for(let y=0;y<h;y++)for(let x=0;x<w;x++){const j=y*w+x,i=(y+y0)*N+x+x0;if(rawAlpha[j]&&owner[i]===c.owner&&labels[i])seedDomains.add(labels[i]);}
    let depthFail=false;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const j=y*w+x,i=(y+y0)*N+x+x0,a=rawAlpha[j];
      if(a&&!clear[i]&&(owner[i]===c.owner||(correction&&stair(c.owner)&&seedDomains.has(labels?.[i])))){alpha[j]=a;if(depth[i]>=P.maxDepth)depthFail=true;}}
    if(!correction&&depthFail){stats.depthRejected++;return {alpha,components:[] ,depthFail:true};}
    const groups=connected(alpha,w,stats),components=[];
    const min=Math.max(1,(c.owner>=11&&c.owner<=19?8:28)*scale*scale);
    for(const pixels of groups){if(!correction&&pixels.length<min){stats.discardedFragments++;stats.discardedFragmentPixels+=pixels.length;}else components.push(pixels);}
    return {alpha,components};
  }
  function canPlace(pieces){if(inventory.length+pieces.length>P.maxPieces||stats.retainedSamples+pieces.reduce((s,p)=>s+p.sampleCount,0)>P.maxRetainedSamples){stats.budgetRejected++;return false;}
    for(const p of pieces){let bad=false;forSamples(p,N,i=>{if(depth[i]>=P.maxDepth)bad=true;});if(bad){stats.depthRejected++;return false;}}return true;}
  function deposit(piece){forSamples(piece,N,i=>{if(depth[i]>=P.maxDepth)throw new Error('Internal placement depth overflow');depth[i]++;});inventory.push(piece);stats.retainedSamples+=piece.sampleCount;stats.retainedPieces=inventory.length;}
  function makePieces(c,fragments,alpha,candidateId,prefix){return fragments.map((pixels,k)=>({...c,...runsFromPixels(pixels,alpha,c.bounds,N),id:prefix+(k+1),candidateId,fragment:k+1,fragmentsFromCandidate:fragments.length}));}
  function tryCandidate(c,pass,index){const score=coarse(c);if(score.cells<1||score.gain<Math.max(.5,score.cells*.07)){stats.coarseRejected++;return;}
    const {alpha,components,depthFail}=raster(c);if(depthFail)return;if(!components.length){stats.fragmentRejected++;return;}
    const pieces=makePieces(c,components,alpha,'pass-'+pass+'-candidate-'+index,'tape-');if(!canPlace(pieces))return;
    const delta=new Map(),[x0,y0,x1]=c.bounds,w=x1-x0;
    for(const pixels of components)for(const j of pixels){const x=x0+j%w,y=y0+Math.floor(j/w),q=qAt(x,y);if(guideOwners[q]===c.owner)delta.set(q,(delta.get(q)||0)+alpha[j]/255/cellArea(q));}
    let realGain=0;for(const [q,d]of delta)realGain+=2*(guide[q]-cover[q])*d-d*d;
    if(realGain<=0){stats.coarseRejected++;return;}stats.acceptedCandidates++;
    for(const piece of pieces){piece.id='tape-'+String(inventory.length+1).padStart(3,'0');deposit(piece);}for(const [q,d]of delta)cover[q]+=d;
  }
  function choose(cells,pass){cells.sort((a,b)=>b.priority-a.priority);const chosen=[],blocked=new Uint8Array(G*G),radius=pass<2?4:3;
    for(const {q}of cells){if(blocked[q])continue;chosen.push(q);const x=q%G,y=Math.floor(q/G);for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<G&&yy<G)blocked[yy*G+xx]=1;}if(chosen.length>=360)break;}return chosen;}
  function proposalsFor(chosen,schedule,rnd,idOverride,correction){const proposals=[];
    for(const q of chosen){const cx=cellCenter(q%G)+(rnd()-.5)*10*scale,cy=cellCenter(Math.floor(q/G))+(rnd()-.5)*10*scale,id=idOverride??guideOwners[q];
      for(let v=0;v<schedule.lengths.length;v++){
        if(stats.proposals>=P.maxProposals||(correction&&stats.correctionProposals>=P.maxCorrectionProposals)){stats.stopped='proposal-budget';return proposals;}
        const angle=schedule.angleBase+(rnd()-.5)*18+(v?90:0),L=schedule.lengths[v]*(.88+rnd()*.24)*scale,w=P.nominalWidth*(.92+rnd()*.16)*scale;
        const c=candidate(cx,cy,id,L,angle,w,(rnd()-.5)*10*scale,(rnd()-.5)*10*scale,N);stats.proposals++;if(correction)stats.correctionProposals++;else c.initial=coarse(c);proposals.push(c);
      }}return proposals;}
  const rnd=random(source.seed);
  for(let pass=0;pass<P.schedule.length;pass++){
    const cells=[];for(let q=0;q<guide.length;q++)if(guideOwners[q]>=2&&guide[q]-cover[q]>.5)cells.push({q,priority:guide[q]-cover[q]+rnd()*.12});
    const chosen=choose(cells,pass),proposals=proposalsFor(chosen,P.schedule[pass],rnd,null,false);proposals.sort((a,b)=>b.initial.score-a.initial.score);
    const before=inventory.length;for(let k=0;k<proposals.length;k++){if(inventory.length>=P.maxPieces){stats.budgetRejected+=proposals.length-k;break;}tryCandidate(proposals[k],pass+1,k+1);}
    stats.passes.push({stage:'original',pass:pass+1,centers:chosen.length,proposals:proposals.length,piecesAdded:inventory.length-before,totalPieces:inventory.length});
  }
  stats.baselineCandidates=stats.acceptedCandidates;stats.baselinePieces=inventory.length;
  const baseline=inventory,baselineSamples=stats.retainedSamples,remainingOriginalDepth=new Uint8Array(depth);
  const reserve=coherentReserve(owner,lum,N,scale,stats),{labels,report:domains}=buildTapeDomains(source,stats);
  for(let i=0;i<n;i++)clear[i]=owner[i]<2||([8,10].includes(owner[i])&&lum[i]>244)||reserve.mask[i]?1:0;
  inventory=[];depth.fill(0);stats.retainedSamples=0;stats.retainedPieces=0;
  const groups=new Map();for(const p of baseline){if(!groups.has(p.candidateId))groups.set(p.candidateId,[]);groups.get(p.candidateId).push(p);}
  let remainingOriginalPieces=baseline.length,remainingOriginalSamples=baselineSamples;
  for(const [candidateId,pieces]of groups){const first=pieces[0];
    for(const p of pieces)forSamples(p,N,i=>remainingOriginalDepth[i]--);
    remainingOriginalPieces-=pieces.length;remainingOriginalSamples-=pieces.reduce((sum,p)=>sum+p.sampleCount,0);
    if(![4,5,6,7].includes(first.owner)){if(!canPlace(pieces))throw new Error('Original reservation invariant failed');for(const p of pieces)deposit(p);continue;}
    const {alpha,components}=raster(first,true,labels),recut=makePieces(first,components,alpha,candidateId,'recut-'+candidateId+'-');stats.recutCandidates++;
    let futureConflict=false;
    for(const p of recut)forSamples(p,N,i=>{if(depth[i]+remainingOriginalDepth[i]>=P.maxDepth)futureConflict=true;});
    if(inventory.length+recut.length+remainingOriginalPieces>P.maxPieces||stats.retainedSamples+recut.reduce((sum,p)=>sum+p.sampleCount,0)+remainingOriginalSamples>P.maxRetainedSamples)futureConflict=true;
    if(futureConflict)stats.reservationRejected=(stats.reservationRejected||0)+1;
    if(futureConflict||!canPlace(recut)){stats.recutFallbacks++;if(!canPlace(pieces))throw new Error('Original reservation invariant failed');for(const p of pieces)deposit(p);continue;}
    for(const p of recut){p.correction='recutFiniteOriginalPolygon';deposit(p);}
  }
  let eligibleVase=0,coveredVase=0;for(let i=0;i<n;i++)if(owner[i]===7&&!clear[i]){eligibleVase++;if(depth[i])coveredVase++;}
  const coverage=()=>({covered:coveredVase,eligible:eligibleVase,fraction:eligibleVase?coveredVase/eligibleVase:1});stats.vaseCoverageBefore=coverage();
  const vrnd=random(source.seed);
  for(let pass=0;pass<P.schedule.length;pass++){
    const cells=[];for(let gy=0;gy<G;gy++)for(let gx=0;gx<G;gx++){let missing=0;
      for(let y=cellStart(gy);y<cellEnd(gy);y++)for(let x=cellStart(gx);x<cellEnd(gx);x++){visit(stats,'coarseCellVisits',1,P.maxCoarseVisits);const i=y*N+x;if(owner[i]===7&&!clear[i]&&!depth[i])missing++;}
      if(missing)cells.push({q:gy*G+gx,priority:missing/cellArea(gy*G+gx)+vrnd()*.12});}
    const chosen=choose(cells,pass),proposals=proposalsFor(chosen,P.schedule[pass],vrnd,7,true);let added=0,examined=0;
    for(let k=0;k<proposals.length;k++){
      if(coverage().fraction>=.97)break;examined++;const c=proposals[k],{alpha,components}=raster(c,true,labels),pieces=makePieces(c,components,alpha,'vase-pass-'+(pass+1)+'-candidate-'+(k+1),'vase-added-'+(pass+1)+'-'+(k+1)+'-');let novel=0,already=0;
      for(const p of pieces)forSamples(p,N,(i,a)=>{if(depth[i])already+=a/255;else novel+=a/255;});
      if(novel<Math.max(1,80*scale*scale)||novel-.3*already<=0){stats.coverageRejected++;continue;}if(!canPlace(pieces))continue;stats.acceptedCandidates++;
      for(const p of pieces){forSamples(p,N,i=>{if(!depth[i])coveredVase++;});p.correction='actualCoverageDemand';deposit(p);}added+=pieces.length;
    }
    stats.passes.push({stage:'correction',pass:pass+1,centers:chosen.length,proposals:proposals.length,examinedProposals:examined,piecesAdded:added,totalPieces:inventory.length,coverage:coverage()});
  }
  stats.vaseCoverageAfter=coverage();stats.retainedPieces=inventory.length;
  // Compact cache owns only piece metadata/runs and bounded reports. Scratch
  // arrays, source images, geometry and depth are not retained by the plan.
  const pieces=inventory.map(({initial,bounds,...piece})=>piece);
  stats.retainedDiagnosticBytes=1024+reserve.polygon.length*32+domains.sharedPlanes.length*256+domains.domains.length*192+stats.passes.length*512;
  stats.retainedPlanBytes=pieces.reduce((s,p)=>s+pieceBytes(p),0)+stats.retainedDiagnosticBytes;
  // Conservative high-water estimate includes input arrays, original and corrected
  // run arrays, guide/label/EDT/queue scratch, raster fragments and JS run overhead.
  stats.estimatedWorkingBytes=n*96+G*G*64+P.maxRetainedSamples*32+stats.retainedPlanBytes*2;
  if(stats.estimatedWorkingBytes>P.maxEstimatedWorkingBytes)throw new RangeError('Tape working memory budget exceeded');
  if(stats.preprocessVisits>P.maxPreprocessVisits)throw new RangeError('Tape preprocessing budget exceeded');
  return {version:1,size:N,seed:source.seed,pieces,stock:P.stock,backing:P.backing,stats,reserve:{polygon:reserve.polygon,pixels:reserve.count,sourceComponent:reserve.sourceComponent},domains};
}
export function composeTape(plan,{intensity=.6,union=false,pieces=plan.pieces,transmission=false}={}){
  if(!plan||!Number.isInteger(plan.size)||plan.size<1||plan.size>720)throw new TypeError('Invalid tape plan');
  if(!Number.isFinite(intensity)||intensity<0||intensity>1)throw new RangeError('Film density must be from 0 to 1');
  const n=plan.size**2,t=new Float64Array(n*3).fill(1),hits=union?new Uint8Array(n):null,stock=P.stock.map(x=>x**(intensity/.6));
  if(!Array.isArray(pieces)||pieces.length>P.maxPieces)throw new RangeError('Too many pieces');
  let samples=0;
  for(const p of pieces){
    const runs=p?.runs;
    if(!runs||(!Array.isArray(runs)&&!(runs instanceof Uint32Array)))throw new TypeError('Invalid piece runs');
    const packed=ArrayBuffer.isView(runs);if(packed&&runs.length%4)throw new TypeError('Incomplete run');
    const count=packed?runs.length/4:runs.length;if(count>P.maxRetainedSamples)throw new RangeError('Too many runs');
    for(let r=0;r<count;r++){
      const row=packed?[runs[r*4],runs[r*4+1],runs[r*4+2],runs[r*4+3]]:runs[r];
      if(!row||row.length!==4||!row.every(Number.isInteger))throw new TypeError('Invalid run values');
      const [y,x,len,a]=row;if(y<0||y>=plan.size||x<0||x>=plan.size||len<1||len>plan.size-x||a<1||a>255)throw new RangeError('Run exceeds frame or coverage limits');
      samples+=len;if(samples>P.maxRetainedSamples)throw new RangeError('Too many retained samples');
    }
  }
  for(const piece of pieces)forSamples(piece,plan.size,(i,a)=>{if(union){hits[i]=Math.max(hits[i],a);return;}for(let c=0;c<3;c++)t[i*3+c]*=1-a/255+a/255*stock[c];});
  if(union)for(let i=0;i<n;i++)for(let c=0;c<3;c++)t[i*3+c]=1-hits[i]/255+hits[i]/255*stock[c];
  const rgba=new Uint8ClampedArray(n*4);for(let i=0;i<n;i++){for(let c=0;c<3;c++)rgba[i*4+c]=Math.round(P.backing[c]*t[i*3+c]);rgba[i*4+3]=255;}
  return transmission?{rgba,transmission:t}:rgba;
}
