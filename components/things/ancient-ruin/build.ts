import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    remains: choice('What survives of the structure?', {columns:'Three columns and a broken lintel.', arch:'One freestanding arch.', door:'A doorframe with no building around it.'}),
    stone: choice('What was it built from?', {marble:'Pale weathered marble.', sandstone:'Golden sandstone.', basalt:'Dark grey basalt.'}),
    growth: noul('Is vegetation reclaiming the ruin?'),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const rock=s.material({marble:'#d1cdbb',sandstone:'#c0a27a',basalt:'#727a77'}[a.stone],{flatShading:true});
    s.box([3.7,0.2,1.6],[0,0.1,0],rock);
    if(a.remains==='columns')for(let i=0;i<3;i++){const h=i===2?1.3:3;s.cylinder(0.28,0.32,h,[(i-1)*1.25,h/2+0.2,0],rock,16);s.box([0.8,0.2,0.8],[(i-1)*1.25,h+0.3,0],rock);}
    else{for(const side of [-1,1])s.box([0.5,2.4,0.8],[side*1.2,1.4,0],rock);if(a.remains==='arch'){const arch=s.ring(1.2,0.24,[0,2.6,0],rock,Math.PI);arch.rotation.z=0;}
      else s.box([2.9,0.4,0.85],[0,2.8,0],rock);}
    if(a.remains==='columns')s.box([2.05,0.26,0.65],[-0.65,3.5,0],rock);
    for(let i=0;i<9;i++)s.mesh(new THREE.DodecahedronGeometry(0.08+random()*0.15,0),rock,[(random()-0.5)*3.5,0.25,(random()-0.5)*1.5]);
    if(a.growth)for(let i=0;i<12;i++)s.ball([0.2,0.09,0.15],[-1.3,0.4+i*0.22,0.45],s.material('#6e855a'),8);

    return s.finish();
  },
});
