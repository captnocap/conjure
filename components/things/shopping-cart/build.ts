import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    type: choice('What form is the trolley?', {standard:'A full-size deep wire shopping cart.', compact:'A narrow city grocery cart.', flatbed:'A low warehouse flatbed trolley.'}),
    handle: choice('What colour is the handle?', {red:'Red plastic grip.', blue:'Blue plastic grip.', green:'Green plastic grip.'}),
    contents: choice('What fills the cart?', {groceries:'Paper grocery bags, boxes and bottles.', empty:'An entirely empty wire basket.', belongings:'Blanket, suitcase and rolled bedding.', plants:'Potted plants and a bag of soil.'}),
    seat: noul('Is the fold-out child seat deployed?'),
    chain: noul('Does the handle carry a coin-lock chain?'),
    stray: noul('Is a stray wrapper caught on the lower rack?'),
    wheels: choice('What kind of wheel arrangement does it have?', {four:'Four small swivelling black casters.', chunky:'Four rugged rubber wheels.', wonky:'One front caster turned sharply sideways.'}),
    basketDepth: score('How deep is the main basket?', ['A shallow basket', 'A deep basket for a big grocery shop']),
  },
  build(a, context) {

    const s=new Sculpture(context),steel=s.material('#a6b4af',{metalness:0.8}),rubber=s.material('#3d4440'),plastic=s.material({red:'#b85243',blue:'#4d779b',green:'#5b8561'}[a.handle]),paper=s.material('#c5ac7c');
    const w=a.type==='compact'?0.43:0.64,l=a.type==='flatbed'?1.1:0.91,top=a.type==='flatbed'?0.4:0.77+a.basketDepth*0.26,bottom=a.type==='flatbed'?0.2:0.5;
    for(const x of [-w/2,w/2])for(const z of [-l/2,l/2]){const radius=a.wheels==='chunky'?0.095:0.067;const wheel=s.cylinder(radius,radius,0.044,[x,0.1,z],rubber,16);wheel.rotation.z=Math.PI/2;if(a.wheels==='wonky'&&z>0&&x>0)wheel.rotateX(Math.PI/2);s.rod([x,0.13,z],[x,0.21,z],0.015,steel);}
    for(const x of [-w/2,w/2]){s.rod([x,0.24,-l/2],[x,0.24,l/2],0.022,steel);s.rod([x,0.24,-l/2],[x,top+0.18,-l/2-0.08],0.024,steel);}
    s.rod([-w/2,top+0.18,-l/2-0.08],[w/2,top+0.18,-l/2-0.08],0.028,plastic);
    for(let j=0;j<8;j++)s.rod([-w/2,0.26,-l/2+j*l/7],[w/2,0.26,-l/2+j*l/7],0.01,steel);
    if(a.type!=='flatbed'){for(const y of [bottom,top]){for(const x of [-w/2,w/2])s.rod([x,y,-l/2],[x,y,l/2],0.015,steel);for(const z of [-l/2,l/2])s.rod([-w/2,y,z],[w/2,y,z],0.015,steel);}for(let i=0;i<9;i++){const z=-l/2+i*l/8;for(const x of [-w/2,w/2])s.rod([x,bottom,z],[x,top,z],0.007,steel);s.rod([-w/2,bottom,z],[w/2,bottom,z],0.008,steel);}for(let i=0;i<7;i++)for(const z of [-l/2,l/2])s.rod([-w/2+i*w/6,bottom,z],[-w/2+i*w/6,top,z],0.007,steel);for(let j=1;j<4;j++)for(const x of [-w/2,w/2])s.rod([x,bottom+j*(top-bottom)/4,-l/2],[x,bottom+j*(top-bottom)/4,l/2],0.006,steel);}
    if(a.seat&&a.type!=='flatbed'){s.box([w*0.7,0.025,0.18],[0,top-0.17,-l*0.31],plastic);s.rod([-w*0.35,top-0.17,-l*0.22],[-w*0.35,top,-l*0.22],0.008,steel);s.rod([w*0.35,top-0.17,-l*0.22],[w*0.35,top,-l*0.22],0.008,steel);}
    const y=a.type==='flatbed'?0.29:bottom+0.02;
    if(a.contents==='groceries'){for(let i=0;i<3;i++){const x=(i-1)*w*0.24,z=(context.random()-0.5)*l*0.4,h=0.24+context.random()*0.16;s.box([0.17,h,0.2],[x,y+h/2,z],paper);s.tube([[x-0.04,y+h,z],[x-0.03,y+h+0.08,z],[x+0.03,y+h+0.08,z],[x+0.04,y+h,z]],0.006,paper);}s.cylinder(0.035,0.045,0.28,[w*0.3,y+0.14,l*0.29],s.material('#638971'),12);}
    if(a.contents==='belongings'){s.box([w*0.66,0.28,l*0.52],[0,y+0.14,0.1],s.material('#8e6b53'));s.cylinder(0.105,0.105,w*0.9,[0,y+0.34,-0.14],s.material('#71837e')).rotation.z=Math.PI/2;s.box([w*0.82,0.055,0.43],[0,y+0.32,0.12],s.material('#b5b097'));}
    if(a.contents==='plants')for(let i=0;i<3;i++){const x=(i-1)*w*0.25;s.cylinder(0.065,0.04,0.12,[x,y+0.06,0],s.material('#b66d4a'),12);for(let j=0;j<4;j++)s.ball([0.035,0.12,0.04],[x+(context.random()-0.5)*0.08,y+0.2,0],s.material('#618367'),12);}
    if(a.chain)for(let i=0;i<6;i++)s.ring(0.012,0.003,[w/2+0.015,top+0.13-i*0.025,-l/2-0.08],steel).rotation.y=i%2?Math.PI/2:0;
    if(a.stray){const wrapper=s.box([0.11,0.009,0.085],[w*0.3,0.277,l*0.2],s.material('#ae785e'));wrapper.rotation.y=context.random();}
    return s.finish();
  },
});
