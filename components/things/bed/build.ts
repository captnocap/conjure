import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    type: choice('What kind of bed is it?', {single:'A narrow single bed.', double:'A broad double bed.', bunk:'Two simple bunk beds in one timber frame.'}),
    frame: choice('What is the frame made from?', {wood:'Honey-coloured wood.', iron:'White painted iron with curved rails.', low:'A low upholstered platform.'}),
    blanket: choice('What kind of blanket covers it?', {plain:'Plain sage bedding.', patchwork:'A patchwork quilt of muted colours.', stripes:'Blue and cream striped bedding.'}),
    making: choice('How is it made?', {neat:'Neatly made with straight blanket edges.', folded:'Blanket folded back at the foot.', rumpled:'Loose bedding after someone got up.'}),
    headboard: choice('What shape is the headboard?', {solid:'A solid timber panel.', slats:'Vertical open slats.', arc:'A curved iron head rail.'}),
    keepsake: choice('What lies beside the pillow?', {none:'No personal object.', book:'An open bedtime book.', bear:'A little stuffed bear.', headphones:'A pair of headphones.'}),
    shoes: noul('Are a pair of slippers tucked beneath the bed?'),
    length: score('How long is the bed?', ['A short child-sized bed', 'A generous adult bed']),
  },
  build(a, context) {

    const s=new Sculpture(context),w=a.type==='double'?1.58:0.92,l=1.55+a.length*0.6,wood=s.material(a.frame==='iron'?'#d8d8c3':a.frame==='low'?'#9d9c8a':'#a98e60'),sheet=s.material('#e1ddc6'),cover=s.material(a.blanket==='plain'?'#879e8a':'#7f99a7'),dark=s.material('#6b6b54');
    const levels=a.type==='bunk'?2:1;
    for(let level=0;level<levels;level++){const y=(a.frame==='low'?0.18:0.3)+level*1.2;s.box([w,0.14,l],[0,y,0],wood);s.box([w-0.07,0.19,l-0.05],[0,y+0.165,0],sheet);for(let i=0;i<(a.type==='double'?2:1);i++)s.ball([a.type==='double'?0.31:0.32,0.066,0.18],[(i-(a.type==='double'?0.5:0))*0.67,y+0.31,-l*0.36],sheet,16);
      const z=a.making==='folded'?l*0.2:l*0.09,cl=a.making==='folded'?l*0.48:l*0.7;s.box([w-0.09,0.036,cl],[0,y+0.29,z],cover);
      if(a.blanket==='patchwork')for(let x=0;x<5;x++)for(let j=0;j<5;j++)s.box([(w-0.1)/5,0.007,cl/5],[(x-2)*(w-0.1)/5,y+0.313,z+(j-2)*cl/5],s.material(['#9eaa91','#bd987d','#a9a889','#74928d'][(x+j)%4]));
      if(a.blanket==='stripes')for(let j=0;j<8;j++)s.box([w-0.1,0.006,cl*0.043],[0,y+0.314,z-cl/2+j*cl/7],sheet);
      if(a.making==='rumpled')for(let i=0;i<6;i++)s.ball([w*0.31,0.035,0.11],[(context.random()-0.5)*w*0.32,y+0.32,z+(i-2.5)*cl/6],cover,12);
      for(const x of [-w/2,w/2])for(const zz of [-l/2,l/2])s.rod([x,0.03,zz],[x,y+0.11+(zz<0?0.59:0.12),zz],0.034,wood);
      if(a.headboard==='solid')s.box([w,0.55,0.06],[0,y+0.45,-l/2],wood);else if(a.headboard==='slats'){for(let i=0;i<7;i++)s.box([0.045,0.53,0.04],[(i-3)*w/7,y+0.43,-l/2],wood);}else{s.tube([[-w/2,y+0.39,-l/2],[-w/2,y+0.7,-l/2],[0,y+0.82,-l/2],[w/2,y+0.7,-l/2],[w/2,y+0.39,-l/2]],0.022,wood);}
    }
    if(a.type==='bunk'){for(const x of [w/2+0.04,w/2+0.35])s.rod([x,0.05,l*0.28],[x,1.62,l*0.28],0.019,wood);for(let i=0;i<6;i++)s.rod([w/2+0.04,0.2+i*0.25,l*0.28],[w/2+0.35,0.2+i*0.25,l*0.28],0.016,wood);for(const x of [-w/2,w/2])s.rod([x,1.78,-l*0.39],[x,1.78,l*0.39],0.018,wood);}
    const ky=a.frame==='low'?0.52:0.64;
    if(a.keepsake==='book'){s.box([0.23,0.011,0.17],[w*0.21,ky,-l*0.29],sheet);s.box([0.005,0.015,0.17],[w*0.21,ky+0.003,-l*0.29],dark);}
    if(a.keepsake==='bear'){const mat=s.material('#a78d62');s.ball([0.08,0.09,0.065],[w*0.2,ky+0.07,-l*0.29],mat,12);s.ball([0.063,0.057,0.053],[w*0.2,ky+0.19,-l*0.29],mat,12);for(const dx of [-0.045,0.045])s.ball([0.023,0.022,0.02],[w*0.2+dx,ky+0.235,-l*0.29],mat,10);}
    if(a.keepsake==='headphones'){s.ring(0.067,0.01,[w*0.2,ky,-l*0.29],dark,Math.PI).rotation.x=Math.PI/2;for(const x of [w*0.2-0.067,w*0.2+0.067])s.ball([0.026,0.014,0.032],[x,ky,-l*0.29],dark,12);}
    if(a.shoes)for(const x of [-0.09,0.09])s.ball([0.052,0.034,0.12],[x,0.043,l*0.36],s.material('#9f9a81'),12);
    return s.finish();
  },
});
