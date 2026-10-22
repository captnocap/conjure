import { choice, defineLook, score } from '@conjure/kit';
import { arch, detail, finish, glyphs, inset, line, prepare, quiet } from './studio';
import { micrograph } from './micro';
export default defineLook({questions:{
 micrography:choice('Which small inhabitants are drawn into the larger forms?',{watchers:'Architectural masks contain eyes, tiny chapels and stairwells in their faces.',stairbeasts:'Ribbed corridor beasts carry inhabited steps along their bodies.',livingcity:'Bent little towers grow faces, claws and smaller interior worlds.',mixed:'Masks, corridor beasts, living towers and nested passages interweave.'}),
 hierarchy:score('How abruptly does one drawing open into smaller drawings?',['Closely related rooms, creatures and micro glyphs','Three clear scales of inhabited drawing','Large architectural beasts descend into much smaller faces and minute corridors']),
 threshold:choice('What kinds of doors appear in the gaps?',{narrow:'Very tall narrow doors with deep receding jambs.',arches:'Softly pointed institutional arches.',trapdoors:'Square trapdoors turn sideways on the walls.'}),
 corridor:choice('Where do the thresholds lead?',{repetition:'Successive whole scenes wait down a receding corridor.',witness:'The corridor ends at an enlarged detail of a real inhabitant.',crossing:'The corridor switches from the whole world to its inhabitant and back.'}),
 story:choice('What has happened at the threshold?',{invited:'A thin pale path leads toward every open door.',bricked:'Some doors end abruptly in a brick wall.',ajar:'The door leaves hang at an impossible slant.',leaking:'Tiny rooms leak out of the bottom of each doorway.'}),
 depth:score('How long are the corridors?', ['Two nested thresholds','Four impossible passages','Seven shrinking frames']),
 gaps:score('How many interstitial spaces have opened?',['Three large doors','Five scattered thresholds','Nine doors and little further gaps']),
 pigment:choice('What is the threshold made from?',{bone:'Old ivory plaster and charcoal corridors.',rust:'Rusted steel and tobacco walls.',ink:'Cold grey blue plaster and black ink.',acid:'Green sickroom paint and sallow light.'})
},async apply(c,a,context,signal){
 const t=prepare(c,context,signal,a.pigment),{g,p,source,boxes}=t,r=context.random,m=context.mood,wanted=3+Math.round(a.gaps*6);
 const candidates:{x:number;y:number;w:number;h:number;q:number}[]=[];
 for(let j=0;j<70;j++){const w=a.threshold==='narrow'?45+r()*24:70+r()*36,h=a.threshold==='trapdoors'?w:135+r()*65,x=15+r()*(690-w),y=20+r()*(670-h);candidates.push({x,y,w,h,q:quiet(c,x,y,w,h)});}
 // Candidate rejection is identity-aware; the spare space between real figures is preferred.
 candidates.sort((a,b)=>a.q-b.q);const doors:typeof candidates=[];
 for(const b of candidates){if(doors.some(d=>Math.abs(d.x-b.x)<(d.w+b.w)*.57&&Math.abs(d.y-b.y)<(d.h+b.h)*.55))continue;doors.push(b);if(doors.length>=wanted)break;}
 for(let j=0;j<doors.length;j++){
  signal.throwIfAborted();const b=doors[j],side=b.x<360?-1:1,dx=side*(20+a.depth*70),dy=15+a.depth*55;
  // A skewed solid corridor opens out of the surface, so every portal has its own vanishing point.
  g.fillStyle=p.ink;g.beginPath();g.moveTo(b.x,b.y+b.h);g.lineTo(b.x+dx,b.y+b.h+dy);g.lineTo(b.x+b.w+dx,b.y+b.h+dy);g.lineTo(b.x+b.w,b.y+b.h);g.closePath();g.fill();
  g.fillStyle=p.soft;g.beginPath();g.moveTo(b.x+(side>0?b.w:0),b.y);g.lineTo(b.x+(side>0?b.w:0)+dx,b.y+dy);g.lineTo(b.x+(side>0?b.w:0)+dx,b.y+b.h+dy);g.lineTo(b.x+(side>0?b.w:0),b.y+b.h);g.closePath();g.fill();
  g.save();if(a.threshold==='trapdoors'){g.translate(b.x+b.w/2,b.y+b.h/2);g.rotate(j%2?.2:-.2);g.translate(-b.x-b.w/2,-b.y-b.h/2);}
  arch(g,b.x-6,b.y-6,b.w+12,b.h+12,a.threshold==='arches'?'arch':'rect');g.fillStyle=p.ink;g.fill();
  inset(g,source,p,b.x,b.y,b.w,b.h,2,a.threshold==='arches'?'arch':'rect');
  if((a.corridor==='witness'||a.corridor==='crossing'&&j%2===1)&&boxes.length){g.save();arch(g,b.x+3,b.y+3,b.w-6,b.h-6,a.threshold==='arches'?'arch':'rect');g.clip();detail(g,source,boxes[j%boxes.length],b.x+2,b.y+2,b.w-4,b.h-4);g.restore();}
  for(let k=1;k<2+Math.round(a.depth*5);k++){const f=Math.pow(.70,k),ww=b.w*f,hh=b.h*f,xx=b.x+(b.w-ww)*.6,yy=b.y+(b.h-hh)*.32;arch(g,xx,yy,ww,hh,a.threshold==='arches'?'arch':'rect');g.strokeStyle=k%2?p.paper:p.ink;g.lineWidth=Math.max(1,4-k*.5);g.stroke();if(k===2)inset(g,source,p,xx,yy,ww,hh,3,a.threshold==='arches'?'arch':'rect');}
  if(a.story==='bricked'&&j%3===1){g.fillStyle=p.soft;g.fillRect(b.x,b.y+b.h*.35,b.w,b.h*.65);for(let row=0;row<7;row++){line(g,b.x,b.y+b.h*.35+row*b.h*.09,b.x+b.w,b.y+b.h*.35+row*b.h*.09,p.ink,.8);for(let col=0;col<3;col++)line(g,b.x+(col+(row%2)*.5)*b.w/3,b.y+b.h*.35+row*b.h*.09,b.x+(col+(row%2)*.5)*b.w/3,b.y+b.h*.44+row*b.h*.09,p.ink,.6);}}
  if(a.story==='ajar'){g.fillStyle=p.accent;g.beginPath();g.moveTo(b.x,b.y);g.lineTo(b.x+b.w*.27,b.y+b.h*.12);g.lineTo(b.x+b.w*.27,b.y+b.h*1.06);g.lineTo(b.x,b.y+b.h);g.closePath();g.fill();line(g,b.x+b.w*.22,b.y+b.h*.58,b.x+b.w*.22,b.y+b.h*.64,p.paper,2);}
  g.restore();glyphs(g,p,b.x,b.y-10,b.w,context.seed+j);
  if(a.story==='leaking')for(let k=0;k<3;k++)inset(g,source,p,b.x+k*11,b.y+b.h+8+k*19,22-k*4,28-k*5,2,'rect',k%2===1);
  if(a.story==='invited'){g.strokeStyle=p.paper;g.lineWidth=2;g.beginPath();g.moveTo(b.x+b.w*.5,b.y+b.h+3);g.bezierCurveTo(b.x+b.w*.5+dx,b.y+b.h+dy,360,620,360+(j-doors.length/2)*20,720);g.stroke();}
 }
 return {pixels:await micrograph(finish(t,c,signal),c,context,signal,{pigment:a.pigment,vocabulary:a.micrography,hierarchy:a.hierarchy},t.base),notes:[`${doors.length} ${a.threshold} thresholds selected from identity gaps`,`${a.story} corridors: ${a.corridor}, ${2+Math.round(a.depth*5)} shrinking jambs`]};
}});
