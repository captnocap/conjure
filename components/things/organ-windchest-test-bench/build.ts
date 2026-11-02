import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    chest: choice("What windchest form is tested?", {"slider": "A long slider chest.", "divided": "A divided two-chamber chest.", "round": "A compact circular test chest.", "narrow": "A narrow single-rank chest."}),
    action: choice("What key action is visible?", {"keys": "A short keyboard.", "pedals": "Three broad foot pedals.", "pulls": "Vertical pull-wire handles.", "levers": "Individual wooden test levers."}),
    cover: choice("How is the chest opened?", {"closed": "Top cover fitted.", "cutaway": "A front cutaway shows pallets.", "half": "Half the top is removed.", "raised": "A removable lid stands at the back."}),
    sockets: choice("What socket arrangement is shown?", {"row": "A single straight row.", "double": "Two rows of pipe sockets.", "mixed": "Large and small sockets alternate.", "plugs": "Unused sockets have plugs."}),
    stand: choice("What supports the chest?", {"trestles": "Two wooden trestles.", "legs": "Four square legs.", "cabinet": "A storage pedestal.", "steel": "An iron test frame."}),
    air: choice("How is wind supplied?", {"hose": "A flexible side wind hose.", "box": "A square wooden wind trunk.", "bellows": "A small side bellows.", "pipe": "A round metal inlet."}),
    gauge: choice("What pressure indicator is fitted?", {"water": "A U-tube water gauge.", "dial": "A round pressure dial.", "flag": "A light pressure flag.", "none": "No gauge."}),
    state: choice("What testing detail appears?", {"ready": "Bench ready to receive pipes.", "pipe": "One short test pipe is installed.", "tools": "A small tuning tool set.", "numbered": "Socket positions are numbered."}),
    width: score("How broad is the test bench?", ["Compact voicing chest", "Standard bench", "Wide multi-rank bench"])
  },
  build(a,context){
 const s=new Sculpture(context),metal=s.material('#a3aaa0',{metalness:.6,roughness:.45}),dark=s.material('#444f47'),brass=s.material('#b89e66',{metalness:.65}),wood=s.material('#a38a62'),pale=s.material('#d9cfb1'),leather=s.material('#77614c');

 const W=1+a.width*.8,H=.8,D=a.chest==='narrow'?.4:.65;if(a.stand==='cabinet')s.box([W*.85,H,.5],[0,H/2,0],wood);else for(const x of [-W*.4,W*.4])for(const z of [-D*.38,D*.38])s.rod([x,0,z],[x,H,z],a.stand==='steel'?.025:.04,a.stand==='steel'?metal:wood);s.box([W,.08,D],[0,H-.04,0],wood);
 if(a.chest==='round')s.cylinder(.45,.45,.22,[0,H+.11,0],wood,32);else{for(const z of [-D/2,D/2])if(!(a.cover==='cutaway'&&z>0))s.box([W,.22,.035],[0,H+.11,z],wood);for(const x of [-W/2,W/2])s.box([.035,.22,D],[x,H+.11,0],wood);if(a.chest==='divided')s.box([.04,.22,D],[0,H+.11,0],wood);}
 if(a.stand==='trestles')for(const x of [-W*.4,W*.4]){s.rod([x,.08,-D*.38],[x,H,D*.38],.025,wood);s.rod([x,.08,D*.38],[x,H,-D*.38],.025,wood);}
 const top=H+.22;if(a.cover==='half'||a.cover==='raised')for(const z of a.sockets==='double'?[-D*.2,D*.2]:[0])s.box([W,.04,.11],[0,top-.005,z],wood);if(a.cover==='closed'||a.cover==='cutaway')s.box([W,.025,D],[0,top,0],wood);if(a.cover==='half')s.box([W/2,.025,D],[W/4,top,0],wood);if(a.cover==='raised')s.box([W,.5,.025],[0,top+.25,-D/2],wood);
 for(let j=0;j<8;j++){const x=-W*.4+j*W*.8/7;for(const z of a.sockets==='double'?[-D*.2,D*.2]:[0]){const r=a.sockets==='mixed'&&j%2?.025:.04;s.ring(r,.009,[x,top+.018,z],brass).rotation.x=Math.PI/2;if(a.sockets==='plugs'&&j%3)s.cylinder(r,r,.05,[x,top+.035,z],wood,16);else s.cylinder(r*.7,r*.7,.005,[x,top+.006,z],dark,16);}s.box([.055,.035,D*.7],[x,H+.065,0],leather);s.rod([x,H+.065,D*.2],[x,H-.15,D*.65],.005,brass);if(a.action==='keys')s.box([W*.08,.025,.25],[x,H-.11,D*.65],j%3?pale:dark);if(a.action==='pulls')s.rod([x,H-.12,D*.65],[x,H+.15,D*.65],.012,wood);if(a.action==='levers')s.rod([x,H-.12,D*.5],[x,H+.05,D*.9],.015,wood);if(a.state==='numbered')s.label(String(j+1),.06,.04,[x,top+.04,D/2+.025],'#e1d5b1','#5c533f');}s.box([W,.05,.15],[0,H-.15,D*.65],wood);
 if(a.action==='pedals')for(const x of [-.3,0,.3]){s.box([.15,.05,.55],[x,.04,.3],wood);s.rod([x,.06,.15],[x,H+.05,.1],.008,brass);}
 if(a.air==='hose')s.tube([[W/2,H+.1,0],[W/2+.25,.2,0],[W/2+.35,.04,.3]],.035,leather);if(a.air==='box')s.box([.4,.18,.2],[W/2+.15,H+.1,0],wood);if(a.air==='pipe')s.rod([W/2,H+.1,0],[W/2+.4,H+.1,0],.05,metal);if(a.air==='bellows'){s.box([.4,.04,.35],[W/2+.2,.02,0],wood);s.box([.4,.12,.35],[W/2+.2,.1,0],leather);s.tube([[W/2+.2,.15,0],[W/2,H+.1,0]],.03,leather);}
 if(a.gauge==='water'){s.box([.14,.5,.04],[-W/2+.1,top+.25,-D/2],wood);s.tube([[-W/2+.06,top+.45,-D/2+.03],[-W/2+.06,top+.1,-D/2+.03],[-W/2+.14,top+.1,-D/2+.03],[-W/2+.14,top+.45,-D/2+.03]],.008,metal);}if(a.gauge==='dial'){s.rod([W/2,top,0],[W/2,top+.2,0],.01,brass);s.cylinder(.07,.07,.025,[W/2,top+.2,.02],pale,20).rotation.x=Math.PI/2;}if(a.gauge==='flag')s.rod([W/2,top,0],[W/2,top+.3,0],.005,brass);if(a.state==='pipe')s.cylinder(.04,.02,.5,[0,top+.25,0],metal,20);if(a.state==='tools')for(let j=0;j<3;j++)s.rod([-.12+j*.1,top+.02,D*.3],[-.12+j*.1,top+.02,D*.3+.1],.008,brass);return s.finish();

  },
});
