import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  resolution:score('How dense is the handheld pixel display?',['Very coarse handheld pixels','Low-resolution pocket display','Classic handheld detail','Fine pocket-display pixels','Small dense handheld pixels']),
  palette:choice('What four-tone display family appears? Designed colours follow the palette.',{green:'Olive-green reflective LCD.',grey:'Neutral grey reflective LCD.',amber:'Warm amber four-tone screen.',blue:'Cool blue-grey reflective screen.'}),
  contrast:choice('How is the LCD contrast adjusted?',{soft:'Pale low-contrast display.',normal:'Clear balanced contrast.',strong:'Deep dark pixels and pale highlights.',over:'Strong dark contrast with compressed middle tones.'}),
  dither:choice('How are the four tones mixed?',{none:'Flat four-tone regions.',checker:'Simple alternating-pixel dither.',ordered:'A four-by-four ordered dither.',stipple:'Irregular one-pixel stipple.'}),
  thresholds:choice('How are the four levels spaced?',{even:'Four evenly spaced value levels.',lights:'More separation among the light tones.',shadows:'More separation among the dark tones.',poster:'Strong poster-like black and light regions.'}),
  grid:choice('How visible is the physical display grid?',{none:'No added pixel grid.',fine:'A faint one-pixel gap.',dark:'A clear dark pixel grid.',light:'Light reflective gaps between pixels.'}),
  pixels:choice('What shape are the LCD elements?',{square:'Square pixels.',wide:'Slightly wide pixels.',tall:'Slightly tall pixels.',rounded:'Square cells with subtly rounded corners.'}),
  ghost:choice('How much LCD response ghosting remains?',{none:'No response trail.',right:'A faint trail to the right.',down:'A faint downward response trail.',double:'A slightly displaced double image.'}),
  light:choice('How does ambient light fall on the reflective screen?',{even:'Even diffuse screen illumination.',left:'The upper-left side catches more light.',top:'A soft reflection crosses the upper screen.',spot:'A broad pale reflection sits near one corner.'}),
  surround:choice('What frames the LCD image?',{full:'The display fills the frame.',bezel:'A narrow dark bezel.',inset:'A recessed pale surround.',ticks:'A thin border with small calibration ticks.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color,identity,normal}=capture,out=new Uint8ClampedArray(color.length);
  const tones={green:[[31,52,30],[171,188,110]],grey:[[38,43,40],[213,219,207]],amber:[[65,43,19],[224,193,109]],blue:[[31,48,66],[175,199,207]]}as const;
  const d=rekey({ink:tones[a.palette][0],paper:tones[a.palette][1]},context.palette,{ink:'ink',paper:'ground'});
  const columns=Math.round(mix(72,192,a.resolution)),base=size/columns,dx=Math.max(1,base*(a.pixels==='wide'?1.3:1)),dy=Math.max(1,base*(a.pixels==='tall'?1.3:1)),cols=Math.ceil(size/dx),rows=Math.ceil(size/dy),levels=new Uint8Array(cols*rows);
  for(let y=0;y<rows;y++){
   if(y%24===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<cols;x++){
    const px=Math.min(size-1,Math.floor((x+.5)*dx)),py=Math.min(size-1,Math.floor((y+.5)*dy)),p=(py*size+px)*4;
    let l=(color[p]*.2126+color[p+1]*.7152+color[p+2]*.0722)/255;
    if(a.thresholds==='lights')l=Math.sqrt(l);if(a.thresholds==='shadows')l=l*l;if(a.thresholds==='poster')l=l<.32?l*.55:l>.7?.85+(l-.7)*.5:l;
    const contrast=a.contrast==='soft'?.72:a.contrast==='strong'?1.35:a.contrast==='over'?1.7:1;l=clamp01((l-.5)*contrast+.5);
    const noise=a.dither==='checker'?((x+y)%2?.11:-.11):a.dither==='ordered'?(bayer[(y%4)*4+x%4]/15-.5)*.3:a.dither==='stipple'?(hash(x,y,context.seed)-.5)*.28:0;
    // Four tones must retain a room even when bright thresholds and high contrast coincide.
    const id=identity[p],rx=Math.min(size-1,px+Math.max(1,Math.round(dx))),by=Math.min(size-1,py+Math.max(1,Math.round(dy))),right=(py*size+rx)*4,below=(by*size+px)*4;
    const normalEdge=Math.abs(normal[p]-normal[right])+Math.abs(normal[p+1]-normal[right+1])+Math.abs(normal[p+2]-normal[right+2])+Math.abs(normal[p]-normal[below])+Math.abs(normal[p+1]-normal[below+1])+Math.abs(normal[p+2]-normal[below+2]);
    if(id>0){l=mix(.06,id===1?.9:.79,l);if(id!==identity[right]||id!==identity[below]||normalEdge>110)l=Math.min(l,id===1?.6:.44);}
    levels[y*cols+x]=Math.round(clamp01(l+noise)*3);
   }
  }
  const cell=(x:number,y:number)=>levels[Math.max(0,Math.min(rows-1,y))*cols+Math.max(0,Math.min(cols-1,x))]/3;
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,X=x/size,Y=y/size,cx=Math.min(cols-1,Math.floor(x/dx)),cy=Math.min(rows-1,Math.floor(y/dy)),fx=(x/dx)%1,fy=(y/dy)%1;
    let level=cell(cx,cy);if(a.ghost==='right')level=mix(level,Math.min(level,cell(cx-1,cy)),.22);if(a.ghost==='down')level=mix(level,Math.min(level,cell(cx,cy-1)),.22);if(a.ghost==='double')level=mix(level,cell(cx-2,cy-1),.17);
    const gap=fx<.12||fy<.12;if(gap&&a.grid==='fine')level*=.95;if(gap&&a.grid==='dark')level*=.78;if(gap&&a.grid==='light')level=mix(level,1,.24);
    if(a.pixels==='rounded'&&Math.hypot(Math.max(0,Math.abs(fx-.5)-.29),Math.max(0,Math.abs(fy-.5)-.29))>.23)level=mix(level,1,.35);
    const illumination=a.light==='left'?.03*(1-X-Y):a.light==='top'?.055*Math.exp(-(((Y-.22)/.2)**2)):a.light==='spot'?.085*Math.exp(-((X-.28)**2+(Y-.24)**2)/.09):0;
    const margin=Math.min(X,Y,1-X,1-Y);if(a.surround==='bezel'&&margin<.035)level=0;if(a.surround==='inset'&&margin<.045)level=margin<.035?1:.12;
    if(a.surround==='ticks'&&(Math.abs(margin-.026)<.0014||margin<.026&&(Math.abs((X*20)%1-.5)<.035||Math.abs((Y*20)%1-.5)<.035)))level=.1;
    for(let c=0;c<3;c++)out[p+c]=mix(d.ink[c],d.paper[c],clamp01(level+illumination));out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.palette} four-tone LCD at ${columns} logical columns`,`${a.dither} dither with ${a.ghost} response ghosting`]};
 }
});
