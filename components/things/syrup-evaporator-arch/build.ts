import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What evaporator is installed?", {"arch": "A long brick fire arch with steel pans.", "steel": "A compact steel evaporator on legs.", "barrel": "A converted horizontal barrel stove.", "twin": "A two-pan farm evaporator.", "open": "A shallow pan above an open masonry hearth."}),
  state: choice("What stage is the boil at?", {"fill": "Clear sap fills the first shallow pan.", "boil": "A foamy surface shows a vigorous boil.", "finish": "Amber syrup collects in the finishing pan.", "draw": "A draw-off tap fills a small pail.", "cold": "Cold empty pans after cleaning."}),
  detail: choice("What fuel is waiting?", {"split": "A tidy stack of split logs.", "round": "Short round firewood pieces.", "kindling": "A bundle of thin kindling.", "basket": "A wooden fuel basket.", "none": "No loose fuel."}),
  support: choice("How is the chimney arranged?", {"straight": "A tall straight rear chimney.", "elbow": "A chimney with an offset elbow.", "cap": "A straight pipe with a broad rain cap.", "short": "A short outdoor stack.", "hood": "A wide steam hood above the pans."}),
  extra: choice("What tool is kept near the pans?", {"ladle": "A long syrup ladle.", "skimmer": "A broad foam skimmer.", "thermometer": "A clip-on pan thermometer.", "poker": "A long fire poker.", "none": "No loose tool."}),
  mark: choice("What identifies the evaporator?", {"maple": "MAPLE HOUSE on the front.", "gauge": "A round temperature gauge.", "maker": "A brass makers plate.", "brick": "A pale decorative brick band.", "plain": "Unmarked black iron."}),
  extent: score("How long is the evaporator?", ["A hobby evaporator", "A family sugarhouse arch", "A large farm evaporator"]),
  load: score("How many pan channels are visible?", ["Two broad channels", "Four channels", "Six narrow channels"]),
  closed: noul("Is the firebox door open with a warm glow inside?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const L=.9+a.extent*.9,w=.6,h=.65,iron=s.material('#55594f',{metalness:.6}),brick=s.material('#a87e62'),base=f===1?iron:brick;s.box([w,h,L],[0,h/2,0],base);if(f===2)s.cylinder(w*.48,w*.48,L,[0,h*.55,0],iron,24).rotation.x=Math.PI/2;
    for(const x of [-w/2,w/2])s.box([.025,.12,L],[x,h+.06,0],metal);for(const z of [-L/2,L/2])s.box([w,.12,.025],[0,h+.06,z],metal);s.box([w,.018,L],[0,h,0],metal);const n=2+Math.round(a.load*4);for(let i=1;i<n;i++)s.box([w,.08,.012],[0,h+.04,-L/2+i*L/n],metal);
    if(t!==4)for(let i=0;i<n;i++){const col=t===2&&i===n-1?'#ad8541':t===1?'#ccb779':'#b7bb9e';s.box([w-.05,.01,L/n-.03],[0,h+.045,-L/2+(i+.5)*L/n],s.material(col,{roughness:.35}));if(t===1)for(let j=0;j<8;j++)s.ball([.018,.004,.018],[(random()-.5)*w*.8,h+.053,-L/2+(i+random())*L/n],pale,10);}
    const chimneyH=u===3?.7:1.7,z=-L/2+.12;s.cylinder(.065,.065,chimneyH,[.2,h+chimneyH/2,z],iron,20);if(u===1)s.tube([[.2,h+chimneyH,z],[.2,h+chimneyH+.2,z-.2],[.2,h+chimneyH+.5,z-.2]],.065,iron);if(u===2)s.cylinder(.13,.13,.025,[.2,h+chimneyH+.08,z],metal,20);if(u===4){for(const x of [-w*.55,w*.55])s.rod([x,h,-L*.3],[x,h+1,-L*.3],.015,metal);s.box([w*1.3,.12,L*.7],[0,h+1,-L*.15],metal);}
    s.box([w*.6,.27,.02],[0,.25,L/2+.015],dark);if(a.closed){s.box([w*.48,.18,.006],[0,.25,L/2+.03],s.material('#b17e47',{emissive:'#a65e25',emissiveIntensity:.25+mood.energy*.4}));const door=s.box([w*.6,.27,.025],[-w*.3,.25,L/2+.18],iron);door.rotation.y=-1.1;}else s.ring(.03,.006,[0,.25,L/2+.035],metal);
    s.rod([w/2,h,-L*.3],[w/2+.14,h,-L*.3],.018,metal);if(t===3){s.rod([w/2+.14,h,-L*.3],[w/2+.14,.22,-L*.3],.006,s.material('#b7964c'));s.lathe([[.08,0],[.14,.22],[.13,.22],[.07,.015]],metal,[w/2+.14,0,-L*.3]);}
    if(d<4)for(let i=0;i<(d===2?9:6);i++){const x=-w/2-.2-(i%2)*.08,y=.04+Math.floor(i/2)*.07;s.rod([x,y,-.15],[x,y,.25],d===2?.012:.035,wood);}if(d===3)s.box([.3,.18,.5],[-w/2-.25,.09,.05],wood);
    if(e===0||e===1){s.rod([-w*.2,h+.1,0],[-w*.2,h+.1,.55],.008,wood);s.ball([e===1?.07:.04,.01,.05],[-w*.2,h+.1,0],metal,14);}if(e===2)s.rod([w*.25,h,0],[w*.25,h+.3,0],.012,pale);if(e===3)s.rod([w/2+.12,0,.2],[w/2+.12,.8,.2],.008,metal);if(m===0||m===2)s.label(m===0?'MAPLE HOUSE':'FARM ARCH',w*.7,.08,[0,.5,L/2+.02]);if(m===1){s.cylinder(.06,.06,.018,[0,.5,L/2+.025],pale,24).rotation.x=Math.PI/2;s.rod([0,.5,L/2+.04],[.035,.53,L/2+.04],.003,dark);}if(m===3)for(const x of [-w/2,w/2])s.box([.02,.08,L],[x,.42,0],pale);return s.finish();
  },
});
