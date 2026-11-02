import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  mesh:choice('What visible surface lattice is drawn?',{quad:'A square quadrilateral lattice.',tri:'A triangulated lattice.',diamond:'A slanted diamond lattice.',contour:'Nested contour-like strips follow the surface normals.'}),
  density:score('How closely are the lattice lines spaced?',['A few broad surface divisions','Widely spaced grid cells','A moderate mesh','Fine closely spaced cells','A dense technical mesh']),
  ink:choice('What line ink is used? Designed colours follow the palette.',{blue:'Deep technical blue.',black:'Dark graphite black.',cyan:'Pale cyan technical lines.',orange:'Warm orange technical lines.'}),
  ground:choice('What background carries the wire drawing?',{white:'Clean white drafting paper.',blue:'Dark blueprint blue.',grey:'Pale neutral grey.',black:'Nearly black technical display.'}),
  faces:choice('How much face shading remains behind the lines?',{clear:'Only the visible wire lines.',wash:'A pale tonal wash behind each surface.',solid:'Quiet solid grey surface fills.',hatch:'Sparse hatching describes shadowed planes.'}),
  contours:choice('How strongly are visible silhouettes outlined?',{thin:'Fine silhouettes like the internal mesh.',strong:'Heavier external silhouettes.',broken:'Dashed silhouette segments.',double:'A narrow secondary contour follows the main outline.'}),
  creases:choice('Which surface creases are retained?',{few:'Only sharp major creases.',normal:'Moderate surface changes.',many:'Fine surface changes and details.',tonal:'Strong tonal edges join the surface creases.'}),
  depth:choice('How do distant lines differ?',{even:'Equal line strength at every depth.',fade:'Farther lines grow paler.',bands:'Three distinct distance weights.',tint:'Distance shifts the line ink toward the secondary tone.'}),
  warp:choice('How does the lattice follow the visible surface?',{screen:'A straight screen-aligned lattice.',normal:'Surface normals gently bend the lattice.',strong:'Strong normal-driven surface wrapping.',stepped:'A coarsely stepped normal grid.'}),
  frame:choice('What drafting surround is present?',{plain:'An unmarked open margin.',rule:'A thin rectangular frame.',corners:'Small corner registration marks.',graticule:'A pale background calibration grid.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color,normal,identity,depth}=capture,u=size/720,out=new Uint8ClampedArray(color.length),step=Math.max(1,Math.round(u));
  const inks={blue:[32,65,122],black:[31,35,39],cyan:[128,221,230],orange:[225,132,55]}as const,grounds={white:[247,246,236],blue:[23,43,77],grey:[216,221,217],black:[12,18,23]}as const;
  const d=rekey({ink:inks[a.ink],paper:grounds[a.ground],second:[106,140,149]},context.palette,{ink:'ink',paper:'ground',second:'second'});
  const contrast=d.ink.reduce((n,v,i)=>n+Math.abs(v-d.paper[i]),0),lineInk=Array.from(d.ink);if(contrast<180)for(let c=0;c<3;c++)lineInk[c]=d.paper[c]>128?Math.max(0,d.ink[c]-75):Math.min(255,d.ink[c]+95);
  const at=(x:number,y:number)=>(Math.max(0,Math.min(size-1,Math.round(y)))*size+Math.max(0,Math.min(size-1,Math.round(x))))*4;
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,id=identity[p],r=at(x+step,y),b=at(x,y+step),xx=x/u,yy=y/u,X=x/size,Y=y/size;
    const warp=a.warp==='screen'?0:a.warp==='normal'?12:a.warp==='strong'?29:18,nx=a.warp==='stepped'?Math.round(normal[p]/32)*32:normal[p],ny=a.warp==='stepped'?Math.round(normal[p+1]/32)*32:normal[p+1];
    const sx=xx+(nx/255-.5)*warp,sy=yy+(ny/255-.5)*warp,pitch=mix(34,8,a.density);
    const gx=sx/pitch,gy=sy/pitch,threshold=.045;
    const distance=(v:number)=>Math.abs(Math.sin(v*Math.PI));
    let mesh=a.mesh==='diamond'?Math.min(distance((gx+gy)*.707),distance((gx-gy)*.707)):a.mesh==='contour'?distance(gy+(normal[p+2]/255)*3):Math.min(distance(gx),distance(gy));if(a.mesh==='tri')mesh=Math.min(mesh,distance(gx+gy));
    let line=id>1?clamp01((threshold-mesh)*24)*.65:0;
    const normalDelta=Math.abs(normal[p]-normal[r])+Math.abs(normal[p+1]-normal[r+1])+Math.abs(normal[p+2]-normal[r+2])+Math.abs(normal[p]-normal[b])+Math.abs(normal[p+1]-normal[b+1]);
    const limit=a.creases==='few'?100:a.creases==='many'?27:57,tonal=Math.abs(color[p]-color[r])+Math.abs(color[p+1]-color[r+1])+Math.abs(color[p+2]-color[r+2]);
    if(id>0&&(normalDelta>limit||a.creases==='tonal'&&tonal>105))line=Math.max(.7,line);
    const edge=id!==identity[r]||id!==identity[b];if(edge){let contour=a.contours==='thin'?.7:1;if(a.contours==='broken')contour*=Math.floor((xx+yy)/5)%2?.2:1;line=Math.max(line,contour);}
    if(a.contours==='double'&&id>0&&identity[at(x+3*step,y+3*step)]!==id)line=Math.max(line,.5);
    const z=clamp01(depth[p]/255+depth[p+1]/65025);if(a.depth==='fade')line*=1-z*.65;if(a.depth==='bands')line*=1-Math.min(2,Math.floor(z*3))*.23;
    const lum=(color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255;let fill=id===0?0:a.faces==='clear'?0:a.faces==='wash'?(1-lum)*.15:a.faces==='solid'?.08+(1-lum)*.23:Math.abs(Math.sin((xx+yy)*1.1))<.12?(1-lum)*.3:0;
    if(id===1){line*=.55;fill*=.5;}
    const margin=Math.min(X,Y,1-X,1-Y);if(margin<.035){line=0;fill=0;}
    if(a.frame==='rule'&&Math.abs(margin-.027)<.0012)line=.6;
    if(a.frame==='corners'&&((X<.065||X>.935)&&(Math.abs(Y-.06)<.0013||Math.abs(Y-.94)<.0013)||(Y<.065||Y>.935)&&(Math.abs(X-.06)<.0013||Math.abs(X-.94)<.0013)))line=.65;
    if(a.frame==='graticule'&&id===0&&(distance(X*20)<.035||distance(Y*20)<.035))line=.09;
    for(let c=0;c<3;c++){const ink=mix(lineInk[c],d.second[c],a.depth==='tint'?z*.7:0),paper=mix(d.paper[c],ink,fill);out[p+c]=mix(paper,ink,clamp01(line));}out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.mesh} schematic visible-surface lattice`,`${a.warp} wrapping with ${a.depth} depth weights; hidden surfaces omitted`]};
 }
});
