import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("How is the player taking the shot?", {"square": "A square stance over the ball.", "side": "A side-on leaning stance.", "low": "A low crouch to judge the line.", "rest": "Standing upright with the mallet.", "follow": "A slight forward lean after contact."}),
  state: choice("What is the match moment?", {"aim": "The player studies a waiting ball.", "tap": "The mallet head touches the ball.", "roquet": "Two balls touch for the next stroke.", "wait": "The player pauses beside a single hoop.", "done": "The ball has rolled a short distance away."}),
  detail: choice("What do they wear?", {"white": "A cream club shirt and dark trousers.", "green": "A sage polo shirt and tan trousers.", "blue": "A blue shirt and pale trousers.", "rust": "A rust cardigan over dark trousers.", "stripe": "A pale shirt with a dark waist stripe."}),
  support: choice("What footwear is worn?", {"brown": "Brown low shoes.", "white": "White lawn shoes.", "green": "Dark green rubber-soled shoes.", "boots": "Short dark ankle boots.", "sandals": "Light tan summer shoes."}),
  extra: choice("What lies by the player?", {"hoop": "A single white hoop.", "ball": "A spare yellow ball.", "case": "A small closed ball case.", "hat": "A straw hat on the ground.", "none": "An uncluttered patch of lawn."}),
  mark: choice("How is their head dressed?", {"cap": "A dark cloth cap.", "sun": "A broad pale sun hat.", "bun": "A tidy dark bun.", "grey": "Short grey hair.", "bare": "A bare head."}),
  extent: score("How tall is the player?", ["A small adult", "An average adult", "A tall adult"]),
  load: score("How far forward are they aiming?", ["A close cautious stroke", "An ordinary stance", "An extended long stroke"]),
  closed: noul("Is a small club badge pinned to the shirt?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const h=1.45+a.extent*.4,p=figure(s,{height:h,pose:f===2?'crouching':'standing',style:'doll',hair:(['cap','none','bun','short','none'] as const)[m],hairColor:m===3?'#aaa596':'#4d4336',top:['#d5cfb4','#8b9e7c','#7394a2','#a7745b','#c9c8af'][d],bottom:d===1?'#a49372':d===2?'#c4bfa7':'#65705d',shoes:['#6e5943','#d6d5bc','#546b55','#424e43','#b29d72'][u],skin:'#c29f79'});s.root.add(p.root);if(f!==2){p.joints.spine.rotation.x=f===3?0:.15+a.load*.13;p.root.rotation.y=f===1?.4:0;p.settle();}const hip=p.pelvis.getWorldPosition(new THREE.Vector3()),target=new THREE.Vector3(.02,hip.y-.06,.22+a.load*.12);p.reach('left',target.clone().add(new THREE.Vector3(.025,.045,0)),{space:s.root});p.reach('right',target.clone().add(new THREE.Vector3(-.025,-.045,0)),{space:s.root});p.lookAt(new THREE.Vector3(0,.1,.6),s.root);const hand=p.hands.right.getWorldPosition(new THREE.Vector3()),head=new THREE.Vector3(hand.x,.06,hand.z+.08);s.rod([head.x,head.y,head.z],[hand.x,hand.y+.13,hand.z],.015,wood);s.cylinder(.06,.06,.24,[head.x,.06,head.z],wood,22).rotation.x=Math.PI/2;
    const bz=t===4?head.z+.5:head.z+(t===1?.17:.3);s.ball([.045,.045,.045],[head.x,.045,bz],s.material('#a45642'),20);if(t===2)s.ball([.045,.045,.045],[head.x+.085,.045,bz],s.material('#577f94'),20);if(e===0||t===3)s.tube([[.45,0,.3],[.45,.32,.3],[.6,.32,.3],[.6,0,.3]],.012,pale);if(e===1)s.ball([.045,.045,.045],[.45,.045,0],s.material('#c8ab55'),18);if(e===2)s.box([.3,.12,.24],[.5,.06,0],wood);if(e===3){s.cylinder(.17,.17,.012,[.5,.006,0],wood,28);s.ball([.11,.06,.11],[.5,.06,0],wood,18);}if(m===1){const v=p.joints.neck.getWorldPosition(new THREE.Vector3());s.cylinder(.22,.22,.015,[v.x,v.y+.23,v.z],pale,28);s.ball([.14,.07,.14],[v.x,v.y+.27,v.z],pale,20);}if(d===4)p.joints.spine.add(s.box([h*.19,.04,.018],[0,.08,h*.08],dark));if(a.closed)p.joints.spine.add(s.label('CLUB',.07,.03,[h*.055,.14,h*.085]));return s.finish({update:(dt,time)=>p.update(dt,time)});
  },
});
