import * as THREE from 'three';
import { Sculpture, choice, score, defineThing } from '@conjure/kit';
export default defineThing({
  questions: {
    section: choice("What shape are the stop planks?", {"square": "Thick square-edged beams.", "grooved": "Tongue-and-groove sealing beams.", "tapered": "Tapered beams with sloping ends.", "iron": "Timbers reinforced with iron end shoes."}),
    stack: choice("How are the beams arranged?", {"tower": "A compact aligned stack.", "staggered": "Alternating ends project from the stack.", "fan": "The top three beams fan apart.", "sorting": "Two small stacks with a clear gap."}),
    trestles: choice("What supports them?", {"wood": "Two A-frame timber trestles.", "steel": "Two welded steel trestles.", "blocks": "Low stacked packing blocks.", "wheels": "Two wheeled moving dollies."}),
    eyes: choice("What lifting hardware is fitted?", {"rings": "Two iron lifting rings on every beam.", "holes": "Round holes through the ends.", "hooks": "Short iron lifting hooks.", "none": "Plain beams without lifting hardware."}),
    seals: choice("What seals the water between beams?", {"rope": "Heavy hemp rope in the grooves.", "rubber": "Black rubber strips along each edge.", "clay": "Pale clay packing along the joint.", "bare": "The grooves have been stripped clean."}),
    marking: choice("How is the installation order marked?", {"numbers": "Large chalk numbers at each end.", "stripes": "Coloured bands mark matching ends.", "arrows": "White arrows show which way faces upstream.", "tags": "Tied paper number tags hang from the top beam."}),
    state: choice("What repair is underway?", {"ready": "All beams are ready for installation.", "split": "One top plank has a dark split.", "new": "A pale new beam replaces an old one.", "cleaning": "A stiff brush and scraper lie on the stack."}),
    timber: choice("What timber finish is visible?", {"wet": "Dark damp oak.", "fresh": "Fresh golden pine.", "grey": "Silver water-worn timber.", "tarred": "Black pitch-coated wood."}),
    height: score("How many planks are on the trestles?", ["Three planks", "Five planks", "Eight planks"])
  },
  build(a,context){

    const s=new Sculpture(context),wood=s.material({wet:'#71583e',fresh:'#bb975d',grey:'#969885',tarred:'#46463b'}[a.timber],{roughness:a.timber==='wet'?0.4:0.85}),metal=s.material('#56645a',{metalness:0.7}),dark=s.material('#303d35'),seal=s.material(a.seals==='clay'?'#bab495':a.seals==='rubber'?'#2f3933':'#a39261'),light=s.material('#d6c9a5');
    const n=3+Math.round(a.height*5),base=a.trestles==='blocks'?0.24:0.65,len=2.5;
    for(const x of [-0.9,0.9]){
      if(a.trestles==='blocks'){for(let j=0;j<2;j++)s.box([0.35,0.12,0.8],[x,0.06+j*0.12,0],wood);}else{for(const side of [-1,1])s.rod([x,base,-0.18*side],[x,0.04,0.45*side],0.045,a.trestles==='wood'?wood:metal);s.box([0.15,0.09,1.0],[x,base,0],a.trestles==='wood'?wood:metal);}
      if(a.trestles==='wheels')for(const z of [-0.4,0.4]){const wheel=s.cylinder(0.09,0.09,0.08,[x,0.09,z],dark,16);wheel.rotation.z=Math.PI/2;}
    }
    for(let i=0;i<n;i++){
      const x=a.stack==='staggered'?(i%2?0.15:-0.15):0,z=a.stack==='sorting'?(i%2?0.28:-0.28):0,y=base+0.12+i*(a.stack==='sorting'?0.075:0.15),angle=a.stack==='fan'&&i>n-4?(i-n+3)*0.07:0;
      const plank=s.box([len,0.14,a.stack==='sorting'?0.24:0.35],[x,y,z],a.state==='new'&&i===n-1?light:wood);plank.rotation.y=angle;
      if(a.section==='grooved')s.box([len-0.05,0.025,0.08],[x,y+0.08,z],wood).rotation.y=angle;
      if(a.section==='iron')for(const side of [-1,1])s.box([0.1,0.16,0.37],[x+side*1.2,y,z],metal);
      if(a.section==='tapered')for(const side of [-1,1])s.box([0.17,0.14,0.22],[x+side*1.27,y,z],wood).rotation.y=side*0.25;
      if(a.seals!=='bare')s.box([len-0.04,0.018,0.045],[x,y+0.082,z+0.12],seal);
      for(const side of [-1,1]){
        const ex=x+side*1.02;if(a.eyes==='rings')s.ring(0.06,0.013,[ex,y+0.1,z],metal);if(a.eyes==='hooks')s.ring(0.055,0.014,[ex,y+0.12,z],metal,Math.PI*1.45);if(a.eyes==='holes')s.cylinder(0.045,0.045,0.003,[ex,y+0.072,z],dark,16);
        if(a.marking==='stripes')s.box([0.09,0.145,0.36],[ex,y,z],s.material(i%2?'#8b5041':'#9c9a56'));
      }
      if(a.marking==='numbers')s.label(String(i+1),0.12,0.1,[x+1.05,y,z+0.18],'#e4ddc2','#6d6b54');
      if(a.marking==='arrows')s.label('UPSTREAM >',0.48,0.09,[x+0.6,y,z+0.18],'#e4ddc2','#6d6b54');
    }
    const top=base+0.12+(n-1)*(a.stack==='sorting'?0.075:0.15);
    if(a.marking==='tags')s.label('PLANK 01',0.28,0.12,[-0.8,top-0.05,0.24],'#4b4f3d','#ded4b4').rotation.z=-0.2;
    if(a.state==='split')s.box([0.8,0.003,0.008],[0.2,top+0.073,0.07],dark).rotation.y=0.12;
    if(a.state==='cleaning'){s.box([0.3,0.04,0.12],[0,top+0.1,0],light);for(let j=0;j<8;j++)s.box([0.018,0.04,0.1],[(j-3.5)*0.035,top+0.14,0],dark);s.rod([0.4,top+0.085,-0.1],[0.65,top+0.085,0.1],0.018,metal);}
    return s.finish();

  },
});
