import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  form:choice('What ceramic field carries the transferred picture?',{round:'A round shallow plate.',octagon:'An octagonal platter.',scallop:'A gently scalloped plate.',tile:'A square glazed tile.'}),
  ink:choice('What colour is the underglaze transfer? Designed colours follow the palette.',{cobalt:'Traditional deep cobalt blue.',brown:'Warm brown transfer ink.',green:'Deep bottle-green ink.',mulberry:'Dark mulberry-purple ink.'}),
  engraving:choice('How is the image engraved for transfer?',{lines:'Fine parallel engraving lines.',cross:'Crosshatched engraved shading.',stipple:'Small stippled dots carry the tones.',smooth:'A softly graded dense transfer.'}),
  weight:score('How strongly is the transfer printed?', ['A delicate pale transfer','Light fine lines','A full balanced transfer','Strong dark engraved lines','A deep richly printed transfer']),
  glaze:choice('What glaze covers the transferred image?',{ivory:'Warm ivory glaze.',white:'Clean white glaze.',blue:'Very pale blue glaze.',cream:'Rich cream glaze.'}),
  rim:choice('How is the rim outlined?',{single:'One fine ink rule.',double:'Two fine ink rules.',band:'A wider coloured border band.',plain:'An undecorated glazed rim.'}),
  motif:choice('What pattern circles the rim?',{willow:'Repeated small willow-leaf sprays.',flower:'Small five-petal flowers.',lattice:'A fine crossed lattice.',scroll:'Repeating curved scrolls.'}),
  crazing:choice('How much glaze crazing is visible?',{clear:'Clear uncracked glaze.',fine:'A very fine sparse crackle.',network:'A visible irregular crackle network.',stained:'Slightly tea-stained crackle lines.'}),
  finish:choice('What final surface treatment surrounds the transfer?',{clear:'Plain clear gloss over the transferred ink.',gilded:'A thin gold-coloured edge accent.',speckled:'Fine iron-coloured glaze speckles.',wash:'A translucent warm iron wash below the image.'}),
  transfer:choice('How neatly was the tissue transfer laid?',{clean:'A clean evenly laid transfer.',seam:'A fine pale tissue seam.',soft:'Slightly softened transfer edges.',wrinkle:'A small irregular transfer wrinkle.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color,identity,normal}=capture,u=size/720,out=new Uint8ClampedArray(color.length);
  const inks={cobalt:[31,65,132],brown:[108,65,40],green:[36,93,69],mulberry:[103,46,92]} as const,glazes={ivory:[239,232,209],white:[249,247,235],blue:[224,236,237],cream:[238,223,187]} as const;
  const d=rekey({ink:inks[a.ink],glaze:glazes[a.glaze]},context.palette,{ink:'ink',glaze:'ground'});
  const index=(x:number,y:number)=>(Math.max(0,Math.min(size-1,y))*size+Math.max(0,Math.min(size-1,x)))*4;
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,X=x/size,Y=y/size,xx=x/u,yy=y/u,dx=X-.5,dy=Y-.5,r=Math.hypot(dx,dy),theta=Math.atan2(dy,dx),n=hash(Math.floor(xx),Math.floor(yy),context.seed);
    const edge=a.form==='tile'?.455/Math.max(Math.abs(Math.cos(theta)),Math.abs(Math.sin(theta))):a.form==='octagon'?.445/Math.cos(((theta+Math.PI/8)%(Math.PI/4)+Math.PI/4)%(Math.PI/4)-Math.PI/8):a.form==='scallop'?.455+.009*Math.cos(theta*18):.46;
    const inside=r<edge,radial=r/edge;
    let ink=0;
    if(X>.18&&X<.82&&Y>.18&&Y<.82&&inside){
      let sx=Math.round((X-.18)/.64*(size-1)),sy=Math.round((Y-.18)/.64*(size-1));
      if(a.transfer==='wrinkle')sx+=Math.round(u*2*Math.sin(yy*.07)*Math.exp(-((X-.56)**2)*250));
      const q=index(sx,sy),next=index(sx+Math.max(1,Math.round(u)),sy),lum=(color[q]*.2126+color[q+1]*.7152+color[q+2]*.0722)/255;
      let dark=clamp01((1-lum)*mix(.6,1.55,a.weight));
      const line=Math.abs(Math.sin((xx+yy*.36)*1.15));
      if(a.engraving==='lines')ink=dark*.12+(line<dark*.85?.82:0);
      if(a.engraving==='cross')ink=dark*.12+((line<dark*.7||Math.abs(Math.sin((xx*.4-yy)*1.2))<Math.max(0,dark-.42))?.82:0);
      if(a.engraving==='stipple')ink=dark*.08+(n<dark?.88:0);
      if(a.engraving==='smooth')ink=dark;
      const boundary=identity[q]!==identity[next]||Math.abs(normal[q]-normal[next])+Math.abs(normal[q+1]-normal[next+1])+Math.abs(normal[q+2]-normal[next+2])>55;
      if(boundary&&identity[q]>0)ink=Math.max(ink,.55);
      if(identity[q]===0)ink*=.015;else if(identity[q]===1)ink*=.55;
      if(a.transfer==='seam'&&Math.abs(X-.53)<.002)ink*=.3;if(a.transfer==='soft')ink*=.82+.18*n;
    }
    const rimField=radial>.8&&radial<.95;
    if(rimField){
      const t=theta/(Math.PI*2)*24,along=((t%1+1)%1)-.5,v=(radial-.875)*20;
      if(a.motif==='willow'&&Math.abs(v-.7*Math.sin(along*6))<.11)ink=Math.max(ink,.55);
      if(a.motif==='flower'){const rr=Math.hypot(along*1.8,v*.65),aa=Math.atan2(v*.65,along*1.8);if(Math.abs(rr-(.34+.09*Math.cos(aa*5)))<.075)ink=Math.max(ink,.62);}
      if(a.motif==='lattice'&&(Math.abs(Math.sin(theta*95+radial*110))<.15||Math.abs(Math.sin(theta*95-radial*110))<.15))ink=Math.max(ink,.5);
      if(a.motif==='scroll'&&Math.abs(Math.hypot(along,v*.45)-(.28+.06*Math.sin(theta*24)))<.05)ink=Math.max(ink,.6);
    }
    if(a.rim==='single'&&Math.abs(radial-.965)<.0035)ink=.7;if(a.rim==='double'&&(Math.abs(radial-.96)<.003||Math.abs(radial-.79)<.003))ink=.7;if(a.rim==='band'&&radial>.957&&radial<.979)ink=.72;
    if(radial>.8)ink*=1-context.mood.wear*.22*n;if(context.mood.wear>.7&&radial>.97&&hash(Math.floor(theta*65),0,context.seed+12)>.96)ink=0;
    const crack=Math.abs(Math.sin(xx*.037+Math.sin(yy*.062)*2.7)*Math.sin(yy*.043+Math.cos(xx*.051)*2));
    const crackle=a.crazing==='clear'?0:crack<(a.crazing==='fine'?.007:.019)?a.crazing==='stained'?.18:.07:0;
    const shade=inside?1-.11*Math.exp(-((radial-.78)**2)*220)+.035*Math.exp(-((radial-.9)**2)*180)-.04*dy:1;
    for(let c=0;c<3;c++){const glaze=d.glaze[c]*shade+(n-.5)*1.4;let value=mix(glaze,d.ink[c],clamp01(ink));if(inside){value*=1-crackle;if(a.finish==='gilded'&&radial>.968&&radial<.978)value=[177,144,75][c];if(a.finish==='speckled'&&n>.991)value=mix(value,[125,92,61][c],.45);if(a.finish==='wash')value-=Math.exp(-((X-.48)**2+(Y-.73)**2)*70)*[4,8,14][c];}else value=d.glaze[c]*.83-(r-edge<.018?9:0);out[p+c]=value;}out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.ink} engraved transfer under ${a.glaze} glaze`,`${a.form} ceramic with ${a.motif} rim decoration`]};
 }
});
