import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    frame: choice("What holds the sailcloth rolls?", {"timber": "A broad oak A-frame cradle.", "steel": "A green tubular steel rack.", "trestle": "Two simple wooden spindle trestles.", "cart": "A four-wheeled cloth cart."}),
    rolls: choice("How many bolts are carried?", {"one": "One large bolt.", "two": "Two bolts on parallel axles.", "three": "Three smaller bolts stacked vertically.", "empty": "An empty spindle and one loose core."}),
    cloth: choice("What cloth is stored?", {"cream": "Heavy unbleached canvas.", "white": "White synthetic sailcloth.", "red": "Rust-red storm canvas.", "striped": "Blue-striped awning cloth."}),
    unroll: choice("How is the cloth drawn out?", {"short": "A short loose tongue hangs down.", "board": "A long panel lies over a cutting board.", "floor": "A broad panel trails onto the floor.", "closed": "The roll is tightly tied shut."}),
    ends: choice("What shows at the ends of the roll?", {"core": "Brown cardboard cores.", "wood": "Wooden spindle ends.", "caps": "Dark protective end caps.", "frayed": "Uneven frayed canvas edges."}),
    measure: choice("How is a length measured?", {"ruler": "A long metal ruler lies along the edge.", "tape": "A curled yellow measuring tape.", "marks": "Chalk marks divide the length.", "none": "No measuring tool."}),
    ties: choice("How are the rolls secured?", {"rope": "Thin cotton tying cords.", "webbing": "Broad dark webbing bands.", "paper": "Paper stock bands with width markings.", "loose": "No ties remain."}),
    state: choice("What is the cloth waiting for?", {"new": "A new sail pattern is pinned nearby.", "patch": "A red repair patch rests on the bolt.", "offcuts": "Small triangular offcuts lie beside it.", "cover": "A folded dust cover lies across the frame."}),
    width: score("How wide is the bolt?", ["A narrow strip", "A broad sail panel", "An extra-wide bolt"])
  },
  build(a,context){

    const s=new Sculpture(context),wood=s.material('#9b7b50'),iron=s.material('#58725f',{metalness:0.6}),dark=s.material('#354237'),cloth=s.material({cream:'#d5c8a4',white:'#e2e1cc',red:'#ac6953',striped:'#d0cfb2'}[a.cloth]),metal=s.material('#abb2a0',{metalness:0.75});const width=0.7+a.width*1.3;
    for(const x of [-width/2-0.1,width/2+0.1]){for(const side of [-1,1])s.rod([x,0.8,0],[x,0.035,side*0.4],0.04,a.frame==='steel'?iron:wood);s.box([0.14,0.06,0.85],[x,0.08,0],wood);if(a.frame==='cart')for(const z of [-0.35,0.35])s.cylinder(0.085,0.085,0.08,[x,0.085,z],dark,16).rotation.z=Math.PI/2;}
    const n={one:1,two:2,three:3,empty:0}[a.rolls]; for(const x of [-width/2-0.1,width/2+0.1])s.rod([x,0.08,0],[x,n===3?1.2:n===2?0.9:0.8,0],0.035,a.frame==='steel'?iron:wood);for(let i=0;i<Math.max(1,n);i++){const y=0.55+i*0.32,z=n===2?(i-0.5)*0.36:0;for(const x of [-width/2-0.1,width/2+0.1])s.rod([x,y,0],[x,y,z],0.035,a.frame==='steel'?iron:wood);s.rod([-width/2-0.17,y,z],[width/2+0.17,y,z],0.025,a.ends==='wood'?wood:metal);if(n){const roll=s.cylinder(n===3?0.13:0.22,n===3?0.13:0.22,width,[0,y,z],cloth,40);roll.rotation.z=Math.PI/2;for(const side of [-1,1]){const cap=s.cylinder(0.055,0.055,0.025,[side*(width/2+0.01),y,z],a.ends==='caps'?dark:wood,16);cap.rotation.z=Math.PI/2;}
      if(a.cloth==='striped')for(let j=0;j<7;j++)s.ring(n===3?0.132:0.222,0.018,[(j-3)*width/7,y,z],s.material('#5b7b89')).rotation.y=Math.PI/2;
      if(a.ties!=='loose')for(const x of [-width*0.3,width*0.3])s.ring(n===3?0.135:0.225,a.ties==='webbing'?0.018:0.007,[x,y,z],a.ties==='paper'?s.material('#dfd2a7'):dark).rotation.y=Math.PI/2;
      if(a.ends==='frayed')for(let j=0;j<12;j++)s.rod([width/2,y+Math.cos(j)*0.2,z+Math.sin(j)*0.2],[width/2+0.035+context.random()*0.025,y+Math.cos(j)*0.2,z+Math.sin(j)*0.2],0.002,cloth);}}
    if(a.unroll==='board'){for(const x of [-width*0.4,width*0.4])for(const z of [0.25,1.1])s.box([0.05,0.375,0.05],[x,0.1875,z],wood);s.box([width,0.05,1],[0,0.4,0.68],wood);s.box([width*0.94,0.008,1.1],[0,0.43,0.65],cloth);}if(a.unroll==='floor')s.surface((u,v,t)=>t.set((u-0.5)*width,0.03+0.45*Math.max(0,1-v*3),0.1+v*1.4),cloth,{segments:[2,18],flip:true});if(a.unroll==='short')s.box([width*0.94,0.32,0.012],[0,0.4,0.22],cloth);
    const my=a.unroll==='board'?0.44:0.03;if(a.measure==='ruler'){s.box([width*0.9,0.008,0.04],[0,my,0.75],metal);for(let j=0;j<15;j++)s.box([0.004,0.002,0.025],[(j-7)*width*0.055,my+0.005,0.75],dark);}if(a.measure==='tape')s.ring(0.1,0.013,[width*0.25,my,0.8],s.material('#bdac5e'),Math.PI*1.7).rotation.x=Math.PI/2;if(a.measure==='marks')for(let j=0;j<6;j++)s.box([0.01,0.002,0.15],[(j-2.5)*width/6,my+0.004,0.65],dark);
    const top=n?0.55+(n-1)*0.32+(n===3?0.13:0.22):a.unroll==='board'?0.435:0.01;if(a.state==='patch')s.box([0.22,0.008,0.2],[0,top+0.004,n===2?0.18:0],s.material('#a76048'));if(a.state==='offcuts')for(let j=0;j<3;j++)s.box([0.16,0.004,0.1],[width*0.5+0.15,0.006,0.2+j*0.16],cloth).rotation.y=j*0.7;if(a.state==='cover')s.box([0.35,0.05,0.25],[width*0.25,top+0.025,n===2?0.18:0],s.material('#8a9580'));if(a.state==='new'){const tag=s.label('SAIL PATTERN',0.35,0.15,[-width/2,0.7,0.12],'#46513e','#ded1ab');tag.rotation.z=0.12;}
    return s.finish();

  },
});
