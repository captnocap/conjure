import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What holds the clean snow?", {"trough": "A long wooden serving trough.", "pan": "A shallow enamel snow pan.", "round": "A round wooden snow tub.", "sled": "A small sled-shaped serving tray.", "table": "A raised low taffy table."}),
  state: choice("What is happening at the taffy party?", {"pour": "Fresh amber ribbons are cooling on the snow.", "roll": "Several ribbons are rolled around tasting sticks.", "serve": "Rolled taffy sticks are ready to take.", "finished": "Only marks in the snow and one stick remain.", "fresh": "Fresh snow waits for the first syrup."}),
  detail: choice("How is the syrup drizzled?", {"lines": "Long parallel amber lines.", "loops": "Loose loops and coils.", "zigzag": "A back-and-forth zigzag.", "drops": "Small round tasting pools.", "names": "Short curls and playful marks."}),
  support: choice("What supports the serving trough?", {"feet": "Short timber feet.", "trestle": "A low folding trestle.", "stumps": "Two cut log supports.", "mat": "A woven insulating mat.", "ground": "Directly on the ground."}),
  extra: choice("What is beside the snow?", {"pitcher": "A small syrup pitcher.", "sticks": "A bundle of spare wooden tasting sticks.", "cup": "A paper cup for used sticks.", "cloth": "A folded wiping cloth.", "none": "Only the snow trough."}),
  mark: choice("What is written on the front?", {"maple": "MAPLE TAFFY.", "snow": "SUGAR ON SNOW.", "party": "SUGARING PARTY.", "stripe": "A red painted edge stripe.", "plain": "Unmarked timber."}),
  extent: score("How long is the snow trough?", ["A family tray", "A party trough", "A long communal serving trough"]),
  load: score("How many taffy portions are ready?", ["Three portions", "Six portions", "Ten portions"]),
  closed: noul("Is a little covered pan of warm syrup set alongside?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const L=.6+a.extent*.8,w=.38,base=u===1?.5:u===2?.3:u===0?.08:.015,snow=s.material('#e4e6da'),syrup=s.material('#b28b42',{roughness:.25});if(f===2)s.lathe([[0,0],[L*.4,.02],[L*.42,.14],[L*.4,.14],[0,.025]],wood,[0,base,0]);else{s.box([L,.025,w],[0,base+.013,0],f===1?pale:wood);for(const z of [-w/2,w/2])s.box([L,.12,.02],[0,base+.07,z],f===1?pale:wood);for(const x of [-L/2,L/2])s.box([.02,.12,w],[x,base+.07,0],wood);}if(f===2)s.cylinder(L*.38,L*.38,.07,[0,base+.06,0],snow,32);else s.box([L-.04,.07,w-.035],[0,base+.06,0],snow);
    const n=t===3?1:3+Math.round(a.load*7);if(t!==4)for(let i=0;i<n;i++){const x=(i/(n-1||1)-.5)*L*.8,y=base+.1;if(t===1||t===2||t===3){s.rod([x,y,-.14],[x,y,.15],.005,wood);for(let j=0;j<5;j++)s.ring(.015,.004,[x,y+.015,-.05+j*.008],syrup);}else if(d===3)s.ball([.025,.003,.04],[x,y,0],syrup,14);else{s.tube([[x-.015,y,-.13],[x+(d===2?.025:0),y,-.06],[x-.02,y,.02],[x+(d===1?.03:0),y,.13]],.007,syrup);}}
    if(u===0||u===1)for(const x of [-L*.35,L*.35])for(const z of [-w*.3,w*.3])s.rod([x,0,z],[x,base,z],.02,wood);if(u===2)for(const x of [-L*.3,L*.3])s.cylinder(.13,.16,.3,[x,.15,0],wood,14);if(u===3)s.box([L+.15,.015,w+.12],[0,.008,0],pale);if(f===3)for(const z of [-w*.35,w*.35])s.tube([[-L*.5,.02,z],[L*.4,.02,z],[L*.58,.14,z]],.018,wood);
    if(e===0){s.lathe([[.04,0],[.065,.09],[.045,.15],[.035,.15],[.03,.01]],metal,[L/2+.12,0,0]);s.ring(.035,.008,[L/2+.18,.08,0],metal);}if(e===1)for(let i=0;i<8;i++)s.rod([L/2+.05+i*.009,.006,-.1],[L/2+.05+i*.009,.006,.12],.003,wood);if(e===2)s.lathe([[.035,0],[.05,.1],[.045,.1],[.03,.01]],pale,[L/2+.1,0,0]);if(e===3)s.box([.16,.025,.12],[L/2+.12,.013,0],pale);if(m<3)s.label(['MAPLE TAFFY','SUGAR ON SNOW','SUGARING PARTY'][m],L*.7,.06,[0,base+.075,w/2+.012]);if(m===3)s.box([L,.025,.006],[0,base+.1,w/2+.012],s.material('#aa604d'));if(a.closed){s.cylinder(.11,.11,.08,[-L/2-.16,.04,0],metal,24);s.cylinder(.12,.12,.015,[-L/2-.16,.087,0],metal,24);s.ball([.02,.015,.02],[-L/2-.16,.11,0],wood,12);}return s.finish();
  },
});
