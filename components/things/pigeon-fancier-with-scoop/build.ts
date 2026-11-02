import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What is the keeper doing?", {"feed": "Holding out a small grain scoop.", "arm": "A pigeon rests on an extended forearm.", "inspect": "Cradling a pigeon close to the chest.", "release": "Both hands open after a bird release.", "sweep": "Working with a long loft broom."}),
  state: choice("Where is their attention?", {"bird": "Looking directly at the bird.", "sky": "Watching a flock overhead.", "grain": "Looking down at the scoop.", "door": "Glancing toward the loft door.", "rest": "Standing relaxed between chores."}),
  detail: choice("What are they wearing?", {"coat": "A long tan loft coat.", "vest": "A green vest over a cream shirt.", "overalls": "Blue work overalls.", "sweater": "A brown wool sweater.", "apron": "A pale apron over a blue shirt."}),
  support: choice("What is on their head?", {"cap": "A soft flat cap.", "beanie": "A knitted cap.", "hat": "A narrow-brim hat.", "short": "Short hair.", "bald": "A bare head."}),
  extra: choice("What is nearby?", {"bucket": "A grain bucket.", "perch": "A low freestanding perch.", "bag": "A small sack of pigeon feed.", "pan": "A shallow water pan.", "clear": "An empty loft floor."}),
  mark: choice("What detail marks the keeper?", {"badge": "A HOMING CLUB chest badge.", "pocket": "A large feed pocket.", "rings": "A coloured leg-ring wrist loop.", "scarf": "A narrow neck scarf.", "plain": "Plain practical clothes."}),
  extent: score("How tall is the keeper?", ["A small adult", "An average keeper", "A tall keeper"]),
  load: score("How far is the feeding arm extended?", ["Close to the body", "A comfortable arm length", "An inviting outstretched arm"]),
  closed: noul("Are gloves worn for handling birds?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const h=1.45+a.extent*.4,p=figure(s,{height:h,style:'doll',pose:'standing',hair:(['cap','cap','hat','short','none'] as const)[u],top:['#a58c6c','#728260','#64889b','#8e7257','#6e8c9c'][d],bottom:'#655f50',skin:'#c99c79',shoes:'#514d42'});s.root.add(p.root);const hip=p.pelvis.getWorldPosition(new THREE.Vector3()),y=hip.y+.15,z=.2+a.load*.2;p.reach('right',new THREE.Vector3(-.2,y,z),{space:s.root});p.reach('left',new THREE.Vector3(.2,f===2?y+.15:y,z),{space:s.root});p.lookAt(t===1?new THREE.Vector3(0,h+1,2):t===3?new THREE.Vector3(1,h*.75,0):new THREE.Vector3(-.15,y+.1,z+.2),s.root);
    if(f===0){const scoop=s.ball([.075,.025,.11],[0,0,.05],wood,14);p.hands.right.add(scoop);for(let i=0;i<8;i++){const grain=s.ball([.008,.004,.006],[(random()-.5)*.08,.025,.03+random()*.1],pale,8);p.hands.right.add(grain);}}
    if(f===1||f===2||f===0){const bird=new THREE.Group();bird.add(s.ball([.075,.075,.12],[0,.06,0],metal,16));bird.add(s.ball([.035,.04,.035],[0,.14,.07],dark,14));bird.add(s.ball([.055,.045,.095],[.045,.07,-.01],s.material('#879b9b'),12));bird.add(s.mesh(new THREE.ConeGeometry(.011,.035,6),pale,[0,.14,.115]));bird.children[3].rotation.x=Math.PI/2;for(const x of [-.016,.016])bird.add(s.rod([x,0,.02],[x,.025,.02],.004,s.material('#a16f60')));p.hands.left.add(bird);bird.position.set(0,.03,.03);}
    if(f===4){s.rod([-.15,.05,.35],[.2,1.25,.2],.018,wood);s.box([.4,.04,.1],[-.15,.055,.35],wood);for(let i=0;i<15;i++)s.rod([-.34+i*.027,.04,.35],[-.34+i*.027,0,.35],.004,pale);}if(f===3)for(const hand of [p.hands.left,p.hands.right])hand.rotation.x=-.5;
    if(d===4){const apron=s.box([.3,.4,.02],[0,.05,.12],pale);p.joints.spine.add(apron);}if(m===0){const tag=s.label('HOMING CLUB',.17,.045,[0,.24,.13]);p.joints.spine.add(tag);}if(m===1){const pocket=s.box([.18,.15,.02],[0,.05,.14],pale);p.joints.spine.add(pocket);}if(m===2)for(let i=0;i<4;i++){const ring=s.ring(.015,.004,[0,-.025+i*.009,0],s.material(colors[i]));ring.rotation.x=Math.PI/2;p.hands.right.add(ring);}if(m===3){const scarf=s.box([.07,.2,.02],[.08,.24,.12],green);p.joints.spine.add(scarf);}if(a.closed)for(const hand of [p.hands.left,p.hands.right]){const glove=s.ball([.04,.035,.04],[0,0,0],pale,12);hand.add(glove);}
    if(e===0)s.lathe([[.12,0],[.16,.25],[.15,.25],[.11,.015]],metal,[.45,0,0]);if(e===1){s.rod([.45,0,0],[.45,.6,0],.025,wood);s.rod([.25,.6,0],[.65,.6,0],.018,wood);s.box([.35,.03,.3],[.45,.015,0],wood);}if(e===2)s.ball([.17,.23,.12],[.45,.23,0],pale,16);if(e===3)s.lathe([[0,0],[.2,.025],[.21,.06],[.19,.06],[0,.03]],metal,[.45,0,0]);return s.finish({update:(dt,time)=>p.update(dt,time)});
  },
});
