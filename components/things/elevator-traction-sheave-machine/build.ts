import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    drive: choice("What drive layout is used?", {"geared": "A large motor drives a square gearbox.", "gearless": "A compact motor sits inside the sheave.", "offset": "The motor sits on a rear offset bed.", "twin": "Two narrow traction sheaves share the shaft."}),
    body: choice("What colour is the machinery?", {"green": "Deep machine green.", "grey": "Neutral industrial grey.", "blue": "Faded blue enamel.", "red": "Red oxide service paint."}),
    sheave: choice("What is the sheave web?", {"solid": "A solid disc web.", "spokes": "Six broad radial spokes.", "holes": "Six dark circular lightening holes.", "rim": "A broad heavy outer rim."}),
    ropes: choice("How many ropes pass over it?", {"three": "Three thick hoist ropes.", "five": "Five medium hoist ropes.", "seven": "Seven fine ropes.", "none": "The sheave is unroped."}),
    brake: choice("How is the brake arranged?", {"arms": "Two tall brake arms grip the drum.", "band": "A broad brake band wraps the drum.", "disc": "A compact disc brake at one end.", "open": "Brake shoes removed for service."}),
    bed: choice("How is the machine mounted?", {"skid": "A steel skid with cross beams.", "block": "A concrete inertia block.", "spring": "Four spring isolation mounts.", "timber": "Heavy temporary timber blocking."}),
    guard: choice("What guards the rotating parts?", {"none": "Exposed machinery.", "half": "A half height sheave guard.", "mesh": "A tall open metal guard.", "cover": "A curved motor cover."}),
    state: choice("What service state is visible?", {"ready": "Machine ready to operate.", "oil": "An oil cup and drip pan.", "locked": "A red maintenance lock plate.", "inspection": "A small inspection lamp on the bed."}),
    size: score("How large is the traction sheave?", ["A compact lift machine", "A normal machine", "A large heavy-duty machine"])
  },
  build(a,context){

    const s=new Sculpture(context),body=s.material({green:'#587768',grey:'#8e9a8a',blue:'#658691',red:'#9f6b52'}[a.body],{metalness:0.6}),steel=s.material('#a7b0a0',{metalness:0.75}),dark=s.material('#4e5a4d'),r=0.4+a.size*0.25,y=r+0.42;
    const by=a.bed==='block'?0.25:0.15;s.box([2.3,0.16,1.3],[0,by,0],a.bed==='block'?s.material('#a9ad98'):a.bed==='timber'?s.material('#95784c'):body);for(const x of [-0.9,0.9])for(const z of [-0.45,0.45]){s.box([0.28,by-0.08,0.28],[x,(by-0.08)/2,z],dark);if(a.bed==='spring')for(let j=0;j<4;j++)s.ring(0.08,0.012,[x,0.08+j*0.025,z],steel).rotation.x=Math.PI/2;}
    const xx=a.drive==='twin'?[-0.15,0.15]:[0];for(const x of xx){s.ring(r,0.065,[x,y,0],body).rotation.y=Math.PI/2;if(a.sheave==='spokes')for(let j=0;j<6;j++)s.rod([x,y,0],[x,y+Math.cos(j*Math.PI/3)*r,Math.sin(j*Math.PI/3)*r],0.045,body);else s.cylinder(r-0.04,r-0.04,0.12,[x,y,0],body,40).rotation.z=Math.PI/2;if(a.sheave==='holes')for(let j=0;j<6;j++)s.cylinder(r*0.13,r*0.13,0.125,[x,y+Math.cos(j*Math.PI/3)*r*0.6,Math.sin(j*Math.PI/3)*r*0.6],dark,20).rotation.z=Math.PI/2;if(a.sheave==='rim')s.ring(r*0.8,0.06,[x,y,0],steel).rotation.y=Math.PI/2;}
    const nr={three:3,five:5,seven:7,none:0}[a.ropes];for(let j=0;j<nr;j++){const x=(j-(nr-1)/2)*0.028;s.tube([[x,0.22,-r],[x,y,-r],[x,y+r,0],[x,y,r],[x,0.22,r]],0.009,steel);}
    s.rod([-0.85,y,0],[0.55,y,0],0.065,steel);for(const x of [-0.4,0.42]){s.box([0.18,y-by,0.32],[x,(y+by)/2,0],body);s.ball([0.15,0.14,0.17],[x,y,0],body,16);}
    if(a.drive==='geared')s.box([0.45,0.55,0.55],[-0.7,y-0.1,0],body);const mx=a.drive==='gearless'?0.25:-0.95,mz=a.drive==='offset'?-0.45:0;s.cylinder(a.drive==='gearless'?0.3:0.24,a.drive==='gearless'?0.3:0.24,0.5,[mx,y,mz],body,32).rotation.z=Math.PI/2;for(let j=0;j<7;j++)s.ring(0.245,0.01,[mx-0.23+j*0.07,y,mz],dark).rotation.y=Math.PI/2;
    if(a.drive!=='gearless'){for(const x of [mx-0.16,mx+0.16])s.box([0.1,y-0.24-by,0.4],[x,(y-0.24+by)/2,mz],body);if(a.drive==='offset')s.rod([mx+0.25,y,mz],[-0.4,y,0],0.055,steel);}if(a.brake==='arms')for(const z of [-r*0.7,r*0.7]){s.rod([0.2,by+0.1,z*1.4],[0.2,y+0.25,z],0.04,body);s.box([0.18,0.3,0.12],[0.2,y,z],dark);}if(a.brake==='band')s.ring(r*0.75,0.035,[0.28,y,0],dark,Math.PI*1.7).rotation.y=Math.PI/2;if(a.brake==='disc')s.cylinder(0.3,0.3,0.035,[0.5,y,0],steel,32).rotation.z=Math.PI/2;
    if(a.guard==='half')s.box([0.06,r*1.3,r*2.3],[0.6,by+r*0.65,0],body);if(a.guard==='mesh')for(let j=0;j<10;j++)s.rod([0.63,by,-r+j*r*2/9],[0.63,y+r,-r+j*r*2/9],0.009,steel);if(a.guard==='cover')s.cylinder(0.28,0.28,0.6,[mx,y,mz],body,24).rotation.z=Math.PI/2;
    if(a.state==='oil'){s.box([0.6,0.025,0.55],[-0.65,by+0.1,0],dark);s.cylinder(0.04,0.04,0.08,[-0.65,y+0.3,0],steel,16);}if(a.state==='locked')s.label('LOCKED',0.32,0.16,[0.52,y+0.1,0.2],'#e1d3b1','#a45f44').rotation.y=Math.PI/2;if(a.state==='inspection'){s.rod([0.9,by,0.4],[0.9,0.8,0.4],0.012,steel);s.ball([0.06,0.08,0.06],[0.9,0.85,0.4],s.material('#d5c88e',{emissive:'#a59351',emissiveIntensity:0.2}),16);}return s.finish();

  },
});
