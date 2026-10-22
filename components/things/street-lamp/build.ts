import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    fixture: choice('What kind of luminaire is it?', {lantern:'A square old-city lantern.', cobra:'A curved modern road light.', globe:'Two white globe lamps.'}),
    finish: choice('What is the post made of?', {iron:'Dark cast iron.', silver:'Brushed aluminium.', green:'Weathered green paint.'}),
    lit: noul('Is the lamp illuminated?'),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const metal=s.material({iron:'#465253',silver:'#b7c1bb',green:'#648e7b'}[a.finish],{metalness:0.55}),bulb=s.material(a.lit?'#eadba2':'#c8d6d2',{emissive:a.lit?'#e7c26d':'#000000',emissiveIntensity:a.lit?1:0});
    s.cylinder(0.07,0.12,3.5,[0,1.75,0],metal);s.cylinder(0.22,0.28,0.25,[0,0.125,0],metal);
    if(a.fixture==='lantern'){s.box([0.4,0.6,0.4],[0,3.72,0],bulb);s.cylinder(0,0.37,0.32,[0,4.18,0],metal,4);for(const x of [-0.22,0.22])for(const z of [-0.22,0.22])s.rod([x,3.38,z],[x,4.03,z],0.025,metal);}
    if(a.fixture==='cobra'){s.tube([[0,3.3,0],[0.1,3.9,0],[0.9,4,0]],0.065,metal);s.ball([0.42,0.1,0.18],[0.95,3.96,0],metal);s.box([0.55,0.025,0.2],[0.99,3.87,0],bulb);}
    if(a.fixture==='globe'){s.tube([[-0.5,3.8,0],[-0.4,3.4,0],[0,3.35,0],[0.4,3.4,0],[0.5,3.8,0]],0.04,metal);for(const x of [-0.5,0.5])s.ball([0.23,0.23,0.23],[x,3.87,0],bulb);}

    return s.finish();
  },
});
