import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  wetness:score('How wet is the paper when the colour is laid?', ['Dry paper with crisp strokes','Slightly damp paper','A soft flowing wash','Very wet merging washes','Colour blooming into soaked paper']),
  wash:choice('How are the washes laid?',{broad:'Broad even washes across the subject.',vertical:'Long downward washes leave soft run marks.',sweeping:'Curved sweeping washes cross the paper.',patches:'Overlapping irregular wash patches.'}),
  grain:choice('How does the pigment granulate?',{fine:'Fine pigment settles quietly into the tooth.',heavy:'Heavy pigment settles into dark grain clusters.',split:'Two pigments separate into differently coloured grains.',smooth:'A relatively smooth staining wash.'}),
  pigment:choice('What family of watercolour pigments is used? Designed colours follow the palette.',{earth:'Ochre and burnt-sienna earth colours.',blue:'Ultramarine and warm brown.',green:'Muted green and warm ochre.',rose:'Dusty rose and blue-grey.'}),
  paper:choice('What surface does the watercolour paper have?',{cold:'A lightly textured cold-pressed surface.',rough:'Strongly textured rough paper.',hot:'Smooth hot-pressed paper.',laid:'A lightly ribbed laid sheet.'}),
  edges:choice('What happens at drying wash edges?',{soft:'Soft diffused edges.',tide:'Dark pigment tide lines.',broken:'Broken dry-paper rims.',pooled:'Small dark pools collect at lower edges.'}),
  blooms:choice('What backruns appear in the wash?',{calm:'A calm uninterrupted wash.',small:'Small pale water blooms.',large:'Broad cauliflower-shaped backruns.',salt:'Tiny pale salt-like starbursts.'}),
  brush:choice('What brush traces remain?',{round:'Soft pointed round-brush strokes.',flat:'Broad flat-brush bands.',dry:'Dry brush skips across the paper tooth.',mop:'Broad soft mop-brush puddles.'}),
  lifting:choice('How are the highlights recovered?',{reserve:'Highlights are reserved as untouched paper.',lifted:'Soft rubbed-out highlights.',scraped:'Fine pale scraped highlights.',glazed:'A thin final glaze colours the light passages.'}),
  mount:choice('How is the painted sheet presented?',{open:'A wide untouched paper margin.',tape:'A straight taped border.',deckle:'An uneven feathered wash edge.',full:'The wash covers the whole sheet.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color,normal,identity}=capture,u=size/720,out=new Uint8ClampedArray(color.length),radius=Math.max(1,Math.round(u*mix(.4,4.8,a.wetness)));
  const pairs={earth:[[127,77,48],[192,151,75]],blue:[[62,86,143],[152,107,66]],green:[[72,112,85],[180,144,71]],rose:[[164,93,112],[83,107,126]]} as const;
  const papers={cold:[243,237,218],rough:[239,232,210],hot:[248,245,232],laid:[242,235,215]} as const;
  const d=rekey({ink:pairs[a.pigment][0],second:pairs[a.pigment][1],paper:papers[a.paper]},context.palette,{ink:'ink',second:'second',paper:'ground'});
  const pixel=(x:number,y:number)=>(Math.max(0,Math.min(size-1,y))*size+Math.max(0,Math.min(size-1,x)))*4;
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,X=x/size,Y=y/size,xx=x/u,yy=y/u,id=identity[p],samples=[p,pixel(x-radius,y),pixel(x+radius,y),pixel(x,y-radius),pixel(x,y+radius)];
    let rr=0,gg=0,bb=0;for(const q of samples){rr+=color[q]/5;gg+=color[q+1]/5;bb+=color[q+2]/5;}
    const lum=(rr*.2126+gg*.7152+bb*.0722)/255,dark=clamp01(1-lum),fine=hash(Math.floor(xx*1.4),Math.floor(yy*1.4),context.seed),coarse=hash(Math.floor(xx/2),Math.floor(yy/2),context.seed+79);
    const tooth=a.paper==='rough'?mix(fine,coarse,.65):a.paper==='hot'?fine*.2+.4:a.paper==='laid'?.5+.3*Math.sin(yy*1.6):mix(fine,coarse,.27);
    const right=pixel(x+Math.max(1,Math.round(u)),y),down=pixel(x,y+Math.max(1,Math.round(u)));
    const edge=id!==identity[right]||id!==identity[down]||Math.abs(normal[p]-normal[right])+Math.abs(normal[p+1]-normal[right+1])+Math.abs(normal[p+2]-normal[right+2])>55;
    let wash=a.wash==='broad'?.94:a.wash==='vertical'?.78+.22*Math.sin(xx*.055+Math.sin(yy*.008))**2:a.wash==='sweeping'?.77+.23*Math.sin(Math.hypot(xx-70,yy-560)*.02)**2:.68+.32*Math.sin(xx*.019+Math.cos(yy*.024)*1.6)**2;
    if(a.brush==='flat')wash*=.83+.17*Math.sin(yy*.047)**2;if(a.brush==='dry')wash*=tooth>.35?1:.4;if(a.brush==='mop')wash*=.85+.15*Math.cos(xx*.014+yy*.018)**2;
    if(a.brush==='round')wash*=.92+.08*Math.sin(xx*.036+Math.sin(yy*.031))**2;
    let coverage=clamp01((.07+dark*.92)*wash);
    if(a.grain==='heavy')coverage*=.65+.7*tooth;else if(a.grain==='fine')coverage*=.86+.23*tooth;else if(a.grain==='split')coverage*=.74+.46*coarse;
    if(id===0)coverage*=.025;else if(id===1)coverage*=.62;
    if(edge&&id>0){if(a.edges==='tide')coverage+=.2*(1-a.wetness*.3);if(a.edges==='broken')coverage*=fine>.45?.75:.35;if(a.edges==='pooled'&&identity[down]!==id)coverage+=.27;if(a.edges==='soft')coverage*=.72;}
    const cells=a.blooms==='large'?80:35,bx=Math.floor(xx/cells),by=Math.floor(yy/cells),bn=hash(bx,by,context.seed+311),phase=hash(bx,by,context.seed+317)*6.283;
    const cx=xx/cells-bx-(.3+hash(bx,by,context.seed+331)*.4),cy=yy/cells-by-(.3+hash(bx,by,context.seed+337)*.4),dist=Math.hypot(cx,cy),angle=Math.atan2(cy,cx),wave=.12+bn*.12+.016*Math.sin(angle*3+phase)+.011*Math.cos(angle*5-phase);
    if((a.blooms==='small'||a.blooms==='large')&&bn>(a.blooms==='large'?.55:.78)){
      const bloom=clamp01((wave-dist)*11);coverage*=1-bloom*.38;if(Math.abs(dist-wave)<.016)coverage+=dark*.09;
    }
    if(a.blooms==='salt'&&fine>.965)coverage*=.25;
    if(a.lifting==='reserve')coverage*=clamp01(dark*3.3);if(a.lifting==='lifted')coverage*=.72+.28*Math.sin(xx*.018+yy*.012)**2;if(a.lifting==='scraped'&&edge&&fine>.5)coverage*=.2;if(a.lifting==='glazed')coverage+=id>0?.055:0;
    if(id>1){coverage*=1.12;if(edge)coverage=Math.max(coverage,a.edges==='soft'?.08:.12);}
    const hue=clamp01((rr-bb)/160+.45),separate=a.grain==='split'?mix(hue,coarse,.57):hue;
    const margin=Math.min(X,Y,1-X,1-Y),edgeLimit=a.mount==='open'?.065:a.mount==='tape'?.032:a.mount==='deckle'?.03+.013*Math.sin(xx*.06)*Math.cos(yy*.08):0;
    if(margin<edgeLimit)coverage=0;
    for(let c=0;c<3;c++){const paper=d.paper[c]+(tooth-.5)*(a.paper==='hot'?1:7),pigment=mix(d.ink[c],d.second[c],separate);out[p+c]=mix(paper,pigment,clamp01(coverage));}out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.pigment} granulating pigments on ${a.paper} paper`,`${a.wash} washes with ${a.edges} drying edges`]};
 }
});
