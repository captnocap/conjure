import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    layout: choice('What is the checkout layout?', {belt:'A long supermarket conveyor and bagging shelf.', corner:'A compact L-shaped convenience-store counter.', kiosk:'A small self-service checkout pedestal.'}),
    finish: choice('What is its main finish?', {red:'Dark red enamel with stainless edging.', teal:'Muted teal with cream laminate.', wood:'Golden timber with black fittings.'}),
    belt: choice('What sits on the conveyor or worktop?', {empty:'An empty surface waiting for a customer.', essentials:'Bread, milk and a packet of cereal.', midnight:'A soda, a snack and a folded magazine.'}),
    bags: choice('What is waiting in the bagging area?', {paper:'Brown paper bags.', reusable:'A cloth shopping bag.', none:'A clear empty bagging area.'}),
    impulse: noul('Is there a rack of small sweets at the customer end?'),
    divider: noul('Is a next-customer divider lying across the belt?'),
    lane: choice('What does the lane sign show?', {one:'LANE 1', express:'EXPRESS', closed:'LANE CLOSED', welcome:'WELCOME'}),
    length: score('How long is the checkout?', ['A compact corner-shop checkout', 'A long full-size supermarket lane']),
  },
  build(a, context) {

    const s=new Sculpture(context), l=a.layout==='kiosk'?0.7:1.3+a.length*1.2, color={red:'#9b4d43',teal:'#56847c',wood:'#b39364'}[a.finish],body=s.material(color),steel=s.material('#b4beb6',{metalness:0.65}),dark=s.material('#3d4540'),paper=s.material('#c3ad83');
    s.box([0.85,0.85,l],[0,0.43,0],body);s.box([0.9,0.055,l+0.08],[0,0.89,0],steel);
    if(a.layout==='kiosk'){s.box([0.44,0.2,0.12],[0,1.03,-0.15],dark);s.label('SCAN / PAY',0.36,0.1,[0,1.055,-0.08],'#e2e2c2','#44594b');s.box([0.31,0.01,0.27],[0,0.925,0.11],dark);}
    else{s.box([0.63,0.015,l*0.62],[0,0.926,l*0.12],dark);for(let i=0;i<12;i++)s.box([0.59,0.004,0.003],[0,0.936,-l*0.12+i*l*0.038],s.material('#525b50'));s.box([0.82,0.12,0.28],[0,0.98,-l*0.36],steel);s.box([0.22,0.008,0.14],[0,1.044,-l*0.36],dark);s.box([0.85,0.55,0.22],[0,0.65,-l*0.64],body);s.box([0.92,0.05,0.37],[0,0.95,-l*0.68],steel);}
    if(a.layout==='corner'){s.box([0.88,0.84,0.7],[0.66,0.42,-l/2+0.32],body);s.box([0.94,0.055,0.75],[0.66,0.89,-l/2+0.32],steel);}
    const product=(x:number,z:number,k:number)=>{if(k===0){s.box([0.2,0.16,0.14],[x,1.018,z],paper);for(let j=0;j<3;j++)s.box([0.018,0.002,0.1],[x+(j-1)*0.05,1.1,z],s.material('#906942'));}else if(k===1){s.box([0.12,0.25,0.12],[x,1.063,z],s.material('#e0e2d2'));s.box([0.13,0.06,0.13],[x,1.175,z],s.material('#819ba4'));}else{s.box([0.2,0.25,0.08],[x,1.063,z],s.material('#ae7952'));s.label('OATS',0.14,0.07,[x,1.08,z+0.043]);}};
    if(a.belt==='essentials')for(let i=0;i<3;i++)product((i%2-0.5)*0.22,l*0.15+(i-1)*0.23,i);
    if(a.belt==='midnight'){s.cylinder(0.04,0.04,0.14,[0.12,1.008,l*0.21],s.material('#bd6055'),16);s.box([0.13,0.16,0.035],[-0.12,1.02,l*0.16],s.material('#d1b264'));s.box([0.19,0.013,0.24],[0,0.95,l*0.35],paper);}
    if(a.bags!=='none'){const bag=s.material(a.bags==='paper'?'#c4a575':'#7b917e');s.box([0.27,0.32,0.21],[0,1.12,-l*0.63],bag);for(const z of [-l*0.63-0.08,-l*0.63+0.08])s.tube([[-0.08,1.28,z],[-0.07,1.4,z],[0.07,1.4,z],[0.08,1.28,z]],0.009,bag);}
    if(a.impulse){s.box([0.2,0.43,0.29],[0.54,0.77,l*0.31],dark);for(let row=0;row<3;row++)for(let col=0;col<3;col++)s.box([0.04,0.075,0.035],[0.48+col*0.053,0.63+row*0.11,l*0.31+0.16],s.material(['#b7614d','#bca257','#679385'][(col+row)%3]));}
    if(a.divider&&a.layout!=='kiosk')s.box([0.57,0.024,0.035],[0,0.95,l*0.32],body);
    s.rod([-0.36,0.9,-l*0.37],[-0.36,1.95,-l*0.37],0.024,steel);s.box([0.5,0.31,0.07],[-0.36,2.04,-l*0.37],body);s.label({one:'LANE 1',express:'EXPRESS',closed:'LANE CLOSED',welcome:'WELCOME'}[a.lane],0.43,0.19,[-0.36,2.04,-l*0.37+0.041],'#f5ebcf',color);
    for(let i=0;i<6;i++){const x=(context.random()-0.5)*0.8;s.box([0.025,0.004,0.02],[x,0.923,(context.random()-0.5)*l],s.material('#7d8072'));}
    return s.finish();
  },
});
