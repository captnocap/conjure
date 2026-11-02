import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    chest: choice("What storage chest is used?", {"box": "A rectangular wooden chest.", "bins": "Two divided ingredient bins.", "barrel": "A round storage tub.", "drawers": "A low chest with a sample drawer."}),
    lid: choice("How is the lid positioned?", {"closed": "Fully closed.", "open": "Raised at the back.", "half": "One half covered.", "aside": "Removed and leaning beside the chest."}),
    powder: choice("What fill level is visible?", {"full": "A high mound of earth.", "low": "A shallow powder bed.", "split": "Two contrasting powder grades.", "empty": "An empty chest."}),
    scoops: choice("What measuring tools are present?", {"wood": "Two wooden scoops.", "metal": "A broad metal scoop.", "cups": "Three measuring cups.", "spoon": "A long sampling spoon."}),
    stand: choice("What supports the chest?", {"feet": "Four short feet.", "rails": "Two long skids.", "bench": "A waist-high bench.", "floor": "Directly on the floor."}),
    measure: choice("What weighing aid is included?", {"beam": "A small beam balance.", "weights": "Three loose scale weights.", "rule": "A marked volume stick.", "none": "No measuring aid."}),
    labels: choice("How is the contents marked?", {"earth": "A fullers-earth nameplate.", "grades": "Two grade labels.", "numbers": "Numbered measure marks.", "none": "No labels."}),
    state: choice("What work detail is visible?", {"clean": "A tidy dosing station.", "spill": "A small powder spill.", "sack": "A reserve sack beside it.", "brush": "A stiff cleaning brush."}),
    size: score("How broad is the dosing chest?", ["Small dosing chest", "Standard mill supply chest", "Large shared dosing station"])
  },
  build(a,context){
 const s=new Sculpture(context),wood=s.material('#9d8159'),light=s.material('#bca272'),dark=s.material('#555b45'),iron=s.material('#61745f',{metalness:.4}),cloth=s.material('#c9c3a4'),stone=s.material('#b3b59a'),water=s.material('#86aca0',{transparent:true,opacity:.55,depthWrite:false});

 const W=.7+a.size*.6,D=a.chest==='barrel'?W:.5,H=.4,Y=a.stand==='bench'?.65:a.stand==='floor'?0:.12,earth=s.material('#c3b78e');if(a.stand==='bench'||a.stand==='feet')for(const x of [-W*(a.chest==='barrel'?.28:.42),W*(a.chest==='barrel'?.28:.42)])for(const z of [-D*.28,D*.28])s.rod([x,0,z],[x,Y,z],.025,wood);if(a.stand==='rails')for(const z of [-D*.28,D*.28])s.box([W+.2,.12,.08],[0,.06,z],wood);
 if(a.chest==='barrel')s.lathe([[0,0],[W*.45,0],[W*.5,H],[W*.46,H],[W*.4,.035],[0,.035]],wood,[0,Y,0]);else{s.box([W,.04,D],[0,Y+.02,0],wood);for(const z of [-.25,.25])s.box([W,H,.035],[0,Y+H/2,z],wood);for(const x of [-W/2,W/2])s.box([.035,H,D],[x,Y+H/2,0],wood);if(a.chest==='bins'||a.powder==='split')s.box([.035,H,D],[0,Y+H/2,0],wood);if(a.chest==='drawers'){s.box([W*.6,.13,.25],[0,Y+.1,.33],wood);s.rod([-.08,Y+.1,.47],[.08,Y+.1,.47],.008,iron);}}
 if(a.powder!=='empty'){const ph=a.powder==='low'?.07:.3;if(a.chest==='barrel')s.cylinder(W*.42,W*.42,.015,[0,Y+ph,0],earth,28);else s.box([W-.05,.025,D-.05],[0,Y+ph,0],earth);if(a.powder==='full')s.cylinder(0,.23,.12,[0,Y+.33,0],earth,24);if(a.powder==='split')s.box([W*.43,.027,D-.07],[W*.25,Y+ph+.003,0],stone);}
 if(a.lid==='closed'||a.lid==='half')s.box([a.lid==='half'?W/2:W+.04,.035,D+.04],[a.lid==='half'?-W/4:0,Y+H+.018,0],wood);if(a.lid==='open')s.box([W,.45,.035],[0,Y+H+.225,-D/2-.02],wood);if(a.lid==='aside'){const lid=s.box([W,.5,.035],[W/2+.2,.25,0],wood);lid.rotation.x=-.15;}
 const sy=Y+H+.05,toolZ=D/2+.18;if(a.scoops==='cups')for(let j=0;j<3;j++)s.lathe([[0,0],[.04,0],[.05,.08],[.043,.08],[.033,.01],[0,.01]],iron,[-.15+j*.15,0,toolZ]);else{const n=a.scoops==='wood'?2:1;for(let j=0;j<n;j++){const x=-.15+j*.3,z=toolZ;s.ball([.08,.018,.045],[x,.02,z],a.scoops==='metal'?iron:wood,12);s.rod([x+.05,.025,z],[x+.22,.025,z],.012,wood);}}
 if(a.measure==='beam'){const x=-W/2-.22;s.box([.25,.03,.2],[x,.015,0],wood);s.rod([x,.02,0],[x,.42,0],.012,iron);s.rod([x-.15,.4,0],[x+.15,.4,0],.01,iron);for(const xx of [x-.14,x+.14]){s.rod([xx,.4,0],[xx,.25,0],.003,iron);s.cylinder(.07,.07,.01,[xx,.25,0],iron,20);}}if(a.measure==='weights')for(let j=0;j<3;j++)s.cylinder(.025+j*.008,.025+j*.008,.06,[W/2+.1+j*.1,.03,.2],iron,12);if(a.measure==='rule'){s.box([.025,.5,.025],[W/2+.02,Y+.25,0],light);for(let j=0;j<8;j++)s.box([.027,.004,.005],[W/2+.02,Y+.02+j*.06,.015],dark);}
 if(a.chest==='barrel'&&a.labels!=='none')s.box([W*.9,.28,.04],[0,Y+.2,D/2],wood);
 if(a.labels==='earth')s.label('FULLERS EARTH',W*.8,.12,[0,Y+.2,D/2+.025],'#ded0a9','#5d593f');if(a.labels==='grades')for(const x of [-W*.25,W*.25])s.label(x<0?'FINE':'COARSE',W*.35,.1,[x,Y+.2,D/2+.025],'#ded0a9','#5d593f');if(a.labels==='numbers')for(let j=0;j<3;j++)s.label(String(j+1),.05,.04,[W*.3,Y+.07+j*.1,D/2+.025],'#ded0a9','#5d593f');if(a.state==='spill')s.cylinder(.22,.24,.01,[.25,.005,.6],earth,24);if(a.state==='sack')s.ball([.18,.3,.17],[W/2+.25,.3,-.15],wood,16);if(a.state==='brush'){s.box([.18,.04,.08],[-.2,.02,.6],dark);s.rod([-.25,.06,.6],[-.15,.06,.6],.014,wood);}return s.finish();

  },
});
