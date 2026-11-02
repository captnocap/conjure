import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  angle:score('At what angle is the mirrored plate viewed?', ['A reversed negative-like reflection','A reflective low-contrast transition','A clear positive silver image','A darker positive viewing angle','A bright oblique positive view']),
  metal:choice('What tone does the silvered plate have? Designed colours follow the palette.',{neutral:'Neutral polished silver.',warm:'Warm silver with a slight champagne cast.',cool:'Cold bluish silver.',aged:'Muted grey silver with a warm edge.'}),
  polish:choice('Which polishing traces remain?',{fine:'Very fine even polishing.',horizontal:'Fine horizontal polishing lines.',circular:'Subtle circular polishing marks.',mirror:'A very smooth mirror surface.'}),
  imageTone:choice('How does the image sit on the mirror?',{soft:'Soft luminous middle values.',crisp:'Crisp small detail and strong tonal separation.',veiled:'A faint image with bright metallic veiling.',dense:'A dense strongly developed image.'}),
  exposure:score('How bright is the image exposure?', ['A dark plate','Low restrained exposure','Balanced exposure','Luminous highlights','Bright pale image values']),
  tarnish:choice('What tarnish gathers at the edge?',{clean:'Clean silver right to the mat.',gold:'A thin gold-brown tarnish band.',blue:'A narrow blue-violet interference band.',dark:'A dark irregular tarnish border.'}),
  marks:choice('What small surface marks remain?',{clean:'No obvious surface marks.',specks:'A few tiny pale metallic specks.',hairlines:'Very fine parallel hairline scratches.',spots:'Sparse darker age spots.'}),
  cover:choice('How does the protective cover glass appear?',{clear:'Clear flat glass.',haze:'A faint soft haze across the glass.',glint:'A narrow reflected glint.',dust:'A few specks on otherwise clear glass.'}),
  mat:choice('How is the mirrored image mounted?',{bare:'A narrow exposed plate edge.',brass:'A rectangular brass mat.',oval:'An oval opening in a warm brass mat.',case:'A dark case surround with a slim gold inner lip.'}),
  light:choice('What is reflected by the polished silver?',{dark:'A quiet dark viewing surround.',window:'A dim broad window reflection.',stripe:'A long oblique light strip.',softbox:'A broad soft pale reflection at the top.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color,normal}=capture,u=size/720,out=new Uint8ClampedArray(color.length);
  const silver={neutral:[220,222,215],warm:[228,213,185],cool:[206,219,229],aged:[201,198,181]} as const;
  const d=rekey({silver:silver[a.metal],shadow:[31,35,35],gold:[156,120,57]},context.palette,{silver:'ground',shadow:'ink',gold:'second'});
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,X=x/size,Y=y/size,xx=x/u,yy=y/u,n=hash(Math.floor(xx*1.5),Math.floor(yy*1.5),context.seed);
    let lum=(color[p]*.17+color[p+1]*.57+color[p+2]*.26)/255;lum=clamp01(lum*mix(.62,1.45,a.exposure));
    if(a.imageTone==='soft')lum=.08+lum*.84;if(a.imageTone==='crisp')lum=clamp01((lum-.16)*1.35);if(a.imageTone==='veiled')lum=.21+lum*.67;if(a.imageTone==='dense')lum=lum**1.33;
    const positive=clamp01((a.angle-.08)/.3),transition=1-Math.abs(positive-.5)*2;
    const signed=positive*2-1,contrast=(signed<0?-1:1)*Math.max(.28,Math.abs(signed));
    lum=.5+(lum-.5)*contrast;lum=mix(lum,.53,transition*.3);lum*=mix(.88,1.1,a.angle);
    let reflection=a.light==='window'?(X>.1&&X<.39?.075:0):a.light==='stripe'?.13*Math.exp(-((X+Y-1.1)**2)*35):a.light==='softbox'?.16*Math.exp(-Y*5):-.035;
    reflection+=.018*(normal[p+2]/255-.5);
    let polish=a.polish==='mirror'?0:a.polish==='horizontal'?Math.sin(yy*2.3)*1.6:a.polish==='circular'?Math.sin(Math.hypot(xx-200,yy-300)*2)*1.6:(n-.5)*2;
    if(a.marks==='specks'&&n>.9985)lum+=.3;if(a.marks==='hairlines'&&hash(Math.floor(xx*.7),0,context.seed+71)>.992)lum+=.07;
    if(a.marks==='spots'&&hash(Math.floor(xx/4),Math.floor(yy/4),context.seed+37)>.997)lum*=.7;
    if(a.cover==='haze')reflection+=.065;if(a.cover==='glint')reflection+=.14*Math.exp(-((X-Y-.17)**2)*700);if(a.cover==='dust'&&hash(Math.floor(xx),Math.floor(yy),context.seed+101)>.999)lum+=.2;
    const margin=Math.min(X,Y,1-X,1-Y),band=Math.exp(-margin*(a.tarnish==='dark'?35:55));
    const ellipse=((X-.5)/.435)**2+((Y-.5)/.45)**2,matOutside=a.mat==='oval'?ellipse>1:margin<(a.mat==='bare'?.014:a.mat==='case'?.075:.06);
    for(let c=0;c<3;c++){
      let value=mix(d.shadow[c],d.silver[c],clamp01(lum))+polish+reflection*150;
      if(a.tarnish==='gold')value=mix(value,d.gold[c],band*.55);if(a.tarnish==='dark')value=mix(value,d.shadow[c],band*.75);
      if(a.tarnish==='blue')value+=band*[5,-8,18][c]*Math.sin(margin*150+1);
      if(matOutside){if(a.mat==='case')value=margin>.065?d.gold[c]:d.shadow[c]*.6+(n-.5)*3;else if(a.mat==='bare')value=d.silver[c]*.68+polish;else value=d.gold[c]+Math.sin(xx*.17+yy*.08)*3;}
      out[p+c]=value;
    }out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.metal} mirrored silver viewed at ${Math.round(a.angle*100)}% angle`,`${a.mat} mount and ${a.polish} polishing`]};
 }
});
