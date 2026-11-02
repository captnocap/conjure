import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("How is the sorting surface built?", {"slats": "Spaced timber slats over a trestle.", "mesh": "A wire mesh sorting screen.", "slope": "A gently sloping roller table.", "bins": "Three divided grading compartments.", "fold": "A folding market-style sorting hurdle."}),
  state: choice("What is being sorted?", {"fresh": "A fresh mixed harvest.", "grading": "Three neat groups of different sizes.", "rejects": "Bruised fruit collected at one end.", "nearly": "Only a few final apples remain.", "empty": "An empty washed table with one stray leaf."}),
  detail: choice("What is the main apple variety?", {"red": "Red-blushed apples.", "green": "Bright cooking apples.", "yellow": "Golden dessert apples.", "russet": "Small russet cider fruit.", "mixed": "A multicoloured orchard mix."}),
  support: choice("What carries the table?", {"trestle": "Two folding timber trestles.", "legs": "Four straight wooden legs.", "wheels": "Four small cart wheels.", "crates": "Two large fruit crates.", "low": "A low frame for seated sorting."}),
  extra: choice("What catches rejected fruit?", {"basket": "A wicker sorting basket.", "bucket": "A metal bucket.", "crate": "A shallow wooden reject crate.", "sack": "A soft open jute sack.", "none": "No reject container."}),
  mark: choice("What are the grading labels?", {"size": "SMALL, MEDIUM, LARGE.", "use": "EAT, PRESS, COMPOST.", "colour": "RED, GREEN, GOLD.", "chalk": "Blank black chalk panels.", "none": "No labels."}),
  extent: score("How long is the sorting table?", ["A family table", "A long harvest table", "A communal sorting bench"]),
  load: score("How much fruit covers it?", ["A thin scattering", "A half-full table", "A plentiful harvest"]),
  closed: noul("Does a canvas shade cloth cover the far end?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const w=1+a.extent*.8,h=u===4?.4:.8,depth=.6,top=new THREE.Group();for(let i=0;i<12;i++){const z=-depth/2+i*depth/11;if(f===1)top.add(s.rod([-w/2,0,z],[w/2,0,z],.003,metal));else top.add(s.box([w,.025,.035],[0,0,z],wood));}if(f===1)for(let i=0;i<20;i++)top.add(s.rod([-w/2+i*w/19,0,-depth/2],[-w/2+i*w/19,0,depth/2],.003,metal));for(const z of [-depth/2,depth/2])top.add(s.box([w,.1,.025],[0,.04,z],wood));for(const x of [-w/2,w/2])top.add(s.box([.025,.1,depth],[x,.04,0],wood));if(f===3)for(const x of [-w/6,w/6])top.add(s.box([.02,.12,depth],[x,.05,0],wood));top.position.y=h;top.rotation.z=f===2?-.08:0;s.root.add(top);
    for(const x of [-w*.38,w*.38]){if(u===3)s.box([.3,h-.025,.45],[x,(h-.025)/2,0],wood);else for(const sign of [-1,1])s.rod([x,0,sign*depth*.55],[x,h,sign*(u===0?-.18:.22)],.027,wood);if(u===2)for(const z of [-.25,.25])s.cylinder(.065,.065,.03,[x,.065,z],dark,12).rotation.z=Math.PI/2;}
    const n=t===4?0:t===3?3:9+Math.round(a.load*27);for(let i=0;i<n;i++){const x=(random()-.5)*w*.88,z=(random()-.5)*depth*.75,r=t===1?.03+(Math.floor((x/w+.5)*3))*.012:.04,mat=s.material(['#ad5840','#859c4b','#c6ab54','#a38853'][d===4?i%4:d]);const apple=s.ball([r,r*.95,r],[x,.025+r,z],mat,12);top.add(apple);top.add(s.rod([x,.025+r*1.8,z],[x,.025+r*2.15,z],.0025,wood));if(t===2&&x>w*.25)top.add(s.ball([r*.4,.003,r*.4],[x,.025+r*1.9,z],dark,8));}
    if(e<4){const x=w/2+.28,mat=e===1?metal:wood;if(e===0||e===1||e===3)s.lathe([[.16,0],[.22,.27],[.205,.27],[.145,.02]],mat,[x,0,0]);else{s.box([.42,.025,.38],[x,.013,0],wood);for(const z of [-.19,.19])s.box([.42,.18,.025],[x,.1,z],wood);}if(t===2)for(let i=0;i<5;i++)s.ball([.04,.035,.04],[x+(random()-.5)*.22,.15,(random()-.5)*.2],s.material('#8e7950'),10);}
    if(m<4)for(let i=0;i<3;i++)top.add(s.label([['SMALL','MEDIUM','LARGE'],['EAT','PRESS','COMPOST'],['RED','GREEN','GOLD'],['','','']][m][i],w*.25,.07,[(i-1)*w*.32,.04,depth/2+.015]));
    if(a.closed){for(const x of [-w/2,0])s.rod([x,h,-depth/2],[x,h+.4,-depth/2],.015,wood);s.drape({size:[w*.55,depth],at:[-w*.25,h+.4,0],hang:'back-edge',floor:h,detail:12},pale);}return s.finish();
  },
});
