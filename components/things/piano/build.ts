import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    form: choice('What kind of piano is it?', {upright:'A timber upright piano against the wall.', grand:'A small grand piano with a curved body.', electric:'A slim electric piano on a metal stand.'}),
    finish: choice('What is its finish?', {black:'Polished black.', walnut:'Warm walnut.', white:'Cream white lacquer.'}),
    lid: choice('What is the lid doing?', {closed:'Closed over the instrument body.', half:'Raised halfway on a prop.', open:'Open wide to expose strings or action.'}),
    keyboard: choice('How is the keyboard cover positioned?', {open:'Open, all the keys visible.', partial:'Partly closed over the left keys.', closed:'Closed over the keyboard.'}),
    music: choice('What is on the music stand?', {none:'An empty music stand.', score:'Two pages of printed music.', note:'A handwritten unfinished melody.'}),
    bench: noul('Is a little upholstered piano bench included?'),
    keepsake: choice('What rests on the piano?', {none:'No ornament.', flowers:'A little vase of flowers.', photograph:'A framed photograph.', metronome:'A wooden pyramid metronome.'}),
    width: score('How broad is the instrument?', ['A modest compact instrument', 'A full concert-width keyboard']),
  },
  build(a, context) {

    const s=new Sculpture(context),w=1.15+a.width*0.47,color={black:'#313d35',walnut:'#95744d',white:'#ddd5bb'}[a.finish],body=s.material(color,{roughness:0.35}),dark=s.material('#2f3931'),ivory=s.material('#e5dfca'),brass=s.material('#b9a56d',{metalness:0.7});
    if(a.form==='upright'){s.box([w,1.12,0.42],[0,0.64,-0.21],body);s.box([w+0.06,0.08,0.6],[0,1.24,-0.13],body);s.box([w,0.12,0.57],[0,0.72,0.07],body);}
    else if(a.form==='grand'){s.box([w,0.26,0.88],[0,0.86,-0.13],body);s.ball([w*0.48,0.13,0.44],[0,0.86,-0.55],body,24);for(const p of [[-w*0.38,0.4,0.16],[w*0.38,0.4,0.16],[0,0.4,-0.78]] as const)s.cylinder(0.032,0.058,0.79,p,body,16);}
    else{s.box([w,0.13,0.31],[0,0.83,0],body);for(const x of [-w*0.37,w*0.37]){s.rod([x,0.02,-0.17],[x,0.76,0.17],0.025,dark);s.rod([x,0.02,0.17],[x,0.76,-0.17],0.025,dark);}}
    const ky=a.form==='upright'?0.805:a.form==='grand'?0.98:0.902,kz=a.form==='grand'?0.37:a.form==='upright'?0.27:0.05,n=35;
    for(let i=0;i<n;i++){const x=(i-(n-1)/2)*w*0.9/n;s.box([w*0.9/n-0.002,0.014,0.16],[x,ky,kz],ivory);if(![2,6].includes(i%7))s.box([w*0.5/n,0.021,0.095],[x+w*0.45/n,ky+0.016,kz-0.035],dark);}
    if(a.keyboard!=='open')s.box([a.keyboard==='closed'?w*0.94:w*0.47,0.03,0.17],[a.keyboard==='closed'?0:-w*0.23,ky+0.03,kz],body);
    if(a.form==='grand'&&a.lid!=='closed'){const angle=a.lid==='open'?0.62:0.3;const lid=s.box([w,0.028,1.14],[0,1.08,-0.24],body);lid.rotation.z=angle;s.rod([-w*0.32,0.99,-0.35],[-w*0.32,1.08+w*0.32*Math.sin(angle),-0.35],0.012,brass);for(let i=0;i<15;i++)s.rod([-w*0.3+i*w*0.04,1.005,-0.73],[-w*0.3+i*w*0.04,1.005,0.1],0.002,brass);}
    if(a.form==='upright'&&a.lid!=='closed'){const top=s.box([w,0.022,0.42],[0,1.35,-0.14],body);top.rotation.x=a.lid==='open'?0.6:0.3;}
    s.box([0.52,0.31,0.022],[0,ky+0.25,kz-0.16],body);if(a.music!=='none'){s.box([0.43,0.27,0.006],[0,ky+0.25,kz-0.144],ivory);for(let row=0;row<10;row++)s.box([0.39,0.002,0.003],[0,ky+0.35-row*0.021,kz-0.139],dark);for(let i=0;i<12;i++)s.ball([0.009,0.005,0.003],[(context.random()-0.5)*0.33,ky+0.15+context.random()*0.19,kz-0.135],dark,8);}
    if(a.bench){s.box([0.66,0.065,0.37],[0,0.49,kz+0.68],dark);for(const x of [-0.25,0.25])for(const z of [kz+0.54,kz+0.82])s.rod([x,0,z],[x,0.45,z],0.021,body);}
    for(const x of [-0.08,0,0.08])s.rod([x,0.13,0.13],[x,0.08,0.37],0.014,brass);
    const oy=a.form==='upright'?1.31:1.04;
    if(a.keepsake==='flowers'){s.lathe([[0.05,0],[0.04,0.1],[0.027,0.17]],brass,[w*0.31,oy,-0.12]);for(let i=0;i<4;i++){const x=w*0.31+(i-1.5)*0.035;s.rod([x,oy+0.1,-0.12],[x,oy+0.29,-0.12],0.003,s.material('#73896d'));s.ball([0.025,0.022,0.025],[x,oy+0.29,-0.12],s.material('#b98d7b'),10);}}
    if(a.keepsake==='photograph'){s.box([0.17,0.22,0.026],[w*0.3,oy+0.12,-0.12],brass);s.box([0.13,0.17,0.004],[w*0.3,oy+0.12,-0.103],s.material('#9baf9c'));}
    if(a.keepsake==='metronome'){s.cylinder(0.015,0.075,0.24,[w*0.3,oy+0.12,-0.1],s.material('#ac8f60'),4).rotation.y=Math.PI/4;s.rod([w*0.3,oy+0.035,-0.025],[w*0.3+0.025,oy+0.21,-0.025],0.004,brass);}
    return s.finish();
  },
});
