import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    frame: choice('What is the bicycle frame style?', {city:'A step-through city bicycle with upright handlebars.', road:'A triangular road frame with drop handlebars.', cargo:'A long rear-rack utility bicycle.'}),
    color: choice('What colour is the frame?', {red:'Rust red.', teal:'Sea green.', yellow:'Mustard yellow.', black:'Matte charcoal.'}),
    cargo: choice('What does the bicycle carry?', {none:'Nothing beyond its rack.', basket:'A wicker basket with a baguette and flowers.', panniers:'Two canvas panniers.', parcel:'A strapped cardboard parcel.'}),
    stand: choice('How is the bicycle standing?', {kickstand:'On its small kickstand.', leaning:'Leaning gently as if against a wall.', riding:'Upright with pedals ready to ride.'}),
    fenders: noul('Does it have curved mudguards above the wheels?'),
    lamp: noul('Does it have a small front headlamp?'),
    lock: noul('Is a U-lock clipped to the frame?'),
    wheelSize: score('How large are the wheels?', ['Small agile city wheels', 'Tall touring wheels']),
  },
  build(a, context) {

    const s=new Sculpture(context),r=0.28+a.wheelSize*0.1,zrear=a.frame==='cargo'?-0.72:-0.56,zfront=0.6,y=r+0.035;
    const frame=s.material({red:'#ac5a4b',teal:'#47877d',yellow:'#bca348',black:'#3e4643'}[a.color],{metalness:0.45}),steel=s.material('#afb8b0',{metalness:0.75}),rubber=s.material('#333b37'),seat=s.material('#6a4d35');
    for(const z of [zrear,zfront]){s.ring(r,0.023,[0,y,z],rubber).rotation.y=Math.PI/2;s.ring(r-0.022,0.008,[0,y,z],steel).rotation.y=Math.PI/2;s.cylinder(0.022,0.022,0.13,[0,y,z],steel,12).rotation.z=Math.PI/2;for(let i=0;i<16;i++){const theta=i*Math.PI/8;s.rod([0,y,z],[0,y+Math.sin(theta)*(r-0.025),z+Math.cos(theta)*(r-0.025)],0.0025,steel);}}
    const pedal=[0,y+0.04,-0.03] as const,saddle=[0,y+0.46,-0.22] as const,head=[0,y+0.47,0.45] as const;
    s.rod([0,y,zrear],pedal,0.016,frame);s.rod([0,y,zrear],saddle,0.015,frame);s.rod(pedal,saddle,0.02,frame);s.rod(pedal,[0,y+0.36,0.45],0.022,frame);s.rod(saddle,a.frame==='city'?[0,y+0.16,0.31]:head,0.022,frame);if(a.frame==='city')s.rod([0,y+0.16,0.31],head,0.022,frame);
    for(const x of [-0.045,0.045])s.rod([x,y,zfront],[x,y+0.47,0.45],0.016,frame);
    s.rod(saddle,[0,y+0.56,-0.22],0.013,steel);s.ball([0.1,0.025,0.15],[0,y+0.57,-0.24],seat);s.rod(head,[0,y+0.62,0.43],0.017,steel);
    if(a.frame==='road')s.tube([[-0.2,y+0.57,0.49],[-0.19,y+0.55,0.6],[-0.18,y+0.48,0.58],[-0.18,y+0.62,0.42],[0.18,y+0.62,0.42],[0.18,y+0.48,0.58],[0.19,y+0.55,0.6],[0.2,y+0.57,0.49]],0.014,rubber);else s.tube([[-0.24,y+0.59,0.34],[-0.2,y+0.63,0.41],[0,y+0.64,0.45],[0.2,y+0.63,0.41],[0.24,y+0.59,0.34]],0.014,steel);
    s.ring(0.073,0.01,[0.052,pedal[1],pedal[2]],steel).rotation.y=Math.PI/2;s.rod([0.07,pedal[1],pedal[2]],[0.07,pedal[1]-0.08,pedal[2]+0.04],0.012,steel);s.box([0.13,0.03,0.07],[0.1,pedal[1]-0.08,pedal[2]+0.04],rubber);s.rod([-0.05,pedal[1],pedal[2]],[-0.05,pedal[1]+0.08,pedal[2]-0.04],0.012,steel);s.box([0.13,0.03,0.07],[-0.1,pedal[1]+0.08,pedal[2]-0.04],rubber);s.tube([[0.06,y-0.04,zrear],[0.06,y-0.07,-0.03],[0.06,y+0.11,-0.03],[0.06,y+0.03,zrear]],0.004,rubber,true);
    s.box([0.27,0.025,a.frame==='cargo'?0.58:0.32],[0,y+r+0.05,zrear+0.06],steel);for(const x of [-0.11,0.11])s.rod([x,y,zrear],[x,y+r+0.05,zrear+0.16],0.008,steel);
    if(a.fenders)for(const z of [zrear,zfront]){const ring=s.ring(r+0.045,0.019,[0,y,z],frame,Math.PI);ring.rotation.y=Math.PI/2;}
    if(a.lamp){s.cylinder(0.04,0.04,0.07,[0,y+0.53,0.5],steel,16).rotation.x=Math.PI/2;s.ball([0.035,0.035,0.015],[0,y+0.53,0.548],s.material('#f0e7be'));}
    if(a.lock)s.tube([[0.045,y+0.14,-0.15],[0.045,y+0.34,-0.15],[0.045,y+0.39,-0.03],[0.045,y+0.14,-0.03]],0.011,rubber);
    if(a.stand==='kickstand')s.rod([0,pedal[1]-0.04,-0.13],[0.21,0.015,-0.2],0.009,steel);
    if(a.cargo==='basket'){const mat=s.material('#b79b6a');s.box([0.34,0.2,0.26],[0,y+0.53,0.64],mat);for(let i=0;i<4;i++)s.box([0.344,0.004,0.265],[0,y+0.46+i*0.04,0.64],seat);s.cylinder(0.024,0.035,0.3,[0.09,y+0.7,0.68],s.material('#ceab68'),12).rotation.z=0.15;for(let i=0;i<5;i++){const x=(context.random()-0.5)*0.17;s.rod([x,y+0.63,0.64],[x,y+0.84,0.64],0.004,s.material('#70846b'));s.ball([0.028,0.027,0.028],[x,y+0.84,0.64],s.material('#b6787e'),10);}}
    if(a.cargo==='panniers')for(const x of [-0.19,0.19])s.box([0.12,0.32,0.35],[x,y+0.11,zrear+0.05],s.material('#a18d62'));
    if(a.cargo==='parcel'){s.box([0.3,0.24,0.36],[0,y+r+0.19,zrear+0.06],s.material('#bca172'));s.box([0.017,0.242,0.365],[0,y+r+0.19,zrear+0.06],rubber);}
    if(a.stand==='leaning')s.root.rotation.z=0.11;
    return s.finish();
  },
});
