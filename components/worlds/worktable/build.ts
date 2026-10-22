import * as THREE from 'three';
import { diorama, choice, noul, defineWorld } from '@conjure/kit';

export default defineWorld({
  questions: {

    surface: choice('What is the tabletop made of?', {oak:'Warm timber boards.', enamel:'Pale green enamel.', dark:'Dark stained wood.', cloth:'Cream woven tablecloth.'}),
    occupation: choice('What traces of work remain?', {blank:'The surface is cleared.', writing:'Loose paper and a pencil.', making:'A ruler and swatches.', meal:'A folded napkin and place setting.'}),
    view: choice('How is the table seen?', {seated:'From an intimate seated angle.', overhead:'A high view of the arrangement.'}),

  },
  build(a, context) {
    const {mood, random} = context;
    const {art: s, world} = diorama(context, {background:'#e6e2d7',floor:{oak:'#ae8d62',enamel:'#adc6b4',dark:'#6c594a',cloth:'#dad4bd'}[a.surface],width:10,depth:8,maxHeight:2.6,radius:1.1,pitch:a.view==='overhead'?63:30,slots:[[0,1],[-2.8,-1.2],[2.8,-1.2],[-2.8,2],[2.8,2],[0,-2.5]]});

    const dark=s.material('#7d6850');for(const x of [-4.5,4.5])for(const z of [-3.5,3.5])s.box([0.28,1.4,0.28],[x,-0.9,z],dark);
    if(a.surface==='oak'||a.surface==='dark')for(let i=0;i<8;i++)s.box([0.018,0.006,8],[-4.2+i*1.2,0.008,0],dark);
    if(a.occupation==='writing'){const paper=s.box([1.6,0.013,1.1],[-3,0.02,3],s.material('#ede8d6'));paper.rotation.y=0.2;s.rod([-2.6,0.04,2.9],[-1.8,0.04,3.3],0.025,s.material('#c59747'));}
    if(a.occupation==='making'){s.box([3,0.025,0.22],[0,0.035,3.4],dark);for(let i=0;i<4;i++)s.box([0.42,0.016,0.5],[-3+i*0.6,0.025,3.3],s.material(['#ab705e','#75866a','#9baec0','#d0b67d'][i]));}
    if(a.occupation==='meal'){s.cylinder(0.6,0.6,0.04,[-3,0.025,3],s.material('#e2ddd0'));s.box([0.5,0.035,0.9],[-1.9,0.025,3],s.material('#a5b5a1'));}

    return world;
  },
});
