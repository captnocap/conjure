import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    flow: choice('How does the water descend?', {veil:'One broad curtain.', split:'Three separate ribbons.', steps:'A cascade over several steps.'}),
    rock: choice('What kind of cliff holds it?', {basalt:'Dark columnar basalt.', moss:'Mossy weathered stone.', canyon:'Layered red canyon rock.'}),
    pool: noul('Is there a pool at its foot?'),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const rock=s.material({basalt:'#596366',moss:'#77846c',canyon:'#a77961'}[a.rock],{flatShading:true}),water=s.material('#96c3cc',{roughness:0.25});
    for(let i=0;i<7;i++)s.cylinder(0.4,0.45,2.7+random()*0.4,[(i-3)*0.58,1.4,-0.3],rock,6);
    if(a.flow==='steps')for(let i=0;i<5;i++){s.box([2.6,0.5,0.65],[0,2.6-i*0.5,i*0.5],rock);s.box([1.4,0.025,0.66],[0,2.87-i*0.5,i*0.5+0.02],water);s.box([1.4,0.5,0.03],[0,2.6-i*0.5,i*0.5+0.34],water);}
    else for(let i=0;i<(a.flow==='split'?3:7);i++){const x=(i-(a.flow==='split'?1:3))*(a.flow==='split'?0.8:0.24);s.tube([[x,3.05,0],[x,2.9,0.3],[x+0.04,1.5,0.45],[x+0.1,0.15,0.7]],a.flow==='split'?0.13:0.15,water);}
    if(a.pool){const p=s.cylinder(1.4,1.4,0.06,[0,0.04,1.5],water);p.scale.z=0.7;}

    return s.finish();
  },
});
