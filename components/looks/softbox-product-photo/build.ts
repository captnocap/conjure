import {choice,clamp01,defineLook,mix,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  key:choice('Where does the soft studio key appear?',{left:'A broad soft key from upper left.',right:'A broad soft key from upper right.',top:'A long softbox above the object.',front:'Broad gentle frontal illumination.'}),
  fill:score('How much soft fill opens the shadows?',['Very little fill','A little reflected fill','Balanced soft fill','Open well-filled shadows','Very even catalogue illumination']),
  background:choice('What photographic sweep surrounds the objects?',{white:'A clean white sweep.',grey:'A pale grey sweep.',cream:'A warm cream sweep.',charcoal:'A dark charcoal sweep.'}),
  balance:choice('What studio colour balance is used?',{neutral:'Neutral studio colour.',warm:'Slightly warm catalogue colour.',cool:'Cool clean studio colour.',soft:'A lightly desaturated neutral balance.'}),
  lens:choice('How does the photographic image resolve?',{crisp:'Crisp product detail.',gentle:'Slightly softened fine detail.',centre:'A crisp centre with soft outer field.',detail:'Extra small-scale detail contrast.'}),
  finish:choice('How are surface highlights rendered?',{source:'Retain the original surface character.',matte:'Soft subdued matte highlights.',satin:'A broad restrained satin highlight.',gloss:'A brighter softbox-shaped highlight.'}),
  contrast:choice('How do the studio tones separate?',{natural:'Natural source contrast.',soft:'Soft open catalogue contrast.',firm:'Firm but unclipped contrast.',bright:'A bright high-key tonal range.'}),
  exposure:choice('What overall exposure is used?',{balanced:'Balanced exposure.',light:'Slightly lighter exposure.',dense:'Slightly darker exposure.',protected:'Protected highlights with open middle tones.'}),
  grain:choice('What final photographic texture remains?',{clean:'A clean studio image.',fine:'Fine luminance grain.',print:'Soft print grain.',subtle:'A very slight colour texture.'}),
  presentation:choice('How is the photograph presented?',{full:'The image fills the field.',margin:'A narrow pale print margin.',mat:'A broad neutral mounting border.',rule:'A fine dark inner rule.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color,normal,identity}=capture,u=size/720,out=new Uint8ClampedArray(color.length),step=Math.max(1,Math.round(u));
  const papers={white:[246,246,239],grey:[216,222,220],cream:[237,225,200],charcoal:[34,39,44]}as const;
  // Naturalistic photographic looks retain captured colours under an art palette.
  const d={ink:[27,34,43],second:[176,127,91],paper:papers[a.background]};
  const at=(x:number,y:number)=>(Math.max(0,Math.min(size-1,Math.round(y)))*size+Math.max(0,Math.min(size-1,Math.round(x))))*4;
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,id=identity[p],X=x/size,Y=y/size,xx=x/u,yy=y/u,nx=normal[p]/127.5-1,ny=normal[p+1]/127.5-1,nz=normal[p+2]/127.5-1;
    const lum=(color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255;
    const key=a.key==='left'?clamp01(-nx*.45-ny*.4+nz*.7):a.key==='right'?clamp01(nx*.45-ny*.4+nz*.7):a.key==='top'?clamp01(-ny*.7+nz*.5):clamp01(nz*.85+.15);
    const diffuse=.91+key*.15,fill=(1-lum)**2*a.fill*.14;
    const box=a.key==='top'?Math.exp(-((nx/.7)**4+((ny+.45)/.22)**4)):Math.exp(-(((nx-(a.key==='left'?-.35:a.key==='right'?.35:0))/.28)**4+((ny+.15)/.65)**4));
    const highlight=a.finish==='satin'?key**3*.08:a.finish==='gloss'?box*.2:a.finish==='matte'?-Math.max(0,lum-.72)*.2:0;
    const radius=a.lens==='centre'?Math.max(1,Math.round(Math.hypot(X-.5,Y-.5)*5*u)):step;
    const q=[at(x-radius,y),at(x+radius,y),at(x,y-radius),at(x,y+radius)],noise=hash(Math.floor(xx*1.7),Math.floor(yy*1.7),context.seed);
    for(let c=0;c<3;c++){
      let v=color[p+c]/255,mean=v,count=1;for(const k of q)if(identity[k]===id){mean+=color[k+c]/255;count++;}mean/=count;
      if(a.lens==='gentle')v=mix(v,mean,.45);if(a.lens==='centre')v=mix(v,mean,clamp01(Math.hypot(X-.5,Y-.5)*1.5));if(a.lens==='detail')v+=(v-mean)*.65;
      if(id>0)v=v*diffuse+fill+highlight;
      if(a.balance==='warm')v*=c===0?1.035:c===2?.95:1;if(a.balance==='cool')v*=c===0?.965:c===2?1.035:1;if(a.balance==='soft')v=mix(v,lum,.25);
      if(a.contrast==='soft')v=.04+v*.91;if(a.contrast==='firm')v=clamp01((v-.07)*1.13);if(a.contrast==='bright')v=.075+v*.94;
      if(a.exposure==='light')v*=1.08;if(a.exposure==='dense')v*=.9;if(a.exposure==='protected'){v+=.04*(1-v)**2;if(v>.7)v=.7+(v-.7)/(1+(v-.7)*1.4);}
      if(id===0)v=d.paper[c]/255+(a.background==='charcoal'?.015:-.025)*(Y-.5);
      if(a.grain==='fine')v+=(noise-.5)*.007;if(a.grain==='print')v+=(hash(Math.floor(xx/2),Math.floor(yy/2),context.seed+11)-.5)*.011;if(a.grain==='subtle')v+=(hash(Math.floor(xx*1.8),Math.floor(yy*1.8),context.seed+c*17)-.5)*.007;
      const margin=Math.min(X,Y,1-X,1-Y);if(a.presentation==='margin'&&margin<.033)v=d.paper[c]/255;if(a.presentation==='mat'&&margin<.065)v=mix(d.paper[c],238,.65)/255;if(a.presentation==='rule'&&Math.abs(margin-.026)<.0013)v=d.ink[c]/255;
      out[p+c]=v*255;
    }out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.key} softbox treatment with ${a.background} sweep`,`${a.finish} highlight rendering and ${a.lens} photographic detail`]};
 }
});
