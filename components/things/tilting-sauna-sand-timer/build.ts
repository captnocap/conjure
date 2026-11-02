import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What frame holds the timer?", {"posts": "Two straight timber uprights.", "arch": "A curved timber arch.", "panel": "A tall solid backing panel.", "box": "A square open box frame.", "round": "A rounded wooden cradle."}),
  state: choice("How much time remains?", {"start": "Most sand is in the upper bulb.", "middle": "Sand is divided between both bulbs.", "end": "Almost all sand has fallen.", "turn": "The timer has been tilted sideways.", "empty": "An empty clear hourglass stands in the frame."}),
  detail: choice("What is the timber finish?", {"birch": "Pale birch.", "cedar": "Warm cedar.", "dark": "Dark heat-aged wood.", "white": "Cream painted wood.", "natural": "Raw knotty timber."}),
  support: choice("Where does the timer stand?", {"foot": "A broad desktop foot.", "feet": "Two small transverse feet.", "slab": "A low square stone pad.", "block": "A small timber base block.", "bracket": "A freestanding panel with a rear brace."}),
  extra: choice("What accompanies the timer?", {"thermo": "A small thermometer on the frame.", "towel": "A folded hand towel.", "cup": "A small water cup.", "card": "A quiet bathing reminder card.", "none": "Only the timer."}),
  mark: choice("What marks the time?", {"minutes": "A 15 MIN label.", "ticks": "Three quarter-hour tick marks.", "dots": "Three small inset dots.", "quiet": "A BREATHE label.", "plain": "Unmarked timber."}),
  extent: score("How tall is the hourglass?", ["A small bench timer", "A clear readable timer", "A tall room timer"]),
  load: score("How broad are the glass bulbs?", ["Slender glass", "Rounded glass bulbs", "Broad rounded bulbs"]),
  closed: noul("Can the sand timer turn slowly on its axle?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const H=.3+a.extent*.2,r=.04+a.load*.025,W=r*3.7,base=.04,mat=s.material(['#cdb888','#b48e63','#76624c','#d7cfb3','#baa67d'][d]),g=new THREE.Group(),glass=s.material('#c2d4bd',{transparent:true,opacity:.25,depthWrite:false}),sand=s.material('#c9ad6b');s.box([W+.08,.035,.16],[0,.018,0],mat);for(const x of [-W/2,W/2]){s.rod([x,base,0],[x,base+H,0],.014,mat);if(u===1)s.box([.06,.025,.22],[x,.013,0],wood);}if(u===2)s.box([W+.1,.035,.22],[0,.018,0],pale);if(u===3)s.box([W+.06,.09,.18],[0,.045,0],wood);if(f===1||f===4)s.tube([[-W/2,base+H,0],[0,base+H+.08,0],[W/2,base+H,0]],.014,mat);if(f===2||u===4){const bz=-H*.55-.035;s.box([W+.04,H+.05,.025],[0,base+H/2,bz],mat);s.box([W+.08,.035,-bz+.1],[0,.018,bz/2],mat);for(const x of [-W/2,W/2])s.rod([x,base+H/2,bz],[x,base+H/2,0],.014,mat);if(u===4)s.rod([0,0,bz-.1],[0,base+H*.8,bz],.018,wood);}if(f===3)for(const y of [base,base+H])s.box([W,.025,.12],[0,y,0],mat);for(const y of [-H*.45,H*.45])g.add(s.cylinder(r*1.2,r*1.2,.025,[0,y,0],mat,22));g.add(s.lathe([[r,-H*.42],[r*.9,-H*.2],[.009,-.025],[.009,.025],[r*.9,H*.2],[r,H*.42]],glass));const level=t===0?.85:t===2?.1:.5;if(t!==4){g.add(s.mesh(new THREE.ConeGeometry(r*.86,H*.3*(1-level)+.02,22),sand,[0,-H*.4+(H*.3*(1-level)+.02)/2,0]));g.add(s.mesh(new THREE.ConeGeometry(r*.84,H*.3*level+.015,22),sand,[0,H*.37-(H*.3*level+.015)/2,0]).rotateX(Math.PI));if(t!==2)g.add(s.rod([0,-H*.32,0],[0,.025,0],.002,sand));}g.position.y=base+H/2;g.rotation.x=t===3?Math.PI/2:0;s.root.add(g);s.rod([-W*.55,base+H/2,0],[W*.55,base+H/2,0],.008,metal);if(m===0||m===3)s.label(m===0?'15 MIN':'BREATHE',W*.85,.04,[0,.023,.083]);if(m===1||m===2)for(let i=0;i<3;i++)s.box([.018,.006,.003],[W*.52,base+H*(.25+i*.25),.012],dark);if(e===0){s.box([.035,H*.65,.018],[W*.5+.024,base+H*.48,0],pale);s.rod([W*.5+.025,base+H*.23,.011],[W*.5+.025,base+H*.6,.011],.003,s.material('#a76552'));}if(e===1)s.box([.16,.02,.15],[W,.01,0],pale);if(e===2)s.lathe([[.035,0],[.05,.07],[.04,.07],[.025,.008]],wood,[W,0,0]);if(e===3)s.label('TAKE YOUR TIME',.18,.09,[W,.003,0]).rotation.x=-Math.PI/2;return s.finish({update:(_dt,time)=>{if(a.closed&&t===3)g.rotation.x=Math.PI/2+Math.sin(time*.4)*.12;}});
  },
});
