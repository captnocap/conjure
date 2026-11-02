import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  tool:choice('What engraving tool cuts the endgrain?',{burin:'A fine burin makes hairline white cuts.',tint:'A tint tool lays close parallel cuts.',spit:'A spitsticker makes swelling tapered cuts.',round:'A round graver makes broad scooped cuts.'}),
  direction:choice('How do the primary white cuts run?',{vertical:'Upright cuts follow the image height.',diagonal:'Regular diagonal cuts run across the forms.',contour:'Cuts turn with the surface orientation.',curved:'Gently curved cuts sweep across the image.'}),
  density:score('How closely is the block engraved?', ['Open widely spaced cuts','Spare engraving','An even network of lines','Dense detailed engraving','Very close fine engraving']),
  crossing:choice('How is the secondary hatching used?',{single:'One main family of cuts.',cross:'Crossed cuts open the brighter planes.',mesh:'Three directions create a fine luminous mesh.',dots:'Small stippled pinpricks open the lightest areas.'}),
  outline:choice('How do object outlines meet the dark block?',{black:'Strong black contour lines retain the silhouette.',white:'Thin white keylines open the silhouette.',broken:'Broken white cuts feather the contours.',plain:'The tonal cuts run directly to each boundary.'}),
  grain:choice('What traces of the wooden block remain?',{smooth:'A smooth polished boxwood block.',rings:'Very faint curved endgrain growth rings.',checks:'A few thin radial drying checks.',pores:'Small printed pores interrupt the ink.'}),
  ink:choice('What ink is rolled onto the block? Designed colours follow the palette.',{black:'Deep warm black.',blue:'Dark blue-black.',brown:'Rich brown-black.',green:'Very dark forest-green ink.'}),
  paper:choice('What paper carries the impression?',{ivory:'Smooth ivory paper.',white:'Bright white paper.',buff:'Warm buff book paper.',fibres:'Cream paper with visible fibres.'}),
  rolling:choice('How much ink is on the block?',{even:'An even clean ink film.',dry:'A dry roller leaves small pale skips.',heavy:'Heavy ink narrows the finest white cuts.',patchy:'Slightly uneven rolling creates broad pale passages.'}),
  border:choice('How is the engraving framed?',{line:'A fine ruled black frame.',double:'A pair of thin ruled frames.',vignette:'The image fades into a hand-cut vignette.',bleed:'The engraving continues to all four edges.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color,normal,identity}=capture,u=size/720,out=new Uint8ClampedArray(color.length),step=Math.max(1,Math.round(u));
  const inks={black:[31,31,27],blue:[25,40,57],brown:[64,43,27],green:[30,48,37]} as const,papers={ivory:[241,232,210],white:[248,246,235],buff:[223,202,165],fibres:[235,224,199]} as const;
  const d=rekey({ink:inks[a.ink],paper:papers[a.paper]},context.palette,{ink:'ink',paper:'ground'});
  const regions=new Map<number,[number,number,number,number]>();for(let y=0;y<size;y++)for(let x=0;x<size;x++){const id=identity[(y*size+x)*4];if(!id)continue;const b=regions.get(id);if(b){b[0]=Math.min(b[0],x);b[1]=Math.max(b[1],x);b[2]=Math.min(b[2],y);b[3]=Math.max(b[3],y);}else regions.set(id,[x,x,y,y]);}
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,id=identity[p],X=x/size,Y=y/size,xx=x/u,yy=y/u,q=(y*size+Math.min(size-1,x+step))*4,r=(Math.min(size-1,y+step)*size+x)*4;
    const lum=clamp01((color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255),n=hash(Math.floor(xx),Math.floor(yy),context.seed);
    const boundary=id!==identity[q]||id!==identity[r]||Math.abs(normal[p]-normal[q])+Math.abs(normal[p+1]-normal[q+1])+Math.abs(normal[p+2]-normal[q+2])>60;
    const bounds=regions.get(id),extent=bounds?Math.max(bounds[1]-bounds[0],bounds[3]-bounds[2])/u:720;
    const scale=id===1?.92:id===2?.8:Math.max(.38,Math.min(.85,extent/220));
    const spacing=Math.max(1.45,mix(4.8,2.2,a.density)*(a.tool==='tint'?.78:1)*scale);
    const orient=a.direction==='vertical'?xx:a.direction==='diagonal'?xx*.707+yy*.707:a.direction==='curved'?xx+Math.sin(yy*.012)*18:xx*(.6+(normal[p]-128)/510)+yy*(.7+(normal[p+1]-128)/510);
    const phase=(orient/spacing)%1,dist=Math.abs(phase-.5)*2;
    let width=clamp01(lum*.84+(a.tool==='round'?.15:a.tool==='burin'?-.08:0));
    if(a.tool==='spit')width*=.57+.43*Math.sin(yy*.026+xx*.009)**2;
    if(a.rolling==='heavy')width*=.76;
    let cut=dist<width?1:0;
    const cross=Math.abs((((xx*.707-yy*.707)/spacing)%1+1)%1-.5)*2;
    if(a.crossing==='cross'&&cross<Math.max(0,lum-.4)*1.2)cut=1;
    if(a.crossing==='mesh'&&(cross<Math.max(0,lum-.42)||Math.abs((yy/(spacing*.8))%1-.5)*2<Math.max(0,lum-.65)*1.7))cut=1;
    if(a.crossing==='dots'&&n<Math.max(0,lum-.25)*.25)cut=1;
    let ink=(1-cut)*(.76+.24*(1-lum))+cut*(1-lum)*.2;
    if(id===0)ink*=.015;else if(id===1)ink*=.5;
    if(boundary&&id>0){if(a.outline==='black')ink=.95;if(a.outline==='white')ink=.07;if(a.outline==='broken')ink=n>.4?.05:.82;if(a.outline==='plain')ink=Math.max(ink,.23+(1-lum)*.42);}
    const ring=Math.sin(Math.hypot(xx-110,yy-90)*.13);
    if(a.grain==='rings')ink*=.91+.09*ring**2;
    if(a.grain==='checks'&&Math.abs(Math.sin(Math.atan2(yy-250,xx-270)*19))<.026&&Math.hypot(xx-270,yy-250)>90)ink*=.25;
    if(a.grain==='pores'&&n>.96)ink*=.2;
    if(a.rolling==='dry'&&n>.83)ink*=.38;
    if(a.rolling==='patchy')ink*=.7+.3*Math.sin(xx*.012+Math.sin(yy*.013)*2)**2;
    const margin=Math.min(X,Y,1-X,1-Y);
    if(a.border==='vignette'){const radius=Math.hypot((X-.5)/.51,(Y-.5)/.52);ink*=clamp01((1.03-radius)*8+.07*Math.sin(xx*.09));}
    if(a.border==='line'||a.border==='double'){if(margin<.035)ink=0;if(Math.abs(margin-.035)<.0018)ink=.9;if(a.border==='double'&&Math.abs(margin-.042)<.0013)ink=.8;}
    for(let c=0;c<3;c++){let paper=d.paper[c]+(n-.5)*(a.paper==='fibres'?10:1.4);if(a.paper==='fibres'&&hash(Math.floor(xx/4),Math.floor(yy*2),context.seed+91)>.965)paper-=10;out[p+c]=mix(paper,d.ink[c],clamp01(ink));}out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.tool} cuts across endgrain boxwood`,`${a.crossing} ${a.direction} engraving, ${a.rolling} rolling`]};
 }
});
