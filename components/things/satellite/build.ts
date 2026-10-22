import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    mission: choice('What is its mission?', {relay:'A communications relay with a large dish.', telescope:'A space telescope with a long dark aperture.', probe:'A spindly scientific probe with instrument booms.'}),
    power: choice('What form do the solar arrays take?', {wings:'Two wide rectangular solar wings.', fan:'Four small fanlike solar wings.'}),
    state: choice('What has happened to the machine?', {working:'Intact and carefully aligned.', damaged:'One broken wing and a tilted antenna.', silent:'Dark instruments but an intact structure.'}),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const gold=s.material('#c7a566',{metalness:0.6}),dark=s.material('#254659',{metalness:0.4}),silver=s.material('#bec2bd',{metalness:0.65});
    s.box([0.75,0.8,0.7],[0,1,0],gold);
    for(const side of [-1,1]){s.rod([0,1,0],[side*1.8,1,0],0.03,silver);for(let j=0;j<(a.power==='fan'?2:1);j++){
      const panel=s.box([1.2,0.04,a.power==='fan'?0.55:1.15],[side*1.3,1,j*0.75- (a.power==='fan'?0.375:0)],dark);if(a.state==='damaged'&&side===1)panel.rotation.z=0.5;
      for(let k=0;k<5;k++)s.rod([side*1.3-0.5+k*0.25,1.025,-0.5],[side*1.3-0.5+k*0.25,1.025,0.5],0.008,silver);
    }}
    if(a.mission==='telescope'){const tube=s.cylinder(0.38,0.38,1.6,[0,1.4,0],silver);tube.rotation.x=Math.PI/2;s.ball([0.33,0.33,0.015],[0,1.4,0.81],s.material('#132029'));}
    else {s.rod([0,1.3,0],[0,2.1,0],0.03,silver);s.cylinder(0.62,0.12,0.3,[0,1.85,0],silver);}
    if(a.mission==='probe')for(const side of [-1,1])s.rod([0,0.8,0],[side*0.8,0.1,0.6],0.014,silver);

    return s.finish();
  },
});
