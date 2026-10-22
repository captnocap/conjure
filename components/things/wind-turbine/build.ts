import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    design: choice('What kind of wind machine is this?', {modern:'A tall three-bladed utility turbine.', farm:'A small many-bladed farm windpump.', vertical:'A compact vertical-axis rotor.'}),
    paint: choice('What is its finish?', {white:'Off-white enamel.', rust:'Weathered ochre steel.', sea:'Faded sea-green paint.'}),
    base: choice('What supports it?', {pad:'A plain concrete pad.', legs:'A braced lattice base.'}),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const metal=s.material({white:'#d8ded5',rust:'#af8666',sea:'#80a69e'}[a.paint],{metalness:0.25}),dark=s.material('#627174');
    s.cylinder(0.12,0.26,4.3,[0,2.15,0],metal);s.cylinder(0.6,0.7,0.2,[0,0.1,0],s.material('#aaa99a'));
    if(a.base==='legs')for(const x of [-0.6,0.6])for(const z of [-0.6,0.6])s.rod([x,0,z],[0,3.8,0],0.045,dark);
    s.ball([0.35,0.25,0.5],[0,4.35,0],metal);
    const n=a.design==='farm'?12:3;
    for(let i=0;i<n;i++){const t=i*Math.PI*2/n;
      if(a.design==='vertical')s.tube([[Math.cos(t)*0.5,3.2,Math.sin(t)*0.5],[Math.cos(t+0.9)*0.65,4.1,Math.sin(t+0.9)*0.65],[Math.cos(t+1.8)*0.5,5,Math.sin(t+1.8)*0.5]],0.13,metal);
      else{const blade=s.box([a.design==='farm'?0.24:0.18,a.design==='farm'?0.95:2.1,0.065],[Math.sin(t)*(a.design==='farm'?0.9:1.05),4.35+Math.cos(t)*(a.design==='farm'?0.9:1.05),0.53],metal);blade.rotation.z=-t;}
    }

    return s.finish();
  },
});
