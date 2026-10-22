import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    trade: choice('Whose workbench is this?', {wood:'A woodworker with offcuts and a plane.', electronics:'An electronics tinkerer with a circuit board.', artist:'An artist with jars and stretched panels.'}),
    build: choice('How is the bench constructed?', {timber:'Heavy timber legs and an oak top.', steel:'Steel frame and worn painted drawers.'}),
    vise: noul('Is a vise clamped to the front edge?'),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const wood=s.material('#b4976e'),frame=s.material(a.build==='timber'?'#886f50':'#66867c',{metalness:a.build==='steel'?0.4:0}),dark=s.material('#4a6061');
    s.box([1.9,0.14,0.85],[0,0.88,0],wood);for(const x of [-0.8,0.8])for(const z of [-0.3,0.3])s.box([0.12,0.8,0.12],[x,0.4,z],frame);
    s.box([1.65,0.07,0.65],[0,0.23,0],frame);
    for(let i=0;i<2;i++){s.box([0.75,0.2,0.62],[-0.43+i*0.86,0.69,0],frame);s.rod([-0.55+i*0.86,0.7,0.33],[-0.3+i*0.86,0.7,0.33],0.018,dark);}
    if(a.vise){s.box([0.25,0.17,0.3],[-0.6,1.02,0.4],dark);s.rod([-0.6,1,0.5],[-0.6,1,0.72],0.022,dark);}
    if(a.trade==='wood'){s.box([0.8,0.055,0.22],[0.2,0.98,0],wood);s.box([0.24,0.1,0.1],[0.4,1.06,0],dark);}
    if(a.trade==='electronics'){s.box([0.48,0.025,0.36],[0.25,0.975,0],s.material('#507f68'));for(let i=0;i<5;i++)s.box([0.04,0.025,0.08],[0.1+i*0.08,1.002,0],dark);}
    if(a.trade==='artist'){for(let i=0;i<4;i++)s.cylinder(0.05,0.05,0.16,[-0.1+i*0.18,1.03,-0.2],s.material(['#a36f58','#71879b','#929e65','#b79b6b'][i]));s.box([0.48,0.48,0.05],[0.4,1.2,-0.25],wood);}

    return s.finish();
  },
});
