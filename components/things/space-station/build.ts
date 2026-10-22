import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    architecture: choice('How is the station organised?', {wheel:'A rotating habitation wheel.', truss:'A long modular laboratory truss.', twin:'Two linked habitat rings.'}),
    purpose: choice('What does the station support?', {science:'White laboratory modules with blue arrays.', freight:'Weathered cargo modules and orange service tanks.', garden:'A green research habitat with planted domes.'}),
    beacon: noul('Is the docking beacon illuminated?'),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const hull=s.material(a.purpose==='freight'?'#ba8b5d':'#d9ddd3',{metalness:0.3}),trim=s.material('#4d5b64',{metalness:0.6}),solar=s.material(a.purpose==='garden'?'#56886c':'#395a86');
    s.rod([-2.8,1.8,0],[2.8,1.8,0],0.12,trim);
    for(let i=0;i<5;i++){const m=s.cylinder(0.34,0.34,0.9,[(i-2)*1.05,1.8,0],hull);m.rotation.z=Math.PI/2;}
    if(a.architecture!=='truss')for(let k=0;k<(a.architecture==='twin'?2:1);k++){
      const x=k===0?0:1.8,ring=s.ring(1.6,0.16,[x,1.8,0],hull);ring.rotation.y=Math.PI/2;
      for(let i=0;i<6;i++){const t=i*Math.PI/3;s.rod([x,1.8,0],[x,1.8+Math.cos(t)*1.6,Math.sin(t)*1.6],0.045,trim);}
    }
    for(const side of [-1,1])for(let i=0;i<3;i++)s.box([0.65,0.035,1.45],[(i-1)*1.1,1.8,side*2],solar);
    s.cylinder(0.3,0.3,0.28,[0,2.4,0],trim);
    if(a.beacon)s.ball([0.08,0.08,0.08],[0,2.63,0],s.material('#df8c57',{emissive:'#e78e47',emissiveIntensity:2}));

    return s.finish();
  },
});
