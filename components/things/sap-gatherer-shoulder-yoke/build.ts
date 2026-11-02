import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("How is the gatherer carrying the load?", {"yoke": "Two pails hang from a shoulder yoke.", "hands": "A pail is carried in each hand.", "single": "One heavy pail is carried at the side.", "pour": "A pail is tipped toward a low collecting can.", "rest": "The yoke is set down beside the worker."}),
  state: choice("What part of the round is this?", {"walk": "Walking steadily between trees.", "balance": "Pausing to balance a full load.", "look": "Looking toward the next tapped tree.", "tired": "Leaning slightly after a long round.", "return": "Returning with empty pails."}),
  detail: choice("What outer layer is worn?", {"plaid": "A red wool jacket.", "green": "A green field coat.", "tan": "A tan canvas work coat.", "blue": "A blue insulated jacket.", "vest": "A brown vest over thick sleeves."}),
  support: choice("What keeps their head warm?", {"beanie": "A knitted cap.", "earflaps": "A cap with ear flaps.", "hood": "A close-fitting hood.", "hat": "A broad felt hat.", "bare": "Short uncovered hair."}),
  extra: choice("What is underfoot?", {"snow": "A small thawing snow patch.", "mud": "A damp muddy patch.", "leaves": "A few dry leaves.", "board": "A narrow timber footboard.", "clear": "Clear ground."}),
  mark: choice("What travelling detail do they have?", {"scarf": "A long wool scarf.", "mittens": "Thick pale mittens.", "pack": "A small back pack.", "tag": "A MAPLE CREW badge.", "plain": "Plain work clothes."}),
  extent: score("How tall is the gatherer?", ["A small adult", "An average gatherer", "A tall adult"]),
  load: score("How full are the carried pails?", ["Empty after delivery", "Half-full pails", "A heavy full load"]),
  closed: noul("Are tall rubber boots worn?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const h=1.45+a.extent*.4,p=figure(s,{height:h,style:'doll',pose:t===0?'walking':'standing',hair:(['cap','cap','cap','hat','short'] as const)[u],top:['#a3634e','#71805f','#ac906c','#6c8d9d','#856f51'][d],bottom:'#625f4c',skin:'#c59a76',shoes:a.closed?'#444f46':'#806e54'});s.root.add(p.root);if(t===3){p.joints.spine.rotation.x=.2;p.settle();}const shoulder=h*.77,py=f===4?.22:h*.3;
    if(f===0||f===4){const y=f===4?.6:shoulder;s.tube([[-.63,y-.04,0],[-.3,y+.04,0],[0,y+.02,0],[.3,y+.04,0],[.63,y-.04,0]],.04,wood);for(const sign of [-1,1])s.rod([sign*.6,y-.04,0],[sign*.6,py+.25,.04],.005,dark);}
    const pail=(x:number,y:number,z:number,tilt=0)=>{const g=new THREE.Group();g.add(s.lathe([[.1,0],[.15,.26],[.14,.26],[.09,.015]],metal));g.add(s.tube([[-.15,.24,0],[0,.39,0],[.15,.24,0]],.005,metal));if(t!==4&&a.load>.1)g.add(s.cylinder(.12,.1,.015+a.load*.18,[0,.025+a.load*.09,0],s.material('#bcc7b7',{transparent:true,opacity:.7,depthWrite:false}),20));g.position.set(x,y,z);g.rotation.x=tilt;s.root.add(g);};
    if(f===0||f===4)for(const sign of [-1,1])pail(sign*.6,py-.14,.04);if(f===1||f===2){pail(-.3,h*.25,.04);p.reach('right',new THREE.Vector3(-.3,h*.25+.39,.04),{space:s.root});if(f===1){pail(.3,h*.25,.04);p.reach('left',new THREE.Vector3(.3,h*.25+.39,.04),{space:s.root});}}if(f===3){pail(-.18,h*.48,.32,.8);p.reach('right',new THREE.Vector3(-.18,h*.6,.3),{space:s.root});s.lathe([[.15,0],[.2,.4],[.18,.4],[.13,.02]],metal,[0,0,.45]);}p.lookAt(t===2?new THREE.Vector3(1,h*.7,1):new THREE.Vector3(0,h*.6,2),s.root);
    if(m===0){const scarf=s.box([.08,.4,.025],[.08,.17,.14],pale);p.joints.spine.add(scarf);}if(m===1)for(const hand of [p.hands.left,p.hands.right]){const mitten=s.ball([.045,.04,.04],[0,0,0],pale,12);hand.add(mitten);}if(m===2){const pack=s.box([.25,.32,.12],[0,.1,-.16],green);p.joints.spine.add(pack);}if(m===3){const tag=s.label('MAPLE CREW',.18,.05,[0,.24,.13]);p.joints.spine.add(tag);}if(e===0||e===1)s.cylinder(.65,.7,.015,[0,.008,0],e===0?pale:s.material('#8b7e63'),20);if(e===2)for(let i=0;i<6;i++)s.ball([.035,.003,.05],[(random()-.5)*.8,.004,(random()-.5)*.4],wood,8);if(e===3)s.box([.85,.025,.3],[0,.013,0],wood);return s.finish({update:(dt,time)=>p.update(dt,time)});
  },
});
