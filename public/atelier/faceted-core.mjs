/** Frozen adaptive-facet arithmetic, isolated for the faceted-color abstraction premise.
 * Material textures/reflections are simplified. Source owner interleaving and faint
 * shadow wedges remain. No filters, owner repair, palette or topology retuning.
 * No browser, p5, DOM, Node, third-party dependencies, or module-global cache.
 */
export const CONFIG=Object.freeze({budgets:Object.freeze([303,603]),cell:8,box:3,gradientOffset:4,weightFloor:.02,sourcePixelVisitCap:20_000_000,triangleTestCap:2_000_000,flipCap:20_000,seed:2401,minSize:1,maxSize:720,exactDeterminantBound:51_600_000_000_000});
function assert(condition,message="invalid faceted study input"){if(!condition)throw new Error(message);}
assert.equal=(actual,expected,message)=>assert(actual===expected,message);
function validateSize(size){assert(Number.isInteger(size)&&size>=CONFIG.minSize&&size<=CONFIG.maxSize,"size must be an integer from 1 through 720");}
function validateBytes(value,length,label){assert((value instanceof Uint8Array||value instanceof Uint8ClampedArray)&&value.length===length,label+" must be a byte typed array of the exact frame length");}
function validateWork(work){assert(work instanceof Work,"work must be a Work counter");}
function validateCandidates(candidates,size){
 validateSize(size);assert(Array.isArray(candidates)&&candidates.length===Math.ceil(size/8)**2,"invalid candidate count");
 for(let i=0;i<candidates.length;i++){const p=candidates[i],prev=candidates[i-1];assert(p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>0&&p.y>0&&p.x<size*2&&p.y<size*2&&p.x%2===1&&p.y%2===1&&Number.isFinite(p.s)&&p.s>=0&&p.s<=1,"invalid candidate");assert(!prev||prev.x<p.x||prev.x===p.x&&prev.y<p.y,"candidate coordinates must be strictly sorted");}
}
function validatePoints(points,size){
 validateSize(size);assert(Array.isArray(points)&&points.length>=4&&points.length<=603,"invalid site count");
 const corners=[[0,0],[size*2,0],[size*2,size*2],[0,size*2]],seen=new Set();
 for(let i=0;i<points.length;i++){const p=points[i];assert(p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.x<=size*2&&p.y>=0&&p.y<=size*2,"invalid site coordinate");assert(i<4?p.x===corners[i][0]&&p.y===corners[i][1]:p.x>0&&p.x<size*2&&p.y>0&&p.y<size*2,"invalid frame corner or interior site");const key=p.x+","+p.y;assert(!seen.has(key),"duplicate site");seen.add(key);}
}
function validateTriangles(triangles,points){assert(Array.isArray(triangles)&&triangles.length===2*points.length-6,"invalid triangle count");for(const t of triangles){assert(Array.isArray(t)&&t.length===3&&t.every(i=>Number.isInteger(i)&&i>=0&&i<points.length),"invalid triangle indices");const area=orient(...t.map(i=>points[i]));assert(Number.isSafeInteger(area)&&area>0,"invalid triangle area");}}
// The inherited 20M safety cap applies to this counter; it never reclassifies the
// old experiment's corrected 23,964,928 visits as a pass. Each render gets one.
export class Work {
 constructor(){this.sourcePixelVisits=0;this.entries={};}
 visit(label,n){assert(typeof label==="string"&&Number.isSafeInteger(n)&&n>=0,"invalid work count");this.sourcePixelVisits+=n;this.entries[label]=(this.entries[label]||0)+n;assert(this.sourcePixelVisits<=CONFIG.sourcePixelVisitCap,"source pixel visit cap exceeded");}
}
export function prepareCandidates(rgba,size,work){
 validateSize(size); validateBytes(rgba,size*size*4,"source"); validateWork(work);
 const t=performance.now(),N=size*size,W=size+1, integral=new Uint32Array(W*W*3),blur=new Float64Array(N*3);
 work.visit('integral source reads',N);
 for(let y=0;y<size;y++){let r=0,g=0,b=0;for(let x=0;x<size;x++){const k=(y*size+x)*4,j=((y+1)*W+x+1)*3,above=(y*W+x+1)*3;assert(rgba[k+3]===255,"source must be opaque");r+=rgba[k];g+=rgba[k+1];b+=rgba[k+2];integral[j]=integral[above]+r;integral[j+1]=integral[above+1]+g;integral[j+2]=integral[above+2]+b;}}
 // A centered 3x3 box, truncated and renormalized only at the frame boundary.
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const x0=Math.max(0,x-1),x1=Math.min(size,x+2),y0=Math.max(0,y-1),y1=Math.min(size,y+2),a=(y0*W+x0)*3,b=(y0*W+x1)*3,c=(y1*W+x0)*3,d=(y1*W+x1)*3,n=(x1-x0)*(y1-y0),j=(y*size+x)*3;for(let ch=0;ch<3;ch++)blur[j+ch]=(integral[d+ch]-integral[b+ch]-integral[c+ch]+integral[a+ch])/n;}
 const candidates=[];let globalMax=0;
 // RGB saliency is sqrt(sum of squared central RGB differences), at +/-4px.
 // Candidate and global ties are x then y, with no random sampling.
 for(let cx=0;cx<size;cx+=8)for(let cy=0;cy<size;cy+=8){let best=-1,bx=cx,by=cy;for(let x=cx;x<Math.min(size,cx+8);x++)for(let y=cy;y<Math.min(size,cy+8);y++){const l=(y*size+Math.max(0,x-4))*3,r=(y*size+Math.min(size-1,x+4))*3,u=(Math.max(0,y-4)*size+x)*3,d=(Math.min(size-1,y+4)*size+x)*3;let g=0;for(let ch=0;ch<3;ch++){const dx=blur[r+ch]-blur[l+ch],dy=blur[d+ch]-blur[u+ch];g+=dx*dx+dy*dy;}if(g>best){best=g;bx=x;by=y;}}const score=Math.sqrt(best);globalMax=Math.max(globalMax,score);candidates.push({x:2*bx+1,y:2*by+1,s:score});}
 candidates.sort((a,b)=>a.x-b.x||a.y-b.y);for(const p of candidates)p.s=globalMax?p.s/globalMax:0;
 return {candidates,ms:performance.now()-t,globalMax,workingTypedBytes:integral.byteLength+blur.byteLength,internalPixelVisits:{box:N,gradient:N}};
}
export function selectSites(candidates,size,budget,weighted){
 validateCandidates(candidates,size); assert(CONFIG.budgets.includes(budget),"unsupported site budget"); budget=Math.min(budget,candidates.length+4); assert(typeof weighted==="boolean","weighted must be boolean");
 const started=performance.now(),corners=[{x:0,y:0,s:0},{x:2*size,y:0,s:0},{x:2*size,y:2*size,s:0},{x:0,y:2*size,s:0}],sites=[...corners],dist=new Float64Array(candidates.length),chosen=new Uint8Array(candidates.length);let distanceUpdates=0,scoreEvaluations=0;
 assert(budget<=candidates.length+4);for(let i=0;i<candidates.length;i++){const p=candidates[i];dist[i]=Math.min(...corners.map(q=>(p.x-q.x)**2+(p.y-q.y)**2));distanceUpdates+=4;}
 while(sites.length<budget){let best=-1,score=-1;for(let i=0;i<candidates.length;i++){scoreEvaluations++;if(chosen[i])continue;const s=(weighted?CONFIG.weightFloor+candidates[i].s:1)*dist[i];if(s>score){score=s;best=i;}}assert(best>=0);const p=candidates[best];sites.push({...p});chosen[best]=1;for(let i=0;i<candidates.length;i++){const q=candidates[i],d=(p.x-q.x)**2+(p.y-q.y)**2;dist[i]=Math.min(dist[i],d);distanceUpdates++;}}
 return{sites,ms:performance.now()-started,distanceUpdates,scoreEvaluations,typedBytes:dist.byteLength+chosen.byteLength};
}
export const orient=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
export function incircle(a,b,c,d){const ax=a.x-d.x,ay=a.y-d.y,bx=b.x-d.x,by=b.y-d.y,cx=c.x-d.x,cy=c.y-d.y;return(ax*ax+ay*ay)*(bx*cy-by*cx)-(bx*bx+by*by)*(ax*cy-ay*cx)+(cx*cx+cy*cy)*(ax*by-ay*bx);}
const edgeKey=(a,b)=>a<b?`${a},${b}`:`${b},${a}`;
function orderedTriangle(a,b,c,points){const o=orient(points[a],points[b],points[c]);assert(o!==0);return o>0?[a,b,c]:[a,c,b];}
function edgesOf(triangles){const e=new Map();for(let i=0;i<triangles.length;i++){const t=triangles[i];for(let k=0;k<3;k++){const a=t[k],b=t[(k+1)%3],op=t[(k+2)%3],key=edgeKey(a,b);if(!e.has(key))e.set(key,[]);e.get(key).push({a,b,op,t:i});}}return e;}
function diagonalLess(a,b,c,d,points){const cmp=(i,j)=>points[i].x-points[j].x||points[i].y-points[j].y;const u=[a,b].sort(cmp),v=[c,d].sort(cmp);return cmp(u[0],v[0])<0||(cmp(u[0],v[0])===0&&cmp(u[1],v[1])<0);}
export function triangulate(points,size){
 validatePoints(points,size); const start=performance.now();
 let triangles=[[0,1,2],[0,2,3]],circleTests=0,maxDet=0,cavityFaces=0,boundaryEdges=0,tieFlips=0,canonicalCircleTests=0,canonicalPasses=0,canonicalEdgeIncidences=0,maxAbsCanonicalDet=0;
 // Bowyer-Watson insertion begins from the actual frame rectangle. A strict
 // positive incircle cavity preserves existing cocircular edges. Canonical
 // exact-zero flips below remove dependence on cocircular insertion history.
 for(let index=4;index<points.length;index++){const p=points[index],keep=[],cavity=new Map();let bad=0;for(const t of triangles){assert(++circleTests<=CONFIG.triangleTestCap);const det=incircle(points[t[0]],points[t[1]],points[t[2]],p);assert(Number.isSafeInteger(det)&&Math.abs(det)<=CONFIG.exactDeterminantBound,"unsafe incircle predicate");maxDet=Math.max(maxDet,Math.abs(det));if(det>0){bad++;for(let k=0;k<3;k++){const a=t[k],b=t[(k+1)%3],key=edgeKey(a,b);if(cavity.has(key))cavity.delete(key);else cavity.set(key,[a,b]);}}else keep.push(t);}assert(bad>0,'empty insertion cavity');cavityFaces+=bad;boundaryEdges+=cavity.size;for(const[a,b]of[...cavity.values()].sort((u,v)=>Math.min(...u)-Math.min(...v)||Math.max(...u)-Math.max(...v))){assert(orient(points[a],points[b],p)>0,'nonpositive cavity face');keep.push([a,b,index]);}triangles=keep;}
 let changed=true;while(changed){changed=false;canonicalPasses++;canonicalEdgeIncidences+=triangles.length*3;const edges=edgesOf(triangles);for(const pair of edges.values()){if(pair.length!==2)continue;const e=pair[0],f=pair[1],det=incircle(points[e.a],points[e.b],points[e.op],points[f.op]);canonicalCircleTests++;maxAbsCanonicalDet=Math.max(maxAbsCanonicalDet,Math.abs(det));assert(Number.isSafeInteger(det)&&Math.abs(det)<=CONFIG.exactDeterminantBound,'unsafe incircle predicate');assert(det<=0,'non-Delaunay insertion');if(det===0&&diagonalLess(e.op,f.op,e.a,e.b,points)){assert(++tieFlips<=CONFIG.flipCap);triangles[e.t]=orderedTriangle(e.op,f.op,e.a,points);triangles[f.t]=orderedTriangle(f.op,e.op,e.b,points);changed=true;break;}}}
 triangles=triangles.map(t=>{const m=t.indexOf(Math.min(...t));return[t[m],t[(m+1)%3],t[(m+2)%3]];}).sort((a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2]);
 return {triangles,ms:performance.now()-start,work:{circleTests,cavityFaces,boundaryEdges,tieFlips,maxAbsIncircleDet:maxDet,canonicalCircleTests,canonicalPasses,canonicalEdgeIncidences,maxAbsCanonicalDet}};
}
export function rasterize(points,triangles,source,owner,size,work){
 validatePoints(points,size); validateTriangles(triangles,points); validateBytes(source,size*size*4,"source"); validateBytes(owner,size*size,"owner"); validateWork(work);
 const start=performance.now(),N=size*size,faceIds=new Uint16Array(N),coverage=new Uint8Array(N),sums=new Uint32Array(triangles.length*256*4);faceIds.fill(65535);let covered=0,spanRows=0;
 work.visit('owner-clipped source accumulation',N);
 for(let fi=0;fi<triangles.length;fi++){const t=triangles[fi].map(i=>points[i]),minY=Math.max(0,Math.ceil((Math.min(...t.map(p=>p.y))-1)/2)),maxY=Math.min(size-1,Math.floor((Math.max(...t.map(p=>p.y))-1)/2));for(let y=minY;y<=maxY;y++){let lo=0,hi=size-1;const py=2*y+1;for(let k=0;k<3;k++){const a=t[k],b=t[(k+1)%3],dx=b.x-a.x,dy=b.y-a.y,inclusive=dy<0||(dy===0&&dx>0),threshold=inclusive?0:1,C=dx*(py-a.y)+dy*a.x;if(dy>0)hi=Math.min(hi,Math.floor((C-dy-threshold)/(2*dy)));else if(dy<0)lo=Math.max(lo,Math.ceil((threshold-C+dy)/(-2*dy)));else if(C<threshold){hi=-1;break;}}if(lo>hi)continue;spanRows++;for(let x=lo;x<=hi;x++){const i=y*size+x,k=i*4,o=owner[i],j=(fi*256+o)*4;assert.equal(coverage[i],0,'double coverage');coverage[i]=1;faceIds[i]=fi;covered++;assert(source[k+3]===255,"source must be opaque");sums[j]+=source[k];sums[j+1]+=source[k+1];sums[j+2]+=source[k+2];sums[j+3]++;}}}
 assert.equal(covered,N);assert(coverage.every(v=>v===1));const means=new Uint8Array(triangles.length*256*3);let fragments=0;for(let j=0;j<sums.length;j+=4)if(sums[j+3]){fragments++;for(let c=0;c<3;c++)means[(j/4)*3+c]=Math.round(sums[j+c]/sums[j+3]);}
 const out=new Uint8ClampedArray(N*4);work.visit('owner-clipped output assembly',N);for(let i=0;i<N;i++){const j=(faceIds[i]*256+owner[i])*3,k=i*4;out[k]=means[j];out[k+1]=means[j+1];out[k+2]=means[j+2];out[k+3]=255;}
 return {out,ms:performance.now()-start,stats:{coveredPixels:covered,ownerClippedGroups:fragments,spanRows},typedBytes:faceIds.byteLength+coverage.byteLength+sums.byteLength+means.byteLength+out.byteLength};
}
