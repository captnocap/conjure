import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    wall: choice("What wall construction is exposed?", {"double": "Parallel vertical board walls.", "crib": "Heavy horizontal timber cribbing.", "stud": "An outer stud wall and inner planks.", "brick": "A masonry outer wall with a timber lining."}),
    cut: choice("How is the wall opened for view?", {"half": "The right half exposes the insulation cavity.", "window": "A central rectangular cut reveals the layers.", "top": "An open upper edge reveals the full cavity.", "corner": "Two short walls form a cutaway corner."}),
    fill: choice("What fills the insulation space?", {"sawdust": "Fine densely packed sawdust.", "shavings": "Large curled wood shavings.", "straw": "Tightly packed straw insulation.", "settled": "Settled fill leaves a clear gap at the top."}),
    thickness: choice("How deep is the insulation cavity?", {"thin": "A narrow single-board cavity.", "standard": "A broad practical insulation gap.", "deep": "A very thick cold-storage wall.", "taper": "The cavity broadens toward the base."}),
    foundation: choice("What supports the wall?", {"stone": "Low rough stone footings.", "timber": "Heavy timber sill beams.", "brick": "A short brick foundation course.", "raised": "A raised floor on timber posts."}),
    floor: choice("How is stored ice supported?", {"slats": "A slatted drainage floor.", "gravel": "A bed of coarse drainage gravel.", "sawdust": "A thick sawdust floor bed.", "trough": "A timber floor above a central drain trough."}),
    ice: choice("What ice is stored beside the wall?", {"row": "A single low row of ice cakes.", "stack": "A tall staggered cake stack.", "partial": "A partly emptied store with two cakes.", "empty": "An empty storage floor."}),
    roof: choice("What top construction is visible?", {"cap": "A simple broad capping beam.", "eave": "A short projecting roof eave.", "vent": "A capped upper ventilation slit.", "open": "Exposed upright wall posts."}),
    door: choice("What loading opening is represented?", {"hatch": "A small removable loading hatch.", "sliding": "A vertical sliding insulated panel.", "plug": "A thick removable plug door beside the opening.", "none": "An uninterrupted storage wall."}),
    state: choice("What storage work is underway?", {"filled": "The wall cavity is fully closed and filled.", "topping": "A small sawdust hopper tops up the cavity.", "inspection": "A removed board leans beside the wall.", "draining": "A narrow runoff spout projects from the floor."}),
    height: score("How tall is the wall section?", ["Low ice store section", "Full-height icehouse wall", "Tall industrial storage wall"])
  },
  build(a,context){
 const s=new Sculpture(context),wood=s.material('#9b805a'),light=s.material('#c2ac83'),iron=s.material('#52696c',{metalness:.42}),dark=s.material('#405557'),stone=s.material('#adb9b1'),snow=s.material('#e6ebe0'),ice=s.material('#bed5ce',{roughness:.28}),rope=s.material('#a79370'),water=s.material('#80aaa8',{transparent:true,opacity:.6,depthWrite:false});

 const H=1.3+a.height*.9,W=1.6,T=a.thickness==='thin'?.16:a.thickness==='deep'?.5:a.thickness==='taper'?.42:.3,F=a.foundation==='raised'?.28:.12,outer=-T/2,inner=T/2;
 if(a.foundation==='raised'){for(const x of [-.7,.7])for(const z of [-.25,.65])s.box([.13,F,.13],[x,F/2,z],wood);}else for(let j=0;j<5;j++)s.box([.31,F,.5],[-.64+j*.32,F/2,0],a.foundation==='timber'?wood:stone);
 const fm=s.material(a.fill==='straw'?'#bdad64':a.fill==='shavings'?'#ccaf74':'#ac966c'),fillH=a.fill==='settled'?H*.72:H-.08;s.box([W-.1,fillH,T-.08],[0,F+fillH/2,0],fm);if(a.thickness==='taper')for(const x of [-W/2,W/2])s.rod([x,F,inner+.08],[x,F+H,inner-.04],.035,wood);
 for(const x of [-W/2,0,W/2])s.box([.075,H+.04,T+.1],[x,F+H/2,0],wood);for(const y of [F+.04,F+H-.04])s.box([W+.1,.08,T+.1],[0,y,0],wood);
 for(let j=0;j<10;j++){const x=-W/2+.08+j*.16;let bh=H,by=F+H/2;if(a.cut==='half'&&j>4){bh=H*.2;by=F+bh/2;}if(a.cut==='window'&&j>2&&j<7){bh=H*.2;by=F+bh/2;}const mat=a.wall==='brick'?stone:wood;s.box([.15,bh,.035],[x,by,outer-.025],mat);if(a.cut==='window'&&j>2&&j<7)s.box([.15,H*.2,.035],[x,F+H*.9,outer-.025],mat);s.box([.15,bh,.035],[x,by,inner+.025],light);if(a.cut==='window'&&j>2&&j<7)s.box([.15,H*.2,.035],[x,F+H*.9,inner+.025],light);}
 if(a.wall==='crib')for(let j=0;j<9;j++)s.box([W+.1,.035,.06],[0,F+.09+j*(H-.18)/8,outer-.06],wood);if(a.wall==='stud')for(const x of [-.6,-.2,.2,.6])s.box([.045,H,.07],[x,F+H/2,outer-.075],wood);if(a.cut==='corner'){s.box([.06,H,.75],[-W/2,F+H/2,.4],wood);for(let j=0;j<5;j++)s.box([T,H,.12],[-W/2+T/2,F+H/2,.22+j*.14],fm);}
 for(let j=0;j<20;j++){const x=.1+context.random()*.6,y=F+.1+context.random()*Math.max(.1,fillH-.2);if(a.cut==='half'||a.cut==='window'){if(a.fill==='straw')s.rod([x,y,inner+.007],[x+.05,y+.08,inner+.008],.004,light);else s.box([a.fill==='shavings'?.06:.025,.012,.018],[x,y,inner+.01],light).rotation.z=context.random()*2;}}
 for(const x of [-.65,.65])s.box([.12,F,.95],[x,F/2,.7],wood);const floorZ=.65;if(a.floor==='slats'||a.floor==='trough')for(let j=0;j<8;j++)s.box([.18,.05,1.1],[-.7+j*.2,F+.025,floorZ],wood);else{s.box([W,.07,1.1],[0,F+.035,floorZ],a.floor==='sawdust'?fm:stone);if(a.floor==='gravel')for(let j=0;j<25;j++)s.ball([.06,.04,.05],[(context.random()-.5)*1.5,F+.085,.2+context.random()*.9],stone,8);}if(a.floor==='trough')s.box([.12,.025,1.3],[0,F-.015,floorZ],dark);
 const n=a.ice==='empty'?0:a.ice==='partial'?2:a.ice==='row'?3:9;for(let j=0;j<n;j++)s.box([.4,.28,.42],[-.5+(j%3)*.48,F+.08+.14+Math.floor(j/3)*.29,floorZ],ice);
 if(a.roof==='cap')s.box([W+.2,.08,T+.2],[0,F+H+.04,0],wood);if(a.roof==='eave')for(const x of [-.7,.7])s.box([.08,.16,T+.25],[x,F+H+.04,0],wood);if(a.roof==='eave')s.box([W+.25,.07,T+.6],[0,F+H+.1,.1],wood).rotation.x=.12;if(a.roof==='vent'){for(const x of [-.7,.7])s.box([.04,.16,.04],[x,F+H+.08,0],wood);s.box([W+.1,.07,T+.2],[0,F+H+.19,0],wood);}
 if(a.door!=='none'){const x=-.44,y=F+H*.5,z=inner+.065;s.box([.43,.55,.055],[x,y,z],dark);if(a.door==='hatch')s.box([.4,.5,.04],[x,y,z+.04],wood).rotation.y=.2;if(a.door==='sliding'){s.box([.43,.5,.07],[x,y+.25,z+.05],wood);for(const dx of [-.25,.25])s.box([.025,.9,.06],[x+dx,y+.1,z+.08],iron);}if(a.door==='plug')s.box([.4,.5,.16],[-W/2-.3,.25,.15],wood);}
 if(a.state==='topping'){s.box([.45,.12,.4],[.4,F+H+.06,0],wood);s.box([.35,.08,.3],[.4,F+H+.16,0],fm);}if(a.state==='inspection')s.rod([-W/2-.2,0,-.2],[-W/2-.2,H*.7,outer],.055,wood);if(a.state==='draining')s.rod([0,F-.01,.9],[0,.06,1.4],.045,iron);
return s.finish();
  },
});
