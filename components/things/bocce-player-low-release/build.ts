import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("How is the player delivering the ball?", {"low": "A low underarm roll near the knee.", "lob": "A lofted delivery from waist height.", "aim": "Standing still with the ball held out to aim.", "crouch": "Crouched deeply to study the line.", "follow": "A forward follow-through after release."}),
  state: choice("What is their reaction?", {"calm": "Quietly concentrated.", "hope": "Leaning forward to follow the result.", "celebrate": "One free hand raised after a good shot.", "debate": "The free arm points toward the target.", "reset": "Looking down while preparing another ball."}),
  detail: choice("What are they wearing?", {"polo": "A cream polo and green trousers.", "cardigan": "A red cardigan and dark trousers.", "tracksuit": "A blue club tracksuit.", "linen": "A light linen shirt and brown trousers.", "vest": "A knitted vest over a pale shirt."}),
  support: choice("What is on their head?", {"cap": "A soft flat cap.", "hat": "A brimmed summer hat.", "short": "Short hair.", "bun": "Hair gathered in a bun.", "none": "A bare smooth head."}),
  extra: choice("What is beside the player?", {"jack": "A small target jack.", "balls": "Two spare team balls.", "towel": "A folded wiping towel.", "bag": "A soft equipment bag.", "clear": "A clear throwing area."}),
  mark: choice("What marks the throwing line?", {"chalk": "A pale chalk line.", "timber": "A narrow timber threshold.", "circle": "A chalk throwing circle.", "mat": "A small rectangular foot mat.", "none": "No visible line."}),
  extent: score("How tall is the player?", ["A young player", "An average adult", "A tall adult"]),
  load: score("How far forward is the stride?", ["Feet together", "A short measured step", "A long forward stride"]),
  closed: noul("Does the player wear a small club badge?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const h=1.2+a.extent*.7,p=figure(s,{height:h,style:'doll',pose:f===3?'crouching':'standing',hair:(['cap','hat','short','bun','none'] as const)[u],gaze:'down',top:['#d9d2b9','#a05748','#557b9a','#d8c9aa','#707d5e'][d],bottom:d===3?'#80684f':'#505e4c',shoes:'#574b3d',skin:['#d6ac87','#a57150','#e5bfa2'][Math.floor(random()*3)]});s.root.add(p.root);
    p.joints.hips.left.rotation.x=-a.load*.22;p.joints.hips.right.rotation.x=a.load*.13;if(f===0||f===4||t===1)p.joints.spine.rotation.x=.18+a.load*.14;p.settle();
    const hip=p.pelvis.getWorldPosition(new THREE.Vector3());const target=new THREE.Vector3(-h*.13,hip.y+(f===1?.1:f===2?.15:f===3?-.05:-.25)*h,.22+(f===4?.3:.08)*h);p.reach('right',target,{space:s.root});p.lookAt(new THREE.Vector3(0,.04,2),s.root);
    const ball=s.ball([.055,.055,.055],[0,0,0],s.material('#b55b47'),16);p.hands.right.add(ball);ball.position.set(0,-.025,.025);
    if(t===2)p.reach('left',new THREE.Vector3(h*.2,h*.9,.1),{space:s.root});if(t===3)p.reach('left',new THREE.Vector3(h*.2,hip.y+.05,.55),{space:s.root});
    if(e===0)s.ball([.022,.022,.022],[.27,.022,.65],pale,12);if(e===1)for(const x of [.28,.42])s.ball([.055,.055,.055],[x,.055,.23],green,14);if(e===2)s.box([.22,.025,.16],[.35,.013,.15],pale);if(e===3){s.ball([.18,.1,.12],[.38,.1,0],green,12);s.tube([[.24,.14,0],[.3,.27,0],[.44,.27,0],[.5,.14,0]],.01,dark);}
    if(m===0)s.box([1.15,.003,.025],[0,.002,.28],pale);if(m===1)s.box([1.15,.03,.08],[0,.015,.28],wood);if(m===2)s.ring(.43,.008,[0,.009,.05],pale).rotation.x=Math.PI/2;if(m===3)s.box([.75,.012,.6],[0,.006,0],green);
    if(a.closed){const tag=s.label('BOCCE CLUB',.14,.045,[.05,h*.2,h*.075]);p.joints.spine.add(tag);}
    return s.finish({update:(dt,time)=>p.update(dt,time)});
  },
});
