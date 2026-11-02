import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    geometry: choice("What kind of frame is this?", {"road": "A tight diamond road frame.", "touring": "A long relaxed touring frame.", "mixte": "Twin sloping mixte rails.", "cargo": "An extended cargo frame."}),
    tubes: choice("What finish do the tubes have?", {"bare": "Bare grey steel tubes.", "primer": "Brick red primer.", "polished": "Polished silver metal.", "paint": "Deep teal painted tubes."}),
    lugs: choice("What joins the tubes?", {"gold": "Golden brazed lug collars.", "silver": "Silver steel lug collars.", "black": "Dark socket lugs.", "masked": "Cream masking wraps at joints."}),
    fork: choice("Is the front fork installed?", {"none": "An empty head tube.", "straight": "Two straight fork blades.", "curved": "Swept curved fork blades.", "separate": "A removed fork leans alongside."}),
    support: choice("What supports the frame?", {"block": "A timber block below the bottom bracket.", "stand": "A narrow steel service stand.", "trestle": "Two low timber trestles.", "cradle": "A broad padded cradle."}),
    dropouts: choice("What rear fittings are visible?", {"plain": "Plain short dropouts.", "rack": "Tall rack mounting eyelets.", "long": "Long horizontal sliding dropouts.", "disc": "A disc brake tab at the rear."}),
    brazeons: choice("What small fittings are installed?", {"bottle": "Pairs of bottle cage bosses.", "cable": "Cable stops under the top tube.", "shifter": "Down tube shifter bosses.", "none": "Completely clean tubing."}),
    stage: choice("What remains to be done?", {"ready": "All joints neatly finished.", "flux": "Pale flux residue around the lugs.", "file": "A file rests across the support.", "mask": "A paper tag hangs from the head tube."}),
    length: score("How long is the frame?", ["A compact frame", "A standard frame", "A long frame"])
  },
  build(a,context){

    const s=new Sculpture(context),tube=s.material({bare:'#8e968c',primer:'#a0634e',polished:'#b7c0b6',paint:'#4c7a78'}[a.tubes],{metalness:0.6}),lug=s.material({gold:'#bda465',silver:'#acb4a8',black:'#4a524d',masked:'#d7c8a6'}[a.lugs]),dark=s.material('#505d54'),wood=s.material('#a58a5d');
    const k=(0.85+a.length*0.35)*(a.geometry==='touring'?1.18:1),bb:[number,number,number]=[-0.18,0.45,0],seat:[number,number,number]=[-0.35,1.15,0],ht:[number,number,number]=[0.55*k,1.14,0],hb:[number,number,number]=[0.66*k,0.93,0],rear=-0.85*k;
    s.rod(bb,seat,0.028,tube);s.rod(bb,hb,0.031,tube);s.rod(ht,hb,0.04,tube);
    if(a.geometry==='mixte')for(const z of [-0.055,0.055])s.rod([rear,0.45,z],[ht[0],ht[1],z],0.017,tube);else s.rod(seat,ht,0.027,tube);
    for(const z of [-0.08,0.08]){s.rod(seat,[rear,0.45,z],0.015,tube);s.rod(bb,[rear,0.45,z],0.018,tube);s.box([a.dropouts==='long'?0.16:0.08,0.05,0.012],[rear,0.45,z],lug);if(a.dropouts==='rack')s.ring(0.022,0.008,[rear-0.02,0.53,z],lug);if(a.dropouts==='disc'&&z<0)s.box([0.06,0.13,0.02],[rear+0.08,0.5,z],lug);}
    for(const p of [bb,seat,ht,hb])s.ball([0.045,0.055,0.045],p,lug,16);s.cylinder(0.06,0.06,0.15,bb,lug,24).rotation.x=Math.PI/2;
    if(a.geometry==='cargo'){for(const z of [-0.12,0.12])s.rod([hb[0],0.82,z],[hb[0]+0.6,0.65,z],0.025,tube);s.box([0.55,0.025,0.34],[hb[0]+0.3,0.68,0],wood);}
    if(a.fork!=='none'){const x=a.fork==='separate'?1.1:hb[0],fy=a.fork==='separate'?-0.33:0;for(const z of [-0.07,0.07]){if(a.fork==='curved')s.tube([[x,0.93+fy,z],[x+0.08,0.65,z],[x+0.2,0.35,z]],0.018,tube);else s.rod([x,0.93+fy,z],[x+0.12,0.35+fy,z],0.018,tube);}s.rod([x,0.93+fy,-0.07],[x,0.93+fy,0.07],0.024,lug);if(a.fork==='separate')s.rod([x,0.93+fy,0],[x-0.04,1.12+fy,0],0.023,tube);}
    if(a.support==='stand'){s.box([0.5,0.05,0.45],[-0.18,0.025,0],dark);s.rod([-0.18,0.05,0],bb,0.025,dark);}else if(a.support==='trestle')for(const x of [rear,-0.18]){s.box([0.08,0.38,0.4],[x,0.19,0],wood);s.box([0.24,0.07,0.45],[x,0.4,0],wood);}else{s.box([0.45,0.36,0.38],[-0.18,0.18,0],wood);if(a.support==='cradle')s.box([0.65,0.07,0.5],[-0.18,0.39,0],dark);}
    if(a.brazeons==='bottle')for(const y of [0.65,0.8])s.cylinder(0.018,0.018,0.02,[-0.18-(y-0.45)*0.24,y,0.04],lug,12).rotation.x=Math.PI/2;if(a.brazeons==='cable')for(const x of [-0.2,0.12,0.42])s.ring(0.025,0.006,[x,1.11,0],lug).rotation.y=Math.PI/2;if(a.brazeons==='shifter')for(const z of [-0.05,0.05])s.ball([0.025,0.02,0.015],[0.25,0.7,z],lug,12);
    if(a.stage==='flux')for(const p of [seat,ht,hb])s.ball([0.048,0.06,0.049],p,s.material('#d6cfb0'),12);if(a.stage==='file')s.box([0.5,0.025,0.04],[-0.05,0.39,0.25],dark).rotation.y=0.25;if(a.stage==='mask')s.label('FRAME 07',0.22,0.12,[ht[0]+0.08,0.92,0.07],'#565d50','#ddd4b7');
    s.root.rotation.y=(context.random()-0.5)*0.2;return s.finish();

  },
});
