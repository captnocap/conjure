import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What basket holds the fruit?", {"round": "A round woven bamboo basket.", "oval": "A low oval gathering basket.", "square": "A square shallow wood basket.", "plate": "A pale ceramic offering plate.", "tray": "A dark lacquer fruit tray."}),
  state: choice("How has the harvest been arranged?", {"whole": "A neat group of whole persimmons.", "cut": "One fruit is cut open for sharing.", "leaf": "A few autumn leaves lie among the fruit.", "gift": "Two fruits are loosely wrapped in paper.", "last": "Only two persimmons remain."}),
  detail: choice("What sort of persimmons are offered?", {"flat": "Squat flat orange fruit.", "pointed": "Tall pointed fruit.", "gold": "Pale golden fruit.", "red": "Deep red-orange ripe fruit.", "mixed": "A mix of shapes and ripeness."}),
  support: choice("How is the basket carried?", {"loop": "A tall bamboo arch handle.", "ends": "Two small end loops.", "rope": "Two short rope handles.", "rim": "A thick easy-grip woven rim.", "none": "No carrying handle."}),
  extra: choice("What accompanies the harvest?", {"knife": "A small fruit knife.", "cloth": "A folded cream cloth.", "twig": "A fruiting twig with two leaves.", "saucer": "A little sharing saucer.", "none": "Only the fruit."}),
  mark: choice("What lines the basket?", {"paper": "A clean cream paper liner.", "blue": "A blue cotton cloth.", "leaf": "Broad green leaves.", "straw": "A small bed of straw.", "bare": "Exposed bamboo weave."}),
  extent: score("How broad is the basket?", ["A small household offering", "A family harvest basket", "A broad sharing basket"]),
  load: score("How many persimmons are offered?", ["Three fruits", "Six fruits", "Nine fruits"]),
  closed: noul("Is a small folded harvest note tucked beneath the handle?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const r=.18+a.extent*.14,sy=f===1?.7:1,mat=f===3?pale:f===4?dark:wood;if(f<2||f===3){const bowl=s.lathe([[0,0],[r*.7,.015],[r,.09],[r-.012,.09],[r*.65,.025],[0,.025]],mat);bowl.scale.z=sy;}else{s.box([r*2,.025,r*1.6],[0,.013,0],mat);for(const z of [-r*.8,r*.8])s.box([r*2,.06,.018],[0,.05,z],mat);}
    if(m<3)s.cylinder(r*.85,r*.85,.004,[0,.028,0],m===1?s.material('#6b8b9a'):m===2?green:pale,28);if(m===3)for(let i=0;i<16;i++)s.rod([(random()-.5)*r*1.5,.03,(random()-.5)*r],[(random()-.5)*r*1.5,.03,(random()-.5)*r],.002,pale);
    const n=t===4?2:3+Math.round(a.load*6),fr=r*.23;for(let i=0;i<n;i++){const ang=i*2.399,rr=r*.6*Math.sqrt(i/n),x=Math.cos(ang)*rr,z=Math.sin(ang)*rr*sy,kind=d===4?i%4:d,ry=kind===1?fr*1.3:fr*.8,fruit=s.material(kind===2?'#c8ab58':kind===3?'#b76e46':'#c48e4d');s.ball([fr,ry,fr],[x,.03+ry,z],fruit,20);for(let j=0;j<4;j++){const leaf=s.ball([fr*.48,.004,fr*.17],[x+Math.cos(j*Math.PI/2)*fr*.25,.03+ry*1.92,z+Math.sin(j*Math.PI/2)*fr*.25],dark,10);leaf.rotation.y=-j*Math.PI/2;}s.rod([x,.03+ry*1.9,z],[x,.03+ry*2.2,z],.003,wood);if(t===1&&i===0)s.cylinder(fr*.8,fr*.8,.006,[x,.03+ry*1.95,z],pale,24);if(t===3&&i<2)s.drape({size:[fr*2.5,fr*2.5],at:[x,.03+ry*2.5,z],over:[{ball:fr,at:[x,.03+ry,z]}],floor:.03,detail:10},pale);}
    if(t===2)for(let i=0;i<3;i++)s.mesh(new THREE.CylinderGeometry(.045,.045,.003,5),s.material('#af8558'),[(i-1)*r*.5,.09,r*.4]);if(u===0)s.tube([[-r,.08,0],[-r*.7,.35,0],[r*.7,.35,0],[r,.08,0]],.01,wood);if(u===1||u===2)for(const x of [-r,r])s.ring(.055,.008,[x,.09,0],u===2?pale:wood).rotation.y=Math.PI/2;if(u===3)s.ring(r,.015,[0,.085,0],wood).rotation.x=Math.PI/2;
    if(e===0){s.box([.1,.003,.02],[r+.12,.005,.05],metal);s.rod([r+.03,.01,.05],[r+.08,.01,.05],.01,wood);}if(e===1)s.box([.16,.022,.13],[r+.12,.011,0],pale);if(e===2){s.rod([r+.07,.006,-.1],[r+.14,.006,.15],.004,wood);for(const z of [-.02,.08])s.ball([.04,.003,.025],[r+.12,.01,z],green,12);}if(e===3)s.cylinder(.065,.065,.008,[r+.1,.004,0],pale,24);if(a.closed)s.label('AUTUMN HARVEST',.17,.08,[0,.031,r*.62]).rotation.x=-Math.PI/2;return s.finish();
  },
});
