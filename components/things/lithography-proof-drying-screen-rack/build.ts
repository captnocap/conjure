import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    frame: choice("What rack frame is used?", {"timber": "Four square timber posts.", "iron": "Slender iron corner uprights.", "a": "A splayed frame with wide feet.", "wall": "A shallow rack against a backboard."}),
    levels: choice("How many drying screens are fitted?", {"three": "Three widely spaced screens.", "five": "Five regular drying levels.", "seven": "Seven closely spaced screens.", "one": "One deep inspection screen."}),
    screens: choice("What screen construction is used?", {"mesh": "A crossed fine wire grid.", "bars": "Parallel drying bars.", "cloth": "Taut cloth screens.", "boards": "Perforated slatted boards."}),
    open: choice("Which screens are lifted?", {"flat": "All screens remain horizontal.", "top": "The top screen is lifted.", "alternate": "Every other screen tilts upward.", "all": "All screens stand at a shallow angle."}),
    load: choice("How are proofs placed?", {"all": "Every screen carries a proof.", "alternate": "Proofs occupy alternate screens.", "top": "Only the top screen is loaded.", "empty": "The screens are empty."}),
    proof: choice("What printed image appears?", {"circle": "A circular illustration block.", "bands": "Broad horizontal print bands.", "grid": "A small map-like grid.", "blank": "Plain unprinted proof sheets."}),
    size: choice("How large are the proof sheets?", {"full": "Large sheets fill each screen.", "half": "Two half sheets share a screen.", "small": "A small proof sits in each centre.", "long": "Long narrow strips lie lengthwise."}),
    base: choice("How does the rack move or stand?", {"wheels": "Four small swivel wheels.", "feet": "Broad square feet.", "runners": "Two long wooden runners.", "blocks": "Low masonry support blocks."}),
    stops: choice("What keeps screens in place?", {"pins": "Short side locking pins.", "chains": "Small side support chains.", "brackets": "Triangular side brackets.", "rails": "Continuous side slide rails."}),
    state: choice("What work remains around it?", {"batch": "A labelled batch board on the rack.", "stack": "A dry paper stack below.", "cloth": "A folded cleaning cloth below.", "clear": "The rack is clear of loose supplies."}),
    width: score("How wide is the drying rack?", ["Small proof rack", "Standard edition rack", "Broad print drying rack"])
  },
  build(a,context){
 const s=new Sculpture(context),wood=s.material('#9b805b'),light=s.material('#c0a97d'),iron=s.material('#536b61',{metalness:.42}),dark=s.material('#3e4b42'),stone=s.material('#c4c3a6'),paper=s.material('#eee4c5',{side:THREE.DoubleSide}),leather=s.material('#78644b'),water=s.material('#93b6a7',{transparent:true,opacity:.5,depthWrite:false});

 const W=.7+a.width*.6,D=.75,H=1.6,n={three:3,five:5,seven:7,one:1}[a.levels],B=a.base==='wheels'?.14:.08,mat=a.frame==='iron'?iron:wood;
 for(const x of [-W/2,W/2])for(const z of [-D/2,D/2]){s.rod([a.frame==='a'?x*1.18:x,B,z],[x,H,z],a.frame==='iron'?.025:.04,mat);if(a.base==='wheels')s.cylinder(.075,.075,.04,[x,.075,z],iron,16).rotation.x=Math.PI/2;else if(a.base!=='runners')s.box([.18,B,.18],[a.frame==='a'?x*1.18:x,B/2,z],a.base==='blocks'?stone:wood);}if(a.base==='runners')for(const x of [-W/2,W/2])s.box([.15,B,D+.2],[x,B/2,0],wood);for(const z of [-D/2,D/2])s.rod([-W/2,H,z],[W/2,H,z],.03,mat);if(a.frame==='wall')s.box([W+.1,H-B,.05],[0,(H+B)/2,-D/2-.02],wood);
 for(let j=0;j<n;j++){const y=n===1?H*.65:B+.18+j*(H-B-.3)/Math.max(1,n-1),ang=a.open==='all'?.2:a.open==='top'&&j===n-1?.8:a.open==='alternate'&&j%2?.22:0,g=new THREE.Group();s.root.add(g);g.position.set(0,y,-D/2);const prior=s.root.children.slice();for(const x of [-W*.47,W*.47])s.box([.025,.025,D],[x,0,D/2],mat);for(const z of [0,D])s.box([W,.025,.025],[0,0,z],mat);if(a.screens==='cloth')s.box([W*.92,.006,D*.94],[0,0,D/2],paper);else{for(let k=0;k<9;k++)s.rod([-W*.44+k*W*.88/8,0,.03],[-W*.44+k*W*.88/8,0,D-.03],a.screens==='boards'?.018:.004,mat);if(a.screens==='mesh')for(let k=0;k<7;k++)s.rod([-W*.45,.003,.05+k*(D-.1)/6],[W*.45,.003,.05+k*(D-.1)/6],.003,iron);}
 if(a.load==='all'||a.load==='alternate'&&j%2===0||a.load==='top'&&j===n-1)for(const x of a.size==='half'?[-W*.23,W*.23]:[0]){const pw=a.size==='half'?W*.4:a.size==='small'?W*.4:a.size==='long'?W*.25:W*.84,pd=a.size==='small'?D*.4:D*.82;s.box([pw,.004,pd],[x,.014,D/2],paper);if(a.proof==='circle')s.cylinder(Math.min(pw,pd)*.27,Math.min(pw,pd)*.27,.002,[x,.018,D/2],dark,20);if(a.proof==='bands'||a.proof==='grid')for(let k=0;k<4;k++)s.box([pw*.7,.002,.015],[x,.018,D/2-pd*.25+k*pd*.16],dark);if(a.proof==='grid')for(let k=0;k<4;k++)s.box([.008,.002,pd*.65],[x-pw*.25+k*pw*.16,.018,D/2],dark);}
 for(const obj of s.root.children.slice())if(!prior.includes(obj))g.add(obj);g.rotation.x=-ang;for(const x of [-W*.49,W*.49]){if(a.stops==='chains'&&ang>0)s.rod([x,Math.min(H,y+.45),-D/2],[x,y+Math.sin(ang)*D,D*Math.cos(ang)-D/2],.004,iron);else if(a.stops==='brackets')s.rod([x,y-.1,-D/2],[x,y,D*.25],.012,iron);else if(a.stops==='rails')s.rod([x,y,-D/2],[x,y,D/2],.015,wood);else s.rod([x-.04,y,-D/2],[x+.04,y,-D/2],.014,iron);}}
 s.box([W,.04,D],[0,B,0],wood);if(a.state==='stack')for(let j=0;j<5;j++)s.box([W*.65,.009,D*.6],[0,B+.025+j*.009,0],paper);if(a.state==='cloth')s.box([.25,.04,.3],[0,B+.04,0],paper);if(a.state==='batch'){s.box([.34,.12,.025],[0,H-.05,-D/2+.04],wood);s.label('EDITION 24',.3,.08,[0,H-.05,-D/2+.055],'#e5d8b7','#3e4b42');}
return s.finish();
  },
});
