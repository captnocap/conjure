import * as THREE from 'three';
import { Sculpture, choice, score, defineThing } from '@conjure/kit';
export default defineThing({
  questions: {
    frame: choice("What supports the winding gear?", {"iron": "A tall cast-iron pedestal.", "timber": "Two stout oak posts.", "stone": "A low stone mounting block.", "portable": "A freestanding workshop frame."}),
    wheel: choice("How is the pinion turned?", {"windlass": "A removable L-shaped windlass.", "wheel": "A large spoked handwheel.", "double": "A double-ended crank.", "bare": "A bare square drive awaiting its handle."}),
    paddle: choice("What shape is the water paddle?", {"square": "A square timber sluice paddle.", "round": "A circular iron paddle.", "slatted": "A ribbed rectangular metal paddle.", "removed": "The paddle has been removed from its rack."}),
    guard: choice("How is the gear guarded?", {"covered": "A rounded enclosed gear housing.", "open": "The pinion and teeth are exposed.", "cage": "An open iron safety cage.", "broken": "Half a protective cover remains."}),
    lock: choice("How is reverse motion prevented?", {"pawl": "A small drop pawl engages the gear.", "chain": "A locking chain wraps the handle.", "pin": "A red locking pin crosses the rack.", "none": "The safety catch has been removed."}),
    base: choice("What lies at its feet?", {"bolts": "Four visible foundation bolts.", "blocks": "Two timber packing blocks.", "tray": "A shallow tray catches grease.", "water": "A shallow puddle surrounds the mounting."}),
    finish: choice("What finish does the mechanism carry?", {"black": "Black iron with polished wear points.", "green": "Canal green enamel.", "cream": "Cream municipal enamel.", "rust": "Bare brown weathered iron."}),
    notice: choice("What is the operating status?", {"open": "A small OPEN marker.", "closed": "A CLOSED marker.", "repair": "A red UNDER REPAIR board.", "number": "A numbered LOCK 17 plate."}),
    rise: score("How far has the paddle risen?", ["Fully lowered", "Half raised", "Fully raised"])
  },
  build(a,context){

    const s=new Sculpture(context),iron=s.material({black:'#3c4842',green:'#52735b',cream:'#c5bea2',rust:'#87664d'}[a.finish],{metalness:0.65,roughness:0.4+context.mood.wear*0.4}),metal=s.material('#a2aaa0',{metalness:0.85}),wood=s.material('#89704e'),dark=s.material('#2a3530');
    s.box([0.7,0.12,0.55],[0,0.06,0],a.frame==='stone'?s.material('#b8b4a0'):iron);
    const h=a.frame==='stone'?0.9:1.45;
    for(const x of [-0.22,0.22])s.box([0.09,h,0.1],[x,h/2+0.12,0],a.frame==='timber'?wood:iron);
    s.box([0.55,0.12,0.16],[0,h,0],iron);
    const y=0.2+a.rise*0.6;s.box([0.06,1.3,0.065],[0,y+0.65,0.13],metal);
    for(let i=0;i<18;i++)s.box([0.045,0.022,0.03],[0.045,y+0.08+i*0.065,0.13],metal);
    const gear=s.cylinder(0.15,0.15,0.09,[0.16,h-0.07,0.12],iron,24);gear.rotation.x=Math.PI/2;
    for(let i=0;i<12;i++){const t=i*Math.PI/6;s.box([0.045,0.035,0.1],[0.16+Math.sin(t)*0.15,h-0.07+Math.cos(t)*0.15,0.12],metal).rotation.z=-t;}
    if(a.guard==='covered'||a.guard==='broken'){const cover=s.ball([0.21,0.2,0.06],[0.16,h-0.07,0.21],iron,20);if(a.guard==='broken')cover.scale.x*=0.5;}
    if(a.guard==='cage')for(let i=-2;i<=2;i++)s.rod([i*0.1+0.16,h-0.3,0.26],[i*0.1+0.16,h+0.16,0.26],0.012,iron);
    s.rod([0.16,h-0.07,0.17],[0.16,h-0.07,0.35],0.025,metal);
    if(a.wheel==='wheel'){s.ring(0.29,0.025,[0.16,h-0.07,0.37],iron);for(let i=0;i<5;i++){const t=i*Math.PI*2/5;s.rod([0.16,h-0.07,0.37],[0.16+Math.sin(t)*0.29,h-0.07+Math.cos(t)*0.29,0.37],0.015,iron);}}
    if(a.wheel==='windlass'||a.wheel==='double')s.tube([[0.16,h-0.07,0.35],[0.48,h-0.07,0.35],[0.48,h-0.07,0.55]],0.026,iron);
    if(a.wheel==='double')s.tube([[0.16,h-0.07,0.35],[-0.16,h-0.07,0.35],[-0.16,h-0.07,0.55]],0.026,iron);
    if(a.paddle==='round'){const p=s.cylinder(0.35,0.35,0.06,[0,y+0.17,0.15],iron,32);p.rotation.x=Math.PI/2;}
    if(a.paddle==='square'||a.paddle==='slatted'){s.box([0.65,0.5,0.08],[0,y+0.17,0.15],a.paddle==='square'?wood:iron);if(a.paddle==='slatted')for(let j=0;j<5;j++)s.box([0.62,0.04,0.04],[0,y-0.03+j*0.1,0.21],metal);}
    if(a.lock==='pawl')s.rod([0.3,h+0.2,0.24],[0.23,h+0.04,0.24],0.025,metal);
    if(a.lock==='chain')for(let i=0;i<7;i++)s.ring(0.035,0.009,[0.36,h-0.13-i*0.05,0.38],metal).rotation.y=i%2*Math.PI/2;
    if(a.lock==='pin')s.rod([-0.1,h-0.25,0.15],[0.12,h-0.25,0.15],0.027,s.material('#a5412c'));
    if(a.base==='bolts')for(const x of [-0.27,0.27])for(const z of [-0.2,0.2])s.cylinder(0.025,0.025,0.06,[x,0.14,z],metal,6);
    if(a.base==='blocks')for(const x of [-0.4,0.4])s.box([0.12,0.16,0.55],[x,0.08,0],wood);
    if(a.base==='tray')s.box([0.8,0.025,0.65],[0,0.015,0.03],dark);
    if(a.base==='water')s.cylinder(0.5,0.5,0.005,[0,0.003,0],s.material('#82998e',{roughness:0.15}),32);
    s.label({open:'OPEN',closed:'CLOSED',repair:'UNDER REPAIR',number:'LOCK 17'}[a.notice],0.36,0.13,[-0.03,h*0.61,0.08],a.notice==='repair'?'#a43926':'#253d31','#d8d3b7');
    return s.finish();

  },
});
