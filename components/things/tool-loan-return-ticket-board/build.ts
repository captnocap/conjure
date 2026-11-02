import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("How are the tickets displayed?", {"clips": "Two rows of metal clips.", "pockets": "Three open document pockets.", "grid": "A grid of small numbered ticket holders.", "rail": "Four horizontal ticket rails.", "hinged": "Two hinged ticket panels."}),
  state: choice("What is the board recording?", {"today": "Several loans are due back today.", "empty": "The board has been cleared after returns.", "busy": "Most positions hold active loan cards.", "overdue": "A red overdue card stands out.", "repair": "One column is reserved for repairs."}),
  detail: choice("What backs the tickets?", {"wood": "Natural timber board.", "green": "Dark green board.", "cream": "Pale painted wood.", "cork": "A warm cork board.", "blue": "Faded blue painted timber."}),
  support: choice("How does it stand?", {"feet": "Two long transverse feet.", "a": "A folding A frame.", "plinth": "A wide low base plinth.", "counter": "A low desktop stand.", "storage": "A small cabinet beneath."}),
  extra: choice("What is kept on the lower shelf?", {"pencil": "A pencil and eraser.", "stamp": "A return stamp.", "cards": "A stack of blank loan cards.", "clock": "A small round clock.", "none": "An empty shelf."}),
  mark: choice("What header is shown?", {"returns": "RETURNS TODAY.", "loans": "CURRENT LOANS.", "share": "SHARE REPAIR RETURN.", "week": "THIS WEEK.", "plain": "No large header."}),
  extent: score("How broad is the ticket board?", ["A compact volunteer board", "A weekly loans board", "A large busy library board"]),
  load: score("How many active tickets are displayed?", ["A few loans", "Half the board", "A full busy board"]),
  closed: noul("Is a small chain attached to the shared pencil?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const W=.7+a.extent*.5,H=.8,base=u===3?.12:.5,mat=s.material(['#ae9164','#637d65','#d0cbb6','#b49b75','#6c8998'][d]);s.box([W,H,.025],[0,base+H/2,0],mat);for(const x of [-W*.43,W*.43]){s.rod([x,0,0],[x,base+H,0],.02,wood);s.box([.08,.035,.45],[x,.018,0],wood);if(u===1)s.rod([x,.02,-.2],[x,base+H*.8,0],.018,wood);}if(u===2)s.box([W+.1,.05,.4],[0,.025,0],wood);if(u===4){s.box([W,.35,.35],[0,.175,0],wood);for(const x of [-W*.25,W*.25])s.ball([.015,.015,.015],[x,.2,.18],metal,10);}s.box([W,.035,.18],[0,base-.018,.06],wood);if(m!==4)s.label(['RETURNS TODAY','CURRENT LOANS','SHARE REPAIR RETURN','THIS WEEK'][m],W*.85,.1,[0,base+H-.09,.015]);if(f===4)s.box([.025,H,.025],[0,base+H/2,.025],metal);const cols=f===2?4:3,rows=f===3?4:2,total=cols*rows;for(let i=0;i<total;i++){const x=(i%cols-(cols-1)/2)*W*(cols===4?.23:.27),y=base+.14+Math.floor(i/cols)*(f===3?.16:.23),present=t!==1&&(t===2||i<1+Math.round(a.load*(total-1)));if(f===1||f===3){s.box([W*.25,.08,.025],[x,y-.015,.065],wood);s.box([W*.25,.015,.07],[x,y-.055,.035],wood);}else{s.box([.025,.035,.018],[x,y+.09,.028],metal);if(f===2)s.box([W*.25,.17,.012],[x,y+.01,.02],wood);}if(present){s.box([W*.22,.15,.003],[x,y+.018,.04],t===3&&i===0||t===4&&i%cols===0?s.material('#bd7760'):pale);s.label(t===4&&i%cols===0?'REPAIR':'LOAN '+(10+i),W*.19,.045,[x,y+.04,.043]);for(let j=0;j<2;j++)s.box([W*.14,.003,.001],[x,y-.005-j*.025,.044],wood);}}
    const y=base+.006;if(e===0){s.rod([-.2,y,.08],[.05,y,.08],.004,wood);s.box([.04,.012,.025],[.15,y,.08],pale);}if(e===1){s.box([.08,.035,.05],[0,y+.017,.08],dark);s.rod([0,y+.035,.08],[0,y+.09,.08],.015,wood);}if(e===2)s.box([.19,.025,.12],[0,y+.012,.08],pale);if(e===3){s.cylinder(.06,.06,.025,[0,y+.06,.08],wood,24).rotation.x=Math.PI/2;s.label('12',.06,.04,[0,y+.075,.095]);s.rod([0,y+.06,.096],[0,y+.095,.096],.002,dark);}if(a.closed)s.tube([[-W*.4,base+.03,.02],[-W*.3,base-.13,.05],[-.2,y,.08]],.002,metal);return s.finish();
  },
});
