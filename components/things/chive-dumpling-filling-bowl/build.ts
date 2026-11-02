import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What shape is the mixing bowl?", {"round": "A deep round mixing bowl.", "wide": "A low wide bowl.", "basin": "A handled enamel basin.", "mortar": "A thick stoneware mortar.", "wood": "A broad carved wooden bowl."}),
  state: choice("How far along is the filling?", {"fresh": "Separate ingredients waiting to be mixed.", "mixed": "A thoroughly mixed mound.", "used": "A hollow scooped out of the centre.", "empty": "Only scraps cling to the bowl.", "covered": "A cloth covers the prepared filling."}),
  detail: choice("What is the filling?", {"chive": "Dark green chopped chives and pale tofu.", "cabbage": "Pale cabbage with green scallions.", "mushroom": "Brown mushrooms and green herbs.", "pork": "Pink minced meat with chopped chives.", "carrot": "Orange carrot, egg and greens."}),
  support: choice("What utensil is in the bowl?", {"spoon": "A broad wooden spoon.", "chopsticks": "Long mixing chopsticks.", "spatula": "A flat bamboo spatula.", "ladle": "A small metal serving ladle.", "none": "No utensil."}),
  extra: choice("What is beside the bowl?", {"chives": "A tied bundle of uncut chives.", "oil": "A small sesame oil bottle.", "salt": "A pinch dish of salt.", "cloth": "A folded wiping cloth.", "none": "Only the bowl."}),
  mark: choice("What decorates the outside?", {"blue": "A blue band below the rim.", "flowers": "Five painted flower marks.", "stripes": "Vertical glaze stripes.", "crackle": "A few dark glaze cracks.", "plain": "Plain glaze or grain."}),
  extent: score("How wide is the bowl?", ["A personal mixing bowl", "A family mixing bowl", "A large communal basin"]),
  load: score("How much filling is prepared?", ["A shallow layer", "Half a bowl", "A generous mound"]),
  closed: noul("Does the bowl sit on a woven non-slip mat?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const r=.16+a.extent*.12,h=f===1?.09:f===3?.2:.16,mat=f===4?wood:s.material(f===2?'#d6d8c5':'#c7cbb9');s.lathe([[r*.45,0],[r*.8,h*.35],[r,h],[r-.012,h],[r*.75,h*.35],[r*.4,.02]],mat);s.ring(r,.008,[0,h,0],f===2?dark:pale).rotation.x=Math.PI/2;if(f===2)for(const x of [-r,r])s.ring(.04,.008,[x,h*.7,0],metal).rotation.y=Math.PI/2;
    const food=s.material(['#67804e','#afbc7f','#8c7152','#bf9280','#c49b5d'][d]),n=t===3?8:20+Math.round(a.load*35),level=.035+a.load*h*.55;
    if(t!==3){if(t===2)s.ring(r*.55,.025,[0,level-.01,0],food).rotation.x=Math.PI/2;else s.ball([r*.75,Math.max(.018,level*.45),r*.75],[0,level-Math.max(.018,level*.45),0],food,24);}
    for(let i=0;i<n;i++){const ang=random()*Math.PI*2,rr=Math.sqrt(random())*r*.78,x=Math.cos(ang)*rr,z=Math.sin(ang)*rr,y=t===2&&rr<r*.35?.035:level+(random()-.5)*.025;s.ball([.012+random()*.01,.009,.013],[x,y,z],i%4===0?pale:food,8);if(i%4===1)s.rod([x,y+.006,z],[x+.025,y+.006,z+.014],.003,green);}if(t===0)for(let i=0;i<8;i++)s.box([.026,.018,.025],[-r*.35+(random()-.5)*r*.4,level+.02,(random()-.5)*r],pale);
    if(u<4){const handle=s.rod([0,.05,0],[r*.8,h+.11,-r*.5],u===1?.004:.009,u===3?metal:wood);if(u===0||u===3)s.ball([.038,.008,.025],[0,.06,0],u===3?metal:wood,12);if(u===1)s.rod([.025,.05,0],[r*.8+.025,h+.11,-r*.5],.004,wood);if(u===2)s.box([.05,.008,.08],[0,.07,0],wood);}
    if(e===0){for(let i=0;i<11;i++)s.rod([r+.08+i*.006,.01,-.12],[r+.08+i*.006,.01,.16],.003,green);s.rod([r+.065,.015,0],[r+.15,.015,0],.004,pale);}if(e===1){s.lathe([[.025,0],[.03,.1],[.012,.12],[.012,.15]],s.material('#8e7749'),[r+.09,0,0]);s.cylinder(.014,.014,.02,[r+.09,.16,0],dark,12);}if(e===2){s.cylinder(.045,.045,.016,[r+.08,.008,0],wood,20);s.ball([.033,.008,.033],[r+.08,.02,0],pale,12);}if(e===3)s.box([.15,.02,.11],[r+.12,.01,0],pale);
    if(m===0)s.ring(r*.97,.006,[0,h*.88,0],s.material('#5b8190')).rotation.x=Math.PI/2;if(m===1)for(let i=0;i<5;i++){const ang=i*Math.PI*2/5;s.ball([.02,.018,.005],[Math.sin(ang)*r*.9,h*.65,Math.cos(ang)*r*.9],s.material('#67839a'),8);}if(m===2)for(let i=0;i<12;i++){const ang=i*Math.PI/6;s.rod([Math.sin(ang)*r*.7,h*.2,Math.cos(ang)*r*.7],[Math.sin(ang)*r*.98,h*.9,Math.cos(ang)*r*.98],.004,pale);}if(m===3)s.tube([[-r*.3,h*.7,r*.86],[0,h*.5,r*.84],[r*.1,h*.3,r*.76]],.002,dark);
    if(t===4)s.drape({size:[r*2.1,r*2.1],at:[0,h+.08,0],over:[{cylinder:[r,h],at:[0,h/2,0]}],floor:.01,detail:14,rumple:.2},pale);if(a.closed)s.cylinder(r*1.2,r*1.2,.008,[0,.004,0],wood,32);return s.finish();
  },
});
