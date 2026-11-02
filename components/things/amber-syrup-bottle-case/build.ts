import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What bottles hold the syrup?", {"flask": "Flat round-shouldered maple flasks.", "round": "Tall round glass bottles.", "jug": "Small handled glass jugs.", "square": "Square pantry bottles.", "leaf": "Broad leaf-like souvenir flasks."}),
  state: choice("What is happening with the case?", {"packed": "A neatly packed full case.", "selling": "A few bottles have been taken for sale.", "gift": "Two bottles are wrapped as gifts.", "bottling": "An uncapped bottle waits beside a funnel.", "empty": "Empty clean bottles await the next batch."}),
  detail: choice("What grade colours the syrup?", {"gold": "Pale golden syrup.", "amber": "Rich amber syrup.", "dark": "Dark brown robust syrup.", "mixed": "A range from gold to dark.", "clear": "Clear empty glass."}),
  support: choice("What holds the bottles?", {"crate": "A slatted wooden carrying crate.", "divider": "A divided cardboard case.", "basket": "A woven gift basket.", "tray": "A shallow timber serving tray.", "rack": "A two-row display rack."}),
  extra: choice("What is packed beside them?", {"tag": "A bundle of blank gift tags.", "cup": "A small tasting cup.", "funnel": "A metal bottling funnel.", "ribbon": "A curled red wrapping ribbon.", "none": "Only the bottles."}),
  mark: choice("What do the labels say?", {"maple": "PURE MAPLE.", "farm": "FAMILY SUGAR BUSH.", "year": "THIS YEARS HARVEST.", "grade": "GOLDEN or AMBER grade labels.", "plain": "Small blank cream labels."}),
  extent: score("How large is the bottle case?", ["A small gift case", "A farm-gate case", "A large harvest case"]),
  load: score("How many bottles are packed?", ["Three bottles", "Six bottles", "Nine bottles"]),
  closed: noul("Is a simple carrying handle fitted above the case?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const w=.4+a.extent*.35,n=3+Math.round(a.load*6),dep=.36,glass=s.material('#d2c7a1',{transparent:true,opacity:.35,depthWrite:false,roughness:.2});s.box([w,.025,dep],[0,.013,0],wood);for(const z of [-dep/2,dep/2])for(const y of [.055,u===3?.08:.16])s.box([w,u===3?.035:.055,.02],[0,y,z],u===1?pale:wood);for(const x of [-w/2,w/2])s.box([.02,u===3?.08:.2,dep],[x,u===3?.04:.1,0],wood);
    const count=t===1?Math.max(2,n-2):n;for(let i=0;i<count;i++){const x=(i%3-1)*w*.27,z=(Math.floor(i/3)-1)*.105,r=.035,h=.24,sy=f===0||f===4?.65:1;const bottle=s.lathe([[r*.8,0],[r,.03],[r,h*.7],[.014,h*.83],[.014,h],[.01,h],[.01,h*.83],[r*.85,.025]],glass,[x,.03,z]);bottle.scale.z=sy;if(t!==4&&d!==4){const fill=s.cylinder(r*.83,r*.83,.16,[x,.12,z],s.material(['#c2a55a','#b28b42','#856337'][d===3?i%3:Math.min(d,2)]),20);fill.scale.z=sy;}if(!(t===3&&i===0))s.cylinder(.017,.017,.025,[x,.28,z],dark,12);if(f===2)s.ring(.022,.004,[x+r,.22,z],glass);if(f===4)for(const side of [-1,1])s.ball([.018,.025,.015],[x+side*r,.15,z],glass,12);
      s.label(m===3?(i%2?'AMBER':'GOLDEN'):['PURE MAPLE','SUGAR BUSH','HARVEST','',''][m],.055,.055,[x,.155,z+r*sy+.002]);if(t===2&&i<2){s.ring(.038,.004,[x,.19,z],s.material('#ad6050')).rotation.x=Math.PI/2;}if(u===1)for(const xx of [-w*.135,w*.135])s.box([.008,.16,dep],[xx,.1,0],pale);
    }
    if(e===0)s.label('GIFT TAGS',.12,.07,[w/2+.09,.004,0]).rotation.x=-Math.PI/2;if(e===1)s.lathe([[.025,0],[.035,.065],[.03,.065],[.02,.01]],glass,[w/2+.07,0,0]);if(e===2||t===3)s.lathe([[.012,0],[.012,.04],[.06,.1]],metal,[w/2+.08,0,.08]);if(e===3)s.tube([[w/2+.04,.005,0],[w/2+.15,.005,.03],[w/2+.07,.005,.08],[w/2+.15,.005,.12]],.004,s.material('#ac604e'));if(a.closed)s.tube([[-w/2,.035,0],[-w/2,.4,0],[w/2,.4,0],[w/2,.035,0]],.016,wood);return s.finish();
  },
});
