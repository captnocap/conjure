import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    style: choice('What form is the booth?', {red:'A red enclosed street booth.', blue:'A blue metal roadside kiosk.', hood:'An open aluminium weather hood.'}),
    door: choice('What is the state of its entrance?', {open:'The entrance is open.', shut:'A closed glazed door.'}),
    receiver: choice('Where is the receiver?', {hook:'Neatly on its hook.', dangling:'Hanging from the cord.'}),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const metal=s.material({red:'#aa5546',blue:'#547b95',hood:'#a6b6b7'}[a.style],{metalness:0.3}),dark=s.material('#364d53'),glass=s.material('#a0bfc3',{transparent:true,opacity:0.22,depthWrite:false});
    s.box([0.95,0.1,0.9],[0,0.05,0],metal);s.box([0.95,0.14,0.95],[0,2.22,0],metal);
    for(const x of [-0.43,0.43])for(const z of [-0.4,0.4])s.box([0.07,2.15,0.07],[x,1.1,z],metal);
    s.box([0.85,1.8,0.025],[0,1.13,-0.43],glass);
    for(const x of [-0.44,0.44])s.box([0.025,1.8,0.78],[x,1.13,0],glass);
    if(a.door==='shut'&&a.style!=='hood')s.box([0.78,1.9,0.025],[0,1.1,0.42],glass);
    s.box([0.33,0.52,0.16],[0,1.3,-0.27],dark);s.label('PHONE',0.72,0.19,[0,2.04,0.46]);
    for(let x=0;x<3;x++)for(let y=0;y<4;y++)s.box([0.045,0.04,0.02],[-0.065+x*0.065,1.3-y*0.055,-0.17],metal);
    s.tube([[0.13,1.4,-0.15],[0.28,0.8,-0.03],[0.31,a.receiver==='hook'?1.4:0.55,0.04]],0.014,dark);s.box([0.07,0.3,0.08],[0.31,a.receiver==='hook'?1.4:0.55,0.04],dark);

    return s.finish();
  },
});
