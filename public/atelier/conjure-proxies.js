// Geometry-derived adaptations of Atelier's section, cutaway and BCC proxies.
// Garden's accepted bake remains in its original modules. These paths operate
// on an immutable Conjure capture, with no fixed object list or scene hash.
import { ShapeUtils, Vector2 } from './vendor/three.module.min.js';
import { triangle, classifyPoint, segmentBoundaryDistance } from './volume-bar-geometry.js';

const add = (a,b) => a.map((v,i)=>v+b[i]);
const sub = (a,b) => a.map((v,i)=>v-b[i]);
const mul = (a,s) => a.map(v=>v*s);
const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm = a => mul(a,1/(Math.hypot(...a)||1));
const tf = (m,p) => [0,1,2].map(i=>m[i]*p[0]+m[i+4]*p[1]+m[i+8]*p[2]+m[i+12]);
const linear = x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
const srgb = x=>Math.round(255*Math.max(0,Math.min(1,x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055)));
const finite = (a,n)=>a?.length===n && Array.from(a).every(Number.isFinite);
const extent = b=>Math.max(...b.max.map((v,i)=>v-b.min[i]));
const bounds = points=>{const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const p of points)for(let k=0;k<3;k++){min[k]=Math.min(min[k],p[k]);max[k]=Math.max(max[k],p[k]);}return {min,max};};
const overlap=(a,b)=>a.min.every((v,k)=>v<=b.max[k]&&a.max[k]>=b.min[k]);

function prepareMeshes(snapshot) {
  if(snapshot?.source!=='conjure'||snapshot.version!==1||!Array.isArray(snapshot.meshes)||
      !finite(snapshot.view,16)||!finite(snapshot.projection,16)||!Number.isInteger(snapshot.size)||snapshot.size<1||snapshot.size>720)
    throw Error('Invalid Conjure proxy geometry snapshot');
  const bodies=new Map();
  for(const [serial,m] of snapshot.meshes.entries()) {
    if(!Number.isInteger(m.id)||m.id<1||!finite(m.matrix,16)||!m.position||m.position.length%3||!m.position.every(Number.isFinite))
      throw Error('Invalid Conjure proxy mesh');
    const key=m.bodyId??`mesh:${serial}`;
    let body=bodies.get(key);
    if(!body){body={id:m.id,serial,side:m.side??0,castShadow:m.castShadow!==false,triangles:[],alphaCutout:false};bodies.set(key,body);}
    body.alphaCutout ||= !!m.material?.alphaCutout;
    const world=[];
    for(let i=0;i<m.position.length;i+=3)world.push(tf(m.matrix,[m.position[i],m.position[i+1],m.position[i+2]]));
    if(!world.length)continue;
    const size=extent(bounds(world)),M=m.matrix,
      mirrored=M[0]*(M[5]*M[10]-M[9]*M[6])-M[4]*(M[1]*M[10]-M[9]*M[2])+M[8]*(M[1]*M[6]-M[5]*M[2])<0;
    const count=m.index?.length??world.length,start=Math.max(0,m.drawRange?.start??0),end=Math.min(count,start+(m.drawRange?.count??Infinity));
    for(let at=start;at+2<end;at+=3){
      const p=[0,1,2].map(k=>world[m.index?m.index[at+k]:at+k]);
      if(p.some(v=>!v))throw Error('Invalid Conjure proxy triangle index');
      if(mirrored)[p[1],p[2]]=[p[2],p[1]];
      const t=triangle(p,m.id,body.triangles.length);if(t.area2<=size**4*1e-24)continue;
      t.pigment=m.material?.color;t.side=m.side??0;
      body.triangles.push(t);
    }
  }
  const meshes=[];
  for(const body of bodies.values()){
    if(!body.triangles.length)continue;
    const box=bounds(body.triangles.flatMap(t=>t.p)),size=extent(box),eps=Math.max(size*1e-6,1e-12),edges=new Map(),pigment=[0,0,0];let area=0;
    const key=p=>p.map((v,i)=>Math.round((v-box.min[i])/eps)).join(',');
    for(const t of body.triangles){
      for(let k=0;k<3;k++){const a=key(t.p[k]),b=key(t.p[(k+1)%3]);if(a===b)continue;const e=a<b?`${a}|${b}`:`${b}|${a}`;edges.set(e,(edges.get(e)||0)+1);}
      if(finite(t.pigment,3)){const weight=Math.sqrt(t.area2);area+=weight;for(let k=0;k<3;k++)pigment[k]+=t.pigment[k]*weight;}
    }
    meshes.push({...body,...box,size,eps,pigment:area?pigment.map(v=>v/area):undefined,
      closed:!body.alphaCutout&&edges.size>0&&Array.from(edges.values()).every(n=>n===2)});
  }
  return meshes;
}

// Plane intersections retain separate contours and holes. Quantization is used
// only to join the numerically identical ends of adjacent source triangles.
function sectionSegments(mesh,n,h) {
  const out=[],eps=mesh.eps*.1;
  for(const t of mesh.triangles){
    const d=t.p.map(p=>dot(n,p)-h),points=[];
    if(d.every(v=>v>eps)||d.every(v=>v< -eps)||d.every(v=>Math.abs(v)<=eps))continue;
    for(let k=0;k<3;k++){
      const j=(k+1)%3;
      if(Math.abs(d[k])<=eps)points.push(t.p[k]);
      if((d[k]< -eps&&d[j]>eps)||(d[k]>eps&&d[j]< -eps))points.push(add(t.p[k],mul(sub(t.p[j],t.p[k]),d[k]/(d[k]-d[j]))));
    }
    const unique=points.filter((p,i)=>!points.slice(0,i).some(q=>Math.hypot(...sub(p,q))<eps));
    if(unique.length===2&&Math.hypot(...sub(unique[0],unique[1]))>eps)out.push(unique);
  }
  return out;
}
function planeBasis(n){const u=norm(cross(n,Math.abs(n[1])<.9?[0,1,0]:[1,0,0]));return [u,cross(n,u)];}
function contours(segments,eps){
  const key=p=>p.map(v=>Math.round(v/eps)).join(','),nodes=new Map(),edges=[],unique=new Set();
  for(const [a,b] of segments){const ka=key(a),kb=key(b),ek=ka<kb?`${ka}|${kb}`:`${kb}|${ka}`;if(ka===kb||unique.has(ek))continue;unique.add(ek);const i=edges.length;edges.push([ka,kb]);for(const [k,p]of [[ka,a],[kb,b]]){if(!nodes.has(k))nodes.set(k,{p,edges:[]});nodes.get(k).edges.push(i);}}
  const used=new Set(),loops=[];
  for(let start=0;start<edges.length;start++){
    if(used.has(start))continue;const first=edges[start][0],points=[];let at=first,e=start,closed=false;
    for(let steps=0;steps<=edges.length;steps++){
      points.push(nodes.get(at).p);used.add(e);const edge=edges[e];at=edge[0]===at?edge[1]:edge[0];
      if(at===first){closed=true;break;}
      const next=nodes.get(at).edges.filter(i=>!used.has(i));if(next.length!==1)break;e=next[0];
    }
    if(closed&&points.length>=3)loops.push(points);
  }
  return loops;
}
const contains=(polygon,p)=>{let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++)if((polygon[i][1]>p[1])!==(polygon[j][1]>p[1])&&p[0]<(polygon[j][0]-polygon[i][0])*(p[1]-polygon[i][1])/(polygon[j][1]-polygon[i][1])+polygon[i][0])hit=!hit;return hit;};
function facesFromContours(loops,n){
  const [u,v]=planeBasis(n),flat=loops.map(points=>({points,xy:points.map(p=>[dot(p,u),dot(p,v)])}));
  const area=p=>Math.abs(p.reduce((sum,q,i)=>sum+q[0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*q[1],0));
  flat.forEach(l=>{l.area=area(l.xy);l.parent=null;});
  for(const l of flat)for(const other of flat)if(other!==l&&other.area>l.area&&contains(other.xy,l.xy[0])&&(!l.parent||other.area<l.parent.area))l.parent=other;
  const depth=l=>l.parent?depth(l.parent)+1:0,result=[];
  for(const l of flat){
    if(depth(l)%2)continue;const holes=flat.filter(h=>h.parent===l),points=[...l.points,...holes.flatMap(h=>h.points)];
    const triangles=ShapeUtils.triangulateShape(l.xy.map(p=>new Vector2(...p)),holes.map(h=>h.xy.map(p=>new Vector2(...p))));
    for(const tri of triangles)result.push(tri.map(i=>points[i]));
  }
  return result;
}

function builder(){
  const faces=[];
  const addFace=(points,mesh,pigment=mesh.pigment,side=2)=>{const normal=norm(cross(sub(points[1],points[0]),sub(points[2],points[0])));if(Math.hypot(...normal)>.5)faces.push({p:points,normal,id:mesh.id,pigment,side,castShadow:mesh.castShadow});};
  const quad=(a,b,c,d,m,pigment)=>{addFace([a,b,c],m,pigment);addFace([a,c,d],m,pigment);};
  const retain=m=>{for(const t of m.triangles)addFace(t.p,m,t.pigment,t.side);};
  const bar=(a,b,half,m)=>{
    const axis=norm(sub(b,a)),[u,v]=planeBasis(axis),ends=[sub(a,mul(axis,half)),add(b,mul(axis,half))],p=[];
    for(const c of ends)for(const [x,y]of [[-1,-1],[1,-1],[1,1],[-1,1]])p.push(add(c,add(mul(u,x*half),mul(v,y*half))));
    for(const q of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]])quad(...q.map(i=>p[i]),m);
  };
  return {faces,addFace,quad,retain,bar};
}

function ownerSizes(meshes){const owners=new Map();for(const m of meshes){let b=owners.get(m.id);if(!b){b={min:[...m.min],max:[...m.max]};owners.set(m.id,b);}else for(let i=0;i<3;i++){b.min[i]=Math.min(b.min[i],m.min[i]);b.max[i]=Math.max(b.max[i],m.max[i]);}}return new Map([...owners].map(([id,b])=>[id,extent(b)]));}

export function buildConjureSectionRibs(snapshot){
  const meshes=prepareMeshes(snapshot),out=builder(),sizes=ownerSizes(meshes);let planes=0,filled=0,ribbons=0;
  for(const m of meshes){
    if(m.id===1){out.retain(m);continue;}
    const scale=Math.max(m.size,sizes.get(m.id)*.12),pitch=scale/7,gauge=scale*.006,ribbon=scale*.022;
    for(const axis of [0,2]){
      const n=[0,0,0];n[axis]=1;const span=m.max[axis]-m.min[axis],count=Math.max(1,Math.min(11,Math.ceil(span/pitch)));
      for(let i=0;i<count;i++){
        const h=m.min[axis]+span*(i+.5)/count,segments=sectionSegments(m,n,h);if(!segments.length)continue;planes++;
        const loops=m.closed?contours(segments,m.eps*2):[];
        if(m.closed&&loops.length){
          const faces=facesFromContours(loops,n);
          for(const p of faces){out.addFace(p.map(q=>add(q,mul(n,gauge/2))),m);out.addFace([...p].reverse().map(q=>sub(q,mul(n,gauge/2))),m);filled++;}
          for(const loop of loops)for(let j=0;j<loop.length;j++){const a=loop[j],b=loop[(j+1)%loop.length];out.quad(sub(a,mul(n,gauge/2)),sub(b,mul(n,gauge/2)),add(b,mul(n,gauge/2)),add(a,mul(n,gauge/2)),m);}
        }else for(const [a,b]of segments){
          const offset=mul(norm(cross(n,sub(b,a))),ribbon/2),aa=sub(a,offset),ab=add(a,offset),ba=sub(b,offset),bb=add(b,offset);
          const loop=[aa,ba,bb,ab],front=loop.map(p=>add(p,mul(n,gauge/2))),back=loop.map(p=>sub(p,mul(n,gauge/2)));
          out.quad(...front,m);out.quad(...[...back].reverse(),m);
          for(let k=0;k<4;k++){const j=(k+1)%4;out.quad(back[k],back[j],front[j],front[k],m);}
          ribbons++;
        }
      }
    }
  }
  return {faces:out.faces,diagnostics:{planes,filled,ribbons,meshes:meshes.length}};
}

export function buildConjureCutaway(snapshot){
  const meshes=prepareMeshes(snapshot),out=builder(),n=norm([.36,0,1]),cast=meshes.filter(m=>m.id>=3),objects=cast.length?cast:meshes.filter(m=>m.id!==1);
  let lo=Infinity,hi=-Infinity;for(const m of objects)for(const t of m.triangles)for(const p of t.p){const q=dot(n,p);lo=Math.min(lo,q);hi=Math.max(hi,q);}
  const h=lo+(hi-lo)*.57;let caps=0,clipped=0,open=0;
  for(const m of meshes){
    if(m.id===1){out.retain(m);continue;}
    for(const t of m.triangles){
      const polygon=[];
      for(let k=0;k<3;k++){const a=t.p[k],b=t.p[(k+1)%3],da=dot(n,a)-h,db=dot(n,b)-h;if(da<=m.eps*.1)polygon.push(a);if((da<0)!==(db<0))polygon.push(add(a,mul(sub(b,a),da/(da-db))));}
      for(let j=1;j+1<polygon.length;j++)out.addFace([polygon[0],polygon[j],polygon[j+1]],m,t.pigment,t.side);
      if(polygon.length!==3||polygon.some((p,i)=>p!==t.p[i]))clipped++;
    }
    const segments=sectionSegments(m,n,h);
    if(m.closed){const loops=contours(segments,m.eps*2);for(const p of facesFromContours(loops,n)){out.addFace(p,m,[186,74,51].map(v=>linear(v/255)));caps++;}}
    else if(segments.length)open++;
  }
  return {faces:out.faces,diagnostics:{plane:{normal:n,offset:h,anchor:cast.length?'cast':'scene'},caps,clipped,uncappedOpenMeshes:open}};
}

// BVH prunes point and clearance predicates but never substitutes a voxel or
// bounding-box inside test for the actual triangle solid.
function tree(triangles){
  const b={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};for(const t of triangles)for(let k=0;k<3;k++){b.min[k]=Math.min(b.min[k],t.min[k]);b.max[k]=Math.max(b.max[k],t.max[k]);}
  if(triangles.length<=16)return {...b,triangles};
  const axis=b.max.map((v,i)=>v-b.min[i]).indexOf(extent(b)),sorted=[...triangles].sort((a,b)=>(a.min[axis]+a.max[axis])-(b.min[axis]+b.max[axis])),mid=sorted.length>>1;
  return {...b,left:tree(sorted.slice(0,mid)),right:tree(sorted.slice(mid))};
}
function rayBox(node,p,d){let near=0,far=Infinity;for(let k=0;k<3;k++){if(Math.abs(d[k])<1e-15){if(p[k]<node.min[k]||p[k]>node.max[k])return false;continue;}let a=(node.min[k]-p[k])/d[k],b=(node.max[k]-p[k])/d[k];if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return false;}return far>=0;}
function rayCandidates(node,p,d,out){if(!rayBox(node,p,d))return;if(node.triangles)for(const t of node.triangles)out.add(t);else{rayCandidates(node.left,p,d,out);rayCandidates(node.right,p,d,out);}}
function boxCandidates(node,b,out){if(!overlap(node,b))return;if(node.triangles)for(const t of node.triangles)if(overlap(t,b))out.push(t);else{}else{boxCandidates(node.left,b,out);boxCandidates(node.right,b,out);}}

export function buildConjureLattice(snapshot){
  const meshes=prepareMeshes(snapshot),out=builder(),sizes=ownerSizes(meshes),directions=[[1,.317,.113],[.173,1,.419],[.271,.137,1]].map(norm);let bars=0,retained=0,transformed=0;
  for(const m of meshes){
    // Original study retains sheets and fine plant/support details; only bodies
    // with an actual closed volume can acquire internal bars.
    if(m.id===1||!m.closed||m.size<sizes.get(m.id)*.055){out.retain(m);retained++;continue;}
    transformed++;const pitch=Math.max(m.size/7,sizes.get(m.id)/24),half=pitch*(.012/.28),tol=1e-9,
      center=m.min.map((v,k)=>v+(m.max[k]-v)/2),local=p=>p.map((v,k)=>(v-center[k])/m.size),
      clearance=Math.sqrt(3)*half/m.size+tol,
      normalized=m.triangles.map((t,i)=>triangle(t.p.map(local),m.id,i)),spatial=tree(normalized),nodes=new Map();
    // The source predicates compare both lengths and dimensionless angles /
    // barycentrics to their tolerance. A unit-sized body keeps those tests
    // meaningful from macro subjects through astronomical world coordinates.
    // Only predicates are normalized: emitted bars retain original positions.
    const inside=p=>{const key=p.join(',');if(nodes.has(key))return nodes.get(key);const q=local(p),candidates=new Set();for(const d of directions)rayCandidates(spatial,q,d,candidates);const value=classifyPoint(q,[...candidates],directions,tol).inside;nodes.set(key,value);return value;};
    const ranges=m.min.map((v,k)=>[Math.floor(v/pitch),Math.ceil(m.max[k]/pitch)]);
    for(let x=ranges[0][0];x<ranges[0][1];x++)for(let y=ranges[1][0];y<ranges[1][1];y++)for(let z=ranges[2][0];z<ranges[2][1];z++){
      const a=[x+.5,y+.5,z+.5].map(v=>v*pitch);if(!inside(a))continue;
      for(let dx=0;dx<2;dx++)for(let dy=0;dy<2;dy++)for(let dz=0;dz<2;dz++){
        const b=[x+dx,y+dy,z+dz].map(v=>v*pitch);if(!inside(b))continue;
        const qa=local(a),qb=local(b),box={min:qa.map((v,k)=>Math.min(v,qb[k])-clearance),max:qa.map((v,k)=>Math.max(v,qb[k])+clearance)},near=[];boxCandidates(spatial,box,near);
        if(near.length&&segmentBoundaryDistance(qa,qb,near,tol).distance<=clearance)continue;
        out.bar(a,b,half,m);bars++;
      }
    }
  }
  return {faces:out.faces,diagnostics:{bars,retainedMeshes:retained,transformedMeshes:transformed}};
}

function projectCamera(snapshot,p,N){const v=tf(snapshot.view,p),P=snapshot.projection,w=P[3]*v[0]+P[7]*v[1]+P[11]*v[2]+P[15],q=tf(P,v);return [(q[0]/w+1)*N/2,(1-q[1]/w)*N/2,-v[2],w];}
function raster(faces,project,N,cameraSide=false,near=-Infinity,far=Infinity){
  const depth=new Float64Array(N*N);depth.fill(Infinity);const owner=new Int32Array(N*N);owner.fill(-1);
  for(let i=0;i<faces.length;i++){
    const f=faces[i];let polygon=f.p;
    // Clip in source space before perspective division; a triangle crossing
    // the near plane must retain its visible portion instead of vanishing.
    for(const [boundary,sign]of [[near,1],[far,-1]]){
      if(!Number.isFinite(boundary))continue;const clipped=[];
      for(let k=0;k<polygon.length;k++){
        const a=polygon[k],b=polygon[(k+1)%polygon.length],da=(project(a)[2]-boundary)*sign,db=(project(b)[2]-boundary)*sign;
        if(da>=0)clipped.push(a);if((da<0)!==(db<0))clipped.push(add(a,mul(sub(b,a),da/(da-db))));
      }
      polygon=clipped;if(!polygon.length)break;
    }
    for(let piece=1;piece+1<polygon.length;piece++){
    const p=[polygon[0],polygon[piece],polygon[piece+1]].map(project);if(p.some(v=>!v.every(Number.isFinite)||v[3]<=0))continue;
    const [a,b,c]=p,den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-14)continue;
    // In top-down pixels, outward front faces have negative signed area.
    if(cameraSide&&f.side!==2&&((f.side===0&&den>0)||(f.side===1&&den<0)))continue;
    const x0=Math.max(0,Math.ceil(Math.min(a[0],b[0],c[0])-.5)),x1=Math.min(N-1,Math.floor(Math.max(a[0],b[0],c[0])-.5)),y0=Math.max(0,Math.ceil(Math.min(a[1],b[1],c[1])-.5)),y1=Math.min(N-1,Math.floor(Math.max(a[1],b[1],c[1])-.5));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const u=((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/den,v=((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/den,t=1-u-v;if(u< -1e-10||v< -1e-10||t< -1e-10)continue;
      const inv=u/a[3]+v/b[3]+t/c[3],z=(u*a[2]/a[3]+v*b[2]/b[3]+t*c[2]/c[3])/inv,at=y*N+x;
      if(z<depth[at]){depth[at]=z;owner[at]=i;}
    }
    }
  }
  return {depth,owner};
}

export function prepareConjureProxy(snapshot,lighting,materialColor,kind){
  const built=kind==='section-ribs'?buildConjureSectionRibs(snapshot):kind==='single-cutaway'?buildConjureCutaway(snapshot):buildConjureLattice(snapshot),faces=built.faces,size=snapshot.size,N=size*2;
  if(!faces.length)throw Error(`No source triangles for ${kind}`);
  const directional=(lighting?.directional||[]).slice(0,2).map(l=>({direction:norm(l.direction),color:l.color}));
  // An ambient-only world has no direct irradiance; keep it ambient-only.
  if(!directional.length)directional.push({direction:[0,1,0],color:[0,0,0]});
  if(directional.length===1)directional.push({direction:mul(directional[0].direction,-1),color:[0,0,0]});
  const key=directional[0].direction,[sx,sy]=planeBasis(key),b={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
  for(const f of faces)for(const p of f.p){const q=[dot(p,sx),dot(p,sy),-dot(p,key)];for(let k=0;k<3;k++){b.min[k]=Math.min(b.min[k],q[k]);b.max[k]=Math.max(b.max[k],q[k]);}}
  const span=b.max.map((v,k)=>Math.max(v-b.min[k],1e-8)),SZ=Math.max(256,Math.min(1536,size*2));
  const shadowProject=p=>[(dot(p,sx)-b.min[0])/span[0]*(SZ-2)+1,(dot(p,sy)-b.min[1])/span[1]*(SZ-2)+1,-dot(p,key),1];
  const projection=snapshot.projection,perspective=projection[11]!==0,
    near=snapshot.near??(perspective?projection[14]/(projection[10]-1):(projection[14]+1)/projection[10]),
    far=snapshot.far??(perspective?projection[14]/(projection[10]+1):(projection[14]-1)/projection[10]);
  const shadow=raster(faces.filter(f=>f.castShadow),shadowProject,SZ),view=raster(faces,p=>projectCamera(snapshot,p,N),N,true,near,far),groups=[],groupMap=new Map(),faceGroups=new Uint32Array(faces.length),cameraDir=norm([snapshot.view[2],snapshot.view[6],snapshot.view[10]]);
  for(let i=0;i<faces.length;i++){
    const f=faces[i],pigment=finite(f.pigment,3)?f.pigment:materialColor(f.id).map(v=>linear(v/255));let n=f.normal;if(dot(n,cameraDir)<0)n=mul(n,-1);
    const group=[...pigment.map(v=>Math.max(0,Math.min(1,v))),...directional.map(l=>Math.max(0,dot(n,l.direction)))],k=group.map(v=>v.toPrecision(9)).join(',');
    if(!groupMap.has(k)){groupMap.set(k,groups.length/5);groups.push(...group);}faceGroups[i]=groupMap.get(k);
  }
  const slopes=new Float64Array(faces.length*2);
  for(let i=0;i<faces.length;i++){
    const [a,b,c]=faces[i].p.map(shadowProject),den=(b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]);
    if(Math.abs(den)>1e-14){
      slopes[i*2]=((b[2]-a[2])*(c[1]-a[1])-(c[2]-a[2])*(b[1]-a[1]))/den;
      slopes[i*2+1]=((b[0]-a[0])*(c[2]-a[2])-(c[0]-a[0])*(b[2]-a[2]))/den;
    }
  }
  const samples=new Uint32Array(N*N),P=snapshot.projection,V=snapshot.view,bias=Math.max(...span)*.00002;
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const at=y*N+x,fi=view.owner[at];if(fi<0)continue;const f=faces[fi],d=view.depth[at],perspective=Math.abs(P[15])<1e-12;
    const camera=[((x+.5)/N*2-1-(perspective?-P[8]:P[12]))*(perspective?d:1)/P[0],(1-(y+.5)/N*2-(perspective?-P[9]:P[13]))*(perspective?d:1)/P[5],-d],r=camera.map((v,k)=>v-V[12+k]),world=[0,1,2].map(k=>V[k*4]*r[0]+V[k*4+1]*r[1]+V[k*4+2]*r[2]),q=shadowProject(world),ix=Math.floor(q[0]),iy=Math.floor(q[1]);
    const corrected=q[2]+slopes[fi*2]*(ix+.5-q[0])+slopes[fi*2+1]*(iy+.5-q[1]);
    let lit=1;if(ix>=0&&iy>=0&&ix<SZ&&iy<SZ&&corrected>shadow.depth[iy*SZ+ix]+bias)lit=0;
    samples[at]=faceGroups[fi]*2+lit+1;
  }
  return {version:1,model:`conjure-${kind}-v1`,size,samples,groups:Float64Array.from(groups),colors:Float64Array.from(directional.flatMap(l=>l.color))};
}

export function validateConjureProxyField(field,kind){
  const keys=['version','model','size','samples','groups','colors'];
  if(!field||Object.keys(field).length!==6||keys.some(k=>!Object.hasOwn(field,k))||field.version!==1||field.model!==`conjure-${kind}-v1`||!Number.isInteger(field.size)||field.size<1||field.size>720||!(field.samples instanceof Uint32Array)||field.samples.length!==4*field.size**2||!(field.groups instanceof Float64Array)||field.groups.length%5||!(field.colors instanceof Float64Array)||field.colors.length!==6)throw Error('Invalid Conjure proxy field');
  const arrays=[field.samples,field.groups,field.colors];
  if(arrays.some(a=>a.byteOffset!==0||a.byteLength!==a.buffer.byteLength)||new Set(arrays.map(a=>a.buffer)).size!==3||field.samples.some(v=>v>field.groups.length/5*2)||field.groups.some(v=>!Number.isFinite(v)||v<0||v>1+1e-10)||field.colors.some(v=>!Number.isFinite(v)||v<0||v>100))throw Error('Invalid Conjure proxy field values');
  return field;
}
export function renderConjureProxy(field,strength=.6){
  const kind=field.model.slice(8,-3);validateConjureProxyField(field,kind);
  const contrast=kind==='section-ribs'?strength:.6,ambient=Math.max(0,Math.min(1,.32+.8*(.6-contrast))),direct=(.68+.8*(contrast-.6))/4.5,{size,samples,groups,colors}=field,N=size*2,lookup=new Uint8Array((groups.length/5*2+1)*3);lookup.set([229,231,222]);
  for(let g=0;g<groups.length/5;g++)for(let lit=0;lit<2;lit++)for(let c=0;c<3;c++)lookup[(g*2+lit+1)*3+c]=srgb(groups[g*5+c]*(ambient+direct*(colors[c]*groups[g*5+3]*lit+colors[c+3]*groups[g*5+4])));
  const rgba=new Uint8ClampedArray(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const at=y*2*N+x*2,o=(y*size+x)*4;for(let c=0;c<3;c++)rgba[o+c]=Math.round((lookup[samples[at]*3+c]+lookup[samples[at+1]*3+c]+lookup[samples[at+N]*3+c]+lookup[samples[at+N+1]*3+c])/4);rgba[o+3]=255;}
  return rgba;
}
