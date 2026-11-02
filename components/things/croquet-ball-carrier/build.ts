import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What carrier holds the balls?", {"six": "A six-ball wood carrier.", "four": "A compact four-ball carrier.", "eight": "An eight-ball club carrier.", "long": "A single long row of balls.", "basket": "A round basket with a central handle."}),
  state: choice("What is the set doing?", {"full": "The whole set is packed.", "one": "One ball has been removed for play.", "half": "Half the spaces are empty.", "out": "Two balls sit beside the carrier.", "empty": "The carrier is empty after games begin."}),
  detail: choice("Which ball colours are used?", {"classic": "Red, blue, black and yellow.", "pastel": "Muted blue, cream, green and rose.", "stripe": "Solid balls with a pale equatorial stripe.", "white": "White balls with coloured poles.", "aged": "Deep muted club colours."}),
  support: choice("How is the carrier lifted?", {"arch": "A bent wood arch handle.", "bar": "A straight bar above a central divider.", "rope": "Two short rope loops.", "ends": "Cutout-style end grips.", "low": "A low horizontal carrying bar."}),
  extra: choice("What accompanies the set?", {"cloth": "A folded cleaning cloth.", "clip": "A loose coloured score clip.", "list": "A small inventory card.", "brush": "A soft ball-cleaning brush.", "none": "Nothing beside the carrier."}),
  mark: choice("What identifies the carrier?", {"club": "A CLUB SET plaque.", "number": "A large SET 02 label.", "stripe": "A broad red side stripe.", "corners": "Four brass corner caps.", "plain": "Plain natural wood."}),
  extent: score("How broad are the ball wells?", ["A compact junior set", "A standard club carrier", "A broad demonstration set"]),
  load: score("How high is the carrying handle?", ["A low compact grip", "An easy hand opening", "A tall arched handle"]),
  closed: noul("Is a fabric strap buckled across the packed balls?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const r=.047+a.extent*.015,n=f===1?4:f===2?8:6,cols=f===3?n:2,rows=Math.ceil(n/cols),W=f===4?.38:cols*r*2.4+.045,D=f===4?.38:rows*r*2.4+.035,H=.14+a.load*.15;f===4?s.cylinder(W/2,W/2,.025,[0,.013,0],wood,32):s.box([W,.025,D],[0,.013,0],wood);if(f!==4)for(const x of [-W/2,W/2])s.box([.018,.06,D],[x,.04,0],wood);else s.ring(W/2,.014,[0,.05,0],wood).rotation.x=Math.PI/2;
    for(let i=0;i<n;i++){const x=f===4?Math.cos(i*Math.PI*2/n)*.125:(i%cols-(cols-1)/2)*r*2.4,z=f===4?Math.sin(i*Math.PI*2/n)*.125:(Math.floor(i/cols)-(rows-1)/2)*r*2.4;s.ring(r*.96,.007,[x,.03,z],dark).rotation.x=Math.PI/2;const present=t!==4&&!(t===1&&i===0)&&!(t===2&&i%2===0)&&!(t===3&&i<2);if(present){const palette=d===1?['#7396a1','#d2c8a3','#8a9c75','#b68b91']:d===4?['#864d3c','#526c7d','#404a3f','#aa934f']:['#a6503d','#557e91','#414a3f','#c8ad59'];s.ball([r,r,r],[x,.03+r,z],s.material(d===3?'#d7d6bf':palette[i%4]),22);if(d===2)s.ring(r+.001,.006,[x,.03+r,z],pale).rotation.x=Math.PI/2;if(d===3)s.ball([r*.4,.003,r*.4],[x,.03+r*2,z],s.material(palette[i%4]),12);}}
    if(u===0)s.tube([[-W*.43,.04,0],[-W*.4,H,0],[W*.4,H,0],[W*.43,.04,0]],.012,wood);if(u===1||u===4){const hh=u===4?H*.6:H;for(const x of [-W*.42,W*.42])s.rod([x,.025,0],[x,hh,0],.012,wood);s.rod([-W*.42,hh,0],[W*.42,hh,0],.015,wood);}if(u===2||u===3)for(const x of [-W/2,W/2])s.tube([[x,.04,-D*.25],[x,.11,-D*.2],[x,.11,D*.2],[x,.04,D*.25]],u===2?.006:.012,u===2?pale:wood);
    if(t===3)for(let i=0;i<2;i++)s.ball([r,r,r],[W*.75+i*r*2.2,r,0],s.material(colors[i]),22);if(m===0||m===1)s.label(m===0?'CLUB SET':'SET 02',Math.min(W*.7,.25),.045,[0,.055,D/2+.002]);if(m===2)s.box([.06,.005,D],[0,.03,0],s.material('#a95e4c'));if(m===3)for(const x of [-W*.45,W*.45])for(const z of [-D*.45,D*.45])s.box([.035,.004,.035],[x,.03,z],metal);if(a.closed)s.tube([[0,.03,-D/2],[0,.15,-D*.4],[0,.15,D*.4],[0,.03,D/2]],.008,green);if(e===0)s.box([.15,.015,.12],[-W*.8,.008,0],pale);if(e===1)s.box([.035,.025,.07],[-W*.8,.013,0],s.material('#a9604b'));if(e===2)s.label('6 BALLS',.15,.07,[-W*.8,.003,0]).rotation.x=-Math.PI/2;if(e===3){s.box([.1,.018,.045],[-W*.8,.025,0],wood);s.box([.1,.025,.045],[-W*.8,.013,0],pale);}return s.finish();
  },
});
