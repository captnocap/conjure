import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    mast: choice("What carries the boom?", {"post": "A single upright iron post.", "tripod": "A three-legged mast.", "wall": "A freestanding wall bracket.", "gantry": "A two-post gantry."}),
    arm: choice("What is the boom geometry?", {"straight": "A straight horizontal arm.", "jib": "A triangular braced jib.", "elbow": "A bent offset arm.", "twin": "Two parallel carrier arms."}),
    hose: choice("How is the hose hanging?", {"drop": "A straight vertical drop.", "loop": "A broad hanging loop.", "swing": "The nozzle is swung outward.", "park": "The hose is parked against the mast."}),
    nozzle: choice("What is the delivery nozzle?", {"cone": "A conical metal nozzle.", "straight": "A straight narrow tube.", "gate": "A square gate head.", "fork": "A forked twin nozzle."}),
    balance: choice("What balances the arm?", {"block": "A square counterweight.", "discs": "Stacked iron discs.", "spring": "A tension spring.", "none": "An unbalanced fixed bracket."}),
    controls: choice("What valve control is fitted?", {"lever": "A long hand lever.", "wheel": "A round handwheel.", "chain": "A hanging pull chain.", "plain": "A simple collar."}),
    base: choice("What anchors the mast?", {"plate": "A bolted steel plate.", "concrete": "A concrete footing.", "wheels": "A wheeled mobile base.", "rails": "Two longitudinal floor rails."}),
    supply: choice("How is the inlet arranged?", {"pipe": "A rigid vertical supply pipe.", "funnel": "A top filling funnel.", "elbow": "A short upper elbow.", "capped": "A capped service connection."}),
    reach: score("How far does the boom reach?", ["Short service reach", "Normal tram reach", "Wide depot reach"])
  },
  build(a,context){
 const s=new Sculpture(context),iron=s.material('#71665c',{metalness:.5}),dark=s.material('#3e423d'),brass=s.material('#b59c66',{metalness:.6}),sand=s.material('#cdbb89'),wood=s.material('#a58b63'),pale=s.material('#d5cbb0');

 const H=1.8,L=.65+a.reach*.8;if(a.base==='concrete')s.box([.6,.18,.6],[0,.09,0],pale);else if(a.base==='rails')for(const z of [-.24,.24])s.box([1,.06,.08],[0,.03,z],iron);else{s.box([.6,.05,.6],[0,.025,0],iron);if(a.base==='wheels')for(const x of [-.25,.25])for(const z of [-.25,.25])s.cylinder(.07,.07,.04,[x,.07,z],dark,16).rotation.x=Math.PI/2;}
 if(a.mast==='tripod')for(let j=0;j<3;j++){const t=j*Math.PI*2/3;s.rod([Math.cos(t)*.32,.03,Math.sin(t)*.32],[0,H,0],.035,iron);}else if(a.mast==='gantry'){for(const z of [-.3,.3])s.rod([0,.03,z],[0,H,z],.035,iron);s.rod([0,H,-.3],[0,H,.3],.035,iron);}else s.rod([0,.03,0],[0,H+.15,0],.06,iron);if(a.mast==='wall')s.box([.12,H,.5],[-.15,H/2,0],wood);
 const zs=a.arm==='twin'?[-.09,.09]:[0];for(const z of zs)s.tube([[0,H,z],[L*.55,H,z],[L,H+(a.arm==='elbow'?.22:0),z]],.035,iron);if(a.arm==='jib'||a.balance==='spring')s.rod([0,H,0],[0,H+.35,0],.035,iron);if(a.arm==='jib')s.rod([0,H+.35,0],[L,H,0],.02,iron);s.rod([0,H,0],[-.35,H,0],.035,iron);
 if(a.balance==='block')s.box([.22,.25,.22],[-.35,H-.1,0],iron);if(a.balance==='discs')for(let j=0;j<3;j++)s.cylinder(.12,.12,.06,[-.35,H-.03-j*.065,0],iron,20);if(a.balance==='spring'){const pts:[number,number,number][]=[];for(let j=0;j<60;j++){const u=j/59;pts.push([-.35*u, H+.25*(1-u)+Math.sin(u*Math.PI*14)*.02,Math.cos(u*Math.PI*14)*.02]);}s.tube(pts,.006,brass);}
 const nx=a.hose==='park'?.15:a.hose==='swing'?L+.35:L,ny=a.hose==='loop'?.65:.85,ay=H+(a.arm==='elbow'?.22:0);s.tube([[0,H+.05,0],[L*.5,H+.05,0],[L,ay,0],[a.hose==='loop'?L+.25:nx,ny+.3,.12],[nx,ny,.14]],.045,dark);s.ring(.065,.01,[L,ay+.015,0],brass).rotation.y=Math.PI/2;
 if(a.nozzle==='cone')s.cylinder(.06,.03,.25,[nx,ny-.1,.14],iron,20);else if(a.nozzle==='gate')s.box([.17,.2,.12],[nx,ny-.08,.14],iron);else for(const dx of a.nozzle==='fork'?[-.06,.06]:[0])s.rod([nx,ny,.14],[nx+dx,ny-.22,.14],.025,iron);
 if(a.controls==='lever')s.rod([nx,ny,.14],[nx+.2,ny+.08,.14],.015,brass);if(a.controls==='wheel'){s.rod([nx,ny,.14],[nx,ny,.25],.01,brass);s.ring(.07,.01,[nx,ny,.25],brass);}if(a.controls==='chain')s.rod([nx,ny,.18],[nx,ny-.45,.18],.005,brass);
 if(a.supply==='pipe')s.rod([-.12,.04,0],[-.12,H+.04,0],.05,iron);if(a.supply==='funnel')s.cylinder(.2,.04,.3,[0,H+.2,0],iron,24);if(a.supply==='elbow')s.tube([[0,H,0],[0,H+.2,0],[-.3,H+.2,0]],.045,iron);if(a.supply==='capped')s.cylinder(.08,.08,.04,[0,H+.17,0],brass,20);return s.finish();

  },
});
