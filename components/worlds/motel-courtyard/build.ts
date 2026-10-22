import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineWorld({
  questions: {

    architecture: choice('What is the motel architecture?', {desert:'Low coral stucco rooms and timber posts.', coastal:'Pale turquoise doors under cream balconies.', highway:'Brick-red doors in a white roadside motor court.'}),
    centre: choice('What occupies the courtyard centre?', {pool:'A small rectangular swimming pool.', garden:'A dry planter with stones and spiky plants.', parking:'A striped parking apron.'}),
    levels: choice('How many floors does the motel have?', {one:'A single level of rooms.', two:'Two levels joined by an outside staircase.'}),
    doors: choice('What do the room doors look like?', {closed:'All doors are closed.', oneopen:'One room is open with a warm glow inside.', curtains:'Glass doors behind drawn curtains.'}),
    sign: choice('What is the courtyard office sign?', {office:'OFFICE / RING BELL', sleep:'SLEEP EASY', vacancy:'VACANCY / WELCOME', last:'LAST ROOM'}),
    chairs: noul('Are two plastic patio chairs beside the office?'),
    laundry: noul('Is a housekeeping cart parked by the rooms?'),
    boundary: choice('What borders the roadside edge?', {hedge:'A low clipped hedge.', rail:'A simple low metal rail.', open:'An open edge leading to the highway.'}),
  },
  build(a, context) {

    const {art:s,world}=diorama(context,{background:'#e5dfce',floor:'#bdbbae',width:15,depth:12,pitch:29,yaw:24,maxHeight:3.2,radius:1.35,slots:[[0,2.6],[-4.5,1],[4.5,1],[-3.7,3.6],[3.7,3.6],[0,-1.3]]});
    const color={desert:'#b77862',coastal:'#679d97',highway:'#9d6150'}[a.architecture],wall=s.material(a.architecture==='desert'?'#d7bca0':'#e0d9bf'),door=s.material(color),metal=s.material('#98a69a',{metalness:0.5}),dark=s.material('#647067'),cream=s.material('#e4d9b9');
    s.box([15,0.035,1.7],[0,0.018,-4.87],cream);const levels=a.levels==='two'?2:1;
    for(let level=0;level<levels;level++)for(let i=0;i<5;i++){const x=(i-2)*2.8,y=level*3;s.box([2.8,2.75,0.24],[x,1.375+y,-5.87],wall);s.box([0.82,1.95,0.055],[x-0.62,1.0+y,-5.705],a.doors==='oneopen'&&i===2&&level===0?dark:door);if(a.doors==='oneopen'&&i===2&&level===0)s.box([0.62,1.75,0.02],[x-0.62,1.0,-5.663],s.material('#d5b66e',{emissive:'#bd9749',emissiveIntensity:0.2}));s.label(String(101+level*100+i),0.43,0.15,[x-0.62,2.19+y,-5.704]);s.ball([0.028,0.028,0.013],[x-0.31,0.97+y,-5.663],metal,12);s.box([1.21,1.25,0.049],[x+0.59,1.43+y,-5.709],dark);for(let j=0;j<7;j++)s.box([0.055,1.17,0.01],[x+0.1+j*0.165,1.43+y,-5.674],s.material('#bbb79c'));s.box([2.81,0.16,1.6],[x,2.82+y,-5.21],door);s.rod([x+1.32,0.02+y,-4.66],[x+1.32,2.73+y,-4.66],0.04,metal);}
    if(levels===2){s.box([14.7,0.15,1.6],[0,3.0,-5.15],cream);s.rod([-7.3,4,-4.35],[7.3,4,-4.35],0.024,metal);for(let i=0;i<26;i++)s.rod([-7.1+i*0.56,3.08,-4.35],[-7.1+i*0.56,4,-4.35],0.015,metal);for(let i=0;i<12;i++)s.box([1.23,0.12,0.28],[-6.24,0.14+i*0.246,-3.91+i*0.28],cream);}
    if(a.centre==='pool'){s.box([5.35,0.06,3.32],[0,0.02,-1.46],cream);s.box([4.8,0.018,2.8],[0,0.054,-1.46],s.material('#73a6ab',{roughness:0.3,metalness:0.05}));for(let i=0;i<10;i++)s.box([0.018,0.002,2.7],[-2.25+i*0.5,0.066,-1.46],s.material('#aac8c3'));for(const x of [-0.3,0.3])s.tube([[x,0.06,0.01],[x,0.5,0.01],[x,0.63,-0.25],[x,0.06,-0.5]],0.02,metal);}
    if(a.centre==='garden'){s.box([5.1,0.21,2.85],[0,0.11,-1.5],cream);s.box([4.87,0.023,2.6],[0,0.227,-1.5],s.material('#a39570'));for(let i=0;i<12;i++){const x=(context.random()-0.5)*4.5,z=-1.5+(context.random()-0.5)*2.3;s.ball([0.18,0.1,0.14],[x,0.28,z],s.material('#b3b5a1'),8);if(i%3===0)for(let j=0;j<5;j++){const leaf=s.ball([0.04,0.25,0.045],[x+Math.sin(j)*0.12,0.5,z+Math.cos(j)*0.12],s.material('#788571'),8);leaf.rotation.z=Math.sin(j)*0.5;}}}
    if(a.centre==='parking')for(let i=0;i<6;i++)s.box([0.07,0.008,4.1],[(i-2.5)*2.17,0.01,-1.28],cream);
    s.box([2.24,2.5,0.16],[-7.37,1.25,1.23],wall);const sign=s.label({office:'OFFICE / RING BELL',sleep:'SLEEP EASY',vacancy:'VACANCY / WELCOME',last:'LAST ROOM'}[a.sign],2.15,0.35,[-7.27,2.0,1.23],color,'#eee3c0');sign.rotation.y=Math.PI/2;
    if(a.chairs)for(let i=0;i<2;i++){const x=-5.86+i*1.17,z=1.03;s.box([0.53,0.053,0.51],[x,0.5,z],cream);s.box([0.53,0.55,0.06],[x,0.81,z-0.24],cream);for(const dx of [-0.22,0.22])for(const dz of [-0.2,0.2])s.rod([x+dx,0,z+dz],[x+dx,0.48,z+dz],0.015,cream);}
    if(a.laundry){s.box([0.87,0.66,0.55],[5.35,0.45,-3.85],door);s.box([0.98,0.035,0.63],[5.35,0.8,-3.85],metal);for(let j=0;j<3;j++)s.box([0.41,0.08,0.4],[5.35,0.86+j*0.08,-3.85],cream);for(const x of [5.01,5.69])s.cylinder(0.055,0.055,0.035,[x,0.075,-3.65],dark,12).rotation.z=Math.PI/2;}
    if(a.boundary==='hedge')for(let i=0;i<14;i++)s.ball([0.54,0.38,0.31],[(i-6.5)*1.04,0.38,5.76],s.material('#7e9478'),12);if(a.boundary==='rail'){s.rod([-7.2,0.58,5.8],[7.2,0.58,5.8],0.018,metal);for(let i=0;i<13;i++)s.rod([-7.2+i*1.2,0,5.8],[-7.2+i*1.2,0.6,5.8],0.018,metal);}
    return world;
  },
});
