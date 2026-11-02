import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    frame: choice("What frame form is used?", {"rectangle": "A rectangular timber frame.", "a": "A splayed drying frame.", "double": "Two adjacent stretching frames.", "low": "A broad low frame."}),
    cloth: choice("How is cloth stretched?", {"full": "A complete taut cloth sheet.", "half": "A narrow cloth panel.", "loose": "A loose sagging cloth sheet.", "empty": "The hooks are empty."}),
    hooks: choice("What edge fasteners are fitted?", {"iron": "Individual hooked iron pins.", "wood": "Small timber pegs.", "cord": "Laced cord loops.", "clamps": "Flat clamping blocks."}),
    stretch: choice("What stretching mechanism is used?", {"screws": "Side screw adjusters.", "wedges": "Timber tension wedges.", "ratchet": "A short ratchet bar.", "fixed": "Fixed frame rails."}),
    support: choice("What keeps the frame upright?", {"feet": "Two broad timber feet.", "braces": "Rear diagonal props.", "trestle": "Two braced side trestles.", "wall": "A freestanding backboard support."}),
    edge: choice("What cloth edge is visible?", {"straight": "Straight finished cloth edges.", "fringe": "A short lower fringe.", "fold": "A folded hem at the bottom.", "torn": "An uneven torn lower corner."}),
    marks: choice("What measuring marks appear?", {"ticks": "Width marks on the top rail.", "numbers": "Numbered stretching positions.", "strip": "A removable measuring strip.", "none": "Unmarked rails."}),
    state: choice("What drying stage is shown?", {"wet": "A slightly sagging wet sheet.", "dry": "A dry stretched sheet.", "service": "A spare rail on the floor.", "bundle": "A folded cloth bundle below."}),
    width: score("How broad is the tenter?", ["Narrow cloth panel", "Standard wool cloth frame", "Broad mill drying frame"])
  },
  build(a,context){
 const s=new Sculpture(context),wood=s.material('#9d8159'),light=s.material('#bca272'),dark=s.material('#555b45'),iron=s.material('#61745f',{metalness:.4}),cloth=s.material('#c9c3a4',{side:THREE.DoubleSide}),stone=s.material('#b3b59a'),water=s.material('#86aca0',{transparent:true,opacity:.55,depthWrite:false});

 const W=1+a.width*1.2,H=a.frame==='low'?.9:1.6,Y=.2;for(const x of [-W/2,W/2]){s.box([.09,H+.2,.09],[x,(H+.2)/2,0],wood);s.box([.35,.07,.65],[x,.035,0],wood);if(a.support==='braces'||a.support==='trestle')s.rod([x,0,-.5],[x,H*.8,0],.03,wood);if(a.support==='trestle'){s.rod([x,0,.5],[x,H*.8,0],.03,wood);s.rod([x,.1,-.5],[x,.1,.5],.025,wood);}if(a.frame==='a')s.rod([x,0,.4],[x,H+.1,0],.035,wood);}for(const y of [Y,H])s.box([W+.15,.09,.09],[0,y,0],wood);if(a.frame==='double')s.box([.07,H-.2,.07],[0,(H+.2)/2,0],wood);if(a.support==='wall')s.box([W+.15,H*.7,.04],[0,H*.35,-.06],dark);
 const cw=a.cloth==='half'?W*.45:W*.87,ch=H-Y-.13;for(let j=0;j<12;j++){const x=-W*.43+j*W*.86/11;for(const y of [Y+.06,H-.06]){if(a.hooks==='clamps')s.box([.05,.04,.05],[x,y,.035],dark);else if(a.hooks==='cord')s.ring(.025,.004,[x,y,.03],dark);else s.tube([[x,y<H/2?Y:H,0],[x,y<H/2?Y:H,.065],[x,y,.065],[x,y,.045]],a.hooks==='wood'?.009:.005,a.hooks==='wood'?wood:iron);}}
 if(a.cloth!=='empty'){s.surface((u,v,p)=>{const sag=(a.cloth==='loose'?.12:a.state==='wet'?.045:.012)*Math.sin(u*Math.PI)*Math.sin(v*Math.PI),torn=a.edge==='torn'&&u>.75&&v<.2?(u-.75)*.35:0;return p.set((u-.5)*cw,Y+.07+v*ch+torn,.045+sag);},cloth,{segments:[20,14]});if(a.edge==='fringe')for(let j=0;j<24;j++)s.rod([-cw/2+j*cw/23,Y+.06,.045],[-cw/2+j*cw/23,Y-.01,.05],.003,cloth);if(a.edge==='fold')s.box([cw,.035,.015],[0,Y+.09,.055],cloth);}
 if(a.stretch==='screws')for(const x of [-W/2,W/2]){s.rod([x-.1,H*.5,0],[x+.1,H*.5,0],.012,iron);s.ring(.045,.01,[x+.12,H*.5,0],iron).rotation.y=Math.PI/2;}if(a.stretch==='wedges')for(const x of [-W/2,W/2])s.box([.045,.2,.09],[x,H*.7,0],light).rotation.z=.08;if(a.stretch==='ratchet'){s.box([.035,.4,.04],[W/2+.04,H*.6,0],iron);for(let j=0;j<7;j++)s.box([.06,.012,.04],[W/2+.06,H*.42+j*.05,0],iron);}
 if(a.marks==='ticks')for(let j=0;j<20;j++)s.box([.004,.025,.006],[-W*.45+j*W*.9/19,H,.05],dark);if(a.marks==='numbers')for(let j=0;j<5;j++)s.label(String(j+1),.055,.04,[-W*.4+j*W*.2,H,.051],'#d9cdab','#5a573f');if(a.marks==='strip')s.box([W*.8,.04,.025],[0,H+.065,0],light);if(a.state==='service')s.box([W,.07,.07],[0,.035,.5],wood);if(a.state==='bundle')for(let j=0;j<4;j++)s.box([.45,.035,.3],[0,.0175+j*.035,.5],cloth);return s.finish();

  },
});
