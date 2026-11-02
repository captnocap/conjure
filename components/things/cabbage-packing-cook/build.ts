import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("How is the cook working?", {"press": "Pressing cabbage with a long tamper.", "leaf": "Holding a broad cabbage leaf over the pot.", "salt": "Sprinkling salt from a small bowl.", "check": "Leaning to check the packed cabbage.", "pause": "Standing with the tamper beside the crock."}),
  state: choice("What stage has the batch reached?", {"start": "A small layer waits in the crock.", "half": "The crock is half full.", "full": "Vegetables reach close to the rim.", "weight": "A pale weight is ready beside the pot.", "label": "A completed batch label is ready."}),
  detail: choice("What are they wearing?", {"cream": "A cream apron over a blue shirt.", "green": "A sage apron over a pale shirt.", "rust": "A rust apron over a dark shirt.", "stripe": "A pale apron with a broad blue stripe.", "plain": "A plain practical green shirt."}),
  support: choice("What work surface supports the crock?", {"table": "A small timber kitchen table.", "stool": "A low stout work stool.", "counter": "A narrow pale counter.", "trestle": "A plank over two trestles.", "crate": "A sturdy closed wooden crate."}),
  extra: choice("What is close to their feet?", {"basket": "A basket with two cabbages.", "pail": "A small rinsing pail.", "cloth": "A folded floor cloth.", "jar": "A spare preserving jar.", "none": "A clear floor."}),
  mark: choice("How is their hair kept clear?", {"cap": "A pale cloth cap.", "bun": "A neat dark bun.", "short": "Short dark hair.", "grey": "Short grey hair.", "scarf": "A simple muted head covering."}),
  extent: score("How tall is the cook?", ["A small adult", "An average adult", "A tall adult"]),
  load: score("How far is the crock from their body?", ["A close work position", "A comfortable reach", "An extended reach across the table"]),
  closed: noul("Are the sleeves protected by dark wrist cuffs?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const h=1.4+a.extent*.45,p=figure(s,{height:h,pose:'standing',style:'doll',hair:(['cap','bun','short','short','cap'] as const)[m],hairColor:m===3?'#aaa794':m===0?'#d5caae':'#574a39',top:d===0?'#6c8999':d===2?'#5e6957':'#c6c3a8',bottom:'#69745e',shoes:'#5c5542',skin:'#c3a07b'});s.root.add(p.root);const top=u===1?.55:u===4?.62:.76,z=.45+a.load*.12,cy=top+.14;if(d!==4)p.joints.spine.add(s.box([h*.23,h*.3,.025],[0,-h*.06,h*.085],s.material(['#d4c9a6','#819b76','#a57558','#d6ceb1'][d])));if(d===3)p.joints.spine.add(s.box([.035,h*.3,.028],[0,-h*.06,h*.088],s.material('#688696')));s.box([.65,.05,.5],[0,top-.025,z],u===2?pale:wood);if(u===4)s.box([.6,top-.05,.45],[0,(top-.05)/2,z],wood);else for(const x of [-.26,.26])for(const dz of [-.2,.2])s.rod([x,0,z+dz],[x,top-.05,z+dz],.025,wood);s.lathe([[.12,0],[.16,.24],[.15,.25],[.14,.25],[.11,.025]],s.material('#a28a60'),[0,top,z]);const fy=top+.05+(t===0?0:t===1?.07:.15);s.cylinder(.135,.135,.012,[0,fy,z],green,24);
    if(f===3){p.joints.spine.rotation.x=.18;p.root.updateMatrixWorld(true);}const target=new THREE.Vector3(0,cy+(f===3?.08:.2),z);p.reach('right',target,{space:s.root});p.reach('left',new THREE.Vector3(.18,cy+.05,z),{space:s.root});p.lookAt(new THREE.Vector3(0,cy,z),s.root);const rh=p.hands.right.getWorldPosition(new THREE.Vector3()),lh=p.hands.left.getWorldPosition(new THREE.Vector3());if(f===0||f===3||f===4){const end=f===4?new THREE.Vector3(rh.x+.2,top+.04,z+.18):new THREE.Vector3(0,fy,z);s.rod([rh.x,rh.y+.1,rh.z],[end.x,end.y,end.z],.02,wood);s.cylinder(.045,.045,.04,[end.x,end.y+.02,end.z],wood,18);}if(f===1)s.ball([.14,.012,.09],[rh.x,rh.y,rh.z],green,18);if(f===2)s.lathe([[.04,0],[.07,.04],[.06,.04],[.035,.008]],pale,[rh.x,rh.y-.03,rh.z]);if(t===3)s.cylinder(.09,.09,.025,[.23,top+.013,z],pale,20);if(t===4)s.label('CABBAGE',.14,.08,[-.23,top+.002,z]).rotation.x=-Math.PI/2;if(a.closed)for(const hand of [p.hands.left,p.hands.right])hand.add(s.ball([.04,.04,.035],[0,0,0],dark,10));
    if(e===0){s.lathe([[.1,0],[.16,.12],[.15,.12],[.08,.015]],wood,[.52,0,0]);for(const x of [.46,.58])s.ball([.07,.06,.07],[x,.12,0],green,16);}if(e===1)s.lathe([[.09,0],[.13,.19],[.12,.19],[.08,.01]],metal,[.5,0,0]);if(e===2)s.box([.25,.02,.22],[.5,.01,0],pale);if(e===3)s.lathe([[.07,0],[.08,.18],[.065,.2],[.065,.22]],s.material('#b2c5ae',{transparent:true,opacity:.4,depthWrite:false}),[.5,0,0]);return s.finish({update:(dt,time)=>p.update(dt,time)});
  },
});
