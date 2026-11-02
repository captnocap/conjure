import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  brush:choice('What brush carries the opaque gouache?',{flat:'Broad flat-brush planes with squared ends.',filbert:'Rounded overlapping filbert strokes.',scrub:'Short stippled scrubbing marks.',rigger:'Narrow directional brush traces.'}),
  drag:score('How dry is the scumbled top layer?',['Smooth fully loaded paint','A little broken colour','Dry strokes skip the tooth','Strong dragging and exposed underpaint','Very dry chalky scumble']),
  ground:choice('What painted ground shows through the strokes?',{cream:'Warm ivory ground.',ochre:'Ochre underpainting.',blue:'Cool slate-blue underpainting.',rose:'Muted rose underpainting.'}),
  pigments:choice('What pigment family leads the image? Designed colours follow the palette.',{earth:'Burnt umber and ochre.',coast:'Deep blue and muted turquoise.',garden:'Olive green and warm yellow.',oxide:'Red oxide and cool grey.'}),
  loading:choice('How is the brush loaded?',{even:'An even opaque load.',edge:'A heavier bead at one edge.',split:'Two colours remain separate on the brush.',thin:'A thinner layer lets the ground influence the colour.'}),
  layering:choice('How are the painted planes built?',{three:'Three broad value planes.',five:'Five stepped value planes.',continuous:'Soft continuous value modelling.',patches:'Small overlapping colour patches.'}),
  direction:choice('Which direction do the brushmarks follow?',{horizontal:'Broad horizontal passages.',vertical:'Long vertical passages.',diagonal:'Slanted diagonal passages.',form:'Brush direction changes with the surface normal.'}),
  surface:choice('What tooth catches the paint?',{smooth:'Smooth illustration board.',rough:'Rough textured watercolour board.',laid:'Subtle parallel laid lines.',canvas:'A fine woven canvas tooth.'}),
  contour:choice('How are form boundaries painted?',{clean:'Clean opaque boundaries.',dry:'Broken dry-brush boundaries.',dark:'A narrow dark painted contour.',light:'A pale scumbled rim catches the edge.'}),
  margins:choice('How does the painted field meet the paper?',{open:'A generous untouched margin.',tape:'A narrow straight tape edge.',ragged:'A rough brush-mark perimeter.',full:'Paint reaches every edge.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const {size,color,identity,normal}=capture,u=size/720,out=new Uint8ClampedArray(color.length);
  const paints={earth:[[68,49,36],[194,151,70]],coast:[[35,64,93],[89,157,156]],garden:[[50,69,44],[170,171,83]],oxide:[[113,47,38],[142,153,153]]}as const;
  const grounds={cream:[236,225,199],ochre:[192,157,103],blue:[132,153,166],rose:[196,151,145]}as const;
  const d=rekey({ink:paints[a.pigments][0],second:paints[a.pigments][1],paper:grounds[a.ground]},context.palette,{ink:'ink',second:'second',paper:'ground'});
  const extents=new Map<number,{x0:number;y0:number;x1:number;y1:number}>();
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const id=identity[(y*size+x)*4];if(id<2)continue;const e=extents.get(id);if(e){e.x0=Math.min(e.x0,x);e.y0=Math.min(e.y0,y);e.x1=Math.max(e.x1,x);e.y1=Math.max(e.y1,y);}else extents.set(id,{x0:x,y0:y,x1:x,y1:y});}
  const at=(x:number,y:number)=>(Math.max(0,Math.min(size-1,Math.round(y)))*size+Math.max(0,Math.min(size-1,Math.round(x))))*4;
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,id=identity[p],xx=x/u,yy=y/u,X=x/size,Y=y/size;
    const angle=a.direction==='horizontal'?0:a.direction==='vertical'?Math.PI/2:a.direction==='diagonal'?.7:Math.atan2(normal[p+1]-128,normal[p]-128);
    const ca=Math.cos(angle),sa=Math.sin(angle),along=xx*ca+yy*sa,across=-xx*sa+yy*ca;
    const extent=extents.get(id),objectScale=extent?Math.max(.18,Math.min(1,Math.sqrt((extent.x1-extent.x0+1)*(extent.y1-extent.y0+1))/u/180)):1;
    const length=Math.max(2,(a.brush==='rigger'?14:a.brush==='scrub'?3:a.brush==='filbert'?9:12)*objectScale),width=Math.max(1.2,(a.brush==='rigger'?1.5:a.brush==='scrub'?3:a.brush==='filbert'?3.8:4)*objectScale);
    const ix=Math.floor(along/length),iy=Math.floor(across/width),ax=(ix+.5)*length,ay=(iy+.5)*width;
    let q=at((ax*ca-ay*sa)*u,(ax*sa+ay*ca)*u);if(identity[q]!==id)q=p;
    const n=hash(Math.floor(xx*1.7),Math.floor(yy*1.7),context.seed),stroke=hash(ix,iy,context.seed+19),grain=hash(Math.floor(xx*.6),Math.floor(yy*.6),context.seed+43);
    const luma=mix((color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255,(color[q]*.2126+color[q+1]*.7152+color[q+2]*.0722)/255,.28);
    const tone=a.layering==='three'?mix(luma,Math.round(luma*3)/3,.4):a.layering==='five'?mix(luma,Math.round(luma*5)/5,.55):a.layering==='patches'?clamp01(luma+(stroke-.5)*.13):luma;
    let tooth=a.surface==='rough'?mix(n,grain,.65):a.surface==='laid'?.5+.12*Math.sin(yy*2.7):a.surface==='canvas'?.5+.07*Math.sin(xx*2.9)*Math.sin(yy*2.9):.47+n*.06;
    const fx=along/length-ix,fy=across/width-iy;
    let strokeEdge=a.brush==='filbert'?clamp01((1-Math.hypot((fx-.5)*1.7,(fy-.5)*1.8))*3):a.brush==='scrub'?.6+.4*grain:a.brush==='rigger'?.72+.28*Math.sin(fy*Math.PI):.85+.15*Math.sin(fx*Math.PI);
    let coverage=(a.loading==='thin'?.8:.98)*(1-a.drag*.34*clamp01((tooth-.35)*2))*strokeEdge;
    if(a.loading==='edge')coverage+=fy>.78?.16:0;
    const step=Math.max(1,Math.round(u)),r=at(x+step,y),b=at(x,y+step),edge=identity[r]!==id||identity[b]!==id||Math.abs(normal[p]-normal[r])+Math.abs(normal[p+1]-normal[r+1])>70;
    if(a.contour==='dry'&&edge)coverage*=.38+n*.6;
    let hue=clamp01((color[q]-color[q+2])/190+.48);if(a.loading==='split')hue=mix(hue,fy>.5?.9:.1,.58);
    let darkness=clamp01((1-tone)*1.22);if(a.contour==='dark'&&edge)darkness=Math.max(.82,darkness);if(a.contour==='light'&&edge)darkness*=.6;
    if(id===0)coverage*=.09;if(id===1)coverage*=.65;
    const margin=Math.min(X,Y,1-X,1-Y),limit=a.margins==='open'?.06:a.margins==='tape'?.025:a.margins==='ragged'?.025+hash(Math.floor(xx/9),Math.floor(yy/9),context.seed+71)*.02:0;
    if(margin<limit)coverage=0;
    for(let c=0;c<3;c++){const huePaint=mix(d.ink[c],d.second[c],hue),paint=mix(247,huePaint,.16+darkness*.84)+(stroke-.5)*7;out[p+c]=mix(d.paper[c]+(tooth-.5)*5,paint,clamp01(coverage));}out[p+3]=255;
   }
  }
  signal.throwIfAborted();return{pixels:out,notes:[`${a.brush} gouache with ${a.layering} value modelling`,`${a.direction} scumbled strokes over ${a.ground} underpaint`]};
 }
});
