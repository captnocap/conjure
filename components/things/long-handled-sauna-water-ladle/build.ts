import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What shape is the scoop?", {"round": "A deep round wooden ladle.", "oval": "An elongated oval scoop.", "metal": "A small metal cup on a wooden handle.", "flat": "A broad shallow wooden scoop.", "bent": "A metal cup with a bent handle."}),
  state: choice("How is the ladle left?", {"rim": "Resting across a filled water pail.", "inside": "Standing inside the pail.", "board": "Lying on a slatted board.", "pour": "Tipped over the pail on a supporting rest.", "empty": "Resting beside an empty pail."}),
  detail: choice("What is the handle finish?", {"birch": "Pale birch.", "cedar": "Warm cedar.", "dark": "Dark aged wood.", "green": "A green-painted grip.", "wrap": "A dark cord-wrapped grip."}),
  support: choice("What is the water pail made from?", {"staves": "Light wood staves with metal hoops.", "dark": "Dark coopered wood.", "copper": "Warm copper-coloured metal.", "steel": "Grey metal.", "enamel": "Cream enamel."}),
  extra: choice("What is next to the pail?", {"cloth": "A folded small towel.", "cup": "A small wooden drinking cup.", "leaves": "A few bathing-whisk leaves.", "brush": "A small wood brush.", "none": "Only the water tools."}),
  mark: choice("What marks the pail?", {"bands": "Two broad metal hoops.", "water": "A WATER label.", "litres": "Three volume ticks.", "grain": "Visible dark stave seams.", "plain": "A plain pail body."}),
  extent: score("How long is the ladle handle?", ["A short bench scoop", "A comfortable pouring handle", "A long reach to the stones"]),
  load: score("How much water is in the pail?", ["Nearly empty", "Half full", "Close to the rim"]),
  closed: noul("Does a curved handle span the pail?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const r=.13,h=.23,L=.35+a.extent*.35,mat=s.material(['#cab98e','#b18e63','#72634f','#6f8763','#7d7156'][d]),pailMat=s.material(['#b8a174','#77654d','#ac7d5e','#9ba79a','#d4cbb2'][u]);s.lathe([[r*.8,0],[r,h],[r-.012,h],[r*.74,.02]],pailMat,[0,0,0]);if(t!==4)s.cylinder(r-.018,r-.018,.004,[0,.035+a.load*.17,0],s.material('#91a99e'),28);if(m===0)for(const y of [.055,.19])s.ring(r*.85+y*.12,.009,[0,y,0],metal).rotation.x=Math.PI/2;if(m===1)s.label('WATER',.12,.045,[0,.12,r]);if(m===2)for(let i=0;i<3;i++)s.box([.035,.004,.002],[0,.07+i*.045,r],dark);if(m===3)for(let i=0;i<14;i++){const ang=i*Math.PI/7;s.rod([Math.cos(ang)*r*.81,.01,Math.sin(ang)*r*.81],[Math.cos(ang)*r,h,Math.sin(ang)*r],.002,dark);}if(a.closed)s.tube([[-r,.17,0],[-r,.36,0],[r,.36,0],[r,.17,0]],.008,metal);
    const g=new THREE.Group(),cupMat=f===2||f===4?metal:mat,cr=f===3?.085:.06,ch=f===3?.035:.07;g.add(s.lathe([[0,0],[cr*.8,.008],[cr,ch],[cr-.01,ch],[0,.012]],cupMat));if(f===1)g.children[0].scale.z=1.5;if(f===4)g.add(s.tube([[0,ch*.7,cr],[0,ch+.07,cr+.04],[0,ch+.07,L]],.012,mat));else g.add(s.rod([0,ch*.6,cr*.7],[0,ch*.6,L],.012,mat));if(d===4)for(let i=0;i<8;i++)g.add(s.ring(.015,.003,[0,ch*.6,L-.02-i*.012],dark));if(t===0){g.position.set(0,h-ch*.6+.01,-r*.8);}if(t===1){g.rotation.x=-.9;g.position.set(0,.03,-.06);}if(t===2||t===4){g.position.set(.3,.03,-.15);for(let i=0;i<4;i++)s.box([.22,.025,.13],[.3,.013,-.15+i*.13],wood);}if(t===3){g.rotation.x=-.35;g.position.set(0,h+.04,-.08);s.rod([0,0,.28],[0,h+.2,.28],.01,wood);s.rod([-.04,h+.2,.28],[.04,h+.2,.28],.01,wood);}s.root.add(g);if(e===0)s.box([.2,.025,.18],[-.3,.013,0],pale);if(e===1)s.lathe([[.04,0],[.06,.08],[.05,.08],[.03,.01]],wood,[-.3,0,0]);if(e===2)for(let i=0;i<3;i++)s.ball([.025,.003,.04],[-.3+i*.04,.003,.03*i],green,10);if(e===3){s.box([.13,.025,.06],[-.3,.045,0],wood);s.box([.13,.03,.06],[-.3,.015,0],pale);}return s.finish();
  },
});
