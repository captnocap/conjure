import * as THREE from 'three';
import { Sculpture, choice, score, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    gauge: choice('Which film gauge does the splicer accept?', { eight:'A narrow Super 8 gate.', sixteen:'A medium 16 mm gate.', thirtyfive:'A wide 35 mm gate.', dual:'Two adjacent channels for small and large film.' }),
    arm: choice('What is the cutting arm doing?', { shut:'The guillotine is closed flat.', raised:'The long blade is raised upright.', midway:'The arm pauses at forty-five degrees.', removed:'The detached arm lies beside the base.' }),
    joint: choice('What has happened at the join?', { intact:'Two neatly aligned strips meet in the gate.', gap:'The film ends stop short with a missing section.', crossed:'The ends overlap badly at an angle.', trimmed:'Tiny triangular offcuts surround a fresh splice.' }),
    film: choice('What material is being cut?', { brown:'Sepia photographic film with dark frames.', black:'Black and white negative with pale frames.', leader:'Opaque cream leader with counting marks.', red:'Red countdown leader with pale numerals.' }),
    tape: choice('How is the joining tape supplied?', { roll:'A wide translucent roll on an upright spindle.', dispenser:'A low square tape cassette beside the gate.', empty:'An empty cardboard tape core.', none:'No tape, a cement-splicing kit instead.' }),
    handle: choice('What grips the cutting lever?', { wood:'A rounded polished wood grip.', red:'A red rubber grip.', black:'A ribbed black plastic handle.', bare:'A bare metal shaft.' }),
    bed: choice('What finish does the base have?', { green:'Heavy dark green enamel.', blue:'Blue-grey workshop enamel.', steel:'Bare brushed aluminium.', cream:'Yellowed cream enamel.' }),
    magnifier: choice('What helps align the frames?', { none:'No alignment aid.', loupe:'A black loupe sits beside the gate.', bridge:'A small magnifying lens bridges the film.', marks:'Two red registration arrows mark the channel.' }),
    opening: score('How far do the clamps open?', ['Flush with the film', 'Slightly lifted', 'Fully lifted']),
    note: choice('What job card lies next to the tool?', { scene:'A card reads SCENE 12.', repair:'A card reads REPAIR JOIN.', missing:'A red card reads MISSING FRAMES.', blank:'A blank card waits for notes.' }),
  },
  build(a, context) {
    const s=new Sculpture(context);const w=a.gauge==='thirtyfive'?0.35:a.gauge==='dual'?0.4:0.29;
    const body=s.material({green:'#4a685c',blue:'#6e8490',steel:'#aab1ac',cream:'#d6c9a8'}[a.bed],{metalness:a.bed==='steel'?0.8:0.2,roughness:0.35+context.mood.wear*0.4}),metal=s.material('#b7bcb7',{metalness:0.85,roughness:0.25}),dark=s.material('#292d2c');
    s.box([w,0.045,0.21],[0,0.035,0],body);for(const x of [-w*0.38,w*0.38])for(const z of [-0.075,0.075])s.cylinder(0.015,0.02,0.015,[x,0.008,z],dark,10);
    const fw={eight:0.022,sixteen:0.037,thirtyfive:0.06,dual:0.032}[a.gauge];
    const ink=s.material(a.film==='red'?'#a73f2c':a.film==='leader'?'#d9cda9':a.film==='black'?'#3b4241':'#6d472e'),frame=s.material(a.film==='brown'?'#292623':'#e0dac2');
    const channels=a.gauge==='dual'?[-0.05,0.05]:[0];
    for(const z of channels){s.box([w*0.95,0.01,fw+0.012],[0,0.063,z],metal);const gap=a.joint==='gap'?0.045:0.004;
      for(const side of [-1,1]){const length=0.18;const strip=s.box([length,0.002,fw],[side*(gap+length/2),0.072,z],ink);if(side===1&&a.joint==='crossed')strip.rotation.y=0.16;
        for(let j=0;j<7;j++){const x=side*(gap+0.012+j*0.023);s.box([0.015,0.002,fw*0.58],[x,0.074,z],frame);for(const edge of [-1,1])s.box([0.005,0.003,0.003],[x,0.075,z+edge*fw*0.4],metal);}}
      for(const side of [-1,1]){const x=side*0.045;s.box([0.045,0.014,fw+0.02],[x,0.086+a.opening*0.025,z],body);for(const edge of [-1,1])s.cylinder(0.003,0.003,0.02,[x,0.077,z+edge*fw*0.4],metal,8);}}
    const blade=new THREE.Group();const b=new THREE.Mesh(new THREE.BoxGeometry(0.013,0.027,0.24),metal);b.position.z=0.12;b.castShadow=true;blade.add(b);const grip=new THREE.Mesh(new THREE.CapsuleGeometry(0.016,0.07,4,10),s.material({wood:'#886343',red:'#a63d2c',black:'#252a2b',bare:'#aeb4b2'}[a.handle]));grip.rotation.x=Math.PI/2;grip.position.set(0,0.015,0.265);grip.castShadow=true;blade.add(grip);blade.position.set(0,0.09,-0.11);blade.rotation.x={shut:0,raised:-1.3,midway:-0.7,removed:0}[a.arm];if(a.arm==='removed')blade.position.set(w*0.75,0.027,-0.12);s.root.add(blade);
    s.rod([-0.04,0.09,-0.1],[0.04,0.09,-0.1],0.011,metal);
    if(a.tape==='roll'||a.tape==='empty'){s.rod([-0.12,0.06,-0.07],[-0.12,0.19,-0.07],0.008,metal);s.ring(0.038,a.tape==='roll'?0.013:0.004,[-0.12,0.18,-0.07],s.material(a.tape==='roll'?'#d4cdb6':'#947550'));}
    if(a.tape==='dispenser'){s.box([0.07,0.045,0.05],[-0.22,0.023,-0.045],body);s.ring(0.024,0.006,[-0.22,0.048,-0.015],metal);}
    if(a.tape==='none'){s.cylinder(0.018,0.022,0.055,[-0.2,0.029,-0.07],s.material('#b1a66b'),16);s.cylinder(0.014,0.014,0.014,[-0.2,0.064,-0.07],dark,12);}
    if(a.magnifier==='loupe'){s.cylinder(0.025,0.03,0.025,[0.2,0.015,0.055],dark,18);s.ring(0.018,0.003,[0.2,0.03,0.055],metal).rotation.x=Math.PI/2;}
    if(a.magnifier==='bridge'){for(const x of [-0.065,0.065])s.rod([x,0.06,0],[x,0.14,0],0.005,metal);s.ring(0.06,0.004,[0,0.14,0],dark).rotation.x=Math.PI/2;}
    if(a.magnifier==='marks')for(const x of [-0.07,0.07])s.box([0.02,0.002,0.015],[x,0.076,0],s.material('#ae3a2c')).rotation.y=x>0?0.6:-0.6;
    if(a.joint==='trimmed')for(let i=0;i<6;i++)s.box([0.012,0.002,0.018],[0.12+context.random()*0.1,0.003,0.09+context.random()*0.08],ink).rotation.y=context.random()*3;
    const label=s.label({scene:'SCENE 12',repair:'REPAIR JOIN',missing:'MISSING FRAMES',blank:'________'}[a.note],0.13,0.055,[-0.07,0.003,0.17],a.note==='missing'?'#a33223':'#39433a','#e4dac1');label.rotation.x=-Math.PI/2;
    return s.finish();
  },
});
