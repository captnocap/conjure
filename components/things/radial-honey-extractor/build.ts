import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What extractor size is used?", {"two": "A small two-frame extractor.", "four": "A four-frame hand extractor.", "six": "A broad six-frame drum.", "tall": "A tall narrow teaching extractor.", "bench": "A short tabletop extractor."}),
  state: choice("What stage is extraction at?", {"load": "The lid is open and frames are loaded.", "spin": "The basket turns under a clear lid.", "drain": "The honey gate is open above a pail.", "empty": "An empty basket waits to be cleaned.", "closed": "The solid lid is fitted for storage."}),
  detail: choice("What finish does the drum have?", {"steel": "Bright stainless steel.", "dull": "Dull brushed steel.", "cream": "Cream enamel with steel fittings.", "copper": "A warm copper-coloured drum.", "blue": "A faded blue enamel drum."}),
  support: choice("What supports the extractor?", {"tripod": "Three splayed metal legs.", "four": "Four straight steel legs.", "wood": "A stout timber platform.", "ring": "A round metal pedestal ring.", "bench": "A low wooden work bench."}),
  extra: choice("What receives the honey?", {"pail": "A deep stainless collecting pail.", "jar": "A broad clear honey jar.", "filter": "A pail with a cloth filtering cone.", "tray": "A shallow drip pan.", "none": "No collecting vessel."}),
  mark: choice("What is fixed to the front?", {"label": "A HONEY HARVEST plaque.", "gauge": "A small round fill indicator.", "red": "A red honey-gate handle.", "number": "A numbered community-equipment tag.", "plain": "Plain stainless fittings."}),
  extent: score("How broad is the extractor drum?", ["A compact household extractor", "A small shared extractor", "A broad community extractor"]),
  load: score("How quickly is the basket turning?", ["A slow careful start", "An even working spin", "A brisk finishing spin"]),
  closed: noul("Is the wooden crank grip turned outward?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const r=.22+a.extent*.13,h=f===3?.7:f===4?.35:.55,base=u===2?.22:u===4?.4:.32,n=f===0?2:f===2?6:4,drum=s.material(['#99a49d','#828e85','#d1cbb2','#b59168','#7295a4'][d],{metalness:d<2?.75:.35,roughness:.35});s.lathe([[r*.85,0],[r,h],[r-.012,h],[r*.83,.025]],drum,[0,base,0]);s.cylinder(r*.83,r*.83,.025,[0,base+.012,0],drum,32);s.ring(r,.012,[0,base+h,0],metal).rotation.x=Math.PI/2;
    const rotor=new THREE.Group();rotor.position.y=base+.08;rotor.add(s.rod([0,0,0],[0,h+.1,0],.012,metal));for(let i=0;i<n;i++){const ang=i*Math.PI*2/n,x=Math.cos(ang)*r*.55,z=Math.sin(ang)*r*.55;rotor.add(s.rod([0,.05,0],[x,.05,z],.006,metal));rotor.add(s.rod([x,.04,z],[x,h-.13,z],.006,metal));if(t!==3){const frame=s.box([r*.7,h*.55,.02],[x,h*.35,z],s.material('#bb9b59'));frame.rotation.y=-ang+Math.PI/2;rotor.add(frame);}}s.root.add(rotor);
    if(t===1||t===4)s.cylinder(r*.98,r*.98,.015,[0,base+h+.015,0],t===1?s.material('#c5d1c5',{transparent:true,opacity:.2,depthWrite:false}):metal,36);s.rod([-r,base+h+.04,0],[r,base+h+.04,0],.012,metal);const crank=new THREE.Group();crank.position.y=base+h+.1;crank.add(s.rod([0,0,0],[r*.6,0,0],.012,metal));crank.add(s.rod([r*.6,0,0],[r*.6,a.closed?.13:-.1,0],.019,wood));s.root.add(crank);
    if(u<2)for(let i=0;i<(u===0?3:4);i++){const ang=i*Math.PI*2/(u===0?3:4)+.5;s.rod([Math.cos(ang)*r*1.2,0,Math.sin(ang)*r*1.2],[Math.cos(ang)*r*.85,base+.15,Math.sin(ang)*r*.85],.018,metal);}if(u===2||u===4){s.box([r*2.5,.05,r*2.5],[0,base-.025,0],wood);for(const x of [-r*.9,r*.9])for(const z of [-r*.9,r*.9])s.rod([x,0,z],[x,base-.05,z],.025,wood);}if(u===3)s.lathe([[r*1.05,0],[r*.65,base]],metal);
    s.rod([0,base+.07,r*.85],[0,base+.07,r+.1],.035,metal);s.cylinder(.04,.04,.012,[0,base+.07,r+.11],metal,20).rotation.x=Math.PI/2;s.rod([0,base+.07,r+.13],[t===2?.075:0,base+(t===2?.07:.16),r+.13],.009,m===2?s.material('#b6684c'):wood);if(e<3){s.lathe([[.09,0],[.14,.22],[.13,.22],[.08,.01]],e===1?s.material('#c5d4c3',{transparent:true,opacity:.4,depthWrite:false}):metal,[0,0,r+.18]);if(e===2)s.mesh(new THREE.ConeGeometry(.14,.14,24,1,true),pale,[0,.23,r+.18]).rotation.z=Math.PI;if(t===2)s.rod([0,base+.045,r+.11],[0,.1,r+.18],.004,s.material('#b89a50'));}if(e===3)s.cylinder(.17,.17,.02,[0,.01,r+.18],metal,28);
    if(m===0||m===3)s.label(m===0?'HONEY HARVEST':'COMMUNITY 02',r*1.4,.07,[0,base+h*.6,r+.005]);if(m===1){s.cylinder(.05,.05,.014,[0,base+h*.6,r+.008],pale,24).rotation.x=Math.PI/2;s.rod([0,base+h*.6,r+.02],[.025,base+h*.6+.025,r+.02],.002,dark);}return s.finish({update:(dt)=>{if(t===1){rotor.rotation.y+=dt*(.4+a.load*2);crank.rotation.y=rotor.rotation.y;}}});
  },
});
