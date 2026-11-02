import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  grade:choice('Which graphite grade leads the drawing?',{hard:'Hard pale H-grade pencil.',middle:'Balanced HB graphite.',soft:'Soft dark 4B graphite.',mixed:'Hard construction strokes under soft dark modelling.'}),
  burnish:score('How strongly are the dark areas burnished?',['Dry matte pencil','A trace of graphite sheen','Smooth polished shadows','Strong silvery dark passages','Highly burnished metallic graphite']),
  paper:choice('What drawing surface receives the graphite?',{white:'Smooth white Bristol paper.',cream:'Warm cream drawing paper.',grey:'Pale cool grey paper.',rough:'White paper with pronounced tooth.'}),
  stroke:choice('How are pencil marks arranged?',{parallel:'Fine parallel pencil strokes.',crossed:'Two close layers of crosshatching.',circular:'Small overlapping circular motions.',contour:'Hatching changes direction with the form.'}),
  density:choice('How close are the pencil strokes?',{open:'Open individual marks.',medium:'Moderately close hatching.',dense:'Very close tightly packed marks.',layered:'Several slightly displaced hatch layers.'}),
  blending:choice('How are tonal transitions handled?',{dry:'Dry strokes remain separate.',stump:'Light stump blending softens the half tones.',smooth:'Carefully rubbed smooth modelling.',patches:'Separate rubbed and dry passages alternate.'}),
  highlight:choice('What highlights cross the graphite?',{reserve:'Reserved untouched paper.',erased:'Soft kneaded-eraser lifts.',incised:'Fine incised pale lines.',sharp:'Sharp bright eraser marks.'}),
  light:choice('Which light reveals the polished graphite?',{left:'Raking light from upper left.',right:'Raking light from upper right.',top:'Light from above.',diffuse:'Broad frontal light.'}),
  outline:choice('How are contours resolved?',{fine:'Fine precise pencil contours.',firm:'Firm dark contours.',lost:'Contours disappear into the half tones.',search:'A faint displaced construction contour remains.'}),
  border:choice('How is the finished study placed?',{open:'Wide white margins.',close:'Narrow paper margins.',soft:'A softly faded perimeter.',rule:'A thin ruled frame.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color,normal,identity}=capture,u=size/720,out=new Uint8ClampedArray(color.length),step=Math.max(1,Math.round(u));
  const papers={white:[248,247,239],cream:[239,231,211],grey:[213,218,218],rough:[242,240,227]}as const;
  const d=rekey({ink:[36,38,40],paper:papers[a.paper],silver:[162,169,174]},context.palette,{ink:'ink',paper:'ground',silver:'second'});
  const at=(x:number,y:number)=>(Math.max(0,Math.min(size-1,Math.round(y)))*size+Math.max(0,Math.min(size-1,Math.round(x))))*4;
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,id=identity[p],xx=x/u,yy=y/u,X=x/size,Y=y/size,n=hash(Math.floor(xx*2.2),Math.floor(yy*2.2),context.seed);
    const lum=(color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255,dark=clamp01(1-lum),spacing=a.density==='open'?3.8:a.density==='medium'?2.5:a.density==='dense'?1.5:2.1;
    const angle=a.stroke==='contour'?Math.atan2(normal[p+1]-128,normal[p]-128):.7,across=-xx*Math.sin(angle)+yy*Math.cos(angle);
    let line=a.stroke==='circular'?Math.abs(Math.sin(Math.hypot(xx%13-6.5,yy%13-6.5)*2.8)):Math.abs(Math.sin(across/spacing*Math.PI));
    if(a.stroke==='crossed')line=Math.min(line,Math.abs(Math.sin((xx*.75+yy*.66)/spacing*Math.PI))+.12);
    if(a.density==='layered')line=Math.min(line,Math.abs(Math.sin((across+yy*.07+1)/spacing*Math.PI))+.08);
    const grade=a.grade==='hard'?.55:a.grade==='middle'?.82:a.grade==='soft'?1.22:.82+dark*.35;
    let graphite=(clamp01((dark+.14-line)*4)*.64+dark*.27)*grade;
    if(a.blending==='stump')graphite=mix(graphite,dark*grade,.35);if(a.blending==='smooth')graphite=mix(graphite,dark*grade,.7);if(a.blending==='patches')graphite=mix(graphite,dark*grade,Math.sin(xx*.026+Math.cos(yy*.035))**2*.65);
    const tooth=a.paper==='rough'?.62+n*.55:.84+n*.17;graphite*=tooth;
    const r=at(x+step,y),b=at(x,y+step),edge=id!==identity[r]||id!==identity[b]||Math.abs(normal[p]-normal[r])+Math.abs(normal[p+1]-normal[r+1])>65;
    if(edge&&id>0){if(a.outline==='firm')graphite=Math.max(graphite,.85);if(a.outline==='fine')graphite=Math.max(graphite,.5);if(a.outline==='lost')graphite*=.62;}
    if(a.outline==='search'&&id>0&&identity[at(x+3*step,y+2*step)]!==id)graphite=Math.max(.35,graphite);
    if(a.highlight==='reserve'&&lum>.76)graphite*=.35;if(a.highlight==='erased')graphite*=1-clamp01(Math.sin(xx*.03)*Math.cos(yy*.032)-.38)*.65;
    if(a.highlight==='incised'&&Math.abs(Math.sin((xx*.8+yy*.4)*1.2))<.065)graphite*=.2;if(a.highlight==='sharp'&&edge&&lum>.5)graphite*=.1;
    const nx=normal[p]/127.5-1,ny=normal[p+1]/127.5-1,nz=normal[p+2]/127.5-1;
    const alignment=a.light==='left'?clamp01(-nx*.5-ny*.5+nz*.7):a.light==='right'?clamp01(nx*.5-ny*.5+nz*.7):a.light==='top'?clamp01(-ny*.7+nz*.7):clamp01(nz);
    let sheen=a.burnish*clamp01((dark-.28)*2)*alignment**(a.light==='diffuse'?2:5)*.58;
    if(id===0){graphite=0;sheen=0;}if(id===1){graphite*=.48;sheen*=.3;}
    const margin=Math.min(X,Y,1-X,1-Y),limit=a.border==='open'?.065:.025;if(margin<limit){graphite=0;sheen=0;}if(a.border==='soft'){const fade=clamp01((margin-.02)/.055);graphite*=fade;sheen*=fade;}if(a.border==='rule'&&Math.abs(margin-.022)<.0015)graphite=.6;
    for(let c=0;c<3;c++){const drawn=mix(d.paper[c]+(n-.5)*(a.paper==='rough'?5:2),d.ink[c],clamp01(graphite));out[p+c]=mix(drawn,d.silver[c],sheen);}out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.grade} graphite with ${a.stroke} pencil work`,`${a.blending} modelling and burnished highlights under ${a.light} light`]};
 }
});
