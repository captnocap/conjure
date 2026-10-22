import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    tank: choice('What holds the water?', {wood:'A cylindrical timber tank.', steel:'A riveted steel tank.', sphere:'A round municipal tank.'}),
    paint: choice('What is the finish?', {plain:'Unpainted wood or galvanised metal.', blue:'Faded sky-blue paint.', red:'Red oxide paint.'}),
    sign: choice('What identifies the tower?', {none:'No lettering.', town:'HOME', number:'TANK 04'}),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const metal=s.material('#7b8883',{metalness:0.55}),body=s.material(a.paint==='plain'?(a.tank==='wood'?'#9f8968':'#a5b3ad'):a.paint==='blue'?'#84a7b6':'#ae7662');
    for(const x of [-0.9,0.9])for(const z of [-0.9,0.9])s.rod([x,0,z],[x*0.75,3.2,z*0.75],0.065,metal);
    for(const z of [-0.9,0.9]){s.rod([-0.9,0,z],[0.8,2.8,z*0.8],0.035,metal);s.rod([0.9,0,z],[-0.8,2.8,z*0.8],0.035,metal);}
    if(a.tank==='sphere')s.ball([1.15,1.1,1.15],[0,3.7,0],body);else{s.cylinder(1.05,1.05,1.55,[0,3.85,0],body);s.cylinder(0,1.12,0.5,[0,4.87,0],body);for(const y of [3.2,4.4]){const ring=s.ring(1.06,0.035,[0,y,0],metal);ring.rotation.x=Math.PI/2;}}
    for(let i=0;i<14;i++)s.rod([0.9,0.2+i*0.28,0.9],[1.2,0.2+i*0.28,0.9],0.018,metal);
    if(a.sign!=='none')s.label(a.sign==='town'?'HOME':'TANK 04',1.1,0.35,[0,3.85,1.065]);

    return s.finish();
  },
});
