import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    frame: choice("What windlass frame is used?", {"portal": "A tall timber portal.", "low": "A low two-post windlass.", "a": "A splayed A-frame.", "iron": "An iron winding frame."}),
    drive: choice("How is the rope drum turned?", {"crank": "A single long hand crank.", "bars": "Two removable handspikes.", "wheel": "A large spoked wheel.", "capstan": "A vertical capstan drum."}),
    drum: choice("What rope drum is fitted?", {"plain": "A smooth timber drum.", "flanged": "A drum with broad end flanges.", "grooved": "A grooved iron drum.", "twin": "Two separated winding drums."}),
    cask: choice("What shell is being drawn together?", {"open": "A widely splayed stave shell.", "drawn": "A nearly closed barrel shell.", "half": "A half-raised set of staves.", "none": "An empty windlass frame."}),
    rope: choice("What binding arrangement is used?", {"single": "One broad rope loop.", "double": "Two binding loops.", "cross": "A crossed rope draw.", "chain": "A chain-like metal binding."}),
    ratchet: choice("What locking gear is visible?", {"wheel": "A toothed ratchet wheel.", "pin": "A simple drum locking pin.", "pawl": "A long gravity pawl.", "none": "No locking gear."}),
    base: choice("What carries the work?", {"boards": "A broad timber floorboard base.", "rails": "Two narrow rails.", "blocks": "Four heavy timber blocks.", "clear": "Direct floor supports."}),
    state: choice("What working detail appears?", {"ready": "A ready bending station.", "steam": "A small heating pan beneath the shell.", "wedge": "A spare hardwood wedge.", "spare": "A coiled spare rope."}),
    width: score("How broad is the windlass?", ["Small keg windlass", "Standard cask windlass", "Large vat windlass"])
  },
  build(a,context){
 const s=new Sculpture(context),wood=s.material('#a68a5e'),light=s.material('#c0a46e'),dark=s.material('#5b543f'),iron=s.material('#606f5d',{metalness:.5}),brass=s.material('#b59e63'),pale=s.material('#dfd0a7');

 const W=1+a.width*.7,H=a.frame==='low'?.85:1.5,mat=a.frame==='iron'?iron:wood,by=a.base==='boards'?.06:a.base==='rails'?.08:0;if(a.base==='boards')s.box([W+.5,.06,1.35],[0,.03,.25],wood);if(a.base==='rails')for(const z of [-.12,.65])s.box([W+.5,.08,.1],[0,.04,z],wood);
 for(const x of [-W/2,W/2]){s.rod([a.frame==='a'?x*1.2:x,by,-.12],[x,H,-.12],.06,mat);if(a.base==='blocks')s.box([.3,.15,.3],[x,.075,-.12],dark);}if(a.frame==='portal')s.rod([-W/2,H,-.12],[W/2,H,-.12],.07,wood);
 const dy=H*.75;if(a.drive==='capstan'){s.cylinder(.13,.13,.5,[0,dy,-.12],wood,24);s.rod([-.45,dy+.25,-.12],[.45,dy+.25,-.12],.025,wood);s.rod([0,by,-.12],[0,dy-.25,-.12],.04,iron);}else{s.cylinder(.13,.13,W*.85,[0,dy,-.12],a.drum==='grooved'?iron:wood,24).rotation.z=Math.PI/2;s.rod([-W*.6,dy,-.12],[W*.6,dy,-.12],.025,iron);if(a.drum==='flanged')for(const x of [-W*.42,W*.42])s.cylinder(.2,.2,.035,[x,dy,-.12],iron,24).rotation.z=Math.PI/2;if(a.drum==='twin')s.cylinder(.15,.15,.12,[0,dy,-.12],iron,20).rotation.z=Math.PI/2;if(a.drum==='grooved')for(let j=0;j<10;j++)s.ring(.135,.005,[-W*.35+j*W*.7/9,dy,-.12],dark).rotation.y=Math.PI/2;}
 const dx=W*.6;if(a.drive==='crank'){s.rod([dx,dy,-.12],[dx,dy+.3,-.12],.025,iron);s.rod([dx,dy+.3,-.12],[dx+.18,dy+.3,-.12],.03,wood);}if(a.drive==='bars')s.rod([dx,dy,-.12],[dx,dy,.12],.025,iron);if(a.drive==='bars')for(const z of [-.12,.12])s.rod([dx,dy-.35,z],[dx,dy+.35,z],.025,wood);if(a.drive==='wheel'){s.ring(.35,.025,[dx,dy,-.12],wood).rotation.y=Math.PI/2;for(let j=0;j<8;j++){const t=j*Math.PI/4;s.rod([dx,dy,-.12],[dx,dy+Math.cos(t)*.35,-.12+Math.sin(t)*.35],.018,wood);}}
 if(a.ratchet!=='none'&&a.drive==='capstan'){s.cylinder(.19,.19,.03,[0,dy-.26,-.12],iron,14);s.rod([-.27,by,-.12],[-.27,dy-.26,-.12],.02,iron);s.rod([-.27,dy-.26,-.12],[-.15,dy-.26,-.12],.018,brass);}if(a.ratchet!=='none'&&a.drive!=='capstan'){s.cylinder(.19,.19,.03,[-W*.48,dy,-.12],iron,14).rotation.z=Math.PI/2;if(a.ratchet==='pin')s.rod([-W*.52,dy-.15,-.12],[-W*.52,dy+.15,-.12],.012,brass);if(a.ratchet==='pawl')s.rod([-W/2,H-.1,-.12],[-W*.48,dy+.1,-.12],.018,iron);}
 const R=.32,ch=.65,cZ=.58,N=a.cask==='half'?8:16;if(a.cask!=='none')for(let j=0;j<N;j++){const t=j/16*Math.PI*2,topR=a.cask==='open'?.44:.34;s.surface((u,v,p)=>{const tt=t+(u-.5)*.35,rr=R+(topR-R)*v;return p.set(Math.sin(tt)*rr,by+v*ch,cZ+Math.cos(tt)*rr);},j%2?wood:light,{segments:[2,12]});}
 if(a.cask!=='none')for(const v of a.rope==='double'?[.45,.8]:[.75]){const rr=R+(a.cask==='open'?.12:.02)*v;s.ring(rr+.01,.013,[0,by+ch*v,cZ],a.rope==='chain'?iron:dark).rotation.x=Math.PI/2;s.tube([[-rr,by+ch*v,cZ],[-W*.25,dy,-.12],[W*.25,dy,-.12],[rr,by+ch*v,cZ]],.012,a.rope==='chain'?iron:dark);if(a.rope==='cross')s.rod([-rr,by+ch*v,cZ],[rr,by+ch*v,cZ],.012,dark);}
 if(a.state==='steam')s.cylinder(.2,.2,.05,[0,by+.025,cZ],iron,24);if(a.state==='wedge')s.box([.2,.04,.08],[-W*.4,.02,.95],light);if(a.state==='spare')for(let j=0;j<3;j++)s.ring(.16+j*.02,.01,[W*.45,.012,.9],dark).rotation.x=Math.PI/2;return s.finish();

  },
});
