import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("How is the transport crate built?", {"slats": "A traditional slatted wood crate.", "wicker": "A woven wicker carrier.", "metal": "A wire-fronted metal transport box.", "double": "A divided two-bay carrier.", "basket": "A low round wicker basket."}),
  state: choice("What is the release stage?", {"closed": "The birds are secured behind the front.", "ajar": "The release front is partly lifted.", "open": "The front is fully lowered into a landing ramp.", "gone": "The empty crate waits after release.", "packing": "A folded cloth lines the open carrier."}),
  detail: choice("What is on the floor?", {"straw": "A thin layer of clean straw.", "cloth": "A soft cream transport cloth.", "slats": "An exposed slatted floor.", "mat": "A dark removable rubber mat.", "paper": "Folded paper lining."}),
  support: choice("What carries the crate?", {"top": "One broad top handle.", "ends": "Two wooden end grips.", "strap": "A long canvas shoulder strap.", "loops": "Two rope loop handles.", "none": "No additional handles."}),
  extra: choice("What waits beside the crate?", {"water": "A little water pot.", "grain": "A small grain pouch.", "bands": "A row of coloured pigeon leg rings.", "card": "A race entry card.", "clear": "Nothing beside it."}),
  mark: choice("What marks the carrier?", {"club": "HOMING CLUB painted on the front.", "number": "A bold crate number.", "arrow": "An upward arrow on the lid.", "initials": "The keepers initials.", "plain": "Plain unmarked wood."}),
  extent: score("How large is the crate?", ["A pair carrier", "A club transport crate", "A large release crate"]),
  load: score("How many birds are travelling?", ["One pigeon", "Three pigeons", "Six pigeons"]),
  closed: noul("Is a sliding ventilation shutter fitted to one side?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const w=.5+a.extent*.45,h=.35,dep=.4,frame=f===2?metal:wood;s.box([w,.025,dep],[0,.013,0],frame);for(const y of [.07,.18,.3])for(const z of [-dep/2,dep/2])if(z<0)s.box([w,.035,.018],[0,y,z],frame);for(const x of [-w/2,w/2])for(let i=0;i<7;i++)s.rod([x,.03,-dep/2+i*dep/6],[x,h,-dep/2+i*dep/6],f===2?.004:.009,frame);s.box([w,.025,dep],[0,h,0],frame);if(f===3)s.box([.018,h,dep],[0,h/2,0],wood);if(f===4){s.ring(w*.45,.018,[0,.04,0],wood).rotation.x=Math.PI/2;s.ring(w*.45,.018,[0,h,0],wood).rotation.x=Math.PI/2;}
    const door=new THREE.Group();for(let i=0;i<11;i++)door.add(s.rod([-w/2+i*w/10,0,0],[-w/2+i*w/10,h,0],.007,frame));for(const y of [0,h])door.add(s.rod([-w/2,y,0],[w/2,y,0],.012,frame));door.position.set(0,.02,dep/2);door.rotation.x=t===2||t===3||t===4?Math.PI/2:t===1?.7:0;s.root.add(door);
    if(d===1||d===3||d===4)s.box([w*.94,.005,dep*.9],[0,.03,0],d===3?dark:pale);if(d===0)for(let i=0;i<18;i++)s.rod([(random()-.5)*w*.9,.03,(random()-.5)*dep*.8],[(random()-.5)*w*.9,.03,(random()-.5)*dep*.8],.002,pale);
    if(t<3)for(let i=0;i<1+Math.round(a.load*5);i++){const x=(i%3-1)*w*.28,z=(Math.floor(i/3)-.5)*.14;s.ball([.055,.07,.085],[x,.11,z],i%2?dark:metal,12);s.ball([.027,.032,.027],[x,.19,z+.045],metal,12);s.mesh(new THREE.ConeGeometry(.009,.025,6),pale,[x,.19,z+.077]).rotation.x=Math.PI/2;s.ball([.003,.003,.003],[x+.022,.196,z+.063],dark,6);}
    if(u===0)s.tube([[-.1,h,0],[-.1,h+.1,0],[.1,h+.1,0],[.1,h,0]],.018,wood);if(u===1||u===3)for(const x of [-w/2,w/2])s.ring(.06,.01,[x,h*.65,0],u===3?pale:wood).rotation.y=Math.PI/2;if(u===2)s.tube([[-w/2,h,0],[-w*.3,h+.35,0],[w*.3,h+.35,0],[w/2,h,0]],.012,green);
    if(e===0)s.lathe([[.04,0],[.06,.07],[.05,.07],[.03,.01]],pale,[w/2+.1,0,.1]);if(e===1)s.ball([.07,.09,.055],[w/2+.12,.09,.1],pale,12);if(e===2)for(let i=0;i<5;i++)s.ring(.009,.003,[w/2+.06+i*.025,.004,.1],s.material(colors[i])).rotation.x=Math.PI/2;if(e===3)s.label('RACE ENTRY',.2,.12,[w/2+.14,.004,.1]).rotation.x=-Math.PI/2;
    if(m<4)s.label(['HOMING CLUB','07','↑','A.G.'][m],w*.5,.07,[0,h+.015,0]).rotation.x=-Math.PI/2;if(a.closed)s.box([.012,h*.7,dep*.65],[-w/2-.01,h*.55,0],green);return s.finish();
  },
});
