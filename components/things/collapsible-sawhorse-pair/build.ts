import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("Which trestle construction is used?", {"timber": "Traditional timber A-frame trestles.", "metal": "Square steel folding trestles.", "plastic": "Broad moulded workshop trestles.", "narrow": "Slender painters’ trestles.", "heavy": "Heavy timber builders’ trestles."}),
  state: choice("How are they being used?", {"open": "Both trestles are open and ready.", "planks": "Two planks make a temporary bench.", "folded": "One trestle is folded for carrying.", "stored": "Both are folded and leaned together.", "cut": "A board lies across the pair for cutting."}),
  detail: choice("What colour identifies the set?", {"wood": "Natural timber.", "green": "Green painted rails.", "orange": "Safety orange rails.", "blue": "Blue painted rails.", "grey": "Grey metal rails."}),
  support: choice("How are the feet protected?", {"plain": "Plain square feet.", "rubber": "Dark rubber foot caps.", "pads": "Wide timber pads.", "shoes": "Small metal foot shoes.", "cross": "A transverse lower foot rail."}),
  extra: choice("What accompanies the loan?", {"clamp": "A small clamp on a rail.", "level": "A spirit level on the top rail.", "saw": "A handsaw rests on the bench.", "strap": "A carrying strap around one trestle.", "none": "Only the trestles."}),
  mark: choice("What identification is visible?", {"numbers": "Matching loan numbers.", "stripe": "A pale band on each top rail.", "dots": "A red identity dot.", "label": "RETURN TO LIBRARY labels.", "plain": "No markings."}),
  extent: score("How tall are the trestles?", ["Low working trestles", "Standard waist height", "Tall work supports"]),
  load: score("How far apart are the two stands?", ["Close together", "A useful work span", "Widely separated"]),
  closed: noul("Are diagonal braces fitted across the legs?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const H=.55+a.extent*.3,W=f===3?.55:.8,span=.7+a.load*.8,mat=f===1?metal:s.material(d===0?'#b59769':['','#6a875e','#b67e4f','#668496','#8a9993'][d]);for(let i=0;i<2;i++){const z=(i-.5)*span,folded=t===3||t===2&&i===1,spread=folded?.045:.25,th=f===4?.065:f===2?.07:.04;s.box([W,.08,.1],[0,H,z],mat);for(const x of [-W*.4,W*.4])for(const q of [-1,1]){s.rod([x,0,z+q*spread],[x,H,z+q*.025],th,mat);if(u===1)s.box([th*2,.06,.1],[x,.03,z+q*spread],dark);if(u===2)s.box([.18,.025,.2],[x,.013,z+q*spread],wood);if(u===3)s.box([.09,.035,.12],[x,.018,z+q*spread],metal);}if(u===4)for(const q of [-1,1])s.rod([-W*.4,.07,z+q*spread],[W*.4,.07,z+q*spread],.025,wood);if(a.closed)for(const q of [-1,1])s.rod([-W*.4,.15,z+q*spread*.8],[W*.4,H*.85,z+q*spread*.15],.012,metal);if(!folded)for(const x of [-W*.4,W*.4])s.rod([x,H*.4,z-spread*.6],[x,H*.4,z+spread*.6],.012,metal);if(m===0||m===3)s.label(m===0?'TL 24':'RETURN TO LIBRARY',W*.7,.055,[0,H,z+.052]);if(m===1)s.box([.12,.004,.11],[0,H+.043,z],pale);if(m===2)s.ball([.022,.022,.001],[0,H,z+.052],s.material('#aa654e'),10);}
    if(t===1||t===4)for(let i=0;i<(t===1?2:1);i++)s.box([t===1?.28:.55,.045,span+.4],[(i-(t===1?.5:0))*.31,H+.063,0],wood);if(e===0){s.rod([W*.25,H+.1,-span/2],[W*.25,H-.12,-span/2],.009,metal);s.box([.12,.025,.045],[W*.2,H+.1,-span/2],metal);s.box([.12,.025,.045],[W*.2,H-.12,-span/2],metal);}if(e===1){s.box([.43,.035,.04],[0,H+.058,-span/2],green);s.box([.06,.005,.025],[0,H+.078,-span/2],pale);}if(e===2){const yy=t===1||t===4?H+.09:H+.045;s.box([.25,.008,.1],[0,yy,-span/2],metal);s.ring(.05,.012,[.16,yy,-span/2],wood).rotation.x=Math.PI/2;}if(e===3)s.tube([[-.1,H+.05,-span/2],[.1,H+.05,-span/2],[.1,H-.13,-span/2],[-.1,H-.13,-span/2],[-.1,H+.05,-span/2]],.008,green);return s.finish();
  },
});
