import { choice, defineLook, score } from '@conjure/kit';
import { detail, finish, glyphs, inset, line, prepare } from './studio';
import { micrograph } from './micro';
export default defineLook({questions:{
 micrography:choice('Which small inhabitants are drawn into the larger forms?',{watchers:'Architectural masks contain eyes, tiny chapels and stairwells in their faces.',stairbeasts:'Ribbed corridor beasts carry inhabited steps along their bodies.',livingcity:'Bent little towers grow faces, claws and smaller interior worlds.',mixed:'Masks, corridor beasts, living towers and nested passages interweave.'}),
 hierarchy:score('How abruptly does one drawing open into smaller drawings?',['Closely related rooms, creatures and micro glyphs','Three clear scales of inhabited drawing','Large architectural beasts descend into much smaller faces and minute corridors']),
 gravity:choice('Where does gravity change?',{loop:'Stairs circle the frame and change gravity at each corner.',split:'Opposing flights climb toward an unreachable meeting point.',inverted:'Ceiling stairs descend while floor stairs rise.'}),
 landing:choice('What is set into each landing?',{windows:'Square windows containing whole copies of the scene.',portraits:'Narrow close views of the actual cast behind little frames.',arches:'Arched doorways with other stair landings inside.'}),
 story:choice('What has happened on the staircase?',{unfinished:'The treads stop in midair before each landing.',returning:'Every flight returns to the same scene at a smaller scale.',barred:'Some landings have been barred with narrow iron rails.',fractured:'The staircase has broken into suspended fragments.'}),
 flights:score('How many turns must the visitor climb?',['Three long flights','Six shorter flights','Nine flights with tiny further turns']),
 tread:choice('How do the stairs articulate?',{solid:'Thick slab treads with dark underside shadows.',skeletal:'Thin floating treads on narrow open stringers.',carved:'Dense engraved steps cut into old stone.'}),
 pigment:choice('What inks describe the impossible stairs?',{bone:'Pale warm paper, soft dark and grey mid tones.',rust:'Deep toned brick, faded plaster, heavy dark.',ink:'Cold, quiet stone, deep line and chalk.',acid:'Sour dust, damp vivid mid tones and soot.'})
},async apply(c,a,context,signal){
 const t=prepare(c,context,signal,a.pigment),{g,p,source,boxes}=t,r=context.random,m=context.mood,count=3+Math.round(a.flights*6);
 for(let j=0;j<count;j++){
  signal.throwIfAborted();const side=j%4,band=Math.floor(j/4),len=190-band*25,w=65-band*8,angle=a.gravity==='loop'?side*Math.PI/2:a.gravity==='split'?(j%2?-.72:.72):j%2?Math.PI:0;
  let x=side===0?40:side===1?500:side===2?630:215,y=side===0?210:side===1?55:side===2?480:665;
  if(a.gravity==='split'){x=j%2?435-band*25:205+band*25;y=82+band*155;}if(a.gravity==='inverted'){x=65+j*565/count;y=j%2?310:385;}
  g.save();g.translate(x,y);g.rotate(angle);
  const steps=11+Math.round(m.density*5),rise=len/steps;
  // A shear gives the staircase its own impossible local perspective.
  g.transform(1,.23,0,1,0,0);g.fillStyle=p.ink;
  if(a.tread!=='skeletal'){g.beginPath();g.moveTo(-8,0);g.lineTo(w*.85,0);g.lineTo(w*1.85,len+14);g.lineTo(w+2,len+14);g.closePath();g.fill();}
  for(let k=0;k<steps;k++){
   if(a.story==='fractured'&&k%4===2)continue;if(a.story==='unfinished'&&k>steps-3)continue;
   const xx=k*w/steps,yy=k*rise,tw=w*.8,th=a.tread==='skeletal'?3:7;
   g.fillStyle=p.ink;g.fillRect(xx+3,yy+th,tw,rise);g.fillStyle=k%2?p.paper:p.soft;g.fillRect(xx,yy,tw,th);line(g,xx,yy,xx+tw,yy,p.accent,1);
   if(a.tread==='carved')for(let q=0;q<4;q++)line(g,xx+q*tw/4,yy,xx+q*tw/4+2,yy+th,p.ink,.5);
   if(k%3===0){line(g,xx+tw,yy,xx+tw,yy-22,p.ink,.9);}
  }
  line(g,w*.8,-22,w*1.8,len-22,p.ink,1.2);
  const ax=w*.62,ay=len-8,aw=62-band*7,ah=81-band*7;
  inset(g,source,p,ax,ay,aw,ah,2+Math.round(a.flights*3),a.landing==='arches'?'arch':'rect',j%2===1);
  if(a.landing==='portraits'&&boxes.length)detail(g,source,boxes[j%boxes.length],ax+5,ay+5,aw-10,ah-10);
  if(a.story==='barred')for(let q=1;q<5;q++)line(g,ax+aw*q/5,ay,ax+aw*q/5,ay+ah,p.ink,2);
  if(a.story==='returning')inset(g,source,p,ax+aw*.6,ay+ah*.4,aw*.33,ah*.45,3,'rect');
  glyphs(g,p,ax,ay+ah+12,aw,context.seed+j);g.restore();
 }
 // Fine stair echoes descend into the material between the large flights.
 for(let j=0;j<14+Math.round(m.density*18);j++){const x=r()*720,y=r()<.5?r()*95:625+r()*95;g.strokeStyle=p.accent;g.lineWidth=.55;g.beginPath();g.moveTo(x,y);for(let k=0;k<6;k++){g.lineTo(x+k*4,y-k*3);g.lineTo(x+(k+1)*4,y-k*3);}g.stroke();}
 return {pixels:await micrograph(finish(t,c,signal),c,context,signal,{pigment:a.pigment,vocabulary:a.micrography,hierarchy:a.hierarchy},t.base),notes:[`${count} gravity-changing ${a.gravity} flights, ${a.tread} treads`,`${a.story} landings with ${a.landing}; scene and identity crops in the wall`]};
}});
