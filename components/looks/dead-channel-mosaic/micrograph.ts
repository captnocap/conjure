import type { BuildContext, Capture } from '@conjure/kit';
export type MicroWorld = 'witnesses' | 'chimeras' | 'rites' | 'menagerie';
export type MicroMedium = 'engraving' | 'carbon' | 'phosphor' | 'emulsion' | 'postal' | 'scraped' | 'censor' | 'forensic';
export interface MicroOptions { vocabulary: MicroWorld; hierarchy: number; medium: MicroMedium; paper?: boolean }
const TAU = Math.PI * 2;
function noise(x: number, y: number, seed: number) { let v = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed; v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) / 4294967296; }
/** A hand-drawn story, not a texture symbol. Large stories contain smaller participants. */
function story(g: CanvasRenderingContext2D, kind: number, detail: number) {
  const line = (points: number[]) => {g.beginPath();g.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);g.stroke();};
  const oval = (x:number,y:number,rx:number,ry:number,fill=false) => {g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU);fill?g.fill():g.stroke();};
  const eye = (x:number,y:number,r:number) => {g.beginPath();g.moveTo(x-r,y);g.quadraticCurveTo(x,y-r*.83,x+r,y);g.quadraticCurveTo(x,y+r*.83,x-r,y);g.stroke();oval(x,y,r*.23,r*.38,true);};
  const person=(x:number,y:number,s:number,pose=0)=>{oval(x,y-s*.61,s*.16,s*.20);line([x-s*.06,y-s*.4,x-s*.27,y+s*.22,x+s*.25,y+s*.22,x+s*.05,y-s*.4]);line([x-s*.21,y-s*.16,x-s*.4,y-(pose?.48:.05)]);line([x+s*.19,y-s*.16,x+s*.40,y-(pose?.48:.05)]);line([x-s*.1,y+s*.23,x-s*.18,y+s*.48]);line([x+s*.1,y+s*.23,x+s*.18,y+s*.48]);};
  const teeth=(x:number,y:number,w:number,h:number,n:number)=>{for(let j=0;j<n;j++){const a=x+j*w/n;line([a,y,a+w/n*.35,y+h,a+w/n*.78,y]);}};
  switch(kind%9){
    case 0: { // a mask whose forehead is an inhabited chapel
      g.beginPath();g.moveTo(-.39,-.31);g.bezierCurveTo(-.44,-.63,.37,-.56,.4,-.25);g.lineTo(.29,.27);g.lineTo(.06,.49);g.lineTo(-.21,.42);g.lineTo(-.38,.09);g.closePath();g.stroke();
      eye(-.17,-.09,.13);eye(.18,-.13,.14);line([0,-.02,-.07,.17,.08,.15]);line([-.23,.27,.2,.24]);teeth(-.21,.26,.41,.11,5);
      if(detail>0){line([-.12,-.28,-.12,-.39,0,-.48,.12,-.39,.12,-.28]);person(0,-.31,.15,1);line([-.33,-.02,-.28,.18,-.22,.19]);}
      break;
    }
    case 1: { // corridor with hanging teeth and a pilgrim at its vanishing point
      line([-.44,.44,-.42,-.36,-.09,-.52,.41,-.32,.43,.44]);line([-.44,.44,-.17,.12,-.16,-.26,.16,-.26,.18,.12,.43,.44]);line([-.42,-.36,-.16,-.26]);line([.41,-.32,.16,-.26]);teeth(-.39,-.31,.77,.15,7);
      for(let j=0;j<4;j++){const y=.18+j*j*.021;line([-.18-j*.065,y,.19+j*.064,y]);}person(0,-.01,.28);if(detail>0){eye(0,-.4,.11);person(-.31,.10,.12);person(.31,.1,.12);}
      break;
    }
    case 2: { // a serpent carrying little faces down its body
      g.beginPath();g.moveTo(-.32,.43);g.bezierCurveTo(.43,.56,.47,.11,-.02,.04);g.bezierCurveTo(-.52,-.04,-.42,-.35,.12,-.35);g.lineTo(.36,-.45);g.lineTo(.49,-.25);g.lineTo(.19,-.19);g.bezierCurveTo(-.17,-.24,-.22,-.04,.09,-.04);g.bezierCurveTo(.61,.03,.60,.65,-.32,.43);g.stroke();eye(.28,-.30,.08);line([.46,-.25,.54,-.14,.43,-.15]);
      if(detail>0){for(let j=0;j<4;j++){const x=-.19+j*.15;eye(x,.36-j*.035,.042);}teeth(-.2,-.25,.32,.08,4);person(-.29,-.12,.14);}
      break;
    }
    case 3: { // three shrouded witnesses standing over an opened grave
      line([-.48,.36,-.24,.21,.31,.23,.48,.38,-.48,.36]);person(-.27,-.08,.44,1);person(.02,-.16,.48);person(.29,-.07,.42,1);
      eye(.02,.30,.13);if(detail>0){line([-.36,-.47,-.21,-.53,-.06,-.47,.15,-.54,.37,-.48]);teeth(-.37,.39,.73,.09,7);}
      break;
    }
    case 4: { // ritual wheel whose stations are smaller figures
      oval(0,0,.37,.42);eye(0,-.03,.16);line([-.11,.16,.12,.16,0,.32,-.11,.16]);
      for(let j=0;j<7;j++){const t=j*TAU/7;line([Math.cos(t)*.23,Math.sin(t)*.28,Math.cos(t)*.47,Math.sin(t)*.5]);if(detail>0)oval(Math.cos(t)*.43,Math.sin(t)*.46,.035,.045,true);}
      if(detail>0){person(-.21,.13,.15);person(.21,.13,.15);teeth(-.12,-.32,.24,.08,3);}break;
    }
    case 5: { // bird-like reliquary, holding a doorway in its breast
      line([-.45,.1,-.15,-.14,-.2,-.4,.02,-.48,.23,-.35,.45,-.3,.24,-.22,.30,.10,.12,.33,-.15,.27,-.45,.1]);eye(.02,-.32,.08);line([-.14,.25,-.23,.49,-.35,.48]);line([.1,.32,.17,.49,.29,.47]);line([-.36,.08,-.04,.03,.2,.12]);
      if(detail>0){line([-.08,.16,-.08,-.03,.02,-.11,.13,-.02,.13,.18]);person(.02,.08,.17);teeth(-.35,.11,.22,.07,3);}break;
    }
    case 6: { // a long hand whose fingers are watch towers
      line([-.28,.49,-.34,.02,-.47,-.12,-.42,-.24,-.28,-.12,-.29,-.42,-.17,-.46,-.12,-.1,-.06,-.53,.06,-.53,.10,-.09,.19,-.45,.3,-.4,.28,.03,.4,-.21,.48,-.12,.28,.29,.24,.49]);eye(-.02,.14,.16);
      if(detail>0){eye(-.22,-.28,.04);eye(0,-.32,.04);eye(.23,-.27,.04);line([-.14,.31,.14,.29]);teeth(-.13,.31,.25,.07,4);}break;
    }
    case 7: { // tooth-palace with a little room behind each tooth
      line([-.46,.42,-.41,-.1,-.23,-.42,-.06,-.18,.09,-.48,.28,-.19,.42,-.32,.47,.42,-.46,.42]);for(let j=0;j<4;j++){const x=-.35+j*.23;line([x,.35,x,-.02,x+.08,-.13,x+.16,-.01,x+.16,.35]);if(detail>0){eye(x+.08,.05,.04);person(x+.08,.23,.11);}}break;
    }
    default: { // horned face branching into insect legs
      line([-.33,-.18,-.49,-.48,-.19,-.35,0,-.47,.2,-.35,.48,-.48,.33,-.15,.25,.25,0,.42,-.25,.23,-.33,-.18]);eye(-.13,-.12,.10);eye(.13,-.12,.10);teeth(-.14,.14,.28,.11,4);
      for(const s of[-1,1]){line([s*.25,.02,s*.49,.16,s*.43,.43]);line([s*.22,.20,s*.37,.34,s*.28,.50]);}if(detail>0)eye(0,-.34,.065);break;
    }
  }
}
function family(v:MicroWorld, n:number) {const sets={witnesses:[0,3,6,0,3,7],chimeras:[2,5,8,2,6,5],rites:[1,4,7,1,3,4],menagerie:[0,1,2,3,4,5,6,7,8]};const a=sets[v];return a[n%a.length];}
/** Continuous scene-derived micrographic material: three scales, irregular clustered placement, preserved ink masses. */
export async function weave(c:Capture,canvas:HTMLCanvasElement,ctx:BuildContext,signal:AbortSignal,o:MicroOptions) {
  const n=c.size,output=canvas.getContext('2d')!,base=output.getImageData(0,0,n,n).data,step=n/720;
  output.save();output.setTransform(1,0,0,1,0,0);
  const layers=new Map<number,{canvas:HTMLCanvasElement;g:CanvasRenderingContext2D;mask:ImageData}>();
  const layer=(id:number)=>{let result=layers.get(id);if(!result){const surface=document.createElement('canvas');surface.width=surface.height=n;result={canvas:surface,g:surface.getContext('2d')!,mask:new ImageData(n,n)};layers.set(id,result);}return result;};
  const bounds=new Map<number,[number,number,number,number]>();const pools=new Map<number,number[]>();
  for(let y=0;y<n;y+=4)for(let x=0;x<n;x+=4){const id=c.identity[(y*n+x)*4];const pool=pools.get(id)??[];pool.push(y*n+x);pools.set(id,pool);if(id<2)continue;const b=bounds.get(id)??[n,n,0,0];b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y);bounds.set(id,b);}
  const hosts=[...pools.entries()].filter(([id,points])=>id>=2&&points.length>8);const hostWeight=hosts.reduce((sum,[,p])=>sum+Math.pow(p.length,.7),0);
  const anchors:{x:number;y:number;r:number;id:number}[]=[];let sequence=0;
  const put=(x:number,y:number,size:number,kind:number,detail:number,rotation:number,boost=1)=>{
    const px=Math.max(0,Math.min(n-1,Math.round(x))),py=Math.max(0,Math.min(n-1,Math.round(y))),i=(py*n+px)*4;
    const tone=(base[i]*.24+base[i+1]*.6+base[i+2]*.16)/255,dark=tone<.34;const id=o.paper?-1:c.identity[i];const g=layer(id).g;
    // Broad black shapes stay black: only a few low-contrast incisions enter them.
    if(dark&&noise(px,py,ctx.seed+91)>.22)return;
    const mediumGain=o.medium==='phosphor'?.72:o.medium==='carbon'?.72:o.medium==='scraped'?.82:1;
    const onForm=id>=2&&!o.paper;const opacity=(dark?.20:onForm?.53+Math.max(0,tone-.35)*.35:.13+Math.max(0,tone-.35)*.35)*mediumGain*boost;
    g.save();g.translate(x,y);g.rotate(rotation);g.scale(size,size);g.globalAlpha=Math.min(.8,opacity);
    g.strokeStyle=dark?'#d8caa5':o.medium==='phosphor'?'#0b140b':o.medium==='emulsion'?'#39241d':o.medium==='carbon'?'#493549':'#342a21';g.fillStyle=g.strokeStyle;
    g.lineWidth=Math.max(.6*step/size,detail>0?.028:.070);g.lineCap='square';g.lineJoin='round';story(g,kind,detail);g.save();g.translate(.025,0);g.globalAlpha*=.19;story(g,kind,detail);g.restore();
    // The smallest marks live INSIDE a forehead/door, not on an independent wallpaper grid.
    if(detail>1){g.save();g.translate(0,-.22);g.scale(.15,.15);g.lineWidth=.09;story(g,(kind+4)%9,0);g.restore();}
    g.restore();
  };
  const large=56+o.hierarchy*25,count=o.paper?22:116+Math.round(ctx.mood.density*22);
  for(let attempt=0;attempt<count*8&&anchors.length<count;attempt++){
    if(attempt%96===0){if(signal.aborted)throw new DOMException('Aborted','AbortError');await new Promise<void>(r=>setTimeout(r,0));}
    let x=(15+ctx.random()*690)*step,y=(15+ctx.random()*690)*step,host=-1;
    if(!o.paper){const route=ctx.random();if(route<.80&&hosts.length){let ticket=ctx.random()*hostWeight;for(const [id,points]of hosts){ticket-=Math.pow(points.length,.7);if(ticket<=0){host=id;break;}}if(host<0)host=hosts[0][0];}else host=route<.95&&pools.has(1)?1:0;const pool=pools.get(host);if(pool?.length){const p=pool[Math.floor(ctx.random()*pool.length)];x=p%n;y=Math.floor(p/n);}}
    // Stories grow in connected colonies on the SAME host surface, never migrating into empty backdrop.
    const relatives=anchors.filter(a=>o.paper||a.id===host);if(relatives.length&&attempt%3!==0){const parent=relatives[Math.floor(ctx.random()*relatives.length)],angle=ctx.random()*TAU;const reach=parent.r*(1.45+ctx.random()*.50);x=parent.x+Math.cos(angle)*reach;y=parent.y+Math.sin(angle)*reach;}
    if(x<12||y<12||x>n-13||y>n-13)continue;
    const i=(Math.round(y)*n+Math.round(x))*4,id=c.identity[i],b=bounds.get(id);if(!o.paper&&id!==host)continue;
    const edge=id!==c.identity[Math.min(c.identity.length-4,i+8*4)]||id!==c.identity[Math.min(c.identity.length-4,i+n*8*4)];
    let size=(large*(.66+ctx.random()*.58))*step;
    if(b&&!o.paper)size=Math.min(size,Math.max(13*step,Math.min(b[2]-b[0],b[3]-b[1])*.36));
    if(id>=3)size*=.75;if(size<12*step)continue;
    const r=size*.28;if(anchors.some(a=>Math.hypot(a.x-x,a.y-y)<a.r+r))continue;
    if(!edge&&noise(Math.round(x/92),Math.round(y/92),ctx.seed+4)<.33)continue;
    anchors.push({x,y,r,id});const normalX=c.normal[i]/127.5-1,normalY=c.normal[i+1]/127.5-1;
    const angle=Math.abs(normalX)+Math.abs(normalY)>.24?Math.atan2(normalY,normalX)*.15:(ctx.random()-.5)*.35;
    const kind=family(o.vocabulary,sequence++);put(x,y,size,kind,2,angle);
    // Linked satellites of a different scale give each large creature its own small world.
    for(let j=0;j<2+Math.round(o.hierarchy*2);j++){const a=j*2.4+kind,dist=size*(.48+ctx.random()*.15),sx=x+Math.cos(a)*dist,sy=y+Math.sin(a)*dist;if(sx<7||sy<7||sx>n-8||sy>n-8)continue;put(sx,sy,size*(.28+ctx.random()*.13),family(o.vocabulary,sequence++),1,angle+(ctx.random()-.5)*.4,.8);}
  }
  // Fine figures follow actual scene boundaries, like a procession walking along the architecture.
  let fine=0;for(let y=8;y<n-8;y+=9)for(let x=8;x<n-8;x+=9){if(fine>530)break;const i=(y*n+x)*4,id=c.identity[i],edge=id!==c.identity[i+12]||id!==c.identity[i+n*3*4];if(!edge||noise(x,y,ctx.seed+18)<.50)continue;put(x+(noise(y,x,ctx.seed)-.5)*5,y,7+o.hierarchy*3,family(o.vocabulary,fine++),0,(noise(x,y,ctx.seed+1)-.5)*.5,.7);}
  // Clip every colony to its actual scene object, so the stories become that object's engraved substance.
  // This also restores a clean macro silhouette instead of letting doodles float across it.
  for(let y=0;y<n;y++){if(y%96===0){if(signal.aborted)throw new DOMException('Aborted','AbortError');await new Promise<void>(r=>setTimeout(r,0));}for(let x=0;x<n;x++){const i=(y*n+x)*4,target=layers.get(o.paper?-1:c.identity[i]);if(target)target.mask.data[i+3]=255;}}
  for(const l of layers.values()){const mask=document.createElement('canvas');mask.width=mask.height=n;mask.getContext('2d')!.putImageData(l.mask,0,0);l.g.globalCompositeOperation='destination-in';l.g.drawImage(mask,0,0);output.drawImage(l.canvas,0,0);}
  if(!o.paper){const outline=new ImageData(n,n);for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){const i=(y*n+x)*4,id=c.identity[i],boundary=id!==c.identity[i+4]||id!==c.identity[i+n*4],crease=id>0&&(Math.abs(c.normal[i]-c.normal[i+4])+Math.abs(c.normal[i+1]-c.normal[i+5])+Math.abs(c.normal[i+2]-c.normal[i+6])>75);if(boundary||crease){for(const j of boundary?[i,i-4]:[i]){outline.data[j]=30;outline.data[j+1]=26;outline.data[j+2]=20;outline.data[j+3]=boundary?205:135;}}}const edgeCanvas=document.createElement('canvas');edgeCanvas.width=edgeCanvas.height=n;edgeCanvas.getContext('2d')!.putImageData(outline,0,0);output.drawImage(edgeCanvas,0,0);}
  output.restore();
  if(signal.aborted)throw new DOMException('Aborted','AbortError');
}
