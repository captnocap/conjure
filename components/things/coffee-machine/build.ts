import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    kind: choice('What kind of coffee machine is it?', {espresso:'A brass-trimmed espresso machine with two group heads.', filter:'A commercial drip brewer with glass carafes.', capsule:'A compact capsule brewer with a curved shell.'}),
    finish: choice('What is the casing finish?', {steel:'Brushed stainless steel.', cream:'Cream enamel and chrome.', copper:'Warm copper with black fittings.'}),
    cups: choice('What kind of cups wait beside it?', {ceramic:'Thick ceramic mugs on saucers.', paper:'A stack of takeaway paper cups.', glass:'Clear espresso glasses.'}),
    serving: choice('What is currently being made?', {idle:'Nothing: clean cups wait under the spout.', espresso:'A small dark espresso.', latte:'A milky drink in a wide cup.'}),
    grinder: noul('Is a separate bean grinder attached beside the machine?'),
    gauge: noul('Does it carry a round pressure gauge?'),
    tray: choice('How is the drip tray arranged?', {slotted:'Parallel drainage slots.', perforated:'A grid of round perforations.', smooth:'A simple removable enamel tray.'}),
    width: score('How large is this machine?', ['A single-person compact brewer', 'A large cafe workhorse']),
  },
  build(a, context) {

    const s=new Sculpture(context),w=0.42+a.width*0.45;
    const metal=s.material({steel:'#aebbbc',cream:'#e8ddc0',copper:'#bd7950'}[a.finish],{metalness:a.finish==='cream'?0.25:0.65}),black=s.material('#303a3b'),chrome=s.material('#d1d8ce',{metalness:0.75}),cup=s.material(a.cups==='glass'?'#bdd1c8':'#f0ead8',{transparent:a.cups==='glass',opacity:a.cups==='glass'?0.65:1});
    s.box([w,0.045,0.38],[0,0.03,0],black);s.box([w,0.035,0.35],[0,0.075,0.07],chrome);
    if(a.kind==='espresso'){s.box([w,0.27,0.2],[0,0.38,-0.065],metal);s.box([w,0.3,0.1],[0,0.26,-0.12],metal);for(const x of [-w*0.24,w*0.24]){s.cylinder(0.045,0.07,0.07,[x,0.218,0.07],chrome);s.rod([x,0.19,0.08],[x,0.19,0.22],0.016,black);s.cylinder(0.011,0.011,0.04,[x,0.155,0.075],chrome,10);}s.tube([[w*0.4,0.31,0],[w*0.4,0.21,0.1],[w*0.42,0.13,0.16]],0.011,chrome);}
    else if(a.kind==='filter'){s.box([w*0.7,0.36,0.13],[0,0.26,-0.13],metal);s.box([w,0.13,0.26],[0,0.48,-0.025],metal);for(const x of [-w*0.23,w*0.23]){s.cylinder(0.075,0.05,0.13,[x,0.16,0.06],s.material('#683f2e'));s.ball([0.077,0.083,0.077],[x,0.18,0.06],s.material('#b2c9be',{transparent:true,opacity:0.37}));s.ring(0.045,0.013,[x+0.09,0.19,0.06],black).rotation.y=Math.PI/2;s.box([0.1,0.025,0.1],[x,0.275,0.06],black);}}
    else{s.ball([w*0.42,0.23,0.17],[0,0.29,-0.02],metal);s.box([w*0.55,0.25,0.14],[0,0.21,-0.13],black);s.box([0.12,0.07,0.08],[0,0.3,0.14],chrome);s.cylinder(0.008,0.012,0.03,[0,0.25,0.14],black);}
    if(a.gauge){s.cylinder(0.048,0.048,0.017,[0,0.39,0.05],chrome).rotation.x=Math.PI/2;s.label('BAR',0.071,0.04,[0,0.39,0.069]);s.rod([0,0.38,0.075],[0.023,0.404,0.075],0.002,black);}
    if(a.tray!=='smooth')for(let i=0;i<9;i++){const x=(i-4)*w*0.085;if(a.tray==='slotted')s.box([0.013,0.004,0.18],[x,0.096,0.09],black);else for(let z=0;z<4;z++)s.cylinder(0.006,0.006,0.004,[x,0.095,z*0.043],black,8);}
    const cx=a.kind==='filter'?w*0.68:0;const cy=0.13; s.cylinder(0.045,0.036,0.065,[cx,cy,0.125],cup,16);if(a.cups!=='paper')s.ring(0.024,0.007,[cx+0.052,cy,0.125],cup).rotation.y=Math.PI/2;
    if(a.serving!=='idle')s.cylinder(0.038,0.038,0.004,[cx,cy+0.034,0.125],s.material(a.serving==='latte'?'#d6b38a':'#382920'),16);
    for(let i=0;i<3;i++)s.cylinder(0.042,0.033,0.038,[w*0.6,0.06+i*0.034,-0.1],cup,16);
    if(a.grinder){s.box([0.17,0.19,0.19],[-w*0.72,0.12,-0.05],black);s.cylinder(0.077,0.05,0.18,[-w*0.72,0.29,-0.05],s.material('#b89063'));s.cylinder(0.086,0.086,0.015,[-w*0.72,0.388,-0.05],chrome);s.box([0.035,0.035,0.065],[-w*0.72,0.18,0.08],chrome);}
    for(let i=0;i<8;i++)s.ball([0.008,0.004,0.006],[(context.random()-0.5)*w,0.055,0.22+context.random()*0.1],s.material('#634a31'),8);
    return s.finish();
  },
});
