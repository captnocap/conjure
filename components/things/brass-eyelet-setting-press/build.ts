import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    press: choice("What form does the press take?", {"lever": "A tall curved lever press.", "screw": "A hand-screw arbor press.", "toggle": "A double-link toggle press.", "compact": "A squat portable punch press."}),
    finish: choice("What finish is on the casting?", {"green": "Deep green enamel.", "blue": "Blue workshop enamel.", "black": "Black cast iron.", "red": "Red oxide primer."}),
    die: choice("Which die is installed?", {"small": "A small narrow eyelet die.", "large": "A broad sail grommet die.", "punch": "A pointed hole-punch die.", "empty": "The upper die has been removed."}),
    lever: choice("Where is the handle?", {"up": "The handle is raised upright.", "half": "The handle is halfway down.", "down": "The lever is pulled horizontal.", "removed": "The handle lies beside the press."}),
    canvas: choice("What lies under the die?", {"corner": "A triangular reinforced sail corner.", "strip": "A long canvas edging strip.", "patch": "A square folded patch.", "bare": "The die bed is empty."}),
    eyelets: choice("How are the loose eyelets stored?", {"tray": "A shallow brass parts tray.", "tin": "A round open tin.", "row": "A neat row ready to fit.", "spill": "A spilled handful scattered across the bench."}),
    metal: choice("What metal are the eyelets?", {"brass": "Warm yellow brass.", "copper": "Red copper.", "nickel": "Bright nickel-plated steel.", "black": "Blackened steel."}),
    stage: choice("What stage is the job at?", {"ready": "A fresh grommet waits in the die.", "sample": "A finished sample has three new rings.", "reject": "A flattened failed eyelet lies beside it.", "order": "A WIDTH 40 job tag sits by the tray."}),
    throat: score("How deep is the working throat?", ["A shallow throat", "A normal press", "A deep reach"])
  },
  build(a,context){

    const s=new Sculpture(context),body=s.material({green:'#55745d',blue:'#647e88',black:'#354238',red:'#9b6149'}[a.finish],{metalness:0.5,roughness:0.4+context.mood.wear*0.35}),steel=s.material('#a7afa0',{metalness:0.8}),ring=s.material({brass:'#b69b53',copper:'#af7960',nickel:'#bdc4b6',black:'#455046'}[a.metal],{metalness:0.8}),cloth=s.material('#d7ccaa'),dark=s.material('#354035');const reach=0.12+a.throat*0.13,h=a.press==='compact'?0.27:0.43;
    s.box([0.36,0.045,0.38],[0,0.025,0],body);s.box([0.12,h,0.12],[0,h/2+0.04,-0.11],body);s.box([0.14,0.09,reach+0.16],[0,h+0.02,-0.11+(reach+0.16)/2],body);s.cylinder(0.035,0.035,h*0.55,[0,h*0.85,reach],steel,16);
    const dy=a.lever==='down'?0.1:a.lever==='half'?0.16:0.22;if(a.die!=='empty')s.cylinder(a.die==='large'?0.045:0.024,a.die==='punch'?0.004:0.035,0.06,[0,dy,reach],steel,20);s.cylinder(0.055,0.055,0.04,[0,0.065,reach],steel,24);
    const top=h+0.06;if(a.press==='screw'){for(let j=0;j<7;j++)s.ring(0.035,0.005,[0,h*0.6+j*0.035,reach],body).rotation.x=Math.PI/2;s.rod([-0.16,top,reach],[0.16,top,reach],0.015,steel);}else if(a.lever==='removed')s.rod([0.2,0.02,-0.1],[0.2,0.02,0.27],0.016,steel);else{const angle={up:0.2,half:0.8,down:1.4}[a.lever],x=Math.sin(angle)*0.32,y=top+Math.cos(angle)*0.32;s.rod([0,top,reach],[x,y,reach],0.016,steel);s.ball([0.03,0.03,0.03],[x,y,reach],dark,14);if(a.press==='toggle')s.rod([x*0.5,top+0.1,reach],[0,dy+0.1,reach],0.012,steel);}
    if(a.canvas!=='bare'){if(a.canvas==='corner'){const sh=new THREE.Shape();sh.moveTo(-0.16,-0.12);sh.lineTo(0.19,-0.12);sh.lineTo(-0.16,0.22);sh.closePath();s.mesh(new THREE.ShapeGeometry(sh),cloth,[0,0.09,reach]).rotation.x=-Math.PI/2;}else s.box([a.canvas==='strip'?0.52:0.25,0.008,a.canvas==='strip'?0.1:0.23],[0,0.09,reach],cloth);}
    if(a.eyelets==='tray')s.box([0.22,0.012,0.18],[-0.32,0.009,0.05],steel);if(a.eyelets==='tin')s.cylinder(0.1,0.1,0.035,[-0.32,0.02,0.05],steel,32);
    for(let j=0;j<9;j++){const x=a.eyelets==='row'?-0.3+j*0.05:-0.32+(j%3-1)*0.055,z=a.eyelets==='row'?0.27:0.05+(Math.floor(j/3)-1)*0.05;s.ring(0.018,0.005,[x+(a.eyelets==='spill'?(context.random()-0.5)*0.1:0),0.04,z],ring).rotation.x=Math.PI/2;}
    if(a.stage==='ready')s.ring(0.023,0.006,[0,0.102,reach],ring).rotation.x=Math.PI/2;
    if(a.stage==='sample'){s.box([0.2,0.006,0.08],[0.25,0.005,0.25],cloth);for(let j=0;j<3;j++)s.ring(0.02,0.005,[0.19+j*0.06,0.01,0.25],ring).rotation.x=Math.PI/2;}
    if(a.stage==='reject'){const broken=s.ring(0.026,0.006,[0.25,0.01,0.15],ring);broken.rotation.x=Math.PI/2;broken.scale.x=0.4;}if(a.stage==='order'){const tag=s.label('WIDTH 40',0.16,0.06,[-0.31,0.045,0.17],'#48543e','#e0d5af');tag.rotation.x=-Math.PI/2;}
    return s.finish();

  },
});
