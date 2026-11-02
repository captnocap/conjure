import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What is the flight board shaped like?", {"paddle": "A long paddle with a narrow handle.", "round": "A round tasting board.", "arc": "A curved crescent board.", "plank": "A straight rectangular tasting plank.", "tray": "A shallow handled tray."}),
  state: choice("What stage is the tasting at?", {"ready": "Every glass is freshly filled.", "sampled": "One glass is half empty.", "finished": "Only the last glass still holds cider.", "spilled": "A small amber spill marks the board.", "rinsed": "Empty glasses are left to dry."}),
  detail: choice("What tasting glasses are used?", {"tumblers": "Small straight tumblers.", "stems": "Short-stemmed tasting goblets.", "cups": "Small ceramic cups.", "jars": "Tiny handled jam jars.", "flutes": "Narrow miniature flutes."}),
  support: choice("How are the glasses arranged?", {"line": "A straight row.", "circle": "A ring around the board.", "pairs": "Two rows of paired glasses.", "stagger": "A gently staggered line.", "steps": "Glasses on short rising blocks."}),
  extra: choice("What is offered alongside?", {"apple": "Fresh apple slices.", "cheese": "Three small cheese wedges.", "bread": "Pieces of rough bread.", "water": "A small water carafe.", "none": "Only the cider."}),
  mark: choice("How are the samples named?", {"trees": "OLD TREE, MEADOW, RUSSET.", "dry": "DRY, MEDIUM, SWEET.", "numbers": "Numbered tasting places.", "chalk": "Blank chalkboard strips.", "plain": "No labels."}),
  extent: score("How long is the tasting board?", ["A personal flight", "A generous tasting board", "A shared orchard flight"]),
  load: score("How many ciders are being compared?", ["Three samples", "Four samples", "Six samples"]),
  closed: noul("Is a tasting notes card tucked under the handle?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const w=.45+a.extent*.45,n=3+Math.round(a.load*3),depth=f===1||u===1?w:.22; if(f===1)s.cylinder(w/2,w/2,.025,[0,.013,0],wood,36);else s.box([w,.025,depth],[0,.013,0],wood);if(f===0)s.box([.24,.025,.09],[w/2+.08,.013,0],wood);if(f===2)s.ring(w*.45,.055,[0,.013,0],wood,Math.PI).rotation.x=Math.PI/2;if(f===4)for(const z of [-.12,.12])s.box([w,.035,.015],[0,.035,z],wood);
    const glass=s.material('#d1ddd0',{transparent:true,opacity:.45,depthWrite:false,roughness:.15});for(let i=0;i<n;i++){const ang=i*Math.PI*2/n,x=u===1?Math.cos(ang)*w*.3:u===2?(i%3-1)*w*.27:(i/(n-1)-.5)*w*.82,z=u===1?Math.sin(ang)*w*.3:u===2?(Math.floor(i/3)-.5)*.13:u===3?(i%2-.5)*.07:0,base=.025+(u===4?i*.025:0),r=.035,h=d===4?.15:.09;if(u===4)s.box([.09,i*.025+.005,.1],[x,.025+i*.0125,z],wood);
      if(d===1||d===4){s.cylinder(.03,.03,.006,[x,base+.003,z],glass,16);s.rod([x,base+.005,z],[x,base+.045,z],.004,glass);s.lathe([[.01,0],[r,h*.3],[r*.9,h],[r*.82,h],[.005,.01]],glass,[x,base+.045,z]);}else{s.lathe([[r*.8,0],[r,h],[r-.004,h],[r*.7,.008]],d===2?pale:glass,[x,base,z]);if(d===3)s.ring(.023,.004,[x+r,base+.05,z],glass).rotation.y=Math.PI/2;}
      const fill=t===2?(i===n-1?.06:0):t===1&&i===0?.03:t===4?0:.065;if(fill>0)s.cylinder(r*.75,r*.75,fill,[x,base+(d===1||d===4?.045:0)+fill/2+.01,z],s.material(['#bb9645','#c2a857','#a7813c'][i%3],{roughness:.25}),20);
      if(m<4)s.label(m===0?['OLD TREE','MEADOW','RUSSET'][i%3]:m===1?['DRY','MEDIUM','SWEET'][i%3]:m===2?String(i+1):'',w/(n+1),.035,[x,.027,z+.075]).rotation.x=-Math.PI/2;
    }
    if(t===3)s.ball([.07,.001,.035],[w*.3,.027,.06],s.material('#a68b44'),16);if(e<3)for(let i=0;i<3;i++){const x=-w*.2+i*.08,z=depth/2+.08;if(e===0)s.ball([.035,.008,.018],[x,.008,z],pale,12);if(e===1)s.mesh(new THREE.CylinderGeometry(.025,.025,.02,3),pale,[x,.01,z]);if(e===2)s.ball([.03,.02,.025],[x,.02,z],s.material('#b49460'),10);}if(e===3)s.lathe([[.04,0],[.05,.08],[.025,.15],[.025,.19]],glass,[0,0,depth/2+.1]);if(a.closed)s.label('ORCHARD NOTES',.22,.15,[w/2+.12,.003,.13]).rotation.x=-Math.PI/2;return s.finish();
  },
});
