import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineWorld({
  questions: {
    roof: choice("How is the loft framed?", {"truss": "Open triangular roof trusses.", "beam": "Heavy horizontal beams on posts.", "sawtooth": "A stepped north-light roof frame.", "arched": "Curved laminated roof ribs."}),
    floor: choice("What covers the working floor?", {"plank": "Wide golden timber planks.", "painted": "Pale painted floorboards.", "tiles": "Large reddish floor tiles.", "canvas": "A broad pale protective canvas."}),
    windows: choice("How does the harbor light enter?", {"tall": "Three tall multi-pane windows.", "ribbon": "A long high ribbon window.", "round": "Round loft portholes.", "door": "A large open loading door."}),
    cutting: choice("What is the main floor arrangement?", {"open": "Clear floor with chalk layout marks.", "table": "A broad low cutting table.", "rails": "Long straight layout rails.", "sail": "A huge unfinished triangular sail."}),
    storage: choice("What lines the back wall?", {"rolls": "Upright rolls of sailcloth.", "cubbies": "A wall of cloth and pattern cubbies.", "battens": "Tall thin battens in a rack.", "hooks": "Hanging rope and rigging patterns."}),
    hoist: choice("What moves heavy cloth upstairs?", {"pulley": "A large pulley at the loading beam.", "gantry": "A timber hoisting gantry.", "stair": "A compact timber stair.", "hatch": "A dark floor hatch with guard rails."}),
    work: choice("What is the loft preparing?", {"racing": "A bright numbered racing sail.", "cargo": "Heavy brown cargo sailcloth.", "repair": "A patched sail suspended at the wall.", "quiet": "Neatly folded completed sails."}),
    sign: choice("What useful mark identifies the loft?", {"loft": "SAIL LOFT over the window.", "numbers": "Large floor station numbers.", "dimensions": "Measuring marks across a beam.", "none": "Only the grain of timber."}),
    length: score("How spacious is the work room?", ["A compact loft", "A broad working loft", "A deep loft for large sails"])
  },
  build(a,context){

    const width=11,depth=9+a.length*3;const {world,art:s}=diorama(context,{width,depth,background:'#e6e7df',floor:{plank:'#b49a70',painted:'#c8c5ad',tiles:'#b98c70',canvas:'#d0c4a3'}[a.floor],maxHeight:2.7,radius:1.1,pitch:36,yaw:28,scale:[0.65,1.8],slots:a.cutting==='table'?[[0,0,0.82,0.8],[-3,1,0,1],[3,1.5,0,1]]:[[0,0,0,1],[-3,1,0,1],[3,1.5,0,1]]});
    const timber=s.material('#927449'),dark=s.material('#635e49'),wall=s.material('#d1c7aa'),cloth=s.material('#ded4b4'),glass=s.material('#b4cbcc',{roughness:0.4}),back=-depth/2+0.2;
    s.box([width,3.7,0.18],[0,1.85,back],wall);s.box([0.16,3.7,depth],[width/2,1.85,0],wall);
    if(a.floor==='plank'||a.floor==='painted')for(let i=0;i<22;i++)s.box([0.018,0.008,depth],[i*0.5-width/2,0.006,0],timber);
    if(a.floor==='tiles')for(let i=0;i<10;i++){s.box([width,0.008,0.015],[0,0.008,-depth/2+i*depth/10],dark);s.box([0.015,0.008,depth],[-5+i,0.008,0],dark);}
    for(const z of [back+0.3,0,depth/2-0.4]){for(const x of [-5,5])s.box([0.16,3.6,0.16],[x,1.8,z],timber);s.rod([-5,3.6,z],[5,3.6,z],0.095,timber);if(a.roof==='truss'){s.rod([-5,3.6,z],[0,5,z],0.1,timber);s.rod([0,5,z],[5,3.6,z],0.1,timber);s.rod([0,3.6,z],[0,5,z],0.07,timber);}if(a.roof==='arched')s.tube([[-5,3.6,z],[-3,4.7,z],[0,5,z],[3,4.7,z],[5,3.6,z]],0.1,timber);if(a.roof==='sawtooth')for(let i=0;i<4;i++){s.rod([-5+i*2.5,3.6,z],[-3+i*2.5,4.7,z],0.09,timber);s.rod([-3+i*2.5,4.7,z],[-2.5+i*2.5,3.6,z],0.09,timber);}}
    if(a.windows==='round')for(const x of [-3,0,3]){s.cylinder(0.65,0.65,0.04,[x,2.3,back+0.12],glass,32).rotation.x=Math.PI/2;s.ring(0.65,0.055,[x,2.3,back+0.16],timber);s.rod([x-0.65,2.3,back+0.19],[x+0.65,2.3,back+0.19],0.025,timber);}
    else if(a.windows==='door'){s.box([2.3,3,0.04],[-3.8,1.5,back+0.12],glass);for(const x of [-5,-2.6])s.box([0.12,3.1,0.12],[x,1.55,back+0.2],timber);s.box([2.5,0.15,0.15],[-3.8,3.1,back+0.2],timber);}
    else for(const x of [-3,0,3]){const w=a.windows==='ribbon'?2.9:1.75,h=a.windows==='ribbon'?0.85:1.9,y=a.windows==='ribbon'?2.8:2.25;s.box([w,h,0.05],[x,y,back+0.12],glass);for(const dx of [-w/2,0,w/2])s.box([0.05,h+0.08,0.08],[x+dx,y,back+0.17],timber);for(const dy of [-h/2,0,h/2])s.box([w,0.05,0.08],[x,y+dy,back+0.17],timber);}
    if(a.cutting==='table'){s.box([4.2,0.1,3.2],[0,0.77,0],timber);for(const x of [-1.8,1.8])for(const z of [-1.3,1.3])s.box([0.12,0.72,0.12],[x,0.36,z],timber);}
    if(a.cutting==='rails')for(const x of [-1.7,1.7])s.box([0.06,0.025,depth-2],[x,0.02,0],dark);
    if(a.cutting==='open')for(let i=0;i<4;i++)s.rod([-2+i*0.4,0.015,-2],[2,0.015,1.4-i*0.4],0.012,cloth);
    if(a.cutting==='sail'){const sh=new THREE.Shape();sh.moveTo(-4,-2);sh.lineTo(0,-2);sh.lineTo(-4,3);sh.closePath();s.mesh(new THREE.ShapeGeometry(sh),s.material('#d8c8a1',{side:THREE.DoubleSide}),[-0.4,0.02,0]).rotation.x=-Math.PI/2;}
    for(let j=0;j<6;j++){const z=back+0.75;if(a.storage==='rolls'){const h=1.5+(j%3)*0.25;s.cylinder(0.16,0.16,h,[1.8+j*0.5,h/2,z],s.material(j%2?'#bda77a':'#daceb1'),20);}if(a.storage==='battens')for(let k=0;k<3;k++)s.box([0.025,2.2+j*0.08,0.035],[1.7+j*0.44+k*0.09,1.1+j*0.04,z],timber);if(a.storage==='hooks')s.ring(0.3,0.025,[1.8+j*0.5,1.5,z],timber);}
    if(a.storage==='cubbies'){for(const y of [0.1,0.7,1.3,1.9])s.box([3.5,0.08,0.65],[2.8,y,back+0.5],timber);for(const x of [1.1,2.25,3.4,4.55])s.box([0.08,1.9,0.65],[x,0.95,back+0.5],timber);for(let j=0;j<8;j++)s.box([0.75,0.18,0.45],[1.7+j%3*1.15,0.25+Math.floor(j/3)*0.6,back+0.5],cloth);}
    if(a.hoist==='pulley'||a.hoist==='gantry'){const z=depth/2-0.7;s.rod([-5,3.3,z],[-2.8,3.3,z],0.1,timber);s.ring(0.22,0.05,[-3.1,2.95,z],dark);s.rod([-3.3,3,z],[-3.3,0.6,z],0.02,timber);if(a.hoist==='gantry')s.box([0.16,3.3,0.16],[-2.8,1.65,z],timber);}
    if(a.hoist==='stair')for(let j=0;j<7;j++)s.box([0.85,0.2+j*0.2,0.3],[-4.6,(0.2+j*0.2)/2,depth/2-0.5-j*0.3],timber);
    if(a.hoist==='hatch'){s.box([1.3,0.025,1.5],[-4.3,0.02,depth/2-1.2],dark);for(const z of [depth/2-2,depth/2-0.4]){s.rod([-5,0,z],[-5,0.9,z],0.035,timber);s.rod([-3.6,0,z],[-3.6,0.9,z],0.035,timber);s.rod([-5,0.9,z],[-3.6,0.9,z],0.035,timber);}}
    if(a.work==='repair'){s.box([1.65,2,0.025],[5.39,2,-1],cloth).rotation.y=Math.PI/2;for(let i=0;i<3;i++)s.box([0.03,0.3,0.35],[5.35,1.5+i*0.42,-1+i*0.24],timber);}
    else if(a.work==='quiet')for(let i=0;i<4;i++)s.box([1.1,0.12,0.65],[-3.8,0.08+i*0.12,back+0.8],cloth);
    else{s.box([0.03,1.5,2],[5.36,2,0],s.material(a.work==='cargo'?'#a8885b':'#deded0'));if(a.work==='racing')s.label('47',0.8,0.65,[5.32,2,0],'#a25338','#e0decc').rotation.y=-Math.PI/2;}
    if(a.sign==='loft')s.label('SAIL LOFT',2.1,0.32,[0,3.45,back+0.13],'#4e6257','#d4c9a7');if(a.sign==='numbers')for(let i=0;i<3;i++)s.label(String(i+1),0.6,0.6,[-3+i*3,0.02,depth/2-1],'#ded8b8','#aa9169').rotation.x=-Math.PI/2;
    if(a.sign==='dimensions')for(let i=0;i<20;i++)s.box([0.025,0.12,0.03],[-4.7+i*0.5,3.55,0.11],cloth);
    return world;

  },
});
