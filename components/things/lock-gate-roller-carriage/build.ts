import * as THREE from 'three';
import { Sculpture, choice, score, defineThing } from '@conjure/kit';
export default defineThing({
  questions: {
    deck: choice("What is the carriage deck?", {"open": "An open rectangular steel frame.", "plank": "A timber-planked moving bed.", "plate": "A solid riveted steel deck.", "cradle": "A V-shaped cradle for a gate beam."}),
    wheels: choice("What wheels carry it?", {"flanged": "Four flanged rail wheels.", "rollers": "Six short steel rollers.", "rubber": "Four broad rubber industrial wheels.", "bogie": "Two swivelling twin-wheel bogies."}),
    jack: choice("How is the load lifted?", {"screws": "Four screw jacks with handwheels.", "wedges": "Pairs of opposing oak wedges.", "hydraulic": "Two short hydraulic bottle jacks.", "none": "Fixed supports with no lifting gear."}),
    pads: choice("What touches the gate timber?", {"oak": "Thick oak packing pads.", "felt": "Green felt-wrapped pads.", "rubber": "Black rubber saddles.", "bare": "Bare concave steel shoes."}),
    restraint: choice("How is the load restrained?", {"chain": "Two loose chains cross the carriage.", "straps": "Two broad red webbing straps.", "stops": "Four upright end stops.", "none": "No restraints have been fitted."}),
    tow: choice("How is the carriage pulled?", {"bar": "A long hinged towing bar.", "eye": "A heavy towing eye only.", "rope": "A coiled hauling rope at one end.", "winch": "A short attached ratchet puller."}),
    load: choice("What rests on the carriage?", {"empty": "The carriage is empty.", "beam": "A single massive gate beam.", "post": "Two short square gate posts.", "template": "A light wooden gate-position template."}),
    finish: choice("What is its workshop finish?", {"red": "Red oxide primer.", "green": "Canal green enamel.", "steel": "Bare grey steel.", "yellow": "Faded yellow lifting equipment."}),
    spread: score("How far are the support pads spread?", ["Close together", "Normal working span", "Maximum span"])
  },
  build(a,context){

    const s=new Sculpture(context),body=s.material({red:'#995a40',green:'#53705c',steel:'#85968a',yellow:'#b39c52'}[a.finish],{metalness:0.65,roughness:0.4+context.mood.wear*0.35}),metal=s.material('#a4aea2',{metalness:0.8}),dark=s.material('#344039'),wood=s.material('#9e7b50'),pad=s.material({oak:'#98794c',felt:'#4a6c57',rubber:'#303a33',bare:'#99a69a'}[a.pads]);
    for(const x of [-0.72,0.72])s.box([0.14,0.18,1.05],[x,0.3,0],body);for(const z of [-0.46,0.46])s.box([1.6,0.18,0.13],[0,0.3,z],body);
    if(a.deck==='plate')s.box([1.55,0.035,0.95],[0,0.41,0],body);if(a.deck==='plank')for(let i=0;i<7;i++)s.box([0.2,0.06,0.95],[(i-3)*0.22,0.42,0],wood);
    if(a.deck==='cradle')for(const side of [-1,1])s.box([1.4,0.06,0.43],[0,0.49,side*0.2],body).rotation.x=side*0.3;
    const count=a.wheels==='rollers'?3:2;for(let i=0;i<count;i++)for(const z of [-0.4,0.4]){const x=(i-(count-1)/2)*1.2/(count-1),r=a.wheels==='rubber'?0.19:0.15;const wheel=s.cylinder(r,r,0.13,[x,r,z],a.wheels==='rubber'?dark:metal,24);wheel.rotation.x=Math.PI/2;if(a.wheels==='flanged')s.ring(r,0.018,[x,r,z+Math.sign(z)*0.07],metal);if(a.wheels==='bogie'){const extra=s.cylinder(r,r,0.1,[x+0.21,r,z],metal,24);extra.rotation.x=Math.PI/2;}}
    const spread=0.28+a.spread*0.35;for(const x of [-spread,spread])for(const z of [-0.3,0.3]){
      const base=0.43;if(a.jack==='screws'){s.cylinder(0.035,0.035,0.26,[x,base+0.13,z],metal,16);for(let i=0;i<6;i++)s.ring(0.036,0.006,[x,base+0.03+i*0.035,z],body).rotation.x=Math.PI/2;s.ring(0.085,0.012,[x,base+0.1,z],body).rotation.x=Math.PI/2;}
      if(a.jack==='hydraulic')s.cylinder(0.075,0.09,0.2,[x,base+0.1,z],body,20);
      if(a.jack==='wedges')for(const side of [-1,1])s.box([0.24,0.07,0.18],[x+side*0.06,base+0.06,z],wood).rotation.z=side*0.12;
      s.box([0.27,0.08,0.22],[x,a.jack==='none'?base+0.04:a.jack==='wedges'?base+0.12:base+0.25,z],pad);
    }
    const padTop=a.jack==='none'?0.51:a.jack==='wedges'?0.59:0.72;
    const y=padTop+(a.load==='template'?0.025:0.14),strapTop=a.load==='empty'?padTop+0.015:a.load==='template'?y+0.04:y+0.16;
    if(a.restraint==='chain'||a.restraint==='straps')for(const z of [-0.3,0.3]){
      const mat=a.restraint==='chain'?metal:s.material('#a94b31');
      s.tube([[-0.78,0.35,z],[-0.78,strapTop,z],[0,strapTop,z],[0.78,strapTop,z],[0.78,0.35,z]],a.restraint==='chain'?0.016:0.026,mat);
      if(a.restraint==='chain')for(let j=0;j<13;j++)s.ring(0.025,0.007,[-0.72+j*0.12,strapTop,z],metal).rotation.y=j%2*Math.PI/2;
    }
    if(a.restraint==='stops')for(const x of [-0.75,0.75])for(const z of [-0.4,0.4])s.box([0.06,0.48,0.06],[x,0.61,z],body);
    if(a.tow==='bar')s.tube([[0.8,0.3,0],[1.3,0.17,0],[1.8,0.15,0]],0.035,body);if(a.tow==='eye')s.ring(0.12,0.025,[0.91,0.29,0],metal).rotation.x=Math.PI/2;
    if(a.tow==='rope')for(let j=0;j<5;j++)s.ring(0.18+j*0.016,0.015,[1.05,0.035+j*0.012,0],wood).rotation.x=Math.PI/2;
    if(a.tow==='winch'){s.box([0.3,0.15,0.15],[0.98,0.3,0],body);s.rod([1.05,0.3,0],[1.15,0.67,0],0.025,metal);}
    if(a.load==='beam')s.box([1.9,0.28,0.35],[0,y,0],wood);if(a.load==='post')for(const z of [-0.27,0.27])s.box([1.2,0.24,0.24],[0,y,z],wood);
    if(a.load==='template'){s.rod([-0.7,y,-0.35],[0.7,y,0.35],0.025,wood);for(const z of [-0.35,0.35])s.box([1.5,0.035,0.04],[0,y,z],wood);}
    return s.finish();

  },
});
