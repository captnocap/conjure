import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What is the volunteer doing?", {"inspect": "Holding a returned drill for inspection.", "card": "Checking the loan card against the tool.", "tag": "Tying a repair tag to the drill.", "shelf": "Setting the drill onto a return tray.", "pause": "Resting one hand beside the checked tool."}),
  state: choice("What is the result of the return?", {"ready": "A green ready-to-borrow card is on the bench.", "repair": "A red repair card waits beside the tool.", "missing": "An empty battery bay is being noted.", "clean": "A cleaning cloth is spread on the bench.", "busy": "Two more returned tools wait in a bin."}),
  detail: choice("What work clothes are worn?", {"apron": "A green volunteer apron.", "vest": "An ochre work vest.", "shirt": "A blue rolled-sleeve shirt.", "overalls": "Dark workshop overalls.", "jumper": "A warm rust-coloured jumper."}),
  support: choice("What supports the work?", {"bench": "A square inspection bench.", "counter": "A narrow checkout counter.", "trestle": "A plank on trestles.", "crate": "A high closed return crate.", "stool": "A low inspection stool."}),
  extra: choice("What sits beside the volunteer?", {"case": "A returned drill case.", "box": "A small parts return box.", "brush": "A cleaning brush.", "pail": "A small rubbish pail.", "none": "A clear floor."}),
  mark: choice("How is the volunteer identified?", {"badge": "A small volunteer badge.", "cap": "A plain workshop cap.", "grey": "Short grey hair.", "bun": "Hair tied in a bun.", "plain": "Short dark hair."}),
  extent: score("How tall is the volunteer?", ["A small adult", "An average adult", "A tall adult"]),
  load: score("How far across the bench is the tool?", ["A close inspection", "A relaxed reach", "A tool near the far edge"]),
  closed: noul("Is the drill chuck tipped down towards the inspection surface?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const h=1.42+a.extent*.45,p=figure(s,{height:h,pose:'standing',style:'doll',hair:m===1?'cap':m===3?'bun':'short',hairColor:m===2?'#aeaa98':m===1?'#8e9d76':'#564d42',skin:'#c7a37c',top:['#738a6c','#b59b5f','#718f9d','#596c63','#a27860'][d],bottom:'#5c6d64',shoes:'#4e4d43'});s.root.add(p.root);const H=u===4?.58:.76,z=.45+a.load*.14;s.box([.7,.045,.48],[0,H-.023,z],wood);if(u===3)s.box([.64,H-.045,.43],[0,(H-.045)/2,z],wood);else for(const x of [-.28,.28])for(const dz of [-.18,.18])s.rod([x,0,z+dz],[x,H-.045,z+dz],.025,wood);if(d===0||d===3)p.joints.spine.add(s.box([h*.22,h*.28,.025],[0,-h*.04,h*.085],s.material(d===0?'#a4ad87':'#4e6356')));const target=new THREE.Vector3(-.06,H+(f===3||f===4?.1:.32),z);p.reach('right',target,{space:s.root});p.reach('left',new THREE.Vector3(.16,H+(f===1?.28:.12),z),{space:s.root});p.lookAt(target,s.root);const rh=p.hands.right.getWorldPosition(new THREE.Vector3()),lh=p.hands.left.getWorldPosition(new THREE.Vector3()),g=new THREE.Group();g.add(s.box([.16,.07,.07],[0,.075,0],green));g.add(s.box([.05,.14,.06],[.03,0,0],green));if(t!==2)g.add(s.box([.11,.04,.08],[.03,-.07,0],dark));g.add(s.rod([-.08,.075,0],[-.15,.075,0],.01,metal));g.position.copy(rh);g.rotation.z=a.closed?.25:0;s.root.add(g);if(f===1||f===2){s.box([.1,.07,.003],[lh.x,lh.y,lh.z],f===2?s.material('#b5745a'):pale);}else s.box([.12,.004,.09],[.21,H+.002,z],t===1?s.material('#b5745a'):pale);if(t===0)s.box([.1,.003,.08],[-.22,H+.002,z],green);if(t===3)s.box([.24,.006,.18],[0,H+.003,z],pale);if(t===4){s.box([.28,.12,.2],[.52,.06,0],wood);s.rod([.42,.12,0],[.62,.12,0],.012,metal);}if(m===0)p.joints.spine.add(s.label('VOLUNTEER',.11,.035,[h*.05,.14,h*.09]));if(e===0)s.box([.3,.12,.25],[.52,.06,-.05],green);if(e===1)s.box([.23,.16,.22],[.52,.08,-.05],wood);if(e===2){s.box([.12,.04,.07],[.52,.02,-.05],pale);s.box([.12,.025,.07],[.52,.055,-.05],wood);}if(e===3)s.lathe([[.09,0],[.12,.22],[.11,.22],[.08,.015]],metal,[.52,0,-.05]);return s.finish({update:(dt,time)=>p.update(dt,time)});
  },
});
