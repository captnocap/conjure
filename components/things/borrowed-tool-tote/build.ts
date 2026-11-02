import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What kind of carrier is used?", {"wood": "A traditional timber tool caddy.", "canvas": "A stiff canvas tote with a high handle.", "box": "A deep open metal tool box.", "basket": "A shallow slatted wooden basket.", "divided": "A two-compartment timber tote."}),
  state: choice("What job is the kit packed for?", {"repair": "Hammer, driver and pliers for a small repair.", "drill": "A cordless drill and a bit roll.", "paint": "A brush, scraper and small paint pot.", "garden": "A trowel and hand fork.", "returned": "An empty carrier with a return card."}),
  detail: choice("What colour is the carrier?", {"pine": "Pale natural timber.", "green": "Muted green.", "rust": "Rust red paint.", "blue": "Faded work blue.", "cream": "Canvas cream."}),
  support: choice("What reinforces the tote?", {"corners": "Metal corner straps.", "bands": "Two broad fabric bands.", "ribs": "Raised timber corner ribs.", "feet": "Four low wooden feet.", "plain": "A simple undecorated body."}),
  extra: choice("What is packed beside the main tools?", {"tape": "A tape measure.", "gloves": "A pair of gloves.", "screws": "A little screw tin.", "cloth": "A folded work cloth.", "none": "No extra supplies."}),
  mark: choice("How is the loan identified?", {"card": "A tied loan card.", "number": "A stencilled tote number.", "borrow": "BORROWED TOOLS on the front.", "dots": "Three coloured identity dots.", "plain": "No marking."}),
  extent: score("How large is the tote?", ["A small repair kit", "A household toolkit", "A large shared carrier"]),
  load: score("How tall is the carrying handle?", ["A low grip", "A comfortable high handle", "A tall open handle"]),
  closed: noul("Does a strap secure the tools for carrying?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const W=.38+a.extent*.2,D=.25,H=f===2?.22:.15,handleH=H+.12+a.load*.15,mat=s.material(['#bea374','#788c65','#aa7158','#6e8998','#d2c5a6'][d]);s.box([W,.025,D],[0,.013,0],mat);for(const x of [-W/2,W/2])s.box([.025,H,D],[x,H/2,0],mat);if(f===3){for(const z of [-D/2,D/2])for(let i=0;i<3;i++)s.box([W,.025,.02],[0,.035+i*.045,z],mat);}else for(const z of [-D/2,D/2])s.box([W,H,.02],[0,H/2,z],mat);if(f===4)s.box([W,H,.018],[0,H/2,0],wood);for(const x of [-W*.42,W*.42])s.rod([x,H*.6,0],[x,handleH,0],.013,mat);s.rod([-W*.42,handleH,0],[W*.42,handleH,0],.02,mat);if(f===1)s.tube([[-W*.4,H,0],[-W*.4,handleH,0],[W*.4,handleH,0],[W*.4,H,0]],.012,green);for(const x of [-W*.48,W*.48])for(const z of [-D*.48,D*.48]){if(u===0)s.box([.04,H*.8,.025],[x,H*.45,z],metal);if(u===2)s.box([.035,H,.035],[x,H/2,z],wood);if(u===3)s.box([.05,.035,.05],[x,.018,z],wood);}if(u===1)for(const x of [-W*.3,W*.3])s.box([.04,H,.025],[x,H/2,D*.52],green);
    if(t===0){s.rod([-.12,.03,.04],[-.12,H+.22,.04],.012,wood);s.box([.15,.045,.045],[-.12,H+.22,.04],metal);s.rod([0,.03,.04],[0,H+.2,.04],.007,metal);s.cylinder(.018,.018,.09,[0,H+.16,.04],green,12);for(const dx of [-.025,.025])s.rod([.12+dx,.03,.04],[.12-dx,H+.15,.04],.009,metal);}if(t===1){s.box([.13,.05,.09],[0,.05,0],dark);s.box([.055,.15,.07],[.03,.14,0],green);s.box([.18,.07,.075],[0,.23,0],green);s.rod([-.09,.23,0],[-.16,.23,0],.009,metal);}if(t===2){s.rod([-.1,.04,0],[-.1,H+.18,0],.012,wood);s.box([.09,.07,.025],[-.1,H+.2,0],pale);s.cylinder(.07,.07,.1,[.1,.075,0],metal,20);}if(t===3)for(let i=0;i<2;i++){const x=(i-.5)*.15;s.rod([x,.03,0],[x,H+.23,0],.014,wood);if(i===0)s.ball([.04,.08,.008],[x,H+.13,0],metal,14);else for(let j=0;j<3;j++)s.rod([x+(j-1)*.025,H+.06,0],[x+(j-1)*.025,H+.18,0],.005,metal);}if(t===4)s.label('RETURNED',W*.55,.12,[0,.028,0]).rotation.x=-Math.PI/2;
    if(e===0)s.box([.065,.06,.04],[W*.3,.055,-.07],s.material('#c2a15c'));if(e===1)for(const x of [-.035,.035])s.ball([.04,.018,.07],[x,H+.01,.05],pale,12);if(e===2)s.cylinder(.04,.04,.035,[W*.3,.045,-.06],metal,18);if(e===3)s.box([.14,.025,.13],[W*.25,H+.01,0],pale);if(m===0){s.rod([W*.42,handleH,0],[W*.42,handleH-.12,.04],.002,pale);s.box([.07,.09,.002],[W*.42,handleH-.16,.04],pale);}if(m===1||m===2)s.label(m===1?'TL 17':'BORROWED TOOLS',W*.75,.06,[0,H*.55,D/2+.012]);if(m===3)for(let i=0;i<3;i++)s.ball([.012,.012,.002],[(i-1)*.04,H*.55,D/2+.012],s.material(colors[i]),10);if(a.closed)s.tube([[-W*.48,H,D*.3],[0,H+.07,D*.3],[W*.48,H,D*.3]],.01,green);return s.finish();
  },
});
