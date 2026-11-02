import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
const noise=(x:number,y:number,seed:number)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);return mix(mix(hash(ix,iy,seed),hash(ix+1,iy,seed),sx),mix(hash(ix,iy+1,seed),hash(ix+1,iy+1,seed),sx),sy);};
export default defineLook({
 questions:{
  pigments:choice('Which pigments build the gum print? Designed colours follow the palette.',{earth:'Warm ochre and dark umber.',cyanrose:'Cyan-blue and rose-brown.',greenpurple:'Muted green and violet.',bluegold:'Prussian-blue tones and warm gold.'}),
  coats:choice('How many pigment coatings remain visible?',{two:'Two broad pigment coats.',three:'Three overlaid tonal coats.',four:'Four dense overlapping coats.',uneven:'Several incomplete hand-coated layers.'}),
  exposure:score('How strongly are the pigment layers exposed?', ['Pale loose pigment','Open light exposures','Balanced pigment tones','Dense retained pigment','Deep heavily retained shadows']),
  brush:choice('How were the gum coatings brushed on?',{flat:'Wide straight brush strokes.',cross:'Crossed hand-brushed coatings.',round:'Curved circular coating strokes.',smooth:'A nearly even coating.'}),
  registration:choice('How do the exposure layers align?',{exact:'Carefully registered colour layers.',side:'A slight horizontal shift between pigments.',vertical:'One pigment sits slightly low.',drift:'Each coat moves a little in a different direction.'}),
  washout:choice('How is pigment cleared during development?',{clean:'Cleanly cleared light passages.',soft:'Soft pigment traces remain in the lights.',uneven:'Uneven washout leaves soft patches.',brushed:'Brushed-out passages reveal pale streaks.'}),
  detail:choice('How much fine detail survives the layered process?',{clear:'Clear underlying photographic detail.',soft:'Softened painterly detail.',edges:'Dark edges retain more pigment.',dissolved:'Fine details dissolve into broad colour masses.'}),
  paper:choice('What paper receives the gum layers?',{cream:'Warm cream rag paper.',white:'Pale white watercolour paper.',rough:'A rough buff sheet.',laid:'A lightly lined laid sheet.'}),
  surface:choice('What remains on the final pigment surface?',{matte:'A soft matte surface.',granular:'Small concentrated pigment grains.',crackle:'Very fine drying cracks.',stain:'A warm residual stain around the image.'}),
  edge:choice('How do the coatings end at the sheet edge?',{brush:'Visible uneven brush ends.',tape:'A clean taped rectangle.',overlap:'Separate pigment borders overlap.',full:'Pigment covers the whole image field.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color,identity,normal}=capture,u=size/720,out=new Uint8ClampedArray(color.length),px=Math.max(1,Math.round(u));
  const pair={earth:[[103,67,42],[181,139,70]],cyanrose:[[57,115,134],[169,99,100]],greenpurple:[[77,117,87],[111,80,130]],bluegold:[[39,82,124],[183,145,71]]} as const,sheets={cream:[238,226,201],white:[247,242,228],rough:[221,203,171],laid:[240,232,210]} as const;
  const d=rekey({ink:pair[a.pigments][0],second:pair[a.pigments][1],paper:sheets[a.paper]},context.palette,{ink:'ink',second:'second',paper:'ground'});
  const index=(x:number,y:number)=>(Math.max(0,Math.min(size-1,y))*size+Math.max(0,Math.min(size-1,x)))*4;
  const coats=a.coats==='two'?2:a.coats==='three'?3:4;
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,X=x/size,Y=y/size,xx=x/u,yy=y/u,n=hash(Math.floor(xx),Math.floor(yy),context.seed),margin=Math.min(X,Y,1-X,1-Y);
    let values=[d.paper[0],d.paper[1],d.paper[2]].map(c=>c+(n-.5)*(a.paper==='rough'?8:2));
    if(a.paper==='laid')values=values.map(v=>v+2*Math.sin(yy*1.4));
    for(let layer=0;layer<coats;layer++){
      const dx=a.registration==='side'?layer*px*2:a.registration==='drift'?(layer%2?1:-1)*px*layer:0,dy=a.registration==='vertical'?layer*px*2:a.registration==='drift'?(layer%2?2:-1)*px:0,q=index(x-dx,y-dy);
      let lum=(color[q]*.2126+color[q+1]*.7152+color[q+2]*.0722)/255;
      if(a.detail==='soft'||a.detail==='dissolved'){const blur=px*(a.detail==='soft'?2:5);lum=(lum*2+(color[index(x+blur,y)]+color[index(x-blur,y)]+color[index(x,y+blur)]+color[index(x,y-blur)])/255)/6;}
      const warmth=clamp01((color[q]-color[q+2])/180+.5),tone=layer%2?warmth:1-warmth;
      let coverage=clamp01((1-lum)*mix(.55,1.5,a.exposure)*(.38+tone*.35));
      if(a.coats==='uneven')coverage*=.62+.38*noise(xx*.013,yy*.011,context.seed+layer*73);
      const region=identity[q],stroke=a.brush==='flat'?noise(xx*.004,yy*.09,context.seed+layer*31+region):a.brush==='cross'?noise((layer%2?xx:yy)*.08,(layer%2?yy:xx)*.007,context.seed+layer*47+region):a.brush==='round'?noise(xx*.025+Math.cos(yy*.018),yy*.019+Math.sin(xx*.016),context.seed+layer*17+region):1;
      coverage*=.88+.12*stroke;
      if(a.washout==='clean')coverage*=clamp01((1-lum)*3.1);if(a.washout==='soft')coverage+=.025;if(a.washout==='uneven')coverage*=.75+.25*noise(xx*.018,yy*.014,context.seed+layer*61);if(a.washout==='brushed')coverage*=.84+.16*noise(xx*.1,yy*.006,context.seed+layer*43);
      const right=index(x+px,y);if(a.detail==='edges'&&(identity[q]!==identity[right]||Math.abs(normal[q]-normal[right])>35))coverage+=.16;
      if(identity[q]===0)coverage*=.02;else if(identity[q]===1)coverage*=.62;else if(identity[q]>=3){const boundary=identity[q]!==identity[right]||identity[q]!==identity[index(x,y+px)];coverage=Math.max(coverage,boundary?.13:.025);}
      if(a.surface==='granular')coverage*=.65+.65*n;if(a.surface==='crackle'&&noise(xx*.075+noise(xx*.013,yy*.02,context.seed)*2,yy*.08,context.seed+133)>.49&&noise(xx*.075+noise(xx*.013,yy*.02,context.seed)*2,yy*.08,context.seed+133)<.51)coverage*=.8;
      const border=a.edge==='tape'?.035:a.edge==='brush'?.035+.015*Math.sin(xx*.04+layer)*Math.cos(yy*.06):a.edge==='overlap'?.025+layer*.009:0;
      if(margin<border)coverage=0;
      for(let c=0;c<3;c++){const pigment=layer%2?d.second[c]:d.ink[c];values[c]*=1-clamp01(coverage)*(1-pigment/255);}
    }
    if(a.surface==='stain')for(let c=0;c<3;c++)values[c]=mix(values[c],d.second[c],.06*Math.exp(-margin*9));
    for(let c=0;c<3;c++)out[p+c]=values[c];out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.coats} ${a.pigments} gum pigment layers`,`${a.brush} coating and ${a.washout} washout`]};
 }
});
