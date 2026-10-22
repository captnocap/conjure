// Verbatim rasterSectionRibDepth extracted from the unchanged production source.
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

