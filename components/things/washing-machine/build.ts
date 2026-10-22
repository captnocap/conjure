import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    type: choice('What kind of washer is it?', {home:'A compact domestic machine.', coin:'A coin-operated laundromat washer.', stacked:'A washer with a dryer stacked above.'}),
    enamel: choice('What colour is its body?', {white:'Creamy white.', mint:'Pale mint.', steel:'Brushed stainless steel.'}),
    load: choice('What can be seen in the drum?', {empty:'An empty dark drum.', towels:'A tumble of pale towels.', colours:'Bright mixed laundry.'}),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const body=s.material({white:'#deded1',mint:'#adc7b5',steel:'#aab4af'}[a.enamel],{metalness:a.enamel==='steel'?0.6:0.1}),rim=s.material('#a1b1b0',{metalness:0.7}),dark=s.material('#415962');
    for(let n=0;n<(a.type==='stacked'?2:1);n++){const y=n*0.93;s.box([0.78,0.91,0.69],[0,y+0.455,0],body);s.ring(0.255,0.045,[0,y+0.43,0.365],rim);s.ball([0.22,0.22,0.04],[0,y+0.43,0.36],dark);
      if(a.load!=='empty')for(let i=0;i<7;i++)s.ball([0.07,0.055,0.02],[(random()-0.5)*0.28,y+0.43+(random()-0.5)*0.25,0.404],s.material(a.load==='towels'?'#dbdaca':['#bb7b6a','#8ca398','#bca66b'][i%3]),8);
      s.box([0.2,0.1,0.025],[-0.22,y+0.79,0.36],rim);s.ball([0.043,0.043,0.02],[0.23,y+0.79,0.37],dark,12);}
    if(a.type==='coin')s.label('WASH / 04',0.35,0.075,[0,0.79,0.38]);

    return s.finish();
  },
});
