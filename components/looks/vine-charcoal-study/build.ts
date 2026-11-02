import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  stick:choice('Which part of the charcoal stick makes the marks?',{side:'The broad side blocks in the masses.',tip:'A pointed tip makes narrow strokes.',broken:'A broken end leaves parallel scratch marks.',powder:'Loose charcoal powder gives diffuse tonal fields.'}),
  pressure:score('How firmly is the charcoal pressed?',['Barely touching the paper','A light open drawing','Firm tonal modelling','Deep velvety shadows','Very strong black masses']),
  paper:choice('What paper supports the study?',{cream:'Warm cream drawing paper.',grey:'Pale grey laid paper.',buff:'Buff paper with visible tooth.',white:'Bright white smooth paper.'}),
  tooth:choice('What grain breaks the charcoal?',{fine:'Fine irregular drawing-paper tooth.',coarse:'Coarse tooth with large pale pockets.',laid:'Regular fine laid lines.',woven:'Crossed woven fibres.'}),
  smudge:choice('How are the masses blended?',{none:'Dry unblended marks remain distinct.',stump:'A paper stump blends the middle tones.',palm:'Broad rubbed passages soften the forms.',vertical:'Downward finger strokes drag the charcoal.'}),
  strokes:choice('How does the drawing stroke travel?',{diagonal:'Loose diagonal drawing strokes.',crossed:'Crosshatched passages.',contour:'Strokes follow surface turns.',vertical:'Predominantly vertical strokes.'}),
  eraser:choice('How are light passages lifted?',{none:'No eraser marks.',kneaded:'Soft rounded kneaded-eraser lifts.',edge:'Fine sharp lifted edges.',streaks:'Narrow pale eraser streaks cross the light planes.'}),
  outline:choice('How strongly is the outer contour stated?',{lost:'Some boundaries disappear into tone.',fine:'Fine broken contours.',firm:'Firm dark outlines.',search:'A second loose searching contour remains.'}),
  dust:choice('What loose charcoal remains around the study?',{clean:'Clean paper around the forms.',specks:'A few charcoal crumbs and specks.',smear:'A faint rubbed dust halo.',fall:'Small downward trails of loose dust.'}),
  mount:choice('How is the drawing placed on the sheet?',{open:'A wide untouched paper margin.',close:'A close crop with narrow margins.',deckle:'An irregular drawn edge.',full:'The study fills the sheet.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color,normal,identity}=capture,u=size/720,out=new Uint8ClampedArray(color.length),step=Math.max(1,Math.round(u));
  const papers={cream:[239,230,208],grey:[207,212,207],buff:[211,188,147],white:[247,246,238]}as const;
  const d=rekey({ink:[25,26,24],paper:papers[a.paper]},context.palette,{ink:'ink',paper:'ground'});
  const at=(x:number,y:number)=>(Math.max(0,Math.min(size-1,Math.round(y)))*size+Math.max(0,Math.min(size-1,Math.round(x))))*4;
  const tone=(q:number)=>1-(color[q]*.2126+color[q+1]*.7152+color[q+2]*.0722)/255;
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,id=identity[p],xx=x/u,yy=y/u,X=x/size,Y=y/size,n=hash(Math.floor(xx*1.8),Math.floor(yy*1.8),context.seed),coarse=hash(Math.floor(xx/2.7),Math.floor(yy/2.7),context.seed+53);
    let dark=tone(p);if(a.smudge!=='none'){
      const radius=(a.smudge==='palm'?6:a.smudge==='stump'?2.8:4)*u;
      let sum=dark,count=1;for(const [dx,dy]of [[-radius,0],[radius,0],[0,-radius],[0,radius]]){const q=at(x+dx*(a.smudge==='vertical'?.2:1),y+dy);if(identity[q]===id){sum+=tone(q);count++;}}
      dark=mix(dark,sum/count,a.smudge==='palm'?.85:.65);
    }
    const angle=a.strokes==='vertical'?Math.PI/2:a.strokes==='contour'?Math.atan2(normal[p+1]-128,normal[p]-128):.65;
    const along=xx*Math.cos(angle)+yy*Math.sin(angle),across=-xx*Math.sin(angle)+yy*Math.cos(angle);
    const grain=a.tooth==='coarse'?mix(n,coarse,.7):a.tooth==='laid'?.5+.35*Math.sin(yy*2.2):a.tooth==='woven'?.5+.27*Math.sin(xx*2.8)*Math.sin(yy*2.8):n;
    const line=Math.abs(Math.sin(across*(a.stick==='tip'?1.6:a.stick==='broken'?2.5:.52))),cross=Math.abs(Math.sin((xx*.77+yy*.64)*1.35));
    let deposit=a.stick==='powder'?dark*(.7+.3*grain):a.stick==='side'?dark*(.72+.28*Math.sin(across*.2+Math.sin(along*.015))**2):clamp01((dark*.95+.08-line)*3)*.65+dark*.25;
    if(a.stick==='broken')deposit*=.55+.45*Math.sin(across*4.1)**2;
    if(a.strokes==='crossed')deposit=Math.max(deposit,clamp01((dark*.8-.1-cross)*3)*.65);
    deposit*=mix(.55,1.7,a.pressure)*(.6+.45*grain);
    if(a.smudge==='palm')deposit=mix(deposit,dark*.9,.45);if(a.smudge==='stump')deposit=mix(deposit,dark*.85,.25);if(a.smudge==='vertical')deposit*=.84+.16*Math.sin(xx*.09+yy*.004)**2;
    const r=at(x+step,y),b=at(x,y+step),edge=id!==identity[r]||id!==identity[b]||Math.abs(normal[p]-normal[r])+Math.abs(normal[p+1]-normal[r+1])>65;
    if(edge&&id>0){if(a.outline==='fine')deposit=Math.max(deposit,.55*n);if(a.outline==='firm')deposit=Math.max(deposit,.86);if(a.outline==='lost')deposit*=.55+.4*n;}
    if(a.outline==='search'&&id>0&&identity[at(x+3*step,y+2*step)]!==id)deposit=Math.max(deposit,.55*(.5+n*.5));
    if(a.eraser==='kneaded')deposit*=1-clamp01(Math.cos(xx*.035)*Math.sin(yy*.028)-.35)*.8*(1-dark);
    if(a.eraser==='edge'&&edge&&dark<.65)deposit*=.22;
    if(a.eraser==='streaks'&&Math.abs(Math.sin((xx+yy*.45)*.8))<.13)deposit*=.25+dark*.5;
    if(id===0){deposit=0;const near=identity[at(x+7*u,y)]>1||identity[at(x-7*u,y)]>1||identity[at(x,y-7*u)]>1||identity[at(x,y+7*u)]>1;if(a.dust==='smear'&&near)deposit=.07*n;if(a.dust==='specks'&&n>.998)deposit=.4;if(a.dust==='fall'&&identity[at(x,y-12*u)]>1&&coarse>.86)deposit=.12*n;}
    if(id===1)deposit*=.53;
    const margin=Math.min(X,Y,1-X,1-Y),limit=a.mount==='open'?.07:a.mount==='close'?.023:a.mount==='deckle'?.027+.015*Math.sin(xx*.07)*Math.cos(yy*.08):0;if(margin<limit)deposit=0;
    for(let c=0;c<3;c++)out[p+c]=mix(d.paper[c]+(grain-.5)*(a.paper==='white'?2:6),d.ink[c],clamp01(deposit));out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.stick} vine charcoal on ${a.paper} paper`,`${a.smudge} blending with ${a.eraser} lifted lights`]};
 }
});
