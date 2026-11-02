import { type BuildContext, type Capture, type PaletteRole, type RGB, fromOklch, oklch, rekey } from '@conjure/kit';
export type Palette = {paper:string; ink:string; accent:string; soft:string};
export const PALETTES: Record<string, Palette> = {
 bone:{paper:'#d7cfb3',ink:'#282b25',accent:'#936d46',soft:'#8f947d'},
 rust:{paper:'#c8ab8c',ink:'#352923',accent:'#a5452f',soft:'#80725f'},
 ink:{paper:'#bfc9c5',ink:'#202e34',accent:'#647f80',soft:'#81938e'},
 acid:{paper:'#c8cc9c',ink:'#30382b',accent:'#88963c',soft:'#8d9067'},
};
const ROLES:Record<string,PaletteRole>={paper:'ground',ink:'ink',soft:'ink',accent:'second'};
const hexRGB=(v:string):RGB=>[parseInt(v.slice(1,3),16),parseInt(v.slice(3,5),16),parseInt(v.slice(5,7),16)];
const hexOf=(c:RGB)=>'#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');
/** A line or mid tone keeps `keep` of its designed distance below the paper, so a pale palette ink cannot wash it into the stock. */
const below=(c:RGB,paper:RGB,was:string,wasPaper:string,keep:number):RGB=>{const [L,C,h]=oklch(c),cap=oklch(paper)[0]-(oklch(hexRGB(wasPaper))[0]-oklch(hexRGB(was))[0])*keep;return L>cap?fromOklch(cap,C,h):c;};
/** The pigments under the idea's palette: paper takes the ground, ink and soft the ink, the accent the second. As made without one. */
export function settle(key:string,context:BuildContext):Palette{
 const base=PALETTES[key]??PALETTES.bone;if(!context.palette)return base;
 const c=rekey({paper:hexRGB(base.paper),ink:hexRGB(base.ink),accent:hexRGB(base.accent),soft:hexRGB(base.soft)},context.palette,ROLES);
 return {paper:hexOf(c.paper),ink:hexOf(below(c.ink,c.paper,base.ink,base.paper,.85)),accent:hexOf(c.accent),soft:hexOf(below(c.soft,c.paper,base.soft,base.paper,.6))};
}
const rgb=(v:string)=>[1,3,5].map(i=>parseInt(v.slice(i,i+2),16));
export function surface(n:number){const canvas=document.createElement('canvas');canvas.width=canvas.height=n;const g=canvas.getContext('2d')!;return {canvas,g};}
export function hash(x:number,y:number,seed:number){let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(seed|0,1274126177);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
export function prepare(c:Capture,context:BuildContext,signal:AbortSignal,key:string){
 const n=c.size,p=settle(key,context),paper=rgb(p.paper),ink=rgb(p.ink),out=new Uint8ClampedArray(c.color.length);
 for(let y=0;y<n;y++){if((y&31)===0)signal.throwIfAborted();for(let x=0;x<n;x++){
  const i=(y*n+x)*4,id=c.identity[i],L=(c.color[i]*.3+c.color[i+1]*.59+c.color[i+2]*.11)/255;
  const lit=c.diffuse[i]/255,step=id>=3?4:7,grain=(hash(x,y,context.seed)-.5)*(2+context.mood.wear*6);
  const edge=x>0&&y>0&&(c.identity[i-4]!==id||c.identity[i-n*4]!==id);
  const hatch=((x+Math.floor(y*(c.normal[i]/255+.3)))%step===0)&&L<.58;
  const tone=Math.max(.10,Math.min(.98,L*.9+.08+(lit-.5)*.04));
  for(let k=0;k<3;k++){const pigment=ink[k]+(paper[k]-ink[k])*tone;out[i+k]=edge?pigment*.63:(c.color[i+k]*.48+pigment*.52+grain)*(hatch?.91:1);}
  out[i+3]=255;
 }}
 const source=surface(n);source.g.putImageData(new ImageData(out,n,n),0,0);
 const target=surface(n);target.g.drawImage(source.canvas,0,0);target.g.scale(n/720,n/720);
 const boxes=new Map<number,{x:number;y:number;w:number;h:number;n:number}>();
 for(let y=0;y<n;y+=2)for(let x=0;x<n;x+=2){const id=c.identity[(y*n+x)*4];if(id<3)continue;let b=boxes.get(id);if(!b){b={x,y,w:x,h:y,n:0};boxes.set(id,b);}b.x=Math.min(b.x,x);b.y=Math.min(b.y,y);b.w=Math.max(b.w,x);b.h=Math.max(b.h,y);b.n++;}
 for(const b of boxes.values()){b.w=(b.w-b.x+2)*720/n;b.h=(b.h-b.y+2)*720/n;b.x*=720/n;b.y*=720/n;}
 return {n,p,source:source.canvas,g:target.g,canvas:target.canvas,base:out,boxes:[...boxes.values()]};
}
export function finish(t:ReturnType<typeof prepare>,c:Capture,signal:AbortSignal,protect=true){
 const pixels=t.g.getImageData(0,0,t.n,t.n).data;
 if(protect)for(let y=0;y<t.n;y++){if((y&63)===0)signal.throwIfAborted();for(let x=0;x<t.n;x++){const i=(y*t.n+x)*4;if(c.identity[i]>=3){pixels[i]=t.base[i];pixels[i+1]=t.base[i+1];pixels[i+2]=t.base[i+2];}}}
 return pixels;
}
export function line(g:CanvasRenderingContext2D,x:number,y:number,x2:number,y2:number,color:string,width=1){g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(x,y);g.lineTo(x2,y2);g.stroke();}
export function arch(g:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,style='arch'){
 g.beginPath();if(style==='arch'){g.moveTo(x,y+h);g.lineTo(x,y+w*.45);g.bezierCurveTo(x,y-w*.15,x+w,y-w*.15,x+w,y+w*.45);g.lineTo(x+w,y+h);g.closePath();}
 else if(style==='eye'){g.moveTo(x,y+h*.5);g.bezierCurveTo(x+w*.25,y-h*.2,x+w*.75,y-h*.2,x+w,y+h*.5);g.bezierCurveTo(x+w*.75,y+h*1.2,x+w*.25,y+h*1.2,x,y+h*.5);g.closePath();}
 else if(style==='oval')g.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);
 else g.rect(x,y,w,h);
}
/** A bounded literal picture in a picture, with one displaced inner view per level. */
export function inset(g:CanvasRenderingContext2D,source:HTMLCanvasElement,p:Palette,x:number,y:number,w:number,h:number,levels:number,style='rect',mirror=false){
 if(w<4||h<5)return;g.save();arch(g,x-3,y-3,w+6,h+6,style);g.fillStyle=p.ink;g.fill();arch(g,x,y,w,h,style);g.clip();g.fillStyle=p.paper;g.fillRect(x,y,w,h);
 if(mirror){g.translate(x+w,y);g.scale(-1,1);g.drawImage(source,0,0,w,h);g.setTransform(g.getTransform().multiply(new DOMMatrix().translate(0,0)));}else g.drawImage(source,x,y,w,h);
 g.restore();g.save();arch(g,x,y,w,h,style);g.strokeStyle=p.accent;g.lineWidth=1;g.stroke();g.restore();
 if(levels>1)inset(g,source,p,x+w*.57,y+h*.16,w*.31,h*.37,levels-1,style,!mirror);
}
export function quiet(c:Capture,x:number,y:number,w:number,h:number){let hit=0,total=0;const k=c.size/720;for(let yy=y;yy<y+h;yy+=10)for(let xx=x;xx<x+w;xx+=10){const sx=Math.max(0,Math.min(c.size-1,Math.floor(xx*k))),sy=Math.max(0,Math.min(c.size-1,Math.floor(yy*k)));const id=c.identity[(sy*c.size+sx)*4];hit+=id>=3?8:id===2?1:0;total++;}return hit/Math.max(1,total);}
export function glyphs(g:CanvasRenderingContext2D,p:Palette,x:number,y:number,w:number,seed:number){for(let j=0;j<Math.floor(w/7);j++){const z=hash(j,4,seed);line(g,x+j*7,y,x+j*7+3,y-3-z*5,p.ink,.7);if(z>.3)line(g,x+j*7-1,y-4,x+j*7+4,y-4,p.ink,.6);}}
