import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    length: choice("What jointer bed form is used?", {"long": "A long narrow jointer plane.", "broad": "A broad heavy plane bed.", "taper": "A tapered jointer body.", "split": "A sectional plane with a visible seam."}),
    legs: choice("How is the jointer supported?", {"splayed": "Four splayed timber legs.", "trestles": "Two end trestles.", "low": "A low bench cradle.", "iron": "An iron support stand."}),
    blade: choice("What cutting blade is fitted?", {"straight": "A straight iron blade.", "skew": "A skewed blade.", "wide": "A broad jointing iron.", "covered": "A fitted blade guard."}),
    stave: choice("What workpiece lies on the bed?", {"curved": "A long curved stave.", "straight": "A straight rough stave.", "pair": "Two stacked narrow staves.", "none": "An empty working bed."}),
    fence: choice("What guidance is fitted?", {"side": "A long side fence.", "stops": "Two short end stops.", "adjust": "A screw-adjusted fence.", "plain": "No fence."}),
    clamp: choice("What secures the blade?", {"wedge": "A broad wooden wedge.", "screw": "A large clamping screw.", "cap": "A flat iron cap.", "double": "Two narrow wedges."}),
    shavings: choice("What shavings are visible?", {"curls": "Several curled shavings.", "pile": "A small pile of short chips.", "strip": "One long curled shaving.", "clean": "A swept floor."}),
    tools: choice("What adjustment tool is nearby?", {"mallet": "A wooden mallet.", "rule": "A marked measuring rule.", "wedge": "A spare blade wedge.", "none": "No extra tool."}),
    size: score("How long is the working bench?", ["Small cask jointer", "Standard cooper jointer", "Large vat-stave jointer"])
  },
  build(a,context){
 const s=new Sculpture(context),wood=s.material('#a68a5e'),light=s.material('#c0a46e'),dark=s.material('#5b543f'),iron=s.material('#606f5d',{metalness:.5}),brass=s.material('#b59e63'),pale=s.material('#dfd0a7');

 const L=1.4+a.size*.9,W=a.length==='broad'?.38:.24,Y=a.legs==='low'?.35:.85;for(const x of [-L*.4,L*.4])for(const z of [-W*.4,W*.4])s.rod([x*1.08,0,z*1.8],[x,Y,z],a.legs==='iron'?.025:.045,a.legs==='iron'?iron:wood);s.box([L,.16,W],[0,Y-.08,0],wood);if(a.length==='taper')for(const side of [-1,1])s.box([L*.4,.1,.03],[side*L*.3,Y-.08,side*.04],light).rotation.y=side*.08;if(a.length==='split')s.box([.025,.16,W+.01],[0,Y-.08,0],iron);
 s.box([.18,.012,W*.7],[0,Y+.006,0],dark);const blade=s.box([.04,.035,a.blade==='wide'?W*.9:W*.65],[0,Y+.02,0],iron);blade.rotation.y=a.blade==='skew'?.3:0;if(a.blade==='covered')s.box([.18,.05,W],[0,Y+.035,0],wood);
 if(a.stave!=='none'){const count=a.stave==='pair'?2:1;for(let j=0;j<count;j++){if(a.stave==='curved')s.surface((u,v,p)=>p.set((u-.5)*L*.7,Y+.04+Math.sin(u*Math.PI)*.07,(v-.5)*.12),light,{segments:[20,2]});else s.box([L*.7,.03,.11],[0,Y+.04+j*.032,0],light);}}
 if(a.fence==='side'||a.fence==='adjust')s.box([L*.85,.1,.035],[0,Y+.05,-W/2],dark);if(a.fence==='stops')for(const x of [-L*.35,L*.35])s.box([.05,.07,W],[x,Y+.035,0],dark);if(a.fence==='adjust')for(const x of [-L*.25,L*.25]){s.rod([x,Y+.06,-W/2],[x,Y+.06,-W/2-.13],.01,iron);s.ring(.035,.008,[x,Y+.06,-W/2-.13],iron);}
 if(a.clamp==='screw')s.cylinder(.025,.025,.12,[.15,Y+.06,0],iron,12);if(a.clamp==='cap')s.box([.16,.02,.15],[.14,Y+.02,0],iron);if(a.clamp==='wedge'||a.clamp==='double')for(const z of a.clamp==='double'?[-.05,.05]:[0])s.box([.18,.04,.06],[.15,Y+.04,z],light).rotation.z=-.12;
 if(a.shavings==='curls'||a.shavings==='strip')for(let j=0;j<(a.shavings==='strip'?1:5);j++)s.ring(.045+j*.006,.007,[-.3+j*.15,.012,.3],light,Math.PI*1.6).rotation.x=Math.PI/2;if(a.shavings==='pile')for(let j=0;j<9;j++)s.box([.08,.009,.02],[-.3+(j%3)*.1,.008+Math.floor(j/3)*.006,.25+Math.floor(j/3)*.04],light).rotation.y=j*.6;
 if(a.tools==='mallet'){s.rod([-.3,.018,-.3],[0,.018,-.3],.015,wood);s.box([.08,.04,.14],[.04,.02,-.3],dark);}if(a.tools==='rule'){s.box([.5,.008,.04],[.3,.004,-.3],pale);for(let j=0;j<12;j++)s.box([.002,.002,.02],[.08+j*.04,.009,-.3],dark);}if(a.tools==='wedge')s.box([.17,.03,.08],[0,.015,-.3],light);return s.finish();

  },
});
