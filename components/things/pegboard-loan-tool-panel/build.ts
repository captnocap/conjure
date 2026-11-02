import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What shape is the panel?", {"wide": "A wide rectangular pegboard.", "tall": "A tall narrow panel.", "double": "Two joined panels on one frame.", "arched": "A rectangular board beneath an arched sign.", "low": "A low tabletop tool display."}),
  state: choice("Which tools remain?", {"full": "A full set hangs on its hooks.", "borrowed": "Two tools are out on loan.", "saw": "The handsaw is the only remaining tool.", "empty": "Empty hooks await returned tools.", "repair": "A hammer carries a repair tag."}),
  detail: choice("What is the board surface?", {"tan": "Natural tan fibreboard.", "green": "Muted green painted board.", "cream": "Cream painted board.", "blue": "Faded blue pegboard.", "dark": "Dark workshop board."}),
  support: choice("What supports the panel?", {"feet": "Wide transverse timber feet.", "a": "A braced A frame.", "wheels": "Four small castors.", "box": "A low storage box beneath.", "posts": "Two stout posts in square sockets."}),
  extra: choice("What hangs at the edge?", {"tape": "A rolled measuring tape.", "gloves": "A pair of work gloves.", "brush": "A small dusting brush.", "cord": "A loop of cord.", "none": "A clear edge."}),
  mark: choice("What marks the tool positions?", {"names": "Short tool labels below the hooks.", "outline": "Pale silhouettes behind the tools.", "numbers": "Numbered loan positions.", "dots": "Coloured identity dots.", "plain": "Only visible hooks."}),
  extent: score("How broad is the board?", ["A compact selection", "A shared hand-tool panel", "A generous lending panel"]),
  load: score("How high is the display?", ["Easy reach", "Chest-height display", "Tall workshop panel"]),
  closed: noul("Is a shallow catch tray fitted under the tools?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const W=(f===1?.65:1)+a.extent*.5,H=f===4?.6:1.1+a.load*.45,by=f===4?.18:.4,mat=s.material(['#b3976e','#6f8767','#d1cbb2','#6e8d9a','#666454'][d]);s.box([W,H,.035],[0,by+H/2,0],mat);for(let ix=0;ix<12;ix++)for(let iy=0;iy<9;iy++)s.ball([.004,.004,.001],[(ix-5.5)*W*.075,by+(iy+1)*H/10,.019],dark,6);for(const x of [-W*.44,W*.44]){s.rod([x,0,0],[x,by+H,0],.025,wood);s.box([.1,.045,.5],[x,.023,0],wood);if(u===1)s.rod([x,.03,-.23],[x,by+H*.8,0],.02,wood);if(u===2)for(const z of [-.18,.18])s.cylinder(.035,.035,.035,[x,.035,z],dark,12).rotation.z=Math.PI/2;if(u===4)s.box([.16,.12,.18],[x,.06,0],pale);}if(u===3)s.box([W,.24,.4],[0,.12,0],wood);if(f===2)s.box([.035,H,.025],[0,by+H/2,.025],wood);if(f===3){s.tube([[-W/2,by+H,0],[0,by+H+.23,0],[W/2,by+H,0]],.025,wood);s.label('TOOLS TO SHARE',W*.65,.12,[0,by+H-.09,.022]);}
    const names=['HAMMER','DRIVER','SAW','PLIERS'];for(let i=0;i<4;i++){const x=(i-1.5)*W*.22,y=by+H*.73,has=t===0||t===4||t===1&&i%2===0||t===2&&i===2;s.rod([x,y,.018],[x,y,.065],.007,metal);s.rod([x,y,.065],[x,y+.025,.065],.007,metal);if(m===1)s.box([i===2?.12:.06,H*.4,.002],[x,y-H*.2,.021],pale);if(has){if(i===0){s.rod([x,y-.32,.07],[x,y,.07],.017,wood);s.box([.18,.055,.055],[x,y,.07],metal);}if(i===1){s.rod([x,y-.3,.07],[x,y-.09,.07],.007,metal);s.cylinder(.024,.024,.12,[x,y-.05,.07],s.material('#9e644d'),12);}if(i===2){s.box([.14,.27,.012],[x,y-.21,.07],metal);s.ring(.065,.014,[x,y-.025,.07],wood).scale.y=.65;for(let j=0;j<8;j++)s.mesh(new THREE.ConeGeometry(.013,.025,3),metal,[x+.076,y-.095-j*.03,.07]).rotation.z=-Math.PI/2;}if(i===3){for(const dx of [-.025,.025])s.rod([x+dx*2,y-.26,.07],[x-dx,y-.07,.07],.01,green);s.ball([.025,.035,.012],[x,y-.05,.07],metal,10);}}if(m===0||m===2)s.label(m===0?names[i]:'LOAN '+(i+1),W*.18,.055,[x,by+.12,.023]);if(m===3)s.ball([.02,.02,.002],[x,by+.12,.022],s.material(colors[i]),10);if(t===4&&i===0){s.rod([x,y-.08,.08],[x+.07,y-.18,.09],.002,pale);s.box([.07,.08,.003],[x+.07,y-.22,.09],s.material('#be765f'));}}
    if(a.closed){s.box([W,.03,.2],[0,by-.025,.08],wood);s.box([W,.06,.02],[0,by,.18],wood);}const ex=W*.43,ey=by+H*.3;s.rod([ex,ey,.02],[ex,ey,.07],.007,metal);if(e===0)s.ring(.06,.015,[ex,ey-.05,.07],s.material('#bd9e55'));if(e===1)for(const dx of [-.025,.025])s.ball([.03,.065,.015],[ex+dx,ey-.06,.07],pale,12);if(e===2){s.rod([ex,ey,.07],[ex,ey-.1,.07],.012,wood);s.box([.09,.05,.025],[ex,ey-.12,.07],pale);}if(e===3)s.ring(.065,.006,[ex,ey-.055,.07],pale).scale.y=1.4;return s.finish();
  },
});
