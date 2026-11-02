import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    gauge: choice("What kind of readout is fitted?", {"dial": "A large round analog dial.", "scale": "A long spring balance scale.", "digital": "A small rectangular digital readout.", "pointer": "A simple exposed pointer arc."}),
    body: choice("What is the gauge body?", {"blue": "Blue painted alloy.", "green": "Green service enamel.", "silver": "Bare aluminium.", "black": "Black instrument housing."}),
    rope: choice("What cable is being measured?", {"single": "One thick steel rope.", "pair": "Two adjacent hoist ropes.", "fine": "A thin governor rope.", "none": "An empty gauge opening."}),
    mount: choice("How is it displayed?", {"frame": "A tall sample rope frame.", "bench": "A low bench fixture.", "hand": "A compact handheld frame.", "case": "An open padded instrument case."}),
    rollers: choice("What contact rollers are fitted?", {"steel": "Three polished steel rollers.", "black": "Three dark polymer rollers.", "brass": "Brass contact rollers.", "wide": "Broad twin-groove rollers."}),
    lever: choice("How is clamping force applied?", {"long": "A long locking lever.", "knob": "A large star knob.", "screw": "A threaded T-handle screw.", "short": "A short trigger handle."}),
    accessory: choice("What lies beside the instrument?", {"chart": "A small calibration chart.", "spanner": "A narrow adjustment spanner.", "blocks": "Two calibration weight blocks.", "none": "No calibration accessories."}),
    state: choice("What reading state is shown?", {"balanced": "Pointer near the centre of the scale.", "low": "Pointer near the low end.", "high": "Pointer near the high end.", "tagged": "A calibration tag tied to the body."}),
    height: score("How tall is the sample fixture?", ["A short sample", "A working fixture", "A tall sample fixture"])
  },
  build(a,context){

    const s=new Sculpture(context),body=s.material({blue:'#6d8f9a',green:'#729078',silver:'#a5b2a1',black:'#4c5b4c'}[a.body],{metalness:0.5}),metal=s.material('#a5b29d',{metalness:0.75}),dark=s.material('#4f5f50'),paper=s.material('#d9d0ad'),h=a.mount==='hand'?0.5:a.mount==='bench'?0.75:0.8+a.height*0.7,cy=a.mount==='hand'?0.24:h*0.55;
    if(a.mount!=='hand'){s.box([0.85,0.07,0.65],[0,0.035,0],body);for(const x of [-0.32,0.32])s.rod([x,0.07,0],[x,h,0],0.025,dark);s.rod([-0.32,h,0],[0.32,h,0],0.025,dark);if(a.mount==='bench')for(const x of [-0.32,0.32])s.rod([x,0.07,-0.25],[x,h*0.65,0],0.018,dark);if(a.mount==='case')for(const z of [-0.3,0.3])s.box([0.85,0.1,0.035],[0,0.1,z],dark);}else s.box([0.6,0.05,0.3],[0,0.025,0],body);
    if(a.rope!=='none')for(const x of a.rope==='pair'?[-0.04,0.04]:[0])s.rod([x,0.07,0],[x,h,0],a.rope==='fine'?0.007:0.015,metal);
    s.box([0.3,0.38,0.08],[0,cy,0.09],body);for(const [x,y] of [[-0.2,cy-0.12],[-0.2,cy+0.12],[0.2,cy]])s.cylinder(a.rollers==='wide'?0.065:0.045,a.rollers==='wide'?0.065:0.045,0.08,[x,y,0.1],a.rollers==='brass'?s.material('#b6a16a'):a.rollers==='black'?dark:metal,24).rotation.x=Math.PI/2;
    if(a.mount!=='hand')s.rod([-0.32,cy,-0.01],[0.32,cy,-0.01],0.018,dark);const dy=cy+0.03;if(a.gauge==='dial'||a.gauge==='pointer'){s.cylinder(0.12,0.12,0.02,[0,dy,0.15],paper,32).rotation.x=Math.PI/2;for(let i=0;i<9;i++){const t=-Math.PI*0.8+i*Math.PI*1.6/8;s.rod([Math.sin(t)*0.09,dy+Math.cos(t)*0.09,0.163],[Math.sin(t)*0.105,dy+Math.cos(t)*0.105,0.163],0.002,dark);}const t=a.state==='low'?-1:a.state==='high'?1:0.15;s.rod([0,dy,0.17],[Math.sin(t)*0.085,dy+Math.cos(t)*0.085,0.17],0.004,dark);}else if(a.gauge==='digital')s.label(a.state==='low'?'082':a.state==='high'?'248':'164',0.2,0.1,[0,dy,0.145],'#c9d5ac','#4b6152');else{s.box([0.08,0.3,0.01],[0,dy,0.145],paper);for(let i=0;i<10;i++)s.box([0.05,0.004,0.008],[0,dy-0.12+i*0.027,0.156],dark);}
    if(a.lever==='knob')s.cylinder(0.07,0.07,0.055,[0.3,cy,0.06],body,8).rotation.z=Math.PI/2;else{s.rod([0.2,cy,0.06],[a.lever==='long'?0.55:0.36,cy+0.14,0.06],0.018,dark);if(a.lever==='screw')s.rod([0.35,cy+0.06,0.06],[0.35,cy+0.22,0.06],0.015,metal);}
    if(a.accessory==='chart')s.label('N   kg\n100  10\n200  20',0.28,0.22,[-0.35,0.075,0.2],'#5b6d55','#d8ceaa').rotation.x=-Math.PI/2;if(a.accessory==='spanner')s.rod([-0.3,0.08,0.2],[0.05,0.08,0.2],0.014,metal);if(a.accessory==='blocks')for(const x of [-0.25,0.25])s.box([0.16,0.12,0.14],[x,0.13,0.2],metal);if(a.state==='tagged')s.label('CAL 04',0.2,0.1,[0.26,cy-0.15,0.16],'#5b6a53','#ddd0a8');return s.finish();

  },
});
