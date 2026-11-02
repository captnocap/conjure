import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What is the operator doing?", {"turn": "Pulling a horizontal press handle.", "pour": "Tipping a basket of apples forward.", "carry": "Carrying a harvest basket in both hands.", "scoop": "Leaning over a long pulp paddle.", "taste": "Holding a small cider cup up to inspect."}),
  state: choice("What moment is this?", {"steady": "Working with patient concentration.", "effort": "Leaning into a heavy task.", "pause": "Resting between batches.", "call": "Turning toward another worker.", "finish": "Standing proudly after the final press."}),
  detail: choice("What protects their clothes?", {"apron": "A long canvas apron over a red shirt.", "coat": "A green work coat.", "vest": "A brown vest over cream sleeves.", "overalls": "Blue work overalls.", "shirt": "A rolled-sleeve ochre shirt."}),
  support: choice("What is on their head?", {"cap": "A flat work cap.", "hat": "A broad orchard hat.", "kerchief": "A tied cloth head covering.", "short": "Short hair.", "none": "A bare head."}),
  extra: choice("What is at their feet?", {"apples": "Three fallen apples.", "pail": "An empty metal pail.", "cloth": "A folded press cloth.", "crate": "A small harvest crate.", "clear": "A clear working area."}),
  mark: choice("What marks their work clothes?", {"patch": "A bright knee repair patch.", "badge": "An ORCHARD CREW chest badge.", "pockets": "Two large apron pockets.", "stripe": "A contrasting hem band.", "plain": "Plain work clothes."}),
  extent: score("How tall is the worker?", ["A small adult", "An average adult", "A tall adult"]),
  load: score("How far into the task are they leaning?", ["Standing at ease", "A measured working lean", "A strong forward lean"]),
  closed: noul("Are heavy work gloves worn?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const h=1.45+a.extent*.45,p=figure(s,{height:h,style:'doll',pose:'standing',hair:(['cap','hat','cap','short','none'] as const)[u],top:['#a3674d','#657c5b','#8b7557','#678498','#b39258'][d],bottom:'#685f4b',skin:'#bd8d65',shoes:'#4b4a40'});s.root.add(p.root);p.joints.spine.rotation.x=(t===1?.25:.08)*a.load;p.settle();const hip=p.pelvis.getWorldPosition(new THREE.Vector3()),y=hip.y+.1;
    if(f===0){for(const side of ['left','right'] as const)p.reach(side,new THREE.Vector3(side==='left'?.28:-.28,y,.35),{space:s.root});s.rod([-.5,y,.35],[.5,y,.35],.025,wood);s.rod([.5,0,.35],[.5,y+.15,.35],.035,metal);}
    if(f===1||f===2){const z=.32,by=y-.18;for(const side of ['left','right'] as const)p.reach(side,new THREE.Vector3(side==='left'?.23:-.23,y-.04,z),{space:s.root});const basket=new THREE.Group();basket.add(s.lathe([[0,0],[.16,0],[.23,.23],[.215,.23],[.145,.02],[0,.02]],wood));for(let i=0;i<7;i++)basket.add(s.ball([.045,.04,.045],[(random()-.5)*.27,.2,(random()-.5)*.25],s.material(i%2?'#ac5a41':'#9ba65a'),12));basket.position.set(0,by,z);basket.rotation.x=f===1?.45:0;s.root.add(basket);}
    if(f===3){s.rod([-.15,.04,.5],[.15,y+.2,.15],.022,wood);s.box([.2,.03,.23],[-.15,.04,.5],wood);p.reach('left',new THREE.Vector3(.1,y,.2),{space:s.root});p.reach('right',new THREE.Vector3(0,y-.3,.3),{space:s.root});}
    if(f===4){p.reach('right',new THREE.Vector3(-.18,h*.73,.25),{space:s.root});const cup=s.cylinder(.04,.03,.09,[0,0,0],pale,14);p.hands.right.add(cup);cup.position.set(0,.035,.01);}p.lookAt(t===3?new THREE.Vector3(1,h*.75,1):new THREE.Vector3(0,y,.8),s.root);
    if(d===0||d===3){const apron=s.box([h*.2,h*.3,.02],[0,h*.04,h*.075],d===0?pale:s.material('#678498'));p.joints.spine.add(apron);}if(m===1){const tag=s.label('ORCHARD CREW',.18,.05,[0,h*.2,h*.08]);p.joints.spine.add(tag);}if(m===2)for(const x of [-.07,.07]){const pocket=s.box([.09,.1,.012],[x,0,h*.09],pale);p.joints.spine.add(pocket);}if(m===3){const band=s.box([h*.2,.04,.024],[0,-h*.09,h*.08],pale);p.joints.spine.add(band);}if(m===0){const patch=s.box([.1,.09,.015],[0,-h*.08,.05],pale);p.joints.knees.left.add(patch);}
    if(a.closed)for(const hand of [p.hands.left,p.hands.right]){const glove=s.ball([.04,.035,.04],[0,0,0],s.material('#9f9c75'),12);hand.add(glove);}if(e===0)for(let i=0;i<3;i++)s.ball([.045,.04,.045],[.35+i*.09,.04,.15],s.material('#a85842'),12);if(e===1)s.lathe([[.12,0],[.17,.26],[.155,.26],[.11,.015]],metal,[.45,0,0]);if(e===2)s.box([.3,.025,.24],[.45,.013,0],pale);if(e===3){s.box([.4,.025,.3],[.45,.013,0],wood);for(const z of [-.15,.15])s.box([.4,.2,.025],[.45,.1,z],wood);}return s.finish({update:(dt,time)=>p.update(dt,time)});
  },
});
