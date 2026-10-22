import * as THREE from 'three';
import { diorama, choice, noul, defineWorld } from '@conjure/kit';

export default defineWorld({
  questions: {

    geology: choice('What makes up the basin?', {sand:'Warm ochre sand and pale sandstone.', salt:'An almost white salt flat.', mars:'Red dust and dark ironstone.'}),
    tracks: choice('What crosses the empty ground?', {none:'No trace of passage.', road:'A narrow grey road.', river:'A dry winding riverbed.'}),
    ridge: choice('What is on the far horizon?', {low:'Low broken ridges.', teeth:'Sharp spires of eroded rock.', flat:'A long horizontal escarpment.'}),

  },
  build(a, context) {
    const {mood, random} = context;
    const {art: s, world} = diorama(context, {background:'#ede2ce', floor:{sand:'#cbb487',salt:'#e0ddcb',mars:'#b97859'}[a.geology],width:16,depth:12,maxHeight:4,radius:1.65,pitch:33});

    const rock=s.material(a.geology==='mars'?'#865541':'#ad977d',{flatShading:true});
    for(let i=0;i<11;i++){const h=a.ridge==='teeth'?1+random()*3:a.ridge==='flat'?1.8:0.4+random()*1.2;s.cylinder(a.ridge==='flat'?0.65:0.08,0.9,h,[-7+i*1.4,h/2,-5.5],rock,5);}
    if(a.tracks==='road')s.box([1.4,0.02,11],[1,0.015,0],s.material('#77756d'));
    if(a.tracks==='river')s.tube([[-6,0.025,5],[-3,0.025,2],[0,0.025,1],[3,0.025,-2],[5,0.025,-5]],0.14,s.material('#918776'));

    return world;
  },
});
