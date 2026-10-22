import * as THREE from 'three';
import { diorama, choice, noul, defineWorld } from '@conjure/kit';

export default defineWorld({
  questions: {

    bottom: choice('What is the seabed made of?', {sand:'Pale rippled sand.', rubble:'Coral rubble and chalky stones.', volcanic:'Dark volcanic gravel.'}),
    water: choice('What colour is the surrounding water?', {shallow:'Clear turquoise shallows.', deep:'Deep muted blue.', green:'Green estuary water.'}),
    arch: noul('Does an eroded rock arch frame the far side?'),

  },
  build(a, context) {
    const {mood, random} = context;
    const {art: s, world} = diorama(context, {background:{shallow:'#b1d7d2',deep:'#658ba1',green:'#a6c3ae'}[a.water],floor:a.bottom==='volcanic'?'#697776':'#c6ccb6',width:13,depth:10,maxHeight:3.5,radius:1.4,pitch:31});

    const rock=s.material('#a1b3a4',{flatShading:true});
    for(let i=0;i<12;i++){const wave=s.tube([[-6,0.02,-4+i*0.7],[-2,0.05,-3.8+i*0.7],[2,0.02,-4.1+i*0.7],[6,0.04,-3.9+i*0.7]],0.025,rock);}
    if(a.arch){for(const x of [-4.5,4.5])s.ball([0.9,2.2,0.75],[x,1.8,-4],rock,10);s.tube([[-4.5,2.4,-4],[-3,3.6,-4],[0,4.2,-4],[3,3.6,-4],[4.5,2.4,-4]],0.52,rock);}
    if(a.bottom==='rubble')for(let i=0;i<30;i++)s.mesh(new THREE.DodecahedronGeometry(0.12+random()*0.12,0),rock,[(random()-0.5)*12,0.1,(random()-0.5)*9]);

    return world;
  },
});
