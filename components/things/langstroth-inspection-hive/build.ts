import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What hive configuration is being inspected?", {"single": "A single deep brood box.", "super": "A brood box with a shallow honey super.", "double": "Two deep boxes stacked together.", "nuc": "A narrow five-frame nucleus hive.", "tower": "A brood box with two shallow supers."}),
  state: choice("What is the inspection stage?", {"closed": "The roof is closed and bees use the entrance.", "open": "The roof lies beside the open frames.", "lift": "One comb frame is raised on an inspection rest.", "split": "The upper box is set beside the brood box.", "winter": "A strapped hive with a reduced entrance."}),
  detail: choice("How are the hive boxes finished?", {"white": "Warm white painted timber.", "blue": "Soft blue boxes.", "green": "Muted sage green boxes.", "wood": "Unpainted cedar boards.", "mixed": "Alternating pale and ochre boxes."}),
  support: choice("What supports the hive?", {"legs": "A timber stand with four short legs.", "blocks": "Two low masonry blocks.", "pallet": "A narrow timber pallet.", "rails": "Two raised metal rails.", "slab": "A low flat stone slab."}),
  extra: choice("What is set beside the hive?", {"brush": "A long soft bee brush.", "tool": "A flat red hive tool.", "feeder": "A spare round feeder bowl.", "super": "An empty shallow super.", "none": "Only the inspection hive."}),
  mark: choice("How is the colony identified?", {"number": "A numbered HIVE 03 front plaque.", "flower": "A painted flower entrance mark.", "colour": "A broad coloured landing-board stripe.", "tag": "A little inspection-date card.", "plain": "Unmarked natural boxes."}),
  extent: score("How broad is the hive body?", ["A compact garden hive", "A full size inspection hive", "A broad heavy hive"]),
  load: score("How active is the entrance?", ["A few returning bees", "Steady traffic at the landing board", "A busy summer entrance"]),
  closed: noul("Is a brick used as a roof weight?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const w=f===3?.3:.42+a.extent*.1,dep=.5,b=u===0?.3:u===1?.16:u===2?.08:u===3?.24:.04,levels=f===0||f===3?1:f===4?3:2,boxH=.24,paint=s.material(['#d6d1b5','#7e9aa7','#8fa183','#ad8d60','#cdbd8a'][d]);s.box([w+.08,.035,dep+.17],[0,b,0.055],wood);
    if(u===0||u===3)for(const x of [-w*.4,w*.4])for(const z of [-.18,.18])s.rod([x,0,z],[x,b-.02,z],u===0?.025:.014,u===0?wood:metal);if(u===1)for(const x of [-w*.3,w*.3])s.box([.1,b,.42],[x,b/2,0],pale);if(u===2)for(const z of [-.2,0,.2])s.box([w+.15,.08,.1],[0,.04,z],wood);if(u===4)s.box([w+.15,.04,.62],[0,.02,0],pale);
    const count=t===3?1:levels;for(let j=0;j<count;j++){const y=b+.035+j*boxH,mat=d===4&&j%2?wood:paint;for(const x of [-w/2,w/2])s.box([.025,boxH-.012,dep],[x,y+boxH/2,0],mat);for(const z of [-dep/2,dep/2]){s.box([w,boxH-.012,.025],[0,y+boxH/2,z],mat);s.box([w*.36,.02,.013],[0,y+boxH*.65,z+Math.sign(z)*.02],wood);}if(j===count-1)for(let i=0;i<(f===3?5:8);i++)s.box([w/(f===3?6:9),.025,dep-.035],[(i-(f===3?4:7)/2)*w/(f===3?5.5:8.5),y+boxH-.02,0],wood);}
    const top=b+.035+count*boxH;if(t===0||t===4){s.box([w+.09,.045,dep+.08],[0,top+.025,0],metal);if(a.closed)s.box([.18,.065,.1],[.02,top+.08,0],s.material('#a87c61'));if(t===4)for(const x of [-w*.28,w*.28])s.box([.025,top+.05,dep+.1],[x,(top+.05)/2,0],s.material('#9c7653',{transparent:true,opacity:.45}));}else{s.box([w+.09,.045,dep+.08],[w+.25,.025,0],metal);if(a.closed)s.box([.18,.065,.1],[w+.25,.08,0],s.material('#a87c61'));}
    if(t===2){const fy=top+.13;for(const x of [-w*.45,w*.45])s.rod([x,top-.05,0],[x,fy+.27,0],.012,metal);for(const x of [-w*.4,w*.4])s.box([.018,.28,.03],[x,fy+.13,0],wood);for(const y of [fy,fy+.27])s.box([w*.85,.018,.03],[0,y,0],wood);s.box([w*.76,.24,.008],[0,fy+.135,.003],s.material('#bd9d50'));for(let i=0;i<12;i++)s.ring(.018,.002,[(i%4-1.5)*w*.17,fy+.06+Math.floor(i/4)*.07,.012],wood);}
    if(t===3||e===3){const x=-w-.2;s.box([w+.03,.025,dep],[x,.015,0],wood);for(const z of [-dep/2,dep/2])s.box([w,.15,.025],[x,.09,z],paint);for(const dx of [-w/2,w/2])s.box([.025,.15,dep],[x+dx,.09,0],paint);}
    s.box([w*(t===4?.2:.7),.017,.01],[0,b+.03,dep/2+.025],dark);if(m===0||m===3)s.label(m===0?'HIVE 03':'INSPECTED',w*.65,.065,[0,b+.15,dep/2+.014]);if(m===1)for(let i=0;i<6;i++)s.ball([.014,.023,.003],[Math.cos(i*Math.PI/3)*.023,b+.15+Math.sin(i*Math.PI/3)*.023,dep/2+.016],pale,10);if(m===2)s.box([w*.8,.006,.04],[0,b+.021,dep/2+.075],s.material('#b69d51'));
    for(let i=0;i<3+Math.round(a.load*10);i++){const x=(random()-.5)*w*.7,z=dep/2+.035+random()*.08;s.ball([.012,.006,.005],[x,b+.027,z],dark,8);s.ball([.004,.007,.009],[x,b+.033,z],pale,8);}if(e===0){s.rod([w+.23,.012,-.35],[w+.23,.012,-.08],.008,wood);s.box([.07,.018,.13],[w+.23,.015,-.1],pale);}if(e===1)s.box([.035,.006,.2],[w+.2,.005,-.35],s.material('#a75f45'));if(e===2)s.lathe([[.07,0],[.1,.06],[.09,.06],[.06,.01]],pale,[-w-.1,0,0]);return s.finish();
  },
});
