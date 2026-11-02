// Frozen contained-BCC proof helpers. No model parameters are selected here.
export const add=(a,b)=>a.map((v,i)=>v+b[i]);
export const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export const mul=(a,s)=>a.map(v=>v*s);
export const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const norm=a=>mul(a,1/Math.hypot(...a));
export const d2=(a,b)=>dot(sub(a,b),sub(a,b));
export function pointSegment2(p,a,b) { const ab=sub(b,a),den=dot(ab,ab),t=den?Math.max(0,Math.min(1,dot(sub(p,a),ab)/den)):0;return d2(p,add(a,mul(ab,t))); }
export function pointTriangle2(p,t) {
 const [a,b,c]=t.p,ab=t.ab,ac=t.ac;
 if(t.area2===0)return Math.min(pointSegment2(p,a,b),pointSegment2(p,b,c),pointSegment2(p,c,a));
 const ap=sub(p,a),d1=dot(ab,ap),d2a=dot(ac,ap);if(d1<=0&&d2a<=0)return dot(ap,ap);
 const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return dot(bp,bp);
 const vc=d1*d4-d3*d2a;if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3);return d2(p,add(a,mul(ab,v)));}
 const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return dot(cp,cp);
 const vb=d5*d2a-d1*d6;if(vb<=0&&d2a>=0&&d6<=0){const w=d2a/(d2a-d6);return d2(p,add(a,mul(ac,w)));}
 const va=d3*d6-d5*d4;if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){const w=(d4-d3)/((d4-d3)+(d5-d6));return d2(p,add(b,mul(sub(c,b),w)));}
 const denominator=va+vb+vc;
 if(!Number.isFinite(denominator)||denominator===0)return Math.min(pointSegment2(p,a,b),pointSegment2(p,b,c),pointSegment2(p,c,a));
 const v=vb/denominator,w=vc/denominator;return d2(p,add(a,add(mul(ab,v),mul(ac,w))));
}
export function segmentSegment2(p1,q1,p2,q2) {
 const d1=sub(q1,p1),d2a=sub(q2,p2),r=sub(p1,p2),a=dot(d1,d1),e=dot(d2a,d2a),f=dot(d2a,r);let s,t;
 const clamp=x=>Math.max(0,Math.min(1,x));
 if(a===0&&e===0)return dot(r,r);
 if(a===0){s=0;t=clamp(f/e);}else{const c=dot(d1,r);if(e===0){t=0;s=clamp(-c/a);}else{const b=dot(d1,d2a),denom=a*e-b*b;s=denom>Number.EPSILON*a*e*16?clamp((b*f-c*e)/denom):0;t=(b*s+f)/e;if(t<0){t=0;s=clamp(-c/a);}else if(t>1){t=1;s=clamp((b-c)/a);}}}
 return d2(add(p1,mul(d1,s)),add(p2,mul(d2a,t)));
}
export function triangle(p,id,index) {const ab=sub(p[1],p[0]),ac=sub(p[2],p[0]),n=cross(ab,ac),area2=dot(n,n);return {p,id,index,ab,ac,n,area2,unit:area2?mul(n,1/Math.sqrt(area2)):[0,0,0],min:[0,1,2].map(k=>Math.min(...p.map(q=>q[k]))),max:[0,1,2].map(k=>Math.max(...p.map(q=>q[k])))};}
function boundsDistance2(amin,amax,bmin,bmax){let out=0;for(let k=0;k<3;k++){const d=Math.max(0,amin[k]-bmax[k],bmin[k]-amax[k]);out+=d*d;}return out;}
function rayBox(p,d,t,tol){let near=0,far=Infinity;for(let k=0;k<3;k++){let a=(t.min[k]-tol-p[k])/d[k],b=(t.max[k]+tol-p[k])/d[k];if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return false;}return far>=0;}
export function classifyPoint(p,triangles,directions,tol) {
 let votes=[];
 for(const direction of directions){let hits=0;
  for(const t of triangles){
   if(!rayBox(p,direction,t,tol))continue;
   if(boundsDistance2(p,p,t.min,t.max)<=tol*tol&&pointTriangle2(p,t)<=tol*tol)return {inside:false,reason:'boundary',votes};
   // Zero-area facets have no parity contribution; they are still tested by clearance.
   if(t.area2===0)continue;
   const denominator=dot(t.unit,direction),plane=dot(t.unit,sub(t.p[0],p));
   if(Math.abs(denominator)<=tol){if(Math.abs(plane)<=tol)return {inside:false,reason:'parallel-ambiguous',votes};continue;}
   const distance=plane/denominator;if(distance< -tol)continue;
   const q=add(p,mul(direction,distance)),v=sub(q,t.p[0]);
   const d00=dot(t.ab,t.ab),d01=dot(t.ab,t.ac),d11=dot(t.ac,t.ac),d20=dot(v,t.ab),d21=dot(v,t.ac),den=d00*d11-d01*d01;
   if(den<=0||!Number.isFinite(den))return {inside:false,reason:'degenerate-ambiguous',votes};
   const b=(d11*d20-d01*d21)/den,c=(d00*d21-d01*d20)/den,a=1-b-c;
   if(Math.min(a,b,c)< -tol)continue;
   if(distance<=tol||Math.min(a,b,c)<=tol)return {inside:false,reason:'edge-ambiguous',votes};
   hits++;
  }
  votes.push(hits%2);
 }
 return {inside:votes.every(v=>v===1),reason:votes.every(v=>v===1)?'inside':votes.some(v=>v===1)?'parity-disagreement':'outside',votes};
}
function segmentIntersects(a,b,t,tol){
 if(t.area2===0)return false;
 const da=dot(t.unit,sub(a,t.p[0])),db=dot(t.unit,sub(b,t.p[0]));
 if((da>tol&&db>tol)||(da< -tol&&db< -tol))return false;
 // Coplanar or near-coplanar segments: endpoint/face and edge distance tests below
 // cover overlap. Near-plane uncertainty within predicate tolerance is fail-closed.
 if(Math.abs(da)<=tol&&Math.abs(db)<=tol){
  if(Math.min(pointTriangle2(a,t),pointTriangle2(b,t),...[[0,1],[1,2],[2,0]].map(([i,j])=>segmentSegment2(a,b,t.p[i],t.p[j])))<=tol*tol)return true;
  return false;
 }
 const denom=da-db;if(denom===0)return false;
 const f=da/denom;if(f< -tol||f>1+tol)return false;
 const p=add(a,mul(sub(b,a),Math.max(0,Math.min(1,f)))),v=sub(p,t.p[0]);
 const d00=dot(t.ab,t.ab),d01=dot(t.ab,t.ac),d11=dot(t.ac,t.ac),d20=dot(v,t.ab),d21=dot(v,t.ac),den=d00*d11-d01*d01;
 if(den<=0)return true;
 const u=(d11*d20-d01*d21)/den,w=(d00*d21-d01*d20)/den;
 return u>=-tol&&w>=-tol&&u+w<=1+tol;
}
export function segmentTriangle2(a,b,t,tol) {
 if(segmentIntersects(a,b,t,tol))return 0;
 return Math.min(pointTriangle2(a,t),pointTriangle2(b,t),segmentSegment2(a,b,t.p[0],t.p[1]),segmentSegment2(a,b,t.p[1],t.p[2]),segmentSegment2(a,b,t.p[2],t.p[0]));
}
export function segmentBoundaryDistance(a,b,triangles,tol) {
 const amin=a.map((v,i)=>Math.min(v,b[i])),amax=a.map((v,i)=>Math.max(v,b[i]));let best=Infinity,index=-1,visited=0,skipped=0;
 for(const t of triangles){const lower=boundsDistance2(amin,amax,t.min,t.max);if(lower>best+Number.EPSILON*Math.max(1,best)*32){skipped++;continue;}const distance=segmentTriangle2(a,b,t,tol);visited++;if(!Number.isFinite(distance)||distance<0)return {distance:NaN,index:t.index,visited,skipped};if(distance<best){best=distance;index=t.index;}if(best===0)break;}
 return {distance:Math.sqrt(best),index,visited,skipped};
}
export function graphComponents(nodes,edges){const by=new Map(nodes.map(n=>[n.key,[]]));for(const e of edges){by.get(e.a).push(e.b);by.get(e.b).push(e.a);}let components=[],seen=new Set();for(const n of nodes){if(seen.has(n.key)||!by.get(n.key).length)continue;let queue=[n.key],edges2=0;seen.add(n.key);for(let i=0;i<queue.length;i++){edges2+=by.get(queue[i]).length;for(const k of by.get(queue[i]))if(!seen.has(k)){seen.add(k);queue.push(k);}}components.push({nodes:queue.length,edges:edges2/2});}return {components:components.length,componentSizes:components,isolatedEdges:components.filter(c=>c.edges===1).length,unusedNodes:nodes.length-seen.size,participatingNodes:seen.size,maxDegree:Math.max(0,...Array.from(by.values(),a=>a.length))};}
