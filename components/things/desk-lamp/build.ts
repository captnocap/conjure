import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    mechanism: choice('What kind of reading lamp is it?', {angle:'A jointed anglepoise lamp with exposed springs.', gooseneck:'A flexible gooseneck lamp.', banker:'A brass banker lamp with a wide green shade.'}),
    colour: choice('What is the lamp finish?', {green:'Sage green enamel.', red:'Brick red enamel.', black:'Charcoal black.', brass:'Warm brass.'}),
    base: choice('How is it supported?', {round:'A broad round weighted base.', clamp:'A clamp gripping a small edge block.', square:'A flat square base.'}),
    pose: choice('Where does the lamp direct its shade?', {down:'Down at a close page.', out:'Outward over a wider desk.', up:'Lifted toward the room.'}),
    lit: noul('Is the lamp switched on?'),
    work: choice('What is beneath the light?', {none:'No work laid out.', book:'An open book with small printed lines.', drawing:'A drafting sheet and a pencil.', letter:'A half-written letter.'}),
    cord: noul('Does its power cord trail in a loose coil?'),
    height: score('How tall is the lamp?', ['A small bedside reading lamp', 'A tall architect lamp']),
  },
  build(a, context) {

    const s=new Sculpture(context),h=0.32+a.height*0.37,color={green:'#7a9b80',red:'#a85f4c',black:'#39463d',brass:'#b29a64'}[a.colour],body=s.material(color,{metalness:a.colour==='brass'?0.65:0.3}),steel=s.material('#b4beb0',{metalness:0.7}),dark=s.material('#37423a'),paper=s.material('#e7dfc6'),bulb=s.material(a.lit?'#f1e2a6':'#ddd9c2',{emissive:a.lit?'#d7c17d':'#000000',emissiveIntensity:0.6});
    if(a.base==='round')s.cylinder(0.115,0.13,0.035,[0,0.025,0],body,28);else if(a.base==='square')s.box([0.23,0.03,0.2],[0,0.025,0],body);else{s.box([0.13,0.04,0.15],[0,0.07,0],s.material('#a28b65'));s.box([0.05,0.1,0.028],[0,0.053,-0.084],body);s.rod([0,0.012,-0.08],[0,0.012,0.03],0.007,steel);}
    const reach=a.pose==='out'?0.26:a.pose==='up'?0.035:0.15;
    if(a.mechanism==='banker'){s.rod([0,0.035,0],[0,h*0.85,0],0.018,steel);s.rod([-0.13,h*0.84,0],[0.13,h*0.84,0],0.012,steel);s.ball([0.17,0.073,0.1],[0,h*0.91,0.055],s.material('#497456'),24);s.box([0.3,0.011,0.12],[0,h*0.86,0.055],bulb);}
    else{const elbow=[0,h*0.51,-0.1] as const,top=[0,h,reach] as const;if(a.mechanism==='angle'){for(const x of [-0.022,0.022]){s.rod([x,0.045,0],[x,elbow[1],elbow[2]],0.007,body);s.rod([x,elbow[1],elbow[2]],[x,top[1],top[2]],0.007,body);}for(const p of [[0,0.06,0],elbow,top] as const)s.cylinder(0.025,0.025,0.064,p,steel,16).rotation.z=Math.PI/2;for(let i=0;i<8;i++)s.ring(0.014,0.002,[0,h*0.2+i*0.015,-0.025],dark).rotation.x=Math.PI/2;}else s.tube([[0,0.035,0],elbow,top],0.012,dark);
      const shade=s.cylinder(0.029,0.092,0.11,[0,h-0.046,reach+0.04],body,24);shade.rotation.x=a.pose==='up'?-1.7:-0.35;const face=s.cylinder(0.084,0.084,0.005,[0,h-0.095,reach+0.058],bulb,24);face.rotation.x=shade.rotation.x;s.ball([0.018,0.018,0.018],[0,h-0.077,reach+0.05],bulb,12);}
    if(a.work!=='none'){s.box([0.27,0.01,0.21],[0,0.008,0.22],paper);if(a.work==='book'){s.box([0.006,0.012,0.21],[0,0.014,0.22],dark);for(let i=0;i<6;i++)for(const x of [-0.065,0.065])s.box([0.093,0.001,0.003],[x,0.016,0.15+i*0.024],dark);}else for(let i=0;i<6;i++)s.box([a.work==='drawing'?0.003:0.17,0.001,a.work==='drawing'?0.12:0.003],[-0.08+i*0.032,0.015,0.22],dark);s.rod([0.14,0.018,0.16],[0.2,0.018,0.3],0.004,s.material('#bfa05c'));}
    if(a.cord)s.tube([[0,0.019,-0.08],[0.14,0.008,-0.17],[0.22,0.008,-0.25],[0.18,0.008,-0.31],[0.09,0.008,-0.28],[0.12,0.008,-0.2]],0.004,dark);
    return s.finish();
  },
});
