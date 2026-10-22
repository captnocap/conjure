import * as THREE from 'three';
import { diorama, choice, noul, defineWorld } from '@conjure/kit';

export default defineWorld({
  questions: {

    coast: choice('What kind of shore is this?', {sand:'A broad pale sandbank.', basalt:'A dark volcanic shore.', chalk:'An ivory chalk coast.'}),
    water: choice('What colour is the sea?', {lagoon:'Shallow turquoise water.', cold:'Cold grey-blue northern water.', evening:'Muted lavender water.'}),
    tide: choice('What has the tide exposed?', {high:'Only a narrow strip of land.', low:'Wide tidal bands and exposed rocks.', pools:'Several small tide pools.'}),

  },
  build(a, context) {
    const {mood, random} = context;
    const {art: s, world} = diorama(context, {background:'#dfebeb',floor:{sand:'#c5b893',basalt:'#656a66',chalk:'#d8d7c4'}[a.coast],width:14,depth:10,maxHeight:4,radius:1.45,pitch:37});

    const water=s.material({lagoon:'#68ada7',cold:'#648897',evening:'#918baf'}[a.water],{roughness:0.28});
    for(let i=0;i<4;i++)s.box([14,0.045,0.65],[0,-0.06-i*0.025,4.2+i*0.65],water);
    const rock=s.material(a.coast==='basalt'?'#454f50':'#9da491',{flatShading:true});
    for(let i=0;i<(a.tide==='high'?5:14);i++)s.mesh(new THREE.DodecahedronGeometry(0.14+random()*0.25,0),rock,[(random()-0.5)*13,0.05,3.9+random()*1.8]);
    if(a.tide==='pools')for(let i=0;i<4;i++){const pool=s.cylinder(0.4,0.4,0.02,[-5+i*3,0.02,3.4],water);pool.scale.z=0.55;}

    return world;
  },
});
