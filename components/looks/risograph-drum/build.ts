import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  drums:choice('Which spot-ink drums print the picture? Designed colours follow the palette.',{redblue:'Bright red and deep blue drums.',tealgold:'Deep teal and sunflower-gold drums.',violetpink:'Violet and warm fluorescent-pink drums.',blackred:'Black with a bright red accent drum.'}),
  layers:choice('How are the separations arranged?',{two:'Two overlapping full image separations.',three:'A third light accent separation joins the two inks.',key:'One dark key image and a lighter colour tint.',split:'The two inks divide warm and cool surfaces.'}),
  screen:choice('What stencil screen carries the tone?',{stipple:'Fine irregular stencil stipple.',dots:'Round halftone dots.',lines:'Close parallel stencil lines.',coarse:'Large visible raster dots.'}),
  density:score('How heavily are the drums inked?', ['A light transparent pass','Light ink coverage','An even full impression','Rich saturated ink','Dense overlapping ink films']),
  registration:choice('How do the drums register?',{exact:'Close registration.',side:'The second drum shifts sideways.',vertical:'The second drum shifts vertically.',diagonal:'Both separations drift in opposite diagonal directions.'}),
  grain:choice('How does the stencil break up the ink?',{fine:'Fine almost even ink grain.',rough:'Strong broken grain.',fibrous:'Paper fibres leave narrow pale streaks.',cloudy:'Broad cloudy patches of imperfect transfer.'}),
  overlap:choice('How do the inks behave where they overlap?',{multiply:'Transparent ink layers make a dark third colour.',soft:'Soft transparent overlap.',solid:'Dense flat overlap with strong contrast.',knockout:'The brightest second-ink areas knock out the first ink.'}),
  paper:choice('What stock runs through the duplicator?',{white:'Warm white uncoated paper.',cream:'Cream recycled stock.',pink:'Very pale pink paper.',grey:'Pale grey recycled paper.'}),
  roller:choice('What traces of the rollers remain?',{clean:'Clean roller transport.',bands:'Very faint horizontal density bands.',tracks:'Two narrow pale roller tracks near the side edges.',setoff:'A faint offset ghost near the lower edge.'}),
  trim:choice('How is the sheet trimmed?',{margin:'An open paper margin.',crop:'Small crop marks outside the image.',deckle:'An irregular hand-torn edge.',bleed:'The colour runs to the sheet edge.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color,identity}=capture,u=size/720,out=new Uint8ClampedArray(color.length);
  const pair={redblue:[[40,69,152],[222,69,59]],tealgold:[[26,115,116],[226,172,41]],violetpink:[[92,60,144],[230,98,130]],blackred:[[33,36,32],[221,65,49]]} as const;
  const sheets={white:[244,240,224],cream:[230,219,190],pink:[243,220,215],grey:[214,217,208]} as const;
  const d=rekey({ink:pair[a.drums][0],second:pair[a.drums][1],paper:sheets[a.paper]},context.palette,{ink:'ink',second:'second',paper:'ground'});
  const sample=(x:number,y:number)=>{const p=(Math.max(0,Math.min(size-1,y))*size+Math.max(0,Math.min(size-1,x)))*4;return p;};
  const sx=Math.round(u*(a.registration==='side'?3:a.registration==='diagonal'?2:0)),sy=Math.round(u*(a.registration==='vertical'?3:a.registration==='diagonal'?-2:0));
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,second=sample(x-sx,y-sy),first=a.registration==='diagonal'?sample(x+sx,y+sy):p,X=x/size,Y=y/size,xx=x/u,yy=y/u;
    const lum=(color[first]*.2126+color[first+1]*.7152+color[first+2]*.0722)/255,lum2=(color[second]*.2126+color[second+1]*.7152+color[second+2]*.0722)/255;
    let one=clamp01((1-lum)*(.6+color[first+2]/510)),two=clamp01((1-lum2)*(.55+color[second]/420));
    if(a.layers==='key'){one=1-lum;two*=.5;}if(a.layers==='split'){one*=.35+.65*clamp01((color[first+2]-color[first])/100+.5);two*=.35+.65*clamp01((color[second]-color[second+2])/100+.5);}
    if(identity[first]===0)one*=.02;else if(identity[first]===1)one*=.55;if(identity[second]===0)two*=.02;else if(identity[second]===1)two*=.55;
    const n=hash(Math.floor(xx),Math.floor(yy),context.seed),m=hash(Math.floor(xx+17),Math.floor(yy-13),context.seed+37);
    const screened=(tone:number,channel:number)=>{let t=clamp01(tone*mix(.55,1.5,a.density));const angle=channel?-.39:.34,pitch=a.screen==='coarse'?7:3.6,ax=(xx*Math.cos(angle)+yy*Math.sin(angle))/pitch,ay=(-xx*Math.sin(angle)+yy*Math.cos(angle))/pitch;
     const fx=((ax%1+1)%1)-.5,fy=((ay%1+1)%1)-.5;
     let mask=a.screen==='stipple'?(channel?m:n)<t:a.screen==='lines'?Math.abs(fx)*2<t:Math.hypot(fx,fy)<Math.sqrt(t)*.62;
     let value=t*.08+(mask?.9:0);
     if(a.grain==='rough')value*=.45+.55*(channel?m:n);if(a.grain==='fine')value*=.9+.1*n;
     if(a.grain==='fibrous'&&hash(Math.floor(xx/2),Math.floor(yy/7),context.seed+channel)>.86)value*=.45;
     if(a.grain==='cloudy')value*=.64+.36*Math.sin(xx*.017+Math.cos(yy*.02)+channel)**2;return value;};
    one=screened(one,0);two=screened(two,1);
    if(a.overlap==='soft'){one*=.76;two*=.76;}if(a.overlap==='solid'){one=clamp01(one*1.28);two=clamp01(two*1.28);}if(a.overlap==='knockout')one*=1-two*.8;
    let transport=1;if(a.roller==='bands')transport=.86+.14*Math.sin(yy*.029)**2;if(a.roller==='tracks'&&(Math.abs(X-.09)<.012||Math.abs(X-.91)<.012))transport=.65;
    one*=transport;two*=transport;
    if(a.roller==='setoff'&&Y>.83){const k=sample(x+Math.round(u*11),y-Math.round(u*37));one+=.08*(1-(color[k]+color[k+1]+color[k+2])/765);}
    const third=a.layers==='three'?clamp01((1-lum)*.23)*(.5+.5*n):0,margin=Math.min(X,Y,1-X,1-Y),edge=a.trim==='deckle'?.025+.006*Math.sin(xx*.09)*Math.cos(yy*.16):.032;
    const outside=a.trim!=='bleed'&&margin<edge;
    for(let c=0;c<3;c++){let paper=d.paper[c]+(n-.5)*4,value=paper*(1-one*(1-d.ink[c]/255))*(1-two*(1-d.second[c]/255));value=mix(value,mix(d.ink[c],d.second[c],.5),third);if(outside)value=paper;if(a.trim==='crop'&&margin<.03&&((Math.abs(X-.065)<.0015&&(Y<.025||Y>.975))||(Math.abs(Y-.065)<.0015&&(X<.025||X>.975))))value=d.ink[c];out[p+c]=value;}out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.drums} spot drums with ${a.screen} stencils`,`${a.layers} separations and ${a.registration} registration`]};
 }
});
