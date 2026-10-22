import * as THREE from 'three';
import { diorama, choice, noul, defineWorld } from '@conjure/kit';

export default defineWorld({
  questions: {

    district: choice('What kind of district is this?', {brick:'Old brick storefronts.', concrete:'Severe municipal concrete.', pastel:'Pale stucco neighbourhood shops.'}),
    surface: choice('What marks the street surface?', {crosswalk:'A pedestrian crossing.', parking:'Painted parking spaces.', bare:'Bare patched asphalt.'}),
    shutter: choice('What is the state of the shopfront?', {open:'Lit windows and an open-looking doorway.', closed:'Corrugated shutters pulled down.', boarded:'Rough timber boards across the windows.'}),

  },
  build(a, context) {
    const {mood, random} = context;
    const {art: s, world} = diorama(context, {background:'#e4e4dc',floor:'#a7a69b',width:14,depth:11,maxHeight:3.8,radius:1.5,pitch:30});

    const wall=s.material({brick:'#ab7b63',concrete:'#a8aca7',pastel:'#c9b5a0'}[a.district]),dark=s.material('#4a5f61');
    s.box([14,0.04,3],[0,0.015,4.2],s.material('#696e72'));s.box([14,0.15,0.18],[0,0.075,2.65],s.material('#c8c6b8'));
    s.box([14,4.6,0.25],[0,2.3,-5.2],wall);
    for(let i=0;i<4;i++){s.box([2.4,2.5,0.1],[-5.1+i*3.4,1.8,-5],dark);
      if(a.shutter==='closed')for(let j=0;j<13;j++)s.box([2.4,0.08,0.08],[-5.1+i*3.4,0.7+j*0.18,-4.9],s.material('#858c88'));
      if(a.shutter==='boarded')for(let j=0;j<3;j++){const b=s.box([2.6,0.25,0.06],[-5.1+i*3.4,1+j*0.65,-4.85],s.material('#aa916d'));b.rotation.z=j%2?0.1:-0.12;}
    }
    for(let i=0;i<(a.surface==='crosswalk'?8:a.surface==='parking'?4:0);i++)s.box(a.surface==='crosswalk'?[0.7,0.01,1.6]:[0.07,0.01,2.2],[-5.5+i*(a.surface==='crosswalk'?1.5:3.5),0.05,4.2],s.material('#e1ded0'));

    return world;
  },
});
