import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What are their hands doing?", {"pinch": "Pinching a dumpling seam together.", "fill": "Spooning filling into an open wrapper.", "show": "Holding a finished dumpling up to demonstrate.", "roll": "Pressing a short rolling pin across dough.", "rest": "Resting one hand while the other holds a wrapper."}),
  state: choice("What is the moment in the lesson?", {"teach": "A careful demonstration with their head inclined.", "laugh": "A relaxed glance toward the listener.", "focus": "Both eyes follow the dough.", "wait": "A paused lesson with tools laid out.", "batch": "A busy rhythm with finished dumplings lined up."}),
  detail: choice("What is their working clothing?", {"apron": "A pale apron over a red cardigan.", "blue": "A blue cotton work shirt.", "vest": "A knitted vest with rolled sleeves.", "linen": "A loose cream linen top.", "checked": "A green kitchen apron over brown clothes."}),
  support: choice("What supports the maker?", {"stool": "A low round wooden stool.", "chair": "A straight-backed kitchen chair.", "bench": "A broad simple bench.", "cushion": "A thick cushion on a low platform.", "wicker": "A rounded wicker chair."}),
  extra: choice("What sits on the work board?", {"wrappers": "A small stack of wrappers.", "bowl": "A bowl of green filling.", "tray": "A tray of finished dumplings.", "water": "A water dish for sealing seams.", "scraper": "A flat dough scraper."}),
  mark: choice("How is their hair arranged?", {"bun": "A low grey bun.", "short": "Short grey hair.", "cap": "A soft cloth cap.", "bald": "A nearly bare head.", "scarf": "A wrapped head scarf."}),
  extent: score("How tall is the seated maker?", ["A small elder", "An average adult", "A tall elder"]),
  load: score("How many dumplings have they made?", ["The first dumpling", "A short row", "A whole row"]),
  closed: noul("Are reading glasses perched on their face?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const h=1.4+a.extent*.4,p=figure(s,{height:h,pose:'sitting',style:'doll',hair:(['bun','short','cap','none','cap'] as const)[m],top:['#a46656','#648293','#8c795f','#d8cbb1','#737c5a'][d],bottom:'#756553',skin:'#c99b76',hairColor:'#a49e8f',gaze:'down'});s.root.add(p.root);const hip=p.pelvis.getWorldPosition(new THREE.Vector3()),seat=hip.y-.06;
    if(u===0)s.cylinder(.23,.2,.06,[0,seat-.035,0],wood,20);else{s.box([u===2?.8:.48,.07,.46],[0,seat-.035,0],u===3?pale:wood);if(u===1||u===4)s.box([.5,.5,.045],[0,seat+.22,-.22],wood);}for(const x of [-.17,.17])for(const z of [-.15,.15])s.rod([x,0,z],[x,seat-.05,z],.025,wood);
    const by=hip.y+.12,bz=.43;s.box([.67,.035,.38],[0,by,bz],wood);for(const x of [-.27,.27])s.rod([x,0,bz],[x,by-.02,bz],.025,wood);
    const target=new THREE.Vector3(f===2?-.14:0,by+(f===2?.22:.08),bz);p.reach('right',target.clone().add(new THREE.Vector3(-.045,0,0)),{space:s.root});if(f!==4)p.reach('left',target.clone().add(new THREE.Vector3(.045,0,0)),{space:s.root});p.lookAt(t===1?new THREE.Vector3(1,hip.y+.5,1):target,s.root);
    const dough=s.material('#dfd1af');s.ball([.045,.028,.025],target.toArray() as [number,number,number],dough,14);for(let i=0;i<5;i++)s.rod([target.x+(i-2)*.014,target.y+.015,target.z],[target.x+(i-2)*.014,target.y+.033,target.z+.005],.003,pale);
    if(f===1)s.rod([-.07,by+.1,bz],[.02,by+.13,bz],.006,wood);if(f===3)s.rod([-.1,by+.06,bz],[.1,by+.06,bz],.015,wood);
    for(let i=0;i<1+Math.round(a.load*6);i++)s.ball([.025,.018,.02],[-.25+i*.075,by+.037,bz+.12],dough,12);
    if(e===0)for(let i=0;i<5;i++)s.cylinder(.05,.05,.003,[.22,by+.02+i*.004,bz-.08],dough,20);if(e===1||e===3){s.lathe([[.04,0],[.065,.05],[.06,.05],[.035,.01]],pale,[-.22,by+.02,bz-.07]);s.cylinder(.048,.048,.004,[-.22,by+.05,bz-.07],e===1?green:metal,16);}if(e===2)s.box([.25,.012,.14],[.17,by+.025,bz],pale);if(e===4)s.box([.09,.004,.07],[.22,by+.023,bz-.08],metal);
    if(d===0||d===4){const apron=s.box([h*.19,h*.25,.015],[0,h*.08,h*.075],pale);p.joints.spine.add(apron);}if(a.closed){for(const x of [-.035,.035]){const ring=s.ring(.028,.003,[x,.015,.09],metal);p.head.add(ring);}const bridge=s.rod([-.012,.02,.09],[.012,.02,.09],.002,metal);p.head.add(bridge);}
    return s.finish({update:(dt,time)=>p.update(dt,time)});
  },
});
