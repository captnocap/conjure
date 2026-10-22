import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    form: choice('What is the sofa shape?', {loveseat:'A small two-seat sofa.', sectional:'A sofa with a chaise section on one side.', chester:'A rolled-arm buttoned Chesterfield.'}),
    fabric: choice('What covers the sofa?', {velvet:'Muted moss velvet.', linen:'Pale oatmeal linen.', leather:'Warm tan leather.', rose:'Dusty rose woven cloth.'}),
    legs: choice('What are its legs like?', {wood:'Short tapered timber feet.', metal:'Slender dark metal legs.', floor:'A low continuous plinth.'}),
    cushions: choice('What cushions are arranged on it?', {none:'No loose cushions.', pair:'A pair of plain contrasting cushions.', mixed:'Three mixed-pattern pillows.'}),
    blanket: choice('Where is the blanket?', {none:'No blanket.', arm:'A knitted blanket draped over one arm.', seat:'A rumpled blanket spread across one seat.'}),
    belongings: choice('What has been left on the sofa?', {none:'Nothing.', books:'Two books and a reading pair of glasses.', remote:'A television remote and headphones.', cat:'A small curled sleeping cat.'}),
    buttons: noul('Does the upholstery have rows of tufted buttons?'),
    length: score('How broad is the sofa?', ['An intimate two-person sofa', 'A broad sofa for four people']),
  },
  build(a, context) {

    const s=new Sculpture(context),w=1.45+a.length*1.2,col={velvet:'#718265',linen:'#cfc4a6',leather:'#a67a53',rose:'#b29187'}[a.fabric],cloth=s.material(col,{roughness:a.fabric==='leather'?0.5:0.95}),dark=s.material('#584e3c'),pillow=s.material(a.fabric==='linen'?'#859c91':'#d1bd8f');
    if(a.legs==='floor')s.box([w*0.88,0.13,0.76],[0,0.075,0],dark);else for(const x of [-w*0.39,w*0.39])for(const z of [-0.3,0.3])s.rod([x,0.015,z],[x,0.24,z],a.legs==='wood'?0.037:0.015,a.legs==='wood'?dark:s.material('#57695d',{metalness:0.6}));
    s.box([w,0.23,0.83],[0,0.31,0],cloth);s.box([w,0.57,0.2],[0,0.6,-0.32],cloth);for(const x of [-w/2+0.11,w/2-0.11]){s.box([0.24,0.36,0.85],[x,0.56,0],cloth);if(a.form==='chester')s.cylinder(0.15,0.15,0.78,[x,0.73,0],cloth,24).rotation.x=Math.PI/2;}
    const seats=a.form==='loveseat'?2:3;for(let i=0;i<seats;i++)s.box([(w-0.48)/seats-0.015,0.15,0.64],[(i-(seats-1)/2)*(w-0.48)/seats,0.475,0.045],cloth);
    if(a.form==='sectional'){s.box([w*0.35,0.23,0.55],[w*0.27,0.32,0.61],cloth);s.box([w*0.35,0.14,0.74],[w*0.27,0.475,0.5],cloth);}
    if(a.buttons||a.form==='chester')for(let row=0;row<2;row++)for(let coln=0;coln<10;coln++)s.ball([0.012,0.012,0.006],[-w*0.39+coln*w*0.78/9,0.58+row*0.17,-0.214],dark,8);
    if(a.cushions!=='none')for(let i=0;i<(a.cushions==='pair'?2:3);i++){const x=a.cushions==='pair'?(i?1:-1)*w*0.31:(i-1)*w*0.28;const c=s.box([0.29,0.31,0.1],[x,0.64,-0.105],i%2?cloth:pillow);c.rotation.z=(context.random()-0.5)*0.35;c.rotation.x=-0.14;if(a.cushions==='mixed')for(let j=0;j<3;j++)s.box([0.27,0.011,0.006],[x,0.55+j*0.08,-0.045],dark);}
    if(a.blanket!=='none'){const mat=s.material('#9b9f8a'),x=a.blanket==='arm'?-w/2+0.1:0,y=a.blanket==='arm'?0.72:0.56;for(let i=0;i<7;i++)s.box([0.36,0.023,0.12],[x,y-Math.max(0,i-3)*0.075,-0.12+i*0.1],mat);}
    if(a.belongings==='books'){s.box([0.2,0.035,0.27],[-0.1,0.57,0.15],dark);s.box([0.19,0.028,0.23],[-0.08,0.6,0.16],pillow);for(const x of [-0.045,0.04])s.ring(0.025,0.003,[x,0.624,0.15],dark).rotation.x=Math.PI/2;}
    if(a.belongings==='remote'){s.box([0.046,0.019,0.14],[0.14,0.57,0.13],dark);for(let i=0;i<4;i++)s.ball([0.004,0.003,0.004],[0.14,0.58,0.08+i*0.02],pillow,8);s.ring(0.08,0.009,[-0.13,0.57,0.18],dark,Math.PI).rotation.x=Math.PI/2;}
    if(a.belongings==='cat'){const cat=s.material('#9a8d73');s.ball([0.16,0.065,0.12],[0.1,0.61,0.14],cat,16);s.ball([0.055,0.042,0.052],[-0.04,0.64,0.18],cat,12);for(const x of [-0.065,-0.02])s.cylinder(0,0.017,0.035,[x,0.68,0.18],cat,3);s.tube([[0.22,0.6,0.15],[0.24,0.6,0.24],[0.1,0.6,0.25]],0.023,cat);}
    return s.finish();
  },
});
