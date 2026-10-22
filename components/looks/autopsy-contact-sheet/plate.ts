import type { Capture, BuildContext } from '@conjure/kit';
export type Box = [number, number, number, number];
export type RGB = [number, number, number];
export const inks: Record<string, RGB> = { iron: [29, 38, 36], rust: [91, 35, 26], violet: [58, 39, 65], blue: [24, 51, 69], olive: [52, 59, 30] };
export const css = (c: RGB) => `rgb(${c.join(',')})`;
export function surface(n: number) { const canvas = document.createElement('canvas'); canvas.width = canvas.height = n; return canvas; }
export function snapshot(c: HTMLCanvasElement) { const o = surface(c.width); o.getContext('2d')!.drawImage(c, 0, 0); return o; }
export function hash(x: number, y: number, seed: number) { let a = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed; a = Math.imul(a ^ (a >>> 13), 1274126177); return ((a ^ (a >>> 16)) >>> 0) / 4294967296; }
export function crop(c: Capture, index = 0, zoom = 1): Box {
  const map = new Map<number, [number, number, number, number, number]>(); const n = c.size;
  for (let y = 0; y < n; y += 3) for (let x = 0; x < n; x += 3) { const id = c.identity[(y * n + x) * 4]; if (id < 2) continue; const b = map.get(id) ?? [n, n, 0, 0, 0]; b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); b[4]++; map.set(id, b); }
  const bs = [...map.values()].filter(b => b[4] > 9).sort((a,b) => a[4] - b[4]); const b = bs[index % Math.max(1, bs.length)];
  if (!b) return [.2,.2,.6,.6]; const span = Math.min(n, Math.max(n * .12, Math.max(b[2]-b[0], b[3]-b[1]) * 1.22 / zoom));
  return [Math.max(0, Math.min(n-span, (b[0]+b[2]-span)/2))/n, Math.max(0, Math.min(n-span,(b[1]+b[3]-span)/2))/n,span/n,span/n];
}
export async function develop(c: Capture, ctx: BuildContext, signal: AbortSignal, mode: 'silver'|'etch'|'carbon'|'phosphor'|'negative'|'bleach', ink: RGB): Promise<HTMLCanvasElement> {
  const n = c.size, out = new Uint8ClampedArray(n*n*4), p: RGB = [239, 232-ctx.mood.warmth*9, 216-ctx.mood.warmth*14];
  for (let y=0;y<n;y++) { if (y % 64 === 0) { if(signal.aborted) throw new DOMException('Aborted','AbortError'); await new Promise<void>(r=>setTimeout(r,0)); }
    for(let x=0;x<n;x++){ const i=(y*n+x)*4, id=c.identity[i], lum=(c.color[i]*.25+c.color[i+1]*.59+c.color[i+2]*.16)/255; const noise=(hash(x,y,ctx.seed)-.5)*(3+ctx.mood.wear*12);
      const edge=x<n-1&&y<n-1&&(c.identity[i+4]!==id||c.identity[i+n*4]!==id); let v=Math.max(0,Math.min(1,(lum-.12)*1.14));
      if(mode==='etch'){ const spacing=id>=3?4:6; const hatch=(x+Math.floor(y*.65)+id*7)%spacing===0; v = edge ? .08 : Math.max(.02, v-(hatch ? (1-v)*.48 : -.06)); }
      if(mode==='silver') v=id===0?.95:v<.30?.045:v<.57?.43:v<.81?.76:.94;
      if(mode==='carbon') v=Math.round(v*5)/5;
      if(mode==='negative') v=1-v;
      if(mode==='bleach') v=.2+v*.75;
      for(let k=0;k<3;k++){ let value=ink[k]*(1-v)+p[k]*v; if(mode==='silver') value=value*.78+c.color[i+k]*.22; if(mode==='phosphor'){ const ph=ink[k]+(k===1?65:25); value=10+v*ph*(y%3===0?.74:1); } out[i+k]=value+noise; } out[i+3]=255;
    }
  }
  const canvas=surface(n); canvas.getContext('2d')!.putImageData(new ImageData(out,n,n),0,0); return canvas;
}
export function sheet(n:number) { const canvas=surface(n), g=canvas.getContext('2d')!; g.scale(n/720,n/720); return {canvas,g}; }
export function paper(g: CanvasRenderingContext2D, ctx: BuildContext, tint='#d8cbb1') { g.fillStyle=tint; g.fillRect(0,0,720,720); for(let i=0;i<1800+ctx.mood.wear*1800;i++){ const x=ctx.random()*720,y=ctx.random()*720;g.fillStyle=ctx.random()>.5?'rgba(255,245,220,.14)':'rgba(43,31,23,.10)';g.fillRect(x,y,.5+ctx.random()*1.2,.5+ctx.random()*2); } }
export function image(g: CanvasRenderingContext2D, src:HTMLCanvasElement, b:Box, source:Box=[0,0,1,1], flip=false) {g.save();g.beginPath();g.rect(...b);g.clip(); if(flip){g.translate(b[0]*2+b[2],0);g.scale(-1,1);}g.drawImage(src,source[0]*src.width,source[1]*src.height,source[2]*src.width,source[3]*src.height,...b);g.restore();}
export function border(g: CanvasRenderingContext2D,b:Box,color='#262925',width=2){g.strokeStyle=color;g.lineWidth=width;g.strokeRect(...b);}
export function label(g:CanvasRenderingContext2D,text:string,x:number,y:number,size=10,color='#39382c'){g.fillStyle=color;g.font=`${size}px monospace`;g.fillText(text,x,y);}
export function rules(g:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,color='#373b32'){g.strokeStyle=color;g.lineWidth=.7;g.beginPath();g.moveTo(x,y);g.lineTo(x+w,y);for(let i=0;i<=w;i+=5){g.moveTo(x+i,y);g.lineTo(x+i,y+(i%25===0?h:h*.45));}g.stroke();}
export function scratches(g:CanvasRenderingContext2D, ctx:BuildContext, amount=1){g.save();g.strokeStyle='rgba(238,227,197,.22)';g.lineWidth=.7;for(let i=0;i<Math.round((12+ctx.mood.wear*65)*amount);i++){const x=ctx.random()*720,y=ctx.random()*720;g.beginPath();g.moveTo(x,y);g.lineTo(x+ctx.random()*8-4,y+ctx.random()*110);g.stroke();}g.restore();}
export function pixels(canvas:HTMLCanvasElement, signal:AbortSignal){if(signal.aborted)throw new DOMException('Aborted','AbortError');return canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data;}
