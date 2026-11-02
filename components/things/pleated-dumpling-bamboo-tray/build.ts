import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What shape have the dumplings been folded into?", {"crescent": "A curved half-moon with a pinched ridge.", "purse": "A round gathered purse with an open neck.", "ingot": "A folded ingot with tucked ends.", "leaf": "A long leaf shape with a central seam.", "round": "A small round bun with radial pleats."}),
  state: choice("What stage is this batch at?", {"raw": "Fresh pale dough waiting for the steamer.", "cooked": "Plump cooked dumplings with a glossy surface.", "fried": "Golden browned bottoms peeking below the dough.", "making": "Half the tray is filled and loose wrappers remain.", "served": "A partly eaten batch with one split dumpling."}),
  detail: choice("What colours the dough?", {"plain": "Pale wheat dough.", "spinach": "Muted green spinach dough.", "beet": "A gentle beet-pink dough.", "squash": "Golden squash dough.", "mixed": "Alternating plain and green wrappers."}),
  support: choice("What is the serving tray?", {"round": "A round bamboo steamer tray.", "oval": "An oval woven basket.", "square": "A shallow square bamboo tray.", "plate": "A pale ceramic plate.", "board": "A flat wooden board with a raised edge."}),
  extra: choice("What accompanies the batch?", {"sauce": "A dark dipping sauce saucer.", "chopsticks": "A pair of wooden chopsticks.", "ginger": "A small pile of sliced ginger.", "vinegar": "A squat vinegar bottle.", "none": "Only the dumplings."}),
  mark: choice("How is the tray lined?", {"leaf": "A broad green leaf.", "paper": "A perforated cream paper liner.", "slats": "Exposed bamboo slats.", "cloth": "A folded cotton liner.", "doily": "A round scalloped paper liner."}),
  extent: score("How broad is the tray?", ["A small personal tray", "A family tray", "A communal batch"]),
  load: score("How full is the tray?", ["Three dumplings", "Six dumplings", "Twelve dumplings"]),
  closed: noul("Is a woven steamer lid resting beside the tray?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const r=.2+a.extent*.17,depth=u===1?.72:1,cream=s.material(['#e1d4af','#7b9465','#c58a87','#d3af67','#ded2b1'][d],{roughness:t===1?.3:.75});
    if(u<2||u===3){const tray=s.lathe([[0,0],[r,.01],[r,.065],[r-.012,.065],[r-.018,.025],[0,.025]],u===3?pale:wood);tray.scale.z=depth;}else{s.box([r*2,.025,r*1.65],[0,.013,0],wood);for(const z of [-r*.825,r*.825])s.box([r*2,.05,.015],[0,.04,z],wood);}
    if(m===0)s.ball([r*.9,.008,r*.65],[0,.034,0],green,16);if(m===1||m===3||m===4)s.cylinder(r*.9,r*.9,.004,[0,.03,0],pale,m===4?16:32);
    if(m===2)for(let i=-4;i<=4;i++)s.box([r*1.75,.007,.025],[0,.032,i*r*.17],pale);
    const n=3+Math.round(a.load*9),count=t===4?Math.max(2,n-3):t===3?Math.ceil(n/2):n;
    for(let i=0;i<count;i++){const ang=i*2.399,x=Math.cos(ang)*r*.66*Math.sqrt(i/count),z=Math.sin(ang)*r*.54*Math.sqrt(i/count),mat=d===4&&i%2?green:cream,dr=r*.2;
      if(f===1||f===4){s.ball([dr,dr*.8,dr],[x,.035+dr*.65,z],mat,14);for(let j=0;j<8;j++){const ang=j*Math.PI/4;s.rod([x+Math.cos(ang)*dr*.8,.035+dr*1.15,z+Math.sin(ang)*dr*.6],[x+Math.cos(ang)*dr*.2,.035+dr*1.7,z+Math.sin(ang)*dr*.2],dr*.055,pale);}if(f===1)s.ring(dr*.24,dr*.09,[x,.035+dr*1.75,z],mat).rotation.x=Math.PI/2;}
      else{const mesh=s.ball([dr*(f===3?1.5:1.25),dr*.6,dr*.65],[x,.035+dr*.55,z],mat,14);if(f===2){s.ball([dr*.4,dr*.4,dr*.45],[x-dr,.035+dr*.6,z+.025],mat,10);s.ball([dr*.4,dr*.4,dr*.45],[x+dr,.035+dr*.6,z+.025],mat,10);}for(let j=0;j<7;j++)s.rod([x+(j-3)*dr*.3,.035+dr*1.25,z-.012],[x+(j-3)*dr*.3+dr*.08,.035+dr*1.65-Math.abs(j-3)*dr*.08,z+.01],dr*.055,pale);}
      if(t===2)s.ball([dr,dr*.12,dr*.65],[x,.038,z],s.material('#a9743e'),12);if(t===4&&i===0)s.ball([dr*.55,dr*.35,dr*.4],[x,.035+dr*.7,z+dr*.5],green,10);
    }
    if(t===3)for(let i=0;i<3;i++)s.cylinder(r*.2,r*.2,.003,[r*.55,.036+i*.004,r*.3],cream,24);
    if(e===0){s.lathe([[0,0],[.07,.01],[.08,.025],[.07,.028],[0,.015]],pale,[r+.1,0,0]);s.cylinder(.06,.06,.004,[r+.1,.019,0],s.material('#553d2e'),20);}if(e===1)for(const z of [-.025,.025])s.rod([-r,.015,r+.07],[r,.015,r+.07+z],.004,wood);if(e===2)for(let i=0;i<7;i++)s.box([.05,.004,.012],[r+.08+(random()-.5)*.04,.004+i*.004,(random()-.5)*.05],pale);if(e===3){s.lathe([[.035,0],[.045,.03],[.045,.09],[.018,.12],[.018,.15]],dark,[r+.1,0,0]);s.cylinder(.021,.021,.025,[r+.1,.16,0],wood,12);}
    if(a.closed){const lr=r*.95;const lid=s.lathe([[0,.05],[lr*.7,.035],[lr,0],[lr,.012],[0,.065]],wood,[-r*1.8,0,0]);for(let i=-3;i<=3;i++)s.box([lr*1.4,.004,.015],[-r*1.8,.065,i*lr*.18],pale);s.ring(.035,.008,[-r*1.8,.085,0],wood);}
    return s.finish();
  },
});
