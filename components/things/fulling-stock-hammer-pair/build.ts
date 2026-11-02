import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    heads: choice("What hammer heads are fitted?", {"square": "Broad squared timber feet.", "steps": "Stepped toothed beating feet.", "round": "Rounded wooden beating heads.", "long": "Long narrow fulling feet."}),
    arms: choice("What swinging arms are fitted?", {"straight": "Straight timber arms.", "crooked": "Forward-curved arms.", "fork": "Forked paired arms.", "iron": "Timber arms with iron bands."}),
    frame: choice("What overhead frame carries them?", {"portal": "A heavy timber portal.", "a": "A splayed A-frame.", "double": "A double braced portal.", "stone": "Two stone piers and a timber crossbeam."}),
    trough: choice("What receives the stocks?", {"box": "A rectangular fulling box.", "split": "Two separate fulling tubs.", "open": "An open shallow trough.", "bare": "An exposed test base."}),
    position: choice("How are the stocks positioned?", {"level": "Both heads lowered together.", "alternate": "One head raised and one lowered.", "raised": "Both heads lifted.", "service": "One head held high for service."}),
    drive: choice("What drive connection is visible?", {"tails": "Rear lifting tails.", "pegs": "Short cam-engagement pegs.", "ropes": "Two overhead service ropes.", "plain": "Only the pivot axle."}),
    cloth: choice("What cloth is in the trough?", {"full": "A folded thick cloth bundle.", "low": "A small cloth bundle.", "water": "Only shallow water.", "empty": "An empty dry trough."}),
    state: choice("What maintenance detail appears?", {"ready": "A complete working pair.", "wedges": "Hardwood locking wedges.", "bands": "Additional head repair bands.", "scale": "A marked stroke gauge."}),
    height: score("How tall is the fulling stock frame?", ["Compact workshop stocks", "Standard mill stocks", "Large cloth-mill stocks"])
  },
  build(a,context){
 const s=new Sculpture(context),wood=s.material('#9d8159'),light=s.material('#bca272'),dark=s.material('#555b45'),iron=s.material('#61745f',{metalness:.4}),cloth=s.material('#c9c3a4'),stone=s.material('#b3b59a'),water=s.material('#86aca0',{transparent:true,opacity:.55,depthWrite:false});

 const H=1.5+a.height*.7,W=1.3,Y=.12;for(const x of [-W/2,W/2]){if(a.frame==='stone')s.box([.25,H,.35],[x,H/2,-.15],stone);else{for(const z of a.frame==='double'?[-.35,.1]:[-.15])s.rod([a.frame==='a'?x*1.3:x,0,z],[x,H,z],.07,wood);}}s.box([W+.25,.16,.25],[0,H,-.15],wood);s.rod([-W*.6,H-.12,-.15],[W*.6,H-.12,-.15],.035,iron);
 if(a.trough==='bare')s.box([1.2,.094,.75],[0,.047,.32],stone);if(a.trough!=='bare'){const n=a.trough==='split'?2:1;for(let j=0;j<n;j++){const x=n===2?(j-.5)*.6:0,w=n===2?.52:1.2,h=a.trough==='open'?.12:.3;s.box([w,.07,.75],[x,.035,.32],wood);for(const z of [-.055,.695])s.box([w,h,.06],[x,h/2,z],wood);for(const xx of [-w/2,w/2])s.box([.06,h,.75],[x+xx,h/2,.32],wood);}}
 for(let j=0;j<2;j++){const x=(j-.5)*.55,hy=a.position==='raised'?.9:a.position==='alternate'&&j===0?.8:a.position==='service'&&j===1?1.1:.45,hz=.34;for(const dx of a.arms==='fork'?[-.045,.045]:[0]){if(a.arms==='crooked')s.tube([[x+dx,H-.12,-.15],[x+dx,H*.65,.3],[x+dx,hy,hz]],.045,wood);else s.rod([x+dx,H-.12,-.15],[x+dx,hy,hz],.045,wood);}if(a.heads==='round')s.cylinder(.16,.16,.35,[x,hy,hz],wood,20).rotation.z=Math.PI/2;else s.box([a.heads==='long'?.2:.32,.25,a.heads==='long'?.5:.3],[x,hy,hz],wood);if(a.heads==='steps')for(let k=0;k<4;k++)s.box([.32,.045,.055],[x,hy-.14,hz-.13+k*.085],dark);if(a.arms==='iron'||a.state==='bands')for(const yy of [hy+.04,hy+.14])s.box([.34,.035,.33],[x,yy,hz],iron);
 if(a.drive==='tails')s.rod([x,H-.12,-.15],[x,H-.25,-.65],.04,wood);if(a.drive==='pegs')s.rod([x,hy+.08,hz+.035],[x,hy+.08,hz-.32],.025,wood);if(a.drive==='ropes')s.rod([x,H+.05,.05],[x,hy+.12,hz],.008,dark);if(a.cloth==='full'||a.cloth==='low')s.ball([.22,a.cloth==='full'?.13:.07,.23],[x,.07+(a.cloth==='full'?.13:.07),.32],cloth,16);if(a.state==='wedges')s.box([.1,.06,.18],[x,H+.1,-.15],light).rotation.x=.1;}
 if(a.cloth==='water')s.box([1,.012,.58],[0,.1,.32],water);if(a.state==='scale'){s.box([.08,H*.7,.03],[-W/2+.03,H*.5,.06],cloth);for(let j=0;j<10;j++)s.box([.055,.009,.01],[-W/2+.03,H*.18+j*H*.065,.08],dark);}return s.finish();

  },
});
