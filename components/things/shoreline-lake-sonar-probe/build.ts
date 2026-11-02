import * as THREE from 'three';
import { Sculpture, choice, defineThing, score } from '@conjure/kit';
export default defineThing({
  questions:{
    hulls: choice('What hulls carry the survey probe?', {'tubes': 'Two long cylindrical pontoons.', 'skis': 'Two narrow angular hydrofoil-like floats.', 'tri': 'Three short radial floats.', 'barge': 'A broad flat survey raft.'}),
    boom: choice('Where is the sonar boom?', {'lowered': 'A vertical boom reaches below the deck.', 'raised': 'The boom points upward for transport.', 'side': 'An articulated boom reaches over one side.', 'folded': 'The boom folds back along the deck.'}),
    head: choice('What does the sonar head look like?', {'disc': 'A broad round transducer disc.', 'fork': 'Two small heads on a forked yoke.', 'bar': 'A long linear multibeam bar.', 'sphere': 'A small spherical sensor cage.'}),
    antenna: choice('What communications hardware is fitted?', {'whip': 'A long flexible whip antenna.', 'patch': 'A flat directional patch on a short mast.', 'dish': 'A small parabolic dish.', 'cross': 'Four short antennas form a cross.'}),
    deck: choice('What fills the deck?', {'case': 'One sealed central electronics case.', 'bottles': 'A rack of narrow sampling bottles.', 'battery': 'Two heavy battery boxes.', 'open': 'An open metal frame exposes the wiring.'}),
    power: choice('How is power collected?', {'flat': 'A flat dark panel spans the deck.', 'wings': 'Two folding panel wings.', 'canister': 'A finned power canister.', 'none': 'Only the internal batteries are visible.'}),
    mooring: choice('How is the probe secured?', {'reel': 'A forward cable reel carries a survey line.', 'anchor': 'A line leads to a small shore anchor.', 'bridle': 'A lifting bridle rises from four corners.', 'free': 'No tether, with two small steering propellers.'}),
    state: choice('What mission stage is visible?', {'survey': 'The sonar is clean and the deck clear.', 'samples': 'Full sample bottles occupy a side tray.', 'service': 'An open lid exposes circuit boards.', 'deposit': 'Pale lake deposits mark the float waterline.'}),
    scale: score('How long is the survey craft?', ['Compact', 'Medium sized', 'Broad and substantial']),
  },
  build(a,context){
    const s=new Sculpture(context),rnd=context.random;
    const len=0.9+a.scale*0.9,metal=s.material('#9ba9a3',{metalness:0.55}),dark=s.material('#3a5254'),pale=s.material('#c6be92'),wire=s.material('#836b48');
    if(a.hulls==='tubes')for(const x of [-0.35,0.35])s.cylinder(0.14,0.14,len,[x,0.18,0],pale,18).rotation.x=Math.PI/2;
    if(a.hulls==='skis')for(const x of [-0.35,0.35]){s.box([0.13,0.14,len],[x,0.14,0],pale);s.rod([x,0.16,len/2],[x,0.3,len/2+0.14],0.065,pale,0.02);}
    if(a.hulls==='tri')for(let j=0;j<3;j++){const t=j/3*Math.PI*2;s.ball([0.2,0.15,0.35],[Math.sin(t)*0.4,0.16,Math.cos(t)*0.4],pale,16);}
    if(a.hulls==='barge')s.box([0.85,0.17,len],[0,0.13,0],pale);
    for(const z of [-len*0.3,len*0.3])s.box([0.85,0.045,0.06],[0,0.3,z],metal);
    if(a.deck!=='open')s.box([0.6,0.03,len*0.72],[0,0.33,0],metal);
    if(a.deck==='case'||a.deck==='battery')for(let j=0;j<(a.deck==='case'?1:2);j++)s.box([0.34,0.18,0.35],[a.deck==='case'?0:(j-0.5)*0.35,0.43,0],dark);
    if(a.deck==='bottles')for(let j=0;j<6;j++)s.cylinder(0.04,0.04,0.21,[(j%3-1)*0.13,0.45,(Math.floor(j/3)-0.5)*0.17],pale,12);
    if(a.deck==='open')for(let j=0;j<4;j++)s.tube([[-0.25,0.31,-len*0.3+j*0.08],[0,0.34,0],[0.25,0.31,len*0.2-j*0.05]],0.007,wire);
    const end:[number,number,number]=a.boom==='lowered'?[0,0.08,len*0.62]:a.boom==='raised'?[0,1.1,len*0.35]:a.boom==='side'?[0.75,0.17,0.1]:[0,0.42,-len*0.4];
    s.rod([0,0.38,len*0.3],end,0.022,metal);s.ball([0.06,0.06,0.06],[0,0.38,len*0.3],dark,12);
    if(a.head==='disc')s.cylinder(0.14,0.14,0.06,end,dark,24);
    if(a.head==='bar')s.box([0.45,0.055,0.075],end,dark);
    if(a.head==='sphere'){s.ball([0.12,0.12,0.12],end,pale,16);for(const t of [0,Math.PI/2]){const r=s.ring(0.14,0.012,end,metal);r.rotation.y=t;}}
    if(a.head==='fork')for(const x of [-0.12,0.12]){s.rod(end,[end[0]+x,end[1]-0.02,end[2]],0.015,metal);s.cylinder(0.06,0.06,0.05,[end[0]+x,end[1]-0.035,end[2]],dark);}
    s.rod([0,0.4,-len*0.28],[0,0.9,-len*0.28],0.015,metal);
    if(a.antenna==='whip')s.rod([0,0.9,-len*0.28],[0.08,1.3,-len*0.28],0.004,wire);
    if(a.antenna==='patch')s.box([0.23,0.2,0.025],[0,0.92,-len*0.28],pale);
    if(a.antenna==='dish'){const dish=s.mesh(new THREE.SphereGeometry(0.17,24,10,0,Math.PI*2,0,0.9),metal,[0,0.91,-len*0.28]);dish.rotation.x=Math.PI/2;s.rod([0,0.91,-len*0.28],[0,0.91,-len*0.05],0.008,dark);}
    if(a.antenna==='cross')for(const sign of [-1,1]){s.rod([0,0.9,-len*0.28],[sign*0.22,0.9,-len*0.28],0.008,metal);s.rod([0,0.9,-len*0.28],[0,0.9,-len*0.28+sign*0.22],0.008,metal);}
    if(a.power==='flat')s.box([0.65,0.02,0.4],[0,0.56,-0.1],dark);
    if(a.power==='wings')for(const sign of [-1,1]){const panel=s.box([0.45,0.02,0.55],[sign*0.52,0.45,0],dark);panel.rotation.z=sign*0.16;}
    if(a.power==='canister'){s.cylinder(0.12,0.12,0.25,[0,0.5,-len*0.28],metal);for(let j=0;j<5;j++)s.ring(0.14,0.012,[0,0.4+j*0.04,-len*0.28],dark).rotation.x=Math.PI/2;}
    if(a.mooring==='reel')s.cylinder(0.11,0.11,0.2,[0,0.46,len*0.35],wire).rotation.z=Math.PI/2;
    if(a.mooring==='anchor'){s.tube([[0,0.35,len*0.4],[0.5,0.03,len*0.8],[0.8,0.03,len*0.7]],0.01,wire);s.box([0.2,0.07,0.18],[0.8,0.035,len*0.7],dark);}
    if(a.mooring==='bridle')for(const x of [-0.35,0.35])for(const z of [-len*0.3,len*0.3])s.rod([x,0.32,z],[0,1.1,0],0.008,wire);
    if(a.mooring==='free')for(const x of [-0.35,0.35]){s.ring(0.09,0.015,[x,0.18,-len/2-0.08],metal);for(let j=0;j<3;j++){const blade=s.box([0.015,0.15,0.012],[x,0.18,-len/2-0.08],dark);blade.rotation.z=j*Math.PI/3;}}
    if(a.state==='samples')for(let j=0;j<4;j++)s.cylinder(0.035,0.035,0.18,[0.3,0.44,-0.2+j*0.12],pale,12);
    if(a.state==='service'){const lid=s.box([0.32,0.02,0.32],[0,0.63,0.12],metal);lid.rotation.x=0.7;s.box([0.28,0.015,0.25],[0,0.54,0],s.material('#55705c'));}
    if(a.state==='deposit')for(const x of [-0.35,0.35])s.rod([x,0.23,-len*0.4],[x,0.23,len*0.4],0.018,s.material('#d8d3b4'));

    return s.finish();
  },
});
