import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What display supports the clips?", {"rail": "A single horizontal rail with hoop numbers.", "ladder": "Two horizontal rails on upright posts.", "board": "A narrow numbered backboard.", "arch": "An arched rail above a low board.", "compact": "A low tabletop score rail."}),
  state: choice("What stage of the game is recorded?", {"start": "All clips wait at the starting end.", "middle": "Clips are spread through the middle hoops.", "close": "Two leading clips are near the winning peg.", "finished": "All clips have reached the end.", "reset": "The clips are laid below the empty rail."}),
  detail: choice("How is the display finished?", {"wood": "Natural pale timber.", "white": "Cream painted timber.", "green": "Muted green paint.", "dark": "Dark stained wood.", "metal": "Brushed metal rail and posts."}),
  support: choice("What base holds the display?", {"feet": "Two transverse timber feet.", "slab": "A single wide base board.", "cross": "Two crossed feet.", "stakes": "Two pointed lawn stakes.", "blocks": "Two small stone sockets."}),
  extra: choice("What accompanies the scores?", {"card": "A small score card on the base.", "pencil": "A pencil laid beside the stand.", "bell": "A little match-ending bell.", "peg": "A striped winning peg.", "none": "Only the score display."}),
  mark: choice("How are the stations labelled?", {"numbers": "Hoop numbers one to six.", "dots": "Simple grouped dots.", "arrows": "Arrows show the direction of play.", "letters": "A to F station letters.", "plain": "Unlabelled pale divisions."}),
  extent: score("How broad is the score rail?", ["A compact lawn score rail", "A club display", "A broad teaching display"]),
  load: score("How many ball clips are in use?", ["Two players", "Four players", "Six players"]),
  closed: noul("Is a small final-score plate fitted beneath the rail?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const W=.7+a.extent*.5,H=f===4?.22:.6,mat=s.material(['#b49869','#d7d3b8','#738d68','#6a5740','#939f93'][d]);for(const x of [-W*.45,W*.45])s.rod([x,0,0],[x,H,0],.018,mat);s.rod([-W/2,H,0],[W/2,H,0],.018,mat);if(f===1)s.rod([-W/2,H*.5,0],[W/2,H*.5,0],.016,mat);if(f===2||f===3)s.box([W,.13,.025],[0,H-.08,-.015],mat);if(f===3)s.tube([[-W/2,H,0],[-W*.3,H+.12,0],[W*.3,H+.12,0],[W/2,H,0]],.014,mat);
    for(const x of [-W*.45,W*.45]){if(u===0||u===2)s.box([u===2?.28:.1,.025,.3],[x,.013,0],wood);if(u===2)s.box([.08,.026,.38],[x,.013,0],wood);if(u===4)s.box([.14,.1,.14],[x,.05,0],pale);}if(u===1)s.box([W+.14,.03,.3],[0,.015,0],wood);
    for(let i=0;i<6;i++){const x=(i-2.5)*W*.15;s.box([.003,.055,.004],[x,H-.035,.02],pale);if(m===0||m===3)s.label(m===0?String(i+1):String.fromCharCode(65+i),.06,.05,[x,H-.08,.022]);if(m===1)for(let j=0;j<1+i%3;j++)s.ball([.005,.005,.001],[x+(j-i%3/2)*.012,H-.07,.021],dark,8);if(m===2)s.mesh(new THREE.ConeGeometry(.013,.035,3),pale,[x,H-.07,.021]).rotation.z=-Math.PI/2;}
    const n=2+Math.round(a.load*4);for(let i=0;i<n;i++){const station=t===0?0:t===1?1+i%4:t===2?i<2?5:2+i%3:5,x=t===4?(i-(n-1)/2)*.07:(station-2.5)*W*.15+(i%2-.5)*.04,y=t===4?.025:H+.005;s.box([.035,.07,.055],[x,y,0],s.material(colors[i%5]));s.box([.045,.012,.02],[x,y+.025,.035],metal);}
    if(e===0)s.label('SCORE',.18,.1,[W*.2,.032,.13]).rotation.x=-Math.PI/2;if(e===1)s.rod([W*.65,.006,-.1],[W*.65,.006,.12],.004,wood);if(e===2){s.lathe([[.05,0],[.035,.05],[.015,.07]],metal,[W*.65,0,0]);s.rod([W*.65,.06,0],[W*.65,.14,0],.008,wood);}if(e===3){s.rod([W*.65,0,0],[W*.65,.25,0],.015,wood);for(let i=0;i<4;i++)s.cylinder(.016,.016,.03,[W*.65,.1+i*.035,0],s.material(colors[i]),12);}if(a.closed){s.rod([-W*.45,H*.45,0],[W*.45,H*.45,0],.012,wood);s.box([W*.6,.1,.018],[0,H*.45,.02],wood);s.label('FINAL SCORE',W*.5,.07,[0,H*.45,.032]);}return s.finish();
  },
});
