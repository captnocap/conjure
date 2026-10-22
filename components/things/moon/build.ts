import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    geology: choice('What is the moon made of?', {dust:'Grey regolith and darker basalt basins.', frost:'White ice and blue-shadowed craters.', rust:'Reddish rock and gold impact rims.'}),
    impacts: choice('What is its impact history?', {few:'A few very large ancient craters.', many:'A surface peppered by many small impacts.'}),
    outpost: noul('Is a tiny research outpost visible on the surface?'),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const colour={dust:'#9e9b90',frost:'#ccd8d8',rust:'#bd8a70'}[a.geology];const rock=s.material(colour);
    s.ball([1.4,1.4,1.4],[0,0,0],rock,40);
    for(let i=0;i<(a.impacts==='many'?42:12);i++){
      const u=random()*Math.PI*2,v=random()*2-1,dir=new THREE.Vector3(Math.sqrt(1-v*v)*Math.cos(u),v,Math.sqrt(1-v*v)*Math.sin(u));
      const r=(a.impacts==='many'?0.06:0.16)+random()*0.13;
      const rim=s.ring(r,0.025,dir.clone().multiplyScalar(1.38).toArray() as [number,number,number],rock);
      rim.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dir);
      const bowl=s.ball([r*0.85,r*0.85,0.015],dir.clone().multiplyScalar(1.393).toArray() as [number,number,number],s.material('#6c7476'),12);bowl.quaternion.copy(rim.quaternion);
    }
    if(a.outpost){s.box([0.24,0.12,0.17],[0,1.47,0],s.material('#ede7cc'));s.rod([0,1.5,0],[0,1.86,0],0.009,s.material('#858c92'));}

    return s.finish();
  },
});
