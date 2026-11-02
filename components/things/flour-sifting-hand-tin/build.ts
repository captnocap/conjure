import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("How does the sifter work?", {"squeeze": "A squeeze-handle tin with a rotary wire agitator.", "crank": "A side-cranked drum sifter.", "shake": "A shallow handled sieve for shaking flour.", "cup": "A plain perforated flour cup.", "bell": "A tall bell-shaped flour shaker."}),
  state: choice("What has just happened?", {"full": "The tin is full of loose flour.", "sifting": "A cone of sifted flour lies below.", "empty": "Only a little flour remains on the mesh.", "spill": "Flour is spilled beside the tin.", "stored": "The tin is capped and put away."}),
  detail: choice("What is the tin made from?", {"steel": "Brushed silver metal.", "enamel": "Cream enamel with a dark rim.", "copper": "Warm copper with silver mesh.", "blue": "Faded blue enamel.", "red": "Red enamel with pale scratches."}),
  support: choice("What is its handle like?", {"loop": "A broad curved loop handle.", "wood": "A short wooden grip on a bracket.", "double": "Two opposed wire handles.", "trigger": "A squeeze trigger inside the handle.", "long": "A long straight sieve handle."}),
  extra: choice("What lies beside it?", {"scoop": "A small flour scoop.", "bag": "A folded flour bag.", "spoon": "A wooden measuring spoon.", "brush": "A small cleaning brush.", "none": "No extra tool."}),
  mark: choice("What is marked on the side?", {"flour": "FLOUR in block letters.", "cups": "Three cup-measure lines.", "star": "A star-shaped stamped badge.", "bakery": "A FAMILY BAKERY plate.", "plain": "Plain metal."}),
  extent: score("How large is the flour tin?", ["A small cup", "A home baking tin", "A large batch sifter"]),
  load: score("How coarse is the bottom mesh?", ["A fine mesh", "An everyday mesh", "A coarse open mesh"]),
  closed: noul("Is a removable lid propped against the tin?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const r=.07+a.extent*.06,h=f===2?.055:f===4?.24:.17,mat=s.material(['#b2b9b5','#dfd8bf','#b8875d','#6e8f9e','#ad6553'][d],{metalness:d===0||d===2?.7:.25});
    s.lathe([[r*.95,0],[r,h],[r-.006,h],[r*.95-.006,.009]],mat,[0,.035,0]);for(const y of [.035,h+.035])s.ring(r,.004,[0,y,0],dark).rotation.x=Math.PI/2;
    const grid=7+Math.round((1-a.load)*8);for(let i=0;i<grid;i++){const x=(i/(grid-1)-.5)*r*1.8,len=Math.sqrt(r*r-x*x)*.9;s.rod([x,.04,-len],[x,.04,len],.0008,metal);s.rod([-len,.04,x],[len,.04,x],.0008,metal);}
    if(t===0)s.cylinder(r*.88,r*.88,h*.6,[0,.04+h*.3,0],pale,24);if(t===1||t===3)s.mesh(new THREE.ConeGeometry(r*.75,.045,24),pale,[t===3?r*1.6:0,.023,t===3?.08:0]);
    if(f===0||f===1){s.rod([-r*.85,.05,0],[r*.85,.05,0],.003,metal);if(f===1)s.tube([[r,.07,0],[r+.055,.07,0],[r+.055,.12,0],[r+.09,.12,0]],.005,metal);}
    if(f===4){s.lathe([[r,h+.035],[r*.3,h+.13],[0,h+.13]],mat);for(let i=0;i<6;i++)s.ball([.003,.001,.003],[Math.cos(i)*r*.2,h+.168,Math.sin(i)*r*.2],dark,6);}
    if(u===0||u===3)s.tube([[r,.16,0],[r+.07,.17,0],[r+.09,.09,0],[r,.07,0]],.008,mat);if(u===3)s.rod([r+.02,.085,0],[r+.05,.14,0],.005,metal);if(u===1||u===4)s.rod([r,.08,0],[r+(u===4?.24:.1),.08,0],u===1?.015:.008,u===1?wood:metal);if(u===2)for(const sign of [-1,1])s.ring(.04,.005,[sign*(r+.025),.1,0],metal);
    if(e===0){s.ball([.04,.016,.025],[r+.1,.017,.1],metal,12);s.rod([r+.1,.02,.1],[r+.2,.02,.1],.006,wood);}if(e===1)s.box([.1,.12,.055],[-r-.08,.06,0],pale);if(e===2){s.ball([.025,.008,.018],[r+.06,.009,.12],wood,12);s.rod([r+.06,.01,.12],[r+.18,.01,.12],.006,wood);}if(e===3){s.box([.06,.018,.025],[r+.09,.03,.12],wood);for(let i=0;i<7;i++)s.rod([r+.06+i*.01,.025,.12],[r+.06+i*.01,.003,.12],.003,pale);}
    if(m===0||m===3)s.label(m===0?'FLOUR':'FAMILY BAKERY',r*1.5,.035,[0,.12,r+.002]);if(m===1)for(let i=0;i<3;i++)s.box([.04,.003,.002],[0,.07+i*.03,r+.003],dark);if(m===2)s.mesh(new THREE.CircleGeometry(.018,5),pale,[0,.12,r+.003]);
    if(a.closed||t===4){const lid=s.cylinder(r+.006,r+.006,.008,[t===4?0:-r*1.7,t===4?h+.042:r*.9,0],mat,24);if(t!==4)lid.rotation.z=.95;}return s.finish();
  },
});
