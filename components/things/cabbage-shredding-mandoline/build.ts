import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What slicer is used?", {"board": "A broad single-blade wood board.", "triple": "A three-blade cabbage shredder.", "narrow": "A narrow kitchen slicer.", "box": "A slicer with a deep sliding carriage.", "long": "A long old-fashioned preserving board."}),
  state: choice("What is happening at the slicer?", {"ready": "A whole cabbage rests in the carriage.", "half": "A cut cabbage half waits at the blade.", "shreds": "A mound of shreds collects below.", "clean": "The board is clean and empty.", "stored": "The carriage is parked at the upper end."}),
  detail: choice("What timber is the frame?", {"pale": "Pale scrubbed hardwood.", "dark": "Dark seasoned wood.", "red": "Warm reddish timber.", "white": "Cream-painted side rails.", "green": "Muted green side rails."}),
  support: choice("How is the slicer supported?", {"ramp": "A short rear leg raises the board.", "flat": "It lies flat on the worktop.", "bowl": "Its lower end rests over a collecting bowl.", "trestle": "Two small trestles support the slope.", "tray": "A deep catch tray sits below the low end."}),
  extra: choice("What lies nearby?", {"cabbage": "A spare whole cabbage.", "knife": "A short vegetable knife.", "cloth": "A folded wiping cloth.", "salt": "A small salt scoop.", "none": "No extra tools."}),
  mark: choice("What is marked on the rails?", {"scale": "A simple slice-thickness scale.", "maker": "A KITCHEN 02 plate.", "grip": "Dark handgrip patches.", "pins": "Bright corner fasteners.", "plain": "Plain wood."}),
  extent: score("How broad is the slicer?", ["A small counter slicer", "A family cabbage shredder", "A broad communal slicer"]),
  load: score("How much cabbage has been shredded?", ["A few thin shreds", "A small mound", "A generous batch"]),
  closed: noul("Is the carriage fitted with a wooden hand guard?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const W=f===2?.2:.32+a.extent*.16,L=f===4?.95:.68,angle=u===1?0:.18,sy=u===1?.035:.05,mat=s.material(['#bea879','#80694a','#a47a55','#d0c8aa','#809576'][d]),board=new THREE.Group();for(const x of [-W/2,W/2])board.add(s.box([.035,.055,L],[x,0,0],mat));for(const z of [-L*.3,L*.3])board.add(s.box([W,.025,L*.36],[0,-.01,z],wood));for(let i=0;i<(f===1?3:1);i++){const blade=s.box([W,.006,.045],[0,.009,(i-(f===1?1:0))*.065],metal);blade.rotation.y=.22;board.add(blade);}const bz=t===4?-L*.32:t===1?.04:-L*.2;for(const x of [-W*.43,W*.43])board.add(s.box([.018,f===3?.15:.09,.22],[x,.07,bz],mat));for(const z of [-.11,.11])board.add(s.box([W*.86,.09,.018],[0,.07,bz+z],mat));if(a.closed)board.add(s.box([W*.9,.025,.13],[0,.14,bz],wood));if(t===0||t===1)board.add(s.ball([W*.35,t===1?W*.18:W*.32,W*.35],[0,.045+W*.25,bz],green,22));
    if(m===0)for(let i=0;i<8;i++)board.add(s.box([.02,.003,.004],[W/2,.031,-L*.4+i*.04],dark));if(m===1)board.add(s.label('KITCHEN 02',W*.7,.04,[0,.035,L*.4]).rotateX(-Math.PI/2));if(m===2)for(const x of [-W/2,W/2])board.add(s.box([.037,.004,.16],[x,.032,-L*.25],dark));if(m===3)for(const x of [-W/2,W/2])for(const z of [-L*.45,L*.45])board.add(s.ball([.008,.003,.008],[x,.031,z],metal,8));board.rotation.x=angle;board.position.y=sy+Math.sin(angle)*L/2;s.root.add(board);if(u!==1)for(const x of [-W*.4,W*.4])s.rod([x,0,-L*.4],[x,sy+Math.sin(angle)*L*.9,-L*.4],.018,wood);if(u===3)for(const x of [-W*.4,W*.4])s.rod([x,0,L*.3],[x,.08,L*.3],.018,wood);if(u===2||u===4)s.lathe([[0,0],[W*.6,.025],[W*.8,.13],[W*.75,.13],[0,.03]],u===2?pale:metal,[0,0,L*.65]);if(t===2)for(let i=0;i<12+Math.round(a.load*25);i++){const x=(random()-.5)*W,z=L*.64+(random()-.5)*.17;s.box([.008,.006,.07],[x,(u===2||u===4?.04:.006)+i*.0008,z],pale).rotation.y=random()*2;}
    const x=W*.9;if(e===0)s.ball([.1,.085,.1],[x,.085,0],green,20);if(e===1){s.box([.025,.003,.14],[x,.004,0],metal);s.rod([x,.009,.07],[x,.009,.16],.01,wood);}if(e===2)s.box([.15,.02,.12],[x,.01,0],pale);if(e===3){s.ball([.04,.012,.03],[x,.013,0],wood,14);s.rod([x,.013,.02],[x,.013,.1],.006,wood);}return s.finish();
  },
});
