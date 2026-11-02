import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("How many levels are there?", {"two": "Two broad singing tiers.", "three": "Three ascending tiers.", "one": "One low rehearsal platform.", "wide": "Two extra deep tiers.", "narrow": "Three compact narrow tiers."}),
  state: choice("How is the riser being used?", {"open": "Fully opened for rehearsal.", "fold": "An unused section stands on edge in a storage cradle.", "first": "A music folder marks the front tier.", "back": "A folder marks the back tier.", "empty": "All the treads are clear."}),
  detail: choice("What covers the treads?", {"wood": "Plain pale timber.", "grey": "Grey carpet strips.", "green": "Muted green carpet.", "dark": "Dark rubber matting.", "red": "A faded burgundy carpet."}),
  support: choice("How are the legs braced?", {"x": "Cross braces on each end.", "triangle": "Diagonal triangular braces.", "box": "Rectangular end frames.", "feet": "Wide stabilising feet.", "wheels": "Small locked transport wheels."}),
  extra: choice("What is beside the section?", {"step": "A small independent access step.", "case": "A narrow rail storage box.", "tape": "A rolled floor-marking tape.", "bag": "A soft score bag.", "none": "A clear access space."}),
  mark: choice("What marking identifies the tier?", {"dots": "Small standing position discs.", "numbers": "A numbered front apron.", "stripe": "A pale front-edge strip.", "ends": "Coloured end markers.", "plain": "Unmarked tread edges."}),
  extent: score("How wide is the section?", ["Two singers wide", "A small section", "A broad choir section"]),
  load: score("How high is each step?", ["Low shallow tiers", "Standard rehearsal tiers", "Tall ascending tiers"]),
  closed: noul("Is a rear safety rail fitted?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

 const W=1.2+a.extent*1.2,step=.16+a.load*.13,n=f===2?1:f===1||f===4?3:2,D=f===3?.6:f===4?.35:.43,mat=s.material(['#bea77e','#90938a','#74876c','#4b5755','#986867'][d]),g=new THREE.Group();for(let j=0;j<n;j++){const y=(j+1)*step,z=-j*D;g.add(s.box([W,.05,D],[0,y,z],mat));for(const x of [-W*.43,W*.43]){g.add(s.rod([x,0,z-D*.35],[x,y-.02,z-D*.35],.025,metal));g.add(s.rod([x,0,z+D*.35],[x,y-.02,z+D*.35],.025,metal));g.add(s.rod([x,y-.04,z-D*.42],[x,y-.04,z+D*.42],.02,metal));if(u===0||u===1)g.add(s.rod([x,.03,z-D*.35],[x,y-.04,z+D*.35],.013,metal));if(u===0)g.add(s.rod([x,.03,z+D*.35],[x,y-.04,z-D*.35],.013,metal));if(u===2)g.add(s.rod([x,.04,z-D*.35],[x,.04,z+D*.35],.02,metal));if(u===3)g.add(s.box([.12,.04,D+.14],[x,.02,z],metal));if(u===4)for(const dz of [-D*.35,D*.35])g.add(s.cylinder(.055,.055,.04,[x,.055,z+dz],dark,16).rotateZ(Math.PI/2));}if(m===0)for(let i=0;i<3;i++)g.add(s.cylinder(.045,.045,.004,[(i-1)*W*.3,y+.027,z],pale,16));if(m===1)g.add(s.label(String(j+1),.1,.06,[0,y-.01,z+D/2+.001]));if(m===2)g.add(s.box([W,.004,.035],[0,y+.027,z+D*.44],pale));if(m===3)for(const x of [-W*.45,W*.45])g.add(s.box([.08,.004,D*.8],[x,y+.027,z],green));if((t===2&&j===0)||(t===3&&j===n-1))g.add(s.box([.3,.025,.22],[0,y+.04,z],dark));}if(a.closed){const z=-(n-1)*D-D*.42;for(const x of [-W*.43,W*.43])g.add(s.rod([x,0,z],[x,n*step+.65,z],.02,metal));for(const y of [n*step+.35,n*step+.65])g.add(s.rod([-W*.43,y,z],[W*.43,y,z],.02,metal));}if(t===1){g.rotation.x=Math.PI/2;g.position.set(0,D/2+.035,0);for(const x of [-W*.42,W*.42]){s.box([.12,.05,.65],[x,.025,.1],wood);s.rod([x,.025,.28],[x,n*D+.2,.28],.025,wood);s.rod([x,.025,-.18],[x,n*D+.2,.28],.02,wood);}}s.root.add(g);const x=W*.65;if(e===0){s.box([.5,.045,.35],[x,.15,.25],wood);for(const dx of [-.18,.18])for(const z of [.13,.37])s.box([.04,.15,.04],[x+dx,.075,z],wood);}if(e===1)s.box([.25,.15,.8],[x,.075,0],wood);if(e===2)s.ring(.07,.02,[x,.025,.1],pale).rotation.x=Math.PI/2;if(e===3){s.box([.26,.24,.12],[x,.12,0],green);s.tube([[x-.08,.24,0],[x,.33,0],[x+.08,.24,0]],.01,dark);}return s.finish();
  },
});
