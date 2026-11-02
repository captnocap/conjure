import * as THREE from 'three';
import { choice, score, diorama, defineWorld } from '@conjure/kit';
export default defineWorld({
  questions: {
    masonry: choice("What are the chamber walls built from?", {"stone": "Large pale limestone blocks.", "brick": "Red brick with stone coping.", "concrete": "Plain cast concrete.", "rubble": "Irregular old fieldstone masonry."}),
    lock: choice("What condition is the lock chamber in?", {"drained": "The chamber is drained for repair.", "puddle": "A shallow puddle remains on the bottom.", "working": "The lock holds water below the coping.", "silt": "A silt-covered bottom has been exposed."}),
    apron: choice("What covers the repair apron?", {"paving": "Large worn paving slabs.", "gravel": "Compacted pale gravel.", "timber": "Heavy temporary timber mats.", "brick": "Small herringbone-like brick pavers."}),
    shed: choice("What is the maintenance shelter?", {"hut": "A small pitched-roof timber tool hut.", "lean": "An open-front lean-to shelter.", "container": "A short steel stores cabin.", "none": "A roofless work area with only racks."}),
    closure: choice("How is the closed worksite marked?", {"barriers": "Red and cream striped barriers.", "rope": "Rope stretched between short posts.", "cones": "Four orange cones guard the edge.", "fence": "A removable iron safety rail."}),
    repair: choice("What is the main repair operation?", {"gate": "Timber blocks mark a removed gate position.", "lining": "Stacks of stone await chamber relining.", "seal": "Coils of sealing rope and pitch tubs wait nearby.", "inspection": "Survey tripods and chalk marks map the work."}),
    access: choice("How do workers reach the chamber?", {"stairs": "Stone steps descend beside the chamber.", "ladder": "An iron ladder drops down the wall.", "ramp": "A sloping timber access ramp.", "bridge": "A removable plank bridge crosses the top."}),
    notice: choice("What does the lock notice say?", {"stoppage": "WINTER STOPPAGE", "repair": "GATE REPLACEMENT", "water": "WATER LEVEL LOW", "opening": "REOPENING SOON"}),
    length: score("How far does the chamber continue into the distance?", ["A compact narrow lock", "A normal canal chamber", "A long navigation lock"])
  },
  build(a,context){

    const {art:s,world}=diorama(context,{width:14,depth:11,background:'#dfdfcf',floor:'#b6b49b',radius:1.1,maxHeight:2.8,pitch:34,yaw:24,slots:[[-1,1],[-4,1.4],[-1,-2],[-4,-1.8],[-1,4],[-4,4],[2.1,3.8]]});
    const stone=s.material({stone:'#c2bd9f',brick:'#a57b61',concrete:'#b4b7a6',rubble:'#aaa892'}[a.masonry]),wood=s.material('#90734c'),iron=s.material('#5c7063',{metalness:0.5}),dark=s.material('#3d4c40'),pale=s.material('#e0d7b9');
    const depth=6+a.length*4;
    s.box([4.2,0.12,depth],[4.35,-0.05,-0.3],s.material(a.lock==='silt'?'#8a8265':'#7e8a76'));
    for(const x of [2.4,6.3]){s.box([0.38,1.05,depth],[x,0.525,-0.3],stone);s.box([0.52,0.16,depth+0.15],[x,1.12,-0.3],pale);for(let j=0;j<9;j++)s.box([0.39,0.014,0.025],[x,0.22+(j%3)*0.26,-depth/2+0.1+Math.floor(j/3)*depth/3],dark);}
    if(a.lock==='working'||a.lock==='puddle')s.box([3.5,0.025,depth-0.12],[4.35,a.lock==='working'?0.65:0.04,-0.3],s.material('#7e9c8a',{roughness:0.23,metalness:0.15}));
    if(a.lock==='silt')for(let j=0;j<12;j++)s.ball([0.2+context.random()*0.2,0.04,0.2],[2.8+context.random()*3,0.04,-depth/2+context.random()*depth],s.material('#928368'),12);
    if(a.apron==='paving')for(let x=0;x<6;x++)for(let z=0;z<7;z++)s.box([1.32,0.018,1.47],[-6.1+x*1.36,0.013,-4.65+z*1.5],s.material((x+z)%3?'#bdb99f':'#abae96'));
    if(a.apron==='timber')for(let j=0;j<22;j++)s.box([8.9,0.035,0.43],[-2.3,0.02,-4.9+j*0.46],wood);
    if(a.apron==='brick')for(let j=0;j<14;j++)s.box([8.6,0.015,0.045],[-2.3,0.01,-4.8+j*0.73],s.material('#9f8869'));
    if(a.apron==='gravel')for(let j=0;j<30;j++)s.ball([0.07,0.035,0.06],[-6.7+context.random()*8.5,0.02,-5+context.random()*10],pale,8);
    for(const z of [-depth/2+0.5,depth/2-0.8])for(const x of [2.6,6.1])s.box([0.055,1.1,0.12],[x,0.55,z],iron);
    if(a.shed!=='none'){
      const x=-4.7,z=-4.25,w=3.3;const wall=a.shed==='container'?iron:wood;s.box([w,2.3,0.14],[x,1.15,z-0.4],wall);for(const dx of [-w/2,w/2])s.box([0.12,2.3,1.35],[x+dx,1.15,z+0.2],wall);
      if(a.shed==='hut'){for(const side of [-1,1])s.box([w/2+0.17,0.09,1.75],[x+side*w/4,2.42,z+0.2],dark).rotation.z=-side*0.22;s.box([1.2,1.85,0.08],[x-0.5,0.925,z+0.88],dark);}
      else s.box([w+0.2,0.12,1.7],[x,2.35,z+0.2],dark);
      if(a.shed==='container')for(let j=0;j<12;j++)s.box([0.04,2.2,0.05],[x-w/2+0.1+j*0.28,1.15,z+0.88],dark);
    }else{for(const x of [-6,-3.4])s.box([0.12,1.8,0.12],[x,0.9,-4.8],iron);for(const y of [0.4,1.0,1.6])s.box([3,0.08,0.5],[-4.7,y,-4.8],wood);}
    if(a.closure==='cones')for(let j=0;j<4;j++)s.cylinder(0.03,0.18,0.55,[1.65,0.3,-2+j*1.8],s.material('#b86937'),16);
    else for(let j=0;j<5;j++){const z=-3.5+j*1.8;s.rod([1.7,0,z],[1.7,0.9,z],0.035,iron);if(j<4){if(a.closure==='rope')s.tube([[1.7,0.85,z],[1.7,0.7,z+0.9],[1.7,0.85,z+1.8]],0.02,wood);else{s.box([0.04,0.15,1.7],[1.7,0.8,z+0.9],pale);if(a.closure==='barriers')for(let k=0;k<4;k++)s.box([0.045,0.16,0.19],[1.7,0.8,z+0.2+k*0.4],s.material('#a84c34'));}}}
    if(a.access==='stairs')for(let j=0;j<6;j++)s.box([0.85,0.15,0.38],[3,0.12+j*0.16,depth/2-1.1-j*0.34],stone);
    if(a.access==='ladder'){for(const x of [2.85,3.3])s.rod([x,0.03,2],[x,1.4,2],0.025,iron);for(let j=0;j<7;j++)s.rod([2.85,0.15+j*0.19,2],[3.3,0.15+j*0.19,2],0.02,iron);}
    if(a.access==='ramp')s.box([0.9,0.08,3.4],[3.1,0.55,2],wood).rotation.x=-0.31;
    if(a.access==='bridge')for(let j=0;j<4;j++)s.box([4.6,0.12,0.2],[4.3,1.26,-3+j*0.22],wood);
    if(a.repair==='gate')for(const x of [-0.2,1.0])s.box([0.55,0.3,0.6],[x,0.15,-4.2],wood);
    if(a.repair==='lining')for(let j=0;j<8;j++)s.box([0.6,0.32,0.55],[-0.6+(j%3)*0.65,0.16+Math.floor(j/3)*0.33,-4.4],stone);
    if(a.repair==='seal'){for(let j=0;j<4;j++)s.ring(0.3+j*0.035,0.035,[0.1,0.07+j*0.025,-4.1],wood).rotation.x=Math.PI/2;s.cylinder(0.28,0.24,0.5,[1,0.25,-4.2],dark,24);}
    if(a.repair==='inspection'){for(let j=0;j<3;j++){const t=j*Math.PI*2/3;s.rod([0.2,1.35,-4.3],[0.2+Math.sin(t)*0.6,0.03,-4.3+Math.cos(t)*0.6],0.025,wood);}s.box([0.35,0.18,0.2],[0.2,1.43,-4.3],iron);}
    s.label({stoppage:'WINTER STOPPAGE',repair:'GATE REPLACEMENT',water:'WATER LEVEL LOW',opening:'REOPENING SOON'}[a.notice],2.4,0.4,[-4.7,2.05,-3.54],'#46513f','#e2d5b5');
    return world;

  },
});
