import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    structure: choice('What binds the cluster visually?', {globular:'A dense spherical ball of old stars.', open:'A loose scattering of young stars.', stream:'A stretched stellar stream.', binary:'Two tightly packed companions.'}),
    colour: choice('What kind of starlight predominates?', {blue:'Cold blue-white points.', gold:'Old honey-gold points.', mixed:'Blue, white and copper mixed together.'}),
    halo: noul('Does a thin ring of distant stars surround the cluster?'),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const points=Array.from({length:800},(_,i)=>{
      const angle=random()*Math.PI*2, v=random()*2-1, r=Math.pow(random(),a.structure==='globular'?1.8:0.5)*2.6;
      let x=Math.sqrt(1-v*v)*Math.cos(angle)*r,y=v*r,z=Math.sqrt(1-v*v)*Math.sin(angle)*r;
      if(a.structure==='stream'){x*=2;y*=0.3;z*=0.4;}
      if(a.structure==='binary')x+=(i%2?1.8:-1.8);
      if(a.halo && i<150){x=Math.cos(angle)*3.4;z=Math.sin(angle)*3.4;y*=0.12;}
      return {at:[x,y,z] as [number,number,number],size:0.022+random()*0.04,color:a.colour==='blue'?'#c6e0ff':a.colour==='gold'?'#ffe3a9':['#bedfff','#fff5d3','#edba8a'][i%3]};
    });
    s.scatter(new THREE.IcosahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:'#ffffff'}),points);

    return s.finish();
  },
});
