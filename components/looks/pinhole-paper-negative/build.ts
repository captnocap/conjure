import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  process:choice('How is the paper image viewed?',{negative:'The original reversed-tone paper negative.',contact:'A positive contact print made from the negative.',solar:'A partially reversed solarized paper image.',split:'A contact print with warm highlights and cool shadows.'}),
  exposure:score('How long is the effective paper exposure?',['A short underexposed image','A restrained exposure','Balanced paper exposure','A long luminous exposure','Very long exposure with compressed lights']),
  aperture:choice('How does the pinhole soften the image?',{fine:'A fine pinhole preserves gentle detail.',medium:'Moderate all-over pinhole softness.',large:'A large soft aperture blur.',edge:'The centre remains clearer than the outer field.'}),
  falloff:choice('How much illumination falls toward the corners?',{even:'Very slight corner falloff.',gentle:'Gentle natural edge darkening.',strong:'Strong dark corner falloff.',circle:'A pronounced circular image field.'}),
  motion:choice('What long-exposure movement trace is visible?',{still:'A still quiet exposure.',horizontal:'A faint horizontal exposure drift.',vertical:'A faint vertical exposure drift.',arc:'A small curved rotational exposure trace.'}),
  paper:choice('What photographic paper receives the image? Designed colours follow the palette.',{neutral:'Neutral silver-black and ivory paper.',warm:'Warm brown-black photographic paper.',cool:'Cool blue-black photographic paper.',cream:'Cream stock with soft warm silver tones.'}),
  contrast:choice('How is the paper contrast developed?',{soft:'Soft broad middle tones.',normal:'Balanced paper contrast.',hard:'Strong deep darks and bright lights.',flat:'A flat low-contrast experimental print.'}),
  grain:choice('What texture remains in the paper emulsion?',{fine:'Fine almost invisible emulsion grain.',rough:'Visible irregular paper grain.',fibres:'A subtle paper-fibre texture.',mottled:'Small soft development mottles.'}),
  development:choice('What traces of tray development remain?',{even:'An evenly developed sheet.',edge:'A slightly darker uneven sheet edge.',streak:'Faint flowing developer streaks.',spot:'A few small pale development spots.'}),
  border:choice('How is the paper edge presented?',{full:'The photographic image reaches the paper edge.',margin:'A narrow unexposed paper margin.',clips:'A narrow margin with small clip-shaped unexposed corners.',rough:'An uneven hand-coated perimeter.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color}=capture,u=size/720,out=new Uint8ClampedArray(color.length);
  const pairs={neutral:[[25,28,29],[236,235,221]],warm:[[52,36,25],[231,217,184]],cool:[[25,37,52],[220,230,232]],cream:[[50,45,34],[238,225,192]]}as const;
  const d=rekey({ink:pairs[a.paper][0],paper:pairs[a.paper][1],second:[110,129,146]},context.palette,{ink:'ink',paper:'ground',second:'second'});
  const lumAt=(x:number,y:number)=>{const p=(Math.max(0,Math.min(size-1,Math.round(y)))*size+Math.max(0,Math.min(size-1,Math.round(x))))*4;return(color[p]*.12+color[p+1]*.57+color[p+2]*.31)/255;};
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,X=x/size,Y=y/size,xx=x/u,yy=y/u,r=Math.hypot(X-.5,Y-.5),radius=u*(a.aperture==='fine'?.7:a.aperture==='medium'?2.2:a.aperture==='large'?4.8:.7+r*6);
    let lum=lumAt(x,y)*.4;for(const[dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]])lum+=lumAt(x+dx*radius,y+dy*radius)*.15;
    if(a.motion!=='still'){const drift=u*mix(1.5,7,a.exposure),dx=a.motion==='horizontal'?drift:a.motion==='vertical'?0:-(Y-.5)*drift*2,dy=a.motion==='vertical'?drift:a.motion==='horizontal'?0:(X-.5)*drift*2;lum=lum*.65+(lumAt(x+dx,y+dy)+lumAt(x-dx,y-dy))*.175;}
    const exposure=mix(.65,1.45,a.exposure);lum=Math.pow(clamp01(lum),1/exposure);
    const falloff=a.falloff==='even'?.1:a.falloff==='gentle'?.6:a.falloff==='strong'?1.3:1.7;lum*=clamp01(1-r*r*falloff);
    if(a.contrast==='soft')lum=.1+lum*.8;if(a.contrast==='hard')lum=1/(1+Math.exp(-(lum-.5)*5.4));if(a.contrast==='flat')lum=.22+lum*.56;
    if(a.process==='negative')lum=1-lum;if(a.process==='solar')lum=lum<.6?lum:1-(lum-.6)*1.8;
    const margin=Math.min(X,Y,1-X,1-Y),noise=hash(Math.floor(xx*1.3),Math.floor(yy*1.3),context.seed),coarse=hash(Math.floor(xx/3),Math.floor(yy/3),context.seed+13);
    let texture=a.grain==='fine'?(noise-.5)*.012:a.grain==='rough'?(noise-.5)*.04:a.grain==='fibres'?(hash(Math.floor(xx/2),Math.floor(yy/8),context.seed+41)-.5)*.026:(coarse-.5)*.035;
    if(a.development==='edge')lum-=Math.exp(-margin*38)*(.035+.035*Math.sin(xx*.045+yy*.022)**2);
    if(a.development==='streak')lum*=.95+.05*Math.sin(xx*.027+Math.sin(yy*.015))**2;
    if(a.development==='spot'){const bx=Math.floor(xx/45),by=Math.floor(yy/45),chance=hash(bx,by,context.seed+67),cx=xx/45-bx-.3-hash(bx,by,context.seed+71)*.4,cy=yy/45-by-.3-hash(bx,by,context.seed+73)*.4;if(chance>.87)lum+=.09*Math.exp(-(cx*cx+cy*cy)*220);}
    let blank=a.border==='margin'||a.border==='clips'?margin<.028:a.border==='rough'?margin<.02+.008*Math.sin(xx*.09)*Math.cos(yy*.065):false;
    if(a.border==='clips'&&(X<.055||X>.945)&&(Y<.07||Y>.93))blank=true;
    if(a.falloff==='circle'&&r>.63)lum=a.process==='negative'?1:0;
    for(let c=0;c<3;c++){const ink=a.process==='split'?mix(d.ink[c],d.second[c],(1-lum)*.24):d.ink[c];out[p+c]=blank?d.paper[c]:mix(ink,d.paper[c],clamp01(lum+texture));}out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.process} pinhole paper image with ${a.aperture} aperture softness`,`${a.falloff} falloff, ${a.motion} exposure trace and ${a.paper} paper`]};
 }
});
