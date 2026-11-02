import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    profile: choice("What resonator form is stored?", {"cone": "Straight conical resonators.", "flare": "Trumpet-like flared bells.", "folded": "Cranked resonators with a return bend.", "cylinder": "Narrow cylindrical resonators."}),
    count: choice("How many resonators?", {"three": "Three long resonators.", "four": "Four resonators.", "five": "Five graduated resonators.", "seven": "Seven slender resonators."}),
    lengths: choice("How do the lengths vary?", {"slope": "Evenly graduated lengths.", "arch": "Tallest resonators at the centre.", "pairs": "Paired equal lengths.", "level": "Equal-length test resonators."}),
    rack: choice("What rack form holds them?", {"a": "A timber A-frame rack.", "upright": "A vertical timber rack.", "metal": "A braced iron rack.", "box": "A deep wooden storage box."}),
    collars: choice("What holding collars are used?", {"rings": "Metal retaining rings.", "blocks": "Square drilled timber blocks.", "straps": "Thin leather support straps.", "plain": "A simple horizontal rack rail."}),
    tops: choice("What is at the open mouths?", {"open": "Open dark mouths.", "caps": "Flat tuning caps.", "slots": "Partly covered tuning slots.", "rolled": "Rolled metal rims."}),
    feet: choice("What is fitted at the lower ends?", {"boots": "Small cylindrical reed boots.", "plugs": "Wooden storage plugs.", "bare": "Plain tapered feet.", "labels": "Numbered foot tags."}),
    state: choice("What handling detail is present?", {"stored": "All resonators stored upright.", "spare": "One spare resonator lies below.", "cloth": "A folded protection cloth.", "tools": "A short tuning tool rests on the base."}),
    height: score("How tall is the rack?", ["Short reed rank", "Middle register reeds", "Tall bass reed resonators"])
  },
  build(a,context){
 const s=new Sculpture(context),metal=s.material('#a3aaa0',{metalness:.6,roughness:.45}),dark=s.material('#444f47'),brass=s.material('#b89e66',{metalness:.65}),wood=s.material('#a38a62'),pale=s.material('#d9cfb1'),leather=s.material('#77614c');

 const n={three:3,four:4,five:5,seven:7}[a.count],W=n*.22+.2,H=.95+a.height*.85,by=.12,mat=a.rack==='metal'?metal:wood;s.box([W,.06,.6],[0,.03,0],wood);for(const x of [-W*.45,W*.45])for(const z of [-.23,.23])s.rod([x,.03,z],[x,H*.7,a.rack==='a'?z*.4:z],.03,mat);for(const y of [.25,H*.65])s.box([W,.08,.12],[0,y,0],mat);if(a.rack==='box')for(const z of [-.27,.27])s.box([W,.4,.025],[0,.2,z],wood);
 for(let j=0;j<n;j++){const x=(j-(n-1)/2)*.22,f=a.lengths==='level'?1:a.lengths==='arch'?.7+.3*(1-Math.abs(j-(n-1)/2)/(n/2)):a.lengths==='pairs'?1-Math.floor(j/2)/n*.4:1-j/n*.4,h=H*f,r=a.profile==='cylinder'?.045:.075;const end=a.profile==='folded'?h*.65:h;
 if(a.profile==='folded'){s.tube([[x,by,0],[x,by+end,0],[x+.07,by+end+.08,0],[x+.12,by+end-.3,0]],.035,metal);}else s.lathe([[.018,0],[a.profile==='flare'?r*.6:r,h*.8],[a.profile==='flare'?r*1.5:r,h],[a.profile==='flare'?r*1.5-.008:r-.008,h],[.01,0]],metal,[x,by,0]);
 if(a.collars==='rings')for(const y of [.25,H*.65])s.ring(r+.012,.01,[x,y,0],brass).rotation.x=Math.PI/2;if(a.collars==='blocks')for(const y of [.25,H*.65])s.box([.14,.07,.14],[x,y,0],wood);if(a.collars==='straps')s.ring(r+.01,.009,[x,H*.65,0],leather).rotation.x=Math.PI/2;
 if(a.profile!=='folded'){const rt=a.profile==='flare'?r*1.5:r;if(a.tops==='caps')s.cylinder(rt+.004,rt+.004,.015,[x,by+h+.006,0],wood,24);if(a.tops==='slots')s.box([rt*2,.015,rt],[x,by+h,rt/2],metal);if(a.tops==='rolled')s.ring(rt,.01,[x,by+h,0],metal).rotation.x=Math.PI/2;}
 if(a.feet==='boots')s.cylinder(.045,.045,.13,[x,by+.065,0],metal,20);if(a.feet==='plugs')s.cylinder(.025,.025,.06,[x,by-.025,0],wood,16);if(a.feet==='labels')s.label(String(j+1),.07,.06,[x,.2,.12],'#ddd1b0','#5a503e');}
 if(a.state==='spare')s.rod([-W*.4,.06,.23],[W*.4,.06,.23],.025,metal);if(a.state==='cloth')s.box([W*.4,.025,.15],[0,.072,.22],pale);if(a.state==='tools')s.rod([-.2,.07,.23],[.2,.07,.23],.01,brass);return s.finish();

  },
});
