import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    inventory: choice('What is behind its window?', {snacks:'Bright packets in spiral dispensers.', cans:'Rows of cold cans.', capsules:'Small coloured toy capsules.', mystery:'Unlabelled boxes and curious objects.'}),
    finish: choice('What colour is the cabinet?', {orange:'Burnt orange enamel.', green:'Faded sage green.', navy:'Midnight blue.'}),
    state: choice('What is displayed?', {ready:'A softly lit selection display.', sold:'A SOLD OUT notice.', lucky:'A little YOU WIN light.'}),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const body=s.material({orange:'#b9784a',green:'#7e9c88',navy:'#485d73'}[a.finish]),dark=s.material('#34434b'),trim=s.material('#b4bcb3',{metalness:0.5});
    s.box([1.1,1.85,0.72],[0,0.925,0],body);s.box([0.75,1.25,0.04],[-0.12,1.08,0.38],dark);
    for(let y=0;y<4;y++)for(let x=0;x<4;x++){const pos:[number,number,number]=[-0.4+x*0.18,0.64+y*0.28,0.43],mat=s.material(['#c89960','#91a785','#b56d69','#7894ab'][(x+y)%4]);
      if(a.inventory==='capsules')s.ball([0.065,0.065,0.065],pos,mat,12);else if(a.inventory==='cans')s.cylinder(0.053,0.053,0.15,pos,mat,12);else s.box([0.13,0.19,0.07],pos,mat);
    }
    for(let i=0;i<8;i++)s.ball([0.028,0.028,0.013],[0.4,1.4-i*0.105,0.38],trim,8);
    s.box([0.6,0.17,0.04],[0,0.23,0.38],dark);s.label({ready:'SELECT',sold:'SOLD OUT',lucky:'YOU WIN'}[a.state],0.65,0.14,[-0.1,1.72,0.385]);

    return s.finish();
  },
});
