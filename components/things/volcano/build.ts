import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    cone: choice('What shape has the volcano?', {shield:'A broad low shield volcano.', steep:'A steep symmetrical cone.', broken:'An uneven collapsed cone.'}),
    activity: choice('What is happening in the crater?', {dormant:'A cool dark crater.', lava:'A glowing lava lake with channels.', erupting:'Lava and a rising plume of ash.'}),
    ground: choice('What coats the slopes?', {basalt:'Dark fresh basalt.', ash:'Pale grey ash.', green:'Green returning vegetation.'}),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const h=a.cone==='shield'?1.4:3.2,r=a.cone==='shield'?3:2,rock=s.material({basalt:'#53545b',ash:'#a4a193',green:'#74806b'}[a.ground],{flatShading:true});
    s.lathe([[0,0],[r,0],[r*0.88,h*0.18],[0.65,h],[0.45,h],[0.38,h*0.78],[0,h*0.76]],rock);
    const lava=s.material('#da7542',{emissive:'#e55e25',emissiveIntensity:1.1});
    if(a.activity!=='dormant'){s.cylinder(0.43,0.4,0.03,[0,h*0.82,0],lava);for(let i=0;i<3;i++)s.tube([[0.55,h,0],[1,h*0.65,0.3],[r*0.9,0.18,0.5+i*0.16]],0.045,lava);}
    if(a.activity==='erupting')for(let i=0;i<9;i++)s.ball([0.2+i*0.06,0.3,0.2+i*0.07],[i*0.09,h+0.25+i*0.36,0],s.material('#9c9795'),10);
    if(a.cone==='broken'){const chunk=s.mesh(new THREE.DodecahedronGeometry(0.55,0),rock,[1.8,0.35,0.7]);chunk.scale.y=0.5;}

    return s.finish();
  },
});
