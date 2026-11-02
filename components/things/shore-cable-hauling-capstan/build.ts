import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    drum: choice("What capstan drum is fitted?", {"waisted": "A waisted hauling drum.", "straight": "A straight sided cast drum.", "stepped": "A stepped drum with two diameters.", "tall": "A tall narrow drum."}),
    drive: choice("How is the capstan driven?", {"bars": "Four long removable timber bars.", "wheel": "A broad horizontal handwheel.", "gear": "A side gearbox and hand crank.", "motor": "A low enclosed electric motor."}),
    base: choice("What anchors the capstan?", {"timber": "A cross of heavy timber sleepers.", "stone": "A low square stone plinth.", "steel": "A riveted steel bedplate.", "bolts": "Four large anchor blocks."}),
    cable: choice("How much cable wraps the drum?", {"one": "One broad turn.", "three": "Three close turns.", "five": "Five tightly stacked turns.", "empty": "The drum is empty."}),
    finish: choice("What covers the cast metal?", {"black": "Dark tarred iron.", "green": "Muted green paint.", "red": "Red oxide paint.", "bare": "Bare grey iron."}),
    guide: choice("What guides the cable?", {"roller": "A vertical shore guide roller.", "fairlead": "Two low horizontal rollers.", "horns": "Two curved guide horns.", "none": "No separate guide."}),
    pawl: choice("What stops reverse movement?", {"single": "One long ratchet pawl.", "double": "Two opposed pawls.", "ring": "A toothed base ring.", "covered": "A small pawl cover."}),
    state: choice("What is happening?", {"haul": "A taut cable leads away.", "slack": "A loose cable bight lies on the bed.", "service": "A removed bar lies beside the drum.", "locked": "A locking pin bridges the drum base."}),
    size: score("How broad is the hauling drum?", ["A small shore capstan", "A standard cable capstan", "A heavy landing capstan"])
  },
  build(a,context){

 const s=new Sculpture(context),iron=s.material({black:'#475448',green:'#617d69',red:'#a16c50',bare:'#929d89'}[a.finish],{metalness:0.65}),wood=s.material('#9b8254'),steel=s.material('#a5af9c',{metalness:0.7}),cable=s.material('#4c5344'),r=0.26+a.size*0.18,h=a.drum==='tall'?1.2:0.85,by=0.18;
 if(a.base==='timber'){for(const z of [-0.4,0.4])s.box([1.8,0.18,0.25],[0,0.09,z],wood);}else s.box([1.4,0.18,1.4],[0,0.09,0],a.base==='stone'?s.material('#a8ac96'):iron);if(a.base==='bolts')for(const x of [-0.5,0.5])for(const z of [-0.5,0.5])s.box([0.3,0.22,0.3],[x,0.11,z],s.material('#a7aa92'));
 s.lathe(a.drum==='waisted'?[[0,0],[r*1.3,0],[r*1.3,0.08],[r,0.2],[r*0.8,h*0.6],[r,h-0.1],[r*1.2,h],[0,h]]:a.drum==='stepped'?[[0,0],[r*1.2,0],[r*1.2,h*0.4],[r*0.8,h*0.4],[r*0.8,h],[0,h]]:[[0,0],[r,0],[r,h],[0,h]],iron,[0,by,0]);s.cylinder(r*1.25,r*1.25,0.09,[0,by+h,0],iron,40);
 if(a.drive==='bars')for(let j=0;j<4;j++){const t=j*Math.PI/2;s.rod([Math.cos(t)*r*0.5,by+h-0.08,Math.sin(t)*r*0.5],[Math.cos(t)*1.2,by+h-0.08,Math.sin(t)*1.2],0.045,wood);}if(a.drive==='wheel'){s.ring(0.85,0.04,[0,by+h+0.08,0],wood).rotation.x=Math.PI/2;for(let j=0;j<6;j++)s.rod([0,by+h+0.08,0],[Math.cos(j*Math.PI/3)*0.85,by+h+0.08,Math.sin(j*Math.PI/3)*0.85],0.025,iron);}if(a.drive==='gear'||a.drive==='motor'){s.box([0.48,by,0.45],[r+0.35,by/2,0],iron);s.box([0.48,0.35,0.45],[r+0.35,by+0.18,0],iron);s.rod([r,by+0.3,0],[r+0.5,by+0.3,0],0.05,steel);if(a.drive==='gear'){s.rod([r+0.5,by+0.3,0],[r+0.5,by+0.65,0],0.025,steel);s.rod([r+0.5,by+0.65,0],[r+0.7,by+0.65,0],0.035,wood);}}
 const n={one:1,three:3,five:5,empty:0}[a.cable];for(let j=0;j<n;j++)s.ring(r+0.025,0.022,[0,by+0.24+j*0.05,0],cable).rotation.x=Math.PI/2;if(n){const y=by+0.24;s.tube([[r,y,0],[r,y,0.6],[0.85,0.2,1.1],[a.state==='slack'?0:1.2,0.2,1.3],[a.state==='slack'?-0.5:1.5,0.2,1]],0.024,cable);}
 if(a.guide!=='none'){s.box([0.75,0.08,0.4],[0.8,0.22,0.8],iron);if(a.guide==='roller')s.cylinder(0.09,0.09,0.5,[0.8,0.49,0.8],steel,24);if(a.guide==='fairlead')for(const x of [0.55,1.05])s.rod([x,0.28,0.65],[x,0.28,0.95],0.06,steel);if(a.guide==='horns')for(const x of [0.55,1.05])s.tube([[x,0.25,0.8],[x,0.55,0.8],[x+0.1,0.6,0.8]],0.035,iron);}
 if(a.pawl==='ring')for(let j=0;j<20;j++){const t=j*Math.PI/10;s.box([0.07,0.07,0.07],[Math.cos(t)*(r+0.12),by+0.1,Math.sin(t)*(r+0.12)],steel);}else if(a.pawl==='covered')s.box([0.28,0.15,0.2],[r+0.08,by+0.1,0],iron);else for(const side of a.pawl==='double'?[-1,1]:[1])s.rod([side*(r+0.25),by+0.06,0.35],[side*r,by+0.12,0],0.025,steel);
 if(a.state==='service')s.rod([-0.9,0.22,-0.55],[0.7,0.22,-0.55],0.045,wood);if(a.state==='locked')s.rod([-r-0.1,by+0.15,0],[r+0.1,by+0.15,0],0.025,steel);return s.finish();

  },
});
