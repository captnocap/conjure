import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    form: choice('What shape has the nebula taken?', {pillars:'Tall fingerlike pillars of gas.', shell:'A hollow expanding supernova shell.', butterfly:'Two billowing lobes on either side of a narrow waist.', cloud:'An irregular star-forming cloud.'}),
    gas: choice('What colours reveal its gases?', {rose:'Rose red and warm gold.', oxygen:'Turquoise, deep blue and pale cyan.', violet:'Lilac, peach and dark plum.'}),
    stars: noul('Are bright newborn stars embedded in the gas?'),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const colours = {rose:['#b75169','#ebba8b','#74435e'],oxygen:['#4c8f9d','#a7e0df','#355679'],violet:['#927bad','#e4b5b8','#67416e']}[a.gas];
    const paints=colours.map(color=>s.material(color,{emissive:color,emissiveIntensity:0.22,flatShading:true}));
    for(let i=0;i<70;i++){
      const t=random()*Math.PI*2, r=0.7+random()*1.6;
      let x=Math.cos(t)*r,y=(random()-0.5)*2,z=Math.sin(t)*r;
      if(a.form==='pillars'){x=(i%3-1)*1.4+random()*0.4;y=random()*4;z=(random()-0.5)*0.9;}
      if(a.form==='shell'){y=Math.sin(t)*2.5;x=Math.cos(t)*2.5;z=(random()-0.5)*1.2;}
      if(a.form==='butterfly'){x=(i%2?1:-1)*(1+random()*2);y=(random()-0.5)*Math.abs(x);}
      const cloud=s.mesh(new THREE.IcosahedronGeometry(0.3+random()*0.5,1),paints[i%3],[x,y,z]);cloud.scale.y=1.4;
    }
    if(a.stars) for(let i=0;i<9;i++) s.ball([0.07,0.07,0.07],[(random()-0.5)*3,random()*2,(random()-0.5)*2],new THREE.MeshBasicMaterial({color:'#fff8d7'}),8);

    return s.finish();
  },
});
