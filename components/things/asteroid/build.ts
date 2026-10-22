import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    material: choice('What is the asteroid made of?', {rock:'Charcoal and brown stone.', metal:'A pitted iron-nickel body.', ice:'Pale fractured ice.'}),
    shape: choice('How has it broken?', {boulder:'One angular boulder.', dumbbell:'Two bodies fused by a narrow neck.', rubble:'A loose rubble pile with escaping chips.'}),
    vein: noul('Does a bright mineral vein run through the rock?'),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const mat=s.material({rock:'#796d61',metal:'#92979b',ice:'#b1d6dc'}[a.material],{flatShading:true,metalness:a.material==='metal'?0.7:0.1});
    const n=a.shape==='rubble'?18:a.shape==='dumbbell'?2:1;
    for(let i=0;i<n;i++){const g=new THREE.IcosahedronGeometry(a.shape==='rubble'?0.3+random()*0.4:1.2,1);const pos=g.attributes.position;
      for(let j=0;j<pos.count;j++){const k=0.8+random()*0.4;pos.setXYZ(j,pos.getX(j)*k,pos.getY(j)*k,pos.getZ(j)*k);}g.computeVertexNormals();
      const at: [number,number,number]=a.shape==='dumbbell'?[(i-0.5)*1.5,0,0]:a.shape==='rubble'?[(random()-0.5)*2,(random()-0.5)*1.4,(random()-0.5)*1.6]:[0,0,0];s.mesh(g,mat,at);
    }
    if(a.vein)s.tube([[-0.7,0.7,0.7],[-0.2,1.1,0.35],[0.2,0.9,0.55],[0.7,0.5,0.7]],0.035,s.material('#d4b984',{emissive:'#5b3714',emissiveIntensity:0.3}));

    return s.finish();
  },
});
