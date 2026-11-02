import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    case: choice("What cabinet form holds the instrument?", {"tall": "A tall narrow wooden case.", "desk": "A sloped desktop case.", "iron": "A riveted steel case.", "twin": "Two paired small cabinets."}),
    tokens: choice("What tokens are stored?", {"staffs": "Long brass train staffs.", "tablets": "Round metal tablets.", "keys": "Large handled token keys.", "rings": "Tokens hanging from round rings."}),
    count: choice("How many visible tokens?", {"two": "Two tokens.", "three": "Three tokens.", "four": "Four tokens.", "five": "Five tokens."}),
    indicator: choice("What status indicator is fitted?", {"dial": "A circular needle dial.", "window": "A rectangular coloured window.", "drum": "A rotating cylindrical indicator.", "flags": "Two small status flags."}),
    release: choice("What release control is fitted?", {"handle": "A side crank handle.", "plunger": "A vertical push plunger.", "wheel": "A small front handwheel.", "lever": "A short locking lever."}),
    mount: choice("How is the instrument supported?", {"shelf": "A short four-legged shelf.", "base": "A broad wooden base.", "pillar": "A single square pillar.", "wall": "A freestanding backboard."}),
    door: choice("How is the token compartment shown?", {"open": "The token rack is exposed.", "glass": "A glazed cover closes the rack.", "ajar": "A half-open hinged door.", "solid": "A solid locked door."}),
    state: choice("What use detail is visible?", {"ready": "All tokens are stored.", "issued": "One token lies on the base.", "chain": "One token has a retaining chain.", "label": "A route nameplate is fitted."}),
    height: score("How large is the instrument?", ["Small branch-line instrument", "Standard token instrument", "Large terminal instrument"])
  },
  build(a,context){
 const s=new Sculpture(context),iron=s.material('#52665c',{metalness:.5}),dark=s.material('#39463f'),brass=s.material('#b79d67',{metalness:.7}),wood=s.material('#947651'),pale=s.material('#d8ceb3'),red=s.material('#a45f4f');

 const H=.6+a.height*.4,W=a.case==='twin'?.85:.5,B=a.mount==='shelf'?.65:a.mount==='pillar'?.8:.07;const mat=a.case==='iron'?iron:wood;
 s.box([W+.18,.07,.55],[0,B-.035,0],wood);if(a.mount==='shelf')for(const x of [-W*.45,W*.45])for(const z of [-.2,.2])s.rod([x,0,z],[x,B,z],.025,wood);if(a.mount==='pillar')s.box([.2,B,.25],[0,B/2,0],wood);if(a.mount==='wall')s.box([W+.25,B+H+.15,.06],[0,(B+H+.15)/2,-.22],wood);
 s.box([W,.035,.35],[0,B,0],mat);s.box([W,H,.035],[0,B+H/2,-.17],mat);for(const x of [-W/2,W/2])s.box([.035,H,.35],[x,B+H/2,0],mat);s.box([W,.06,.35],[0,B+H,0],mat);s.box([W,.22,.08],[0,B+H-.1,.14],mat);if(a.case==='desk')s.box([W,.1,.35],[0,B+H+.03,0],mat).rotation.x=.18;if(a.case==='twin')s.box([.04,H,.35],[0,B+H/2,0],mat);
 const n={two:2,three:3,four:4,five:5}[a.count],ty=B+.12;for(let j=0;j<n;j++){const x=-W*.38+j*W*.76/(n-1),issued=a.state==='issued'&&j===0;if(issued){s.rod([-.15,.025,.38],[.18,.025,.38],.018,brass);continue;}if(a.tokens==='tablets'){s.cylinder(.05,.05,.016,[x,ty+.2,.06],brass,24).rotation.x=Math.PI/2;s.rod([x,ty,.06],[x,ty+.18,.06],.01,iron);}else{s.rod([x,ty,.06],[x,ty+H*.45,.06],.015,brass);if(a.tokens==='keys')s.ring(.035,.009,[x,ty+H*.45,.06],brass);if(a.tokens==='rings')s.ring(.055,.008,[x,ty+H*.45,.06],brass);if(a.tokens==='staffs')for(const y of [ty+.08,ty+H*.36])s.cylinder(.025,.025,.03,[x,y,.06],brass,12);}}
 s.box([W*.9,.045,.12],[0,ty,.06],iron);const iy=B+H-.1;if(a.indicator==='dial'){s.cylinder(.075,.075,.02,[0,iy,.19],pale,24).rotation.x=Math.PI/2;s.rod([0,iy,.205],[.04,iy+.025,.205],.003,dark);}if(a.indicator==='window')s.box([.18,.07,.015],[0,iy,.19],red);if(a.indicator==='drum')s.cylinder(.06,.06,.15,[0,iy,.2],pale,20).rotation.z=Math.PI/2;if(a.indicator==='flags')for(const x of [-.08,.08])s.box([.06,.08,.01],[x,iy,.19],x<0?red:pale);
 const rx=W/2+.04,ry=B+H*.55;s.rod([W/2,ry,0],[rx+.08,ry,0],.015,brass);if(a.release==='handle')s.rod([rx+.08,ry,0],[rx+.08,ry+.14,0],.02,dark);if(a.release==='plunger')s.rod([0,B+H,0],[0,B+H+.12,0],.015,brass);if(a.release==='wheel')s.ring(.07,.012,[0,B+H*.5,.22],brass);if(a.release==='lever')s.rod([rx,ry,0],[rx+.15,ry+.15,0],.018,brass);
 if(a.door==='solid')s.box([W-.05,H-.25,.025],[0,B+(H-.25)/2,.19],wood);if(a.door==='glass')s.box([W-.06,H-.25,.015],[0,B+(H-.25)/2,.19],s.material('#b6ccba',{transparent:true,opacity:.22,depthWrite:false}));if(a.door==='ajar'){const g=new THREE.Group();g.position.set(-W/2,B,.2);g.add(s.box([W-.03,H-.25,.025],[(W-.03)/2,(H-.25)/2,0],wood));g.rotation.y=-.8;s.root.add(g);}if(a.state==='chain')s.tube([[0,ty+.2,.1],[.2,B-.04,.28],[W/2,B+.12,.13]],.004,brass);if(a.state==='label')s.label('SINGLE LINE',W*.8,.07,[0,B+H+.02,.19],'#e2d5b2','#575340');return s.finish();

  },
});
