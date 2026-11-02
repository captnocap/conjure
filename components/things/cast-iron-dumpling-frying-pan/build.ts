import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What pan is cooking the dumplings?", {"skillet": "A round cast-iron skillet.", "square": "A square heavy griddle pan.", "wok": "A small deep wok with a loop handle.", "saute": "A straight-sided saute pan.", "double": "A broad pan with two short handles."}),
  state: choice("What cooking stage is shown?", {"arranged": "Raw dumplings neatly arranged.", "frying": "Golden bottoms and a shallow sheen of oil.", "steam": "A lid covers most of the simmering dumplings.", "crisp": "A lacy crisp skirt joins the dumplings.", "served": "Several dumplings have been lifted out."}),
  detail: choice("How are the dumplings arranged?", {"ring": "A ring around the outer edge.", "rows": "Parallel orderly rows.", "spiral": "A loose spiral toward the centre.", "crowded": "A densely crowded batch.", "few": "A few widely spaced pieces."}),
  support: choice("What supports the hot pan?", {"trivet": "A wooden cross trivet.", "ring": "A round cast-iron stand.", "stove": "A small portable gas burner.", "mat": "A thick woven heat mat.", "bare": "No separate support."}),
  extra: choice("What utensil accompanies it?", {"spatula": "A broad metal spatula.", "chopsticks": "Long cooking chopsticks.", "tongs": "A pair of spring tongs.", "cloth": "A folded handle cloth.", "none": "No utensil."}),
  mark: choice("What finishes the handle?", {"wood": "A wooden grip.", "loop": "A cast hanging loop.", "red": "A red heatproof sleeve.", "wrap": "A pale cloth wrap.", "bare": "Plain black iron."}),
  extent: score("How wide is the pan?", ["A small skillet", "A family frying pan", "A large communal pan"]),
  load: score("How many dumplings are cooking?", ["A small tasting batch", "A normal batch", "A pan packed to the rim"]),
  closed: noul("Is a small dipping saucer set beside the pan?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const r=.15+a.extent*.14,h=f===2?.12:.055,bottom=u===2?.13:u===0||u===1?.04:u===3?.015:0,iron=s.material('#42463f',{metalness:.55,roughness:.5});if(f===1){s.box([r*2,.018,r*1.8],[0,bottom+.009,0],iron);for(const x of [-r,r])s.box([.015,h,r*1.8],[x,bottom+h/2,0],iron);for(const z of [-r*.9,r*.9])s.box([r*2,h,.015],[0,bottom+h/2,z],iron);}else s.lathe([[0,0],[r*.83,.008],[r,h],[r-.012,h],[r*.8,.018],[0,.018]],iron,[0,bottom,0]);
    if(f===4||f===2)for(const x of [-r,r])s.ring(.05,.01,[x,bottom+h*.8,0],iron).rotation.x=Math.PI/2;else{s.rod([0,bottom+.035,r*.8],[0,bottom+.035,r+.2],.024,iron);if(m===0||m===2||m===3)s.rod([0,bottom+.035,r+.04],[0,bottom+.035,r+.2],.028,m===0?wood:m===2?s.material('#a85845'):pale);if(m===1)s.ring(.027,.006,[0,bottom+.035,r+.22],iron).rotation.x=Math.PI/2;}
    if(u===0){s.box([r*1.6,.04,.05],[0,.02,0],wood);s.box([.05,.04,r*1.6],[0,.02,0],wood);}if(u===1)s.ring(r*.7,.018,[0,.02,0],iron).rotation.x=Math.PI/2;if(u===2){s.box([r*1.7,.1,r*1.7],[0,.05,0],green);s.ring(r*.6,.012,[0,.12,0],iron).rotation.x=Math.PI/2;s.cylinder(.025,.025,.02,[0,.055,r*.88],dark,12).rotation.x=Math.PI/2;}if(u===3)s.cylinder(r*1.1,r*1.1,.015,[0,.008,0],wood,24);
    const n=d===4?3:5+Math.round(a.load*8),count=t===4?Math.max(2,n-4):n,dr=r*.15;for(let i=0;i<count;i++){const ang=i*2.399,rr=d===0?r*.68:d===2?r*.7*Math.sqrt(i/n):d===3?r*.68*Math.sqrt((i+.5)/n):r*.7;const x=d===1?(i%4-1.5)*r*.38:Math.cos(ang)*rr,z=d===1?(Math.floor(i/4)-1)*r*.42:Math.sin(ang)*rr;s.ball([dr*1.35,dr*.65,dr*.7],[x,bottom+.018+dr*.6,z],pale,14);for(let j=0;j<5;j++)s.rod([x+(j-2)*dr*.35,bottom+.018+dr*1.25,z],[x+(j-2)*dr*.35,bottom+.018+dr*1.7,z+.008],.0025,pale);if(t===1||t===3)s.ball([dr*1.2,.004,dr*.65],[x,bottom+.02,z],s.material('#b58440'),12);}
    if(t===3){s.cylinder(r*.9,r*.9,.003,[0,bottom+.021,0],s.material('#b89b55'),32);for(let i=0;i<18;i++){const ang=random()*Math.PI*2,rr=random()*r*.85;s.ring(.008+random()*.012,.001,[Math.cos(ang)*rr,bottom+.024,Math.sin(ang)*rr],iron).rotation.x=Math.PI/2;}}
    if(t===2){s.lathe([[0,.07],[r*.65,.05],[r,0],[r,.008],[0,.08]],metal,[0,bottom+h,0]);s.ball([.025,.018,.025],[0,bottom+h+.095,0],wood,12);}
    if(e===0){s.box([.065,.004,.09],[r+.12,.008,-.06],metal);s.rod([r+.12,.015,-.02],[r+.12,.015,.15],.009,wood);}if(e===1)for(const x of [r+.1,r+.12])s.rod([x,.01,-.1],[x,.01,.2],.004,wood);if(e===2)for(const sign of [-1,1])s.rod([r+.13,.012,.17],[r+.13+sign*.035,.012,-.08],.006,metal);if(e===3)s.box([.12,.018,.13],[r+.12,.01,0],pale);if(a.closed){s.cylinder(.065,.065,.014,[-r-.09,.007,0],pale,24);s.cylinder(.052,.052,.003,[-r-.09,.016,0],s.material('#64432d'),20);}return s.finish();
  },
});
