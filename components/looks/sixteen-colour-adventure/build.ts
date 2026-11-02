import {choice,clamp01,defineLook,mix,rekey,score} from '@conjure/kit';
const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
export default defineLook({
 questions:{
  resolution:score('How fine is the pixel artwork?',['Large blocky pixels','Coarse adventure-game pixels','A classic low-resolution image','Small detailed pixels','A relatively fine pixel drawing']),
  aspect:choice('What shape are the logical pixels?',{square:'Square pixels.',wide:'Slightly wide display pixels.',tall:'Slightly tall display pixels.',double:'Wide doubled horizontal pixels.'}),
  palette:choice('Which sixteen-colour family is used? Designed colours follow the palette.',{classic:'Vivid computer-era primaries and neutral ramps.',sunset:'Warm rust, gold, plum and cream.',marine:'Deep navy, teal, lilac and pale sand.',forest:'Dark green, moss, brown and warm light.'}),
  dither:choice('How are intermediate shades suggested?',{none:'Flat nearest-colour regions.',checker:'Alternating checker pixels.',ordered:'A four-by-four ordered dither.',noise:'Fine irregular pixel stipple.'}),
  lighting:choice('How are the scene values simplified?',{natural:'Retain the scene value range.',three:'Three strong value groups.',five:'Five separated value groups.',contrast:'High-contrast deep shadows and bright lights.'}),
  outlines:choice('How are important boundaries drawn?',{none:'No added outlines.',dark:'A dark one-pixel outline.',colour:'A darker local colour outline.',selective:'Outline only the strongest object boundaries.'}),
  texture:choice('What hand-placed pixel texture remains?',{plain:'Clean solid colour regions.',speck:'Sparse one-pixel material flecks.',hatch:'Small diagonal hatch marks in shade.',tiles:'Subtle repeating two-by-two surface patterns.'}),
  shadows:choice('How are shadow regions coloured?',{neutral:'Neutral dark palette colours.',blue:'Shadows lean toward blue.',warm:'Shadows lean toward warm brown.',checker:'A coarse checker pattern lightens dark shadows.'}),
  screen:choice('How is the image displayed?',{clean:'A clean pixel-art image.',scan:'Very light horizontal scan lines.',grid:'A faint display pixel grid.',phosphor:'A subtle alternating RGB display mask.'}),
  border:choice('What surrounds the image?',{full:'The pixel image fills the frame.',black:'A narrow black display border.',bevel:'A simple two-tone window bevel.',matte:'A broad pale palette-coloured matte.'}),
 },
 async apply(capture,a,context,signal){
  signal.throwIfAborted();const{size,color,identity}=capture,out=new Uint8ClampedArray(color.length);
  const families={classic:[[16,20,31],[28,60,152],[46,148,159],[83,169,93],[163,46,63],[157,68,160],[218,147,54],[224,215,172]],sunset:[[32,22,37],[77,38,78],[125,49,71],[176,74,51],[217,126,55],[213,165,96],[170,130,145],[240,218,180]],marine:[[16,28,47],[30,62,106],[41,109,132],[71,153,158],[104,110,169],[171,135,184],[196,176,132],[222,229,209]],forest:[[22,31,22],[38,69,48],[68,105,61],[115,137,67],[113,77,47],[161,113,61],[184,165,102],[222,221,178]]}as const;
  const base=families[a.palette],d=rekey({ink:base[0],second:base[4],paper:base[7]},context.palette,{ink:'ink',second:'second',paper:'ground'});
  const pal:number[][]=[];for(let i=0;i<8;i++){const c=context.palette?base[i].map((_,j)=>mix(d.ink[j],i%2?d.second[j]:d.paper[j],.14+i*.11)):Array.from(base[i]);pal.push(c.map(v=>Math.round(v)));pal.push(c.map((v,j)=>Math.round(mix(v,context.palette?d.paper[j]:248,.32))));}
  const columns=Math.round(mix(88,238,a.resolution)),baseStep=size/columns,dx=Math.max(1,baseStep*(a.aspect==='wide'?1.3:a.aspect==='double'?1.85:1)),dy=Math.max(1,baseStep*(a.aspect==='tall'?1.35:1));
  const cols=Math.ceil(size/dx),rows=Math.ceil(size/dy),cells=new Uint8Array(cols*rows),ids=new Uint8Array(cols*rows),lum=new Float32Array(cols*rows);
  const nearest=(r:number,g:number,b:number)=>{let best=0,dist=Infinity;for(let k=0;k<16;k++){const q=pal[k],v=(r-q[0])**2*.27+(g-q[1])**2*.53+(b-q[2])**2*.2;if(v<dist){dist=v;best=k;}}return best;};
  for(let y=0;y<rows;y++){
   if(y%24===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<cols;x++){
    const px=Math.min(size-1,Math.floor((x+.5)*dx)),py=Math.min(size-1,Math.floor((y+.5)*dy)),p=(py*size+px)*4,i=y*cols+x;
    let r=color[p],g=color[p+1],b=color[p+2],l=(r*.2126+g*.7152+b*.0722)/255;ids[i]=identity[p];lum[i]=l;
    const target=a.lighting==='three'?Math.round(l*3)/3:a.lighting==='five'?Math.round(l*5)/5:a.lighting==='contrast'?clamp01((l-.15)*1.4):l,change=(target-l)*255;r+=change;g+=change;b+=change;
    const perturb=a.dither==='checker'?((x+y)%2?14:-14):a.dither==='ordered'?(bayer[(y%4)*4+x%4]/15-.5)*45:a.dither==='noise'?(hash(x,y,context.seed)-.5)*39:0;r+=perturb;g+=perturb;b+=perturb;
    if(l<.48){if(a.shadows==='blue'){r-=14;b+=23;}if(a.shadows==='warm'){r+=22;b-=15;}if(a.shadows==='checker'&&(Math.floor(x/2)+Math.floor(y/2))%2){r+=25;g+=25;b+=25;}}
    if(ids[i]>0){const n=hash(x,y,context.seed+37),mark=a.texture==='speck'&&n>.96?24:a.texture==='hatch'&&l<.55&&(x+y)%5===0?-24:a.texture==='tiles'?((x%2)^(y%2)?7:-7):0;r+=mark;g+=mark;b+=mark;}
    cells[i]=nearest(r,g,b);
   }
  }
  const dark=nearest(...d.ink as [number,number,number]),pale=nearest(...d.paper as [number,number,number]);
  for(let y=0;y<size;y++){
   if(y%32===0){signal.throwIfAborted();await new Promise<void>(r=>setTimeout(r,0));}
   for(let x=0;x<size;x++){
    const p=(y*size+x)*4,cx=Math.min(cols-1,Math.floor(x/dx)),cy=Math.min(rows-1,Math.floor(y/dy)),i=cy*cols+cx,r=cy*cols+Math.min(cols-1,cx+1),b=Math.min(rows-1,cy+1)*cols+cx;
    let index=cells[i];const edge=ids[i]!==ids[r]||ids[i]!==ids[b],shade=Math.max(Math.abs(lum[i]-lum[r]),Math.abs(lum[i]-lum[b]));
    if(ids[i]>0&&a.outlines!=='none'&&(edge||a.outlines!=='selective'&&shade>.2)){if(a.outlines==='colour'){const c=pal[index];index=nearest(c[0]*.58,c[1]*.58,c[2]*.58);}else index=dark;}
    const margin=Math.min(x,y,size-1-x,size-1-y)/size;if(a.border==='black'&&margin<.025)index=dark;if(a.border==='matte'&&margin<.06)index=pale;
    if(a.border==='bevel'&&margin<.025)index=x+y<size?pale:dark;
    for(let c=0;c<3;c++){let v=pal[index][c];if(a.screen==='scan'&&(y%Math.max(2,Math.round(dy)))===0)v*=.88;if(a.screen==='grid'&&(Math.floor(x%dx)===0||Math.floor(y%dy)===0))v*=.9;if(a.screen==='phosphor'&&(x%3)!==c)v*=.94;out[p+c]=v;}out[p+3]=255;
   }
  }signal.throwIfAborted();return{pixels:out,notes:[`${a.palette} sixteen-colour palette at ${columns} logical columns`,`${a.dither} dithering and ${a.aspect} pixels`]};
 }
});
