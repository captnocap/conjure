import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What shape is the lantern?", {"round": "A round ribbed paper globe.", "oval": "A tall oval paper lantern.", "cylinder": "A straight cylindrical lantern.", "rabbit": "A small rabbit-shaped paper lantern.", "box": "A square wooden-frame paper lantern."}),
  state: choice("What state is the lantern in?", {"lit": "A warm light glows inside.", "unlit": "Unlit paper shows its pale texture.", "carried": "A carrying handle is raised.", "rest": "A lantern rests on a low stand.", "folded": "A compressed paper lantern waits to be opened."}),
  detail: choice("What is printed on the paper?", {"rabbit": "A seated rabbit silhouette under a moon.", "moon": "A simple round full moon.", "grass": "Fine silver-grass silhouettes.", "cloud": "Three drifting cloud marks.", "plain": "Unprinted cream paper."}),
  support: choice("How is the lantern supported?", {"loop": "A thin wire hanging loop.", "pole": "A short crook on a floor stand.", "feet": "Four small wooden feet.", "handle": "A bamboo carrying handle.", "base": "A broad round lacquer base."}),
  extra: choice("What hangs from the bottom?", {"tassel": "A pale tassel.", "red": "A short red tassel.", "bell": "A tiny brass bell.", "tag": "A small moon-festival tag.", "none": "A plain lower ring."}),
  mark: choice("What colour are the ribs and trim?", {"black": "Dark bamboo ribs.", "wood": "Natural bamboo ribs.", "red": "Muted red lacquer trim.", "green": "Deep green trim.", "gold": "Warm brass-coloured trim."}),
  extent: score("How large is the lantern?", ["A small tabletop light", "A household hanging lantern", "A broad veranda lantern"]),
  load: score("How closely are the paper ribs spaced?", ["A few broad ribs", "An even rib pattern", "Many fine ribs"]),
  closed: noul("Is a small candle cup visible through the base?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const r=.12+a.extent*.13,h=f===1?r*3:f===2?r*2.4:f===4?r*2:r*2,sh=t===4?.25:1,base=u===1?.5:u===2?.08:.04,trim=s.material(['#535a4c','#a78c5a','#a4664f','#617b5a','#b69d61'][m]),paper=s.material('#d8cfaf',{emissive:'#d1bb7b',emissiveIntensity:t===0?.18+mood.energy*.25:0,side:THREE.DoubleSide});
    const cy=base+h*sh/2;if(u!==1)s.cylinder(r*.25,r*.3,base,[0,base/2,0],trim,20);if(f===0||f===1||f===3)s.ball([r,h*sh/2,r],[0,cy,0],paper,28);if(f===2)s.cylinder(r,r,h*sh,[0,cy,0],paper,32);if(f===4){s.box([r*1.6,h*sh,r*1.6],[0,cy,0],paper);for(const x of [-r*.82,r*.82])for(const z of [-r*.82,r*.82])s.rod([x,base,z],[x,base+h*sh,z],.008,trim);}
    const n=5+Math.round(a.load*8);for(let i=0;i<n;i++){const yy=base+h*sh*(i+.5)/n,rr=f===2?r:f===4?r*.8:r*Math.sqrt(Math.max(.05,1-Math.pow(((i+.5)/n-.5)*2,2)));if(f!==4)s.ring(rr+.002,.0025,[0,yy,0],trim).rotation.x=Math.PI/2;else for(const z of [-r*.81,r*.81])s.rod([-r*.81,yy,z],[r*.81,yy,z],.003,trim);}
    if(f===3){for(const x of [-r*.4,r*.4])s.ball([r*.25,r*.8,r*.18],[x,base+h*sh+r*.4,0],paper,16);s.ball([r*.6,r*.5,r*.5],[0,cy+r*.3,r*.6],paper,20);for(const x of [-r*.25,r*.25])s.ball([.008,.008,.004],[x,cy+r*.5,r*1.02],trim,10);}
    const front=f===4?r*.81:r*.98;if(d===0){s.ball([r*.2,r*.25,.003],[-r*.15,cy,front],trim,14);s.ball([r*.13,r*.13,.003],[-r*.08,cy+r*.24,front],trim,12);for(const x of [-r*.13,-r*.02])s.ball([r*.035,r*.17,.003],[x,cy+r*.43,front],trim,12);s.ball([r*.15,r*.15,.003],[r*.4,cy+r*.25,front],pale,16);}if(d===1)s.ball([r*.45,r*.45,.003],[0,cy,front],pale,24);if(d===2)for(let i=0;i<5;i++)s.rod([(i-2)*r*.15,cy-r*.5,front],[(i-2)*r*.2,cy+r*.5,front],.002,trim);if(d===3)for(let i=0;i<3;i++)s.ball([r*.25,r*.07,.003],[(i-1)*r*.3,cy+(i%2-.5)*r*.4,front],pale,12);
    if(u===0||u===3||t===2)s.tube([[-r*.3,base+h*sh,0],[-r*.4,base+h*sh+.13,0],[r*.4,base+h*sh+.13,0],[r*.3,base+h*sh,0]],u===3?.008:.003,trim);if(u===1){s.box([r*2.5,.03,r*2],[0,.015,0],trim);s.tube([[-r*1.2,0,0],[-r*1.2,base+h+.2,0],[0,base+h+.2,0],[0,base+h*sh,0]],.01,trim);}if(u===2)for(const x of [-r*.6,r*.6])for(const z of [-r*.6,r*.6])s.rod([x,0,z],[x,base,z],.008,trim);if(u===4)s.cylinder(r*1.05,r*1.1,.04,[0,.02,0],trim,28);
    const tasselY=u===1?base:base+.16,tasselZ=u===1?0:r*.82;if(e!==4&&u!==1)s.rod([0,base+h*sh*.35,tasselZ],[0,tasselY,tasselZ],.002,trim);if(e<2)for(let i=0;i<6;i++)s.rod([(i-2.5)*.007,tasselY,tasselZ],[(i-2.5)*.008,tasselY-.12,tasselZ],.002,e===1?s.material('#a96350'):pale);if(e===2)s.lathe([[.025,0],[.015,.035],[.006,.045]],s.material('#b9a265'),[0,tasselY-.06,tasselZ]);if(e===3)s.label('MOON',.07,.11,[0,tasselY-.08,tasselZ]);if(a.closed)s.cylinder(.025,.025,.025,[0,base+.015,0],metal,16);return s.finish();
  },
});
