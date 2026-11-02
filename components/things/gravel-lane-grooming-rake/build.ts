import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What is the rake head?", {"wood": "A wide wooden crosshead with tapered teeth.", "steel": "A steel landscape rake with a curved comb.", "drag": "A broad flat drag board on two ropes.", "brush": "A stiff bristle court broom.", "double": "A two-sided head with teeth and a smoothing edge."}),
  state: choice("How has it been left?", {"upright": "Standing in a small storage rest.", "leaning": "Leaning against a low court rail.", "flat": "Laid flat on the ground.", "working": "Angled down with its teeth resting on the gravel.", "hung": "Hung from a peg on a short post."}),
  detail: choice("What sort of handle is fitted?", {"straight": "A straight ash handle.", "fork": "A forked handle near the head.", "grip": "A D-shaped hand grip.", "wrapped": "A cord-wrapped grip.", "joint": "A metal joint halfway along the shaft."}),
  support: choice("What supports or accompanies the head?", {"rail": "A low timber rail.", "bucket": "A small groundskeeping bucket.", "hook": "A freestanding storage hook.", "blocks": "Two short resting blocks.", "none": "No separate support."}),
  extra: choice("What is caught in the teeth?", {"clear": "Nothing; the comb is clean.", "leaves": "A few dry leaves.", "grass": "A tuft of grass.", "gravel": "Small pale stones.", "cord": "A loose piece of marker cord."}),
  mark: choice("How is the club rake identified?", {"red": "A red band on the handle.", "green": "A green band on the handle.", "number": "COURT 1 on the crosshead.", "repair": "A metal repair strap.", "plain": "Unmarked timber."}),
  extent: score("How broad is the rake?", ["A small personal rake", "A full lane rake", "A wide public-court rake"]),
  load: score("How dense is the comb?", ["A few broad teeth", "An even comb", "Closely packed teeth"]),
  closed: noul("Is a protective comb guard fitted over the teeth?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const w=.55+a.extent*.65,L=1.45,mat=f===1?metal:wood,head=new THREE.Group();
    head.add(s.box([w,.055,.06],[0,.04,0],mat));const n=8+Math.round(a.load*14);for(let i=0;i<n;i++)head.add(s.rod([-w/2+i*w/(n-1),.03,0],[-w/2+i*w/(n-1),-.08,.025],f===3?.008:.006,f===3?pale:mat));
    if(f===4)head.add(s.box([w,.025,.07],[0,.07,-.025],wood));
    const shaft=s.rod([0,.05,0],[0,L,.07],.018,wood);head.add(shaft);
    if(d===1)for(const x of [-w*.28,w*.28])head.add(s.rod([x,.05,0],[0,.4,.02],.012,metal));
    if(d===2&&f!==2)head.add(s.ring(.085,.012,[0,L,.07],wood));if(d===3&&f!==2)for(let i=0;i<9;i++)head.add(s.ring(.023,.004,[0,L-.05-i*.025,.07],pale));if(d===4&&f!==2)head.add(s.cylinder(.025,.025,.16,[0,.75,.035],metal,12));
    if(f===2){shaft.visible=false;for(const x of [-w*.35,w*.35])head.add(s.tube([[x,.06,0],[x*.6,.5,.1],[0,L,.1]],.006,pale));}
    if(m<2&&f!==2)head.add(s.cylinder(.022,.022,.15,[0,L-.2,.06],s.material(m===0?'#a55442':'#54785b'),12));if(m===2)head.add(s.label('COURT 1',w*.6,.05,[0,.05,.04]));if(m===3)head.add(s.box([.2,.07,.012],[0,.045,.04],metal));
    if(a.closed)head.add(s.box([w+.04,.08,.1],[0,-.07,.02],green));
    if(e>0)for(let i=0;i<5;i++){const x=(random()-.5)*w*.65;if(e===1)head.add(s.ball([.025,.004,.04],[x,-.05,.035],s.material('#b5934d'),8));if(e===2)head.add(s.rod([x,-.07,.02],[x+.025,.04,.06],.003,green));if(e===3)head.add(s.ball([.014,.012,.014],[x,-.06,.02],pale,8));}if(e===4)head.add(s.tube([[-w*.2,-.03,0],[0,-.12,.03],[w*.2,-.02,.04]],.004,pale));
    head.rotation.x=t===2?-Math.PI/2:t===3?-.7:t===1?-.28:0;head.position.y=t===4?.32:t===2?.03:.1;s.root.add(head);
    if(u===0||t===1){s.box([w+.15,.06,.12],[0,.38,-.15],wood);for(const x of [-w*.45,w*.45])s.box([.06,.38,.06],[x,.19,-.15],wood);}if(u===1)s.lathe([[.1,0],[.14,.22],[.13,.22],[.09,.02]],metal,[w/2+.2,0,0]);if(u===2||t===4){s.box([.25,.04,.3],[.2,.02,-.1],wood);s.rod([.2,.02,-.1],[.2,1.5,-.1],.025,wood);s.rod([.2,1.5,-.1],[0,1.5,.04],.012,metal);}if(u===3)for(const x of [-w*.3,w*.3])s.box([.12,.1,.16],[x,.05,0],wood);
    return s.finish();
  },
});
