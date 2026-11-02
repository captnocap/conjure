import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    box: choice("What shape is the sandbox?", {"wedge": "A wedge-shaped underfloor box.", "round": "A rounded cylindrical box.", "square": "A squat square tank.", "twin": "Two small paired sandboxes."}),
    stand: choice("What service cradle supports it?", {"trestle": "A high four-leg trestle.", "low": "A low timber cradle.", "wheels": "A wheeled service trolley.", "rails": "Two workshop mounting rails."}),
    lid: choice("How is the lid positioned?", {"shut": "Closed and latched.", "open": "Raised on a rear hinge.", "aside": "Removed and resting beside the cradle.", "half": "A sliding lid is half open."}),
    meter: choice("What metering mechanism is exposed?", {"rod": "A pull-rod linkage.", "wheel": "A small metering wheel.", "spring": "A sprung plunger.", "plain": "A plain shutoff slide."}),
    nozzle: choice("What outlet pipe is fitted?", {"straight": "A straight downward nozzle.", "bent": "A long bent track nozzle.", "split": "A forked pair of pipes.", "removed": "A disconnected nozzle rests below."}),
    fill: choice("What is visible inside?", {"sand": "A pale layer of traction sand.", "dark": "An empty dark interior.", "clump": "Several damp clumps.", "screen": "A protective inlet screen."}),
    tools: choice("What service accessories are laid out?", {"spanner": "A broad open-ended spanner.", "brush": "A long clearing brush.", "bolts": "Four loose mounting bolts.", "none": "The cradle is clear."}),
    condition: choice("What inspection detail appears?", {"clean": "Clean serviceable parts.", "patch": "A bolted side repair patch.", "chalk": "A white inspection cross.", "tag": "A hanging defect tag."}),
    width: score("How broad is the sandbox?", ["Narrow tram box", "Standard sandbox", "Broad double-truck box"])
  },
  build(a,context){
 const s=new Sculpture(context),iron=s.material('#71665c',{metalness:.5}),dark=s.material('#3e423d'),brass=s.material('#b59c66',{metalness:.6}),sand=s.material('#cdbb89'),wood=s.material('#a58b63'),pale=s.material('#d5cbb0');

 const W=.55+a.width*.5,Y=a.stand==='trestle'?.8:a.stand==='wheels'?.35:.12,B=.42,depth=.46;
 for(const z of [-.26,.26])s.box([W+.3,.08,.1],[0,Y-.04,z],wood);for(const x of [-W*.4,W*.4])for(const z of [-.24,.24]){s.box([.06,Math.max(.04,Y-.04),.06],[x,(Y-.04)/2,z],iron);if(a.stand==='wheels')s.cylinder(.07,.07,.04,[x,.07,z],dark,16).rotation.x=Math.PI/2;}
 const centers=a.box==='twin'?[-W*.26,W*.26]:[0],bw=a.box==='twin'?W*.46:W;for(const x of centers){if(a.box==='round')s.lathe([[0,0],[bw/2,0],[bw/2,B],[bw/2-.025,B],[bw/2-.025,.025],[0,.025]],iron,[x,Y,0]);else{s.box([bw,.03,depth],[x,Y+.015,0],iron);for(const z of [-depth/2,depth/2]){const b=s.box([bw,B,.025],[x,Y+B/2,z],iron);if(a.box==='wedge')b.rotation.x=z>0?-.15:.15;}for(const xx of [-bw/2,bw/2])s.box([.025,B,depth],[x+xx,Y+B/2,0],iron);}
 if(a.fill==='sand'||a.fill==='clump')s.box([bw*.8,.025,.32],[x,Y+.08,0],sand);if(a.fill==='clump')for(let j=0;j<4;j++)s.ball([.07,.045,.05],[x-bw*.25+j*bw*.16,Y+.12,.03],wood,8);if(a.fill==='screen')for(let j=0;j<7;j++)s.rod([x-bw*.4+j*bw*.8/6,Y+B-.04,-.18],[x-bw*.4+j*bw*.8/6,Y+B-.04,.18],.008,iron);
 if(a.lid==='aside')s.box([bw,.03,depth],[W/2+.4,.015,0],iron);else{const lid=new THREE.Group();lid.position.set(x,Y+B,-depth/2);lid.add(s.box([bw,.03,depth],[a.lid==='half'?bw*.4:0,.015,depth/2],iron));lid.rotation.x=a.lid==='open'?-1.1:0;s.root.add(lid);}
 const oy=Y+.04;s.rod([x,Y+.15,.12],[x,Y+.15,.34],.025,brass);if(a.meter==='wheel')s.ring(.09,.012,[x,Y+.15,.35],brass);if(a.meter==='rod')s.rod([x,Y+.15,.34],[x+.18,Y+B+.15,.34],.016,iron);if(a.meter==='spring')for(let j=0;j<7;j++)s.ring(.035,.006,[x,Y+.15,.25+j*.015],brass);if(a.meter==='plain')s.box([.14,.04,.1],[x,Y+.15,.34],brass);
 if(a.nozzle==='removed')s.rod([W/2+.35,.035,.3],[W/2+.6,.035,.3],.035,iron);else for(const dx of a.nozzle==='split'?[-.08,.08]:[0])s.tube([[x,oy,0],[x+dx,Math.max(.06,oy-.12),0],[x+dx,Math.max(.04,oy-.22),a.nozzle==='bent'?.35:.08]],.025,iron);
 if(a.condition==='patch')s.box([bw*.5,.18,.015],[x,Y+.22,.25],brass);if(a.condition==='chalk'){s.rod([x-.05,Y+.2,.247],[x+.05,Y+.3,.247],.004,pale);s.rod([x+.05,Y+.2,.247],[x-.05,Y+.3,.247],.004,pale);}if(a.condition==='tag'){s.rod([x,Y+B,.24],[x+.08,Y+.2,.28],.003,wood);s.label('FAULT',.16,.08,[x+.08,Y+.16,.28],'#d9ceb0','#9d6750');}}
 if(a.tools==='bolts')for(let j=0;j<4;j++)s.rod([-.2+j*.09,.014,.43],[-.2+j*.09,.014,.52],.012,iron);if(a.tools==='spanner'){s.rod([-.2,.013,.43],[.18,.013,.43],.018,iron);s.ring(.045,.012,[-.2,.013,.43],iron,Math.PI*1.5).rotation.x=Math.PI/2;}if(a.tools==='brush'){s.rod([-.25,.025,.43],[.2,.025,.43],.012,wood);s.box([.15,.05,.06],[.22,.025,.43],dark);}return s.finish();

  },
});
