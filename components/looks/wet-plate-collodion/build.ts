import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  plate:choice('What carries the wet-plate image?',{tin:'A dark warm tintype plate.',glass:'A glass positive against a dark backing.',negative:'A pale glass negative with reversed tones.',amber:'An amber-backed glass positive.'}),
  coating:choice('How was the collodion poured?',{even:'An even coating with a narrow edge.',pour:'A flowing pour line follows the lower corner.',thin:'Thin streaks cross a softly coated plate.',heavy:'A heavier dark coating gathers at the edge.'}),
  lens:choice('How does the lens draw the image?',{sharp:'A sharply focused centre and quiet edges.',soft:'A soft luminous image.',swirl:'Soft swirling blur near the outer field.',old:'A sharp centre with stronger corner falloff.'}),
  exposure:score('How much exposure does the plate receive?', ['A dark underexposed plate','A subdued exposure','A balanced plate','A luminous long exposure','Bright washed-out highlights']),
  developer:choice('What colour does the developed silver image have? Designed colours follow the palette.',{neutral:'Neutral charcoal and pale silver.',warm:'Warm brown-black silver tones.',cool:'Cold blue-grey silver tones.',olive:'Soft olive-grey silver tones.'}),
  flaws:choice('What traces of the plate process remain?',{clean:'A carefully cleaned plate.',dust:'Small isolated dust spots.',bubbles:'A few tiny coating bubbles.',streaks:'Faint vertical development streaks.'}),
  contrast:choice('How does the image separate light from shadow?',{soft:'Soft middle tones.',full:'A full range of silver tones.',hard:'Strong compressed darks and bright lights.',veil:'A slight silver veil opens the shadows.'}),
  border:choice('How is the plate edge shown?',{full:'The entire irregular plate edge.',corners:'Rounded clipped corners.',mat:'A quiet dark rectangular mat.',crop:'The image is cropped to its field.'}),
  varnish:choice('What does the protective varnish look like?',{clear:'Clear clean varnish.',amber:'A thin amber varnish.',haze:'A soft slightly clouded varnish.',crazed:'Very fine age lines in the varnish.'}),
  reflection:choice('Where does reflected light cross the plate?',{quiet:'A quiet nearly reflection-free viewing angle.',left:'A broad dim reflection on the left.',diagonal:'A narrow diagonal reflection.',window:'A soft rectangular window reflection.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color}=capture,u=size/720,out=new Uint8ClampedArray(color.length);
  const inks={neutral:[32,33,31],warm:[55,39,28],cool:[30,40,51],olive:[43,47,34]} as const;
  const lights={tin:[215,204,180],glass:[224,224,210],negative:[231,226,209],amber:[222,195,145]} as const;
  const d=rekey({ink:inks[a.developer],paper:lights[a.plate]},context.palette,{ink:'ink',paper:'ground'});
  const lumAt=(x:number,y:number)=>{const p=(Math.max(0,Math.min(size-1,y))*size+Math.max(0,Math.min(size-1,x)))*4;return(.1*color[p]+.56*color[p+1]+.34*color[p+2])/255;};
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,X=x/size,Y=y/size,xx=x/u,yy=y/u,radius=Math.hypot(X-.5,Y-.5),n=hash(Math.floor(xx),Math.floor(yy),context.seed);
    let lum=lumAt(x,y);const blur=Math.max(1,Math.round(u*(a.lens==='soft'?3:a.lens==='swirl'?radius*9:radius*2)));
    if(a.lens==='soft'||a.lens==='swirl'){const dx=a.lens==='swirl'?Math.round(-(Y-.5)*blur*3):blur,dy=a.lens==='swirl'?Math.round((X-.5)*blur*3):blur;lum=(lum*2+lumAt(x+dx,y+dy)+lumAt(x-dx,y-dy))/4;}
    lum=clamp01(lum*mix(.64,1.4,a.exposure)-mix(.07,0,a.exposure));
    if(a.contrast==='soft')lum=.12+lum*.76;if(a.contrast==='hard')lum=clamp01((lum-.22)*1.65);if(a.contrast==='veil')lum=.17+lum*.78;
    lum*=1-radius**2*(a.lens==='old'?.9:a.lens==='swirl'?.6:.2);
    if(a.plate==='negative')lum=1-lum;
    const margin=Math.min(X,Y,1-X,1-Y),pour=Math.sin(xx*.018+Math.sin(yy*.014))*Math.exp(-(1-Y)*9);
    if(a.coating==='pour')lum+=pour*.11;if(a.coating==='thin')lum*=.88+.12*Math.sin(xx*.027+yy*.009)**2;if(a.coating==='heavy')lum*=1-.22*Math.exp(-margin*22);
    if(a.flaws==='dust'&&n>.998)lum=n>.999?1:lum*.2;
    if(a.flaws==='streaks')lum*=.91+.09*Math.sin(xx*.11)**2;
    if(a.flaws==='bubbles'){const cx=((xx/81)%1)-.5,cy=((yy/73)%1)-.5,dist=Math.hypot(cx,cy);if(dist<.032)lum*=.75;if(Math.abs(dist-.035)<.01)lum+=.12;}
    let sheen=a.reflection==='left'?.14*Math.exp(-((X-.17)**2)*30):a.reflection==='diagonal'?.13*Math.exp(-((X+Y-.9)**2)*80):a.reflection==='window'?(X>.63&&X<.87&&Y>.12&&Y<.37?.1:0):0;
    if(a.varnish==='haze')sheen+=.07;if(a.varnish==='crazed'&&Math.abs(Math.sin(xx*.037+Math.sin(yy*.054)*2.3))<.015)lum+=.08;
    let outside=a.border!=='crop'&&margin<.018+.006*Math.sin(xx*.12)*Math.cos(yy*.09);
    if(a.border==='corners')outside ||= Math.hypot(Math.max(0,Math.abs(X-.5)-.41),Math.max(0,Math.abs(Y-.5)-.41))>.075;
    if(a.border==='mat')outside=margin<.06;
    for(let c=0;c<3;c++){let value=mix(d.ink[c],d.paper[c],clamp01(lum))+(n-.5)*3;value=mix(value,d.paper[c],sheen);if(a.varnish==='amber')value*=c===0?1:c===1?.96:.86;if(outside)value=d.ink[c]*(.7+margin*3);out[p+c]=value;}out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.plate} wet plate with ${a.coating} collodion`,`${a.developer} silver tones and ${a.varnish} varnish`]};
 }
});
