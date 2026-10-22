import { choice, defineLook, score } from '@conjure/kit';
import { finish, glyphs, inset, line, prepare, quiet } from './studio';
import { micrograph } from './micro';
export default defineLook({questions:{
 micrography:choice('Which small inhabitants are drawn into the larger forms?',{watchers:'Architectural masks contain eyes, tiny chapels and stairwells in their faces.',stairbeasts:'Ribbed corridor beasts carry inhabited steps along their bodies.',livingcity:'Bent little towers grow faces, claws and smaller interior worlds.',mixed:'Masks, corridor beasts, living towers and nested passages interweave.'}),
 hierarchy:score('How abruptly does one drawing open into smaller drawings?',['Closely related rooms, creatures and micro glyphs','Three clear scales of inhabited drawing','Large architectural beasts descend into much smaller faces and minute corridors']),
 arrangement:choice('How has the impossible tenement grown?',{cliffs:'Tall thin residential cliffs crowd the sides of the picture.',hanging:'Apartment blocks hang upside down from the sky.',courtyard:'A horseshoe of low buildings encloses the scene like a courtyard.',stacks:'Uneven stacks of rooms climb diagonally into the empty air.'}),
 windows:choice('Which openings repeat the world?',{rect:'Square municipal windows with deep lintels.',arch:'Narrow arched windows like an abandoned institution.',paired:'Pairs of tiny windows separated by a single plaster rib.'}),
 state:choice('What is happening in the apartments?',{occupied:'Every window is occupied by the same impossible view.',vacated:'Some windows are bricked up, leaving pale rectangular scars.',watching:'Dark slit shutters cross the views like half closed eyes.',evicted:'The windows survive but the masonry is splitting into suspended fragments.'}),
 descent:score('How many generations of miniature apartments remain legible?',['Two rooms deep','Three rooms deep','Five rooms deep']),
 reach:score('How much empty air has been occupied by the tenement?',['A few narrow outbuildings','Several towers','A crowded city around the cast']),
 pigment:choice('What was the architecture printed with?',{bone:'Bone paper and sooty olive ink.',rust:'Dry rust red, tobacco plaster and dark iron.',ink:'Cold blue black ink on concrete grey.',acid:'Sickly yellow green plaster with charcoal ribs.'})
},async apply(c,a,context,signal){
 const t=prepare(c,context,signal,a.pigment),{g,p,source}=t,r=context.random,m=context.mood;
 const towers:{x:number;y:number;w:number;h:number}[]=[];const count=4+Math.round(a.reach*5+m.density*2);
 for(let j=0;j<count;j++){
  const side=j%2,band=Math.floor(j/2),w=65+r()*40+a.reach*24;let x=side?720-w-12-band*37:12+band*37,y=50+r()*105,h=260+r()*180;
  if(a.arrangement==='hanging'){x=12+j*690/count;y=-20-r()*60;h=190+r()*150;}
  if(a.arrangement==='courtyard'){x=18+j*680/count;y=45+Math.abs(j-count/2)*20;h=145+r()*95;}
  if(a.arrangement==='stacks'){x=25+j*640/count;y=25+j*25;h=160+r()*220;}
  if(quiet(c,x,y,w,h)>2.4){h*=.7;y=Math.max(12,y-60);}
  towers.push({x,y,w,h});
 }
 towers.sort((a,b)=>a.w-b.w);
 for(let k=0;k<towers.length;k++){
  signal.throwIfAborted();const b=towers[k];g.fillStyle=p.ink;g.fillRect(b.x+7,b.y+6,b.w,b.h);g.fillStyle=p.soft;g.fillRect(b.x,b.y,b.w,b.h);
  g.strokeStyle=p.ink;g.lineWidth=1.2;g.strokeRect(b.x,b.y,b.w,b.h);g.fillStyle=p.paper;g.fillRect(b.x-3,b.y-5,b.w+6,7);
  const cols=a.windows==='paired'?2:1,ww=(b.w-18-(cols-1)*7)/cols,hh=ww*.86,rows=Math.max(2,Math.floor((b.h-16)/(hh+15)));
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
   const x=b.x+9+col*(ww+7),y=b.y+14+row*(hh+15),vacant=a.state==='vacated'&&r()<.38;
   if(vacant){g.fillStyle=p.paper;g.fillRect(x,y,ww,hh);for(let q=0;q<4;q++)line(g,x,y+q*hh/4,x+ww,y+q*hh/4,p.soft,.8);}
   else {inset(g,source,p,x,y,ww,hh,2+Math.round(a.descent*3),a.windows==='arch'?'arch':'rect',row%2===1);
    if(a.state==='watching'){g.fillStyle=p.ink;g.globalAlpha=.7;g.fillRect(x,y,ww,hh*.16);g.fillRect(x,y+hh*.8,ww,hh*.2);g.globalAlpha=1;}}
   line(g,x-4,y+hh+3,x+ww+4,y+hh+3,p.paper,3);
   if(a.state==='evicted'){line(g,x+ww*.3,y-9,x+ww*.2,y+hh+10,p.ink,1.6);}
   if(r()<m.wear+.2)for(let d=0;d<3;d++)line(g,x+ww*r(),y+hh+4,x+ww*r(),y+hh+9+r()*14,p.accent,.6);
  }
  line(g,b.x+b.w*.7,b.y,b.x+b.w*.7,b.y-15-r()*30,p.ink,1);glyphs(g,p,b.x+6,b.y+b.h-4,b.w-12,context.seed+k);
  for(let z=0;z<Math.round(8+m.wear*20);z++){const x=b.x+r()*b.w,y=b.y+r()*b.h;line(g,x,y,x+r()*5,y-2-r()*4,p.ink,.4);}
 }
 for(let j=1;j<towers.length;j++){const b=towers[j],a0=towers[j-1];g.strokeStyle=p.ink;g.lineWidth=.6;g.beginPath();g.moveTo(a0.x+a0.w*.5,a0.y+8);g.quadraticCurveTo(360,60+j*11,b.x+b.w*.5,b.y+7);g.stroke();}
 return {pixels:await micrograph(finish(t,c,signal),c,context,signal,{pigment:a.pigment,vocabulary:a.micrography,hierarchy:a.hierarchy},t.base),notes:[`${towers.length} ${a.arrangement} apartment blocks; ${a.state} windows`,`${2+Math.round(a.descent*3)} nested scenes per opening, ${a.pigment} architectural etching; original cast retained`]};
}});
