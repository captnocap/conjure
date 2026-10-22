import * as THREE from 'three';
import { diorama, choice, noul, defineWorld } from '@conjure/kit';

export default defineWorld({
  questions: {

    forest: choice('What grows around the clearing?', {pine:'Tall conifers with tiered crowns.', birch:'Pale slender birches.', orchard:'Round fruit-tree crowns.'}),
    floor: choice('What covers the forest floor?', {moss:'Soft green moss.', needles:'Brown needles and fallen leaves.', snow:'Pale blue-white snow.'}),
    path: choice('What route passes through?', {none:'No visible path.', stones:'A trail of stepping stones.', track:'A worn earthen track.'}),

  },
  build(a, context) {
    const {mood, random} = context;
    const {art: s, world} = diorama(context, {background:'#dce3d1',floor:{moss:'#8f9b73',needles:'#a79876',snow:'#dce3df'}[a.floor],width:14,depth:11,maxHeight:4,radius:1.4,pitch:29});

    const bark=s.material(a.forest==='birch'?'#dedbc9':'#726149'),leaf=s.material(a.floor==='snow'?'#bfcdbb':'#56725a');
    for(let i=0;i<8;i++){const x=-6.5+i*1.85,y=3+random()*1.5;s.cylinder(0.12,0.19,y,[x,y/2,-4.7],bark);
      if(a.forest==='pine')for(let j=0;j<3;j++)s.cylinder(0,1-j*0.22,1.5,[x,y-0.8+j*0.65,-4.7],leaf,9);
      else s.ball([0.9,1.2,0.85],[x,y,-4.7],leaf,12);
    }
    if(a.path==='track')s.box([1.2,0.015,10],[0,0.014,0],s.material('#b1a083'));
    if(a.path==='stones')for(let i=0;i<8;i++)s.cylinder(0.3,0.32,0.05,[Math.sin(i)*0.4,0.025,-4+i*1.25],s.material('#adb1a0'),7);

    return world;
  },
});
