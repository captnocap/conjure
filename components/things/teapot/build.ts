import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    body: choice('What kind of teapot is it?', {round:'A round ceramic teapot.', castiron:'A squat ridged cast-iron pot.', glass:'A clear glass pot showing dark tea.'}),
    colour: choice('What colour is the pot?', {cream:'Cream porcelain.', blue:'Cobalt blue glaze.', clay:'Unglazed terracotta.', green:'Moss green glaze.'}),
    pattern: choice('What decoration is on its body?', {plain:'A plain undecorated body.', stripe:'A broad ivory horizontal band.', flowers:'A small painted floral motif.'}),
    lid: choice('Where is the lid?', {closed:'Resting on top of the teapot.', tilted:'Tilted open a little.', beside:'Set down beside the pot.'}),
    handle: choice('What kind of handle does it have?', {side:'A curved ceramic side handle.', arch:'A carrying arch over the top.', bamboo:'A bamboo-wrapped upper handle.'}),
    cup: choice('What cup waits beside it?', {none:'No cup.', saucer:'A teacup on an ivory saucer.', mugs:'Two sturdy mugs.'}),
    accessory: choice('What accompanies the tea?', {none:'Nothing else.', lemon:'A lemon wedge and a tiny spoon.', sugar:'A small covered sugar bowl.', biscuits:'Two biscuits on a side plate.'}),
    size: score('How generous is the teapot?', ['A little pot for one cup', 'A family pot for several cups']),
  },
  build(a, context) {

    const s=new Sculpture(context),r=0.085+a.size*0.055,color={cream:'#ded7bd',blue:'#4f7695',clay:'#b57950',green:'#728465'}[a.colour],body=s.material(a.body==='castiron'?'#495f50':a.body==='glass'?'#a1b8ad':color,{metalness:a.body==='castiron'?0.55:0,transparent:a.body==='glass',opacity:a.body==='glass'?0.42:1,roughness:0.35}),cream=s.material('#e4dcc0'),dark=s.material('#52644f');
    s.lathe([[r*0.55,0],[r*0.88,0.022],[r,0.06],[r*0.97,0.14],[r*0.58,0.19],[r*0.56,0.198]],body);
    if(a.body==='glass')s.lathe([[r*0.6,0.023],[r*0.83,0.04],[r*0.86,0.1],[r*0.72,0.15]],s.material('#986b3e'));
    if(a.body==='castiron')for(let i=0;i<5;i++)s.ring(r*0.97-i*0.004,0.002,[0,0.075+i*0.02,0],dark).rotation.x=Math.PI/2;
    s.tube([[0,0.08,r*0.76],[0,0.13,r*1.3],[0,0.21,r*1.9]],0.021,body);s.ring(0.019,0.004,[0,0.21,r*1.9],cream).rotation.x=-0.48;
    if(a.handle==='side')s.tube([[0,0.04,-r*0.8],[0,0.06,-r*1.56],[0,0.16,-r*1.5],[0,0.18,-r*0.76]],0.017,body);else s.tube([[-r*0.8,0.13,0],[-r,0.27,0],[0,0.33,0],[r,0.27,0],[r*0.8,0.13,0]],0.012,a.handle==='bamboo'?s.material('#b8a36d'):body);
    const ly=a.lid==='beside'?0.025:0.207,lx=a.lid==='beside'?r*2.1:0,lz=a.lid==='beside'?-0.04:0;const lid=s.cylinder(r*0.6,r*0.65,0.015,[lx,ly,lz],body,24);if(a.lid==='tilted')lid.rotation.z=0.22;s.ball([0.018,0.014,0.018],[lx,ly+0.024,lz],body,12);
    if(a.pattern==='stripe')s.ring(r*0.984,0.006,[0,0.11,0],cream).rotation.x=Math.PI/2;
    if(a.pattern==='flowers')for(let i=0;i<5;i++){const x=(i-2)*r*0.24;s.ball([0.008,0.007,0.002],[x,0.11+(i%2)*0.013,r*0.966],s.material('#a58574'),10);}
    if(a.cup!=='none')for(let i=0;i<(a.cup==='mugs'?2:1);i++){const x=-r*2.3-i*0.12,z=0.04;s.cylinder(0.064,0.061,0.009,[x,0.008,z],cream,24);s.lathe([[0.032,0],[0.035,0.02],[0.043,0.067],[0.04,0.07]],cream,[x,0.014,z]);s.ring(0.019,0.005,[x+0.048,0.055,z],cream).rotation.y=Math.PI/2;s.cylinder(0.035,0.035,0.003,[x,0.072,z],s.material('#996e41'),20);}
    if(a.accessory==='lemon'){s.cylinder(0.031,0.031,0.019,[r*1.9,0.021,0.14],s.material('#d6be61'),3);s.rod([r*1.4,0.006,0.18],[r*2.2,0.006,0.21],0.003,dark);}
    if(a.accessory==='sugar'){s.ball([0.048,0.037,0.048],[r*1.7,0.048,0.14],cream,16);s.cylinder(0.04,0.05,0.012,[r*1.7,0.087,0.14],cream,20);}
    if(a.accessory==='biscuits'){s.cylinder(0.071,0.06,0.008,[r*1.7,0.008,0.17],cream,24);for(let i=0;i<2;i++){const x=r*1.7+(i-0.5)*0.045;s.cylinder(0.025,0.025,0.01,[x,0.019,0.17],s.material('#b69760'),12);for(let j=0;j<3;j++)s.ball([0.0025,0.001,0.0025],[x+(context.random()-0.5)*0.035,0.025,0.17+(context.random()-0.5)*0.035],dark,6);}}
    return s.finish();
  },
});
