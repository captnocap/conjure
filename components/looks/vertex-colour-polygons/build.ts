import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  mesh:choice('What polygonal colour cells describe the image?',{triangles:'Alternating triangular facets.',quads:'Broad quadrilateral colour planes.',fan:'Four triangular sectors meet in each cell.',stagger:'Staggered triangular colour planes.'}),
  size:score('How large are the polygonal facets?',['Small fine facets','Modest polygonal planes','Broad visible facets','Large low-polygon planes','Very coarse sculpted planes']),
  lighting:choice('How is each colour plane lit?',{flat:'One flat light value per facet.',vertex:'A small vertex-like light gradient crosses each facet.',banded:'Stepped light bands describe each plane.',soft:'Facets retain some smooth scene illumination.'}),
  colour:choice('How are the surface colours treated? Designed colours follow the palette.',{source:'Retain the scene colour family.',muted:'Quiet desaturated colours.',vivid:'Strong saturated game colours.',mono:'One dark-to-light colour ramp.'}),
  levels:choice('How many value steps colour the facets?',{four:'Four broad value levels.',eight:'Eight distinct value levels.',sixteen:'Sixteen fine value levels.',continuous:'Continuous values within each plane.'}),
  outline:choice('What edges surround the colour planes?',{none:'No drawn polygon edges.',outer:'Dark outer object contours.',mesh:'A fine dark mesh around the facets.',light:'Fine pale polygon seams.'}),
  jitter:choice('How regular is the facet layout?',{even:'An even geometric tessellation.',shift:'Alternating rows are slightly offset.',warp:'A gently warped irregular grid.',slant:'A slanted grid of planes.'}),
  texture:choice('What display texture covers the planes?',{clean:'Clean flat colour.',dither:'A light ordered pixel dither.',grain:'Fine restrained colour grain.',scan:'Faint horizontal display lines.'}),
  depth:choice('How does distance affect the planes?',{even:'Equal colour strength at every depth.',mist:'Distant colours fade toward the background.',contrast:'Distant planes have softer contrast.',bands:'Three depth bands use different brightness.'}),
  backdrop:choice('What surrounds the polygon image?',{plain:'A plain light field.',dark:'A dark neutral field.',gradient:'A soft vertical background gradient.',grid:'A pale geometric background grid.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color,normal,identity,depth}=capture,u=size/720,out=new Uint8ClampedArray(color.length),step=Math.max(1,Math.round(u)),baseSpan=mix(4,18,a.size);
  const d=rekey({ink:[42,55,77],second:[177,110,72],light:[224,228,216],paper:a.backdrop==='dark'?[28,34,43]:[229,232,222]},context.palette,{ink:'ink',second:'second',light:'ground',paper:'ground'});
  const bounds=new Map<number,{minX:number,maxX:number,minY:number,maxY:number}>();
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const id=identity[(y*size+x)*4];if(id<2)continue;const box=bounds.get(id);if(box){box.minX=Math.min(box.minX,x);box.maxX=Math.max(box.maxX,x);box.minY=Math.min(box.minY,y);box.maxY=Math.max(box.maxY,y);}else bounds.set(id,{minX:x,maxX:x,minY:y,maxY:y});}
  const spans=new Map<number,number>();for(const[id,b]of bounds)spans.set(id,baseSpan*Math.max(.28,Math.min(1,Math.sqrt((b.maxX-b.minX+1)*(b.maxY-b.minY+1))/u/140)));
  const at=(x:number,y:number)=>(Math.max(0,Math.min(size-1,Math.round(y)))*size+Math.max(0,Math.min(size-1,Math.round(x))))*4;
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,id=identity[p],xx=x/u,yy=y/u,X=x/size,Y=y/size;
    const span=spans.get(id)??baseSpan;
    let gx=xx/ span,gy=yy/span;if(a.jitter==='warp'){gx+=Math.sin(yy*.022)*.18;gy+=Math.sin(xx*.023)*.15;}if(a.jitter==='slant')gx+=gy*.23;
    const row=Math.floor(gy),offset=a.mesh==='stagger'?.5*(row%2):a.jitter==='shift'?.23*(row%2):0;gx+=offset;
    const col=Math.floor(gx),fx=gx-col,fy=gy-row,upper=(col+row)%2?fx+fy<1:fx>fy;
    let cx=.5,cy=.5,seam=Math.min(fx,1-fx,fy,1-fy);
    if(a.mesh!=='quads'){if(a.mesh==='fan'){if(Math.abs(fx-.5)>Math.abs(fy-.5)){cx=fx>.5?.83:.17;cy=.5;}else{cx=.5;cy=fy>.5?.83:.17;}seam=Math.min(seam,Math.abs(Math.abs(fx-.5)-Math.abs(fy-.5))*.7);}else{cx=upper?2/3:1/3;cy=(col+row)%2?(upper?1/3:2/3):(upper?1/3:2/3);seam=Math.min(seam,((col+row)%2?Math.abs(fx+fy-1):Math.abs(fx-fy))*.7);}}
    let sx=(col+cx-offset)*span,sy=(row+cy)*span;if(a.jitter==='slant')sx-=(row+cy)*.23*span;if(a.jitter==='warp'){sx-=Math.sin(yy*.022)*.18*span;sy-=Math.sin(xx*.023)*.15*span;}
    let q=at(sx*u,sy*u);if(identity[q]!==id||Math.abs(normal[q]-normal[p])+Math.abs(normal[q+1]-normal[p+1])+Math.abs(normal[q+2]-normal[p+2])>95)q=p;
    const source=[mix(color[q],color[p],.35),mix(color[q+1],color[p+1],.35),mix(color[q+2],color[p+2],.35)],lum=(source[0]*.2126+source[1]*.7152+source[2]*.0722)/255;
    const nx=normal[q]/127.5-1,ny=normal[q+1]/127.5-1,nz=normal[q+2]/127.5-1,light=clamp01(-nx*.22-ny*.3+nz*.65+.25);
    let shading=a.lighting==='flat'?.8+light*.28:a.lighting==='vertex'?.78+light*.25+(fx-fy)*.12:a.lighting==='banded'?.78+Math.round(light*3)/3*.3:1;
    if(a.lighting==='soft')for(let c=0;c<3;c++)source[c]=mix(source[c],color[p+c],.58);
    const z=clamp01(depth[p]/255+depth[p+1]/65025),n=hash(Math.floor(xx),Math.floor(yy),context.seed),levels=a.levels==='four'?4:a.levels==='eight'?8:a.levels==='sixteen'?16:0;
    const outer=identity[at(x+step,y)]!==id||identity[at(x,y+step)]!==id,line=a.outline==='outer'&&outer||a.outline==='mesh'&&(outer||seam<.025)||a.outline==='light'&&seam<.022;
    for(let c=0;c<3;c++){
      let v=source[c];if(a.colour==='muted')v=mix(v,lum*255,.6);if(a.colour==='vivid')v=lum*255+(v-lum*255)*1.5;if(a.colour==='mono'||context.palette){
        const value=levels?Math.round(clamp01(lum*shading)*(levels-1))/(levels-1):clamp01(lum*shading);
        v=mix(d.ink[c],d.light[c],value);
        if(context.palette&&a.colour!=='mono')v=mix(v,d.second[c],clamp01((source[0]-source[2])/255)*.45);
      }else{v*=shading;if(levels)v=Math.round(v/255*(levels-1))/(levels-1)*255;}
      if(a.depth==='mist')v=mix(v,d.paper[c],z*.5);if(a.depth==='contrast')v=mix(v,lum*255,z*.45);if(a.depth==='bands')v*=1-Math.min(2,Math.floor(z*3))*.075;
      if(a.texture==='dither')v+=((Math.floor(xx)+Math.floor(yy))%2?4:-4);if(a.texture==='grain')v+=(n-.5)*9;if(a.texture==='scan'&&Math.floor(yy)%3===0)v*=.92;
      if(id===0){v=d.paper[c];if(a.backdrop==='gradient')v=mix(v,d.second[c],Y*.16);if(a.backdrop==='grid'&&(Math.abs(Math.sin(X*40*Math.PI))<.09||Math.abs(Math.sin(Y*40*Math.PI))<.09))v=mix(v,d.ink[c],.13);}
      if(id>0&&line)v=a.outline==='light'?mix(v,245,.46):mix(v,d.ink[c],.65);out[p+c]=v;
    }out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.mesh} polygonal colour cells with ${a.lighting} lighting`,`${a.colour} colours, ${a.levels} levels and ${a.jitter} tessellation`]};
 }
});
