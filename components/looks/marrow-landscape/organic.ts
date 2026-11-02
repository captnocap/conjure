import { type BuildContext, type Capture, type PaletteRole, type RGB, fromOklch, oklch, rekey, rekeyOne } from '@conjure/kit';
export type Rect = [number, number, number, number];
export type P = {paper:string; ink:string; mid:string; accent:string; rgb:[number,number,number]};
export const palettes: Record<string,P> = {
 bone:{paper:'#d9d0b1',ink:'#24291f',mid:'#8e8b64',accent:'#a1452c',rgb:[217,208,177]},
 rust:{paper:'#d9b393',ink:'#31251f',mid:'#885840',accent:'#66352c',rgb:[217,179,147]},
 verdigris:{paper:'#bfc8ae',ink:'#23382f',mid:'#6c8a73',accent:'#a75c38',rgb:[191,200,174]},
 charcoal:{paper:'#cbc3b4',ink:'#282924',mid:'#706c5e',accent:'#905b47',rgb:[203,195,180]},
};
const ROLES:Record<string,PaletteRole>={paper:'ground',ink:'ink',mid:'ink',accent:'second'};
const hexRGB=(v:string):RGB=>[parseInt(v.slice(1,3),16),parseInt(v.slice(3,5),16),parseInt(v.slice(5,7),16)];
const hexOf=(c:RGB)=>'#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');
/** A line or mid tone keeps `keep` of its designed distance below the paper, so a pale palette ink cannot wash it into the stock. */
const below=(c:RGB,paper:RGB,was:string,wasPaper:string,keep:number):RGB=>{const [L,C,h]=oklch(c),cap=oklch(paper)[0]-(oklch(hexRGB(wasPaper))[0]-oklch(hexRGB(was))[0])*keep;return L>cap?fromOklch(cap,C,h):c;};
/** The stains under the idea's palette: paper takes the ground, ink and mid the ink, the accent the second. As made without one. */
export function settle(key:string,ctx:BuildContext):P{
 const base=palettes[key]??palettes.bone;if(!ctx.palette)return base;
 const c=rekey({paper:hexRGB(base.paper),ink:hexRGB(base.ink),mid:hexRGB(base.mid),accent:hexRGB(base.accent)},ctx.palette,ROLES);
 return {paper:hexOf(c.paper),ink:hexOf(below(c.ink,c.paper,base.ink,base.paper,.85)),mid:hexOf(below(c.mid,c.paper,base.mid,base.paper,.6)),accent:hexOf(c.accent),rgb:[c.paper[0],c.paper[1],c.paper[2]]};
}
/** A build's own fixed colour (a bleach, a bone highlight) under the palette; unchanged without one. */
export function tint(hex:string,ctx:BuildContext,role:PaletteRole){return ctx.palette?hexOf(rekeyOne(hexRGB(hex),ctx.palette,role)):hex;}
export function stop(signal:AbortSignal){if(signal.aborted)throw signal.reason??new DOMException('Aborted','AbortError');}
export function canvas(s:number){const c=document.createElement('canvas');c.width=c.height=s;return c;}
export function organ(x:number,y:number,rx:number,ry:number,lobes=0,phase=0){const p=new Path2D();for(let k=0;k<=96;k++){const t=k/96*Math.PI*2;const wob=1+Math.sin(t*3+phase)*lobes+Math.sin(t*5-phase)*lobes*.45;const xx=x+Math.cos(t)*rx*wob,yy=y+Math.sin(t)*ry*wob;k?p.lineTo(xx,yy):p.moveTo(xx,yy);}p.closePath();return p;}
export function oval(x:number,y:number,rx:number,ry=rx){const p=new Path2D();p.ellipse(x,y,rx,ry,0,0,Math.PI*2);return p;}
export async function prepare(cap:Capture,ctx:BuildContext,signal:AbortSignal,palette:string){
 const s=cap.size,p=settle(palette,ctx),src=canvas(s),g=src.getContext('2d')!;
 const img=g.createImageData(s,s),out=img.data,boxes=new Map<number,{x:number;y:number;X:number;Y:number;n:number}>();
 for(let y=0;y<s;y++){if(y%64===0){stop(signal);await new Promise<void>(r=>setTimeout(r,0));}for(let x=0;x<s;x++){
  const i=(y*s+x)*4,id=cap.identity[i],c=cap.color,lum=c[i]*.23+c[i+1]*.63+c[i+2]*.14;
  const edge=x<s-1&&y<s-1&&(id!==cap.identity[i+4]||id!==cap.identity[i+s*4]);
  const noise=(((x*13+y*37+(ctx.seed%997)*7)%101)/101-.5)*(2+ctx.mood.wear*7);
  const fibre=id>0&&((x*3+y*2+Math.round(cap.normal[i]*.10))%21<2)?.955:1;
  const line=(edge&&id>0?.67:1)*fibre,light=.12+lum/255*.88;
  for(let k=0;k<3;k++)out[i+k]=(c[i+k]*.42+p.rgb[k]*light*.58)*line+noise;
  out[i+3]=255;
  if(id>=2){const b=boxes.get(id);if(b){b.x=Math.min(b.x,x);b.y=Math.min(b.y,y);b.X=Math.max(b.X,x);b.Y=Math.max(b.Y,y);b.n++;}else boxes.set(id,{x,y,X:x,Y:y,n:1});}
 }}
 g.putImageData(img,0,0);
 const sourceHost=canvas(s),sourceHostContext=sourceHost.getContext('2d')!,hostPixels=sourceHostContext.createImageData(s,s);
 for(let i=0;i<cap.identity.length;i+=4){const value=cap.identity[i]===0?0:cap.identity[i]===1?112:255;hostPixels.data[i]=hostPixels.data[i+1]=hostPixels.data[i+2]=value;hostPixels.data[i+3]=255;}sourceHostContext.putImageData(hostPixels,0,0);
 const host=canvas(s),h=host.getContext('2d',{willReadFrequently:true})!;h.fillStyle='#000';h.fillRect(0,0,s,s);h.scale(s,s);h.lineCap='round';h.lineJoin='round';

 const targets=[...boxes.entries()].filter(([id,b])=>id>=3&&b.n>35).sort((a,b)=>b[1].n-a[1].n);
 if(!targets.length)targets.push(...[...boxes.entries()].sort((a,b)=>b[1].n-a[1].n));
 const rects:Rect[]=targets.map(([,b])=>{const w=(b.X-b.x)/s,h=(b.Y-b.y)/s,side=Math.min(.95,Math.max(w,h)*1.32+.04);return [Math.max(0,Math.min(1-side,(b.x+b.X)/s/2-side/2)),Math.max(0,Math.min(1-side,(b.y+b.Y)/s/2-side/2)),side,side];});
 if(!rects.length)rects.push([.15,.15,.7,.7]);
 const outCanvas=canvas(s),d=outCanvas.getContext('2d',{willReadFrequently:true})!;d.scale(s,s);d.fillStyle=p.paper;d.fillRect(0,0,1,1);d.lineCap='round';d.lineJoin='round';
 return {s,p,src,d,outCanvas,rects,signal,ctx,host,h,sourceHost};
}
export type Frame=Awaited<ReturnType<typeof prepare>>;
export function scene(f:Frame,path:Path2D,rect:Rect,crop:Rect=[0,0,1,1],opacity=1,source:HTMLCanvasElement=f.src){
 const d=f.d;d.save();d.clip(path);d.globalAlpha=opacity;d.drawImage(source,crop[0]*f.s,crop[1]*f.s,crop[2]*f.s,crop[3]*f.s,...rect);d.restore();
 f.h.save();f.h.clip(path);f.h.drawImage(f.sourceHost,crop[0]*f.s,crop[1]*f.s,crop[2]*f.s,crop[3]*f.s,...rect);f.h.restore();
}
export function anatomy(f:Frame,path:Path2D,width?:number){f.h.fillStyle=f.h.strokeStyle='#fff';if(width===undefined)f.h.fill(path);else{f.h.lineWidth=width;f.h.stroke(path);}}
export function rim(f:Frame,path:Path2D,width=.008,inner=true){anatomy(f,path,width);const d=f.d;d.strokeStyle=f.p.ink;d.lineWidth=width;d.stroke(path);if(inner){d.strokeStyle=f.p.paper;d.lineWidth=width*.37;d.stroke(path);}}
export function crop(f:Frame,target:string,i=0):Rect{return target==='world'?[0,0,1,1]:target==='witness'?f.rects[(i+1)%f.rects.length]:f.rects[i%f.rects.length];}
export function membrane(f:Frame,x:number,y:number,rx:number,ry:number,c:Rect,style:string,lobes=.035,source?:HTMLCanvasElement){
 const p=organ(x,y,rx,ry,lobes,x*17+y*9);scene(f,p,[x-rx,y-ry,rx*2,ry*2],c,1,source);
 const d=f.d,thick=Math.max(.005,Math.min(.038,rx*.10));anatomy(f,p,thick*1.32);
 const glaze=d.createLinearGradient(x-rx,y-ry,x+rx,y+ry);glaze.addColorStop(0,f.p.ink);glaze.addColorStop(.18,f.p.mid);glaze.addColorStop(.46,f.p.paper);glaze.addColorStop(.68,f.p.mid);glaze.addColorStop(1,f.p.ink);
 d.strokeStyle=f.p.ink;d.lineWidth=thick*1.32;d.stroke(p);d.strokeStyle=glaze;d.lineWidth=thick;d.stroke(p);
 d.strokeStyle=f.p.paper;d.lineWidth=.0017;d.stroke(organ(x,y,rx+thick*.38,ry+thick*.38,lobes,x*17+y*9));
 for(let k=0;k<72;k++){const t=k/72*Math.PI*2,wob=1+Math.sin(t*3+x*17+y*9)*lobes+Math.sin(t*5-x*17-y*9)*lobes*.45;const xx=x+Math.cos(t)*rx*wob,yy=y+Math.sin(t)*ry*wob;d.beginPath();d.moveTo(xx-Math.cos(t)*thick*.47,yy-Math.sin(t)*thick*.47);d.lineTo(xx+Math.cos(t)*thick*.48,yy+Math.sin(t)*thick*.48);d.strokeStyle=k%4===0?f.p.accent:f.p.ink;d.globalAlpha=.32;d.lineWidth=.0008;d.stroke();}d.globalAlpha=1;
if(style==='double'){d.strokeStyle=f.p.accent;d.lineWidth=.002;d.stroke(organ(x,y,rx*1.055,ry*1.055,lobes,x*17+y*9));}
 if(style==='cilia'||style==='sutures'){for(let i=0;i<48;i++){const t=i*Math.PI/24;const a=style==='cilia'?.011:.007;d.beginPath();d.moveTo(x+Math.cos(t)*rx*.99,y+Math.sin(t)*ry*.99);d.lineTo(x+Math.cos(t)*(rx+a),y+Math.sin(t)*(ry+a));d.strokeStyle=i%5===0?f.p.accent:f.p.ink;d.lineWidth=.0014;d.stroke();}}
 return p;
}
export function line(f:Frame,points:number[],color=f.p.ink,width=.002){const d=f.d;d.strokeStyle=color;d.lineWidth=width;d.beginPath();d.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)d.lineTo(points[i],points[i+1]);d.stroke();f.h.beginPath();f.h.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)f.h.lineTo(points[i],points[i+1]);f.h.strokeStyle='#fff';f.h.lineWidth=width;f.h.stroke();}
export function vein(f:Frame,x:number,y:number,X:number,Y:number,width=.008){const d=f.d;f.h.beginPath();f.h.moveTo(x,y);f.h.bezierCurveTo(x+(X-x)*.5,y-.07,X-.06,Y+.08,X,Y);f.h.strokeStyle='#fff';f.h.lineWidth=width;f.h.stroke();for(const [w,c] of [[width,f.p.ink],[width*.45,f.p.accent]] as [number,string][]){d.beginPath();d.moveTo(x,y);d.bezierCurveTo(x+(X-x)*.5,y-.07,X-.06,Y+.08,X,Y);d.lineWidth=w;d.strokeStyle=c;d.stroke();}}
export function dust(f:Frame,amount=1){const d=f.d,r=f.ctx.random;for(let i=0;i<Math.floor((230+f.ctx.mood.density*350)*amount);i++){stop(f.signal);const x=r(),y=r();d.fillStyle=i%5?f.p.ink:f.p.accent;d.globalAlpha=.12+r()*.18;d.fillRect(x,y,.0007+r()*.0014,.0007+r()*.0014);}d.globalAlpha=1;}
export function label(f:Frame,text:string,x:number,y:number,size=.011){const d=f.d;d.save();d.setTransform(1,0,0,1,0,0);d.font=`${size*f.s}px monospace`;d.fillStyle=f.p.ink;d.fillText(text,x*f.s,y*f.s);d.restore();}
export function finish(f:Frame,notes:string[]){stop(f.signal);dust(f);return {pixels:f.d.getImageData(0,0,f.s,f.s).data,notes};}
