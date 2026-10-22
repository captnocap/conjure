import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    profile: choice('What kind of mountains rise here?', {alpine:'Sharp high alpine peaks.', worn:'Low rounded ancient mountains.', folded:'A long serrated folded ridge.'}),
    stone: choice('What is the exposed rock?', {slate:'Blue-grey slate.', red:'Warm red sandstone.', pale:'Pale granite.'}),
    snow: choice('How much snow remains?', {none:'Bare rock.', caps:'Snow on the highest peaks.', heavy:'Broad snowfields down the slopes.'}),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const rock=s.material({slate:'#74818b',red:'#af7b61',pale:'#a6aaa0'}[a.stone],{flatShading:true}),snow=s.material('#e1e7df',{flatShading:true});
    for(let i=0;i<7;i++){const h=(a.profile==='alpine'?2.4:a.profile==='worn'?1.1:1.8)+random()*1.4,x=(i-3)*0.8,z=(random()-0.5)*0.9;
      s.cylinder(0.03,1.2,h,[x,h/2,z],rock,a.profile==='worn'?8:5);
      if(a.snow!=='none'){const f=a.snow==='heavy'?0.55:0.25;s.cylinder(0.018,1.21*f,h*f,[x,h-h*f/2+0.005,z],snow,5);}
    }

    return s.finish();
  },
});
