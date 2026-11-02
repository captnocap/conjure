import {choice,clamp01,defineLook,mix,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  suppression:score('How strongly are broad reflected highlights subdued?',['Very slight glare reduction','A modest reduction','Clear surface-colour emphasis','Strong broad-glare suppression','Maximum restrained reflection']),
  exposure:choice('How is the surface study exposed?',{neutral:'A neutral balanced exposure.',bright:'A bright open exposure.',low:'A slightly darker dense exposure.',soft:'A soft compressed tonal range.'}),
  whiteBalance:choice('What colour balance does the study use?',{neutral:'Neutral daylight balance.',warm:'Slightly warm studio balance.',cool:'Cool daylight balance.',cream:'A restrained creamy print balance.'}),
  detail:choice('How is fine surface detail resolved?',{natural:'Natural source detail.',crisp:'A little extra local contrast.',gentle:'Softened high-frequency detail.',textural:'Strong small-scale texture separation.'}),
  saturation:choice('How strongly do surface colours appear?',{true:'Natural scene saturation.',quiet:'Quiet reduced saturation.',rich:'Rich but restrained colour.',mono:'A neutral monochrome surface study.'}),
  background:choice('What background accompanies the objects?',{source:'Retain the source background colour.',white:'A neutral white study background.',grey:'A pale grey background.',dark:'A deep neutral background.'}),
  highlights:choice('How do the brightest tones end?',{linear:'A direct bright highlight range.',rolloff:'A soft gradual highlight rolloff.',matte:'A subdued matte white point.',luminous:'A slightly lifted bright white point.'}),
  shadows:choice('How are shadows held?',{full:'Keep full deep shadows.',open:'Open the lower tones gently.',soft:'Soften the darkest contrast.',dense:'Give the shadows extra density.'}),
  grain:choice('What photographic grain is visible?',{clean:'A clean digital-looking surface.',fine:'Very fine monochrome grain.',soft:'Soft low-frequency grain.',colour:'Extremely fine colour grain.'}),
  framing:choice('How is the study presented?',{full:'The photograph fills the field.',white:'A narrow white print margin.',grey:'A pale grey mounting margin.',rule:'A fine dark rule just inside the print edge.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color,diffuse,identity}=capture,u=size/720,out=new Uint8ClampedArray(color.length),step=Math.max(1,Math.round(u));
  // Naturalistic photographic looks retain captured colours under an art palette.
  const d={ink:[28,34,41],second:[160,112,82],paper:[239,240,232]};
  const at=(x:number,y:number)=>(Math.max(0,Math.min(size-1,Math.round(y)))*size+Math.max(0,Math.min(size-1,Math.round(x))))*4;
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,id=identity[p],X=x/size,Y=y/size,xx=x/u,yy=y/u;
    const lum=(color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255,matte=(diffuse[p]*.2126+diffuse[p+1]*.7152+diffuse[p+2]*.0722)/255;
    const glare=clamp01((lum-matte*.75-.16)*1.3)*clamp01((lum-.45)*2)*a.suppression*.48;
    const q=[at(x-step,y),at(x+step,y),at(x,y-step),at(x,y+step)],n=hash(Math.floor(xx*1.6),Math.floor(yy*1.6),context.seed);
    for(let c=0;c<3;c++){
      let v=color[p+c]/255,mean=v,count=1;for(const k of q)if(identity[k]===id){mean+=color[k+c]/255;count++;}mean/=count;
      if(id>0)v-=glare;
      if(a.detail==='crisp')v+=(v-mean)*.55;if(a.detail==='gentle')v=mix(v,mean,.6);if(a.detail==='textural')v+=(v-mean)*1.2;
      const saturation=a.saturation==='quiet'?.55:a.saturation==='rich'?1.22:a.saturation==='mono'?0:1;v=lum+(v-lum)*saturation-glare*(1-saturation)*.6;
      if(a.exposure==='bright')v*=1.1;if(a.exposure==='low')v*=.88;if(a.exposure==='soft')v=.04+v*.9;
      if(a.shadows==='open')v+=.065*(1-v)**3;if(a.shadows==='soft')v=.045+v*.955;if(a.shadows==='dense')v=clamp01((v-.035)*1.035);
      if(a.highlights==='rolloff'&&v>.65)v=.65+(v-.65)/(1+(v-.65)*1.2);if(a.highlights==='matte')v*=.91;if(a.highlights==='luminous')v+=v**3*.035;
      if(a.whiteBalance==='warm')v*=c===0?1.035:c===2?.955:1;if(a.whiteBalance==='cool')v*=c===0?.965:c===2?1.035:1;if(a.whiteBalance==='cream')v=v*(c===2?.94:1)+.008;
      if(id===0&&a.background!=='source')v=(a.background==='white'?d.paper[c]:a.background==='grey'?mix(d.paper[c],d.ink[c],.18):d.ink[c])/255;
      if(a.grain==='fine')v+=(n-.5)*.009;if(a.grain==='soft')v+=(hash(Math.floor(xx/2),Math.floor(yy/2),context.seed+3)-.5)*.012;if(a.grain==='colour')v+=(hash(Math.floor(xx*1.5),Math.floor(yy*1.5),context.seed+c*19)-.5)*.01;
      const margin=Math.min(X,Y,1-X,1-Y);if(a.framing==='white'&&margin<.035)v=d.paper[c]/255;if(a.framing==='grey'&&margin<.045)v=mix(d.paper[c],d.ink[c],.15)/255;if(a.framing==='rule'&&Math.abs(margin-.025)<.0012)v=d.ink[c]/255;
      out[p+c]=v*255;
    }out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`Photographic surface study with broad-glare suppression`,`${a.whiteBalance} balance, ${a.detail} detail and ${a.highlights} highlights`]};
 }
});
