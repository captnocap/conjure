import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What rolling pin is used?", {"tapered": "A slim tapered wooden pin.", "dowel": "A plain straight wooden dowel.", "handles": "A short handled rolling pin.", "marble": "A pale stone roller with wood handles.", "ridged": "A patterned roller for textured wrappers."}),
  state: choice("What stage has the dough reached?", {"ball": "A single resting dough ball.", "rope": "A long dough rope being divided.", "pieces": "Several cut portions wait to be rolled.", "wrappers": "A fan of thin round wrappers.", "scraps": "A few finished wrappers and a pile of trimmings."}),
  detail: choice("What is the work board?", {"round": "A round pale wood board.", "rectangle": "A rectangular butcher block.", "rim": "A rectangular board with a flour-catching lip.", "stone": "A broad pale stone slab.", "bamboo": "A narrow striped bamboo board."}),
  support: choice("How is the pin resting?", {"flat": "Across the back of the board.", "diagonal": "Diagonally over the board.", "cradle": "In two small wooden rests.", "edge": "Along the front edge.", "side": "Beside the board on the table."}),
  extra: choice("What tool is within reach?", {"scraper": "A metal dough scraper.", "knife": "A short portioning knife.", "brush": "A soft flour brush.", "bowl": "A small water bowl.", "none": "Only the rolling pin."}),
  mark: choice("What is marked on the board?", {"rings": "Concentric wrapper-sizing circles.", "grid": "A fine measuring grid.", "name": "A FAMILY KITCHEN corner mark.", "handle": "A cutout carrying handle.", "plain": "Unmarked grain."}),
  extent: score("How large is the board?", ["One small rolling spot", "An ample home board", "A shared work board"]),
  load: score("How much dough is prepared?", ["A small batch", "Enough for a family", "A large communal batch"]),
  closed: noul("Does a damp cloth cover the resting dough?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const w=.4+a.extent*.3,z=.38,board=d===3?pale:wood,dough=s.material('#ded0ab');if(d===0)s.cylinder(w*.52,w*.52,.025,[0,.013,0],board,36);else s.box([w,.03,z],[0,.015,0],board);if(d===2)for(const x of [-w/2,w/2])s.box([.015,.04,z],[x,.04,0],wood);if(d===4)for(let i=0;i<9;i++)s.box([w/18,.002,z],[w*(i/9-.44),.031,0],pale);
    if(m===0)for(let i=1;i<=3;i++)s.ring(.035+i*.024,.0015,[0,.033,0],dark).rotation.x=Math.PI/2;if(m===1)for(let i=-3;i<=3;i++){s.box([w*.8,.002,.002],[0,.032,i*.035],dark);s.box([.002,.002,z*.8],[i*.05,.032,0],dark);}if(m===2)s.label('FAMILY KITCHEN',w*.35,.035,[-w*.25,.033,-z*.35]).rotation.x=-Math.PI/2;if(m===3)s.ring(.035,.012,[w*.41,.03,0],dark).rotation.x=Math.PI/2;
    const n=3+Math.round(a.load*6);if(t===0)s.ball([.08,.06,.08],[0,.085,0],dough,20);if(t===1){s.rod([-w*.3,.06,0],[w*.3,.06,0],.025,dough);for(let i=0;i<n;i++)s.box([.003,.03,.05],[-w*.3+i*w*.6/n,.072,0],pale);}if(t===2)for(let i=0;i<n;i++)s.ball([.025,.02,.025],[(i%4-1.5)*.065,.052,(Math.floor(i/4)-.5)*.07],dough,12);if(t>=3)for(let i=0;i<n;i++)s.cylinder(.05,.05,.003,[(i%4-1.5)*.075,.034+Math.floor(i/4)*.004,(Math.floor(i/4)-.5)*.075],dough,28);if(t===4)s.tube([[.12,.04,.1],[.08,.04,.12],[.15,.04,.14],[.12,.04,.07]],.007,dough);
    const pin=new THREE.Group(),L=w*.7;const roller=s.cylinder(f===0?.012:.025,f===0?.021:.025,L,[0,0,0],f===3?pale:wood,20);roller.rotation.z=Math.PI/2;pin.add(roller);if(f===2||f===3)for(const side of [-1,1])pin.add(s.rod([side*L/2,0,0],[side*(L/2+.07),0,0],.012,wood));if(f===4)for(let i=0;i<12;i++){const rr=s.ring(.026,.003,[(i/11-.5)*L,0,0],pale);rr.rotation.y=Math.PI/2;pin.add(rr);}pin.position.set(u===4?w*.7:0,u===4?.025:u===2?.09:.06,u===3?z*.42:-z*.28);pin.rotation.y=u===1?.6:0;s.root.add(pin);if(u===2)for(const x of [-L*.35,L*.35])s.box([.04,.05,.08],[x,.055,-z*.28],wood);
    if(e===0){s.box([.11,.002,.08],[w*.3,.035,.1],metal);s.rod([w*.3-.055,.046,.06],[w*.3+.055,.046,.06],.012,wood);}if(e===1){s.box([.09,.003,.025],[w*.33,.037,.08],metal);s.rod([w*.33-.1,.045,.08],[w*.33-.045,.045,.08],.012,wood);}if(e===2){s.rod([w*.3,.045,.04],[w*.3,.045,.12],.012,wood);for(let i=0;i<7;i++)s.rod([w*.3+(i-3)*.005,.04,.12],[w*.3+(i-3)*.005,.035,.16],.002,pale);}if(e===3)s.lathe([[.04,0],[.055,.045],[.05,.045],[.035,.008]],pale,[w/2+.07,0,0]);
    for(let i=0;i<10+Math.round(mood.density*12);i++)s.ball([.006,.001,.005],[(random()-.5)*w*.85,.034,(random()-.5)*z*.8],pale,6);
    if(a.closed)s.drape({size:[.22,.18],at:[-.06,.17,0],over:[{ball:.08,at:[-.06,.085,0]}],floor:.034,detail:12,rumple:.25},pale);return s.finish();
  },
});
