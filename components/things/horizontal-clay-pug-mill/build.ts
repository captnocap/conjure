import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    body: choice("What is the mill casing?", {"ribbed": "A ribbed cast iron barrel.", "smooth": "A smooth painted barrel.", "split": "A bolted split metal casing.", "short": "A compact short barrel."}),
    paint: choice("What finish covers the machine?", {"green": "Industrial sage green.", "blue": "Faded workshop blue.", "cream": "Cream factory enamel.", "bare": "Bare grey metal."}),
    hopper: choice("How is clay fed in?", {"square": "A broad square hopper.", "round": "A round funnel hopper.", "chute": "A sloping sheet metal chute.", "open": "A simple open feed neck."}),
    drive: choice("How is the screw driven?", {"motor": "A large side motor and belt.", "gear": "A compact rear gearbox.", "crank": "A long manual turning crank.", "pulley": "A broad exposed drive pulley."}),
    nose: choice("What shape exits the nozzle?", {"round": "A thick round clay log.", "square": "A squared clay extrusion.", "twin": "Two narrow clay strands.", "empty": "The nozzle is empty."}),
    bench: choice("What catches the clay?", {"rollers": "A short roller conveyor.", "board": "A wooden cutting board.", "tray": "A shallow steel tray.", "block": "A low receiving block."}),
    cut: choice("How is the extruded clay cut?", {"wire": "A raised wire cutting bow.", "knife": "A broad cutting blade.", "marks": "Even cut marks along the log.", "none": "No cutter at the nozzle."}),
    state: choice("What is the production state?", {"running": "Fresh clay projects from the nose.", "loaded": "Clay lumps fill the hopper.", "clean": "The outlet is wiped clean.", "service": "A side casing cover is removed."}),
    length: score("How long is the machine barrel?", ["A compact mill", "A normal mill", "A long production mill"])
  },
  build(a,context){

    const s=new Sculpture(context),body=s.material({green:'#7c927d',blue:'#718f99',cream:'#c2bda1',bare:'#8e9b8b'}[a.paint],{metalness:0.5}),metal=s.material('#596e60',{metalness:0.65}),clay=s.material('#b7b194'),wood=s.material('#a08a5c'),len=(0.8+a.length*0.65)*(a.body==='short'?0.7:1),y=0.8;
    for(const x of [-len*0.35,len*0.35])for(const z of [-0.22,0.22])s.box([0.08,0.6,0.08],[x,0.3,z],metal);s.box([len+0.2,0.08,0.65],[0,0.59,0],metal);s.cylinder(0.24,0.24,len,[0,y,0],body,32).rotation.z=Math.PI/2;
    if(a.body==='ribbed')for(let j=0;j<9;j++)s.ring(0.245,0.016,[-len/2+j*len/8,y,0],metal).rotation.y=Math.PI/2;if(a.body==='split')for(let j=0;j<7;j++){s.box([0.06,0.04,0.08],[-len/2+j*len/6,y,0.26],metal);s.cylinder(0.017,0.017,0.04,[-len/2+j*len/6,y+0.04,0.26],body,6);}
    s.cylinder(0.13,0.23,0.25,[len/2+0.12,y,0],body,32).rotation.z=Math.PI/2;
    if(a.hopper==='round')s.cylinder(0.32,0.1,0.35,[-len*0.25,y+0.38,0],body,28);else if(a.hopper==='open')s.cylinder(0.16,0.16,0.2,[-len*0.25,y+0.3,0],body,24);else{s.cylinder(0.35,0.12,0.35,[-len*0.25,y+0.38,0],body,4).rotation.y=Math.PI/4;if(a.hopper==='chute')s.box([0.55,0.025,0.4],[-len*0.25-0.25,y+0.5,0],body).rotation.z=0.3;}s.cylinder(0.15,0.15,0.01,[-len*0.25,y+(a.hopper==='open'?0.405:0.56),0],metal,24);
    if(a.drive==='motor'){s.box([0.4,0.23,0.32],[-len/2-0.3,0.115,0],metal);s.rod([-len/2-0.3,y,0],[-len/2,y,0],0.035,metal);s.cylinder(0.18,0.18,0.35,[-len/2-0.3,0.4,0],metal,24).rotation.z=Math.PI/2;s.rod([-len/2-0.3,0.4,0],[-len/2-0.3,y,0],0.04,metal);}if(a.drive==='gear')s.box([0.35,0.35,0.4],[-len/2-0.15,y,0],metal);if(a.drive==='pulley'){s.ring(0.3,0.025,[-len/2-0.12,y,0],metal).rotation.y=Math.PI/2;for(let j=0;j<6;j++)s.rod([-len/2-0.12,y,0],[-len/2-0.12,y+Math.cos(j)*0.3,Math.sin(j)*0.3],0.02,metal);}if(a.drive==='crank'){s.rod([-len/2,y,0],[-len/2-0.18,y,0],0.025,metal);s.rod([-len/2-0.18,y,0],[-len/2-0.18,y+0.3,0],0.02,metal);s.rod([-len/2-0.18,y+0.3,0],[-len/2-0.38,y+0.3,0],0.03,wood);}
    const bx=len/2+0.6;s.box([0.9,0.07,0.65],[bx,0.61,0],a.bench==='tray'?metal:wood);for(const x of [bx-0.35,bx+0.35])for(const z of [-0.25,0.25])s.box([0.05,0.58,0.05],[x,0.29,z],metal);if(a.bench==='rollers')for(let j=0;j<7;j++)s.rod([bx-0.35+j*0.12,0.68,-0.27],[bx-0.35+j*0.12,0.68,0.27],0.035,metal);if(a.bench==='block')s.box([0.65,0.12,0.5],[bx,0.7,0],wood);
    if(a.nose!=='empty'&&a.state!=='clean'){if(a.nose==='square')s.box([0.75,0.18,0.2],[bx,y,0],clay);else for(const z of a.nose==='twin'?[-0.07,0.07]:[0])s.rod([len/2+0.2,y,z],[bx+0.3,y,z],a.nose==='twin'?0.055:0.1,clay);}
    if(a.cut==='wire'){s.tube([[bx,0.65,-0.3],[bx,1.12,-0.3],[bx,1.12,0.3],[bx,0.65,0.3]],0.012,metal);s.rod([bx,0.92,-0.3],[bx,0.92,0.3],0.002,metal);}if(a.cut==='knife')s.box([0.025,0.2,0.4],[bx+0.3,0.86,0],metal);if(a.cut==='marks')for(let j=0;j<5;j++)s.box([0.007,0.008,0.2],[bx-0.2+j*0.12,y+0.1,0],metal);
    if(a.state==='loaded')for(let j=0;j<6;j++)s.ball([0.1,0.08,0.09],[-len*0.25+(context.random()-0.5)*0.18,y+0.57,(context.random()-0.5)*0.18],clay,12);if(a.state==='service')s.cylinder(0.23,0.23,0.035,[-0.2,0.03,0.65],body,32);return s.finish();

  },
});
