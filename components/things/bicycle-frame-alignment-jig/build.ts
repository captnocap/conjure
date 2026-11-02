import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    beam: choice("How is the jig built?", {"tower": "A tall central spine.", "rail": "A broad horizontal backbone.", "plate": "A perforated upright plate.", "triangle": "A triangular open frame."}),
    finish: choice("What finish identifies the fixture?", {"blue": "Blue powder coated steel.", "red": "Brick red painted steel.", "silver": "Bare aluminium.", "black": "Blackened steel."}),
    feet: choice("How does it stand?", {"cross": "Crossed metal feet.", "bench": "A low bench mounting plate.", "wheels": "A wheeled workshop stand.", "tripod": "Three splayed feet."}),
    cones: choice("What locates the frame joints?", {"brass": "Golden brass cones.", "steel": "Grey steel cones.", "cups": "Broad socket cups.", "pins": "Narrow alignment pins."}),
    frame: choice("What is held in the jig?", {"empty": "No frame tubes installed.", "partial": "Two loose tubes in position.", "diamond": "A full diamond frame.", "step": "A low step-through frame."}),
    gauge: choice("How is alignment measured?", {"dial": "A circular dial indicator.", "rule": "A long graduated ruler.", "laser": "A small sighting block.", "plumb": "A hanging plumb line."}),
    clamps: choice("How are the joints held?", {"knobs": "Large round adjustment knobs.", "levers": "Long locking levers.", "bolts": "Hexagonal locking bolts.", "straps": "Broad metal clamping straps."}),
    state: choice("What stage is the work in?", {"setup": "Clean fixture ready for setup.", "marked": "Bright reference chalk marks.", "braze": "Small gold brazed joint collars.", "service": "A removed cone lies on the foot."}),
    angle: score("How steeply is the head joint set?", ["Relaxed touring geometry", "Road frame geometry", "Steep compact geometry"])
  },
  build(a,context){

    const s=new Sculpture(context),m=s.material({blue:'#557c8c',red:'#a35f4a',silver:'#a6b0aa',black:'#454c49'}[a.finish],{metalness:0.65}),steel=s.material('#7c8882',{metalness:0.8}),tube=s.material('#99927d',{metalness:0.6}),gold=s.material('#b29957',{metalness:0.7});
    const pts:[number,number,number][]=[[-0.45,0.58,0.16],[-0.48,1.4,0.16],[0.5,1.4+a.angle*0.2,0.16],[0.65,1.12+a.angle*0.2,0.16]];
    if(a.feet==='bench')s.box([1.3,0.07,0.8],[0,0.035,0],m);else{for(const z of [-0.36,0.36])s.box([1.4,0.07,0.08],[0,0.08,z],m);if(a.feet==='tripod')s.rod([0,0.5,0],[0,0.06,0.65],0.045,m);if(a.feet==='wheels')for(const x of [-0.6,0.6])for(const z of [-0.36,0.36])s.cylinder(0.065,0.065,0.045,[x,0.065,z],steel,16).rotation.z=Math.PI/2;}
    s.box([0.12,1.6,0.12],[0,0.88,0],m);
    if(a.beam==='rail')s.box([1.7,0.15,0.1],[0,1,0],m);if(a.beam==='plate'){s.box([1.2,1.25,0.06],[0,1.05,-0.06],m);for(let i=0;i<6;i++)for(let j=0;j<5;j++)s.ball([0.02,0.02,0.005],[-0.5+i*0.2,0.55+j*0.25,-0.025],steel,8);}
    if(a.beam==='triangle'){s.rod([-0.7,0.4,0],[0,1.8,0],0.05,m);s.rod([0,1.8,0],[0.7,0.4,0],0.05,m);s.rod([-0.7,0.4,0],[0.7,0.4,0],0.05,m);}
    for(const p of pts){s.rod([0,p[1],0],[p[0],p[1],0],0.035,m);const cone=s.cylinder(a.cones==='pins'?0.015:0.025,a.cones==='cups'?0.09:0.065,0.12,p,a.cones==='brass'?gold:steel,20);cone.rotation.x=Math.PI/2;if(a.clamps==='knobs')s.cylinder(0.065,0.065,0.04,[p[0],p[1],0.26],m,12).rotation.x=Math.PI/2;else if(a.clamps==='levers')s.rod([p[0],p[1],0.24],[p[0]+0.13,p[1]+0.1,0.24],0.018,steel);else s.box([a.clamps==='straps'?0.22:0.06,0.06,0.03],[p[0],p[1],0.25],steel);}
    if(a.frame!=='empty'){s.rod(pts[0],pts[1],0.028,tube);s.rod(pts[0],pts[3],0.03,tube);if(a.frame!=='partial'){s.rod(pts[1],a.frame==='step'?[0.3,0.85,0.16]:pts[2],0.027,tube);s.rod(pts[2],pts[3],0.032,tube);s.rod(pts[1],[-0.85,0.6,0.16],0.018,tube);s.rod(pts[0],[-0.85,0.6,0.16],0.018,tube);}}
    if(a.gauge==='dial'){s.cylinder(0.13,0.13,0.04,[0.4,1.84,0.08],steel,32).rotation.x=Math.PI/2;s.cylinder(0.11,0.11,0.006,[0.4,1.84,0.105],s.material('#e0d9bd'),32).rotation.x=Math.PI/2;s.rod([0.4,1.84,0.115],[0.45,1.91,0.115],0.006,m);s.rod([0.4,1.7,0.08],[0.4,1.4,0.08],0.012,steel);}
    if(a.gauge==='rule'){s.box([0.045,1.5,0.02],[-0.12,1,0.08],steel);for(let i=0;i<20;i++)s.box([0.03,0.006,0.005],[-0.12,0.3+i*0.07,0.095],m);}
    if(a.gauge==='laser')s.box([0.15,0.12,0.2],[0.05,1.8,0],s.material('#ae664a'));
    if(a.gauge==='plumb'){s.rod([0.5,1.9,0.06],[0.5,0.5,0.06],0.004,steel);s.cylinder(0.03,0,0.09,[0.5,0.46,0.06],gold,16);}
    if(a.state==='marked')for(const p of pts)s.label('+',0.08,0.08,[p[0]+0.12,p[1],0.08],'#e4dbc1','#5e7b80');if(a.state==='braze')for(const p of pts)s.ball([0.04,0.04,0.04],p,gold,10);if(a.state==='service')s.cylinder(0.02,0.065,0.12,[0.45,0.17,0.25],gold,20);
    s.root.rotation.y=(context.random()-0.5)*0.12;return s.finish();

  },
});
