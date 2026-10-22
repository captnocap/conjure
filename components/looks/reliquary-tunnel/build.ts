import { choice, defineLook, score } from '@conjure/kit';
import { arch, detail, finish, glyphs, inset, line, prepare } from './studio';
import { micrograph } from './micro';
export default defineLook({questions:{
 micrography:choice('Which small inhabitants are drawn into the larger forms?',{watchers:'Architectural masks contain eyes, tiny chapels and stairwells in their faces.',stairbeasts:'Ribbed corridor beasts carry inhabited steps along their bodies.',livingcity:'Bent little towers grow faces, claws and smaller interior worlds.',mixed:'Masks, corridor beasts, living towers and nested passages interweave.'}),
 hierarchy:score('How abruptly does one drawing open into smaller drawings?',['Closely related rooms, creatures and micro glyphs','Three clear scales of inhabited drawing','Large architectural beasts descend into much smaller faces and minute corridors']),
 order:choice('What architecture encloses the offering?',{pointed:'Pointed Gothic arches recede into a narrow chapel.',round:'Round stacked ossuary vaults make a barrel tunnel.',keyhole:'Impossible keyhole shrines contain other keyhole shrines.'}),
 relic:choice('What is held in the small reliquaries?',{world:'Each medallion contains the entire scene.',witness:'Close details of the actual cast become little relic portraits.',alternating:'Whole worlds alternate with close views of their inhabitants.'}),
 state:choice('What has happened to the shrine?',{devotion:'All the votive recesses remain carefully tended.',exhumed:'Cracked plaster exposes dark seams beneath the ornament.',blind:'Some reliquaries have been covered with blank wax seals.',opened:'Doors to the inner shrines stand crookedly open.'}),
 depth:score('How far does the shrine recede?',['Three monumental arches','Five nested thresholds','Eight diminishing vaults']),
 ornament:choice('What grows on the architectural ribs?',{teeth:'Rows of small bone teeth and black spaces.',roots:'Hair roots wind across the moulding.',pearls:'Chains of small beadlike votive cells.'}),
 pigment:choice('What is the shrine made from?',{bone:'Dry bone, olive soot and tarnished brass.',rust:'Ochre plaster, dried red earth and iron.',ink:'Chalk grey stone and oily blue black.',acid:'Green stained ivory and bitter yellow gold.'})
},async apply(c,a,context,signal){
 const t=prepare(c,context,signal,a.pigment),{g,p,source,boxes}=t,r=context.random,m=context.mood,n=3+Math.round(a.depth*5);
 const shape=(x:number,y:number,w:number,h:number)=>{g.beginPath();if(a.order==='pointed'){g.moveTo(x,y+h);g.lineTo(x,y+h*.36);g.bezierCurveTo(x,y+h*.12,x+w*.32,y+h*.1,x+w/2,y);g.bezierCurveTo(x+w*.68,y+h*.1,x+w,y+h*.12,x+w,y+h*.36);g.lineTo(x+w,y+h);}else if(a.order==='keyhole'){g.moveTo(x+w*.18,y+h);g.lineTo(x+w*.18,y+h*.39);g.bezierCurveTo(x-w*.1,y+h*.08,x+w*.2,y,x+w/2,y);g.bezierCurveTo(x+w*.8,y,x+w*1.1,y+h*.08,x+w*.82,y+h*.39);g.lineTo(x+w*.82,y+h);}else {g.moveTo(x,y+h);g.lineTo(x,y+w*.45);g.bezierCurveTo(x,y-w*.08,x+w,y-w*.08,x+w,y+w*.45);g.lineTo(x+w,y+h);}};
 // Large nesting forms the whole image's perspective, with the scene standing in its nave.
 for(let k=0;k<n;k++){
  signal.throwIfAborted();const f=Math.pow(.87,k),w=690*f,h=660*f,x=(720-w)/2,y=15+(1-f)*130,thick=(17-k*.9)*(1+.2*m.wear);
  shape(x,y,w,h);g.strokeStyle=p.ink;g.lineWidth=thick+7;g.stroke();shape(x-2,y-2,w,h);g.strokeStyle=k%2?p.soft:p.paper;g.lineWidth=thick;g.stroke();shape(x+3,y+2,w-6,h);g.strokeStyle=p.accent;g.lineWidth=1;g.stroke();
  for(let q=0;q<20;q++){
   const yy=y+95+(h-105)*q/19,xx=x+3,rr=Math.max(1.2,5-k*.4);
   for(const sx of [xx,720-xx]){g.fillStyle=p.ink;if(a.ornament==='pearls'){g.beginPath();g.arc(sx,yy,rr,0,Math.PI*2);g.fill();g.fillStyle=p.paper;g.beginPath();g.arc(sx-1,yy-1,rr*.48,0,Math.PI*2);g.fill();}
    else if(a.ornament==='teeth'){g.beginPath();g.moveTo(sx-rr,yy);g.lineTo(sx+rr,yy);g.lineTo(sx,yy+rr*1.8);g.fill();}
    else {g.beginPath();g.strokeStyle=p.ink;g.lineWidth=.6;g.moveTo(sx,yy);g.bezierCurveTo(sx-rr*3,yy+rr,sx+rr*3,yy+rr*2,sx,yy+rr*4);g.stroke();}}
  }
 }
 const counts=3+Math.round(m.density*2);
 for(let side=0;side<2;side++)for(let j=0;j<counts;j++){
  const x=side?642-j*14:25+j*14,y=125+j*105,w=46-j*3,h=70-j*4;
  g.save();if(a.state==='opened'){g.translate(x+w/2,y+h/2);g.rotate((side?1:-1)*.12);g.translate(-x-w/2,-y-h/2);}
  inset(g,source,p,x,y,w,h,3,a.order==='keyhole'?'arch':'oval');
  if((a.relic==='witness'||a.relic==='alternating'&&j%2===1)&&boxes.length){g.save();arch(g,x+3,y+4,w-6,h-8,'oval');g.clip();detail(g,source,boxes[j%boxes.length],x+2,y+2,w-4,h-4);g.restore();}
  if(a.state==='blind'&&j%3===0){g.fillStyle=p.paper;g.beginPath();g.arc(x+w/2,y+h/2,w*.28,0,Math.PI*2);g.fill();}
  glyphs(g,p,x,y+h+11,w,context.seed+j);g.restore();
 }
 // The last shrine is itself an entire miniature nave, at a different scale above the cast.
 for(let k=0;k<3;k++){const w=110*Math.pow(.48,k),h=w*.8;inset(g,source,p,360-w/2,60+k*8,w,h,3,'arch',k%2===1);}
 if(a.state==='exhumed')for(let j=0;j<30;j++){const x=r()<.5?20+r()*80:620+r()*80,y=r()*700;line(g,x,y,x+(r()-.5)*40,y+14+r()*40,p.ink,1);}
 return {pixels:await micrograph(finish(t,c,signal),c,context,signal,{pigment:a.pigment,vocabulary:a.micrography,hierarchy:a.hierarchy},t.base),notes:[`${n} ${a.order} shrine arches with ${a.ornament} ornament`,`${a.state} ${a.relic} reliquaries, nested world at the vanishing point`]};
}});
