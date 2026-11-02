import type { BuildContext, Capture } from '@conjure/kit';
import { settle, surface } from './studio';

type Options={pigment:string;vocabulary:string;hierarchy:number;region?:'cutaway'};
type Motif={x:number;y:number;w:number;h:number;angle:number;kind:number};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const rgb=(v:string)=>[1,3,5].map(i=>parseInt(v.slice(i,i+2),16));

/** Dense micrographic drawing: coarse tones remain the image; light tissue becomes inhabited ink. */
export async function micrograph(input:Uint8ClampedArray,cap:Capture,ctx:BuildContext,signal:AbortSignal,o:Options,foundation:Uint8ClampedArray){
 const n=cap.size;
 const p=settle(o.pigment,ctx),ink=rgb(p.ink),stock=rgb(p.paper).map(v=>Math.min(248,v+23)),r=ctx.random;
 const lum=new Float32Array(n*n),domain=new Uint8Array(n*n),base=new Uint8ClampedArray(input.length),maskData=new Uint8ClampedArray(input.length);
 // An endless studio floor is negative space, whereas a bounded world's floor is a surface.
 let groundRim=0;for(let q=0;q<n;q++)for(const i of [q,(n-1)*n+q,q*n,q*n+n-1])if(cap.identity[i*4]===1)groundRim++;
 const endlessGround=groundRim>n*2;
 for(let i=0;i<lum.length;i++){const j=i*4;lum[i]=(input[j]*.28+input[j+1]*.60+input[j+2]*.12)/255;
  const changed=Math.max(Math.abs(input[j]-foundation[j]),Math.abs(input[j+1]-foundation[j+1]),Math.abs(input[j+2]-foundation[j+2]));
  const id=cap.identity[j],x=(i%n)*720/n,y=Math.floor(i/n)*720/n;
  const region=o.region!=='cutaway'||(y>=188&&y<=667&&x>=30&&x<=690)||(y>=39&&y<188&&Math.abs(x-360)<(y-39)*2.17);
  domain[i]=region&&(id>=2||id===1&&!endlessGround||changed>16)?1:0;
 }
 const at=(x:number,y:number)=>lum[Math.max(0,Math.min(n-1,y|0))*n+Math.max(0,Math.min(n-1,x|0))];
 for(let y=0;y<n;y++){
  if(y%48===0){signal.throwIfAborted();await new Promise<void>(resolve=>setTimeout(resolve,0));}
  for(let x=0;x<n;x++){
   const q=y*n+x,i=q*4,L=lum[q],edge=Math.max(Math.abs(L-at(x-1,y)),Math.abs(L-at(x+1,y)),Math.abs(L-at(x,y-1)),Math.abs(L-at(x,y+1)));
   // Tonal reduction is applied to the complete fabrication, including all original identities.
   const v=clamp((L-.20)/.64),tone=v<.16?.025:v<.35?.19:v<.52?.48:v<.68?.78:.98;
   const line=edge>.10?.23:edge>.06?.65:1;
   for(let k=0;k<3;k++)base[i+k]=ink[k]+(stock[k]-ink[k])*tone*line;
   base[i+3]=255;
   const acceptance=domain[q]*clamp((L-.27)/.43)*(edge>.095?.06:edge>.045?.22:.84);
   maskData[i]=maskData[i+1]=maskData[i+2]=255;maskData[i+3]=Math.round(acceptance*255);
  }
 }
 const target=surface(n);target.g.putImageData(new ImageData(base,n,n),0,0);
 const layer=surface(n),g=layer.g;g.scale(n/720,n/720);g.lineCap='round';g.lineJoin='round';
 const light=(x:number,y:number)=>at(x*n/720,y*n/720);
 const inhabitable=(x:number,y:number)=>domain[Math.max(0,Math.min(n-1,Math.floor(y*n/720)))*n+Math.max(0,Math.min(n-1,Math.floor(x*n/720)))];
 const flow=(x:number,y:number)=>{
  const dx=light(x+12,y)-light(x-12,y),dy=light(x,y+12)-light(x,y-12);
  return Math.hypot(dx,dy)>.095?Math.atan2(dy,dx)+Math.PI/2:Math.sin(x*.011+y*.006+ctx.seed%17)*.62+Math.cos(y*.009)*.35;
 };
 const stroke=(points:number[],color=p.ink,width=1)=>{g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);g.stroke();};
 const eye=(x:number,y:number,w:number,h:number,black=true)=>{
  g.beginPath();g.moveTo(x-w/2,y);g.bezierCurveTo(x-w*.19,y-h,x+w*.27,y-h*.87,x+w/2,y);g.bezierCurveTo(x+w*.13,y+h*.75,x-w*.24,y+h*.71,x-w/2,y);g.closePath();g.fillStyle=black?p.ink:p.paper;g.fill();g.strokeStyle=p.ink;g.lineWidth=.75;g.stroke();
  if(w>7){g.fillStyle=black?p.paper:p.ink;g.beginPath();g.ellipse(x,y,w*.12,h*.62,0,0,Math.PI*2);g.fill();g.fillStyle=black?p.ink:p.paper;g.beginPath();g.arc(x,y,Math.max(.55,w*.035),0,Math.PI*2);g.fill();}
 };
 const tiny=(x:number,y:number,s:number,type:number)=>{
  if(type%3===0){eye(x,y,s,s*.26);stroke([x-s*.5,y+s*.33,x-s*.16,y+s*.58,x+s*.35,y+s*.36],p.ink,.65);}
  else if(type%3===1){stroke([x-s*.4,y+s*.5,x-s*.4,y-s*.35,x,y-s*.65,x+s*.35,y-s*.25,x+s*.35,y+s*.5],p.ink,.7);g.fillStyle=p.ink;g.fillRect(x-s*.13,y-s*.17,s*.20,s*.35);stroke([x-s*.5,y+s*.55,x+s*.5,y+s*.55],p.ink,.65);}
  else {stroke([x-s*.45,y+s*.4,x-s*.45,y+s*.12,x-s*.2,y+s*.12,x-s*.2,y-s*.12,x+s*.05,y-s*.12,x+s*.05,y-s*.4,x+s*.4,y-s*.4],p.ink,.75);eye(x+s*.28,y-s*.53,s*.36,s*.10);}
 };
 // A mask is also a tiny building: eyes are inhabited arches, its jaw is a stairwell.
 const mask=(w:number,h:number,variant:number)=>{
  const jaw=.12+r()*.19,forehead=.37+r()*.20,temple=.31+r()*.12,eyes=variant%5===0?1:variant%5===1?3:2,mouth=.18+r()*.11;
  g.beginPath();g.moveTo(-w*temple,-h*.23);g.bezierCurveTo(-w*(temple+.1),-h*forehead,w*.18,-h*(forehead+.13),w*temple,-h*.26);g.bezierCurveTo(w*.49,h*.04,w*.30,h*.37,w*jaw,h*.49);g.lineTo(-w*jaw*.75,h*(.38+r()*.13));g.bezierCurveTo(-w*.43,h*.20,-w*.49,-h*.03,-w*temple,-h*.23);g.closePath();g.fillStyle=p.paper;g.fill();g.strokeStyle=p.ink;g.lineWidth=1.2;g.stroke();
  if(eyes===1)eye(0,-h*.09,w*.61,h*.15);
  else if(eyes===3)for(let k=0;k<3;k++)eye((k-1)*w*.25,-h*.10+(k%2)*h*.07,w*.22,h*.09);
  else {eye(-w*.19,-h*.10,w*(.27+r()*.08),h*.12);eye(w*.19,-h*.06,w*(.23+r()*.08),h*.10);}
  g.fillStyle=p.ink;g.beginPath();g.moveTo(0,-h*.01);g.lineTo(-w*.065,h*.14);g.lineTo(w*.08,h*.13);g.closePath();g.fill();
  g.beginPath();g.moveTo(-w*mouth,h*.23);g.quadraticCurveTo(0,h*.16,w*mouth,h*.20);g.lineTo(w*jaw*.7,h*.38);g.lineTo(-w*jaw*.7,h*.35);g.closePath();g.fill();
  const teeth=3+variant%5;for(let k=0;k<teeth;k++)stroke([-w*mouth+k*w*mouth*2/teeth,h*.22,-w*mouth*.8+k*w*mouth*1.6/teeth,h*.30],p.paper,Math.max(.6,w*.014));
  if(w>28){
   // A forehead room contains smaller inhabitants. The jaw's stairs terminate in another eye.
   stroke([-w*.16,-h*.22,-w*.16,-h*.34,0,-h*(forehead-.01),w*.14,-h*.32,w*.14,-h*.22],p.ink,.8);tiny(0,-h*.30,w*.19,variant);
   for(let side of [-1,1]){stroke([side*w*.33,h*.03,side*w*.36,h*.20,side*w*.25,h*.34],p.ink,.8);for(let k=0;k<3;k++)stroke([side*w*(.31-k*.035),h*(.05+k*.075),side*w*.41,h*(.065+k*.06)],p.ink,.65);}
   for(let k=0;k<4;k++)stroke([-w*.09,h*(.34+k*.033),w*(.11-k*.020),h*(.34+k*.033)],p.ink,.7);
   eye(0,h*.46,w*.12,h*.026);
   if(variant%3===0){tiny(-w*.37,-h*.28,w*.22,variant+1);stroke([-w*.36,-h*.32,-w*.44,-h*.40,-w*.36,-h*.52],p.ink,.8);}
   else if(variant%3===1){stroke([w*.35,-h*.23,w*.49,-h*.17,w*.53,h*.07,w*.42,h*.12],p.ink,1.1);eye(w*.45,-h*.01,w*.11,h*.035);}
  }
 };
 // Segmented architectural creatures have stair flights inside a continuous bending body.
 const stairbeast=(w:number,h:number,variant:number)=>{
  g.beginPath();g.moveTo(-w*.5,h*.27);g.bezierCurveTo(-w*.28,-h*.44,w*.02,h*.39,w*.32,-h*.18);g.strokeStyle=p.ink;g.lineWidth=h*.56;g.stroke();g.strokeStyle=p.paper;g.lineWidth=h*.43;g.stroke();
  for(let k=0;k<9;k++){const t=k/8,x=-w*.43+t*w*.69,y=Math.sin(t*Math.PI*2+1.4)*h*.15;stroke([x-w*.025,y-h*.17,x+w*.025,y+h*.15],p.ink,.8);if(k%2===0)stroke([x,y+h*.18,x-w*.08,y+h*.37,x-w*.05,y+h*.47],p.ink,.9);}
  g.save();g.translate(w*.33,-h*.17);g.rotate(-.22);mask(w*.37,h*.73,variant);g.restore();
  if(w>38){for(let k=0;k<3;k++)tiny(-w*.28+k*w*.16,-h*.30+(k%2)*h*.13,w*.13,k+variant);eye(-w*.32,h*.11,w*.12,h*.035);}
  stroke([-w*.48,h*.26,-w*.57,h*.15,-w*.52,h*.01,-w*.44,h*.03],p.ink,1.1);
 };
 const city=(w:number,h:number,variant:number)=>{
  // Asymmetric towers share one organism's ribbed base; no regular wallpaper grid.
  for(let k=0;k<3;k++){
   const x=(k-1)*w*.24,top=-h*(.28+(k===1?.24:((variant+k)%3)*.065)),bw=w*(k===1?.24:.19);
   g.beginPath();g.moveTo(x-bw*.5,h*.30);g.lineTo(x-bw*.53,top+h*.07);g.lineTo(x-bw*.1,top-h*.06);g.lineTo(x+bw*.5,top);g.lineTo(x+bw*.45,h*.29);g.closePath();g.fillStyle=p.paper;g.fill();g.strokeStyle=p.ink;g.lineWidth=1.1;g.stroke();
   eye(x,top+h*.16,bw*.74,h*.046);g.fillStyle=p.ink;g.fillRect(x-bw*.14,top+h*.27,bw*.28,Math.max(1.7,h*.08));
   if(h>30){for(let j=0;j<3;j++)stroke([x-bw*.36,top+h*(.41+j*.055),x+bw*.36,top+h*(.40+j*.055)],p.ink,.55);tiny(x,h*.14,bw*.66,k);}
  }
  stroke([-w*.44,h*.30,-w*.25,h*.40,0,h*.45,w*.28,h*.37,w*.46,h*.24],p.ink,1.7);
  for(let k=0;k<6;k++){const x=-w*.32+k*w*.13;stroke([x,h*.32,x-w*.025,h*.48,x+w*.02,h*.54],p.ink,.85);}
  if(w>30)eye(0,h*.36,w*.27,h*.052);
 };
 const corridor=(w:number,h:number,variant:number)=>{
  g.fillStyle=p.paper;g.beginPath();g.moveTo(-w*.48,h*.45);g.lineTo(-w*.42,-h*.22);g.bezierCurveTo(-w*.32,-h*.58,w*.34,-h*.57,w*.42,-h*.22);g.lineTo(w*.46,h*.43);g.closePath();g.fill();g.strokeStyle=p.ink;g.lineWidth=1.3;g.stroke();
  for(let j=0;j<4;j++){const q=1-j*.17;g.beginPath();g.moveTo(-w*.37*q,h*.38);g.lineTo(-w*.34*q,-h*.13*q);g.bezierCurveTo(-w*.25*q,-h*.40*q,w*.28*q,-h*.40*q,w*.34*q,-h*.13*q);g.lineTo(w*.36*q,h*.38);g.strokeStyle=j%2?p.ink:p.accent;g.lineWidth=j===0?1.4:.85;g.stroke();}
  eye(0,-h*.13,w*.19,h*.04);g.fillStyle=p.ink;g.beginPath();g.moveTo(-w*.10,h*.10);g.lineTo(w*.12,h*.10);g.lineTo(w*.22,h*.38);g.lineTo(-w*.24,h*.38);g.closePath();g.fill();
  for(let j=0;j<5;j++)stroke([-w*(.11+j*.026),h*(.12+j*.048),w*(.12+j*.022),h*(.12+j*.048)],p.paper,.75);
  if(w>32){tiny(-w*.43,h*.40,w*.16,variant);tiny(w*.42,h*.42,w*.15,variant+1);tiny(0,-h*.42,w*.19,variant+2);}
 };
 const motifs:Motif[]=[],occupied=new Uint8Array(180*180);
 const vacant=(x:number,y:number,w:number,h:number)=>{let hit=0;for(let yy=-.4;yy<=.4;yy+=.2)for(let xx=-.4;xx<=.4;xx+=.2){const gx=Math.max(0,Math.min(179,((x+xx*w)/4)|0)),gy=Math.max(0,Math.min(179,((y+yy*h)/4)|0));hit+=occupied[gy*180+gx]?1:0;}return hit<4;};
 const occupy=(x:number,y:number,w:number,h:number)=>{for(let yy=Math.max(0,((y-h*.45)/4)|0);yy<Math.min(180,(y+h*.45)/4);yy++)for(let xx=Math.max(0,((x-w*.45)/4)|0);xx<Math.min(180,(x+w*.45)/4);xx++)occupied[yy*180+xx]=1;};
 const choose=()=>o.vocabulary==='watchers'?(r()<.75?0:3):o.vocabulary==='stairbeasts'?(r()<.75?1:3):o.vocabulary==='livingcity'?(r()<.72?2:0):Math.floor(r()*4);
 const tiers=[{size:60+o.hierarchy*24,tries:620,limit:34},{size:24+o.hierarchy*5,tries:1800,limit:190},{size:8,tries:2500,limit:430}];
 for(let tier=0;tier<tiers.length;tier++){
  const band=tiers[tier];let count=0;
  for(let attempt=0;attempt<band.tries&&count<band.limit;attempt++){
   if(attempt%80===0){signal.throwIfAborted();await new Promise<void>(resolve=>setTimeout(resolve,0));}
   const x=8+r()*704,y=8+r()*704,L=light(x,y);if(!inhabitable(x,y)||L<.34||r()>clamp((L-.22)*1.7))continue;
   const size=band.size*(.70+r()*.60),kind=choose(),w=size*(kind===1?1.44:kind===2?.9:1),h=size*(kind===1?.70:kind===2?1.27:1.15);
   const cover=inhabitable(x-w*.27,y)+inhabitable(x+w*.27,y)+inhabitable(x,y-h*.27)+inhabitable(x,y+h*.27);
   if(cover<3||!vacant(x,y,w,h))continue;occupy(x,y,w,h);const angle=flow(x,y)+(r()-.5)*.30;
   motifs.push({x,y,w,h,angle,kind});count++;
   g.save();g.translate(x,y);g.rotate(angle);if(tier===2)tiny(0,0,size,kind);else if(kind===0)mask(w,h,attempt);else if(kind===1)stairbeast(w,h,attempt);else if(kind===2)city(w,h,attempt);else corridor(w,h,attempt);g.restore();
  }
 }
 // The drawings share nerves and corridors, knitting the different scale populations together.
 const big=motifs.filter(m=>m.w>42);for(let i=0;i<big.length;i++){
  const a=big[i];let best:Motif|undefined,dist=104;
  for(let j=i+1;j<big.length;j++){const b=big[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d<dist&&d>30){best=b;dist=d;}}
  if(!best||!inhabitable((a.x+best.x)/2,(a.y+best.y)/2)||light((a.x+best.x)/2,(a.y+best.y)/2)<.40)continue;
  const b=best;g.beginPath();g.moveTo(a.x,a.y);g.bezierCurveTo(a.x+Math.cos(a.angle)*dist*.3,a.y+Math.sin(a.angle)*dist*.3,b.x-Math.cos(b.angle)*dist*.3,b.y-Math.sin(b.angle)*dist*.3,b.x,b.y);g.strokeStyle=p.ink;g.lineWidth=2.8;g.stroke();g.strokeStyle=p.paper;g.lineWidth=1.2;g.stroke();
  tiny((a.x+b.x)/2,(a.y+b.y)/2,6+i%4,i);
 }
 signal.throwIfAborted();const clip=surface(n);clip.g.putImageData(new ImageData(maskData,n,n),0,0);
 g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='destination-in';g.drawImage(clip.canvas,0,0);g.globalCompositeOperation='source-over';
 target.g.globalCompositeOperation='multiply';target.g.drawImage(layer.canvas,0,0);target.g.globalCompositeOperation='source-over';
 return target.g.getImageData(0,0,n,n).data;
}
