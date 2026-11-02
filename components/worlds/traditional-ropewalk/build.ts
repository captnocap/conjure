import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineWorld({
  questions: {
    structure: choice("How is the long shed framed?", {"posts": "Open posts and repeated gabled trusses.", "arches": "Repeated curved timber roof ribs.", "brick": "Low brick side walls and timber trusses.", "poles": "Rustic poles with simple cross beams."}),
    lanes: choice("How many rope lanes run through it?", {"one": "One broad central laying lane.", "two": "Two parallel work lanes.", "three": "Three narrow lanes.", "empty": "The lanes are clear between jobs."}),
    floor: choice("What covers the long floor?", {"earth": "Compacted golden earth.", "plank": "Long timber floorboards.", "brick": "Red brick paving.", "gravel": "Pale fine gravel."}),
    roof: choice("How much roof remains visible?", {"open": "Only the roof framing remains.", "strip": "A narrow tiled strip covers the far end.", "slats": "Alternating roof slats cast striped shadows.", "canvas": "A canvas shade over the rear section."}),
    fibre: choice("What line runs down the shed?", {"hemp": "Golden hemp line.", "white": "Pale cotton line.", "tar": "Dark tarred cord.", "mixed": "Alternating pale and dark lanes."}),
    stores: choice("What lines the shed edge?", {"hanks": "Hanging hanks of loose fibre.", "coils": "Finished coils on low boards.", "bundles": "Tied fibre bundles in open racks.", "drums": "Two large timber cord drums."}),
    end: choice("What closes the distant end?", {"doors": "Tall double loading doors.", "gear": "A large fixed headstock frame.", "open": "Open daylight beyond the last truss.", "wall": "A pale masonry end wall."}),
    state: choice("What stage is the ropewalk at?", {"working": "Taut strands run between guides.", "clearing": "One lane has been released and coiled.", "measuring": "Large distance marks line the edge.", "idle": "Hooks and guide posts stand ready."}),
    length: score("How long is the visible ropewalk?", ["A short preserved section", "A long working shed", "A very long ropewalk"])
  },
  build(a,context){

    const width=8,depth=15+a.length*10;const {world,art:s}=diorama(context,{width,depth,background:'#e2e3d5',floor:{earth:'#b6a47d',plank:'#ad9367',brick:'#a98164',gravel:'#bcb9a0'}[a.floor],maxHeight:2.4,radius:1.1,pitch:31,yaw:32,scale:[0.7,1.6],slots:[[0,depth/2-4],[2.5,depth/2-6],[-2.5,depth/2-7],[0,0],[2.5,-depth/2+3]]});
    const wood=s.material(a.structure==='poles'?'#8a7651':'#a08658'),dark=s.material('#5e6a53'),rope=s.material(a.fibre==='tar'?'#575b49':a.fibre==='white'?'#d2c7a2':'#b5a16a'),n=7+Math.round(a.length*4);
    for(let j=0;j<n;j++){const z=-depth/2+0.4+j*(depth-0.8)/(n-1);for(const x of [-3.6,3.6])s.rod([x,0,z],[x,3.1,z],0.085,wood);s.rod([-3.6,3.1,z],[3.6,3.1,z],0.07,wood);if(a.structure==='arches')s.tube([[-3.6,3.1,z],[-2,4.2,z],[0,4.5,z],[2,4.2,z],[3.6,3.1,z]],0.085,wood);else if(a.structure!=='poles'){s.rod([-3.6,3.1,z],[0,4.35,z],0.085,wood);s.rod([0,4.35,z],[3.6,3.1,z],0.085,wood);s.rod([0,3.1,z],[0,4.35,z],0.06,wood);}for(const x of [-3.6,3.6])s.rod([x,2.5,z],[x,3.1,z+0.55],0.05,wood);}
    for(const x of [-3.6,0,3.6])s.rod([x,x===0?4.35:3.1,-depth/2],[x,x===0?4.35:3.1,depth/2],0.07,wood);
    if(a.structure==='brick')for(const x of [-3.8,3.8])s.box([0.22,0.75,depth],[x,0.375,0],s.material('#ad8866'));
    if(a.floor==='plank')for(let i=0;i<16;i++)s.box([0.014,0.008,depth],[-3.8+i*0.5,0.005,0],wood);if(a.floor==='brick')for(let j=0;j<40;j++)s.box([8,0.008,0.02],[0,0.005,-depth/2+j*depth/40],wood);
    if(a.roof==='strip'||a.roof==='canvas')for(const side of [-1,1])s.box([3.9,0.045,depth*0.28],[side*1.8,3.72,-depth*0.35],s.material(a.roof==='canvas'?'#c9be99':'#886f55')).rotation.z=-side*0.33;
    if(a.roof==='slats')for(let j=0;j<9;j++)for(const side of [-1,1])s.box([3.9,0.04,0.25],[side*1.8,3.72,-depth/2+j*depth/9],wood).rotation.z=-side*0.33;
    const count=a.lanes==='one'?1:a.lanes==='two'?2:a.lanes==='three'?3:0;for(let lane=0;lane<Math.max(1,count);lane++){const x=(lane-(Math.max(1,count)-1)/2)*1.3;for(let j=0;j<5;j++){const z=-depth/2+2+j*(depth-5)/4;s.rod([x-0.3,0,z],[x,0.85,z],0.025,wood);s.rod([x+0.3,0,z],[x,0.85,z],0.025,wood);s.rod([x-0.18,0.85,z],[x+0.18,0.85,z],0.025,dark);}if(count&&a.state!=='idle')for(let k=0;k<3;k++)s.rod([x+(k-1)*0.045,0.89,-depth/2+1.5],[x+(k-1)*0.045,0.89,depth/2-7],0.01,a.fibre==='mixed'&&lane%2?s.material('#d3c7a0'):rope);}
    for(let j=0;j<5;j++){const z=-depth/2+2+j*1.5;if(a.stores==='hanks')for(let k=0;k<4;k++)s.tube([[-3.55,2,z+k*0.05],[-3.3,0.8,z+k*0.05],[-3.5,2,z+k*0.05]],0.018,rope);if(a.stores==='coils')for(let k=0;k<5;k++)s.ring(0.28+k*0.025,0.025,[-3.05,0.06+k*0.02,z],rope).rotation.x=Math.PI/2;if(a.stores==='bundles'){s.box([0.7,0.07,1.1],[-3.05,0.5,z],wood);for(let k=0;k<3;k++)s.rod([-3.3,0.59+k*0.12,z-0.4],[-3.3,0.59+k*0.12,z+0.4],0.08,rope);}if(a.stores==='drums'&&j%3===0){s.cylinder(0.4,0.4,0.65,[-3,0.45,z],rope,24).rotation.z=Math.PI/2;for(const x of [-3.36,-2.64])s.cylinder(0.5,0.5,0.05,[x,0.45,z],wood,24).rotation.z=Math.PI/2;}}
    if(a.end==='doors'||a.end==='wall')s.box([7.5,3,0.15],[0,1.5,-depth/2],s.material(a.end==='wall'?'#c4bda0':'#8a7957'));if(a.end==='doors')for(const x of [-0.1,0.1])s.rod([x,1.3,-depth/2+0.1],[x,1.8,-depth/2+0.1],0.025,dark);if(a.end==='gear'){s.box([2.2,1.6,0.15],[0,0.8,-depth/2+0.4],wood);for(let i=0;i<3;i++)s.ring(0.22,0.045,[-0.6+i*0.6,1,-depth/2+0.52],dark);}
    if(a.state==='measuring')for(let j=0;j<8;j++)s.label(String(j*10),0.38,0.22,[3.2,0.012,-depth/2+1+j*(depth-2)/8],'#e0d6b1','#7f7959').rotation.x=-Math.PI/2;if(a.state==='clearing')for(let i=0;i<5;i++)s.ring(0.4+i*0.04,0.025,[2.8,0.04+i*0.02,depth/2-2],rope).rotation.x=Math.PI/2;return world;

  },
});
