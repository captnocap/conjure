import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    clapper: choice("What striking shape is fitted?", {"ball": "A round forged striking ball.", "pear": "A long pear-shaped striking head.", "barrel": "A short barrel-shaped head.", "double": "A two-lobed striking head."}),
    shaft: choice("What shaft shape is used?", {"straight": "A straight round shank.", "taper": "A shank tapering toward the eye.", "square": "A square-section forged shank.", "bent": "A slightly bent repair shank."}),
    metal: choice("How does the forging look?", {"black": "Blackened iron.", "grey": "Clean grey steel.", "brown": "Brown oxidized iron.", "polished": "A polished test clapper."}),
    eye: choice("What attaches it to the bell?", {"ring": "A broad forged suspension ring.", "fork": "A fork and cross pin.", "leather": "A thick leather suspension strap.", "chain": "Three short chain links."}),
    pallet: choice("What carries the weight?", {"skid": "Two long timber skids.", "crate": "A shallow transport crate.", "blocks": "Three padded support blocks.", "steel": "A low steel service tray."}),
    padding: choice("What cushions the metal?", {"felt": "Green felt pads.", "straw": "Tan straw filled pads.", "rubber": "Dark rubber pads.", "timber": "Bare timber blocks."}),
    tools: choice("What inspection tool is present?", {"gauge": "A large diameter gauge.", "hammer": "A small testing hammer.", "rule": "A long steel rule.", "none": "No tools."}),
    state: choice("What service state is shown?", {"ready": "A ready-to-fit clapper.", "wear": "A bright polished striking patch.", "crack": "A marked line at the neck.", "tag": "A hanging service tag."}),
    length: score("How long is the clapper?", ["A short chime clapper", "A normal tower clapper", "A long heavy clapper"])
  },
  build(a,context){

 const s=new Sculpture(context),wood=s.material('#a18a5b'),metal=s.material({black:'#47564a',grey:'#8d9e89',brown:'#8b7252',polished:'#b1bba6'}[a.metal],{metalness:0.75}),pad=s.material({felt:'#73876b',straw:'#b6a272',rubber:'#48594c',timber:'#9b8154'}[a.padding]),L=1.1+a.length*1.1,r=0.16+a.length*0.08,cy=0.16+r;
 if(a.pallet==='skid')for(const z of [-0.25,0.25])s.box([L+0.5,0.12,0.15],[0,0.06,z],wood);else if(a.pallet!=='blocks')s.box([L+0.5,0.1,0.75],[0,0.05,0],a.pallet==='steel'?s.material('#768b75'):wood);for(const x of [-L*0.35,0,L*0.35]){s.box([0.18,0.14,0.6],[x,0.07,0],wood);s.box([0.2,0.04,0.5],[x,0.16,0],pad);}if(a.pallet==='crate')for(const z of [-0.36,0.36])s.box([L+0.5,0.25,0.04],[0,0.18,z],wood);
 for(const x of [-L*0.35,0])s.box([0.15,Math.max(0.02,cy-0.22),0.2],[x,0.18+Math.max(0.02,cy-0.22)/2,0],pad);const bx=L*0.28;if(a.clapper==='pear'){s.lathe([[0,0],[r*0.5,0],[r,0.12],[r*0.8,0.28],[0,0.4]],metal,[bx-0.2,cy,0]).rotation.z=-Math.PI/2;}else if(a.clapper==='barrel')s.cylinder(r,r,0.3,[bx,cy,0],metal,32).rotation.z=Math.PI/2;else if(a.clapper==='double')for(const x of [bx-0.1,bx+0.1])s.ball([r*0.8,r*0.8,r*0.8],[x,cy,0],metal,24);else s.ball([r,r,r],[bx,cy,0],metal,24);
 if(a.shaft==='square')s.box([L*0.8,0.075,0.075],[-L*0.1,cy,0],metal);else if(a.shaft==='bent')s.tube([[-L/2,cy,0],[-L*0.15,cy+0.07,0],[bx,cy,0]],0.04,metal);else s.cylinder(a.shaft==='taper'?0.06:0.04,0.04,L*0.8,[-L*0.1,cy,0],metal,24).rotation.z=Math.PI/2;
 const ex=-L/2;if(a.eye==='ring')s.ring(0.11,0.027,[ex-0.07,cy,0],metal).rotation.x=Math.PI/2;if(a.eye==='fork'){for(const z of [-0.07,0.07])s.rod([ex+0.1,cy,0],[ex-0.15,cy,z],0.025,metal);s.rod([ex-0.13,cy,-0.08],[ex-0.13,cy,0.08],0.025,metal);}if(a.eye==='leather')s.tube([[ex+0.1,cy,0],[ex-0.2,cy,0],[ex-0.25,cy,0.16],[ex+0.1,cy,0.16],[ex+0.1,cy,0]],0.035,s.material('#8a7048'));if(a.eye==='chain')for(let j=0;j<3;j++)s.ring(0.065,0.015,[ex-j*0.1,cy,0],metal).rotation.x=j%2?0:Math.PI/2;
 if(a.tools==='rule'){s.box([L*0.8,0.01,0.06],[0,0.14,0.28],metal);for(let j=0;j<15;j++)s.box([0.004,0.005,0.04],[-L*0.35+j*L*0.7/14,0.148,0.28],pad);}if(a.tools==='hammer'){s.rod([-0.3,0.15,-0.25],[0.1,0.15,-0.25],0.02,wood);s.box([0.08,0.08,0.2],[-0.3,0.16,-0.25],metal);}if(a.tools==='gauge'){s.rod([bx-r,0.16,0.27],[bx+r,0.16,0.27],0.018,metal);for(const x of [bx-r,bx+r])s.rod([x,0.16,0.27],[x,cy,0.1],0.015,metal);}
 if(a.state==='wear')s.ball([r*0.5,0.018,r*0.6],[bx,cy+r-0.008,0],s.material('#b3bba3',{metalness:0.85}),16);if(a.state==='crack')s.ring(0.043,0.006,[bx-r-0.1,cy,0],s.material('#c1ab7e')).rotation.y=Math.PI/2;if(a.state==='tag')s.label('CLAPPER 04',0.3,0.12,[-L*0.2,0.19,0.25],'#5b6b54','#ddcfaa').rotation.x=-Math.PI/2;return s.finish();

  },
});
