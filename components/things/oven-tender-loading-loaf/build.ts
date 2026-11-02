import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("How is the baker working?", {"load": "Holding the loaded peel level.", "lift": "Raising the peel slightly to check the loaf.", "turn": "Turning a baked loaf on the peel.", "rest": "Resting the peel on a low loading stand.", "empty": "Holding an empty peel ready for the next batch."}),
  state: choice("What stage is the loaf at?", {"raw": "A pale unbaked round loaf.", "baked": "A golden baked loaf.", "dark": "A deep brown crusted loaf.", "pair": "Two small rolls share the peel.", "oval": "An oval loaf with three scores."}),
  detail: choice("What clothes are worn?", {"cream": "A cream apron over a blue shirt.", "green": "A green apron over pale work clothes.", "rust": "A rust apron over a dark shirt.", "stripe": "A pale apron with a narrow blue stripe.", "plain": "A plain practical blue work shirt."}),
  support: choice("What is underfoot?", {"clear": "A clear work floor.", "mat": "A narrow woven work mat.", "boards": "A small timber standing platform.", "stone": "A low stone loading pad.", "brick": "A small brick-paved patch."}),
  extra: choice("What waits beside the baker?", {"basket": "A bread carrying basket.", "cloth": "A folded baker’s cloth.", "pail": "A small flour pail.", "case": "A wooden bread crate.", "none": "No extra equipment."}),
  mark: choice("How is their hair kept clear?", {"cap": "A soft pale baker’s cap.", "bun": "A neat bun.", "short": "Short dark hair.", "grey": "Short grey hair.", "scarf": "A muted work head covering."}),
  extent: score("How tall is the baker?", ["A small adult", "An average adult", "A tall adult"]),
  load: score("How far does the peel extend?", ["A short garden-oven reach", "A comfortable loading reach", "A long communal-oven reach"]),
  closed: noul("Is a small flour patch visible on the apron?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const h=1.45+a.extent*.4,p=figure(s,{height:h,pose:'standing',style:'doll',hair:m===0||m===4?'cap':m===1?'bun':'short',hairColor:m===2?'#594f3f':m===3?'#b0ac9a':'#d0c5a5',skin:'#c4a17a',top:d===2?'#5e6a58':'#6f8d9a',bottom:'#697561',shoes:'#5b5548'});s.root.add(p.root);if(d!==4)p.joints.spine.add(s.box([h*.23,h*.33,.025],[0,-h*.07,h*.085],s.material(['#d0c5a5','#829b73','#ac7e61','#d0c5a5'][d])));if(d===3)p.joints.spine.add(s.box([.035,h*.32,.027],[0,-h*.07,h*.09],s.material('#6a8998')));if(a.closed&&d!==4)p.joints.spine.add(s.ball([.045,.025,.002],[.045,.01,h*.101],pale,12));const y=h*.52,z=.35,reach=.65+a.load*.55;p.reach('right',new THREE.Vector3(-.12,y,z),{space:s.root});p.reach('left',new THREE.Vector3(.12,y,z+.13),{space:s.root});p.lookAt(new THREE.Vector3(0,y,z+reach),s.root);const rh=p.hands.right.getWorldPosition(new THREE.Vector3()),lh=p.hands.left.getWorldPosition(new THREE.Vector3()),end=new THREE.Vector3(0,y+(f===1?.15:f===2?.06:0),z+reach);s.rod([rh.x,rh.y,rh.z],[lh.x,lh.y,lh.z],.018,wood);s.rod([lh.x,lh.y,lh.z],[end.x,end.y,end.z],.018,wood);s.cylinder(.19,.19,.025,[end.x,end.y,end.z],wood,28);if(f!==4){const n=t===3?2:1;for(let i=0;i<n;i++){const x=end.x+(i-(n-1)/2)*.16;s.ball([t===4?.1:.13,.065,t===4?.17:.13],[x,end.y+.075,end.z],s.material(t===0?'#cabc92':t===2?'#8f6c43':'#b4915b'),20);for(let j=0;j<3;j++)s.rod([x-.07,end.y+.132,end.z+(j-1)*.055],[x+.07,end.y+.132,end.z+(j-1)*.055],.003,pale);}}if(f===3){s.box([.55,.035,.35],[0,y-.035,z+reach*.6],wood);for(const x of [-.22,.22])for(const dz of [-.12,.12])s.rod([x,0,z+reach*.6+dz],[x,y-.05,z+reach*.6+dz],.025,wood);}if(u!==0)s.box([.65,.012,.5],[0,.006,0],u===1?green:u===2?wood:u===3?pale:s.material('#b1876c'));if(e===0)s.lathe([[.1,0],[.2,.13],[.19,.13],[.09,.015]],wood,[.55,0,.1]);if(e===1)s.box([.25,.025,.2],[.55,.013,.1],pale);if(e===2)s.lathe([[.09,0],[.13,.2],[.12,.2],[.08,.015]],metal,[.55,0,.1]);if(e===3){s.box([.4,.025,.3],[.55,.013,.1],wood);for(const z of [-.04,.24])s.box([.4,.15,.025],[.55,.1,z],wood);}return s.finish({update:(dt,time)=>p.update(dt,time)});
  },
});
