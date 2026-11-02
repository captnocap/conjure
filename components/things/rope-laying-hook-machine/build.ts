import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    head: choice("How are the hooks arranged?", {"three": "Three triangular spindles.", "four": "Four square-set spindles.", "line": "Three hooks in a row.", "single": "One large central laying hook."}),
    drive: choice("How is it driven?", {"crank": "A long side crank.", "wheel": "A large spoke handwheel.", "belt": "A side belt pulley.", "treadle": "A foot treadle and connecting rod."}),
    frame: choice("What carries the mechanism?", {"oak": "A heavy oak trestle.", "iron": "A cast iron pedestal.", "cart": "A wheeled timber frame.", "bench": "A low bench mounted frame."}),
    gears: choice("How are the gears exposed?", {"open": "Open toothed gear wheels.", "guard": "A half-round gear guard.", "plate": "A flat protective backplate.", "wood": "Traditional wooden peg gears."}),
    line: choice("What passes through the hooks?", {"taut": "Three taut outgoing strands.", "slack": "Hanging loops of loose strands.", "cut": "Short cut strand ends.", "empty": "The hooks are empty."}),
    fibre: choice("What rope fibre is used?", {"hemp": "Golden hemp strands.", "sisal": "Pale coarse sisal.", "tar": "Dark tarred cord.", "cotton": "Cream cotton cord."}),
    anchor: choice("What holds the machine still?", {"bolts": "Four visible ground bolts.", "skids": "Broad timber skids.", "weights": "Heavy blocks on the feet.", "braces": "Angled iron floor braces."}),
    state: choice("What is the work state?", {"ready": "Clean mechanism ready to turn.", "oil": "An oil can on a bracket.", "broken": "One hook is removed and laid below.", "tag": "A job tag tied to the handle."}),
    spread: score("How far apart are the hooks?", ["Close-set strands", "Normal strand spacing", "Broad heavy-rope spacing"])
  },
  build(a,context){

    const s=new Sculpture(context),wood=s.material('#96764b'),iron=s.material('#5e7166',{metalness:0.6}),metal=s.material('#a2ad9d',{metalness:0.75}),rope=s.material({hemp:'#b7a16d',sisal:'#c6ba8b',tar:'#555749',cotton:'#d8d1b2'}[a.fibre]),y=a.frame==='bench'?0.7:1.15,r=0.16+a.spread*0.1;
    for(const x of [-0.4,0.4]){s.box([0.16,0.1,0.8],[x,0.06,0],wood);s.rod([x,0.1,-0.2],[x,y+0.3,0],0.055,a.frame==='iron'?iron:wood);if(a.frame==='cart')for(const z of [-0.3,0.3])s.cylinder(0.09,0.09,0.06,[x,0.09,z],iron,18).rotation.z=Math.PI/2;}
    s.box([0.95,0.6,0.09],[0,y,-0.08],a.gears==='wood'?wood:iron);const pts=a.head==='single'?[[0,0]]:a.head==='line'?[[-r,0],[0,0],[r,0]]:a.head==='four'?[[-r,-r],[-r,r],[r,-r],[r,r]]:[[0,r],[-r,-r],[r,-r]];
    for(const [i,p] of pts.entries()){const x=p[0],yy=y+p[1];if(a.state==='broken'&&i===0)continue;s.cylinder(0.12,0.12,0.05,[x,yy,0],a.gears==='wood'?wood:metal,24).rotation.x=Math.PI/2;if(a.gears==='open'||a.gears==='wood')for(let j=0;j<12;j++){const t=j*Math.PI/6;s.box([0.025,0.035,0.04],[x+Math.cos(t)*0.12,yy+Math.sin(t)*0.12,0],a.gears==='wood'?wood:metal).rotation.z=t;}
      s.tube([[x,yy,0.02],[x,yy,0.2],[x+0.06,yy+0.05,0.24],[x+0.06,yy+0.1,0.2]],0.014,iron);
      if(a.line!=='empty')s.tube([[x,yy,0.22],[x,yy-(a.line==='slack'?0.35:0),a.line==='cut'?0.4:0.7],[x*0.3,a.line==='taut'?y:yy-0.2,a.line==='cut'?0.45:1.1]],0.012,rope);
    }
    if(a.gears==='guard')s.box([0.96,0.25,0.17],[0,y+0.26,0.03],iron);if(a.gears==='plate')s.box([0.96,0.6,0.025],[0,y,0.045],iron);
    if(a.drive==='wheel'||a.drive==='belt'){s.ring(0.31,0.025,[0,y,-0.18],wood);for(let j=0;j<6;j++)s.rod([0,y,-0.18],[Math.cos(j)*0.3,y+Math.sin(j)*0.3,-0.18],0.014,iron);}else{s.rod([0,y,-0.18],[0.25,y+0.12,-0.18],0.018,iron);s.rod([0.25,y+0.12,-0.18],[0.25,y+0.12,-0.4],0.025,wood);}
    if(a.drive==='treadle'){s.box([0.5,0.045,0.23],[0,0.14,0.1],iron).rotation.x=-0.12;s.rod([0.2,0.15,0],[0.25,y,-0.2],0.012,iron);}
    for(const x of [-0.4,0.4]){if(a.anchor==='weights')s.box([0.3,0.18,0.4],[x,0.17,0],metal);if(a.anchor==='braces')s.rod([x,y*0.7,0],[x,0.05,0.55],0.02,iron);if(a.anchor==='bolts')for(const z of [-0.3,0.3])s.cylinder(0.025,0.025,0.06,[x,0.1,z],metal,6);}
    if(a.state==='oil'){s.box([0.22,0.03,0.2],[-0.48,0.6,0],wood);s.cylinder(0.05,0.05,0.1,[-0.48,0.67,0],metal,16);s.rod([-0.48,0.72,0],[-0.42,0.81,0],0.009,metal);}if(a.state==='tag')s.label('ROPE 24',0.2,0.11,[0.25,y-0.1,-0.41],'#5c604e','#ddd0a7');if(a.state==='broken')s.ring(0.06,0.015,[-0.3,0.12,0.2],iron,Math.PI*1.5).rotation.x=Math.PI/2;return s.finish();

  },
});
