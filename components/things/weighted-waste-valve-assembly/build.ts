import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    seat: choice("What shape is the valve seat?", {"round": "A circular bolted seat.", "square": "A square inspection housing.", "flared": "A flared discharge mouth.", "split": "A cutaway half-round seat."}),
    lever: choice("What counterweight lever is fitted?", {"straight": "A straight long lever.", "fork": "A forked yoke with twin weights.", "arched": "A high arched lever.", "short": "A short compact rocker."}),
    weights: choice("What weights adjust the timing?", {"discs": "Three stacked iron discs.", "ball": "A single heavy iron ball.", "slide": "A rectangular sliding weight.", "nuts": "Two large threaded weight nuts."}),
    stand: choice("What carries the assembly?", {"plate": "A rectangular steel baseplate.", "wood": "A heavy timber test block.", "legs": "Four short bolted legs.", "rail": "Two narrow mounting rails."}),
    spring: choice("What return aid is visible?", {"coil": "A small vertical coil spring.", "leaf": "A bowed flat leaf spring.", "stop": "A simple adjustable stop screw.", "none": "Only the counterweight returns the valve."}),
    adjustment: choice("How is the setting read?", {"scale": "A graduated scale beside the stem.", "notches": "Notches cut along the weight arm.", "dial": "A small pointer dial at the pivot.", "none": "No measurement marks."}),
    guard: choice("What protects the mechanism?", {"open": "The mechanism is exposed.", "hoop": "A high protective hoop.", "mesh": "A slatted guard on the rear side.", "cover": "A shallow cap over the pivot."}),
    state: choice("What is the valve position?", {"seated": "The valve is fully seated.", "lifted": "The valve is clearly lifted.", "locked": "A red locking pin holds the lever.", "service": "A loose spare valve disc rests on the base."}),
    travel: score("How tall is the operating stem?", ["A short travel valve", "A standard valve", "A long travel experimental valve"])
  },
  build(a,context){

 const s=new Sculpture(context),iron=s.material('#586f61',{metalness:.6}),brass=s.material('#b8a16a',{metalness:.8}),dark=s.material('#3f5145'),wood=s.material('#9c8259'),pale=s.material('#d1c7a7'),h=.45+a.travel*.25,base=.08,r=.14;
 if(a.stand==='wood')s.box([1,.08,.6],[0,.04,0],wood);else if(a.stand==='legs')for(const x of [-.4,.4])for(const z of [-.22,.22])s.box([.1,.08,.1],[x,.04,z],iron);else if(a.stand==='rail')for(const z of [-.2,.2])s.box([1,.08,.08],[0,.04,z],iron);else s.box([1,.08,.6],[0,.04,0],iron);if(a.stand==='legs'||a.stand==='rail')s.box([1,.025,.6],[0,.0675,0],iron);
 const vx=-.22;s.cylinder(r,r,.12,[vx,.14,0],iron,32);if(a.seat==='square')s.box([.33,.12,.33],[vx,.14,0],iron);if(a.seat==='flared')s.lathe([[.12,0],[.16,.08],[.21,.14],[.19,.14],[.1,.02]],iron,[vx,.1,0]);if(a.seat==='split')s.cylinder(.11,.11,.13,[vx,.145,.055],dark,24);s.ring(.15,.02,[vx,.21,0],brass).rotation.x=Math.PI/2;
 const lift=a.state==='lifted'?.075:0;s.cylinder(.125,.125,.025,[vx,.215+lift,0],brass,28);s.rod([vx,.22+lift,0],[vx,h+lift+.025,0],.012,brass);
 const px=0;for(const z of [-.12,.12])s.rod([px,base,z],[px,h,z],.025,iron);s.rod([px,h,-.15],[px,h,.15],.025,brass);
 const end=a.lever==='short'?.22:.42,ly=h+.025;const lever=new THREE.Group(),start=s.root.children.length;
 if(a.lever==='arched')s.tube([[vx,ly,0],[0,ly+.12,0],[end,ly,0]],.018,iron);else for(const z of a.lever==='fork'?[-.07,.07]:[0])s.rod([vx,ly,z],[end,ly,z],.02,iron);
 const wx=a.weights==='slide'?end*.72:end-.04;if(a.weights==='discs')for(let j=0;j<3;j++)s.cylinder(.075,.075,.026,[wx,ly+.02+j*.027,0],iron,20);if(a.weights==='ball')s.ball([.085,.085,.085],[wx,ly+.075,0],iron,16);if(a.weights==='slide')s.box([.14,.09,.12],[wx,ly+.035,0],iron);if(a.weights==='nuts')for(const y of [ly+.025,ly+.075])s.cylinder(.055,.055,.04,[wx,y,0],brass,6);
 if(a.lever==='fork')for(const x of [vx,wx])s.rod([x,ly,-.09],[x,ly,.09],.02,brass);for(const obj of s.root.children.slice(start)){obj.position.y-=h;lever.add(obj);}lever.position.y=h;s.root.add(lever);lever.rotation.z=a.state==='lifted'?-Math.asin(lift/Math.abs(vx)):0;
 if(a.spring==='coil'){const pts:[number,number,number][]=[];for(let j=0;j<70;j++){const t=j/69*Math.PI*12;pts.push([.12+Math.cos(t)*.035,.085+j/69*(h-.065),Math.sin(t)*.035]);}s.tube(pts,.006,brass);}if(a.spring==='leaf')s.tube([[.2,base,0],[.18,h*.5,0],[.1,h,0]],.012,brass);if(a.spring==='stop'){s.rod([.13,base,0],[.13,h-.03,0],.012,brass);s.box([.07,.025,.07],[.13,h-.03,0],iron);}
 if(a.adjustment==='scale'){s.box([.025,h-base,.025],[vx-.18,(h+base)/2,.025],iron);s.box([.055,h-.12,.015],[vx-.18,(h+.12)/2,.05],pale);for(let j=0;j<8;j++)s.box([j%2?.025:.04,.005,.01],[vx-.18,.15+j*(h-.16)/8,.063],dark);}if(a.adjustment==='notches')for(let j=0;j<8;j++){const n=s.box([.003,.015,.045],[.08+j*.035,ly+.02-h,0],brass);lever.add(n);};if(a.adjustment==='dial'){s.cylinder(.08,.08,.02,[0,h,.15],pale,24).rotation.x=Math.PI/2;s.rod([0,h,.165],[.05,h+.03,.165],.004,dark);}
 if(a.guard==='hoop')s.tube([[-.38,base,-.17],[-.38,h+.25,-.17],[.48,h+.25,-.17],[.48,base,-.17]],.018,iron);if(a.guard==='mesh'){for(let j=0;j<10;j++)s.rod([-.38+j*.09,base,-.2],[-.38+j*.09,h+.18,-.2],.008,iron);for(const y of [base,h+.18])s.rod([-.4,y,-.2],[.48,y,-.2],.015,iron);}if(a.guard==='cover'){s.box([.2,.04,.32],[0,h+.1,0],iron);for(const z of [-.12,.12])s.rod([0,h,z],[0,h+.08,z],.02,iron);}
 if(a.state==='locked')s.rod([0,h,-.2],[0,h,.2],.012,s.material('#a9674e'));if(a.state==='service')s.cylinder(.12,.12,.022,[.24,base+.011,.2],brass,24);return s.finish();

  },
});
