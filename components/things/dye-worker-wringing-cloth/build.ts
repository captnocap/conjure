import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What are the hands doing?", {"wring": "Twisting a long cloth over a tub.", "lift": "Lifting a dripping cloth to inspect it.", "dip": "Lowering cloth into the dye bath.", "spread": "Holding a small sample open at chest height.", "fold": "Folding cloth over one forearm."}),
  state: choice("What is the workers focus?", {"cloth": "Studying the cloth closely.", "effort": "Leaning into a firm wringing motion.", "teach": "Turning toward an unseen student.", "rest": "Pausing with the cloth held low.", "colour": "Holding the cloth toward the light."}),
  detail: choice("What work clothes are worn?", {"apron": "A pale long apron over a dark shirt.", "smock": "A blue loose cotton smock.", "vest": "A green vest over rolled sleeves.", "coat": "A long brown work coat.", "linen": "A cream linen shirt and dark trousers."}),
  support: choice("How is their hair kept back?", {"scarf": "A wrapped cloth head scarf.", "bun": "A tight bun.", "short": "Short hair.", "cap": "A simple work cap.", "none": "A bare head."}),
  extra: choice("What receives the drips?", {"basin": "A low broad rinse basin.", "bucket": "A metal bucket.", "tub": "A wooden wash tub.", "mat": "A stained floor mat.", "none": "A clear working patch."}),
  mark: choice("What small detail marks their work?", {"gloves": "Long blue dye gloves.", "patch": "A patched apron pocket.", "towel": "A cloth tucked at the waist.", "neck": "A pale neck cloth.", "plain": "Plain working clothes."}),
  extent: score("How tall is the worker?", ["A small adult", "An average adult", "A tall craftsperson"]),
  load: score("How long is the cloth being worked?", ["A small sample", "A scarf length", "A long fabric length"]),
  closed: noul("Are dark rubber boots worn?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const h=1.45+a.extent*.4,p=figure(s,{height:h,style:'doll',pose:'standing',hair:(['cap','bun','short','cap','none'] as const)[u],top:['#586e72','#597d91','#718260','#8b7154','#d3c6a9'][d],bottom:'#65634f',skin:'#c49872',shoes:a.closed?'#404e49':'#8b795c'});s.root.add(p.root);p.joints.spine.rotation.x=t===1?.2:.05;p.settle();const hip=p.pelvis.getWorldPosition(new THREE.Vector3()),y=f===1||f===3?hip.y+.35:f===2?hip.y-.15:hip.y+.05,z=.35,span=.22+a.load*.25;for(const side of ['left','right'] as const)p.reach(side,new THREE.Vector3(side==='left'?span/2:-span/2,y+(f===1&&side==='left'?.15:0),z),{space:s.root});p.lookAt(t===2?new THREE.Vector3(1,h*.75,1):new THREE.Vector3(0,y,z),s.root);
    const cloth=s.material('#466d89',{side:THREE.DoubleSide}),lh=p.hands.left.getWorldPosition(new THREE.Vector3()),rh=p.hands.right.getWorldPosition(new THREE.Vector3());if(f===0)s.tube([[rh.x,rh.y,rh.z],[(lh.x+rh.x)/2,(lh.y+rh.y)/2-.06,(lh.z+rh.z)/2+.03],[lh.x,lh.y,lh.z]],.045,cloth);else s.surface((u,v,point)=>point.set(rh.x+(lh.x-rh.x)*u,rh.y+(lh.y-rh.y)*u-v*(.25+a.load*.4),rh.z+(lh.z-rh.z)*u+Math.sin(u*Math.PI*6)*.015),cloth,{segments:[14,18]});
    if(e<3)s.lathe([[.18,0],[.3,.22],[.28,.22],[.16,.02]],e===2?wood:metal,[0,0,z]);if(e===3)s.box([.75,.008,.6],[0,.004,z],pale);if(d===0){const apron=s.box([.32,.5,.02],[0,.02,.13],pale);p.joints.spine.add(apron);}if(m===0)for(const hand of [p.hands.left,p.hands.right]){const glove=s.ball([.045,.04,.045],[0,0,0],cloth,12);hand.add(glove);}if(m===1){const patch=s.box([.12,.13,.015],[.08,.02,.15],cloth);p.joints.spine.add(patch);}if(m===2){const towel=s.box([.12,.3,.018],[.13,-.05,.15],pale);p.joints.spine.add(towel);}if(m===3){const neck=s.box([.1,.18,.025],[0,.25,.13],pale);p.joints.spine.add(neck);}return s.finish({update:(dt,time)=>p.update(dt,time)});
  },
});
