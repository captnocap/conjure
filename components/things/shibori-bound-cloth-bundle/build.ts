import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("How is the cloth bound?", {"accordion": "A tight accordion-folded bundle.", "spiral": "A twisted rope coil wrapped with string.", "blocks": "A folded square clamped between wood blocks.", "pebbles": "Small pebble points bound into the cloth.", "pole": "Cloth wrapped tightly around a short pole."}),
  state: choice("Where is it in the dye process?", {"white": "Pale prepared cloth before dipping.", "wet": "A dark wet bundle fresh from the bath.", "air": "Green-blue cloth oxidising in the air.", "untie": "Some bindings have been loosened.", "opened": "One end unfolds to show pale resist marks."}),
  detail: choice("What cloth is being dyed?", {"cotton": "Soft cream cotton.", "linen": "Coarse natural linen.", "silk": "A fine pale silk scarf.", "hemp": "Stout hemp canvas.", "gauze": "A thin gauzy cotton length."}),
  support: choice("What binds the fabric?", {"string": "Fine cotton string.", "rope": "Thick hemp cord.", "elastic": "Dark elastic bands.", "clamps": "Small wooden clamps.", "wire": "Thin metal binding wire."}),
  extra: choice("What preparation tool lies nearby?", {"scissors": "Small sewing scissors.", "spool": "A spool of binding thread.", "stones": "Three smooth tying stones.", "pins": "A little dish of pins.", "none": "No loose tool."}),
  mark: choice("What pattern is planned?", {"bands": "Even parallel resist bands.", "diamonds": "Alternating diagonal bindings.", "circles": "Round pebble circles.", "grid": "A square block-resist grid.", "irregular": "Uneven expressive bindings."}),
  extent: score("How long is the fabric bundle?", ["A small sample", "A scarf length", "A long cloth length"]),
  load: score("How tightly is it bound?", ["A few broad ties", "An even set of bindings", "Dense narrow resist lines"]),
  closed: noul("Is the bundle resting in a shallow wooden preparation tray?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const L=.25+a.extent*.4,cloth=s.material(t===0?['#dbd2b5','#c6b99b','#e3d9bf','#b9ac8e','#ded6bf'][d]:t===2?'#608d7d':'#3f617c',{side:THREE.DoubleSide}),tie=u===2?dark:u===4?metal:pale,n=4+Math.round(a.load*9),y=a.closed?.035:0;
    if(f===0||f===2){for(let i=0;i<8;i++)s.box([L,.018,.12],[0,y+.009+i*.018,0],cloth);if(f===2)for(const yy of [y+.008,y+.16])s.box([L*.8,.018,.16],[0,yy,0],wood);for(let i=0;i<n;i++){const x=(i/(n-1)-.5)*L*.9;const loop=s.tube([[x,y,.075],[x,y+.17,.075],[x,y+.17,-.075],[x,y,-.075]],.003+u*.001,tie,true);if(m===1)loop.rotation.z=(i%2?.1:-.1);}}
    if(f===1){s.tube([[-L*.4,y+.06,-.04],[-L*.2,y+.06,.08],[L*.2,y+.06,.08],[L*.4,y+.06,-.06],[0,y+.07,-.12],[-L*.2,y+.08,0],[L*.1,y+.09,.02]],.035,cloth);for(let i=0;i<n;i++)s.ring(.045,.003,[(i/(n-1)-.5)*L*.7,y+.06,.06],tie).rotation.y=Math.PI/2;}
    if(f===3){s.box([L,.012,.24],[0,y+.006,0],cloth);for(let i=0;i<7;i++){const x=(i%4-1.5)*L*.2,z=(Math.floor(i/4)-.5)*.1;s.ball([.035,.055,.035],[x,y+.05,z],cloth,12);s.ring(.023,.004,[x,y+.03,z],tie).rotation.x=Math.PI/2;}}
    if(f===4){s.rod([-L*.65,y+.06,0],[L*.65,y+.06,0],.025,wood);s.cylinder(.055,.055,L,[0,y+.06,0],cloth,24).rotation.z=Math.PI/2;for(let i=0;i<n;i++){const ring=s.ring(.057,.003,[(i/(n-1)-.5)*L,y+.06,0],tie);ring.rotation.y=Math.PI/2;}}
    if(u===3)for(const x of [-L*.3,L*.3])s.box([.045,.035,.2],[x,y+(f===0||f===2?.17:f===3?.03:.12),0],wood);if(m===3)for(const z of [-.04,.04])s.rod([-L/2,y+(f===0||f===2?.175:f===3?.016:.115),z],[L/2,y+(f===0||f===2?.175:f===3?.016:.115),z],.003,tie);if(m===4)s.rod([-L*.4,y+(f===0||f===2?.17:f===3?.016:.11),-.04],[L*.2,y+(f===0||f===2?.17:f===3?.016:.11),.04],.006,tie);
    if(t===3||t===4){s.drape({size:[L*.7,.25],at:[L*.6,y+.2,0],over:[{box:[L,.15,.15],at:[0,y+.075,0]}],floor:y+.005,detail:12,rumple:.3},cloth);for(let i=0;i<5;i++)s.box([.018,.003,.2],[L*.4+i*L*.07,y+.01,0],pale);}
    if(e===0){s.rod([L*.65,.015,.17],[L*.95,.015,.23],.003,metal);s.rod([L*.65,.015,.23],[L*.95,.015,.17],.003,metal);for(const z of [.17,.23])s.ring(.02,.004,[L*.65,.015,z],dark).rotation.x=Math.PI/2;}if(e===1){s.cylinder(.035,.035,.06,[-L*.7,.03,.13],pale,16);s.cylinder(.045,.045,.008,[-L*.7,.064,.13],wood,16);}if(e===2)for(let i=0;i<3;i++)s.ball([.03,.02,.025],[-L*.6+i*.07,.02,.2],dark,10);if(e===3)s.cylinder(.05,.05,.014,[-L*.7,.007,.15],wood,20);if(a.closed){s.box([L*1.5,.025,.38],[0,.013,0],wood);for(const z of [-.19,.19])s.box([L*1.5,.05,.015],[0,.035,z],wood);}return s.finish();
  },
});
