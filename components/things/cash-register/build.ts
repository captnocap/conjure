import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    era: choice('What era is the register?', {mechanical:'An ornate mechanical till with tall levers and a top sign.', electronic:'A boxy electronic till with a glowing display.', touch:'A modern touchscreen checkout terminal.'}),
    finish: choice('What is the casing made from?', {brass:'Polished brass.', green:'Dark green painted metal.', beige:'Pale beige plastic.'}),
    drawer: choice('What is the cash drawer doing?', {closed:'Closed with a small keyhole.', ajar:'Slightly open, showing notes and coin compartments.', open:'Fully open after a sale.'}),
    receipt: choice('What hangs from the receipt slot?', {none:'No receipt.', short:'A short single-sale receipt.', long:'A curling, improbably long receipt.'}),
    display: choice('What appears on its display?', {sale:'SALE 4.95', closed:'CLOSED', zero:'0.00', thanks:'THANK YOU'}),
    bell: noul('Is there a little service bell beside the till?'),
    priceStand: noul('Does it have a tall customer-facing price display?'),
    keys: score('How extensive is the keyboard?', ['A handful of broad function keys', 'A dense grid of small numbered keys']),
  },
  build(a, context) {

    const s=new Sculpture(context),body=s.material({brass:'#b9a263',green:'#375c4c',beige:'#cfc8b5'}[a.finish],{metalness:a.finish==='brass'?0.65:0.2}), dark=s.material('#333e37'), cream=s.material('#eae6d3'),silver=s.material('#adb7ae',{metalness:0.65});
    s.box([0.62,0.11,0.48],[0,0.09,0],body);const shift=a.drawer==='open'?0.3:a.drawer==='ajar'?0.12:0;s.box([0.58,0.08,0.43],[0,0.086,shift+0.025],dark);s.box([0.6,0.09,0.045],[0,0.09,shift+0.25],body);s.ball([0.016,0.016,0.01],[0,0.09,shift+0.276],dark,10);
    if(shift){for(let i=0;i<4;i++){s.box([0.11,0.035,0.22],[(i-1.5)*0.14,0.147,shift+0.02],s.material(i%2?'#a4b094':'#bfc3a2'));s.box([0.01,0.07,0.3],[(i-1.5)*0.14-0.061,0.14,shift+0.02],body);for(let j=0;j<3;j++)s.cylinder(0.019,0.019,0.004,[(i-1.5)*0.14+(context.random()-0.5)*0.05,0.17+j*0.005,shift+0.17],silver,12);}}
    if(a.era==='mechanical'){s.box([0.56,0.3,0.24],[0,0.32,-0.08],body);s.ball([0.28,0.15,0.12],[0,0.48,-0.08],body);s.box([0.46,0.07,0.07],[0,0.6,-0.08],body);s.label(a.display==='closed'?'CLOSED':a.display==='thanks'?'THANK YOU':a.display==='zero'?'0.00':'4.95',0.41,0.052,[0,0.6,-0.041]);s.rod([0.31,0.29,0],[0.39,0.31,0],0.015,silver);s.rod([0.39,0.31,0],[0.39,0.41,0],0.018,dark);}
    else if(a.era==='electronic'){s.box([0.54,0.24,0.29],[0,0.28,-0.055],body);s.box([0.31,0.07,0.025],[0,0.41,0.107],dark);s.label({sale:'4.95',closed:'CLOSED',zero:'0.00',thanks:'THANKS'}[a.display],0.28,0.046,[0,0.41,0.123],'#a9d7aa','#293e33');}
    else{s.rod([0,0.18,-0.09],[0,0.42,-0.12],0.027,silver);const screen=s.box([0.44,0.29,0.035],[0,0.46,-0.12],dark);screen.rotation.x=-0.18;s.label({sale:'SALE 4.95',closed:'CLOSED',zero:'0.00',thanks:'THANK YOU'}[a.display],0.36,0.12,[0,0.47,-0.092],'#c4e1c9','#345552');}
    const columns=4+Math.floor(a.keys*4);for(let row=0;row<3;row++)for(let col=0;col<columns;col++){const x=(col-(columns-1)/2)*0.055,y=0.21+row*0.045,z=0.2-row*0.046;if(a.era==='mechanical')s.cylinder(0.018,0.014,0.015,[x,y,z],cream,12).rotation.x=0.6;else s.box([0.041,0.015,0.034],[x,y,z],col===columns-1?body:cream);}
    if(a.receipt!=='none'){const n=a.receipt==='long'?10:3;for(let i=0;i<n;i++){const p=s.box([0.087,0.006,0.055],[-0.225,0.45-i*0.018,0.005+i*0.043],cream);p.rotation.x=0.35+i*0.08;if(i%2===0)s.box([0.053,0.003,0.003],[-0.225,0.455-i*0.018,0.013+i*0.043],dark);}}
    if(a.priceStand){s.rod([0.21,0.18,-0.18],[0.21,0.7,-0.18],0.019,silver);s.box([0.23,0.095,0.055],[0.21,0.75,-0.18],dark);s.label('4.95',0.19,0.057,[0.21,0.75,-0.147],'#b4d2a4','#344839');}
    if(a.bell){s.cylinder(0.067,0.075,0.015,[0.43,0.014,0.09],dark);s.ball([0.063,0.038,0.063],[0.43,0.045,0.09],silver);s.cylinder(0.01,0.01,0.014,[0.43,0.089,0.09],body);}
    return s.finish();
  },
});
