import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  knife:choice('What knife shape lays down the paint?',{square:'A broad square-ended painting knife.',diamond:'A pointed diamond blade.',round:'A rounded narrow palette knife.',scraper:'A long straight scraping blade.'}),
  width:score('How broad are the paint deposits?',['Small fine deposits','Modest knife strokes','Broad overlapping planes','Large loaded knife marks','Very broad sculpted passages']),
  loading:choice('How heavily is the blade loaded?',{thin:'A thin scraped film.',butter:'A thick buttery load.',broken:'A broken load leaves exposed gaps.',double:'Two colours ride together on the blade.'}),
  blending:choice('How much do adjoining colour planes blend?',{crisp:'Crisp separate planes.',soft:'Softly mixed neighbouring strokes.',marbled:'Marbled streaks within each deposit.',stepped:'Clearly stepped tonal facets.'}),
  pigments:choice('Which pigment family leads? Designed colours follow the palette.',{warm:'Burnt sienna and ochre.',cool:'Deep blue and cool turquoise.',violet:'Dark violet and dusty rose.',green:'Forest green and warm yellow.'}),
  ground:choice('What ground shows between deposits?',{ivory:'Warm ivory priming.',umber:'Dark umber preparation.',blue:'Pale blue-grey ground.',linen:'Unprimed warm linen.'}),
  direction:choice('How does the knife travel across the forms?',{horizontal:'Long horizontal sweeps.',vertical:'Tall vertical pulls.',diagonal:'Diagonal overlapping strokes.',turning:'Strokes turn with the surface planes.'}),
  ridge:choice('What forms at the edge of each deposit?',{smooth:'Soft rounded paint ridges.',sharp:'A sharp raised lip.',beads:'Small beads of excess pigment.',scratched:'Fine grooves scraped through the deposit.'}),
  light:choice('Which raking light reveals the paint relief?',{left:'Light rakes from upper left.',right:'Light rakes from upper right.',top:'Light falls from directly above.',diffuse:'Broad diffuse light softens the relief.'}),
  border:choice('How does the painted canvas end?',{full:'Paint extends to the edges.',margin:'A narrow unpainted margin.',ragged:'Irregular knife strokes end before the edge.',rule:'A fine dark frame surrounds the painting.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color,normal,identity}=capture,u=size/720,out=new Uint8ClampedArray(color.length);
  const tones={warm:[[92,45,28],[204,147,65]],cool:[[31,56,96],[85,161,168]],violet:[[73,43,92],[189,117,141]],green:[[38,66,45],[173,176,78]]}as const;
  const grounds={ivory:[239,229,207],umber:[105,82,63],blue:[168,186,193],linen:[196,174,135]}as const;
  const d=rekey({ink:tones[a.pigments][0],second:tones[a.pigments][1],paper:grounds[a.ground]},context.palette,{ink:'ink',second:'second',paper:'ground'});
  const extents=new Map<number,{x0:number;y0:number;x1:number;y1:number}>();for(let y=0;y<size;y++)for(let x=0;x<size;x++){const id=identity[(y*size+x)*4];if(id<2)continue;const e=extents.get(id);if(e){e.x0=Math.min(e.x0,x);e.y0=Math.min(e.y0,y);e.x1=Math.max(e.x1,x);e.y1=Math.max(e.y1,y);}else extents.set(id,{x0:x,y0:y,x1:x,y1:y});}
  const at=(x:number,y:number)=>(Math.max(0,Math.min(size-1,Math.round(y)))*size+Math.max(0,Math.min(size-1,Math.round(x))))*4;
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,id=identity[p],xx=x/u,yy=y/u,X=x/size,Y=y/size;
    const angle=a.direction==='horizontal'?0:a.direction==='vertical'?Math.PI/2:a.direction==='diagonal'?.68:Math.atan2(normal[p+1]-128,normal[p]-128)*.5;
    const e=extents.get(id),objectScale=e?Math.max(.18,Math.min(1,Math.sqrt((e.x1-e.x0+1)*(e.y1-e.y0+1))/u/180)):1;
    const ca=Math.cos(angle),sa=Math.sin(angle),ax=xx*ca+yy*sa,ay=-xx*sa+yy*ca,span=Math.max(2,mix(5,16,a.width)*objectScale),width=Math.max(1.2,span*(a.knife==='scraper'?.18:a.knife==='round'?.28:.42));
    const row=Math.floor(ay/width),offset=hash(row,7,context.seed)*span,ix=Math.floor((ax+offset)/span),fx=(ax+offset)/span-ix,fy=ay/width-row;
    const sx=(ix+.5)*span-offset,sy=(row+.5)*width;let q=at((sx*ca-sy*sa)*u,(sx*sa+sy*ca)*u);if(identity[q]!==id)q=p;
    const n=hash(Math.floor(xx*2),Math.floor(yy*2),context.seed),stroke=hash(ix,row,context.seed+31);
    let shape=a.knife==='diamond'?1-Math.abs(fx-.5)*1.5-Math.abs(fy-.5)*1.2:a.knife==='round'?1-Math.hypot((fx-.5)*1.8,(fy-.5)*1.8):Math.min(fx,1-fx,fy,1-fy)*3;
    shape=.48+.52*clamp01(shape*2.4+.12);
    const lum=(color[q]*.2126+color[q+1]*.7152+color[q+2]*.0722)/255,original=(color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255;
    const local=mix(lum,original,.68);let tone=a.blending==='soft'?mix(lum,original,.88):a.blending==='stepped'?mix(local,Math.round(local*5)/5,.45):local;
    if(a.blending==='marbled')tone=clamp01(tone+Math.sin(fy*27+fx*4+stroke*6)*.045);
    let coverage=(a.loading==='thin'?.7:.98)*shape;if(a.loading==='broken'&&n>.72)coverage*=.42;
    const edge=Math.min(fx,1-fx,fy,1-fy),ridge=a.ridge==='sharp'?Math.exp(-edge*32):a.ridge==='smooth'?Math.exp(-edge*12):a.ridge==='beads'?Math.exp(-edge*22)*(n>.7?1.5:.45):Math.sin(fy*55+stroke*5)*.25;
    const lx=a.light==='left'?-.7:a.light==='right'?.7:0,ly=a.light==='top'?-1:a.light==='diffuse'?-.2:-.7;
    let relief=(lx*(fx<.5?-1:1)+ly*(fy<.5?-1:1))*ridge*(a.loading==='thin'?4:a.light==='diffuse'?3:9);
    let hue=clamp01(mix(color[q]-color[q+2],color[p]-color[p+2],.65)/180+.45);if(a.loading==='double')hue=mix(hue,fy>.5?.95:.05,.5);
    if(id===0){coverage=0;relief=0;}if(id===1)coverage*=.92;
    const step=Math.max(1,Math.round(u)),edgeID=identity[at(x+step,y)]!==id||identity[at(x,y+step)]!==id;
    if(edgeID&&id>0){tone=mix(tone,original,.65);coverage=Math.max(.76,coverage);}
    const margin=Math.min(X,Y,1-X,1-Y),limit=a.border==='margin'?.035:a.border==='ragged'?.02+hash(Math.floor(xx/13),Math.floor(yy/13),context.seed+71)*.025:0;
    if(margin<limit)coverage=0;const frame=a.border==='rule'&&Math.abs(margin-.025)<.002;
    const tooth=a.ground==='linen'?Math.sin(xx*2.6)*Math.sin(yy*2.6)*3:(n-.5)*2;
    for(let c=0;c<3;c++){const pigment=mix(d.ink[c],d.second[c],hue),paint=mix(245,pigment,.2+(1-tone)*.8)+(stroke-.5)*7+relief;out[p+c]=frame?d.ink[c]:mix(d.paper[c]+tooth,paint,clamp01(coverage));}out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.knife} palette-knife deposits with ${a.ridge} paint ridges`,`${a.direction} strokes, ${a.loading} loading and ${a.light} relief light`]};
 }
});
