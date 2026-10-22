import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    era: choice('What era is the pump from?', {vintage:'A rounded old pump with a globe on top.', modern:'A rectangular electronic dispenser.', industrial:'A plain rugged yard pump.'}),
    colour: choice('What colour is the enamel?', {red:'Faded roadside red.', teal:'Sea-green enamel.', cream:'Cream and black.'}),
    status: choice('What is the pump doing?', {ready:'Ready with the nozzle holstered.', closed:'Tagged OUT OF SERVICE.', zero:'A blank reset meter.'}),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const body=s.material({red:'#ba604b',teal:'#5b948c',cream:'#d4c7a8'}[a.colour]),dark=s.material('#344750'),steel=s.material('#abb3b0',{metalness:0.65});
    s.box([0.85,0.16,0.65],[0,0.08,0],steel);s.box([0.68,1.55,0.48],[0,0.9,0],body);
    if(a.era==='modern')s.box([1.05,0.78,0.6],[0,1.54,0],body);
    if(a.era==='vintage'){s.ball([0.34,0.24,0.24],[0,1.67,0],body);s.rod([0,1.7,0],[0,2.1,0],0.045,steel);s.ball([0.24,0.24,0.12],[0,2.16,0],s.material('#e9ddb1'));}
    s.box([0.51,0.35,0.025],[0,1.38,0.32],dark);s.label(a.status==='zero'?'00.00':'38.72',0.42,0.12,[0,1.42,0.342],'#d8e4bd','#344750');
    s.tube([[0.37,1.6,0],[0.7,1.3,0],[0.77,0.2,0.15],[0.55,0.38,0.34],[0.53,1.05,0.33]],0.035,dark);
    const nozzle=s.box([0.12,0.26,0.07],[0.5,1.08,0.34],dark);nozzle.rotation.z=-0.3;
    if(a.status==='closed')s.label('OUT OF SERVICE',0.65,0.19,[0,0.8,0.255],'#9d4f3f');

    return s.finish();
  },
});
