import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("How is the moonwatcher sitting?", {"kneel": "Kneeling neatly on a floor cushion.", "side": "A relaxed kneeling pose leaning to one side.", "lean": "Leaning forward over a small cup.", "upright": "Sitting very straight to watch the sky.", "turn": "Turning slightly toward a companion."}),
  state: choice("What are they doing in the quiet moment?", {"watch": "Both hands rest while they watch the moon.", "tea": "Holding a small tea cup in both hands.", "fan": "Holding an open folding fan.", "point": "Pointing gently toward the moon.", "offer": "Holding a small offering saucer."}),
  detail: choice("What are they wearing?", {"indigo": "A plain indigo robe-like top.", "cream": "A loose cream evening shirt.", "rust": "A warm rust cardigan.", "green": "A muted green wrap.", "grey": "A soft grey knit top."}),
  support: choice("What is the cushion like?", {"woven": "A round woven rush cushion.", "square": "A square cotton floor cushion.", "layer": "Two stacked flat cushions.", "mat": "A thin rectangular tatami-like mat.", "round": "A round padded cushion."}),
  extra: choice("What rests close by?", {"tea": "A small tea pot.", "sandals": "A pair of neatly aligned sandals.", "shawl": "A folded evening shawl.", "saucer": "An empty ceramic saucer.", "clear": "An uncluttered veranda."}),
  mark: choice("How is their hair arranged?", {"bun": "A neat dark bun.", "short": "Short dark hair.", "long": "Hair held under a soft cap.", "grey": "Short grey hair.", "bare": "A bare smooth head."}),
  extent: score("How tall is the moonwatcher?", ["A small adult", "An average adult", "A tall adult"]),
  load: score("How far upward is their gaze?", ["Toward the horizon", "Toward the rising moon", "High into the night sky"]),
  closed: noul("Is a light shawl draped around their shoulders?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const h=1.4+a.extent*.4,p=figure(s,{height:h,pose:'kneeling',style:'doll',hair:(['bun','short','cap','short','none'] as const)[m],hairColor:m===3?'#aaa596':'#4b4034',top:['#5e778d','#d0c6ad','#a57259','#7f8c70','#969b92'][d],bottom:'#6b705e',skin:'#c8a37d',shoes:'#655c49'});s.root.add(p.root);p.root.position.y=.04;p.joints.spine.rotation.x=f===2?.22:0;p.joints.spine.rotation.z=f===1?.12:0;p.root.rotation.y=f===4?.3:0;p.settle();p.root.position.y+=.04;const hip=p.pelvis.getWorldPosition(new THREE.Vector3());
    if(u===0||u===4)s.cylinder(.32,.33,.04,[0,.02,0],u===0?wood:pale,32);else s.box([.65,u===2?.07:.035,.58],[0,u===2?.035:.018,0],u===3?wood:pale);const y=hip.y+.15,z=.25;
    if(t===1||t===4){for(const side of ['left','right'] as const)p.reach(side,new THREE.Vector3(side==='left'?.045:-.045,y,z),{space:s.root});if(t===1)s.lathe([[.025,0],[.04,.055],[.035,.055],[.02,.01]],pale,[0,y-.025,z]);else s.cylinder(.075,.075,.008,[0,y,z],pale,24);}if(t===2){p.reach('right',new THREE.Vector3(-.18,y,.25),{space:s.root});const fan=s.mesh(new THREE.CircleGeometry(.16,20,0,Math.PI),pale,[-.18,y,.25]);for(let i=0;i<7;i++)s.rod([-.18,y,.255],[-.18+Math.cos(i*Math.PI/6)*.16,y+Math.sin(i*Math.PI/6)*.16,.255],.002,wood);}if(t===3)p.reach('left',new THREE.Vector3(.3,h*.72,.4),{space:s.root});p.lookAt(new THREE.Vector3(0,h*(.7+a.load*.7),3),s.root);
    if(a.closed){const shawl=s.box([h*.3,.13,.05],[0,h*.23,-.03],pale);p.joints.spine.add(shawl);for(const x of [-h*.13,h*.13]){const end=s.box([.08,.32,.025],[x,h*.12,.09],pale);p.joints.spine.add(end);}}
    if(e===0){s.ball([.08,.06,.08],[.5,.06,.05],green,16);s.tube([[.55,.06,.05],[.63,.09,.05],[.64,.12,.05]],.012,green);s.ring(.05,.009,[.43,.06,.05],green);s.cylinder(.04,.04,.012,[.5,.126,.05],green,16);}if(e===1)for(const x of [.42,.55]){s.box([.09,.02,.22],[x,.01,.08],wood);s.tube([[x-.04,.02,.04],[x,.05,.08],[x+.04,.02,.04]],.006,dark);}if(e===2)s.box([.3,.035,.24],[.5,.018,0],pale);if(e===3)s.cylinder(.08,.08,.008,[.48,.004,0],pale,24);return s.finish({update:(dt,time)=>p.update(dt,time)});
  },
});
