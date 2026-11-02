import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    form: choice("What is the saggar shape?", {"round": "Round open firing boxes.", "square": "Square open firing boxes.", "oval": "Elongated oval boxes.", "mixed": "Alternating round and square boxes."}),
    clay: choice("What is the refractory body?", {"buff": "Pale buff fireclay.", "red": "Warm red fireclay.", "grey": "Grey refractory clay.", "black": "Dark soot stained clay."}),
    stack: choice("How is the stack arranged?", {"straight": "A straight vertical tower.", "offset": "Slightly staggered boxes.", "split": "Two short adjacent stacks.", "open": "One box rests open beside the tower."}),
    rims: choice("How are the rims finished?", {"thick": "Thick rolled rims.", "flat": "Flat square edged rims.", "notched": "Small ventilation notches.", "bands": "Iron handling bands below the rims."}),
    load: choice("What is in the top box?", {"empty": "An empty dark interior.", "insulator": "A pale porcelain insulator.", "setters": "Small triangular ceramic setters.", "sherds": "Broken pale ceramic fragments."}),
    lid: choice("How is the top covered?", {"none": "No top cover.", "disc": "A circular refractory lid.", "slab": "A flat slab rests diagonally.", "ajar": "A lid is propped at an angle."}),
    handling: choice("What carries the stack?", {"board": "A thick wooden loading board.", "cart": "A low kiln cart.", "bricks": "Four short firebricks.", "bare": "The boxes stand directly on the floor."}),
    state: choice("What firing history is visible?", {"new": "Fresh clean fireclay.", "crack": "A dark vertical firing crack.", "patch": "A pale repair patch.", "mark": "Painted kiln batch marks."}),
    height: score("How many firing boxes are stacked?", ["Two boxes", "Four boxes", "Six boxes"])
  },
  build(a,context){

    const s=new Sculpture(context),clay=s.material({buff:'#b8a782',red:'#a97f63',grey:'#9c9f8b',black:'#686e5b'}[a.clay]),inside=s.material('#74745c'),wood=s.material('#94764d'),metal=s.material('#637265');const n=2+Math.round(a.height*4),base=a.handling==='bare'?0:a.handling==='bricks'?0.12:0.18;
    if(a.handling==='board'||a.handling==='cart')s.box([1.2,0.09,0.9],[0,base-0.045,0],wood);if(a.handling==='bricks')for(const x of [-0.28,0.28])for(const z of [-0.25,0.25])s.box([0.2,0.12,0.3],[x,0.06,z],clay);if(a.handling==='cart')for(const x of [-0.45,0.45])for(const z of [-0.3,0.3])s.cylinder(0.08,0.08,0.05,[x,0.08,z],metal,16).rotation.z=Math.PI/2;
    let topY=base,topX=0;for(let j=0;j<n;j++){const split=a.stack==='split',level=split?Math.floor(j/2):j,x=split?(j%2-0.5)*0.72:a.stack==='open'&&j===n-1?0.85:a.stack==='offset'?(j%2-0.5)*0.08:0,y=base+(a.stack==='open'&&j===n-1?0:level*0.23),square=a.form==='square'||a.form==='mixed'&&j%2===1,scale=a.form==='oval'?1.3:1;
      if(square){s.box([0.65,0.035,0.65],[x,y+0.018,0],clay);for(const dx of [-0.3,0.3])s.box([0.06,0.22,0.65],[x+dx,y+0.11,0],clay);for(const z of [-0.3,0.3])s.box([0.65,0.22,0.06],[x,y+0.11,z],clay);}else{const box=s.lathe([[0,0],[0.33,0],[0.34,0.22],[0.29,0.22],[0.28,0.035],[0,0.035]],clay,[x,y,0]);box.scale.x=scale;}
      if(a.rims==='thick')s.ring(0.325,0.025,[x,y+0.22,0],clay).rotation.x=Math.PI/2;if(a.rims==='bands')s.ring(0.34,0.012,[x,y+0.17,0],metal).rotation.x=Math.PI/2;if(a.rims==='notched')for(let k=0;k<4;k++)s.box([0.04,0.035,0.05],[x+Math.cos(k*Math.PI/2)*0.31,y+0.22,Math.sin(k*Math.PI/2)*0.31],inside);
      if(a.state==='crack'&&j===1)s.rod([x-0.04,y+0.02,0.338],[x+0.04,y+0.2,0.338],0.005,inside);if(a.state==='patch'&&j===1)s.box([0.2,0.13,0.015],[x,y+0.1,0.342],s.material('#cec2a0'));if(a.state==='mark')s.label('K'+(j+1),0.15,0.09,[x,y+0.12,0.346],'#656b55','#b7aa85');if(y>=topY){topY=y+0.22;topX=x;}}
    if(a.load==='insulator'){s.cylinder(0.08,0.12,0.2,[topX,topY-0.07,0],s.material('#ddd6bd'),24);for(const y of [topY-0.13,topY-0.05])s.cylinder(0.14,0.08,0.04,[topX,y,0],s.material('#ddd6bd'),24);}if(a.load==='setters'||a.load==='sherds')for(let j=0;j<5;j++)s.box([0.09,0.035,0.08],[topX+(context.random()-0.5)*0.4,topY-0.15,(context.random()-0.5)*0.4],s.material('#d2c9aa')).rotation.y=j;
    if(a.lid!=='none'){const lid=s.cylinder(0.35,0.35,0.045,[topX,topY+(a.lid==='ajar'?0.1:0.025),0],clay,a.lid==='slab'?4:32);if(a.lid==='ajar')lid.rotation.z=0.3;if(a.lid==='slab')lid.rotation.y=0.4;}return s.finish();

  },
});
