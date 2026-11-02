import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    arrangement: choice("How are the instruments arranged?", {"pair": "Two side-by-side instruments.", "stack": "One instrument above the other.", "angled": "Two instruments turned outward.", "single": "One large instrument and a separate bell."}),
    case: choice("What case profile is used?", {"square": "Square timber cases.", "arched": "Round-topped instrument cases.", "slope": "Sloping console cases.", "iron": "Compact iron boxes."}),
    bells: choice("What bells are fitted?", {"domes": "Broad polished bell domes.", "small": "Small narrow bell caps.", "twin": "Two bells on each case.", "side": "Side-mounted bells."}),
    dial: choice("How is line status displayed?", {"needle": "A pointer on a round dial.", "sectors": "Three coloured status sectors.", "window": "A rectangular status window.", "drum": "A horizontal status drum."}),
    control: choice("What control is fitted?", {"plunger": "A vertical brass plunger.", "key": "A front telegraph-style key.", "knob": "A large turning knob.", "lever": "A side lever."}),
    stand: choice("What carries the pair?", {"shelf": "A raised wooden shelf.", "base": "A flat common baseboard.", "legs": "A slender four-leg stand.", "wall": "A freestanding backboard."}),
    wiring: choice("What wiring is visible?", {"rear": "Two rear cables.", "loops": "Short cable loops.", "conduit": "A rigid joining conduit.", "hidden": "No exposed wiring."}),
    state: choice("What operator detail appears?", {"ready": "Both instruments ready.", "labels": "UP and DOWN labels.", "cover": "One bell has a dust cap.", "notes": "A small note card beside the pair."}),
    size: score("How large is the pair?", ["Compact instruments", "Standard station instruments", "Large junction instruments"])
  },
  build(a,context){
 const s=new Sculpture(context),iron=s.material('#52665c',{metalness:.5}),dark=s.material('#39463f'),brass=s.material('#b79d67',{metalness:.7}),wood=s.material('#947651'),pale=s.material('#d8ceb3'),red=s.material('#a45f4f');

 const S=.8+a.size*.4,B=a.stand==='legs'?.7:a.stand==='shelf'?.3:.05,W=1.05;s.box([W,.05,.55],[0,B-.025,0],wood);if(a.stand==='legs'||a.stand==='shelf')for(const x of [-.45,.45])for(const z of [-.2,.2])s.rod([x,0,z],[x,B,z],.025,wood);if(a.stand==='wall')s.box([W,B+.9,.05],[0,(B+.9)/2,-.24],wood);
 if(a.arrangement==='stack'){s.box([.42,1.65,.05],[0,B+.825,-.2],wood);s.box([.42,.045,.4],[0,B+.84,0],wood);}for(let j=0;j<2;j++){const x=a.arrangement==='stack'?0:(j-.5)*.5,y=B+(a.arrangement==='stack'?j*.86:0),H=a.arrangement==='single'&&j===1?.12:.38;const g=new THREE.Group();g.position.set(x,y,0);if(a.arrangement==='angled')g.rotation.y=(j-.5)*.35;s.root.add(g);const start=s.root.children.length;const mat=a.case==='iron'?iron:wood;s.box([.38,H,.3],[0,H/2,0],mat);if(a.case==='arched')s.cylinder(.19,.19,.3,[0,H,0],mat,24).rotation.x=Math.PI/2;if(a.case==='slope')s.box([.38,.07,.32],[0,H,0],mat).rotation.x=.2;
 const by=H+(a.case==='arched'?.19:a.case==='slope'?.08:0)+.08;for(const bx of a.bells==='twin'?[-.1,.1]:[a.bells==='side'?.25:0]){if(a.bells==='side')s.rod([.12,H-.1,0],[bx,H+.05,0],.014,brass);s.rod([bx,H,0],[bx,by+.08,0],.008,brass);s.lathe([[a.bells==='small'?.075:.12,0],[a.bells==='small'?.07:.11,.03],[.045,.095],[0,.1]],a.state==='cover'&&j===0?dark:brass,[bx,by,0]);s.rod([bx-.05,by-.03,.02],[bx-.11,by+.035,.02],.009,iron);}
 if(!(a.arrangement==='single'&&j===1)){if(a.dial==='window')s.box([.22,.12,.015],[0,H*.65,.16],pale);else if(a.dial==='drum')s.cylinder(.06,.06,.2,[0,H*.65,.17],pale,20).rotation.z=Math.PI/2;else{s.cylinder(.105,.105,.015,[0,H*.62,.16],pale,24).rotation.x=Math.PI/2;s.rod([0,H*.62,.172],[j===0?.06:-.06,H*.62+.04,.172],.004,dark);if(a.dial==='sectors')for(const xx of [-.06,0,.06])s.box([.025,.025,.006],[xx,H*.62+.04,.172],xx===0?red:iron);}}
 if(a.control==='plunger'){s.rod([.12,H,0],[.12,H+.13,0],.015,brass);s.cylinder(.035,.035,.025,[.12,H+.13,0],dark,16);}if(a.control==='key'){s.box([.12,.025,.14],[0,.025,.23],iron);s.rod([0,.04,.18],[0,.06,.31],.012,brass);}if(a.control==='knob')s.cylinder(.035,.035,.04,[0,H*.25,.19],dark,16).rotation.x=Math.PI/2;if(a.control==='lever')s.rod([.19,H*.3,0],[.29,H*.5,0],.014,brass);
 if(a.state==='labels')s.label(j===0?'UP':'DOWN',.18,.055,[0,.055,.16],'#e1d4b0','#61583f');for(const obj of s.root.children.slice(start))g.add(obj);}
 if(a.wiring==='conduit')s.rod([-.3,B+.1,-.2],[.3,B+.1,-.2],.018,iron);if(a.wiring==='rear'||a.wiring==='loops')for(const x of [-.25,.25])s.tube([[x,B+.1,-.14],[x,B+.02,-.35],[x+.1,.015,-.4]],.008,dark);if(a.state==='notes')s.box([.2,.004,.15],[.4,B+.004,.15],pale);s.root.scale.setScalar(S);return s.finish();

  },
});
