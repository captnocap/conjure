/* Deterministic, DOM-free convex-polygon area coverage. Pixel squares are
 * integrated exactly, then rounded to 8-bit coverage. No source values enter. */
function validatePolygon(vertices){
  if(!Array.isArray(vertices)||vertices.length<3||vertices.length>8||vertices.some(p=>!Array.isArray(p)||p.length!==2||!p.every(v=>Number.isFinite(v)&&Math.abs(v)<=4096)))throw new TypeError('Expected a bounded finite polygon with 3–8 vertices');
}
export function polygonBounds(vertices, size) {
  validatePolygon(vertices);if(!Number.isInteger(size)||size<1||size>720)throw new RangeError('Invalid raster size');
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const [x,y] of vertices){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  return [Math.max(0,Math.min(size,Math.floor(x0)-1)),Math.max(0,Math.min(size,Math.floor(y0)-1)),Math.max(0,Math.min(size,Math.ceil(x1)+1)),Math.max(0,Math.min(size,Math.ceil(y1)+1))];
}
export function insidePolygon(x,y,poly){
  let yes=false;
  for(let a=0,b=poly.length-1;a<poly.length;b=a++){
    const A=poly[a],B=poly[b];
    if((A[1]>y)!==(B[1]>y)&&x<(B[0]-A[0])*(y-A[1])/(B[1]-A[1])+A[0])yes=!yes;
  }
  return yes;
}
function clip(poly,axis,bound,greater){
  const result=[];
  for(let j=0,k=poly.length-1;j<poly.length;k=j++){
    const a=poly[k],b=poly[j],da=a[axis]-bound,db=b[axis]-bound;
    const ai=greater?da>=0:da<=0,bi=greater?db>=0:db<=0;
    if(ai!==bi){const t=da/(da-db);result.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
    if(bi)result.push(b);
  }
  return result;
}
export function rasterizeConvex(vertices,bounds){
  validatePolygon(vertices);
  if(!bounds||bounds.length!==4||!bounds.every(v=>Number.isSafeInteger(v)&&v>=0&&v<=720))throw new TypeError('Expected integer raster bounds');
  const [x0,y0,x1,y1]=bounds,w=x1-x0,h=y1-y0;
  if(w<0||h<0||w>720||h>720)throw new RangeError('Raster bounds exceed 720');
  let area=0;for(let j=0,k=vertices.length-1;j<vertices.length;k=j++)area+=vertices[k][0]*vertices[j][1]-vertices[j][0]*vertices[k][1];
  if(!area)throw new RangeError('Polygon area must be nonzero');
  const sign=area>=0?1:-1,edges=vertices.map((a,j)=>{const b=vertices[(j+1)%vertices.length],dx=b[0]-a[0],dy=b[1]-a[1];if(!dx&&!dy)throw new TypeError('Polygon has a zero-length edge');return {a,dx:dx*sign,dy:dy*sign};});
  for(let i=0;i<vertices.length;i++){const a=vertices[i],b=vertices[(i+1)%vertices.length];for(const c of vertices)if(sign*((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])) < -1e-9)throw new TypeError('Polygon must be convex and non-self-intersecting');}
  const alpha=new Uint8Array(w*h);
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    let full=true,outside=false;
    for(const {a,dx,dy} of edges){const v=dx*(y-a[1])-dy*(x-a[0]),lo=v+Math.min(0,dx)+Math.min(0,-dy),hi=v+Math.max(0,dx)+Math.max(0,-dy);if(hi<=0){outside=true;break;}if(lo<0)full=false;}
    if(outside)continue;
    const i=(y-y0)*w+x-x0;if(full){alpha[i]=255;continue;}
    let p=vertices.map(a=>[a[0]-x,a[1]-y]);
    p=clip(clip(clip(clip(p,0,0,true),0,1,false),1,0,true),1,1,false);
    let sum=0;for(let j=0,k=p.length-1;j<p.length;k=j++)sum+=p[k][0]*p[j][1]-p[j][0]*p[k][1];
    alpha[i]=Math.round(Math.max(0,Math.min(1,Math.abs(sum)*.5))*255);
  }
  return alpha;
}
