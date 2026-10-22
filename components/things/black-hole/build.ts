import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    disk: choice('What does the accretion disk look like?', {gold:'Tight rings of furnace gold.', ice:'Thin white and icy blue rings.', red:'Broad red and copper rings.'}),
    jets: noul('Do twin polar jets shoot out from the centre?'),
    angle: choice('How is the disk tilted?', {flat:'A broad horizontal disk.', slant:'A dramatically slanted disk.', upright:'Nearly upright like an eye.'}),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const palette={gold:['#fff0ba','#eeaa47','#a74529'],ice:['#ecffff','#82c6eb','#385e98'],red:['#ffcea0','#e5733f','#842e30']}[a.disk];
    const disk=new THREE.Group();
    for(let i=0;i<12;i++){const ring=s.ring(1.1+i*0.12,0.022+i*0.002,[0,0,0],new THREE.MeshBasicMaterial({color:palette[i%3]}));ring.rotation.x=Math.PI/2;disk.add(ring);}
    disk.rotation.z={flat:0.1,slant:0.55,upright:1.15}[a.angle];s.root.add(disk);
    s.ball([1,1,1],[0,0,0],new THREE.MeshBasicMaterial({color:'#070912'}));
    if(a.jets) for(const side of [-1,1]){s.rod([0,side*0.7,0],[0,side*4,0],0.24,new THREE.MeshBasicMaterial({color:palette[1]}),0.015);}

    return s.finish();
  },
});
