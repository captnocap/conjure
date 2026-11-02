import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    frame: choice("What frame encloses the press?", {"wood": "A stout timber portal.", "iron": "A cast iron portal.", "twin": "A double-screw timber frame.", "arch": "An arched iron press frame."}),
    screw: choice("What screw form is fitted?", {"wood": "A broad wooden screw.", "iron": "A narrow threaded iron screw.", "coarse": "A deep coarse-threaded screw.", "smooth": "A smooth testing ram."}),
    handle: choice("How is the press turned?", {"bar": "A long sliding crossbar.", "wheel": "A large horizontal wheel.", "spokes": "Four wooden turning spokes.", "crank": "A short cranked handle."}),
    platen: choice("What pressing platen is used?", {"square": "A broad square platen.", "round": "A round pressing plate.", "slats": "A slatted draining platen.", "small": "A narrow pressing block."}),
    cloth: choice("What is being pressed?", {"stack": "A thick folded cloth stack.", "roll": "A tightly rolled cloth bundle.", "thin": "A single folded cloth layer.", "empty": "No cloth in the press."}),
    drain: choice("How is water collected?", {"tray": "A shallow catch tray.", "spout": "A tray with a front spout.", "bucket": "A bucket beneath the drain.", "channel": "A narrow side drain channel."}),
    base: choice("What supports the press?", {"feet": "Four wide feet.", "skids": "Two timber skids.", "stone": "A stone foundation.", "bench": "A raised working bench."}),
    state: choice("What working stage is shown?", {"loaded": "The platen touches the cloth.", "open": "The platen is raised.", "tight": "The cloth is compressed.", "service": "A loose packing board lies aside."}),
    width: score("How broad is the press?", ["Small finishing press", "Standard wet-cloth press", "Large mill press"])
  },
  build(a,context){
 const s=new Sculpture(context),wood=s.material('#9d8159'),light=s.material('#bca272'),dark=s.material('#555b45'),iron=s.material('#61745f',{metalness:.4}),cloth=s.material('#c9c3a4'),stone=s.material('#b3b59a'),water=s.material('#86aca0',{transparent:true,opacity:.55,depthWrite:false});

 const W=.8+a.width*.6,H=1.45,Y=a.base==='bench'?.55:.16,mat=a.frame==='wood'||a.frame==='twin'?wood:iron;if(a.base==='stone')s.box([W+.3,.16,.9],[0,.08,0],stone);else if(a.base==='skids')for(const z of [-.3,.3])s.box([W+.3,.12,.12],[0,.06,z],wood);else for(const x of [-W*.43,W*.43])for(const z of [-.3,.3])s.box([.15,Y,.15],[x,Y/2,z],wood);
 for(const x of [-W/2,W/2])s.box([.12,H,.14],[x,Y+H/2,-.02],mat);s.box([W+.15,.16,.2],[0,Y+H,0],mat);if(a.frame==='arch')s.ring(W/2,.06,[0,Y+H-.2,0],iron,Math.PI);s.box([W,.12,.7],[0,Y-.06,0],wood);const clothH=a.cloth==='empty'?0:a.state==='tight'?.08:a.cloth==='thin'?.07:.22,py=a.state==='open'?Y+.65:Y+clothH+.045;
 if(a.cloth==='roll')s.cylinder(clothH/2,clothH/2,W*.65,[0,Y+clothH/2,0],cloth,24).rotation.z=Math.PI/2;else if(a.cloth!=='empty')for(let j=0;j<(a.cloth==='thin'?2:5);j++)s.box([W*.7,clothH/(a.cloth==='thin'?2:5),.45],[0,Y+(j+.5)*clothH/(a.cloth==='thin'?2:5),0],cloth);
 if(a.platen==='round')s.cylinder(W*.4,W*.4,.09,[0,py,0],wood,32);else s.box([a.platen==='small'?W*.5:W*.85,.09,.55],[0,py,0],wood);if(a.platen==='slats')for(let j=0;j<7;j++)s.box([W*.85,.01,.015],[0,py+.05,-.24+j*.08],dark);
 for(const x of a.frame==='twin'?[-W*.25,W*.25]:[0]){const rad=a.screw==='iron'?.03:.05;s.rod([x,py+.04,0],[x,Y+H+.35,0],rad,a.screw==='wood'?wood:iron);if(a.screw!=='smooth')for(let j=0;j<(a.screw==='coarse'?12:24);j++)s.ring(rad+(a.screw==='coarse'?.02:.008),.006,[x,py+.1+j*(Y+H+.2-py)/(a.screw==='coarse'?12:24),0],a.screw==='wood'?dark:light).rotation.x=Math.PI/2;const hy=Y+H+.28;if(a.handle==='wheel'){s.ring(.22,.02,[x,hy,0],wood).rotation.x=Math.PI/2;for(let j=0;j<6;j++){const t=j*Math.PI/3;s.rod([x,hy,0],[x+Math.cos(t)*.22,hy,Math.sin(t)*.22],.015,wood);}}else if(a.handle==='spokes')for(let j=0;j<4;j++){const t=j*Math.PI/2;s.rod([x,hy,0],[x+Math.cos(t)*.3,hy,Math.sin(t)*.3],.025,wood);}else{s.rod([x-.3,hy,0],[x+.3,hy,0],.025,wood);if(a.handle==='crank')s.rod([x+.3,hy,0],[x+.3,hy+.15,0],.02,iron);}}
 if(a.drain==='tray'||a.drain==='spout')for(const z of [-.36,.36])s.box([W,.07,.035],[0,Y+.035,z],wood);if(a.drain==='spout'||a.drain==='bucket')s.box([.18,.05,.3],[0,Y-.04,.45],wood);if(a.drain==='bucket')s.lathe([[0,0],[.13,0],[.18,Y-.1],[.16,Y-.1],[.11,.02],[0,.02]],iron,[0,0,.58]);if(a.drain==='channel')s.box([.15,.05,1],[W/2-.12,Y-.03,.3],iron);if(a.state==='service')s.box([W*.6,.035,.45],[W/2+.45,.0175,0],wood);return s.finish();

  },
});
