import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What shape is the bottle?", {"round": "A broad round-bellied demijohn.", "tall": "A tall cylindrical fermentation bottle.", "pear": "A pear-shaped old glass carboy.", "squat": "A squat wide-neck cider jar.", "shoulder": "A square-shouldered gallon bottle."}),
  state: choice("What fermentation stage is visible?", {"fresh": "Cloudy fresh juice with a foam line.", "active": "A deep foam cap and bubbles in the airlock.", "settled": "Clear amber cider above a sediment layer.", "racked": "Only a shallow heel remains after siphoning.", "empty": "A washed empty bottle waiting for autumn."}),
  detail: choice("What colour is the glass?", {"clear": "Nearly clear glass.", "green": "Pale green bottle glass.", "amber": "Warm amber glass.", "blue": "Soft blue recycled glass.", "olive": "Dark olive glass."}),
  support: choice("How is the bottle protected?", {"basket": "A woven wicker basket with handles.", "crate": "A slatted square protective crate.", "rope": "A knotted rope carrying net.", "sleeve": "A canvas sleeve around the lower half.", "bare": "Bare glass on a cork ring."}),
  extra: choice("What closes the neck?", {"airlock": "A two-chamber glass airlock in a bung.", "tube": "A blow-off tube into a small water jar.", "cork": "A plain cork stopper.", "cloth": "A tied square of cloth.", "cap": "A metal screw cap."}),
  mark: choice("What does the batch label say?", {"orchard": "AUTUMN BLEND.", "tree": "OLD ORCHARD.", "date": "OCTOBER PRESSING.", "number": "BATCH 04.", "blank": "A blank paper tag."}),
  extent: score("How large is the demijohn?", ["A small gallon bottle", "A household carboy", "A large cellar bottle"]),
  load: score("How full is the bottle?", ["One third full", "Two thirds full", "Full to the shoulder"]),
  closed: noul("Is a sampling cup placed beside the bottle?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const r=.15+a.extent*.12,h=f===1?.75:f===3?.42:.6,glass=s.material(['#d3dfd2','#809e79','#ab8854','#86a9ae','#758565'][d],{transparent:true,opacity:.42,depthWrite:false,roughness:.18}),profile:[[number,number],...Array<[number,number]>]=[[0,0],[r*.65,.02],[r,.15],[r*(f===2?.95:.94),h*.62],[r*.7,h*.8],[.035,h*.9],[.035,h]];
    s.lathe(profile,glass);const fill=t===4?0:t===3?.07:h*(.25+a.load*.5);if(fill>0){s.cylinder(r*.86,r*.68,fill,[0,fill/2+.025,0],s.material(t===0?'#c4ac61':'#ae873b',{roughness:.3}),28);if(t<2)s.cylinder(r*.86,r*.86,.018,[0,fill+.035,0],pale,28);if(t===2)s.cylinder(r*.68,r*.68,.012,[0,.024,0],s.material('#89764c'),24);}
    if(u===0||u===2){for(let i=0;i<12;i++){const ang=i*Math.PI/6;s.tube([[Math.cos(ang)*r*.65,.01,Math.sin(ang)*r*.65],[Math.cos(ang)*r*1.03,.18,Math.sin(ang)*r*1.03],[Math.cos(ang)*r*.97,h*.55,Math.sin(ang)*r*.97]],u===2?.005:.009,wood);}for(let i=0;i<(u===2?3:10);i++)s.ring(r*(.85+Math.min(i,4)*.04),u===2?.004:.006,[0,.05+i*h*.045,0],wood).rotation.x=Math.PI/2;if(u===0)for(const x of [-r,r])s.ring(.07,.01,[x,h*.55,0],wood).rotation.y=Math.PI/2;}
    if(u===1){s.box([r*2.3,.03,r*2.3],[0,.015,0],wood);for(const x of [-r*1.1,r*1.1])for(const z of [-r*1.1,r*1.1])s.rod([x,0,z],[x,h*.65,z],.018,wood);for(const y of [.13,.3])for(const z of [-r*1.1,r*1.1])s.box([r*2.3,.055,.02],[0,y,z],wood);}if(u===3)s.lathe([[r*.7,0],[r*1.03,.15],[r*.98,h*.55]],pale);if(u===4)s.ring(r*.67,.012,[0,.012,0],wood).rotation.x=Math.PI/2;
    s.cylinder(.037,.035,.04,[0,h+.01,0],e===4?metal:wood,16);if(e===0){s.tube([[0,h+.03,0],[0,h+.13,0],[.055,h+.13,0],[.055,h+.07,0],[.11,h+.07,0],[.11,h+.18,0]],.012,glass);if(t===1)for(let i=0;i<3;i++)s.ball([.007,.007,.007],[.11,h+.1+i*.025,0],pale,10);}if(e===1){s.tube([[0,h+.03,0],[0,h+.14,0],[r+.16,.16,0],[r+.16,.03,0]],.008,pale);s.lathe([[.045,0],[.05,.14],[.044,.14],[.04,.01]],glass,[r+.16,0,0]);}if(e===3)s.drape({size:[.16,.16],at:[0,h+.07,0],over:[{cylinder:[.035,.05],at:[0,h,0]}],floor:h-.05,detail:10},pale);
    s.label(['AUTUMN BLEND','OLD ORCHARD','OCTOBER PRESS','BATCH 04',''][m],r*1.5,.08,[0,h*.65,r*.94]);if(a.closed)s.lathe([[.035,0],[.055,.1],[.049,.1],[.03,.01]],glass,[-r-.1,0,.05]);return s.finish();
  },
});
