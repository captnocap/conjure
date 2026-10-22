import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    construction: choice('What kind of bench is it?', {slats:'Timber slats on ornate iron legs.', tubular:'Painted tubular steel with wire seat.', concrete:'A massive concrete base with a wooden seat.'}),
    wood: choice('What is the seat finish?', {honey:'Honey-coloured timber.', dark:'Dark walnut timber.', painted:'Sage green painted boards.'}),
    back: choice('What kind of back does it have?', {high:'A tall slatted back.', low:'A low back rail.', none:'A backless promenade bench.'}),
    armrests: choice('How are its armrests arranged?', {ends:'An armrest at each end.', middle:'End armrests plus one in the middle.', none:'No armrests.'}),
    keepsake: choice('What has been left on the bench?', {none:'Nothing; the bench waits.', newspaper:'A folded newspaper.', scarf:'A knitted scarf.', flowers:'A small bouquet tied with string.'}),
    plaque: noul('Is there a little memorial plaque on its back?'),
    bird: noul('Is a small pigeon perched at one end?'),
    length: score('How long is the bench?', ['Two seats close together', 'A long bench for five people']),
  },
  build(a, context) {

    const s=new Sculpture(context),w=1.35+a.length*1.2,wood=s.material({honey:'#ae9061',dark:'#765d45',painted:'#7d9986'}[a.wood]),iron=s.material('#445b50',{metalness:0.6}),concrete=s.material('#b7b6a5');
    for(const x of [-w*0.39,w*0.39]){if(a.construction==='concrete')s.box([0.23,0.46,0.52],[x,0.23,0],concrete);else{s.rod([x,0.02,-0.19],[x,0.47,-0.14],0.025,iron);s.rod([x,0.02,0.23],[x,0.47,0.16],0.025,iron);s.rod([x,0.34,-0.19],[x,0.34,0.23],0.024,iron);if(a.construction==='slats')s.ring(0.105,0.011,[x,0.22,0.02],iron).rotation.y=Math.PI/2;}}
    const mat=a.construction==='tubular'?iron:wood;for(let i=0;i<5;i++)s.box([w,0.047,0.078],[0,0.47,-0.17+i*0.087],mat);
    if(a.back!=='none'){const h=a.back==='high'?0.5:0.24;for(const x of [-w*0.4,w*0.4])s.rod([x,0.35,-0.21],[x,0.5+h,-0.28],0.023,iron);for(let i=0;i<(a.back==='high'?4:2);i++){const slat=s.box([w,0.082,0.046],[0,0.59+i*0.107,-0.245-i*0.015],mat);slat.rotation.x=-0.1;}}
    if(a.armrests!=='none')for(const x of a.armrests==='middle'?[-w/2+0.04,0,w/2-0.04]:[-w/2+0.04,w/2-0.04]){s.tube([[x,0.47,0.18],[x,0.67,0.18],[x,0.72,0.07],[x,0.72,-0.2],[x,0.53,-0.24]],0.02,iron);}
    if(a.keepsake==='newspaper'){s.box([0.27,0.017,0.2],[-w*0.2,0.506,0.02],s.material('#dedac6'));for(let i=0;i<4;i++)s.box([0.22,0.002,0.005],[-w*0.2,0.516,-0.04+i*0.025],iron);}
    if(a.keepsake==='scarf'){const mat=s.material('#af726a');for(let i=0;i<7;i++)s.box([0.15,0.018,0.084],[w*0.17,0.51-(i>3?(i-3)*0.05:0),-0.1+i*0.07],mat);for(let i=0;i<5;i++)s.rod([w*0.17-0.06+i*0.03,0.35,0.39],[w*0.17-0.06+i*0.03,0.3,0.4],0.004,mat);}
    if(a.keepsake==='flowers'){for(let i=0;i<6;i++){const x=-w*0.18+(context.random()-0.5)*0.13;s.rod([x,0.515,0.09],[x+0.06,0.53,-0.16],0.004,s.material('#63816c'));s.ball([0.032,0.021,0.032],[x+0.06,0.54,-0.16],s.material(i%2?'#cba59a':'#d9c49c'),10);}}
    if(a.plaque&&a.back!=='none')s.label('FOR ALL WHO WAIT',0.36,0.095,[0,a.back==='high'?0.81:0.67,-0.216],'#5c583e','#b7a979');
    if(a.bird){const x=w*0.36;s.ball([0.06,0.07,0.095],[x,0.59,0.03],s.material('#85908d'),12);s.ball([0.035,0.04,0.034],[x,0.68,0.085],iron,12);s.rod([x,0.67,0.11],[x,0.665,0.15],0.01,s.material('#b79b61'));for(const dx of [-0.018,0.018])s.rod([x+dx,0.54,0.04],[x+dx,0.5,0.06],0.004,s.material('#a17a66'));}
    for(let i=0;i<12;i++){const x=(context.random()-0.5)*w;s.box([0.009,0.002,0.028],[x,0.496,-0.17+(i%5)*0.087],iron);}
    return s.finish();
  },
});
