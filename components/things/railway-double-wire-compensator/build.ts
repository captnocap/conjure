import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    frame: choice("What is the tower frame?", {"pair": "Two iron uprights.", "a": "A splayed A-frame.", "wood": "A timber portal.", "lattice": "A lattice steel frame."}),
    weights: choice("What tension weights hang below?", {"blocks": "Two rectangular weights.", "discs": "Stacks of iron discs.", "cylinders": "Long cylindrical weights.", "stones": "Two dressed stone weights."}),
    arms: choice("How are the balancing arms arranged?", {"level": "Both arms are level.", "opposed": "One arm high and one low.", "tilt": "Both arms slope downward.", "short": "Short compact balance arms."}),
    pulleys: choice("What pulley bank is fitted?", {"pair": "Two large guide pulleys.", "four": "Four smaller guide pulleys.", "stack": "Two vertically stacked pulleys.", "small": "Two compact enclosed guides."}),
    base: choice("What anchors the frame?", {"feet": "Four bolted feet.", "concrete": "A solid concrete footing.", "sleepers": "Two long timber sleepers.", "brick": "A low brick plinth."}),
    guard: choice("What protects the moving weights?", {"open": "The weights are exposed.", "rails": "Low protective railings.", "cage": "A slatted rear cage.", "roof": "A small pitched weather cap."}),
    wire: choice("How are the signal wires shown?", {"front": "Two wires lead forward.", "both": "Wires lead in both directions.", "loop": "Short looped wire ends.", "bare": "No external wire runs."}),
    state: choice("What maintenance detail appears?", {"normal": "Normal operating condition.", "pin": "A locking pin is inserted.", "rule": "A vertical travel scale.", "tag": "A warning tag on one weight."}),
    height: score("How tall is the compensator?", ["Compact yard compensator", "Standard signal-wire tower", "Tall long-run compensator"])
  },
  build(a,context){
 const s=new Sculpture(context),iron=s.material('#52665c',{metalness:.5}),dark=s.material('#39463f'),brass=s.material('#b79d67',{metalness:.7}),wood=s.material('#947651'),pale=s.material('#d8ceb3'),red=s.material('#a45f4f');

 const H=1.6+a.height*.7,mat=a.frame==='wood'?wood:iron,B=a.base==='concrete'||a.base==='brick'?.2:.06;
 if(a.base==='sleepers')for(const z of [-.25,.25])s.box([1.1,.12,.17],[0,.06,z],wood);else s.box([.9,B,.65],[0,B/2,0],a.base==='concrete'?pale:a.base==='brick'?wood:iron);
 for(const x of [-.3,.3])s.rod([a.frame==='a'?x*1.4:x,B,0],[x,H,0],.04,mat);s.rod([-.3,H,0],[.3,H,0],.045,mat);if(a.frame==='lattice')for(let j=0;j<5;j++)s.rod([-.3,B+j*(H-B)/5,0],[.3,B+(j+1)*(H-B)/5,0],.018,iron);else s.rod([-.3,B,0],[.3,H*.65,0],.022,mat);
 s.rod([-.3,H-.2,0],[.3,H-.2,0],.03,mat);const arm=a.arms==='short'?.3:.48;for(let j=0;j<2;j++){const x=j===0?-.15:.15,y=H-.2,wy=a.arms==='opposed'?y+(j===0?.12:-.12):a.arms==='tilt'?y-.15:y,z=.16;s.rod([x,y,-.14],[x,wy,arm],.025,iron);s.rod([x,wy,arm],[x,a.weights==='discs'?.44:.55,arm],.012,brass);if(a.weights==='blocks'||a.weights==='stones')s.box([.2,.35,.2],[x,.375,arm],a.weights==='stones'?pale:iron);if(a.weights==='cylinders')s.cylinder(.09,.09,.45,[x,.325,arm],iron,20);if(a.weights==='discs')for(let k=0;k<5;k++)s.cylinder(.12,.12,.045,[x,.24+k*.046,arm],iron,20);
 const pr=a.pulleys==='four'||a.pulleys==='small'?.1:.16,py=a.pulleys==='stack'?H-.15-j*.34:H-.25;s.rod([x,H-.2,0],[x,py,0],.018,iron);s.rod([x,py,0],[x,py,-.16],.018,iron);s.cylinder(pr,pr,.045,[x,py,-.12],iron,24).rotation.x=Math.PI/2;s.ring(pr*.8,.008,[x,py,-.15],brass);if(a.pulleys==='four')s.cylinder(.1,.1,.04,[x,py-.25,-.12],iron,20).rotation.x=Math.PI/2;s.tube([[x,wy,arm],[x,py+pr,-.12],[x,py,-.12-pr],[x,.15,-.65]],.004,brass);if(a.wire!=='bare'){s.rod([x,.15,-.65],[x,.02,-1.2],.004,brass);if(a.wire==='both')s.rod([x,.15,-.65],[x,.02,1.1],.004,brass);if(a.wire==='loop')s.ring(.08,.004,[x,.025,-1.2],brass).rotation.x=Math.PI/2;}}
 if(a.guard==='rails'||a.guard==='cage')for(const z of [-.3,.7]){for(const x of [-.5,.5])s.rod([x,0,z],[x,.85,z],.018,iron);s.rod([-.5,.85,z],[.5,.85,z],.02,iron);if(a.guard==='cage')for(let j=0;j<8;j++)s.rod([-.5+j/7,0,z],[-.5+j/7,.85,z],.009,iron);}if(a.guard==='roof'){for(const x of [-.3,.3])s.rod([x,H,0],[x,H+.25,0],.025,iron);for(const side of [-1,1])s.box([.45,.035,.75],[side*.18,H+.3,.1],iron).rotation.z=-side*.2;}
 if(a.state==='pin')s.rod([-.4,H-.2,.06],[.4,H-.2,.06],.012,red);if(a.state==='rule'){s.box([.07,H*.7,.02],[-.33,H*.5,.05],pale);for(let j=0;j<12;j++)s.box([.05,.006,.005],[-.33,H*.18+j*H*.055,.063],dark);}if(a.state==='tag')s.label('LOCK',.15,.08,[-.15,.42,.59],'#e1d1ab','#a35c48');return s.finish();

  },
});
