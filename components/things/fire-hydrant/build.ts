import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    style: choice('What form is the hydrant?', {classic:'A stout traditional hydrant with a rounded crown.', tall:'A tall narrow European standpipe.', industrial:'A wide industrial hydrant with four outlets.'}),
    paint: choice('What colour is its body?', {red:'Deep red body.', yellow:'Ochre yellow body.', silver:'Bare galvanized silver.'}),
    crown: choice('What colour is the bonnet?', {same:'The same colour as the body.', blue:'A blue bonnet marking high flow.', green:'A green bonnet.', white:'A bright white bonnet.'}),
    outlet: choice('What is happening at the main outlet?', {capped:'The outlet is firmly capped.', uncapped:'The main cap is removed and lies at the base.', hose:'A thick fire hose is connected.'}),
    chain: noul('Are the caps secured with little chains?'),
    puddle: noul('Is a shallow puddle spreading beneath it?'),
    marker: noul('Does a tall reflective snow marker stand beside it?'),
    height: score('How tall is this hydrant?', ['A squat curbside hydrant', 'A tall prominent standpipe']),
  },
  build(a, context) {

    const s=new Sculpture(context),h=0.7+a.height*0.4,r=a.style==='tall'?0.095:a.style==='industrial'?0.17:0.14,color={red:'#a7473c',yellow:'#b9a54e',silver:'#acb6ac'}[a.paint],body=s.material(color,{metalness:0.5}),top=s.material(a.crown==='same'?color:{blue:'#557d9b',green:'#4b775a',white:'#e3dfc4'}[a.crown],{metalness:0.45}),dark=s.material('#4c5144'),steel=s.material('#a7b2a7',{metalness:0.7});
    s.cylinder(r*1.55,r*1.65,0.07,[0,0.04,0],body);s.cylinder(r,r*1.15,h-0.17,[0,(h-0.17)/2+0.08,0],body);s.cylinder(r*1.2,r*1.2,0.06,[0,h-0.13,0],top);s.ball([r*1.18,0.13,r*1.18],[0,h-0.06,0],top);s.cylinder(0.026,0.035,0.052,[0,h+0.07,0],dark,6);
    for(const x of [-r*1.7,r*1.7]){s.rod([0,h*0.59,0],[x,h*0.59,0],r*0.51,body);s.cylinder(r*0.66,r*0.66,0.045,[x,h*0.59,0],top,12).rotation.z=Math.PI/2;s.cylinder(0.023,0.023,0.064,[x*1.07,h*0.59,0],dark,6).rotation.z=Math.PI/2;}
    s.rod([0,h*0.46,0],[0,h*0.46,r*1.7],r*0.65,body);s.ring(r*0.69,0.015,[0,h*0.46,r*1.7],steel);
    if(a.outlet==='capped'){s.cylinder(r*0.7,r*0.7,0.053,[0,h*0.46,r*1.75],top,12).rotation.x=Math.PI/2;s.cylinder(0.025,0.025,0.079,[0,h*0.46,r*1.91],dark,6).rotation.x=Math.PI/2;}else{s.ball([r*0.55,r*0.55,0.008],[0,h*0.46,r*1.72],dark);s.cylinder(r*0.7,r*0.7,0.047,[0.28,0.043,0.17],top,12);}
    if(a.style==='industrial')s.rod([0,h*0.64,0],[0,h*0.64,-r*1.6],r*0.48,body);
    if(a.chain)for(const side of [-1,1])for(let i=0;i<10;i++){const t=i/9;s.ring(0.013,0.003,[side*r*(1.7-t),h*0.59-0.12*Math.sin(t*Math.PI),r*t],steel).rotation.y=i%2?Math.PI/2:0;}
    if(a.outlet==='hose'){s.tube([[0,h*0.46,r*1.83],[0,h*0.39,0.45],[0.1,0.08,0.7],[0.45,0.055,0.81],[0.7,0.055,0.54],[0.55,0.055,0.22]],0.048,s.material('#c1b18b'));s.rod([0.55,0.055,0.22],[0.45,0.055,0.13],0.055,steel);}
    if(a.puddle){const water=s.material('#84a5aa',{metalness:0.15,roughness:0.25});s.ball([0.48,0.005,0.34],[0.09,0.006,0.18],water,24);}
    if(a.marker){s.rod([-0.29,0,-0.15],[-0.29,h+0.6,-0.15],0.012,steel);for(let i=0;i<4;i++)s.cylinder(0.016,0.016,0.13,[-0.29,h+0.07+i*0.13,-0.15],i%2?top:body,10);}
    for(let i=0;i<8;i++)if(context.random()<context.mood.wear)s.box([0.019,0.033,0.003],[(context.random()-0.5)*r,h*0.12+context.random()*h*0.55,r+0.002],s.material('#96714c'));
    return s.finish();
  },
});
