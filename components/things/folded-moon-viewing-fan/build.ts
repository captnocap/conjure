import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("How open is the folding fan?", {"closed": "A narrow closed fan.", "half": "A half-open fan.", "wide": "A broad fully open fan.", "rest": "A fan partly open in a display rest.", "pair": "Two small fans overlap."}),
  state: choice("What moment does the fan suggest?", {"ready": "A carefully arranged fan ready for use.", "used": "The fan lies casually after use.", "gift": "A small paper sleeve accompanies it.", "mended": "A visible pale patch repairs one panel.", "stored": "A tied cord secures the folded fan."}),
  detail: choice("What is painted on the paper?", {"moon": "A pale full moon above a dark horizon.", "grass": "Fine autumn grass silhouettes.", "rabbit": "A small rabbit beneath the moon.", "cloud": "Three soft drifting clouds.", "plain": "Plain warm cream paper."}),
  support: choice("What are the outer guards made from?", {"bamboo": "Light natural bamboo.", "black": "Dark lacquered bamboo.", "red": "Muted red lacquer guards.", "bone": "Pale polished guards.", "carved": "Warm wood with a simple carved end."}),
  extra: choice("What lies alongside?", {"sleeve": "A narrow paper storage sleeve.", "tassel": "A loose cotton tassel.", "stone": "A small paperweight stone.", "cloth": "A folded silk carrying cloth.", "none": "Only the fan."}),
  mark: choice("What borders the paper?", {"gold": "A thin gold-coloured outer edge.", "blue": "A broad indigo edge band.", "red": "A fine vermilion edge.", "dots": "A row of small pale dots.", "plain": "An unbordered paper edge."}),
  extent: score("How long are the fan ribs?", ["A small hand fan", "An everyday folding fan", "A broad display fan"]),
  load: score("How many pleats shape the paper?", ["A few broad pleats", "Fine even pleats", "Many delicate pleats"]),
  closed: noul("Does a silk cord loop through the pivot?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const L=.2+a.extent*.18,angle=f===0?.13:f===1?1.4:f===3?1.1:2.5,n=10+Math.round(a.load*12),guard=s.material(['#b9a177','#4d5549','#ab6b52','#d2c6aa','#94774f'][u]),paper=s.material('#c9c4aa',{side:THREE.DoubleSide}),fan=new THREE.Group();
    const sheet=s.surface((u,v,p)=>{const ang=(u-.5)*angle,rr=L*(.34+v*.66);p.set(Math.sin(ang)*rr,Math.cos(ang)*rr,Math.sin(u*n*Math.PI*2)*.004);},paper,{segments:[n*2,12]});fan.add(sheet);for(let i=0;i<=n;i++){const ang=(i/n-.5)*angle;fan.add(s.rod([0,0,.005],[Math.sin(ang)*L,Math.cos(ang)*L,.005],i===0||i===n?.004:.0015,guard));}
    if(angle>.5&&(d===0||d===2)){fan.add(s.ball([L*.12,L*.12,.002],[-L*.15,L*.73,.01],pale,20));if(d===2){fan.add(s.ball([L*.08,L*.1,.002],[L*.12,L*.58,.01],dark,12));for(const x of [L*.09,L*.14])fan.add(s.ball([L*.02,L*.09,.002],[x,L*.74,.01],dark,10));}}if(angle>.5&&d===1)for(let i=0;i<6;i++)fan.add(s.rod([(i-2.5)*L*.08,L*.38,.01],[(i-2.5)*L*.12,L*.78,.01],.0015,dark));if(angle>.5&&d===3)for(let i=0;i<3;i++)fan.add(s.ball([L*.14,L*.035,.002],[(i-1)*L*.25,L*(.63+(i%2)*.18),.01],pale,12));
    if(m<3){const pts:Array<[number,number,number]>=[];for(let i=0;i<30;i++){const ang=(i/29-.5)*angle;pts.push([Math.sin(ang)*L*.98,Math.cos(ang)*L*.98,.01]);}fan.add(s.tube(pts,m===1?.008:.002,s.material(m===0?'#b59c63':m===1?'#597d92':'#a86650')));}if(m===3)for(let i=0;i<n;i++){const ang=(i/n-.5)*angle;fan.add(s.ball([.003,.003,.001],[Math.sin(ang)*L*.92,Math.cos(ang)*L*.92,.012],pale,6));}
    fan.rotation.x=f===3?-.6:-Math.PI/2;fan.rotation.z=t===1?.35:0;fan.position.y=f===3?.02:.015;s.root.add(fan);if(f===3){s.box([.18,.02,.12],[0,.01,0],wood);s.rod([0,.02,0],[0,.15,-.05],.01,wood);}if(f===4){const second=fan.clone();second.position.x=L*.45;second.rotation.z=.35;s.root.add(second);}if(t===3)s.box([.05,.004,.06],[L*.25,.02,L*.6],pale);if(t===4||a.closed)s.ring(.025,.003,[0,.017,0],dark).rotation.x=Math.PI/2;
    if(e===0||t===2)s.box([L*1.1,.004,.055],[L*.8,.003,0],pale);if(e===1)for(let i=0;i<7;i++)s.rod([L*.8,.005,.1],[L*.8+(i-3)*.008,.005,.22],.002,pale);if(e===2)s.ball([.045,.02,.03],[L*.8,.02,.12],dark,14);if(e===3)s.box([.18,.012,.13],[L*.8,.006,.1],green);return s.finish();
  },
});
