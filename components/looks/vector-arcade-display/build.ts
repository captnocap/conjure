import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  phosphor:choice('Which vector-display phosphor glows? Designed colours follow the palette.',{green:'Bright green phosphor.',amber:'Warm amber phosphor.',white:'Cool white phosphor.',colour:'Green outlines with amber interior vectors.'}),
  geometry:choice('Which visible lines describe the scene?',{silhouette:'Object silhouettes and the major structural corners of the setting.',creases:'Silhouettes plus strong surface creases.',detail:'Fine normal and tonal detail.',grid:'Contours plus a sparse normal-following vector lattice.'}),
  intensity:score('How hard is the beam driven?',['Dim fine traces','Quiet luminous lines','A clear bright vector image','Strong glowing traces','Very bright beam dwell']),
  width:choice('How wide is the beam trace?',{hair:'A thin hairline beam.',fine:'A fine two-pixel trace.',broad:'A broad soft beam.',core:'A narrow white-hot core inside the trace.'}),
  glow:choice('How does phosphor bloom surround the lines?',{tight:'A tight faint glow.',soft:'Soft local bloom.',wide:'Broad diffuse phosphor halos.',double:'A narrow halo inside a wider faint halo.'}),
  persistence:choice('What trace remains as the beam redraws?',{none:'Only the current vector trace.',short:'A short dim offset afterimage.',long:'A longer faint phosphor trail.',double:'Two lightly displaced redraw traces.'}),
  glass:choice('What lies behind the phosphor?',{black:'Nearly black display glass.',navy:'Very dark blue glass.',green:'Dark green tinted glass.',brown:'Smoky brown tinted glass.'}),
  deflection:choice('How accurately does the beam follow its vectors?',{precise:'Precise stable deflection.',stepped:'Slightly stepped low-resolution deflection.',wobble:'A very small regular deflection wobble.',broken:'Sparse small breaks in the vector trace.'}),
  depth:choice('How does distance affect the visible vectors?',{even:'All visible traces have equal strength.',fade:'Distant traces become dimmer.',bands:'Three depth bands use different intensities.',tint:'Distant traces shift toward the secondary phosphor.'}),
  surround:choice('What frames the vector display?',{full:'The display fills the frame.',bezel:'A narrow dark bezel.',rounded:'Rounded dark display corners.',graticule:'A very faint calibration graticule behind the image.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color,normal,identity,depth}=capture,u=size/720,n=size*size,out=new Uint8ClampedArray(n*4),lines=new Float32Array(n),step=Math.max(1,Math.round(u));
  const phosphors={green:[97,247,138],amber:[255,185,71],white:[212,239,255],colour:[92,240,142]}as const,glasses={black:[3,6,7],navy:[5,10,23],green:[5,18,12],brown:[20,13,8]}as const;
  const d=rekey({ink:phosphors[a.phosphor],second:[255,178,70],paper:glasses[a.glass]},context.palette,{ink:'ink',second:'second',paper:'ground'});
  const at=(x:number,y:number)=>Math.max(0,Math.min(size-1,Math.round(y)))*size+Math.max(0,Math.min(size-1,Math.round(x)));
  const depthAt=(p:number)=>depth[p]/255+depth[p+1]/65025+depth[p+2]/16581375+depth[p+3]/4228250625;
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    let sx=x,sy=y;if(a.deflection==='stepped'){sx=Math.floor(x/(2*step))*2*step;sy=Math.floor(y/(2*step))*2*step;}if(a.deflection==='wobble')sx+=Math.round(Math.sin(y/u*.06)*1.3*u);
    const i=at(sx,sy),p=i*4,r=at(sx+step,sy)*4,b=at(sx,sy+step)*4,id=identity[p];
    const boundary=id!==identity[r]||id!==identity[b],normalDelta=Math.abs(normal[p]-normal[r])+Math.abs(normal[p+1]-normal[r+1])+Math.abs(normal[p+2]-normal[r+2])+Math.abs(normal[p]-normal[b])+Math.abs(normal[p+1]-normal[b+1])+Math.abs(normal[p+2]-normal[b+2]);
    const tonal=Math.abs(color[p]-color[r])+Math.abs(color[p+1]-color[r+1])+Math.abs(color[p+2]-color[r+2]);
    let line=boundary?1:a.geometry==='silhouette'?(id===2?clamp01((normalDelta-82)/170)*.64:0):a.geometry==='detail'?clamp01((normalDelta-16)/80+Math.max(0,tonal-42)/210):clamp01((normalDelta-50)/110);
    if(a.geometry==='grid'&&id>1){const v=(x/u+normal[p]*.12)/16,w=(y/u+normal[p+1]*.12)/16;if(Math.abs(Math.sin(v*Math.PI))<.07||Math.abs(Math.sin(w*Math.PI))<.07)line=Math.max(line,.4);}
    if(id===0&&!boundary)line=0;if(id===1)line*=.45;
    if(a.deflection==='broken'&&hash(Math.floor(x/u/3),Math.floor(y/u/3),context.seed)>.91)line*=.13;
    const z=depthAt(p);if(a.depth==='fade')line*=mix(1,.5,clamp01(z));if(a.depth==='bands')line*=1-Math.min(2,Math.floor(z*3))*.24;
    lines[y*size+x]=line;
   }
  }
  const radius=Math.max(1,Math.round(u*(a.glow==='tight'?1.4:a.glow==='soft'?3.5:a.glow==='wide'?7:5))),width=Math.max(1,Math.round(u*(a.width==='hair'?1:a.width==='fine'?1.7:a.width==='broad'?2.8:1.2)));
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const i=y*size+x,p=i*4,X=x/size,Y=y/size,center=lines[i];let core=center,halo=0;
    for(const[dx,dy]of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1]]){core=Math.max(core,lines[at(x+dx*width,y+dy*width)]*(a.width==='hair'?.15:.65));halo+=lines[at(x+dx*radius,y+dy*radius)]/6;}
    if(a.glow==='double')halo=(halo+lines[at(x+radius*2,y)]*.2+lines[at(x,y+radius*2)]*.2)*.85;
    let after=0;if(a.persistence!=='none'){const shift=(a.persistence==='short'?3:a.persistence==='long'?8:5)*u;after=lines[at(x-shift,y-shift*.25)]*(a.persistence==='long'?.2:.3);if(a.persistence==='double')after+=lines[at(x+shift,y+shift*.4)]*.16;}
    let energy=clamp01((core+halo*(a.glow==='tight'?.2:.65)+after)*mix(.52,1.55,a.intensity));
    const corner=Math.hypot(Math.max(0,Math.abs(X-.5)-.39),Math.max(0,Math.abs(Y-.5)-.39));if(a.surround==='bezel'&&Math.min(X,Y,1-X,1-Y)<.03)energy=0;if(a.surround==='rounded'&&corner>.075)energy=0;
    const grid=a.surround==='graticule'&&(Math.abs((X*10)%1-.5)<.008||Math.abs((Y*10)%1-.5)<.008)?.05:0;
    const alternate=a.phosphor==='colour'&&center<.85?.75:a.depth==='tint'?clamp01(depthAt(p))*.7:0;
    for(let c=0;c<3;c++){const beam=mix(d.ink[c],d.second[c],alternate),hot=a.width==='core'?mix(beam,255,center*.52):beam;out[p+c]=mix(d.paper[c],hot,energy)+grid*(hot-d.paper[c]);}out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.phosphor} vector phosphor with ${a.geometry} visible lines`,`${a.width} beam, ${a.glow} bloom and ${a.persistence} persistence`]};
 }
});
