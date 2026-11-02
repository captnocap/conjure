import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What vessel holds the starter?", {"glass": "A clear straight-sided glass jar.", "crock": "A cream ceramic starter crock.", "tall": "A tall narrow glass jar.", "wide": "A broad low mixing crock.", "pair": "Two small jars for separate starters."}),
  state: choice("What stage has the starter reached?", {"fed": "Fresh flour has just been mixed in.", "rise": "The starter has risen above its feed mark.", "peak": "A domed bubbly starter is at its peak.", "fallen": "A high tide mark remains above the starter.", "empty": "A clean empty jar waits for a new batch."}),
  detail: choice("What is the lid made from?", {"wood": "A loose wooden lid.", "cloth": "A pale cloth cover.", "metal": "A grey metal lid.", "ceramic": "A pale ceramic lid.", "glass": "A flat clear lid."}),
  support: choice("What supports the vessel?", {"board": "A small round wood board.", "cloth": "A folded counter cloth.", "tray": "A shallow metal drip tray.", "mat": "A small rush mat.", "bare": "A clear counter."}),
  extra: choice("What is beside the jar?", {"spoon": "A long mixing spoon.", "flour": "A small bowl of flour.", "scale": "A small flat kitchen scale.", "card": "A handwritten feeding card.", "none": "Only the starter."}),
  mark: choice("How is the feeding level marked?", {"band": "A narrow elastic feed-level band.", "ticks": "Three volume marks.", "name": "A STARTER label.", "date": "A FED MONDAY label.", "plain": "No external mark."}),
  extent: score("How broad is the starter jar?", ["A small daily starter", "A family baking starter", "A large shared starter"]),
  load: score("How much starter is kept?", ["A small spoonful", "A half jar", "A generous live culture"]),
  closed: noul("Is the lid resting beside the open jar?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const R=.075+a.extent*.045,H=f===2?.3:f===3?.14:.22,n=f===4?2:1,base=u===4?0:.015,glass=s.material('#b8cbb5',{transparent:true,opacity:.25,depthWrite:false}),vessel=f===1||f===3?pale:glass,lid=s.material(['#b79b6e','#d4ccb0','#929e94','#d2c5a5','#bbcebb'][d]),span=n*R*2.4;if(u===0||u===3)s.cylinder(span*.65,span*.65,base,[0,base/2,0],wood,26);if(u===1||u===2)s.box([span+.1,base,R*2.7],[0,base/2,0],u===1?pale:metal);for(let j=0;j<n;j++){const x=(j-(n-1)/2)*R*2.5;s.lathe([[R*.85,0],[R,.02],[R,H],[R-.006,H],[R*.8,.012]],vessel,[x,base,0]);const fill=t===0?.04+a.load*.07:t===2?H*.78:.04+a.load*H*.55;if(t!==4){s.cylinder(R*.88,R*.88,fill,[x,base+fill/2,0],s.material('#c8bc91'),24);if(t===2||t===1){s.ball([R*.88,.02,R*.88],[x,base+fill,0],s.material('#c8bc91'),20);for(let i=0;i<12;i++){const ang=i*2.399,rr=R*.7*Math.sqrt(i/12);s.ring(.005,.001,[x+Math.cos(ang)*rr,base+fill+.019,Math.sin(ang)*rr],wood).rotation.x=Math.PI/2;}}if(t===3)s.ring(R*.89,.003,[x,base+H*.8,0],s.material('#b7aa81')).rotation.x=Math.PI/2;}if(m===0)s.ring(R+.002,.004,[x,base+H*.35,0],s.material('#8c9c6b')).rotation.x=Math.PI/2;if(m===1)for(let i=0;i<3;i++)s.box([.03,.003,.002],[x,base+H*(.25+i*.2),R+.001],dark);if(m===2||m===3)s.label(m===2?'STARTER':'FED MONDAY',R*1.5,.04,[x,base+H*.5,R+.002]);const lx=a.closed?span*.7:x,ly=a.closed?.014:base+H+.014;if(d===1&&!a.closed)s.drape({size:[R*2.5,R*2.5],at:[x,base+H+.08,0],over:[{cylinder:[R,H],at:[x,base+H/2,0]}],floor:base+H*.65,detail:14},pale);else s.cylinder(R*1.05,R*1.05,.018,[lx,ly,a.closed?(j-(n-1)/2)*R*2.3:0],lid,24);}const ex=-span*.75;if(e===0){s.rod([ex,.009,-.1],[ex,.009,.12],.005,wood);s.ball([.025,.008,.04],[ex,.009,-.11],wood,12);}if(e===1)s.lathe([[.035,0],[.06,.05],[.055,.05],[.03,.01]],pale,[ex,0,0]);if(e===2){s.box([.16,.025,.2],[ex,.013,0],metal);s.cylinder(.055,.055,.008,[ex,.03,-.025],pale,24);s.label('0',.04,.03,[ex,.028,.06]).rotation.x=-Math.PI/2;}if(e===3)s.label('FLOUR + WATER',.17,.1,[ex,.003,0]).rotation.x=-Math.PI/2;return s.finish();
  },
});
