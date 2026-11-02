import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What head does the mallet have?", {"barrel": "A cylindrical barrel head.", "square": "A square-ended hardwood head.", "brass": "A barrel with brass end bands.", "junior": "A short light junior mallet.", "flat": "A broad flat-faced competition head."}),
  state: choice("What moment is shown?", {"ready": "A ball is lined up before the head.", "rest": "The mallet stands alone between turns.", "contact": "The head touches a ball ready for a tap.", "repair": "A cloth wrap protects a split shaft.", "pair": "Two balls wait for a roquet shot."}),
  detail: choice("What timber is the head?", {"ash": "Pale ash wood.", "rose": "Warm reddish hardwood.", "ebony": "Dark stained hardwood.", "maple": "Light honey-coloured maple.", "paint": "Muted green painted wood."}),
  support: choice("What grip is on the shaft?", {"leather": "Dark leather wrapping.", "cord": "A pale cord spiral.", "rubber": "Black rubber with raised rings.", "wood": "Smooth bare timber.", "tape": "A red fabric grip."}),
  extra: choice("What lies beside the mallet?", {"ball": "A spare yellow croquet ball.", "cloth": "A folded polishing cloth.", "peg": "A small coloured boundary peg.", "bag": "A narrow cloth head cover.", "none": "Only the mallet and its playing balls."}),
  mark: choice("What marks the head?", {"stripe": "A dark central aiming stripe.", "initial": "A small CLUB 04 plaque.", "rings": "Two coloured end rings.", "dot": "A pale alignment dot.", "plain": "Plain unmarked wood."}),
  extent: score("How tall is the mallet?", ["A junior club mallet", "An average adult mallet", "A long competition shaft"]),
  load: score("How broad is the striking face?", ["A narrow precise head", "An everyday head", "A heavy broad head"]),
  closed: noul("Does a small wrist cord loop from the grip?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const h=(f===3?.55:.75)+a.extent*.24,r=.055+a.load*.025,L=f===4?.3:.24,head=s.material(['#c4aa77','#a47551','#5c4937','#c1a06a','#718b67'][d]),grip=s.material(['#6b4d38','#d6c7a4','#424b40','#a9885a','#ad654d'][u]);if(f===1||f===4)s.box([r*2,r*2,L],[0,r,0],head);else s.cylinder(r,r,L,[0,r,0],head,24).rotation.x=Math.PI/2;s.rod([0,r,0],[0,h,0],.015,wood);s.cylinder(.021,.021,.23,[0,h-.1,0],grip,16);if(u===1||u===2)for(let i=0;i<10;i++)s.ring(.022,.0025,[0,h-.21+i*.022,0],u===1?pale:dark).rotation.x=Math.PI/2;if(f===2||m===2)for(const z of [-L*.43,L*.43])s.ring(r+.002,.006,[0,r,z],f===2?metal:s.material('#a95f46'));
    if(m===0)s.box([.012,.003,L*.8],[0,r*2+.002,0],dark);if(m===1)s.label('CLUB 04',r*1.6,.035,[0,r,L/2+.003]);if(m===3)s.ball([.008,.002,.008],[0,r*2+.002,0],pale,10);if(t===3)for(let i=0;i<6;i++)s.ring(.019,.005,[0,h*.47+i*.01,0],pale).rotation.x=Math.PI/2;if(t!==1&&t!==3){const z=t===2?L/2+.051:.32;s.ball([.05,.05,.05],[0,.05,z],s.material('#8a463b'),20);if(t===4)s.ball([.05,.05,.05],[.1,.05,z+.06],s.material('#466f82'),20);}if(e===0)s.ball([.05,.05,.05],[.18,.05,.05],s.material('#c7ac58'),20);if(e===1)s.box([.15,.018,.13],[.2,.009,0],pale);if(e===2){s.rod([.18,0,0],[.18,.18,0],.012,wood);s.cylinder(.014,.014,.05,[.18,.16,0],s.material('#527c96'),12);}if(e===3)s.drape({size:[.19,.28],at:[.2,.04,0],over:[{box:[.12,.035,.2],at:[.2,.018,0]}],floor:.004,detail:12},green);if(a.closed)s.tube([[0,h-.02,0],[.07,h+.02,0],[.07,h-.09,0],[0,h-.03,0]],.003,pale);return s.finish();
  },
});
