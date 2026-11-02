import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineWorld({
  questions: {
    layout: choice("What defines the workshop layout?", {"corner": "Benches around a clear central floor.", "island": "A central assembly island.", "long": "A long narrow bench along the back.", "bays": "Two distinct work bays."}),
    walls: choice("What surrounds the shop?", {"brick": "Warm exposed brick.", "white": "Pale painted masonry.", "timber": "Old timber boarding.", "metal": "Corrugated metal lining."}),
    hearth: choice("What protects the brazing area?", {"bricks": "An open firebrick hearth.", "screen": "A tall curved heat shield.", "hood": "A metal extraction hood.", "tiles": "A tiled heatproof corner."}),
    storage: choice("How are the tubes stored?", {"vertical": "Tall vertical tube bins.", "horizontal": "Long horizontal wall racks.", "cubbies": "Square cubbies of tube stock.", "bundles": "Tied bundles on a low skid."}),
    window: choice("How does daylight enter?", {"factory": "Wide multi-pane factory windows.", "high": "A narrow high window strip.", "door": "An open street door.", "roof": "A rooflight frame."}),
    work: choice("What is the workshop doing?", {"build": "Frames in active fabrication.", "fitting": "A measured fitting session.", "paint": "Paint samples and protective paper.", "quiet": "Benches swept and tools hung up."}),
    bench: choice("What lies on the permanent bench?", {"tools": "Files and metal measuring tools.", "drawings": "Broad frame geometry drawings.", "jars": "Small flux jars and cans.", "tubes": "Loose tube lengths and sockets."}),
    sign: choice("What identifies the shop?", {"frames": "CUSTOM FRAMES over the bench.", "sizes": "Frame size charts on the wall.", "numbers": "Numbered work bays.", "none": "No visible signage."}),
    space: score("How generous is the working space?", ["A compact frame shop", "A comfortable frame shop", "A broad workshop"])
  },
  build(a,context){

    const width=9+a.space*2,depth=8;const island=a.layout==='island';const {world,art:s}=diorama(context,{width,depth,background:'#e2e6df',floor:'#b5b39e',maxHeight:2.5,radius:1.1,pitch:35,yaw:28,scale:[0.65,1.8],slots:island?[[0,1.4,0,1],[-2.7,1.2,0,1],[2.7,1.2,0,1]]:[[0,0,0,1],[-2.8,1,0,1],[2.7,1.3,0,1]]});
    const wall=s.material({brick:'#b79070',white:'#d5d4bb',timber:'#a18b65',metal:'#a5ada1'}[a.walls]),wood=s.material('#a58b60'),iron=s.material('#5d7169'),light=s.material('#bed0cc');
    s.box([width,3.4,0.15],[0,1.7,-3.85],wall);s.box([0.15,3.4,8],[width/2,1.7,0],wall);
    if(a.walls==='brick')for(let row=0;row<8;row++){s.box([width,0.018,0.025],[0,0.2+row*0.4,-3.76],wood);for(let col=0;col<Math.floor(width/0.9);col++)s.box([0.015,0.38,0.025],[-width/2+col*0.9+(row%2)*0.45,0.4+row*0.4,-3.76],wood);}
    if(a.walls==='timber'||a.walls==='metal')for(let i=0;i<30;i++)s.box([0.04,3.4,0.025],[-width/2+i*width/30,1.7,-3.76],wood);
    const bh=0.9;function bench(x:number,z:number,w:number,d:number){s.box([w,0.1,d],[x,bh-0.05,z],wood);for(const xx of [-w/2+0.1,w/2-0.1])for(const zz of [-d/2+0.1,d/2-0.1])s.box([0.08,bh-0.1,0.08],[x+xx,(bh-0.1)/2,z+zz],iron);}
    bench(0,-3.2,a.layout==='long'?width-1:4.7,0.9);if(island)bench(0,-1.4,3.2,1.7);if(a.layout==='bays')bench(-3,-1.7,2.6,1.2);
    s.box([1.8,0.1,1.1],[width/2-1.15,0.9,-2.9],s.material('#b9ad87'));for(const x of [width/2-2,width/2-0.3])s.box([0.13,0.85,1],[x,0.425,-2.9],wall);
    if(a.hearth==='bricks'||a.hearth==='tiles')s.box([1.8,0.9,0.15],[width/2-1.15,1.4,-3.5],s.material(a.hearth==='tiles'?'#d9d2b4':'#c5af7e'));
    if(a.hearth==='screen')s.cylinder(0.9,0.9,1.2,[width/2-0.7,1.5,-3],iron,24,);if(a.hearth==='hood'){s.cylinder(0.25,0.95,0.65,[width/2-1.1,2.3,-3],iron,4);s.cylinder(0.18,0.18,0.9,[width/2-1.1,3,-3],iron,20);}
    for(let i=0;i<12;i++){const x=-width/2+0.6+i%4*0.2,z=-2.8+Math.floor(i/4)*0.16,mat=s.material(i%2?'#9fa99b':'#6f8178');if(a.storage==='vertical')s.cylinder(0.035,0.035,1.7+(i%3)*0.35,[x,0.85+(i%3)*0.175,z],mat,12);else if(a.storage==='horizontal')s.rod([-width/2+0.3,1.2+i*0.1,-3.3],[-width/2+2.5,1.2+i*0.1,-3.3],0.025,mat);else s.rod([-width/2+0.4,0.2+Math.floor(i/4)*0.1,-3+i%4*0.1],[-width/2+2.2,0.2+Math.floor(i/4)*0.1,-3+i%4*0.1],0.035,mat);}
    if(a.storage==='cubbies')for(let i=0;i<4;i++)s.box([2.4,0.08,0.8],[-width/2+1.4,0.15+i*0.35,-3],wood);
    if(a.window==='roof'){for(const x of [-1.5,1.5])for(const z of [-3.6,2.8])s.rod([x,0,z],[x,3.2,z],0.055,iron);for(const x of [-1.5,1.5])s.rod([x,3.2,-3.6],[x,3.2,2.8],0.07,iron);for(const z of [-3.6,0,2.8])s.rod([-1.5,3.2,z],[1.5,3.2,z],0.07,iron);}else{const w=a.window==='high'?5:3,h=a.window==='door'?2.9:a.window==='high'?0.7:1.3,y=a.window==='door'?1.45:2.45;s.box([w,h,0.03],[0,y,-3.75],light);for(let j=0;j<5;j++)s.box([0.04,h,0.04],[-w/2+j*w/4,y,-3.72],iron);s.box([w,0.05,0.04],[0,y,-3.72],iron);}
    if(a.bench==='drawings')s.label('FRAME / 56',1.3,0.55,[0,0.905,-3.2],'#69786b','#e2d7b6').rotation.x=-Math.PI/2;else for(let i=0;i<6;i++){const x=-1.8+i*0.6;if(a.bench==='jars')s.cylinder(0.07,0.07,0.16,[x,0.98,-3.2],light,18);else s.rod([x,0.93,-3.4],[x+0.3,0.93,-3.1],a.bench==='tubes'?0.035:0.012,iron);}
    if(a.work==='paint')s.box([3.5,0.01,2.5],[1.8,0.01,1],s.material('#c8b48a'));if(a.work==='fitting')for(let j=0;j<16;j++)s.box([0.3,0.012,0.02],[-3.5,0.01,-1.5+j*0.28],iron);if(a.work==='quiet')for(let j=0;j<7;j++)s.rod([-1.8+j*0.5,1.5,-3.7],[-1.8+j*0.5,1.9,-3.7],0.02,iron);if(a.work==='build')for(let j=0;j<6;j++)s.rod([3,0.03,-1+j*0.08],[3.7,0.03,-0.8+j*0.08],0.02,iron);
    if(a.sign!=='none')s.label(a.sign==='frames'?'CUSTOM FRAMES':a.sign==='sizes'?'52   54   56   58':'BAY 1     BAY 2',2.8,0.3,[0,3.16,-3.73],'#4f6359','#d9cfad');return world;

  },
});
