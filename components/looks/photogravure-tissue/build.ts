import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  grain:choice('How fine is the gravure grain?',{fine:'Very fine continuous-tone grain.',open:'A visibly open grain in the dark passages.',cluster:'Soft clustered grain in the middle tones.',smooth:'A smooth nearly invisible grain.'}),
  exposure:score('How dense is the transferred tonal image?', ['A delicate pale image','Open luminous middle tones','A balanced tonal transfer','Rich continuous shadows','Dense velvety darks']),
  ink:choice('What intaglio ink fills the cells? Designed colours follow the palette.',{black:'Warm black ink.',sepia:'Deep sepia-brown ink.',blue:'Blue-black ink.',green:'Olive-black ink.'}),
  wiping:choice('How much ink remains on the plate surface?',{clean:'Clean wiping preserves bright paper lights.',tone:'A soft even plate tone.',hand:'Broad faint hand-wiping traces.',rim:'Heavier plate tone near the perimeter.'}),
  paper:choice('What paper receives the gravure?',{ivory:'Soft ivory rag paper.',white:'Pale white cotton paper.',buff:'Warm buff paper.',japan:'Thin warm Japanese-style paper.'}),
  dampness:choice('How does damp paper take the ink?',{dry:'Dry paper gives crisp slightly broken darks.',even:'Evenly damp paper receives smooth tones.',wet:'Wetter paper softens the smallest details.',textured:'Damp textured paper leaves visible fibre tooth.'}),
  contrast:choice('How is the tonal curve shaped?',{soft:'A soft full range of greys.',normal:'A balanced photographic curve.',deep:'Deep darks and luminous highlights.',highkey:'Bright open highlights with restrained shadows.'}),
  border:choice('What print border is visible?',{plate:'A clean embossed rectangular plate mark.',soft:'A soft irregular plate edge.',wide:'A broad paper margin around the plate.',full:'The image is cropped to its outer field.'}),
  retouch:choice('What local finishing remains visible?',{none:'An untouched continuous-tone image.',burnish:'Softly burnished highlight areas.',etch:'Small re-etched details sharpen the dark passages.',brush:'A few soft retouched tonal patches.'}),
  edition:choice('Which impression is shown?',{early:'A rich early impression.',late:'A softer later impression.',proof:'A proof with a small stepped tonal strip.',warm:'A slightly warm aged impression.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color,identity}=capture,u=size/720,out=new Uint8ClampedArray(color.length),step=Math.max(1,Math.round(u));
  const inks={black:[33,33,29],sepia:[66,43,28],blue:[28,43,61],green:[37,46,31]} as const,sheets={ivory:[240,230,208],white:[247,245,232],buff:[225,204,168],japan:[236,224,189]} as const;
  const d=rekey({ink:inks[a.ink],paper:sheets[a.paper]},context.palette,{ink:'ink',paper:'ground'});
  const index=(x:number,y:number)=>(Math.max(0,Math.min(size-1,y))*size+Math.max(0,Math.min(size-1,x)))*4;
  const lumAt=(q:number)=>(color[q]*.2126+color[q+1]*.7152+color[q+2]*.0722)/255;
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,X=x/size,Y=y/size,xx=x/u,yy=y/u,id=identity[p],n=hash(Math.floor(xx*1.8),Math.floor(yy*1.8),context.seed);
    let lum=lumAt(p);if(a.dampness==='wet')lum=(lum*2+lumAt(index(x+step*2,y))+lumAt(index(x-step*2,y))+lumAt(index(x,y+step*2))+lumAt(index(x,y-step*2)))/6;
    if(a.contrast==='soft')lum=.09+lum*.83;if(a.contrast==='deep')lum=clamp01((lum-.15)*1.3);if(a.contrast==='highkey')lum=lum**.68;
    let dark=clamp01((1-lum)*mix(.62,1.45,a.exposure)),pitch=a.grain==='open'?2.4:a.grain==='cluster'?1.7:.7;
    let grain=hash(Math.floor(xx/pitch),Math.floor(yy/pitch),context.seed+67);if(a.grain==='cluster')grain=mix(grain,hash(Math.floor(xx/6),Math.floor(yy/6),context.seed+19),.4);
    let ink=dark*(a.grain==='smooth'?.97:a.grain==='fine'?.87:.7)+(grain<dark?dark*(a.grain==='smooth'?.03:a.grain==='fine'?.13:.3):0);
    if(id===0)ink*=.015;else if(id===1)ink*=.72;
    const margin=Math.min(X,Y,1-X,1-Y);
    if(a.wiping==='tone')ink+=.045;if(a.wiping==='hand')ink+=.026+.024*Math.sin(xx*.013+Math.cos(yy*.011))**2;if(a.wiping==='rim')ink+=.11*Math.exp(-margin*18);
    if(a.dampness==='dry'&&n>.94)ink*=.65;if(a.dampness==='textured')ink*=.85+.22*hash(Math.floor(xx/2),Math.floor(yy/2),context.seed+37);
    if(a.retouch==='burnish')ink*=1-.17*Math.exp(-((X-.6)**2+(Y-.4)**2)*28);if(a.retouch==='etch'&&Math.abs(lum-lumAt(index(x+step,y)))>.05)ink+=.12;if(a.retouch==='brush')ink*=.88+.12*Math.sin(xx*.018+yy*.027)**2;
    if(a.edition==='late')ink*=.8+.1*n;
    const edge=a.border==='wide'?.08:a.border==='soft'?.028+.006*Math.sin(xx*.08)*Math.cos(yy*.09):.03;
    let outside=a.border!=='full'&&margin<edge;
    if(a.edition==='proof'&&X>.18&&X<.48&&Y>.945&&Y<.965){ink=Math.floor((X-.18)/.06)/5;outside=false;}
    for(let c=0;c<3;c++){let paper=d.paper[c]+(n-.5)*(a.paper==='japan'?6:2);if(a.edition==='warm')paper*=c===0?1:c===1?.98:.92;let value=outside?paper:mix(paper,d.ink[c],clamp01(ink));if(a.border!=='full'&&Math.abs(margin-edge)<.0016)value=paper+(margin<edge?-11:5);out[p+c]=value;}out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.grain} continuous-tone gravure with ${a.ink} ink`,`${a.wiping} wiping and ${a.edition} impression`]};
 }
});
