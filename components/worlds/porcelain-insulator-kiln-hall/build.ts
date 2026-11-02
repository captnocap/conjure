import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineWorld({
  questions: {
    kilns: choice("What kilns dominate the hall?", {"bottle": "Two tall bottle-shaped brick kilns.", "dome": "Three low domed updraft kilns.", "tunnel": "A long arched tunnel kiln.", "square": "Two square downdraft kilns."}),
    brick: choice("What is the kiln masonry?", {"red": "Warm red firebrick.", "buff": "Buff refractory brick.", "dark": "Dark smoke stained brick.", "mixed": "Alternating patched brickwork."}),
    roof: choice("How is the hall roof supported?", {"arches": "High iron barrel-vault ribs.", "trusses": "Triangular timber roof trusses.", "columns": "Tall columns carrying overhead beams.", "open": "An open yard around the kilns."}),
    doors: choice("How are the kiln mouths closed?", {"open": "Dark open loading arches.", "bricked": "Temporary brick closing walls.", "iron": "Heavy iron fire doors.", "ajar": "One open mouth and one closed door."}),
    tracks: choice("What guides the kiln loads?", {"rails": "Parallel narrow gauge rails.", "plates": "Broad metal floor plates.", "grooves": "Dark wheel grooves in the floor.", "clear": "A clear untracked floor."}),
    cooling: choice("What is cooling near the wall?", {"saggars": "Tall stacks of empty saggars.", "shelves": "Shelves of pale insulators.", "carts": "Two low loaded kiln carts.", "empty": "Empty cooling space."}),
    flue: choice("How do the kilns vent?", {"stacks": "Two tall individual chimneys.", "duct": "A shared overhead metal duct.", "wall": "A curved brick rear flue.", "short": "Short capped kiln vents."}),
    state: choice("What stage is the firing hall at?", {"loading": "A load waits before an open mouth.", "firing": "Warm light glows from kiln mouths.", "cooling": "Doors are open after firing.", "maintenance": "Tools and new bricks wait near a kiln."}),
    capacity: score("How large is the firing hall?", ["A small porcelain works", "A working kiln hall", "A large production hall"])
  },
  build(a,context){

    const width=12+a.capacity*3,depth=12;const {world,art:s}=diorama(context,{width,depth,background:'#e5dfcd',floor:'#b6ad91',maxHeight:2.8,radius:1.15,pitch:34,yaw:30,scale:[0.65,1.6],slots:[[0,2.2],[-3.6,2.7],[3.6,2.7],[0,-1],[-4,0]]});const brick=s.material({red:'#a97c5b',buff:'#bba57b',dark:'#7f7861',mixed:'#a58e6b'}[a.brick]),iron=s.material('#627465'),dark=s.material('#4d5445'),pale=s.material('#d2c6a1');
    const centers=a.kilns==='dome'?[-4,0,4]:[-3.3,3.3];for(const [i,x] of centers.entries()){const z=-3;if(a.kilns==='square')s.box([3,3.1,3],[x,1.55,z],brick);else if(a.kilns==='tunnel'){if(i>0)continue;s.cylinder(2,2,7,[0,1.3,-3],brick,32).rotation.z=Math.PI/2;s.box([8,1.3,3.5],[0,0.65,-3],brick);}else if(a.kilns==='dome')s.lathe([[0,0],[1.55,0],[1.55,1.3],[1.4,2],[0.9,2.5],[0.4,2.7],[0.3,3],[0,3]],brick,[x,0,z]);else s.lathe([[0,0],[1.65,0],[1.65,2.7],[1.5,3.1],[0.85,3.9],[0.6,4.6],[0.6,5],[0,5]],brick,[x,0,z]);
      const front=z+(a.kilns==='tunnel'?1.8:1.57),open=a.doors==='open'||a.doors==='ajar'&&i===0||a.state==='cooling';s.box([1.15,1.55,0.04],[x,0.78,front],open?dark:a.doors==='iron'?iron:brick);s.ring(0.58,0.09,[x,1.25,front+0.04],pale,Math.PI);if(a.state==='firing')s.box([0.95,0.15,0.015],[x,0.35,front+0.035],s.material('#c28c54',{emissive:'#815332',emissiveIntensity:0.35}));for(let j=0;j<6;j++)s.ring(a.kilns==='dome'?1.5:1.65,0.014,[x,0.35+j*0.42,z],dark).rotation.x=Math.PI/2;
      if(a.flue==='stacks')s.cylinder(0.32,0.42,5.5,[x,2.75,-5.3],brick,16);if(a.flue==='short')s.cylinder(0.35,0.38,0.45,[x,a.kilns==='bottle'?5.1:3.15,z],iron,20);}
    if(a.flue==='duct'){s.rod([-4,4.7,-3],[4,4.7,-3],0.27,iron);for(const x of [-3.3,3.3])s.rod([x,3.3,-3],[x,4.7,-3],0.24,iron);}if(a.flue==='wall')s.tube([[-4,2,-5.6],[-2,3.5,-5.6],[2,3.5,-5.6],[4,2,-5.6]],0.35,brick);
    if(a.roof!=='open')for(const z of [-5.7,0,5.5]){for(const x of [-width/2+0.3,width/2-0.3])s.rod([x,0,z],[x,4.6,z],0.1,iron);if(a.roof==='arches')s.tube([[-width/2+0.3,4.6,z],[-3,6,z],[0,6.4,z],[3,6,z],[width/2-0.3,4.6,z]],0.09,iron);else{s.rod([-width/2+0.3,4.6,z],[width/2-0.3,4.6,z],0.1,iron);if(a.roof==='trusses'){s.rod([-width/2+0.3,4.6,z],[0,6,z],0.09,iron);s.rod([0,6,z],[width/2-0.3,4.6,z],0.09,iron);}}}
    if(a.tracks!=='clear')for(const x of [-0.6,0.6])s.box([a.tracks==='plates'?0.4:0.045,0.025,9.5],[x,0.02,0.5],a.tracks==='grooves'?dark:iron);
    if(a.cooling==='shelves'){for(const y of [0.6,1.2,1.8]){s.box([0.8,0.08,3.6],[-width/2+0.8,y,-1],iron);for(let j=0;j<7;j++)s.cylinder(0.14,0.07,0.1,[-width/2+0.8,y+0.1,-2.5+j*0.5],pale,20);}for(const z of [-2.8,0.8])s.rod([-width/2+0.8,0,z],[-width/2+0.8,2,z],0.06,iron);}
    if(a.cooling==='saggars'||a.cooling==='carts')for(let j=0;j<5;j++){const x=width/2-0.8,z=-3+j*0.75;for(let k=0;k<(a.cooling==='saggars'?4:2);k++)s.lathe([[0,0],[0.3,0],[0.3,0.25],[0.25,0.25],[0.25,0.04],[0,0.04]],pale,[x,0.1+k*0.26,z]);if(a.cooling==='carts')s.box([0.8,0.12,0.7],[x,0.06,z],iron);}
    if(a.state==='maintenance')for(let j=0;j<12;j++)s.box([0.32,0.12,0.18],[-2+j%4*0.35,0.06+Math.floor(j/4)*0.13,-0.8],pale);if(a.state==='loading')s.box([1.7,0.15,1.4],[0,0.08,-0.9],iron);return world;

  },
});
